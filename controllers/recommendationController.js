const Recommendation = require('../models/Recommendation');
const User = require('../models/User');
const Trip = require('../models/Trip');
const axios = require('axios');
require('dotenv').config();
const { geminiConfig } = require('../config/gemini-config');

// Initialize Gemini model for recommendations
const geminiModel = geminiConfig.getModel('gemini-2.5-flash');

// Helper function to truncate descriptions to a specific word count
function truncateDescription(text, maxWords = 12) {
  if (!text) return '';
  
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

// @desc    Get destination recommendations based on user preferences
// @route   GET /api/recommendations/destinations
// @access  Private
exports.getDestinationRecommendations = async (req, res) => {
  const { season, budget, travelStyle, duration } = req.query;

  try {
    console.log('=== DESTINATION RECOMMENDATIONS DEBUG ===');
    console.log('Query parameters:', { season, budget, travelStyle, duration });
    console.log('User ID:', req.user.id);
    
    // Get user preferences
    const user = await User.findById(req.user.id).select('preferences');
    console.log('User found:', !!user);
    console.log('User preferences:', user.preferences);

    // Combine query params with user preferences
    const preferences = {
      ...user.preferences,
      season: season || null,
      budget: budget || null,
      travelStyle: travelStyle ? travelStyle.split(',') : user.preferences.travelStyle,
      duration: duration || null
    };
    console.log('Combined preferences:', preferences);
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI API Key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'N/A');

    // Generate recommendations using AI
    let recommendations = [];
    
    try {
      console.log('Calling generateDestinationRecommendations...');
      recommendations = await generateDestinationRecommendations(preferences);
      console.log('Recommendations received:', recommendations.length);
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      console.log('Error details:', aiError.message);
      if (aiError.response) {
        console.log('OpenAI API response error:', aiError.response.data);
      }
      
      // Fallback to database recommendations if AI fails
      console.log('Falling back to database recommendations');
      recommendations = await Recommendation.find({
        type: 'destination',
        'price.category': budget || { $exists: true }
      }).limit(10);
      console.log('Database recommendations found:', recommendations.length);
    }

    console.log('Sending response with recommendations count:', recommendations.length);
    res.json(recommendations);
  } catch (err) {
    console.error('Server error in getDestinationRecommendations:', err);
    console.error(err.stack);
    res.status(500).send('Server error: ' + err.message);
  }
};

// Cache for storing recommendations to reduce API calls
const recommendationsCache = {
  data: {},
  // Set a recommendation in the cache with a TTL (time to live)
  set: function(key, value, ttlMinutes = 60) {
    this.data[key] = {
      value,
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    };
    console.log(`Cached recommendations for key: ${key.substring(0, 20)}...`);
  },
  // Get a recommendation from the cache if it exists and hasn't expired
  get: function(key) {
    const entry = this.data[key];
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      console.log(`Cache expired for key: ${key.substring(0, 20)}...`);
      delete this.data[key];
      return null;
    }
    
    console.log(`Cache hit for key: ${key.substring(0, 20)}...`);
    return entry.value;
  },
  // Generate a cache key based on preferences
  generateKey: function(preferences) {
    // Create a deterministic string from preferences for caching
    return JSON.stringify({
      travelStyle: preferences.travelStyle.sort(),
      budget: preferences.budget,
      season: preferences.season,
      duration: preferences.duration,
      foodPreferences: preferences.foodPreferences ? preferences.foodPreferences.sort() : null,
      accessibility: preferences.accessibility,
      petFriendly: preferences.petFriendly,
      safetyPriority: preferences.safetyPriority
    });
  }
};

