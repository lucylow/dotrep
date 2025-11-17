const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { userValidation } = require('../middleware/validation');

// Public routes
router.post('/register', validate(userValidation.register), authController.register);
router.post('/login', validate(userValidation.login), authController.login);
router.post('/forgot-password', validate(userValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(userValidation.resetPassword), authController.resetPassword);

// Protected routes
router.use(protect);

router.get('/profile', authController.getProfile);
router.put('/profile', validate(userValidation.update), authController.updateProfile);
router.patch('/change-password', validate(userValidation.changePassword), authController.changePassword);

module.exports = router;


