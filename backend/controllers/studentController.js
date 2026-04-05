const crypto = require('crypto');
const https = require('https');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Rating = require('../models/Rating');
const User = require('../models/User');

const QUESTION_LABELS = {
  mcq: 'MCQ',
  fill_blank: 'Fill in the blanks',
  match: 'Match the following',
  drag_drop: 'Drag & Drop',
};

const PAYMENT_REQUIRED_MESSAGE = 'You have already used your free course. Please purchase to continue.';

const getConfigValue = (key) => String(process.env[key] || '').split('#')[0].trim();

const getPrimaryQuestionType = (quiz = {}) => {
  const firstQuestionType = quiz.questions?.find((question) => question?.type)?.type;
  if (firstQuestionType) return firstQuestionType;

  if (Array.isArray(quiz.enabledQuestionTypes) && quiz.enabledQuestionTypes.length) {
    return quiz.enabledQuestionTypes[0];
  }

  return 'mcq';
};

const normalizeQuestion = (question = {}) => ({
  _id: question._id,
  prompt: question.prompt,
  type: question.type || 'mcq',
  options: Array.isArray(question.options) ? question.options : [],
  answer: question.answer || '',
  difficulty: question.difficulty || 'easy',
  points: question.points || 10,
  metadata: question.metadata && typeof question.metadata === 'object' ? question.metadata : {},
});

const normalizeQuiz = (quiz = {}, topic = {}, course = {}) => ({
  _id: quiz._id,
  title: quiz.title,
  topicId: topic._id,
  topicTitle: topic.title,
  courseId: course._id,
  courseTitle: course.title,
  difficulty: quiz.difficulty || 'easy',
  adaptiveEnabled: quiz.adaptiveEnabled !== false,
  primaryType: getPrimaryQuestionType(quiz),
  enabledQuestionTypes: Array.isArray(quiz.enabledQuestionTypes) ? quiz.enabledQuestionTypes : [],
  questionCount: quiz.questions?.length || 0,
  questions: (quiz.questions || []).map(normalizeQuestion),
});

const hashString = (value = '') => {
  let hash = 0;
  const normalized = String(value);

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const getCourseLevel = (topicCount) => {
  if (topicCount >= 8) return 'Advanced';
  if (topicCount >= 4) return 'Intermediate';
  return 'Beginner';
};

const buildTopicUnlockState = (topics, enrollment) => {
  if (!topics.length) return [];

  const completed = new Set((enrollment?.completedTopics || []).map(String));
  const unlockedCount = Math.max(1, completed.size + 1);

  return topics.map((topic, index) => ({
    _id: topic._id,
    title: topic.title,
    description: topic.description,
    videoUrl: topic.videoUrl,
    notesTitle: topic.notesTitle,
    notesType: topic.notesType,
    notesUrl: topic.notesUrl,
    notesContent: topic.notesContent,
    isLocked: !enrollment ? index > 0 : index >= unlockedCount,
    isCompleted: completed.has(String(topic._id)),
    quizCount: topic.quizzes.length,
  }));
};

const attachTopicQuizzes = (course, unlockedTopics) =>
  (unlockedTopics || []).map((topic) => {
    const sourceTopic = course?.topics?.find((entry) => String(entry._id) === String(topic._id));

    return {
      ...topic,
      quizzes: (sourceTopic?.quizzes || [])
        .filter((quiz) => quiz.status !== 'draft')
        .map((quiz) => normalizeQuiz(quiz, sourceTopic, course)),
    };
  });

const getNextLearningTopic = (topics = [], currentTopicId = null) => {
  if (!topics.length) return null;

  const currentIndex = topics.findIndex((topic) => String(topic._id) === String(currentTopicId));

  if (currentIndex >= 0) {
    const nextIncompleteTopic = topics.slice(currentIndex + 1).find((topic) => !topic.isLocked && !topic.isCompleted);
    if (nextIncompleteTopic) return nextIncompleteTopic;
  }

  return topics.find((topic) => !topic.isLocked && !topic.isCompleted)
    || topics.find((topic) => !topic.isLocked)
    || topics[0]
    || null;
};

const mapCourseCard = (course, instructor, enrollment) => ({
  _id: course._id,
  title: course.title,
  description: course.description,
  price: Number(course.price || 0),
  instructorName: instructor?.name || 'Instructor',
  instructorEmail: instructor?.email || '',
  level: getCourseLevel(course.topics.length),
  category: 'Programming',
  language: 'English',
  rating: Number((3.8 + ((hashString(course.title) % 12) / 10)).toFixed(1)),
  duration: `${Math.max(2, course.topics.length * 2)} hrs`,
  topicCount: course.topics.length,
  quizCount: course.topics.reduce((sum, topic) => sum + (topic.quizzes?.length || 0), 0),
  previewTopics: course.topics.slice(0, 3).map((topic) => topic.title),
  thumbnail: course.topics.find((topic) => topic.videoUrl)?.videoUrl || '',
  enrolled: Boolean(enrollment),
  progress: enrollment?.progress || 0,
  enrolledAt: enrollment?.enrolledAt || null,
  paymentStatus: enrollment?.paymentStatus || null,
});

const createEnrollmentData = (course, overrides = {}) => ({
  student: overrides.student,
  course: course._id,
  currentTopic: course.topics[0]?._id || null,
  progress: 0,
  xp: overrides.xp ?? 120,
  streakDays: overrides.streakDays ?? 1,
  paymentStatus: overrides.paymentStatus || 'free',
  paymentAmount: overrides.paymentAmount ?? 0,
  paymentOrderId: overrides.paymentOrderId || '',
  paymentId: overrides.paymentId || '',
});

const requestRazorpay = (path, method, payload = null) => {
  const razorpayKeyId = getConfigValue('RAZORPAY_KEY_ID');
  const razorpayKeySecret = getConfigValue('RAZORPAY_KEY_SECRET');

  if (!razorpayKeyId || !razorpayKeySecret) {
    return Promise.reject(new Error('Razorpay keys are missing. Add valid test keys in backend/.env.'));
  }

  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;

    const request = https.request(
      {
        hostname: 'api.razorpay.com',
        path,
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const parsed = data ? JSON.parse(data) : {};

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }

          reject(new Error(parsed.error?.description || parsed.error?.reason || 'Razorpay request failed'));
        });
      }
    );

    request.on('error', reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
};

