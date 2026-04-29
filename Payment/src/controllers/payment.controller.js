const paymentModel = require('../models/payment.model');
const axios = require('axios');

async function createPayment(req, res) {


    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];



    try{
        const orderId=req.params.orderId;

        const orderResponse=await axios.get(`${process.env.ORDER_SERVICE_URL}/api/orders/${orderId}`,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        });

        const orderData=orderResponse.data;
        console.log(orderResponse);

        // if(orderData.user.toString() !== req.user.id){
        //     return res.status(403).json({
        //         message:"Forbidden: You can only create payment for your own orders"
        //     });
        // }
    }catch(err){
        return res.status(500).json({
            message:"Server error while creating payment",
            error: err.message
        });
    }
}


module.exports={
    createPayment
}