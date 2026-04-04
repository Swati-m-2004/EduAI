import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowDown, FiArrowUp, FiCheckCircle, FiChevronRight, FiTarget, FiTrendingUp, FiZap } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { studentAPI } from '../../services/api';
import './AdaptiveQuiz.css';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

const DIFFICULTY_LEVELS = {
  easy: { label: 'Easy', color: '#10b981', emoji: 'E' },
  medium: { label: 'Medium', color: '#f59e0b', emoji: 'M' },
  hard: { label: 'Hard', color: '#ef4444', emoji: 'H' },
};

const normalizeValue = (value, caseSensitive = false) => {
  const text = String(value || '').trim();
  return caseSensitive ? text : text.toLowerCase();
};

const shuffleArray = (array = []) => {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFillBlankPreview = (question) => {
  const text = question?.metadata?.fillText || question?.prompt || '';
  const blanks = Array.isArray(question?.metadata?.blanks) ? question.metadata.blanks : [];

  if (blanks.length) {
    return blanks.reduce((preview, blank, index) => {
      if (!blank?.label) return preview;
      return preview.replace(blank.label, `_____ ${index + 1}`);
    }, text);
  }

  const answers = String(question?.answer || '')
    .split('|')
    .map((item) => item.split(',')[0])
    .map((item) => item.trim())
    .filter(Boolean);

  return answers.reduce((preview, answer, index) => {
    if (!answer) return preview;
    return preview.replace(new RegExp(escapeRegExp(answer), 'i'), `_____ ${index + 1}`);
  }, text);
};

const getBlankAnswerSets = (question) => {
  const caseSensitive = question?.metadata?.caseSensitive === true;
  const metadataBlanks = Array.isArray(question?.metadata?.blanks) ? question.metadata.blanks : [];

  if (metadataBlanks.length) {
    return metadataBlanks.map((blank, index) => ({
      id: blank.id || `blank-${index}`,
      answers: String(blank.answersText || '')
        .split(',')
        .map((item) => normalizeValue(item, caseSensitive))
        .filter(Boolean),
    }));
  }

  return String(question?.answer || '')
    .split('|')
    .map((item, index) => ({
      id: `blank-${index}`,
      answers: String(item || '')
        .split(',')
        .map((entry) => normalizeValue(entry, caseSensitive))
        .filter(Boolean),
    }))
    .filter((blank) => blank.answers.length);
};

const getMatchParts = (question) => ({
  leftItems: question?.metadata?.matchLeft || question?.metadata?.leftItems || [],
  rightItems: question?.metadata?.matchRight || question?.metadata?.rightItems || [],
  pairs: question?.metadata?.pairs || [],
});

const getDragItems = (question) => question?.metadata?.dragItems || question?.metadata?.items || [];

const getQuestionId = (question, index) => String(question?._id || `${question?.quizId || 'quiz'}-${index}`);

const getInitialQueues = (questions) => {
  const buckets = { easy: [], medium: [], hard: [] };

  questions.forEach((question, index) => {
    const difficulty = DIFFICULTY_ORDER.includes(question.difficulty) ? question.difficulty : 'easy';
    buckets[difficulty].push(getQuestionId(question, index));
  });

  return {
    easy: shuffleArray(buckets.easy),
    medium: shuffleArray(buckets.medium),
    hard: shuffleArray(buckets.hard),
  };
};

const getFirstAvailableDifficulty = (queues) =>
  DIFFICULTY_ORDER.find((difficulty) => queues[difficulty]?.length) || 'easy';

const getNextAvailableDifficulty = (queues, currentDifficulty) => {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);

  for (let index = currentIndex + 1; index < DIFFICULTY_ORDER.length; index += 1) {
    const difficulty = DIFFICULTY_ORDER[index];
    if (queues[difficulty]?.length) {
      return difficulty;
    }
  }

  return null;
};

