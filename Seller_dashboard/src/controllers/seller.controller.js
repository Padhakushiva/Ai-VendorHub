const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");
const mongoose = require('mongoose');
const LowStockAlert = require('../models/lowStockAlert.model');
const nodemailer = require('nodemailer');

async function getSellerMetrics(req, res){
    try{
        const seller = req.user;
        if (!seller || !seller._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Aggregate order items that belong to this seller's products
        const pipeline = [
            { $unwind: "$items" },
            { $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product"
            }},
            { $unwind: "$product" },
            { $match: { "product.seller": mongoose.Types.ObjectId(seller._id) } },
            { $group: {
                _id: "$items.product",
                quantitySold: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price.amount"] } },
                title: { $first: "$product.title" },
                images: { $first: "$product.images" },
                orders: { $addToSet: "$_id" }
            }},
            { $project: {
                productId: "$_id",
                title: 1,
                images: 1,
                quantitySold: 1,
                revenue: 1,
                ordersCount: { $size: "$orders" }
            }},
            { $sort: { quantitySold: -1 } }
        ];

        const results = await orderModel.aggregate(pipeline);

        // Compute totals
        let totalSales = 0;
        let totalRevenue = 0;
        results.forEach(r => {
            totalSales += r.quantitySold || 0;
            totalRevenue += r.revenue || 0;
        });

        const top = results.length ? results[0] : null;

        const response = {
            sales: totalSales,
            revenue: totalRevenue,
            topProduct: top ? {
                productId: top.productId,
                title: top.title,
                quantitySold: top.quantitySold,
                revenue: top.revenue,
                images: top.images || []
            } : null
        };

        return res.json(response);
    }
    catch(err){
        console.error("Error fetching seller metrics:", err);
        res.status(500).json({
            message:"Internal server error"
        });
    }
}

async function getSellerOrders(req, res){
    try{
        const seller = req.user;

        //get all orders for this seller
        const products = await productModel.find({ seller: seller._id }).select("_id");
        const productIds = products.map(p => p._id);

        //get all orders containing these products
        const orders = await orderModel.find({ "items.product": { $in: productIds } })
            .populate("items.product", "title images")
            .populate("payment", "status amount")
            .sort({ createdAt: -1 });

        //filter order items to only include those from this seller and format response
        const filteredOrders = orders.map(order => ({
            orderId: order._id,
            items: order.items.filter(i => productIds.includes(i.product._id)).map(i => ({
                productId: i.product._id,
                title: i.product.title,
                images: i.product.images,
                quantity: i.quantity,
                price: i.price
            })),
            paymentStatus: order.payment ? order.payment.status : "N/A",
            totalAmount: order.payment ? order.payment.amount : 0,
            createdAt: order.createdAt
        }));

        return res.json(filteredOrders);  
    }
    catch(err){
        console.error("Error fetching seller orders:", err);
        res.status(500).json({
            message:"Internal server error"
        });
    }
}


async function getSellerProducts(req, res){
    try{
        const seller = req.user;
        if (!seller || !seller._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const lowStockThreshold = parseInt(req.query.lowStockThreshold, 10) || 5;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
        const skip = (page - 1) * limit;

        const [ totalProducts, products, lowStockItems ] = await Promise.all([
            productModel.countDocuments({ seller: seller._id }),
            productModel.find({ seller: seller._id }).sort({ title: 1 }).skip(skip).limit(limit).lean(),
            productModel.find({ seller: seller._id, stock: { $lte: lowStockThreshold } }).select('title stock').lean()
        ]);

        const totalPages = Math.ceil(totalProducts / limit) || 1;

        const lowStock = lowStockItems.map(p => ({ productId: p._id, title: p.title, stock: p.stock }));

        const notify = req.query.notify === 'true' || req.query.notify === '1';
        let notificationResult = null;

        if (notify && lowStock.length) {
            const sellerEmail = seller.email;
            if (sellerEmail && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                // send email via nodemailer
                try{
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST,
                        port: parseInt(process.env.SMTP_PORT,10) || 587,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS
                        }
                    });

                    const lines = lowStock.map(l => `${l.title} — stock: ${l.stock}`);
                    const info = await transporter.sendMail({
                        from: process.env.SMTP_FROM || process.env.SMTP_USER,
                        to: sellerEmail,
                        subject: 'Low stock alert',
                        text: `The following products are low on stock:\n\n${lines.join('\n')}`
                    });

                    // persist alerts
                    await Promise.all(lowStock.map(l => LowStockAlert.create({
                        seller: seller._id,
                        product: l.productId,
                        productTitle: l.title,
                        stock: l.stock,
                        method: 'email',
                        notified: true
                    })));

                    notificationResult = { method: 'email', info };
                }
                catch(err){
                    console.error('Email send failed, falling back to DB alert', err);
                    await Promise.all(lowStock.map(l => LowStockAlert.create({
                        seller: seller._id,
                        product: l.productId,
                        productTitle: l.title,
                        stock: l.stock,
                        method: 'db',
                        notified: false
                    })));
                    notificationResult = { method: 'db', error: err.message };
                }
            } else {
                // persist to DB as fallback
                await Promise.all(lowStock.map(l => LowStockAlert.create({
                    seller: seller._id,
                    product: l.productId,
                    productTitle: l.title,
                    stock: l.stock,
                    method: 'db',
                    notified: false
                })));
                notificationResult = { method: 'db' };
            }
        }

        return res.json({ totalProducts, totalPages, page, limit, products, lowStock, notificationResult });
    }
    catch(err){
        console.error("Error fetching seller products:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    getSellerMetrics,
    getSellerOrders,
    getSellerProducts
};



