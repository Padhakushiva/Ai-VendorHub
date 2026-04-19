const express = require('express');
const validatorMiddleware = require('../middleware/validator.middleware');
const authController = require('../Controllers/auth.controller');
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// POST /api/auth/register
router.post('/auth/register', validatorMiddleware.registerUserValidation, authController.registeruser);


// POST /api/auth/login
router.post('/auth/login', validatorMiddleware.loginUserValidation, authController.loginuser);


//GET /api/auth/me
router.get('/auth/me', authMiddleware, authController.getCurrentUser);
module.exports = router;