const jwt = require('jsonwebtoken');

function createAuthMiddleware(roles = ['user']) {
  return function authMiddleware(req, res, next) {
    const authHeader = req.headers?.authorization || '';
    const token = req.cookies?.accessToken
      || req.cookies?.token
      || (authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const role = decoded.role === 'buyer' ? 'user' : decoded.role;
      if (!roles.includes(role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      req.user = { ...decoded, role };
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

module.exports = createAuthMiddleware;
