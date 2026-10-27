const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const weatherController = require('../controllers/weatherController');

// @route   GET /api/weather/current
// @desc    Get current weather for a location
// @access  Private
router.get('/current', auth, weatherController.getCurrentWeather);

// @route   GET /api/weather/forecast
// @desc    Get weather forecast for a location and date range
// @access  Private
router.get('/forecast', auth, weatherController.getWeatherForecast);

// @route   GET /api/weather/trip/:id
// @desc    Get weather forecast for a trip
// @access  Private
router.get('/trip/:id', auth, weatherController.getTripWeather);

// @route   GET /api/weather/activity-suitability
// @desc    Get activity weather suitability
// @access  Private
router.get('/activity-suitability', auth, weatherController.getActivityWeatherSuitability);

// @route   PUT /api/weather/itinerary/:id
// @desc    Update itinerary with weather forecasts
// @access  Private
router.put('/itinerary/:id', auth, weatherController.updateItineraryWeather);

// @route   GET /api/weather/activity-suggestions
// @desc    Get weather-optimized activity suggestions
// @access  Private
router.get('/activity-suggestions', auth, weatherController.getWeatherOptimizedActivities);

module.exports = router;
