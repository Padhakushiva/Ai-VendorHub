const { SubscribeToQueue, SubscribeToExchange } = require("../Broker/broker");
const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");
const DashboardEvent = require("../models/dashboardEvent.model");
const { broadcastSellerEvent } = require("../sockets/dashboard.socket");

function pickId(payload, keys) {
    for (const key of keys) {
        if (payload?.[key]) return payload[key];
    }
    return payload?._id || payload?.id;
}

function normalizeUser(user) {
    const accountId = user.accountId || user.userId || user.id || user._id;
    return {
        ...user,
        accountId,
    };
}

async function upsertUser(user) {
    const normalized = normalizeUser(user);
    await userModel.updateOne(
        normalized.accountId ? { accountId: normalized.accountId } : { email: normalized.email },
        normalized,
        { upsert: true }
    );
}

async function upsertProduct(product) {
    const productId = pickId(product, ["productId"]);
    if (!productId) return;
    const { _id, id, productId: ignoredProductId, ...productUpdate } = product;

    await productModel.findOneAndUpdate(
        { _id: productId },
        { $set: productUpdate, $setOnInsert: { _id: productId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function deleteOrArchiveProduct(product) {
    const productId = pickId(product, ["productId"]);
    if (!productId) return;

    if (product.deletionType === "hard") {
        await productModel.deleteOne({ _id: productId });
        return;
    }
    const { _id, id, productId: ignoredProductId, ...productUpdate } = product;

    await productModel.findOneAndUpdate(
        { _id: productId },
        { $set: { ...productUpdate, status: "archived" }, $setOnInsert: { _id: productId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function upsertOrder(order) {
    const orderId = pickId(order, ["orderId"]);
    if (!orderId) return;
    const sourceOrder = order.order || order;

    const normalized = {
        ...sourceOrder,
        event: order.event,
        occurredAt: order.occurredAt,
        user: sourceOrder.user || order.userId,
        status: sourceOrder.status || order.status,
        totalPrice: sourceOrder.totalPrice || sourceOrder.totals || sourceOrder.total || order.totalPrice || {
            amount: sourceOrder.totalAmount || order.amount || 0,
            currency: sourceOrder.currency || "INR",
        },
        shippingAddress: sourceOrder.shippingAddress || sourceOrder.address || {
            street: "",
            city: "",
            state: "",
            zip: "",
            country: "",
        },
    };

    const savedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId },
        { $set: normalized, $setOnInsert: { _id: orderId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await createOrderFeedEvents(savedOrder || normalized, order.event || "order.updated");
}

async function upsertPayment(payment) {
    const paymentId = pickId(payment, ["localPaymentId", "paymentRecordId"]);
    const orderId = pickId(payment, ["orderId", "order"]);
    const userId = pickId(payment, ["userId", "user"]);

    const normalized = {
        ...payment,
        order: orderId || payment.order,
        user: userId || payment.user,
        paymentId: payment.paymentId || payment.gatewayPaymentId || payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId || payment.gatewayOrderId || payment.razorpay_order_id,
        transactionId: payment.transactionId || payment.gatewayPaymentId || payment.razorpayPaymentId,
        gatewayPayload: payment.gatewayPayload || payment,
        price: payment.price || {
            amount: payment.amount || payment.total || 0,
            currency: payment.currency || "INR",
        },
    };

    if (!normalized.order || !normalized.user || !normalized.razorpayOrderId) return;

    const query = paymentId && /^[a-f\d]{24}$/i.test(paymentId)
        ? { _id: paymentId }
        : normalized.paymentId
            ? { paymentId: normalized.paymentId }
            : { order: normalized.order, razorpayOrderId: normalized.razorpayOrderId };

    await paymentModel.findOneAndUpdate(
        query,
        normalized,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await orderModel.findOneAndUpdate(
        { _id: normalized.order },
        {
            paymentSummary: {
                paymentId: normalized.paymentId,
                razorpayOrderId: normalized.razorpayOrderId,
                transactionId: normalized.transactionId,
                method: normalized.method,
                status: normalized.status,
                paidAt: normalized.status === "completed" ? new Date() : undefined,
                failedAt: normalized.status === "failed" ? new Date() : undefined,
            },
        },
        { new: true }
    );

    await createPaymentFeedEvents(normalized);
}

async function createSellerEvent(sellerId, eventData) {
    if (!sellerId) return null;

    const event = await DashboardEvent.create({
        seller: sellerId,
        ...eventData,
    });

    broadcastSellerEvent(sellerId, event.toObject());
    return event;
}

async function createOrderFeedEvents(order, eventName) {
    const productIds = (order.items || []).map((item) => item.product).filter(Boolean);
    if (!productIds.length) return;

    const products = await productModel.find({ _id: { $in: productIds } }).select("_id seller title").lean();
    const productsBySeller = new Map();

    products.forEach((product) => {
        const sellerId = product.seller?.toString();
        if (!sellerId) return;
        if (!productsBySeller.has(sellerId)) productsBySeller.set(sellerId, []);
        productsBySeller.get(sellerId).push(product);
    });

    await Promise.all(Array.from(productsBySeller.entries()).map(([sellerId, sellerProducts]) => createSellerEvent(sellerId, {
        type: eventName,
        title: eventName === "order.created" ? "New order received" : "Order status updated",
        message: `Order ${order._id || order.orderId || ""} includes ${sellerProducts.length} seller product(s).`,
        order: order._id || order.orderId,
        severity: eventName === "order.cancelled" || eventName === "order.expired" ? "warning" : "info",
        payload: {
            event: eventName,
            orderId: order._id || order.orderId,
            status: order.status,
            products: sellerProducts.map((product) => ({ productId: product._id, title: product.title })),
        },
    })));
}

async function createPaymentFeedEvents(payment) {
    const orderId = payment.order || payment.orderId;
    if (!orderId) return;

    const order = await orderModel.findById(orderId).lean();
    if (!order) return;

    const productIds = (order.items || []).map((item) => item.product).filter(Boolean);
    const products = await productModel.find({ _id: { $in: productIds } }).select("_id seller title").lean();
    const sellerIds = [...new Set(products.map((product) => product.seller?.toString()).filter(Boolean))];
    const isSuccess = payment.status === "completed";
    const isFailed = payment.status === "failed";

    await Promise.all(sellerIds.map((sellerId) => createSellerEvent(sellerId, {
        type: isSuccess ? "payment.success" : isFailed ? "payment.failed" : "payment.updated",
        title: isSuccess ? "Payment completed" : isFailed ? "Payment failed" : "Payment updated",
        message: `Payment for order ${orderId} is ${payment.status}.`,
        order: orderId,
        severity: isSuccess ? "success" : isFailed ? "danger" : "info",
        payload: {
            paymentId: payment.paymentId,
            transactionId: payment.transactionId,
            method: payment.method,
            status: payment.status,
            amount: payment.price,
        },
    })));
}

async function handleCartEvent(event) {
    const productId = event.productId;
    if (!productId) return;

    const product = await productModel.findById(productId).lean();
    if (!product?.seller) return;

    if (event.event === "cart.item_added") {
        await productModel.updateOne({ _id: productId }, { $inc: { "metrics.cartAdds": Number(event.quantity || 1) } });
    }

    await createSellerEvent(product.seller, {
        type: event.event || "cart.updated",
        title: event.event === "cart.item_added" ? "Product added to cart" : "Cart activity",
        message: `${product.title} received cart activity.`,
        product: productId,
        severity: "info",
        payload: event,
    });
}

module.exports = async function sellerDashboardListeners() {
    await SubscribeToQueue("AUTH_SELLER_DASHBOARD.user.created", upsertUser);
    await SubscribeToQueue("AUTH_SELLER_DASHBOARD.user.updated", upsertUser);

    await SubscribeToQueue("PRODUCT_SELLER_DASHBOARD.product.created", upsertProduct);
    await SubscribeToQueue("PRODUCT_SELLER_DASHBOARD.product.updated", upsertProduct);
    await SubscribeToQueue("PRODUCT_SELLER_DASHBOARD.product.deleted", deleteOrArchiveProduct);

    await SubscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", upsertOrder);
    await SubscribeToQueue("ORDER_LIFECYCLE.EVENT", upsertOrder);

    await SubscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", upsertPayment);
    await SubscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", upsertPayment);
    await SubscribeToQueue("PAYMENT_EVENTS.PAYMENT_LIFECYCLE", upsertPayment);
    await SubscribeToQueue("PAYMENT_ORDERS.PAYMENT_SUCCESS", upsertPayment);
    await SubscribeToQueue("PAYMENT_ORDERS.PAYMENT_FAILED", upsertPayment);

    await SubscribeToExchange(
        process.env.CART_EVENT_EXCHANGE || "cart.events",
        "cart.*",
        "SELLER_DASHBOARD.cart.events",
        handleCartEvent
    );
};
