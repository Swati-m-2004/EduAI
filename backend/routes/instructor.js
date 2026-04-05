const express = require('express');
const {
  getDashboard,
  getStudentPerformance,
  getCourseRatings,
  getRatingsOverview,
  createCourse,
  updateCourse,
  addTopic,
  deleteCourse,
  deleteTopic,
  updateTopicContent,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} = require('../controllers/instructorController');
const { isAuth, authorize } = require('../middleware/auth');
const { notesUpload } = require('../middleware/upload');

const router = express.Router();

router.use(isAuth, authorize('instructor'));

router.get('/dashboard', getDashboard);
router.get('/students/:studentId/courses/:courseId/performance', getStudentPerformance);
router.get('/ratings', getRatingsOverview);
router.get('/courses/:courseId/ratings', getCourseRatings);
router.post('/courses', createCourse);
router.patch('/courses/:courseId', updateCourse);
router.delete('/courses/:courseId', deleteCourse);
router.post('/courses/:courseId/topics', addTopic);
router.delete('/courses/:courseId/topics/:topicId', deleteTopic);
router.patch('/courses/:courseId/topics/:topicId/content', notesUpload.single('notesFile'), updateTopicContent);
router.post('/quizzes', createQuiz);
router.patch('/courses/:courseId/topics/:topicId/quizzes/:quizId', updateQuiz);
router.delete('/courses/:courseId/topics/:topicId/quizzes/:quizId', deleteQuiz);

module.exports = router;
