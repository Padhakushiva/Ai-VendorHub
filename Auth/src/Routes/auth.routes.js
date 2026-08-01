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

// POST /api/auth/login/admin
router.post('/auth/login/admin', authRateLimiter, validatorMiddleware.loginUserValidation, authController.loginAdmin);

// POST /api/auth/login/seller
router.post('/auth/login/seller', authRateLimiter, validatorMiddleware.loginUserValidation, authController.loginSeller);

// POST /api/auth/verify-email/request
router.post('/auth/verify-email/request', emailRateLimiter, authMiddleware, authController.requestEmailVerification);

// GET /api/auth/verify-email/:token
router.get('/auth/verify-email/:token', authController.verifyEmail);

// POST /api/auth/verify-email/:token
router.post('/auth/verify-email/:token', authController.verifyEmail);

// POST /api/auth/verify-otp
router.post('/auth/verify-otp', emailRateLimiter, authController.verifyOtp);

// POST /api/auth/resend-otp
router.post('/auth/resend-otp', emailRateLimiter, authController.resendOtp);

// POST /api/auth/password/forgot
router.post('/auth/password/forgot', emailRateLimiter, validatorMiddleware.forgotPasswordValidation, authController.forgotPassword);
router.post('/auth/forgot-password', emailRateLimiter, validatorMiddleware.forgotPasswordValidation, authController.forgotPassword);

// POST /api/auth/password/reset/:token
router.post('/auth/password/reset/:token', authRateLimiter, validatorMiddleware.resetPasswordValidation, authController.resetPassword);
router.post('/auth/reset-password/:token', authRateLimiter, validatorMiddleware.resetPasswordValidation, authController.resetPassword);

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

    const requestedRole = String(req.query.role || '').toLowerCase();
    const role = requestedRole === 'admin'
        ? 'admin'
        : ['seller', 'merchant'].includes(requestedRole)
            ? 'seller'
            : 'user';

    return passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state: role,
        prompt: 'select_account'
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

    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err || !user) {
            console.error('Google OAuth error:', err?.message || info?.message, err?.oauthErrorData || '');
            return res.redirect(failureRedirect);
        }
        req.user = user;
        return authController.googleAuthCallback(req, res, next);
    })(req, res, next);
});

// GET /api/auth/users/me/addresses
router.get('/auth/users/me/addresses', authMiddleware, authController.getUserAddresses);

// POST /api/auth/users/me/addresses
router.post('/auth/users/me/addresses', authMiddleware, authController.addAddress);

// DELETE /api/auth/users/me/addresses/:addressId
router.delete('/auth/users/me/addresses/:addressId', authMiddleware, authController.deleteAddress);

module.exports = router;
