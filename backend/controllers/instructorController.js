const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

const QUESTION_LABELS = {
  mcq: 'MCQ',
  fill_blank: 'Fill in the blanks',
  match: 'Match the following',
  drag_drop: 'Drag & Drop',
};

const hashString = (value = '') => {
  let hash = 0;
  const normalized = String(value);

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const getWeakTopicsForStudent = (student, topicTitles) => {
  if (!topicTitles.length) return ['No topic data yet'];

  const source = `${student.email}-${student.performanceScore ?? 0}`;
  const firstIndex = hashString(source) % topicTitles.length;
  const secondIndex = hashString(`${source}-alt`) % topicTitles.length;
  const weakTopics = [topicTitles[firstIndex]];

  if (topicTitles.length > 1 && secondIndex !== firstIndex) {
    weakTopics.push(topicTitles[secondIndex]);
  }

  return weakTopics;
};

const getTopicStatusFromScore = (score = 0, attempts = 0) => {
  if (!attempts) return 'not_started';
  if (score > 75) return 'strong';
  if (score < 60) return 'weak';
  return 'average';
};

const getQuizTypeInfo = (quiz) => {
  const questionTypes = Array.isArray(quiz?.questions)
    ? [...new Set(quiz.questions.map((question) => question.type).filter(Boolean))]
    : [];

  const fallbackTypes = Array.isArray(quiz?.enabledQuestionTypes)
    ? [...new Set(quiz.enabledQuestionTypes.filter(Boolean))]
    : [];

  const normalizedTypes = questionTypes.length ? questionTypes : fallbackTypes;
  const primaryType = normalizedTypes[0] || 'mcq';

  return {
    primaryType,
    questionTypes: normalizedTypes,
    questionTypeLabels: normalizedTypes.map((type) => QUESTION_LABELS[type] || type),
  };
};

const getQuizDifficultySummary = (quiz) => {
  const questionDifficulties = Array.isArray(quiz?.questions)
    ? [...new Set(quiz.questions.map((question) => question.difficulty).filter(Boolean))]
    : [];

  if (!questionDifficulties.length) {
    return quiz?.difficulty || 'easy';
  }

  return questionDifficulties.length === 1 ? questionDifficulties[0] : 'mixed';
};

const mapCourseSummary = (course, managedStudentCount) => ({
  _id: course._id,
  title: course.title,
  description: course.description,
  topicCount: course.topics.length,
  quizCount: course.topics.reduce((sum, topic) => sum + topic.quizzes.length, 0),
  enrolledStudents: managedStudentCount,
  topics: course.topics.map((topic) => ({
    _id: topic._id,
    title: topic.title,
    description: topic.description,
    videoUrl: topic.videoUrl,
    notesTitle: topic.notesTitle,
    notesType: topic.notesType,
    notesUrl: topic.notesUrl,
    notesOriginalName: topic.notesOriginalName,
    notesMimeType: topic.notesMimeType,
    notesContent: topic.notesContent,
    quizCount: topic.quizzes.length,
    quizzes: topic.quizzes.map((quiz) => {
      const quizTypeInfo = getQuizTypeInfo(quiz);
      return {
        _id: quiz._id,
        title: quiz.title,
        difficulty: getQuizDifficultySummary(quiz),
        status: quiz.status || 'published',
        questionCount: quiz.questions.length,
        primaryType: quizTypeInfo.primaryType,
        questionTypes: quizTypeInfo.questionTypes,
        questionTypeLabels: quizTypeInfo.questionTypeLabels,
        questions: quiz.questions.map((question) => ({
          _id: question._id,
          prompt: question.prompt,
          type: question.type,
          difficulty: question.difficulty || quiz.difficulty || 'easy',
          points: question.points || 10,
          options: question.options || [],
          answer: question.answer || '',
          imageUrl: question.imageUrl || '',
          codeSnippet: question.codeSnippet || '',
          metadata: question.metadata || {},
        })),
      };
    }),
  })),
});

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const saveNotesFileLocally = async (req, file, courseTitle, topicTitle) => {
  const courseSlug = slugify(courseTitle || 'course');
  const topicSlug = slugify(topicTitle || 'topic');
  const uploadsRoot = path.join(__dirname, '..', 'uploads', 'instructor-notes', courseSlug, topicSlug);

  await fs.promises.mkdir(uploadsRoot, { recursive: true });

  const extension = path.extname(file.originalname) || '';
  const baseName = slugify(path.basename(file.originalname, extension)) || 'notes-file';
  const fileName = `${baseName}-${Date.now()}${extension}`;
  const filePath = path.join(uploadsRoot, fileName);

  await fs.promises.writeFile(filePath, file.buffer);

  return {
    secure_url: `${req.protocol}://${req.get('host')}/uploads/instructor-notes/${courseSlug}/${topicSlug}/${fileName}`,
    public_id: `local:${courseSlug}/${topicSlug}/${fileName}`,
  };
};

const uploadNotesFile = async (req, file, courseTitle, topicTitle) => {
  if (!file) return null;

  const courseSlug = slugify(courseTitle || 'course');
  const topicSlug = slugify(topicTitle || 'topic');
  const folder = `eduportal/instructors/${courseSlug}/${topicSlug}/notes`;

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder,
          public_id: file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-z0-9-_]+/gi, '-')
            .toLowerCase(),
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

      stream.end(file.buffer);
    });
  } catch (error) {
    return saveNotesFileLocally(req, file, courseTitle, topicTitle);
  }
};

