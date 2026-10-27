const Itinerary = require('../models/Itinerary');
const Trip = require('../models/Trip');
require('dotenv').config();
const { geminiConfig } = require('../config/gemini-config');

// Initialize Gemini model for itinerary generation
const geminiModel = geminiConfig.getModel('gemini-2.5-flash');

// Helper function to process an activity and ensure it has all required fields
function processActivity(activity, dayDate, trip) {
  // Ensure we have a valid activity object
  if (!activity || typeof activity !== 'object') {
    console.error('Invalid activity object:', activity);
    throw new Error('Invalid activity object');
  }
  
  // Validate title
  const title = activity.title || `Explore ${trip.destination || 'the area'}`;
  
  // Validate description
  const description = activity.description || `Discover the highlights of ${trip.destination || 'the area'}.`;
  
  // Validate category against allowed values
  let category = activity.category || 'sightseeing';
  category = validateActivityCategory(category);
  
  // Format time strings
  const startTime = formatTimeString(activity.startTime || '09:00');
  const endTime = formatTimeString(activity.endTime || '11:00');
  
  // Handle cost - could be a number, object, or missing
  let cost = { amount: 0, currency: trip.budget ? trip.budget.currency : 'USD' };
  
  if (activity.cost) {
    if (typeof activity.cost === 'object' && activity.cost !== null) {
      // If cost is an object, extract amount and currency
      if (activity.cost.amount !== undefined && !isNaN(Number(activity.cost.amount))) {
        cost.amount = Number(activity.cost.amount);
      }
      if (activity.cost.currency) {
        cost.currency = activity.cost.currency;
      }
    } else if (!isNaN(Number(activity.cost))) {
      // If cost is a number, use it as the amount
      cost.amount = Number(activity.cost);
    }
  }
  
  // Calculate duration in minutes
  let duration = activity.duration || 120; // Default 2 hours
  
  // If duration is not provided but start and end times are, calculate it
  if (!activity.duration && startTime && endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight activities
    
    duration = durationMinutes;
  }
  
  // Handle location - could be a string or an object
  let location = { name: trip.destination || 'Local Area' };
  if (activity.location) {
    if (typeof activity.location === 'object' && activity.location !== null) {
      location = {
        name: activity.location.name || trip.destination || 'Local Area',
        coordinates: activity.location.coordinates || null,
        address: activity.location.address || null
      };
    } else if (typeof activity.location === 'string') {
      location = { name: activity.location };
    }
  }
  
  return {
    title: title,
    description: description,
    category: category,
    startTime: startTime,
    endTime: endTime,
    duration: duration,
    cost: cost,
    location: location,
    bookingStatus: 'not-booked',
    weatherSensitive: activity.weatherSensitive || false,
    accessibility: activity.accessibility || { wheelchairAccessible: true, hearingAccessible: true, visuallyAccessible: true }
  };
}

// Helper function to validate and map activity categories to ensure they match allowed values
function validateActivityCategory(category) {
  // Valid categories in the Itinerary model
  const validCategories = ['sightseeing', 'food', 'adventure', 'relaxation', 'cultural', 'shopping', 'transport', 'accommodation'];
  
  // Default category if none provided
  if (!category) return 'sightseeing';
  
  // If already valid, return as is
  if (validCategories.includes(category)) return category;
  
  // Check if this is a combined category (e.g., "sightseeing, cultural")
  if (typeof category === 'string' && category.includes(',')) {
    const categories = category.split(',').map(c => c.trim().toLowerCase());
    // Use the first valid category found
    for (const c of categories) {
      if (validCategories.includes(c)) {
        console.log(`Using first valid category '${c}' from combined categories '${category}'`);
        return c;
      }
    }
  }
  
  // Map common non-standard categories to valid ones
  const categoryMapping = {
    'entertainment': 'cultural',
    'dining': 'food',
    'lunch': 'food',
    'dinner': 'food',
    'breakfast': 'food',
    'tour': 'sightseeing',
    'beach': 'relaxation',
    'nature': 'adventure',
    'historical': 'cultural',
    'museum': 'cultural',
    'arts': 'cultural',
    'nightlife': 'cultural',
    'spa': 'relaxation',
    'wellness': 'relaxation',
    'sports': 'adventure',
    'hiking': 'adventure',
    'water sports': 'adventure',
    'travel': 'transport',
    'hotel': 'accommodation',
    'resort': 'accommodation',
    'stay': 'accommodation'
  };
  
  // Check if category needs to be mapped
  const lowerCategory = category.toLowerCase();
  if (categoryMapping[lowerCategory]) {
    console.log(`Mapping category '${category}' to '${categoryMapping[lowerCategory]}'`);
    return categoryMapping[lowerCategory];
  }
  
  // If still not valid, default to sightseeing
  console.log(`Invalid category '${category}', defaulting to 'sightseeing'`);
  return 'sightseeing';
}

