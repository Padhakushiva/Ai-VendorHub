const express = require('express');
const validatorMiddleware = require('../middleware/validator.middleware');
const authController = require('../Controllers/auth.controller');
const { authMiddleware } = require("../middleware/auth.middleware");
const { passport, isGoogleAuthConfigured } = require('../config/passport');
const { authRateLimiter, emailRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();
// health check endpoint
router.get("/",(req,res)=>{
    res.status(200).json({message:"Auth API is running"});
});


// POST /api/auth/register----user registration
router.post('/auth/register', authRateLimiter, validatorMiddleware.registerUserValidation, authController.registeruser);

// POST /api/auth/register----seller registration
router.post('/auth/register/seller', authRateLimiter, validatorMiddleware.registerSellerValidation, authController.registerSeller);

// POST /api/auth/login
router.post('/auth/login', authRateLimiter, validatorMiddleware.loginUserValidation, authController.loginuser);

// POST /api/auth/login/seller
router.post('/auth/login/seller', authRateLimiter, validatorMiddleware.loginUserValidation, authController.loginSeller);

// POST /api/auth/verify-email/request
router.post('/auth/verify-email/request', emailRateLimiter, authMiddleware, authController.requestEmailVerification);

// GET /api/auth/verify-email/:token
router.get('/auth/verify-email/:token', authController.verifyEmail);

// POST /api/auth/verify-email/:token
router.post('/auth/verify-email/:token', authController.verifyEmail);

// POST /api/auth/password/forgot
router.post('/auth/password/forgot', emailRateLimiter, validatorMiddleware.forgotPasswordValidation, authController.forgotPassword);

// POST /api/auth/password/reset/:token
router.post('/auth/password/reset/:token', authRateLimiter, validatorMiddleware.resetPasswordValidation, authController.resetPassword);

// POST /api/auth/refresh
router.post('/auth/refresh', authController.refreshAccessToken);

// GET /api/auth/me
router.get('/auth/me', authMiddleware, authController.getCurrentUser);

// PATCH /api/auth/users/me
router.patch('/auth/users/me', authMiddleware, validatorMiddleware.updateProfileValidation, authController.updateCurrentUser);

// GET /api/auth/logout
router.get('/auth/logout', authMiddleware, authController.logoutUser);

// POST /api/auth/logout
router.post('/auth/logout', authMiddleware, authController.logoutUser);

// POST /api/auth/logout-all
router.post('/auth/logout-all', authMiddleware, authController.logoutAllDevices);

// GET /api/auth/google
router.get('/auth/google', (req, res, next) => {
    if (!isGoogleAuthConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Google authentication is not configured'
        });
    }

    const role = ['seller', 'merchant'].includes(String(req.query.role || '').toLowerCase())
        ? 'seller'
        : 'user';

    return passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state: role
    })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/auth/google/callback', (req, res, next) => {
    if (!isGoogleAuthConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Google authentication is not configured'
        });
    }

    const failureRedirect = process.env.GOOGLE_AUTH_FAILURE_REDIRECT
        || `${process.env.CLIENT_BASE_URL || 'http://localhost:5173'}/login?google=failed`;

    return passport.authenticate('google', {
        session: false,
        failureRedirect
    })(req, res, next);
}, authController.googleAuthCallback);

// GET /api/auth/users/me/addresses
router.get('/auth/users/me/addresses', authMiddleware, authController.getUserAddresses);

// POST /api/auth/users/me/addresses
router.post('/auth/users/me/addresses', authMiddleware, authController.addAddress);

// DELETE /api/auth/users/me/addresses/:addressId
router.delete('/auth/users/me/addresses/:addressId', authMiddleware, authController.deleteAddress);

module.exports = router;
