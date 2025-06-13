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
          role: "user",
          content: prompt,
        },
      ],
      model: model,
      stream,
      response_format: { type: "text" }
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
      return completion.choices[0].message.content;
    }
  } catch (error) {
    console.error("Error calling Novita AI: ", error);
    throw new Error("Failed to generate AI content.");
  }
}

module.exports = { generateContent }; 