const buildPaymentPayload = (course, razorpayOrder) => {
  const price = Number(course?.price || 0);
  const amount = Math.max(0, Math.round(price * 100));

  return {
    orderId: razorpayOrder.id,
    amount,
    currency: 'INR',
    key: getConfigValue('RAZORPAY_KEY_ID'),
    courseTitle: course?.title || 'Course',
    description: course?.description || '',
  };
};

const getTopicTitleFromCourse = (course, topicId) =>
  course?.topics?.find((topic) => String(topic._id) === String(topicId))?.title || 'Topic';

const buildReceiptId = (courseId, userId) => {
  const shortCourseId = String(courseId || '').slice(-8);
  const shortUserId = String(userId || '').slice(-8);
  const timestamp = Date.now().toString().slice(-8);

  return `edu_${shortCourseId}_${shortUserId}_${timestamp}`.slice(0, 40);
};

const syncStudentPerformanceScore = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId })
    .select('quizResults')
    .lean();

  const allScores = enrollments.flatMap((enrollment) =>
    (enrollment.quizResults || []).map((result) => Number(result.score || 0))
  );

  const performanceScore = allScores.length
    ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
    : 0;

  await User.findByIdAndUpdate(studentId, { performanceScore });

  return performanceScore;
};

const buildLeaderboard = async (studentId) => {
  const students = await User.find({ role: 'student', isActive: true })
    .select('name createdAt')
    .lean();

  const enrollments = await Enrollment.find({
    student: { $in: students.map((student) => student._id) },
  })
    .select('student quizResults')
    .lean();

  const scoreMap = new Map();

  students.forEach((student) => {
    scoreMap.set(String(student._id), []);
  });

  enrollments.forEach((enrollment) => {
    const key = String(enrollment.student);
    const scores = (enrollment.quizResults || []).map((result) => Number(result.score || 0));
    scoreMap.set(key, [...(scoreMap.get(key) || []), ...scores]);
  });

  const rankedStudents = students
    .map((student) => {
      const scores = scoreMap.get(String(student._id)) || [];
      const averageScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      return {
        _id: student._id,
        name: student.name,
        score: averageScore,
        createdAt: student.createdAt,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    })
    .slice(0, 8);

  return rankedStudents.map((student, index) => ({
    _id: student._id,
    name: student.name,
    score: student.score || 0,
    rank: index + 1,
    isCurrentUser: String(student._id) === String(studentId),
  }));
};

const buildPracticeLibrary = (course, unlockedTopics) => {
  if (!course) return [];

  const unlockedTopicIds = new Set(
    (unlockedTopics || [])
      .filter((topic) => !topic.isLocked)
      .map((topic) => String(topic._id))
  );

  return course.topics
    .filter((topic) => unlockedTopicIds.has(String(topic._id)))
    .flatMap((topic) =>
      (topic.quizzes || [])
        .filter((quiz) => quiz.status !== 'draft')
        .map((quiz) => ({
          _id: quiz._id,
          title: quiz.title,
          topicId: topic._id,
          topicTitle: topic.title,
          courseId: course._id,
          courseTitle: course.title,
          difficulty: quiz.difficulty || 'easy',
          adaptiveEnabled: quiz.adaptiveEnabled !== false,
          primaryType: getPrimaryQuestionType(quiz),
          questionCount: quiz.questions?.length || 0,
          questions: (quiz.questions || []).map(normalizeQuestion),
        }))
    );
};

exports.submitCourseRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, feedback } = req.body;

    // Validate input
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    // Check enrollment and completion
    const enrollment = await Enrollment.findOne({
      student: req.userId,
      course: courseId,
      $or: [
        { status: 'completed' },
        { progress: { $gte: 100 } },
      ],
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must complete the course before rating it',
      });
    }

    // Upsert rating (one per student per course)
    const ratingDoc = await Rating.findOneAndUpdate(
      { student: req.userId, course: courseId },
      { 
        student: req.userId, 
        course: courseId, 
        rating, 
        feedback: feedback?.trim() || '' 
      },
      { upsert: true, new: true }
    ).lean();

    res.status(201).json({
      success: true,
      message: ratingDoc._id ? 'Rating updated successfully' : 'Rating submitted successfully',
      rating: ratingDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit rating',
    });
  }
};


