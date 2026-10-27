/**
 * Startup script for the AI Travel Planner application
 * This script installs dependencies and starts the server
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const port = process.env.PORT || 5000;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print a formatted message to the console
 */
function printMessage(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Check if a directory exists
 */
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * Install dependencies for a package
 */
function installDependencies(packageDir, packageName) {
  printMessage(`\n📦 Installing ${packageName} dependencies...`, colors.cyan);
  
  try {
    execSync('npm install', { 
      cwd: packageDir, 
      stdio: 'inherit' 
    });
    printMessage(`✅ ${packageName} dependencies installed successfully!`, colors.green);
    return true;
  } catch (error) {
    printMessage(`❌ Error installing ${packageName} dependencies: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Start a server process
 */
function startServer(command, args, cwd, name, color) {
  printMessage(`\n🚀 Starting ${name} server...`, color);
  
  const server = spawn(command, args, { 
    cwd, 
    stdio: 'pipe',
    shell: true
  });
  
  server.stdout.on('data', (data) => {
    console.log(`${color}[${name}] ${data.toString().trim()}${colors.reset}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`${color}[${name} ERROR] ${data.toString().trim()}${colors.reset}`);
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      printMessage(`\n❌ ${name} server process exited with code ${code}`, colors.red);
    }
  });
  
  return server;
}

/**
 * Main function to start the application
 */
async function startApplication() {
  const rootDir = path.resolve(__dirname);
  const frontendDir = path.join(rootDir, 'frontend');
  
  printMessage('\n🌟 AI Travel Planner Startup 🌟', colors.bright + colors.magenta);
  printMessage('----------------------------------', colors.magenta);
  
  // Check if directories exist
  if (!directoryExists(frontendDir)) {
    printMessage('❌ Frontend directory not found!', colors.red);
    return;
  }
  
  // Install dependencies
  const backendDepsInstalled = installDependencies(rootDir, 'Backend');
  
  if (!backendDepsInstalled) {
    printMessage('\n❌ Failed to install dependencies. Please check the errors above.', colors.red);
    return;
  }
  
  // Start server
  const server = startServer('node', ['server.js'], rootDir, 'Server', colors.cyan);
  
  printMessage('\n✨ Application started successfully!', colors.green);
  printMessage(`🔗 Server: http://localhost:${port}`, colors.blue);
  printMessage('\n📝 Press Ctrl+C to stop the server\n', colors.magenta);
  
  // Handle process termination
  process.on('SIGINT', () => {
    printMessage('\n🛑 Stopping server...', colors.yellow);
    server.kill();
    process.exit(0);
  });
}

// Start the application
startApplication().catch(err => {
  printMessage(`\n❌ Error starting application: ${err.message}`, colors.red);
});
