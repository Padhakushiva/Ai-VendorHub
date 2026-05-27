const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');
const productCache = require('./services/cache.service');

const app= express();
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

global.productCache = productCache;


app.get("/",(req,res)=>{
    res.status(200).json({message:"Product API is running"});
});

app.use('/api/product', productRoutes);
app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

// Error handling middleware for multer and other errors
app.use((err, req, res, next) => {
  if (err instanceof Error) {
    // Multer file size or file count errors
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'File size or count limit exceeded',
      });
    }
    // Multer file validation errors
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
  next(err);
});

module.exports = app;
