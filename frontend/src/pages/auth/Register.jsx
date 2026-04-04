import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { useThemeStore } from '../../store/themeStore';
import { authAPI } from '../../services/api';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'student';
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';

    if (!formData.confirmPassword)
      newErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

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
      const normalizedEmail = formData.email.trim().toLowerCase();

      const response = await authAPI.register({
        name: formData.name.trim(),
        email: normalizedEmail,
        password: formData.password,
        role: role === 'admin' ? 'instructor' : 'student',
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);

      Swal.fire({
        title: 'Registration Successful!',
        text: `Welcome to EduAI, ${response.data.user.name}! Please log in to continue.`,
        icon: 'success',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#7B6EF6',
        background: isDark ? '#0D0D1F' : '#fff',
        color: isDark ? '#F0EFFF' : '#000',
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        navigate('/login');
      });
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.';

      Swal.fire({
        title: 'Registration Failed',
        text: message,
        icon: 'error',
        confirmButtonColor: '#7B6EF6',
        background: isDark ? '#0D0D1F' : '#fff',
        color: isDark ? '#F0EFFF' : '#000',
      });
    }
  };

  const roleDisplay = role === 'admin' ? 'Instructor' : 'Student';

  return (
    <div className={`register-container ${isDark ? 'dark' : 'light'}`}>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <button className="theme-toggle" onClick={toggleTheme}>
        {isDark ? 'Light' : 'Dark'}
      </button>

      <motion.div
        className="register-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="register-left">
          <motion.div
            className="illustration-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="illustration">
              <div className="illustration-icon">Start</div>
              <h2>Join EduAI</h2>
              <p>Start your learning journey today</p>
              <div className="features-list">
                <div className="feature">AI-powered learning</div>
                <div className="feature">Gamified experience</div>
                <div className="feature">Track progress</div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="register-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="form-header">
            <h1>Create Account</h1>
            <p>Role: <span className="role-badge">{roleDisplay}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <InputField
              label="Full Name"
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              icon={FiUser}
            />

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

            <InputField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              icon={FiLock}
              showPasswordToggle={true}
              showPassword={showConfirmPassword}
              onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <Button
              type="submit"
              fullWidth={true}
              size="lg"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <div className="form-footer">
            <p>Already have an account?</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="login-link"
            >
              Login here
            </button>
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
