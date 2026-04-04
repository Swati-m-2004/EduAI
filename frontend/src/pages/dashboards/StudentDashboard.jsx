import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiCpu,
  FiGrid,
  FiSearch,
  FiSettings,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { studentAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import MetricCard from '../../components/dashboard/MetricCard';
import Field from '../../components/student/Field';
import SectionHeader from '../../components/student/SectionHeader';
import StudentCourseCard from '../../components/student/StudentCourseCard';
import StudentCourseDetail from '../../components/student/StudentCourseDetail';
import StudentLearningPanel from '../../components/student/StudentLearningPanel';
import StudentPracticeStudio from '../../components/student/StudentPracticeStudio';
import './Dashboard.css';
import './StudentDashboard.css';

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { key: 'browse', label: 'Browse Courses', icon: FiSearch },
  { key: 'my-courses', label: 'My Courses', icon: FiBookOpen },
  { key: 'learn', label: 'Learning', icon: FiCheckCircle },
  { key: 'practice', label: 'Practice', icon: FiTarget },
  { key: 'performance', label: 'Performance', icon: FiBarChart2 },
  { key: 'assistant', label: 'AI Assistant', icon: FiCpu },
  { key: 'settings', label: 'Settings', icon: FiSettings },
];

const SECTION_META = {
  dashboard: {
    eyebrow: 'Learner Workspace',
    title: 'Discover courses, stay on track, and study from one cleaner student flow.',
    copy: 'The dashboard now connects browse, course details, learning, performance, and revision without jumping between disconnected screens.',
  },
  browse: {
    eyebrow: 'Course Discovery',
    title: 'Search by level, category, and language before opening a dedicated course page.',
    copy: 'Browse is connected to your backend course data, so each card reflects real topics, progress, and enrollment state.',
  },
  'my-courses': {
    eyebrow: 'Learning Library',
    title: 'Keep enrolled courses in one focused place and return to learning quickly.',
    copy: 'This section is built for momentum: fewer clicks, clearer status, and fast resume actions.',
  },
  learn: {
    eyebrow: 'Focused Study',
    title: 'Read notes, watch lessons, listen aloud, and complete topics with accessibility support.',
    copy: 'Font controls, contrast mode, and text-to-speech are available directly inside the learning page.',
  },
  practice: {
    eyebrow: 'Practice Studio',
    title: 'Revise with adaptive quiz flows instead of repeating the same fixed pattern.',
    copy: 'Published quizzes from your enrolled course topics appear here automatically.',
  },
  performance: {
    eyebrow: 'Progress Insights',
    title: 'See course performance and topic mastery without leaving the dashboard.',
    copy: 'Charts are powered by the student analytics response already available from the backend.',
  },
  assistant: {
    eyebrow: 'AI Ready',
    title: 'Use guided prompts now, then we can wire your AI tool logic once you explain it.',
    copy: 'The current assistant area is a safe placeholder so the dashboard flow is complete before we connect your tool behavior.',
  },
  settings: {
    eyebrow: 'Accessibility & Profile',
    title: 'Track the preferences that shape your learning experience.',
    copy: 'These controls mirror the settings used in the learning area so the student journey stays consistent.',
  },
};

const buildAssistantReply = ({ prompt, studentName, topicTitle, courseTitle }) => {
  const question = String(prompt || '').trim();

  if (!question) {
    return 'Ask a lesson question or choose one of the guided prompts to get a quick study response here.';
  }

  return [
    `${studentName || 'Student'}, here is a simple study assist for "${question}".`,
    topicTitle ? `Current topic focus: ${topicTitle}.` : 'Choose a topic in Learning for more targeted help.',
    courseTitle ? `Course context: ${courseTitle}.` : 'Course context will appear after opening a course.',
    'Once you share how you want the AI tools to behave, I can connect this panel to your real assistant flow.',
  ].join(' ');
};

