const express=require('express');
const cookieParser=require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./Routes/auth.routes');
const { passport } = require('./config/passport');

const app=express();
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());


app.get("/",(req,res)=>{
    res.status(200).json({message:"Auth API is running"});
});

app.use('/api', authRoutes);
module.exports=app;