const calculatePerformanceMetrics = (enrollments, courses) => {
  const coursePerformanceMap = new Map();
  const topicPerformanceMap = new Map();
  const difficultyPerformanceMap = { easy: [], medium: [], hard: [] };
  const allScores = [];
  const performanceTrendData = [];
  const timelineData = [];

  const courseMap = new Map(courses.map((c) => [String(c._id), c]));

  enrollments.forEach((enrollment) => {
    const courseId = String(enrollment.course);
    const course = courseMap.get(courseId);

    if (!enrollment.quizResults || enrollment.quizResults.length === 0) {
      return;
    }

    const courseResults = enrollment.quizResults;
    const topicTitleMap = new Map((course?.topics || []).map((topic) => [String(topic._id), topic.title || 'Topic']));
    const courseScores = courseResults.map((r) => r.score || 0);
    const courseAvg = courseScores.reduce((a, b) => a + b, 0) / courseScores.length;

    coursePerformanceMap.set(courseId, {
      courseTitle: course?.title || 'Course',
      averageScore: Math.round(courseAvg),
      attemptCount: courseResults.length,
      bestScore: Math.max(...courseScores),
      latestScore: courseResults[courseResults.length - 1].score || 0,
    });

    courseResults.forEach((result) => {
      const topicId = String(result.topicId);
      const score = result.score || 0;

      allScores.push(score);

      if (!topicPerformanceMap.has(topicId)) {
        topicPerformanceMap.set(topicId, {
          topicTitle: topicTitleMap.get(topicId) || result.topicTitle || 'Topic',
          scores: [],
          attempts: 0,
        });
      }

      const topicData = topicPerformanceMap.get(topicId);
      topicData.scores.push(score);
      topicData.attempts += 1;

      if (result.highestDifficultyReached) {
        difficultyPerformanceMap[result.highestDifficultyReached].push(score);
      }

      timelineData.push({
        date: new Date(result.completedAt),
        score,
        topicTitle: topicTitleMap.get(topicId) || result.topicTitle || 'Quiz',
        difficulty: result.highestDifficultyReached || 'easy',
      });
    });
  });

  // Convert topic performance to array and calculate metrics
  const topicAnalysisData = Array.from(topicPerformanceMap.entries()).map(([topicId, data]) => ({
    topicId,
    topicTitle: data.topicTitle,
    mastery: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    attempts: data.attempts,
    improvement: data.scores.length > 1 ? data.scores[data.scores.length - 1] - data.scores[0] : 0,
  }));

  // Sort timeline data by date
  timelineData.sort((a, b) => a.date - b.date);

  // Create performance trend by course
  const performanceTrend = Array.from(coursePerformanceMap.entries()).map(([courseId, data]) => ({
    label: data.courseTitle,
    score: data.averageScore,
    attempts: data.attemptCount,
    best: data.bestScore,
  }));

  // Create difficulty progress
  const difficultyProgress = {
    easy: difficultyPerformanceMap.easy.length
      ? Math.round(difficultyPerformanceMap.easy.reduce((a, b) => a + b, 0) / difficultyPerformanceMap.easy.length)
      : 0,
    medium: difficultyPerformanceMap.medium.length
      ? Math.round(difficultyPerformanceMap.medium.reduce((a, b) => a + b, 0) / difficultyPerformanceMap.medium.length)
      : 0,
    hard: difficultyPerformanceMap.hard.length
      ? Math.round(difficultyPerformanceMap.hard.reduce((a, b) => a + b, 0) / difficultyPerformanceMap.hard.length)
      : 0,
  };

  // Calculate overall performance score
  const overallScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  // Create timeline visualization (last 10 attempts)
  const timelineVisualization = timelineData.slice(-10).map((item, index) => ({
    label: `Attempt ${index + 1}`,
    score: item.score,
    topic: item.topicTitle,
    difficulty: item.difficulty,
  }));

  // Find strengths and weaknesses
  const strengths = topicAnalysisData
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)
    .map((t) => t.topicTitle);
  const weaknesses = topicAnalysisData
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((t) => t.topicTitle);

  return {
    overallScore,
    performanceTrend,
    topicAnalysis: topicAnalysisData.sort((a, b) => b.mastery - a.mastery),
    difficultyProgress,
    timelineVisualization,
    quizAttempts: allScores.length,
    strengths,
    weaknesses,
  };
};

