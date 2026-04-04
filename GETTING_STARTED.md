# 🚀 EduAI - Getting Started Guide

## ⚡ Quick Start (5 minutes)

### Windows Users - Fastest Way
```bash
# 1. Open Command Prompt/PowerShell in the Edu-ai folder
# 2. Run:
start.bat

# That's it! Everything will start automatically:
# - Backend: http://localhost:5000
# - Frontend: http://localhost:5173
```

---

## 📋 Manual Setup (Step by Step)

### Step 1: Check Prerequisites

**Check Node.js is installed:**
```bash
node --version      # Should be v14 or higher
npm --version       # Should be v6 or higher
```

If not installed, download from: https://nodejs.org/

**Check MongoDB is running:**
- Windows: Press `Win + R`, type `services.msc`, find "MongoDB" and ensure it's running
- Or use MongoDB Compass (GUI tool) installed with MongoDB

---

### Step 2: Setup Backend

**Open Terminal/PowerShell in the `backend` folder:**

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (should already exist)
# Verify it has these values:
# MONGODB_URI=mongodb://localhost:27017/eduai
# PORT=5000
# JWT_SECRET=your_secret_key

# 3. Start backend server
npm run dev

# Expected output:
# Server running on port 5000
# MongoDB connected
```

**Keep this terminal open!**

---

### Step 3: Setup Frontend

**Open NEW Terminal/PowerShell in the `frontend` folder:**

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (should already exist)
# Verify it has:
# VITE_API_URL=http://localhost:5000/api

# 3. Start frontend server
npm run dev

# Expected output:
# VITE v5.x.x ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

**Keep this terminal open too!**

---

### Step 4: Test the Application

**Open your browser and visit:**
- **Frontend**: http://localhost:5173
- **Backend Health Check**: http://localhost:5000/health

You should see:
- Frontend: EduAI landing page with beautiful gradient design
- Backend: `{"status": "Server is running"}`

---

## 🧪 Testing the Full Flow

### Test 1: Register as Student

1. Click "Get Started" on landing page
2. Select "Student" role
3. Fill registration form:
   ```
   Name: John Doe
   Email: john@example.com
   Password: SecurePass123
   Confirm: SecurePass123
   ```
4. Click "Create Account"
5. You'll see success message → Auto-redirect to Login
6. Login with your credentials
7. You should see **Student Dashboard** ✓

### Test 2: Register as Instructor

1. Go back to landing page
2. Select "Instructor" role
3. Fill registration form:
   ```
   Name: Jane Smith
   Email: jane@example.com
   Password: InstructorPass123
   Confirm: InstructorPass123
   ```
4. Click "Create Account"
5. Login with credentials
6. You should see **Instructor Dashboard** ✓

### Test 3: Login as Super Admin

1. Go to Login page (http://localhost:5173/login)
2. Use predefined credentials:
   ```
   Email: admin@eduai.com
   Password: admin@123
   ```
3. Click "Login"
4. You should see **Admin Dashboard with Gold Design** ✓

---

## 🎨 Features to Try

### Theme Toggle
- Look for 🌙 button in top-right corner
- Toggle between Light / Dark mode
- Theme preference persists on refresh

### Form Validation
- Try registering with:
  - Empty fields → Error messages appear
  - Invalid email → "Invalid email format" error
  - Short password → "Password must be at least 8 characters"
  - Mismatched passwords → "Passwords do not match"

### Responsive Design
- Resize browser window
- Try on mobile device (use DevTools for testing)
- Layout adapts beautifully

### Animations
- Notice smooth transitions when:
  - Page loads
  - Forms appear
  - Buttons are clicked
  - Text inputs show errors

---

## 📊 Database Verification

### Check MongoDB has your data:

**Using MongoDB Compass (GUI):**
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Navigate to: `eduai` → `users`
4. You'll see all registered users with:
   - name
   - email
   - hashed password
   - role (student/instructor)
   - createdAt timestamp

**Using MongoDB Shell (CLI):**
```bash
mongosh
use eduai
db.users.find()  # Shows all users
db.users.findOne({email: "john@example.com"})  # Find specific user
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module" error

**Solution:**
```bash
# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
```

### Issue: MongoDB Connection Error

**Solution:**
```bash
# Option 1: Start MongoDB service (Windows)
net start MongoDB

# Option 2: Use MongoDB Compass to start it (GUI)

# Option 3: Check your MONGODB_URI is correct
# Should be: mongodb://localhost:27017/eduai
```

### Issue: Port 5000 Already in Use

