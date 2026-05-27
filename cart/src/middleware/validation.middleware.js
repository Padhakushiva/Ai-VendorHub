const{body,validationResult}=require('express-validator');
const mongoose=require('mongoose');

function validateResult(req,res,next){
    const errors=validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    next();
}       
const validateAddItemToCart=[
    body('productId')
    .isString()
    .withMessage('Invalid product ID'),
    body('productId')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid product ID format'),


    body('variantId')
    .optional()
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid variant ID format'),

    body('quantity')
    .if(body('qty').not().exists())
    .isInt({min:1})
    .withMessage('Quantity must be at least 1'),
    body('qty')
    .optional()
    .isInt({min:1})
    .withMessage('Quantity must be at least 1'),
    validateResult
]

module.exports={
    validateAddItemToCart,
}