const createEmptyLevelStats = () => ({
  easy: { attempts: 0, correct: 0, mastered: 0 },
  medium: { attempts: 0, correct: 0, mastered: 0 },
  hard: { attempts: 0, correct: 0, mastered: 0 },
});

const calculatePercentage = (correct, attempts) => (
  attempts ? Math.round((correct / attempts) * 100) : 0
);

function QuizResults({ performanceData, courseId, topicId, onQuit }) {
  const { score, scoreOutOfTen, correctCount, totalQuestions, highestDifficulty, easyScore, mediumScore, hardScore, batchScores } = performanceData;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const saveResults = async () => {
      if (!courseId || !topicId) return;

      setIsSaving(true);
      try {
        await studentAPI.saveQuizResult(courseId, {
          topicId,
          quizTitle: 'Adaptive Quiz',
          score,
          scoreOutOfTen,
          correctCount,
          totalQuestions,
          highestDifficultyReached: highestDifficulty,
          batchScores: Array.isArray(batchScores) ? batchScores : [],
        });
      } catch (error) {
        if (active) {
          Swal.fire({
            title: 'Could not save adaptive result',
            text: error.response?.data?.message || 'Your score could not be stored right now.',
            icon: 'warning',
            confirmButtonColor: '#14b8a6',
          });
        }
      } finally {
        if (active) {
          setIsSaving(false);
        }
      }
    };

    saveResults();

    return () => {
      active = false;
    };
  }, [batchScores, correctCount, courseId, highestDifficulty, score, scoreOutOfTen, topicId, totalQuestions]);

  const getPerformanceFeedback = (percentage) => {
    if (percentage >= 90) return { message: 'Outstanding work. You mastered this adaptive round very confidently.', color: '#10b981' };
    if (percentage >= 75) return { message: 'Great job. You moved through the levels with solid control.', color: '#3b82f6' };
    if (percentage >= 60) return { message: 'Good effort. You are progressing well, with some room to refine.', color: '#f59e0b' };
    return { message: 'Keep practicing. The quiz stayed with your level so you can strengthen the basics first.', color: '#ef4444' };
  };

  const feedback = getPerformanceFeedback(score);
  const weakAreas = [];
  const strongAreas = [];

  if (easyScore < 70) weakAreas.push('Easy level accuracy');
  if (mediumScore > 0 && mediumScore < 70) weakAreas.push('Medium level accuracy');
  if (hardScore > 0 && hardScore < 70) weakAreas.push('Hard level accuracy');
  if (easyScore >= 80) strongAreas.push('Easy level mastery');
  if (mediumScore >= 80) strongAreas.push('Medium level mastery');
  if (hardScore >= 80) strongAreas.push('Hard level mastery');

  return (
    <motion.div
      className="quiz-results-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="results-card">
        <div className="results-header">
          <FiCheckCircle size={48} color={feedback.color} />
          <h2>Adaptive Quiz Complete</h2>
          <p className="results-message" style={{ color: feedback.color }}>
            {feedback.message}
          </p>
          {isSaving ? <p className="hint">Saving your result...</p> : null}
        </div>

        <div className="score-display">
          <div className="score-main">
            <div className="score-number">{scoreOutOfTen}</div>
            <div className="score-label">out of 10</div>
          </div>
          <div className="score-percentage">
            <div className="percentage-ring">
              <div className="percentage-text">{score}%</div>
            </div>
          </div>
        </div>

        <div className="results-grid">
          <div className="result-item">
            <FiTarget size={20} />
            <strong>Correct Attempts</strong>
            <p>{correctCount} of {totalQuestions}</p>
          </div>
          <div className="result-item">
            <FiTrendingUp size={20} />
            <strong>Highest Level Reached</strong>
            <p className="difficulty-reach" style={{ color: DIFFICULTY_LEVELS[highestDifficulty].color }}>
              {DIFFICULTY_LEVELS[highestDifficulty].label}
            </p>
          </div>
          <div className="result-item">
            <FiZap size={20} />
            <strong>Difficulty Breakdown</strong>
            <div className="difficulty-scores">
              <div className="score-row">
                <span>Easy:</span>
                <span className="score-badge" style={{ backgroundColor: '#ecfdf5' }}>{easyScore}%</span>
              </div>
              <div className="score-row">
                <span>Medium:</span>
                <span className="score-badge" style={{ backgroundColor: '#fffbeb' }}>{mediumScore}%</span>
              </div>
              <div className="score-row">
                <span>Hard:</span>
                <span className="score-badge" style={{ backgroundColor: '#fef2f2' }}>{hardScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {(strongAreas.length > 0 || weakAreas.length > 0) ? (
          <div className="analysis-section">
            {weakAreas.length > 0 ? (
              <div className="weak-areas">
                <strong>Areas to Improve:</strong>
                <ul>
                  {weakAreas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {strongAreas.length > 0 ? (
              <div className="strong-areas">
                <strong>Your Strengths:</strong>
                <ul>
                  {strongAreas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="results-actions">
          <button className="primary-btn-clean" onClick={onQuit}>
            Retake Quiz
          </button>
          <button className="ghost-btn" onClick={onQuit}>
            Continue Learning
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdaptiveQuiz({ quiz, topic, course, courseId, topicId, onComplete, onQuit }) {
  const questions = useMemo(
    () => (quiz?.questions || []).map((question, index) => ({
      ...question,
      _adaptiveId: getQuestionId(question, index),
      difficulty: DIFFICULTY_ORDER.includes(question.difficulty) ? question.difficulty : 'easy',
      type: question.type || 'mcq',
    })),
    [quiz]
  );

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question._adaptiveId, question])),
    [questions]
  );

  const totalUniqueQuestions = questions.length;
  const [queueByDifficulty, setQueueByDifficulty] = useState(() => getInitialQueues(questions));
  const [currentDifficulty, setCurrentDifficulty] = useState(() => getFirstAvailableDifficulty(getInitialQueues(questions)));
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [answers, setAnswers] = useState({});
  const [fillAnswers, setFillAnswers] = useState({});
  const [matchAnswers, setMatchAnswers] = useState({});
  const [dragOrder, setDragOrder] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [stepCount, setStepCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredIds, setMasteredIds] = useState([]);
  const [highestDifficulty, setHighestDifficulty] = useState('easy');
  const [levelStats, setLevelStats] = useState(createEmptyLevelStats());
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [batchScores, setBatchScores] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    const initialQueues = getInitialQueues(questions);
    const initialDifficulty = getFirstAvailableDifficulty(initialQueues);

    setQueueByDifficulty(initialQueues);
    setCurrentDifficulty(initialDifficulty);
    setCurrentQuestionId(initialQueues[initialDifficulty]?.[0] || '');
    setAnswers({});
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder([]);
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
    setStepCount(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setMasteredIds([]);
    setHighestDifficulty(initialDifficulty);
    setLevelStats(createEmptyLevelStats());
    setAttemptHistory([]);
    setBatchScores([]);
    setPerformanceData(null);
  }, [questions]);

  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) || null : null;
  const activeBlankSets = useMemo(
    () => (currentQuestion?.type === 'fill_blank' ? getBlankAnswerSets(currentQuestion) : []),
    [currentQuestion]
  );
  const activeMatchParts = useMemo(
    () => (currentQuestion?.type === 'match' ? getMatchParts(currentQuestion) : { leftItems: [], rightItems: [], pairs: [] }),
    [currentQuestion]
  );
  const activeDragItems = useMemo(
    () => (currentQuestion?.type === 'drag_drop' ? getDragItems(currentQuestion) : []),
    [currentQuestion]
  );

  useEffect(() => {
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder(shuffleArray(activeDragItems));
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
  }, [currentQuestionId, currentQuestion?._adaptiveId, activeDragItems]);

  const finishQuiz = (nextCorrectCount, nextAttemptCount, nextLevelStats, nextBatchScores, nextHighestDifficulty) => {
    const score = calculatePercentage(nextCorrectCount, nextAttemptCount);
    const scoreOutOfTen = Number(((score / 100) * 10).toFixed(1));
    const data = {
      score,
      scoreOutOfTen,
      correctCount: nextCorrectCount,
      totalQuestions: nextAttemptCount,
      highestDifficulty: nextHighestDifficulty,
      batchScores: nextBatchScores,
      easyScore: calculatePercentage(nextLevelStats.easy.correct, nextLevelStats.easy.attempts),
      mediumScore: calculatePercentage(nextLevelStats.medium.correct, nextLevelStats.medium.attempts),
      hardScore: calculatePercentage(nextLevelStats.hard.correct, nextLevelStats.hard.attempts),
      topic: topic?.title || 'Quiz',
      course: course?.title || 'Course',
      timestamp: new Date().toISOString(),
    };

    setPerformanceData(data);
    onComplete?.(data);
  };

  const evaluateAnswer = () => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'mcq') {
      return normalizeValue(answers[currentQuestion._adaptiveId]?.answer) === normalizeValue(currentQuestion.answer);
    }

    if (currentQuestion.type === 'fill_blank') {
      const caseSensitive = currentQuestion.metadata?.caseSensitive === true;
      return activeBlankSets.length > 0 && activeBlankSets.every((blank) => {
        const submitted = normalizeValue(fillAnswers[blank.id], caseSensitive);
        return submitted && blank.answers.includes(submitted);
      });
    }

    if (currentQuestion.type === 'match') {
      return activeMatchParts.pairs.length > 0
        && activeMatchParts.pairs.every((pair) => matchAnswers[pair.leftId] === pair.rightId);
    }

    if (currentQuestion.type === 'drag_drop') {
      const submittedOrder = dragOrder.map((item) => normalizeValue(item.text));
      const expectedOrder = String(currentQuestion.answer || '')
        .split('|')
        .map((item) => normalizeValue(item))
        .filter(Boolean);

      return submittedOrder.length > 0
        && expectedOrder.length > 0
        && submittedOrder.join('|') === expectedOrder.join('|');
    }

    return false;
  };

  const handleChoiceAnswer = (answer) => {
    if (!currentQuestion || revealed) return;

    setAnswers((current) => ({
      ...current,
      [currentQuestion._adaptiveId]: { answer },
    }));
  };

  const handleSubmit = () => {
    if (!currentQuestion || revealed) return;

    const isCorrect = evaluateAnswer();
    const currentQuestionDifficulty = currentQuestion.difficulty || currentDifficulty;
    const nextAttemptCount = attemptCount + 1;
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const alreadyMastered = masteredIds.includes(currentQuestion._adaptiveId);
    const nextMasteredIds = isCorrect && !alreadyMastered
      ? [...masteredIds, currentQuestion._adaptiveId]
      : masteredIds;

    const nextLevelStats = {
      ...levelStats,
      [currentQuestionDifficulty]: {
        ...levelStats[currentQuestionDifficulty],
        attempts: levelStats[currentQuestionDifficulty].attempts + 1,
        correct: levelStats[currentQuestionDifficulty].correct + (isCorrect ? 1 : 0),
        mastered: levelStats[currentQuestionDifficulty].mastered + (isCorrect && !alreadyMastered ? 1 : 0),
      },
    };

    const nextAttemptHistory = [...attemptHistory, isCorrect];
    const nextBatchScores = [...batchScores];
    if (nextAttemptHistory.length % 4 === 0) {
      const lastBatch = nextAttemptHistory.slice(-4);
      nextBatchScores.push(calculatePercentage(lastBatch.filter(Boolean).length, lastBatch.length));
    }

    setAttemptCount(nextAttemptCount);
    setCorrectCount(nextCorrectCount);
    setMasteredIds(nextMasteredIds);
    setLevelStats(nextLevelStats);
    setAttemptHistory(nextAttemptHistory);
    setBatchScores(nextBatchScores);
    setIsCorrectAnswer(isCorrect);
    setRevealed(true);
    setFeedback(
      isCorrect
        ? 'Correct. Stay sharp, and the quiz will move you forward when this level is mastered.'
        : 'Not quite. You will keep working on this level until the remaining questions are mastered.'
    );

    const updatedQueues = {
      easy: [...queueByDifficulty.easy],
      medium: [...queueByDifficulty.medium],
      hard: [...queueByDifficulty.hard],
    };

    updatedQueues[currentQuestionDifficulty] = updatedQueues[currentQuestionDifficulty]
      .filter((questionId) => questionId !== currentQuestion._adaptiveId);

    if (!isCorrect) {
      updatedQueues[currentQuestionDifficulty].push(currentQuestion._adaptiveId);
    }

    setQueueByDifficulty(updatedQueues);

    const nextDifficulty = updatedQueues[currentQuestionDifficulty].length
      ? currentQuestionDifficulty
      : getNextAvailableDifficulty(updatedQueues, currentQuestionDifficulty);

    const nextHighestDifficulty = nextDifficulty && DIFFICULTY_ORDER.indexOf(nextDifficulty) > DIFFICULTY_ORDER.indexOf(highestDifficulty)
      ? nextDifficulty
      : highestDifficulty;

    setHighestDifficulty(nextHighestDifficulty);

    if (!nextDifficulty) {
      finishQuiz(nextCorrectCount, nextAttemptCount, nextLevelStats, nextBatchScores, nextHighestDifficulty);
    }
  };

  const handleNext = () => {
    if (!revealed || !currentQuestion) return;

    const nextDifficulty = queueByDifficulty[currentDifficulty]?.length
      ? currentDifficulty
      : getNextAvailableDifficulty(queueByDifficulty, currentDifficulty);

    if (!nextDifficulty) return;

    setCurrentDifficulty(nextDifficulty);
    setCurrentQuestionId(queueByDifficulty[nextDifficulty][0] || '');
    setStepCount((current) => current + 1);
  };

  const moveDragItem = (index, direction) => {
    if (revealed) return;

    setDragOrder((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  if (performanceData) {
    return <QuizResults performanceData={performanceData} courseId={courseId} topicId={topicId} onQuit={onQuit} />;
  }

  if (!currentQuestion) {
    return (
      <div className="adaptive-quiz-loading">
        <div className="loading-spinner">Preparing your adaptive quiz...</div>
      </div>
    );
  }

  return (
    <div className="adaptive-quiz-container">
      <motion.div
        className="quiz-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="quiz-header-left">
          <h3>{quiz?.title || 'Adaptive Quiz'}</h3>
          <div className="quiz-meta">
            <span className="difficulty-badge" style={{ backgroundColor: DIFFICULTY_LEVELS[currentDifficulty].color }}>
              {DIFFICULTY_LEVELS[currentDifficulty].emoji} {DIFFICULTY_LEVELS[currentDifficulty].label}
            </span>
            <span className="progress-text">Mastered {masteredIds.length} of {totalUniqueQuestions}</span>
          </div>
        </div>
        <button className="quit-btn" onClick={onQuit}>
          Quit Quiz
        </button>
      </motion.div>

      <div className="quiz-progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${totalUniqueQuestions ? (masteredIds.length / totalUniqueQuestions) * 100 : 0}%` }}
        />
      </div>

      <motion.div
        className="question-card"
        key={currentQuestion._adaptiveId}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h4 className="question-text">
          {currentQuestion.type === 'fill_blank'
            ? buildFillBlankPreview(currentQuestion) || currentQuestion.prompt
            : currentQuestion.prompt}
        </h4>

        <div className="question-content">
          {currentQuestion.type === 'mcq' ? (
            <div className="options-list">
              {(currentQuestion.options || []).map((option, index) => (
                <label key={`${currentQuestion._adaptiveId}-option-${index}`} className="option-label">
                  <input
                    type="radio"
                    name={`question-${currentQuestion._adaptiveId}`}
                    value={option}
                    checked={answers[currentQuestion._adaptiveId]?.answer === option}
                    onChange={(event) => handleChoiceAnswer(event.target.value)}
                  />
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          ) : null}

          {currentQuestion.type === 'fill_blank' ? (
            <div className="practice-fill-card">
              <div className="practice-fill-grid">
                {activeBlankSets.map((blank, index) => (
                  <label key={blank.id} className="practice-fill-field">
                    <span>Blank {index + 1}</span>
                    <input
                      type="text"
                      placeholder={`Enter answer for blank ${index + 1}`}
                      value={fillAnswers[blank.id] || ''}
                      onChange={(event) => !revealed && setFillAnswers((current) => ({
                        ...current,
                        [blank.id]: event.target.value,
                      }))}
                    />
                  </label>
                ))}
              </div>
              {currentQuestion.metadata?.wordBankEnabled && currentQuestion.metadata?.wordBankWords ? (
                <div className="preview-chip-row">
                  {currentQuestion.metadata.wordBankWords
                    .split(',')
                    .map((word) => word.trim())
                    .filter(Boolean)
                    .map((word) => (
                      <div key={word} className="preview-pill">{word}</div>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {currentQuestion.type === 'match' ? (
            <div className="practice-fill-grid">
              {activeMatchParts.leftItems.map((item, index) => (
                <label key={item.id || `${item.text}-${index}`} className="practice-fill-field">
                  <span>{item.text || `Item ${index + 1}`}</span>
                  <select
                    value={matchAnswers[item.id] || ''}
                    onChange={(event) => !revealed && setMatchAnswers((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))}
                  >
                    <option value="">Select matching definition</option>
                    {activeMatchParts.rightItems.map((rightItem) => (
                      <option key={rightItem.id} value={rightItem.id}>
                        {rightItem.text || 'Definition'}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}

          {currentQuestion.type === 'drag_drop' ? (
            <div className="practice-fill-grid">
              {dragOrder.map((item, index) => (
                <div key={item.id || `${item.text}-${index}`} className="practice-drag-row">
                  <span>{item.text || 'Drag item'}</span>
                  <div className="detail-action-row compact">
                    <button className="ghost-btn" onClick={() => moveDragItem(index, -1)} disabled={revealed || index === 0}>
                      <FiArrowUp size={14} />
                    </button>
                    <button className="ghost-btn" onClick={() => moveDragItem(index, 1)} disabled={revealed || index === dragOrder.length - 1}>
                      <FiArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="question-footer">
          <div className="question-stats">
            <span className="batch-info">Attempt {attemptCount + 1} • Level {DIFFICULTY_LEVELS[currentDifficulty].label}</span>
            <span className="type-badge">{String(currentQuestion.type || 'mcq').replace('_', ' ').toUpperCase()}</span>
          </div>
          {!revealed ? (
            <button className="next-btn primary-btn-clean" onClick={handleSubmit}>
              Submit Answer <FiChevronRight />
            </button>
          ) : (
            <button className="next-btn primary-btn-clean" onClick={handleNext}>
              {queueByDifficulty[currentDifficulty]?.length ? 'Next Question' : 'Move to Next Level'} <FiChevronRight />
            </button>
          )}
        </div>

        {feedback ? (
          <div className={`practice-feedback-chip ${isCorrectAnswer === true ? 'success' : ''} ${isCorrectAnswer === false ? 'error' : ''}`}>
            {feedback}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
