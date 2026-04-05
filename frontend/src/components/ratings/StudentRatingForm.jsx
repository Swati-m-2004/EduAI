import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { studentAPI } from '../../services/api';
import Swal from 'sweetalert2';

export default function StudentRatingForm({ courseId, onRatingSubmitted }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await studentAPI.submitCourseRating(courseId, { rating, feedback });
      setHasRated(true);
      onRatingSubmitted?.();
      Swal.fire({
        title: 'Thank you!',
        text: 'Your rating helps other students choose great courses.',
        icon: 'success',
        timer: 2000,
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to submit rating', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasRated) {
    return (
      <div className="rated-message">
        <div className="stars-display">
          {[...Array(5)].map((_, i) => (
            <FiStar key={i} size={20} className={`star ${i < rating ? 'filled' : ''}`} />
          ))}
        </div>
        <p>You rated this course {rating}/5.</p>
        <small>Your instructor can now review your rating and feedback.</small>
      </div>
    );
  }

  return (
    <div className="rating-form-card">
      <h4>Rate this course</h4>
      <p className="rating-subtitle">Share your experience after completion. Your instructor will see it.</p>

      <form onSubmit={handleSubmit} className="rating-form">
        <div className="stars-container">
          {[...Array(5)].map((_, i) => (
            <button
              key={i}
              type="button"
              className={`star-btn ${i < rating ? 'filled' : ''}`}
              onClick={() => handleRatingChange(i + 1)}
              onMouseEnter={() => handleRatingChange(i + 1)}
              onMouseLeave={() => handleRatingChange(rating)}
              disabled={isSubmitting}
            >
              <FiStar size={24} />
            </button>
          ))}
          <span className="rating-label">{rating || 0} / 5</span>
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What did you like most? Any suggestions? (optional)"
          rows={3}
          maxLength={500}
          disabled={isSubmitting}
          className="feedback-input"
        />

        <button
          type="submit"
          className="submit-rating-btn"
          disabled={!rating || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </div>
  );
}
