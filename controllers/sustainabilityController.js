const sustainabilityService = require('../services/sustainabilityService');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');

// @desc    Calculate sustainability score for a trip
// @route   GET /api/sustainability/score/:tripId
// @access  Private
exports.getTripSustainabilityScore = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('transport')
      .populate('accommodation');

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get itinerary to include activities
    const itinerary = await Itinerary.findOne({ trip: trip._id });

    // Prepare trip data for scoring
    const tripData = {
      transport: trip.transport || [],
      accommodation: trip.accommodation || [],
      activities: itinerary ? itinerary.days.flatMap(day => day.activities) : []
    };

    // Calculate sustainability score
    const sustainabilityScore = sustainabilityService.calculateTripScore(tripData);

    // Calculate carbon footprint
    const carbonFootprint = sustainabilityService.calculateCarbonFootprint(tripData);

    res.json({
      tripId: trip._id,
      destination: trip.destination,
      sustainabilityScore,
      carbonFootprint,
      breakdown: {
        transport: tripData.transport.length > 0 ? 
          tripData.transport.map(t => ({
            type: t.type,
            score: t.sustainabilityScore || sustainabilityService.calculateTransportScore(t.type, t.distance, t.options)
          })) : [],
        accommodation: tripData.accommodation.length > 0 ? 
          tripData.accommodation.map(a => ({
            type: a.type,
            score: a.sustainabilityScore || sustainabilityService.calculateAccommodationScore(a.type, a.features)
          })) : [],
        activities: tripData.activities.length > 0 ? 
          tripData.activities.map(a => ({
            title: a.title,
            category: a.category,
            score: a.sustainabilityScore || 3
          })) : []
      }
    });
  } catch (err) {
    console.error('Error calculating sustainability score:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Get sustainable transport alternatives
// @route   GET /api/sustainability/transport-alternatives
// @access  Private
exports.getTransportAlternatives = async (req, res) => {
  const { origin, destination, travelDate, apiKey } = req.query;
  
  console.log('Transport alternatives request:', req.query);
  
  // Check for required parameters
  if (!origin || !destination) {
    return res.status(400).json({ msg: 'Origin and destination are required' });
  }
  
  try {
    // Calculate approximate distance based on origin and destination
    // For demo purposes, we're using fixed distances for common routes
    let distance = 0;
    let type = 'flight'; // Default type
    
    // Simple distance estimation for demo
    if (origin.toLowerCase() === 'home' && destination.toLowerCase() === 'goa') {
      distance = 500; // Example distance in km
    } else if (origin.toLowerCase() === 'home' && destination.toLowerCase() === 'mumbai') {
      distance = 400;
    } else if (origin.toLowerCase() === 'home' && destination.toLowerCase() === 'delhi') {
      distance = 800;
    } else {
      // Default distance for unknown routes
      distance = 600;
    }
    
    const alternatives = sustainabilityService.getSustainableTransportAlternatives(
      type,
      distance,
      origin,
      destination
    );
    
    res.json(alternatives);
  } catch (err) {
    console.error('Error getting transport alternatives:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Get sustainable accommodation options
// @route   GET /api/sustainability/accommodations
// @access  Private
exports.getSustainableAccommodations = async (req, res) => {
  const { location, type } = req.query;
  
  console.log('Eco-friendly accommodations request:', req.query);
  
  // Check for required parameters - use location instead of destination
  if (!location) {
    return res.status(400).json({ msg: 'Location is required' });
  }

  try {
    // Pass the location parameter to the service method
    const accommodations = await sustainabilityService.getSustainableAccommodations(
      location,
      type
    );

    res.json(accommodations);
  } catch (err) {
    console.error('Error getting sustainable accommodations:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Get sustainable activity options
// @route   GET /api/sustainability/activities
// @access  Private
exports.getSustainableActivities = async (req, res) => {
  const { destination, location, interests } = req.query;
  
  console.log('Sustainable activities request:', req.query);
  
  // Use either destination or location parameter
  const place = destination || location;
  
  if (!place) {
    return res.status(400).json({ msg: 'Destination or location is required' });
  }

  try {
    const activities = await sustainabilityService.getSustainableActivities(
      place,
      interests ? interests.split(',') : []
    );

    res.json(activities);
  } catch (err) {
    console.error('Error getting sustainable activities:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Get sustainability tips
// @route   GET /api/sustainability/tips
// @access  Private
exports.getSustainabilityTips = async (req, res) => {
  const { destination } = req.query;
  
  console.log('Sustainability tips request:', req.query);
  
  if (!destination) {
    return res.status(400).json({ msg: 'Destination is required' });
  }

  try {
    // The getSustainabilityTips method is async, so we need to await it
    const tips = await sustainabilityService.getSustainabilityTips(destination);
    res.json(tips);
  } catch (err) {
    console.error('Error getting sustainability tips:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Calculate carbon footprint for a trip
// @route   GET /api/sustainability/carbon-footprint/:tripId
// @access  Private
exports.getTripCarbonFootprint = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('transport')
      .populate('accommodation');

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get itinerary to include activities
    const itinerary = await Itinerary.findOne({ trip: trip._id });

    // Prepare trip data for carbon footprint calculation
    const tripData = {
      transport: trip.transport || [],
      accommodation: trip.accommodation || [],
      activities: itinerary ? itinerary.days.flatMap(day => day.activities) : [],
      days: trip.days ? trip.days.length : 0,
      travelers: trip.travelers || { adults: 1, children: 0 }
    };

    // Calculate carbon footprint
    const carbonFootprint = sustainabilityService.calculateCarbonFootprint(tripData);

    res.json({
      tripId: trip._id,
      destination: trip.destination,
      carbonFootprint
    });
  } catch (err) {
    console.error('Error calculating carbon footprint:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Update trip with sustainability information
// @route   PUT /api/sustainability/update-trip/:tripId
// @access  Private
exports.updateTripSustainability = async (req, res) => {
  try {
    let trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get itinerary to include activities
    const itinerary = await Itinerary.findOne({ trip: trip._id });

    // Prepare trip data for scoring
    const tripData = {
      transport: trip.transport || [],
      accommodation: trip.accommodation || [],
      activities: itinerary ? itinerary.days.flatMap(day => day.activities) : []
    };

    // Calculate sustainability score
    const sustainabilityScore = sustainabilityService.calculateTripScore(tripData);

    // Calculate carbon footprint
    const carbonFootprint = sustainabilityService.calculateCarbonFootprint(tripData);

    // Update trip with sustainability information
    trip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      { 
        $set: { 
          sustainabilityScore,
          carbonFootprint: carbonFootprint.totalCO2,
          sustainabilityUpdatedAt: Date.now()
        } 
      },
      { new: true }
    );

    // Update itinerary sustainability score if it exists
    if (itinerary) {
      itinerary.sustainabilityScore = sustainabilityScore;
      await itinerary.save();
    }

    res.json({
      msg: 'Trip sustainability information updated',
      trip: {
        id: trip._id,
        destination: trip.destination,
        sustainabilityScore,
        carbonFootprint: carbonFootprint.totalCO2
      }
    });
  } catch (err) {
    console.error('Error updating trip sustainability:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
