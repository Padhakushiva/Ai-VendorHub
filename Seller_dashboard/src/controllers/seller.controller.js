const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");
const LowStockAlert = require("../models/lowStockAlert.model");
const DashboardEvent = require("../models/dashboardEvent.model");

const COMPLETED_PAYMENT_STATUSES = new Set(["completed", "paid", "success"]);
const FAILED_PAYMENT_STATUSES = new Set(["failed", "cancelled"]);
const SELLING_ORDER_STATUSES = new Set(["CONFIRMED", "PAID", "PACKED", "SHIPPED", "DELIVERED"]);
const CANCELLED_ORDER_STATUSES = new Set(["CANCELLED", "EXPIRED"]);

function getSellerId(req) {
    return req.user?._id || req.user?.id || req.user?.userId || req.user?.accountId;
}

function toObjectId(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
}

function idToString(id) {
    if (!id) return "";
    return id._id ? id._id.toString() : id.toString();
}

function getMoneyAmount(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    return Number(value.amount || 0);
}

function getMoneyCurrency(value, fallback = "INR") {
    return value?.currency || fallback;
}

function getItemUnitPrice(item) {
    return getMoneyAmount(item.finalPrice) || getMoneyAmount(item.price);
}

function getPaymentAmount(payment) {
    return getMoneyAmount(payment?.price) || getMoneyAmount(payment?.amount);
}

function normalizePage(queryPage) {
    return Math.max(parseInt(queryPage, 10) || 1, 1);
}

function normalizeLimit(queryLimit, fallback = 10, max = 100) {
    return Math.min(Math.max(parseInt(queryLimit, 10) || fallback, 1), max);
}

function sellerProductFilter(req, overrides = {}) {
    const sellerId = getSellerId(req);
    const objectId = toObjectId(sellerId);
    return {
        seller: objectId || sellerId,
        ...overrides,
    };
}

function buildProductMap(products) {
    return new Map(products.map((product) => [product._id.toString(), product]));
}

function getSellerItems(order, productMap) {
    return (order.items || []).filter((item) => productMap.has(idToString(item.product)));
}

function summarizeSellerOrder(order, productMap, payment) {
    const sellerItems = getSellerItems(order, productMap);
    const currency = sellerItems[0]
        ? getMoneyCurrency(sellerItems[0].finalPrice || sellerItems[0].price)
        : getMoneyCurrency(order.totalPrice);
    const sellerSubtotal = sellerItems.reduce((total, item) => total + getItemUnitPrice(item) * Number(item.quantity || 1), 0);

    return {
        orderId: order._id,
        user: order.user,
        status: order.status,
        paymentStatus: payment?.status || order.paymentSummary?.status || "pending",
        paymentMethod: payment?.method || order.paymentSummary?.method || null,
        transactionId: payment?.transactionId || order.paymentSummary?.transactionId || null,
        sellerSubtotal: {
            amount: sellerSubtotal,
            currency,
        },
        totalAmount: order.totalPrice,
        items: sellerItems.map((item) => {
            const product = productMap.get(idToString(item.product));
            return {
                product: item.product,
                title: product?.title || item.title || item.productSnapshot?.title,
                image: product?.images?.[0]?.url || item.image || item.productSnapshot?.image,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.finalPrice || item.price,
                lineTotal: {
                    amount: getItemUnitPrice(item) * Number(item.quantity || 1),
                    currency,
                },
                reservationStatus: item.reservationStatus,
            };
        }),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}

async function getSellerProductContext(req) {
    const products = await productModel.find(sellerProductFilter(req)).lean();
    const productIds = products.map((product) => product._id);
    const productMap = buildProductMap(products);
    return { products, productIds, productMap };
}

async function getPaymentsByOrderIds(orderIds) {
    const payments = await paymentModel.find({ order: { $in: orderIds } }).sort({ createdAt: -1 }).lean();
    const map = new Map();
    payments.forEach((payment) => {
        const orderId = idToString(payment.order);
        if (!map.has(orderId)) map.set(orderId, payment);
    });
    return map;
}

function getProductMetric(product, key) {
    return Number(product.metrics?.[key] || 0);
}

function getProductWishlistMetric(product) {
    return Number(product.metrics?.wishlist ?? product.metrics?.wishlistCount ?? 0);
}

function resolveDateRange(query) {
    const days = Math.max(parseInt(query.days, 10) || 30, 1);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to, days };
}

