const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize, optional } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { productValidation } = require('../middleware/validation');

// Public routes (optional auth for personalized results)
router.get('/', optional, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', optional, productController.getProduct);

// Protected routes
router.use(protect);

router.post('/', authorize('admin', 'moderator'), validate(productValidation.create), productController.createProduct);
router.put('/:id', validate(productValidation.update), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/inventory', authorize('admin', 'moderator'), validate(productValidation.updateInventory), productController.updateInventory);

module.exports = router;


