const mongoose = require("mongoose");
const { uploadToImageKit, deleteFromImageKit } = require("../services/imagekit.service");
const productmodel = require("../models/product.model");
const Wishlist = require("../models/wishlist.model");
const { publishToQueue } = require("../Broker/broker");
const productCache = require("../services/cache.service");

const VALID_CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY"];
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD) || 5;
const RECENTLY_VIEWED_LIMIT = Number(process.env.RECENTLY_VIEWED_LIMIT) || 20;
const PRODUCT_CREATED_EVENT = "product.created";
const PRODUCT_UPDATED_EVENT = "product.updated";
const PRODUCT_DELETED_EVENT = "product.deleted";

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { "price.amount": 1 },
  price_desc: { "price.amount": -1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  stock_asc: { stock: 1 },
  stock_desc: { stock: -1 },
};

const parseTags = (tags) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.toString().trim().toLowerCase()).filter(Boolean);
  }

  return tags
    .toString()
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return value.toString().split(",").map((item) => item.trim()).filter(Boolean);
  }
};

const getPriceFromBody = (body) => {
  const amountValue = body.amount || body["price.amount"] || body?.price?.amount;
  const currencyValue = body.currency || body["price.currency"] || body?.price?.currency || "INR";

  return {
    amount: Number(amountValue),
    currency: currencyValue.toString().toUpperCase(),
  };
};

const normalizeImage = (image = {}) => ({
  id: image.fileId || image.id,
  url: image.url,
  thumbnail: image.thumbnailUrl || image.thumbnail || image.url,
});

const getProductId = (product) => product?._id?.toString?.() || product?._id || product?.id;

const toPlainProduct = (product) => {
  if (!product) return product;
  if (typeof product.toObject === "function") {
    return product.toObject({ virtuals: true });
  }
  return product;
};

const calculateAvailability = (product) => {
  if (product && typeof product.calculateAvailability === "function") {
    return product.calculateAvailability(LOW_STOCK_THRESHOLD);
  }

  const plainProduct = toPlainProduct(product);
  const baseStock = Number(plainProduct?.stock) || 0;
  const variantStock = Array.isArray(plainProduct?.variants)
    ? plainProduct.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
    : 0;
  const totalStock = baseStock + variantStock;

  if (totalStock <= 0) return "out_of_stock";
  if (totalStock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
};

const withAvailability = (product) => {
  if (!product) return product;
  const plainProduct = toPlainProduct(product);
  return {
    ...plainProduct,
    availability: calculateAvailability(product),
  };
};

const buildSellerSnapshot = (user = {}) => ({
  id: user.id || user._id,
  username: user.username,
  email: user.email,
  role: user.role || "seller",
});

const enrichProductSeller = (product, sellerSnapshot) => {
  const plainProduct = toPlainProduct(product);

  if (!plainProduct || !sellerSnapshot?.id || !sellerSnapshot?.username) {
    return plainProduct;
  }

  const currentSellerId = plainProduct.seller?._id || plainProduct.seller?.id || plainProduct.seller;
  if (currentSellerId?.toString?.() !== sellerSnapshot.id?.toString?.()) {
    return plainProduct;
  }

  return {
    ...plainProduct,
    seller: {
      id: sellerSnapshot.id,
      username: sellerSnapshot.username,
      email: sellerSnapshot.email,
      role: sellerSnapshot.role,
    },
  };
};

const buildProductEventPayload = (eventName, product, extra = {}) => {
  const plainProduct = withAvailability(product);

  return {
    event: eventName,
    productId: getProductId(plainProduct),
    sellerId: plainProduct?.seller?._id || plainProduct?.seller?.id || plainProduct?.seller,
    title: plainProduct?.title,
    description: plainProduct?.description,
    price: plainProduct?.price,
    category: plainProduct?.category,
    brand: plainProduct?.brand,
    tags: plainProduct?.tags || [],
    images: plainProduct?.images || [],
    stock: plainProduct?.stock,
    availability: plainProduct?.availability,
    status: plainProduct?.status || "active",
    createdAt: plainProduct?.createdAt,
    updatedAt: plainProduct?.updatedAt,
    timestamp: new Date().toISOString(),
    ...extra,
  };
};

const publishProductEvent = async (eventName, product, extra = {}) => {
  const payload = buildProductEventPayload(eventName, product, extra);

  try {
    await Promise.all([
      publishToQueue(`PRODUCT_SELLER_DASHBOARD.${eventName}`, payload),
      publishToQueue(`PRODUCT_NOTIFICATION.${eventName}`, payload),
    ]);
  } catch (error) {
    console.warn(`Product event ${eventName} could not be published:`, error.message);
  }
};

const invalidateProductCache = async (productId, sellerId) => {
  const keys = [
    "products:list",
    productId ? `product:${productId}` : null,
    sellerId ? `products:seller:${sellerId}` : null,
  ].filter(Boolean);

  if (typeof global.cacheDelete === "function") {
    await Promise.all(keys.map((key) => Promise.resolve(global.cacheDelete(key))));
  }

  if (global.productCache && typeof global.productCache.del === "function") {
    await Promise.all(keys.map((key) => Promise.resolve(global.productCache.del(key))));
  } else if (productCache && typeof productCache.del === "function") {
    await Promise.all(keys.map((key) => Promise.resolve(productCache.del(key))));
  }
};

const buildProductFilter = (query = {}, extraFilter = {}) => {
  const filter = { ...extraFilter };

  if (query.status) {
    filter.status = query.status.toString().toLowerCase();
  }

  if (query.q) filter.$text = { $search: query.q };
  if (query.category) filter.category = query.category;
  if (query.brand) filter.brand = query.brand;
  if (query.tag) filter.tags = query.tag.toString().toLowerCase();

  const minPrice = query.minprice || query.minPrice;
  const maxPrice = query.maxprice || query.maxPrice;

  if (minPrice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $gte: Number(minPrice),
    };
  }

  if (maxPrice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $lte: Number(maxPrice),
    };
  }

  if (query.rating) {
    filter["rating.average"] = { $gte: Number(query.rating) };
  }

  if (query.availability) {
    const availability = query.availability.toString().toLowerCase();
    if (availability === "out_of_stock") filter.stock = 0;
    if (availability === "low_stock") filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
    if (availability === "in_stock") filter.stock = { $gt: LOW_STOCK_THRESHOLD };
  }

  return filter;
};