const getInstructorContext = async (userId) => {
  const [instructor, students, courses] = await Promise.all([
    User.findById(userId),
    User.find({ managedBy: userId, role: 'student' })
      .select('name email performanceScore lastLoginAt isActive')
      .sort({ createdAt: -1 })
      .lean(),
    Course.find({ instructor: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  return { instructor, students, courses };
};

exports.getStudentPerformance = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const instructorId = req.userId;
    const instructorCourses = await Course.find({ instructor: instructorId }).lean();
    const instructorCourseMap = new Map(instructorCourses.map((course) => [String(course._id), course]));

    if (!instructorCourseMap.size) {
      return res.status(404).json({
        success: false,
        message: 'No instructor courses found',
      });
    }

    const student = await User.findById(studentId).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentEnrollments = await Enrollment.find({
      student: studentId,
      course: { $in: [...instructorCourseMap.keys()] },
    }).lean();

    if (!studentEnrollments.length) {
      return res.status(404).json({
        success: false,
        message: 'Student is not enrolled in any of your courses',
      });
    }

    const requestedEnrollment = studentEnrollments.find(
      (enrollment) => String(enrollment.course) === String(courseId)
    );

    const bestEnrollment = [...studentEnrollments].sort((a, b) => {
      const aAttempts = a.quizResults?.length || 0;
      const bAttempts = b.quizResults?.length || 0;
      if (bAttempts !== aAttempts) return bAttempts - aAttempts;

      const aAccessed = new Date(a.lastAccessedAt || a.updatedAt || a.enrolledAt || 0).getTime();
      const bAccessed = new Date(b.lastAccessedAt || b.updatedAt || b.enrolledAt || 0).getTime();
      return bAccessed - aAccessed;
    })[0];

    const enrollment = requestedEnrollment?.quizResults?.length
      ? requestedEnrollment
      : bestEnrollment;

    const course = instructorCourseMap.get(String(enrollment.course));

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have access',
      });
    }

    const topicTitleMap = new Map(
      (course.topics || []).map((topic) => [String(topic._id), topic.title || 'Topic'])
    );

    // Calculate topic-wise performance
    const topicPerformanceMap = new Map();
    const timelineData = [];

    if (enrollment.quizResults && enrollment.quizResults.length > 0) {
      enrollment.quizResults.forEach((result) => {
        const topicId = String(result.topicId);
        const score = result.score || 0;

        if (!topicPerformanceMap.has(topicId)) {
          topicPerformanceMap.set(topicId, {
            topicTitle: topicTitleMap.get(topicId) || result.topicTitle || 'Topic',
            scores: [],
            attempts: 0,
            status: score < 60 ? 'weak' : score > 75 ? 'strong' : 'average',
          });
        }

        const topicData = topicPerformanceMap.get(topicId);
        topicData.scores.push(score);
        topicData.attempts += 1;
        topicData.status = score < 60 ? 'weak' : score > 75 ? 'strong' : 'average';

        timelineData.push({
          date: new Date(result.completedAt),
          score,
          topicTitle: topicTitleMap.get(topicId) || result.topicTitle || 'Quiz',
          quizTitle: result.quizTitle || 'Quiz',
        });
      });
    }

    const courseTopics = (course.topics || []).map((topic) => ({
      topicId: String(topic._id),
      topicTitle: topic.title || 'Topic',
    }));
    const hasQuizAttempts = (enrollment.quizResults?.length || 0) > 0;

    // Convert to array and calculate averages
    let topicAnalysis = Array.from(topicPerformanceMap.entries()).map(([topicId, data]) => ({
      topicId,
      topicTitle: data.topicTitle,
      score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      attempts: data.attempts,
      status: data.status,
      latestScore: data.scores[data.scores.length - 1] || 0,
    }));

    if (!topicAnalysis.length && courseTopics.length) {
      topicAnalysis = courseTopics.map((topic) => {
        return {
          topicId: topic.topicId,
          topicTitle: topic.topicTitle,
          score: 0,
          attempts: 0,
          status: 'not_started',
          latestScore: 0,
        };
      });

      topicAnalysis = topicAnalysis.sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
    }

    // Sort by topic title
    topicAnalysis.sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));

    // Calculate strength vs weakness ratio
    const strongTopics = topicAnalysis.filter((t) => t.attempts > 0 && t.status === 'strong').length;
    const weakTopics = topicAnalysis.filter((t) => t.attempts > 0 && t.status === 'weak').length;
    const avgTopics = topicAnalysis.filter((t) => t.attempts > 0 && t.status === 'average').length;

    // Sort timeline by date
    timelineData.sort((a, b) => a.date - b.date);

    // Create timeline visualization (last 10 attempts)
    const timelineVisualization = timelineData.slice(-10).map((item, index) => ({
      label: `${index + 1}`,
      score: item.score,
      date: item.date.toLocaleDateString(),
      topic: item.topicTitle,
    }));

    // Calculate overall performance
    const attemptedTopics = topicAnalysis.filter((topic) => topic.attempts > 0);
    const overallScore =
      attemptedTopics.length > 0
        ? Math.round(attemptedTopics.reduce((sum, t) => sum + t.score, 0) / attemptedTopics.length)
        : 0;

    // Pie chart data: Strong vs Weak vs Average
    const pieChartData = [
      { name: 'Strong (>75%)', value: strongTopics, color: '#10b981' },
      { name: 'Weak (<60%)', value: weakTopics, color: '#ef4444' },
      { name: 'Average (60-75%)', value: avgTopics, color: '#f59e0b' },
    ].filter((item) => item.value > 0);

    res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        enrolledAt: enrollment.enrolledAt,
      },
      course: {
        _id: course._id,
        title: course.title,
      },
      stats: {
        overallScore,
        quizAttempts: enrollment.quizResults?.length || 0,
        strongTopics,
        weakTopics,
        avgTopics,
        enrollmentProgress: enrollment.progress || 0,
        hasQuizAttempts,
      },
      selectedCourseChanged: String(enrollment.course) !== String(courseId),
      performance: {
        topicAnalysis,
        timelineVisualization,
        pieChartData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load student performance',
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { instructor, students, courses } = await getInstructorContext(req.userId);

    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // Count actual enrollments for each course
    const courseEnrollmentCounts = await Promise.all(
      courses.map(async (course) => ({
        courseId: course._id,
        count: await Enrollment.countDocuments({ course: course._id }),
      }))
    );
    const enrollmentMap = new Map(courseEnrollmentCounts.map((item) => [String(item.courseId), item.count]));

    const totalQuizzes = courses.reduce(
      (sum, course) => sum + course.topics.reduce((topicSum, topic) => topicSum + topic.quizzes.length, 0),
      0
    );

    const allTopics = courses.flatMap((course) =>
      course.topics.map((topic) => ({
        courseTitle: course.title,
        topicTitle: topic.title,
        quizCount: topic.quizzes.length,
      }))
    );

    const topicTitles = allTopics.map((entry) => entry.topicTitle);

    // Get actual enrollments for instructor's courses
    const studentEnrollments = await Enrollment.find({
      course: { $in: courses.map((c) => c._id) },
    })
      .populate('student', 'name email performanceScore lastLoginAt isActive')
      .lean();
    
    const enrollmentByStudent = new Map();
    const enrolledStudentIds = new Set();
    
    studentEnrollments.forEach((enrollment) => {
      const studentId = String(enrollment.student._id);
      enrolledStudentIds.add(studentId);
      
      if (!enrollmentByStudent.has(studentId)) {
        enrollmentByStudent.set(studentId, {
          student: enrollment.student,
          courses: [],
          scores: [],
        });
      }
      enrollmentByStudent.get(studentId).scores.push(
        ...(enrollment.quizResults || []).map((result) => Number(result.score || 0))
      );
      const course = courses.find((c) => String(c._id) === String(enrollment.course));
      if (course) {
        enrollmentByStudent.get(studentId).courses.push(course.title);
        enrollmentByStudent.get(studentId).courseDetails = enrollmentByStudent.get(studentId).courseDetails || [];
        enrollmentByStudent.get(studentId).courseDetails.push({
          _id: course._id,
          title: course.title,
          quizAttempts: enrollment.quizResults?.length || 0,
          progress: enrollment.progress || 0,
          lastAccessedAt: enrollment.lastAccessedAt || enrollment.updatedAt || enrollment.enrolledAt || null,
        });
      }
    });

    const studentsTable = Array.from(enrollmentByStudent.values()).map((entry) => {
      const scores = entry.scores || [];
      const overallScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      return {
        _id: entry.student._id,
        name: entry.student.name,
        email: entry.student.email,
        enrolledCourses: entry.courses,
        enrolledCourseDetails: (entry.courseDetails || []).sort((a, b) => {
          if ((b.quizAttempts || 0) !== (a.quizAttempts || 0)) {
            return (b.quizAttempts || 0) - (a.quizAttempts || 0);
          }

          return new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime();
        }),
        overallScore,
        weakTopics: getWeakTopicsForStudent({ ...entry.student, performanceScore: overallScore }, topicTitles),
        lastActive: entry.student.lastLoginAt,
        isActive: entry.student.isActive,
      };
    });

    // Calculate average performance from actually enrolled students
    const averagePerformance = studentsTable.length
      ? Math.round(
          studentsTable.reduce((sum, student) => sum + (student.overallScore || 0), 0) / studentsTable.length
        )
      : 0;

    const coursesSummary = courses.map((course) => 
      mapCourseSummary(course, enrollmentMap.get(String(course._id)) || 0)
    );
    const recentCourses = coursesSummary.slice(0, 3);

    const quizInventory = courses.flatMap((course) =>
      course.topics.flatMap((topic) =>
        topic.quizzes.map((quiz) => {
          const quizTypeInfo = getQuizTypeInfo(quiz);
          return {
            _id: quiz._id,
            title: quiz.title,
            courseId: course._id,
            courseTitle: course.title,
            topicId: topic._id,
            topicTitle: topic.title,
            difficulty: getQuizDifficultySummary(quiz),
            status: quiz.status || 'published',
            adaptiveEnabled: quiz.adaptiveEnabled,
            questionCount: quiz.questions.length,
            primaryType: quizTypeInfo.primaryType,
            questionTypes: quizTypeInfo.questionTypeLabels,
            createdAt: quiz.createdAt,
          };
        })
      )
    );

    const topicWeakness = allTopics.map((topic, index) => ({
      topic: topic.topicTitle,
      weaknessScore:
        studentsTable.length === 0
          ? 0
          : Math.max(
              10,
              100 -
                Math.round(
                  studentsTable.reduce(
                    (sum, student) =>
                      sum + ((student.overallScore || 0) - ((index % 3) * 6)),
                    0
                  ) / studentsTable.length
                )
            ),
    }));

    const progressOverview = studentsTable.slice(0, 6).map((student) => ({
      name: student.name,
      progress: student.overallScore || 0,
    }));

    const performanceTrend = courses.slice(0, 6).map((course, index) => ({
      label: course.title,
      performance:
        studentsTable.length === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  studentsTable.reduce((sum, student) => sum + (student.overallScore || 0), 0) / studentsTable.length
                ) - index * 3
              )
            ),
    }));

    // Count unique students who have enrolled in instructor's courses
    const totalEnrolledStudents = studentsTable.length;

    res.status(200).json({
      success: true,
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        email: instructor.email,
      },
      stats: {
        totalCourses: courses.length,
        totalStudents: totalEnrolledStudents,
        totalQuizzes,
        averagePerformance,
      },
      recentCourses,
      courses: coursesSummary,
      quizInventory,
      students: studentsTable,
      analytics: {
        performanceTrend,
        topicWeakness,
        progressOverview,
      },
      gamification: {
        adaptiveFlow: [
          'If a learner struggles, the next question drops to easy.',
          'If a learner stabilizes, the next question moves to medium.',
          'If a learner performs strongly, the next question rises to hard.',
        ],
        enabledTypes: ['Drag & Drop', 'Match the following', 'Fill in the blanks', 'MCQ'],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load instructor dashboard',
    });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course title is required',
      });
    }

    const course = await Course.create({
      instructor: req.userId,
      title: title.trim(),
      description: description?.trim() || '',
      price: Number.isFinite(Number(price)) ? Math.max(0, Number(price)) : 499,
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create course',
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { title, description, price } = req.body;

    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course title is required',
      });
    }

    course.title = title.trim();
    course.description = description?.trim() || '';
    course.price = Number.isFinite(Number(price)) ? Math.max(0, Number(price)) : course.price || 499;
    course.updatedAt = new Date();
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update course',
    });
  }
};

