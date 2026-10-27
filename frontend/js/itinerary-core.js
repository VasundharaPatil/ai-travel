/**
 * Itinerary Core Module
 * Handles basic setup, initialization, and core functionality for the itinerary builder
 */

import { TripService, ItineraryService } from '../services/api.js';
import { getToken, getUser, logout } from '../services/auth.js';
import { initDayManager, renderDayList } from './itinerary-day-manager.js';
import { initActivityManager } from './itinerary-activity-manager.js';
import { initUI, showLoading, hideLoading, showError } from './itinerary-ui.js';

// Global state
const state = {
  token: null,
  user: null,
  tripId: null,
  itineraryId: null,
  trip: null,
  itinerary: null,
  currentDayIndex: 0,
  currentActivityIndex: null,
  isNewActivity: false,
  hasUnsavedChanges: false
};

/**
 * Initialize the itinerary builder
 */
export async function initItineraryBuilder() {
  // Check authentication
  state.token = getToken();
  if (!state.token) {
    window.location.href = 'login.html';
    return;
  }
  
  // Get user data
  state.user = getUser();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  state.tripId = urlParams.get('id');
  state.currentDayIndex = parseInt(urlParams.get('day') || '0');
  state.currentActivityIndex = urlParams.get('activity') ? parseInt(urlParams.get('activity')) : null;
  state.isNewActivity = urlParams.get('new') === 'true';
  
  // If no trip ID is provided, redirect to dashboard
  if (!state.tripId) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  // Initialize UI components
  initUI(state);
  
  // Initialize managers
  initDayManager(state);
  initActivityManager(state);
  
  // Load data
  await loadData();
  
  // Set up event listeners for page navigation
  setupNavigationHandlers();
}

/**
 * Load trip and itinerary data
 */
async function loadData() {
  try {
    showLoading();
    
    // Fetch trip data
    state.trip = await TripService.getTripById(state.tripId, state.token);
    
    // Update back to itinerary link
    const backLink = document.getElementById('back-to-itinerary');
    if (backLink) {
      backLink.href = `itinerary.html?id=${state.tripId}`;
    }
    
    // Display trip info
    displayTripInfo(state.trip);
    
    // Fetch itinerary data
    try {
      state.itinerary = await ItineraryService.getItinerary(state.tripId, state.token);
      
      // Check if itinerary was found
      if (!state.itinerary) {
        throw new Error('Itinerary not found for this trip');
      }
      
      state.itineraryId = state.itinerary._id;
      
      // Ensure itinerary has days array
      if (!state.itinerary.days || !Array.isArray(state.itinerary.days)) {
        state.itinerary.days = [];
      }
      
      // Ensure each day has activities array
      state.itinerary.days.forEach(day => {
        if (!day.activities || !Array.isArray(day.activities)) {
          day.activities = [];
        }
      });
      
      // Render day list
      renderDayList();
      
      // If this is a new activity, open the activity modal
      if (state.isNewActivity) {
        // Ensure day index is valid
        if (state.currentDayIndex >= 0 && state.currentDayIndex < state.itinerary.days.length) {
          document.dispatchEvent(new CustomEvent('openAddActivityModal', { 
            detail: { dayIndex: state.currentDayIndex }
          }));
        } else {
          console.warn('Invalid day index for new activity:', state.currentDayIndex);
        }
      }
      // If editing an existing activity, open the edit modal
      else if (state.currentActivityIndex !== null) {
        // Ensure day and activity indices are valid
        if (state.currentDayIndex >= 0 && 
            state.currentDayIndex < state.itinerary.days.length &&
            state.currentActivityIndex >= 0 &&
            state.currentActivityIndex < state.itinerary.days[state.currentDayIndex].activities.length) {
          document.dispatchEvent(new CustomEvent('openEditActivityModal', { 
            detail: { 
              dayIndex: state.currentDayIndex,
              activityIndex: state.currentActivityIndex
            }
          }));
        } else {
          console.warn('Invalid day or activity index for editing:', {
            dayIndex: state.currentDayIndex,
            activityIndex: state.currentActivityIndex,
            daysLength: state.itinerary.days.length,
            activitiesLength: state.itinerary.days[state.currentDayIndex]?.activities?.length || 0
          });
        }
      }
    } catch (itineraryError) {
      console.error('Error fetching itinerary:', itineraryError);
      // If itinerary doesn't exist, create an empty one or show error
      hideLoading();
      showError(`Failed to load itinerary: ${itineraryError.message || 'Itinerary not found. Please generate one first.'}`);
      return;
    }
    
    hideLoading();
  } catch (error) {
    console.error('Error loading data:', error);
    hideLoading(); // Always hide loading on error
    showError(`Failed to load itinerary data: ${error.message || 'Please try again later.'}`);
  }
}

/**
 * Display trip info
 */
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
  const tripInfo = document.getElementById('trip-info');
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

/**
 * Set up event handlers for page navigation
 */
function setupNavigationHandlers() {
  // Handle beforeunload event to check for unsaved changes
  window.addEventListener('beforeunload', function(e) {
    if (state.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
  
  // Handle back button click
  document.getElementById('back-to-itinerary').addEventListener('click', function(e) {
    if (state.hasUnsavedChanges) {
      e.preventDefault();
      document.getElementById('unsaved-changes-modal').classList.add('active');
      document.body.classList.add('modal-open');
    }
  });
  
  // Handle discard changes button
  document.getElementById('discard-changes-btn').addEventListener('click', function() {
    state.hasUnsavedChanges = false;
    window.location.href = `itinerary.html?id=${state.tripId}`;
  });
  
  // Handle save before exit button
  document.getElementById('save-before-exit-btn').addEventListener('click', async function() {
    try {
      await saveItinerary();
      window.location.href = `itinerary.html?id=${state.tripId}`;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      showError('Failed to save itinerary. Please try again.');
    }
  });
  
  // Handle logout button
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    if (state.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to logout?')) {
        logout();
      }
    } else {
      logout();
    }
  });
}

/**
 * Save itinerary changes
 */
export async function saveItinerary() {
  try {
    showLoading();
    
    // Update itinerary
    await ItineraryService.updateItinerary(state.itineraryId, state.itinerary, state.token);
    
    // Reset unsaved changes flag
    state.hasUnsavedChanges = false;
    
    hideLoading();
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Itinerary saved successfully!';
    document.body.appendChild(successMessage);
    
    // Remove success message after 3 seconds
    setTimeout(() => {
      document.body.removeChild(successMessage);
    }, 3000);
    
    return true;
  } catch (error) {
    console.error('Error saving itinerary:', error);
    hideLoading();
    showError('Failed to save itinerary. Please try again.');
    return false;
  }
}

/**
 * Get the global state
 */
export function getState() {
  return state;
}

/**
 * Set unsaved changes flag
 */
export function setUnsavedChanges(value) {
  state.hasUnsavedChanges = value;
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initItineraryBuilder);
