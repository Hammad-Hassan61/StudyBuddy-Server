const { generateContent } = require('./aiService');
const Project = require('../models/Project');

async function generateChatResponse(projectId, userId, message) {
  try {
    // Get the project and its content
    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      throw new Error('Project not found');
    }

    // Create a context-aware prompt for the AI
    const prompt = `You are an expert tutor helping a student understand their study material. 
    The student is working on a project titled "${project.title}".
    
    Here is the study material they have uploaded:
    ${project.extractedTextContent}
    
    The student asks: "${message}"
    
    Please provide a helpful, educational response that:
    1. Directly addresses their question
    2. References specific parts of their study material when relevant
    3. Provides clear explanations and examples
    4. Maintains a supportive and encouraging tone
    5. Suggests related concepts they might want to explore
    6. Be precide
    
    Keep your response concise but informative.`;

    const response = await generateContent(prompt);
    return response;
  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    throw error;
  }
}

module.exports = {
  generateChatResponse
}; 