exports.addTopic = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic title is required',
      });
    }

    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    course.topics.push({
      title: title.trim(),
      description: description?.trim() || '',
      order: course.topics.length,
    });
    course.updatedAt = new Date();
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Topic added successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add topic',
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete course',
    });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const topic = course.topics.id(req.params.topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    topic.deleteOne();
    course.updatedAt = new Date();
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete topic',
    });
  }
};

exports.updateTopicContent = async (req, res) => {
  try {
    const { videoUrl, notesType, notesTitle, notesContent, description } = req.body;

    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const topic = course.topics.id(req.params.topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    let uploadedNotes = null;

    if (req.file) {
      if (topic.notesPublicId && !String(topic.notesPublicId).startsWith('local:')) {
        await cloudinary.uploader.destroy(topic.notesPublicId, { resource_type: 'raw' }).catch(() => null);
      }
      uploadedNotes = await uploadNotesFile(req, req.file, course.title, topic.title);
    }

    topic.videoUrl = videoUrl?.trim() || '';
    topic.notesType = notesType || 'none';
    topic.notesTitle = notesTitle?.trim() || '';
    topic.notesUrl = uploadedNotes?.secure_url || topic.notesUrl || '';
    topic.notesPublicId = uploadedNotes?.public_id || topic.notesPublicId || '';
    topic.notesOriginalName = req.file?.originalname || topic.notesOriginalName || '';
    topic.notesMimeType = req.file?.mimetype || topic.notesMimeType || '';
    topic.notesContent = notesContent || '';
    topic.description = description?.trim() || topic.description;
    course.updatedAt = new Date();
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Topic content updated successfully',
      topic,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update topic content',
    });
  }
};

