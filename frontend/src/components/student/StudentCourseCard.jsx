import { FiChevronRight, FiStar } from 'react-icons/fi';
import CourseArtwork from './CourseArtwork';

export default function StudentCourseCard({
  course,
  variant = 'browse',
  onViewDetails,
  onPrimaryAction,
  primaryLabel,
}) {
  const isFeatured = variant === 'featured';
  const isBrowse = variant === 'browse';

  return (
    <div className={`student-course-card ${isFeatured ? 'featured' : ''} ${isBrowse ? 'browse-card' : ''}`}>
      <CourseArtwork course={course} compact={isFeatured} />
      <div className="student-course-body">
        <div className="student-course-header">
          <div>
            <strong>{course.title}</strong>
            <p>{course.description}</p>
          </div>
          <span className="rating-pill">
            <FiStar size={14} /> {course.rating}
          </span>
        </div>

        {'progress' in course ? (
          <div className="progress-shell">
            <div className="progress-fill" style={{ width: `${course.progress}%` }} />
          </div>
        ) : null}

        <div className="student-course-meta">
          <span>{course.level}</span>
          <span>{course.topicCount} topics</span>
          <span>{course.instructorName}</span>
          {course.quizCount ? <span>{course.quizCount} quizzes</span> : null}
          {'price' in course ? <span>₹{Number(course.price || 0)}</span> : null}
        </div>

        {course.previewTopics?.length ? (
          <div className="course-tags">
            {course.previewTopics.slice(0, 3).map((topic) => (
              <span key={`${course._id}-${topic}`}>{topic}</span>
            ))}
          </div>
        ) : null}

        <div className="detail-action-row">
          <button className="ghost-btn" onClick={onViewDetails}>
            {isFeatured ? 'Open Course Page' : 'View Details'}
            {isFeatured ? <FiChevronRight size={14} /> : null}
          </button>
          {onPrimaryAction ? (
            <button className="primary-btn-clean" onClick={onPrimaryAction}>
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