// Helper function to validate all activities in an itinerary
function validateAllActivities(itinerary) {
  if (!itinerary || !itinerary.days) return;
  
  let totalValidated = 0;
  let timeFieldsFixed = 0;
  let costFieldsFixed = 0;
  
  itinerary.days.forEach((day, dayIndex) => {
    if (!day.activities || !Array.isArray(day.activities)) return;
    
    const dayDate = new Date(day.date);
    
    day.activities.forEach((activity, activityIndex) => {
      // Validate category
      if (activity.category) {
        const originalCategory = activity.category;
        activity.category = validateActivityCategory(activity.category);
        
        if (originalCategory !== activity.category) {
          console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Changed category from '${originalCategory}' to '${activity.category}'`);
          totalValidated++;
        }
      } else {
        activity.category = 'sightseeing';
        console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Missing category, set to 'sightseeing'`);
        totalValidated++;
      }
      
      // Validate startTime and endTime
      if (activity.startTime) {
        const originalStartTime = activity.startTime;
        activity.startTime = formatTimeString(originalStartTime);
        if (originalStartTime !== activity.startTime) {
          console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Fixed startTime from '${originalStartTime}' to '${activity.startTime}'`);
          timeFieldsFixed++;
        }
      } else {
        // Set default start time if missing
        activity.startTime = formatTimeString('09:00');
        console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Added missing startTime: '${activity.startTime}'`);
        timeFieldsFixed++;
      }
      
      if (activity.endTime) {
        const originalEndTime = activity.endTime;
        activity.endTime = formatTimeString(originalEndTime);
        if (originalEndTime !== activity.endTime) {
          console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Fixed endTime from '${originalEndTime}' to '${activity.endTime}'`);
          timeFieldsFixed++;
        }
      } else {
        // Set default end time if missing
        activity.endTime = formatTimeString('11:00');
        console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Added missing endTime: '${activity.endTime}'`);
        timeFieldsFixed++;
      }
      
      // Validate cost amount
      if (activity.cost) {
        // Make sure cost is an object
        if (typeof activity.cost !== 'object') {
          activity.cost = { amount: 20, currency: 'USD' };
          console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Fixed non-object cost to default object`);
          costFieldsFixed++;
        } else {
          // Handle amount
          let costAmount = 0;
          
          // Try to parse the amount if it's a string
          if (typeof activity.cost.amount === 'string') {
            try {
              costAmount = parseFloat(activity.cost.amount.replace(/[^0-9.]/g, ''));
            } catch (e) {
              costAmount = 0;
            }
          } else if (typeof activity.cost.amount === 'number') {
            costAmount = activity.cost.amount;
          }
          
          // If we still have an invalid amount, set a default based on category
          if (isNaN(costAmount) || costAmount === undefined || costAmount === null) {
            // Set a default cost based on activity category
            let defaultCost = 20; // Default base cost
            
            switch(activity.category) {
              case 'accommodation': defaultCost = 100; break;
              case 'transport': defaultCost = 50; break;
              case 'food': defaultCost = 30; break;
              case 'adventure': defaultCost = 60; break;
              case 'cultural': defaultCost = 40; break;
              case 'shopping': defaultCost = 0; break; // Shopping has no upfront cost
              case 'relaxation': defaultCost = 45; break;
              // sightseeing uses the default 20
            }
            
            console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Fixed invalid cost amount to ${defaultCost}`);
            costAmount = defaultCost;
            costFieldsFixed++;
          }
          
          // Ensure amount is a valid number (not NaN)
          activity.cost.amount = Math.max(0, Math.round(costAmount * 100) / 100);
          
          // Ensure currency is set
          if (!activity.cost.currency) {
            activity.cost.currency = 'USD';
            console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Set missing currency to USD`);
          }
        }
      } else {
        // Create a default cost object if missing
        activity.cost = { amount: 20, currency: 'USD' };
        console.log(`Day ${dayIndex + 1}, Activity ${activityIndex + 1}: Created default cost object`);
        costFieldsFixed++;
      }
    });
  });
  
  console.log(`Validated ${totalValidated} activity categories, fixed ${timeFieldsFixed} time fields and ${costFieldsFixed} cost fields in the itinerary`);
  return itinerary;
}

// Helper function to format a time string in a consistent way
function formatTimeString(timeString, baseDate) {
  // If it's already a properly formatted time string, return it
  if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString;
  }
  
  // If baseDate is not provided, use the current date
  const date = baseDate ? new Date(baseDate) : new Date();
  
  // Parse the time string (expected format: 'HH:MM')
  if (typeof timeString === 'string' && timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':').map(Number);
    // Format as HH:MM
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Return a default time if timeString is invalid
  return '09:00';
}

// Helper function to create AI-generated activities instead of static templates
async function createFallbackActivities(itinerary, trip) {
  console.log('Creating AI-generated activities for itinerary');
  
  try {
    // Get trip details
    const destination = trip.destination || 'the area';
    const currency = trip.budget ? trip.budget.currency : 'USD';
    const totalBudget = trip.budget ? trip.budget.total : 1000;
    const dailyBudget = Math.round(totalBudget / itinerary.days.length);
    
    // Extract preferences
    let travelStyleText = 'leisure';
    let interestsText = 'sightseeing';
    let paceText = 'moderate';
    
    if (trip.preferences) {
      if (trip.preferences.travelStyle) {
        if (Array.isArray(trip.preferences.travelStyle)) {
          travelStyleText = trip.preferences.travelStyle.join(', ');
        } else if (typeof trip.preferences.travelStyle === 'string') {
          travelStyleText = trip.preferences.travelStyle;
        }
      }
      
      if (trip.preferences.interests) {
        if (Array.isArray(trip.preferences.interests)) {
          interestsText = trip.preferences.interests.join(', ');
        } else if (typeof trip.preferences.interests === 'string') {
          interestsText = trip.preferences.interests;
        }
      }
      
      if (trip.preferences.pace && typeof trip.preferences.pace === 'string') {
        paceText = trip.preferences.pace;
      }
    }
    
    // Format dates for the prompt
    const formattedDates = [];
    for (let i = 0; i < itinerary.days.length; i++) {
      const currentDate = new Date(itinerary.days[i].date);
      formattedDates.push(currentDate.toISOString().split('T')[0]);
    }
    
    // Create a simplified prompt for the AI
    const prompt = `Generate a detailed daily itinerary for a ${travelStyleText} trip to ${destination} for ${itinerary.days.length} days from ${formattedDates[0]} to ${formattedDates[formattedDates.length - 1]}.
    
    TRAVELER PREFERENCES:
    - Travel style: ${travelStyleText}
    - Interests: ${interestsText}
    - Pace: ${paceText}
    
    BUDGET INFORMATION:
    - Daily budget: approximately ${dailyBudget} ${currency}
    
    For each day, include 3-4 varied activities that make sense together and follow a logical flow throughout the day.
    Each activity should include:
    - A brief descriptive title (maximum 5-7 words)
    - A short description (1-2 sentences)
    - Category (IMPORTANT: use EXACTLY ONE of these categories without combining them: sightseeing, food, adventure, relaxation, cultural, shopping, transport, accommodation)
    - Start and end times (in 24-hour format like "09:00" and "11:30")
    - Estimated cost as a number
    - Location name (brief, 2-4 words)
    
    Format your response as a JSON array where each element represents one day with an "activities" array containing the day's activities.
    DO NOT include any explanatory text, ONLY the JSON array.
    
    EXAMPLE ACTIVITY FORMAT:
    {
      "title": "Gateway of India Tour",
      "description": "Visit the iconic Gateway of India monument and learn about its history.",
      "category": "sightseeing",
      "startTime": "09:00",
      "endTime": "11:00",
      "duration": 120,
      "cost": { "amount": 50, "currency": "USD" },
      "location": { "name": "Gateway of India" }
    }`;
    
    console.log('Sending AI prompt for itinerary generation');
    
    // Call Gemini API for itinerary generation
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    console.log('Received AI response for itinerary generation');
    
    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's any surrounding text)
      let jsonStr = aiResponse;
      
      // Check if the response is wrapped in markdown code blocks
      const markdownMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (markdownMatch && markdownMatch[1]) {
        jsonStr = markdownMatch[1];
        console.log('Successfully extracted JSON from markdown code block');
      }
      
      // If it's not in markdown but still has array format, extract it
      if (!markdownMatch) {
        const jsonMatch = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
          console.log('Successfully extracted JSON array from response');
        }
      }
      
      // Clean up the JSON string to handle common formatting issues
      jsonStr = jsonStr.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
        .replace(/\n/g, ' ') // Remove actual newlines
        .replace(/\r/g, ' ') // Remove actual carriage returns
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      // Try to parse the JSON
      let activitiesData;
      try {
        activitiesData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Initial JSON parse failed, attempting to fix JSON:', parseError);
        
        // Try to fix common JSON issues
        const fixedJsonStr = jsonStr
          .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Add quotes to keys
          .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes
        
        try {
          activitiesData = JSON.parse(fixedJsonStr);
          console.log('Successfully parsed JSON after fixing format');
        } catch (secondParseError) {
          console.error('Failed to parse JSON even after fixing:', secondParseError);
          throw new Error('Could not parse AI response as JSON');
        }
      }
      
      if (!Array.isArray(activitiesData)) {
        console.log('AI response is not an array, attempting to wrap it');
        // If it's an object but not an array, try to wrap it in an array
        if (typeof activitiesData === 'object' && activitiesData !== null) {
          activitiesData = [activitiesData];
        } else {
          throw new Error('AI response is not an array or valid object');
        }
      }
      
      // Process the activities for each day
      itinerary.days.forEach((day, dayIndex) => {
        // Clear existing activities array
        day.activities = [];
        
        // Get activities for this day from AI response
        const dayData = activitiesData[dayIndex % activitiesData.length]; // Use modulo to handle cases where AI returns fewer days
        
        // Check if dayData has activities directly or if it's a day object with activities property
        let dayActivities = [];
        
        if (Array.isArray(dayData)) {
          // If dayData is an array, assume it's an array of activities
          dayActivities = dayData;
          console.log(`Day ${dayIndex + 1}: Found ${dayActivities.length} activities in array format`);
        } else if (dayData && dayData.activities && Array.isArray(dayData.activities)) {
          // If dayData has an activities property that's an array, use that
          dayActivities = dayData.activities;
          console.log(`Day ${dayIndex + 1}: Found ${dayActivities.length} activities in object.activities format`);
        } else if (dayData && typeof dayData === 'object') {
          // If dayData is an object but doesn't have an activities array, treat the object itself as an activity
          dayActivities = [dayData];
          console.log(`Day ${dayIndex + 1}: Using object as a single activity`);
        }
        
        if (dayActivities.length > 0) {
          // Add activities to this day
          dayActivities.forEach(activity => {
            // Process the activity to ensure it has all required fields
            try {
              const processedActivity = processActivity(activity, day.date, trip);
              day.activities.push(processedActivity);
              console.log(`Added activity: ${processedActivity.title} (${processedActivity.category})`);
            } catch (activityError) {
              console.error(`Error processing activity:`, activityError);
            }
          });
          
          // Calculate day cost
          let totalDayCost = 0;
          day.activities.forEach(activity => {
            if (activity.cost && typeof activity.cost.amount === 'number' && !isNaN(activity.cost.amount)) {
              totalDayCost += activity.cost.amount;
            }
          });
          day.totalDayCost = totalDayCost;
        } else {
          // If no activities found for this day, create minimal placeholder activities
          const dayDate = new Date(day.date);
          
          // Add a basic sightseeing activity
          day.activities.push({
            title: `Explore ${destination}`,
            description: `Discover the highlights of ${destination}.`,
            category: 'sightseeing',
            startTime: formatTimeString('10:00'),
            endTime: formatTimeString('13:00'),
            duration: 180,
            cost: { amount: Math.round(dailyBudget * 0.3), currency: currency },
            location: { name: `${destination} City Center` },
            bookingStatus: 'not-booked',
            weatherSensitive: true,
            accessibility: { wheelchairAccessible: true, hearingAccessible: true, visuallyAccessible: true }
          });
          
          // Add a basic food activity
          day.activities.push({
            title: `Local Dining`,
            description: `Enjoy local cuisine in ${destination}.`,
            category: 'food',
            startTime: formatTimeString('13:30'),
            endTime: formatTimeString('15:00'),
            duration: 90,
            cost: { amount: Math.round(dailyBudget * 0.2), currency: currency },
            location: { name: `${destination} Restaurant District` },
            bookingStatus: 'not-booked',
            weatherSensitive: false,
            accessibility: { wheelchairAccessible: true, hearingAccessible: true, visuallyAccessible: true }
          });
          
          // Calculate day cost
          let totalDayCost = Math.round(dailyBudget * 0.5); // 50% of daily budget
          day.totalDayCost = totalDayCost;
        }
      });
      
      console.log(`Successfully created AI-generated itinerary with activities for ${itinerary.days.length} days`);
      return true;
      
    } catch (parseError) {
      console.error('Error parsing AI itinerary response:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating AI itinerary:', error);
    
    // If AI generation completely fails, create minimal placeholder activities
    createMinimalPlaceholderActivities(itinerary, trip);
    return false;
  }
}

// Helper function to create minimal placeholder activities if AI generation fails completely
function createMinimalPlaceholderActivities(itinerary, trip) {
  console.log('Creating minimal placeholder activities as last resort');
  
  const destination = trip.destination || 'the area';
  const currency = trip.budget ? trip.budget.currency : 'USD';
  const totalBudget = trip.budget ? trip.budget.total : 1000;
  const dailyBudget = Math.round(totalBudget / itinerary.days.length);
  
  itinerary.days.forEach((day, dayIndex) => {
    // Clear existing activities array
    day.activities = [];
    
    // Add a basic sightseeing activity
    day.activities.push({
      title: `Explore ${destination}`,
      description: `Discover the highlights of ${destination}.`,
      category: 'sightseeing',
      startTime: formatTimeString('10:00'),
      endTime: formatTimeString('13:00'),
      duration: 180,
      cost: { amount: Math.round(dailyBudget * 0.3), currency: currency },
      location: { name: `${destination} City Center` },
      bookingStatus: 'not-booked',
      weatherSensitive: true,
      accessibility: { wheelchairAccessible: true, hearingAccessible: true, visuallyAccessible: true }
    });
    
    // Add a basic food activity
    day.activities.push({
      title: `Local Dining`,
      description: `Enjoy local cuisine in ${destination}.`,
      category: 'food',
      startTime: formatTimeString('13:30'),
      endTime: formatTimeString('15:00'),
      duration: 90,
      cost: { amount: Math.round(dailyBudget * 0.2), currency: currency },
      location: { name: `${destination} Restaurant District` },
      bookingStatus: 'not-booked',
      weatherSensitive: false,
      accessibility: { wheelchairAccessible: true, hearingAccessible: true, visuallyAccessible: true }
    });
    
    // Calculate day cost
    let totalDayCost = Math.round(dailyBudget * 0.5); // 50% of daily budget
    day.totalDayCost = totalDayCost;
  });
  
  console.log(`Created minimal placeholder activities for ${itinerary.days.length} days as last resort`);
}

// @desc    Generate a new itinerary using AI
// @route   POST /api/itineraries/generate/:tripId
// @access  Private
exports.generateItinerary = async (req, res) => {
  const tripId = req.params.tripId || req.body.tripId;
  const { theme } = req.body;

  try {
    // Get trip details
    const trip = await Trip.findById(tripId);
    
    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check user
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Calculate number of days
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Generate itinerary days array
    const days = [];
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      days.push({
        date: currentDate,
        activities: [],
        notes: '',
        weatherForecast: {}
      });
    }

    // Create new itinerary
    const newItinerary = new Itinerary({
      trip: tripId,
      theme: theme || 'custom',
      days
    });

    // Save itinerary
    const itinerary = await newItinerary.save();

    // Update trip with itinerary reference
    trip.itinerary = itinerary._id;
    await trip.save();

    // Generate AI-powered activities for each day
    try {
      await this.generateActivitiesWithAI(itinerary, trip);
      
      // Fetch the updated itinerary after AI generation
      const updatedItinerary = await Itinerary.findById(itinerary._id);
      
      // Send the updated itinerary with activities
      res.json(updatedItinerary);
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Continue with empty itinerary if AI fails
      res.json(itinerary);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Function to generate AI-powered activities for itinerary
// Exported for use in other controllers
exports.generateActivitiesWithAI = async function(itinerary, trip) {
  console.log('Generating AI-powered itinerary with Google Gemini...');
  
  // First, try to use our createFallbackActivities function to generate AI-based activities
  try {
    console.log('Attempting to generate AI-based itinerary activities');
    const success = await createFallbackActivities(itinerary, trip);
    
    if (success) {
      console.log('Successfully generated AI-based itinerary activities');
      
      // Save the updated itinerary with activities to the database
      console.log('Saving itinerary with AI-generated activities');
      try {
        // Find and update the itinerary in the database
        const updatedItinerary = await Itinerary.findByIdAndUpdate(
          itinerary._id,
          { days: itinerary.days },
          { new: true, runValidators: true }
        );
        
        if (updatedItinerary) {
          console.log('Itinerary saved successfully with activities');
        } else {
          console.error('Failed to save itinerary - not found in database');
        }
      } catch (saveError) {
        console.error('Error saving itinerary:', saveError);
      }
      
      return;
    }
  } catch (error) {
    console.error('Error generating AI-based itinerary activities:', error);
    console.log('Falling back to traditional AI generation method');
  }
  
  // If the first method fails, continue with the traditional method
  console.log('Using traditional AI generation method as fallback');
  
  // Debug trip object
  console.log('Trip object:', JSON.stringify(trip, null, 2));
  
  // Validate trip object
  if (!trip) {
    console.error('Trip object is undefined or null');
    return null;
  }

  // Get start and end dates
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  // Calculate travel duration
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  // Format dates for the prompt
  const formattedDates = [];
  for (let i = 0; i < diffDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    formattedDates.push(currentDate.toISOString().split('T')[0]);
  }
  
  // Ensure budget exists with default values if missing
  const budget = trip.budget || { total: 1000, currency: 'USD' };
  const totalBudget = budget.total || 1000;
  const currency = budget.currency || 'USD';
  
  // Calculate daily budget
  const dailyBudget = Math.round(totalBudget / diffDays);
  const activityBudget = Math.round(dailyBudget * 0.4); // 40% of daily budget for activities
  
  // Create safe versions of all trip properties with defaults
  // Handle preferences with extra care since this is where the error occurred
  let travelStyleText = 'leisure';
  let interestsText = 'sightseeing';
  let paceText = 'moderate';
  let accessibilityText = 'No';
  let petFriendlyText = 'No';
  // Sustainability removed
  
  // Debug preferences
  console.log('Trip preferences:', trip.preferences);
  
  try {
    // Only try to access preferences if it exists
    if (trip.preferences) {
      // Handle travel style
      if (trip.preferences.travelStyle) {
        if (Array.isArray(trip.preferences.travelStyle)) {
          if (trip.preferences.travelStyle.length > 0) {
            travelStyleText = trip.preferences.travelStyle.join(', ');
          }
        } else if (typeof trip.preferences.travelStyle === 'string') {
          travelStyleText = trip.preferences.travelStyle;
        }
      }
      
      // Handle interests
      if (trip.preferences.interests) {
        if (Array.isArray(trip.preferences.interests)) {
          if (trip.preferences.interests.length > 0) {
            interestsText = trip.preferences.interests.join(', ');
          }
        } else if (typeof trip.preferences.interests === 'string') {
          interestsText = trip.preferences.interests;
        }
      }
      
      // Handle pace
      if (trip.preferences.pace && typeof trip.preferences.pace === 'string') {
        paceText = trip.preferences.pace;
      }
      
      // Handle boolean preferences
      accessibilityText = trip.preferences.accessibility ? 'Yes' : 'No';
      petFriendlyText = trip.preferences.petFriendly ? 'Yes' : 'No';
      // Sustainability removed
    }
  } catch (prefError) {
    console.error('Error processing preferences:', prefError);
    // Continue with defaults already set
  }
  
  // Ensure destination exists with default value if missing
  const destination = trip.destination || 'popular tourist destination';
  console.log('Using destination:', destination);
  
  // Prepare prompt with trip details
  const prompt = `You are an expert travel planner AI. Generate a detailed travel itinerary for a ${travelStyleText} trip to ${destination} for ${diffDays} days from ${formattedDates[0]} to ${formattedDates[formattedDates.length - 1]}.

  TRAVELER PREFERENCES:
  - Travel style: ${travelStyleText}
  - Interests: ${interestsText}
  - Pace: ${paceText}
  - Accessibility needs: ${accessibilityText}
  - Pet-friendly: ${petFriendlyText}
  
  
  BUDGET INFORMATION:
  - Total trip budget: ${totalBudget} ${currency}
  - Daily budget: approximately ${dailyBudget} ${currency}
  - Activity budget per day: approximately ${activityBudget} ${currency}
  
  RESPONSE FORMAT:
  Provide a JSON array where each element represents one day of the trip. Each day object must have these properties:
  - "date": The date in YYYY-MM-DD format (string)
  - "activities": An array of activity objects for that day
  
  Each activity object must have these properties:
  - "title": Brief descriptive title (string)
  - "description": Detailed description (2-3 sentences) (string)
  - "category": One of ["sightseeing", "food", "adventure", "relaxation", "cultural", "shopping", "transport", "accommodation"] (string)
  - "startTime": Start time in 24-hour format, e.g., "09:00" (string)
  - "endTime": End time in 24-hour format, e.g., "11:00" (string)
  - "duration": Duration in minutes (number)
  - "cost": Object with "amount" (number) and "currency" (string)
  - "location": Object with "name" (string), and optionally "address" and "coordinates"
  
  - "weatherSensitive": Whether the activity is affected by weather (boolean)
  - "accessibility": Object with "wheelchairAccessible", "hearingAccessible", "visuallyAccessible" (all boolean)
  
  IMPORTANT: Ensure each day has at least 3-5 activities and that there's a logical flow to the day with appropriate travel times between activities. The response must be valid JSON that can be parsed directly.`;

  console.log('Using Google Gemini model for itinerary generation');
  
  // Call Gemini API
  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  
  // Get the response text
  let aiResponse = response.text();
  console.log('AI response received, parsing JSON...');
  
  // Clean up the response - remove markdown code blocks if present
  if (aiResponse.includes('```json')) {
    console.log('Detected markdown JSON code block, cleaning up...');
    // Extract content between ```json and ``` markers
    const matches = aiResponse.match(/```json\s*([\s\S]*?)```/);
    if (matches && matches[1]) {
      aiResponse = matches[1].trim();
      console.log('Extracted JSON from markdown code block');
    }
  }
  
  // Also remove any backticks that might be at the start/end
  aiResponse = aiResponse.replace(/^`+|`+$/g, '').trim();
  
  let activitiesData;
  
  try {
    // Try multiple approaches to extract JSON from the response
    let jsonData = null;
    
    // First attempt: Try to parse the entire response directly
    try {
      jsonData = JSON.parse(aiResponse);
      console.log('Successfully parsed complete response as JSON');
    } catch (e) {
      console.log('Failed to parse complete response as JSON:', e.message);
    }
    
    // Second attempt: Try to extract JSON array from the response using regex
    if (!jsonData) {
      // Look for array pattern
      const jsonArrayMatch = aiResponse.match(/\[\s*{.*}\s*\]/s);
      if (jsonArrayMatch) {
        try {
          jsonData = JSON.parse(jsonArrayMatch[0]);
          console.log('Successfully extracted JSON array using regex');
        } catch (e) {
          console.log('Failed to parse JSON array match:', e.message);
        }
      }
    }
    
    // Third attempt: Try to extract JSON object with days property
    if (!jsonData) {
      const jsonObjMatch = aiResponse.match(/{\s*"days"\s*:\s*\[.*\]\s*}/s);
      if (jsonObjMatch) {
        try {
          const objData = JSON.parse(jsonObjMatch[0]);
          if (objData.days && Array.isArray(objData.days)) {
            jsonData = objData.days;
            console.log('Successfully extracted JSON object with days property');
          }
        } catch (e) {
          console.log('Failed to parse JSON object match:', e.message);
        }
      }
    }
    
    // Fourth attempt: Try to find any JSON array in the text
    if (!jsonData) {
      // Look for any array pattern that might contain our data
      const arrayMatches = aiResponse.match(/\[\s*\{[^\[\]]*\}\s*(,\s*\{[^\[\]]*\}\s*)*\]/g);
      if (arrayMatches && arrayMatches.length > 0) {
        // Try each match until we find a valid one
        for (const match of arrayMatches) {
          try {
            const parsed = JSON.parse(match);
            if (Array.isArray(parsed) && parsed.length > 0) {
              jsonData = parsed;
              console.log('Successfully extracted JSON array from text');
              break;
            }
          } catch (e) {
            console.log('Failed to parse potential JSON array:', e.message);
          }
        }
      }
    }
    
    // Fifth attempt: Try to extract any valid JSON object that might contain our data
    if (!jsonData) {
      const objectMatches = aiResponse.match(/{[^{}]*}/g);
      if (objectMatches && objectMatches.length > 0) {
        for (const match of objectMatches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed && typeof parsed === 'object') {
              // Check if it has activities or useful properties
              if (parsed.activities || parsed.title || parsed.date) {
                jsonData = [parsed]; // Wrap in array for consistency
                console.log('Successfully extracted JSON object with activities');
                break;
              }
            }
          } catch (e) {
            // Ignore parsing errors for individual objects
          }
        }
      }
    }
    
    // Last attempt: If all else fails, use our AI-based fallback activities generator
    if (!jsonData) {
      console.log('All JSON parsing attempts failed. Using AI-based fallback activities generator.');
      
      try {
        // Use our createFallbackActivities function to generate AI-based activities
        const success = await createFallbackActivities(itinerary, trip);
        
        if (success) {
          console.log('Successfully created AI-based fallback activities');
          
          // Collect activities from the updated itinerary
          jsonData = [];
          
          for (let i = 0; i < itinerary.days.length; i++) {
            const currentDate = new Date(itinerary.days[i].date);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Get activities for this day
            const dayActivities = itinerary.days[i].activities.map(activity => ({
              ...activity,
              date: dateStr
            }));
            
            jsonData.push({
              date: dateStr,
              activities: dayActivities
            });
          }
          
          console.log(`Collected ${jsonData.length} days of AI-generated activities`);
        } else {
          throw new Error('Failed to create AI-based fallback activities');
        }
      } catch (fallbackError) {
        console.error('Error using AI-based fallback activities generator:', fallbackError);
        
        // If AI-based fallback fails, use minimal placeholder activities
        console.log('Using minimal placeholder activities as last resort');
        jsonData = [];
        
        // Create minimal activities for all days in the itinerary
        for (let i = 0; i < itinerary.days.length; i++) {
          const currentDate = new Date(itinerary.days[i].date);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Create basic activities for this day
          const dayActivities = [
            {
              title: `Explore ${destination}`,
              description: `Discover the highlights of ${destination}.`,
              category: 'sightseeing',
              startTime: '10:00',
              endTime: '13:00',
              duration: 180,
              cost: { amount: Math.round(activityBudget * 0.3), currency: currency },
              location: { name: `${destination} City Center` },
              
              weatherSensitive: true,
              accessibility: {
                wheelchairAccessible: true,
                hearingAccessible: true,
                visuallyAccessible: true
              }
            },
            {
              title: `Local Dining`,
              description: `Enjoy local cuisine in ${destination}.`,
              category: 'food',
              startTime: '13:30',
              endTime: '15:00',
              duration: 90,
              cost: { amount: Math.round(activityBudget * 0.2), currency: currency },
              location: { name: `${destination} Restaurant District` },
              
              weatherSensitive: false,
              accessibility: {
                wheelchairAccessible: true,
                hearingAccessible: true,
                visuallyAccessible: true
              }
            }
          ];
          
          jsonData.push({
            date: dateStr,
            activities: dayActivities
          });
        }
      }
    }
    
    activitiesData = jsonData;
    console.log(`Successfully prepared ${activitiesData.length} days of activities`);
  } catch (parseError) {
    console.error('Error in JSON parsing process:', parseError);
    console.log('Raw AI response:', aiResponse);
    return;
  }

  // Update itinerary with AI-generated activities
  if (Array.isArray(activitiesData) && activitiesData.length > 0) {
    console.log('Updating itinerary with AI-generated activities');
    
    // Clear existing activities if any
    for (let i = 0; i < itinerary.days.length; i++) {
      itinerary.days[i].activities = [];
    }
    
    // Add new activities
    console.log(`Itinerary has ${itinerary.days.length} days, but AI generated ${activitiesData.length} days of activities`);
    
    // If we have fewer activity days than itinerary days, distribute them
    if (activitiesData.length < itinerary.days.length && activitiesData.length > 0) {
      console.log('Distributing activities across all itinerary days');
      
      // Collect all activities from all generated days
      const allActivities = [];
      activitiesData.forEach(dayData => {
        if (dayData.activities && Array.isArray(dayData.activities)) {
          allActivities.push(...dayData.activities);
        }
      });
      
      console.log(`Total activities collected: ${allActivities.length}`);
      
      // If no activities were found, create AI-generated activities
      if (allActivities.length === 0) {
        console.log('No activities found in AI response, generating AI-based activities');
        
        // Use the createFallbackActivities function to generate AI-based activities
        await createFallbackActivities(itinerary, trip);
        
        // After creating activities, we need to collect them for distribution
        allActivities = [];
        itinerary.days.forEach((day, dayIndex) => {
          if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach(activity => {
              allActivities.push({
                ...activity,
                dayIndex: dayIndex
              });
            });
          }
        });
        
        console.log(`Collected ${allActivities.length} AI-generated activities for distribution`);
      }
      
      // Check if activities have dayIndex property from our fallback generation
      const hasDayIndex = allActivities.some(activity => activity.dayIndex !== undefined);
      
      if (hasDayIndex) {
        console.log('Activities have dayIndex property, distributing based on that');
        
        // Group activities by dayIndex
        for (let i = 0; i < itinerary.days.length; i++) {
          // Filter activities for this day
          const dayActivities = allActivities.filter(activity => activity.dayIndex === i);
          console.log(`Day ${i+1} has ${dayActivities.length} activities`);
          
          if (dayActivities.length > 0) {
            // Process activities for this day
            itinerary.days[i].activities = [];
            
            // Sort activities by start time
            dayActivities.sort((a, b) => {
              const aTime = a.startTime ? a.startTime.replace(':', '') : '0900';
              const bTime = b.startTime ? b.startTime.replace(':', '') : '0900';
              return parseInt(aTime) - parseInt(bTime);
            });
          
            // Add activities to this day
            itinerary.days[i].activities = dayActivities.map(activity => {
              // Remove the dayIndex property as it's not needed anymore
              const { dayIndex, ...activityWithoutDayIndex } = activity;
              return processActivity(activityWithoutDayIndex, itinerary.days[i].date, trip);
            });
            
            // Calculate day cost
            let totalDayCost = 0;
            itinerary.days[i].activities.forEach(activity => {
              if (activity.cost && activity.cost.amount) {
                totalDayCost += activity.cost.amount;
              }
            });
            itinerary.days[i].totalDayCost = totalDayCost;
          }
        }
      } else {
        // Distribute activities evenly across all days (original logic)
        const activitiesPerDay = Math.max(1, Math.ceil(allActivities.length / itinerary.days.length));
        console.log(`Distributing approximately ${activitiesPerDay} activities per day`);
        
        for (let i = 0; i < itinerary.days.length; i++) {
          const startIdx = i * activitiesPerDay;
          const endIdx = Math.min(startIdx + activitiesPerDay, allActivities.length);
          const dayActivities = allActivities.slice(startIdx, endIdx);
            
            if (dayActivities.length > 0) {
            // Process activities for this day
            itinerary.days[i].activities = dayActivities.map(activity => {
              // Process activity (same as below)
              let startTime, endTime;
              try {
                const dateStr = itinerary.days[i].date.toISOString().split('T')[0];
                startTime = activity.startTime ? new Date(`${dateStr}T${activity.startTime}:00`) : null;
                endTime = activity.endTime ? new Date(`${dateStr}T${activity.endTime}:00`) : null;
                
                if (startTime && endTime && endTime < startTime) {
                  endTime.setDate(endTime.getDate() + 1);
                }
              } catch (timeError) {
                console.log('Error parsing activity times:', timeError);
                const baseDate = new Date(itinerary.days[i].date);
                startTime = new Date(baseDate);
                startTime.setHours(9, 0, 0, 0);
                endTime = new Date(baseDate);
                endTime.setHours(11, 0, 0, 0);
              }
              
              // Validate category against allowed values
              let category = activity.category || 'sightseeing';
              const validCategories = ['sightseeing', 'food', 'adventure', 'relaxation', 'cultural', 'shopping', 'transport', 'accommodation'];
              
              // Map common non-standard categories to valid ones
              const categoryMapping = {
                'entertainment': 'cultural',
                'dining': 'food',
                'lunch': 'food',
                'dinner': 'food',
                'breakfast': 'food',
                'tour': 'sightseeing',
                'beach': 'relaxation',
                'nature': 'adventure',
                'historical': 'cultural',
                'museum': 'cultural',
                'arts': 'cultural',
                'nightlife': 'cultural',
                'spa': 'relaxation',
                'wellness': 'relaxation',
                'sports': 'adventure',
                'hiking': 'adventure',
                'water sports': 'adventure',
                'travel': 'transport',
                'hotel': 'accommodation',
                'resort': 'accommodation',
                'stay': 'accommodation'
              };
              
              // Check if category needs to be mapped
              if (!validCategories.includes(category) && categoryMapping[category.toLowerCase()]) {
                console.log(`Mapping non-standard category '${category}' to '${categoryMapping[category.toLowerCase()]}'`);
                category = categoryMapping[category.toLowerCase()];
              }
              
              // If still not valid, default to sightseeing
              if (!validCategories.includes(category)) {
                console.log(`Invalid category '${category}', defaulting to 'sightseeing'`);
                category = 'sightseeing';
              }
              
              return {
                title: activity.title || 'Untitled Activity',
                description: activity.description || `Explore ${trip.destination}`,
                category: category,
                startTime: startTime,
                endTime: endTime,
                duration: activity.duration || 120,
                cost: activity.cost || { amount: 0, currency: trip.budget ? trip.budget.currency : 'USD' },
                location: {
                  name: activity.location ? (typeof activity.location === 'string' ? activity.location : activity.location.name || trip.destination) : trip.destination
                },
                bookingStatus: 'not-booked',
                weatherSensitive: activity.weatherSensitive || false,
                accessibility: activity.accessibility || {
                  wheelchairAccessible: false,
                  hearingAccessible: false,
                  visuallyAccessible: false
                }
              };
            });
            
            // Calculate day cost
            let totalDayCost = 0;
            itinerary.days[i].activities.forEach(activity => {
              if (activity.cost && activity.cost.amount) {
                totalDayCost += activity.cost.amount;
              }
            });
            itinerary.days[i].totalDayCost = totalDayCost;
          }
        }
      }
    } else {
      // Process activities day by day as before
      for (let i = 0; i < Math.min(activitiesData.length, itinerary.days.length); i++) {
        const dayData = activitiesData[i];
        const dayActivities = dayData.activities || [];
        
        if (Array.isArray(dayActivities) && dayActivities.length > 0) {
          // Update date if provided in the AI response
          if (dayData.date) {
            try {
              itinerary.days[i].date = new Date(dayData.date);
            } catch (dateError) {
              console.log('Error parsing date:', dateError);
            }
          }
          
          // Add activities
          itinerary.days[i].activities = dayActivities.map(activity => {
            // Parse times
            let startTime, endTime;
            try {
              // Combine the day's date with the activity time
              const dateStr = itinerary.days[i].date.toISOString().split('T')[0];
              startTime = activity.startTime ? new Date(`${dateStr}T${activity.startTime}:00`) : null;
              endTime = activity.endTime ? new Date(`${dateStr}T${activity.endTime}:00`) : null;
              
              // If end time is before start time, it might be next day
              if (startTime && endTime && endTime < startTime) {
                endTime.setDate(endTime.getDate() + 1);
              }
            } catch (timeError) {
              console.log('Error parsing activity times:', timeError);
              // Use default times if parsing fails
              const baseDate = new Date(itinerary.days[i].date);
              startTime = new Date(baseDate);
              startTime.setHours(9, 0, 0, 0); // Default 9:00 AM
              endTime = new Date(baseDate);
              endTime.setHours(11, 0, 0, 0); // Default 11:00 AM
            }
            
            return {
              title: activity.title,
              description: activity.description,
              category: activity.category,
              startTime: startTime,
              endTime: endTime,
              duration: activity.duration || 120, // Default 2 hours if not specified
              cost: activity.cost || { amount: 0, currency: currency },
              location: activity.location || { name: destination },
              bookingStatus: 'not-booked',
              weatherSensitive: activity.weatherSensitive || false,
              accessibility: activity.accessibility || {
                wheelchairAccessible: false,
                hearingAccessible: false,
                visuallyAccessible: false
              }
            };
          });
          
          // Calculate day cost
          let totalDayCost = 0;
          itinerary.days[i].activities.forEach(activity => {
            if (activity.cost && activity.cost.amount) {
              totalDayCost += activity.cost.amount;
            }
          });
          itinerary.days[i].totalDayCost = totalDayCost;
        }
      }
    }
    
    // Save updated itinerary
    console.log('Saving updated itinerary...');
    
    // Retry save operation if it fails (to handle potential MongoDB timeout issues)
    const maxSaveAttempts = 3;
    let saveAttempts = 0;
    let saved = false;
    
    while (!saved && saveAttempts < maxSaveAttempts) {
      try {
        await itinerary.save();
        console.log('Itinerary saved successfully');
        saved = true;
      } catch (saveError) {
        saveAttempts++;
        console.error(`Save attempt ${saveAttempts}/${maxSaveAttempts} failed:`, saveError.message);
        
        if (saveAttempts >= maxSaveAttempts) {
          console.error('All save attempts failed. Throwing error.');
          throw saveError;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * saveAttempts));
      }
    }
  }
  
  // Save updated itinerary
  console.log('Saving updated itinerary...');
  
  // Count total activities across all days
  let totalActivities = 0;
  itinerary.days.forEach(day => {
    if (day.activities && Array.isArray(day.activities)) {
      totalActivities += day.activities.length;
    }
  });
  console.log(`Total activities before fallback check: ${totalActivities}`);
  
  // If no activities were found at all, create fallback activities
  if (totalActivities === 0) {
    console.log('No activities found in any day, creating fallback activities');
    createFallbackActivities(itinerary, trip);
    
    // Count activities again
    totalActivities = 0;
    itinerary.days.forEach(day => {
      totalActivities += day.activities.length;
    });
    console.log(`Total activities after fallback creation: ${totalActivities}`);
  }
  
  // Validate all activity categories before saving
  console.log('Validating all activity categories before saving...');
  validateAllActivities(itinerary);
  
  // Mark the itinerary as modified to ensure Mongoose saves all nested arrays
  itinerary.markModified('days');
  
  // Save with multiple attempts
  let saveAttempts = 0;
  const maxSaveAttempts = 3;
  let savedItinerary;
  
  while (saveAttempts < maxSaveAttempts) {
    try {
      saveAttempts++;
      savedItinerary = await itinerary.save();
      console.log(`Itinerary saved successfully on attempt ${saveAttempts}`);
      break;
    } catch (saveError) {
      console.error(`Save attempt ${saveAttempts}/${maxSaveAttempts} failed:`, saveError.message);
      if (saveAttempts >= maxSaveAttempts) {
        throw saveError;
      }
      // Wait a moment before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * saveAttempts));
    }
  }
}

// @desc    Get itinerary by ID
// @route   GET /api/itineraries/:id
// @access  Private
exports.getItineraryById = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Get itinerary by trip ID
// @route   GET /api/itineraries/trip/:tripId
// @access  Private
exports.getItineraryByTripId = async (req, res) => {
  try {
    console.log('Getting itinerary for trip ID:', req.params.tripId);
    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      console.log('Trip not found:', req.params.tripId);
      return res.status(404).json({ msg: 'Trip not found' });
    }
    
    // Check user
    if (trip.user.toString() !== req.user.id) {
      console.log('User not authorized to access this trip');
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    let itinerary = await Itinerary.findOne({ trip: req.params.tripId });
    
    if (!itinerary) {
      console.log('Itinerary not found for trip:', req.params.tripId);
      return res.status(404).json({ msg: 'Itinerary not found for this trip' });
    }
    
    // Check if there are activities in the itinerary
    let hasActivities = false;
    let totalActivities = 0;
    
    itinerary.days.forEach(day => {
      if (day.activities && Array.isArray(day.activities)) {
        totalActivities += day.activities.length;
        if (day.activities.length > 0) {
          hasActivities = true;
        }
      }
    });
    
    console.log(`Itinerary has ${totalActivities} total activities`);
    
    // If no activities, create fallback activities
    if (!hasActivities) {
      console.log('No activities found in itinerary, creating fallback activities');
      await createFallbackActivities(itinerary, trip);
      
      // Save the updated itinerary with fallback activities
      try {
        // Validate all activity categories before saving
        console.log('Validating all activity categories before saving...');
        validateAllActivities(itinerary);
        
        // Mark as modified to ensure nested arrays are saved
        itinerary.markModified('days');
        
        // Use findByIdAndUpdate to ensure the changes are saved properly
        const updatedItinerary = await Itinerary.findByIdAndUpdate(
          itinerary._id,
          { days: itinerary.days },
          { new: true, runValidators: true }
        );
        
        if (updatedItinerary) {
          console.log('Saved itinerary with fallback activities');
          itinerary = updatedItinerary;
        } else {
          console.error('Failed to save itinerary - not found in database');
        }
      } catch (saveErr) {
        console.error('Error saving fallback activities:', saveErr);
      }
    } else {
      // Even if there are activities, validate them to ensure all categories are valid
      console.log('Validating existing activity categories...');
      let needsUpdate = false;
      
      // Check if any categories need to be updated
      itinerary.days.forEach((day, dayIndex) => {
        if (!day.activities || !Array.isArray(day.activities)) return;
        
        day.activities.forEach((activity, activityIndex) => {
          if (activity.category) {
            const originalCategory = activity.category;
            const validatedCategory = validateActivityCategory(activity.category);
            
            if (originalCategory !== validatedCategory) {
              activity.category = validatedCategory;
              needsUpdate = true;
            }
          }
        });
      });
      
      // If any categories were updated, save the changes
      if (needsUpdate) {
        try {
          itinerary.markModified('days');
          await itinerary.save();
          console.log('Saved itinerary with validated activity categories');
          
          // Reload the itinerary to ensure we have the latest data
          itinerary = await Itinerary.findById(itinerary._id);
        } catch (saveErr) {
          console.error('Error saving validated activities:', saveErr);
        }
      }
    }
    
    // Debug itinerary data
    console.log('Itinerary found:', {
      id: itinerary._id,
      tripId: itinerary.trip,
      daysCount: itinerary.days.length
    });
    
    // Debug activities in each day
    itinerary.days.forEach((day, index) => {
      console.log(`Day ${index + 1} (${new Date(day.date).toISOString().split('T')[0]}) activities:`, {
        count: day.activities.length,
        hasActivities: day.activities.length > 0,
        firstActivityTitle: day.activities.length > 0 ? day.activities[0].title : 'None'
      });
    });
    
    res.json(itinerary);
  } catch (err) {
    console.error('Error in getItineraryByTripId:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Trip or itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update itinerary
// @route   PUT /api/itineraries/:id
// @access  Private
exports.updateItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update fields
    const { theme, notes } = req.body;
    if (theme) itinerary.theme = theme;
    if (notes !== undefined) itinerary.notes = notes;

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update itinerary theme
// @route   PUT /api/itineraries/:id/theme
// @access  Private
exports.updateItineraryTheme = async (req, res) => {
  const { theme } = req.body;

  if (!theme) {
    return res.status(400).json({ msg: 'Theme is required' });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update theme
    itinerary.theme = theme;
    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Add a day to itinerary
// @route   POST /api/itineraries/:id/days
// @access  Private
exports.addDay = async (req, res) => {
  const { date } = req.body;

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Create new day
    const newDay = {
      date: date ? new Date(date) : new Date(),
      activities: [],
      notes: '',
      weatherForecast: {}
    };

    // Add day to itinerary
    itinerary.days.push(newDay);
    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update a day in itinerary (alias for updateDayPlan)
// @route   PUT /api/itineraries/:id/days/:dayId
// @access  Private
exports.updateDayPlan = async (req, res) => {
  const { date, notes } = req.body;

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Update day fields
    if (date) itinerary.days[dayIndex].date = new Date(date);
    if (notes !== undefined) itinerary.days[dayIndex].notes = notes;

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or day not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update a day in itinerary
// @route   PUT /api/itineraries/:id/days/:dayId
// @access  Private
exports.updateDay = async (req, res) => {
  const { date, notes } = req.body;

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Update day fields
    if (date) itinerary.days[dayIndex].date = new Date(date);
    if (notes !== undefined) itinerary.days[dayIndex].notes = notes;

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or day not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete a day from itinerary
// @route   DELETE /api/itineraries/:id/days/:dayId
// @access  Private
exports.deleteDay = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Remove day
    itinerary.days.splice(dayIndex, 1);
    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or day not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Add an activity to a day
// @route   POST /api/itineraries/:id/days/:dayId/activities
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
    sustainabilityScore,
    weatherSensitive,
    accessibility
  } = req.body;

  // Validate required fields
  if (!title || !description || !category) {
    return res.status(400).json({ msg: 'Title, description, and category are required' });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Parse times
    let parsedStartTime, parsedEndTime;
    try {
      const dateStr = itinerary.days[dayIndex].date.toISOString().split('T')[0];
      parsedStartTime = startTime ? new Date(`${dateStr}T${startTime}`) : null;
      parsedEndTime = endTime ? new Date(`${dateStr}T${endTime}`) : null;
      
      // If end time is before start time, it might be next day
      if (parsedStartTime && parsedEndTime && parsedEndTime < parsedStartTime) {
        parsedEndTime.setDate(parsedEndTime.getDate() + 1);
      }
    } catch (timeError) {
      console.log('Error parsing activity times:', timeError);
      // Use default times if parsing fails
      const baseDate = new Date(itinerary.days[dayIndex].date);
      parsedStartTime = new Date(baseDate);
      parsedStartTime.setHours(9, 0, 0, 0); // Default 9:00 AM
      parsedEndTime = new Date(baseDate);
      parsedEndTime.setHours(11, 0, 0, 0); // Default 11:00 AM
    }

    // Create new activity
    const newActivity = {
      title,
      description,
      category,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      duration: duration || 120, // Default 2 hours if not specified
      cost: cost || { amount: 0, currency: itinerary.trip.budget.currency },
      location: location || { name: itinerary.trip.destination },
      bookingStatus: 'not-booked',
      sustainabilityScore: sustainabilityScore || 3,
      weatherSensitive: weatherSensitive || false,
      accessibility: accessibility || {
        wheelchairAccessible: false,
        hearingAccessible: false,
        visuallyAccessible: false
      }
    };

    // Add activity to day
    itinerary.days[dayIndex].activities.push(newActivity);

    // Recalculate day cost
    let totalDayCost = 0;
    itinerary.days[dayIndex].activities.forEach(activity => {
      if (activity.cost && activity.cost.amount) {
        totalDayCost += activity.cost.amount;
      }
    });
    itinerary.days[dayIndex].totalDayCost = totalDayCost;

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or day not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update an activity
// @route   PUT /api/itineraries/:id/days/:dayId/activities/:activityId
// @access  Private
exports.updateActivity = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Find activity
    const activityIndex = itinerary.days[dayIndex].activities.findIndex(
      activity => activity._id.toString() === req.params.activityId
    );

    if (activityIndex === -1) {
      return res.status(404).json({ msg: 'Activity not found' });
    }

    const activity = itinerary.days[dayIndex].activities[activityIndex];

    const {
      title,
      description,
      location,
      cost,
      duration,
      startTime,
      endTime,
      category,
      notes
    } = req.body;

    // Basic validation for required fields
    if (!title || !location) {
      return res.status(400).json({ msg: 'Title and location are required' });
    }

    // Update simple scalar fields
    activity.title = title;
    activity.description = description || '';
    activity.category = category ? validateActivityCategory(category) : activity.category;

    if (typeof duration !== 'undefined') {
      activity.duration = Number(duration) || 0;
    }

    if (typeof startTime !== 'undefined') {
      activity.startTime = startTime;
    }

    if (typeof endTime !== 'undefined') {
      activity.endTime = endTime;
    }

    if (typeof notes !== 'undefined') {
      // Notes is not explicitly in schema but we keep it in description/notes if used
      activity.notes = notes;
    }

    // Map flat location string to nested location.name
    if (location) {
      if (!activity.location) {
        activity.location = { name: location };
      } else {
        activity.location.name = location;
      }
    }

    // Map flat numeric cost to cost.amount with existing / default currency
    if (typeof cost !== 'undefined') {
      const numericCost = Number(cost) || 0;
      const currency = (activity.cost && activity.cost.currency) ||
        (itinerary.trip && itinerary.trip.budget && itinerary.trip.budget.currency) ||
        'USD';

      activity.cost = {
        amount: numericCost,
        currency
      };
    }

    // Recalculate totalDayCost for this day
    let totalDayCost = 0;
    itinerary.days[dayIndex].activities.forEach(act => {
      if (act.cost && typeof act.cost.amount === 'number') {
        totalDayCost += act.cost.amount;
      }
    });
    itinerary.days[dayIndex].totalDayCost = totalDayCost;

    // Mark modified and save
    itinerary.markModified('days');
    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error('Error in updateActivity:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary, day, or activity not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete an activity
// @route   DELETE /api/itineraries/:id/days/:dayId/activities/:activityId
// @access  Private
exports.deleteActivity = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Find activity
    const activityIndex = itinerary.days[dayIndex].activities.findIndex(
      activity => activity._id.toString() === req.params.activityId
    );

    if (activityIndex === -1) {
      return res.status(404).json({ msg: 'Activity not found' });
    }

    // Remove activity
    itinerary.days[dayIndex].activities.splice(activityIndex, 1);

    await itinerary.save();

    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary, day, or activity not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete itinerary
// @route   DELETE /api/itineraries/:id
// @access  Private
exports.deleteItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Remove itinerary reference from trip
    const trip = itinerary.trip;
    if (trip.itinerary && trip.itinerary.toString() === req.params.id) {
      trip.itinerary = undefined;
      await trip.save();
    }

    // Delete the itinerary
    await Itinerary.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Itinerary deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Reorder activities in a day
// @route   PUT /api/itineraries/:id/days/:dayId/reorder
// @access  Private
exports.reorderActivities = async (req, res) => {
  const { activityOrder } = req.body;

  if (!Array.isArray(activityOrder)) {
    return res.status(400).json({ msg: 'Activity order must be an array of activity IDs' });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('trip');

    if (!itinerary) {
      return res.status(404).json({ msg: 'Itinerary not found' });
    }

    // Check user
    if (itinerary.trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find day
    const dayIndex = itinerary.days.findIndex(
      day => day._id.toString() === req.params.dayId
    );

    if (dayIndex === -1) {
      return res.status(404).json({ msg: 'Day not found' });
    }

    // Get current activities
    const currentActivities = [...itinerary.days[dayIndex].activities];
    
    // Create a new ordered array
    const newActivities = [];
    
    // Validate that all IDs exist
    for (const activityId of activityOrder) {
      const activity = currentActivities.find(
        a => a._id.toString() === activityId
      );
      
      if (!activity) {
        return res.status(404).json({ msg: `Activity with ID ${activityId} not found` });
      }
      
      newActivities.push(activity);
    }
    
    // Make sure all activities are included
    if (newActivities.length !== currentActivities.length) {
      return res.status(400).json({ 
        msg: 'All activities must be included in the reordering' 
      });
    }
    
    // Update the day's activities with the new order
    itinerary.days[dayIndex].activities = newActivities;
    
    await itinerary.save();
    
    res.json(itinerary);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Itinerary or day not found' });
    }
    res.status(500).send('Server error');
  }
};

