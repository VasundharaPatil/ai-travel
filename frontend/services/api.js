/**
 * API Service for the Travel Planner application
 * Handles all communication with the backend API
 */

const API_URL = 'http://localhost:5000/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to parse the error response as JSON
    try {
      const errorData = await response.json();
      // If there's an errors array (from express-validator), format those errors
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map(err => err.msg).join(', ');
        throw new Error(errorMessages);
      }
      // Otherwise use the message property
      throw new Error(errorData.msg || errorData.message || 'An unknown error occurred');
    } catch (e) {
      // If we can't parse the JSON or there's another error, throw a generic error
      if (e instanceof SyntaxError) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      throw e;
    }
  }
  return response.json();
};

// Authentication Services
const AuthService = {
  // Register a new user
  register: async (userData) => {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  // Get current user profile
  getProfile: async (token) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Update user profile
  updateProfile: async (profileData, token) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(profileData)
    });
    return handleResponse(response);
  },

  // Update user preferences
  updatePreferences: async (preferences, token) => {
    const response = await fetch(`${API_URL}/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(preferences)
    });
    return handleResponse(response);
  }
};

// Trip Services
const TripService = {
  // Create a new trip
  createTrip: async (tripData, token) => {
    const response = await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(tripData)
    });
    return handleResponse(response);
  },

  // Get all trips for current user
  getAllTrips: async (token) => {
    const response = await fetch(`${API_URL}/trips`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Alias for getAllTrips to match function name used in components
  getUserTrips: async (token) => {
    const response = await fetch(`${API_URL}/trips`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Get trip by ID
  getTripById: async (tripId, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Update trip
  updateTrip: async (tripId, tripData, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(tripData)
    });
    return handleResponse(response);
  },

  // Delete trip
  deleteTrip: async (tripId, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Update trip budget
  updateTripBudget: async (tripId, budgetData, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/budget`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(budgetData)
    });
    return handleResponse(response);
  },

  // Notes APIs
  getTripNotes: async (tripId, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/notes`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  addTripNote: async (tripId, noteData, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(noteData)
    });
    return handleResponse(response);
  },

  updateTripNote: async (tripId, noteId, noteData, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(noteData)
    });
    return handleResponse(response);
  },

  deleteTripNote: async (tripId, noteId, token) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  }
};

// Itinerary Services
const ItineraryService = {
  // Get itinerary for a trip
  getItinerary: async (tripId, token) => {
    console.log('Fetching itinerary for trip:', tripId);
    try {
      const response = await fetch(`${API_URL}/itineraries/trip/${tripId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });
      const data = await handleResponse(response);
      console.log('Itinerary data received:', data);
      
      // Check if the itinerary has days with activities
      if (data && data.days) {
        console.log('Number of days in itinerary:', data.days.length);
        data.days.forEach((day, index) => {
          console.log(`Day ${index + 1} activities:`, day.activities ? day.activities.length : 0);
          if (day.activities && day.activities.length > 0) {
            console.log(`First activity on day ${index + 1}:`, day.activities[0]);
          }
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching itinerary:', error);
      throw error;
    }
  },

  // Generate AI itinerary
  generateItinerary: async (tripId, preferences, token) => {
    // Include tripId in both URL and body for compatibility
    const response = await fetch(`${API_URL}/itineraries/generate/${tripId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        tripId,
        ...preferences
      })
    });
    return handleResponse(response);
  },

  // Update itinerary
  updateItinerary: async (itineraryId, itineraryData, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(itineraryData)
    });
    return handleResponse(response);
  },

  // Delete itinerary
  deleteItinerary: async (itineraryId, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Add activity to itinerary
  addActivity: async (itineraryId, dayIndex, activityData, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}/day/${dayIndex}/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(activityData)
    });
    return handleResponse(response);
  },

  // Update activity
  updateActivity: async (itineraryId, dayIndex, activityId, activityData, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}/day/${dayIndex}/activity/${activityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(activityData)
    });
    return handleResponse(response);
  },

  // Delete activity
  deleteActivity: async (itineraryId, dayId, activityId, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Update activity
  updateActivity: async (itineraryId, dayId, activityId, activityData, token) => {
    const response = await fetch(`${API_URL}/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(activityData)
    });
    return handleResponse(response);
  }
};




