import { useEffect, useMemo, useState } from 'react';
import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import SectionHeader from './SectionHeader';
import AdaptiveQuiz from './AdaptiveQuiz';
import { generateAdaptiveQuizFromNotes } from './adaptiveQuestionGenerator';

const TYPE_LABELS = {
  mcq: 'MCQ',
  fill_blank: 'Fill in the blanks',
  match: 'Match the following',
  drag_drop: 'Drag & Drop',
};

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

const normalizeValue = (value, caseSensitive = false) => {
  const text = String(value || '').trim();
  return caseSensitive ? text : text.toLowerCase();
};

const shuffleArray = (list = []) => {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const getBlankPreview = (question) => {
  const text = question.metadata?.fillText || question.prompt || '';
  const blanks = Array.isArray(question.metadata?.blanks) ? question.metadata.blanks : [];

  return blanks.reduce((preview, blank, index) => {
    if (!blank?.label) return preview;
    return preview.replace(blank.label, `_____ ${index + 1}`);
  }, text);
};

const getBlankAnswerSets = (question) => {
  const caseSensitive = question.metadata?.caseSensitive === true;
  const metadataBlanks = Array.isArray(question.metadata?.blanks) ? question.metadata.blanks : [];

  if (metadataBlanks.length) {
    return metadataBlanks.map((blank, index) => ({
      id: blank.id || `blank-${index}`,
      answers: String(blank.answersText || '')
        .split(',')
        .map((item) => normalizeValue(item, caseSensitive))
        .filter(Boolean),
    }));
  }

  return String(question.answer || '')
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
  leftItems: question.metadata?.matchLeft || question.metadata?.leftItems || [],
  rightItems: question.metadata?.matchRight || question.metadata?.rightItems || [],
  pairs: question.metadata?.pairs || [],
});

const getDragItems = (question) => question.metadata?.dragItems || question.metadata?.items || [];

const getInitialDifficulty = (performanceScore = 0) => {
  if (performanceScore < 45) return 'easy';
  if (performanceScore < 75) return 'medium';
  return 'hard';
};

const getTargetQuestionCount = (performanceScore = 0, questionCount = 0) => {
  const desired = performanceScore < 45 ? 5 : performanceScore < 75 ? 4 : 3;
  return Math.min(Math.max(3, desired), Math.max(1, questionCount));
};

const getQuestionPool = (topic) =>
  shuffleArray(
    (topic?.quizzes || []).flatMap((quiz) =>
      (quiz.questions || []).map((question) => ({
        ...question,
        quizId: quiz._id,
        quizTitle: quiz.title,
        adaptiveEnabled: quiz.adaptiveEnabled !== false,
      }))
    )
  );

const moveDifficulty = (difficulty, direction) => {
  const currentIndex = DIFFICULTY_ORDER.indexOf(difficulty);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, safeIndex + direction));
  return DIFFICULTY_ORDER[nextIndex];
};

const getNextDifficulty = (currentDifficulty, wasCorrect, streak) => {
  if (!wasCorrect) return moveDifficulty(currentDifficulty, -1);
  if (streak >= 2) return moveDifficulty(currentDifficulty, 1);
  return currentDifficulty;
};

const getNextQuestionIndex = (questions, usedIndexes, targetDifficulty) => {
  const remaining = questions
    .map((question, index) => ({ question, index }))
    .filter(({ index }) => !usedIndexes.includes(index));

  if (!remaining.length) return null;

  const exact = remaining.find(({ question }) => (question.difficulty || 'easy') === targetDifficulty);
  if (exact) return exact.index;

  const fallbackOrder = targetDifficulty === 'hard'
    ? ['medium', 'easy']
    : targetDifficulty === 'medium'
      ? ['easy', 'hard']
      : ['medium', 'hard'];

  for (const difficulty of fallbackOrder) {
    const match = remaining.find(({ question }) => (question.difficulty || 'easy') === difficulty);
    if (match) return match.index;
  }

  return remaining[0].index;
};

