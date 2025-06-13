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

const generateStudyPlanPrompt = (projectName, projectDescription, contentChunks) => {
  return `You are an expert study planning agent. Create a comprehensive study plan based on the following project details.

Project Name: ${projectName}
Project Description: ${projectDescription}

Study Material Content:
${contentChunks[0]}${contentChunks.length > 1 ? '\n[Content continues in multiple parts]' : ''}

Your task is to analyze this content and create a detailed study plan. Follow these guidelines:
1. Break down the content into logical learning phases
2. Estimate appropriate time durations for each phase
3. Include specific learning objectives for each phase
4. Consider the complexity and prerequisites of topics
5. Ensure a progressive learning curve
6. Include review and practice sessions
7. Account for different learning styles

IMPORTANT: Your response must follow this exact format, with no additional text or explanations:

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
  const contentChunks = chunkContent(contentInput);
  let finalStudyPlan = [];

  for (let i = 0; i < contentChunks.length; i++) {
    const chunkPrompt = i === 0 
      ? generateStudyPlanPrompt(projectName, projectDescription, contentChunks)
      : `Continue analyzing the study material and extend the study plan. Here's the next part:

${contentChunks[i]}

Maintain the same format as before, but focus on new topics and concepts from this section.`;

    const aiResponseRaw = await generateContent(chunkPrompt);
    
    try {
      const jsonMatch = aiResponseRaw.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response');
      }
      
      const studyPlanContent = JSON.parse(jsonMatch[0]);
      validateStudyPlanContent(studyPlanContent);
      finalStudyPlan = [...finalStudyPlan, ...studyPlanContent];

    } catch (jsonError) {
      console.error(`Failed to parse AI response for chunk ${i + 1}:`, jsonError);
      console.error("Raw AI response:", aiResponseRaw);
      throw new Error('AI generated content in an unexpected format.');
    }
  }

  // Remove duplicates based on phase name
  finalStudyPlan = finalStudyPlan.filter((phase, index, self) =>
    index === self.findIndex((p) => p.phase === phase.phase)
  );

  // Save to database
  const studyPlan = await StudyPlan.findOneAndUpdate(
    { project: projectId, user: userId },
    { content: finalStudyPlan },
    { new: true, upsert: true }
  );

  return studyPlan;
};

module.exports = {
  generateStudyPlan
}; 