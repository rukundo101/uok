// src/middleware/authMiddleware.js
// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();
const { UserModel } = require('../models/userModel'); // ✅ FIXED IMPORT

// =====================================================
// AUTHENTICATE TOKEN
// =====================================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists in DB
    const user = await UserModel.findUserById(decoded.userId); // ✅ FIXED CALL

    if (!user) {
      return res.status(401).json({ error: 'User not found. Token invalid.' });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    // Continue to next middleware or controller
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please login again.' });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
};

// =====================================================
// ROLE-BASED AUTHORIZATION (OPTIONAL)
// =====================================================
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'No role assigned to user' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
