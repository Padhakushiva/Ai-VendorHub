const express = require('express');
const router = express.Router();
const createAuthMiddleware = require("../middleware/auth.middleware");
const sellerController = require("../controllers/seller.controller");


router.get("/metrics",createAuthMiddleware(["seller"]), sellerController.getSellerMetrics);

router.get("/analytics/conversion-funnel", createAuthMiddleware(["seller"]), sellerController.getConversionFunnel);

router.get("/analytics/product-health", createAuthMiddleware(["seller"]), sellerController.getProductHealthDashboard);

router.get("/analytics/inventory-movement", createAuthMiddleware(["seller"]), sellerController.getInventoryMovement);

router.get("/analytics/top-losing-products", createAuthMiddleware(["seller"]), sellerController.getTopLosingProducts);

router.get("/analytics/inventory-risk", createAuthMiddleware(["seller"]), sellerController.getInventoryRisk);

router.get("/analytics/inventory-forecast", createAuthMiddleware(["seller"]), sellerController.getInventoryForecast);

router.get("/orders",createAuthMiddleware(["seller"]), sellerController.getSellerOrders);

router.get("/products",createAuthMiddleware(["seller"]), sellerController.getSellerProducts);

router.get("/feed", createAuthMiddleware(["seller"]), sellerController.getLiveOrderFeed);

router.patch("/feed/:id/read", createAuthMiddleware(["seller"]), sellerController.markFeedEventRead);

router.get("/low-stock-alerts", createAuthMiddleware(["seller"]), sellerController.getLowStockAlerts);

router.patch("/low-stock-alerts/:id/read", createAuthMiddleware(["seller"]), sellerController.markLowStockAlertRead);

router.patch("/low-stock-alerts/:id/resolve", createAuthMiddleware(["seller"]), sellerController.resolveLowStockAlert);


module.exports = router;
