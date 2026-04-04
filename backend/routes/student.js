const express = require('express');
const {
  getDashboard,
  getCourseDetails,
  enrollInCourse,
  createPaymentOrder,
  updateProgress,
  saveQuizResult,
  verifyCoursePayment,
} = require('../controllers/studentController');
const { isAuth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(isAuth, authorize('student'));

router.get('/dashboard', getDashboard);
router.get('/courses/:courseId', getCourseDetails);
router.post('/courses/:courseId/enroll', enrollInCourse);
router.post('/courses/:courseId/payment-order', createPaymentOrder);
router.post('/courses/:courseId/verify-payment', verifyCoursePayment);
router.patch('/courses/:courseId/progress', updateProgress);
router.post('/courses/:courseId/quiz-results', saveQuizResult);

module.exports = router;
