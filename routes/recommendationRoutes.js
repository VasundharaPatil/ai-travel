const express = require('express');
const router = express.Router();

// Import controllers
const recommendationController = require('../controllers/recommendationController');

// Import middleware
const auth = require('../middleware/auth');

// @route   GET api/recommendations/destinations
// @desc    Get destination recommendations based on user preferences
// @access  Private
router.get('/destinations', auth, recommendationController.getDestinationRecommendations);

// @route   GET api/recommendations/activities
// @desc    Get activity recommendations for a destination
// @access  Private
router.get('/activities', auth, recommendationController.getActivityRecommendations);

// @route   GET api/recommendations/accommodations
// @desc    Get accommodation recommendations for a destination
// @access  Private
router.get('/accommodations', auth, recommendationController.getAccommodationRecommendations);

// @route   GET api/recommendations/restaurants
// @desc    Get restaurant recommendations for a destination
// @access  Private
router.get('/restaurants', auth, recommendationController.getRestaurantRecommendations);

// @route   GET api/recommendations/transport
// @desc    Get transport recommendations for a trip
// @access  Private
router.get('/transport', auth, recommendationController.getTransportRecommendations);



// @route   POST api/recommendations/ai
// @desc    Generate AI recommendations for a trip
// @access  Private
router.post('/ai', auth, recommendationController.generateAIRecommendations);

module.exports = router;
