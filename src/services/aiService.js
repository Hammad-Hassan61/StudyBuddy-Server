const OpenAI = require("openai");

const baseURL = "https://api.novita.ai/v3/openai"
const apiKey = process.env.NOVITA_AI_KEY;
const model = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8";

const openai = new OpenAI({
  baseURL: baseURL,
  apiKey: apiKey,
});

async function generateContent(prompt) {
  const stream = false; 

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that generates content in strict JSON format. Always respond with valid JSON only, no additional text or explanations."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: model,
      stream,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    if (stream) {
      // This part would be for streaming, which we've set to false for now
      // For await (const chunk of completion) {
      //   if (chunk.choices[0].finish_reason) {
      //     console.log(chunk.choices[0].finish_reason);
      //   } else {
      //     console.log(chunk.choices[0].delta.content);
      //   }
      // }
      return "Streaming is not implemented for this function currently.";
    } else {
      const content = completion.choices[0].message.content;
      
      // Try to parse the response as JSON
      try {
        // If the response is already a JSON object, stringify it
        if (typeof content === 'object') {
          return JSON.stringify(content);
        }
        
        // If the response is a string, try to parse it
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.error("Raw response:", content);
        throw new Error("AI generated content is not in valid JSON format");
      }
    }
  } catch (error) {
    console.error("Error calling Novita AI: ", error);
    throw new Error("Failed to generate AI content.");
  }
}

module.exports = { generateContent }; 