/**
 * Itinerary Activity Manager Module
 * Handles activity-related functionality for the itinerary builder
 */

import { ItineraryService } from '../services/api.js';
import { showLoading, hideLoading, showError } from './itinerary-ui.js';
import { getState, setUnsavedChanges } from './itinerary-core.js';
import { renderDayEditor } from './itinerary-day-manager.js';

// Reference to the global state
let state;

/**
 * Initialize the activity manager
 * @param {Object} globalState - The global state object
 */
export function initActivityManager(globalState) {
  state = globalState;
  
  // Set up event listeners
  setupActivityEventListeners();
  
  // Set up custom event listeners
  setupCustomEventListeners();
}

/**
 * Set up event listeners for activity-related actions
 */
function setupActivityEventListeners() {
  // Activity modal close button
  document.querySelector('#activity-modal .modal-close').addEventListener('click', closeActivityModal);
  
  // Cancel activity button
  document.getElementById('cancel-activity-btn').addEventListener('click', closeActivityModal);
  
  // Activity form submission
  document.getElementById('activity-form').addEventListener('submit', handleActivityFormSubmit);
  
  // Close activity modal when clicking outside
  document.getElementById('activity-modal').addEventListener('click', function(event) {
    if (event.target === this) {
      closeActivityModal();
    }
  });
  
  // Auto-calculate duration when start and end times change
  const startTimeInput = document.getElementById('activity-start-time');
  const endTimeInput = document.getElementById('activity-end-time');
  const durationInput = document.getElementById('activity-duration');
  
  startTimeInput.addEventListener('change', calculateDuration);
  endTimeInput.addEventListener('change', calculateDuration);
  
  function calculateDuration() {
    if (startTimeInput.value && endTimeInput.value) {
      const startTime = new Date(`1970-01-01T${startTimeInput.value}`);
      const endTime = new Date(`1970-01-01T${endTimeInput.value}`);
      
      // Handle case where end time is on the next day
      let diff = endTime - startTime;
      if (diff < 0) {
        diff += 24 * 60 * 60 * 1000; // Add 24 hours
      }
      
      // Convert to minutes
      const durationMinutes = Math.round(diff / 60000);
      durationInput.value = durationMinutes;
    }
  }
}

/**
 * Set up custom event listeners
 */
function setupCustomEventListeners() {
  // Open add activity modal
  document.addEventListener('openAddActivityModal', function(e) {
    const { dayIndex } = e.detail;
    openAddActivityModal(dayIndex);
  });
  
  // Open edit activity modal
  document.addEventListener('openEditActivityModal', function(e) {
    const { dayIndex, activityIndex } = e.detail;
    openEditActivityModal(dayIndex, activityIndex);
  });
  
  // Delete activity
  document.addEventListener('deleteActivity', function(e) {
    const { dayIndex, activityIndex } = e.detail;
    deleteActivity(dayIndex, activityIndex);
  });
}

/**
 * Open the modal to add a new activity
 * @param {number} dayIndex - The index of the day to add the activity to
 */
function openAddActivityModal(dayIndex) {
  // Set current day index
  state.currentDayIndex = dayIndex;
  
  // Reset form
  const form = document.getElementById('activity-form');
  form.reset();
  
  // Set default values
  const day = state.itinerary.days[dayIndex];
  const date = new Date(day.date);
  
  // Set modal title
  document.getElementById('activity-modal-title').textContent = 'Add Activity';
  
  // Clear error message
  document.getElementById('activity-error').textContent = '';
  
  // Show modal
  document.getElementById('activity-modal').classList.add('active');
  document.body.classList.add('modal-open');
}

/**
 * Open the modal to edit an existing activity
 * @param {number} dayIndex - The index of the day containing the activity
 * @param {number} activityIndex - The index of the activity to edit
 */
