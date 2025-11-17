const { validationResult } = require('express-validator');
const Joi = require('joi');
const AppError = require('../utils/AppError');
const { StatusCodes } = require('http-status-codes');

/**
 * Express validator error formatter
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.param || error.msg,
      message: error.msg,
      value: error.value
    }));

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      requestId: res.locals.requestId
    });
  }
  next();
};

/**
 * Joi validation schemas
 */
const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'string.pattern.base':
          'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string().trim().max(50).required().messages({
      'any.required': 'First name is required',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().trim().max(50).required().messages({
      'any.required': 'Last name is required',
      'string.max': 'Last name cannot exceed 50 characters'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  update: Joi.object({
    firstName: Joi.string().trim().max(50),
    lastName: Joi.string().trim().max(50),
    profile: Joi.object({
      bio: Joi.string().max(500),
      phone: Joi.string(),
      address: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        zipCode: Joi.string(),
        country: Joi.string()
      })
    }),
    preferences: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto'),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean()
      })
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    newPassword: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters',
        'string.pattern.base':
          'New password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'New password is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    })
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'string.pattern.base':
          'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      })
  })
};

const productValidation = {
  create: Joi.object({
    name: Joi.string().trim().max(100).required().messages({
      'any.required': 'Product name is required',
      'string.max': 'Product name cannot exceed 100 characters'
    }),
    description: Joi.string().max(1000).required().messages({
      'any.required': 'Product description is required',
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    shortDescription: Joi.string().max(200),
    price: Joi.number().min(0).required().messages({
      'any.required': 'Product price is required',
      'number.min': 'Price cannot be negative'
    }),
    compareAtPrice: Joi.number().min(0),
    category: Joi.string()
      .valid('electronics', 'clothing', 'books', 'home', 'sports', 'other')
      .required()
      .messages({
        'any.required': 'Category is required',
        'any.only': 'Category must be one of: electronics, clothing, books, home, sports, other'
      }),
    inventory: Joi.object({
      quantity: Joi.number().min(0).required(),
      lowStockThreshold: Joi.number().min(0).default(10),
      trackQuantity: Joi.boolean().default(true)
    }),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string(),
        isPrimary: Joi.boolean().default(false),
        order: Joi.number().default(0)
      })
    ),
    tags: Joi.array().items(Joi.string().trim().lowercase()),
    specifications: Joi.object(),
    isFeatured: Joi.boolean().default(false)
  }),

  update: Joi.object({
    name: Joi.string().trim().max(100),
    description: Joi.string().max(1000),
    shortDescription: Joi.string().max(200),
    price: Joi.number().min(0),
    compareAtPrice: Joi.number().min(0),
    category: Joi.string().valid('electronics', 'clothing', 'books', 'home', 'sports', 'other'),
    inventory: Joi.object({
      quantity: Joi.number().min(0),
      lowStockThreshold: Joi.number().min(0),
      trackQuantity: Joi.boolean()
    }),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string(),
        isPrimary: Joi.boolean().default(false),
        order: Joi.number().default(0)
      })
    ),
    tags: Joi.array().items(Joi.string().trim().lowercase()),
    specifications: Joi.object(),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean()
  }),

  updateInventory: Joi.object({
    quantity: Joi.number().min(0).required().messages({
      'any.required': 'Quantity is required',
      'number.min': 'Quantity cannot be negative'
    })
  })
};

/**
 * Joi validation middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
        requestId: res.locals.requestId
      });
    }

    next();
  };
};

module.exports = {
  handleValidationErrors,
  userValidation,
  productValidation,
  validate
};


