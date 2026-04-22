const { body, validationResult } = require('express-validator');

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

  // Amount validation (convert string to number for form data)
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .toFloat()
    .custom((value) => {
      if (isNaN(value) || value <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return true;
    }),

  // Currency validation (optional)
  body('currency')
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
    handleValidationErrors,
];



module.exports = {
  validateProductCreation,
};