function buildProductOrderStats(orders, productMap) {
    const stats = new Map();

    for (const productId of productMap.keys()) {
        stats.set(productId, {
            orderCount: 0,
            cancelledCount: 0,
            quantitySold: 0,
            revenue: 0,
            lastOrderAt: null,
        });
    }

    orders.forEach((order) => {
        const orderDate = order.createdAt ? new Date(order.createdAt) : null;
        (order.items || []).forEach((item) => {
            const productId = idToString(item.product);
            if (!productMap.has(productId)) return;

            const stat = stats.get(productId);
            const quantity = Number(item.quantity || 1);
            const lineRevenue = getItemUnitPrice(item) * quantity;

            if (CANCELLED_ORDER_STATUSES.has(order.status)) {
                stat.cancelledCount += 1;
            } else if (SELLING_ORDER_STATUSES.has(order.status)) {
                stat.orderCount += 1;
                stat.quantitySold += quantity;
                stat.revenue += lineRevenue;
                if (orderDate && (!stat.lastOrderAt || orderDate > stat.lastOrderAt)) {
                    stat.lastOrderAt = orderDate;
                }
            }
        });
    });

    return stats;
}

async function getSellerAnalyticsContext(req, query = req.query) {
    const { products, productIds, productMap } = await getSellerProductContext(req);
    const { from, to, days } = resolveDateRange(query);
    const orderFilter = productIds.length
        ? { "items.product": { $in: productIds }, createdAt: { $gte: from, $lte: to } }
        : { _id: { $exists: false } };
    const orders = await orderModel.find(orderFilter).sort({ createdAt: -1 }).lean();
    const productStats = buildProductOrderStats(orders, productMap);

    return { products, productIds, productMap, orders, productStats, from, to, days };
}

function buildConversionRows(products, productStats) {
    return products.map((product) => {
        const productId = product._id.toString();
        const stats = productStats.get(productId) || {};
        const views = getProductMetric(product, "views");
        const cartAdds = getProductMetric(product, "cartAdds");
        const orderCount = Number(stats.orderCount || getProductMetric(product, "orders"));
        const conversionRate = views > 0 ? Number(((orderCount / views) * 100).toFixed(2)) : 0;
        const cartRate = views > 0 ? Number(((cartAdds / views) * 100).toFixed(2)) : 0;
        const purchaseFromCartRate = cartAdds > 0 ? Number(((orderCount / cartAdds) * 100).toFixed(2)) : 0;

        return {
            productId: product._id,
            title: product.title,
            views,
            cartAdds,
            orderCount,
            conversionRate,
            cartRate,
            purchaseFromCartRate,
            revenue: Number(stats.revenue || 0),
        };
    });
}

function getProductHealth(product, stats) {
    const issues = [];
    const views = getProductMetric(product, "views");
    const cartAdds = getProductMetric(product, "cartAdds");
    const orderCount = Number(stats?.orderCount || getProductMetric(product, "orders"));
    const conversionRate = views > 0 ? (orderCount / views) * 100 : 0;
    const imageCount = product.images?.length || 0;
    const tagCount = product.tags?.length || 0;

    let score = 100;
    if (imageCount === 0) {
        issues.push("No product image uploaded");
        score -= 25;
    } else if (imageCount < 2) {
        issues.push("Only few images uploaded");
        score -= 10;
    }
    if (tagCount === 0) {
        issues.push("Missing tags");
        score -= 15;
    }
    if (Number(product.stock || 0) <= 0) {
        issues.push("Out of stock");
        score -= 25;
    } else if (Number(product.stock || 0) <= 5) {
        issues.push("Low stock");
        score -= 15;
    }
    if (views >= 50 && conversionRate < 2) {
        issues.push("Low conversion despite traffic");
        score -= 20;
    }
    if (cartAdds >= 10 && orderCount === 0) {
        issues.push("Cart interest but no purchases");
        score -= 15;
    }

    score = Math.max(score, 0);
    const status = score >= 80 ? "healthy" : score >= 50 ? "needs_attention" : "critical";

    return {
        productId: product._id,
        title: product.title,
        status,
        healthScore: score,
        issues,
        imageCount,
        tagCount,
        stock: product.stock,
        views,
        cartAdds,
        orderCount,
        conversionRate: Number(conversionRate.toFixed(2)),
    };
}

