# EduAI Backend Setup Guide

## Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** package manager

---

## Installation Steps

### 1. **Install MongoDB**

#### Option A: Local MongoDB (Windows)
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the installation wizard
3. MongoDB will be installed as a service and run automatically
4. Default connection: `mongodb://localhost:27017`

#### Option B: MongoDB Atlas (Cloud - Recommended for production)
1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (free tier available)
3. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)

---

### 2. **Setup Backend Environment**

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with your configuration
```

### 3. **Configure .env File**

Create a `.env` file in the backend directory with these values:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/eduai

# For MongoDB Atlas use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eduai

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production_12345678

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@eduai.com
SUPER_ADMIN_PASSWORD=admin@123
```

### 4. **Start MongoDB Service**

#### Windows (if installed locally):
MongoDB should start automatically. If not:
```bash
# Start MongoDB service
net start MongoDB

# Stop MongoDB service
net stop MongoDB
```

Or use MongoDB Compass (GUI) - comes with MongoDB installation.

---

### 5. **Start Backend Server**

```bash
# Navigate to backend directory
cd backend

# Run in development mode
npm run dev

# Output should show:
# Server running on port 5000
# MongoDB connected
```

---

### 6. **Setup Frontend**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not done yet)
npm install

# Start development server
npm run dev

# Frontend will run on http://localhost:5173
```

---

## Project Structure

```
├── backend/
│   ├── models/
│   │   └── User.js                 # MongoDB User schema
│   ├── controllers/
│   │   └── authController.js       # Authentication logic
│   ├── middleware/
│   │   └── auth.js                 # Authentication middleware
│   ├── routes/
│   │   └── auth.js                 # API routes
│   ├── server.js                   # Express server setup
│   ├── package.json                # Backend dependencies
│   └── .env                        # Environment variables
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── Register.jsx     # Registration page
    │   │   │   ├── Login.jsx        # Login page
    │   │   │   └── RoleSelection.jsx # Role selection
    │   │   └── dashboards/
    │   │       ├── StudentDashboard.jsx
    │   │       ├── InstructorDashboard.jsx
    │   │       └── SuperAdminDashboard.jsx
    │   ├── services/
    │   │   └── api.js               # Axios API client
    │   └── components/              # Reusable components
    └── package.json
```

---

## Backend API Endpoints

### Authentication Routes

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "student"  // or "instructor"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "message": "Logged in successfully",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

#### Super Admin Login
Use these predefined credentials:
- **Email**: `admin@eduai.com`
- **Password**: `admin@123`

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "user": { user_object }
}
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Database Schema

### User Model
```javascript
{
  name: String,              // User's full name
  email: String,             // Unique email
  password: String,          // Hashed password
  role: String,              // 'student', 'instructor', 'super_admin'
  profilePicture: String,    // Profile picture URL
  bio: String,               // User bio
  isActive: Boolean,         // Account status
  createdAt: Date,           // Registration date
  updatedAt: Date            // Last update date
}
```

---

## Testing the API

### Using Postman or Thunder Client

1. **Register a new student**:
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "name": "Alice Johnson",
       "email": "alice@example.com",
       "password": "Alice@12345",
       "role": "student"
     }
     ```

2. **Login with registered email**:
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "alice@example.com",
       "password": "Alice@12345"
     }
     ```

3. **Login as Super Admin**:
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@eduai.com",
       "password": "admin@123"
     }
     ```

---

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB service is running:
- Windows: Check Services or use `net start MongoDB`
- macOS: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in .env or kill the process using port 5000

### CORS Errors
**Solution**: Make sure `FRONTEND_URL` in .env matches your frontend URL (default: `http://localhost:5173`)

### Authentication Failed
**Solution**: 
1. Check JWT_SECRET in .env
2. Verify token is being sent in Authorization header
3. Make sure cookie-parser is installed

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/eduai` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing secret | `any_random_string_12345` |
| `SUPER_ADMIN_EMAIL` | Super admin email | `admin@eduai.com` |
| `SUPER_ADMIN_PASSWORD` | Super admin password | `admin@123` |

---

## Next Steps

1. ✅ Backend setup with MongoDB
2. ✅ Authentication system (Register, Login, Roles)
3. ✅ Frontend-Backend API integration
4. 📝 Create Course Management APIs
5. 📝 Implement User Profiles
6. 📝 Add Progress Tracking
7. 📝 Integrate Groq AI API

---

## Support

For issues or questions, check:
- MongoDB Documentation: [docs.mongodb.com](https://docs.mongodb.com)
- Express.js Guide: [expressjs.com](https://expressjs.com)
- Mongoose Documentation: [mongoosejs.com](https://mongoosejs.com)

