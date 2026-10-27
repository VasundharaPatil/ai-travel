const weatherService = require('../services/weatherService');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');

/**
 * Weather controller for handling weather-related requests
 */

// @desc    Get current weather for a location
// @route   GET /api/weather/current
// @access  Private
exports.getCurrentWeather = async (req, res) => {
  const { location } = req.query;

  if (!location) {
    return res.status(400).json({ msg: 'Location is required' });
  }

  try {
    const weatherData = await weatherService.getCurrentWeather(location);
    res.json(weatherData);
  } catch (err) {
    console.error('Error getting current weather:', err.message);
    res.status(500).json({ 
      msg: 'Error fetching weather data', 
      error: err.message 
    });
  }
};

// @desc    Get weather forecast for a location and date range
// @route   GET /api/weather/forecast
// @access  Private
exports.getWeatherForecast = async (req, res) => {
  const { location, startDate, endDate } = req.query;

  if (!location) {
    return res.status(400).json({ msg: 'Location is required' });
  }

  try {
    const forecastData = await weatherService.getForecast(
      location, 
      startDate || new Date(), 
      endDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Default to 5 days from now
    );
    res.json(forecastData);
  } catch (err) {
    console.error('Error getting weather forecast:', err.message);
    res.status(500).json({ 
      msg: 'Error fetching forecast data', 
      error: err.message 
    });
  }
};

// @desc    Get weather forecast for a trip
// @route   GET /api/weather/trip/:id
// @access  Private
exports.getTripWeather = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const forecastData = await weatherService.getForecast(
      trip.destination,
      trip.startDate,
      trip.endDate
    );

    res.json({
      trip: {
        id: trip._id,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate
      },
      forecast: forecastData
    });
  } catch (err) {
    console.error('Error getting trip weather:', err.message);
    res.status(500).json({ 
      msg: 'Error fetching trip weather data', 
      error: err.message 
    });
  }
};

// @desc    Get activity weather suitability
// @route   GET /api/weather/activity-suitability
// @access  Private
exports.getActivityWeatherSuitability = async (req, res) => {
  const { location, date } = req.query;

  if (!location || !date) {
    return res.status(400).json({ msg: 'Location and date are required' });
  }

  try {
    const suitabilityData = await weatherService.getActivityWeatherSuitability(location, date);
    res.json(suitabilityData);
  } catch (err) {
    console.error('Error getting activity weather suitability:', err.message);
    res.status(500).json({ 
      msg: 'Error fetching activity weather suitability', 
      error: err.message 
    });
  }
};

