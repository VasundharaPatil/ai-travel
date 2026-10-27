const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const itineraryBuilderController = require('../controllers/itineraryBuilderController');

// @route   GET /api/itinerary-builder/:id
// @desc    Get itinerary for editing
// @access  Private
router.get('/:id', auth, itineraryBuilderController.getItineraryForEditing);

// @route   PUT /api/itinerary-builder/:id/activity/:activityId
// @desc    Update activity in itinerary
// @access  Private
router.put('/:id/activity/:activityId', auth, itineraryBuilderController.updateActivity);

// @route   POST /api/itinerary-builder/:id/day/:dayIndex/activity
// @desc    Add new activity to itinerary
// @access  Private
router.post(
  '/:id/day/:dayIndex/activity',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  itineraryBuilderController.addActivity
);

// @route   DELETE /api/itinerary-builder/:id/activity/:activityId
// @desc    Delete activity from itinerary
// @access  Private
router.delete('/:id/activity/:activityId', auth, itineraryBuilderController.deleteActivity);

// @route   PUT /api/itinerary-builder/:id/move-activity
// @desc    Move activity to different day or position
// @access  Private
router.put('/:id/move-activity', auth, itineraryBuilderController.moveActivity);

// @route   GET /api/itinerary-builder/:id/check-conflicts
// @desc    Check for time conflicts in itinerary
// @access  Private
router.get('/:id/check-conflicts', auth, itineraryBuilderController.checkTimeConflicts);

module.exports = router;
