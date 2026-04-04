export default function MetricCard({ icon: Icon, label, value, tone, hint }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-card-top">
        <span>{label}</span>
        <div className="metric-card-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      {hint && <p>{hint}</p>}
    </article>
  );
}