**Solution:**
```bash
# Change port in backend/.env
# PORT=5001  (or any other free port)

# Then update frontend .env
# VITE_API_URL=http://localhost:5001/api
```

### Issue: Frontend Shows Blank Page

**Solution:**
1. Clear browser cache: `Ctrl + Shift + Delete`
2. Hard refresh: `Ctrl + Shift + R`
3. Check browser console for errors: `F12` → Console tab
4. Verify backend is running: http://localhost:5000/health

### Issue: Login Not Working

**Checklist:**
- ✓ Backend is running (`npm run dev`)
- ✓ MongoDB is connected
- ✓ You used correct email and password
- ✓ Email is registered (check MongoDB)
- ✓ Clear browser cookies (`Ctrl + Shift + Delete`)

---

## 📈 What Happens Behind the Scenes

### When you Register:
```
1. Form validates locally
2. Sends POST to /api/auth/register
3. Backend validates again
4. Password hashed with bcryptjs
5. User saved to MongoDB
6. JWT token created (7 day expiry)
7. Token stored in localStorage
8. Success alert shows
9. Auto-redirects to login
```

### When you Login:
```
1. Form validates locally
2. Sends POST to /api/auth/login
3. Backend looks up user in MongoDB
4. Compares password using bcryptjs
5. Creates JWT token
6. Token stored in localStorage
7. Determines your role (student/instructor/super_admin)
8. Redirects to appropriate dashboard
9. Dashboard verifies token + role
10. Shows authenticated content
```

### When you Access Dashboard:
```
1. Page checks localStorage for token
2. If no token → Redirect to login
3. If token exists → Verify it's valid
4. Fetch user data from token
5. Check if role matches dashboard
6. If mismatch → Redirect to login
7. If match → Display dashboard
8. Setup logout button
```

---

## 🌐 API Endpoints Reference

Quick reference for all API endpoints:

### Register
```
POST http://localhost:5000/api/auth/register
Body: { name, email, password, role }
Response: { success, token, user }
```

### Login
```
POST http://localhost:5000/api/auth/login
Body: { email, password }
Response: { success, token, user }
```

### Get Current User
```
GET http://localhost:5000/api/auth/me
Headers: Authorization: Bearer <token>
Response: { success, user }
```

### Logout
```
POST http://localhost:5000/api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success, message }
```

---

## 📁 Important Files

### Backend
- `backend/server.js` - Main server file
- `backend/.env` - Environment variables
- `backend/models/User.js` - Database schema
- `backend/controllers/authController.js` - Auth logic
- `backend/routes/auth.js` - API routes

### Frontend
- `frontend/src/App.jsx` - Main app component
- `frontend/.env` - Frontend config
- `frontend/src/services/api.js` - API client
- `frontend/src/pages/auth/Register.jsx` - registration
- `frontend/src/pages/auth/Login.jsx` - Login page
- `frontend/src/pages/dashboards/` - Dashboard pages

---

## 💡 Pro Tips

1. **Use Postman for API Testing**
   - Download: https://www.postman.com/downloads/
   - Import API endpoints and test manually

2. **Monitor MongoDB in Real-time**
   - Use MongoDB Compass
   - Watch data being inserted as you register

3. **Debug Frontend Issues**
   - Press F12 to open DevTools
   - Check Console tab for errors
   - Check Network tab to see API calls

4. **Debug Backend Issues**
   - Check terminal where `npm run dev` runs
   - Look for error messages
   - Add `console.log()` in controllers for debugging

5. **Keep Secrets Secure**
   - Never commit .env to git
   - Use strong JWT_SECRET
   - Change SUPER_ADMIN_PASSWORD in production

---

## 🎯 Next Steps After Setup

1. **Create a few test accounts** with different roles
2. **Explore each dashboard** with different user types
3. **Try the dark/light mode toggle**
4. **Resize window** to test responsiveness
5. **Open DevTools (F12)** to see Network requests

Then you're ready for the next phase:
- Course management
- Student progress tracking
- AI chatbot integration
- Discussion forums

---

## 📞 Still Having Issues?

1. **Check the logs** - Read error messages carefully
2. **Check the answers** - Is MongoDB actually running?
3. **Restart everything** - Sometimes helps
4. **Clear everything** - Delete node_modules and reinstall
5. **Read SETUP_GUIDE.md** - More detailed instructions

---

## ✨ Congrats! 🎉

You now have a working:
- ✅ React frontend with beautiful UI
- ✅ Express backend with JWT auth
- ✅ MongoDB database with user data
- ✅ Role-based access control
- ✅ Full registration and login system

**Ready to build awesome features!** 🚀

---

**Happy Coding!** 👨‍💻👩‍💻
