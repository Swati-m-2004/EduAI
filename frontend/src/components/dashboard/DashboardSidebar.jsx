export default function DashboardSidebar({
  brand,
  roleLabel,
  profileName,
  profileEmail,
  sections,
  activeSection,
  onSectionChange,
  onToggleTheme,
  onLogout,
  themeLabel,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  collapseLabel,
}) {
  return (
    <aside className={`dash-shell-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="dash-shell-brand">
        <div className="dash-shell-brand-mark">{brand}</div>
        <div className="dash-shell-brand-copy">
          <p className="dash-shell-eyebrow">EduPortal</p>
          <h1>{roleLabel}</h1>
        </div>
        {collapsible ? (
          <button
            type="button"
            className="dash-shell-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            {collapsed ? '>' : '<'}
          </button>
        ) : null}
      </div>

      <div className="dash-shell-profile">
        <span className="dash-shell-profile-label">Signed in as</span>
        <strong>{profileName}</strong>
        <p>{profileEmail}</p>
      </div>

      <nav className="dash-shell-nav">
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`dash-shell-nav-item ${activeSection === key ? 'active' : ''}`}
            onClick={() => onSectionChange(key)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="dash-shell-sidebar-footer">
        <button className="dash-shell-secondary-btn" onClick={onToggleTheme}>
          {themeLabel}
        </button>
        <button className="dash-shell-primary-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
