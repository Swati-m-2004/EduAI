# EduAI - AI-Powered Gamified Adaptive Learning Platform

This is a full-stack online learning platform with AI-driven adaptive quizzes and gamified learning activities.

## Tech Stack

- **Frontend**: React.js, styled-components, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary
- **AI**: Groq API (llama3-8b-8192 model)
- **Auth**: JWT stored in httpOnly cookies
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: React Icons

## Setup

### Backend
1. Navigate to `backend` directory
2. Copy `.env.example` to `.env` and fill in your credentials
3. Run `npm install`
4. Run `npm run dev` to start the development server

### Frontend
1. Navigate to `frontend` directory
2. Run `npm install`
3. Run `npm run dev` to start the development server

## Features

- AI-adaptive quizzes
- Gamified learning with XP and badges
- Role-based access (Super Admin, Instructor, Student)
- Accessibility features
- Dark/Light mode
- Mobile responsive

## Project Structure

```
edu-ai/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── ...
    └── package.json
```