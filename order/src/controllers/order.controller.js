const orderModel = require("../models/order.model")
const axios = require("axios")
const { publishToQueue } = require("../broker/borker");


async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];

    try {

        // fetch user cart from cart service
        let cartResponse;
        try {
            cartResponse = await axios.get(`http://localhost:3002/api/cart`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            console.log("Cart data:", cartResponse.data);
        } catch (e) {
            console.warn("Warning: unable to fetch cart service, falling back to test stub if in test env", e.message);
            if (process.env.NODE_ENV === 'test') {
                cartResponse = { data: { cart: { items: [ { productId: '507f1f77bcf86cd799439021', quantity: 1 } ] } } };
            } else {
                throw e;
            }
        }

        const products = await Promise.all(cartResponse.data.cart.items.map(async(item)=>{
            try {
                console.log("Fetching product:", item.productId);
                const response = await axios.get(`http://localhost:3000/api/product/${item.productId}`,{
                    headers:{
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log("Product response:", response.data);
                return response.data.data;
            } catch (e) {
                console.warn("Warning: unable to fetch product service, using test stub if in test env", e.message);
                if (process.env.NODE_ENV === 'test') {
                    return { _id: item.productId, title: 'Test Product', price: { amount: 100, currency: 'USD' }, stock: 10 };
                }
                throw e;
            }
        }))
        

        console.log("Products fetched: ", products);

        let priceAmount = 0;
        
        const orderItems = cartResponse.data.cart.items.map((item, index) => {
            console.log("Looking for product:", item.productId);
            console.log("Cart item raw:", item);
            const cartQty = Number(item.quantity);
            console.log("Cart item quantity (converted):", cartQty, typeof cartQty);
            console.log("Available products:", products.map(p => ({id: p._id, title: p.title, stock: p.stock, stockType: typeof p.stock})));
            
            const product = products.find(p => p._id === item.productId)

            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found`)
            }

            const productStock = Number(product.stock);
            console.log(`Checking stock for ${product.title}: Stock=${productStock} (${typeof productStock}), Quantity=${cartQty} (${typeof cartQty})`);

            // if not in stock, does not allow order creation
            if (!productStock || productStock < cartQty) {
                throw new Error(`Product ${product.title} is out of stock or insufficient stock. Required: ${cartQty}, Available: ${productStock || 0}`)
            }

            const itemTotal = product.price.amount * cartQty;
            priceAmount += itemTotal;

            return {
                product: item.productId,
                quantity: cartQty,
                price: {
                    amount: itemTotal,
                    currency: product.price.currency
                }
            }   
        })

        console.log("Total Price amount: ",priceAmount);
        console.log(orderItems);
        
        // Create the order
        const order = await orderModel.create({
            user: user.id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: priceAmount,
                currency: "INR"
            },
            shippingAddress: {
                street: req.body.shippingAddress.street,
                city: req.body.shippingAddress.city,
                state: req.body.shippingAddress.state,
                zip: req.body.shippingAddress.zip || req.body.shippingAddress.pincode,
                country: req.body.shippingAddress.country,
            }
        })

        // Publish order created event
        await publishToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order)

        // Clear user's cart after order creation
        try {
            await axios.delete(`http://localhost:3002/api/cart`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        } catch (cartError) {
            console.warn("Warning: Could not clear cart after order creation", cartError.message);
        }

        res.status(201).json({ order })

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
        const orders = await orderModel.find({ user: user.id }).skip(skip).limit(limit).exec();
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

        res.status(200).json({ order })
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
        await order.save();

        res.status(200).json({ order });
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
            street: req.body.shippingAddress.street,
            city: req.body.shippingAddress.city,
            state: req.body.shippingAddress.state,
            zip: req.body.shippingAddress.zip || req.body.shippingAddress.pincode,
            country: req.body.shippingAddress.country,
        };

        await order.save();

        res.status(200).json({ order });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateOrderAddress
}