exports.getDashboard = async (req, res) => {
  try {
    const student = await User.findById(req.userId).lean();

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const [courses, enrollments, leaderboard] = await Promise.all([
      Course.find({})
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 })
        .lean()
        .limit(20),
      Enrollment.find({ student: req.userId })
        .populate('course', 'title instructor topics.length')
        .sort({ updatedAt: -1 })
        .lean(),
      buildLeaderboard(req.userId),
    ]);

    const enrollmentMap = new Map(enrollments.map((entry) => [String(entry.course._id), entry]));
    const discoverCourses = courses.map((course) =>
      mapCourseCard(course, course.instructor, enrollmentMap.get(String(course._id)))
    );

    const myCourses = discoverCourses.filter((course) => course.enrolled);
    const activeCourse = courses.find((course) => enrollmentMap.has(String(course._id))) || courses[0] || null;
    const activeEnrollment = activeCourse ? enrollmentMap.get(String(activeCourse._id)) : null;
    const unlockedTopics = activeCourse
      ? buildTopicUnlockState(activeCourse.topics, activeEnrollment)
      : [];
    const learningTopics = activeCourse ? attachTopicQuizzes(activeCourse, unlockedTopics) : [];

    const totalXP = enrollments.reduce((sum, entry) => sum + (entry.xp || 0), 0);
    const streakDays = enrollments.reduce((max, entry) => Math.max(max, entry.streakDays || 0), 0);
    const totalProgress = myCourses.length
      ? Math.round(myCourses.reduce((sum, course) => sum + course.progress, 0) / myCourses.length)
      : 0;

    // Calculate real performance metrics from quiz results
    const performanceMetrics = calculatePerformanceMetrics(enrollments, courses);

    const badges = [
      { title: 'Fast Starter', unlocked: myCourses.length > 0, description: 'Enrolled in your first course.' },
      { title: 'Focused Learner', unlocked: totalProgress >= 40, description: 'Reached 40% overall progress.' },
      { title: 'Consistency Streak', unlocked: streakDays >= 3, description: 'Stayed active for multiple days.' },
      { title: 'Quiz Master', unlocked: performanceMetrics.quizAttempts >= 5, description: 'Completed 5 or more quizzes.' },
      { title: 'High Achiever', unlocked: performanceMetrics.overallScore >= 80, description: 'Scored 80% or higher overall.' },
    ];

    const recommendedPractice = learningTopics.slice(0, 4).map((topic, index) => ({
      topicId: topic._id,
      topicTitle: topic.title,
      suggestedType: ['mcq', 'match', 'fill_blank', 'drag_drop'][index % 4],
      difficulty:
        performanceMetrics.overallScore < 40
          ? 'easy'
          : performanceMetrics.overallScore <= 70
            ? 'medium'
            : 'hard',
    }));
    const practiceLibrary = buildPracticeLibrary(activeCourse, learningTopics);

    res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        performanceScore: performanceMetrics.overallScore,
        freeCourseUsed: Boolean(student.freeCourseUsed),
      },
      stats: {
        enrolledCourses: myCourses.length,
        completedCourses: enrollments.filter((entry) => entry.status === 'completed').length,
        streakDays: streakDays || 1,
        totalXP,
        overallProgress: totalProgress,
        quizAttempts: performanceMetrics.quizAttempts,
      },
      discoverCourses,
      myCourses,
      learning: activeCourse
        ? {
            courseId: activeCourse._id,
            courseTitle: activeCourse.title,
            instructorName: activeCourse.instructor?.name || 'Instructor',
            topics: learningTopics,
            currentTopic: getNextLearningTopic(learningTopics, activeEnrollment?.currentTopic),
          }
        : null,
      practice: {
        recommended: recommendedPractice,
        library: practiceLibrary,
        types: Object.entries(QUESTION_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
      achievements: badges,
      leaderboard,
      analytics: {
        performanceTrend: performanceMetrics.performanceTrend,
        topicAnalysis: performanceMetrics.topicAnalysis,
        difficultyProgress: performanceMetrics.difficultyProgress,
        timelineVisualization: performanceMetrics.timelineVisualization,
        strengths: performanceMetrics.strengths,
        weaknesses: performanceMetrics.weaknesses,
      },
      assistant: {
        prompts: [
          'Explain loops in simple words',
          'Give me 3 quick questions on variables',
          'Summarize this topic before quiz time',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load student dashboard',
    });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const [course, enrollment] = await Promise.all([
      Course.findById(req.params.courseId).populate('instructor', 'name email').lean(),
      Enrollment.findOne({ student: req.userId, course: req.params.courseId }).lean(),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      course: {
        ...mapCourseCard(course, course.instructor, enrollment),
        topics: attachTopicQuizzes(course, buildTopicUnlockState(course.topics, enrollment)),
        currentTopic: getNextLearningTopic(
          attachTopicQuizzes(course, buildTopicUnlockState(course.topics, enrollment)),
          enrollment?.currentTopic
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load course details',
    });
  }
};

exports.enrollInCourse = async (req, res) => {
  try {
    const [course, student, existingEnrollment] = await Promise.all([
      Course.findById(req.params.courseId).lean(),
      User.findById(req.userId),
      Enrollment.findOne({ student: req.userId, course: req.params.courseId }),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (existingEnrollment) {
      return res.status(200).json({
        success: true,
        message: 'You are already enrolled in this course',
        enrollment: existingEnrollment,
      });
    }

    if (student.freeCourseUsed) {
      return res.status(402).json({
        success: false,
        paymentRequired: true,
        message: PAYMENT_REQUIRED_MESSAGE,
        course: {
          _id: course._id,
          title: course.title,
          price: Number(course.price || 0),
        },
      });
    }

    const enrollment = await Enrollment.create(
      createEnrollmentData(course, {
        student: req.userId,
        paymentStatus: 'free',
        paymentAmount: 0,
      })
    );

    student.freeCourseUsed = true;
    student.lastLoginAt = new Date();
    await student.save();

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      enrollment,
      paymentStatus: 'free',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to enroll in course',
    });
  }
};

exports.createPaymentOrder = async (req, res) => {
  try {
    const [course, student, existingEnrollment] = await Promise.all([
      Course.findById(req.params.courseId).lean(),
      User.findById(req.userId).lean(),
      Enrollment.findOne({ student: req.userId, course: req.params.courseId }).lean(),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
      });
    }

    if (!student.freeCourseUsed) {
      return res.status(400).json({
        success: false,
        message: 'Your first course is free. Please enroll directly instead of paying.',
      });
    }

    const amount = Math.max(0, Math.round(Number(course.price || 0) * 100));

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This course does not have a valid paid price configured.',
      });
    }

    const razorpayOrder = await requestRazorpay('/v1/orders', 'POST', {
      amount,
      currency: 'INR',
      receipt: buildReceiptId(course._id, req.userId),
      notes: {
        courseId: String(course._id),
        studentId: String(req.userId),
        courseTitle: course.title,
      },
    });

    const paymentOrder = buildPaymentPayload(course, razorpayOrder);

    res.status(200).json({
      success: true,
      paymentRequired: true,
      message: PAYMENT_REQUIRED_MESSAGE,
      order: paymentOrder,
      course: {
        _id: course._id,
        title: course.title,
        price: Number(course.price || 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order',
    });
  }
};

