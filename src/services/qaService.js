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
    const prompt = `You are an expert study assistant. Create a comprehensive set of questions and answers based on the following project and content.

Project Name: ${projectName}

Study Material Content:
${contentInput}

Your task is to create detailed Q&A pairs that:
1. Cover key concepts and important details
2. Test understanding at different levels
3. Include both factual and conceptual questions
4. Provide clear and concise answers
5. Include examples where appropriate
6. Reference specific parts of the content
7. Challenge critical thinking
8. Help reinforce learning

IMPORTANT: Format your response as a JSON array of objects, where each object has:
- "question": The question text
- "answer": The detailed answer text

Example format:
[
  {
    "question": "What is the main concept of machine learning?",
    "answer": "Machine learning is a field of study that gives computers the ability to learn without being explicitly programmed. It involves programming computers to optimize a performance criterion using example data or past experience."
  },
  {
    "question": "How does supervised learning differ from unsupervised learning?",
    "answer": "Supervised learning uses labeled training data to learn the mapping between inputs and outputs, while unsupervised learning finds patterns in unlabeled data without predefined outputs."
  }
]

CRITICAL INSTRUCTIONS:
1. Return ONLY the JSON array
2. Do not include any additional text or explanations
3. Make sure the JSON is properly formatted
4. You MUST generate AT LEAST 20 Q&A pairs
5. Each answer should be detailed and comprehensive
6. Questions should progress from basic to advanced concepts
7. Cover different aspects and topics from the content
8. Include both theoretical and practical questions
9. Ensure questions test different levels of understanding
10. Make sure answers are specific and reference the content

Remember: Your response must be a JSON array containing at least 20 Q&A pairs. Do not return a single object.`;

    const aiResponse = await generateContent(prompt);
    console.log('Raw AI response:', aiResponse);

    let qaPairs;
    try {
      // First try parsing as a JSON array
      qaPairs = JSON.parse(aiResponse);
      console.log('Parsed response type:', Array.isArray(qaPairs) ? 'array' : 'object');
      
      // If it's a single object, try to extract array from it
      if (!Array.isArray(qaPairs)) {
        if (typeof qaPairs === 'object' && qaPairs !== null) {
          // Check if the response contains a 'data' array
          if (qaPairs.data && Array.isArray(qaPairs.data)) {
            qaPairs = qaPairs.data;
          }
          // Check if the response contains a 'qa' or 'content' array
          else if (qaPairs.qa && Array.isArray(qaPairs.qa)) {
            qaPairs = qaPairs.qa;
          } else if (qaPairs.content && Array.isArray(qaPairs.content)) {
            qaPairs = qaPairs.content;
          } else if ('question' in qaPairs && 'answer' in qaPairs) {
            // If it's a single Q&A pair, try to generate more
            console.log('Received single Q&A pair, attempting to generate more...');
            const additionalPrompt = `Based on the following Q&A pair about deep learning, generate 19 more related Q&A pairs that cover different aspects of the topic. Make sure to cover various aspects like:
- Basic concepts and definitions
- Historical development
- Different types of neural networks
- Applications and use cases
- Advantages and limitations
- Comparison with other ML approaches
- Implementation considerations
- Future developments

Original Q&A pair:
${JSON.stringify(qaPairs, null, 2)}

Return ONLY a JSON array of 20 Q&A pairs total, including the original pair. Format:
[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]`;

            const additionalResponse = await generateContent(additionalPrompt);
            console.log('Additional response:', additionalResponse);
            
            try {
              const additionalPairs = JSON.parse(additionalResponse);
              console.log('Parsed additional pairs type:', Array.isArray(additionalPairs) ? 'array' : 'object');
              
              if (Array.isArray(additionalPairs)) {
                qaPairs = [qaPairs, ...additionalPairs];
              } else if (typeof additionalPairs === 'object' && additionalPairs !== null) {
                // Handle case where additional response is a single object
                if ('question' in additionalPairs && 'answer' in additionalPairs) {
                  qaPairs = [qaPairs, additionalPairs];
                } else if (additionalPairs.data && Array.isArray(additionalPairs.data)) {
                  qaPairs = [qaPairs, ...additionalPairs.data];
                } else if (additionalPairs.qa && Array.isArray(additionalPairs.qa)) {
                  qaPairs = [qaPairs, ...additionalPairs.qa];
                } else if (additionalPairs.content && Array.isArray(additionalPairs.content)) {
                  qaPairs = [qaPairs, ...additionalPairs.content];
                } else {
                  throw new Error('Invalid additional response format');
                }
              } else {
                throw new Error('Failed to generate additional Q&A pairs');
              }
            } catch (error) {
              console.error('Failed to parse additional Q&A pairs:', error);
              throw new Error('Failed to generate additional Q&A pairs');
            }
          } else {
            throw new Error('Response is not a valid Q&A object or array');
          }
        } else {
          throw new Error('Response is not a valid Q&A object or array');
        }
      }

      // Validate minimum number of questions
      if (qaPairs.length < 20) {
        console.log(`Received ${qaPairs.length} Q&A pairs, attempting to generate more...`);
        const remainingCount = 20 - qaPairs.length;
        const additionalPrompt = `Generate ${remainingCount} more Q&A pairs related to deep learning and machine learning. Make sure to cover:
- Different types of neural networks
- Applications and use cases
- Implementation details
- Best practices
- Common challenges
- Future trends

Return ONLY a JSON array of ${remainingCount} Q&A pairs. Format:
[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]`;

        const additionalResponse = await generateContent(additionalPrompt);
        console.log('Second additional response:', additionalResponse);
        
        try {
          const additionalPairs = JSON.parse(additionalResponse);
          console.log('Parsed second additional pairs type:', Array.isArray(additionalPairs) ? 'array' : 'object');
          
          if (Array.isArray(additionalPairs)) {
            qaPairs = [...qaPairs, ...additionalPairs];
          } else if (typeof additionalPairs === 'object' && additionalPairs !== null) {
            if ('question' in additionalPairs && 'answer' in additionalPairs) {
              qaPairs = [...qaPairs, additionalPairs];
            } else if (additionalPairs.data && Array.isArray(additionalPairs.data)) {
              qaPairs = [...qaPairs, ...additionalPairs.data];
            } else if (additionalPairs.qa && Array.isArray(additionalPairs.qa)) {
              qaPairs = [...qaPairs, ...additionalPairs.qa];
            } else if (additionalPairs.content && Array.isArray(additionalPairs.content)) {
              qaPairs = [...qaPairs, ...additionalPairs.content];
            }
          }
        } catch (error) {
          console.error('Failed to parse second additional Q&A pairs:', error);
        }
      }

      // Final validation of minimum questions
      if (qaPairs.length < 20) {
        throw new Error(`Expected at least 20 Q&A pairs, but received ${qaPairs.length}`);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AI generated content in an unexpected format.');
    }

    // Validate the structure of each Q&A pair
    if (!qaPairs.every(pair => 
      typeof pair === 'object' && 
      pair !== null && 
      typeof pair.question === 'string' && 
      typeof pair.answer === 'string'
    )) {
      throw new Error('Invalid Q&A pair structure in response');
    }

    const qa = await QA.create({
      project: projectId,
      user: userId,
      content: qaPairs
    });

    return qa;
  } catch (error) {
    console.error('Error generating Q&A:', error);
    throw error;
  }
};

module.exports = {
  generateQA
}; 