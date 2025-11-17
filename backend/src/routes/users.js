const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Example user routes - implement as needed
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
    requestId: res.locals.requestId
  });
});

// Admin only routes
router.use(authorize('admin'));

// Add admin user management routes here

module.exports = router;


