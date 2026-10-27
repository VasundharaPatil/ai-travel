const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/travel-planner')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const itineraryRoutes = require('./routes/itineraryRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const groupRoutes = require('./routes/groupRoutes');
const itineraryBuilderRoutes = require('./routes/itineraryBuilderRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/itinerary-builder', itineraryBuilderRoutes);
app.use('/api/chat', chatRoutes);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// API status route
app.get('/api/status', (req, res) => {
  res.json({ status: 'AI Travel Planner API is running' });
});

// Handle all other routes - serve index.html for SPA routing
app.get('*', (req, res) => {
  // Only serve frontend for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
