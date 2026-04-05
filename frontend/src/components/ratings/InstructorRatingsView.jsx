import { useEffect, useState } from 'react';
import { FiStar, FiUser, FiBookOpen } from 'react-icons/fi';
import { instructorAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const normalizeRatingsPayload = (payload = {}) => ({
  course: payload.course || null,
  stats: {
    avgRating: Number(payload.stats?.avgRating ?? 0),
    ratingsCount: Number(payload.stats?.ratingsCount ?? 0),
  },
  ratings: Array.isArray(payload.ratings) ? payload.ratings : [],
});

const StarRow = ({ value = 0, size = 16 }) => (
  <div className="stars-row">
    {[...Array(5)].map((_, i) => (
      <FiStar
        key={i}
        size={size}
        className={i < value ? 'filled' : 'empty'}
      />
    ))}
  </div>
);

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeString = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value : fallback);

export default function InstructorRatingsView({ courseId }) {
  const [ratingsData, setRatingsData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        if (courseId) {
          const response = await instructorAPI.getCourseRatings(courseId);
          const payload = response.data?.data || response.data || {};

          if (!isMounted) return;

          setRatingsData(normalizeRatingsPayload(payload));
          setOverviewData(null);
        } else {
          const response = await instructorAPI.getRatingsOverview();
          const payload = response.data?.data || response.data || {};

          if (!isMounted) return;

          setOverviewData({
            totals: {
              courses: Number(payload.totals?.courses ?? 0),
              ratings: Number(payload.totals?.ratings ?? 0),
              averageRating: Number(payload.totals?.averageRating ?? 0),
            },
            courseRatings: Array.isArray(payload.courseRatings) ? payload.courseRatings : [],
          });
          setRatingsData(null);
        }
      } catch (error) {
        console.error('Failed to fetch ratings:', error);
        if (isMounted) {
          setError(error.response?.data?.message || 'Failed to load ratings.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  if (loading) {
    return <div className="ratings-placeholder">Loading ratings...</div>;
  }

  if (error) {
    return (
      <div className="no-ratings">
        <p>Unable to load ratings</p>
        <small>{error}</small>
      </div>
    );
  }

  if (courseId) {
    const ratings = safeArray(ratingsData?.ratings);
    const stats = ratingsData?.stats || { avgRating: 0, ratingsCount: 0 };

    if (!ratings.length) {
      return (
        <div className="no-ratings">
          <p>No ratings yet</p>
          <small>First students must complete courses to rate them.</small>
        </div>
      );
    }

    return (
      <div className="ratings-dashboard">
        <div className="ratings-header">
          <div className="avg-rating">
            <div className="stars-large">
              <StarRow value={Math.round(stats.avgRating)} size={24} />
            </div>
            <div className="avg-score">
              <span className="score-lg">{stats.avgRating}</span>
              <span className="score-label">/ 5</span>
            </div>
          </div>
          <div className="ratings-meta">
            <span>{stats.ratingsCount} ratings</span>
          </div>
        </div>

        <div className="ratings-list">
          {ratings.map((rating) => (
            <div key={rating?._id || `${rating?.student?._id || 'rating'}-${rating?.createdAt || Math.random()}`} className="rating-item">
              <div className="rating-head">
                <StarRow value={Number(rating?.rating || 0)} size={16} />
                <div className="rating-score">{Number(rating?.rating || 0)}/5</div>
              </div>

              {rating?.feedback ? <p className="rating-feedback">{rating.feedback}</p> : null}

              <div className="rating-footer">
                <div className="reviewer">
                  <FiUser size={14} />
                  <span>{safeString(rating?.student?.name, 'Anonymous')}</span>
                </div>
                <small>{formatDate(rating?.createdAt)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const courseRatings = safeArray(overviewData?.courseRatings);
  const totals = overviewData?.totals || { courses: 0, ratings: 0, averageRating: 0 };

  if (!courseRatings.length) {
    return (
      <div className="no-ratings">
        <p>No ratings yet</p>
        <small>Ratings will appear here as soon as students submit feedback.</small>
      </div>
    );
  }

  return (
    <div className="ratings-dashboard">
      <div className="ratings-header">
        <div className="avg-rating">
          <div className="stars-large">
            <StarRow value={Math.round(totals.averageRating)} size={24} />
          </div>
          <div className="avg-score">
            <span className="score-lg">{totals.averageRating}</span>
            <span className="score-label">/ 5</span>
          </div>
        </div>
        <div className="ratings-meta">
          <span>{totals.ratings} ratings across {totals.courses} courses</span>
        </div>
      </div>

      <div className="ratings-list">
        {courseRatings.map((courseBlock, index) => {
          const course = courseBlock?.course || {};
          const latestRatings = safeArray(courseBlock?.latestRatings);
          const courseStats = courseBlock?.stats || { avgRating: 0, ratingsCount: 0 };

          return (
          <div key={course._id || `course-${index}`} className="rating-item">
            <div className="rating-head">
              <div className="reviewer">
                <FiBookOpen size={14} />
                <span>{safeString(course.title, 'Untitled course')}</span>
              </div>
              <div className="rating-score">
                {courseStats.avgRating}/5
              </div>
            </div>

            <div className="rating-footer" style={{ marginTop: '8px', marginBottom: '10px' }}>
              <div className="ratings-meta">
                <span>{courseStats.ratingsCount} ratings</span>
              </div>
              <StarRow value={Math.round(Number(courseStats.avgRating || 0))} size={16} />
            </div>

            <div className="ratings-list">
              {latestRatings.length ? (
                latestRatings.map((rating, ratingIndex) => (
                  <div key={rating?._id || `rating-${index}-${ratingIndex}`} className="rating-item" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="rating-head">
                      <StarRow value={Number(rating?.rating || 0)} size={16} />
                      <div className="rating-score">{Number(rating?.rating || 0)}/5</div>
                    </div>
                    {rating?.feedback ? <p className="rating-feedback">{rating.feedback}</p> : null}
                    <div className="rating-footer">
                      <div className="reviewer">
                        <FiUser size={14} />
                        <span>{safeString(rating?.student?.name, 'Anonymous')}</span>
                      </div>
                      <small>{formatDate(rating?.createdAt)}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-ratings" style={{ padding: '16px' }}>
                  <p>No feedback yet</p>
                  <small>This course has not received ratings yet.</small>
                </div>
              )}
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}