const getPagination = (query = {}) => {
  const limit = Math.max(Number(query.limit) || 20, 1);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = query.skip !== undefined ? Math.max(Number(query.skip) || 0, 0) : (page - 1) * limit;

  return { page, skip, limit };
};

const getSort = (sortKey = "newest") => SORT_MAP[sortKey] || SORT_MAP.newest;

const runFindQuery = async (filter, { skip, limit, sort }, sellerSnapshot) => {
  let query = productmodel.find(filter);

  if (typeof query.sort === "function") query = query.sort(sort);
  if (typeof query.skip === "function") query = query.skip(skip);
  if (typeof query.limit === "function") query = query.limit(limit);
  if (typeof query.populate === "function") query = query.populate("seller", "username email role");

  const products = typeof query.exec === "function" ? await query.exec() : await query;
  return Array.isArray(products)
    ? products.map((product) => enrichProductSeller(product, sellerSnapshot))
    : [];
};

const countProducts = async (filter) => {
  if (typeof productmodel.countDocuments !== "function") {
    return undefined;
  }

  return productmodel.countDocuments(filter);
};

const getProductForDetail = async (id) => {
  let query = productmodel.findById(id);
  if (typeof query.populate === "function") {
    query = query.populate("seller", "username email role");
  }

  return typeof query.exec === "function" ? query.exec() : query;
};

const hasExistingOrders = (product) => Array.isArray(product.orders) && product.orders.length > 0;

const parseVariantPayload = (body = {}, existingSku) => {
  const amountValue = body.amount || body["price.amount"] || body?.price?.amount || body.price;
  const currencyValue = body.currency || body["price.currency"] || body?.price?.currency || "INR";
  const sku = body.sku ? body.sku.toString().trim().toUpperCase() : existingSku;

  if (!sku) {
    throw Object.assign(new Error("Variant SKU is required"), { statusCode: 400 });
  }

  if (amountValue === undefined) {
    throw Object.assign(new Error("Variant price is required"), { statusCode: 400 });
  }

  const amount = Number(amountValue);
  const currency = currencyValue.toString().toUpperCase();
  const stock = Number(body.stock);

  if (isNaN(amount) || amount < 0) {
    throw Object.assign(new Error("Variant price must be a non-negative number"), { statusCode: 400 });
  }

  if (!VALID_CURRENCIES.includes(currency)) {
    throw Object.assign(new Error(`Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}`), { statusCode: 400 });
  }

  if (body.stock !== undefined && (isNaN(stock) || stock < 0)) {
    throw Object.assign(new Error("Variant stock must be a non-negative number"), { statusCode: 400 });
  }

  return {
    sku,
    color: body.color,
    size: body.size,
    ram: body.ram,
    storage: body.storage,
    price: { amount, currency },
    stock: body.stock === undefined ? 0 : stock,
  };
};

