const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

ratingSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);

