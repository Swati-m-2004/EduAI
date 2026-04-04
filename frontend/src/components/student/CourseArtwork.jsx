const getThumbnailFromUrl = (url) => {
  if (!url) return '';
  if (url.includes('img.youtube.com')) return url;

  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  const embedMatch = url.match(/embed\/([^?&/]+)/);
  const videoId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1];

  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : url;
};

export default function CourseArtwork({ course, compact = false }) {
  const thumbnail = getThumbnailFromUrl(course?.thumbnail);

  return (
    <div className={`student-course-art ${compact ? 'compact' : ''}`}>
      {thumbnail ? (
        <img src={thumbnail} alt={course?.title || 'Course thumbnail'} />
      ) : (
        <div className="student-course-art-fallback">
          <span>{course?.title?.slice(0, 2)?.toUpperCase() || 'ED'}</span>
        </div>
      )}
    </div>
  );
}
