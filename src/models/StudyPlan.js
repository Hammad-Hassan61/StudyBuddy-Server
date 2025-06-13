const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: [
    {
      phase: { type: String, required: true },
      duration: { type: String, required: true },
      status: { type: String, enum: ['completed', 'current', 'upcoming'], default: 'upcoming' },
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema); 