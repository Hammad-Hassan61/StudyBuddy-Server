const mongoose = require('mongoose');

const qaSchema = new mongoose.Schema({
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
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('QA', qaSchema); 