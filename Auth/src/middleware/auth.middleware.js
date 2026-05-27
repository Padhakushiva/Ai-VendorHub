const userModel = require('../Models/user.model');
const jwt = require('jsonwebtoken');
const redis = require('../DB/redis');


async function authMiddleware(req, res, next) {
  // Get token from Authorization header (Bearer format) or cookies
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }


  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    try {
      const isBlacklisted = await redis.get(`blacklist_${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked.'
        });
      }
    } catch (redisError) {
      console.warn('Redis blacklist check failed:', redisError.message);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token.' 
    });
  }
};

module.exports = {authMiddleware};