const EMPTY_LESSON_STATE = {
  videoDone: false,
  notesDone: false,
  quizDone: false,
};

const getLessonStateStorageKey = (studentId, courseId, topicId) =>
  `eduai-lesson-state:${studentId || 'student'}:${courseId || 'course'}:${topicId || 'topic'}`;

const getPreferredTopicId = (course, fallbackTopicId = '') => {
  const topics = course?.topics || [];

  if (!topics.length) return '';

  const fallbackTopic = topics.find((topic) => String(topic._id) === String(fallbackTopicId));
  if (fallbackTopic && !fallbackTopic.isLocked) {
    return fallbackTopic._id;
  }

  return course?.currentTopic?._id
    || topics.find((topic) => !topic.isLocked && !topic.isCompleted)?._id
    || topics.find((topic) => !topic.isLocked)?._id
    || topics[0]?._id
    || '';
};

const shouldRedirectTopicSelection = (course, topicId = '') => {
  const topics = course?.topics || [];
  if (!topics.length) return true;

  const selectedTopic = topics.find((topic) => String(topic._id) === String(topicId));
  if (!selectedTopic) return true;
  return selectedTopic.isLocked;
};

const loadRazorpayScript = () => new Promise((resolve) => {
  if (typeof window === 'undefined') {
    resolve(false);
    return;
  }

  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(true), { once: true });
    existingScript.addEventListener('error', () => resolve(false), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.dataset.razorpayCheckout = 'true';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function StudentDashboard() {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [courseDetails, setCourseDetails] = useState(null);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantResponse, setAssistantResponse] = useState(
    'Choose a guided prompt or type your own question. We can swap this placeholder for your AI tools after you explain that part.'
  );
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lessonState, setLessonState] = useState(EMPTY_LESSON_STATE);

  const hasUsedFreeCourse = Boolean(dashboardData?.student?.freeCourseUsed);

  const getCourseCta = (course) => {
    if (course?.enrolled) {
      return {
        label: 'Continue Learning',
        mode: 'continue',
      };
    }

    if (!hasUsedFreeCourse) {
      return {
        label: 'Enroll Free',
        mode: 'free',
      };
    }

    return {
      label: `Buy Now ₹${Number(course?.price || 0)}`,
      mode: 'paid',
    };
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== 'student') {
        navigate('/login');
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const loadDashboard = async ({ keepLoader = false } = {}) => {
    if (!keepLoader) {
      setLoading(true);
    }

    try {
      const response = await studentAPI.getDashboard();
      const payload = response.data;

      setDashboardData(payload);

      const firstPrompt = payload?.assistant?.prompts?.[0] || '';
      setAssistantPrompt((current) => current || firstPrompt);

      return payload;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load the student dashboard.';

      await Swal.fire({
        title: 'Unable to load dashboard',
        text: message,
        icon: 'error',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });

      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedTopic = useMemo(
    () => courseDetails?.topics?.find((topic) => String(topic._id) === String(selectedTopicId)) || null,
    [courseDetails, selectedTopicId]
  );

  useEffect(() => {
    const studentId = dashboardData?.student?._id || user?._id;

    if (!studentId || !courseDetails?._id || !selectedTopic?._id) {
      setLessonState(EMPTY_LESSON_STATE);
      return;
    }

    const storageKey = getLessonStateStorageKey(studentId, courseDetails._id, selectedTopic._id);

    try {
      const savedState = JSON.parse(localStorage.getItem(storageKey) || 'null');
      setLessonState({
        ...EMPTY_LESSON_STATE,
        ...(savedState || {}),
      });
    } catch (error) {
      setLessonState(EMPTY_LESSON_STATE);
    }
  }, [dashboardData?.student?._id, user?._id, courseDetails?._id, selectedTopic?._id]);

  useEffect(() => {
    if (!courseDetails?.topics?.length) {
      setSelectedTopicId('');
      return;
    }

    if (!shouldRedirectTopicSelection(courseDetails, selectedTopicId)) return;

    setSelectedTopicId(getPreferredTopicId(courseDetails, selectedTopicId));
  }, [courseDetails, selectedTopicId]);

  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const content = String(text || '').trim();
    if (!content) return;

    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(content);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const updateLessonState = (patch) => {
    const studentId = dashboardData?.student?._id || user?._id;

    if (!studentId || !courseDetails?._id || !selectedTopic?._id) return;

    setLessonState((current) => {
      const nextState = { ...current, ...patch };
      const storageKey = getLessonStateStorageKey(studentId, courseDetails._id, selectedTopic._id);
      localStorage.setItem(storageKey, JSON.stringify(nextState));
      return nextState;
    });
  };

  const completionRequirements = useMemo(() => {
    if (!selectedTopic) return [];

    const hasVideo = Boolean(selectedTopic.videoUrl);
    const hasNotes = Boolean(selectedTopic.notesContent || selectedTopic.notesUrl || selectedTopic.description);
    const hasQuiz = Boolean(selectedTopic.quizzes?.length);

    return [
      {
        key: 'video',
        title: hasVideo ? 'Lesson Video' : 'Lesson Video',
        description: hasVideo
          ? 'Open the lesson video and confirm that you have watched it.'
          : 'No video is required for this topic.',
        done: !hasVideo || lessonState.videoDone,
        required: hasVideo,
      },
      {
        key: 'notes',
        title: hasNotes ? 'Topic Notes' : 'Topic Notes',
        description: hasNotes
          ? 'Read the notes, expand them, open the file, or use read-aloud before completing the topic.'
          : 'No notes are required for this topic.',
        done: !hasNotes || lessonState.notesDone,
        required: hasNotes,
      },
      {
        key: 'quiz',
        title: hasQuiz ? 'Topic Quiz' : 'Topic Quiz',
        description: hasQuiz
          ? 'Finish at least one quiz flow for this topic.'
          : 'No quiz is required for this topic.',
        done: !hasQuiz || lessonState.quizDone,
        required: hasQuiz,
      },
    ];
  }, [selectedTopic, lessonState]);

  const canMarkComplete = useMemo(
    () => completionRequirements.every((item) => item.done),
    [completionRequirements]
  );

  useEffect(() => {
    if (autoRead && selectedTopic) {
      speakText(selectedTopic.notesContent || selectedTopic.description || selectedTopic.title);
    }
  }, [autoRead, selectedTopic]);

  const openCourseDetails = async (courseId, nextSection = 'course-detail') => {
    if (!courseId) return;

    setSection(nextSection);
    setIsCourseLoading(true);

    try {
      const response = await studentAPI.getCourseDetails(courseId);
      const course = response.data.course;
      setCourseDetails(course);
      setSelectedTopicId(getPreferredTopicId(course, selectedTopicId));
    } catch (error) {
      setSection('browse');

      await Swal.fire({
        title: 'Unable to open course',
        text: error.response?.data?.message || 'Course details could not be loaded.',
        icon: 'error',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setIsCourseLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    const targetCourse = (dashboardData?.discoverCourses || []).find((course) => String(course._id) === String(courseId))
      || courseDetails;

    const completeEnrollmentFlow = async (successTitle, successText) => {
      await loadDashboard({ keepLoader: true });
      await openCourseDetails(courseId, 'learn');

      await Swal.fire({
        title: successTitle,
        text: successText,
        icon: 'success',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    };

    const startPaidEnrollment = async () => {
      const orderResponse = await studentAPI.createPaymentOrder(courseId);
      const order = orderResponse.data.order;
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: 'EduAI',
          description: `Purchase access for ${order.courseTitle}`,
          order_id: order.orderId,
          prefill: {
            name: dashboardData?.student?.name || user?.name || '',
            email: dashboardData?.student?.email || user?.email || '',
          },
          theme: {
            color: '#14b8a6',
          },
          handler: async (paymentResponse) => {
            try {
              await studentAPI.verifyCoursePayment(courseId, paymentResponse);
              await completeEnrollmentFlow(
                'Payment successful',
                `Payment received for ${targetCourse?.title || 'this course'}. Your course is now unlocked.`
              );
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user')),
          },
        });

        razorpay.open();
      });
    };

    try {
      await studentAPI.enrollInCourse(courseId);
      await completeEnrollmentFlow(
        'Enrolled successfully',
        'Your free course has been added to My Courses and opened in Learning.'
      );
    } catch (error) {
      if (error.response?.status === 402 || error.response?.data?.paymentRequired) {
        try {
          await Swal.fire({
            title: 'Payment required',
            text: error.response?.data?.message || 'You have already used your free course. Please purchase to continue.',
            icon: 'info',
            confirmButtonText: `Buy Now ₹${Number(targetCourse?.price || 0)}`,
            showCancelButton: true,
            confirmButtonColor: '#14b8a6',
            cancelButtonColor: '#64748b',
            background: isDark ? '#07111d' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
          }).then(async (result) => {
            if (result.isConfirmed) {
              await startPaidEnrollment();
            }
          });
        } catch (paymentError) {
          if (paymentError.message !== 'Payment cancelled by user') {
            await Swal.fire({
              title: 'Payment failed',
              text: paymentError.response?.data?.message || paymentError.message || 'Could not complete the payment.',
              icon: 'error',
              confirmButtonColor: '#14b8a6',
              background: isDark ? '#07111d' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
            });
          }
        }
        return;
      }

      await Swal.fire({
        title: 'Enrollment failed',
        text: error.response?.data?.message || 'Could not enroll in this course right now.',
        icon: 'error',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    }
  };

  const handleContinueLearning = async (courseId) => {
    await openCourseDetails(courseId, 'learn');
  };

  const markTopicComplete = async () => {
    if (!courseDetails?._id || !selectedTopicId) return;
    if (!canMarkComplete) {
      const pendingItems = completionRequirements.filter((item) => !item.done);
      await Swal.fire({
        title: 'Complete the lesson first',
        text: pendingItems.length
          ? `Before marking this topic complete, finish: ${pendingItems.map((item) => item.title).join(', ')}.`
          : 'Finish the remaining lesson work before marking this topic complete.',
        icon: 'info',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
      return;
    }

    try {
      await studentAPI.updateProgress(courseDetails._id, { topicId: selectedTopicId });
      await Promise.all([
        loadDashboard({ keepLoader: true }),
        openCourseDetails(courseDetails._id, 'learn'),
      ]);

      await Swal.fire({
        title: 'Progress updated',
        text: 'This topic has been marked complete and the next content is now available if unlocked.',
        icon: 'success',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });

      const studentId = dashboardData?.student?._id || user?._id;
      if (studentId) {
        localStorage.removeItem(getLessonStateStorageKey(studentId, courseDetails._id, selectedTopicId));
      }
    } catch (error) {
      await Swal.fire({
        title: 'Update failed',
        text: error.response?.data?.message || 'Could not update topic progress.',
        icon: 'error',
        confirmButtonColor: '#14b8a6',
        background: isDark ? '#07111d' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    }
  };

  const handleLogout = () => {
    stopSpeech();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const filteredCourses = useMemo(() => {
    const courses = dashboardData?.discoverCourses || [];

    return courses.filter((course) => {
      const matchesSearch = !searchTerm || [course.title, course.description, course.instructorName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
      const matchesLanguage = languageFilter === 'all' || course.language === languageFilter;

      return matchesSearch && matchesLevel && matchesCategory && matchesLanguage;
    });
  }, [dashboardData, searchTerm, levelFilter, categoryFilter, languageFilter]);

  const metrics = useMemo(() => ([
    {
      icon: FiBookOpen,
      label: 'Enrolled Courses',
      value: dashboardData?.stats?.enrolledCourses ?? 0,
      tone: 'teal',
      hint: 'Active courses in your learning library.',
    },
    {
      icon: FiTrendingUp,
      label: 'Overall Progress',
      value: `${dashboardData?.stats?.overallProgress ?? 0}%`,
      tone: 'blue',
      hint: 'Average completion across enrolled courses.',
    },
    {
      icon: FiZap,
      label: 'Streak Days',
      value: dashboardData?.stats?.streakDays ?? 0,
      tone: 'gold',
      hint: 'Keep the study streak moving.',
    },
    {
      icon: FiAward,
      label: 'Total XP',
      value: dashboardData?.stats?.totalXP ?? 0,
      tone: 'purple',
      hint: 'Reward points collected from learning activity.',
    },
  ]), [dashboardData]);

  const sectionMeta = SECTION_META[section] || SECTION_META.dashboard;

  if (loading) {
    return (
      <div className={`student-studio ${isDark ? 'dark' : 'light'} ${highContrast ? 'high-contrast' : ''}`}>
        <div className="student-loading-shell">
          <motion.div
            className="student-loading-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Preparing your student dashboard...
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`student-studio ${isDark ? 'dark' : 'light'} ${highContrast ? 'high-contrast' : ''}`}>
      <div className={`dash-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <DashboardSidebar
          brand="ST"
          roleLabel="Student"
          profileName={dashboardData?.student?.name || user?.name || 'Student'}
          profileEmail={dashboardData?.student?.email || user?.email || 'student@eduai.com'}
          sections={SECTIONS}
          activeSection={section}
          onSectionChange={setSection}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          themeLabel={isDark ? 'Switch to Light' : 'Switch to Dark'}
          collapsible
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          collapseLabel={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        />

        <main className="dash-shell-main">
          <motion.section
            className={`workspace-banner ${section === 'dashboard' ? 'is-dashboard' : ''}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <p className="dash-shell-eyebrow">{sectionMeta.eyebrow}</p>
              <h2>{sectionMeta.title}</h2>
              <p className="workspace-copy">{sectionMeta.copy}</p>
            </div>
            <div className="workspace-banner-aside">
              <span>Accessibility Ready</span>
              <strong>Read, listen, adjust, and continue</strong>
              <p>Use text-to-speech, font controls, contrast mode, and note-file access directly inside learning.</p>
            </div>
          </motion.section>

          {section === 'dashboard' && (
            <>
              <motion.section className="metrics-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {metrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </motion.section>

              <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <article className="panel panel-span-8">
                  <SectionHeader title="Recommended Courses" subtitle="Open a dedicated page for any course and continue from there." />
                  <div className="student-course-grid">
                    {(dashboardData?.discoverCourses || []).slice(0, 3).map((course) => {
                      const cta = getCourseCta(course);

                      return (
                        <StudentCourseCard
                          key={course._id}
                          course={course}
                          variant="featured"
                          onViewDetails={() => openCourseDetails(course._id)}
                          onPrimaryAction={cta.mode === 'continue' ? () => handleContinueLearning(course._id) : () => handleEnroll(course._id)}
                          primaryLabel={cta.label}
                        />
                      );
                    })}
                  </div>
                </article>

                <article className="panel panel-span-4">
                  <SectionHeader title="Achievements" subtitle="Small wins that keep learning momentum strong." />
                  <div className="achievement-list">
                    {(dashboardData?.achievements || []).map((badge) => (
                      <div key={badge.title} className={`achievement-card ${badge.unlocked ? 'unlocked' : ''}`}>
                        <strong>{badge.title}</strong>
                        <p>{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel panel-span-6">
                  <SectionHeader title="Leaderboard" subtitle="A simple rank view based on current performance score." />
                  <div className="leaderboard-list">
                    {(dashboardData?.leaderboard || []).map((entry) => (
                      <div key={entry._id} className={`leaderboard-row ${entry.isCurrentUser ? 'is-current' : ''}`}>
                        <span>#{entry.rank}</span>
                        <strong>{entry.name}</strong>
                        <span>{entry.score}%</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel panel-span-6">
                  <SectionHeader title="Practice Modes" subtitle="Published quiz types available for adaptive revision." />
                  <div className="type-chip-grid">
                    {(dashboardData?.practice?.types || []).map((item) => (
                      <div key={item.value} className="type-chip-card">
                        <strong>{item.label}</strong>
                        <p>Use this mode when you want focused, course-based revision.</p>
                      </div>
                    ))}
                  </div>
                </article>
              </motion.section>
            </>
          )}

          {section === 'browse' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <article className="panel panel-span-4">
                <SectionHeader title="Search & Filter" subtitle="Find courses by title, level, instructor, and category." />
                <label className="search-bar-clean">
                  <FiSearch size={18} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search courses..."
                  />
                </label>
                <div className="filter-stack">
                  <Field label="Level">
                    <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                      <option value="all">All Levels</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Category">
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                      <option value="all">All Categories</option>
                      <option value="Programming">Programming</option>
                    </select>
                  </Field>
                  <Field label="Language">
                    <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                      <option value="all">All Languages</option>
                      <option value="English">English</option>
                    </select>
                  </Field>
                </div>
              </article>

              <article className="panel panel-span-8">
                <SectionHeader title="Course Discovery" subtitle="Each course opens in a separate detail flow before learning begins." />
                <div className="student-course-grid browse-grid">
                  {filteredCourses.map((course) => {
                    const cta = getCourseCta(course);

                    return (
                      <StudentCourseCard
                        key={course._id}
                        course={course}
                        onViewDetails={() => openCourseDetails(course._id)}
                        onPrimaryAction={cta.mode === 'continue' ? () => handleContinueLearning(course._id) : () => handleEnroll(course._id)}
                        primaryLabel={cta.label}
                      />
                    );
                  })}
                </div>
                {!filteredCourses.length ? (
                  <div className="empty-state-box">No courses match the current search and filter combination.</div>
                ) : null}
              </article>
            </motion.section>
          )}

          {section === 'course-detail' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <StudentCourseDetail
                course={courseDetails}
                isLoading={isCourseLoading}
                onBack={() => setSection('browse')}
                onEnroll={() => handleEnroll(courseDetails?._id)}
                onStartLearning={() => handleContinueLearning(courseDetails?._id)}
                onOpenMyCourses={() => setSection('my-courses')}
                enrollLabel={getCourseCta(courseDetails).label}
              />
            </motion.section>
          )}

          {section === 'my-courses' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <article className="panel panel-span-12">
                <SectionHeader title="My Courses" subtitle="All enrolled courses with direct access back into learning." />
                <div className="student-course-grid browse-grid">
                  {(dashboardData?.myCourses || []).map((course) => (
                    <StudentCourseCard
                      key={course._id}
                      course={course}
                      onViewDetails={() => openCourseDetails(course._id)}
                      onPrimaryAction={() => handleContinueLearning(course._id)}
                      primaryLabel="Continue Learning"
                    />
                  ))}
                </div>
                {!dashboardData?.myCourses?.length ? (
                  <div className="empty-state-box">Enroll in a course first to build your learning library.</div>
                ) : null}
              </article>
            </motion.section>
          )}

          {section === 'learn' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              {isCourseLoading ? (
                <article className="panel panel-span-12">
                  <div className="empty-state-box">Loading your course workspace...</div>
                </article>
              ) : courseDetails ? (
                <StudentLearningPanel
                  course={courseDetails}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={setSelectedTopicId}
                  selectedTopic={selectedTopic}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  highContrast={highContrast}
                  setHighContrast={setHighContrast}
                  autoRead={autoRead}
                  setAutoRead={setAutoRead}
                  onRead={() => {
                    updateLessonState({ notesDone: true });
                    speakText(selectedTopic?.notesContent || selectedTopic?.description || selectedTopic?.title);
                  }}
                  onStop={stopSpeech}
                  onMarkComplete={markTopicComplete}
                  lessonState={lessonState}
                  completionRequirements={completionRequirements}
                  canMarkComplete={canMarkComplete}
                  onMarkVideoWatched={() => updateLessonState({ videoDone: true })}
                  onMarkNotesReviewed={() => updateLessonState({ notesDone: true })}
                  baselinePerformance={dashboardData?.student?.performanceScore ?? 0}
                  onQuizCompletionChange={(completed) => {
                    if (completed) {
                      updateLessonState({ quizDone: true });
                    }
                  }}
                  onViewCourse={() => openCourseDetails(courseDetails?._id, 'course-detail')}
                />
              ) : (
                <article className="panel panel-span-12">
                  <div className="empty-state-box">Choose a course from My Courses to continue learning.</div>
                </article>
              )}
            </motion.section>
          )}

          {section === 'practice' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <StudentPracticeStudio practice={dashboardData?.practice} />
            </motion.section>
          )}

          {section === 'performance' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              {/* Overall Performance Score Card */}
              <article className="panel panel-span-4">
                <SectionHeader title="Overall Performance" subtitle="Your aggregated score across all quizzes." />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '72px',
                      fontWeight: 'bold',
                      color: '#14b8a6',
                      lineHeight: '1',
                      marginBottom: '10px',
                    }}>
                      {dashboardData?.student?.performanceScore || 0}%
                    </div>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                      {dashboardData?.stats?.quizAttempts || 0} Quizzes Completed
                    </p>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '12px' }}>
                      {dashboardData?.student?.performanceScore >= 80 ? '🏆 Excellent!' : dashboardData?.student?.performanceScore >= 60 ? '⭐ Good' : dashboardData?.student?.performanceScore >= 40 ? '📈 Fair' : '📚 Keep Going'}
                    </p>
                  </div>
                </div>
              </article>

              {/* Performance Trend Line Chart */}
              <article className="panel panel-span-8">
                <SectionHeader title="Course Performance Trend" subtitle="Your average score across enrolled courses." />
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dashboardData?.analytics?.performanceTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                      <XAxis dataKey="label" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                        formatter={(value) => `${value}%`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              {/* Topic Mastery Bar Chart */}
              <article className="panel panel-span-6">
                <SectionHeader title="Topic Mastery" subtitle="See which topics you've mastered and which need improvement." />
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData?.analytics?.topicAnalysis || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                      <XAxis dataKey="topicTitle" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                        formatter={(value) => `${value}%`}
                      />
                      <Bar dataKey="mastery" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              {/* Difficulty Level Performance */}
              <article className="panel panel-span-6">
                <SectionHeader title="Difficulty Performance" subtitle="Your score distribution across difficulty levels." />
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { level: 'Easy', score: dashboardData?.analytics?.difficultyProgress?.easy || 0 },
                      { level: 'Medium', score: dashboardData?.analytics?.difficultyProgress?.medium || 0 },
                      { level: 'Hard', score: dashboardData?.analytics?.difficultyProgress?.hard || 0 },
                    ]}>
                      <PolarGrid stroke="rgba(148,163,184,0.16)" />
                      <PolarAngleAxis dataKey="level" stroke="#94a3b8" />
                      <PolarRadiusAxis stroke="#94a3b8" angle={90} domain={[0, 100]} />
                      <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                        formatter={(value) => `${value}%`}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              {/* Progress Timeline */}
              <article className="panel panel-span-12">
                <SectionHeader title="Quiz Attempts Timeline" subtitle="Your recent quiz performance progression." />
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dashboardData?.analytics?.timelineVisualization || []}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                      <XAxis dataKey="label" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                        formatter={(value) => `${value}%`}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#14b8a6" 
                        fillOpacity={1} 
                        fill="url(#colorScore)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              {/* Strengths & Weaknesses */}
              <article className="panel panel-span-6">
                <SectionHeader title="Your Strengths" subtitle="Topics you excel at." />
                <div style={{ padding: '20px 0' }}>
                  {(dashboardData?.analytics?.strengths || []).length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {dashboardData.analytics.strengths.map((topic, idx) => (
                        <li key={idx} style={{
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          borderLeft: '4px solid #10b981',
                          borderRadius: '4px',
                          color: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '20px' }}>✓</span>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#94a3b8', margin: 0 }}>Complete quizzes to see your strengths.</p>
                  )}
                </div>
              </article>

              {/* Weaknesses & Areas to Improve */}
              <article className="panel panel-span-6">
                <SectionHeader title="Areas to Improve" subtitle="Topics that need more practice." />
                <div style={{ padding: '20px 0' }}>
                  {(dashboardData?.analytics?.weaknesses || []).length > 0 ? (
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {dashboardData.analytics.weaknesses.map((topic, idx) => (
                        <li key={idx} style={{
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderLeft: '4px solid #3b82f6',
                          borderRadius: '4px',
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '20px' }}>→</span>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#94a3b8', margin: 0 }}>Complete quizzes to see areas for improvement.</p>
                  )}
                </div>
              </article>
            </motion.section>
          )}

          {section === 'assistant' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <article className="panel panel-span-5">
                <SectionHeader title="AI Assistant" subtitle="Pick a prompt now, then we can map your AI tools into this area next." />
                <div className="assistant-prompt-list">
                  {(dashboardData?.assistant?.prompts || []).map((prompt) => (
                    <button key={prompt} className="ghost-btn" onClick={() => setAssistantPrompt(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </article>

              <article className="panel panel-span-7">
                <SectionHeader title="Ask AI" subtitle="This is currently a dashboard-ready placeholder response area." />
                <Field label="Question" full>
                  <textarea
                    value={assistantPrompt}
                    onChange={(event) => setAssistantPrompt(event.target.value)}
                    placeholder="Ask AI: Explain loops in simple words"
                  />
                </Field>
                <div className="detail-action-row">
                  <button
                    className="primary-btn-clean"
                    onClick={() => setAssistantResponse(buildAssistantReply({
                      prompt: assistantPrompt,
                      studentName: dashboardData?.student?.name,
                      topicTitle: selectedTopic?.title,
                      courseTitle: courseDetails?.title,
                    }))}
                  >
                    Generate Response
                  </button>
                </div>
                <div className="assistant-response-card">
                  <strong>Assistant Response</strong>
                  <p>{assistantResponse}</p>
                </div>
              </article>
            </motion.section>
          )}

          {section === 'settings' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <article className="panel panel-span-6">
                <SectionHeader title="Accessibility Preferences" subtitle="These settings affect how lesson content is consumed." />
                <div className="settings-list">
                  <div className="settings-row">
                    <strong>Font Size</strong>
                    <span>{fontSize}px</span>
                  </div>
                  <div className="settings-row">
                    <strong>High Contrast</strong>
                    <span>{highContrast ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="settings-row">
                    <strong>Auto Read</strong>
                    <span>{autoRead ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </article>

              <article className="panel panel-span-6">
                <SectionHeader title="Student Profile" subtitle="A quick summary of your current learning identity in the platform." />
                <div className="settings-list">
                  <div className="settings-row">
                    <strong>Name</strong>
                    <span>{dashboardData?.student?.name || user?.name}</span>
                  </div>
                  <div className="settings-row">
                    <strong>Email</strong>
                    <span>{dashboardData?.student?.email || user?.email}</span>
                  </div>
                  <div className="settings-row">
                    <strong>Performance Score</strong>
                    <span>{dashboardData?.student?.performanceScore ?? 0}%</span>
                  </div>
                </div>
              </article>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  );
}
