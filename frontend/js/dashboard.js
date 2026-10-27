/**
 * Dashboard JavaScript for the Travel Planner application
 * Handles fetching trips, user interactions, and dashboard functionality
 */

import { TripService, ItineraryService } from '../services/api.js';
import { getDefaultBreakdown, percentagesToAmounts } from './budget-utils.js';
import { getToken, getUser, logout } from '../services/auth.js';

// Safe string capitalization helper used in validation messages
function capitalizeFirstLetter(value) {
  if (typeof value !== 'string') return '';
  if (value.length === 0) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Check if user is authenticated, redirect to login if not
const token = getToken();
if (!token) {
  window.location.href = 'login.html';
}

// Get user data
const user = getUser();

// Default trip images using placeholder images from public services
const defaultTripImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',  // Beach
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=60',  // Mountains
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&auto=format&fit=crop&q=60',   // City
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60'   // Countryside
];

// DOM elements
const tripsContainer = document.getElementById('trips-container');
const emptyTrips = document.getElementById('empty-trips');
const createTripBtn = document.getElementById('create-trip-btn');
const emptyCreateTripBtn = document.getElementById('empty-create-trip-btn');
const createTripModal = document.getElementById('create-trip-modal');
const createTripForm = document.getElementById('create-trip-form');
const cancelTripBtn = document.getElementById('cancel-trip-btn');
const modalClose = document.querySelector('.modal-close');
const logoutBtn = document.getElementById('logout-btn');
const userNameElement = document.querySelector('.user-name');
const userAvatarElement = document.querySelector('.user-avatar');
const tripSearch = document.getElementById('trip-search');
const tripStatusFilter = document.getElementById('trip-status-filter');
const tripSort = document.getElementById('trip-sort');

// Stats elements
const tripsCountElement = document.getElementById('trips-count');
const destinationsCountElement = document.getElementById('destinations-count');
const upcomingCountElement = document.getElementById('upcoming-count');

// Modal functions - removed duplicate declarations

// Set user name and avatar
if (user) {
  if (userNameElement) {
    userNameElement.textContent = user.username || 'User';
  }
  if (userAvatarElement) {
    userAvatarElement.src = `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=4CAFAB&color=fff`;
  }
}

// Fetch and display trips
async function fetchTrips() {
  try {
    const trips = await TripService.getAllTrips(token);
    
    // Update stats
    updateDashboardStats(trips);
    
    // Display trips or empty state
    if (trips.length === 0) {
      tripsContainer.classList.add('empty');
      emptyTrips.style.display = 'flex';
    } else {
      tripsContainer.classList.remove('empty');
      emptyTrips.style.display = 'none';
      
      // Clear existing trips
      const existingTripCards = tripsContainer.querySelectorAll('.trip-card');
      existingTripCards.forEach(card => card.remove());
      
      // Apply filters and sorting
      const filteredTrips = filterTrips(trips);
      const sortedTrips = sortTrips(filteredTrips);
      
      // Render trips
      sortedTrips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripsContainer.appendChild(tripCard);
      });
    }
  } catch (error) {
    console.error('Error fetching trips:', error);
    // Show error message
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message', 'centered');
    errorMessage.textContent = 'Failed to load trips. Please try again later.';
    tripsContainer.appendChild(errorMessage);
  }
}

// Filter trips based on search and status filter
function filterTrips(trips) {
  const searchTerm = tripSearch.value.toLowerCase();
  const statusFilter = tripStatusFilter.value;
  
  return trips.filter(trip => {
    // Search filter
    const matchesSearch = 
      trip.title.toLowerCase().includes(searchTerm) ||
      trip.destination.toLowerCase().includes(searchTerm);
    
    // Status filter
    let matchesStatus = true;
    const today = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    
    if (statusFilter === 'upcoming') {
      matchesStatus = startDate > today;
    } else if (statusFilter === 'past') {
      matchesStatus = endDate < today;
    } else if (statusFilter === 'planning') {
      matchesStatus = trip.status === 'planning';
    }
    
    return matchesSearch && matchesStatus;
  });
}

