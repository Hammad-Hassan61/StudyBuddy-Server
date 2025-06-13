const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
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
      milestone: { type: String, required: true },
      description: { type: String, required: true },
      eta: { type: String, required: false },
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Roadmap', roadmapSchema); 