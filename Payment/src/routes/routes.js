const express=require('express');
const router=express.Router();
const paymentController=require('../controllers/payment.controller');

const createAuthMiddleware=require('../../middleware/auth.middleware');



// crate payment
router.post('/create/:orderId',createAuthMiddleware(['user']),paymentController.createPayment);

router.post('/razorpay/order',createAuthMiddleware(['user']),paymentController.createPayment);


// verify payment
router.post("/verify",createAuthMiddleware(['user']),paymentController.verifyPayment);

router.get("/:id",createAuthMiddleware(['user','admin']),paymentController.getPaymentById);



module.exports=router;
