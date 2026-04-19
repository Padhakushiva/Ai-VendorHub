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



const registerUserValidation=[
    body("username")
    .isString()
    .withMessage("Username must be a string")
    .notEmpty()
    .withMessage("Username is required"),

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
    .isIn(['user', 'admin'])
    .withMessage("Invalid role")
    .notEmpty()
    .withMessage("Role is required"),
    respondWithValidationErrors
]

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
    loginUserValidation
}