exports.verifyCoursePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    const [course, student, existingEnrollment] = await Promise.all([
      Course.findById(req.params.courseId).lean(),
      User.findById(req.userId),
      Enrollment.findOne({ student: req.userId, course: req.params.courseId }),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (existingEnrollment) {
      return res.status(200).json({
        success: true,
        message: 'You are already enrolled in this course',
        enrollment: existingEnrollment,
      });
    }

    if (!student.freeCourseUsed) {
      return res.status(400).json({
        success: false,
        message: 'Your first course is free. Please use free enrollment instead.',
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification details are required',
      });
    }

    const razorpayKeySecret = getConfigValue('RAZORPAY_KEY_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!razorpaySignature || expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid Razorpay signature.',
      });
    }

    const enrollment = await Enrollment.create(
      createEnrollmentData(course, {
        student: req.userId,
        paymentStatus: 'paid',
        paymentAmount: Number(course.price || 0),
        paymentOrderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      })
    );

    student.lastLoginAt = new Date();
    await student.save();

    res.status(201).json({
      success: true,
      message: 'Payment verified and enrollment completed successfully',
      enrollment,
      verification: {
        verified: true,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        signature: razorpaySignature || '',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const { topicId } = req.body;
    const course = await Course.findById(req.params.courseId).lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = await Enrollment.findOne({ student: req.userId, course: course._id });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const isTopicAlreadyCompleted = topicId
      ? enrollment.completedTopics.some((entry) => String(entry) === String(topicId))
      : false;

    if (topicId && !isTopicAlreadyCompleted) {
      enrollment.completedTopics.push(topicId);
    }

    const unlockedTopics = attachTopicQuizzes(course, buildTopicUnlockState(course.topics, enrollment));
    const nextTopic = getNextLearningTopic(unlockedTopics, topicId || enrollment.currentTopic);

    enrollment.currentTopic = nextTopic?._id || topicId || enrollment.currentTopic;
    enrollment.progress = course.topics.length
      ? Math.min(100, Math.round((enrollment.completedTopics.length / course.topics.length) * 100))
      : enrollment.progress;
    enrollment.status = enrollment.progress >= 100 ? 'completed' : 'active';
    enrollment.lastAccessedAt = new Date();

    if (topicId && !isTopicAlreadyCompleted) {
      enrollment.xp += 45;
      enrollment.streakDays = Math.max(1, enrollment.streakDays + 1);
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: isTopicAlreadyCompleted
        ? 'Topic was already completed'
        : 'Progress updated successfully',
      enrollment,
      currentTopic: nextTopic,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update progress',
    });
  }
};

