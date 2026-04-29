const { uploadToImageKit } = require("../services/imagekit.service");
const mongoose = require('mongoose');
const productmodel = require("../models/product.model");

/**
 * Create a new product with images
 * POST /api/production/
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createProduct = async (req, res) => {
  try {
    const { title, description, stock, price = {} } = req.body;
    const { amount, currency = "INR" } = price;
    const sellerId = req.user.id;

    // At this point, data has been validated by express-validator middleware
    // File uploads have been validated by multer middleware

    // Upload images to ImageKit if provided
    let images = [];

    if (req.files && req.files.length > 0) {
      try {
        images = await Promise.all(
          req.files.map((file) =>
            uploadToImageKit(file.buffer, file.originalname),
          ),
        );
      } catch (uploadError) {
        console.error("Error uploading images to ImageKit:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Error uploading images",
          error: uploadError.message,
        });
      }
    }

    // Create product 
    const product = new productmodel({
      title: title,
      description: description || "",
      stock: Number(stock) || 0,
      price: {
        amount: Number(amount),
        currency: currency || "INR",
      },
      images: images,
      seller: sellerId, // REQUIRED
    });
    const savedProduct = await product.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: savedProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

    const filter = {};

    if (q) {
      filter.$text = { $search: q };
    }

    if (minprice) {
      filter['price.amount'] = {
        ...filter['price.amount'],
        $gte: Number(minprice),
      };
    }

    if (maxprice) {
      filter['price.amount'] = {
        ...filter['price.amount'],
        $lte: Number(maxprice),
      };
    }

    const products = await productmodel
      .find(filter)
      .skip(Number(skip))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};


const getProductById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const product = await productmodel.findById(id);   

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product,
    });

  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Validate ObjectId format (should be 404 for invalid format, not 400)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Debug: Log incoming request body
    console.log('PATCH request body:', req.body);
    console.log('PATCH request body keys:', Object.keys(req.body));

    // Check if body has any update fields
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('Empty body detected');
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    // Find product
    const product = await productmodel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization: seller can only update their own products, admin can update any
    if (role === 'seller' && product.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this product',
      });
    }

    // Prevent updating protected fields
    if (req.body._id || req.body.seller) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update protected fields',
      });
    }

    // Allowed fields for update
    const allowedFields = [
      'title',
      'description',
      'price',
      'price.amount',
      'price.currency',
      'stock',
      'category',
    ];

    // Validate and update fields
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        const value = req.body[key];

        if (key === 'title') {
          // Validate title is not empty
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return res.status(400).json({
              success: false,
              message: 'Title cannot be empty',
            });
          }
          product.title = value.toString().trim();
        } else if (key === 'description') {
          product.description = value.toString();
        } else if (key === 'price' && typeof value === 'object') {
          // Handle nested price object
          if (value.amount !== undefined) {
            const amount = Number(value.amount);
            if (isNaN(amount)) {
              return res.status(400).json({
                success: false,
                message: 'Price amount must be a valid number',
              });
            }
            if (amount < 0) {
              return res.status(400).json({
                success: false,
                message: 'Price cannot be negative',
              });
            }
            product.price.amount = amount;
          }
          if (value.currency !== undefined) {
            const validCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY'];
            if (!validCurrencies.includes(value.currency.toUpperCase())) {
              return res.status(400).json({
                success: false,
                message: 'Invalid currency. Must be one of: USD, INR, EUR, GBP, JPY',
              });
            }
            product.price.currency = value.currency.toUpperCase();
          }
        } else if (key === 'price.amount') {
          // Handle flat price.amount field from form-data
          const amount = Number(value);
          if (isNaN(amount)) {
            return res.status(400).json({
              success: false,
              message: 'Price amount must be a valid number',
            });
          }
          if (amount < 0) {
            return res.status(400).json({
              success: false,
              message: 'Price cannot be negative',
            });
          }
          product.price.amount = amount;
        } else if (key === 'price.currency') {
          // Handle flat price.currency field from form-data
          const validCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY'];
          if (!validCurrencies.includes(value.toString().toUpperCase())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid currency. Must be one of: USD, INR, EUR, GBP, JPY',
            });
          }
          product.price.currency = value.toString().toUpperCase();
        } else if (key === 'stock') {
          const stock = Number(value);
          if (isNaN(stock) || stock < 0) {
            return res.status(400).json({
              success: false,
              message: 'Stock must be a non-negative number',
            });
          }
          product.stock = stock;
        } else if (key === 'category') {
          product.category = value.toString();
        }
      }
    }

    // Save updated product
    const updatedProduct = await product.save();

    // Emit product.updated event for real-time updates
    // This would typically emit to a message queue or event emitter
    if (global.eventEmitter) {
      global.eventEmitter.emit('product.updated', {
        productId: updatedProduct._id,
        title: updatedProduct.title,
        description: updatedProduct.description,
        price: updatedProduct.price,
        seller: updatedProduct.seller,
        timestamp: new Date().toISOString(),
      });
    }

    // Invalidate cache (would typically clear Redis keys)
    if (global.cacheDelete) {
      // Invalidate product-specific cache
      await global.cacheDelete(`product:${id}`);
      // Invalidate all products list cache
      await global.cacheDelete('products:list:*');
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Validate ObjectId format (should be 404 for invalid format, not 400)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find product
    const product = await productmodel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization: seller can only delete their own products, admin can delete any
    if (role === 'seller' && product.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this product',
      });
    }

    // Determine deletion type based on orders
    let deletionType = 'hard';
    let returnData = product;
    
    if (product.orders && product.orders.length > 0) {
      // Soft delete: set status to archived
      deletionType = 'soft';
      product.status = 'archived';
      returnData = await product.save();
    } else {
      // Hard delete: remove from database
      await productmodel.deleteOne({ _id: id });
    }

    // Emit product.deleted event for real-time updates
    if (global.eventEmitter) {
      global.eventEmitter.emit('product.deleted', {
        productId: product._id,
        seller: product.seller,
        deletionType: deletionType,
        timestamp: new Date().toISOString(),
      });
    }

    // Invalidate cache (would typically clear Redis keys)
    if (global.cacheDelete) {
      // Invalidate product-specific cache
      await global.cacheDelete(`product:${id}`);
      // Invalidate all products list cache
      await global.cacheDelete('products:list:*');
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        ...returnData.toObject ? returnData.toObject() : returnData,
        productId: product._id,
        seller: product.seller,
        deletionType: deletionType,
      },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};


const getProductsBySeller = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

    // Build filter with seller ID
    const filter = { seller: sellerId };

    // Add search filter if provided
    if (q) {
      filter.$text = { $search: q };
    }

    // Add price range filters if provided
    if (minprice) {
      filter['price.amount'] = {
        ...filter['price.amount'],
        $gte: Number(minprice),
      };
    }

    if (maxprice) {
      filter['price.amount'] = {
        ...filter['price.amount'],
        $lte: Number(maxprice),
      };
    }

    // Fetch products with pagination
    const products = await productmodel
      .find(filter)
      .skip(Number(skip))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
};
