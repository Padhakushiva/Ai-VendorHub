const express = require('express');
const router = express.Router();
const createAuthMiddleware = require("../middleware/auth.middleware");
const sellerController = require("../controllers/seller.controller");


router.get("/metrics",createAuthMiddleware(["seller"]), sellerController.getSellerMetrics);

router.get("/orders",createAuthMiddleware(["seller"]), sellerController.getSellerOrders);



router.get("/products",createAuthMiddleware(["seller"]), sellerController.getSellerProducts);


module.exports = router;