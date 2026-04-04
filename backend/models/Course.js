const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'fill_blank', 'match', 'drag_drop'],
      default: 'mcq',
    },
    options: {
      type: [String],
      default: [],
    },
    answer: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    points: {
      type: Number,
      default: 10,
      min: 1,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    codeSnippet: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    topicTitle: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    adaptiveEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    enabledQuestionTypes: {
      type: [String],
      default: ['mcq', 'fill_blank', 'match', 'drag_drop'],
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    videoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    notesTitle: {
      type: String,
      default: '',
      trim: true,
    },
    notesType: {
      type: String,
      enum: ['pdf', 'ppt', 'word', 'rich_text', 'none'],
      default: 'none',
    },
    notesUrl: {
      type: String,
      default: '',
      trim: true,
    },
    notesPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    notesOriginalName: {
      type: String,
      default: '',
      trim: true,
    },
    notesMimeType: {
      type: String,
      default: '',
      trim: true,
    },
    notesContent: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    quizzes: {
      type: [quizSchema],
      default: [],
    },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 499,
      min: 0,
    },
    topics: {
      type: [topicSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ instructor: 1 });

module.exports = mongoose.model('Course', courseSchema);
