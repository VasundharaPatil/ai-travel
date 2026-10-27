const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

/**
 * Gemini API Configuration
 * This file centralizes Gemini API setup and provides helper functions
 */

class GeminiConfig {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.defaultModel = 'gemini-2.5-flash'; // Latest stable model
    this.fallbackModels = [
      'gemini-2.5-flash',
      'gemini-2.5-pro', 
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
  }

  /**
   * Initialize the Gemini API client
   */
  initialize() {
    // Refresh API key from environment in case it was loaded after constructor
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please check your .env file.');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    return this.genAI;
  }

  /**
   * Get a Gemini model instance
   * @param {string} modelName - Optional model name, defaults to latest stable
   * @returns {Object} Gemini model instance
   */
  getModel(modelName = this.defaultModel) {
    if (!this.genAI) {
      this.initialize();
    }

    return this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Test connection with fallback models
   * @returns {Object} Working model and response
   */
  async testConnection() {
    if (!this.genAI) {
      this.initialize();
    }

    const testPrompt = 'Hello, please respond with "Connection successful" to confirm the API is working.';
    
    for (const modelName of this.fallbackModels) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = this.getModel(modelName);
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        
        return {
          success: true,
          model: modelName,
          response: response.text()
        };
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All Gemini models failed. Please check your API key and internet connection.');
  }

  /**
   * List available models (Note: Not supported in current SDK version)
   * @returns {Array} List of available models
   */
  async listAvailableModels() {
    // Note: listModels() is not available in the current @google/generative-ai SDK
    // This is a known limitation and doesn't affect content generation functionality
    console.warn('Model listing not supported in current SDK version');
    return this.fallbackModels.map(name => ({ name }));
  }

  /**
   * Get recommended model based on use case
   * @param {string} useCase - 'fast', 'balanced', 'advanced'
   * @returns {string} Recommended model name
   */
  getRecommendedModel(useCase = 'balanced') {
    const recommendations = {
      fast: 'gemini-2.5-flash',      // Fastest, cost-effective
      balanced: 'gemini-2.5-flash',  // Good balance of speed and capability
      advanced: 'gemini-2.5-pro'     // Most capable, slower
    };

    return recommendations[useCase] || this.defaultModel;
  }
}

// Export singleton instance
const geminiConfig = new GeminiConfig();

module.exports = {
  GeminiConfig,
  geminiConfig,
  // Helper functions for backward compatibility
  getGeminiModel: (modelName) => geminiConfig.getModel(modelName),
  testGeminiConnection: () => geminiConfig.testConnection()
};
