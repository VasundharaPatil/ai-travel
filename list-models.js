const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Google's Gemini API with environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // List available models
    const models = await genAI.listModels();
    console.log('Available models:');
    console.log(models);
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
