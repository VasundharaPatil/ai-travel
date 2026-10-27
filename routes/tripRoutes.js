const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers (to be implemented)
const { 
  createTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  updateTripBudget,
  getTripNotes,
  addTripNote,
  updateTripNote,
  deleteTripNote
} = require('../controllers/tripController');

// Import middleware (to be implemented)
const auth = require('../middleware/auth');

// @route   POST api/trips
// @desc    Create a new trip
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('destination', 'Destination is required').not().isEmpty(),
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
      check('budget.total', 'Total budget is required').not().isEmpty()
    ]
  ],
  createTrip
);

// @route   GET api/trips
// @desc    Get all trips for a user
// @access  Private
router.get('/', auth, getAllTrips);

// @route   GET api/trips/:id
// @desc    Get trip by ID
// @access  Private
router.get('/:id', auth, getTripById);

// @route   PUT api/trips/:id
// @desc    Update a trip
// @access  Private
router.put('/:id', auth, updateTrip);

// @route   DELETE api/trips/:id
// @desc    Delete a trip
// @access  Private
router.delete('/:id', auth, deleteTrip);

// @route   PUT api/trips/:id/budget
// @desc    Update trip budget
// @access  Private
router.put('/:id/budget', auth, updateTripBudget);

// @route   GET api/trips/:id/notes
// @desc    Get notes for a trip
// @access  Private
router.get('/:id/notes', auth, getTripNotes);

// @route   POST api/trips/:id/notes
// @desc    Add a note to a trip
// @access  Private
router.post('/:id/notes', auth, addTripNote);

// @route   PUT api/trips/:id/notes/:noteId
// @desc    Update a note on a trip
// @access  Private
router.put('/:id/notes/:noteId', auth, updateTripNote);

// @route   DELETE api/trips/:id/notes/:noteId
// @desc    Delete a note from a trip
// @access  Private
router.delete('/:id/notes/:noteId', auth, deleteTripNote);

module.exports = router;
