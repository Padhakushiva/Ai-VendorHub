const { uploadToImageKit } = require('../services/imagekit.service');
const Product = require('../models/product.model');

/**
 * Create a new product with images
 * POST /api/production/
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createProduct = async (req, res) => {
  try {
    const { title, amount, description, currency = 'INR' } = req.body;
    const sellerId = req.user.id;

    // At this point, data has been validated by express-validator middleware
    // File uploads have been validated by multer middleware

    // Upload images to ImageKit if provided
    let images = [];

    if (req.files && req.files.length > 0) {
      try {
        images = await Promise.all(
          req.files.map((file) => uploadToImageKit(file.buffer, file.originalname))
        );
      } catch (uploadError) {
        console.error('Error uploading images to ImageKit:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading images',
          error: uploadError.message,
        });
      }
    }

    // Create product
    const product = new Product({
      name: title,
      price: Number(amount),
      currency: currency || 'INR',
      description: description ? description.trim() : undefined,
      images: images,
    });

    const savedProduct = await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
};