// Helper function to generate destination recommendations using OpenAI
async function generateDestinationRecommendations(preferences) {
  console.log('=== GENERATE DESTINATION RECOMMENDATIONS DEBUG ===');
  
  // Check if we have cached recommendations for these preferences
  const cacheKey = recommendationsCache.generateKey(preferences);
  const cachedRecommendations = recommendationsCache.get(cacheKey);
  
  if (cachedRecommendations) {
    console.log('Using cached recommendations');
    return cachedRecommendations;
  }
  
  // Skip AI generation if no API key
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not found, skipping AI generation');
    return getFallbackDestinations(preferences);
  }

  try {
    // Prepare prompt with preferences
    const prompt = `Recommend 5 travel destinations based on the following preferences:
    Travel style: ${preferences.travelStyle.join(', ')}
    Food preferences: ${preferences.foodPreferences ? preferences.foodPreferences.join(', ') : 'No specific preferences'}
    Accessibility needs: ${preferences.accessibility ? 'Yes' : 'No'}
    Pet-friendly: ${preferences.petFriendly ? 'Yes' : 'No'}
    Safety priority (1-5): ${preferences.safetyPriority || 3}
    Season: ${preferences.season || 'Any'}
    Budget category: ${preferences.budget || 'Any'}
    Trip duration: ${preferences.duration || 'Any'}
    
    Format the response as a JSON array of objects, where each object has: title (destination name), description, location (country and city), price category (budget, moderate, luxury), recommendedSeason, safetyScore (1-5), and tags.`;

    console.log('Prompt prepared');
    
    // Use a simpler model for better availability
    console.log('Using Google Gemini model for destination recommendations');
    
    // Call Gemini API with retry mechanism
    let retries = 3;
    let aiResponse;
    
    while (retries > 0) {
      try {
        console.log(`Making Gemini API request (retries left: ${retries})...`);
        
        // Generate content with Gemini
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        
        // Get the response text
        aiResponse = response.text();
        
        console.log('Gemini API request successful');
        break; // Success, exit the retry loop
      } catch (apiError) {
        retries--;
        console.log(`Gemini API error, retries left: ${retries}`);
        if (retries === 0) throw apiError; // Re-throw if all retries failed
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    console.log('AI response received, parsing JSON...');
    
    let recommendationsData;
    
    try {
      // Try to extract JSON if the response contains markdown or other text
      const jsonMatch = aiResponse.match(/\[\s*{.*}\s*\]/s);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('JSON string extracted');
        recommendationsData = JSON.parse(jsonStr);
      } else {
        console.log('Parsing full response as JSON');
        recommendationsData = JSON.parse(aiResponse);
      }
      console.log(`Successfully parsed ${recommendationsData.length} recommendations`);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', aiResponse);
      return getFallbackDestinations(preferences);
    }

    // Format and validate recommendations
    console.log('Formatting recommendations...');
    if (Array.isArray(recommendationsData) && recommendationsData.length > 0) {
      const formattedRecommendations = recommendationsData.map(rec => {
        // Validate and provide defaults for missing fields
        return {
          type: 'destination',
          title: rec.title || 'Unknown Destination',
          description: rec.description || 'A wonderful place to visit',
          location: {
            name: rec.title || 'Unknown Location',
            country: rec.location?.country || 'Unknown',
            city: rec.location?.city || 'Unknown'
          },
          price: {
            category: rec.price?.category || rec.priceCategory || 'moderate'
          },
          season: Array.isArray(rec.recommendedSeason) ? rec.recommendedSeason : 
                 Array.isArray(rec.season) ? rec.season : ['summer'],
          safetyScore: Number.isInteger(rec.safetyScore) ? rec.safetyScore : 3,
          tags: Array.isArray(rec.tags) ? rec.tags : [],
          relevanceScore: 100 // Maximum relevance for AI-generated recommendations
        };
      });
      
      // Cache the recommendations for future use
      recommendationsCache.set(cacheKey, formattedRecommendations);
      
      console.log(`Returning ${formattedRecommendations.length} recommendations`);
      return formattedRecommendations;
    }
    
    console.log('No valid recommendations data, returning fallback');
    return getFallbackDestinations(preferences);
  } catch (error) {
    console.error('Error generating recommendations with AI:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    
    return getFallbackDestinations(preferences);
  }
}

// Helper function to get fallback destination recommendations
function getFallbackDestinations(preferences) {
  console.log('Using fallback destination recommendations');
  
  // Base set of fallback destinations
  const fallbackDestinations = [
    {
      type: 'destination',
      title: "Paris, France",
      description: "The City of Light offers iconic landmarks, world-class cuisine, and romantic atmosphere",
      location: {
        name: "Paris",
        country: "France",
        city: "Paris"
      },
      price: {
        category: "luxury"
      },
      season: ["spring", "fall"],
      sustainabilityScore: 3,
      safetyScore: 4,
      tags: ["romantic", "cultural", "historic"],
      relevanceScore: 90
    },
    {
      type: 'destination',
      title: "Tokyo, Japan",
      description: "Ultra-modern city with a perfect blend of traditional culture and futuristic technology",
      location: {
        name: "Tokyo",
        country: "Japan",
        city: "Tokyo"
      },
      price: {
        category: "moderate"
      },
      season: ["spring", "fall"],
      sustainabilityScore: 4,
      safetyScore: 5,
      tags: ["technology", "cultural", "food"],
      relevanceScore: 85
    },
    {
      type: 'destination',
      title: "Bali, Indonesia",
      description: "Beautiful island paradise with beaches, culture, and relaxation",
      location: {
        name: "Bali",
        country: "Indonesia",
        city: "Bali"
      },
      price: {
        category: "moderate"
      },
      season: ["summer", "fall"],
      sustainabilityScore: 4,
      safetyScore: 4,
      tags: ["beach", "culture", "relaxation"],
      relevanceScore: 80
    },
    {
      type: 'destination',
      title: "Barcelona, Spain",
      description: "Vibrant city with stunning architecture, beautiful beaches, and lively culture",
      location: {
        name: "Barcelona",
        country: "Spain",
        city: "Barcelona"
      },
      price: {
        category: "moderate"
      },
      season: ["spring", "summer"],
      sustainabilityScore: 3,
      safetyScore: 4,
      tags: ["beach", "architecture", "food"],
      relevanceScore: 75
    },
    {
      type: 'destination',
      title: "New York City, USA",
      description: "The Big Apple offers world-class entertainment, dining, shopping, and iconic landmarks",
      location: {
        name: "New York City",
        country: "USA",
        city: "New York"
      },
      price: {
        category: "luxury"
      },
      season: ["spring", "fall"],
      sustainabilityScore: 3,
      safetyScore: 3,
      tags: ["urban", "shopping", "entertainment"],
      relevanceScore: 70
    }
  ];
  
  // Filter based on user preferences if available
  let filteredDestinations = [...fallbackDestinations];
  
  // Filter by budget if specified
  if (preferences.budget) {
    filteredDestinations = filteredDestinations.filter(dest => 
      dest.price.category === preferences.budget || preferences.budget === 'Any'
    );
  }
  
  // Filter by season if specified
  if (preferences.season && preferences.season !== 'Any') {
    filteredDestinations = filteredDestinations.filter(dest => 
      dest.season.includes(preferences.season.toLowerCase())
    );
  }
  
  // If no destinations match the filters, return the original set
  return filteredDestinations.length > 0 ? filteredDestinations : fallbackDestinations;
}

// @desc    Get activity recommendations for a destination
// @route   GET /api/recommendations/activities
// @access  Private
exports.getActivityRecommendations = async (req, res) => {
  const { destination, date, travelStyle, budget } = req.query;

  if (!destination) {
    return res.status(400).json({ msg: 'Destination is required' });
  }

  try {
    // Get user preferences
    const user = await User.findById(req.user.id).select('preferences');

    // Generate recommendations using AI
    let recommendations = [];
    
    try {
      recommendations = await generateActivityRecommendations(destination, {
        date,
        travelStyle: travelStyle ? travelStyle.split(',') : user.preferences.travelStyle,
        budget,
        accessibility: user.preferences.accessibility,
        foodPreferences: user.preferences.foodPreferences
      });
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      // Fallback to database recommendations if AI fails
      recommendations = await Recommendation.find({
        type: 'activity',
        'location.name': { $regex: destination, $options: 'i' }
      }).limit(10);
    }

    res.json(recommendations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Helper function to generate activity recommendations using Google's Gemini API
async function generateActivityRecommendations(destination, preferences) {
  try {
    // Prepare prompt with preferences
    const prompt = `Recommend 10 activities for travelers visiting ${destination} with the following preferences:
    Travel style: ${preferences.travelStyle.join(', ')}
    Date of visit: ${preferences.date || 'Not specified'}
    Budget: ${preferences.budget || 'Any'}
    Accessibility needs: ${preferences.accessibility ? 'Yes' : 'No'}
    Food preferences: ${preferences.foodPreferences ? preferences.foodPreferences.join(', ') : 'No specific preferences'}

    Format the response as a JSON array of objects, where each object has: title, description, category (sightseeing, food, adventure, relaxation, cultural, shopping), estimatedDuration (in minutes), price (amount and currency), weatherSensitive (boolean), and accessibility details.`;

    console.log('Using Google Gemini model for activity recommendations');
    
    // Call Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    // Get the response text
    const aiResponse = response.text();
    let activitiesData;

    try {
      activitiesData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return [];
    }

    // Format recommendations
    if (Array.isArray(activitiesData) && activitiesData.length > 0) {
      return activitiesData.map(act => ({
        type: 'activity',
        title: act.title,
        description: act.description,
        location: {
          name: destination
        },
        category: act.category,
        duration: act.estimatedDuration || act.duration,
        price: act.price || { amount: 0, currency: 'USD' },
        weatherSensitive: act.weatherSensitive,
        accessibility: act.accessibility,
        relevanceScore: 100 // Maximum relevance for AI-generated recommendations
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error generating activity recommendations with AI:', error);
    throw error;
  }
}

// @desc    Get accommodation recommendations for a destination
// @route   GET /api/recommendations/accommodations
// @access  Private
exports.getAccommodationRecommendations = async (req, res) => {
  const { destination, checkIn, checkOut, budget, travelers } = req.query;

  if (!destination) {
    return res.status(400).json({ msg: 'Destination is required' });
  }

  try {
    // Get user preferences
    const user = await User.findById(req.user.id).select('preferences');

    // Generate recommendations using AI
    let recommendations = [];
    
    try {
      recommendations = await generateAccommodationRecommendations(destination, {
        checkIn,
        checkOut,
        budget,
        travelers: travelers || { adults: 1, children: 0 },
        accessibility: user.preferences.accessibility,
        petFriendly: user.preferences.petFriendly
      });
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      // Fallback to database recommendations if AI fails
      recommendations = await Recommendation.find({
        type: 'accommodation',
        'location.name': { $regex: destination, $options: 'i' }
      }).limit(10);
    }

    res.json(recommendations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Helper function to generate accommodation recommendations
async function generateAccommodationRecommendations(destination, preferences) {
  // Using Google's Gemini API
  console.log('Using Google Gemini API for recommendations');

  try {
    // First try to get real hotel data using RapidAPI Hotels4 API if available
    if (process.env.HOTELS_API_KEY !== 'free_tier') {
      try {
        // This would be the real API call if you had a paid API key
        // const options = {
        //   method: 'GET',
        //   url: 'https://hotels4.p.rapidapi.com/locations/v2/search',
        //   params: {query: destination, locale: 'en_US', currency: 'USD'},
        //   headers: {
        //     'X-RapidAPI-Key': process.env.HOTELS_API_KEY,
        //     'X-RapidAPI-Host': 'hotels4.p.rapidapi.com'
        //   }
        // };
        // const response = await axios.request(options);
        
        // For the free tier, we'll simulate the response
        console.log('Using simulated hotel data for free tier');
      } catch (apiError) {
        console.error('Error fetching hotel data:', apiError);
      }
    }
    
    // Prepare prompt with preferences
    const prompt = `Recommend 8 accommodation options for travelers visiting ${destination} with the following preferences:
    Travel style: ${preferences.travelStyle.join(', ')}
    Date of visit: ${preferences.date || 'Not specified'}
    Budget: ${preferences.budget || 'Any'}
    Number of travelers: ${preferences.travelers || 'Not specified'}
    Accessibility needs: ${preferences.accessibility ? 'Yes' : 'No'}
    Pet-friendly: ${preferences.petFriendly ? 'Yes' : 'No'}

    Format the response as a JSON array of objects, where each object has: name, description, type (hotel, hostel, apartment, resort, etc.), priceRange (min and max per night in USD), amenities (array), location (address and coordinates), and accessibility details.`;

    console.log('Using Google Gemini model for accommodation recommendations');
    
    // Call Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    // Get the response text
    const aiResponse = response.text();
    let accommodationsData;
    
    try {
      accommodationsData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return [];
    }

    // Format recommendations
    if (Array.isArray(accommodationsData) && accommodationsData.length > 0) {
      return accommodationsData.map(acc => ({
        type: 'accommodation',
        title: acc.title,
        description: acc.description,
        location: {
          name: destination
        },
        price: acc.price,
        tags: acc.amenities || [],
        accessibility: acc.accessibility,
        petFriendly: acc.petFriendly,
        relevanceScore: 100 // Maximum relevance for AI-generated recommendations
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error generating accommodation recommendations with AI:', error);
    throw error;
  }
}

// @desc    Get restaurant recommendations for a destination
// @route   GET /api/recommendations/restaurants
// @access  Private
exports.getRestaurantRecommendations = async (req, res) => {
  const { destination, cuisine, budget } = req.query;

  if (!destination) {
    return res.status(400).json({ msg: 'Destination is required' });
  }

  try {
    // Get user preferences
    const user = await User.findById(req.user.id).select('preferences');

    // Generate recommendations using AI
    let recommendations = [];
    
    try {
      recommendations = await generateRestaurantRecommendations(destination, {
        cuisine: cuisine ? cuisine.split(',') : [],
        budget,
        foodPreferences: user.preferences.foodPreferences,
        accessibility: user.preferences.accessibility
      });
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      // Fallback to database recommendations if AI fails
      recommendations = await Recommendation.find({
        type: 'restaurant',
        'location.name': { $regex: destination, $options: 'i' }
      }).limit(10);
    }

    res.json(recommendations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Helper function to generate restaurant recommendations
async function generateRestaurantRecommendations(destination, preferences) {
  // Skip AI generation if no API key
  try {
    // Prepare prompt with preferences
    const prompt = `Recommend 5 restaurants for travelers visiting ${destination} with the following preferences:
    Cuisine types: ${preferences.cuisine.length > 0 ? preferences.cuisine.join(', ') : 'Any'}
    Budget: ${preferences.budget || 'Any'}
    Dietary restrictions: ${preferences.foodPreferences ? preferences.foodPreferences.join(', ') : 'None'}
    Accessibility needs: ${preferences.accessibility ? 'Yes' : 'No'}
    
    Format the response as a JSON array of objects, where each object has: title, description, cuisine (array), price (category: budget, moderate, luxury), specialDiets (array), and accessibility details.`;

    console.log('Using Google Gemini model for restaurant recommendations');
    
    // Call Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    // Get the response text
    const aiResponse = response.text();
    let restaurantsData;
    
    try {
      restaurantsData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return [];
    }

    // Format recommendations
    if (Array.isArray(restaurantsData) && restaurantsData.length > 0) {
      return restaurantsData.map(rest => ({
        type: 'restaurant',
        title: rest.title,
        description: rest.description,
        location: {
          name: destination
        },
        tags: [...(rest.cuisine || []), ...(rest.specialDiets || [])],
        price: {
          category: rest.price.category || rest.price
        },
        accessibility: rest.accessibility,
        relevanceScore: 100 // Maximum relevance for AI-generated recommendations
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error generating restaurant recommendations with AI:', error);
    throw error;
  }
}

// @desc    Get transport recommendations for a trip
// @route   GET /api/recommendations/transport
// @access  Private
exports.getTransportRecommendations = async (req, res) => {
  const { origin, destination, date, travelers, budget } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ msg: 'Origin and destination are required' });
  }

  try {
    // Get user preferences
    const user = await User.findById(req.user.id).select('preferences');

    // Generate recommendations using AI
    let recommendations = [];
    
    try {
      recommendations = await generateTransportRecommendations({
        origin,
        destination,
        date,
        travelers: travelers || { adults: 1, children: 0 },
        budget,
        accessibility: user.preferences.accessibility
      });
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      // Fallback to empty array if AI fails
      recommendations = [];
    }

    res.json(recommendations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Helper function to generate transport recommendations
async function generateTransportRecommendations(preferences) {
  // Using Google's Gemini API
  console.log('Using Google Gemini API for recommendations');

  try {
    // First try to get real flight data using AviationStack API if it's a flight request
    if (preferences.transportType === 'flight' && process.env.AVIATION_API_KEY !== 'free_tier') {
      try {
        // This would be the real API call if you had a paid API key
        // const response = await axios.get('http://api.aviationstack.com/v1/flights', {
        //   params: {
        //     access_key: process.env.AVIATION_API_KEY,
        //     dep_iata: preferences.origin,
        //     arr_iata: preferences.destination,
        //     flight_date: preferences.date
        //   }
        // });
        
        // For the free tier, we'll simulate the response
        console.log('Using simulated flight data for free tier');
      } catch (apiError) {
        console.error('Error fetching flight data:', apiError);
      }
    }
    
    // Prepare prompt with preferences
    const prompt = `Recommend transportation options for traveling from ${preferences.origin} to ${preferences.destination} with the following preferences:
    Date of travel: ${preferences.date || 'Not specified'}
    Travelers: ${preferences.travelers.adults} adults, ${preferences.travelers.children} children
    Budget: ${preferences.budget || 'Any'}
    Accessibility needs: ${preferences.accessibility ? 'Yes' : 'No'}
    
    Format the response as a JSON array of objects, where each object has: title, description, type (flight, train, bus, car, ferry), duration (in minutes), price (amount and currency), and accessibility details.`;

    // Call Gemini API
    console.log('Using Google Gemini model for recommendations');
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    // Get the response text
    const aiResponse = response.text();
    let transportData;
    
    try {
      transportData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return [];
    }

    // Format recommendations
    if (Array.isArray(transportData) && transportData.length > 0) {
      return transportData.map(trans => ({
        type: 'transport',
        title: trans.title,
        description: trans.description,
        location: {
          name: `${preferences.origin} to ${preferences.destination}`
        },
        tags: [trans.type],
        duration: trans.duration,
        price: trans.price,
        accessibility: trans.accessibility,
        relevanceScore: 100 // Maximum relevance for AI-generated recommendations
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error generating transport recommendations with AI:', error);
    throw error;
  }
}

// @desc    Generate AI recommendations for a trip
// @route   POST /api/recommendations/ai
// @access  Private
exports.generateAIRecommendations = async (req, res) => {
  try {
    const { destination, budget, duration, travelers, travelStyle, foodPreferences, accessibility } = req.body;
    
    if (!destination) {
      return res.status(400).json({ msg: 'Destination is required' });
    }
    
    console.log('=== GENERATING AI RECOMMENDATIONS ===');
    console.log('Request body:', { destination, budget, duration, travelers, travelStyle });
    
    // Generate AI recommendations using Gemini
    const recommendations = await generateTripRecommendations({
      destination,
      budget,
      duration,
      travelers,
      travelStyle,
      foodPreferences,
      accessibility
    });
    
    res.json(recommendations);
  } catch (err) {
    console.error('Error generating AI recommendations:', err);
    res.status(500).send('Server error: ' + err.message);
  }
};

// Helper function to generate comprehensive trip recommendations
async function generateTripRecommendations(tripDetails) {
  const { destination, budget, duration, travelers, travelStyle, foodPreferences } = tripDetails;
  
  try {
    // Prepare prompt for Gemini API
    const prompt = `Generate VERY CONCISE personalized travel recommendations for a trip to ${destination}.
    
    Trip details:
    - Budget: $${budget} total for ${travelers} traveler(s)
    - Duration: ${duration} days
    - Travel style preferences: ${travelStyle ? travelStyle.join(', ') : 'Not specified'}
    - Food preferences: ${foodPreferences ? foodPreferences.join(', ') : 'Not specified'}
    
    Please provide recommendations in the following categories:
    
    1. ACTIVITIES: Suggest 4-6 must-visit spots, famous places, and restaurants in ${destination} that match the travel style preferences.
    2. BUDGET OPTIMIZATION: Provide 3-5 tips for optimizing the budget of $${budget} for ${travelers} traveler(s) over ${duration} days.
    3. TIME OPTIMIZATION: Suggest 3-4 tips for making the most of ${duration} days in ${destination}.
    
    EXTREMELY IMPORTANT: Each recommendation description MUST be VERY BRIEF - no more than 10-12 words maximum per recommendation. Keep them short and actionable.
    
    Format your response as a JSON object with the following structure:
    {
      "activities": [
        { "type": "[landmark|museum|nature|adventure|water|food|shopping|cultural|relaxation|nightlife|local|religious|tour]", "description": "Brief activity description (10-12 words max)" },
        ...
      ],
      "budget": [
        { "type": "[daily|accommodation|food|transport|activities|shopping|saving|luxury]", "description": "Brief budget tip (10-12 words max)" },
        ...
      ],
      "time": [
        { "type": "[planning|location|transport|rest|flexibility|efficiency|priority]", "description": "Brief time tip (10-12 words max)" },
        ...
      ]
    }
    
    Ensure all recommendations are specific to ${destination}, tailored to the given preferences, and extremely concise.`;
    
    // Call Gemini API
    console.log('Calling Gemini API for trip recommendations');
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    // Get the response text
    const aiResponse = response.text();
    console.log('Received AI response');
    
    // Parse the JSON response
    try {
      console.log('AI response text:', aiResponse);
      
      // Extract JSON from the response if it contains markdown code blocks
      let jsonStr = aiResponse;
      
      // Check if the response is wrapped in markdown code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
        console.log('Successfully extracted JSON from response');
      }
      
      // Clean up the JSON string to handle common formatting issues
      jsonStr = jsonStr.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ');
      
      // Try to parse the JSON
      let recommendations;
      try {
        recommendations = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Initial JSON parse failed, attempting to fix JSON:', parseError);
        
        // Try to fix common JSON issues
        const fixedJsonStr = jsonStr
          .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Add quotes to keys
          .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
          .replace(/\n/g, ' ') // Remove newlines within strings
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        recommendations = JSON.parse(fixedJsonStr);
        console.log('Successfully parsed JSON after fixing format');
      }
      
      console.log('Successfully parsed AI recommendations');
      
      // Post-process recommendations to ensure they are concise
      if (recommendations.activities) {
        recommendations.activities = recommendations.activities.map(activity => ({
          ...activity,
          description: truncateDescription(activity.description, 12)
        }));
      }
      
      if (recommendations.budget) {
        recommendations.budget = recommendations.budget.map(item => ({
          ...item,
          description: truncateDescription(item.description, 12)
        }));
      }
      
      if (recommendations.time) {
        recommendations.time = recommendations.time.map(item => ({
          ...item,
          description: truncateDescription(item.description, 12)
        }));
      }
      
      return recommendations;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('AI response text:', aiResponse);
      
      // Attempt to extract JSON from the response if it contains additional text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted JSON from response');
          return extractedJson;
        } catch (extractError) {
          console.error('Error extracting JSON:', extractError);
        }
      }
      
      // Return a basic structure if parsing fails
      return {
        activities: [
          { type: 'general', description: `Visit top attractions in ${destination}` },
          { type: 'food', description: `Try local cuisine in ${destination}` },
          { type: 'cultural', description: `Explore museums and cultural sites` }
        ],
        budget: [
          { type: 'daily', description: `Budget $${Math.round(budget / duration / travelers)} per person daily` },
          { type: 'accommodation', description: 'Book accommodations with good value' },
          { type: 'food', description: 'Mix restaurants with self-catering options' }
        ],
        time: [
          { type: 'planning', description: `Plan ${duration}-day itinerary with 2-3 activities daily` },
          { type: 'location', description: 'Group activities by location to save time' },
          { type: 'flexibility', description: 'Leave time for spontaneous discoveries' }
        ]
      };
    }
  } catch (error) {
    console.error('Error generating trip recommendations with AI:', error);
    
    // Return fallback recommendations if AI generation fails
    return {
      activities: [
        { type: 'landmark', description: `Visit landmarks and museums in ${destination}` },
        { type: 'local', description: `Attend local cultural events` },
        { type: 'nature', description: `Explore natural attractions nearby` },
        { type: 'food', description: `Try local cuisine and specialties` }
      ],
      budget: [
        { type: 'daily', description: `Budget $${Math.round(budget / duration / travelers)} per person daily` },
        { type: 'accommodation', description: 'Book accommodations early for better rates' },
        { type: 'food', description: 'Mix restaurants with street food options' },
        { type: 'transport', description: 'Use public transport to save money' }
      ],
      time: [
        { type: 'planning', description: duration <= 3 ? 'Focus on key attractions only' : 
                                        duration <= 7 ? 'Plan 2-3 activities per day' : 
                                        'Consider day trips nearby' },
        { type: 'location', description: 'Group activities by location to save time' },
        { type: 'rest', description: 'Schedule rest periods between activities' },
        { type: 'flexibility', description: 'Leave time for spontaneous discoveries' }
      ]
    };
  }
}
