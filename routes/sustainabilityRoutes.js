const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sustainabilityController = require('../controllers/sustainabilityController');

// @route   GET /api/sustainability/score/:tripId
// @desc    Calculate sustainability score for a trip
// @access  Private
router.get('/score/:tripId', auth, sustainabilityController.getTripSustainabilityScore);

// @route   GET /api/sustainability/transport-alternatives
// @desc    Get sustainable transport alternatives
// @access  Private
router.get('/transport-alternatives', auth, sustainabilityController.getTransportAlternatives);

// @route   GET /api/sustainability/accommodations
// @desc    Get sustainable accommodation options
// @access  Private
router.get('/accommodations', auth, sustainabilityController.getSustainableAccommodations);

// @route   GET /api/sustainability/activities
// @desc    Get sustainable activity options
// @access  Private
router.get('/activities', auth, sustainabilityController.getSustainableActivities);

// @route   GET /api/sustainability/tips
// @desc    Get sustainability tips
// @access  Private
router.get('/tips', auth, sustainabilityController.getSustainabilityTips);
module.exports = router;
