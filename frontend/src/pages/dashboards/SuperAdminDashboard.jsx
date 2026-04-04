import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  FiActivity,
  FiBarChart2,
  FiEye,
  FiFilter,
  FiGrid,
  FiLogOut,
  FiSearch,
  FiShield,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { authAPI, superAdminAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import './Dashboard.css';
import './SuperAdminDashboard.css';

const ROLE_LABELS = {
  student: 'Student',
  instructor: 'Instructor',
};

const getRoleSpecificColumnLabel = (role) =>
  role === 'instructor' ? 'Assigned Students' : 'Assigned Instructor';

const ROLE_OPTIONS = [
  { label: 'All Users', value: 'all' },
  { label: 'Students', value: 'student' },
  { label: 'Instructors', value: 'instructor' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview', icon: FiGrid },
  { key: 'users', label: 'User Directory', icon: FiUsers },
  { key: 'analytics', label: 'Analytics', icon: FiBarChart2 },
];

const CHART_COLORS = ['#ffb703', '#7c3aed', '#0ea5e9', '#10b981'];

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

const formatDateTime = (date) => {
  if (!date) return 'Never';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionUserId, setActionUserId] = useState(null);

  const deferredSearch = useDeferredValue(search.trim());

  const stats = useMemo(() => {
    if (!dashboardData?.stats) return [];

    return [
      {
        label: 'Total Users',
        value: dashboardData.stats.totalUsers,
        icon: FiUsers,
        tone: 'amber',
        note: 'Registered learners and instructors',
      },
      {
        label: 'Total Students',
        value: dashboardData.stats.totalStudents,
        icon: FiUserCheck,
        tone: 'sky',
        note: 'Students across all learning groups',
      },
      {
        label: 'Total Instructors',
        value: dashboardData.stats.totalAdmins,
        icon: FiShield,
        tone: 'rose',
        note: 'Instructors managing student progress',
      },
      {
        label: 'Avg Performance',
        value: `${dashboardData.stats.averagePlatformPerformance}%`,
        icon: FiTrendingUp,
        tone: 'emerald',
        note: 'Average student performance score',
      },
    ];
  }, [dashboardData]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.user.role !== 'super_admin') {
        navigate('/login');
        return;
      }

      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const fetchDashboardData = async (pageToLoad = page) => {
    setLoading(true);

    try {
      const response = await superAdminAPI.getOverview({
        page: pageToLoad,
        limit: 10,
        search: deferredSearch || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      setDashboardData(response.data);
    } catch (error) {
      Swal.fire({
        title: 'Unable to load dashboard',
        text: error.response?.data?.message || 'Something went wrong while loading super admin data.',
        icon: 'error',
        confirmButtonColor: '#ffb703',
        background: isDark ? '#0f1220' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchDashboardData(page);
  }, [page, deferredSearch, roleFilter, statusFilter]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore API logout failure and clear client state anyway.
    }

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleViewUser = async (targetUser) => {
    setDetailsLoading(true);

    try {
      const response = await superAdminAPI.getUserDetails(targetUser._id);
      setSelectedUser(response.data);
    } catch (error) {
      Swal.fire({
        title: 'Unable to load profile',
        text: error.response?.data?.message || 'Could not fetch full user details.',
        icon: 'error',
        confirmButtonColor: '#ffb703',
        background: isDark ? '#0f1220' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusToggle = async (targetUser) => {
    const nextStatus = !targetUser.isActive;
    const result = await Swal.fire({
      title: nextStatus ? 'Activate this user?' : 'Deactivate this user?',
      text: `${targetUser.name} will be marked as ${nextStatus ? 'active' : 'inactive'}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffb703',
      cancelButtonColor: '#64748b',
      background: isDark ? '#0f1220' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
    });

    if (!result.isConfirmed) return;

    setActionUserId(targetUser._id);

    try {
      await superAdminAPI.updateUserStatus(targetUser._id, nextStatus);
      await fetchDashboardData(page);

      if (selectedUser?.user?._id === targetUser._id) {
        await handleViewUser(targetUser);
      }
    } catch (error) {
      Swal.fire({
        title: 'Action failed',
        text: error.response?.data?.message || 'Could not update the user status.',
        icon: 'error',
        confirmButtonColor: '#ffb703',
        background: isDark ? '#0f1220' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const result = await Swal.fire({
      title: 'Delete this user?',
      text: `${targetUser.name} will be permanently removed from the platform.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: isDark ? '#0f1220' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
    });

    if (!result.isConfirmed) return;

    setActionUserId(targetUser._id);

    try {
      await superAdminAPI.deleteUser(targetUser._id);
      setSelectedUser((current) =>
        current?.user?._id === targetUser._id ? null : current
      );
      await fetchDashboardData(page);
    } catch (error) {
      Swal.fire({
        title: 'Delete failed',
        text: error.response?.data?.message || 'Could not delete the selected user.',
        icon: 'error',
        confirmButtonColor: '#ffb703',
        background: isDark ? '#0f1220' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const dashboardStats = dashboardData?.stats;
  const analytics = dashboardData?.analytics;
  const activityFeed = dashboardData?.activityFeed || [];
  const users = dashboardData?.users || [];
  const pagination = dashboardData?.pagination;

  return (
    <div className={`dashboard super-admin-workspace ${isDark ? 'dark' : 'light'}`}>
      <div className="super-admin-shell">
        <aside className="super-admin-sidebar">
          <div className="super-admin-sidebar-top">
            <div className="super-admin-logo">EP</div>
            <div>
              <p className="super-admin-sidebar-kicker">EduPortal</p>
              <h1>Super Admin</h1>
            </div>
          </div>

          <div className="super-admin-profile-card">
            <p className="profile-card-label">Signed in as</p>
            <strong>{user?.name || 'Super Admin'}</strong>
            <span>{user?.email || 'admin@eduai.com'}</span>
          </div>

          <nav className="super-admin-sidebar-nav">
            {SECTION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="super-admin-sidebar-footer">
            <button className="sidebar-utility-button" onClick={toggleTheme}>
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            <button className="sidebar-logout-button" onClick={handleLogout}>
              <FiLogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="super-admin-main">
          <motion.section
            className="super-admin-header"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div>
              <p className="section-eyebrow">Platform command center</p>
              <h2>Dynamic visibility across users, instructors, and platform health.</h2>
              <p className="section-copy">
                Use the sidebar to move between overview, user management, and analytics while keeping every metric live from the database.
              </p>
            </div>

            <div className="super-admin-highlight-card">
              <span>Live students active today</span>
              <strong>{dashboardStats?.activeStudentsToday ?? 0}</strong>
              <p>Students who logged in today across all instructors.</p>
            </div>
          </motion.section>

          <motion.section
            className="super-admin-card-grid"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className={`super-admin-summary-card tone-${stat.tone}`}>
                  <div className="summary-card-top">
                    <span>{stat.label}</span>
                    <div className="summary-card-icon">
                      <Icon size={18} />
                    </div>
                  </div>
                  <strong>{stat.value}</strong>
                  <p>{stat.note}</p>
                </article>
              );
            })}
          </motion.section>

          {activeSection === 'overview' && (
            <motion.section
              className="super-admin-content-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <article className="content-panel wide-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>Registration Momentum</h3>
                    <p>Weekly registration trends for students and instructors.</p>
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics?.weeklyRegistrations || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="students" fill="#ffb703" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="admins" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="content-panel side-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Newest platform registrations and status activity.</p>
                  </div>
                </div>

                <div className="timeline-list">
                  {activityFeed.map((entry) => (
                    <div key={entry.id} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div>
                        <strong>{entry.title}</strong>
                        <p>{entry.description}</p>
                        <span>{formatDateTime(entry.time)} | {entry.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="content-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>Best Performing Instructors</h3>
                    <p>Highest average student performance across assigned cohorts.</p>
                  </div>
                </div>

                <div className="insight-list">
                  {(analytics?.adminPerformance || []).slice(0, 4).map((entry) => (
                    <div key={entry.email} className="insight-item">
                      <div>
                        <strong>{entry.name}</strong>
                        <p>{entry.studentCount} students</p>
                      </div>
                      <span>{entry.averageStudentPerformance}%</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="content-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>Attention Required</h3>
                    <p>Instructors whose learners may need support or monitoring.</p>
                  </div>
                </div>

                <div className="insight-list">
                  {(analytics?.needsAttention || []).map((entry) => (
                    <div key={entry.email} className="insight-item">
                      <div>
                        <strong>{entry.name}</strong>
                        <p>{entry.activeStudentCount} active students</p>
                      </div>
                      <span>{entry.averageStudentPerformance}%</span>
                    </div>
                  ))}
                </div>
              </article>
            </motion.section>
          )}

          {activeSection === 'users' && (
            <motion.section
              className="content-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="content-panel-header">
                <div>
                  <h3>User Directory</h3>
                  <p>Search, filter, inspect, activate, deactivate, and delete users.</p>
                </div>
              </div>

              <div className="directory-toolbar">
                <label className="directory-search">
                  <FiSearch size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or email"
                  />
                </label>

                <div className="directory-filters">
                  <div className="directory-select">
                    <FiFilter size={16} />
                    <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="directory-select">
                    <FiActivity size={16} />
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="directory-table-shell">
                <table className="directory-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th>Assignment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="directory-empty">Loading user data...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="directory-empty">No users found for the selected filters.</td>
                      </tr>
                    ) : (
                      users.map((entry) => (
                        <tr key={entry._id}>
                          <td>{entry._id.slice(-6).toUpperCase()}</td>
                          <td>{entry.name}</td>
                          <td>{entry.email}</td>
                          <td>
                            <span className={`directory-role-chip role-${entry.role}`}>
                              {ROLE_LABELS[entry.role] || entry.role}
                            </span>
                          </td>
                          <td>{formatDate(entry.createdAt)}</td>
                          <td>
                            <span className={`directory-status-chip ${entry.isActive ? 'active' : 'inactive'}`}>
                              {entry.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            {entry.role === 'instructor'
                              ? `${entry.assignedStudentCount || 0} students`
                              : entry.assignedInstructorName || 'Not assigned'}
                          </td>
                          <td>
                            <div className="directory-actions">
                              <button onClick={() => handleViewUser(entry)} disabled={detailsLoading}>
                                <FiEye size={15} />
                                View
                              </button>
                              <button onClick={() => handleStatusToggle(entry)} disabled={actionUserId === entry._id}>
                                {entry.isActive ? <FiUserX size={15} /> : <FiUserCheck size={15} />}
                                {entry.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="danger" onClick={() => handleDeleteUser(entry)} disabled={actionUserId === entry._id}>
                                <FiTrash2 size={15} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination?.totalPages > 1 && (
                <div className="directory-pagination">
                  <button onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1}>
                    Previous
                  </button>
                  <span>Page {pagination.page} of {pagination.totalPages}</span>
                  <button
                    onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.section>
          )}

          {activeSection === 'analytics' && (
            <motion.section
              className="super-admin-content-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <article className="content-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>User Distribution</h3>
                    <p>Dynamic split between students and instructors.</p>
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={analytics?.roleDistribution || []}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                      >
                        {(analytics?.roleDistribution || []).map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="content-panel">
                <div className="content-panel-header">
                  <div>
                    <h3>Instructor Effectiveness</h3>
                    <p>Student count and average performance per instructor.</p>
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={analytics?.adminPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="averageStudentPerformance" stroke="#ffb703" strokeWidth={3} />
                      <Line type="monotone" dataKey="studentCount" stroke="#0ea5e9" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </motion.section>
          )}
        </main>
      </div>

      {selectedUser && (
        <div className="super-admin-drawer-backdrop" onClick={() => setSelectedUser(null)}>
          <aside className="super-admin-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="super-admin-drawer-header">
              <div>
                <p className="drawer-eyebrow">User profile</p>
                <h3>{selectedUser.user.name}</h3>
              </div>
              <button className="drawer-close" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>

            <div className="super-admin-drawer-grid">
              <div className="drawer-detail-card">
                <span>Email</span>
                <strong>{selectedUser.user.email}</strong>
              </div>
              <div className="drawer-detail-card">
                <span>Role</span>
                <strong>{ROLE_LABELS[selectedUser.user.role] || selectedUser.user.role}</strong>
              </div>
              <div className="drawer-detail-card">
                <span>Status</span>
                <strong>{selectedUser.user.isActive ? 'Active' : 'Inactive'}</strong>
              </div>
              <div className="drawer-detail-card">
                <span>Registered</span>
                <strong>{formatDate(selectedUser.user.createdAt)}</strong>
              </div>
              <div className="drawer-detail-card">
                <span>{getRoleSpecificColumnLabel(selectedUser.user.role)}</span>
                <strong>
                  {selectedUser.user.role === 'instructor'
                    ? `${selectedUser.summary?.assignedStudentCount || 0} students`
                    : selectedUser.summary?.assignedInstructorName || 'Not assigned'}
                </strong>
              </div>
              <div className="drawer-detail-card">
                <span>Last Login</span>
                <strong>{formatDateTime(selectedUser.user.lastLoginAt)}</strong>
              </div>
              {selectedUser.user.role === 'student' ? (
                <div className="drawer-detail-card full">
                  <span>Performance</span>
                  <strong>
                    {selectedUser.user.performanceScore != null
                      ? `${selectedUser.user.performanceScore}%`
                      : 'Not available'}
                  </strong>
                </div>
              ) : null}
              {selectedUser.user.role === 'instructor' ? (
                <div className="drawer-detail-card full">
                  <span>Active Assigned Students</span>
                  <strong>{selectedUser.summary?.activeAssignedStudentCount || 0}</strong>
                </div>
              ) : null}
            </div>

            {selectedUser.user.role === 'instructor' && (
              <div className="drawer-students-section">
                <h4>Managed Students</h4>
                {selectedUser.managedStudents.length === 0 ? (
                  <p className="drawer-empty">This instructor does not manage any students yet.</p>
                ) : (
                  <div className="drawer-student-list">
                    {selectedUser.managedStudents.map((entry) => (
                      <div key={entry._id} className="drawer-student-row">
                        <div>
                          <strong>{entry.name}</strong>
                          <p>{entry.email}</p>
                        </div>
                        <span>{entry.performanceScore ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
