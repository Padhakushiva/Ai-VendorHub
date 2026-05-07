const express = require('express');
const validatorMiddleware = require('../middleware/validator.middleware');
const authController = require('../Controllers/auth.controller');
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();
// health check endpoint
router.get("/",(req,res)=>{
    res.status(200).json({message:"Auth API is running"});
});


// POST /api/auth/register----user registration
router.post('/auth/register', validatorMiddleware.registerUserValidation, authController.registeruser);

// POST /api/auth/register----seller registration
router.post('/auth/register/seller', validatorMiddleware.registerSellerValidation, authController.registerSeller);

// POST /api/auth/login
router.post('/auth/login', validatorMiddleware.loginUserValidation, authController.loginuser);

// POST /api/auth/login/seller
router.post('/auth/login/seller', validatorMiddleware.loginUserValidation, authController.loginSeller);

// GET /api/auth/me
router.get('/auth/me', authMiddleware, authController.getCurrentUser);

// GET /api/auth/logout
router.get('/auth/logout', authMiddleware, authController.logoutUser);

// GET /api/auth/users/me/addresses
router.get('/auth/users/me/addresses', authMiddleware, authController.getUserAddresses);

// POST /api/auth/users/me/addresses
router.post('/auth/users/me/addresses', authMiddleware, authController.addAddress);

// DELETE /api/auth/users/me/addresses/:addressId
router.delete('/auth/users/me/addresses/:addressId', authMiddleware, authController.deleteAddress);

module.exports = router;