const express = require('express');
const {connect, SubscribeToQueue}=require('./Broker/broker');
const setupListeners=require('./Broker/listners');

const app=express();


connect().then(()=>{
    setupListeners();
}).catch((error)=>{
    console.error("Failed to connect to RabbitMQ:", error);
    process.exit(1); // Exit the application if connection fails
})


app.get("/",(req,res)=>{
    res.status(200).json({message:"Notification API is running"});
});

app.get('/',(req,res)=>{
    res.send("Notification Service is running");
})



module.exports = app;