const express = require("express")
const createAuthMiddleware = require("../middlewares/auth.middleware")
const orderController = require("../controllers/order.controller")
const validation = require("../middlewares/validation.middleware")


const router = express.Router()

// POST / Create Order - apply transform middleware BEFORE validation
router.post("/", 
    createAuthMiddleware([ "user" ]), 
    validation.transformAddressFormat,
    validation.createOrderValidation, 
    orderController.createOrder
)

router.get("/me", createAuthMiddleware([ "user" ]), orderController.getMyOrders)

router.post("/:id/cancel", createAuthMiddleware([ "user" ]), orderController.cancelOrderById)

// PATCH / Update Address - apply transform middleware BEFORE validation
router.patch("/:id/address", 
    createAuthMiddleware([ "user" ]), 
    validation.transformAddressFormat,
    validation.updateAddressValidation, 
    orderController.updateOrderAddress
)

router.get("/:id", createAuthMiddleware([ "user", "admin" ]), orderController.getOrderById)

module.exports = router;
