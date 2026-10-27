const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Google's Gemini API with environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    // Try different model names
    const models = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    for (const modelName of models) {
      console.log(`Testing model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, what is the capital of France?');
        const response = await result.response;
        console.log(`Success with model ${modelName}:`);
        console.log(response.text());
        console.log('-'.repeat(50));
        break; // Stop after finding a working model
      } catch (modelError) {
        console.error(`Error with model ${modelName}:`, modelError.message);
        console.log('-'.repeat(50));
      }
    }
  } catch (error) {
    console.error('General error:', error);
  }
}

testGemini();