exports.createQuiz = async (req, res) => {
  try {
    const {
      courseId,
      topicId,
      title,
      difficulty,
      status,
      adaptiveEnabled,
      enabledQuestionTypes,
      questions,
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!courseId?.trim?.() && !courseId) missingFields.push('courseId');
    if (!topicId?.trim?.() && !topicId) missingFields.push('topicId');
    if (!title?.trim?.()) missingFields.push('title');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        received: { courseId, topicId, title },
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const topic = course.topics.id(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    topic.quizzes.push({
      title: title.trim(),
      topicId: topic._id,
      topicTitle: topic.title,
      difficulty: difficulty || 'easy',
      status: status === 'draft' ? 'draft' : 'published',
      adaptiveEnabled: adaptiveEnabled !== false,
      enabledQuestionTypes:
        Array.isArray(enabledQuestionTypes) && enabledQuestionTypes.length
          ? enabledQuestionTypes
          : ['mcq', 'fill_blank', 'match', 'drag_drop'],
      questions: Array.isArray(questions)
        ? questions.map((question) => ({
            prompt: question.prompt?.trim() || 'Untitled question',
            type: question.type || 'mcq',
            options: Array.isArray(question.options)
              ? question.options.filter(Boolean).map((option) => option.trim())
              : [],
            answer: question.answer?.trim() || '',
            difficulty: question.difficulty || difficulty || 'easy',
            points: Number(question.points) > 0 ? Number(question.points) : 10,
            imageUrl: question.imageUrl?.trim() || '',
            codeSnippet: question.codeSnippet || '',
            metadata: question.metadata && typeof question.metadata === 'object' ? question.metadata : {},
          }))
        : [],
    });

    course.updatedAt = new Date();
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create quiz',
    });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { courseId, topicId, quizId } = req.params;
    const course = await Course.findOne({ _id: courseId, instructor: req.userId });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const topic = course.topics.id(topicId);

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    const quiz = topic.quizzes.id(quizId);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const { title, difficulty, status, adaptiveEnabled, enabledQuestionTypes, questions } = req.body;

    quiz.title = title?.trim() || quiz.title;
    quiz.difficulty = difficulty || quiz.difficulty;
    quiz.status = status === 'draft' ? 'draft' : 'published';
    quiz.adaptiveEnabled = adaptiveEnabled !== false;
    quiz.enabledQuestionTypes =
      Array.isArray(enabledQuestionTypes) && enabledQuestionTypes.length
        ? enabledQuestionTypes
        : quiz.enabledQuestionTypes;
    quiz.questions = Array.isArray(questions)
      ? questions.map((question) => ({
          prompt: question.prompt?.trim() || 'Untitled question',
          type: question.type || 'mcq',
          options: Array.isArray(question.options)
            ? question.options.filter(Boolean).map((option) => option.trim())
            : [],
          answer: question.answer?.trim() || '',
          difficulty: question.difficulty || difficulty || 'easy',
          points: Number(question.points) > 0 ? Number(question.points) : 10,
          imageUrl: question.imageUrl?.trim() || '',
          codeSnippet: question.codeSnippet || '',
          metadata: question.metadata && typeof question.metadata === 'object' ? question.metadata : {},
        }))
      : quiz.questions;

    course.updatedAt = new Date();
    await course.save();

    res.status(200).json({ success: true, message: 'Quiz updated successfully', course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update quiz' });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { courseId, topicId, quizId } = req.params;
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.userId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const topic = course.topics.id(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    const quiz = topic.quizzes.id(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    quiz.deleteOne();
    course.updatedAt = new Date();
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete quiz',
    });
  }
};
