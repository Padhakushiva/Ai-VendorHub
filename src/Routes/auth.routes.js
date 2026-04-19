const express = require('express');
const validatorMiddleware = require('../middleware/validator.middleware');
const authController = require('../Controllers/auth.controller');
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// POST /api/auth/register
router.post('/auth/register', validatorMiddleware.registerUserValidation, authController.registeruser);

// POST /api/auth/login
router.post('/auth/login', validatorMiddleware.loginUserValidation, authController.loginuser);

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