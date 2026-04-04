const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

exports.isAuth = (req, res, next) => {
  try {
    // Get token from header or cookie
    const token =
      req.headers.authorization?.split(' ')[1] ||
      req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Check specific roles
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database connection is not ready. Please make sure MongoDB is running and try again.',
        });
      }

      const User = require('../models/User');
      const user = await User.findById(req.userId).select('role');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `User role '${user.role}' is not authorized`,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
};
