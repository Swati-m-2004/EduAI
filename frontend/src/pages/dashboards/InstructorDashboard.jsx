import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { FiActivity, FiArrowLeft, FiBarChart2, FiBookOpen, FiChevronRight, FiExternalLink, FiFileText, FiGrid, FiLayers, FiPaperclip, FiPlus, FiSearch, FiSettings, FiStar, FiTrendingUp, FiTrash2, FiUsers, FiVideo, FiX } from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { authAPI, instructorAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import MetricCard from '../../components/dashboard/MetricCard';
import InstructorRatingsView from '../../components/ratings/InstructorRatingsView';
import './Dashboard.css';
import './InstructorDashboard.css';

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { key: 'courses', label: 'My Courses', icon: FiBookOpen },
  { key: 'ratings', label: 'Ratings & Feedback', icon: FiStar },
  { key: 'create', label: 'Create Subject', icon: FiPlus },
  { key: 'topics', label: 'Topics & Content', icon: FiLayers },
  { key: 'quizzes', label: 'Quizzes', icon: FiActivity },
  { key: 'students', label: 'Students', icon: FiUsers },
  { key: 'analytics', label: 'Analytics', icon: FiBarChart2 },
  { key: 'settings', label: 'Settings', icon: FiSettings },
];

const QUESTION_TYPES = [['mcq', 'MCQ'], ['fill_blank', 'Fill in the blanks'], ['match', 'Match the following'], ['drag_drop', 'Drag & Drop']];
const NOTES_TYPES = [['none', 'No notes yet'], ['pdf', 'PDF'], ['ppt', 'PPT'], ['word', 'Word / Docs'], ['rich_text', 'Rich Text']];
const QUESTION_HELP = {
  mcq: { label: 'MCQ', optionsLabel: 'Choices', optionsPlaceholder: 'Option A, Option B, Option C, Option D', answerLabel: 'Correct choice', answerPlaceholder: 'Option B', guidance: 'Use objective choices for quick concept checks.' },
  fill_blank: { label: 'Fill in the blanks', optionsLabel: 'Accepted answers', optionsPlaceholder: 'for, while, loop', answerLabel: 'Primary answer', answerPlaceholder: 'for', guidance: 'Store the main answer and optional accepted variants.' },
  match: { label: 'Match the following', optionsLabel: 'Pairs', optionsPlaceholder: 'Variable=stores value, Loop=repeats task', answerLabel: 'Answer key', answerPlaceholder: 'Variable->stores value; Loop->repeats task', guidance: 'Arrange clear concept-to-definition pairs.' },
  drag_drop: { label: 'Drag & Drop', optionsLabel: 'Draggable items', optionsPlaceholder: 'start, process, output', answerLabel: 'Correct order / placement', answerPlaceholder: 'start, process, output', guidance: 'Use short items and record the expected order.' },
};
const createOption = (text = '', isCorrect = false) => ({ id: `${Date.now()}-${Math.random()}`, text, isCorrect });
const createMatchEntry = (text = '') => ({ id: `${Date.now()}-${Math.random()}`, text });
const createDragItem = (text = '') => ({ id: `${Date.now()}-${Math.random()}`, text, imageUrl: '' });
const createBlank = (label = '') => ({ id: `${Date.now()}-${Math.random()}`, label, answersText: label });
const makeQuestion = (type = 'mcq') => ({
  prompt: '',
  type,
  difficulty: 'easy',
  points: 10,
  imageUrl: '',
  codeSnippet: '',
  options: [createOption(''), createOption(''), createOption(''), createOption('')],
  matchLeft: [createMatchEntry(''), createMatchEntry('')],
  matchRight: [createMatchEntry(''), createMatchEntry('')],
  matchPairs: [],
  randomizeRight: true,
  dragItems: [createDragItem(''), createDragItem(''), createDragItem('')],
  dragZones: [''],
  allowMultiplePerZone: false,
  showHintsInPreview: true,
  fillText: '',
  blanks: [],
  wordBankEnabled: false,
  wordBankWords: '',
  caseSensitive: false,
});
const formatDate = (date) => (date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) : 'No activity yet');
const formatNotesType = (type) => NOTES_TYPES.find(([value]) => value === type)?.[1] || 'No notes yet';
const QUESTION_TYPE_LABEL = Object.fromEntries(QUESTION_TYPES);
const reorderList = (list, fromIndex, toIndex) => {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const extractYouTubeId = (url = '') => {
  const source = String(url).trim();
  const patterns = [/youtu\.be\/([^?&/]+)/i, /youtube\.com\/watch\?v=([^?&/]+)/i, /youtube\.com\/embed\/([^?&/]+)/i, /youtube\.com\/shorts\/([^?&/]+)/i];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
};

const getYouTubeThumbnail = (url = '') => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

const getCourseThumbnail = (course) => {
  const topic = course?.topics?.find((item) => getYouTubeThumbnail(item.videoUrl));
  return topic ? getYouTubeThumbnail(topic.videoUrl) : '';
};

const formatDifficultyLabel = (value = 'easy') => {
  if (value === 'mixed') return 'Mixed Levels';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const SECTION_META = {
  dashboard: { eyebrow: 'Instructor Command Center', title: 'Create polished learning journeys and monitor every learner touchpoint.', copy: 'A focused teaching workspace with dynamic course, quiz, and student analytics.' },
  courses: { eyebrow: 'Course Library', title: 'See every subject you own with live topic, quiz, and learner coverage.', copy: 'Each course card is connected to your current backend data.' },
  create: { eyebrow: 'Subject Builder', title: 'Start a clean course shell before adding topics, video lessons, and notes.', copy: 'You no longer need a manual thumbnail field for subjects.' },
  topics: { eyebrow: 'Content Studio', title: 'Organize the topic tree and attach lesson media with a better structure.', copy: 'Only the selected topic appears in the main workspace.' },
  quizzes: { eyebrow: 'Assessment Lab', title: 'Build adaptive quizzes with clear arrangements for every question type.', copy: 'MCQ, fill-in-the-blank, match, and drag-drop are all supported here.' },
  students: { eyebrow: 'Learner Monitor', title: 'Track every assigned learner with scores, weak topics, and activity data.', copy: 'The table is searchable and tied to your current instructor scope.' },
  analytics: { eyebrow: 'Performance Insights', title: 'Understand trends, weak topics, and progress with live visual reports.', copy: 'The charts below are driven by the current backend response.' },
  settings: { eyebrow: 'Instructor Settings', title: 'See your teaching scope and active gamification controls in one place.', copy: 'These settings explain what this role manages inside EduPortal.' },
};

function SectionHeader({ title, subtitle, action }) {
  return <div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>;
}

function Field({ label, children, full }) {
  return <label className={full ? 'field full' : 'field'}><span>{label}</span>{children}</label>;
}

const buildBlankPreview = (question) => {
  let preview = question.fillText || '';
  question.blanks.forEach((blank, index) => {
    const token = blank.label?.trim();
    if (!token) return;
    preview = preview.replace(token, `_____ ${index + 1}`);
  });
  return preview;
};

const buildBlankPreviewFromBackend = (question) => {
  const fillText = question.metadata?.fillText || question.metadata?.text || '';
  const blanks = question.metadata?.blanks || [];
  let preview = fillText;
  blanks.forEach((blank, index) => {
    const token = blank.label?.trim();
    if (!token) return;
    preview = preview.replace(token, `_____ ${index + 1}`);
  });
  return preview;
};

const getStudentCourseForPerformance = (student, selectedCourseId = '') => {
  const enrolledCourses = Array.isArray(student?.enrolledCourseDetails)
    ? student.enrolledCourseDetails.filter((course) => course?._id)
    : [];

  if (!enrolledCourses.length) return null;

  const selectedCourse = enrolledCourses.find((course) => String(course._id) === String(selectedCourseId));
  if (selectedCourse?.quizAttempts) {
    return selectedCourse;
  }

  return enrolledCourses.find((course) => (course.quizAttempts || 0) > 0)
    || selectedCourse
    || enrolledCourses[0];
};

const toPreviewItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      if (typeof item === 'string') {
        return { id: `${index}-${item}`, text: item };
      }

      if (item && typeof item === 'object') {
        return {
          id: item.id || `${index}-${item.text || item.label || 'item'}`,
          text: item.text || item.label || '',
        };
      }

      return null;
    })
    .filter((item) => item?.text);

const parseDelimitedValues = (value = '') =>
  String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

