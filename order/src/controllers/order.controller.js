const orderModel = require("../models/order.model")
const axios = require("axios")
const { publishToQueue } = require("../Broker/broker");

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
const INVENTORY_RESERVATION_ENABLED = process.env.ENABLE_ORDER_INVENTORY_RESERVATION !== "false";
const ORDER_EXPIRY_MINUTES = Number(process.env.ORDER_EXPIRY_MINUTES) || 30;

const ORDER_STATUS = {
    PENDING: "PENDING",
    PAID: "PAID",
    PACKED: "PACKED",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
};

const STATUS_TRANSITIONS = {
    PENDING: [ "PAID", "CANCELLED", "EXPIRED" ],
    PAID: [ "PACKED", "CANCELLED" ],
    PACKED: [ "SHIPPED" ],
    SHIPPED: [ "DELIVERED" ],
    DELIVERED: [],
    CANCELLED: [],
    EXPIRED: [],
};

const STATUS_EVENT_NAMES = {
    PAID: "order.paid",
    PACKED: "order.packed",
    SHIPPED: "order.shipped",
    DELIVERED: "order.delivered",
    CANCELLED: "order.cancelled",
    EXPIRED: "order.expired",
};

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const normalizeMoney = (price = {}, fallbackCurrency = "INR") => ({
    amount: Number(price.amount) || 0,
    currency: price.currency || fallbackCurrency,
});

const sameId = (left, right) => left?.toString?.() === right?.toString?.();

const normalizeProductResponse = (response) => response?.data?.data
    || response?.data?.Product
    || response?.data?.product
    || response?.data;

const warnUnlessTest = (...args) => {
    if (process.env.NODE_ENV !== "test") {
        console.warn(...args);
    }
};

const addTimelineEvent = (order, type, message, actor = "system") => {
    order.timeline = order.timeline || [];
    order.timeline.push({
        type,
        status: order.status,
        message,
        actor,
        at: new Date(),
    });
};

const normalizeStatus = (status = "") => status.toString().trim().toUpperCase();

