# Adaptive Quiz - Quick Reference Guide

## 🚀 Quick Start for Testing

### 1. Start the Backend
```bash
cd backend
npm run dev
```
Server will run on `http://localhost:5000`

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### 3. Access Student Quiz
1. Login as student
2. Navigate to Dashboard → Browse Courses
3. Enroll in a course
4. Enter Learning panel
5. Click "Try 10-Question Adaptive Quiz" button

## 📝 Creating Quiz with Proper Difficulty

### Step 1: Instructor Creates Course
```
Course Name: "Introduction to Programming"
Description: "Learn basics of programming"
```

### Step 2: Add Topics
```
Topic 1: "Variables and Data Types"
Topic 2: "Control Flow"
```

### Step 3: Create Quiz
1. Click "Create Quiz"
2. Select Course and Topic
3. Enter Quiz Title: "Variables Quiz"
4. **Add Questions with Difficulty:**

### Example Questions:

**Question 1 (Easy - MCQ)**
- Type: MCQ
- Difficulty: Easy ← **Important**
- Prompt: "What is a variable?"
- Options: 
  - A container for storing data
  - A type of function
  - A loop structure
  - (Mark correct one)

**Question 2 (Easy - Fill in Blanks)**
- Type: Fill in the Blanks ← **Important**
- Difficulty: Easy ← **Important**
- Prompt: "A variable is a ___ for storing values"
- Correct Answer: "container|box"

**Question 3 (Medium - MCQ)**
- Type: MCQ
- Difficulty: Medium ← **Important**
- Prompt: "Which is valid variable naming?"
- Options: Various naming conventions

**Question 4 (Medium - Match)**
- Type: Match the Following
- Difficulty: Medium ← **Important**
- Left Items: [int, string, boolean]
- Right Items: [text, true/false, numbers]

**Question 5 (Hard - Drag & Drop)**
- Type: Drag & Drop
- Difficulty: Hard ← **Important**
- Prompt: "Order the data types by size"
- Items: [byte, int, long]

## 🔍 Key Code Locations

### Frontend Components

#### AdaptiveQuiz Component
**File**: `frontend/src/components/student/AdaptiveQuiz.jsx`

**Main Functions**:
```javascript
// Select 10 questions adaptively
selectQuestionsAdaptively(allQuestions)

// Calculate score for batch of 4 questions
calculateBatchScore(batch, answers)

// Determine next difficulty
getNextDifficulty(currentDifficulty, batchScore)

// Handle answer validation
handleAnswerChange(questionId, answer)

// Progress to next question
handleNext()
```

#### StudentTopicQuiz Component
**File**: `frontend/src/components/student/StudentTopicQuiz.jsx`

**Usage**:
```jsx
<AdaptiveQuiz
  quiz={{ questions: allQuestionsForAdaptive, title: `${topic.title} - Adaptive Quiz` }}
  topic={topic}
  courseId={courseId}
  topicId={topic._id}
  onComplete={(performanceData) => {
    // Handle quiz completion
  }}
  onQuit={() => setUseAdaptiveMode(false)}
/>
```

### Backend APIs

#### Save Quiz Result
**Endpoint**: `POST /api/student/courses/:courseId/quiz-results`

**Request Body**:
```javascript
{
  topicId: "507f1f77bcf86cd799439011",
  quizTitle: "Adaptive Quiz",
  score: 70,
  scoreOutOfTen: 7,
  correctCount: 7,
  totalQuestions: 10,
  highestDifficultyReached: "medium",
  batchScores: [75, 60]
}
```

**Response**:
```javascript
{
  success: true,
  message: "Quiz result saved successfully",
  enrollment: {
    // Updated enrollment with quiz result added
    quizResults: [{
      topicId: "...",
      quizTitle: "Adaptive Quiz",
      score: 70,
      scoreOutOfTen: 7,
      // ... other fields
      completedAt: "2026-04-01T..."
    }]
  }
}
```

**Backend Code** (`backend/controllers/studentController.js`):
```javascript
exports.saveQuizResult = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      topicId,
      quizTitle,
      score,
      scoreOutOfTen,
      correctCount,
      totalQuestions,
      highestDifficultyReached,
      batchScores,
    } = req.body;

    // Validate inputs
    const enrollment = await Enrollment.findOne({ 
      student: req.userId, 
      course: courseId 
    });

    // Add quiz result
    enrollment.quizResults.push({
      topicId,
      quizTitle,
      score: Math.round(score),
      scoreOutOfTen,
      correctCount,
      totalQuestions,
      highestDifficultyReached: highestDifficultyReached || 'easy',
      batchScores,
      completedAt: new Date(),
    });

    // Award XP
    const performanceBonus = Math.round((score / 100) * 50);
    enrollment.xp += Math.max(10, performanceBonus);

    // Update streak
    if (score >= 60) {
      enrollment.streakDays = Math.max(1, enrollment.streakDays + 1);
    }

    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'Quiz result saved successfully',
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save quiz result',
    });
  }
};
```

## 🧮 Adaptive Logic Deep Dive

### Question Selection Algorithm
```javascript
// 1. Organize questions by difficulty
const byDifficulty = {
  easy: [...],
  medium: [...],
  hard: [...]
};

// 2. Select 10 questions maintaining type variety
while (selected.length < 10) {
  // Prefer different type from last question
  const candidates = availableQuestions.filter(
    q => q.type !== lastTypeUsed
  );
  
  // If no different type available, use any
  const question = candidates.length > 0 
    ? candidates[0] 
    : availableQuestions[0];
  
  selected.push(question);
  lastTypeUsed = question.type;
}
```

