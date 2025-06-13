const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  user: {
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
    trim: true,
  },
  uploadedFiles: [
    {
      fileName: String,
      filePath: String, // Store the path to the uploaded file
      uploadDate: { type: Date, default: Date.now },
    },
  ],
  extractedTextContent: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    studyPlan: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    flashcards: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    qa: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    slides: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Update the lastActivity timestamp before saving
projectSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('Project', projectSchema); 