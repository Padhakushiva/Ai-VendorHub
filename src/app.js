const express=require('express');
const cookieParser=require('cookie-parser');
const authRoutes = require('./Routes/auth.routes');

const app=express();
app.use(express.json());
app.use(cookieParser());

app.use('/api', authRoutes);
module.exports=app;