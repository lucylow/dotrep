const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - require authentication
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('Access denied. No token provided.', StatusCodes.UNAUTHORIZED)
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(
        new AppError('User belonging to this token no longer exists.', StatusCodes.UNAUTHORIZED)
      );
    }

    if (!user.isActive) {
      return next(new AppError('User account is inactive.', StatusCodes.UNAUTHORIZED));
    }

    if (user.isLocked) {
      return next(new AppError('User account is locked.', StatusCodes.UNAUTHORIZED));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token.', StatusCodes.UNAUTHORIZED));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired.', StatusCodes.UNAUTHORIZED));
    }
    return next(new AppError('Authentication failed.', StatusCodes.UNAUTHORIZED));
  }
});

/**
 * Authorize based on roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          StatusCodes.FORBIDDEN
        )
      );
    }
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optional = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    } catch (error) {
      // Continue without user for optional auth
    }
  }

  next();
});

/**
 * Check if user owns resource or is admin
 */
const checkOwnership = (Model, paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resource = await Model.findById(req.params[paramName]);

    if (!resource) {
      return next(
        new AppError(`Resource not found`, StatusCodes.NOT_FOUND)
      );
    }

    // Check if user owns the resource or is admin
    const ownerField = resource.createdBy ? 'createdBy' : 'userId';
    const resourceOwnerId = resource[ownerField]?.toString();

    if (resourceOwnerId !== req.user.id && req.user.role !== 'admin') {
      return next(
        new AppError('Not authorized to access this resource', StatusCodes.FORBIDDEN)
      );
    }

    req.resource = resource;
    next();
  });
};

module.exports = {
  protect,
  authorize,
  optional,
  checkOwnership
};


