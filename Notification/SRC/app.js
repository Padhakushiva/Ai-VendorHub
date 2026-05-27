const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const {connect}=require('./Broker/broker');
const setupListeners=require('./Broker/listners');
const notificationRoutes = require('./routes/notification.routes');

const app=express();
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

if (process.env.RABBITMQ_URL) {
    connect().then(async ()=>{
        await setupListeners();
    }).catch((error)=>{
        console.warn("Notification listeners disabled:", error.message);
    })
} else {
    console.warn("Notification listeners disabled: RABBITMQ_URL is not configured");
}


app.get("/",(req,res)=>{
    res.status(200).json({message:"Notification API is running"});
});

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);


module.exports = app;
