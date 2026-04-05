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

const getFillBlankChoices = (question) => {
  const wordBank = String(question?.metadata?.wordBankWords || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (wordBank.length) {
    return [...new Set(wordBank)];
  }

  const blanks = Array.isArray(question?.metadata?.blanks) ? question.metadata.blanks : [];
  return [...new Set(
    blanks.flatMap((blank) => String(blank?.answersText || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean))
  )];
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

const getAdaptiveDifficultyFromScore = (percentage = 0) => {
  if (percentage < 50) return 'easy';
  if (percentage <= 80) return 'medium';
  return 'hard';
};

const getNextQuestionId = (questions, usedIds, targetDifficulty) => {
  const remaining = questions.filter((question) => !usedIds.includes(question._adaptiveId));
  if (!remaining.length) return '';

  const exact = remaining.find((question) => question.difficulty === targetDifficulty);
  if (exact) return exact._adaptiveId;

  const fallbackOrder = targetDifficulty === 'hard'
    ? ['medium', 'easy']
    : targetDifficulty === 'medium'
      ? ['easy', 'hard']
      : ['medium', 'hard'];

  for (const difficulty of fallbackOrder) {
    const match = remaining.find((question) => question.difficulty === difficulty);
    if (match) return match._adaptiveId;
  }

  return remaining[0]?._adaptiveId || '';
};

function QuizResults({ performanceData, courseId, topicId, onQuit, onSaved }) {
  const { score, scoreOutOfTen, correctCount, totalQuestions, highestDifficulty, easyScore, mediumScore, hardScore, batchScores, timeTakenSeconds, source } = performanceData;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const saveResults = async () => {
      if (!courseId || !topicId) return;

      setIsSaving(true);
      try {
        await studentAPI.saveQuizResult(courseId, {
          topicId,
          quizTitle: source === 'ai_notes' ? 'AI Adaptive Quiz' : 'Adaptive Quiz',
          score,
          scoreOutOfTen,
          correctCount,
          totalQuestions,
          highestDifficultyReached: highestDifficulty,
          batchScores: Array.isArray(batchScores) ? batchScores : [],
          timeTakenSeconds,
          source,
        });
        onSaved?.(performanceData);
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
  }, [batchScores, correctCount, courseId, highestDifficulty, onSaved, performanceData, score, scoreOutOfTen, source, timeTakenSeconds, topicId, totalQuestions]);

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
    () => (quiz?.questions || []).slice(0, 10).map((question, index) => ({
      ...question,
      _adaptiveId: getQuestionId(question, index),
      difficulty: DIFFICULTY_ORDER.includes(question.difficulty) ? question.difficulty : 'easy',
      type: question.type || 'mcq',
      prompt: question.prompt || `${topic?.title || 'Topic'} question ${index + 1}`,
    })),
    [quiz, topic?.title]
  );

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question._adaptiveId, question])),
    [questions]
  );

  const totalUniqueQuestions = questions.length;
  const [currentDifficulty, setCurrentDifficulty] = useState('easy');
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [usedQuestionIds, setUsedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [fillAnswers, setFillAnswers] = useState({});
  const [matchAnswers, setMatchAnswers] = useState({});
  const [dragOrder, setDragOrder] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [highestDifficulty, setHighestDifficulty] = useState('easy');
  const [levelStats, setLevelStats] = useState(createEmptyLevelStats());
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [batchScores, setBatchScores] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [sessionTimeSeconds, setSessionTimeSeconds] = useState(0);

  useEffect(() => {
    const firstQuestionId = getNextQuestionId(questions, [], 'easy');

    setCurrentDifficulty('easy');
    setCurrentQuestionId(firstQuestionId);
    setUsedQuestionIds(firstQuestionId ? [firstQuestionId] : []);
    setAnswers({});
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder([]);
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
    setAttemptCount(0);
    setCorrectCount(0);
    setHighestDifficulty('easy');
    setLevelStats(createEmptyLevelStats());
    setAttemptHistory([]);
    setBatchScores([]);
    setPerformanceData(null);
    setTimeLeft(20);
    setSessionTimeSeconds(0);
  }, [questions]);

  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) || null : null;
  const activeBlankSets = useMemo(
    () => (currentQuestion?.type === 'fill_blank' ? getBlankAnswerSets(currentQuestion) : []),
    [currentQuestion]
  );
  const fillBlankChoices = useMemo(
    () => (currentQuestion?.type === 'fill_blank' ? getFillBlankChoices(currentQuestion) : []),
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
    setTimeLeft(20);
  }, [currentQuestionId, currentQuestion?._adaptiveId, activeDragItems]);

  useEffect(() => {
    if (!currentQuestion || performanceData || revealed) return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
      setSessionTimeSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentQuestion, performanceData, revealed]);

  useEffect(() => {
    if (timeLeft === 0 && currentQuestion && !revealed && !performanceData) {
      handleSubmit(true);
    }
  }, [timeLeft, currentQuestion, revealed, performanceData]);

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
      timeTakenSeconds: sessionTimeSeconds,
      source: quiz?.source || 'adaptive',
      timestamp: new Date().toISOString(),
    };

    setPerformanceData(data);
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

  const handleSubmit = (forcedTimeout = false) => {
    if (!currentQuestion || revealed) return;

    const isCorrect = evaluateAnswer();
    const currentQuestionDifficulty = currentQuestion.difficulty || currentDifficulty;
    const nextAttemptCount = attemptCount + 1;
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    const nextLevelStats = {
      ...levelStats,
      [currentQuestionDifficulty]: {
        ...levelStats[currentQuestionDifficulty],
        attempts: levelStats[currentQuestionDifficulty].attempts + 1,
        correct: levelStats[currentQuestionDifficulty].correct + (isCorrect ? 1 : 0),
        mastered: levelStats[currentQuestionDifficulty].mastered + (isCorrect ? 1 : 0),
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
    setLevelStats(nextLevelStats);
    setAttemptHistory(nextAttemptHistory);
    setBatchScores(nextBatchScores);
    setIsCorrectAnswer(isCorrect);
    setRevealed(true);
    setFeedback(
      forcedTimeout
        ? 'Time is up. Moving to the next adaptive question.'
        : isCorrect
          ? 'Correct. The next question will adapt from your current score.'
          : 'Not quite. The next question will adjust to your current level.'
    );

    const nextPercentage = calculatePercentage(nextCorrectCount, nextAttemptCount);
    const nextDifficulty = getAdaptiveDifficultyFromScore(nextPercentage);
    const nextHighestDifficulty = DIFFICULTY_ORDER.indexOf(nextDifficulty) > DIFFICULTY_ORDER.indexOf(highestDifficulty)
      ? nextDifficulty
      : highestDifficulty;

    setHighestDifficulty(nextHighestDifficulty);
    setCurrentDifficulty(nextDifficulty);

    if (nextAttemptCount >= totalUniqueQuestions) {
      finishQuiz(nextCorrectCount, nextAttemptCount, nextLevelStats, nextBatchScores, nextHighestDifficulty);
      return;
    }
  };

  const handleNext = () => {
    if (!revealed || !currentQuestion) return;
    const nextQuestionId = getNextQuestionId(questions, usedQuestionIds, currentDifficulty);
    if (!nextQuestionId) {
      finishQuiz(correctCount, attemptCount, levelStats, batchScores, highestDifficulty);
      return;
    }

    setCurrentQuestionId(nextQuestionId);
    setUsedQuestionIds((current) => [...current, nextQuestionId]);
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
    return <QuizResults performanceData={performanceData} courseId={courseId} topicId={topicId} onQuit={onQuit} onSaved={onComplete} />;
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
            <span className="progress-text">Question {attemptCount + 1} of {totalUniqueQuestions}</span>
            <span className="progress-text">Time left: {timeLeft}s</span>
          </div>
        </div>
        <button className="quit-btn" onClick={onQuit}>
          Quit Quiz
        </button>
      </motion.div>

      <div className="quiz-progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${totalUniqueQuestions ? (attemptCount / totalUniqueQuestions) * 100 : 0}%` }}
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
              {(currentQuestion.options || []).map((option, index) => {
                const selectedValue = answers[currentQuestion._adaptiveId]?.answer;
                const isSelected = selectedValue === option;
                const isCorrectOption = normalizeValue(option) === normalizeValue(currentQuestion.answer);
                const isWrongSelection = revealed && isSelected && !isCorrectOption;

                return (
                  <label
                    key={`${currentQuestion._adaptiveId}-option-${index}`}
                    className={`option-label ${revealed && isCorrectOption ? 'correct' : ''} ${isWrongSelection ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion._adaptiveId}`}
                      value={option}
                      checked={isSelected}
                      disabled={revealed}
                      onChange={(event) => handleChoiceAnswer(event.target.value)}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {currentQuestion.type === 'fill_blank' ? (
            <div className="practice-fill-card">
              <div className="practice-fill-grid">
                {activeBlankSets.map((blank, index) => (
                  <label key={blank.id} className="practice-fill-field">
                    <span>Blank {index + 1}</span>
                    <select
                      value={fillAnswers[blank.id] || ''}
                      onChange={(event) => !revealed && setFillAnswers((current) => ({
                        ...current,
                        [blank.id]: event.target.value,
                      }))}
                    >
                      <option value="">Select an answer</option>
                      {fillBlankChoices.map((choice) => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                      {blank.answers
                        .filter((answer) => !fillBlankChoices.includes(answer))
                        .map((answer) => (
                          <option key={answer} value={answer}>
                            {answer}
                          </option>
                        ))}
                    </select>
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
              Next Question <FiChevronRight />
            </button>
          )}
        </div>

        {feedback ? (
          <div className={`practice-feedback-chip ${isCorrectAnswer === true ? 'success' : ''} ${isCorrectAnswer === false ? 'error' : ''}`}>
            {feedback}
          </div>
        ) : null}

        {revealed ? (
          <div className="adaptive-answer-review">
            <strong>Answer Review</strong>
            {currentQuestion.type === 'mcq' ? (
              <p>Correct answer: {currentQuestion.answer || 'No answer available.'}</p>
            ) : null}
            {currentQuestion.type === 'fill_blank' ? (
              <div className="adaptive-answer-list">
                {activeBlankSets.map((blank, index) => (
                  <p key={blank.id}>Blank {index + 1}: {blank.answers.join(', ') || 'No answer available'}</p>
                ))}
              </div>
            ) : null}
            {currentQuestion.type === 'match' ? (
              <div className="adaptive-answer-list">
                {activeMatchParts.pairs.map((pair, index) => {
                  const left = activeMatchParts.leftItems.find((item) => item.id === pair.leftId);
                  const right = activeMatchParts.rightItems.find((item) => item.id === pair.rightId);
                  return (
                    <p key={`${pair.leftId}-${pair.rightId}`}>
                      {index + 1}. {left?.text || 'Term'} {'->'} {right?.text || 'Definition'}
                    </p>
                  );
                })}
              </div>
            ) : null}
            {currentQuestion.type === 'drag_drop' ? (
              <div className="adaptive-answer-list">
                {String(currentQuestion.answer || '')
                  .split('|')
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item, index) => (
                    <p key={`${item}-${index}`}>{index + 1}. {item}</p>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