// Sort trips based on selected sort option
function sortTrips(trips) {
  const sortOption = tripSort.value;
  
  return [...trips].sort((a, b) => {
    if (sortOption === 'date-desc') {
      return new Date(b.startDate) - new Date(a.startDate);
    } else if (sortOption === 'date-asc') {
      return new Date(a.startDate) - new Date(b.startDate);
    } else if (sortOption === 'duration') {
      const aDuration = new Date(a.endDate) - new Date(a.startDate);
      const bDuration = new Date(b.endDate) - new Date(b.startDate);
      return bDuration - aDuration;
    } else if (sortOption === 'budget') {
      return b.budget.total - a.budget.total;
    }
    return 0;
  });
}

// Create trip card element
function createTripCard(trip) {
  const tripCard = document.createElement('div');
  tripCard.classList.add('trip-card');
  
  // Calculate trip status
  const today = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  let status = 'planning';
  
  if (startDate <= today && endDate >= today) {
    status = 'active';
  } else if (startDate > today) {
    status = 'upcoming';
  } else if (endDate < today) {
    status = 'completed';
  }
  
  // Format dates
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
  
  // Calculate days until trip
  const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
  let daysUntilText = '';
  
  if (status === 'upcoming') {
    daysUntilText = `<div class="trip-countdown">${daysUntil} days until trip</div>`;
  } else if (status === 'active') {
    daysUntilText = `<div class="trip-countdown active">Trip in progress</div>`;
  }
  
  // Calculate trip duration
  const tripDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Sustainability removed
  
  // Get number of travelers (handle object case)  
  let travelersCount = 1; // Default to 1
  if (typeof trip.travelers === 'object') {
    if (trip.travelers.adults !== undefined || trip.travelers.children !== undefined) {
      // If it's the expected object structure with adults and children properties
      travelersCount = (trip.travelers.adults || 0) + (trip.travelers.children || 0);
    } else if (Array.isArray(trip.travelers)) {
      // If it's an array for some reason
      travelersCount = trip.travelers.length;
    }
  } else if (typeof trip.travelers === 'number') {
    // If it's a direct number
    travelersCount = trip.travelers;
  }
    
  tripCard.innerHTML = `
    <div class="trip-header">
      <div class="trip-status ${status}">${status}</div>
      <div class="trip-actions">
        <button class="btn-icon" data-action="edit" data-trip-id="${trip._id}" title="Edit Trip">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon" data-action="delete" data-trip-id="${trip._id}" title="Delete Trip">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
    <div class="trip-image" style="background-image: url('${getRandomTripImage(trip.destination, trip.image)}')"></div>
    <div class="trip-content">
      <h3 class="trip-title">${trip.title}</h3>
      <div class="trip-destination">
        <i class="fas fa-map-marker-alt"></i> ${trip.destination}
      </div>
      <div class="trip-dates">
        <i class="fas fa-calendar-alt"></i> ${startDateFormatted} - ${endDateFormatted}
      </div>
      <div class="trip-details">
        <div class="trip-detail">
          <i class="fas fa-clock"></i> ${tripDuration} days
        </div>
        <div class="trip-detail">
          <i class="fas fa-user-friends"></i> ${travelersCount} travelers
        </div>
        <div class="trip-detail">
          <i class="fas fa-rupee-sign"></i> ₹${trip.budget?.total || 0}
        </div>
      </div>
      ${daysUntilText}
    </div>
    <div class="trip-footer">
      <a href="trip-details.html?id=${trip._id}" class="btn btn-primary btn-sm">View Details</a>
      <a href="itinerary.html?id=${trip._id}" class="btn btn-secondary btn-sm">View Itinerary</a>
    </div>
  `;
  
  // Add event listeners for edit and delete buttons
  const editButton = tripCard.querySelector('[data-action="edit"]');
  const deleteButton = tripCard.querySelector('[data-action="delete"]');
  
  editButton.addEventListener('click', () => editTrip(trip._id));
  deleteButton.addEventListener('click', () => deleteTrip(trip._id, trip.title));
  
  return tripCard;
}

