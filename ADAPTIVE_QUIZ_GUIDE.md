# Adaptive Quiz System Implementation

## Overview

The Adaptive Quiz System implements a sophisticated 10-question quiz with batch-based difficulty progression. Students take quizzes that adapt to their performance level, ensuring optimal challenge and learning outcomes.

## Key Features

### 1. **Fixed Question Count: 10 Questions**
- Every quiz contains exactly 10 questions
- Questions are selected and ordered based on adaptive logic
- Cannot be customized per quiz instance

### 2. **Question Mixing**
- **Approximate Distribution:**
  - 3 MCQ (Multiple Choice Questions)
  - 3 Fill in the Blanks
  - 2 Drag & Drop
  - 2 Match the Following
- Questions are selected to avoid consecutive duplicate types
- Question selection respects type ratios while maintaining adaptive difficulty

### 3. **Difficulty Levels**
- **Easy**: Foundation level, fundamental concepts
- **Medium**: Intermediate level, requires deeper understanding
- **Hard**: Advanced level, complex problem-solving

### 4. **Batch-Based Adaptive Logic**

#### Progression Rules:
Questions are presented in batches of 4:
- **Batch 1** (Questions 1-4): Always starts at **Easy**
- **After Each Batch**: Score is calculated from the last 4 questions
- **Difficulty Advancement**:
  - ≥75% score → Move to next difficulty level
  - 50-74% score → Stay at current level
  - <50% score → Stay at current level

#### Example Flow:
```
Questions 1-4   → Easy Level
  ↓
Score ≥75%? → Questions 5-8 → Medium Level
  ↓
Score ≥75%? → Questions 9-10 → Hard Level

Score <75%? → Questions 5-8 → Stay Easy/Medium
```

### 5. **Real-Time Features**

#### During Quiz:
- **Progress Bar**: Visual indicator of quiz progression (1/10, 2/10, etc.)
- **Current Difficulty Level**: Displayed with color-coded badge
  - 🟢 Easy (Green)
  - 🟡 Medium (Yellow)
  - 🔴 Hard (Red)
- **Question Type**: Shown for reference (MCQ, Fill in Blanks, etc.)
- **Batch Indicator**: Shows current position in batch (e.g., "Batch 1 • Question 2 of 4")

#### After Quiz Completion:
- **Final Score**: Out of 10 and percentage
- **Highest Difficulty Reached**: Shows maximum difficulty level achieved
- **Difficulty Breakdown**: Performance scores for each difficulty level
- **Performance Feedback**: Encouraging message based on score
- **Weak Areas**: Topics/difficulty levels where improvement is needed
- **Strong Areas**: Topics/difficulty levels where performance is strong

## Technical Implementation

### Frontend Components

#### AdaptiveQuiz Component (`AdaptiveQuiz.jsx`)

**Features:**
- Manages quiz state and progression
- Implements batch-based difficulty calculation
- Handles answer validation for all question types
- Displays real-time progress and difficulty indicators
- Saves results to backend

**Props:**
```javascript
{
  quiz: {                    // Quiz data with questions
    questions: Array<Question>,
    title: String
  },
  topic: Object,            // Topic information
  course: Object,           // Course information
  courseId: String,         // Course ID for saving results
  topicId: String,          // Topic ID for saving results
  onComplete: Function,     // Callback on quiz completion
  onQuit: Function         // Callback on quiz quit
}
```

**Key Functions:**
- `selectQuestionsAdaptively()`: Selects 10 questions balancing difficulty and type
- `calculateBatchScore()`: Calculates score for a batch of 4 questions
- `getNextDifficulty()`: Determines next difficulty based on batch score
- `handleAnswerChange()`: Processes and validates student answers
- `handleNext()`: Progresses to next question and updates difficulty

#### StudentTopicQuiz Component (Updated)

**Changes:**
- Added `useAdaptiveMode` state to toggle between adaptive and traditional quiz
- Button to start "10-Question Adaptive Quiz"
- Passes `courseId` to AdaptiveQuiz component
- Integrates with existing quiz infrastructure

