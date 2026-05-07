const {body,validationResult}=require('express-validator')


const respondWithValidationErrors=(req,res,next)=>{
    if(!validationResult(req).isEmpty()){
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        })
    }
    next();
}


//register user validation
const registerUserValidation=[
    body("username")
    .isString()
    .withMessage("Username must be a string")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({min:3})    
    .withMessage("Username must be at least 3 characters long"),

    body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .notEmpty()
    .withMessage("Email is required"),

    body("password")
    .isLength({min:6})
    .withMessage("Password must be at least 6 characters long")
    .notEmpty()
    .withMessage("Password is required"),

    body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is required"),

    body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is required"),

    body('role')
    .optional()
    .isIn(['user'])
    .withMessage("Invalid role"),

    body('address.addressLine')
    .isString()
    .withMessage('Address line must be a string')
    .notEmpty()
    .withMessage('Address line is required'),

    body('address.city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()
    .withMessage('City is required'),

    body('address.state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State is required'),

    body('address.pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits')
    .notEmpty()
    .withMessage('Pincode is required'),

    body('address.phone')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits')
    .notEmpty()
    .withMessage('Phone number is required'),

    respondWithValidationErrors
]

//register seller validation
const registerSellerValidation=[
    body("username")
    .isString()
    .withMessage("Username must be a string")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({min:3})    
    .withMessage("Username must be at least 3 characters long"),

    body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .notEmpty()
    .withMessage("Email is required"),

    body("password")
    .isLength({min:6})
    .withMessage("Password must be at least 6 characters long")
    .notEmpty()
    .withMessage("Password is required"),

    body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is required"),

    body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is required"),

    body('role')
    .optional()
    .isIn(['seller'])
    .withMessage("Invalid role"),

    respondWithValidationErrors
]




//login user validation
const loginUserValidation = [
    body("email")
    .isEmail()
    .optional()
    .withMessage("Invalid email format")
    .notEmpty()
    .withMessage("Email is required"),

    body("username")
    .optional()
    .isString()
    .withMessage("Username must be a string"),
    

    body("password")
    .notEmpty()
    .withMessage("Password is required"),
    (req, res, next) => {

        if (!req.body.email && !req.body.username) {

            return res.status(400).json({

                success: false,

                message: "All fields are required"

            });

        }

        next();

    },
    respondWithValidationErrors
]

module.exports={
    registerUserValidation,
    loginUserValidation,
    registerSellerValidation
}