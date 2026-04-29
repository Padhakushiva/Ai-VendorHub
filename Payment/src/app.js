const express = require('express');
const cookieParser = require('cookie-parser');
const Routes = require('./routes/payment.routes');



const app=express();
app.use(cookieParser());
app.use(express.json());
app.use('/api/payments', Routes);


module.exports=app;