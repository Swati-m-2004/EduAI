import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { useThemeStore } from '../../store/themeStore';
import './SuperAdminLogin.css';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const SUPER_ADMIN_EMAIL = 'admin@eduai.com';

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail()) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);

      if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        Swal.fire({
          title: 'Access Granted! 👑',
          text: 'Welcome to Super Admin Dashboard',
          icon: 'success',
          confirmButtonText: 'Continue',
          confirmButtonColor: '#FFD166',
          background: isDark ? '#0D0D1F' : '#fff',
          color: isDark ? '#F0EFFF' : '#000',
        }).then(() => {
          navigate('/super-admin-dashboard');
        });
        setEmail('');
      } else {
        Swal.fire({
          title: 'Access Denied! ❌',
          text: 'This email is not registered as Super Admin',
          icon: 'error',
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#FF6B6B',
          background: isDark ? '#0D0D1F' : '#fff',
          color: isDark ? '#F0EFFF' : '#000',
        });
      }
    }, 1500);
  };

  return (
    <div className={`super-admin-login-container ${isDark ? 'dark' : 'light'}`}>
      {/* Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>

      <motion.div
        className="super-admin-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Central Form */}
        <motion.div
          className="super-admin-form-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="admin-badge">👑</div>

          <div className="form-header">
            <h1>Super Admin Access</h1>
            <p>Platform Administration Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="super-admin-form">
            <div className="access-level">
              <div className="level-indicator">
                <div className="level-dot"></div>
                <span>Level 3: Super Admin</span>
              </div>
            </div>

            <InputField
              label="Admin Email"
              type="email"
              name="email"
              placeholder="admin@eduai.com"
              value={email}
              onChange={handleChange}
              error={error}
              icon={FiMail}
            />

            <div className="info-box">
              <p>🔐 This portal is restricted to authorized administrators only.</p>
              <p>All access attempts are logged and monitored.</p>
            </div>

            <Button
              type="submit"
              fullWidth={true}
              size="lg"
              loading={loading}
            >
              Access Dashboard →
            </Button>
          </form>

          <div className="form-footer">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="back-link"
            >
              ← Back to User Login
            </button>
          </div>
        </motion.div>

        {/* Security Cards */}
        <motion.div
          className="security-cards"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="security-card">
            <div className="card-icon">🔒</div>
            <h3>Encryption</h3>
            <p>End-to-end encrypted</p>
          </div>
          <div className="security-card">
            <div className="card-icon">📊</div>
            <h3>Analytics</h3>
            <p>Real-time monitoring</p>
          </div>
          <div className="security-card">
            <div className="card-icon">⚙️</div>
            <h3>Control</h3>
            <p>Full system access</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Particles */}
      <div className="particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              '--dur': `${3 + Math.random() * 4}s`,
              '--del': `${Math.random() * 3}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
