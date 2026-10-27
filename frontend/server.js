const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8000;

// API proxy middleware - forward API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - send all non-API requests to index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    // Check if the requested path exists as a file
    const requestedPage = req.path === '/' ? 'index.html' : req.path.substring(1);
    const filePath = path.join(__dirname, requestedPage);
    
    // Try to serve the requested file
    res.sendFile(filePath, (err) => {
      if (err) {
        // If file doesn't exist, serve index.html for SPA routing
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
  }
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
