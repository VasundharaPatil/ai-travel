const { geminiConfig } = require('./config/gemini-config');
require('dotenv').config();

/**
 * Comprehensive Gemini API Setup Verification Script
 * This script tests your Gemini API configuration and provides detailed diagnostics
 */

async function verifyGeminiSetup() {
  console.log('🔍 Verifying Gemini API Setup...\n');

  // Step 1: Check environment variables
  console.log('1. Checking Environment Variables:');
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('💡 Please ensure your .env file contains: GEMINI_API_KEY=your_api_key_here');
    return false;
  }
  
  console.log('✅ GEMINI_API_KEY found');
  console.log(`   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log();

  // Step 2: Test API connection
  console.log('2. Testing API Connection:');
  try {
    const result = await geminiConfig.testConnection();
    console.log('✅ API Connection successful!');
    console.log(`   Working model: ${result.model}`);
    console.log(`   Response: ${result.response}`);
    console.log();
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Verify your API key is correct');
    console.log('   2. Check if you have internet connection');
    console.log('   3. Ensure the API key has proper permissions');
    console.log('   4. Try regenerating your API key at https://ai.google.dev/');
    return false;
  }

  // Step 3: List available models
  console.log('3. Listing Available Models:');
  try {
    const models = await geminiConfig.listAvailableModels();
    console.log('✅ Available models retrieved successfully');
    console.log(`   Found ${models.length} models:`);
    
    models.slice(0, 5).forEach(model => {
      console.log(`   - ${model.name}`);
    });
    
    if (models.length > 5) {
      console.log(`   ... and ${models.length - 5} more models`);
    }
    console.log();
  } catch (error) {
    console.warn('⚠️  Could not list models:', error.message);
    console.log('   This is not critical - your API should still work for content generation\n');
  }

  // Step 4: Test different model recommendations
  console.log('4. Testing Model Recommendations:');
  const useCases = ['fast', 'balanced', 'advanced'];
  
  for (const useCase of useCases) {
    const recommendedModel = geminiConfig.getRecommendedModel(useCase);
    console.log(`   ${useCase.padEnd(8)}: ${recommendedModel}`);
  }
  console.log();

  // Step 5: Test content generation with different models
  console.log('5. Testing Content Generation:');
  const testPrompt = 'Generate a brief travel tip for Paris in one sentence.';
  
  try {
    const model = geminiConfig.getModel();
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    
    console.log('✅ Content generation successful!');
    console.log(`   Prompt: ${testPrompt}`);
    console.log(`   Response: ${response.text()}`);
    console.log();
  } catch (error) {
    console.error('❌ Content generation failed:', error.message);
    return false;
  }

  // Final success message
  console.log('🎉 All tests passed! Your Gemini API setup is working correctly.');
  console.log('\n📋 Summary:');
  console.log('   ✅ Environment variables configured');
  console.log('   ✅ API connection established');
  console.log('   ✅ Content generation working');
  console.log('\n🚀 You can now run your application with confidence!');
  
  return true;
}

// Run the verification
if (require.main === module) {
  verifyGeminiSetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { verifyGeminiSetup };
