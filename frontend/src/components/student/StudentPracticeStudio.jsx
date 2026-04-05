import { useEffect, useMemo, useState } from 'react';
import SectionHeader from './SectionHeader';

const TYPE_LABELS = {
  mcq: 'MCQ',
  fill_blank: 'Fill in the blanks',
  match: 'Match the following',
  drag_drop: 'Drag & Drop',
};

const getBlankPreview = (question) => {
  const text = question.metadata?.fillText || question.prompt || '';
  const blanks = Array.isArray(question.metadata?.blanks) ? question.metadata.blanks : [];

  return blanks.reduce((preview, blank, index) => {
    if (!blank?.label) return preview;
    return preview.replace(blank.label, `_____ ${index + 1}`);
  }, text);
};

const getFillAnswers = (question) => {
  const blankAnswers = (question.metadata?.blanks || [])
    .flatMap((blank) => String(blank.answersText || '').split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (blankAnswers.length) return blankAnswers;

  return String(question.answer || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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

const isAnswerCorrect = (question, selectedOption, fillAnswer) => {
  if (!question) return false;

  if (question.type === 'mcq') {
    return String(selectedOption).trim().toLowerCase() === String(question.answer || '').trim().toLowerCase();
  }

  if (question.type === 'fill_blank') {
    const normalized = String(fillAnswer).trim().toLowerCase();
    return normalized && getFillAnswers(question).includes(normalized);
  }

  return false;
};

const getAdaptiveDifficulty = (score) => {
  if (score <= 0) return 'easy';
  if (score <= 2) return 'medium';
  return 'hard';
};

const getNextQuestionIndex = (questions, usedIndexes, adaptiveScore) => {
  const remainingIndexes = questions
    .map((question, index) => ({ question, index }))
    .filter(({ index }) => !usedIndexes.includes(index));

  if (!remainingIndexes.length) return null;

  const targetDifficulty = getAdaptiveDifficulty(adaptiveScore);
  const exactMatch = remainingIndexes.find(({ question }) => question.difficulty === targetDifficulty);

  if (exactMatch) return exactMatch.index;

  return remainingIndexes[0].index;
};

export default function StudentPracticeStudio({ practice = {} }) {
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [usedQuestionIndexes, setUsedQuestionIndexes] = useState([0]);
  const [adaptiveScore, setAdaptiveScore] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [fillAnswer, setFillAnswer] = useState('');
  const [feedback, setFeedback] = useState('');

  const library = practice.library || [];

  useEffect(() => {
    if (!library.length) return;
    setSelectedQuizId((current) => current || library[0]._id);
  }, [library]);

  const selectedQuiz = useMemo(
    () => library.find((quiz) => quiz._id === selectedQuizId) || null,
    [library, selectedQuizId]
  );

  const selectedQuestion = selectedQuiz?.questions?.[questionIndex] || null;
  const fillBlankChoices = useMemo(
    () => (selectedQuestion?.type === 'fill_blank' ? getFillBlankChoices(selectedQuestion) : []),
    [selectedQuestion]
  );

  useEffect(() => {
    setQuestionIndex(0);
    setUsedQuestionIndexes([0]);
    setAdaptiveScore(0);
    setRevealAnswer(false);
    setSelectedOption('');
    setFillAnswer('');
    setFeedback('');
  }, [selectedQuizId]);

  useEffect(() => {
    setRevealAnswer(false);
    setSelectedOption('');
    setFillAnswer('');
    setFeedback('');
  }, [questionIndex]);

  const handleAdvance = () => {
    if (!selectedQuiz || !selectedQuestion) return;

    const correct = isAnswerCorrect(selectedQuestion, selectedOption, fillAnswer);
    const nextScore = selectedQuiz.adaptiveEnabled
      ? Math.max(-1, adaptiveScore + (correct ? 1 : -1))
      : adaptiveScore;

    setAdaptiveScore(nextScore);
    setFeedback(
      selectedQuestion.type === 'mcq' || selectedQuestion.type === 'fill_blank'
        ? (correct ? 'Correct. Moving you toward a harder question.' : 'Not quite. The next question will be adjusted to help you recover.')
        : 'Practice recorded. Moving to the next question.'
    );

    const nextIndex = getNextQuestionIndex(selectedQuiz.questions || [], [...usedQuestionIndexes, questionIndex], nextScore);

    if (nextIndex === null) {
      setRevealAnswer(true);
      setFeedback('Practice set completed. Review the guidance and try another quiz.');
      return;
    }

    setUsedQuestionIndexes((current) => [...current, nextIndex]);
    setQuestionIndex(nextIndex);
  };

  return (
    <>
      <article className="panel panel-span-4">
        <SectionHeader title="Practice Modes" subtitle="Compact revision modes designed for quick focus." />
        <div className="practice-chip-stack">
          {(practice.types || []).map((item) => (
            <div key={item.value} className="practice-mini-card">
              <strong>{item.label}</strong>
              <span>Interactive</span>
            </div>
          ))}
        </div>
        <SectionHeader title="Recommended Next" subtitle="Adaptive suggestions from current performance." />
        <div className="practice-compact-list">
          {(practice.recommended || []).map((item) => (
            <div key={`${item.topicId}-${item.suggestedType}`} className="practice-mini-card">
              <strong>{item.topicTitle}</strong>
              <div className="course-tags">
                <span>{item.suggestedType}</span>
                <span>{item.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel panel-span-8">
        <SectionHeader title="Interactive Practice Studio" subtitle="One focused quiz at a time with adaptive progression." />
        {library.length ? (
          <div className="practice-studio">
            <div className="practice-library-list compact">
              {library.map((quiz) => (
                <button
                  key={quiz._id}
                  className={`practice-library-card compact ${selectedQuizId === quiz._id ? 'active' : ''}`}
                  onClick={() => setSelectedQuizId(quiz._id)}
                >
                  <strong>{quiz.title}</strong>
                  <p>{quiz.courseTitle} / {quiz.topicTitle}</p>
                  <div className="course-tags">
                    <span>{TYPE_LABELS[quiz.primaryType] || quiz.primaryType}</span>
                    <span>{quiz.difficulty}</span>
                    <span>{quiz.questionCount} questions</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedQuiz && selectedQuestion ? (
              <div className="practice-player compact">
                <div className="practice-player-head compact">
                  <div>
                    <strong>{selectedQuiz.title}</strong>
                    <p>{selectedQuiz.topicTitle} • {TYPE_LABELS[selectedQuestion.type] || selectedQuestion.type}</p>
                  </div>
                  <div className="course-tags">
                    <span>Step {usedQuestionIndexes.length}</span>
                    <span>{selectedQuestion.points} pts</span>
                    <span>{selectedQuestion.difficulty}</span>
                  </div>
                </div>

                <div className="practice-adaptive-bar">
                  <span>Adaptive Mode</span>
                  <strong>{selectedQuiz.adaptiveEnabled ? `Current level: ${getAdaptiveDifficulty(adaptiveScore)}` : 'Standard order'}</strong>
                </div>

                <div className="practice-question-shell compact">
                  <h4 className="question-text">{selectedQuestion.prompt || 'Untitled question'}</h4>

                  {selectedQuestion.type === 'mcq' ? (
                    <div className="practice-choice-list compact">
                      {selectedQuestion.options.map((option, index) => (
                        <button
                          key={`${selectedQuestion._id}-option-${index}`}
                          className={`practice-choice ${selectedOption === option ? 'selected' : ''}`}
                          onClick={() => setSelectedOption(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {selectedQuestion.type === 'fill_blank' ? (
                    <div className="practice-fill-card">
                      <p className="question-text">{getBlankPreview(selectedQuestion) || selectedQuestion.prompt}</p>
                      <select value={fillAnswer} onChange={(event) => setFillAnswer(event.target.value)}>
                        <option value="">Select an answer</option>
                        {fillBlankChoices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        ))}
                        {getFillAnswers(selectedQuestion)
                          .filter((answer) => !fillBlankChoices.includes(answer))
                          .map((answer) => (
                            <option key={answer} value={answer}>
                              {answer}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : null}

                  {selectedQuestion.type === 'match' ? (
                    <div className="preview-match-grid compact-practice-grid">
                      <div>
                        {(selectedQuestion.metadata?.matchLeft || []).map((item) => (
                          <div key={item.id} className="preview-pill">{item.text || 'Term'}</div>
                        ))}
                      </div>
                      <div>
                        {(selectedQuestion.metadata?.matchRight || []).map((item) => (
                          <div key={item.id} className="preview-pill alt">{item.text || 'Definition'}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedQuestion.type === 'drag_drop' ? (
                    <div className="preview-drag-shell compact-drag-shell">
                      <div className="preview-chip-row">
                        {(selectedQuestion.metadata?.dragItems || []).map((item) => (
                          <div key={item.id} className="preview-pill">{item.text || 'Drag item'}</div>
                        ))}
                      </div>
                      <div className="preview-zones">
                        <div className="preview-zone">
                          <strong>Arrange in correct order</strong>
                          <span>Interactive drag sequence prepared</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="detail-action-row">
                    <button className="ghost-btn" onClick={() => setRevealAnswer((value) => !value)}>
                      {revealAnswer ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                    <button className="primary-btn-clean" onClick={handleAdvance}>
                      Next Adaptive Question
                    </button>
                  </div>

                  {feedback ? <div className="practice-feedback-chip">{feedback}</div> : null}

                  {revealAnswer ? (
                    <div className="assistant-response-card practice-answer-card">
                      <strong>Answer Guidance</strong>
                      <p>
                        {selectedQuestion.type === 'fill_blank'
                          ? selectedQuestion.metadata?.blanks?.map((blank) => blank.answersText).filter(Boolean).join(', ') || 'No answer available'
                          : selectedQuestion.answer || 'Check the configured options or pairings for this question.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state-box">No published practice quizzes are available yet. Add quizzes from the instructor panel to unlock this area.</div>
        )}
      </article>
    </>
  );
}
