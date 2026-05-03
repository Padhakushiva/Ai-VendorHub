require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/DB/db');
const listner = require('./src/Broker/listner');
const { connect } = require('./src/Broker/broker');

connectDB();
connect().then(()=>{
    listner();
}).catch((error)=>{
    console.error("Error connecting to RabbitMQ:", error);
})
app.listen(3007,()=>{
    console.log("Dashboard Service is running at 3007");
})