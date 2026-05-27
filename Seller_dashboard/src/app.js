const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const sellerRoutes = require("./routes/seller.routes");


const app=express();
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.get("/",(req,res)=>{
    res.status(200).json({message:"Seller Dashboard API is running"});
});
app.use('/api/seller/dashboard', sellerRoutes);
app.use('/seller/dashboard', sellerRoutes);

module.exports=app;