function getMovementCategory(quantitySold, daysSinceLastOrder, avgDailySales) {
    if (quantitySold === 0 && daysSinceLastOrder >= 30) return "dead_inventory";
    if (avgDailySales >= 1 || quantitySold >= 10) return "fast_moving";
    if (avgDailySales > 0) return "slow_moving";
    return "no_sales";
}

function getRiskLevel(stock, avgDailySales) {
    if (stock <= 0) return { riskLevel: "out_of_stock", estimatedDaysLeft: 0 };
    if (avgDailySales <= 0) return { riskLevel: "no_current_demand", estimatedDaysLeft: null };

    const estimatedDaysLeft = Number((stock / avgDailySales).toFixed(1));
    if (estimatedDaysLeft <= 7) return { riskLevel: "high", estimatedDaysLeft };
    if (estimatedDaysLeft <= 15) return { riskLevel: "medium", estimatedDaysLeft };
    return { riskLevel: "low", estimatedDaysLeft };
}

async function sendLowStockEmail(sellerEmail, lowStockProducts) {
    if (!sellerEmail || !process.env.SMTP_USER || !process.env.SMTP_PASS || lowStockProducts.length === 0) {
        return { sent: false, method: "db", reason: "SMTP credentials or seller email missing" };
    }

    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: sellerEmail,
        subject: "Low stock alert",
        text: lowStockProducts.map((product) => `${product.title}: ${product.stock} left`).join("\n"),
    });

    return { sent: true, method: "email" };
}

