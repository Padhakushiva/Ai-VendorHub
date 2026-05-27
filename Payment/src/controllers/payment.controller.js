const paymentModels=require('../models/payment.model');
const axios=require('axios');
const { publishToQueue } = require('../Broker/broker');
const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3003";
const VALID_PAYMENT_METHODS = ["credit_card","debit_card","upi","paypal","cod"];

const getUserId = (user = {}) => user.id || user._id || user.userId;

async function safePublish(queueName, payload){
    if(!process.env.RABBITMQ_URL) return false;
    try{
        await publishToQueue(queueName,payload);
        return true;
    }catch(error){
        console.warn(`Payment event publish skipped for ${queueName}:`, error.message);
        return false;
    }
}

async function publishPaymentEvent(event, payment, extra = {}){
    const payload = {
        event,
        service:"payment",
        occurredAt:new Date().toISOString(),
        paymentId: payment?._id || extra.paymentId,
        gatewayPaymentId: payment?.paymentId || extra.gatewayPaymentId,
        razorpayOrderId: payment?.razorpayOrderId || extra.razorpayOrderId,
        orderId: payment?.order || extra.orderId,
        userId: payment?.user || extra.userId,
        amount: payment?.price?.amount || extra.amount,
        currency: payment?.price?.currency || extra.currency,
        status: payment?.status || extra.status,
        ...extra
    };

    await safePublish("PAYMENT_EVENTS.PAYMENT_LIFECYCLE", payload);

    if(event === "payment.success"){
        await safePublish("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", payload);
        await safePublish("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", payload);
        await safePublish("PAYMENT_ORDERS.PAYMENT_SUCCESS", payload);
    }

    if(event === "payment.failed"){
        await safePublish("PAYMENT_NOTIFICATION.PAYMENT_FAILED", payload);
        await safePublish("PAYMENT_ORDERS.PAYMENT_FAILED", payload);
    }

    return payload;
}

function normalizeMethod(method){
    if(!method) return undefined;
    return VALID_PAYMENT_METHODS.includes(method) ? method : undefined;
}

async function createPayment(req,res){

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
    
    try{
        const orderId=req.params.orderId || req.body.orderId;
        if(!orderId){
            return res.status(400).json({ message:"orderId is required" });
        }

        const existingPendingPayment = await paymentModels.findOne({
            order: orderId,
            user: getUserId(req.user),
            status: "pending"
        });

        if(existingPendingPayment){
            return res.status(200).json({
                message:"Existing pending payment returned",
                orderId: existingPendingPayment.razorpayOrderId,
                keyId: process.env.RAZORPAY_KEY_ID,
                payment: existingPendingPayment,
                idempotent: true
            });
        }

        let orderResponse;
        try{
            orderResponse=await axios.get(`${ORDER_SERVICE_URL}/api/orders/${orderId}`, {
                headers:{
                    "Authorization": token ? `Bearer ${token}` : ''
                }
            });
        }catch(axiosError){
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
            currency: orderResponse.data.order.totalPrice.currency || "INR",
            receipt: `order_${orderId}`
        });
        const  payment=await paymentModels.create({
            order:orderId,
            razorpayOrderId:order.id,
            user:getUserId(req.user),
            method:normalizeMethod(req.body.method),
            transactionId:req.body.transactionId,
            gatewayPayload:{
                razorpayOrder:order
            },
            price:{
                amount:price,
                currency:orderResponse.data.order.totalPrice.currency || "INR"
            }
        })
        
        await safePublish("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",payment);

        return res.status(201).json({
            message:"Payment initiated successfully",
            orderId:order.id,
            keyId:process.env.RAZORPAY_KEY_ID,
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
    const {razorpayOrderId,paymentId,signature,method,transactionId}=req.body;

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
        payment.method = normalizeMethod(method) || payment.method;
        payment.transactionId = transactionId || paymentId;
        payment.gatewayPayload = {
            ...(payment.gatewayPayload || {}),
            verification: {
                razorpayOrderId,
                paymentId,
                signature
            }
        };
        payment.status = "completed";
        await payment.save();


        await publishPaymentEvent("payment.success", payment, {
            email: req.user.email,
        });

        res.status(200).json({
            message:"Payment verified successfully",
            payment
        });

    } catch (error) {
        console.log(error);

        await publishPaymentEvent("payment.failed", null, {
            email: req.user.email,
            gatewayPaymentId: paymentId,
            razorpayOrderId,
            status:"failed",
            reason:error.message,
        });
        res.status(500).send('Error verifying payment');
  }
}

async function getPaymentById(req,res){
    try{
        const {id}=req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/)
            ? {_id:id}
            : {paymentId:id};

        const payment = await paymentModels.findOne(query);
        if(!payment){
            return res.status(404).json({message:"Payment not found"});
        }

        const currentUserId = getUserId(req.user)?.toString();
        const isAdmin = req.user?.role === "admin";
        const isOwner = payment.user?.toString() === currentUserId;

        if(!isAdmin && !isOwner){
            return res.status(403).json({
                message:"Forbidden: You do not have access to this payment"
            });
        }

        return res.status(200).json({payment});
    }catch(error){
        return res.status(500).json({
            message:"Internal server error",
            error:error.message
        });
    }
}

module.exports={createPayment, verifyPayment, getPaymentById}
