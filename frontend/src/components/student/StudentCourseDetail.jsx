import { FiArrowLeft, FiStar } from 'react-icons/fi';
import CourseArtwork from './CourseArtwork';
import SectionHeader from './SectionHeader';

export default function StudentCourseDetail({
  course,
  isLoading,
  onBack,
  onEnroll,
  onStartLearning,
  onOpenMyCourses,
  enrollLabel = 'Enroll Now',
}) {
  return (
    <article className="panel panel-span-12">
      <SectionHeader
        title={course?.title || 'Course Details'}
        subtitle="This course page gives a cleaner view of overview, structure, and enrollment actions."
        action={
          <button className="ghost-btn" onClick={onBack}>
            <FiArrowLeft size={14} />
            Back to Browse
          </button>
        }
      />

      {isLoading ? (
        <div className="empty-state-box">Loading course details...</div>
      ) : course ? (
        <div className="student-course-detail-layout">
          <div className="student-course-hero">
            <CourseArtwork course={course} />
            <div className="student-course-hero-copy">
              <div className="student-course-meta wide">
                <span>{course.instructorName}</span>
                <span>{course.level}</span>
                <span>{course.duration}</span>
                <span>₹{Number(course.price || 0)}</span>
                <span><FiStar size={13} /> {course.rating}</span>
                <span>{course.quizCount || 0} quizzes</span>
              </div>
              <h3>{course.title}</h3>
              <p className="course-detail-copy">{course.description}</p>
              {course.previewTopics?.length ? (
                <div className="course-tags">
                  {course.previewTopics.map((topic) => (
                    <span key={`${course._id}-${topic}`}>{topic}</span>
                  ))}
                </div>
              ) : null}
              <div className="detail-action-row">
                {!course.enrolled ? (
                  <button className="primary-btn-clean" onClick={onEnroll}>
                    {enrollLabel}
                  </button>
                ) : (
                  <button className="primary-btn-clean" onClick={onStartLearning}>
                    Start Learning
                  </button>
                )}
                <button className="ghost-btn" onClick={onOpenMyCourses}>
                  Open My Courses
                </button>
              </div>
              {!course.enrolled ? (
                <p className="course-detail-copy" style={{ marginTop: '10px' }}>
                  {String(enrollLabel).includes('Free')
                    ? 'Your first course is free. After that, paid enrollment is required for additional courses.'
                    : 'You have already used your free course. Please purchase to continue.'}
                </p>
              ) : null}
            </div>
          </div>

          <div className="student-course-outline">
            <SectionHeader title="Topics Overview" subtitle="Locked topics open as you progress through the course." />
            <div className="topic-lock-list">
              {(course.topics || []).map((topic, index) => (
                <div key={topic._id} className={`topic-lock-row ${topic.isLocked ? 'locked' : ''}`}>
                  <div>
                    <strong>{index + 1}. {topic.title}</strong>
                    <p>{topic.description || 'Topic content will appear here once opened.'}</p>
                  </div>
                  <small>{topic.isLocked ? 'Locked' : topic.isCompleted ? 'Completed' : 'Open'}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-box">Choose a course from Browse Courses to open its dedicated page.</div>
      )}
    </article>
  );
}
