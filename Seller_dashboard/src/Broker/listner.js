const {SubscribeToQueue}=require("../Broker/broker")
const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");
const { subscribe } = require("../app");
module.exports = async function (){

    SubscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (user)=>{
        await userModel.updateOne(
            { username: user.username }, 
            user, 
            { upsert: true }
        );
    })   

    SubscribeToQueue("PRODUCT_SELLER_DASHBOARD.product.created", async (product)=>{
        await productModel.create(product);
    })  

    SubscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (order)=>{
        await orderModel.create(order);
    })

    SubscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", async (payment)=>{
        await paymentModel.create(
            payment
        );
    })

    SubscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", async (payment)=>{
        await paymentModel.findOneAndUpdate(
            { id: payment.id },
            payment,
            { upsert: true }
        );
    })

    
}