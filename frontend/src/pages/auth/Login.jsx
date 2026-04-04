import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { useThemeStore } from '../../store/themeStore';
import { authAPI } from '../../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setLoading(false);

      const userRole = response.data.user.role;
      let dashboardPath = '/student-dashboard';

      if (userRole === 'instructor') {
        dashboardPath = '/instructor-dashboard';
      } else if (userRole === 'super_admin') {
        dashboardPath = '/super-admin-dashboard';
      }

      Swal.fire({
        title: 'Login Successful!',
        text: `Welcome back, ${response.data.user.name}!`,
        icon: 'success',
        confirmButtonText: 'Go to Dashboard',
        confirmButtonColor: '#7B6EF6',
        background: isDark ? '#0D0D1F' : '#fff',
        color: isDark ? '#F0EFFF' : '#000',
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        setFormData({ email: '', password: '' });
        navigate(dashboardPath);
      });
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.';

      Swal.fire({
        title: 'Login Failed',
        text: message,
        icon: 'error',
        confirmButtonColor: '#7B6EF6',
        background: isDark ? '#0D0D1F' : '#fff',
        color: isDark ? '#F0EFFF' : '#000',
      });
    }
  };

  return (
    <div className={`login-container ${isDark ? 'dark' : 'light'}`}>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <button className="theme-toggle" onClick={toggleTheme}>
        {isDark ? 'Light' : 'Dark'}
      </button>

      <motion.div
        className="login-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-left">
          <motion.div
            className="illustration-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="illustration">
              <div className="illustration-icon">Login</div>
              <h2>Welcome Back</h2>
              <p>Continue your learning journey</p>
              <div className="benefits-list">
                <div className="benefit">Resume courses</div>
                <div className="benefit">Check leaderboard</div>
                <div className="benefit">View progress</div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="login-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="form-header">
            <h1>Welcome Back</h1>
            <p>Login to your EduAI account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <InputField
              label="Email Address"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={FiMail}
            />

            <InputField
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={FiLock}
              showPasswordToggle={true}
              showPassword={showPassword}
              onPasswordToggle={() => setShowPassword(!showPassword)}
            />

            <div className="forgot-password">
              <button type="button" className="forgot-link">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              fullWidth={true}
              size="lg"
              loading={loading}
            >
              Login
            </Button>
          </form>

          <div className="form-footer">
            <p>Don't have an account?</p>
            <button
              type="button"
              onClick={() => navigate('/role-selection')}
              className="register-link"
            >
              Register here
            </button>
            <p className="super-admin-hint">
              Super Admin? Use credentials: <strong>admin@eduai.com</strong>
            </p>
          </div>
        </motion.div>
      </motion.div>

      <div className="particles">
        {Array.from({ length: 15 }).map((_, i) => (
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