const ensureCanManageProduct = (product, user) => {
  if (!product) return { allowed: false, statusCode: 404, message: "Product not found" };
  if (user.role === "seller" && product.seller.toString() !== user.id) {
    return { allowed: false, statusCode: 403, message: "Unauthorized to manage this product" };
  }
  return { allowed: true };
};

const getRecentlyViewedKey = (userId) => `recently_viewed:${userId}`;

const createProduct = async (req, res) => {
  try {
    const { title, description, stock, category, brand } = req.body;
    const sellerId = req.user.id;
    const { amount, currency } = getPriceFromBody(req.body);

    if (!title || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "Price amount must be a non-negative number" });
    }

    if (!VALID_CURRENCIES.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}`,
      });
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.map((file) => uploadToImageKit(file.buffer, file.originalname)),
      );
      images = uploadedImages.map(normalizeImage);
    }

    const product = new productmodel({
      title: title.trim(),
      description: description || "",
      stock: Number(stock) || 0,
      price: { amount, currency },
      category: category ? category.toString().trim() : undefined,
      brand: brand ? brand.toString().trim() : undefined,
      tags: parseTags(req.body.tags),
      specifications: req.body.specifications || {},
      images,
      seller: sellerId,
      status: "active",
    });

    const savedProduct = await product.save();
    await invalidateProductCache(getProductId(savedProduct), sellerId);
    await publishProductEvent(PRODUCT_CREATED_EVENT, savedProduct, {
      email: req.user.email,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: enrichProductSeller(savedProduct, buildSellerSnapshot(req.user)),
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

const addProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(id);
    const permission = ensureCanManageProduct(product, req.user);
    if (!permission.allowed) {
      return res.status(permission.statusCode).json({ success: false, message: permission.message });
    }

    const variant = parseVariantPayload(req.body);
    const duplicateSku = (product.variants || []).some((item) => item.sku === variant.sku);
    if (duplicateSku) {
      return res.status(409).json({ success: false, message: "Variant SKU already exists for this product" });
    }

    product.variants = [...(product.variants || []), variant];
    const updatedProduct = await product.save();
    await invalidateProductCache(getProductId(updatedProduct), updatedProduct.seller);
    await publishProductEvent(PRODUCT_UPDATED_EVENT, updatedProduct, {
      email: req.user.email,
      seller: buildSellerSnapshot(req.user),
      action: "variant.created",
    });

    return res.status(201).json({
      success: true,
      message: "Variant added successfully",
      data: withAvailability(updatedProduct),
    });
  } catch (error) {
    console.error("Error adding product variant:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error adding product variant",
      error: error.statusCode ? undefined : error.message,
    });
  }
};

const updateProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(id);
    const permission = ensureCanManageProduct(product, req.user);
    if (!permission.allowed) {
      return res.status(permission.statusCode).json({ success: false, message: permission.message });
    }

    const variant = typeof product.variants?.id === "function"
      ? product.variants.id(variantId)
      : (product.variants || []).find((item) => item._id?.toString?.() === variantId || item.id?.toString?.() === variantId);

    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    const nextVariant = parseVariantPayload(req.body, variant.sku);
    const duplicateSku = (product.variants || []).some((item) => (
      item.sku === nextVariant.sku && (item._id?.toString?.() || item.id?.toString?.()) !== variantId
    ));

    if (duplicateSku) {
      return res.status(409).json({ success: false, message: "Variant SKU already exists for this product" });
    }

    Object.assign(variant, nextVariant);
    const updatedProduct = await product.save();
    await invalidateProductCache(getProductId(updatedProduct), updatedProduct.seller);
    await publishProductEvent(PRODUCT_UPDATED_EVENT, updatedProduct, {
      email: req.user.email,
      seller: buildSellerSnapshot(req.user),
      action: "variant.updated",
    });

    return res.status(200).json({
      success: true,
      message: "Variant updated successfully",
      data: withAvailability(updatedProduct),
    });
  } catch (error) {
    console.error("Error updating product variant:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error updating product variant",
      error: error.statusCode ? undefined : error.message,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const cacheKey = productCache.buildKey("products:list", req.query);
    const cachedResponse = await productCache.get(cacheKey);

    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse);
    }

    const filter = buildProductFilter(req.query);
    const { page, skip, limit } = getPagination(req.query);
    const sortKey = req.query.sort || "newest";
    const sort = getSort(sortKey);

    const [products, total] = await Promise.all([
      runFindQuery(filter, { skip, limit, sort }),
      countProducts(filter),
    ]);

    const responseBody = {
      success: true,
      message: "Products fetched successfully",
      data: products,
    };

    if (total !== undefined || req.query.page !== undefined || req.query.sort !== undefined) {
      responseBody.pagination = {
        total: total ?? products.length,
        page,
        skip,
        limit,
        totalPages: total !== undefined ? Math.ceil(total / limit) : undefined,
      };
      responseBody.sort = sortKey;
    }

    await productCache.set(cacheKey, responseBody);
    res.set("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

const compareProducts = async (req, res) => {
  try {
    const ids = parseJsonArray(req.query.ids);
    const validIds = [...new Set(ids)].filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least two valid product ids are required for comparison",
      });
    }

    const cacheKey = productCache.buildKey("products:compare", { ids: validIds });
    const cachedResponse = await productCache.get(cacheKey);
    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse);
    }

    let query = productmodel.find({ _id: { $in: validIds }, status: { $ne: "archived" } });
    if (typeof query.select === "function") {
      query = query.select("title price stock rating brand category tags specifications variants images status seller");
    }

    const products = typeof query.exec === "function" ? await query.exec() : await query;
    const responseBody = {
      success: true,
      message: "Products compared successfully",
      data: validIds
        .map((id) => products.find((product) => getProductId(product)?.toString?.() === id.toString()))
        .filter(Boolean)
        .map(withAvailability),
    };

    await productCache.set(cacheKey, responseBody);
    res.set("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("Error comparing products:", error);
    return res.status(500).json({
      success: false,
      message: "Error comparing products",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const cacheKey = `product:${id}`;
    const cachedResponse = await productCache.get(cacheKey);

    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse);
    }

    const product = await getProductForDetail(id);
    if (!product) {
      return res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        data: null,
        Product: null,
      });
    }

    if (product.status === "archived") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const availability = calculateAvailability(product);
    const responseBody = {
      success: true,
      message: "Product fetched successfully",
      data: product,
      Product: product,
      availability,
    };

    await productCache.set(cacheKey, responseBody);
    res.set("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

const trackProductView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(id);
    if (!product || product.status === "archived") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.metrics = product.metrics || {};
    product.metrics.views = (Number(product.metrics.views) || 0) + 1;
    product.metrics.popularityScore = typeof product.calculatePopularityScore === "function"
      ? product.calculatePopularityScore()
      : ((product.metrics.views || 0) * 1)
        + ((product.metrics.wishlist || 0) * 2)
        + ((product.metrics.cartAdds || 0) * 3)
        + ((product.metrics.orders || 0) * 5);
    await product.save();

    const cacheKey = getRecentlyViewedKey(userId);
    const existing = await productCache.get(cacheKey) || [];
    const nextViewed = [id, ...existing.filter((productId) => productId.toString() !== id.toString())]
      .slice(0, RECENTLY_VIEWED_LIMIT);
    await productCache.set(cacheKey, nextViewed, 60 * 60 * 24 * 30);
    await invalidateProductCache(id, product.seller);
    await productCache.del("products:trending");

    return res.status(200).json({
      success: true,
      message: "Product view tracked successfully",
      data: {
        productId: id,
        recentlyViewed: nextViewed,
        views: product.metrics.views,
      },
    });
  } catch (error) {
    console.error("Error tracking product view:", error);
    return res.status(500).json({
      success: false,
      message: "Error tracking product view",
      error: error.message,
    });
  }
};

const getRecentlyViewedProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const ids = await productCache.get(getRecentlyViewedKey(userId)) || [];
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Recently viewed products fetched successfully",
        data: [],
      });
    }

    const products = await productmodel.find({ _id: { $in: validIds }, status: { $ne: "archived" } });
    const orderedProducts = validIds
      .map((id) => products.find((product) => getProductId(product)?.toString?.() === id.toString()))
      .filter(Boolean)
      .map(withAvailability);

    return res.status(200).json({
      success: true,
      message: "Recently viewed products fetched successfully",
      data: orderedProducts,
    });
  } catch (error) {
    console.error("Error fetching recently viewed products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching recently viewed products",
      error: error.message,
    });
  }
};

const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(Number(req.query.limit) || 8, 1);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(id);
    if (!product || product.status === "archived") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const plainProduct = toPlainProduct(product);
    const priceAmount = Number(plainProduct.price?.amount) || 0;
    const filter = {
      _id: { $ne: id },
      status: "active",
      $or: [
        plainProduct.category ? { category: plainProduct.category } : null,
        plainProduct.brand ? { brand: plainProduct.brand } : null,
        plainProduct.tags?.length ? { tags: { $in: plainProduct.tags } } : null,
        priceAmount > 0 ? { "price.amount": { $gte: priceAmount * 0.8, $lte: priceAmount * 1.2 } } : null,
      ].filter(Boolean),
    };

    if (filter.$or.length === 0) delete filter.$or;
    const products = await runFindQuery(filter, {
      skip: 0,
      limit,
      sort: { "metrics.popularityScore": -1, createdAt: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Related products fetched successfully",
      data: products.map(withAvailability),
    });
  } catch (error) {
    console.error("Error fetching related products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching related products",
      error: error.message,
    });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const cacheKey = productCache.buildKey("products:trending", { limit });
    const cachedResponse = await productCache.get(cacheKey);

    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse);
    }

    const products = await runFindQuery({ status: "active" }, {
      skip: 0,
      limit,
      sort: { "metrics.popularityScore": -1, "metrics.views": -1, createdAt: -1 },
    });

    const responseBody = {
      success: true,
      message: "Trending products fetched successfully",
      data: products.map(withAvailability),
    };

    await productCache.set(cacheKey, responseBody, 120);
    res.set("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching trending products",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if ((!req.body || Object.keys(req.body).length === 0) && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const product = await productmodel.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (role === "seller" && product.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this product" });
    }

    if (req.body._id || req.body.seller) {
      return res.status(400).json({ success: false, message: "Cannot update protected fields" });
    }

    if (req.body.title !== undefined) {
      if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({ success: false, message: "Title cannot be empty" });
      }
      product.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) product.description = req.body.description.toString();

    const { amount, currency } = getPriceFromBody(req.body);
    if (req.body.amount !== undefined || req.body["price.amount"] !== undefined || req.body?.price?.amount !== undefined) {
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: "Price amount must be a non-negative number" });
      }
      product.price.amount = amount;
    }

    if (req.body.currency !== undefined || req.body["price.currency"] !== undefined || req.body?.price?.currency !== undefined) {
      if (!VALID_CURRENCIES.includes(currency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}`,
        });
      }
      product.price.currency = currency;
    }

    if (req.body.stock !== undefined) {
      const stock = Number(req.body.stock);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({ success: false, message: "Stock must be a non-negative number" });
      }
      product.stock = stock;
    }

    if (req.body.category !== undefined) product.category = req.body.category.toString().trim();
    if (req.body.brand !== undefined) product.brand = req.body.brand.toString().trim();
    if (req.body.tags !== undefined) product.tags = parseTags(req.body.tags);

    if (req.body.status !== undefined) {
      const status = req.body.status.toString().toLowerCase();
      if (!["active", "inactive", "archived"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be active, inactive, or archived" });
      }
      product.status = status;
    }

    const removeImageIds = parseJsonArray(req.body.removeImageIds);
    if (removeImageIds.length > 0) {
      const removedImages = (product.images || []).filter((image) => removeImageIds.includes(image.id));
      product.images = (product.images || []).filter((image) => !removeImageIds.includes(image.id));

      await Promise.all(
        removedImages.map((image) => (
          image.id ? deleteFromImageKit(image.id).catch(() => null) : Promise.resolve()
        )),
      );
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.map((file) => uploadToImageKit(file.buffer, file.originalname)),
      );
      const normalizedImages = uploadedImages.map(normalizeImage);
      product.images = req.body.replaceImages === "true"
        ? normalizedImages
        : [...(product.images || []), ...normalizedImages].slice(0, 5);
    }

    const updatedProduct = await product.save();
    await invalidateProductCache(getProductId(updatedProduct), updatedProduct.seller);
    await publishProductEvent(PRODUCT_UPDATED_EVENT, updatedProduct, {
      email: req.user.email,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: enrichProductSeller(updatedProduct, buildSellerSnapshot(req.user)),
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

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (role === "seller" && product.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this product" });
    }

    const softDelete = hasExistingOrders(product);
    let resultProduct = product;
    let deletionType = "hard";

    if (softDelete) {
      product.status = "archived";
      resultProduct = await product.save();
      deletionType = "soft";
    } else if (typeof productmodel.deleteOne === "function") {
      await productmodel.deleteOne({ _id: id });
    } else if (typeof product.deleteOne === "function") {
      await product.deleteOne();
    } else {
      throw new Error("Delete operation is not available");
    }

    await invalidateProductCache(getProductId(product), product.seller);
    await publishProductEvent(PRODUCT_DELETED_EVENT, resultProduct, {
      deletionType,
      email: req.user.email,
      seller: buildSellerSnapshot(req.user),
    });

    return res.status(200).json({
      success: true,
      message: softDelete ? "Product archived successfully" : "Product deleted successfully",
      data: softDelete ? {
        ...toPlainProduct(resultProduct),
        deletionType,
      } : {
        productId: product._id,
        seller: product.seller,
        status: "deleted",
        deletionType,
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

const getProductsBySeller = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const cacheKey = productCache.buildKey(`products:seller:${sellerId}`, req.query);
    const cachedResponse = await productCache.get(cacheKey);

    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse);
    }

    const filter = buildProductFilter(req.query, { seller: sellerId });
    const { page, skip, limit } = getPagination(req.query);
    const sortKey = req.query.sort || "newest";
    const sort = getSort(sortKey);
    const sellerSnapshot = buildSellerSnapshot(req.user);

    const [products, total] = await Promise.all([
      runFindQuery(filter, { skip, limit, sort }, sellerSnapshot),
      countProducts(filter),
    ]);

    const responseBody = {
      success: true,
      message: "Products fetched successfully",
      data: products,
    };

    if (total !== undefined || req.query.page !== undefined || req.query.sort !== undefined) {
      responseBody.pagination = {
        total: total ?? products.length,
        page,
        skip,
        limit,
        totalPages: total !== undefined ? Math.ceil(total / limit) : undefined,
      };
      responseBody.sort = sortKey;
    }

    await productCache.set(cacheKey, responseBody);
    res.set("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await productmodel.findById(productId);
    if (!product || product.status === "archived") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const existingWishlistItem = await Wishlist.findOne({ user: userId, product: productId });
    if (existingWishlistItem) {
      return res.status(200).json({
        success: true,
        message: "Product already exists in wishlist",
        data: existingWishlistItem,
      });
    }

    const wishlistItem = await Wishlist.create({ user: userId, product: productId });
    product.metrics = product.metrics || {};
    product.metrics.wishlist = (Number(product.metrics.wishlist) || 0) + 1;
    product.metrics.popularityScore = typeof product.calculatePopularityScore === "function"
      ? product.calculatePopularityScore()
      : ((product.metrics.views || 0) * 1)
        + ((product.metrics.wishlist || 0) * 2)
        + ((product.metrics.cartAdds || 0) * 3)
        + ((product.metrics.orders || 0) * 5);
    await product.save();
    await invalidateProductCache(productId, product.seller);
    await productCache.del("products:trending");

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      data: wishlistItem,
    });
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding product to wishlist",
      error: error.message,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const removedItem = await Wishlist.findOneAndDelete({ user: userId, product: productId });
    if (!removedItem) {
      return res.status(404).json({ success: false, message: "Wishlist item not found" });
    }

    const product = await productmodel.findById(productId);
    if (product) {
      product.metrics = product.metrics || {};
      product.metrics.wishlist = Math.max((Number(product.metrics.wishlist) || 0) - 1, 0);
      product.metrics.popularityScore = typeof product.calculatePopularityScore === "function"
        ? product.calculatePopularityScore()
        : ((product.metrics.views || 0) * 1)
          + ((product.metrics.wishlist || 0) * 2)
          + ((product.metrics.cartAdds || 0) * 3)
          + ((product.metrics.orders || 0) * 5);
      await product.save();
      await invalidateProductCache(productId, product.seller);
      await productCache.del("products:trending");
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: removedItem,
    });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Error removing product from wishlist",
      error: error.message,
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    let query = Wishlist.find({ user: userId }).sort({ createdAt: -1 });

    if (typeof query.populate === "function") {
      query = query.populate("product");
    }

    const wishlistItems = typeof query.exec === "function" ? await query.exec() : await query;
    const data = Array.isArray(wishlistItems)
      ? wishlistItems.map((item) => ({
        ...toPlainProduct(item),
        product: withAvailability(item.product),
      }))
      : [];

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching wishlist",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  addProductVariant,
  updateProductVariant,
  getProducts,
  compareProducts,
  getProductById,
  trackProductView,
  getRecentlyViewedProducts,
  getRelatedProducts,
  getTrendingProducts,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