**Usage:**
```jsx
<button className="primary-btn-clean" onClick={() => setUseAdaptiveMode(true)}>
  Try 10-Question Adaptive Quiz
</button>
```

### Backend Integration

#### New Endpoint: `POST /api/student/courses/:courseId/quiz-results`

**Request Body:**
```javascript
{
  topicId: ObjectId,
  quizTitle: String,
  score: Number,                    // 0-100 percentage
  scoreOutOfTen: Number,            // 0-10 scale
  correctCount: Number,
  totalQuestions: Number,           // Usually 10
  highestDifficultyReached: String, // 'easy', 'medium', 'hard'
  batchScores: Array<Number>        // Scores for each batch
}
```

**Response:**
- Saves quiz result to Enrollment.quizResults
- Awards XP based on performance (10-50 based on score)
- Updates streak days if score ≥60%
- Returns updated enrollment

#### Enrollment Model Extension

**New Field: `quizResults`**
```javascript
quizResults: [{
  topicId: ObjectId,
  quizTitle: String,
  score: Number,                    // Percentage
  scoreOutOfTen: Number,
  correctCount: Number,
  totalQuestions: Number,
  highestDifficultyReached: String,
  batchScores: Array<Number>,
  completedAt: Date
}]
```

### API Service

**New Method: `studentAPI.saveQuizResult()`**
```javascript
saveQuizResult: (courseId, data) => 
  apiClient.post(`/student/courses/${courseId}/quiz-results`, data)
```

## Question Requirements for Instructors

### Admin/Instructor Side

When creating questions, instructors must specify:

1. **Question Type** (Required)
   - MCQ: Multiple Choice Question
   - Fill in the Blanks
   - Drag & Drop
   - Match the Following

2. **Difficulty Level** (Required)
   - Easy
   - Medium
   - Hard

3. **Question Content**
   - Prompt/Question text
   - Options/Answers
   - Correct answer(s)
   - Metadata (if applicable)

4. **Points** (Optional)
   - Default: 10 points per question

### Data Storage

Questions are stored with proper tagging:
```javascript
{
  prompt: String,
  type: String,         // 'mcq', 'fill_blank', 'match', 'drag_drop'
  difficulty: String,   // 'easy', 'medium', 'hard'
  points: Number,
  options: Array<String>,
  answer: String,
  metadata: Object,
  // ... other fields
}
```

## Question Type Specifications

### 1. MCQ (Multiple Choice Question)
- **Fields**: prompt, options[], answer
- **Validation**: Answer must match one of the options (case-insensitive by default)

### 2. Fill in the Blanks
- **Fields**: prompt/fillText, blanks[]
- **Validation**: Multiple answers can be separated by '|'
- **Metadata**: wordBankEnabled, caseSensitive, blanks

### 3. Match the Following
- **Fields**: prompt, leftItems[], rightItems[], pairs[]
- **Validation**: All pairs must be correctly matched
- **Metadata**: pairs with leftId and rightId

### 4. Drag & Drop
- **Fields**: prompt, dragItems[], answer
- **Validation**: Order must match expected sequence (separated by |)
- **Metadata**: items, dropZones

## Answer Validation

### MCQ
```javascript
studentAnswer === correctAnswer  // Case-insensitive
```

### Fill in the Blanks
```javascript
// Each blank can have multiple acceptable answers
studentAnswer (normalized) ∈ correctAnswers array
```

### Match the Following
```javascript
// All pairs must be correctly matched
JSON.stringify(studentPairs) === JSON.stringify(expectedPairs)
```

### Drag & Drop
```javascript
// Order must match exactly
dragOrder.join('|') === expectedOrder.join('|')
```

## Performance Metrics

### Student Performance Data

After completing adaptive quiz, saved data includes:

1. **Overall Performance**
   - Final score (0-100%)
   - Score out of 10
   - Correct count out of 10

2. **Difficulty Progression**
   - Highest difficulty reached
   - Batch scores for each difficulty level

3. **Gamification Rewards**
   - XP awarded: 10 + (score% × 40)
   - Streak bonus if score ≥60%
   - Recorded timestamp

### Analytics Available

- Quiz results per topic
- Difficulty level mastery progression
- Historical performance trends
- Weak and strong area identification
- Learning progress tracking

