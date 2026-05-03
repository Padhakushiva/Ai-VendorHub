const paymentModels=require('../models/payment.model');
const axios=require('axios');
const { publishToQueue } = require('../Broker/broker');
const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});




async function createPayment(req,res){

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
    
    console.log("🔍 Payment Debug:");
    console.log("   authHeader:", authHeader ? authHeader.substring(0, 20) + "..." : "MISSING");
    console.log("   token extracted:", token ? "YES" : "NO");
    console.log("   req.user:", req.user);
    
    try{
        const orderId=req.params.orderId;
        console.log("   orderId to fetch:", orderId);
        let orderResponse;
        try{
            orderResponse=await axios.get("http://localhost:3003/api/orders/" + orderId, {
                headers:{
                    "Authorization": token ? `Bearer ${token}` : ''
                }
            });
        }catch(axiosError){
            console.log("❌ Order Service Error:");
            console.log("   Status:", axiosError.response?.status);
            console.log("   Message:", axiosError.response?.data?.message);
            console.log("   Full error:", axiosError.message);
            
            if(axiosError.response?.status === 404){
                return res.status(404).json({
                    message: "Order not found"
                });
            }
            throw axiosError;
        }

        const price=orderResponse.data.order.totalPrice.amount;
        
        if (!price) {
            return res.status(400).json({
                message: "Order price not found",
                details: `Expected orderResponse.data.order.totalPrice.amount, got: ${price}`
            });
        }


        // Razorpay expects amount in paise (multiply by 100)
        const order=await razorpay.orders.create({
            amount: price * 100,
            currency: "INR"
        });
        const  payment=await paymentModels.create({
            order:orderId,
            razorpayOrderId:order.id,
            user:req.user.id,
            price:{
                amount:price,
                currency:"INR"
            }
        })
        
        await publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",payment);

        return res.status(201).json({
            message:"Payment initiated successfully",
            payment
        })

        

    }catch(err){
        console.error("Error processing payment:",err);
        res.status(500).json({
            message:"Internal server error"
        });
    }
}

async function verifyPayment(req,res){
    const {razorpayOrderId,paymentId,signature}=req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET

    try {   
        const isValid = validatePaymentVerification({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: paymentId
        }, signature, secret);

        if (!isValid) {
            return res.status(400).json({
                message: "Payment verification failed"
            });
        }

        const payment=await paymentModels.findOne({razorpayOrderId:razorpayOrderId, status:"pending"});

        if(!payment){
            return res.status(404).json({
                message:"Payment not found"
            });
        }


        // Update payment status in DB
        payment.paymentId = paymentId;
        payment.signature = signature;
        payment.status = "completed";
        await payment.save();


        await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
            email: req.user.email,
            orderId: payment.order,
            paymentId: payment._id,
            userId: payment.user,
            amount: payment.price.amount,
            currency: payment.price.currency
        });

        res.status(200).json({
            message:"Payment verified successfully",
            payment
        });

        await publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", payment);
        
        await publishToQueue("PAYMENT_ORDERS.PAYMENT_INITIATED", {
            email: req.user.email,
            orderId: payment.order,
            paymentId: payment._id,
            userId: payment.user,
            amount: payment.price.amount,
            currency: payment.price.currency,
            username:req.user.username,

        });

    } catch (error) {
        console.log(error);

        await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
            email: req.user.email,
            paymentId: paymentId,
            orderId: razorpayOrderId,
        });
        res.status(500).send('Error verifying payment');
  }
}


module.exports={createPayment, verifyPayment}