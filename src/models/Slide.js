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
  content: [{
    html: {
    type: String,
      required: true
    }
  }],
  dateGenerated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Slide', slideSchema); 