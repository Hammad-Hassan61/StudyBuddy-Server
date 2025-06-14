const { generateContent } = require('./aiService');
const QA = require('../models/QA');

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

const generateQAPrompt = (projectName, content) => {
  return `You are an expert study assistant. Create a set of quick review questions and answers based on the following project and content.

Project Name: ${projectName}

Study Material Content:
${content}

Your task is to create effective Q&A pairs for quick revision. Follow these guidelines:
1. Create questions that test understanding of key concepts
2. Provide clear, concise answers
3. Focus on important topics and main ideas
4. Include both basic recall and higher-order thinking questions
5. Make questions specific and answerable
6. Keep answers brief but informative
7. Include practical examples where relevant
8. Cover different aspects of the material
9. Generate AT LEAST 20 Q&A pairs to ensure comprehensive coverage

IMPORTANT: Your response must follow this exact format, with no additional text or explanations. You MUST return at least 20 Q&A pairs:

[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]`;
};

const validateQAContent = (qaContent) => {
  if (!Array.isArray(qaContent)) {
    throw new Error('Generated content is not an array');
  }
  
  qaContent.forEach((qa, index) => {
    const requiredFields = ['question', 'answer'];
    requiredFields.forEach(field => {
      if (!qa[field]) {
        throw new Error(`Missing required field '${field}' in Q&A pair ${index + 1}`);
      }
    });
  });
};

const generateQA = async (projectId, userId, contentInput, projectName) => {
  try {
    const prompt = generateQAPrompt(projectName, contentInput);
    const aiResponseRaw = await generateContent(prompt);
    
    try {
      let qaContent;
      try {
        // First try to parse the entire response as JSON
        const parsedResponse = JSON.parse(aiResponseRaw);
        
        // Handle both direct array and nested object formats
        if (Array.isArray(parsedResponse)) {
          qaContent = parsedResponse;
        } else if (parsedResponse.qa && Array.isArray(parsedResponse.qa)) {
          qaContent = parsedResponse.qa;
        } else {
          throw new Error('No valid Q&A array found in response');
        }
      } catch (e) {
        // If that fails, try to extract JSON array using regex
        const jsonMatch = aiResponseRaw.match(/\[\s*\{.*\}\s*\]/s);
        if (!jsonMatch) {
          throw new Error('No valid JSON array found in response');
        }
        qaContent = JSON.parse(jsonMatch[0]);
      }

      // Ensure we have an array
      if (!Array.isArray(qaContent)) {
        // If we got a single object, wrap it in an array
        if (typeof qaContent === 'object' && qaContent !== null) {
          qaContent = [qaContent];
        } else {
          throw new Error('Generated content is not an array or object');
        }
      }

      validateQAContent(qaContent);

      // Save to database
      const qa = await QA.findOneAndUpdate(
        { project: projectId, user: userId },
        { content: qaContent },
        { new: true, upsert: true }
      );

      return qa;
    } catch (jsonError) {
      console.error('Failed to parse AI response:', jsonError);
      console.error("Raw AI response:", aiResponseRaw);
      throw new Error('AI generated content in an unexpected format.');
    }
  } catch (error) {
    console.error('Error generating Q&A:', error);
    throw error;
  }
};

module.exports = {
  generateQA
}; 