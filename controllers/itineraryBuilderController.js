const Itinerary = require('../models/Itinerary');
const Trip = require('../models/Trip');
const weatherService = require('../services/weatherService');

// @desc    Get itinerary for editing
// @route   GET /api/itinerary-builder/:id
// @access  Private
exports.getItineraryForEditing = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('trip', 'destination startDate endDate budget');

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

    // Get weather forecasts for each day if not already present
    for (const day of itinerary.days) {
      if (!day.weatherForecast || !day.weatherForecast.temperature) {
        try {
          const forecast = await weatherService.getForecast(
            trip.destination,
            day.date,
            day.date
          );

          if (forecast && forecast.length > 0) {
            day.weatherForecast = {
              temperature: forecast[0].temperature,
              conditions: forecast[0].conditions,
              precipitation: forecast[0].precipitation,
              isOutdoorFriendly: forecast[0].isOutdoorFriendly
            };
          }
        } catch (weatherError) {
          console.error('Error fetching weather for itinerary day:', weatherError);
          // Continue without weather data if there's an error
        }
      }
    }

    // Calculate total costs and durations
    calculateItineraryMetrics(itinerary);

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error('Error getting itinerary for editing:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update activity in itinerary
// @route   PUT /api/itinerary-builder/:id/activity/:activityId
// @access  Private
exports.updateActivity = async (req, res) => {
  const { title, description, category, startTime, endTime, cost, location, bookingStatus } = req.body;

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

    // Find the activity
    let activityFound = false;
    let dayIndex = -1;
    let activityIndex = -1;

    for (let i = 0; i < itinerary.days.length; i++) {
      const day = itinerary.days[i];
      for (let j = 0; j < day.activities.length; j++) {
        if (day.activities[j]._id.toString() === req.params.activityId) {
          activityFound = true;
          dayIndex = i;
          activityIndex = j;
          break;
        }
      }
      if (activityFound) break;
    }

    if (!activityFound) {
      return res.status(404).json({ msg: 'Activity not found in itinerary' });
    }

    // Update activity fields
    const activity = itinerary.days[dayIndex].activities[activityIndex];

    if (title) activity.title = title;
    if (description) activity.description = description;
    if (category) activity.category = category;
    if (startTime) activity.startTime = new Date(startTime);
    if (endTime) activity.endTime = new Date(endTime);
    
    // Update cost if provided
    if (cost) {
      if (typeof cost === 'object') {
        activity.cost = cost;
      } else {
        activity.cost = {
          amount: parseFloat(cost),
          currency: trip.budget.currency || 'USD'
        };
      }
    }
    
    // Update location if provided
    if (location) {
      if (typeof location === 'object') {
        activity.location = location;
      } else {
        activity.location = {
          name: location,
          coordinates: activity.location?.coordinates || {}
        };
      }
    }
    
    if (bookingStatus) activity.bookingStatus = bookingStatus;

    // Calculate duration if start and end times are provided
    if (activity.startTime && activity.endTime) {
      const durationMs = activity.endTime - activity.startTime;
      activity.duration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    }

    // Recalculate day cost
    let totalDayCost = 0;
    itinerary.days[dayIndex].activities.forEach(act => {
      if (act.cost && act.cost.amount) {
        totalDayCost += act.cost.amount;
      }
    });
    itinerary.days[dayIndex].totalDayCost = totalDayCost;

    // Recalculate total itinerary cost
    calculateItineraryMetrics(itinerary);

    await itinerary.save();

    res.json({
      msg: 'Activity updated successfully',
      activity,
      dayIndex,
      activityIndex,
      itineraryMetrics: {
        totalCost: itinerary.totalCost,
        totalDuration: itinerary.totalDuration
      }
    });
  } catch (err) {
    console.error('Error updating activity:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or activity not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Add new activity to itinerary
// @route   POST /api/itinerary-builder/:id/day/:dayIndex/activity
// @access  Private
exports.addActivity = async (req, res) => {
  const { 
    title, 
    description, 
    category, 
    startTime, 
    endTime, 
    duration, 
    cost, 
    location, 
    bookingStatus,
    weatherSensitive
  } = req.body;

  // Validate required fields
  if (!title) {
    return res.status(400).json({ msg: 'Title is required' });
  }

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

    // Check if day index is valid
    const dayIndex = parseInt(req.params.dayIndex);
    if (dayIndex < 0 || dayIndex >= itinerary.days.length) {
      return res.status(400).json({ msg: 'Invalid day index' });
    }

    // Create new activity
    const newActivity = {
      title,
      description: description || '',
      category: category || 'sightseeing',
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      cost: cost ? (typeof cost === 'object' ? cost : { amount: parseFloat(cost), currency: trip.budget.currency || 'USD' }) : { amount: 0, currency: trip.budget.currency || 'USD' },
      location: location ? (typeof location === 'object' ? location : { name: location }) : { name: trip.destination },
      bookingStatus: bookingStatus || 'not-booked',
      weatherSensitive: weatherSensitive || (category === 'sightseeing' || category === 'adventure' || category === 'relaxation')
    };
    
    // Sustainability removed

    // Calculate duration if start and end times are provided
    if (newActivity.startTime && newActivity.endTime) {
      const durationMs = newActivity.endTime - newActivity.startTime;
      newActivity.duration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    } else {
      newActivity.duration = 120; // Default 2 hours
    }

    // Add activity to the day
    itinerary.days[dayIndex].activities.push(newActivity);

    // Recalculate day cost
    let totalDayCost = 0;
    itinerary.days[dayIndex].activities.forEach(act => {
      if (act.cost && act.cost.amount) {
        totalDayCost += act.cost.amount;
      }
    });
    itinerary.days[dayIndex].totalDayCost = totalDayCost;

    // Recalculate total itinerary cost
    calculateItineraryMetrics(itinerary);

    await itinerary.save();

    res.json({
      msg: 'Activity added successfully',
      activity: itinerary.days[dayIndex].activities[itinerary.days[dayIndex].activities.length - 1],
      dayIndex,
      activityIndex: itinerary.days[dayIndex].activities.length - 1,
      itineraryMetrics: {
        totalCost: itinerary.totalCost,
        totalDuration: itinerary.totalDuration
      }
    });
  } catch (err) {
    console.error('Error adding activity:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete activity from itinerary
// @route   DELETE /api/itinerary-builder/:id/activity/:activityId
// @access  Private
exports.deleteActivity = async (req, res) => {
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

    // Find the activity
    let activityFound = false;
    let dayIndex = -1;
    let activityIndex = -1;

    for (let i = 0; i < itinerary.days.length; i++) {
      const day = itinerary.days[i];
      for (let j = 0; j < day.activities.length; j++) {
        if (day.activities[j]._id.toString() === req.params.activityId) {
          activityFound = true;
          dayIndex = i;
          activityIndex = j;
          break;
        }
      }
      if (activityFound) break;
    }

    if (!activityFound) {
      return res.status(404).json({ msg: 'Activity not found in itinerary' });
    }

    // Remove the activity
    itinerary.days[dayIndex].activities.splice(activityIndex, 1);

    // Recalculate day cost
    let totalDayCost = 0;
    itinerary.days[dayIndex].activities.forEach(act => {
      if (act.cost && act.cost.amount) {
        totalDayCost += act.cost.amount;
      }
    });
    itinerary.days[dayIndex].totalDayCost = totalDayCost;

    // Recalculate total itinerary cost
    calculateItineraryMetrics(itinerary);

    await itinerary.save();

    res.json({
      msg: 'Activity deleted successfully',
      dayIndex,
      activityIndex,
      itineraryMetrics: {
        totalCost: itinerary.totalCost,
        totalDuration: itinerary.totalDuration
      }
    });
  } catch (err) {
    console.error('Error deleting activity:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or activity not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Move activity to different day or position
// @route   PUT /api/itinerary-builder/:id/move-activity
// @access  Private
exports.moveActivity = async (req, res) => {
  const { activityId, sourceDayIndex, sourceActivityIndex, targetDayIndex, targetActivityIndex } = req.body;

  // Validate required fields
  if (sourceDayIndex === undefined || sourceActivityIndex === undefined || 
      targetDayIndex === undefined || targetActivityIndex === undefined) {
    return res.status(400).json({ msg: 'Source and target indices are required' });
  }

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

    // Check if day indices are valid
    if (sourceDayIndex < 0 || sourceDayIndex >= itinerary.days.length ||
        targetDayIndex < 0 || targetDayIndex >= itinerary.days.length) {
      return res.status(400).json({ msg: 'Invalid day index' });
    }

    // Check if activity indices are valid
    if (sourceActivityIndex < 0 || sourceActivityIndex >= itinerary.days[sourceDayIndex].activities.length) {
      return res.status(400).json({ msg: 'Invalid source activity index' });
    }

    if (targetActivityIndex < 0 || targetActivityIndex > itinerary.days[targetDayIndex].activities.length) {
      return res.status(400).json({ msg: 'Invalid target activity index' });
    }

    // Get the activity to move
    const activity = itinerary.days[sourceDayIndex].activities[sourceActivityIndex];

    // Remove from source
    itinerary.days[sourceDayIndex].activities.splice(sourceActivityIndex, 1);

    // Add to target
    itinerary.days[targetDayIndex].activities.splice(targetActivityIndex, 0, activity);

    // Recalculate costs for both days
    [sourceDayIndex, targetDayIndex].forEach(idx => {
      let totalDayCost = 0;
      itinerary.days[idx].activities.forEach(act => {
        if (act.cost && act.cost.amount) {
          totalDayCost += act.cost.amount;
        }
      });
      itinerary.days[idx].totalDayCost = totalDayCost;
    });

    // Recalculate total itinerary metrics
    calculateItineraryMetrics(itinerary);

    await itinerary.save();

    res.json({
      msg: 'Activity moved successfully',
      sourceDayIndex,
      sourceActivityIndex,
      targetDayIndex,
      targetActivityIndex,
      activity,
      itineraryMetrics: {
        totalCost: itinerary.totalCost,
        totalDuration: itinerary.totalDuration
      }
    });
  } catch (err) {
    console.error('Error moving activity:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Check for time conflicts in itinerary
// @route   GET /api/itinerary-builder/:id/check-conflicts
// @access  Private
exports.checkTimeConflicts = async (req, res) => {
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

    // Check for time conflicts in each day
    const conflicts = [];

    itinerary.days.forEach((day, dayIndex) => {
      // Sort activities by start time
      const sortedActivities = [...day.activities]
        .filter(a => a.startTime && a.endTime) // Only check activities with start and end times
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      // Check for overlaps
      for (let i = 0; i < sortedActivities.length - 1; i++) {
        const currentActivity = sortedActivities[i];
        const nextActivity = sortedActivities[i + 1];

        if (new Date(currentActivity.endTime) > new Date(nextActivity.startTime)) {
          // Found a conflict
          conflicts.push({
            dayIndex,
            dayDate: day.date,
            conflict: {
              activity1: {
                id: currentActivity._id,
                title: currentActivity.title,
                startTime: currentActivity.startTime,
                endTime: currentActivity.endTime
              },
              activity2: {
                id: nextActivity._id,
                title: nextActivity.title,
                startTime: nextActivity.startTime,
                endTime: nextActivity.endTime
              },
              overlapMinutes: Math.round(
                (new Date(currentActivity.endTime) - new Date(nextActivity.startTime)) / (1000 * 60)
              )
            }
          });
        }
      }

      // Check for travel time feasibility between locations
      // This would require a more complex implementation with distance calculation
      // For now, we'll just check for activities that are too close in time
      for (let i = 0; i < sortedActivities.length - 1; i++) {
        const currentActivity = sortedActivities[i];
        const nextActivity = sortedActivities[i + 1];

        // Calculate time between activities in minutes
        const timeBetween = (
          new Date(nextActivity.startTime) - new Date(currentActivity.endTime)
        ) / (1000 * 60);

        // If activities are at different locations and less than 30 minutes apart
        if (timeBetween < 30 && 
            currentActivity.location && nextActivity.location &&
            currentActivity.location.name !== nextActivity.location.name) {
          conflicts.push({
            dayIndex,
            dayDate: day.date,
            conflict: {
              type: 'travel-time',
              activity1: {
                id: currentActivity._id,
                title: currentActivity.title,
                location: currentActivity.location.name,
                endTime: currentActivity.endTime
              },
              activity2: {
                id: nextActivity._id,
                title: nextActivity.title,
                location: nextActivity.location.name,
                startTime: nextActivity.startTime
              },
              timeBetweenMinutes: timeBetween
            }
          });
        }
      }
    });

    res.json({
      conflicts,
      hasConflicts: conflicts.length > 0
    });
  } catch (err) {
    console.error('Error checking time conflicts:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// Helper function to calculate itinerary metrics
function calculateItineraryMetrics(itinerary) {
  // Calculate total cost and duration only (sustainability removed)
  let totalCost = 0;
  let totalDuration = 0;

  itinerary.days.forEach(day => {
    totalCost += day.totalDayCost || 0;
    day.activities.forEach(activity => {
      if (activity.duration) {
        totalDuration += activity.duration;
      } else if (activity.startTime && activity.endTime) {
        const durationMs = new Date(activity.endTime) - new Date(activity.startTime);
        totalDuration += Math.round(durationMs / (1000 * 60));
      }
    });
  });

  itinerary.totalCost = totalCost;
  itinerary.totalDuration = totalDuration;

  return { totalCost, totalDuration };
}
