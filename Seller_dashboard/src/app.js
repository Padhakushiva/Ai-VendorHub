const express = require('express');
const cookieParser = require('cookie-parser');
const sellerRoutes = require("./routes/seller.routes");


const app=express();
app.use(cookieParser());
app.use(express.json());

app.get("/",(req,res)=>{
    res.status(200).json({message:"Seller Dashboard API is running"});
});
app.use('/api/seller/dashboard', sellerRoutes);

module.exports=app;