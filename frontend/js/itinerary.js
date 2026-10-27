/**
 * Itinerary JavaScript for the Travel Planner application
 * Handles fetching itinerary data, user interactions, and itinerary functionality
 */

import { TripService, ItineraryService, WeatherService } from '../services/api.js';
import { getToken, getUser, logout } from '../services/auth.js';

// Check if user is authenticated, redirect to login if not
const token = getToken();
if (!token) {
  window.location.href = 'login.html';
}

// Get user data
const user = getUser();

// Get trip ID from URL
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

// If no trip ID is provided, redirect to dashboard
if (!tripId) {
  window.location.href = 'dashboard.html';
}

// DOM elements
const tripInfo = document.getElementById('trip-info');
const daysCount = document.getElementById('days-count');
const activitiesCount = document.getElementById('activities-count');
const totalCost = document.getElementById('total-cost');
const dayList = document.getElementById('day-list');
const dayContent = document.getElementById('day-content');
const backToTripLink = document.getElementById('back-to-trip');
const regenerateBtn = document.getElementById('regenerate-btn');
const regenerateModal = document.getElementById('regenerate-modal');
const regenerateForm = document.getElementById('regenerate-form');
const cancelRegenerateBtn = document.getElementById('cancel-regenerate-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameElement = document.querySelector('.user-name');
const userAvatarElement = document.querySelector('.user-avatar');

// Edit activity modal elements
const editActivityModal = document.getElementById('edit-activity-modal');
const editActivityForm = document.getElementById('edit-activity-form');
const editActivityError = document.getElementById('edit-activity-error');
const editActivityTitleInput = document.getElementById('edit-activity-title');
const editActivityDescriptionInput = document.getElementById('edit-activity-description');
const editActivityLocationInput = document.getElementById('edit-activity-location');
const editActivityCostInput = document.getElementById('edit-activity-cost');
const editActivityDurationInput = document.getElementById('edit-activity-duration');
const editActivityCategorySelect = document.getElementById('edit-activity-category');
const editActivityNotesInput = document.getElementById('edit-activity-notes');
const editActivityCancelBtn = document.getElementById('edit-activity-cancel');


// Map element
const itineraryMap = document.getElementById('itinerary-map');

// Current trip and itinerary data
let currentTrip = null;
let currentItinerary = null;
let currentDayIndex = 0;
let map = null;
let markers = [];
let activityPaths = [];

// Currently edited activity indices
let currentEditDayIndex = null;
let currentEditActivityIndex = null;

// Edit activity modal event listeners
if (editActivityForm) {
  editActivityForm.addEventListener('submit', handleEditActivitySubmit);
}

if (editActivityCancelBtn) {
  editActivityCancelBtn.addEventListener('click', closeEditActivityModal);
}

const editActivityCloseBtn = editActivityModal ? editActivityModal.querySelector('.modal-close') : null;
if (editActivityCloseBtn) {
  editActivityCloseBtn.addEventListener('click', closeEditActivityModal);
}

if (editActivityModal) {
  editActivityModal.addEventListener('click', function(event) {
    if (event.target === editActivityModal) {
      closeEditActivityModal();
    }
  });
}

// Set user name and avatar
if (user && userNameElement && userAvatarElement) {
  userNameElement.textContent = user.username || 'User';
  userAvatarElement.src = `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=4CAFAB&color=fff`;
}

// Initialize the page
async function initializePage() {
  try {
    // Show loading state immediately
    dayContent.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading your itinerary...</p>
      </div>
    `;
    
    console.log('Fetching trip data for ID:', tripId);
    // Fetch trip data with a longer timeout (30 seconds)
    const tripPromise = TripService.getTripById(tripId, token);
    const tripTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Trip data fetch timeout')), 30000)
    );
    
    try {
      currentTrip = await Promise.race([tripPromise, tripTimeout]);
      console.log('Trip data fetched successfully:', currentTrip);
    } catch (tripError) {
      console.error('Error fetching trip data:', tripError);
      throw new Error(`Failed to fetch trip data: ${tripError.message}`);
    }
    
    // Update back to trip link
    if (backToTripLink) {
      backToTripLink.href = `trip-details.html?id=${tripId}`;
    }
    
    // Display trip info
    displayTripInfo(currentTrip);
    
    console.log('Fetching itinerary data');
    // Fetch itinerary data with a longer timeout (30 seconds)
    const itineraryPromise = ItineraryService.getItinerary(tripId, token);
    const itineraryTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Itinerary data fetch timeout')), 30000)
    );
    
    try {
      currentItinerary = await Promise.race([itineraryPromise, itineraryTimeout]);
      console.log('Itinerary data fetched successfully:', currentItinerary);
    } catch (itineraryError) {
      console.log('No existing itinerary found. Automatically generating a new one...');
      
      // Show generating state
      dayContent.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Generating your itinerary with AI...</p>
          <p class="loading-subtext">This may take a minute or two.</p>
        </div>
      `;
      
      try {
        // Default preferences for automatic generation based on trip preferences
        const travelStyles = currentTrip.preferences?.travelStyle || [];
        
        const defaultPreferences = {
          activityLevel: 'moderate',
          focusAreas: travelStyles.length > 0 ? travelStyles : ['sightseeing', 'food', 'culture'],
          specialInstructions: 'Create a balanced itinerary with popular attractions and local experiences.'
        };
        
        console.log('Automatically generating itinerary with preferences:', defaultPreferences);
        
        // Generate new itinerary with a timeout of 120 seconds (increased from 60)
        const generatePromise = ItineraryService.generateItinerary(tripId, defaultPreferences, token);
        const generateTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Itinerary generation timed out after 120 seconds')), 120000)
        );
        
        try {
          await Promise.race([generatePromise, generateTimeout]);
          console.log('Itinerary generation successful');
          
          // Add a small delay to ensure the backend has time to save the itinerary
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to fetch the newly generated itinerary with multiple retries
          let retries = 0;
          const maxRetries = 3;
          
          while (retries < maxRetries) {
            try {
              currentItinerary = await ItineraryService.getItinerary(tripId, token);
              console.log('New itinerary fetched successfully');
              break; // Exit the loop if successful
            } catch (fetchError) {
              retries++;
              console.log(`Attempt ${retries}/${maxRetries} to fetch itinerary failed:`, fetchError);
              if (retries < maxRetries) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 2000 * retries));
              } else {
                throw fetchError; // Re-throw the error if all retries failed
              }
            }
          }
        } catch (timeoutError) {
          // If we get a timeout but the itinerary might still be generating in the backend
          console.log('Timeout occurred, but checking if itinerary was generated anyway');
          
          // Try to fetch the itinerary one more time
          try {
            currentItinerary = await ItineraryService.getItinerary(tripId, token);
            console.log('Itinerary was actually generated successfully despite timeout');
          } catch (finalFetchError) {
            throw timeoutError; // Re-throw the original timeout error if this fails
          }
        }
        
        // Continue with displaying the itinerary
      } catch (genError) {
        console.error('Error generating itinerary automatically:', genError);
        dayContent.innerHTML = `
          <div class="error-message centered">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Itinerary Generation Failed</h3>
            <p>We couldn't automatically generate an itinerary. An unknown error occurred.</p>
            <p>Would you like to try again?</p>
            <button id="retry-generation" class="btn btn-primary">
              <i class="fas fa-redo"></i> Retry Generation
            </button>
            <a href="trip-details.html?id=${tripId}" class="btn btn-secondary">
              <i class="fas fa-arrow-left"></i> Back to Trip Details
            </a>
          </div>
        `;
        
        // Add event listener for the retry button if it exists
        const retryButton = document.getElementById('retry-generation');
        if (retryButton) {
          retryButton.addEventListener('click', async function() {
            // Reload the page to try again
            window.location.reload();
          });
        }
        
        return;
      }
    }
    
    // Display itinerary data
    displayItinerary(currentItinerary);
    
    // Initialize map
    initializeMap(currentTrip.destination);
    
    // Update map with day activities
    updateMapForDay(currentDayIndex);
  } catch (error) {
    console.error('Error initializing page:', error);
    dayContent.innerHTML = `
      <div class="error-message centered">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Itinerary Not Available</h3>
        <p>We couldn't load an itinerary for this trip: ${error.message}</p>
        <p>Would you like to create a new itinerary?</p>
        <button id="create-new-itinerary" class="btn btn-primary">
          <i class="fas fa-magic"></i> Create New Itinerary
        </button>
        <a href="trip-details.html?id=${tripId}" class="btn btn-secondary">
          <i class="fas fa-arrow-left"></i> Back to Trip Details
        </a>
      </div>
    `;
    
    // Add event listener for the create button
    setTimeout(() => {
      const createButton = document.getElementById('create-new-itinerary');
      if (createButton) {
        createButton.addEventListener('click', async function() {
          try {
            // Show generating state
            dayContent.innerHTML = `
              <div class="loading">
                <div class="spinner"></div>
                <p>Generating your itinerary with AI...</p>
                <p class="loading-subtext">This may take a minute or two.</p>
              </div>
            `;
            
            // Default preferences for automatic generation
            const defaultPreferences = {
              activityLevel: 'moderate',
              focusAreas: ['sightseeing', 'food', 'culture'],
              specialInstructions: 'Create a balanced itinerary with popular attractions and local experiences.'
            };
            
            console.log('Generating new itinerary with preferences:', defaultPreferences);
            
            // Generate new itinerary
            await ItineraryService.generateItinerary(tripId, defaultPreferences, token);
            
            console.log('Itinerary generation successful, fetching new itinerary');
            
            // Try to fetch the newly generated itinerary
            currentItinerary = await ItineraryService.getItinerary(tripId, token);
            
            // Display the new itinerary
            displayItinerary(currentItinerary);
            
            // Initialize map and update with day activities
            if (currentTrip && currentTrip.destination) {
              initializeMap(currentTrip.destination);
              updateMapForDay(currentDayIndex);
            }
          } catch (genError) {
            console.error('Error generating new itinerary:', genError);
            dayContent.innerHTML = `
              <div class="error-message centered">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to generate itinerary: ${genError.message}</p>
                <p>Please try again later or contact support.</p>
                <a href="trip-details.html?id=${tripId}" class="btn btn-primary">Back to Trip Details</a>
              </div>
            `;
          }
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  }
}

// Display trip info
function displayTripInfo(trip) {
  // Format dates
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const startDateFormatted = startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const endDateFormatted = endDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Update trip info
  tripInfo.innerHTML = `
    <div class="trip-title">${trip.title}</div>
    <div class="trip-destination">
      <i class="fas fa-map-marker-alt"></i> ${trip.destination}
    </div>
    <div class="trip-dates">
      <i class="fas fa-calendar-alt"></i> ${startDateFormatted} - ${endDateFormatted}
    </div>
  `;
}

// We're removing this duplicate function since it already exists elsewhere in the file

// Display itinerary
function displayItinerary(itinerary) {
  // Debug log to see what's in the itinerary
  console.log('Displaying itinerary:', itinerary);
  
  // More detailed debugging
  if (itinerary && itinerary.days && itinerary.days.length > 0) {
    console.log('Days in itinerary:', itinerary.days.length);
    itinerary.days.forEach((day, index) => {
      console.log(`Day ${index + 1} date:`, day.date);
      console.log(`Day ${index + 1} activities array:`, day.activities);
      
      if (day.activities && Array.isArray(day.activities)) {
        console.log(`Day ${index + 1} activities count:`, day.activities.length);
        
        if (day.activities.length > 0) {
          console.log(`Day ${index + 1} first activity:`, day.activities[0]);
        }
      } else {
        console.log(`Day ${index + 1} activities is not an array or is undefined`);
      }
    });
  } else {
    console.log('Itinerary is missing or has no days:', itinerary);
  }
  
  // Ensure all days have an activities array and normalize activity structure
  if (itinerary && itinerary.days && itinerary.days.length > 0) {
    itinerary.days.forEach(day => {
      // Initialize activities array if it doesn't exist or isn't an array
      if (!day.activities || !Array.isArray(day.activities)) {
        console.log(`Fixing day activities array for day with date ${day.date}`);
        day.activities = [];
      } else {
        // Normalize each activity to ensure it has the required properties
        day.activities = day.activities.map(activity => {
          // Ensure activity has a title
          if (!activity.title && activity.name) {
            activity.title = activity.name;
          } else if (!activity.title) {
            activity.title = 'Untitled Activity';
          }
          
          // Ensure activity has a category
          if (!activity.category) {
            activity.category = 'sightseeing';
          }
          
          // Ensure activity has a location
          if (!activity.location) {
            activity.location = { name: itinerary.trip?.destination || 'Local Area' };
          } else if (typeof activity.location === 'string') {
            activity.location = { name: activity.location };
          }
          
          // Ensure activity has cost information
          if (!activity.cost) {
            activity.cost = { amount: 0, currency: 'INR' };
          } else if (typeof activity.cost === 'number') {
            activity.cost = { amount: activity.cost, currency: 'INR' };
          }
          
          return activity;
        });
      }
    });
  }
  
  // Debug - log the activities status for each day
  if (itinerary && itinerary.days && itinerary.days.length > 0) {
    console.log('Activity check for each day:');
    itinerary.days.forEach((day, idx) => {
      console.log(`Day ${idx+1} activities check:`, {
        hasActivitiesProp: !!day.activities,
        isArray: Array.isArray(day.activities),
        length: day.activities ? day.activities.length : 0
      });
    });
  }

  // Check if there are any activities across all days
  let hasAnyActivities = false;
  if (itinerary && itinerary.days && itinerary.days.length > 0) {
    for (const day of itinerary.days) {
      if (day.activities && Array.isArray(day.activities) && day.activities.length > 0) {
        hasAnyActivities = true;
        break;
      }
    }
  }
  console.log('Has any activities across all days:', hasAnyActivities);
  
  // Modified condition to better detect empty itineraries - more lenient now
  if (!itinerary || !itinerary.days || itinerary.days.length === 0 || !hasAnyActivities) {
    // No itinerary exists yet or no activities in the itinerary
    dayContent.innerHTML = `
      <div class="empty-itinerary">
        <i class="fas fa-calendar-alt"></i>
        <h3>No Activities in Your Itinerary</h3>
        <p>Generate an AI-powered itinerary with activities for your trip.</p>
        <button class="btn btn-primary" id="generate-first-itinerary-btn">
          <i class="fas fa-magic"></i> Generate Itinerary
        </button>
        <button class="btn btn-secondary" id="regenerate-itinerary-btn">
          <i class="fas fa-redo"></i> Regenerate Itinerary
        </button>
        <button class="btn btn-info" id="reload-page-btn">
          <i class="fas fa-sync"></i> Reload Page
        </button>
      </div>
    `;
    
    document.getElementById('generate-first-itinerary-btn').addEventListener('click', openRegenerateModal);
    
    // Add event listener for reload button
    const reloadBtn = document.getElementById('reload-page-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', function() {
        window.location.reload();
      });
    }
    
    // Add event listener for regenerate button
    const regenerateBtn = document.getElementById('regenerate-itinerary-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', async function() {
        try {
          // Show generating state
          dayContent.innerHTML = `
            <div class="loading">
              <div class="spinner"></div>
              <p>Regenerating your itinerary with AI...</p>
              <p class="loading-subtext">This may take a minute or two.</p>
            </div>
          `;
          
          // Default preferences for automatic regeneration
          const defaultPreferences = {
            activityLevel: 'moderate',
            focusAreas: ['sightseeing', 'food', 'culture'],
            sustainabilityPriority: 3,
            specialInstructions: 'Create a balanced itinerary with popular attractions and local experiences.'
          };
          
          console.log('Regenerating itinerary with default preferences');
          await ItineraryService.generateItinerary(tripId, defaultPreferences, token);
          
          // Wait a moment for the backend to process
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Reload the page to show the new itinerary
          window.location.reload();
        } catch (error) {
          console.error('Error regenerating itinerary:', error);
          dayContent.innerHTML = `
            <div class="error-message centered">
              <i class="fas fa-exclamation-circle"></i>
              <h3>Regeneration Failed</h3>
              <p>We couldn't regenerate your itinerary: ${error.message}</p>
              <button id="retry-regeneration" class="btn btn-primary">
                <i class="fas fa-redo"></i> Try Again
              </button>
            </div>
          `;
          
          document.getElementById('retry-regeneration')?.addEventListener('click', () => window.location.reload());
        }
      });
    }
    
    // Update metrics
    daysCount.textContent = '0';
    activitiesCount.textContent = '0';
    totalCost.textContent = '$0';
    
    return;
  }
  
  // Update metrics
  const days = itinerary.days.length;
  let activities = 0;
  let cost = 0;
  
  itinerary.days.forEach(day => {
    activities += day.activities.length;
    cost += day.totalDayCost || 0;
  });
  
  daysCount.textContent = days;
  activitiesCount.textContent = activities;
  totalCost.textContent = `₹${cost}`;
  
  // Sustainability removed
  
  // Display day list
  let dayListHTML = '';
  
  itinerary.days.forEach((day, index) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isActive = index === currentDayIndex ? 'active' : '';
    
    dayListHTML += `
      <div class="day-item ${isActive}" data-day-index="${index}">
        <div class="day-number">Day ${index + 1}</div>
        <div class="day-date">${dayName}, ${dayDate}</div>
        <div class="day-activities-count">${day.activities.length} activities</div>
      </div>
    `;
  });
  
  dayList.innerHTML = dayListHTML;
  
  // Add event listeners to day items
  const dayItems = document.querySelectorAll('.day-item');
  dayItems.forEach(item => {
    item.addEventListener('click', function() {
      const dayIndex = parseInt(this.dataset.dayIndex);
      selectDay(dayIndex);
    });
  });
  
  // Display current day content
  displayDayContent(itinerary.days[currentDayIndex], currentDayIndex);
}

// Display day content
function displayDayContent(day, dayIndex) {
  console.log('Displaying day content for day:', dayIndex, day);
  
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  let activitiesHTML = '';
  
  // Ensure activities is an array
  if (!day.activities || !Array.isArray(day.activities)) {
    console.log('Fixing missing activities array for day', dayIndex);
    day.activities = [];
  }
  
  console.log(`Day ${dayIndex+1} has ${day.activities.length} activities`);
  
  if (day.activities.length === 0) {
    activitiesHTML = `
      <div class="empty-day">
        <p>No activities planned for this day.</p>
        <button class="btn btn-secondary btn-sm" id="add-activity-btn">
          <i class="fas fa-plus"></i> Add Activity
        </button>
      </div>
    `;
  } else {
    // Sort activities by start time
    const sortedActivities = [...day.activities].sort((a, b) => {
      // Handle different formats of startTime (string or Date object)
      let timeA, timeB;
      
      if (a.startTime) {
        timeA = a.startTime instanceof Date ? a.startTime : 
               (typeof a.startTime === 'string' && a.startTime.includes('T') ? 
                new Date(a.startTime) : 
                new Date(`1970-01-01T${a.startTime}:00`));
      } else {
        timeA = new Date(0);
      }
      
      if (b.startTime) {
        timeB = b.startTime instanceof Date ? b.startTime : 
               (typeof b.startTime === 'string' && b.startTime.includes('T') ? 
                new Date(b.startTime) : 
                new Date(`1970-01-01T${b.startTime}:00`));
      } else {
        timeB = new Date(0);
      }
      
      return timeA - timeB;
    });
    
    activitiesHTML = `<div class="timeline">`;
    
    // Helper function to format time from different formats
    function formatTime(time) {
      if (!time) return '';
      
      try {
        // Handle Date object
        if (time instanceof Date) {
          return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        
        // Handle ISO string format
        if (typeof time === 'string' && time.includes('T')) {
          const date = new Date(time);
          if (!isNaN(date.getTime())) { // Check if valid date
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          }
        }
        
        // Handle 24-hour format (HH:MM)
        if (typeof time === 'string' && time.match(/^\d{1,2}:\d{2}$/)) {
          const [hours, minutes] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        
        // If time is already in a readable format, return it
        if (typeof time === 'string' && (time.includes('AM') || time.includes('PM'))) {
          return time;
        }
        
        // Last resort - try to parse as date and format
        const date = new Date(time);
        if (!isNaN(date.getTime())) { // Check if valid date
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        
        // If all else fails, return the original
        return typeof time === 'string' ? time : '9:00 AM'; // Return default if not string
      } catch (e) {
        console.error('Error formatting time:', e, time);
        return typeof time === 'string' ? time : '9:00 AM'; // Return default if not string
      }
    }
    
    sortedActivities.forEach((activity, activityIndex) => {
      // Debug log for each activity
      console.log(`Activity ${activityIndex + 1}:`, activity);
      console.log('  startTime:', activity.startTime, typeof activity.startTime);
      console.log('  endTime:', activity.endTime, typeof activity.endTime);
      
      // Handle different formats of time data
      let startTime = '';
      let endTime = '';
      
      if (activity.startTime) {
        try {
          startTime = formatTime(activity.startTime);
        } catch (e) {
          console.error('Error formatting start time:', e);
          // Fallback for startTime
          startTime = typeof activity.startTime === 'string' ? activity.startTime : '9:00 AM';
        }
      }
      
      if (activity.endTime) {
        try {
          endTime = formatTime(activity.endTime);
        } catch (e) {
          console.error('Error formatting end time:', e);
          // Fallback for endTime
          endTime = typeof activity.endTime === 'string' ? activity.endTime : '11:00 AM';
        }
      }
      
      const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : 'Flexible';
      
      const categoryIcon = getCategoryIcon(activity.category);
      const categoryClass = activity.category ? activity.category.toLowerCase() : 'other';
      
      // Weather sensitivity
      let weatherSensitiveHTML = '';
      if (activity.weatherSensitive) {
        weatherSensitiveHTML = `
          <div class="activity-weather-sensitive" title="Weather sensitive activity">
            <i class="fas fa-cloud-sun"></i>
          </div>
        `;
      }
      
      // Sustainability removed
      
      // Cost
      let costHTML = '';
      if (activity.cost) {
        let amount = 0;
        let currency = 'INR';
        
        // Handle different cost formats
        if (typeof activity.cost === 'object') {
          amount = activity.cost.amount || 0;
          currency = activity.cost.currency || 'INR';
        } else if (typeof activity.cost === 'number') {
          amount = activity.cost;
        } else if (typeof activity.cost === 'string' && !isNaN(parseFloat(activity.cost))) {
          amount = parseFloat(activity.cost);
        }
        
        // Format the amount
        amount = typeof amount === 'number' ? amount.toFixed(2) : '0.00';
        
        // Get currency symbol
        let currencySymbol;
        switch(currency) {
          case 'EUR': currencySymbol = '€'; break;
          case 'GBP': currencySymbol = '£'; break;
          case 'JPY': currencySymbol = '¥'; break;
          case 'INR': currencySymbol = '₹'; break;
          default: currencySymbol = '₹';
        }
        
        costHTML = `
          <div class="activity-cost" title="Cost: ${currencySymbol}${amount}">
            <i class="fas fa-coins"></i> ${currencySymbol}${amount}
          </div>
        `;
      }
      
      const durationHTML = activity.duration ? `
        <div class="activity-duration" title="Duration: ${activity.duration} minutes">
          <i class="fas fa-clock"></i> ${formatDuration(activity.duration)}
        </div>
      ` : '';
      
      activitiesHTML += `
        <div class="timeline-item" data-activity-index="${activityIndex}">
          <div class="timeline-time">${timeRange}</div>
          <div class="timeline-content">
            <div class="activity-card ${categoryClass}">
              <div class="activity-header">
                <div class="activity-category">
                  <i class="${categoryIcon}"></i> ${capitalizeFirstLetter(activity.category || 'Other')}
                </div>
                <div class="activity-actions">
                  <button class="btn-icon" data-action="edit-activity" title="Edit Activity">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon" data-action="delete-activity" title="Delete Activity">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <div class="activity-content">
                <h4 class="activity-title">${activity.title}</h4>
                <div class="activity-description">${activity.description || ''}</div>
                ${activity.location ? `
                  <div class="activity-location">
                    <i class="fas fa-map-marker-alt"></i> ${typeof activity.location === 'string' ? activity.location : activity.location.name || 'Local Area'}
                  </div>
                ` : ''}
              </div>
              <div class="activity-footer">
                ${weatherSensitiveHTML}
                
                ${costHTML}
                ${activity.duration ? `
                  <div class="activity-duration" title="Duration: ${activity.duration} minutes">
                    <i class="fas fa-clock"></i> ${formatDuration(activity.duration)}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    activitiesHTML += `</div>`;
  }
  
  dayContent.innerHTML = `
    <div class="day-header">
      <h3>${dayName}, ${dayDate}</h3>
      <div class="day-metrics">
        <div class="day-metric">
          <i class="fas fa-list"></i> ${day.activities.length} activities
        </div>
        <div class="day-metric">
          <i class="fas fa-rupee-sign"></i> ₹${day.totalDayCost || 0}
        </div>
      </div>
    </div>
    <div class="day-activities">
      ${activitiesHTML}
    </div>
  `;
  
  // Add event listeners for activity actions
  const editButtons = document.querySelectorAll('[data-action="edit-activity"]');
  const deleteButtons = document.querySelectorAll('[data-action="delete-activity"]');
  
  editButtons.forEach(button => {
    button.addEventListener('click', function() {
      const activityItem = this.closest('.timeline-item');
      const activityIndex = parseInt(activityItem.dataset.activityIndex);
      editActivity(dayIndex, activityIndex);
    });
  });
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', function() {
      const activityItem = this.closest('.timeline-item');
      const activityIndex = parseInt(activityItem.dataset.activityIndex);
      deleteActivity(dayIndex, activityIndex);
    });
  });
  
  // Add activity button
  const addActivityBtn = document.getElementById('add-activity-btn');
  if (addActivityBtn) {
    addActivityBtn.addEventListener('click', function() {
      addActivity(dayIndex);
    });
  }
}

// Select day
function selectDay(dayIndex) {
  // Update current day index
  currentDayIndex = dayIndex;
  
  // Update active day in list
  const dayItems = document.querySelectorAll('.day-item');
  dayItems.forEach((item, index) => {
    if (index === dayIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Display day content
  displayDayContent(currentItinerary.days[dayIndex], dayIndex);
  
  // Update map
  updateMapForDay(dayIndex);
}

// Initialize map
function initializeMap(destination) {
  // Create a map centered on the destination
  map = L.map(itineraryMap, {
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true,
    maxZoom: 18
  }).setView([0, 0], 2);
  
  // Add OpenStreetMap tiles with better styling
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  // Add scale control
  L.control.scale({
    imperial: false,
    metric: true,
    position: 'bottomright'
  }).addTo(map);
  
  // Add fullscreen control
  L.control.fullscreen({
    position: 'topright',
    title: 'Show fullscreen',
    titleCancel: 'Exit fullscreen',
    content: '<i class="fas fa-expand"></i>'
  }).addTo(map);
  
  // No legend for activity types as requested
  
  // Geocode the destination and center the map
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        map.setView([lat, lon], 13);
        
        // Add a destination marker
        const destinationMarker = L.marker([lat, lon], {
          icon: L.divIcon({
            html: `<div class="destination-marker-container"><i class="fas fa-map-marker-alt"></i></div>`,
            className: 'destination-marker',
            iconSize: [50, 50],
            iconAnchor: [25, 50]
          })
        }).addTo(map);
        
        destinationMarker.bindPopup(`<div class="destination-popup"><h4>${destination}</h4><p>Your trip destination</p></div>`);
        markers.push(destinationMarker);
      }
    })
    .catch(error => console.error('Error geocoding destination:', error));
}

// Update map for day
async function updateMapForDay(dayIndex) {
  // Clear existing markers and paths
  clearMapMarkers();
  
  const day = currentItinerary.days[dayIndex];
  if (!day || !day.activities || day.activities.length === 0) {
    // Show a message on the map if no activities
    const noActivitiesMessage = L.control({position: 'center'});
    noActivitiesMessage.onAdd = function() {
      const div = L.DomUtil.create('div', 'no-activities-message');
      div.innerHTML = `<div class="alert alert-info">No activities planned for this day. <button class="btn btn-sm btn-primary add-activity-btn">Add Activity</button></div>`;
      return div;
    };
    noActivitiesMessage.addTo(map);
    return;
  }
  
  // Sort activities by start time
  const sortedActivities = [...day.activities].sort((a, b) => {
    const timeA = a.startTime ? new Date(`1970-01-01T${a.startTime}`) : new Date(0);
    const timeB = b.startTime ? new Date(`1970-01-01T${b.startTime}`) : new Date(0);
    return timeA - timeB;
  });
  
  // Day information panel removed as requested
  
  // Array to store activity coordinates
  const activityCoordinates = [];
  const activityInfo = [];
  
  // Add markers for each activity location
  for (let i = 0; i < sortedActivities.length; i++) {
    const activity = sortedActivities[i];
    const activityNumber = i + 1;
    
    if (activity.location) {
      try {
        // Geocode the location
        const locationName = typeof activity.location === 'string' ? activity.location : activity.location.name;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}, ${encodeURIComponent(currentTrip.destination)}`);
        const data = await response.json();
        
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          // Create custom icon based on activity category and number
          const categoryIcon = getCategoryIcon(activity.category);
          const markerIcon = L.divIcon({
            html: `
              <div class="activity-marker-container">
                <div class="activity-number">${activityNumber}</div>
                <i class="${categoryIcon}"></i>
              </div>
            `,
            className: 'custom-div-icon',
            iconSize: [50, 50],
            iconAnchor: [25, 25]
          });
          
          // Create marker with custom icon
          const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map);
          
          // Format cost if available
          let costDisplay = '';
          if (activity.cost && activity.cost.amount) {
            const amount = activity.cost.amount;
            const currency = activity.cost.currency || 'INR';
            costDisplay = `<p><i class="fas fa-money-bill-wave"></i> ${amount} ${currency}</p>`;
          }
          
          // Create marker popup with more detailed information
          marker.bindPopup(`
            <div class="activity-popup">
              <h4>${activity.title}</h4>
              <p><i class="far fa-clock"></i> ${activity.startTime ? formatTime(activity.startTime) : ''} ${activity.endTime ? '- ' + formatTime(activity.endTime) : ''}</p>
              <p><i class="fas fa-tag"></i> ${activity.category || 'Activity'}</p>
              <p><i class="fas fa-map-marker-alt"></i> ${locationName}</p>
              ${costDisplay}
              ${activity.description ? `<p><i class="fas fa-info-circle"></i> ${activity.description}</p>` : ''}
              <div class="popup-actions">
                <button class="btn btn-sm btn-outline-primary view-details-btn" data-activity-id="${activity._id || i}">View Details</button>
              </div>
            </div>
          `);
          
          // Add marker to array
          markers.push(marker);
          
          // Add coordinates and info to arrays
          activityCoordinates.push([lat, lon]);
          activityInfo.push({
            title: activity.title,
            category: activity.category,
            startTime: activity.startTime,
            endTime: activity.endTime,
            location: locationName,
            number: activityNumber
          });
        }
      } catch (error) {
        console.error('Error geocoding activity location:', error);
      }
    }
  }
  
  // Create dotted path between activities
  if (activityCoordinates.length > 1) {
    // Main route - dotted line
    const path = L.polyline(activityCoordinates, {
      color: '#4CAFAB',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    
    // Add direction arrows along the path
    const arrowDecorator = L.polylineDecorator(path, {
      patterns: [
        {
          offset: '5%',
          repeat: '10%',
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            pathOptions: {
              color: '#4CAFAB',
              fillOpacity: 0.8,
              weight: 0
            }
          })
        }
      ]
    }).addTo(map);
    
    activityPaths.push(path);
    activityPaths.push(arrowDecorator);
    
    // Time indicators between points removed as requested
    
    // Fit map bounds to include all markers
    map.fitBounds(path.getBounds(), { padding: [50, 50] });
  } else if (activityCoordinates.length === 1) {
    // If only one activity, center map on it
    map.setView(activityCoordinates[0], 15);
  }
  
  // Add event listeners to popup buttons
  setTimeout(() => {
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const activityId = this.getAttribute('data-activity-id');
        // Find the activity by id or index
        const activity = sortedActivities.find(a => a._id === activityId) || sortedActivities[parseInt(activityId)];
        if (activity) {
          showActivityDetails(activity);
        }
      });
    });
    
    document.querySelectorAll('.add-activity-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        // Open add activity modal or redirect to itinerary builder
        window.location.href = `itinerary-builder.html?tripId=${currentTrip._id}&day=${dayIndex}`;
      });
    });
  }, 500);
}

// Clear map markers and paths
function clearMapMarkers() {
  // Remove markers
  if (markers && markers.length) {
    markers.forEach(marker => {
      if (map && marker) {
        map.removeLayer(marker);
      }
    });
    markers = [];
  }
  
  // Remove paths and decorators
  if (activityPaths && activityPaths.length) {
    activityPaths.forEach(path => {
      if (map && path) {
        map.removeLayer(path);
      }
    });
    activityPaths = [];
  }
}

// Format time (convert 24h to 12h)
function formatTime(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Show detailed activity information in a modal
function showActivityDetails(activity) {
  // Get the modal elements
  const modal = document.getElementById('activity-details-modal');
  const title = document.getElementById('activity-details-title');
  const content = document.getElementById('activity-details-content');
  
  if (!modal || !title || !content) {
    console.error('Activity details modal elements not found');
    return;
  }
  
  // Set the title
  title.textContent = activity.title || 'Activity Details';
  
  // Format location
  const locationName = typeof activity.location === 'string' ? activity.location : (activity.location?.name || 'Unknown location');
  
  // Format cost
  let costDisplay = 'Not specified';
  if (activity.cost && activity.cost.amount !== undefined) {
    const amount = activity.cost.amount;
    const currency = activity.cost.currency || 'INR';
    costDisplay = currency === 'INR' ? `₹${amount}` : `${amount} ${currency}`;
  }
  
  // Format time
  const timeDisplay = `${activity.startTime ? formatTime(activity.startTime) : 'Not specified'} ${activity.endTime ? '- ' + formatTime(activity.endTime) : ''}`;
  
  // Format duration
  let durationDisplay = 'Not specified';
  if (activity.duration) {
    if (activity.duration < 60) {
      durationDisplay = `${activity.duration} minutes`;
    } else {
      const hours = Math.floor(activity.duration / 60);
      const minutes = activity.duration % 60;
      durationDisplay = minutes > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }
  
  // Sustainability removed
  
  // Format accessibility
  let accessibilityDisplay = 'Information not available';
  if (activity.accessibility) {
    const accessibilityFeatures = [];
    if (activity.accessibility.wheelchairAccessible) accessibilityFeatures.push('Wheelchair accessible');
    if (activity.accessibility.hearingAccessible) accessibilityFeatures.push('Hearing accessible');
    if (activity.accessibility.visuallyAccessible) accessibilityFeatures.push('Visually accessible');
    
    if (accessibilityFeatures.length > 0) {
      accessibilityDisplay = accessibilityFeatures.join(', ');
    }
  }
  
  // Set the content
  content.innerHTML = `
    <div class="activity-details">
      <div class="activity-detail-row">
        <div class="detail-label"><i class="fas fa-tag"></i> Category:</div>
        <div class="detail-value">${activity.category || 'Not specified'}</div>
      </div>
      
      <div class="activity-detail-row">
        <div class="detail-label"><i class="far fa-clock"></i> Time:</div>
        <div class="detail-value">${timeDisplay}</div>
      </div>
      
      <div class="activity-detail-row">
        <div class="detail-label"><i class="fas fa-hourglass-half"></i> Duration:</div>
        <div class="detail-value">${durationDisplay}</div>
      </div>
      
      <div class="activity-detail-row">
        <div class="detail-label"><i class="fas fa-map-marker-alt"></i> Location:</div>
        <div class="detail-value">${locationName}</div>
      </div>
      
      <div class="activity-detail-row">
        <div class="detail-label"><i class="fas fa-money-bill-wave"></i> Cost:</div>
        <div class="detail-value">${costDisplay}</div>
      </div>
      
      
      
      <div class="activity-detail-row">
        <div class="detail-label"><i class="fas fa-wheelchair"></i> Accessibility:</div>
        <div class="detail-value">${accessibilityDisplay}</div>
      </div>
      
      ${activity.description ? `
        <div class="activity-description">
          <h5>Description</h5>
          <p>${activity.description}</p>
        </div>
      ` : ''}
      
      <div class="activity-actions">
        <button class="btn btn-outline-secondary" id="edit-activity-btn" data-activity-id="${activity._id || ''}"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn btn-outline-danger" id="delete-activity-btn" data-activity-id="${activity._id || ''}"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  `;
  
  // Show the modal
  modal.classList.add('show');
  
  // Add event listeners to the buttons
  const editBtn = document.getElementById('edit-activity-btn');
  const deleteBtn = document.getElementById('delete-activity-btn');
  
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      // Redirect to edit page or show edit modal
      window.location.href = `itinerary-builder.html?tripId=${currentTrip._id}&activityId=${activity._id || ''}`;
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      // Find the activity index in the current day
      const day = currentItinerary.days[currentDayIndex];
      const activityIndex = day.activities.findIndex(a => 
        (a._id && a._id.toString() === activity._id?.toString()) || 
        (a === activity)
      );
      
      if (activityIndex === -1) {
        alert('Activity not found in current day.');
        return;
      }
      
      // Confirm and delete activity
      if (confirm('Are you sure you want to delete this activity?')) {
        deleteActivity(currentDayIndex, activityIndex);
      }
    });
  }
  
  // Add close functionality
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      modal.classList.remove('show');
    });
  }
  
  // Close when clicking outside the modal content
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  });
}

