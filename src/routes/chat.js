const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/chatController');
const passport = require('passport');

// Protect all chat routes with JWT authentication
router.use(passport.authenticate('jwt', { session: false }));

// @route   POST /api/chat/:projectId
// @desc    Send a message to the AI tutor
router.post('/:projectId', sendMessage);

module.exports = router; 