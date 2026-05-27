const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    order:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    paymentId:{
        type:String,        
    },
    razorpayOrderId:{
        type:String, 
        required:true       
    },
    signature:{
        type:String,        
    },
    status:{
        type:String,
        enum:["pending","completed","failed","refunded"],
        default:"pending"
    },
    method: {
        type: String,
        enum: ["credit_card", "debit_card", "upi", "paypal", "cod", "razorpay"],
    },
    transactionId: {
        type: String,
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    price:{
        amount:{
            type:Number,
            required:true
        },
        currency:{
            type:String,
            required:true,
            default:"INR",
            enum:["INR","USD"]

        }
    },
    gatewayPayload: mongoose.Schema.Types.Mixed,
},{timestamps:true});

paymentSchema.index({ order: 1, user: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const paymentModel=mongoose.models.payment || mongoose.model("payment",paymentSchema);

module.exports=paymentModel;
