const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const { isAuth, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', isAuth, getMe);

module.exports = router;