### Difficulty Progression
```javascript
// At end of each batch (4, 8 questions)
const batchScore = calculateBatchScore(batch, answers);

if (batchScore >= 75) {
  // Upgrade difficulty
  if (currentDifficulty === 'easy') 
    currentDifficulty = 'medium';
  else if (currentDifficulty === 'medium') 
    currentDifficulty = 'hard';
}
// Otherwise stay same or fallback to same level
```

### Score Calculation
```javascript
// Each question is binary correct/incorrect
let correctCount = 0;
questions.forEach(q => {
  if (answers[q._id].isCorrect) {
    correctCount++;
  }
});

const percentageScore = (correctCount / 10) * 100;
const scoreOutOfTen = (correctCount / 10) * 10;
```

## 🎨 UI Components Reference

### Difficulty Badge
```jsx
<span className="difficulty-badge" style={{ backgroundColor: DIFFICULTY_LEVELS[currentDifficulty].color }}>
  {DIFFICULTY_LEVELS[currentDifficulty].emoji} {DIFFICULTY_LEVELS[currentDifficulty].label}
</span>
```

### Progress Indicator
```jsx
<span className="progress-text">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
```

### Batch Indicator
```jsx
<span className="batch-info">
  Batch {Math.floor(currentQuestionIndex / 4) + 1} • 
  Question {(currentQuestionIndex % 4) + 1} of 4
</span>
```

### Question Type Badge
```jsx
<span className="type-badge">{currentQuestion.type.replace('_', ' ').toUpperCase()}</span>
```

## 📊 Performance Formula

### XP Calculation:
```
XP = max(10, 10 + (score% × 40))

Examples:
- 50% score = 10 + (50 × 0.4) = 10 + 20 = 30 XP
- 75% score = 10 + (75 × 0.4) = 10 + 30 = 40 XP
- 100% score = 10 + (100 × 0.4) = 10 + 40 = 50 XP
```

### Streak Bonus:
```
If score >= 60%:
  streakDays = streakDays + 1
```

## 🔐 Data Validation

### Question Type Validation
```javascript
const VALID_TYPES = ['mcq', 'fill_blank', 'match', 'drag_drop'];

if (!VALID_TYPES.includes(question.type)) {
  // Invalid question type
}
```

### Difficulty Level Validation
```javascript
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

if (!VALID_DIFFICULTIES.includes(question.difficulty)) {
  // Invalid difficulty
}
```

### Answer Validation by Type
```javascript
// MCQ
if (questionType === 'mcq') {
  isCorrect = studentAnswer === correctAnswer;
}

// Fill in Blanks
if (questionType === 'fill_blank') {
  isCorrect = correctAnswersArray.includes(studentAnswer);
}

// Match
if (questionType === 'match') {
  isCorrect = matchAllPairs(studentPairs, correctPairs);
}

// Drag & Drop
if (questionType === 'drag_drop') {
  isCorrect = dragOrder.join('|') === correctOrder.join('|');
}
```

## 🐛 Common Issues & Fixes

### Issue: Quiz button not appearing
```javascript
// Check: Does topic have 10+ questions?
const hasEnoughQuestions = allQuestionsForAdaptive.length >= 10;

// Fix: Ensure all questions have difficulty assigned
questions.forEach(q => {
  if (!q.difficulty) q.difficulty = 'easy'; // Default to easy
});
```

### Issue: Difficulty not progressing
```javascript
// Check: Is batchScore calculation correct?
const batchScore = calculateBatchScore(batchQuestions, answers);
console.log('Batch score:', batchScore);

// Fix: Ensure isCorrect flag is set on answers
answers[questionId] = { 
  answer: value, 
  isCorrect: true/false  // Must be set!
};
```

### Issue: Results not saving
```javascript
// Check: courseId and topicId passed?
console.log('CourseId:', courseId, 'TopicId:', topicId);

// Fix: Ensure AdaptiveQuiz receives both props
<AdaptiveQuiz
  quiz={quiz}
  topic={topic}
  courseId={courseId}        // ← Required
  topicId={topicId}         // ← Required
  onComplete={...}
  onQuit={...}
/>
```

## 📱 Mobile Responsiveness

The quiz adapts to all screen sizes:
- **Mobile** (<768px): Single column, touch-optimized buttons
- **Tablet** (768-1024px): Medium spacing, readable fonts
- **Desktop** (>1024px): Full layout with side panels

## 🎯 Testing Checklist

```
□ First 4 questions are Easy
□ Difficulty badge shows correct color
□ Progress bar updates to 40% after Q4
□ Score ≥75% on first batch → next difficulty is Medium
□ Questions 5-8 at new difficulty
□ Progress bar reaches 80% after Q8
□ All 10 questions displayed
□ Results screen shows correct score
□ Highest difficulty accurately recorded
□ Performance breakdown displays correctly
□ Results saved to database
□ XP awarded properly
□ Retake button resets quiz
□ Continue button closes quiz
```

## 🔗 API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/student/dashboard` | GET | Get all student data |
| `/student/courses/:courseId` | GET | Get course details |
| `/student/courses/:courseId/enroll` | POST | Enroll in course |
| `/student/courses/:courseId/progress` | PATCH | Update topic completion |
| `/student/courses/:courseId/quiz-results` | POST | Save quiz result |

---

**Last Updated**: April 1, 2026
**Version**: 1.0 - Complete Implementation
