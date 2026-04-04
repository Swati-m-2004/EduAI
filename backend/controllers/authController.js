const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getGeneratedPerformanceScore = (seed = '') => {
  const normalizedSeed = String(seed).trim().toLowerCase();
  let hash = 0;

  for (let i = 0; i < normalizedSeed.length; i += 1) {
    hash = (hash << 5) - hash + normalizedSeed.charCodeAt(i);
    hash |= 0;
  }

  return 55 + Math.abs(hash % 41);
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
  });
};

// Register Controller
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const allowedRoles = ['student', 'instructor'];
    const normalizedRole = allowedRoles.includes(role) ? role : 'student';

    // Validation
    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail }).lean();
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    let managedBy = null;
    let performanceScore = null;

    if (normalizedRole === 'student') {
      const instructor = await User.findOne({ 
        role: 'instructor', 
        isActive: true 
      }).select('_id').lean();
      managedBy = instructor?._id || null;
      performanceScore = getGeneratedPerformanceScore(normalizedEmail);
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      managedBy,
      performanceScore,
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user',
    });
  }
};

// Login Controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validation
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check super admin credentials
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@eduai.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin@123';

    if (normalizedEmail === superAdminEmail.toLowerCase() && password === superAdminPassword) {
      // Create or get super admin user
      let superAdmin = await User.findOne({ email: superAdminEmail });

      if (!superAdmin) {
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(superAdminPassword, salt);
        superAdmin = await User.create({
          name: 'Super Admin',
          email: superAdminEmail,
          password: hashedPassword,
          role: 'super_admin',
          lastLoginAt: new Date(),
        });
      }

      superAdmin.lastLoginAt = new Date();
      await superAdmin.save();

      const token = generateToken(superAdmin._id);
      superAdmin.password = undefined;

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: 'Admin logged in successfully',
        token,
        user: superAdmin,
      });
    }

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare passwords
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    user.lastLoginAt = new Date();
    await user.save();

    // Remove password from response
    user.password = undefined;

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging in',
    });
  }
};

// Get Current User
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};

// Logout Controller
exports.logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
