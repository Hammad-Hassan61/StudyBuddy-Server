const { generateContent } = require('./aiService');
const Slide = require('../models/Slide');

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

const generateSlidesPrompt = (projectName, content) => {
  return `You are an expert presentation designer. Create a comprehensive set of presentation slides based on the following project and content.

Project Name: ${projectName}

Study Material Content:
${content}

Your task is to create effective, visually appealing slides that cover the material comprehensively. Follow these guidelines:
1. Create AT LEAST 8 slides to ensure comprehensive coverage
2. Each slide should focus on a key concept or topic
3. Use clear, concise language
4. Include relevant examples and explanations
5. Structure content logically and progressively
6. Use bullet points for better readability
7. Include a title slide and summary slide
8. Make content visually appealing with proper spacing and formatting
9. Use HTML and CSS for styling (keep CSS minimal and inline)
10. Ensure each slide is self-contained and understandable
11. You have to use the colourful and modern design with accurate alignment and view.
12. The width and height should be complete as much as available
13. Make fonts and design such that it uses full space
14. The content must be such that it explains each concepts clearly
15. The content must be excessive not just signle line
IMPORTANT: Your response must be an array of HTML strings, each representing a slide. Each slide should be a self-contained HTML block with inline CSS. Do NOT include <body>, <head>, or <html> tags. Example format:

[
  {
    "html": "<div style='background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'><h1 style='color: #2563eb; font-size: 2rem; margin-bottom: 1rem;'>Title</h1><p style='color: #1f2937; line-height: 1.5;'>Content</p></div>"
  }
]`;
};

const validateSlidesContent = (slidesContent) => {
  if (!Array.isArray(slidesContent)) {
    throw new Error('Generated content is not an array');
  }
  
  if (slidesContent.length < 8) {
    throw new Error('Generated content must have at least 8 slides');
  }
  
  slidesContent.forEach((slide, index) => {
    if (!slide.html || typeof slide.html !== 'string') {
      throw new Error(`Invalid slide format at index ${index}`);
    }
  });
};

const generateSlides = async (projectId, userId, contentInput, projectName) => {
  try {
    const prompt = generateSlidesPrompt(projectName, contentInput);
    const aiResponseRaw = await generateContent(prompt);
    
    try {
      let slidesContent;
      try {
        // First try to parse the entire response as JSON
        const parsedResponse = JSON.parse(aiResponseRaw);
        
        // Handle different response formats
        if (Array.isArray(parsedResponse)) {
          slidesContent = parsedResponse;
        } else if (parsedResponse.slides && Array.isArray(parsedResponse.slides)) {
          slidesContent = parsedResponse.slides;
        } else if (parsedResponse.html && Array.isArray(parsedResponse.html)) {
          // If html array contains objects with html property, use as is
          if (parsedResponse.html[0] && typeof parsedResponse.html[0] === 'object' && parsedResponse.html[0].html) {
            slidesContent = parsedResponse.html;
          } else {
            // Convert array of HTML strings to array of objects with html property
            slidesContent = parsedResponse.html.map(html => ({ html }));
          }
        } else {
          throw new Error('No valid slides array found in response');
        }
      } catch (e) {
        // If that fails, try to extract JSON array using regex
        const jsonMatch = aiResponseRaw.match(/\[\s*\{.*\}\s*\]/s);
        if (!jsonMatch) {
          throw new Error('No valid JSON array found in response');
        }
        slidesContent = JSON.parse(jsonMatch[0]);
      }

      // Ensure we have an array
      if (!Array.isArray(slidesContent)) {
        // If we got a single object, wrap it in an array
        if (typeof slidesContent === 'object' && slidesContent !== null) {
          slidesContent = [slidesContent];
        } else {
          throw new Error('Generated content is not an array or object');
        }
      }

      validateSlidesContent(slidesContent);

      // Save to database
      const slides = await Slide.findOneAndUpdate(
        { project: projectId, user: userId },
        { content: slidesContent },
        { new: true, upsert: true }
      );

      return slides;
    } catch (jsonError) {
      console.error('Failed to parse AI response:', jsonError);
      console.error("Raw AI response:", aiResponseRaw);
      throw new Error('AI generated content in an unexpected format.');
    }
  } catch (error) {
    console.error('Error generating slides:', error);
    throw error;
  }
};

module.exports = {
  generateSlides
}; 