## User Experience Flow

### Student Taking Adaptive Quiz

1. **Selection**: Student clicks "Try 10-Question Adaptive Quiz" in learning panel
2. **Quiz Start**: Adaptive quiz interface loads
3. **First Batch**: 4 Easy questions presented
4. **Progress Tracking**: Student sees "Question 1 of 10" and difficulty badge
5. **Batch Completion**: After 4 questions:
   - Button changes to "Next Adaptive Question"
   - Difficulty may change based on score
6. **Final Batch**: Questions 9-10 presented at adaptive difficulty
7. **Results**: Quiz complete screen shows:
   - Final score and feedback
   - Highest difficulty reached
   - Performance breakdown by difficulty
   - Weak and strong areas
   - Options to retake or continue learning

### Adaptive Difficulty Example

```
Student completes Questions 1-4 (Easy): 3/4 correct = 75%
→ Qualifies for Medium difficulty
→ Questions 5-8 shift to Medium

Student completes Questions 5-8 (Medium): 2/4 correct = 50%
→ Below 75% threshold
→ Questions 9-10 stay at Medium

Final Result:
- Score: 5/10 = 50%
- Highest reached: Medium ✓
- Weak areas: Medium difficulty questions
- Strong areas: Easy difficulty questions
```

## CSS Classes

### Main Container
- `.adaptive-quiz-container`: Main quiz wrapper
- `.quiz-header`: Quiz title and metadata
- `.quiz-progress-bar`: Progress bar container
- `.question-card`: Individual question wrapper

### Difficulty Indicators
- `.difficulty-badge`: Color-coded difficulty display
- `.progress-text`: Progress indicator text

### Results Screen
- `.quiz-results-container`: Results wrapper
- `.results-card`: Main results card
- `.score-display`: Score display section
- `.results-grid`: Results metrics grid
- `.result-item`: Individual result metric
- `.analysis-section`: Weak/strong areas section

## Configuration

### Adaptive Thresholds
- **Maximum Questions**: 10 (fixed)
- **Batch Size**: 4 questions
- **Difficulty Threshold**: ≥75% to advance
- **Starting Difficulty**: Easy
- **Question Types**: MCQ, Fill Blank, Drag Drop, Match

### XP Rewards
- **Base**: 10 XP
- **Performance Bonus**: (Score × 0.4) XP
- **Streak Bonus**: +1 day if score ≥60%

### Performance Feedback
- **≥90%**: Outstanding! 🌟
- **≥75%**: Very good! ⭐
- **≥60%**: Good effort! 👍
- **<60%**: Keep learning! 💪

## Troubleshooting

### Quiz Not Showing
- Ensure at least 10 questions exist in the topic
- Check that questions have difficulty and type assigned
- Verify all questions have valid answers

### Incorrect Difficulty Progression
- Check batch score calculation logic
- Verify difficulty threshold (75%) is being applied
- Review question difficulty assignments

### Results Not Saving
- Ensure courseId and topicId are passed correctly
- Check backend endpoint is configured in routes
- Verify studentAPI.saveQuizResult is called

## Future Enhancements

1. **Customizable Parameters**
   - Allow instructors to set question count per quiz
   - Configurable batch size
   - Custom difficulty thresholds

2. **Advanced Analytics**
   - Time-based performance tracking
   - Question-level mastery analysis
   - Predictive difficulty recommendations

3. **Adaptive Content Suggestions**
   - Recommend review topics based on weak areas
   - Suggest follow-up quizzes
   - AI-powered learning path generation

4. **Question Banking**
   - Weighted question selection
   - Taxonomy-based organization
   - Question difficulty validation

## References

- **AdaptiveQuiz.jsx**: `/frontend/src/components/student/AdaptiveQuiz.jsx`
- **StudentTopicQuiz.jsx**: `/frontend/src/components/student/StudentTopicQuiz.jsx`
- **StudentController**: `/backend/controllers/studentController.js` (saveQuizResult)
- **Enrollment Model**: `/backend/models/Enrollment.js`
- **Student API**: `/frontend/src/services/api.js`