const parseMatchPairsFromText = (values = []) =>
  (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((entry, index) => {
      const pair = entry.split(/\s*(?:->|=>|=|:|-)\s*/);
      if (pair.length < 2) return null;

      const left = pair.shift()?.trim();
      const right = pair.join(' - ').trim();

      if (!left || !right) return null;

      return {
        left: { id: `left-${index}-${left}`, text: left },
        right: { id: `right-${index}-${right}`, text: right },
      };
    })
    .filter(Boolean);

const getMatchPreviewData = (question) => {
  const metadata = question.metadata || {};
  const leftItems = toPreviewItems(metadata.leftItems || metadata.matchLeft);
  const rightItems = toPreviewItems(metadata.rightItems || metadata.matchRight);

  if (leftItems.length || rightItems.length) {
    return { leftItems, rightItems };
  }

  const optionPairs = parseMatchPairsFromText(question.options || []);
  if (optionPairs.length) {
    return {
      leftItems: optionPairs.map((pair) => pair.left),
      rightItems: optionPairs.map((pair) => pair.right),
    };
  }

  const answerPairs = parseMatchPairsFromText(parseDelimitedValues(question.answer));
  return {
    leftItems: answerPairs.map((pair) => pair.left),
    rightItems: answerPairs.map((pair) => pair.right),
  };
};

const getDragDropPreviewItems = (question) => {
  const metadata = question.metadata || {};
  const directItems = toPreviewItems(metadata.items || metadata.dragItems);
  if (directItems.length) return directItems;

  const optionItems = toPreviewItems(question.options || []);
  if (optionItems.length) return optionItems;

  return toPreviewItems(parseDelimitedValues(question.answer));
};

const getFillBlankPreviewData = (question) => {
  const metadata = question.metadata || {};
  const previewText = buildBlankPreviewFromBackend(question)
    || metadata.fillText
    || metadata.text
    || question.prompt
    || '';

  const blanks = toPreviewItems(metadata.blanks);
  if (blanks.length) {
    return { previewText, blanks };
  }

  return {
    previewText,
    blanks: toPreviewItems(parseDelimitedValues(question.answer)),
  };
};

const sampleQuestionForType = (type, topicTitle = 'Programming Concepts') => {
  if (type === 'match') {
    const leftItems = [createMatchEntry('Variable'), createMatchEntry('Loop'), createMatchEntry('Function')];
    const rightItems = [createMatchEntry('Stores data'), createMatchEntry('Repeats code'), createMatchEntry('Reusable block')];
    return {
      ...makeQuestion('match'),
      prompt: `Match the following ${topicTitle.toLowerCase()} terms with their definitions.`,
      difficulty: 'medium',
      matchLeft: leftItems,
      matchRight: rightItems,
      matchPairs: [
        { leftId: leftItems[0].id, rightId: rightItems[0].id },
        { leftId: leftItems[1].id, rightId: rightItems[1].id },
        { leftId: leftItems[2].id, rightId: rightItems[2].id },
      ],
      randomizeRight: true,
    };
  }

  if (type === 'drag_drop') {
    return {
      ...makeQuestion('drag_drop'),
      prompt: 'Drag the following steps into the correct order to sort an array using Bubble Sort.',
      difficulty: 'hard',
      dragItems: [createDragItem('Compare adjacent elements'), createDragItem('Swap if needed'), createDragItem('Repeat until sorted')],
      dragZones: ['Correct order'],
      allowMultiplePerZone: true,
      showHintsInPreview: true,
    };
  }

  if (type === 'fill_blank') {
    return {
      ...makeQuestion('fill_blank'),
      prompt: 'Fill in the missing keyword.',
      difficulty: 'easy',
      fillText: 'A variable is used to store data in Python.',
      blanks: [createBlank('variable')],
      wordBankEnabled: true,
      wordBankWords: 'array, variable, object',
      caseSensitive: false,
    };
  }

  return {
    ...makeQuestion('mcq'),
    prompt: `Which statement about ${topicTitle.toLowerCase()} is correct?`,
    difficulty: 'easy',
    options: [
      createOption('It stores reusable logic.', true),
      createOption('It is only used for styling.', false),
      createOption('It is a database table.', false),
      createOption('It cannot accept input.', false),
    ],
  };
};

const buildQuestionForEditor = (question) => {
  if (question.type === 'match') {
    const leftItems = question.metadata?.matchLeft || question.metadata?.leftItems || [];
    const rightItems = question.metadata?.matchRight || question.metadata?.rightItems || [];
    return {
      ...makeQuestion('match'),
      prompt: question.prompt || '',
      difficulty: question.difficulty || 'easy',
      points: question.points || 10,
      matchLeft: leftItems.length ? leftItems : [createMatchEntry(''), createMatchEntry('')],
      matchRight: rightItems.length ? rightItems : [createMatchEntry(''), createMatchEntry('')],
      matchPairs: question.metadata?.pairs || question.metadata?.matchPairs || [],
      randomizeRight: question.metadata?.randomizeRight ?? true,
    };
  }

  if (question.type === 'drag_drop') {
    const dragItems = question.metadata?.dragItems || question.metadata?.items || [];
    return {
      ...makeQuestion('drag_drop'),
      prompt: question.prompt || '',
      difficulty: question.difficulty || 'easy',
      points: question.points || 10,
      dragItems: dragItems.length ? dragItems : [createDragItem(''), createDragItem('')],
      dragZones: question.metadata?.dropZones || question.metadata?.dragZones || [''],
      allowMultiplePerZone: question.metadata?.allowMultiplePerZone ?? false,
      showHintsInPreview: question.metadata?.showHintsInPreview ?? true,
    };
  }

  if (question.type === 'fill_blank') {
    const blanks = question.metadata?.blanks || [];
    const fillText = question.metadata?.fillText || question.metadata?.text || question.prompt || '';
    return {
      ...makeQuestion('fill_blank'),
      prompt: question.prompt || '',
      difficulty: question.difficulty || 'easy',
      points: question.points || 10,
      fillText: fillText,
      blanks: blanks.length ? blanks : [],
      wordBankEnabled: question.metadata?.wordBankEnabled ?? false,
      wordBankWords: question.metadata?.wordBankWords || '',
      caseSensitive: question.metadata?.caseSensitive ?? false,
    };
  }

  const options = question.metadata?.options?.length
    ? question.metadata.options
    : (question.options || []).map((option) => createOption(option, option === question.answer));

  return {
    ...makeQuestion('mcq'),
    prompt: question.prompt || '',
    difficulty: question.difficulty || 'easy',
    points: question.points || 10,
    options: options.length ? options : [createOption(''), createOption(''), createOption(''), createOption('')],
  };
};

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [section, setSection] = useState('dashboard');
  const [coursesView, setCoursesView] = useState('list');
  const [courseQuizFilter, setCourseQuizFilter] = useState('all');
  const [selectedCourseQuiz, setSelectedCourseQuiz] = useState(null);
  const [data, setData] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [courseForm, setCourseForm] = useState({ title: '', description: '', price: 499 });
  const [courseEditForm, setCourseEditForm] = useState({ title: '', description: '', price: 499 });
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: '', description: '' });
  const [contentForm, setContentForm] = useState({ description: '', videoUrl: '', notesType: 'none', notesTitle: '', notesUrl: '', notesOriginalName: '', notesContent: '', notesFile: null });
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [quizForm, setQuizForm] = useState({ courseId: '', topicId: '', title: '', status: 'published', adaptiveEnabled: true, enabledQuestionTypes: ['mcq', 'fill_blank', 'match', 'drag_drop'], questions: [makeQuestion()] });
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [quizWorkspaceType, setQuizWorkspaceType] = useState('mcq');
  const [editingQuizContext, setEditingQuizContext] = useState(null);
  const [courseReviewTopicId, setCourseReviewTopicId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [loadingStudentPerformance, setLoadingStudentPerformance] = useState(false);

  const showAlert = (title, text, icon = 'success') => Swal.fire({ title, text, icon, confirmButtonColor: '#14b8a6', background: isDark ? '#0a1220' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a' });
  const hasStudentQuizAttempts = Boolean(studentPerformance?.stats?.hasQuizAttempts);
  
  const loadDashboard = async () => {
    try {
      const response = await instructorAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      showAlert('Unable to load instructor panel', error.response?.data?.message || 'Something went wrong.', 'error');
    }
  };

  const loadStudentPerformance = async (student, courseId) => {
    setLoadingStudentPerformance(true);
    try {
      const response = await instructorAPI.getStudentPerformance(student._id, courseId);
      setSelectedStudent({ ...student, courseId });
      setStudentPerformance(response.data);
    } catch (error) {
      showAlert('Error', error.response?.data?.message || 'Failed to load student performance', 'error');
    } finally {
      setLoadingStudentPerformance(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!storedUser || !token || JSON.parse(storedUser).role !== 'instructor') {
      navigate('/login');
      return;
    }
    loadDashboard();
  }, [navigate]);

  useEffect(() => {
    if (!data?.courses?.length) return;
    setCourseId((current) => current || data.courses[0]._id);
    setQuizForm((current) => {
      const firstCourse = data.courses[0];
      return {
        ...current,
        courseId: current.courseId || firstCourse._id,
        topicId: current.topicId || firstCourse.topics[0]?._id || '',
      };
    });
  }, [data]);

  const selectedCourse = useMemo(() => data?.courses?.find((course) => course._id === courseId) || null, [data, courseId]);
  useEffect(() => {
    if (!selectedCourse) {
      setCourseEditForm({ title: '', description: '', price: 499 });
      setIsEditingCourse(false);
      return;
    }

    setCourseEditForm({
      title: selectedCourse.title || '',
      description: selectedCourse.description || '',
      price: selectedCourse.price ?? 499,
    });
    setIsEditingCourse(false);
  }, [selectedCourse?._id]);
  // Set topics when course changes
  useEffect(() => {
    if (!selectedCourse?.topics?.length) {
      setTopicId('');
      setCourseReviewTopicId('');
      return;
    }
    // For content studio - select first topic
    setTopicId((current) => selectedCourse.topics.some((topic) => topic._id === current) ? current : selectedCourse.topics[0]._id);
    // For quiz review - select first topic
    setCourseReviewTopicId((current) => selectedCourse.topics.some((topic) => topic._id === current) ? current : selectedCourse.topics[0]._id);
  }, [selectedCourse]);
  const selectedTopic = useMemo(() => selectedCourse?.topics?.find((topic) => topic._id === topicId) || null, [selectedCourse, topicId]);
  const selectedReviewTopic = useMemo(
    () => selectedCourse?.topics?.find((topic) => topic._id === courseReviewTopicId) || null,
    [selectedCourse, courseReviewTopicId]
  );
  const courseDetailQuizzes = useMemo(
    () => {
      if (!selectedReviewTopic) return [];
      
      return (selectedReviewTopic.quizzes || []).map((quiz) => ({
        ...quiz,
        topicId: selectedReviewTopic._id,
        topicTitle: selectedReviewTopic.title,
        questions: Array.isArray(quiz.questions) ? quiz.questions : [],
        enabledQuestionTypes: quiz.enabledQuestionTypes || [],
        primaryType: quiz.primaryType || 'mcq',
        questionTypes: quiz.questionTypes || [],
      }));
    },
    [selectedReviewTopic]
  );
  const filteredCourseDetailQuizzes = useMemo(
    () => {
      if (!courseDetailQuizzes?.length) {
        return [];
      }
      
      if (courseQuizFilter === 'all') {
        return courseDetailQuizzes;
      }

      // Filter quizzes that contain questions of the selected type
      return courseDetailQuizzes.filter((quiz) => {
        if (!quiz) return false;
        
        // Primary check: Look for questions with matching type
        if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
          const hasMatchingQuestion = quiz.questions.some(
            (q) => q && q.type === courseQuizFilter
          );
          if (hasMatchingQuestion) return true;
        }
        
        // Secondary check: Check enabledQuestionTypes array
        if (Array.isArray(quiz.enabledQuestionTypes)) {
          if (quiz.enabledQuestionTypes.includes(courseQuizFilter)) return true;
        }
        
        // Tertiary check: Check questionTypes array
        if (Array.isArray(quiz.questionTypes)) {
          if (quiz.questionTypes.includes(courseQuizFilter)) return true;
        }
        
        // Fallback: Check primaryType
        if (quiz.primaryType === courseQuizFilter) return true;
        
        return false;
      });
    },
    [courseDetailQuizzes, courseQuizFilter]
  );
  useEffect(() => {
    if (!selectedTopic) return;
    setContentForm({
      description: selectedTopic.description || '',
      videoUrl: selectedTopic.videoUrl || '',
      notesType: selectedTopic.notesType || 'none',
      notesTitle: selectedTopic.notesTitle || '',
      notesUrl: selectedTopic.notesUrl || '',
      notesOriginalName: selectedTopic.notesOriginalName || '',
      notesContent: selectedTopic.notesContent || '',
      notesFile: null,
    });
  }, [selectedTopic]);
  // When topic changes, reset quiz filter and selection
  useEffect(() => {
    setCourseQuizFilter('all');
    setSelectedCourseQuiz(null);
  }, [courseReviewTopicId]);

  // Auto-select a quiz when filtered list changes
  useEffect(() => {
    if (!filteredCourseDetailQuizzes?.length) {
      setSelectedCourseQuiz(null);
      return;
    }
    
    // If current quiz is still valid, keep it
    if (selectedCourseQuiz?._id && filteredCourseDetailQuizzes.some((q) => q._id === selectedCourseQuiz._id)) {
      return;
    }
    
    // Select first quiz with questions, or just first quiz
    const quizWithQuestions = filteredCourseDetailQuizzes.find(
      (quiz) => Array.isArray(quiz.questions) && quiz.questions.length > 0
    );
    setSelectedCourseQuiz(quizWithQuestions || filteredCourseDetailQuizzes[0]);
  }, [filteredCourseDetailQuizzes]);

  const selectedQuizCourse = useMemo(() => data?.courses?.find((course) => course._id === quizForm.courseId) || null, [data, quizForm.courseId]);
  const quizLibraryByType = useMemo(
    () =>
      (data?.quizInventory || []).filter((quiz) => quiz.primaryType === quizWorkspaceType),
    [data, quizWorkspaceType]
  );
  const isQuizFormValid = useMemo(() => {
    return !!(quizForm.courseId?.trim() && quizForm.topicId?.trim() && quizForm.title?.trim());
  }, [quizForm.courseId, quizForm.topicId, quizForm.title]);
  const filteredStudents = useMemo(() => {
    const list = data?.students || [];
    const search = studentSearch.trim().toLowerCase();
    return search ? list.filter((student) => student.name.toLowerCase().includes(search) || student.email.toLowerCase().includes(search)) : list;
  }, [data, studentSearch]);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const submitCourse = async (event) => {
    event.preventDefault();
    try {
      await instructorAPI.createCourse(courseForm);
      setCourseForm({ title: '', description: '', price: 499 });
      await loadDashboard();
      setSection('courses');
      setCoursesView('list');
      showAlert('Subject created', 'Your new subject is now available in My Courses.');
    } catch (error) { showAlert('Create subject failed', error.response?.data?.message || 'Could not create the subject.', 'error'); }
  };

  const submitCourseEdit = async (event) => {
    event.preventDefault();
    if (!selectedCourse?._id) return;

    try {
      await instructorAPI.updateCourse(selectedCourse._id, courseEditForm);
      await loadDashboard();
      setIsEditingCourse(false);
      showAlert('Course updated', 'Course title, description, and price were updated.');
    } catch (error) {
      showAlert('Update failed', error.response?.data?.message || 'Could not update the course.', 'error');
    }
  };

  const submitTopic = async (event) => {
    event.preventDefault();
    if (!courseId) return;
    try {
      await instructorAPI.addTopic(courseId, topicForm);
      setTopicForm({ title: '', description: '' });
      await loadDashboard();
      showAlert('Topic added', 'The topic has been added to the selected subject.');
    } catch (error) { showAlert('Add topic failed', error.response?.data?.message || 'Could not add the topic.', 'error'); }
  };

  const removeCourse = async (targetCourseId) => {
    const result = await Swal.fire({
      title: 'Delete this course?',
      text: 'All topics and quizzes inside this course will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: isDark ? '#0a1220' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
    });

    if (!result.isConfirmed) return;

    try {
      await instructorAPI.deleteCourse(targetCourseId);
      setCoursesView('list');
      await loadDashboard();
      showAlert('Course deleted', 'The course and its content were removed.');
    } catch (error) {
      showAlert('Delete failed', error.response?.data?.message || 'Could not delete the course.', 'error');
    }
  };

  const removeTopic = async (targetCourseId, targetTopicId) => {
    const result = await Swal.fire({
      title: 'Delete this topic?',
      text: 'The topic notes and quizzes under it will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: isDark ? '#0a1220' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
    });

    if (!result.isConfirmed) return;

    try {
      await instructorAPI.deleteTopic(targetCourseId, targetTopicId);
      await loadDashboard();
      showAlert('Topic deleted', 'The topic was removed from this course.');
    } catch (error) {
      showAlert('Delete failed', error.response?.data?.message || 'Could not delete the topic.', 'error');
    }
  };

  const removeQuiz = async (targetCourseId, targetTopicId, targetQuizId) => {
    const result = await Swal.fire({
      title: 'Delete this quiz?',
      text: 'This assessment will be removed from the topic.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: isDark ? '#0a1220' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
    });

    if (!result.isConfirmed) return;

    try {
      await instructorAPI.deleteQuiz(targetCourseId, targetTopicId, targetQuizId);
      await loadDashboard();
      showAlert('Quiz deleted', 'The quiz has been removed.');
    } catch (error) {
      showAlert('Delete failed', error.response?.data?.message || 'Could not delete the quiz.', 'error');
    }
  };

  const editQuizFromCourseDetail = (quiz) => {
    setEditingQuizContext({
      courseId: selectedCourse._id,
      topicId: quiz.topicId,
      quizId: quiz._id,
    });
    setQuizForm({
      courseId: selectedCourse._id,
      topicId: quiz.topicId,
      title: quiz.title,
      status: quiz.status || 'published',
      adaptiveEnabled: true,
      enabledQuestionTypes: quiz.questionTypes || [...new Set((quiz.questions || []).map((question) => question.type))],
      questions: (quiz.questions || []).map(buildQuestionForEditor),
    });
    setActiveQuestionIndex(0);
    setQuizWorkspaceType(quiz.questions?.[0]?.type || 'mcq');
    setSection('quizzes');
  };

  const submitContent = async (event) => {
    event.preventDefault();
    if (!courseId || !topicId || isSavingContent) return;
    setIsSavingContent(true);
    try {
      const formData = new FormData();
      formData.append('description', contentForm.description);
      formData.append('videoUrl', contentForm.videoUrl);
      formData.append('notesType', contentForm.notesType);
      formData.append('notesTitle', contentForm.notesTitle);
      formData.append('notesContent', contentForm.notesContent);
      if (contentForm.notesFile) {
        formData.append('notesFile', contentForm.notesFile);
      }
      await instructorAPI.updateTopicContent(courseId, topicId, formData);
      await loadDashboard();
      showAlert('Content updated', 'Video and notes are now attached to this topic.');
    } catch (error) { showAlert('Update failed', error.response?.data?.message || 'Could not update topic content.', 'error'); }
    finally { setIsSavingContent(false); }
  };

  const submitQuiz = async (event, nextStatus = 'published', nextAction = 'close') => {
    event.preventDefault();
    
    // Validate required fields
    if (!quizForm.courseId?.trim()) {
      showAlert('Quiz creation failed', 'Please select a course/subject', 'error');
      return;
    }
    if (!quizForm.topicId?.trim()) {
      showAlert('Quiz creation failed', 'Please select a topic', 'error');
      return;
    }
    if (!quizForm.title?.trim()) {
      showAlert('Quiz creation failed', 'Please enter a quiz title', 'error');
      return;
    }
    
    const payload = {
      ...quizForm,
      status: nextStatus,
      enabledQuestionTypes: [...new Set(quizForm.questions.map((question) => question.type))],
      questions: quizForm.questions.map((question) => {
        if (question.type === 'mcq') {
          return {
            prompt: question.prompt,
            type: question.type,
            difficulty: question.difficulty,
            points: question.points,
            imageUrl: question.imageUrl,
            codeSnippet: question.codeSnippet,
            options: question.options.map((option) => option.text).filter(Boolean),
            answer: question.options.find((option) => option.isCorrect)?.text || '',
            metadata: {
              options: question.options,
            },
          };
        }

        if (question.type === 'match') {
          return {
            prompt: question.prompt,
            type: question.type,
            difficulty: question.difficulty,
            points: question.points,
            answer: JSON.stringify(question.matchPairs),
            metadata: {
              matchLeft: question.matchLeft,
              matchRight: question.matchRight,
              pairs: question.matchPairs,
              randomizeRight: question.randomizeRight,
            },
          };
        }

        if (question.type === 'drag_drop') {
          return {
            prompt: question.prompt,
            type: question.type,
            difficulty: question.difficulty,
            points: question.points,
            answer: question.dragItems.map((item) => item.text).filter(Boolean).join(' | '),
            metadata: {
              dragItems: question.dragItems,
              dropZones: (question.dragZones || []).filter(Boolean),
              allowMultiplePerZone: question.allowMultiplePerZone || false,
              showHintsInPreview: question.showHintsInPreview,
            },
          };
        }

        return {
          prompt: question.prompt || question.fillText,
          type: question.type,
          difficulty: question.difficulty,
          points: question.points,
          answer: question.blanks.map((blank) => blank.answersText).join(' | '),
          metadata: {
            fillText: question.fillText,
            blanks: question.blanks,
            wordBankEnabled: question.wordBankEnabled,
            wordBankWords: question.wordBankWords,
            caseSensitive: question.caseSensitive,
          },
        };
      }),
    };
    try {
      const isUpdating = !!editingQuizContext?.quizId;
      
      if (editingQuizContext?.quizId) {
        await instructorAPI.updateQuiz(
          editingQuizContext.courseId,
          editingQuizContext.topicId,
          editingQuizContext.quizId,
          payload
        );
      } else {
        await instructorAPI.createQuiz(payload);
      }
      
      // Generate message based on question types
      const questionTypes = [...new Set(quizForm.questions.map((q) => q.type))];
      const typeLabels = questionTypes.map((type) => QUESTION_TYPE_LABEL[type] || type).join(', ');
      
      setQuizForm((current) => ({ ...current, title: nextAction === 'another' ? current.title : '', status: 'published', adaptiveEnabled: true, enabledQuestionTypes: ['mcq', 'fill_blank', 'match', 'drag_drop'], questions: [makeQuestion()] }));
      setEditingQuizContext(null);
      setActiveQuestionIndex(0);
      await loadDashboard();
      
      if (nextStatus === 'draft') {
        showAlert('Quiz saved as draft', 'Your quiz draft is stored and can be refined later.');
      } else {
        const actionLabel = isUpdating ? 'updated' : 'created';
        showAlert(
          isUpdating ? 'Quiz updated' : 'Quiz created',
          `${typeLabels} questions ${actionLabel}. Your adaptive quiz is ready for learners.`
        );
      }
      
      if (nextAction === 'close') setSection('dashboard');
    } catch (error) { showAlert('Quiz creation failed', error.response?.data?.message || 'Could not create the quiz.', 'error'); }
  };

  const updateQuestion = (index, field, value) => setQuizForm((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, [field]: value } : question) }));
  const patchQuestion = (index, updater) => setQuizForm((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? updater(question) : question) }));
  const activeQuestion = quizForm.questions[activeQuestionIndex] || quizForm.questions[0];
  const visibleQuestionIndexes = useMemo(
    () =>
      quizForm.questions.reduce((list, question, index) => {
        if (question.type === quizWorkspaceType) {
          list.push(index);
        }
        return list;
      }, []),
    [quizForm.questions, quizWorkspaceType]
  );
  useEffect(() => {
    if (activeQuestion?.type) {
      setQuizWorkspaceType(activeQuestion.type);
    }
  }, [activeQuestion?.type]);
  useEffect(() => {
    if (!visibleQuestionIndexes.length) return;
    if (!visibleQuestionIndexes.includes(activeQuestionIndex)) {
      setActiveQuestionIndex(visibleQuestionIndexes[0]);
    }
  }, [visibleQuestionIndexes, activeQuestionIndex]);
  const addQuestionOfType = (type = 'mcq') => {
    setQuizWorkspaceType(type);
    setQuizForm((current) => ({ ...current, questions: [...current.questions, makeQuestion(type)] }));
    setActiveQuestionIndex(quizForm.questions.length);
  };
  const addMatchPairRow = (index) => patchQuestion(index, (question) => ({ ...question, matchLeft: [...question.matchLeft, createMatchEntry('')], matchRight: [...question.matchRight, createMatchEntry('')] }));
  const addDragItemRow = (index) => patchQuestion(index, (question) => ({ ...question, dragItems: [...question.dragItems, createDragItem('')] }));
  const addDropZoneRow = (index) => patchQuestion(index, (question) => ({ ...question, dragZones: [...question.dragZones, ''] }));
  const addBlankFromSelection = (index, token) => patchQuestion(index, (question) => question.blanks.some((blank) => blank.label === token) ? question : ({ ...question, blanks: [...question.blanks, createBlank(token)] }));
  const removeBlank = (index, blankId) => patchQuestion(index, (question) => ({ ...question, blanks: question.blanks.filter((blank) => blank.id !== blankId) }));
  const fillWordCandidates = useMemo(() => {
    if (!activeQuestion?.fillText) return [];
    return activeQuestion.fillText.match(/\b[\w-]+\b/g) || [];
  }, [activeQuestion]);
  const previewRightItems = activeQuestion?.type === 'match' && activeQuestion.randomizeRight ? [...activeQuestion.matchRight].sort((a, b) => a.text.localeCompare(b.text)) : activeQuestion?.matchRight || [];
  const metrics = [
    { label: 'Total Courses', value: data?.stats?.totalCourses ?? 0, icon: FiBookOpen, tone: 'teal', hint: 'Subjects you currently manage' },
    { label: 'Total Students', value: data?.stats?.totalStudents ?? 0, icon: FiUsers, tone: 'blue', hint: 'Learners assigned to you' },
    { label: 'Total Quizzes', value: data?.stats?.totalQuizzes ?? 0, icon: FiActivity, tone: 'gold', hint: 'Assessments built across topics' },
    { label: 'Avg Performance', value: `${data?.stats?.averagePerformance ?? 0}%`, icon: FiTrendingUp, tone: 'purple', hint: 'Average learner performance' },
  ];
  const topicVideoThumbnail = getYouTubeThumbnail(contentForm.videoUrl);
  const sectionMeta = SECTION_META[section];

  return (
    <div className={`dashboard instructor-studio ${isDark ? 'dark' : 'light'}`}>
      <div className="dash-shell">
        <DashboardSidebar brand="ED" roleLabel="Instructor" profileName={data?.instructor?.name || 'Instructor'} profileEmail={data?.instructor?.email || 'Loading...'} sections={SECTIONS} activeSection={section} onSectionChange={setSection} onToggleTheme={toggleTheme} onLogout={handleLogout} themeLabel={isDark ? 'Switch to Light' : 'Switch to Dark'} />
        <main className="dash-shell-main">
          <motion.section className={`workspace-banner ${section === 'dashboard' ? 'is-dashboard' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key={`banner-${section}`}>
            <div><p className="dash-shell-eyebrow">{sectionMeta.eyebrow}</p><h2>{sectionMeta.title}</h2><p className="workspace-copy">{sectionMeta.copy}</p></div>
            <div className="workspace-banner-aside"><span>Active workspace</span><strong>{SECTIONS.find((item) => item.key === section)?.label}</strong><p>Only the selected module is shown in the main content area so the layout stays clean and focused.</p></div>
          </motion.section>
          {section === 'dashboard' && (
            <>
              <motion.section className="metrics-grid" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</motion.section>
              <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <article className="panel panel-span-8">
                  <SectionHeader title="Recent Courses" subtitle="Live subject cards with topic coverage, learner load, and quick management." action={<button className="ghost-btn" onClick={() => setSection('create')}><FiPlus size={14} />Create Subject</button>} />
                  <div className="course-grid">
                    {(data?.recentCourses || []).map((course) => {
                      const thumbnail = getCourseThumbnail(course);
                      return (
                        <div key={course._id} className="course-card-clean">
                          <div className="course-card-media">{thumbnail ? <img src={thumbnail} alt={course.title} /> : <div className="course-card-fallback">{course.title.slice(0, 2)}</div>}</div>
                          <div className="course-card-head"><div><strong>{course.title}</strong><p>{course.description || 'No description yet.'}</p></div></div>
                          <div className="course-tags"><span>{course.topicCount} topics</span><span>{course.enrolledStudents} students</span><span>{course.quizCount} quizzes</span></div>
                          <button className="inline-link-btn" onClick={() => { setCourseId(course._id); setSection('topics'); }}>Manage subject<FiChevronRight size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="panel panel-span-4">
                  <SectionHeader title="Quick Actions" subtitle="Move directly into your next instructor task." />
                  <div className="action-stack">
                    <button onClick={() => setSection('create')}>Create New Subject</button>
                    <button onClick={() => setSection('topics')}>Upload Video & Notes</button>
                    <button onClick={() => setSection('quizzes')}>Create New Quiz</button>
                    <button onClick={() => setSection('students')}>Monitor Students</button>
                  </div>
                </article>
                <article className="panel panel-span-6">
                  <SectionHeader title="Adaptive Flow" subtitle="The smart quiz progression currently configured for learners." />
                  <div className="adaptive-grid">{(data?.gamification?.adaptiveFlow || []).map((step, index) => <div key={step} className="adaptive-card"><div className="adaptive-number">{index + 1}</div><p>{step}</p></div>)}</div>
                </article>
                <article className="panel panel-span-6">
                  <SectionHeader title="Gamified Question Types" subtitle="Interactive formats that can be enabled while building quizzes." />
                  <div className="question-type-grid">{QUESTION_TYPES.map(([value, label]) => <div key={value} className="type-card"><strong>{label}</strong><p>{QUESTION_HELP[value].guidance}</p></div>)}</div>
                </article>
              </motion.section>
            </>
          )}

          {section === 'courses' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="courses">
              {coursesView === 'list' && (
                <article className="panel panel-span-12">
                  <SectionHeader title="My Courses" subtitle="Choose a course to open its full details on a separate workspace." />
                  <div className="course-grid">
                    {(data?.courses || []).map((course) => {
                      const thumbnail = getCourseThumbnail(course);
                      return (
                        <div key={course._id} className="course-card-clean">
                          <div className="course-card-media">{thumbnail ? <img src={thumbnail} alt={course.title} /> : <div className="course-card-fallback">{course.title.slice(0, 2)}</div>}</div>
                          <div className="course-card-head"><div><strong>{course.title}</strong><p>{course.description || 'No description yet.'}</p></div></div>
                          <div className="course-tags"><span>{course.topicCount} topics</span><span>{course.enrolledStudents} students</span><span>{course.quizCount} quizzes</span></div>
                          <button className="inline-link-btn" onClick={() => { setCourseId(course._id); setCoursesView('detail'); }}>Open Course Details<FiChevronRight size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              )}
              {coursesView === 'detail' && (
                <article className="panel panel-span-12">
                  {selectedCourse ? (
                    <div className="course-detail-stack">
                      <SectionHeader title="Course Detail" subtitle="Everything inside this course is organized here only after opening it." action={<button className="ghost-btn" onClick={() => setCoursesView('list')}>Back to Courses</button>} />
                      <div className="course-detail-hero">
                        <div className="course-detail-media">{getCourseThumbnail(selectedCourse) ? <img src={getCourseThumbnail(selectedCourse)} alt={selectedCourse.title} /> : <div className="course-card-fallback">{selectedCourse.title.slice(0, 2)}</div>}</div>
                        <div className="course-detail-copy">
                          <p className="dash-shell-eyebrow">Course Detail</p>
                          {isEditingCourse ? (
                            <form className="form-grid-clean" onSubmit={submitCourseEdit}>
                              <Field label="Course Title"><input value={courseEditForm.title} onChange={(e) => setCourseEditForm((current) => ({ ...current, title: e.target.value }))} placeholder="Python Programming" /></Field>
                              <Field label="Price (INR)"><input type="number" min="0" value={courseEditForm.price} onChange={(e) => setCourseEditForm((current) => ({ ...current, price: e.target.value }))} placeholder="499" /></Field>
                              <Field label="Description" full><textarea value={courseEditForm.description} onChange={(e) => setCourseEditForm((current) => ({ ...current, description: e.target.value }))} placeholder="Tell students what they will learn in this subject." /></Field>
                              <div className="detail-action-row">
                                <button type="submit" className="primary-btn-clean">Save Course</button>
                                <button type="button" className="ghost-btn" onClick={() => setIsEditingCourse(false)}>Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <h3>{selectedCourse.title}</h3>
                              <p>{selectedCourse.description || 'No description yet.'}</p>
                              <div className="course-tags"><span>{selectedCourse.topicCount} topics</span><span>{selectedCourse.enrolledStudents} students</span><span>{selectedCourse.quizCount} quizzes</span><span>₹{selectedCourse.price ?? 499}</span></div>
                              <div className="detail-action-row">
                                <button className="ghost-btn" onClick={() => setIsEditingCourse(true)}>Edit Course</button>
                                <button className="ghost-btn" onClick={() => { setSection('topics'); }}>Open Content Studio</button>
                                <button className="danger-btn" onClick={() => removeCourse(selectedCourse._id)}><FiTrash2 size={14} />Delete Course</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="topic-detail-list">
                        {selectedCourse.topics.map((topic) => (
                          <div key={topic._id} className="topic-detail-card">
                            <div className="topic-detail-head">
                              <div>
                                <strong>{topic.title}</strong>
                                <p>{topic.description || 'No topic description yet.'}</p>
                              </div>
                              <div className="detail-action-row">
                                <button className="ghost-btn" onClick={() => { setCourseId(selectedCourse._id); setTopicId(topic._id); setSection('topics'); }}>Edit Topic</button>
                                <button className="danger-btn" onClick={() => removeTopic(selectedCourse._id, topic._id)}><FiTrash2 size={14} />Delete</button>
                              </div>
                            </div>
                            <div className="course-tags"><span>{topic.notesTitle || 'No notes title'}</span><span>{topic.quizCount} quizzes</span>{topic.notesUrl ? <span>Notes file uploaded</span> : <span>No file yet</span>}</div>
                            {topic.notesUrl ? <a className="inline-link-btn" href={topic.notesUrl} target="_blank" rel="noreferrer">Open Notes File<FiExternalLink size={14} /></a> : null}
                          </div>
                        ))}
                      </div>
                      <div className="course-quiz-review">
                        <SectionHeader title="Quiz Review" subtitle="Choose a topic first, then review only the quizzes and questions attached to that topic." />
                        <div className="type-switcher">{(selectedCourse.topics || []).map((topic) => <button key={topic._id} type="button" className={`type-switch-pill ${courseReviewTopicId === topic._id ? 'active' : ''}`} onClick={() => setCourseReviewTopicId(topic._id)}>{topic.title}</button>)}</div>
                        <div className="type-switcher">{[['all', 'All'], ...QUESTION_TYPES].map(([value, label]) => <button key={value} type="button" className={`type-switch-pill ${courseQuizFilter === value ? 'active' : ''}`} onClick={() => setCourseQuizFilter(value)}>{label}</button>)}</div>
                        <div className="quiz-review-layout">
                          <div className="quiz-review-list">
                            {courseReviewTopicId && filteredCourseDetailQuizzes?.length ? (
                              filteredCourseDetailQuizzes.map((quiz) => (
                                <button 
                                  key={quiz._id} 
                                  type="button" 
                                  className={`question-tab ${selectedCourseQuiz?._id === quiz._id ? 'active' : ''}`} 
                                  onClick={() => setSelectedCourseQuiz(quiz)}
                                >
                                  <span>{quiz.title}</span>
                                  <small>{quiz.topicTitle} • {QUESTION_TYPE_LABEL[quiz.primaryType] || quiz.primaryType} • {quiz.questionCount || 0} questions</small>
                                </button>
                              ))
                            ) : courseReviewTopicId ? (
                              <div className="empty-state-box">No quizzes found for this question type yet.</div>
                            ) : (
                              <div className="empty-state-box">Select a topic first to view quizzes.</div>
                            )}
                          </div>
                          <div className="preview-card">
                            {selectedCourseQuiz ? (
                              <div className="preview-student-shell">
                                <div className="preview-card-head"><strong>{selectedCourseQuiz.title}</strong><span>{selectedCourseQuiz.topicTitle}</span></div>
                                <div className="course-tags"><span>{QUESTION_TYPE_LABEL[selectedCourseQuiz.primaryType] || selectedCourseQuiz.primaryType}</span><span>{formatDifficultyLabel(selectedCourseQuiz.difficulty)}</span><span>{selectedCourseQuiz.status}</span></div>
                                {(selectedCourseQuiz.questions || []).length > 0 ? (
                                  (selectedCourseQuiz.questions || []).map((question, index) => {
                                    const mcqOptions = toPreviewItems(question.metadata?.options || question.options || []);
                                    const matchPreview = getMatchPreviewData(question);
                                    const dragItems = getDragDropPreviewItems(question);
                                    const fillBlankPreview = getFillBlankPreviewData(question);

                                    return (
                                      <div key={question._id || `${selectedCourseQuiz._id}-${index}`} className="question-read-card">
                                        <strong>{index + 1}. {question.prompt || fillBlankPreview.previewText || 'Untitled question'}</strong>
                                        <p>{QUESTION_TYPE_LABEL[question.type]}</p>
                                        <div className="course-tags"><span>{formatDifficultyLabel(question.difficulty || 'easy')}</span><span>{question.points || 10} pts</span></div>
                                        {question.type === 'mcq' && (
                                          mcqOptions.length ? (
                                            <div className="preview-choice-list">
                                              {mcqOptions.map((option) => (
                                                <div key={option.id} className="preview-choice">
                                                  <span>{option.text}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : <div className="empty-state-box">No answer choices were saved for this MCQ yet.</div>
                                        )}
                                        {question.type === 'match' && (
                                          matchPreview.leftItems.length || matchPreview.rightItems.length ? (
                                            <div className="preview-match-grid">
                                              <div>
                                                {matchPreview.leftItems.map((item) => (
                                                  <div key={item.id} className="preview-pill">
                                                    {item.text}
                                                  </div>
                                                ))}
                                              </div>
                                              <div>
                                                {matchPreview.rightItems.map((item) => (
                                                  <div key={item.id} className="preview-pill alt">
                                                    {item.text}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : <div className="empty-state-box">No matching pairs were saved for this question yet.</div>
                                        )}
                                        {question.type === 'drag_drop' && (
                                          dragItems.length ? (
                                            <div className="preview-chip-row">
                                              {dragItems.map((item) => (
                                                <div key={item.id} className="preview-pill">
                                                  {item.text}
                                                </div>
                                              ))}
                                            </div>
                                          ) : <div className="empty-state-box">No drag-and-drop items were saved for this question yet.</div>
                                        )}
                                        {question.type === 'fill_blank' && (
                                          <div className="preview-fill-shell">
                                            <p>{fillBlankPreview.previewText || 'Blank preview here'}</p>
                                            {fillBlankPreview.blanks.length ? (
                                              <div className="preview-chip-row">
                                                {fillBlankPreview.blanks.map((blank) => (
                                                  <div key={blank.id} className="preview-pill">
                                                    {blank.text}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="empty-state-box">No blank answers were saved for this question yet.</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="empty-state-box">This quiz has no questions yet. Click "Edit Quiz" to add questions.</div>
                                )}
                                <div className="detail-action-row">
                                  <button className="ghost-btn" onClick={() => editQuizFromCourseDetail(selectedCourseQuiz)}>Edit Quiz</button>
                                  <button className="danger-btn" onClick={() => removeQuiz(selectedCourse._id, selectedCourseQuiz.topicId, selectedCourseQuiz._id)}><FiTrash2 size={14} />Delete Quiz</button>
                                </div>
                              </div>
                            ) : <div className="empty-state-box">Choose a quiz to read its full questions here.</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : <div className="empty-state-box">Select a course from the course list first.</div>}
                </article>
              )}
            </motion.section>
          )}

          {section === 'create' && (
            <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="create">
              <SectionHeader title="Create Subject" subtitle="Create the subject shell first. Video thumbnails will come automatically from YouTube links inside topics." />
              <form className="form-grid-clean" onSubmit={submitCourse}>
                <Field label="Course Title"><input value={courseForm.title} onChange={(e) => setCourseForm((current) => ({ ...current, title: e.target.value }))} placeholder="Python Programming" /></Field>
                <Field label="Price (INR)"><input type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm((current) => ({ ...current, price: e.target.value }))} placeholder="499" /></Field>
                <Field label="Description" full><textarea value={courseForm.description} onChange={(e) => setCourseForm((current) => ({ ...current, description: e.target.value }))} placeholder="Tell students what they will learn in this subject." /></Field>
                <button type="submit" className="primary-btn-clean">Create Subject</button>
              </form>
            </motion.section>
          )}

          {section === 'topics' && (
            <motion.section className="split-layout" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="topics">
              <article className="panel">
                <SectionHeader title="Course Structure" subtitle="Choose a subject, see its topic tree, and add new chapters." />
                <select className="field-control" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  {(data?.courses || []).map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
                </select>
                <div className="topic-tree-clean">
                  {selectedCourse?.topics?.map((topic, index) => (
                    <button key={topic._id} className={`topic-item ${topicId === topic._id ? 'active' : ''}`} onClick={() => setTopicId(topic._id)}>
                      <div><span>{topic.title}</span><small>Topic {index + 1}</small></div>
                      <small>{topic.quizCount} quizzes</small>
                    </button>
                  ))}
                </div>
                <form className="stack-form-clean" onSubmit={submitTopic}>
                  <h4>Add Topic</h4>
                  <Field label="Topic Title"><input value={topicForm.title} onChange={(e) => setTopicForm((current) => ({ ...current, title: e.target.value }))} placeholder="Variables" /></Field>
                  <Field label="Topic Description"><textarea value={topicForm.description} onChange={(e) => setTopicForm((current) => ({ ...current, description: e.target.value }))} placeholder="What should students learn in this topic?" /></Field>
                  <button type="submit" className="primary-btn-clean">Add Topic</button>
                </form>
              </article>
              <article className="panel">
                <SectionHeader title="Content Studio" subtitle="Only the selected topic is shown here so video, notes, and resources stay properly arranged." />
                {selectedTopic ? (
                  <div className="content-studio-grid">
                    <form className="stack-form-clean" onSubmit={submitContent}>
                      <Field label="Topic Description"><textarea value={contentForm.description} onChange={(e) => setContentForm((current) => ({ ...current, description: e.target.value }))} placeholder="Describe the learning outcome for this topic." /></Field>
                      <Field label="YouTube / Video URL"><div className="icon-field"><FiVideo size={16} /><input value={contentForm.videoUrl} onChange={(e) => setContentForm((current) => ({ ...current, videoUrl: e.target.value }))} placeholder="Paste a YouTube link or hosted video URL" /></div></Field>
                      <div className="form-grid-clean">
                        <Field label="Notes Type"><select value={contentForm.notesType} onChange={(e) => setContentForm((current) => ({ ...current, notesType: e.target.value }))}>{NOTES_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                        <Field label="Notes Title"><input value={contentForm.notesTitle} onChange={(e) => setContentForm((current) => ({ ...current, notesTitle: e.target.value }))} placeholder="Loops quick revision notes" /></Field>
                      </div>
                      <Field label="Notes File Upload">
                        <div className="upload-field">
                          <div className="icon-field">
                            <FiPaperclip size={16} />
                            <input
                              type="file"
                              accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) =>
                                setContentForm((current) => ({
                                  ...current,
                                  notesFile: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>
                          <small className="upload-hint">Upload PDF, PPT, PPTX, DOC, or DOCX. Files are stored in Cloudinary from your backend.</small>
                        </div>
                      </Field>
                      <Field label="Notes Summary / Rich Text"><div className="icon-field icon-field-top"><FiFileText size={16} /><textarea value={contentForm.notesContent} onChange={(e) => setContentForm((current) => ({ ...current, notesContent: e.target.value }))} placeholder="Add rich notes, summary points, study instructions, or reference text." /></div></Field>
                      <button type="submit" className="primary-btn-clean" disabled={isSavingContent}>{isSavingContent ? 'Saving Content...' : 'Save Topic Content'}</button>
                    </form>
                    <div className="studio-preview-stack">
                      <div className="preview-card">
                        <div className="preview-card-head"><strong>Video Preview</strong><span>YouTube thumbnail is automatic</span></div>
                        {topicVideoThumbnail ? <div className="video-preview-tile"><img src={topicVideoThumbnail} alt={selectedTopic.title} /><div><strong>{selectedTopic.title}</strong><p>{contentForm.videoUrl}</p></div></div> : <div className="empty-state-box">Add a YouTube link to show its thumbnail preview here.</div>}
                      </div>
                      <div className="preview-card">
                        <div className="preview-card-head"><strong>Notes Setup</strong><span>{formatNotesType(contentForm.notesType)}</span></div>
                        <div className="resource-list">
                          <div className="resource-card"><strong>{contentForm.notesTitle || 'Untitled notes resource'}</strong><p>{contentForm.notesFile ? `Ready to upload: ${contentForm.notesFile.name}` : contentForm.notesUrl ? `Uploaded file: ${contentForm.notesOriginalName || 'Notes file available'}` : 'No notes file uploaded yet.'}</p>{contentForm.notesUrl ? <a href={contentForm.notesUrl} target="_blank" rel="noreferrer">Open uploaded file<FiExternalLink size={14} /></a> : null}</div>
                          <div className="resource-card"><strong>Notes Summary</strong><p>{contentForm.notesContent || 'Rich text summary or study instructions will appear here.'}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : <div className="empty-state-box">Create or select a topic to manage its learning content.</div>}
              </article>
            </motion.section>
          )}
          {section === 'quizzes' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="quizzes">
              <article className="panel panel-span-4">
                <SectionHeader title="Quiz Studio" subtitle="Choose one question type and work on it separately." />
                <div className="type-studio-stack">
                  {QUESTION_TYPES.map(([value, label]) => (
                    <button key={value} type="button" className={`type-studio-card ${quizWorkspaceType === value ? 'active' : ''}`} onClick={() => { setQuizWorkspaceType(value); if (!visibleQuestionIndexes.length) addQuestionOfType(value); }}>
                      <strong>{label}</strong>
                      <p>{QUESTION_HELP[value].guidance}</p>
                    </button>
                  ))}
                </div>
                <SectionHeader title="Existing Quizzes" subtitle="Library filtered to the selected question type." />
                <div className="quiz-list-clean">
                  {quizLibraryByType.map((quiz) => <div key={quiz._id} className="quiz-card-clean"><div><strong>{quiz.title}</strong><p>{quiz.courseTitle} / {quiz.topicTitle}</p></div><div className="course-tags"><span>{QUESTION_TYPE_LABEL[quiz.primaryType] || quiz.primaryType}</span><span>{quiz.status || 'published'}</span><span>{quiz.questionCount} questions</span></div></div>)}
                </div>
              </article>
              <article className="panel panel-span-8">
                <SectionHeader title={`${QUESTION_TYPE_LABEL[quizWorkspaceType]} Builder`} subtitle="This workspace only shows the fields needed for the selected question type." />
                <form className="stack-form-clean" onSubmit={submitQuiz}>
                  <div className="form-grid-clean quiz-header-grid">
                    <Field label="Subject"><select value={quizForm.courseId} onChange={(e) => { const nextCourseId = e.target.value; const nextCourse = data?.courses?.find((course) => course._id === nextCourseId); setQuizForm((current) => ({ ...current, courseId: nextCourseId, topicId: nextCourse?.topics?.[0]?._id || '' })); }}><option value="">-- Select a course --</option>{(data?.courses || []).map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}</select></Field>
                    <Field label="Topic"><select value={quizForm.topicId} onChange={(e) => setQuizForm((current) => ({ ...current, topicId: e.target.value }))}><option value="">-- Select a topic --</option>{(selectedQuizCourse?.topics || []).map((topic) => <option key={topic._id} value={topic._id}>{topic.title}</option>)}</select></Field>
                    <Field label="Quiz Title" full><input value={quizForm.title} onChange={(e) => setQuizForm((current) => ({ ...current, title: e.target.value }))} placeholder="Variables Mastery Check" /></Field>
                  </div>
                  <label className="inline-check"><input type="checkbox" checked={quizForm.adaptiveEnabled} onChange={(e) => setQuizForm((current) => ({ ...current, adaptiveEnabled: e.target.checked }))} /><span>Enable AI adaptive difficulty</span></label>
                  <div className="question-builder-shell">
                    <div className="question-nav">
                      {visibleQuestionIndexes.map((index) => <button key={`tab-${index}`} type="button" className={`question-tab ${activeQuestionIndex === index ? 'active' : ''}`} onClick={() => setActiveQuestionIndex(index)}><span>Question {index + 1}</span><small>{QUESTION_TYPE_LABEL[quizForm.questions[index].type]}</small></button>)}
                      <button type="button" className="ghost-btn" onClick={() => addQuestionOfType(quizWorkspaceType)}><FiPlus size={14} />Add {QUESTION_TYPE_LABEL[quizWorkspaceType]} Question</button>
                    </div>

                    {activeQuestion && activeQuestion.type === quizWorkspaceType ? (
                      <div className="question-workspace">
                        <div className="question-editor">
                          <div className="question-box">
                            <div className="question-box-head">
                              <strong>Question {activeQuestionIndex + 1}</strong>
                              {quizForm.questions.length > 1 ? <button type="button" className="text-action" onClick={() => { setQuizForm((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== activeQuestionIndex) })); setActiveQuestionIndex((current) => Math.max(0, current - 1)); }}>Remove</button> : null}
                            </div>
                            <div className="question-note"><strong>{QUESTION_HELP[quizWorkspaceType].label}</strong><p>{QUESTION_HELP[quizWorkspaceType].guidance}</p></div>
                            <div className="form-grid-clean compact-form-grid">
                              <Field label="Question Text" full><textarea value={activeQuestion.prompt} onChange={(e) => updateQuestion(activeQuestionIndex, 'prompt', e.target.value)} placeholder="Enter the learner-facing question prompt" /></Field>
                              <Field label="Difficulty"><select value={activeQuestion.difficulty} onChange={(e) => updateQuestion(activeQuestionIndex, 'difficulty', e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
                              <Field label="Points"><input type="number" min="1" value={activeQuestion.points} onChange={(e) => updateQuestion(activeQuestionIndex, 'points', Number(e.target.value) || 10)} /></Field>
                            </div>

                            <div className="question-action-row">
                              <button type="button" className="ghost-btn" onClick={() => patchQuestion(activeQuestionIndex, () => sampleQuestionForType(activeQuestion.type, selectedQuizCourse?.topics?.find((topic) => topic._id === quizForm.topicId)?.title))}>Generate Sample Question</button>
                            </div>

                            {quizWorkspaceType === 'mcq' && (
                              <div className="builder-section">
                                <SectionHeader title="MCQ Options" subtitle="Four choices with a single correct answer." />
                                <div className="option-stack">
                                  {activeQuestion.options.map((option, optionIndex) => <div key={option.id} className="option-row"><input value={option.text} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, text: e.target.value } : item) }))} placeholder={`Option ${optionIndex + 1}`} /><label className="inline-check"><input type="radio" name={`correct-${activeQuestionIndex}`} checked={option.isCorrect} onChange={() => patchQuestion(activeQuestionIndex, (question) => ({ ...question, options: question.options.map((item, itemIndex) => ({ ...item, isCorrect: itemIndex === optionIndex })) }))} /><span>Mark as correct</span></label></div>)}
                                </div>
                              </div>
                            )}

                            {quizWorkspaceType === 'match' && (
                              <div className="builder-section">
                                <SectionHeader title="Match the Following" subtitle="Create terms, definitions, and their correct pairings." action={<button type="button" className="ghost-btn" onClick={() => addMatchPairRow(activeQuestionIndex)}><FiPlus size={14} />Add Pair</button>} />
                                <div className="dual-list-grid">
                                  <div>
                                    <p className="mini-label">Left Column Items</p>
                                    <div className="dynamic-list">
                                      {activeQuestion.matchLeft.map((item, itemIndex) => <div key={item.id} className="dynamic-row" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', JSON.stringify({ list: 'left', fromIndex: itemIndex }))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const payload = JSON.parse(event.dataTransfer.getData('text/plain')); if (payload.list !== 'left') return; patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchLeft: reorderList(question.matchLeft, payload.fromIndex, itemIndex) })); }}><input value={item.text} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchLeft: question.matchLeft.map((entry, index) => index === itemIndex ? { ...entry, text: e.target.value } : entry) }))} placeholder="Variable" /><button type="button" className="text-action" onClick={() => patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchLeft: question.matchLeft.filter((_, index) => index !== itemIndex) }))}>Remove</button></div>)}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mini-label">Right Column Items</p>
                                    <div className="dynamic-list">
                                      {activeQuestion.matchRight.map((item, itemIndex) => <div key={item.id} className="dynamic-row" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', JSON.stringify({ list: 'right', fromIndex: itemIndex }))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const payload = JSON.parse(event.dataTransfer.getData('text/plain')); if (payload.list !== 'right') return; patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchRight: reorderList(question.matchRight, payload.fromIndex, itemIndex) })); }}><input value={item.text} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchRight: question.matchRight.map((entry, index) => index === itemIndex ? { ...entry, text: e.target.value } : entry) }))} placeholder="Stores data" /><button type="button" className="text-action" onClick={() => patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchRight: question.matchRight.filter((_, index) => index !== itemIndex) }))}>Remove</button></div>)}
                                    </div>
                                  </div>
                                </div>
                                <div className="pair-grid">
                                  {activeQuestion.matchLeft.map((leftItem, pairIndex) => <div key={`${leftItem.id}-${pairIndex}`} className="pair-row"><span>{leftItem.text || `Left item ${pairIndex + 1}`}</span><select value={activeQuestion.matchPairs[pairIndex]?.rightId || ''} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, matchPairs: question.matchLeft.map((item, index) => ({ leftId: item.id, rightId: index === pairIndex ? e.target.value : (question.matchPairs[index]?.rightId || '') })) }))}><option value="">Select matching definition</option>{activeQuestion.matchRight.map((rightItem) => <option key={rightItem.id} value={rightItem.id}>{rightItem.text || 'Untitled definition'}</option>)}</select></div>)}
                                </div>
                                <label className="inline-check"><input type="checkbox" checked={activeQuestion.randomizeRight} onChange={(e) => updateQuestion(activeQuestionIndex, 'randomizeRight', e.target.checked)} /><span>Randomize right column</span></label>
                              </div>
                            )}

                            {quizWorkspaceType === 'drag_drop' && (
                              <div className="builder-section">
                                <SectionHeader title="Drag & Drop" subtitle="Arrange draggable cards in the correct order." action={<button type="button" className="ghost-btn" onClick={() => addDragItemRow(activeQuestionIndex)}><FiPlus size={14} />Add More Items</button>} />
                                <div className="dynamic-list">
                                  {activeQuestion.dragItems.map((item, itemIndex) => <div key={item.id} className="drag-item-editor" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(itemIndex))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const fromIndex = Number(event.dataTransfer.getData('text/plain')); patchQuestion(activeQuestionIndex, (question) => ({ ...question, dragItems: reorderList(question.dragItems, fromIndex, itemIndex) })); }}><input value={item.text} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, dragItems: question.dragItems.map((entry, index) => index === itemIndex ? { ...entry, text: e.target.value } : entry) }))} placeholder="Compare adjacent elements" /><button type="button" className="text-action" onClick={() => patchQuestion(activeQuestionIndex, (question) => ({ ...question, dragItems: question.dragItems.filter((_, index) => index !== itemIndex) }))}>Remove</button></div>)}
                                </div>
                                <label className="inline-check"><input type="checkbox" checked={activeQuestion.showHintsInPreview} onChange={(e) => updateQuestion(activeQuestionIndex, 'showHintsInPreview', e.target.checked)} /><span>Show hints in preview</span></label>
                              </div>
                            )}

                            {quizWorkspaceType === 'fill_blank' && (
                              <div className="builder-section">
                                <SectionHeader title="Fill in the Blanks" subtitle="Enter the sentence or paragraph, then click words below to turn them into blanks." />
                                <Field label="Full Sentence / Paragraph"><textarea value={activeQuestion.fillText} onChange={(e) => updateQuestion(activeQuestionIndex, 'fillText', e.target.value)} placeholder="A variable is used to store data in Python." /></Field>
                                <div className="word-selector"><p className="mini-label">Click words to convert them into blanks</p><div className="chip-cloud">{fillWordCandidates.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} type="button" className={`word-chip ${activeQuestion.blanks.some((blank) => blank.label === word) ? 'active' : ''}`} onClick={() => addBlankFromSelection(activeQuestionIndex, word)}>{word}</button>)}</div></div>
                                <div className="dynamic-list">
                                  {activeQuestion.blanks.map((blank) => <div key={blank.id} className="dynamic-row"><span>{blank.label}</span><input value={blank.answersText} onChange={(e) => patchQuestion(activeQuestionIndex, (question) => ({ ...question, blanks: question.blanks.map((item) => item.id === blank.id ? { ...item, answersText: e.target.value } : item) }))} placeholder="Enter one or more accepted answers" /><button type="button" className="text-action" onClick={() => removeBlank(activeQuestionIndex, blank.id)}>Remove</button></div>)}
                                </div>
                                <div className="toggle-grid-clean">
                                  <label className="inline-check"><input type="checkbox" checked={activeQuestion.wordBankEnabled} onChange={(e) => updateQuestion(activeQuestionIndex, 'wordBankEnabled', e.target.checked)} /><span>Enable word bank</span></label>
                                  <label className="inline-check"><input type="checkbox" checked={activeQuestion.caseSensitive} onChange={(e) => updateQuestion(activeQuestionIndex, 'caseSensitive', e.target.checked)} /><span>Case-sensitive answers</span></label>
                                </div>
                                {activeQuestion.wordBankEnabled ? <Field label="Word Bank"><input value={activeQuestion.wordBankWords} onChange={(e) => updateQuestion(activeQuestionIndex, 'wordBankWords', e.target.value)} placeholder="array, variable, object" /></Field> : null}
                              </div>
                            )}
                          </div>
                        </div>

                        <aside className="question-preview-pane">
                          <div className="preview-card">
                            <div className="preview-card-head"><strong>Live Preview</strong><span>{QUESTION_TYPE_LABEL[activeQuestion.type]}</span></div>
                            <div className="preview-student-shell">
                              <div className="preview-meta"><span>{activeQuestion.difficulty}</span><span>{activeQuestion.points} pts</span></div>
                              <h4>{activeQuestion.prompt || 'Your question text will appear here.'}</h4>
                              {activeQuestion.imageUrl ? <img className="preview-image" src={activeQuestion.imageUrl} alt="Question preview" /> : null}
                              {activeQuestion.codeSnippet ? <pre className="preview-code">{activeQuestion.codeSnippet}</pre> : null}

                              {activeQuestion.type === 'mcq' ? <div className="preview-choice-list">{activeQuestion.options.map((option) => <label key={option.id} className="preview-choice"><input type="radio" disabled /><span>{option.text || 'Option text'}</span></label>)}</div> : null}
                              {activeQuestion.type === 'match' ? <div className="preview-match-grid"><div>{activeQuestion.matchLeft.map((item) => <div key={item.id} className="preview-pill">{item.text || 'Term'}</div>)}</div><div>{previewRightItems.map((item) => <div key={item.id} className="preview-pill alt">{item.text || 'Definition'}</div>)}</div></div> : null}
                              {activeQuestion.type === 'drag_drop' ? <div className="preview-drag-shell"><div className="preview-chip-row">{activeQuestion.dragItems.map((item) => <div key={item.id} className="preview-pill">{item.text || 'Drag item'}</div>)}</div><div className="preview-zones">{(activeQuestion.dragZones.filter(Boolean).length ? activeQuestion.dragZones.filter(Boolean) : ['Correct order']).map((zone, zoneIndex) => <div key={`${zone}-${zoneIndex}`} className="preview-zone"><strong>{zone}</strong><span>{activeQuestion.showHintsInPreview ? 'Drop cards here' : ' '}</span></div>)}</div></div> : null}
                              {activeQuestion.type === 'fill_blank' ? <div className="preview-fill-shell"><p>{buildBlankPreview(activeQuestion) || 'Your text preview with blanks appears here.'}</p>{activeQuestion.wordBankEnabled ? <div className="preview-chip-row">{activeQuestion.wordBankWords.split(',').map((word) => word.trim()).filter(Boolean).map((word) => <div key={word} className="preview-pill">{word}</div>)}</div> : null}</div> : null}
                            </div>
                          </div>
                        </aside>
                      </div>
                    ) : <div className="empty-state-box">Start this builder by adding a {QUESTION_TYPE_LABEL[quizWorkspaceType]} question.</div>}
                  </div>
                  <div className="quiz-save-bar">
                    <button type="button" className="ghost-btn" disabled={!isQuizFormValid} onClick={(event) => submitQuiz(event, 'draft', 'stay')}>Save as Draft</button>
                    <button type="button" className="ghost-btn" disabled={!isQuizFormValid} onClick={(event) => submitQuiz(event, 'published', 'another')}>Save & Add Another</button>
                    <button type="button" className="primary-btn-clean" disabled={!isQuizFormValid} onClick={(event) => submitQuiz(event, 'published', 'close')}>Save & Close</button>
                  </div>
                </form>
              </article>
            </motion.section>
          )}

          {section === 'students' && (
            <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="students">
              {!selectedStudent ? (
                <>
                  <SectionHeader title="Students" subtitle="Searchable roster of learners assigned to this instructor." />
                  <label className="search-bar-clean"><FiSearch size={18} /><input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search by name or email" /></label>
                  <div className="table-wrap-clean">
                    <table className="clean-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Enrolled Courses</th><th>Overall Score</th><th>Weak Topics</th><th>Last Active</th><th></th></tr></thead>
                      <tbody>{filteredStudents.map((student) => {
                        const performanceCourse = getStudentCourseForPerformance(student, courseId);
                        return (
                        <tr key={student._id} style={{ cursor: performanceCourse ? 'pointer' : 'default' }} onClick={() => performanceCourse && loadStudentPerformance(student, performanceCourse._id)}>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.enrolledCourses.join(', ') || 'No courses yet'}</td>
                          <td>{student.overallScore}%</td>
                          <td>{student.weakTopics.join(', ')}</td>
                          <td>{formatDate(student.lastActive)}</td>
                          <td>{performanceCourse && <FiChevronRight size={18} color="#14b8a6" />}</td>
                        </tr>
                      )})}</tbody>
                    </table>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <button className="ghost-btn" onClick={() => { setSelectedStudent(null); setStudentPerformance(null); }} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FiArrowLeft /> Back to Students
                    </button>
                  </div>
                  
                  {loadingStudentPerformance ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <p>Loading performance data...</p>
                    </div>
                  ) : studentPerformance ? (
                    <div className="content-grid">
                      {/* Student Header */}
                      <article className="panel panel-span-12" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h3>{studentPerformance.student.name}</h3>
                            <p style={{ color: '#94a3b8', margin: '8px 0 0' }}>{studentPerformance.student.email}</p>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0' }}>Course: {studentPerformance.course.title}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#14b8a6', lineHeight: '1' }}>
                              {studentPerformance.stats.overallScore}%
                            </div>
                            <p style={{ color: '#94a3b8', margin: '8px 0 0', fontSize: '14px' }}>
                              Overall Score
                            </p>
                          </div>
                        </div>
                      </article>

                      {/* Stats Cards */}
                      <article className="panel panel-span-12" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                          <div style={{ padding: '15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{studentPerformance.stats.strongTopics}</div>
                            <p style={{ color: '#10b981', fontSize: '12px', margin: '4px 0 0' }}>Strong Topics</p>
                          </div>
                          <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{studentPerformance.stats.weakTopics}</div>
                            <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>Weak Topics</p>
                          </div>
                          <div style={{ padding: '15px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{studentPerformance.stats.avgTopics}</div>
                            <p style={{ color: '#f59e0b', fontSize: '12px', margin: '4px 0 0' }}>Average Topics</p>
                          </div>
                          <div style={{ padding: '15px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{studentPerformance.stats.quizAttempts}</div>
                            <p style={{ color: '#3b82f6', fontSize: '12px', margin: '4px 0 0' }}>Quiz Attempts</p>
                          </div>
                        </div>
                      </article>

                      {/* Bar Chart - Topic vs Score */}
                      <article className="panel panel-span-8">
                        <SectionHeader title="📊 Topic Mastery (Bar Chart)" subtitle="Shows score for each topic. Red = Weak (<60%), Green = Strong (>75%)" />
                        <div className="chart-frame">
                          {studentPerformance.performance.topicAnalysis.length ? (
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart data={studentPerformance.performance.topicAnalysis}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                                <XAxis dataKey="topicTitle" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
                                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                                  formatter={(value) => `${value}%`}
                                />
                                <Bar 
                                  dataKey="score" 
                                  radius={[10, 10, 0, 0]}
                                  fill="#14b8a6"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="empty-state-box">No topic performance is available yet.</div>
                          )}
                        </div>
                      </article>

                      {/* Pie Chart - Strong vs Weak Ratio */}
                      <article className="panel panel-span-4">
                        <SectionHeader title="🥧 Topic Ratio (Pie Chart)" subtitle="Strong vs Weak vs Average distribution" />
                        <div className="chart-frame">
                          {studentPerformance.performance.pieChartData.length ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={studentPerformance.performance.pieChartData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) => `${name}: ${value}`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {studentPerformance.performance.pieChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} topics`} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="empty-state-box">No topic rating is available until the student attempts quizzes.</div>
                          )}
                        </div>
                      </article>

                      {/* Line Chart - Performance Over Time */}
                      <article className="panel panel-span-12">
                        <SectionHeader title="📈 Performance Progress (Line Chart)" subtitle="Student performance progression over quiz attempts" />
                        <div className="chart-frame">
                          {studentPerformance.performance.timelineVisualization.length ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={studentPerformance.performance.timelineVisualization}>
                                <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                                <XAxis dataKey="label" stroke="#94a3b8" label={{ value: 'Quiz Attempt #', position: 'insideBottomRight', offset: -5 }} />
                                <YAxis stroke="#94a3b8" domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', border: '1px solid #cbd5e1' }}
                                  formatter={(value) => `${value}%`}
                                  labelFormatter={(label) => `Attempt ${label}`}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="#14b8a6" 
                                  strokeWidth={2}
                                  dot={{ fill: '#14b8a6', r: 5 }}
                                  activeDot={{ r: 7 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="empty-state-box">No performance progression is available until the student submits quiz attempts.</div>
                          )}
                        </div>
                      </article>

                      {/* Detailed Topic Analysis */}
                      <article className="panel panel-span-12">
                        <SectionHeader title="📋 Detailed Topic Analysis" subtitle="Complete breakdown of each topic" />
                        <div style={{ overflowX: 'auto' }}>
                          <table className="clean-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Topic</th>
                                <th>Score</th>
                                <th>Latest Score</th>
                                <th>Attempts</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentPerformance.performance.topicAnalysis.map((topic) => (
                                <tr key={topic.topicId}>
                                  <td>{topic.topicTitle}</td>
                                  <td>
                                    <strong>{topic.score}%</strong>
                                  </td>
                                  <td>{topic.latestScore}%</td>
                                  <td>{topic.attempts}</td>
                                  <td>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      borderRadius: '20px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: topic.status === 'strong' ? '#10b981' : topic.status === 'weak' ? '#ef4444' : '#f59e0b',
                                      backgroundColor: topic.status === 'strong' ? 'rgba(16, 185, 129, 0.1)' : topic.status === 'weak' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    }}>
                                      {topic.status === 'strong' ? '✓ Strong' : topic.status === 'weak' ? '⚠ Weak' : '~ Average'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </motion.section>
          )}

          {section === 'ratings' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="ratings">
              <article className="panel panel-span-12">
                <SectionHeader
                  title="Ratings & Feedback"
                  subtitle="Student reviews, comments, and course ratings for your subjects."
                />
                <InstructorRatingsView />
              </article>
            </motion.section>
          )}

          {section === 'analytics' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="analytics">
              <article className="panel panel-span-6">
                <SectionHeader title="Performance Trend" subtitle="Average performance trend across your subjects." />
                <div className="chart-frame"><ResponsiveContainer width="100%" height={280}><LineChart data={data?.analytics?.performanceTrend || []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" /><XAxis dataKey="label" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Legend /><Line type="monotone" dataKey="performance" stroke="#14b8a6" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
              </article>
              <article className="panel panel-span-6">
                <SectionHeader title="Topic Weakness" subtitle="Topic clusters where learners need reinforcement." />
                <div className="chart-frame"><ResponsiveContainer width="100%" height={280}><BarChart data={data?.analytics?.topicWeakness || []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" /><XAxis dataKey="topic" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Legend /><Bar dataKey="weaknessScore" fill="#f59e0b" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </article>
              <article className="panel panel-span-12">
                <SectionHeader title="Student Progress Overview" subtitle="Snapshot of learner progress across your active cohort." />
                <div className="chart-frame"><ResponsiveContainer width="100%" height={300}><BarChart data={data?.analytics?.progressOverview || []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" /><XAxis dataKey="name" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Legend /><Bar dataKey="progress" fill="#38bdf8" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </article>
            </motion.section>
          )}


          {section === 'settings' && (
            <motion.section className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} key="settings">
              <article className="panel panel-span-6">
                <SectionHeader title="Gamification Controls" subtitle="Question types you can include in adaptive quizzes." />
                <div className="question-type-grid">{QUESTION_TYPES.map(([value, label]) => <div key={value} className="type-card"><strong>{label}</strong><p>{QUESTION_HELP[value].guidance}</p></div>)}</div>
              </article>
              <article className="panel panel-span-6">
                <SectionHeader title="Instructor Scope" subtitle="Clear role boundaries inside EduPortal." />
                <div className="rule-list-clean"><div>Create courses, topics, notes, videos, and quizzes.</div><div>Monitor student progress and weakness areas in real time.</div><div>Enable adaptive question types for richer assessments.</div><div>Does not control super-admin or platform-wide settings.</div></div>
              </article>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  );
}