// Weather Services
const WeatherService = {
  // Get current weather for location
  getCurrentWeather: async (location, token, customHeaders = null, params = null) => {
    const headers = customHeaders || {
      'Content-Type': 'application/json',
      'x-auth-token': token
    };
    
    let url = `${API_URL}/weather/current?location=${encodeURIComponent(location)}`;
    
    // Add additional parameters if provided
    if (params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, value);
      }
      // Append to existing URL (which already has the location parameter)
      url += `&${queryParams.toString()}`;
    }
    
    const response = await fetch(url, {
      headers: headers
    });
    return handleResponse(response);
  },

  // Get weather forecast for location
  getForecast: async (location, token, customHeaders = null, additionalParams = null) => {
    const headers = customHeaders || {
      'Content-Type': 'application/json',
      'x-auth-token': token
    };
    
    // Create base URL with location parameter
    let url = `${API_URL}/weather/forecast?location=${encodeURIComponent(location)}`;
    
    // Add additional parameters if provided
    if (additionalParams) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(additionalParams)) {
        queryParams.append(key, value);
      }
      url += `&${queryParams.toString()}`;
    }
    
    const response = await fetch(url, {
      headers: headers
    });
    return handleResponse(response);
  },
  
  // Get weather forecast for a trip
  getTripWeather: async (tripId, token) => {
    const response = await fetch(`${API_URL}/weather/trip/${tripId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Get activity weather suitability
  getActivityWeatherSuitability: async (activityData, token) => {
    const params = new URLSearchParams(activityData);
    const response = await fetch(`${API_URL}/weather/activity-suitability?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Update itinerary with weather forecasts
  updateItineraryWeather: async (itineraryId, token) => {
    const response = await fetch(`${API_URL}/weather/itinerary/${itineraryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Get weather-optimized activity suggestions
  getWeatherOptimizedActivities: async (queryParams, token) => {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_URL}/weather/activity-suggestions?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  }
};

// Chat Assistant Services
const ChatService = {
  // Get all conversations
  getConversations: async (token) => {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Get conversation by ID
  getConversation: async (conversationId, token) => {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Create new conversation
  createConversation: async (conversationData, token) => {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(conversationData)
    });
    return handleResponse(response);
  },

  // Update conversation
  updateConversation: async (conversationId, conversationData, token) => {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(conversationData)
    });
    return handleResponse(response);
  },

  // Delete conversation
  deleteConversation: async (conversationId, token) => {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },

  // Send message to conversation
  sendMessage: async (conversationId, messageData, token) => {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(messageData)
    });
    return handleResponse(response);
  }
};

// Itinerary Builder Services
const ItineraryBuilderService = {
  // Add activity to day
  addActivity: async (tripId, dayIndex, activityData, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        tripId,
        dayIndex,
        ...activityData
      })
    });
    return handleResponse(response);
  },

  // Update activity in day
  updateActivity: async (tripId, dayIndex, activityId, activityData, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/activity/${activityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        tripId,
        dayIndex,
        ...activityData
      })
    });
    return handleResponse(response);
  },

  // Delete activity from day
  deleteActivity: async (tripId, dayIndex, activityId, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/activity/${activityId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        tripId,
        dayIndex
      })
    });
    return handleResponse(response);
  },

  // Reorder activities within a day
  reorderActivities: async (tripId, dayIndex, activityOrder, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        tripId,
        dayIndex,
        activityOrder
      })
    });
    return handleResponse(response);
  },

  // Add a new day to the itinerary
  addDay: async (tripId, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ tripId })
    });
    return handleResponse(response);
  },

  // Delete a day from the itinerary
  deleteDay: async (tripId, dayIndex, token) => {
    const response = await fetch(`${API_URL}/itinerary-builder/day/${dayIndex}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ tripId })
    });
    return handleResponse(response);
  }
};

// Recommendation Services
const RecommendationService = {
  // Get AI recommendations
  getAIRecommendations: async (tripData, token) => {
    console.log('Fetching AI recommendations with data:', tripData);
    
    try {
      const response = await fetch(`${API_URL}/recommendations/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(tripData)
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      throw error;
    }
  },
  
  // Get activity recommendations
  getActivityRecommendations: async (destination, preferences, token) => {
    const params = new URLSearchParams();
    params.append('destination', destination);
    
    if (preferences?.travelStyle) {
      params.append('travelStyle', preferences.travelStyle.join(','));
    }
    
    const response = await fetch(`${API_URL}/recommendations/activities?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Get budget recommendations
  getBudgetRecommendations: async (budget, duration, travelers, token) => {
    const params = new URLSearchParams();
    params.append('budget', budget);
    params.append('duration', duration);
    params.append('travelers', travelers);
    
    const response = await fetch(`${API_URL}/recommendations/budget?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  },
  
  // Get time optimization recommendations
  getTimeRecommendations: async (destination, duration, token) => {
    const params = new URLSearchParams();
    params.append('destination', destination);
    params.append('duration', duration);
    
    const response = await fetch(`${API_URL}/recommendations/time?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    return handleResponse(response);
  }
};

// Export all services
export {
  AuthService,
  TripService,
  ItineraryService,
  ItineraryBuilderService,
  WeatherService,
  ChatService,
  RecommendationService
};