// Format duration (minutes to hours and minutes)
function formatDuration(minutes) {
  if (!minutes) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

// Get category icon
function getCategoryIcon(category) {
  if (!category) return 'fas fa-map-pin';
  
  switch (category.toLowerCase()) {
    case 'sightseeing':
      return 'fas fa-landmark';
    case 'food':
      return 'fas fa-utensils';
    case 'adventure':
      return 'fas fa-hiking';
    case 'relaxation':
      return 'fas fa-spa';
    case 'cultural':
      return 'fas fa-theater-masks';
    case 'shopping':
      return 'fas fa-shopping-bag';
    case 'transport':
      return 'fas fa-bus';
    case 'accommodation':
      return 'fas fa-hotel';
    default:
      return 'fas fa-map-pin';
  }
}

// Get sustainability class based on score
function getSustainabilityClass(score) {
  if (!score && score !== 0) return 'neutral';
  
  const numScore = Number(score);
  if (isNaN(numScore)) return 'neutral';
  
  if (numScore >= 8) return 'excellent';
  if (numScore >= 6) return 'good';
  if (numScore >= 4) return 'average';
  if (numScore >= 2) return 'poor';
  return 'very-poor';
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Open regenerate modal
function openRegenerateModal() {
  regenerateModal.classList.add('active');
  document.body.classList.add('modal-open');
}

// Close regenerate modal
function closeRegenerateModal() {
  regenerateModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.getElementById('regenerate-error').textContent = '';
}

// Close edit activity modal
function closeEditActivityModal() {
  if (!editActivityModal) return;
  editActivityModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  currentEditDayIndex = null;
  currentEditActivityIndex = null;
  if (editActivityError) editActivityError.textContent = '';
}

// Validate and submit edit activity form
async function handleEditActivitySubmit(event) {
  event.preventDefault();

  if (currentEditDayIndex === null || currentEditActivityIndex === null) {
    return;
  }

  const title = editActivityTitleInput ? editActivityTitleInput.value.trim() : '';
  const location = editActivityLocationInput ? editActivityLocationInput.value.trim() : '';
  const costValue = editActivityCostInput ? editActivityCostInput.value.trim() : '';
  const durationValue = editActivityDurationInput ? editActivityDurationInput.value.trim() : '';
  const category = editActivityCategorySelect ? editActivityCategorySelect.value : 'sightseeing';
  const description = editActivityDescriptionInput ? editActivityDescriptionInput.value.trim() : '';
  const notes = editActivityNotesInput ? editActivityNotesInput.value.trim() : '';

  // Basic validation
  if (!title || !location) {
    if (editActivityError) {
      editActivityError.textContent = 'Title and location are required.';
    }
    return;
  }

  if (costValue && isNaN(Number(costValue))) {
    if (editActivityError) {
      editActivityError.textContent = 'Cost must be a numeric value.';
    }
    return;
  }

  // Duration is optional; if empty we leave it unchanged on the backend

  const day = currentItinerary.days[currentEditDayIndex];
  const activity = day.activities[currentEditActivityIndex];

  const payload = {
    title,
    description,
    location,
    cost: costValue ? Number(costValue) : 0,
    duration: durationValue ? Number(durationValue) : undefined,
    category,
    notes: notes || undefined
  };

  try {
    if (editActivityError) editActivityError.textContent = '';

    // Use existing API service to update activity in backend
    await ItineraryService.updateActivity(currentItinerary._id, day._id, activity._id, payload, token);

    // Refresh itinerary data from backend
    currentItinerary = await ItineraryService.getItinerary(tripId, token);

    // Update metrics and current day view
    displayItinerary(currentItinerary);
    updateMapForDay(currentEditDayIndex);

    closeEditActivityModal();
  } catch (error) {
    console.error('Error updating activity:', error);
    if (editActivityError) {
      editActivityError.textContent = error.message || 'Failed to update activity. Please try again.';
    }
  }
}

// Edit activity - open modal with existing values
function editActivity(dayIndex, activityIndex) {
  if (!editActivityModal || !editActivityForm) {
    console.error('Edit activity modal elements not found');
    return;
  }

  const day = currentItinerary.days[dayIndex];
  if (!day || !day.activities || !day.activities[activityIndex]) {
    console.error('Invalid activity index for edit');
    return;
  }

  const activity = day.activities[activityIndex];

  currentEditDayIndex = dayIndex;
  currentEditActivityIndex = activityIndex;

  // Prefill fields
  if (editActivityTitleInput) editActivityTitleInput.value = activity.title || '';
  if (editActivityDescriptionInput) editActivityDescriptionInput.value = activity.description || '';

  let locationValue = '';
  if (activity.location) {
    if (typeof activity.location === 'string') {
      locationValue = activity.location;
    } else if (activity.location.name) {
      locationValue = activity.location.name;
    }
  }
  if (editActivityLocationInput) editActivityLocationInput.value = locationValue;

  let costValue = '';
  if (activity.cost) {
    if (typeof activity.cost === 'number') {
      costValue = activity.cost;
    } else if (typeof activity.cost.amount !== 'undefined') {
      costValue = activity.cost.amount;
    }
  }
  if (editActivityCostInput) editActivityCostInput.value = costValue;

  if (editActivityDurationInput) editActivityDurationInput.value = activity.duration || '';

  if (editActivityCategorySelect) {
    editActivityCategorySelect.value = (activity.category || 'sightseeing').toLowerCase();
  }

  if (editActivityNotesInput) editActivityNotesInput.value = activity.notes || '';

  if (editActivityError) editActivityError.textContent = '';

  // Show modal
  editActivityModal.classList.add('active');
  document.body.classList.add('modal-open');
}

// Delete itinerary
async function deleteItinerary() {
  if (confirm('Are you sure you want to delete this entire itinerary? This action cannot be undone.')) {
    try {
      await ItineraryService.deleteItinerary(currentItinerary._id, token);
      alert('Itinerary deleted successfully.');
      // Redirect back to trip details
      window.location.href = `trip-details.html?id=${tripId}`;
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      alert('Failed to delete itinerary. Please try again.');
    }
  }
}

// Delete activity
async function deleteActivity(dayIndex, activityIndex) {
  const activity = currentItinerary.days[dayIndex].activities[activityIndex];
  const day = currentItinerary.days[dayIndex];
  
  if (confirm(`Are you sure you want to delete "${activity.title}"? This action cannot be undone.`)) {
    try {
      // Delete activity using dayId (the day's _id) instead of dayIndex
      await ItineraryService.deleteActivity(currentItinerary._id, day._id, activity._id, token);
      
      // Refresh itinerary data
      currentItinerary = await ItineraryService.getItinerary(tripId, token);
      
      // Display updated itinerary
      displayItinerary(currentItinerary);
      
      // Update map
      updateMapForDay(dayIndex);
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity. Please try again.');
    }
  }
}

// Add activity
function addActivity(dayIndex) {
  // Redirect to itinerary builder - use tripId, not itineraryId
  window.location.href = `itinerary-builder.html?id=${tripId}&day=${dayIndex}&new=true`;
}

// Regenerate itinerary
async function regenerateItinerary(event) {
  event.preventDefault();
  
  const errorElement = document.getElementById('regenerate-error');
  errorElement.textContent = '';
  
  // Get form data
  const formData = new FormData(regenerateForm);
  const activityLevel = formData.get('activityLevel');
  const focusAreas = formData.getAll('focus');
  const specialInstructions = formData.get('specialInstructions');
  
  // Create preferences object
  const preferences = {
    activityLevel,
    focusAreas,
    specialInstructions
  };
  
  try {
    // Show loading state
    dayContent.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Generating your itinerary with AI...</p>
        <p class="loading-subtext">This may take a minute or two.</p>
      </div>
    `;
    
    // Close modal
    closeRegenerateModal();
    
    // Generate itinerary
    await ItineraryService.generateItinerary(tripId, preferences, token);
    
    // Fetch updated itinerary
    currentItinerary = await ItineraryService.getItinerary(tripId, token);
    
    // Display updated itinerary
    displayItinerary(currentItinerary);
    
    // Reset current day index
    currentDayIndex = 0;
    
    // Update map
    updateMapForDay(0);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    dayContent.innerHTML = `
      <div class="error-message centered">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to generate itinerary. Please try again later.</p>
        <button class="btn btn-primary" id="retry-generate-btn">Retry</button>
      </div>
    `;
    
    document.getElementById('retry-generate-btn').addEventListener('click', openRegenerateModal);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the page
  initializePage();
  
  // Add event listener for retry generation button
  document.addEventListener('click', function(event) {
    if (event.target && (event.target.id === 'retry-generation' || event.target.closest('#retry-generation'))) {
      console.log('Retry generation button clicked');
      retryGenerateItinerary();
    }
  });
  
  // Function to retry itinerary generation
  async function retryGenerateItinerary() {
    try {
      // Show loading state
      dayContent.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Generating your itinerary with AI...</p>
          <p class="loading-subtext">This may take a minute or two.</p>
        </div>
      `;
      
      // Default preferences for generation based on trip preferences
      const travelStyles = currentTrip.preferences?.travelStyle || [];
      
      const defaultPreferences = {
        activityLevel: 'moderate',
        focusAreas: travelStyles.length > 0 ? travelStyles : ['sightseeing', 'food', 'culture'],
        specialInstructions: 'Create a balanced itinerary with popular attractions and local experiences.'
      };
      
      console.log('Retrying itinerary generation with preferences:', defaultPreferences);
      
      // Generate new itinerary with a timeout of 60 seconds
      const generatePromise = ItineraryService.generateItinerary(tripId, defaultPreferences, token);
      const generateTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Itinerary generation timed out after 60 seconds')), 60000)
      );
      
      await Promise.race([generatePromise, generateTimeout]);
      console.log('Itinerary generation successful');
      
      // Try to fetch the newly generated itinerary
      currentItinerary = await ItineraryService.getItinerary(tripId, token);
      console.log('New itinerary fetched successfully');
      
      // Display the itinerary
      displayItinerary(currentItinerary);
    } catch (error) {
      console.error('Error retrying itinerary generation:', error);
      dayContent.innerHTML = `
        <div class="error-message centered">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Itinerary Generation Failed</h3>
          <p>We couldn't generate an itinerary. Please try again later.</p>
          <p>Would you like to try again?</p>
          <button id="retry-generation" class="btn btn-primary">
            <i class="fas fa-redo"></i> Retry Generation
          </button>
          <a href="trip-details.html?id=${tripId}" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> Back to Trip Details
          </a>
        </div>
      `;
    }
  }
  
  // Theme toggle functionality
  const themeSwitch = document.getElementById('theme-switch');
  const body = document.body;
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.setAttribute('data-theme', savedTheme);
    // Only set checked property if themeSwitch exists
    if (themeSwitch) {
      themeSwitch.checked = savedTheme === 'dark';
    }
  }
  
  // Theme switch event listener - only add if element exists
  if (themeSwitch) {
    themeSwitch.addEventListener('change', function() {
      if (this.checked) {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    });
  }
  
  // Mobile menu toggle - with null checks
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }
  
  // User menu toggle - with null checks
  const userMenuBtn = document.querySelector('.user-menu-btn');
  const userDropdown = document.querySelector('.user-dropdown');
  
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', function() {
      userDropdown.classList.toggle('active');
    });
    
    // Close user dropdown when clicking outside
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.user-menu') && userDropdown) {
        userDropdown.classList.remove('active');
      }
    });
  }
  
  // Edit itinerary button
  const editItineraryBtn = document.getElementById('edit-itinerary-btn');
  if (editItineraryBtn) {
    editItineraryBtn.addEventListener('click', function() {
      // Redirect to itinerary builder
      window.location.href = `itinerary-builder.html?id=${tripId}`;
    });
  }
  
  // Regenerate button
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', openRegenerateModal);
  }
  
  // Delete itinerary button
  const deleteItineraryBtn = document.getElementById('delete-itinerary-btn');
  if (deleteItineraryBtn) {
    deleteItineraryBtn.addEventListener('click', deleteItinerary);
  }
  
  // Edit itinerary feature removed
  
  // Cancel regenerate button
  if (cancelRegenerateBtn) {
    cancelRegenerateBtn.addEventListener('click', closeRegenerateModal);
  }
  
  // Close regenerate modal when clicking outside
  if (regenerateModal) {
    regenerateModal.addEventListener('click', function(event) {
      if (event.target === regenerateModal) {
        closeRegenerateModal();
      }
    });
  }
  
  // Close regenerate modal with X button
  const modalCloseBtn = document.querySelector('#regenerate-modal .modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeRegenerateModal);
  }
  
  // Regenerate form submission
  if (regenerateForm) {
    regenerateForm.addEventListener('submit', regenerateItinerary);
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(event) {
      event.preventDefault();
      logout();
    });
  }
});
