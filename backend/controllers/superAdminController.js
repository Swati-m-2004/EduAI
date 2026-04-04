const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const buildUserFilters = ({ search, role, status }) => {
  const filters = {
    role: { $in: ['student', 'instructor'] },
  };

  if (role && role !== 'all') {
    filters.role = role;
  }

  if (status === 'active') {
    filters.isActive = true;
  } else if (status === 'inactive') {
    filters.isActive = false;
  }

  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  return filters;
};

const getDateBoundary = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const getWeekLabel = (dateInput) => {
  const date = new Date(dateInput);
  const start = new Date(date);
  const day = date.getDay() || 7;
  start.setDate(date.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);

  return start.toISOString().slice(0, 10);
};

exports.getOverview = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const search = req.query.search?.trim();
    const role = req.query.role?.trim();
    const status = req.query.status?.trim();

    const filters = buildUserFilters({ search, role, status });
    const skip = (page - 1) * limit;
    const todayStart = getDateBoundary(0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [users, totalUsers, roleCounts, activeStudentsToday, avgStudentPerformance, recentUsers, monthlyRegistrations, instructors, enrollments] = await Promise.all([
      User.find(filters)
        .select('name email role isActive createdAt managedBy performanceScore lastLoginAt')
        .populate('managedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filters),
      User.aggregate([
        {
          $match: {
            role: { $in: ['student', 'instructor'] },
          },
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments({
        role: 'student',
        isActive: true,
        lastLoginAt: { $gte: todayStart },
      }),
      User.aggregate([
        {
          $match: {
            role: 'student',
            performanceScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$performanceScore' },
          },
        },
      ]),
      User.find({ role: { $in: ['student', 'instructor'] } })
        .select('name role createdAt isActive')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      User.find({
        role: { $in: ['student', 'instructor'] },
        createdAt: { $gte: monthStart },
      })
        .select('role createdAt')
        .lean(),
      User.find({ role: 'instructor' })
        .select('name email isActive createdAt')
        .lean(),
      Enrollment.find({})
        .select('student course')
        .populate('student', 'isActive performanceScore')
        .populate({
          path: 'course',
          select: 'instructor',
          populate: { path: 'instructor', select: '_id' },
        })
        .lean(),
    ]);

    const counts = roleCounts.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      { student: 0, instructor: 0 }
    );

    const weeklyBuckets = new Map();
    monthlyRegistrations
      .forEach((entry) => {
        const key = getWeekLabel(entry.createdAt);
        if (!weeklyBuckets.has(key)) {
          weeklyBuckets.set(key, { name: key, students: 0, admins: 0 });
        }

        const bucket = weeklyBuckets.get(key);
        if (entry.role === 'student') {
          bucket.students += 1;
        } else if (entry.role === 'instructor') {
          bucket.admins += 1;
        }
      });

    const weeklyRegistrations = Array.from(weeklyBuckets.values())
      .sort((a, b) => new Date(a.name) - new Date(b.name))
      .slice(-4);

    const activityFeed = recentUsers.map((entry) => ({
      id: entry._id,
      title: `${entry.role === 'instructor' ? 'Admin' : 'Student'} registered`,
      description: `${entry.name} joined the platform`,
      time: entry.createdAt,
      status: entry.isActive ? 'Active' : 'Inactive',
    }));

    const instructorEnrollmentMap = new Map();

    enrollments.forEach((entry) => {
      const instructorId = entry.course?.instructor?._id || entry.course?.instructor;
      const studentId = entry.student?._id || entry.student;

      if (!instructorId || !studentId) return;

      const mapKey = String(instructorId);

      if (!instructorEnrollmentMap.has(mapKey)) {
        instructorEnrollmentMap.set(mapKey, new Map());
      }

      const studentMap = instructorEnrollmentMap.get(mapKey);
      studentMap.set(String(studentId), {
        isActive: Boolean(entry.student?.isActive),
        performanceScore: entry.student?.performanceScore,
      });
    });

    const instructorStudentCountMap = new Map(
      instructors.map((instructor) => {
        const assignedStudents = Array.from(instructorEnrollmentMap.get(String(instructor._id))?.values() || []);
        const averageStudentPerformance = assignedStudents.length
          ? Math.round(
              assignedStudents
                .map((entry) => Number(entry.performanceScore || 0))
                .reduce((sum, score) => sum + score, 0) / assignedStudents.length
            )
          : 0;

        return [
          String(instructor._id),
          {
            totalStudents: assignedStudents.length,
            activeStudents: assignedStudents.filter((entry) => entry.isActive).length,
            averageStudentPerformance,
            name: instructor.name,
            email: instructor.email,
            isActive: instructor.isActive,
            createdAt: instructor.createdAt,
          },
        ];
      })
    );

    const topAdmins = Array.from(instructorStudentCountMap.entries())
      .map(([instructorId, entry]) => ({
        _id: instructorId,
        name: entry.name,
        email: entry.email,
        studentCount: entry.totalStudents,
        activeStudentCount: entry.activeStudents,
        averageStudentPerformance: entry.averageStudentPerformance,
        isActive: entry.isActive,
        createdAt: entry.createdAt,
      }))
      .sort((a, b) => {
        if (b.averageStudentPerformance !== a.averageStudentPerformance) {
          return b.averageStudentPerformance - a.averageStudentPerformance;
        }

        return b.studentCount - a.studentCount;
      });

    const directoryUsers = users.map((entry) => {
      const assigned = instructorStudentCountMap.get(String(entry._id)) || { totalStudents: 0, activeStudents: 0 };

      return {
        ...entry,
        assignedInstructorName: entry.role === 'student' ? entry.managedBy?.name || 'Not assigned' : null,
        assignedStudentCount: entry.role === 'instructor' ? assigned.totalStudents : 0,
        activeAssignedStudentCount: entry.role === 'instructor' ? assigned.activeStudents : 0,
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: counts.student + counts.instructor,
        totalStudents: counts.student,
        activeStudentsToday,
        totalAdmins: counts.instructor,
        averagePlatformPerformance: Math.round(avgStudentPerformance[0]?.average || 0),
      },
      users: directoryUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
      analytics: {
        roleDistribution: [
          { name: 'Students', value: counts.student },
          { name: 'Admins', value: counts.instructor },
        ],
        weeklyRegistrations,
        adminPerformance: topAdmins.slice(0, 6),
        needsAttention: [...topAdmins]
          .sort((a, b) => a.averageStudentPerformance - b.averageStudentPerformance)
          .slice(0, 4),
      },
      activityFeed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch super admin overview',
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email role isActive createdAt managedBy performanceScore lastLoginAt bio')
      .populate('managedBy', 'name email');

    if (!user || user.role === 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let managedStudents = [];
    let summary = null;

    if (user.role === 'instructor') {
      const instructorCourses = await Course.find({ instructor: user._id }).select('_id').lean();
      const courseIds = instructorCourses.map((course) => course._id);
      const enrollments = await Enrollment.find({ course: { $in: courseIds } })
        .select('student')
        .populate('student', 'name email isActive performanceScore createdAt')
        .lean();

      const uniqueStudents = new Map();
      enrollments.forEach((entry) => {
        const student = entry.student;
        if (student?._id) {
          uniqueStudents.set(String(student._id), student);
        }
      });

      managedStudents = Array.from(uniqueStudents.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      summary = {
        assignedStudentCount: managedStudents.length,
        activeAssignedStudentCount: managedStudents.filter((entry) => entry.isActive).length,
      };
    } else {
      summary = {
        assignedInstructorName: user.managedBy?.name || 'Not assigned',
      };
    }

    res.status(200).json({
      success: true,
      user,
      summary,
      managedStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user details',
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role === 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user status',
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role === 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (String(user._id) === String(req.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    if (user.role === 'instructor') {
      await User.updateMany(
        { managedBy: user._id },
        { $set: { managedBy: null } }
      );
    }

    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user',
    });
  }
};
