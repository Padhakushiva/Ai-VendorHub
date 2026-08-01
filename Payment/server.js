require('dotenv').config({ override: true });
const app = require('./src/app');
const connectDB = require('./src/DB/db');
const {connect}=require('./src/Broker/broker');
connectDB();
connect();

app.listen(3004,()=>{
    console.log("Payment Service is running at port 3004");
    
})