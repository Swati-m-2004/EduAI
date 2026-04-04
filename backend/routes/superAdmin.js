const express = require('express');
const {
  getOverview,
  getUserDetails,
  updateUserStatus,
  deleteUser,
} = require('../controllers/superAdminController');
const { isAuth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(isAuth, authorize('super_admin'));

router.get('/overview', getOverview);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
