const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found in env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    // List models is not directly exposed on genAI client in the JS SDK in the same way, 
    // but we can try to call standard models or run a quick test generation on gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, etc.
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Answer YES or NO.');
        const response = await result.response;
        console.log(`Model ${modelName} works:`, response.text().trim());
      } catch (err) {
        console.log(`Model ${modelName} failed:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

run();
