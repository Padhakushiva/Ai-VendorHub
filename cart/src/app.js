const express = require('express');
const cartRoutes = require('./routes/cart.routes');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');


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
    res.status(200).json({message:"Cart API is running"});
});

app.use('/api/cart', cartRoutes);
app.use('/cart', cartRoutes);


module.exports = app;
