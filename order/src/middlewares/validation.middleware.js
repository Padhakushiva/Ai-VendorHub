const { body, validationResult } = require('express-validator');

// Middleware to transform address format from user profile to shippingAddress format
const transformAddressFormat = (req, res, next) => {
    // Check if address is already in shippingAddress format
    if (req.body.shippingAddress) {
        // Normalize common variants: accept `pincode` or `zip` and populate both
        const sa = req.body.shippingAddress;
        if (sa.pincode && !sa.zip) sa.zip = sa.pincode;
        if (sa.zip && !sa.pincode) sa.pincode = sa.zip;
        return next();
    }
    
    // Check if address is nested under 'address' field
    if (req.body.address && typeof req.body.address === 'object') {
        const addr = req.body.address;
        req.body.shippingAddress = {
            street: addr.addressLine || '',
            city: addr.city || '',
            state: addr.state || '',
            zip: addr.pincode || '',
            country: addr.country || 'India'
        };
        return next();
    }
    
    // Check if address fields are at top level (addressLine, city, state, pincode, etc.)
    if (req.body.addressLine || req.body.city || req.body.state || req.body.pincode) {
        req.body.shippingAddress = {
            street: req.body.addressLine || '',
            city: req.body.city || '',
            state: req.body.state || '',
            zip: req.body.pincode || '',
            country: req.body.country || 'India'
        };
        return next();
    }
    
    next();
};

const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const createOrderValidation = [
    body('shippingAddress.street')
        .isString()
        .withMessage('Street/AddressLine must be a string')
        .notEmpty()
        .withMessage('Street/AddressLine is required'),
    body('shippingAddress.city')
        .isString()
        .withMessage('City must be a string')
        .notEmpty()
        .withMessage('City is required'),
    body('shippingAddress.state')
        .isString()
        .withMessage('State must be a string')
        .notEmpty()
        .withMessage('State is required'),
    body('shippingAddress.zip')
        .isString()
        .withMessage('Pincode must be a string')
        .notEmpty()
        .withMessage('Pincode is required')
        .bail()
        .matches(/^\d{4,}$/)
        .withMessage('Pincode must be at least 4 digits'),
    body('shippingAddress.country')
        .isString()
        .withMessage('Country must be a string')
        .notEmpty()
        .withMessage('Country is required'),
    respondWithValidationErrors
]


const updateAddressValidation = [
    body('shippingAddress.street')
        .isString()
        .withMessage('Street/AddressLine must be a string')
        .notEmpty()
        .withMessage('Street/AddressLine cannot be empty'),
    body('shippingAddress.city')
        .isString()
        .withMessage('City must be a string')
        .notEmpty()
        .withMessage('City cannot be empty'),
    body('shippingAddress.state')
        .isString()
        .withMessage('State must be a string')
        .notEmpty()
        .withMessage('State cannot be empty'),
    body('shippingAddress.zip')
        .isString()
        .withMessage('Pincode must be a string')
        .notEmpty()
        .withMessage('Pincode cannot be empty')
        .bail()
        .matches(/^\d{4,}$/)
        .withMessage('Pincode must be at least 4 digits'),
    body('shippingAddress.country')
        .isString()
        .withMessage('Country must be a string')
        .notEmpty()
        .withMessage('Country cannot be empty'),
    respondWithValidationErrors
]

module.exports = { transformAddressFormat, createOrderValidation, updateAddressValidation };       
