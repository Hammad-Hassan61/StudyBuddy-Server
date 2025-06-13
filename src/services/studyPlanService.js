const { generateContent } = require('./aiService');
const StudyPlan = require('../models/StudyPlan');

const MAX_CHUNK_SIZE = 4000;

const chunkContent = (content) => {
  const contentChunks = [];
  let currentChunk = '';
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > MAX_CHUNK_SIZE) {
      contentChunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk) {
    contentChunks.push(currentChunk);
  }
  return contentChunks;
};

const generateStudyPlanPrompt = (projectName, projectDescription, content) => {
  return `You are an expert study planning agent. Create a comprehensive study plan based on the following project details.

Project Name: ${projectName}
Project Description: ${projectDescription}

Study Material Content:
${content}

Your task is to analyze this content and create a detailed study plan. Follow these guidelines:
1. Break down the content into logical learning phases
2. Estimate appropriate time durations for each phase
3. Include specific learning objectives for each phase
4. Consider the complexity and prerequisites of topics
5. Ensure a progressive learning curve
6. Include review and practice sessions
7. Account for different learning styles
8. The status of first one is always current.

IMPORTANT: Your response must follow this exact format, with no additional text or explanations. You will get positive number for following it:

[
  {
    "phase": "Phase name",
    "duration": "Time estimate",
    "status": "upcoming",
    "objectives": ["Objective 1", "Objective 2"],
    "topics": ["Topic 1", "Topic 2"],
    "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
    "resources": ["Resource 1", "Resource 2"],
    "practiceActivities": ["Activity 1", "Activity 2"]
  }
]`;
};

const validateStudyPlanContent = (studyPlanContent) => {
  if (!Array.isArray(studyPlanContent)) {
    throw new Error('Generated content is not an array');
  }
  
  studyPlanContent.forEach((phase, index) => {
    const requiredFields = ['phase', 'duration', 'status', 'objectives', 'topics', 'prerequisites', 'resources', 'practiceActivities'];
    requiredFields.forEach(field => {
      if (!phase[field]) {
        throw new Error(`Missing required field '${field}' in phase ${index + 1}`);
      }
    });
  });
};

const generateStudyPlan = async (projectId, userId, contentInput, projectName, projectDescription) => {
  try {
    const prompt = generateStudyPlanPrompt(projectName, projectDescription, contentInput);
    const aiResponseRaw = await generateContent(prompt);
    
    try {
      const jsonMatch = aiResponseRaw.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response');
      }
      
      const studyPlanContent = JSON.parse(jsonMatch[0]);
      validateStudyPlanContent(studyPlanContent);

      // Save to database
      const studyPlan = await StudyPlan.findOneAndUpdate(
        { project: projectId, user: userId },
        { content: studyPlanContent },
        { new: true, upsert: true }
      );

      return studyPlan;
    } catch (jsonError) {
      console.error('Failed to parse AI response:', jsonError);
      console.error("Raw AI response:", aiResponseRaw);
      throw new Error('AI generated content in an unexpected format.');
    }
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw error;
  }
};

module.exports = {
  generateStudyPlan
}; 