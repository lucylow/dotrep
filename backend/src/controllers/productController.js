const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { get, set, del } = require('../utils/cache');

/**
 * Create new product
 */
const createProduct = asyncHandler(async (req, res) => {
  const productData = {
    ...req.body,
    createdBy: req.user.id
  };

  const product = await Product.create(productData);
  await product.populate('createdBy', 'firstName lastName email');

  logger.info(`Product created: ${product.name} by user ${req.user.email}`, {
    productId: product._id,
    userId: req.user.id,
    requestId: res.locals.requestId
  });

  // Invalidate cache
  await del('products:*');

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Product created successfully',
    data: { product },
    requestId: res.locals.requestId
  });
});

/**
 * Get all products with pagination and filtering
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    search,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    featured
  } = req.query;

  // Build cache key
  const cacheKey = `products:${JSON.stringify(req.query)}`;

  // Try to get from cache
  const cachedData = await get(cacheKey);
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true,
      requestId: res.locals.requestId
    });
  }

  // Build filter object
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (featured === 'true') filter.isFeatured = true;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: 'createdBy',
    select: '-__v'
  };

  const products = await Product.paginate(filter, options);

  const response = {
    products: products.docs,
    pagination: {
      currentPage: products.page,
      totalPages: products.totalPages,
      totalItems: products.totalDocs,
      hasNext: products.hasNextPage,
      hasPrev: products.hasPrevPage,
      limit: products.limit
    }
  };

  // Cache for 5 minutes
  await set(cacheKey, response, 300);

  res.json({
    success: true,
    data: response,
    requestId: res.locals.requestId
  });
});

/**
 * Get single product
 */
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const cacheKey = `product:${id}`;
  const cachedProduct = await get(cacheKey);
  if (cachedProduct) {
    // Increment views (async, don't wait)
    Product.findById(id)
      .then((product) => {
        if (product) product.incrementViews();
      })
      .catch(() => {});

    return res.json({
      success: true,
      data: { product: cachedProduct },
      cached: true,
      requestId: res.locals.requestId
    });
  }

  const product = await Product.findById(id).populate('createdBy', 'firstName lastName email');

  if (!product || !product.isActive) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND);
  }

  // Increment views
  await product.incrementViews();

  // Cache for 10 minutes
  await set(cacheKey, product, 600);

  res.json({
    success: true,
    data: { product },
    requestId: res.locals.requestId
  });
});

/**
 * Update product
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND);
  }

  // Check ownership or admin role
  if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', StatusCodes.FORBIDDEN);
  }

  // Add updatedBy field
  const updateData = {
    ...req.body,
    updatedBy: req.user.id
  };

  const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  }).populate('createdBy', 'firstName lastName email');

  logger.info(`Product updated: ${updatedProduct.name} by user ${req.user.email}`, {
    productId: updatedProduct._id,
    userId: req.user.id,
    requestId: res.locals.requestId
  });

  // Invalidate cache
  await del(`product:${id}`);
  await del('products:*');

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: { product: updatedProduct },
    requestId: res.locals.requestId
  });
});

/**
 * Delete product (soft delete)
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND);
  }

  // Check ownership or admin role
  if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this product', StatusCodes.FORBIDDEN);
  }

  // Soft delete
  product.isActive = false;
  await product.save();

  logger.info(`Product deleted: ${product.name} by user ${req.user.email}`, {
    productId: product._id,
    userId: req.user.id,
    requestId: res.locals.requestId
  });

  // Invalidate cache
  await del(`product:${id}`);
  await del('products:*');

  res.json({
    success: true,
    message: 'Product deleted successfully',
    requestId: res.locals.requestId
  });
});

/**
 * Update product inventory
 */
const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const product = await Product.findById(id);

  if (!product) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND);
  }

  await product.updateInventory(quantity);

  logger.info(`Inventory updated for product: ${product.name} to ${quantity}`, {
    productId: product._id,
    requestId: res.locals.requestId
  });

  // Invalidate cache
  await del(`product:${id}`);
  await del('products:*');

  res.json({
    success: true,
    message: 'Inventory updated successfully',
    data: { product },
    requestId: res.locals.requestId
  });
});

/**
 * Get featured products
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const cacheKey = `products:featured:${limit}`;
  const cachedData = await get(cacheKey);
  if (cachedData) {
    return res.json({
      success: true,
      data: cachedData,
      cached: true,
      requestId: res.locals.requestId
    });
  }

  const products = await Product.findFeatured(parseInt(limit));

  const response = {
    products: products.docs,
    pagination: {
      currentPage: products.page,
      totalPages: products.totalPages,
      totalItems: products.totalDocs
    }
  };

  // Cache for 15 minutes
  await set(cacheKey, response, 900);

  res.json({
    success: true,
    data: response,
    requestId: res.locals.requestId
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
  getFeaturedProducts
};