// @desc    Update itinerary with weather forecasts
// @route   PUT /api/weather/itinerary/:id
// @access  Private
exports.updateItineraryWeather = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Get the associated trip to check user authorization
    const trip = await Trip.findById(itinerary.trip);

    if (!trip) {
      return res.status(404).json({ msg: 'Associated trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get weather forecasts for each day in the itinerary
    const weatherUpdates = [];

    for (const day of itinerary.days) {
      // Skip days without a date
      if (!day.date) continue;

      // Get forecast for this day
      const forecast = await weatherService.getForecast(
        trip.destination,
        day.date,
        day.date
      );

      if (forecast && forecast.length > 0) {
        // Update the day's weather forecast
        day.weatherForecast = {
          temperature: forecast[0].temperature,
          conditions: forecast[0].conditions,
          precipitation: forecast[0].precipitation,
          humidity: forecast[0].humidity,
          wind: forecast[0].wind,
          isOutdoorFriendly: forecast[0].isOutdoorFriendly
        };

        // Flag activities that might be affected by weather
        day.activities.forEach(activity => {
          if (activity.weatherSensitive && !forecast[0].isOutdoorFriendly) {
            activity.weatherAlert = true;
            activity.weatherAlertMessage = `Weather may not be suitable for this activity (${forecast[0].conditions})`;
          } else {
            activity.weatherAlert = false;
            activity.weatherAlertMessage = null;
          }
        });

        weatherUpdates.push({
          date: day.date,
          conditions: forecast[0].conditions,
          isOutdoorFriendly: forecast[0].isOutdoorFriendly
        });
      }
    }

    // Save the updated itinerary
    await itinerary.save();

    res.json({
      msg: 'Itinerary weather updated successfully',
      itineraryId: itinerary._id,
      weatherUpdates
    });
  } catch (err) {
    console.error('Error updating itinerary weather:', err.message);
    res.status(500).json({ 
      msg: 'Error updating itinerary weather', 
      error: err.message 
    });
  }
};

// @desc    Get weather-optimized activity suggestions
// @route   GET /api/weather/activity-suggestions
// @access  Private
exports.getWeatherOptimizedActivities = async (req, res) => {
  const { location, startDate, endDate } = req.query;

  if (!location || !startDate || !endDate) {
    return res.status(400).json({ msg: 'Location, start date, and end date are required' });
  }

  try {
    // Get weather forecast for the date range
    const forecast = await weatherService.getForecast(location, startDate, endDate);
    
    if (!forecast || forecast.length === 0) {
      return res.status(404).json({ msg: 'Weather forecast not available for the specified dates' });
    }

    // Group days by weather conditions
    const weatherGroups = {
      goodOutdoorDays: [],
      badOutdoorDays: [],
      hotDays: [],
      coldDays: []
    };

    forecast.forEach(day => {
      // Good outdoor days
      if (day.isOutdoorFriendly) {
        weatherGroups.goodOutdoorDays.push(day.date);
      } else {
        weatherGroups.badOutdoorDays.push(day.date);
      }

      // Hot days (above 25°C)
      if (day.temperature.avg > 25) {
        weatherGroups.hotDays.push(day.date);
      }

      // Cold days (below 10°C)
      if (day.temperature.avg < 10) {
        weatherGroups.coldDays.push(day.date);
      }
    });

    // Generate activity suggestions based on weather
    const suggestions = {
      outdoorActivities: weatherGroups.goodOutdoorDays.map(date => ({
        date,
        activities: [
          { type: 'sightseeing', title: 'City Tour', description: 'Explore the city landmarks and attractions' },
          { type: 'adventure', title: 'Hiking', description: 'Enjoy nature trails and scenic views' },
          { type: 'cultural', title: 'Local Markets', description: 'Visit local markets and experience the culture' }
        ]
      })),
      indoorActivities: weatherGroups.badOutdoorDays.map(date => ({
        date,
        activities: [
          { type: 'cultural', title: 'Museums', description: 'Visit museums and art galleries' },
          { type: 'relaxation', title: 'Spa Day', description: 'Enjoy a relaxing spa treatment' },
          { type: 'food', title: 'Cooking Class', description: 'Learn to cook local dishes' }
        ]
      })),
      hotWeatherActivities: weatherGroups.hotDays.map(date => ({
        date,
        activities: [
          { type: 'relaxation', title: 'Beach Day', description: 'Relax at the beach or pool' },
          { type: 'adventure', title: 'Water Sports', description: 'Try water sports like kayaking or paddleboarding' },
          { type: 'food', title: 'Ice Cream Tour', description: 'Sample local ice cream and cold treats' }
        ]
      })),
      coldWeatherActivities: weatherGroups.coldDays.map(date => ({
        date,
        activities: [
          { type: 'relaxation', title: 'Hot Springs', description: 'Visit hot springs or thermal baths' },
          { type: 'food', title: 'Coffee Shop Tour', description: 'Explore local coffee shops and cafes' },
          { type: 'cultural', title: 'Indoor Performances', description: 'Attend concerts, theater, or local performances' }
        ]
      }))
    };

    res.json({
      location,
      dateRange: { startDate, endDate },
      forecast: forecast.map(day => ({
        date: day.date,
        conditions: day.conditions,
        temperature: day.temperature,
        isOutdoorFriendly: day.isOutdoorFriendly
      })),
      suggestions
    });
  } catch (err) {
    console.error('Error getting weather-optimized activities:', err.message);
    res.status(500).json({ 
      msg: 'Error generating weather-optimized activity suggestions', 
      error: err.message 
    });
  }
};
