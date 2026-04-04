import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

export default function RoleSelection() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'student',
      icon: '🎓',
      title: 'Student',
      description: 'Learn, practice, and improve your skills with AI-guided lessons.',
      color: 'var(--g1)',
      path: '/register?role=student',
    },
    {
      id: 'admin',
      icon: '🧑‍🏫',
      title: 'Instructor',
      description: 'Create courses, manage content, and monitor student progress.',
      color: 'linear-gradient(135deg, #00E5C3, #7B6EF6)',
      path: '/register?role=admin',
    },
    {
      id: 'superadmin',
      icon: '👑',
      title: 'Super Admin',
      description: 'Use credentials admin@eduai.com to access admin panel.',
      color: 'linear-gradient(135deg, #FFD166, #FF6B6B)',
      path: '/login',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <div className="role-selection-container">
      {/* Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* Content */}
      <motion.div
        className="role-content"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="role-title">Choose Your Role</h1>
        <p className="role-subtitle">
          Select your role to get started with EduAI
        </p>

        <motion.div
          className="roles-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {roles.map((role) => (
            <motion.div
              key={role.id}
              className="role-card"
              variants={cardVariants}
              whileHover={{ y: -10 }}
              onClick={() => navigate(role.path)}
            >
              <div className="card-glow"></div>
              <div className="role-icon">{role.icon}</div>
              <h2 className="role-name">{role.title}</h2>
              <p className="role-desc">{role.description}</p>
              <div className="card-arrow">→</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="role-footer">
          <p>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="footer-link"
            >
              Login here
            </button>
          </p>
        </div>
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
