/**
 * Itinerary Day Manager Module
 * Handles day-related functionality for the itinerary builder
 */

import { ItineraryService } from '../services/api.js';
import { showLoading, hideLoading, showError } from './itinerary-ui.js';
import { getState, setUnsavedChanges } from './itinerary-core.js';

// Reference to the global state
let state;

/**
 * Initialize the day manager
 * @param {Object} globalState - The global state object
 */
export function initDayManager(globalState) {
  state = globalState;
  
  // Set up event listeners
  setupDayEventListeners();
}

/**
 * Set up event listeners for day-related actions
 */
function setupDayEventListeners() {
  // Add day button
  document.getElementById('add-day-btn').addEventListener('click', addDay);
  
  // Reorder days button
  document.getElementById('reorder-days-btn').addEventListener('click', openReorderDaysModal);
  
  // Save reorder button
  document.getElementById('save-reorder-btn').addEventListener('click', saveReorderedDays);
  
  // Cancel reorder button
  document.getElementById('cancel-reorder-btn').addEventListener('click', closeReorderDaysModal);
  
  // Close reorder modal when clicking outside
  document.getElementById('reorder-days-modal').addEventListener('click', function(event) {
    if (event.target === this) {
      closeReorderDaysModal();
    }
  });
  
  // Close reorder modal with X button
  document.querySelector('#reorder-days-modal .modal-close').addEventListener('click', closeReorderDaysModal);
}

/**
 * Render the day list in the sidebar
 */