exports.saveQuizResult = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      topicId,
      quizTitle,
      score,
      scoreOutOfTen,
      correctCount,
      totalQuestions,
      highestDifficultyReached,
      batchScores,
      timeTakenSeconds,
      source,
    } = req.body;

    if (!courseId || !topicId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and Topic ID are required',
      });
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const topicTitle = getTopicTitleFromCourse(course, topicId);

    const enrollment = await Enrollment.findOne({ student: req.userId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    // Add quiz result
    enrollment.quizResults.push({
      topicId,
      topicTitle,
      quizTitle: quizTitle || 'Quiz',
      score: Math.round(score) || 0,
      scoreOutOfTen: scoreOutOfTen || 0,
      correctCount: correctCount || 0,
      totalQuestions: totalQuestions || 10,
      highestDifficultyReached: highestDifficultyReached || 'easy',
      timeTakenSeconds: Number(timeTakenSeconds) > 0 ? Number(timeTakenSeconds) : 0,
      source: source?.trim?.() || 'quiz',
      batchScores: Array.isArray(batchScores) ? batchScores : [],
      completedAt: new Date(),
    });

    // Update XP based on performance
    const performanceBonus = Math.round((score / 100) * 50);
    enrollment.xp += Math.max(10, performanceBonus);

    // Increase streak if score is 60% or above
    if (score >= 60) {
      enrollment.streakDays = Math.max(1, enrollment.streakDays + 1);
    }

    enrollment.lastAccessedAt = new Date();
    await enrollment.save();
    await syncStudentPerformanceScore(req.userId);

    res.status(201).json({
      success: true,
      message: 'Quiz result saved successfully',
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save quiz result',
    });
  }
};
