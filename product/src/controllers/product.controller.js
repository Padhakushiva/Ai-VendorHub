const { uploadToImageKit } = require("../services/imagekit.service");
const mongoose = require("mongoose");
const productmodel = require("../models/product.model");
const { publishToQueue } = require("../Broker/broker");

const parseTags = (tags) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => tag.toString().trim().toLowerCase())
      .filter(Boolean);
  }

  return tags
    .toString()
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

const getPriceFromBody = (body) => {
  const amountValue = body["price.amount"] || body?.price?.amount;
  const currencyValue =
    body["price.currency"] || body?.price?.currency || "INR";

  return {
    amount: Number(amountValue),
    currency: currencyValue.toString().toUpperCase(),
  };
};

/**
 * Create Product
 * POST /api/product/
 */
const createProduct = async (req, res) => {
  try {
    console.log("CREATE PRODUCT BODY:", req.body);

    const { title, description, stock, category, brand } = req.body;

    const sellerId = req.user.id;

    const { amount, currency } = getPriceFromBody(req.body);

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid price amount",
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Price cannot be negative",
      });
    }

    const validCurrencies = ["USD", "INR"];

    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency. Must be USD or INR",
      });
    }

    const parsedTags = parseTags(req.body.tags);

    let images = [];

    if (req.files && req.files.length > 0) {
      try {
        images = await Promise.all(
          req.files.map((file) =>
            uploadToImageKit(file.buffer, file.originalname)
          )
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

    const product = new productmodel({
      title: title.trim(),
      description: description || "",
      stock: Number(stock) || 0,
      price: {
        amount,
        currency,
      },
      category: category ? category.toString().trim() : undefined,
      brand: brand ? brand.toString().trim() : undefined,
      tags: parsedTags,
      images,
      seller: sellerId,
    });

    const savedProduct = await product.save();

    publishToQueue("PRODUCT_SELLER_DASHBOARD.product.created", savedProduct);

    publishToQueue("PRODUCT_NOTIFICATION.product.created", {
      email: req.user.email,
      productId: savedProduct._id,
      sellerId: savedProduct.seller,
      title: savedProduct.title,
      description: savedProduct.description,
      price: savedProduct.price,
      category: savedProduct.category,
      brand: savedProduct.brand,
      tags: savedProduct.tags,
      timestamp: new Date().toISOString(),
    });

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

/**
 * Get All Products
 * GET /api/product/
 */
const getProducts = async (req, res) => {
  try {
    const {
      q,
      minprice,
      maxprice,
      category,
      brand,
      tag,
      skip = 0,
      limit = 20,
    } = req.query;

    const filter = {};

    if (q) {
      filter.$text = { $search: q };
    }

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brand = brand;
    }

    if (tag) {
      filter.tags = tag.toString().toLowerCase();
    }

    if (minprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $gte: Number(minprice),
      };
    }

    if (maxprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $lte: Number(maxprice),
      };
    }

    const products = await productmodel
      .find(filter)
      .skip(Number(skip))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

/**
 * Get Product By ID
 * GET /api/product/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await productmodel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

/**
 * Update Product
 * PATCH /api/product/:id
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const product = await productmodel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (role === "seller" && product.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this product",
      });
    }

    if (req.body._id || req.body.seller) {
      return res.status(400).json({
        success: false,
        message: "Cannot update protected fields",
      });
    }

    if (req.body.title !== undefined) {
      if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      product.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      product.description = req.body.description.toString();
    }

    if (
      req.body["price.amount"] !== undefined ||
      req.body?.price?.amount !== undefined
    ) {
      const amount = Number(
        req.body["price.amount"] || req.body?.price?.amount
      );

      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: "Price amount must be a non-negative number",
        });
      }

      product.price.amount = amount;
    }

    if (
      req.body["price.currency"] !== undefined ||
      req.body?.price?.currency !== undefined
    ) {
      const currency = (
        req.body["price.currency"] || req.body?.price?.currency
      )
        .toString()
        .toUpperCase();

      const validCurrencies = ["USD", "INR"];

      if (!validCurrencies.includes(currency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid currency. Must be USD or INR",
        });
      }

      product.price.currency = currency;
    }

    if (req.body.stock !== undefined) {
      const stock = Number(req.body.stock);

      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative number",
        });
      }

      product.stock = stock;
    }

    if (req.body.category !== undefined) {
      product.category = req.body.category.toString().trim();
    }

    if (req.body.brand !== undefined) {
      product.brand = req.body.brand.toString().trim();
    }

    if (req.body.tags !== undefined) {
      product.tags = parseTags(req.body.tags);
    }

    if (req.files && req.files.length > 0) {
      try {
        const uploadedImages = await Promise.all(
          req.files.map((file) =>
            uploadToImageKit(file.buffer, file.originalname)
          )
        );

        product.images = uploadedImages;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Error uploading images",
          error: uploadError.message,
        });
      }
    }

    const updatedProduct = await product.save();

    publishToQueue("PRODUCT_SELLER_DASHBOARD.product.updated", updatedProduct);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

/**
 * Delete Product
 * DELETE /api/product/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await productmodel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (role === "seller" && product.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this product",
      });
    }

    await productmodel.deleteOne({ _id: id });

    publishToQueue("PRODUCT_SELLER_DASHBOARD.product.deleted", {
      productId: product._id,
      seller: product.seller,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {
        productId: product._id,
        seller: product.seller,
      },
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

/**
 * Get Products By Seller
 * GET /api/product/seller
 */
const getProductsBySeller = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const {
      q,
      minprice,
      maxprice,
      category,
      brand,
      tag,
      skip = 0,
      limit = 20,
    } = req.query;

    const filter = { seller: sellerId };

    if (q) {
      filter.$text = { $search: q };
    }

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brand = brand;
    }

    if (tag) {
      filter.tags = tag.toString().toLowerCase();
    }

    if (minprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $gte: Number(minprice),
      };
    }

    if (maxprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $lte: Number(maxprice),
      };
    }

    const products = await productmodel
      .find(filter)
      .skip(Number(skip))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products",
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