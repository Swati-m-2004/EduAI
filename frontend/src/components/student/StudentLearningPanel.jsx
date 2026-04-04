import { useEffect, useState } from 'react';
import { FiChevronRight, FiHeadphones, FiMinus, FiMoon, FiPlus, FiVolume2 } from 'react-icons/fi';
import SectionHeader from './SectionHeader';
import StudentTopicQuiz from './StudentTopicQuiz';

const getEmbedUrl = (url = '') => {
  const normalized = String(url).trim();

  if (!normalized) return '';
  if (normalized.includes('youtube.com/embed/')) return normalized;

  const patterns = [
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
  ];

  const match = patterns
    .map((pattern) => normalized.match(pattern))
    .find(Boolean);

  if (match?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }

  return normalized;
};

const getWatchUrl = (url = '') => {
  const normalized = String(url).trim();

  if (!normalized) return '';
  if (normalized.includes('youtube.com/watch') || normalized.includes('youtu.be/')) {
    return normalized;
  }

  const patterns = [
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
  ];

  const match = patterns
    .map((pattern) => normalized.match(pattern))
    .find(Boolean);

  return match?.[1] ? `https://www.youtube.com/watch?v=${match[1]}` : normalized;
};

export default function StudentLearningPanel({
  course,
  selectedTopicId,
  onSelectTopic,
  selectedTopic,
  fontSize,
  setFontSize,
  highContrast,
  setHighContrast,
  autoRead,
  setAutoRead,
  onRead,
  onStop,
  onMarkComplete,
  lessonState,
  completionRequirements = [],
  canMarkComplete = false,
  onMarkVideoWatched,
  onMarkNotesReviewed,
  baselinePerformance,
  onQuizCompletionChange,
  onViewCourse,
}) {
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    setNotesExpanded(false);
  }, [selectedTopic?._id]);

  return (
    <>
      <article className="panel panel-span-4">
        <SectionHeader title="Course Topics" subtitle="Use the topic list to move through unlocked content in order." />
        <div className="topic-tree-clean">
          {(course?.topics || []).map((topic) => (
            <button
              key={topic._id}
              className={`topic-item ${selectedTopicId === topic._id ? 'active' : ''} ${topic.isLocked ? 'locked' : ''}`}
              onClick={() => !topic.isLocked && onSelectTopic(topic._id)}
              disabled={topic.isLocked}
              title={
                topic.isLocked
                  ? 'Complete earlier topics to unlock this lesson.'
                  : topic.isCompleted
                    ? 'This topic is already completed. You can reopen it anytime.'
                    : ''
              }
            >
              <span>{topic.title}</span>
              <small>{topic.isLocked ? 'Locked' : topic.isCompleted ? 'Completed' : 'Open'}</small>
            </button>
          ))}
        </div>
      </article>

      <article className="panel panel-span-8">
        <SectionHeader
          title={selectedTopic?.title || course?.title || 'Learning'}
          subtitle="Watch, read, listen, and update your progress from one focused learning page."
          action={(
            <button className="ghost-btn" onClick={onViewCourse}>
              View Course Page
            </button>
          )}
        />

        {selectedTopic ? (
          <div className="learning-workspace">
            <div className="learning-video-card">
              {selectedTopic.videoUrl ? (
                <>
                  <iframe
                    title={selectedTopic.title}
                    src={getEmbedUrl(selectedTopic.videoUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    onLoad={onMarkVideoWatched}
                  />
                  <div className="detail-action-row learning-video-actions">
                    <a
                      className="ghost-btn"
                      href={getWatchUrl(selectedTopic.videoUrl)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={onMarkVideoWatched}
                    >
                      Watch on YouTube
                    </a>
                    <button
                      className={`ghost-btn ${lessonState?.videoDone ? 'is-selected' : ''}`}
                      onClick={onMarkVideoWatched}
                    >
                      {lessonState?.videoDone ? 'Video Step Done' : 'Mark Video as Watched'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state-box">No video has been added to this topic yet.</div>
              )}
            </div>

            <div
              className="notes-reader-card"
              style={{ fontSize }}
              onClick={onMarkNotesReviewed}
              onMouseEnter={onMarkNotesReviewed}
            >
              <div className="notes-reader-head">
                <strong>{selectedTopic.notesTitle || 'Topic Notes'}</strong>
                <div className="notes-toolbar">
                  <button className="icon-tool-btn" onClick={() => setFontSize((value) => Math.max(14, value - 2))} title="Decrease font size">
                    <FiMinus size={14} />
                  </button>
                  <button className="icon-tool-btn" onClick={() => setFontSize((value) => Math.min(24, value + 2))} title="Increase font size">
                    <FiPlus size={14} />
                  </button>
                  <button className={`icon-tool-btn ${highContrast ? 'is-selected' : ''}`} onClick={() => setHighContrast((value) => !value)} title="Toggle contrast">
                    <FiMoon size={14} />
                  </button>
                  <button
                    className="icon-tool-btn"
                    onClick={() => {
                      onMarkNotesReviewed?.();
                      onRead?.();
                    }}
                    title="Read notes aloud"
                  >
                    <FiVolume2 size={14} />
                  </button>
                  <button className="icon-tool-btn" onClick={onStop} title="Stop audio">
                    <FiHeadphones size={14} />
                  </button>
                  <button className={`icon-tool-btn ${autoRead ? 'is-selected' : ''}`} onClick={() => setAutoRead((value) => !value)} title="Toggle auto read">
                    A
                  </button>
                  {selectedTopic.notesUrl ? (
                    <a
                      className="icon-tool-btn"
                      href={selectedTopic.notesUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open notes file"
                      onClick={onMarkNotesReviewed}
                    >
                      <FiChevronRight size={14} />
                    </a>
                  ) : null}
                  <button
                    className="icon-tool-btn notes-toggle-btn"
                    onClick={() => {
                      const nextValue = !notesExpanded;
                      setNotesExpanded(nextValue);
                      if (nextValue) {
                        onMarkNotesReviewed?.();
                      }
                    }}
                    title={notesExpanded ? 'Show less notes' : 'Show more notes'}
                  >
                    {notesExpanded ? '-' : '+'}
                  </button>
                </div>
              </div>
              <p className={notesExpanded ? 'notes-text expanded' : 'notes-text collapsed'}>
                {selectedTopic.notesContent || selectedTopic.description || 'Notes will appear here when the instructor adds them.'}
              </p>
            </div>

            <div className="detail-action-row">
              <div style={{ width: '100%' }}>
                {!selectedTopic.isCompleted && completionRequirements.length > 0 ? (
                  <div className="completion-checklist" style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'rgba(148,163,184,0.1)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>
                      {canMarkComplete ? '✓ Ready to complete!' : 'Complete to unlock next topic:'}
                    </p>
                    {completionRequirements.map((req) => (
                      req.required ? (
                        <div key={req.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', marginBottom: '6px', padding: '6px', backgroundColor: req.done ? 'rgba(20,184,166,0.05)' : 'rgba(100,116,139,0.05)', borderRadius: '4px', color: req.done ? '#14b8a6' : '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{req.done ? '✓' : '○'}</span>
                            <span>{req.title}</span>
                          </span>
                          {!req.done && (
                            <button
                              type="button"
                              onClick={() => {
                                if (req.key === 'video') onMarkVideoWatched();
                                else if (req.key === 'notes') onMarkNotesReviewed();
                                else if (req.key === 'quiz') onQuizCompletionChange(true);
                              }}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                backgroundColor: '#14b8a6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                ) : null}
                <button 
                  className="primary-btn-clean" 
                  onClick={onMarkComplete} 
                  disabled={selectedTopic.isCompleted || !canMarkComplete}
                  style={{
                    opacity: selectedTopic.isCompleted || !canMarkComplete ? 0.5 : 1,
                    cursor: selectedTopic.isCompleted || !canMarkComplete ? 'not-allowed' : 'pointer',
                  }}
                  title={!canMarkComplete && !selectedTopic.isCompleted ? 'Complete all required items first' : ''}
                >
                  {selectedTopic.isCompleted ? '✓ Topic Completed' : canMarkComplete ? 'Complete Topic Now' : 'Complete Topic'}
                </button>
              </div>
            </div>

            <StudentTopicQuiz topic={selectedTopic} courseId={course?._id} baselinePerformance={baselinePerformance} onQuizCompletionChange={onQuizCompletionChange} />
          </div>
        ) : (
          <div className="empty-state-box">Choose an unlocked topic to start learning.</div>
        )}
      </article>
    </>
  );
}
