const { generateContent } = require('./aiService');
const Flashcard = require('../models/Flashcard');

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

const generateFlashcardPrompt = (projectName, content) => {
  return `You are an expert study assistant. Create a set of flashcards based on the following project and content.

Project Name: ${projectName}

Study Material Content:
${content}

Your task is to create concise, effective flashcards that cover key concepts. Follow these guidelines:
1. Create clear, focused questions that test understanding
2. Provide concise, accurate answers
3. Cover main concepts and important details
4. Use simple, direct language
5. Include both factual and conceptual questions
6. Ensure questions are specific and unambiguous
7. Make answers brief but complete
8. Include examples where relevant
9. Generate AT LEAST 20 flashcards to ensure comprehensive coverage

IMPORTANT: Your response must follow this exact format, with no additional text or explanations. You MUST return at least 20 flashcards:

[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]`;
};

const validateFlashcardContent = (flashcardContent) => {
  if (!Array.isArray(flashcardContent)) {
    throw new Error('Generated content is not an array');
  }
  
  flashcardContent.forEach((card, index) => {
    const requiredFields = ['question', 'answer'];
    requiredFields.forEach(field => {
      if (!card[field]) {
        throw new Error(`Missing required field '${field}' in flashcard ${index + 1}`);
      }
    });
  });
};

const generateFlashcards = async (projectId, userId, contentInput, projectName) => {
  try {
    const prompt = generateFlashcardPrompt(projectName, contentInput);
    const aiResponseRaw = await generateContent(prompt);
    
    try {
      let flashcardContent;
      try {
        // First try to parse the entire response as JSON
        const parsedResponse = JSON.parse(aiResponseRaw);
        
        // Handle both direct array and nested object formats
        if (Array.isArray(parsedResponse)) {
          flashcardContent = parsedResponse;
        } else if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards)) {
          flashcardContent = parsedResponse.flashcards;
        } else {
          throw new Error('No valid flashcard array found in response');
        }
      } catch (e) {
        // If that fails, try to extract JSON array using regex
        const jsonMatch = aiResponseRaw.match(/\[\s*\{.*\}\s*\]/s);
        if (!jsonMatch) {
          throw new Error('No valid JSON array found in response');
        }
        flashcardContent = JSON.parse(jsonMatch[0]);
      }

      // Ensure we have an array
      if (!Array.isArray(flashcardContent)) {
        // If we got a single object, wrap it in an array
        if (typeof flashcardContent === 'object' && flashcardContent !== null) {
          flashcardContent = [flashcardContent];
        } else {
          throw new Error('Generated content is not an array or object');
        }
      }

      validateFlashcardContent(flashcardContent);

      // Save to database
      const flashcards = await Flashcard.findOneAndUpdate(
        { project: projectId, user: userId },
        { content: flashcardContent },
        { new: true, upsert: true }
      );

      return flashcards;
    } catch (jsonError) {
      console.error('Failed to parse AI response:', jsonError);
      console.error("Raw AI response:", aiResponseRaw);
      throw new Error('AI generated content in an unexpected format.');
    }
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
};

module.exports = {
  generateFlashcards
}; 