// Get a random trip image or use the trip's image if it exists
function getRandomTripImage(destination, tripImage) {
  // If the trip already has an image property, use it
  if (tripImage) {
    return tripImage;
  }
  
  // Otherwise, get a random index from the defaultTripImages array
  const randomIndex = Math.floor(Math.random() * defaultTripImages.length);
  return defaultTripImages[randomIndex];
}

// Sustainability helpers removed

// Update dashboard stats
function updateDashboardStats(trips) {
  // Total trips
  tripsCountElement.textContent = trips.length;
  
  // Unique destinations
  const destinations = new Set(trips.map(trip => trip.destination));
  destinationsCountElement.textContent = destinations.size;
  
  // Upcoming trips
  const today = new Date();
  const upcomingTrips = trips.filter(trip => new Date(trip.startDate) > today);
  upcomingCountElement.textContent = upcomingTrips.length;
  
  // Sustainability stats removed
}

// Edit trip function
function editTrip(tripId) {
  window.location.href = `edit-trip.html?id=${tripId}`;
}

// Delete trip function
async function deleteTrip(tripId, tripTitle) {
  if (confirm(`Are you sure you want to delete "${tripTitle}"? This action cannot be undone.`)) {
    try {
      await TripService.deleteTrip(tripId, token);
      fetchTrips(); // Refresh trips list
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  }
}

// Create new trip
async function createTrip(event) {
  event.preventDefault();
  
  const errorElement = document.getElementById('create-trip-error');
  errorElement.textContent = '';
  
  // Get form data
  const formData = new FormData(createTripForm);
  const title = formData.get('title');
  const start = formData.get('start');
  const destination = formData.get('destination');
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');
  const budget = formData.get('budget');
  const travelers = formData.get('travelers');
  const travelStyles = formData.getAll('travelStyle');
  
  // Validate dates
  if (new Date(startDate) > new Date(endDate)) {
    errorElement.textContent = 'End date must be after start date';
    return;
  }

  // Budget validation per travel style (minimums in INR)
  const minBudget = {
    adventure: 8000,
    luxury: 20000,
    cultural: 5000,
    relaxation: 7000,
    budget: 2000
  };
  const numericBudget = parseInt(budget, 10) || 0;
  for (const style of travelStyles) {
    const key = String(style).toLowerCase();
    const min = minBudget[key];
    if (typeof min === 'number' && numericBudget < min) {
      alert(`This budget is too low for ${capitalizeFirstLetter(key)}. Minimum required: ₹${min}`);
      return;
    }
  }
  
  // Get a random image for the trip
  const randomIndex = Math.floor(Math.random() * defaultTripImages.length);
  const tripImage = defaultTripImages[randomIndex];
  
  // Derive smarter initial budget breakdown based on styles/destination/duration/travelers
  const durationDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
  const breakdownPerc = getDefaultBreakdown({
    travelStyles,
    destination,
    days: durationDays,
    travelers: parseInt(travelers)
  });
  const breakdownAmounts = percentagesToAmounts(breakdownPerc, parseInt(budget));

  // Create trip object
  const tripData = {
    title,
    startLocation: start,
    destination,
    startDate,
    endDate,
    travelers: parseInt(travelers),
    image: tripImage, // Add the image to the trip data
    budget: {
      total: parseInt(budget),
      currency: 'INR',
      breakdown: breakdownAmounts
    },
    preferences: {
      travelStyle: travelStyles
    }
  };
  
  try {
    // Create the trip
    const newTrip = await TripService.createTrip(tripData, token);
    
    // Show a loading message
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-overlay';
    loadingElement.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Creating your trip and generating itinerary...</p>
      </div>
    `;
    document.body.appendChild(loadingElement);
    
    // Automatically generate an itinerary for the new trip
    try {
      // Default preferences for automatic itinerary generation
      const defaultPreferences = {
        activityLevel: 'moderate',
        focusAreas: travelStyles.length > 0 ? travelStyles : ['sightseeing', 'food', 'culture'],
        specialInstructions: 'Create a balanced itinerary with popular attractions and local experiences.'
      };
      
      console.log('Automatically generating itinerary for new trip:', newTrip._id);
      
      // Generate the itinerary
      await ItineraryService.generateItinerary(newTrip._id, defaultPreferences, token);
      console.log('Itinerary generated successfully');
    } catch (itineraryError) {
      // If itinerary generation fails, log the error but don't block trip creation
      console.error('Error generating itinerary:', itineraryError);
    } finally {
      // Remove the loading overlay
      document.body.removeChild(loadingElement);
      
      // Close the modal and refresh trips list
      closeModal();
      fetchTrips();
    }
  } catch (error) {
    console.error('Error creating trip:', error);
    errorElement.textContent = error.message || 'Failed to create trip. Please try again.';
  }
}

// Open create trip modal
function openModal() {
  const modal = document.getElementById('create-trip-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    
    // Set default dates
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    
    const startDateInput = document.getElementById('trip-start-date');
    const endDateInput = document.getElementById('trip-end-date');
    
    if (startDateInput) startDateInput.valueAsDate = nextWeek;
    if (endDateInput) endDateInput.valueAsDate = twoWeeks;
  }
}

// Close create trip modal
function closeModal() {
  if (createTripModal) {
    createTripModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    if (createTripForm) {
      createTripForm.reset();
    }
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Fetch trips on page load
  fetchTrips();
  
  // Welcome banner Create New Trip button
  const createNewTripBtn = document.getElementById('create-new-trip-btn');
  if (createNewTripBtn) {
    createNewTripBtn.addEventListener('click', openModal);
  }
  
  // Theme toggle functionality
  const themeSwitch = document.getElementById('theme-switch');
  const body = document.body;
  
  if (themeSwitch) {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      body.setAttribute('data-theme', savedTheme);
      themeSwitch.checked = savedTheme === 'dark';
    }
    
    // Theme switch event listener
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
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }
  
  // User menu toggle
  const userMenuBtn = document.querySelector('.user-menu-btn');
  const userDropdown = document.querySelector('.user-dropdown');
  
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', function() {
      userDropdown.classList.toggle('active');
    });
  }
  
  // Close user dropdown when clicking outside
  if (userDropdown) {
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.user-menu') && userDropdown) {
        userDropdown.classList.remove('active');
      }
    });
  }
  
  // Create trip button
  if (createTripBtn) {
    createTripBtn.addEventListener('click', openModal);
  }
  if (emptyCreateTripBtn) {
    emptyCreateTripBtn.addEventListener('click', openModal);
  }
  
  // Cancel and close buttons
  if (cancelTripBtn) {
    cancelTripBtn.addEventListener('click', closeModal);
  }
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  // Close modal when clicking outside
  if (createTripModal) {
    createTripModal.addEventListener('click', function(event) {
      if (event.target === createTripModal) {
        closeModal();
      }
    });
  }
  
  // Create trip form submission
  if (createTripForm) {
    createTripForm.addEventListener('submit', createTrip);
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(event) {
      event.preventDefault();
      logout();
    });
  }
  
  // Search and filter events
  if (tripSearch) {
    tripSearch.addEventListener('input', function() {
      fetchTrips();
    });
  }
  
  if (tripStatusFilter) {
    tripStatusFilter.addEventListener('change', function() {
      fetchTrips();
    });
  }
  
  if (tripSort) {
    tripSort.addEventListener('change', function() {
      fetchTrips();
    });
  }
});
