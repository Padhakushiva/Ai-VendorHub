require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const app=require('./src/app');
const connectDB=require('./src/DB/db');
const { validateAuthEnv } = require('./src/config/env');

const { connect } = require('./src/Broker/broker');

validateAuthEnv();

 connectDB();
connect();  

app.listen(3001, ()=>{
    console.log('Server is running on port 3001');
   
})