const buildSummaryMessage = (percentage, correctCount, totalAsked) => {
  if (percentage === 100) {
    return 'Excellent work. You handled this topic with strong accuracy and confidence.';
  }
  if (percentage >= 75) {
    return 'Very good progress. Your understanding looks solid, with just a little room to sharpen the details.';
  }
  if (percentage >= 50) {
    return 'Good effort. You have the basics, but another quick revision round will help strengthen this topic.';
  }
  if (correctCount <= 2) {
    return 'This topic needs a bit more attention. Review the lesson once more and try the quiz again with a slower pace.';
  }
  return 'Keep practicing. You are building understanding, and one more revision pass should help a lot.';
};

export default function StudentTopicQuiz({ topic, courseId, baselinePerformance = 0, onQuizCompletionChange }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [usedQuestionIndexes, setUsedQuestionIndexes] = useState([0]);
  const [currentDifficulty, setCurrentDifficulty] = useState(getInitialDifficulty(baselinePerformance));
  const [correctStreak, setCorrectStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [fillAnswers, setFillAnswers] = useState({});
  const [matchAnswers, setMatchAnswers] = useState({});
  const [dragOrder, setDragOrder] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [useAdaptiveMode, setUseAdaptiveMode] = useState(false);

  const questions = useMemo(() => getQuestionPool(topic), [topic]);
  const generatedAdaptiveQuiz = useMemo(
    () => generateAdaptiveQuizFromNotes({
      topicTitle: topic?.title || 'Topic',
      notesContent: topic?.notesContent || '',
      fallbackText: topic?.description || '',
    }),
    [topic?.title, topic?.notesContent, topic?.description]
  );
  const targetQuestionCount = useMemo(
    () => getTargetQuestionCount(baselinePerformance, questions.length),
    [baselinePerformance, questions.length]
  );
  const activeQuestion = questions[questionIndex] || null;
  const activeBlankSets = useMemo(
    () => (activeQuestion?.type === 'fill_blank' ? getBlankAnswerSets(activeQuestion) : []),
    [activeQuestion]
  );
  const fillBlankChoices = useMemo(
    () => (activeQuestion?.type === 'fill_blank' ? getFillBlankChoices(activeQuestion) : []),
    [activeQuestion]
  );
  const activeMatchParts = useMemo(
    () => (activeQuestion?.type === 'match' ? getMatchParts(activeQuestion) : { leftItems: [], rightItems: [], pairs: [] }),
    [activeQuestion]
  );
  const activeDragItems = useMemo(
    () => (activeQuestion?.type === 'drag_drop' ? getDragItems(activeQuestion) : []),
    [activeQuestion]
  );
  const percentageScore = attemptCount ? Math.round((correctCount / attemptCount) * 100) : 0;
  const scoreOutOfTen = attemptCount ? Number(((correctCount / attemptCount) * 10).toFixed(1)) : 0;

  useEffect(() => {
    onQuizCompletionChange?.(false);
  }, [topic?._id, onQuizCompletionChange]);

  useEffect(() => {
    const initialDifficulty = getInitialDifficulty(baselinePerformance);
    setQuestionIndex(0);
    setUsedQuestionIndexes([0]);
    setCurrentDifficulty(initialDifficulty);
    setCorrectStreak(0);
    setSelectedOption('');
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder([]);
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
    setAttemptCount(0);
    setCorrectCount(0);
    setCompleted(false);
    setUseAdaptiveMode(false);
  }, [topic?._id, baselinePerformance]);

  useEffect(() => {
    setSelectedOption('');
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder(shuffleArray(activeDragItems));
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
  }, [questionIndex, activeQuestion?._id]);

  const finishQuiz = (nextCorrectCount, nextAttemptCount) => {
    const nextPercentage = nextAttemptCount ? Math.round((nextCorrectCount / nextAttemptCount) * 100) : 0;
    const nextScoreOutOfTen = nextAttemptCount ? Number(((nextCorrectCount / nextAttemptCount) * 10).toFixed(1)) : 0;
    setCompleted(true);
    setFeedback(buildSummaryMessage(nextPercentage, nextCorrectCount, nextAttemptCount));
    onQuizCompletionChange?.({
      completed: true,
      correctCount: nextCorrectCount,
      totalQuestions: nextAttemptCount,
      percentage: nextPercentage,
      scoreOutOfTen: nextScoreOutOfTen,
    });
  };

  const handleSubmitAttempt = () => {
    if (!activeQuestion || revealed || completed) return;

    let correct = false;

    if (activeQuestion.type === 'mcq') {
      correct = normalizeValue(selectedOption) === normalizeValue(activeQuestion.answer);
    } else if (activeQuestion.type === 'fill_blank') {
      const caseSensitive = activeQuestion.metadata?.caseSensitive === true;
      correct = activeBlankSets.length > 0 && activeBlankSets.every((blank) => {
        const submitted = normalizeValue(fillAnswers[blank.id], caseSensitive);
        return submitted && blank.answers.includes(submitted);
      });
    } else if (activeQuestion.type === 'match') {
      correct = activeMatchParts.pairs.length > 0 && activeMatchParts.pairs.every((pair) => matchAnswers[pair.leftId] === pair.rightId);
    } else if (activeQuestion.type === 'drag_drop') {
      const submittedOrder = dragOrder.map((item) => normalizeValue(item.text));
      const expectedOrder = String(activeQuestion.answer || '')
        .split('|')
        .map((item) => normalizeValue(item))
        .filter(Boolean);
      correct = submittedOrder.length > 0 && expectedOrder.length > 0 && submittedOrder.join('|') === expectedOrder.join('|');
    }

    const nextAttemptCount = attemptCount + 1;
    const nextCorrectCount = correct ? correctCount + 1 : correctCount;

    setAttemptCount(nextAttemptCount);
    setCorrectCount(nextCorrectCount);
    setIsCorrectAnswer(correct);
    setRevealed(true);

    const shouldFinish = nextAttemptCount >= targetQuestionCount;
    if (shouldFinish) {
      finishQuiz(nextCorrectCount, nextAttemptCount);
      return;
    }

    setFeedback(correct ? 'Correct answer. The next question will adapt from here.' : 'Not quite. The next question will adjust to your current level.');
  };

  const handleNext = () => {
    if (!activeQuestion || !revealed || completed) return;

    const nextStreak = isCorrectAnswer ? correctStreak + 1 : 0;
    const nextDifficulty = getNextDifficulty(currentDifficulty, Boolean(isCorrectAnswer), nextStreak);

    setCorrectStreak(nextStreak);
    setCurrentDifficulty(nextDifficulty);

    const nextIndex = getNextQuestionIndex(
      questions,
      [...usedQuestionIndexes, questionIndex],
      nextDifficulty
    );

    if (nextIndex === null) {
      finishQuiz(correctCount, attemptCount);
      return;
    }

    setUsedQuestionIndexes((current) => [...current, nextIndex]);
    setQuestionIndex(nextIndex);
  };

  const restartQuiz = () => {
    const initialDifficulty = getInitialDifficulty(baselinePerformance);
    setQuestionIndex(0);
    setUsedQuestionIndexes([0]);
    setCurrentDifficulty(initialDifficulty);
    setCorrectStreak(0);
    setSelectedOption('');
    setFillAnswers({});
    setMatchAnswers({});
    setDragOrder([]);
    setRevealed(false);
    setIsCorrectAnswer(null);
    setFeedback('');
    setAttemptCount(0);
    setCorrectCount(0);
    setCompleted(false);
    onQuizCompletionChange?.(false);
  };

  const moveDragItem = (index, direction) => {
    if (revealed || completed) return;

    setDragOrder((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  if (!topic?.quizzes?.length && !generatedAdaptiveQuiz.questions.length) {
    return (
      <div className="quiz-inline-shell">
        <SectionHeader title="Adaptive Topic Quiz" subtitle="Adaptive practice is generated from notes, and practice mode uses instructor quizzes." />
        <div className="empty-state-box">Add topic notes or publish a quiz to start practicing this topic.</div>
      </div>
    );
  }

  // PRIMARY: Show adaptive quiz if available and enough questions (even on first load)
  if (generatedAdaptiveQuiz.questions.length >= 10) {
    if (useAdaptiveMode) {
      return (
        <div className="quiz-inline-shell">
          <AdaptiveQuiz
            quiz={generatedAdaptiveQuiz}
            topic={topic}
            courseId={courseId}
            topicId={topic._id}
            onComplete={(performanceData) => {
              onQuizCompletionChange?.({
                completed: true,
                correctCount: performanceData.correctCount,
                totalQuestions: performanceData.totalQuestions,
                percentage: performanceData.score,
                scoreOutOfTen: performanceData.scoreOutOfTen,
                highestDifficulty: performanceData.highestDifficulty,
                batchScores: performanceData.batchScores,
              });
            }}
            onQuit={() => setUseAdaptiveMode(false)}
          />
        </div>
      );
    }

    // Show adaptive quiz interface when not in quiz yet
    return (
      <div className="quiz-inline-shell">
        <SectionHeader
          title="Adaptive Topic Quiz"
          subtitle="AI-generated from the topic notes with mixed question types and adaptive difficulty."
        />

        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0fdfa', borderRadius: '12px', borderLeft: '4px solid #14b8a6' }}>
          <h4 style={{ marginTop: 0, color: '#0f172a' }}>Try the AI Adaptive Quiz</h4>
          <p style={{ margin: '8px 0', color: '#1e293b' }}>
            This adaptive quiz is generated from the instructor notes, mixes MCQ, fill-in-the-blank, match, and drag-drop questions, starts at Easy, and adjusts to Medium or Hard from your live score.
          </p>
          <p style={{ margin: '8px 0', color: '#475569', fontSize: '14px' }}>
            Instructor-added quiz questions still stay available below in the traditional practice area.
          </p>
          <button 
            className="primary-btn-clean" 
            onClick={() => setUseAdaptiveMode(true)}
            style={{ marginTop: '12px', fontSize: '16px', padding: '12px 24px' }}
          >
            Start Adaptive Quiz
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
          <h4 style={{ color: '#64748b', marginBottom: '12px' }}>Traditional Quiz Mode (Optional)</h4>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Prefer the classic quiz format? You can still practice with individual questions below:
          </p>
          
          {!activeQuestion ? (
            <div className="empty-state-box">No instructor practice quiz is published for this topic yet. You can still take the AI adaptive quiz above.</div>
          ) : (
            <>
              <div className="practice-player-head compact">
                <div>
                  <strong>{TYPE_LABELS[activeQuestion.type]}</strong>
                  <p>{topic.title} - {activeQuestion.quizTitle}</p>
                </div>
                <div className="course-tags">
                  <span>Question {Math.min(attemptCount + 1, targetQuestionCount)} / {targetQuestionCount}</span>
                  <span>{activeQuestion.points} pts</span>
                  <span>{activeQuestion.difficulty || 'easy'}</span>
                </div>
              </div>

              <div className="practice-adaptive-bar">
                <span>Current Difficulty</span>
                <strong>Serving: {currentDifficulty}</strong>
              </div>

              {completed ? (
                <div className="quiz-result-card">
                  <strong>Quiz Result</strong>
                  <p>Score: {correctCount}/{attemptCount}</p>
                  <p>Result: {percentageScore}%</p>
                  <p>Progress score: {scoreOutOfTen}/10</p>
                  <p>{feedback}</p>
                  <div className="detail-action-row">
                    <button className="primary-btn-clean" onClick={restartQuiz}>
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="practice-question-shell compact">
                  <h4 className="question-text">{activeQuestion.prompt || 'Untitled question'}</h4>

                  {activeQuestion.type === 'mcq' ? (
                    <div className="practice-choice-list compact">
                      {activeQuestion.options.map((option, index) => {
                        const normalizedOption = normalizeValue(option);
                        const normalizedAnswer = normalizeValue(activeQuestion.answer);
                        const isSelected = selectedOption === option;
                        const isCorrectOption = revealed && normalizedOption === normalizedAnswer;
                        const isWrongSelection = revealed && isSelected && normalizedOption !== normalizedAnswer;

                        return (
                          <button
                            key={`${activeQuestion._id}-option-${index}`}
                            className={`practice-choice ${isSelected ? 'selected' : ''} ${isCorrectOption ? 'correct' : ''} ${isWrongSelection ? 'incorrect' : ''}`}
                            onClick={() => !revealed && setSelectedOption(option)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {activeQuestion.type === 'fill_blank' ? (
                    <div className="practice-fill-card">
              <p className="question-text">{getBlankPreview(activeQuestion) || activeQuestion.prompt}</p>
              <div className="practice-fill-grid">
                {activeBlankSets.map((blank, index) => {
                  const submitted = fillAnswers[blank.id] || '';
                  const isBlankCorrect = revealed
                    ? blank.answers.includes(
                        normalizeValue(submitted, activeQuestion.metadata?.caseSensitive === true)
                      )
                    : null;

                  return (
                    <label key={blank.id} className="practice-fill-field">
                      <span>Blank {index + 1}</span>
                      <select
                        value={submitted}
                        onChange={(event) => !revealed && setFillAnswers((current) => ({
                          ...current,
                          [blank.id]: event.target.value,
                        }))}
                        className={revealed ? (isBlankCorrect ? 'input-correct' : 'input-incorrect') : ''}
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
                  );
                })}
              </div>
              {activeQuestion.metadata?.wordBankEnabled && activeQuestion.metadata?.wordBankWords ? (
                <div className="preview-chip-row">
                  {activeQuestion.metadata.wordBankWords
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

          {activeQuestion.type === 'match' ? (
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

          {activeQuestion.type === 'drag_drop' ? (
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

          <div className="detail-action-row">
            {!revealed ? (
              <button className="primary-btn-clean" onClick={handleSubmitAttempt}>
                Submit Attempt
              </button>
            ) : (
              <button className="primary-btn-clean" onClick={handleNext}>
                Next Adaptive Question
              </button>
            )}
          </div>

          {feedback ? (
            <div className={`practice-feedback-chip ${isCorrectAnswer === true ? 'success' : ''} ${isCorrectAnswer === false ? 'error' : ''}`}>
              {feedback}
            </div>
          ) : null}

          {revealed ? (
            <div className="assistant-response-card practice-answer-card">
              <strong>Answer Guidance</strong>
              {activeQuestion.type === 'fill_blank' ? (
                <div className="practice-answer-list">
                  {activeBlankSets.map((blank, index) => (
                    <p key={blank.id}>Blank {index + 1}: {blank.answers.join(', ') || 'No answer available'}</p>
                  ))}
                </div>
              ) : activeQuestion.type === 'match' ? (
                <div className="practice-answer-list">
                  {activeMatchParts.pairs.map((pair, index) => {
                    const left = activeMatchParts.leftItems.find((item) => item.id === pair.leftId);
                    const right = activeMatchParts.rightItems.find((item) => item.id === pair.rightId);
                    return <p key={`${pair.leftId}-${pair.rightId}`}>{index + 1}. {left?.text || 'Term'} {'->'} {right?.text || 'Definition'}</p>;
                  })}
                </div>
              ) : activeQuestion.type === 'drag_drop' ? (
                <div className="practice-answer-list">
                  {String(activeQuestion.answer || '')
                    .split('|')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>)}
                </div>
              ) : (
                <p>{activeQuestion.answer || 'No answer available.'}</p>
              )}
            </div>
          ) : null}
              </div>
            )}
            </>
          )}
        </div>
      </div>
      );
    }

  // Fallback: No sufficient questions for adaptive
  return (
    <div className="quiz-inline-shell">
      <SectionHeader title="Adaptive Topic Quiz" subtitle="AI adaptive questions are generated from topic notes." />
      <div className="empty-state-box">
        {topic?.notesContent || topic?.description
          ? 'We could not generate enough adaptive questions from these notes yet. Add richer notes or topic content to unlock AI adaptive practice.'
          : 'Instructor notes are required before the AI adaptive quiz can be generated for this topic.'}
      </div>
    </div>
  );
}
