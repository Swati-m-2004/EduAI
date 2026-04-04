const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentOrderId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentId: {
      type: String,
      default: '',
      trim: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedTopics: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    currentTopic: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    streakDays: {
      type: Number,
      default: 1,
      min: 0,
    },
    quizResults: {
      type: [{
        topicId: mongoose.Schema.Types.ObjectId,
        quizTitle: String,
        score: Number, // percentage score (0-100)
        scoreOutOfTen: Number,
        correctCount: Number,
        totalQuestions: Number,
        highestDifficultyReached: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          default: 'easy',
        },
        batchScores: [Number],
        completedAt: Date,
      }],
      default: [],
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