function openEditActivityModal(dayIndex, activityIndex) {
  try {
    // Validate indices
    if (!state.itinerary || !state.itinerary.days || dayIndex < 0 || dayIndex >= state.itinerary.days.length) {
      showError('Invalid day index');
      return;
    }
    
    const day = state.itinerary.days[dayIndex];
    if (!day.activities || activityIndex < 0 || activityIndex >= day.activities.length) {
      showError('Invalid activity index');
      return;
    }
    
    // Set current day and activity indices
    state.currentDayIndex = dayIndex;
    state.currentActivityIndex = activityIndex;
    
    // Get activity
    const activity = day.activities[activityIndex];
    
    if (!activity) {
      showError('Activity not found');
      return;
    }
    
    // Set form values
    const form = document.getElementById('activity-form');
    if (!form) {
      showError('Activity form not found');
      return;
    }
    
    form.elements.title.value = activity.title || '';
    form.elements.description.value = activity.description || '';
    
    // Handle time fields - convert Date objects or ISO strings to time format
    let startTime = '';
    let endTime = '';
    
    if (activity.startTime) {
      if (activity.startTime instanceof Date) {
        startTime = activity.startTime.toTimeString().slice(0, 5); // HH:MM format
      } else if (typeof activity.startTime === 'string') {
        // Handle ISO string or HH:MM format
        if (activity.startTime.includes('T')) {
          const date = new Date(activity.startTime);
          startTime = date.toTimeString().slice(0, 5);
        } else if (activity.startTime.match(/^\d{2}:\d{2}$/)) {
          startTime = activity.startTime;
        }
      }
    }
    
    if (activity.endTime) {
      if (activity.endTime instanceof Date) {
        endTime = activity.endTime.toTimeString().slice(0, 5);
      } else if (typeof activity.endTime === 'string') {
        if (activity.endTime.includes('T')) {
          const date = new Date(activity.endTime);
          endTime = date.toTimeString().slice(0, 5);
        } else if (activity.endTime.match(/^\d{2}:\d{2}$/)) {
          endTime = activity.endTime;
        }
      }
    }
    
    form.elements.startTime.value = startTime;
    form.elements.endTime.value = endTime;
    form.elements.duration.value = activity.duration || '';
    
    // Handle location - can be string or object
    let locationValue = '';
    if (activity.location) {
      if (typeof activity.location === 'string') {
        locationValue = activity.location;
      } else if (activity.location.name) {
        locationValue = activity.location.name;
      }
    }
    form.elements.location.value = locationValue;
    
    form.elements.category.value = activity.category || 'sightseeing';
    form.elements.cost.value = activity.cost && activity.cost.amount ? activity.cost.amount : '';
    form.elements.weatherSensitive.checked = activity.weatherSensitive || false;
    form.elements.accessibility.checked = activity.accessibility ? 
      (activity.accessibility.wheelchairAccessible || activity.accessibility.hearingAccessible || activity.accessibility.visuallyAccessible) : 
      false;
    
    // Set modal title
    const modalTitle = document.getElementById('activity-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Activity';
    }
    
    // Clear error message
    const errorElement = document.getElementById('activity-error');
    if (errorElement) {
      errorElement.textContent = '';
    }
    
    // Show modal
    const modal = document.getElementById('activity-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  } catch (error) {
    console.error('Error opening edit activity modal:', error);
    showError(`Failed to open activity editor: ${error.message}`);
  }
}

/**
 * Close the activity modal
 */
function closeActivityModal() {
  document.getElementById('activity-modal').classList.remove('active');
  document.body.classList.remove('modal-open');
  
  // Reset current activity index
  state.currentActivityIndex = null;
}

/**
 * Handle activity form submission
 * @param {Event} event - Form submission event
 */
function handleActivityFormSubmit(event) {
  event.preventDefault();
  
  // Get form data
  const form = event.target;
  const formData = new FormData(form);
  
  // Validate form data
  const title = formData.get('title');
  if (!title) {
    document.getElementById('activity-error').textContent = 'Activity title is required';
    return;
  }
  
  // Create activity object
  const locationValue = formData.get('location');
  const location = locationValue ? { name: locationValue } : null;
  
  const activity = {
    title: formData.get('title'),
    description: formData.get('description'),
    startTime: formData.get('startTime') || null,
    endTime: formData.get('endTime') || null,
    duration: formData.get('duration') ? parseInt(formData.get('duration')) : null,
    location: location,
    category: formData.get('category') || 'sightseeing',
    cost: {
      amount: formData.get('cost') ? parseFloat(formData.get('cost')) : 0,
      currency: 'INR'
    },
    bookingStatus: 'not-booked',
    weatherSensitive: formData.get('weatherSensitive') === 'on',
    accessibility: {
      wheelchairAccessible: formData.get('accessibility') === 'on',
      hearingAccessible: formData.get('accessibility') === 'on',
      visuallyAccessible: formData.get('accessibility') === 'on'
    }
  };
  
  // If editing an existing activity
  if (state.currentActivityIndex !== null) {
    // Update activity
    state.itinerary.days[state.currentDayIndex].activities[state.currentActivityIndex] = {
      ...state.itinerary.days[state.currentDayIndex].activities[state.currentActivityIndex],
      ...activity
    };
  } else {
    // Add new activity
    if (!state.itinerary.days[state.currentDayIndex].activities) {
      state.itinerary.days[state.currentDayIndex].activities = [];
    }
    
    state.itinerary.days[state.currentDayIndex].activities.push(activity);
  }
  
  // Update day total cost
  updateDayTotalCost(state.currentDayIndex);
  
  // Mark as having unsaved changes
  setUnsavedChanges(true);
  
  // Close modal
  closeActivityModal();
  
  // Render day editor
  renderDayEditor(state.currentDayIndex);
}

/**
 * Delete an activity
 * @param {number} dayIndex - The index of the day containing the activity
 * @param {number} activityIndex - The index of the activity to delete
 */
function deleteActivity(dayIndex, activityIndex) {
  const activity = state.itinerary.days[dayIndex].activities[activityIndex];
  
  if (confirm(`Are you sure you want to delete "${activity.title}"? This action cannot be undone.`)) {
    // Remove activity
    state.itinerary.days[dayIndex].activities.splice(activityIndex, 1);
    
    // Update day total cost
    updateDayTotalCost(dayIndex);
    
    // Mark as having unsaved changes
    setUnsavedChanges(true);
    
    // Render day editor
    renderDayEditor(dayIndex);
  }
}

/**
 * Update the total cost for a day
 * @param {number} dayIndex - The index of the day to update
 */
function updateDayTotalCost(dayIndex) {
  const day = state.itinerary.days[dayIndex];
  let totalCost = 0;
  
  // Sum up all activity costs
  day.activities.forEach(activity => {
    if (activity.cost && activity.cost.amount) {
      totalCost += parseFloat(activity.cost.amount);
    }
  });
  
  // Update day total cost
  day.totalDayCost = totalCost;
}
