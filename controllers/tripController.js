const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const { validationResult } = require('express-validator');

// @desc    Create a new trip with automatic AI itinerary generation
// @route   POST /api/trips
// @access  Private
exports.createTrip = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    title, 
    destination, 
    startDate, 
    endDate, 
    budget, 
    travelers, 
    preferences 
  } = req.body;

  try {
    // Create new trip
    const newTrip = new Trip({
      user: req.user.id,
      title,
      destination,
      startDate,
      endDate,
      budget,
      travelers,
      preferences
    });

    // Save the trip
    const trip = await newTrip.save();
    
    // Automatically generate an itinerary for the trip
    try {
      console.log(`Automatically generating AI itinerary for new trip: ${trip._id}`);
      
      // Calculate number of days
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Generate itinerary days array
      const days = [];
      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        
        days.push({
          date: currentDate,
          activities: [],
          notes: '',
          weatherForecast: {},
          currency: 'INR'
        });
      }

      // Create new itinerary
      const newItinerary = new Itinerary({
        trip: trip._id,
        theme: 'custom', // Using 'custom' as it's a valid enum value
        days
      });

      // Save itinerary
      const itinerary = await newItinerary.save();

      // Update trip with itinerary reference
      trip.itinerary = itinerary._id;
      await trip.save();

      // Generate AI-powered activities for each day
      const itineraryController = require('./itineraryController');
      await itineraryController.generateActivitiesWithAI(newItinerary, trip);
      
      console.log(`Successfully generated AI itinerary for trip: ${trip._id}`);
      
      // Return the trip with the itinerary ID
      res.json(trip);
    } catch (itineraryError) {
      console.error('Error generating automatic itinerary:', itineraryError);
      // Still return the trip even if itinerary generation fails
      res.json(trip);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get notes for a trip
// @route   GET /api/trips/:id/notes
// @access  Private
exports.getTripNotes = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    res.json(trip.notes || []);
  } catch (err) {
    console.error('Error fetching trip notes:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Add a note to a trip
// @route   POST /api/trips/:id/notes
// @access  Private
exports.addTripNote = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ msg: 'Title and content are required' });
    }
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    const newNote = {
      title,
      content,
      category: category || 'general',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    trip.notes = trip.notes || [];
    trip.notes.push(newNote);
    await trip.save();
    res.status(201).json(trip.notes[trip.notes.length - 1]);
  } catch (err) {
    console.error('Error adding trip note:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update a note on a trip
// @route   PUT /api/trips/:id/notes/:noteId
// @access  Private
exports.updateTripNote = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const tripId = req.params.id;
    const noteId = req.params.noteId;

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ msg: 'Invalid trip ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ msg: 'Invalid note ID' });
    }

    const setPayload = { 'notes.$.updatedAt': new Date() };
    if (typeof title === 'string') setPayload['notes.$.title'] = title;
    if (typeof content === 'string') setPayload['notes.$.content'] = content;
    if (typeof category === 'string') setPayload['notes.$.category'] = category;

    const updated = await Trip.findOneAndUpdate(
      { _id: tripId, user: req.user.id, 'notes._id': noteId },
      { $set: setPayload },
      { new: true, projection: { notes: { $elemMatch: { _id: noteId } } } }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Trip or note not found' });
    }

    res.json(updated.notes[0]);
  } catch (err) {
    console.error('Error updating trip note:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// @desc    Delete a note from a trip
// @route   DELETE /api/trips/:id/notes/:noteId
// @access  Private
exports.deleteTripNote = async (req, res) => {
  try {
    const tripId = req.params.id;
    const noteId = req.params.noteId;

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ msg: 'Invalid trip ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ msg: 'Invalid note ID' });
    }

    const result = await Trip.updateOne(
      { _id: tripId, user: req.user.id },
      { $pull: { notes: { _id: noteId } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'Trip not found or unauthorized' });
    }
    // For older Mongoose, use nModified; for newer, use modifiedCount
    const modified = typeof result.modifiedCount === 'number' ? result.modifiedCount : result.nModified;
    if (!modified) {
      return res.status(404).json({ msg: 'Note not found' });
    }

    res.json({ msg: 'Note deleted' });
  } catch (err) {
    console.error('Error deleting trip note:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// @desc    Get all trips for a user
// @route   GET /api/trips
// @access  Private
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get trip by ID
// @route   GET /api/trips/:id
// @access  Private
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('itinerary');

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Trip not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update a trip
// @route   PUT /api/trips/:id
// @access  Private
module.exports.updateTrip = async (req, res) => {
  const { 
    title, 
    destination, 
    startDate, 
    endDate, 
    travelers, 
    preferences,
    status,
    aiRecommendations
  } = req.body;

  // Build trip object
  const tripFields = {};
  if (title) tripFields.title = title;
  if (destination) tripFields.destination = destination;
  if (startDate) tripFields.startDate = startDate;
  if (endDate) tripFields.endDate = endDate;
  if (travelers) tripFields.travelers = travelers;
  if (preferences) tripFields.preferences = preferences;
  if (status) tripFields.status = status;
  
  // Handle AI recommendations
  if (aiRecommendations) {
    // Ensure proper structure for aiRecommendations
    const validRecommendations = {
      activities: Array.isArray(aiRecommendations.activities) ? aiRecommendations.activities : [],
      budget: Array.isArray(aiRecommendations.budget) ? aiRecommendations.budget : [],
      time: Array.isArray(aiRecommendations.time) ? aiRecommendations.time : [],
      generatedAt: new Date()
    };
    
    tripFields.aiRecommendations = validRecommendations;
    console.log('Saving AI recommendations to trip:', tripFields.aiRecommendations);
  }

  try {
    let trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: tripFields },
      { new: true }
    );

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Trip not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete a trip
// @route   DELETE /api/trips/:id
// @access  Private
module.exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // First, check if there's an associated itinerary and delete it
    if (trip.itinerary) {
      console.log(`Deleting associated itinerary: ${trip.itinerary}`);
      try {
        const deletedItinerary = await Itinerary.findByIdAndDelete(trip.itinerary);
        console.log('Associated itinerary deleted successfully');
        
        // Verify itinerary deletion
        const verifyItineraryDeletion = await Itinerary.findById(trip.itinerary);
        if (!verifyItineraryDeletion) {
          console.log(`Verified: Itinerary ${trip.itinerary} no longer exists in the database`);
        } else {
          console.error(`Warning: Itinerary ${trip.itinerary} still exists in the database after deletion attempt`);
        }
      } catch (itineraryErr) {
        console.error('Error deleting associated itinerary:', itineraryErr);
        // Continue with trip deletion even if itinerary deletion fails
      }
    }

    // Use findByIdAndDelete instead of remove() which is deprecated
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    console.log(`Trip deleted successfully: ${req.params.id}`);
    
    // Verify deletion by trying to find the trip again
    const verifyDeletion = await Trip.findById(req.params.id);
    if (!verifyDeletion) {
      console.log(`Verified: Trip ${req.params.id} no longer exists in the database`);
    } else {
      console.error(`Warning: Trip ${req.params.id} still exists in the database after deletion attempt`);
    }

    res.json({ msg: 'Trip removed' });
  } catch (err) {
    console.error('Error deleting trip:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Trip not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update trip budget
// @route   PUT /api/trips/:id/budget
// @access  Private
exports.updateTripBudget = async (req, res) => {
  const { budget } = req.body;

  try {
    let trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Validate budget data
    if (!budget.total || budget.total <= 0) {
      return res.status(400).json({ msg: 'Total budget must be a positive number' });
    }

    // Calculate per-person budget if travelers info exists
    if (trip.travelers && (trip.travelers.adults > 0 || trip.travelers.children > 0)) {
      const totalTravelers = (trip.travelers.adults || 0) + (trip.travelers.children || 0);
      if (totalTravelers > 0) {
        budget.perPerson = Math.round(budget.total / totalTravelers);
      }
    }

    // Ensure budget breakdown adds up to total
    if (budget.breakdown) {
      const { transport, accommodation, food, activities, other } = budget.breakdown;
      const sum = (transport || 0) + (accommodation || 0) + (food || 0) + (activities || 0) + (other || 0);
      
      // If breakdown doesn't match total, adjust proportionally
      if (sum > 0 && sum !== budget.total) {
        const ratio = budget.total / sum;
        budget.breakdown = {
          transport: Math.round((transport || 0) * ratio),
          accommodation: Math.round((accommodation || 0) * ratio),
          food: Math.round((food || 0) * ratio),
          activities: Math.round((activities || 0) * ratio),
          other: Math.round((other || 0) * ratio)
        };
        
        // Fix any rounding errors by adjusting 'other' category
        const newSum = budget.breakdown.transport + budget.breakdown.accommodation + 
                      budget.breakdown.food + budget.breakdown.activities + budget.breakdown.other;
        if (newSum !== budget.total) {
          budget.breakdown.other += (budget.total - newSum);
        }
      }
    } else {
      // Create default budget breakdown if none provided
      budget.breakdown = {
        transport: Math.round(budget.total * 0.3), // 30% for transport
        accommodation: Math.round(budget.total * 0.3), // 30% for accommodation
        food: Math.round(budget.total * 0.2), // 20% for food
        activities: Math.round(budget.total * 0.15), // 15% for activities
        other: Math.round(budget.total * 0.05) // 5% for other expenses
      };
      
      // Fix any rounding errors
      const sum = budget.breakdown.transport + budget.breakdown.accommodation + 
                budget.breakdown.food + budget.breakdown.activities + budget.breakdown.other;
      if (sum !== budget.total) {
        budget.breakdown.other += (budget.total - sum);
      }
    }

    // Add budget alerts if prices have changed
    if (trip.budget && trip.budget.total !== budget.total) {
      const change = budget.total - trip.budget.total;
      const changePercent = Math.abs(Math.round((change / trip.budget.total) * 100));
      
      if (changePercent >= 10) { // Only alert for changes of 10% or more
        budget.alerts = [
          ...((trip.budget.alerts || [])),
          {
            type: change > 0 ? 'increase' : 'decrease',
            message: `Budget ${change > 0 ? 'increased' : 'decreased'} by ${changePercent}% (${Math.abs(change)} ${budget.currency || 'USD'})`,
            date: new Date()
          }
        ];
        
        // Keep only the 5 most recent alerts
        if (budget.alerts.length > 5) {
          budget.alerts = budget.alerts.slice(-5);
        }
      }
    }

    trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { budget } },
      { new: true }
    );

    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Trip not found' });
    }
    res.status(500).send('Server error');
  }
};
