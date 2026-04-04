import './Button.css';

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon: Icon,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'full-width' : ''} ${loading ? 'loading' : ''}`}
    >
      {Icon && !loading && <Icon className="btn-icon" />}
      {loading ? (
        <>
          <span className="loader"></span>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