export function renderDayList() {
  const dayList = document.getElementById('day-list');
  const itinerary = state.itinerary;
  
  // If no itinerary or no days, show empty state
  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    dayList.innerHTML = `
      <div class="empty-state">
        <p>No days in itinerary</p>
        <button class="btn btn-secondary btn-sm" id="add-first-day-btn">
          <i class="fas fa-plus"></i> Add First Day
        </button>
      </div>
    `;
    
    // Add event listener to add first day button
    document.getElementById('add-first-day-btn').addEventListener('click', addDay);
    return;
  }
  
  // Generate HTML for day list
  let dayListHTML = '';
  
  itinerary.days.forEach((day, index) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isActive = index === state.currentDayIndex ? 'active' : '';
    
    dayListHTML += `
      <div class="day-item ${isActive}" data-day-index="${index}">
        <div class="day-number">Day ${index + 1}</div>
        <div class="day-date">${dayName}, ${dayDate}</div>
        <div class="day-activities-count">${day.activities.length} activities</div>
        <div class="day-actions">
          <button class="btn-icon" data-action="edit-day" data-day-index="${index}" title="Edit Day">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" data-action="delete-day" data-day-index="${index}" title="Delete Day">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  dayList.innerHTML = dayListHTML;
  
  // Add event listeners to day items
  const dayItems = document.querySelectorAll('.day-item');
  dayItems.forEach(item => {
    // Click on day item to select it
    item.addEventListener('click', function(e) {
      // Ignore clicks on action buttons
      if (e.target.closest('.day-actions')) {
        return;
      }
      
      const dayIndex = parseInt(this.dataset.dayIndex);
      selectDay(dayIndex);
    });
  });
  
  // Add event listeners to day action buttons
  const editDayButtons = document.querySelectorAll('[data-action="edit-day"]');
  const deleteDayButtons = document.querySelectorAll('[data-action="delete-day"]');
  
  editDayButtons.forEach(button => {
    button.addEventListener('click', function() {
      const dayIndex = parseInt(this.dataset.dayIndex);
      editDay(dayIndex);
    });
  });
  
  deleteDayButtons.forEach(button => {
    button.addEventListener('click', function() {
      const dayIndex = parseInt(this.dataset.dayIndex);
      deleteDay(dayIndex);
    });
  });
  
  // Render the current day
  renderDayEditor(state.currentDayIndex);
}

/**
 * Render the day editor for a specific day
 * @param {number} dayIndex - The index of the day to render
 */
export function renderDayEditor(dayIndex) {
  const dayEditor = document.getElementById('day-editor');
  const day = state.itinerary.days[dayIndex];
  
  // Format date
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Generate HTML for activities
  let activitiesHTML = '';
  
  if (day.activities.length === 0) {
    activitiesHTML = `
      <div class="empty-state">
        <p>No activities planned for this day.</p>
        <button class="btn btn-primary" id="add-activity-btn" data-day-index="${dayIndex}">
          <i class="fas fa-plus"></i> Add Activity
        </button>
      </div>
    `;
  } else {
    // Sort activities by start time
    const sortedActivities = [...day.activities].sort((a, b) => {
      const timeA = a.startTime ? new Date(`1970-01-01T${a.startTime}`) : new Date(0);
      const timeB = b.startTime ? new Date(`1970-01-01T${b.startTime}`) : new Date(0);
      return timeA - timeB;
    });
    
    activitiesHTML = `
      <div class="activities-header">
        <h4>Activities</h4>
        <button class="btn btn-primary btn-sm" id="add-activity-btn" data-day-index="${dayIndex}">
          <i class="fas fa-plus"></i> Add Activity
        </button>
      </div>
      <div class="activities-list" id="activities-list">
    `;
    
    sortedActivities.forEach((activity, activityIndex) => {
      const startTime = activity.startTime ? formatTime(activity.startTime) : '';
      const endTime = activity.endTime ? formatTime(activity.endTime) : '';
      const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : 'Flexible';
      
      const categoryIcon = getCategoryIcon(activity.category);
      const categoryClass = activity.category ? activity.category.toLowerCase() : 'other';
      
      activitiesHTML += `
        <div class="activity-item ${categoryClass}" data-activity-index="${activityIndex}">
          <div class="activity-time">${timeRange}</div>
          <div class="activity-content">
            <div class="activity-header">
              <div class="activity-category">
                <i class="${categoryIcon}"></i> ${capitalizeFirstLetter(activity.category || 'Other')}
              </div>
              <div class="activity-actions">
                <button class="btn-icon" data-action="edit-activity" data-activity-index="${activityIndex}" title="Edit Activity">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" data-action="delete-activity" data-activity-index="${activityIndex}" title="Delete Activity">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
            <h4 class="activity-title">${activity.title}</h4>
            <div class="activity-description">${activity.description || ''}</div>
            ${activity.location ? `
              <div class="activity-location">
                <i class="fas fa-map-marker-alt"></i> ${activity.location}
              </div>
            ` : ''}
            <div class="activity-details">
              ${activity.cost && activity.cost.amount ? `
                <div class="activity-cost">
                  <i class="fas fa-dollar-sign"></i> $${activity.cost.amount}
                </div>
              ` : ''}
              ${activity.duration ? `
                <div class="activity-duration">
                  <i class="fas fa-clock"></i> ${formatDuration(activity.duration)}
                </div>
              ` : ''}
              ${activity.weatherSensitive ? `
                <div class="activity-weather-sensitive">
                  <i class="fas fa-cloud-sun"></i> Weather sensitive
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    activitiesHTML += `
      </div>
    `;
  }
  
  // Render day editor
  dayEditor.innerHTML = `
    <div class="day-editor-header">
      <h3>${dayName}, ${dayDate}</h3>
      <div class="day-editor-actions">
        <button class="btn btn-secondary btn-sm" id="edit-day-date-btn" data-day-index="${dayIndex}">
          <i class="fas fa-calendar-alt"></i> Change Date
        </button>
      </div>
    </div>
    <div class="day-activities">
      ${activitiesHTML}
    </div>
  `;
  
  // Add event listeners
  const addActivityBtn = document.getElementById('add-activity-btn');
  if (addActivityBtn) {
    addActivityBtn.addEventListener('click', function() {
      const dayIndex = parseInt(this.dataset.dayIndex);
      document.dispatchEvent(new CustomEvent('openAddActivityModal', { 
        detail: { dayIndex }
      }));
    });
  }
  
  const editDayDateBtn = document.getElementById('edit-day-date-btn');
  if (editDayDateBtn) {
    editDayDateBtn.addEventListener('click', function() {
      const dayIndex = parseInt(this.dataset.dayIndex);
      editDay(dayIndex);
    });
  }
  
  // Add event listeners to activity action buttons
  const editActivityButtons = document.querySelectorAll('[data-action="edit-activity"]');
  const deleteActivityButtons = document.querySelectorAll('[data-action="delete-activity"]');
  
  editActivityButtons.forEach(button => {
    button.addEventListener('click', function() {
      const activityIndex = parseInt(this.dataset.activityIndex);
      document.dispatchEvent(new CustomEvent('openEditActivityModal', { 
        detail: { 
          dayIndex: state.currentDayIndex,
          activityIndex
        }
      }));
    });
  });
  
  deleteActivityButtons.forEach(button => {
    button.addEventListener('click', function() {
      const activityIndex = parseInt(this.dataset.activityIndex);
      document.dispatchEvent(new CustomEvent('deleteActivity', { 
        detail: { 
          dayIndex: state.currentDayIndex,
          activityIndex
        }
      }));
    });
  });
}

/**
 * Select a day to display in the editor
 * @param {number} dayIndex - The index of the day to select
 */
export function selectDay(dayIndex) {
  // Update current day index
  state.currentDayIndex = dayIndex;
  
  // Update active day in list
  const dayItems = document.querySelectorAll('.day-item');
  dayItems.forEach((item, index) => {
    if (index === dayIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Render day editor
  renderDayEditor(dayIndex);
}

/**
 * Add a new day to the itinerary
 */
export async function addDay() {
  try {
    // Get trip start and end dates
    const startDate = new Date(state.trip.startDate);
    const endDate = new Date(state.trip.endDate);
    
    // Calculate the date for the new day
    let newDayDate;
    
    if (!state.itinerary.days || state.itinerary.days.length === 0) {
      // If no days exist, use the trip start date
      newDayDate = new Date(startDate);
    } else {
      // Otherwise, use the day after the last day
      const lastDay = state.itinerary.days[state.itinerary.days.length - 1];
      const lastDayDate = new Date(lastDay.date);
      newDayDate = new Date(lastDayDate);
      newDayDate.setDate(newDayDate.getDate() + 1);
      
      // Check if the new day is after the trip end date
      if (newDayDate > endDate) {
        if (!confirm('This day will be after your trip end date. Do you want to add it anyway?')) {
          return;
        }
      }
    }
    
    // Create new day object
    const newDay = {
      date: newDayDate.toISOString(),
      activities: [],
      notes: '',
      totalDayCost: 0
    };
    
    // Add day to itinerary
    if (!state.itinerary.days) {
      state.itinerary.days = [];
    }
    
    state.itinerary.days.push(newDay);
    
    // Mark as having unsaved changes
    setUnsavedChanges(true);
    
    // Render day list
    renderDayList();
    
    // Select the new day
    selectDay(state.itinerary.days.length - 1);
  } catch (error) {
    console.error('Error adding day:', error);
    showError('Failed to add day. Please try again.');
  }
}

/**
 * Edit a day's date
 * @param {number} dayIndex - The index of the day to edit
 */
function editDay(dayIndex) {
  const day = state.itinerary.days[dayIndex];
  const currentDate = new Date(day.date);
  
  // Prompt for new date
  const newDateStr = prompt('Enter new date (YYYY-MM-DD):', currentDate.toISOString().split('T')[0]);
  
  if (newDateStr) {
    try {
      // Parse new date
      const newDate = new Date(newDateStr);
      
      // Validate date
      if (isNaN(newDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Update day date
      day.date = newDate.toISOString();
      
      // Mark as having unsaved changes
      setUnsavedChanges(true);
      
      // Render day list
      renderDayList();
    } catch (error) {
      console.error('Error updating day date:', error);
      showError('Invalid date format. Please use YYYY-MM-DD.');
    }
  }
}

/**
 * Delete a day from the itinerary
 * @param {number} dayIndex - The index of the day to delete
 */
function deleteDay(dayIndex) {
  const day = state.itinerary.days[dayIndex];
  const date = new Date(day.date);
  const dateStr = date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
  
  if (confirm(`Are you sure you want to delete ${dateStr}? This will delete all activities for this day.`)) {
    // Remove day from itinerary
    state.itinerary.days.splice(dayIndex, 1);
    
    // Mark as having unsaved changes
    setUnsavedChanges(true);
    
    // Update current day index if needed
    if (state.currentDayIndex >= state.itinerary.days.length) {
      state.currentDayIndex = Math.max(0, state.itinerary.days.length - 1);
    }
    
    // Render day list
    renderDayList();
  }
}

/**
 * Open the reorder days modal
 */
function openReorderDaysModal() {
  const reorderDaysList = document.getElementById('reorder-days-list');
  
  // Generate HTML for reorder list
  let reorderHTML = '';
  
  state.itinerary.days.forEach((day, index) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    reorderHTML += `
      <div class="reorder-item" data-day-index="${index}">
        <div class="reorder-handle">
          <i class="fas fa-grip-lines"></i>
        </div>
        <div class="reorder-content">
          <div class="day-number">Day ${index + 1}</div>
          <div class="day-date">${dayName}, ${dayDate}</div>
        </div>
      </div>
    `;
  });
  
  reorderDaysList.innerHTML = reorderHTML;
  
  // Initialize Sortable.js
  new Sortable(reorderDaysList, {
    animation: 150,
    handle: '.reorder-handle',
    ghostClass: 'reorder-ghost'
  });
  
  // Show modal
  document.getElementById('reorder-days-modal').classList.add('active');
  document.body.classList.add('modal-open');
}

/**
 * Close the reorder days modal
 */
function closeReorderDaysModal() {
  document.getElementById('reorder-days-modal').classList.remove('active');
  document.body.classList.remove('modal-open');
}

/**
 * Save the reordered days
 */
function saveReorderedDays() {
  // Get the new order of days
  const reorderItems = document.querySelectorAll('#reorder-days-list .reorder-item');
  const newOrder = Array.from(reorderItems).map(item => parseInt(item.dataset.dayIndex));
  
  // Reorder days
  const reorderedDays = newOrder.map(index => state.itinerary.days[index]);
  state.itinerary.days = reorderedDays;
  
  // Mark as having unsaved changes
  setUnsavedChanges(true);
  
  // Close modal
  closeReorderDaysModal();
  
  // Render day list
  renderDayList();
}

/**
 * Format time (convert 24h to 12h)
 * @param {string} time - Time string in 24-hour format (HH:MM)
 * @returns {string} Time string in 12-hour format with AM/PM
 */
function formatTime(time) {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format duration (minutes to hours and minutes)
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
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

/**
 * Get category icon class
 * @param {string} category - Activity category
 * @returns {string} Font Awesome icon class
 */
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

/**
 * Capitalize first letter of a string
 * @param {string} string - Input string
 * @returns {string} String with first letter capitalized
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
