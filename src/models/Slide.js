const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true,
  }, // This could be Markdown, HTML, or a structured JSON for slide data
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Slide', slideSchema); 