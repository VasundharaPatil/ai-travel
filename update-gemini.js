const fs = require('fs');
const path = require('path');

// Path to the recommendation controller
const filePath = path.join(__dirname, 'controllers', 'recommendationController.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace OpenAI API check with Gemini API comment
content = content.replace(
  /\/\/ Skip AI generation if no API key\n\s*if \(!process\.env\.OPENAI_API_KEY\) \{\n\s*console\.log\('OpenAI API key not found, skipping AI generation'\);\n\s*return \[\];\n\s*\}/g,
  '// Using Google\'s Gemini API\n  console.log(\'Using Google Gemini API for recommendations\');'
);

// Replace OpenAI API calls with Gemini API calls
content = content.replace(
  /\/\/ Call OpenAI API\n\s*const completion = await openai\.chat\.completions\.create\(\{\n\s*model: "gpt-4",\n\s*messages: \[\{ role: "user", content: prompt \}\],\n\s*temperature: 0\.7,\n\s*max_tokens: 1500\n\s*\}\);\n\n\s*\/\/ Parse the response\n\s*const aiResponse = completion\.choices\[0\]\.message\.content;/g,
  '// Call Gemini API\n    console.log(\'Using Google Gemini model for recommendations\');\n    const result = await geminiModel.generateContent(prompt);\n    const response = await result.response;\n    \n    // Get the response text\n    const aiResponse = response.text();'
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Successfully updated recommendationController.js to use Google\'s Gemini API');
