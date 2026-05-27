const { body, validationResult } = require('express-validator');

/**
 * Middleware to parse nested form-data fields
 * Converts flat keys like "price.amount" into nested objects
 */
const parseNestedFormData = (req, res, next) => {
  if (req.body) {
    // Handle nested price fields
    if (req.body.amount !== undefined || req.body.currency !== undefined) {
      req.body.price = {
        amount: req.body.amount,
        currency: req.body.currency || 'INR'
      };
      delete req.body.amount;
      delete req.body.currency;
    }

    if (req.body['price.amount'] || req.body['price.currency']) {
      req.body.price = {
        amount: req.body['price.amount'],
        currency: req.body['price.currency'] || 'INR'
      };
      delete req.body['price.amount'];
      delete req.body['price.currency'];
    }
  }
  next();
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  
  next();
};


/**
 * Validation rules for product creation
 */
const validateProductCreation = [
  // Title validation
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  // Amount validation (nested in price object)
  body('price.amount')
    .notEmpty()
    .withMessage('Amount is required')
    .toFloat()
    .custom((value) => {
      if (isNaN(value) || value <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return true;
    }),

  // Currency validation (nested in price object)
  body('price.currency')
    .optional()
    .trim()
    .isIn(['USD', 'INR', 'EUR', 'GBP', 'JPY'])
    .withMessage('Currency must be one of: USD, INR, EUR, GBP, JPY')
    .toUpperCase(),

  // Description validation (optional)
  body('description')
    .optional()
    .trim()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  // Stock validation
  body('stock')
    .optional()
    .toInt()
    .custom((value) => {
      if (isNaN(value) || value < 0) {
        throw new Error('Stock must be a non-negative number');
      }
      return true;
    }),

  // Category validation (optional)
  body('category')
    .optional()
    .trim()
    .isString()
    .withMessage('Category must be a string'),

    handleValidationErrors,
];



module.exports = {
  parseNestedFormData,
  validateProductCreation,
  handleValidationErrors,
};
