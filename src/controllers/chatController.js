const { generateChatResponse } = require('../services/chatService');

// @desc    Send a message to the AI tutor
// @route   POST /api/chat/:projectId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await generateChatResponse(projectId, userId, message);

    res.status(200).json({
      message: 'Chat response generated successfully',
      data: {
        response,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ message: error.message || 'Failed to generate chat response' });
  }
}; 