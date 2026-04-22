const express = require('express');
const cookieParser = require('cookie-parser');
const productRoutes = require('./routes/product.routes');

const app= express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/product', productRoutes);

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