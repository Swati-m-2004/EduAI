const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const ensureDatabaseReady = require('./middleware/ensureDatabaseReady');
const bcryptjs = require('bcryptjs');

dotenv.config();
mongoose.set('bufferCommands', false);

// Import routes
const authRoutes = require('./routes/auth');
const instructorRoutes = require('./routes/instructor');
const superAdminRoutes = require('./routes/superAdmin');
const studentRoutes = require('./routes/student');
const User = require('./models/User');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
].filter(Boolean);

const isLocalDevOrigin = (origin) => {
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduai';

// Routes
app.use('/api', ensureDatabaseReady);
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'EduAI Backend API' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  res.status(400).json({
    success: false,
    message: error.message || 'Request failed',
  });
});

const PORT = process.env.PORT || 5000;

const ensureDevelopmentUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const existingUsers = await User.countDocuments();

  if (existingUsers > 0) {
    return;
  }

  const defaultUsers = [
    {
      name: 'Demo Instructor',
      email: process.env.DEMO_INSTRUCTOR_EMAIL || 'instructor@eduai.com',
      password: process.env.DEMO_INSTRUCTOR_PASSWORD || 'instructor123',
      role: 'instructor',
      performanceScore: 84,
    },
    {
      name: 'Demo Student',
      email: process.env.DEMO_STUDENT_EMAIL || 'student@eduai.com',
      password: process.env.DEMO_STUDENT_PASSWORD || 'student123',
      role: 'student',
      performanceScore: 72,
    },
  ];

  const hashedUsers = await Promise.all(
    defaultUsers.map(async (user) => ({
      ...user,
      password: await bcryptjs.hash(user.password, 10),
    }))
  );

  await User.insertMany(hashedUsers);
  console.log('Seeded default development users');
};

const startServer = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    });

console.log('MongoDB connected with durability options');
    await ensureDevelopmentUsers();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

startServer();
