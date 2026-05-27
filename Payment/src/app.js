const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const Paymentroutes = require('./routes/routes');
const app = express();
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


app.get("/",(req,res)=>{
    res.status(200).json({message:"Payment API is running"});
});

app.use('/api/payment',Paymentroutes);
app.use('/api/payments',Paymentroutes);
app.use('/payments',Paymentroutes);




module.exports = app;
