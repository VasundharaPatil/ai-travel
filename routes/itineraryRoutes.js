const express = require('express');
const router = express.Router();

// Import controllers
const { 
  generateItinerary,
  getItineraryById,
  getItineraryByTripId,
  updateItinerary,
  deleteItinerary,
  updateDayPlan,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities
} = require('../controllers/itineraryController');

// Import middleware (to be implemented)
const auth = require('../middleware/auth');

// @route   POST api/itineraries/generate/:tripId
// @desc    Generate a new itinerary using AI
// @access  Private
router.post('/generate/:tripId', auth, generateItinerary);

// Keep the old route for backward compatibility
router.post('/generate', auth, generateItinerary);

// @route   GET api/itineraries/trip/:tripId
// @desc    Get itinerary by trip ID
// @access  Private
router.get('/trip/:tripId', auth, getItineraryByTripId);

// @route   GET api/itineraries/:id
// @desc    Get itinerary by ID
// @access  Private
router.get('/:id', auth, getItineraryById);

// @route   PUT api/itineraries/:id
// @desc    Update an itinerary
// @access  Private
router.put('/:id', auth, updateItinerary);

// @route   DELETE api/itineraries/:id
// @desc    Delete an itinerary
// @access  Private
router.delete('/:id', auth, deleteItinerary);

// @route   PUT api/itineraries/:id/days/:dayId
// @desc    Update a specific day in the itinerary
// @access  Private
router.put('/:id/days/:dayId', auth, updateDayPlan);

// @route   POST api/itineraries/:id/days/:dayId/activities
// @desc    Add a new activity to a day
// @access  Private
router.post('/:id/days/:dayId/activities', auth, addActivity);

// @route   PUT api/itineraries/:id/days/:dayId/activities/:activityId
// @desc    Update an activity
// @access  Private
router.put('/:id/days/:dayId/activities/:activityId', auth, updateActivity);

// @route   DELETE api/itineraries/:id/days/:dayId/activities/:activityId
// @desc    Delete an activity
// @access  Private
router.delete('/:id/days/:dayId/activities/:activityId', auth, deleteActivity);

// @route   PUT api/itineraries/:id/days/:dayId/reorder
// @desc    Reorder activities in a day
// @access  Private
router.put('/:id/days/:dayId/reorder', auth, reorderActivities);

module.exports = router;