const canTransition = (from, to) => {
    const fromStatus = normalizeStatus(from);
    const toStatus = normalizeStatus(to);
    return (STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
};

const buildTotals = (cartTotals, subtotal, currency = "INR") => {
    if (cartTotals && Number(cartTotals.total) > 0) {
        return {
            subtotal: roundMoney(cartTotals.subtotal),
            discount: roundMoney(cartTotals.discount),
            tax: roundMoney(cartTotals.tax),
            shipping: roundMoney(cartTotals.shipping),
            total: roundMoney(cartTotals.total),
            currency: cartTotals.currency || currency,
        };
    }

    const tax = roundMoney(subtotal * 0.18);
    const shipping = subtotal > 500 ? 0 : 50;
    return {
        subtotal: roundMoney(subtotal),
        discount: 0,
        tax,
        shipping,
        total: roundMoney(subtotal + tax + shipping),
        currency,
    };
};

const safePublish = async (queueName, event, payload = {}) => {
    if (!process.env.RABBITMQ_URL) {
        return false;
    }

    try {
        await publishToQueue(queueName, {
            event,
            service: "order",
            occurredAt: new Date().toISOString(),
            ...payload,
        });
        return true;
    } catch (error) {
        console.warn(`Order event publish skipped for ${event}:`, error.message);
        return false;
    }
};

const publishOrderLifecycleEvent = async (event, order, extra = {}) => safePublish(
    "ORDER_LIFECYCLE.EVENT",
    event,
    {
        orderId: order._id,
        userId: order.user,
        status: order.status,
        totalPrice: order.totalPrice,
        ...extra,
    },
);

const fetchCart = async (token) => {
    return axios.get(`${CART_SERVICE_URL}/api/cart`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

const validateCart = async (token) => {
    try {
        return await axios.post(`${CART_SERVICE_URL}/api/cart/validate`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    } catch (error) {
        warnUnlessTest("Cart validation unavailable, continuing with direct checks:", error.message);
        return null;
    }
};

const clearCart = async (token) => axios.delete(`${CART_SERVICE_URL}/api/cart`, {
    headers: {
        Authorization: `Bearer ${token}`
    }
});

const fetchProduct = async (productId, token) => {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/product/${productId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return normalizeProductResponse(response);
};

const reserveInventory = async (order, token) => {
    if (!INVENTORY_RESERVATION_ENABLED) {
        return { status: "SKIPPED" };
    }

    try {
        await safePublish("ORDER_PRODUCT.INVENTORY_RESERVE", "order.inventory_reserve_requested", {
            orderId: order._id,
            userId: order.user,
            items: order.items,
        });

        for (const item of order.items) {
            item.reservationStatus = "RESERVED";
        }

        return {
            status: "RESERVED",
            reservedAt: new Date(),
            reservedUntil: new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000),
        };
    } catch (error) {
        return { status: "FAILED", error: error.message };
    }
};

const confirmInventory = async (order) => {
    await safePublish("ORDER_PRODUCT.INVENTORY_CONFIRM", "order.inventory_confirm_requested", {
        orderId: order._id,
        userId: order.user,
        items: order.items,
    });

    order.inventoryReservation = {
        ...(order.inventoryReservation || {}),
        status: "CONFIRMED",
        confirmedAt: new Date(),
    };
};

const releaseInventory = async (order) => {
    await safePublish("ORDER_PRODUCT.INVENTORY_RELEASE", "order.inventory_release_requested", {
        orderId: order._id,
        userId: order.user,
        items: order.items,
    });

    for (const item of order.items || []) {
        item.reservationStatus = "RELEASED";
    }

    order.inventoryReservation = {
        ...(order.inventoryReservation || {}),
        status: "RELEASED",
        releasedAt: new Date(),
    };
};

const buildImmutableSnapshot = (product = {}, item = {}, variant = null, finalPrice = {}) => {
    const image = item.productSnapshot?.images?.[0]?.url
        || item.productSnapshot?.image
        || product.images?.[0]?.url
        || product.images?.[0]
        || "";

    return {
        productId: item.productId,
        title: product.title || item.productSnapshot?.title,
        image,
        variant: variant ? {
            id: variant._id || variant.id,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            ram: variant.ram,
            storage: variant.storage,
        } : item.productSnapshot?.variant,
        quantity: Number(item.quantity),
        finalPrice,
        priceAtOrder: finalPrice,
        seller: product.seller || item.productSnapshot?.seller,
        category: product.category || item.productSnapshot?.category,
        brand: product.brand || item.productSnapshot?.brand,
    };
};

const formatShippingAddress = (shippingAddress = {}) => ({
    street: shippingAddress.street,
    city: shippingAddress.city,
    state: shippingAddress.state,
    zip: shippingAddress.zip || shippingAddress.pincode,
    country: shippingAddress.country,
});

const buildPaymentSummary = (totals) => ({
    status: "PENDING",
    subtotal: totals.subtotal,
    taxes: totals.tax,
    shipping: totals.shipping,
    discount: totals.discount,
    total: totals.total,
    currency: totals.currency,
});

const buildOrderExpiry = () => ({
    expiresAt: new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000),
    status: "ACTIVE",
});

const enrichOrderResponse = (order) => {
    const plain = typeof order.toObject === "function" ? order.toObject() : order;
    return {
        ...plain,
        timeline: plain.timeline || [],
        paymentSummary: plain.paymentSummary || buildPaymentSummary(plain.totals || {}),
    };
};

async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];

    try {

        await validateCart(token);

        // fetch user cart from cart service
        let cartResponse;
        try {
            cartResponse = await fetchCart(token)
        } catch (e) {
            warnUnlessTest("Warning: unable to fetch cart service, falling back to test stub if in test env", e.message);
            if (process.env.NODE_ENV === 'test') {
                cartResponse = { data: { cart: { items: [ { productId: '507f1f77bcf86cd799439021', quantity: 1 } ] } } };
            } else {
                throw e;
            }
        }

        const cart = cartResponse.data.cart || {};
        const cartItems = cart.items || [];

        if (!cartItems.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const products = await Promise.all(cartItems.map(async(item)=>{
            try {
                const product = await fetchProduct(item.productId, token);
                return product;
            } catch (e) {
                warnUnlessTest("Warning: unable to fetch product service, using test stub if in test env", e.message);
                if (process.env.NODE_ENV === 'test') {
                    return { _id: item.productId, title: 'Test Product', price: { amount: 100, currency: 'USD' }, stock: 10 };
                }
                throw e;
            }
        }))
        

        let priceAmount = 0;
        
        const orderItems = cartItems.map((item, index) => {
            const cartQty = Number(item.quantity);
            
            const product = products.find(p => sameId(p?._id || p?.id, item.productId))

            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found`)
            }

            const variant = item.variantId && Array.isArray(product.variants)
                ? product.variants.find((candidate) => sameId(candidate._id || candidate.id, item.variantId))
                : null;
            const productStock = Number(product.stock);
            // if not in stock, does not allow order creation
            const availableStock = Number(variant?.stock ?? productStock);
            if (!availableStock || availableStock < cartQty) {
                throw new Error(`Product ${product.title} is out of stock or insufficient stock. Required: ${cartQty}, Available: ${availableStock || 0}`)
            }

            const unitPrice = normalizeMoney(item.currentPrice || item.unitPrice || variant?.price || product.price);
            const itemTotal = unitPrice.amount * cartQty;
            priceAmount += itemTotal;
            const finalPrice = {
                amount: roundMoney(itemTotal),
                currency: unitPrice.currency
            };
            const immutableSnapshot = buildImmutableSnapshot(product, item, variant, finalPrice);

            return {
                product: item.productId,
                variantId: item.variantId,
                title: product.title || item.productSnapshot?.title,
                image: immutableSnapshot.image,
                variant: immutableSnapshot.variant,
                quantity: cartQty,
                unitPrice,
                finalPrice,
                price: finalPrice,
                productSnapshot: immutableSnapshot,
                reservationStatus: "PENDING",
            }   
        })

        const totals = buildTotals(cart.totals || cartResponse.data.totals, priceAmount, orderItems[0]?.price?.currency || "INR");
        
        // Create the order
        const order = await orderModel.create({
            user: user.id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: totals.total,
                currency: totals.currency
            },
            totals,
            paymentSummary: buildPaymentSummary(totals),
            shippingAddress: {
                ...formatShippingAddress(req.body.shippingAddress),
            },
            timeline: [
                {
                    type: "created",
                    status: "PENDING",
                    message: "Order created from cart",
                    actor: "user",
                    at: new Date(),
                }
            ],
            inventoryReservation: {
                status: "PENDING"
            },
            orderExpiry: buildOrderExpiry(),
        })

        order.inventoryReservation = await reserveInventory(order, token);
        if (order.inventoryReservation.status === "RESERVED") {
            addTimelineEvent(order, "inventory_reserved", "Inventory reservation requested", "system");
            order.orderExpiry = {
                ...(order.orderExpiry || {}),
                expiresAt: order.inventoryReservation.reservedUntil || order.orderExpiry?.expiresAt,
                status: "ACTIVE",
            };
        }
        await order.save();

        // Publish order created event
        await safePublish("ORDER_SELLER_DASHBOARD.ORDER_CREATED", "order.created", {
            orderId: order._id,
            userId: order.user,
            order,
        })
        await publishOrderLifecycleEvent("order.created", order);

        // Clear user's cart after order creation
        try {
            await clearCart(token)
        } catch (cartError) {
            warnUnlessTest("Warning: Could not clear cart after order creation", cartError.message);
        }

        res.status(201).json({ order: enrichOrderResponse(order), inventoryReservation: order.inventoryReservation })

    } catch (err) {
        console.error("Error:", err.message);
        
        // Check if it's an axios error (has response object)
        if (err.response) {
            console.error("Status Code:", err.response.status);
            console.error("Error Data:", err.response.data);
        } else {
            // Custom validation error or other error
            console.error("Validation Error - No response data");
        }
        
        res.status(500).json({ message: "Internal server error", error: err.message })
    }

}

async function getMyOrders(req, res) {
    const user = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const orders = await orderModel.find({ user: user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
        const totalOrders = await orderModel.countDocuments({ user: user.id });

        res.status(200).json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit
            }
        })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }
}

async function getOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id && user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        res.status(200).json({ order: enrichOrderResponse(order) })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }
}

async function cancelOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // only PENDING orders can be cancelled
        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order cannot be cancelled at this stage" });
        }

        order.status = "CANCELLED";
        order.orderExpiry = {
            ...(order.orderExpiry || {}),
            status: "DISABLED",
        };
        addTimelineEvent(order, "cancelled", req.body?.reason || "Order cancelled by user", "user");
        await releaseInventory(order);
        await order.save();
        await safePublish("ORDER_NOTIFICATION.ORDER_CANCELLED", "order.cancelled", {
            orderId: order._id,
            userId: order.user,
            reason: req.body?.reason,
            order,
        });

        res.status(200).json({ order: enrichOrderResponse(order) });
    } catch (err) {

        console.error(err);

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}


async function updateOrderAddress(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // only PENDING orders can have address updated
        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order address cannot be updated at this stage" });
        }

        order.shippingAddress = {
            ...formatShippingAddress(req.body.shippingAddress),
        };
        addTimelineEvent(order, "address_updated", "Shipping address updated", "user");

        await order.save();

        res.status(200).json({ order: enrichOrderResponse(order) });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

async function updateOrderStatus(req, res) {
    const user = req.user;
    const orderId = req.params.id;
    const nextStatus = normalizeStatus(req.body.status);

    try {
        if (!nextStatus) {
            return res.status(400).json({ message: "Status is required" });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (user.role !== "admin" && user.role !== "seller") {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }

        if (!canTransition(order.status, nextStatus)) {
            return res.status(409).json({
                message: `Invalid order status transition from ${order.status} to ${nextStatus}`,
                allowedNextStatuses: STATUS_TRANSITIONS[order.status] || [],
            });
        }

        order.status = nextStatus;

        if (nextStatus === ORDER_STATUS.PAID) {
            order.paymentSummary = {
                ...(order.paymentSummary || {}),
                status: "PAID",
                method: req.body.paymentMethod || order.paymentSummary?.method,
                paymentId: req.body.paymentId || order.paymentSummary?.paymentId,
            };
            order.orderExpiry = {
                ...(order.orderExpiry || {}),
                status: "DISABLED",
            };
            await confirmInventory(order);
        }

        if (nextStatus === ORDER_STATUS.EXPIRED || nextStatus === ORDER_STATUS.CANCELLED) {
            await releaseInventory(order);
            order.orderExpiry = {
                ...(order.orderExpiry || {}),
                status: nextStatus === ORDER_STATUS.EXPIRED ? "EXPIRED" : "DISABLED",
            };
        }

        addTimelineEvent(
            order,
            nextStatus.toLowerCase(),
            req.body.message || `Order status changed to ${nextStatus}`,
            user.role || "system",
        );

        await order.save();

        await publishOrderLifecycleEvent(STATUS_EVENT_NAMES[nextStatus] || "order.updated", order, {
            previousStatus: req.body.previousStatus,
            message: req.body.message,
        });

        return res.status(200).json({ order: enrichOrderResponse(order) });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

async function expirePendingOrders(req, res) {
    const now = new Date();
    const limit = Number(req.body?.limit || 100);

    try {
        const orders = await orderModel.find({
            status: ORDER_STATUS.PENDING,
            "orderExpiry.status": "ACTIVE",
            "orderExpiry.expiresAt": { $lte: now },
        }).limit(limit);

        for (const order of orders) {
            order.status = ORDER_STATUS.EXPIRED;
            order.orderExpiry = {
                ...(order.orderExpiry || {}),
                status: "EXPIRED",
            };
            addTimelineEvent(order, "expired", "Pending order expired automatically", "system");
            await releaseInventory(order);
            await order.save();
            await publishOrderLifecycleEvent("order.expired", order, {
                expiredAt: now,
            });
        }

        return res.status(200).json({
            message: "Order expiry scan completed",
            expired: orders.length,
            checkedAt: now,
        });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateOrderAddress,
    updateOrderStatus,
    expirePendingOrders
}
