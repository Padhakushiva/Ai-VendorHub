require('dotenv').config();
const app=require('./src/app');
const connectDB=require('./src/DB/db');

const { connect } = require('./src/Broker/broker');

 connectDB();
connect();  

app.listen(3001, ()=>{
    console.log('Server is running on port 3001');
   
})