async function upsertLowStockAlerts(req, lowStockProducts, notifyResult) {
    const sellerId = getSellerId(req);
    const sellerObjectId = toObjectId(sellerId);

    await Promise.all(lowStockProducts.map((product) => LowStockAlert.findOneAndUpdate(
        {
            seller: sellerObjectId || sellerId,
            product: product._id,
            status: "open",
        },
        {
            seller: sellerObjectId || sellerId,
            product: product._id,
            productTitle: product.title,
            stock: product.stock,
            method: notifyResult.method || "db",
            notified: Boolean(notifyResult.sent),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )));
}

async function getSellerMetrics(req, res) {
    try {
        const { products, productIds, productMap } = await getSellerProductContext(req);
        const orderFilter = productIds.length ? { "items.product": { $in: productIds } } : { _id: { $exists: false } };
        const orders = await orderModel.find(orderFilter).sort({ createdAt: -1 }).lean();
        const paymentsByOrder = await getPaymentsByOrderIds(orders.map((order) => order._id));

        const ordersByStatus = {};
        const paymentSummary = { pending: 0, completed: 0, failed: 0, refunded: 0 };
        const topProductMap = new Map();
        let unitsSold = 0;
        let grossRevenue = 0;
        let paidRevenue = 0;

        const sellerOrders = orders.map((order) => {
            ordersByStatus[order.status || "PENDING"] = (ordersByStatus[order.status || "PENDING"] || 0) + 1;
            const payment = paymentsByOrder.get(order._id.toString());
            const paymentStatus = payment?.status || order.paymentSummary?.status || "pending";
            paymentSummary[paymentStatus] = (paymentSummary[paymentStatus] || 0) + 1;

            const summary = summarizeSellerOrder(order, productMap, payment);
            grossRevenue += summary.sellerSubtotal.amount;
            if (COMPLETED_PAYMENT_STATUSES.has(paymentStatus)) {
                paidRevenue += summary.sellerSubtotal.amount || getPaymentAmount(payment);
            }

            summary.items.forEach((item) => {
                unitsSold += Number(item.quantity || 0);
                const key = idToString(item.product);
                const current = topProductMap.get(key) || {
                    product: item.product,
                    title: item.title,
                    quantity: 0,
                    revenue: 0,
                };
                current.quantity += Number(item.quantity || 0);
                current.revenue += getMoneyAmount(item.lineTotal);
                topProductMap.set(key, current);
            });

            return summary;
        });

        const activeProducts = products.filter((product) => product.status === "active").length;
        const lowStockProducts = products.filter((product) => Number(product.stock || 0) <= Number(req.query.lowStockThreshold || 5));
        const topProducts = Array.from(topProductMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const conversionRows = buildConversionRows(products, productStatsFromSummaries(products, topProductMap));

        return res.status(200).json({
            totalProducts: products.length,
            activeProducts,
            inactiveProducts: products.filter((product) => product.status === "inactive").length,
            archivedProducts: products.filter((product) => product.status === "archived").length,
            totalOrders: sellerOrders.length,
            unitsSold,
            grossRevenue: {
                amount: grossRevenue,
                currency: products[0]?.price?.currency || "INR",
            },
            paidRevenue: {
                amount: paidRevenue,
                currency: products[0]?.price?.currency || "INR",
            },
            averageOrderValue: {
                amount: sellerOrders.length ? Number((grossRevenue / sellerOrders.length).toFixed(2)) : 0,
                currency: products[0]?.price?.currency || "INR",
            },
            ordersByStatus,
            paymentSummary,
            lowStockCount: lowStockProducts.length,
            lowStockProducts: lowStockProducts.slice(0, 10),
            topProducts,
            conversionFunnel: {
                views: products.reduce((sum, product) => sum + getProductMetric(product, "views"), 0),
                cartAdds: products.reduce((sum, product) => sum + getProductMetric(product, "cartAdds"), 0),
                orders: unitsSold,
                conversionRate: products.reduce((sum, product) => sum + getProductMetric(product, "views"), 0) > 0
                    ? Number(((unitsSold / products.reduce((sum, product) => sum + getProductMetric(product, "views"), 0)) * 100).toFixed(2))
                    : 0,
                topProducts: conversionRows.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5),
            },
            recentOrders: sellerOrders.slice(0, 5),
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching seller metrics", error: error.message });
    }
}

function productStatsFromSummaries(products, topProductMap) {
    const map = new Map();
    products.forEach((product) => {
        const topStats = topProductMap.get(product._id.toString()) || {};
        map.set(product._id.toString(), {
            orderCount: topStats.quantity || getProductMetric(product, "orders"),
            quantitySold: topStats.quantity || 0,
            revenue: topStats.revenue || 0,
        });
    });
    return map;
}

async function getConversionFunnel(req, res) {
    try {
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const productsFunnel = buildConversionRows(products, productStats)
            .sort((a, b) => b.views - a.views);

        const totals = productsFunnel.reduce((acc, item) => {
            acc.views += item.views;
            acc.cartAdds += item.cartAdds;
            acc.orders += item.orderCount;
            acc.revenue += item.revenue;
            return acc;
        }, { views: 0, cartAdds: 0, orders: 0, revenue: 0 });

        return res.status(200).json({
            range: { from, to, days },
            totals: {
                ...totals,
                viewToCartRate: totals.views > 0 ? Number(((totals.cartAdds / totals.views) * 100).toFixed(2)) : 0,
                viewToOrderRate: totals.views > 0 ? Number(((totals.orders / totals.views) * 100).toFixed(2)) : 0,
                cartToOrderRate: totals.cartAdds > 0 ? Number(((totals.orders / totals.cartAdds) * 100).toFixed(2)) : 0,
            },
            products: productsFunnel,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching conversion funnel", error: error.message });
    }
}

async function getProductHealthDashboard(req, res) {
    try {
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const health = products.map((product) => getProductHealth(product, productStats.get(product._id.toString())))
            .sort((a, b) => a.healthScore - b.healthScore);

        return res.status(200).json({
            range: { from, to, days },
            summary: {
                totalProducts: health.length,
                healthy: health.filter((item) => item.status === "healthy").length,
                needsAttention: health.filter((item) => item.status === "needs_attention").length,
                critical: health.filter((item) => item.status === "critical").length,
            },
            products: health,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching product health", error: error.message });
    }
}

async function getInventoryMovement(req, res) {
    try {
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const now = new Date();
        const productsMovement = products.map((product) => {
            const stats = productStats.get(product._id.toString()) || {};
            const quantitySold = Number(stats.quantitySold || 0);
            const avgDailySales = Number((quantitySold / days).toFixed(2));
            const daysSinceLastOrder = stats.lastOrderAt
                ? Math.floor((now - new Date(stats.lastOrderAt)) / (24 * 60 * 60 * 1000))
                : days;

            return {
                productId: product._id,
                title: product.title,
                stock: product.stock,
                quantitySold,
                averageDailySales: avgDailySales,
                lastOrderAt: stats.lastOrderAt,
                daysSinceLastOrder,
                movement: getMovementCategory(quantitySold, daysSinceLastOrder, avgDailySales),
            };
        }).sort((a, b) => b.quantitySold - a.quantitySold);

        return res.status(200).json({
            range: { from, to, days },
            summary: {
                fastMoving: productsMovement.filter((item) => item.movement === "fast_moving").length,
                slowMoving: productsMovement.filter((item) => item.movement === "slow_moving").length,
                deadInventory: productsMovement.filter((item) => item.movement === "dead_inventory").length,
                noSales: productsMovement.filter((item) => item.movement === "no_sales").length,
            },
            products: productsMovement,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching inventory movement", error: error.message });
    }
}

async function getTopLosingProducts(req, res) {
    try {
        const minViews = Number(req.query.minViews || 20);
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const losingProducts = products.map((product) => {
            const stats = productStats.get(product._id.toString()) || {};
            const views = getProductMetric(product, "views");
            const cartAdds = getProductMetric(product, "cartAdds");
            const orderCount = Number(stats.orderCount || 0);
            const cancelledCount = Number(stats.cancelledCount || 0);
            const conversionRate = views > 0 ? (orderCount / views) * 100 : 0;
            const cancellationRatio = (orderCount + cancelledCount) > 0
                ? (cancelledCount / (orderCount + cancelledCount)) * 100
                : 0;
            const losingScore = Number(((views >= minViews ? views / Math.max(orderCount, 1) : 0) + cancellationRatio).toFixed(2));

            return {
                productId: product._id,
                title: product.title,
                views,
                cartAdds,
                orderCount,
                cancelledCount,
                conversionRate: Number(conversionRate.toFixed(2)),
                cancellationRatio: Number(cancellationRatio.toFixed(2)),
                losingScore,
                reasons: [
                    ...(views >= minViews && orderCount <= 1 ? ["High views but low orders"] : []),
                    ...(cancelledCount > 0 ? ["Cancellation/expiry detected"] : []),
                    ...(cartAdds >= 10 && orderCount === 0 ? ["Cart adds not converting"] : []),
                ],
            };
        }).filter((item) => item.reasons.length > 0)
            .sort((a, b) => b.losingScore - a.losingScore)
            .slice(0, normalizeLimit(req.query.limit, 10, 50));

        return res.status(200).json({
            range: { from, to, days },
            minViews,
            products: losingProducts,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching top losing products", error: error.message });
    }
}

async function getInventoryRisk(req, res) {
    try {
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const risks = products.map((product) => {
            const stats = productStats.get(product._id.toString()) || {};
            const avgDailySales = Number((Number(stats.quantitySold || 0) / days).toFixed(2));
            const risk = getRiskLevel(Number(product.stock || 0), avgDailySales);

            return {
                productId: product._id,
                title: product.title,
                stockRemaining: product.stock,
                quantitySold: Number(stats.quantitySold || 0),
                averageDailySales: avgDailySales,
                ...risk,
            };
        }).sort((a, b) => {
            const order = { out_of_stock: 0, high: 1, medium: 2, low: 3, no_current_demand: 4 };
            return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9);
        });

        return res.status(200).json({
            range: { from, to, days },
            summary: {
                outOfStock: risks.filter((item) => item.riskLevel === "out_of_stock").length,
                highRisk: risks.filter((item) => item.riskLevel === "high").length,
                mediumRisk: risks.filter((item) => item.riskLevel === "medium").length,
                lowRisk: risks.filter((item) => item.riskLevel === "low").length,
                noCurrentDemand: risks.filter((item) => item.riskLevel === "no_current_demand").length,
            },
            products: risks,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching inventory risk", error: error.message });
    }
}

async function getInventoryForecast(req, res) {
    try {
        const { products, productStats, from, to, days } = await getSellerAnalyticsContext(req);
        const now = new Date();
        const forecast = products.map((product) => {
            const stats = productStats.get(product._id.toString()) || {};
            const avgDailySales = Number((Number(stats.quantitySold || 0) / days).toFixed(2));
            const risk = getRiskLevel(Number(product.stock || 0), avgDailySales);
            const estimatedStockOutDate = risk.estimatedDaysLeft === null
                ? null
                : new Date(now.getTime() + risk.estimatedDaysLeft * 24 * 60 * 60 * 1000);

            return {
                productId: product._id,
                title: product.title,
                currentStock: product.stock,
                averageSalesPerDay: avgDailySales,
                estimatedDaysLeft: risk.estimatedDaysLeft,
                estimatedStockOutDate,
                forecastStatus: risk.riskLevel,
                recommendation: risk.riskLevel === "high" || risk.riskLevel === "out_of_stock"
                    ? "Restock urgently"
                    : risk.riskLevel === "medium"
                        ? "Plan restock soon"
                        : risk.riskLevel === "no_current_demand"
                            ? "Monitor demand before restocking"
                            : "Stock level looks safe",
            };
        }).sort((a, b) => (a.estimatedDaysLeft ?? 999999) - (b.estimatedDaysLeft ?? 999999));

        return res.status(200).json({
            range: { from, to, days },
            products: forecast,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching inventory forecast", error: error.message });
    }
}

async function getSellerOrders(req, res) {
    try {
        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit);
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const { productIds, productMap } = await getSellerProductContext(req);

        const filter = productIds.length ? { "items.product": { $in: productIds } } : { _id: { $exists: false } };
        if (status) filter.status = status;

        const [orders, totalOrders] = await Promise.all([
            orderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            orderModel.countDocuments(filter),
        ]);

        const paymentsByOrder = await getPaymentsByOrderIds(orders.map((order) => order._id));
        let sellerOrders = orders.map((order) => summarizeSellerOrder(order, productMap, paymentsByOrder.get(order._id.toString())));

        if (paymentStatus) {
            sellerOrders = sellerOrders.filter((order) => order.paymentStatus === paymentStatus);
        }

        return res.status(200).json({
            page,
            limit,
            totalOrders,
            totalPages: Math.ceil(totalOrders / limit),
            orders: sellerOrders,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching seller orders", error: error.message });
    }
}

async function getSellerProducts(req, res) {
    try {
        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit);
        const lowStockThreshold = Number(req.query.lowStockThreshold || 5);
        const filter = sellerProductFilter(req);

        if (req.query.status) filter.status = req.query.status;
        if (req.query.lowStockOnly === "true") filter.stock = { $lte: lowStockThreshold };
        if (req.query.q) filter.$text = { $search: req.query.q };

        const sortMap = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            price_asc: { "price.amount": 1 },
            price_desc: { "price.amount": -1 },
            stock_asc: { stock: 1 },
            stock_desc: { stock: -1 },
        };
        const sort = sortMap[req.query.sort] || sortMap.newest;

        const [products, totalProducts, lowStock] = await Promise.all([
            productModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
            productModel.countDocuments(filter),
            productModel.find(sellerProductFilter(req, { stock: { $lte: lowStockThreshold }, status: { $ne: "archived" } })).sort({ stock: 1 }).lean(),
        ]);

        let notificationResult = null;
        if (req.query.notify === "true") {
            notificationResult = await sendLowStockEmail(req.user?.email, lowStock);
            await upsertLowStockAlerts(req, lowStock, notificationResult);
        }

        return res.status(200).json({
            page,
            limit,
            totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            products,
            lowStockThreshold,
            lowStockCount: lowStock.length,
            lowStock,
            notificationResult,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching seller products", error: error.message });
    }
}

async function getLowStockAlerts(req, res) {
    try {
        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit);
        const filter = { seller: toObjectId(getSellerId(req)) || getSellerId(req) };

        if (req.query.status) filter.status = req.query.status;
        if (req.query.read === "true") filter.read = true;
        if (req.query.read === "false") filter.read = false;

        const [alerts, totalAlerts] = await Promise.all([
            LowStockAlert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            LowStockAlert.countDocuments(filter),
        ]);

        return res.status(200).json({
            page,
            limit,
            totalAlerts,
            totalPages: Math.ceil(totalAlerts / limit),
            alerts,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching low stock alerts", error: error.message });
    }
}

async function markLowStockAlertRead(req, res) {
    try {
        const alert = await LowStockAlert.findOneAndUpdate(
            { _id: req.params.id, seller: toObjectId(getSellerId(req)) || getSellerId(req) },
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!alert) return res.status(404).json({ message: "Low stock alert not found" });
        return res.status(200).json({ message: "Low stock alert marked as read", alert });
    } catch (error) {
        return res.status(500).json({ message: "Error updating low stock alert", error: error.message });
    }
}

async function resolveLowStockAlert(req, res) {
    try {
        const alert = await LowStockAlert.findOneAndUpdate(
            { _id: req.params.id, seller: toObjectId(getSellerId(req)) || getSellerId(req) },
            { status: "resolved", resolvedAt: new Date(), read: true, readAt: new Date() },
            { new: true }
        );

        if (!alert) return res.status(404).json({ message: "Low stock alert not found" });
        return res.status(200).json({ message: "Low stock alert resolved", alert });
    } catch (error) {
        return res.status(500).json({ message: "Error resolving low stock alert", error: error.message });
    }
}

async function getLiveOrderFeed(req, res) {
    try {
        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit, 20, 100);
        const filter = { seller: toObjectId(getSellerId(req)) || getSellerId(req) };

        if (req.query.type) filter.type = req.query.type;
        if (req.query.read === "true") filter.read = true;
        if (req.query.read === "false") filter.read = false;

        const [events, totalEvents, unreadCount] = await Promise.all([
            DashboardEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            DashboardEvent.countDocuments(filter),
            DashboardEvent.countDocuments({ ...filter, read: false }),
        ]);

        return res.status(200).json({
            page,
            limit,
            totalEvents,
            totalPages: Math.ceil(totalEvents / limit),
            unreadCount,
            events,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching live order feed", error: error.message });
    }
}

async function markFeedEventRead(req, res) {
    try {
        const event = await DashboardEvent.findOneAndUpdate(
            { _id: req.params.id, seller: toObjectId(getSellerId(req)) || getSellerId(req) },
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!event) return res.status(404).json({ message: "Dashboard event not found" });
        return res.status(200).json({ message: "Dashboard event marked as read", event });
    } catch (error) {
        return res.status(500).json({ message: "Error updating dashboard event", error: error.message });
    }
}

module.exports = {
    getSellerMetrics,
    getConversionFunnel,
    getProductHealthDashboard,
    getInventoryMovement,
    getTopLosingProducts,
    getInventoryRisk,
    getInventoryForecast,
    getSellerOrders,
    getSellerProducts,
    getLowStockAlerts,
    markLowStockAlertRead,
    resolveLowStockAlert,
    getLiveOrderFeed,
    markFeedEventRead,
};
