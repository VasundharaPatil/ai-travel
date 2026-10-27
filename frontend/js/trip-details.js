/**
 * Trip Details JavaScript for the Travel Planner application
 * Handles fetching trip data, user interactions, and trip functionality
 */

import { TripService, WeatherService, RecommendationService } from '../services/api.js';
import { getDefaultBreakdown, percentagesToAmounts } from './budget-utils.js';
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

// DOM elements - declare but don't initialize yet to allow for deferred loading
let tripDetailsContent;
let tripDuration;
let tripTravelers;
let tripBudget;
let tripSustainability;
let tripPreferences;
let tripRecommendations;
let editTripBtn;
let viewItineraryBtn;
let logoutBtn;
let userNameElement;
let userAvatarElement;

// Function to initialize DOM elements after the page has fully loaded
function initializeDOMElements() {
  console.log('Initializing DOM elements');
  tripDetailsContent = document.getElementById('trip-details-content');
  // Trip overview cards have been removed, so we don't need to initialize these elements
  // tripDuration = document.getElementById('trip-duration');
  // tripTravelers = document.getElementById('trip-travelers');
  // tripBudget = document.getElementById('trip-budget');
  // tripSustainability = document.getElementById('trip-sustainability');
  tripPreferences = document.getElementById('trip-preferences');
  tripRecommendations = document.getElementById('trip-recommendations');
  editTripBtn = document.getElementById('edit-trip-btn');
  viewItineraryBtn = document.getElementById('view-itinerary-btn');
  logoutBtn = document.getElementById('logout-btn');
  userNameElement = document.querySelector('.user-name');
  userAvatarElement = document.querySelector('.user-avatar');
  
  // Add event listener for View Itinerary button
  if (viewItineraryBtn) {
    viewItineraryBtn.addEventListener('click', function() {
      window.location.href = `itinerary.html?id=${tripId}`;
    });
    console.log('Added event listener for View Itinerary button');
  }
  
  console.log('DOM Elements initialized successfully');
}

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Budget elements
const budgetTotal = document.getElementById('budget-total');
const budgetPerPerson = document.getElementById('budget-per-person');
const budgetCategories = document.getElementById('budget-categories');
const budgetTipsList = document.getElementById('budget-tips-list');
const editBudgetBtn = document.getElementById('edit-budget-btn');
const editBudgetModal = document.getElementById('edit-budget-modal');
const editBudgetForm = document.getElementById('edit-budget-form');
const cancelBudgetBtn = document.getElementById('cancel-budget-btn');
const budgetTotalInput = document.getElementById('budget-total-input');

// Sustainability elements
const sustainabilityScoreValue = document.getElementById('sustainability-score-value');
const transportScore = document.getElementById('transport-score');
const transportScoreValue = document.getElementById('transport-score-value');
const accommodationScore = document.getElementById('accommodation-score');
const accommodationScoreValue = document.getElementById('accommodation-score-value');
const activitiesScore = document.getElementById('activities-score');
const activitiesScoreValue = document.getElementById('activities-score-value');
const foodScore = document.getElementById('food-score');
const foodScoreValue = document.getElementById('food-score-value');
const carbonValue = document.getElementById('carbon-value');
const carbonComparison = document.getElementById('carbon-comparison');
const sustainableAlternatives = document.getElementById('sustainable-alternatives');
const sustainabilityTipsList = document.getElementById('sustainability-tips-list');

// Weather elements
const weatherLocation = document.getElementById('weather-location');
const currentWeather = document.getElementById('current-weather');
const weatherForecast = document.getElementById('weather-forecast');
const weatherTipsList = document.getElementById('weather-tips-list');

// Notes elements
const notesContainer = document.getElementById('notes-container');
const emptyNotes = document.getElementById('empty-notes');
const addNoteBtn = document.getElementById('add-note-btn');
const addNoteModal = document.getElementById('add-note-modal');
const addNoteForm = document.getElementById('add-note-form');
const cancelNoteBtn = document.getElementById('cancel-note-btn');

// Set user name and avatar
if (user && userNameElement && userAvatarElement) {
  userNameElement.textContent = user.username || 'User';
  userAvatarElement.src = `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=4CAFAB&color=fff`;
}

// Initialize the page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded, initializing page...');
  
  // Initialize DOM elements
  initializeDOMElements();
  
  // Fetch trip data
  fetchTripData();
});

// Update overview tab elements only (top overview cards have been removed)
function updateOverviewCards() {
  console.log('Updating overview tab elements');
  
  // Get the detailed overview tab elements
  const durationDetailElement = document.getElementById('trip-duration-detail');
  const travelersDetailElement = document.getElementById('trip-travelers-detail');
  const budgetDetailElement = document.getElementById('trip-budget-detail');
  
  // Default values
  const defaultDuration = '7 days';
  const defaultTravelers = '2 travelers';
  const defaultBudget = '₹2000';
  
  // Update detailed overview tab elements
  if (durationDetailElement) durationDetailElement.textContent = defaultDuration;
  if (travelersDetailElement) travelersDetailElement.textContent = defaultTravelers;
  if (budgetDetailElement) budgetDetailElement.textContent = defaultBudget;
  
  console.log('Overview tab elements updated with default values');
}

// Fetch trip data
async function fetchTripData() {
  try {
    // Immediately update overview cards with default values
    updateOverviewCards();
    
    console.log('Fetching trip data for ID:', tripId);
    
    // For testing/development: Create mock trip data if API is not available
    let trip;
    
    try {
      trip = await TripService.getTripById(tripId, token);
      console.log('Trip data received from API:', trip);
    } catch (apiError) {
      console.warn('API error, using mock data:', apiError);
      
      // Mock trip data for testing - ensure structure matches what displayTripDetails expects
      trip = {
        _id: tripId || 'mock-trip-id',
        title: 'Goa Beach Vacation',
        destination: 'Goa, India',
        startDate: new Date(2025, 4, 22), // May 22, 2025
        endDate: new Date(2025, 4, 29),   // May 29, 2025
        travelers: {
          count: 2,
          adults: 2,
          children: 0
        },
        budget: {
          total: 2000,
          currency: 'INR',
          breakdown: {
            transport: 600,
            accommodation: 600,
            food: 400,
            activities: 300,
            other: 100
          }
        },
        status: 'upcoming',
        preferences: {
          travelStyle: ['beach', 'relaxation', 'culture'],
          accommodation: 'hotel',
          activities: ['sightseeing', 'swimming', 'local cuisine']
        },
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60'
      };
    }
    
    console.log('Displaying trip details');
    displayTripDetails(trip);
    updateBudgetTab(trip);
    fetchWeatherData(trip.destination);
    fetchTripNotes(trip);
    
    // Make sure to update trip preferences which will trigger AI recommendations
    console.log('Updating trip preferences and generating AI recommendations');
    updateTripPreferences(trip);
  } catch (error) {
    console.error('Error in fetchTripData:', error);
    const tripDetailsContent = document.getElementById('trip-details-content');
    if (tripDetailsContent) {
      tripDetailsContent.innerHTML = `
        <div class="error-message centered">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to load trip details. Please try again later.</p>
          <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
        </div>
      `;
    } else {
      console.error('trip-details-content element not found');
    }
  }
}

// Display trip details
function displayTripDetails(trip) {
  // Format dates
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const startDateFormatted = startDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const endDateFormatted = endDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Calculate trip duration
  const tripDurationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Calculate trip status
  const today = new Date();
  let status = 'planning';
  
  if (startDate <= today && endDate >= today) {
    status = 'active';
  } else if (startDate > today) {
    status = 'upcoming';
  } else if (endDate < today) {
    status = 'completed';
  }
  
  // Calculate days until trip
  const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
  
  // Set hero background image
  const tripHero = document.getElementById('trip-hero');
  const tripTitleEl = document.getElementById('trip-title');
  const tripDestinationEl = document.getElementById('trip-destination');
  const tripDatesEl = document.getElementById('trip-dates');
  const tripCountdownEl = document.getElementById('trip-countdown');
  const tripStatusEl = document.getElementById('trip-status');
  
  // Use trip image if available, otherwise select a destination-appropriate image
  let tripImage;
  
  // Select an appropriate image based on destination keywords
  const destination = trip.destination.toLowerCase();
  if (destination.includes('beach') || destination.includes('goa') || destination.includes('bali') || destination.includes('hawaii')) {
    tripImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80';
  } else if (destination.includes('mountain') || destination.includes('hill') || destination.includes('alps') || destination.includes('himalaya')) {
    tripImage = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80';
  } else if (destination.includes('city') || destination.includes('york') || destination.includes('tokyo') || destination.includes('paris')) {
    tripImage = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&auto=format&fit=crop&q=80';
  } else {
    // Default image if no specific destination type is detected
    tripImage = trip.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=80';
  }
  
  // Add null checks for all DOM elements
  if (tripHero) {
    // Preload the image to ensure it's fully loaded before displaying
    const img = new Image();
    img.onload = function() {
      tripHero.style.backgroundImage = `url('${tripImage}')`;
    };
    img.src = tripImage;
    
    // Set immediately as fallback
    tripHero.style.backgroundImage = `url('${tripImage}')`;
  }
  
  // Set trip details
  if (tripTitleEl) {
    tripTitleEl.textContent = trip.title;
  }
  
  if (tripDestinationEl) {
    tripDestinationEl.textContent = trip.destination;
  }
  
  if (tripDatesEl) {
    tripDatesEl.textContent = `${startDateFormatted} - ${endDateFormatted}`;
  }
  
  // Update status badge
  if (tripStatusEl) {
    tripStatusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    tripStatusEl.className = `trip-status-badge ${status}`;
  }
  
  // Update countdown
  if (tripCountdownEl) {
    if (status === 'upcoming') {
      tripCountdownEl.textContent = `${daysUntil} days until trip`;
      tripCountdownEl.style.display = 'block';
    } else if (status === 'active') {
      tripCountdownEl.textContent = 'Trip in progress';
      tripCountdownEl.style.display = 'block';
    } else {
      tripCountdownEl.style.display = 'none';
    }
  }
  
  // Update overview cards - directly update the elements by ID to ensure they're always found
  const tripDurationElement = document.getElementById('trip-duration');
  const tripTravelersElement = document.getElementById('trip-travelers');
  const tripBudgetElement = document.getElementById('trip-budget');
  
  console.log('Updating overview cards with trip data:', {
    duration: tripDurationDays,
    travelers: trip.travelers?.count || trip.travelers,
    budget: trip.budget?.total
  });
  
  // Update duration - always use getElementById to ensure we get the latest reference
  if (tripDurationElement) {
    tripDurationElement.textContent = `${tripDurationDays} days`;
    console.log('Updated duration element');
  }
  
  // Update travelers - handle both object format and direct number format
  let travelerCount = 2; // Default to 2
  if (typeof trip.travelers === 'object') {
    if (trip.travelers.adults !== undefined || trip.travelers.children !== undefined) {
      // If it's the expected object structure with adults and children properties
      travelerCount = (trip.travelers.adults || 0) + (trip.travelers.children || 0);
    } else if (trip.travelers.count !== undefined) {
      // If it has a count property
      travelerCount = trip.travelers.count;
    }
  } else if (typeof trip.travelers === 'number') {
    // If it's a direct number
    travelerCount = trip.travelers;
  }
  if (tripTravelersElement) {
    tripTravelersElement.textContent = `${travelerCount} ${travelerCount > 1 ? 'travelers' : 'traveler'}`;
    console.log('Updated travelers element');
  }
  
  // Update budget
  if (tripBudgetElement) {
    tripBudgetElement.textContent = `₹${trip.budget?.total || 2000}`;
    console.log('Updated budget element');
  }
  
  // Get the detailed overview tab elements
  const durationDetailElement = document.getElementById('trip-duration-detail');
  const travelersDetailElement = document.getElementById('trip-travelers-detail');
  const budgetDetailElement = document.getElementById('trip-budget-detail');
  
  // Update detailed overview elements
  if (durationDetailElement) {
    durationDetailElement.textContent = `${tripDurationDays} days`;
    console.log('Updated duration detail element');
  }
  
  if (travelersDetailElement) {
    travelersDetailElement.textContent = `${travelerCount} ${travelerCount > 1 ? 'travelers' : 'traveler'}`;
    console.log('Updated travelers detail element');
  }
  
  if (budgetDetailElement) {
    budgetDetailElement.textContent = `₹${trip.budget?.total || 2000}`;
    console.log('Updated budget detail element');
  }
  
  // Sustainability removed
  
  // Force refresh the DOM elements if they weren't found
  if (!tripDurationElement || !tripTravelersElement || !tripBudgetElement ||
      !durationDetailElement || !travelersDetailElement || !budgetDetailElement) {
    console.log('Some overview elements not found, forcing refresh');
    setTimeout(() => {
      // Refresh top overview elements
      const refreshedDuration = document.getElementById('trip-duration');
      const refreshedTravelers = document.getElementById('trip-travelers');
      const refreshedBudget = document.getElementById('trip-budget');
      
      // Refresh detailed overview elements
      const refreshedDurationDetail = document.getElementById('trip-duration-detail');
      const refreshedTravelersDetail = document.getElementById('trip-travelers-detail');
      const refreshedBudgetDetail = document.getElementById('trip-budget-detail');
      
      // Update top overview elements
      if (refreshedDuration) refreshedDuration.textContent = `${tripDurationDays} days`;
      if (refreshedTravelers) refreshedTravelers.textContent = `${travelerCount} ${travelerCount > 1 ? 'travelers' : 'traveler'}`;
      if (refreshedBudget) refreshedBudget.textContent = `₹${trip.budget?.total || 2000}`;
      
      // Update detailed overview elements
      if (refreshedDurationDetail) refreshedDurationDetail.textContent = `${tripDurationDays} days`;
      if (refreshedTravelersDetail) refreshedTravelersDetail.textContent = `${travelerCount} ${travelerCount > 1 ? 'travelers' : 'traveler'}`;
      if (refreshedBudgetDetail) refreshedBudgetDetail.textContent = `₹${trip.budget?.total || 2000}`;
    }, 100);
  }
  
  // Update page title
  document.title = `${trip.title} - TravelAI`;
  
  // Update trip preferences
  updateTripPreferences(trip);
  
  // Initialize map
  initializeMap(trip.destination);
  
  // Update view itinerary button link
  if (viewItineraryBtn) {
    viewItineraryBtn.addEventListener('click', () => {
      window.location.href = `itinerary.html?id=${trip._id}`;
    });
  }
  
  // Update edit trip button link
  if (editTripBtn) {
    editTripBtn.addEventListener('click', () => {
      window.location.href = `edit-trip.html?id=${trip._id}`;
    });
  }
}

// Update trip preferences section
function updateTripPreferences(trip) {
  const preferences = trip.preferences || {};
  const travelStyle = preferences.travelStyle || [];
  const foodPreferences = preferences.food || [];
  const accessibility = preferences.accessibility || {};
  
  let preferencesHTML = '';
  
  // Travel style preferences
  if (travelStyle.length > 0) {
    preferencesHTML += `
      <div class="preference-group">
        <h4>Travel Style</h4>
        <div class="preference-tags">
    `;
    
    travelStyle.forEach(style => {
      let icon = 'fas fa-suitcase';
      
      switch (style.toLowerCase()) {
        case 'adventure':
          icon = 'fas fa-hiking';
          break;
        case 'luxury':
          icon = 'fas fa-gem';
          break;
        case 'cultural':
          icon = 'fas fa-landmark';
          break;
        case 'relaxation':
          icon = 'fas fa-spa';
          break;
        case 'budget':
          icon = 'fas fa-piggy-bank';
          break;
      }
      
      preferencesHTML += `<span class="preference-tag"><i class="${icon}"></i> ${capitalizeFirstLetter(style)}</span>`;
    });
    
    preferencesHTML += `
        </div>
      </div>
    `;
  }
  
  // Food preferences
  if (foodPreferences.length > 0) {
    preferencesHTML += `
      <div class="preference-group">
        <h4>Food Preferences</h4>
        <div class="preference-tags">
    `;
    
    foodPreferences.forEach(pref => {
      let icon = 'fas fa-utensils';
      
      switch (pref.toLowerCase()) {
        case 'vegetarian':
          icon = 'fas fa-leaf';
          break;
        case 'vegan':
          icon = 'fas fa-seedling';
          break;
        case 'gluten-free':
          icon = 'fas fa-bread-slice';
          break;
        case 'halal':
        case 'kosher':
          icon = 'fas fa-check-circle';
          break;
      }
      
      preferencesHTML += `<span class="preference-tag"><i class="${icon}"></i> ${capitalizeFirstLetter(pref)}</span>`;
    });
    
    preferencesHTML += `
        </div>
      </div>
    `;
  }
  
  // Accessibility needs
  const accessibilityNeeds = [];
  if (accessibility.wheelchair) accessibilityNeeds.push('Wheelchair accessible');
  if (accessibility.hearing) accessibilityNeeds.push('Hearing accessible');
  if (accessibility.visual) accessibilityNeeds.push('Visual accessible');
  
  if (accessibilityNeeds.length > 0) {
    preferencesHTML += `
      <div class="preference-group">
        <h4>Accessibility Needs</h4>
        <div class="preference-tags">
    `;
    
    accessibilityNeeds.forEach(need => {
      let icon = 'fas fa-universal-access';
      
      if (need.includes('Wheelchair')) {
        icon = 'fas fa-wheelchair';
      } else if (need.includes('Hearing')) {
        icon = 'fas fa-deaf';
      } else if (need.includes('Visual')) {
        icon = 'fas fa-eye';
      }
      
      preferencesHTML += `<span class="preference-tag"><i class="${icon}"></i> ${need}</span>`;
    });
    
    preferencesHTML += `
        </div>
      </div>
    `;
  }
  
  // Safety priority
  if (preferences.safetyPriority) {
    preferencesHTML += `
      <div class="preference-group">
        <h4>Safety Priority</h4>
        <div class="safety-rating">
    `;
    
    for (let i = 1; i <= 5; i++) {
      const active = i <= preferences.safetyPriority ? 'active' : '';
      preferencesHTML += `<i class="fas fa-shield-alt ${active}"></i>`;
    }
    
    preferencesHTML += `
        </div>
      </div>
    `;
  }
  
  // If no preferences are set
  if (preferencesHTML === '') {
    preferencesHTML = `
      <div class="empty-preferences">
        <p>No preferences set. <a href="edit-trip.html?id=${trip._id}">Add preferences</a> to get better recommendations.</p>
      </div>
    `;
  }
  
  tripPreferences.innerHTML = preferencesHTML;
  
  // Generate and display AI recommendations based on trip preferences
  generateAIRecommendations(trip);
}

// Global variable to track map instance
let tripMap = null;

// Initialize map with destination
function initializeMap(destination) {
  const mapElement = document.getElementById('trip-map');
  
  if (!mapElement) {
    console.error('Map element not found');
    return;
  }
  
  // If map already exists, remove it first
  if (tripMap) {
    tripMap.remove();
    tripMap = null;
  }
  
  // Create a map centered on the destination
  tripMap = L.map(mapElement).setView([0, 0], 2);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(tripMap);
  
  // Geocode the destination and center the map
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        tripMap.setView([lat, lon], 10);
        
        // Add marker for destination
        L.marker([lat, lon])
          .addTo(tripMap)
          .bindPopup(`<b>${destination}</b>`)
          .openPopup();
      }
    })
    .catch(error => {
      console.error('Error geocoding destination:', error);
      mapElement.innerHTML = `<div class="map-error">Failed to load map for ${destination}</div>`;
    });
}

// Update budget tab
function updateBudgetTab(trip) {
  // Helpers
  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const getTripDurationDays = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    return days;
  };

  // View mode state (persist within page session)
  if (!window.__budgetViewMode) window.__budgetViewMode = 'total'; // 'total' | 'perDay'

  const budget = trip.budget || { total: 0, currency: 'INR', breakdown: {} };
  let breakdown = budget.breakdown || {};
  
  // Calculate total number of travelers
  let totalTravelers = 1; // Default to 1
  if (typeof trip.travelers === 'object') {
    if (trip.travelers.adults !== undefined || trip.travelers.children !== undefined) {
      // If it's the expected object structure with adults and children properties
      totalTravelers = (trip.travelers.adults || 0) + (trip.travelers.children || 0);
    } else if (trip.travelers.count !== undefined) {
      // If it has a count property
      totalTravelers = trip.travelers.count;
    }
  } else if (typeof trip.travelers === 'number') {
    // If it's a direct number
    totalTravelers = trip.travelers;
  }
  
  // Ensure we have at least 1 traveler to avoid division by zero
  totalTravelers = Math.max(1, totalTravelers);
  
  // If breakdown is missing, derive using presets (styles/destination/duration/travelers)
  const breakdownMissing = !breakdown || Object.keys(breakdown).length === 0;
  if (breakdownMissing) {
    const days = getTripDurationDays();
    const travelersSafe = (typeof trip.travelers === 'object')
      ? (trip.travelers.count ?? ((trip.travelers.adults || 0) + (trip.travelers.children || 0) || 1))
      : (Number(trip.travelers) || 1);
    const styles = trip.preferences?.travelStyle || [];
    const perc = getDefaultBreakdown({
      travelStyles: Array.isArray(styles) ? styles : [styles],
      destination: trip.destination,
      days,
      travelers: travelersSafe
    });
    breakdown = percentagesToAmounts(perc, budget.total);
    budget.breakdown = breakdown; // ensure downstream uses computed values
  }
  
  // Update budget total and per person
  budgetTotal.textContent = `₹${budget.total}`;
  budgetPerPerson.textContent = `₹${Math.round(budget.total / totalTravelers)} per person`;
  
  // Update budget categories
  budgetCategories.innerHTML = `
    <div class="budget-category">
      <div class="category-icon"><i class="fas fa-plane"></i></div>
      <div class="category-details">
        <div class="category-name">Transport</div>
        <div class="category-amount">₹${breakdown.transport}</div>
        <div class="category-percentage">${Math.round((breakdown.transport / budget.total) * 100)}%</div>
      </div>
    </div>
    
    <div class="budget-category">
      <div class="category-icon"><i class="fas fa-hotel"></i></div>
      <div class="category-details">
        <div class="category-name">Accommodation</div>
        <div class="category-amount">₹${breakdown.accommodation}</div>
        <div class="category-percentage">${Math.round((breakdown.accommodation / budget.total) * 100)}%</div>
      </div>
    </div>
    
    <div class="budget-category">
      <div class="category-icon"><i class="fas fa-utensils"></i></div>
      <div class="category-details">
        <div class="category-name">Food</div>
        <div class="category-amount">₹${breakdown.food}</div>
        <div class="category-percentage">${Math.round((breakdown.food / budget.total) * 100)}%</div>
      </div>
    </div>
    
    <div class="budget-category">
      <div class="category-icon"><i class="fas fa-ticket-alt"></i></div>
      <div class="category-details">
        <div class="category-name">Activities</div>
        <div class="category-amount">₹${breakdown.activities}</div>
        <div class="category-percentage">${Math.round((breakdown.activities / budget.total) * 100)}%</div>
      </div>
    </div>
    
    <div class="budget-category">
      <div class="category-icon"><i class="fas fa-shopping-bag"></i></div>
      <div class="category-details">
        <div class="category-name">Other</div>
        <div class="category-amount">₹${breakdown.other}</div>
        <div class="category-percentage">${Math.round((breakdown.other / budget.total) * 100)}%</div>
      </div>
    </div>
  `;
  
  // Create budget chart
  createBudgetChart(breakdown, budget.total);
  
  // Set up budget edit form
  budgetTotalInput.value = budget.total;
  
  document.getElementById('transport-slider').value = Math.round((breakdown.transport / budget.total) * 100);
  document.getElementById('accommodation-slider').value = Math.round((breakdown.accommodation / budget.total) * 100);
  document.getElementById('food-slider').value = Math.round((breakdown.food / budget.total) * 100);
  document.getElementById('activities-slider').value = Math.round((breakdown.activities / budget.total) * 100);
  document.getElementById('other-slider').value = Math.round((breakdown.other / budget.total) * 100);
  
  updateBudgetSliders();
}

// Create budget chart
function createBudgetChart(breakdown, total, opts = {}) {
  const ctx = document.getElementById('budget-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.budgetChart) {
    window.budgetChart.destroy();
  }
  
  // Create new chart
  window.budgetChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Transport', 'Accommodation', 'Food', 'Activities', 'Other'],
      datasets: [{
        data: [
          breakdown.transport,
          breakdown.accommodation,
          breakdown.food,
          breakdown.activities,
          breakdown.other
        ],
        backgroundColor: [
          '#4CAFAB',
          '#F9A826',
          '#6C63FF',
          '#FF6B6B',
          '#4D4D4D'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const percentage = Math.round((value / total) * 100);
              const format = (opts && opts.formatINR) ? opts.formatINR : (v => `₹${v}`);
              const suffix = (opts && opts.mode === 'perDay') ? ' per day' : '';
              return `${format(value)}${suffix} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Update budget sliders
function updateBudgetSliders() {
  const totalBudget = parseInt(budgetTotalInput.value) || 0;
  const transportSlider = document.getElementById('transport-slider');
  const accommodationSlider = document.getElementById('accommodation-slider');
  const foodSlider = document.getElementById('food-slider');
  const activitiesSlider = document.getElementById('activities-slider');
  const otherSlider = document.getElementById('other-slider');
  
  const transportPercentage = parseInt(transportSlider.value);
  const accommodationPercentage = parseInt(accommodationSlider.value);
  const foodPercentage = parseInt(foodSlider.value);
  const activitiesPercentage = parseInt(activitiesSlider.value);
  const otherPercentage = parseInt(otherSlider.value);
  
  // Update percentage displays
  document.getElementById('transport-percentage').textContent = `${transportPercentage}%`;
  document.getElementById('accommodation-percentage').textContent = `${accommodationPercentage}%`;
  document.getElementById('food-percentage').textContent = `${foodPercentage}%`;
  document.getElementById('activities-percentage').textContent = `${activitiesPercentage}%`;
  document.getElementById('other-percentage').textContent = `${otherPercentage}%`;
  
  // Update value displays
  document.getElementById('transport-value').textContent = `₹${Math.round(totalBudget * transportPercentage / 100)}`;
  document.getElementById('accommodation-value').textContent = `₹${Math.round(totalBudget * accommodationPercentage / 100)}`;
  document.getElementById('food-value').textContent = `₹${Math.round(totalBudget * foodPercentage / 100)}`;
  document.getElementById('activities-value').textContent = `₹${Math.round(totalBudget * activitiesPercentage / 100)}`;
  document.getElementById('other-value').textContent = `₹${Math.round(totalBudget * otherPercentage / 100)}`;
  
  // Calculate total percentage
  const totalPercentage = transportPercentage + accommodationPercentage + foodPercentage + activitiesPercentage + otherPercentage;
  document.getElementById('total-percentage').textContent = `${totalPercentage}%`;
  
  // Show warning if total is not 100%
  const percentageWarning = document.getElementById('percentage-warning');
  if (totalPercentage !== 100) {
    percentageWarning.style.display = 'block';
  } else {
    percentageWarning.style.display = 'none';
  }
}

// Update sustainability tab
function updateSustainabilityTab(trip) {
  // Sustainability feature removed
  return;
}

// Fetch sustainable alternatives
async function fetchSustainableAlternatives(trip) {
  // Sustainability feature removed
  return;
}

// Helper function to get transport icon class
function getTransportIcon(type) {
  switch (type.toLowerCase()) {
    case 'train':
      return 'fas fa-train';
    case 'bus':
      return 'fas fa-bus';
    case 'carpool':
    case 'car':
      return 'fas fa-car';
    case 'bike':
    case 'bicycle':
      return 'fas fa-bicycle';
    case 'walk':
    case 'walking':
      return 'fas fa-walking';
    case 'plane':
    case 'flight':
      return 'fas fa-plane';
    case 'boat':
    case 'ferry':
      return 'fas fa-ship';
    default:
      return 'fas fa-route';
  }
}

// Display sustainable alternatives
function displaySustainableAlternatives(transportAlternatives, ecoAccommodations, sustainabilityTips) {
  const sustainabilityContent = document.getElementById('sustainability-tab');
  if (!sustainabilityContent) return;
  
  try {
    // Since we've removed the sustainability score elements, we'll skip updating them
    console.log('Displaying sustainable alternatives');
    
    // We'll only work with the elements that still exist in the HTML
    
    // Transport alternatives container
    const sustainableAlternativesContainer = document.getElementById('sustainable-alternatives');
    
    // Clear existing content if we have data to display
    if (transportAlternatives && transportAlternatives.length > 0) {
      sustainableAlternativesContainer.innerHTML = '';
      
      // Add transport alternatives
      transportAlternatives.forEach(alt => {
        const alternativeElement = document.createElement('div');
        alternativeElement.className = 'transport-alternative';
        
        alternativeElement.innerHTML = `
          <div class="transport-icon">
            <i class="${getTransportIcon(alt.type)}"></i>
          </div>
          <div class="alternative-details">
            <div class="alternative-name">${alt.name}</div>
            <div class="alternative-rating"><i class="fas fa-leaf"></i> ${alt.sustainabilityScore || '4'}/10</div>
            <div class="alternative-price">$${alt.cost || 'undefined'}</div>
            <div class="alternative-description">${alt.description}</div>
          </div>
        `;
        
        sustainableAlternativesContainer.appendChild(alternativeElement);
      });
    }
  
    // Eco-friendly accommodations
    const ecoAccommodationsContainer = document.getElementById('eco-accommodations');
    
    if (ecoAccommodations && ecoAccommodations.length > 0) {
      ecoAccommodationsContainer.innerHTML = '';
      
      ecoAccommodations.forEach(acc => {
        const accommodationElement = document.createElement('div');
        accommodationElement.className = 'eco-accommodation';
        
        // Generate star rating HTML
        let ratingHTML = '';
        const rating = parseInt(acc.rating) || 4;
        for (let i = 1; i <= 5; i++) {
          if (i <= rating) {
            ratingHTML += '<i class="fas fa-star"></i>';
          } else {
            ratingHTML += '<i class="far fa-star"></i>';
          }
        }
        
        // Get appropriate icon based on accommodation type
        let iconClass = 'fas fa-hotel';
        if (acc.type) {
          if (acc.type.toLowerCase().includes('hostel')) {
            iconClass = 'fas fa-bed';
          } else if (acc.type.toLowerCase().includes('lodge') || acc.type.toLowerCase().includes('cabin')) {
            iconClass = 'fas fa-home';
          } else if (acc.type.toLowerCase().includes('camp')) {
            iconClass = 'fas fa-campground';
          }
        }
        
        accommodationElement.innerHTML = `
          <div class="accommodation-icon">
            <i class="${iconClass}"></i>
          </div>
          <div class="accommodation-details">
            <div class="accommodation-name">${acc.name}</div>
            <div class="accommodation-rating">
              ${ratingHTML}
            </div>
            <div class="accommodation-price">$${acc.price || 'undefined'}</div>
            <div class="accommodation-description">${acc.description}</div>
          </div>
        `;
        
        ecoAccommodationsContainer.appendChild(accommodationElement);
      });
    }
    
    // Sustainability tips section
    const sustainabilityTipsList = document.querySelector('.tip-container');
    
    if (sustainabilityTips && sustainabilityTips.length > 0) {
      sustainabilityTipsList.innerHTML = '';
      
      sustainabilityTips.forEach(tip => {
        const tipElement = document.createElement('div');
        tipElement.className = 'sustainability-tip';
        
        // Get appropriate icon based on tip category
        let iconClass = 'fas fa-leaf';
        if (tip.category) {
          if (tip.category.toLowerCase().includes('water')) {
            iconClass = 'fas fa-water';
          } else if (tip.category.toLowerCase().includes('food')) {
            iconClass = 'fas fa-utensils';
          } else if (tip.category.toLowerCase().includes('waste')) {
            iconClass = 'fas fa-trash-alt';
          } else if (tip.category.toLowerCase().includes('energy')) {
            iconClass = 'fas fa-bolt';
          } else if (tip.category.toLowerCase().includes('transport')) {
            iconClass = 'fas fa-bus';
          }
        }
        
        tipElement.innerHTML = `
          <div class="tip-icon">
            <i class="${iconClass}"></i>
          </div>
          <div class="tip-content">
            <div class="tip-title">${tip.title || 'Sustainability Tip'}</div>
            <div class="tip-description">${tip.description}</div>
          </div>
        `;
        
        sustainabilityTipsList.appendChild(tipElement);
      });
    }
  } catch (error) {
    console.error('Error displaying sustainability data:', error);
    
    // If there's an error, we'll keep the default content that's already in the HTML
  }
}

// Fetch weather data
async function fetchWeatherData(destination) {
  try {
    console.log('Fetching weather data for:', destination);
    
    let currentWeather, forecast;
    
    try {
      // Use the correct OpenWeatherMap API key from memory
      const weatherApiKey = 'a9d71411ba3618b9f218d5a68d367d64';
      
      // Create custom headers with API key
      const weatherHeaders = {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'x-api-key': weatherApiKey,
        'Authorization': `Bearer ${weatherApiKey}`
      };
      
      // Add query parameters for the weather API
      const weatherParams = {
        apiKey: weatherApiKey,
        units: 'metric',
        appid: weatherApiKey  // OpenWeatherMap uses 'appid' for API key
      };
      
      // Call the weather service APIs with the correct API key and parameters
      currentWeather = await WeatherService.getCurrentWeather(destination, token, weatherHeaders, weatherParams);
      forecast = await WeatherService.getForecast(destination, token, weatherHeaders, weatherParams);
    } catch (apiError) {
      console.warn('API error fetching weather, using fallback data:', apiError);
      
      // Fallback weather data if API calls fail
      // Create more detailed fallback data based on destination and current season
      const now = new Date();
      const month = now.getMonth(); // 0-11
      const isSummer = month >= 4 && month <= 9; // May to October
      
      // Base temperature for the location and season
      let baseTemp = 28;
      let baseCondition = 'Sunny';
      
      // Adjust based on destination
      if (destination.toLowerCase().includes('goa')) {
        baseTemp = isSummer ? 32 : 28;
        baseCondition = isSummer ? 'Sunny' : 'Partly Cloudy';
      } else if (destination.toLowerCase().includes('delhi')) {
        baseTemp = isSummer ? 38 : 22;
        baseCondition = isSummer ? 'Hot' : 'Hazy';
      } else if (destination.toLowerCase().includes('mumbai')) {
        baseTemp = isSummer ? 34 : 26;
        baseCondition = isSummer ? 'Humid' : 'Clear';
      }
      
      currentWeather = {
        location: destination,
        temperature: baseTemp,
        condition: baseCondition,
        humidity: isSummer ? 65 : 55,
        windSpeed: 10,
        icon: baseCondition.toLowerCase().includes('sun') ? 'sun' : 'cloud'
      };
      
      // Create a realistic 5-day forecast with some variation
      const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
      const forecastDays = [];
      
      // Generate 5 days of forecast data
      for (let i = 0; i < 5; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        
        // Add some randomness to temperatures
        const highVariation = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const lowVariation = Math.floor(Math.random() * 3) - 1; // -1 to +1
        
        // Pick a condition with bias toward the base condition
        let condition;
        if (Math.random() < 0.6) {
          condition = baseCondition;
        } else {
          const randomIndex = Math.floor(Math.random() * weatherConditions.length);
          condition = weatherConditions[randomIndex];
        }
        
        // Get appropriate icon
        let icon;
        if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
          icon = 'sun';
        } else if (condition.toLowerCase().includes('partly')) {
          icon = 'cloud-sun';
        } else if (condition.toLowerCase().includes('cloud')) {
          icon = 'cloud';
        } else if (condition.toLowerCase().includes('rain')) {
          icon = 'cloud-rain';
        } else {
          icon = 'cloud';
        }
        
        forecastDays.push({
          date: forecastDate,
          high: baseTemp + highVariation,
          low: baseTemp - 8 + lowVariation,
          condition: condition,
          icon: icon,
          precipitation: condition.toLowerCase().includes('rain') ? 30 : (condition.toLowerCase().includes('cloud') ? 10 : 0)
        });
      }
      
      forecast = {
        location: destination,
        days: forecastDays
      };
    }
    
    displayWeatherData(currentWeather, forecast, destination);
  } catch (error) {
    console.error('Error in fetchWeatherData:', error);
    const weatherTab = document.getElementById('weather-tab');
    if (weatherTab) {
      weatherTab.innerHTML = `
        <div class="error-message centered">
          <i class="fas fa-cloud-rain"></i>
          <p>Failed to load weather data. Using sample weather information instead.</p>
        </div>
      `;
    }
  }
}

// Display weather data
function displayWeatherData(currentWeather, forecast, location) {
  console.log('Displaying weather data for:', location);
  console.log('Current weather:', currentWeather);
  console.log('Forecast:', forecast);
  
  // Use the correct element IDs from the HTML
  const weatherTab = document.getElementById('weather-tab');
  const weatherLocation = document.getElementById('weather-location');
  const currentWeatherContainer = document.getElementById('current-weather');
  const weatherForecast = document.getElementById('weather-forecast');
  
  // Check if elements exist
  if (!weatherTab || !weatherLocation || !currentWeatherContainer || !weatherForecast) {
    console.error('Weather container elements not found');
    // Try to select the tab to make the weather tab visible
    const weatherTabButton = document.querySelector('button.tab-btn[data-tab="weather"]');
    if (weatherTabButton) {
      weatherTabButton.click();
    }
    return;
  }
  
  // Set location
  weatherLocation.textContent = location || 'Unknown Location';
  
  // Ensure currentWeather has all required properties
  if (!currentWeather || typeof currentWeather !== 'object') {
    console.error('Invalid currentWeather data:', currentWeather);
    currentWeather = {
      temperature: 28,
      condition: 'Sunny',
      humidity: 65,
      windSpeed: 10,
      icon: 'sun'
    };
  }
  
  // Safely access condition property
  const weatherIcon = getWeatherIcon(currentWeather.condition || 'sunny');
  
  // Display current weather
  currentWeatherContainer.innerHTML = `
    <div class="weather-card current">
      <div class="weather-icon">
        <i class="${weatherIcon}"></i>
      </div>
      <div class="weather-details">
        <div class="weather-temp">${currentWeather.temperature || 28}°C</div>
        <div class="weather-condition">${currentWeather.condition || 'Sunny'}</div>
        <div class="weather-info">
          <span><i class="fas fa-tint"></i> ${currentWeather.humidity || 65}%</span>
          <span><i class="fas fa-wind"></i> ${currentWeather.windSpeed || 10} km/h</span>
        </div>
      </div>
    </div>
  `;
  
  // Display forecast
  let forecastHTML = '';
  
  // Ensure forecast is valid and has days
  if (!forecast || typeof forecast !== 'object') {
    console.error('Invalid forecast data:', forecast);
    // Create default forecast data
    forecast = { 
      days: [
        { date: new Date(), high: 28, low: 21, condition: 'Sunny' },
        { date: new Date(Date.now() + 86400000), high: 29, low: 22, condition: 'Partly Cloudy' },
        { date: new Date(Date.now() + 86400000 * 2), high: 27, low: 20, condition: 'Cloudy' },
        { date: new Date(Date.now() + 86400000 * 3), high: 28, low: 21, condition: 'Sunny' },
        { date: new Date(Date.now() + 86400000 * 4), high: 30, low: 23, condition: 'Sunny' }
      ] 
    };
  }
  
  // Check if forecast is an array or has a days property
  const forecastDays = Array.isArray(forecast) ? forecast : (forecast.days || []);
  
  // If we still don't have forecast days, create default ones
  if (forecastDays.length === 0) {
    for (let i = 0; i < 5; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      forecastDays.push({
        date: forecastDate,
        high: 28 + Math.floor(Math.random() * 5) - 2,
        low: 21 + Math.floor(Math.random() * 3) - 1,
        condition: i % 2 === 0 ? 'Sunny' : 'Partly Cloudy'
      });
    }
  }
  
  forecastDays.forEach(day => {
    if (!day || typeof day !== 'object') {
      console.error('Invalid day in forecast:', day);
      return;
    }
    
    // Safely create date object
    let date;
    try {
      date = new Date(day.date);
      if (isNaN(date.getTime())) {
        // If date is invalid, create a new date based on the index
        const index = forecastDays.indexOf(day);
        date = new Date();
        date.setDate(date.getDate() + (index || 0));
      }
    } catch (e) {
      console.error('Error parsing date:', e);
      date = new Date();
    }
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayCondition = day.condition || 'Sunny'; // Default to Sunny if no condition
    const dayIcon = getWeatherIcon(dayCondition);
    
    // Use default values if high/low temperatures are missing
    const highTemp = day.maxTemp || day.high || 28;
    const lowTemp = day.minTemp || day.low || 21;
    
    forecastHTML += `
      <div class="weather-card forecast">
        <div class="forecast-date">
          <div class="day-name">${dayName}</div>
          <div class="day-date">${dayDate}</div>
        </div>
        <div class="weather-icon">
          <i class="${dayIcon}"></i>
        </div>
        <div class="forecast-temp">
          <span class="high">${Math.round(highTemp)}°</span>
          <span class="low">${Math.round(lowTemp)}°</span>
        </div>
        <div class="weather-condition">${dayCondition || '—'}</div>
      </div>
    `;
  });
  
  weatherForecast.innerHTML = forecastHTML || '<div class="no-data">No forecast data available</div>';
  
  // Add weather tips section if it doesn't exist
  let weatherTipsSection = document.querySelector('.weather-tips');
  if (!weatherTipsSection) {
    weatherTipsSection = document.createElement('div');
    weatherTipsSection.className = 'weather-tips';
    weatherTipsSection.innerHTML = '<h4>Weather Tips</h4><ul id="weather-tips-list"></ul>';
    // Fallback to weatherTab if .weather-overview is not available
    const tipsContainer = weatherTab.querySelector('.weather-overview') || weatherTab;
    tipsContainer.appendChild(weatherTipsSection);
  }
  
  // Add weather tips based on conditions
  const tips = getWeatherTips(currentWeather, forecast);
  const weatherTipsList = document.getElementById('weather-tips-list');
  if (weatherTipsList) {
    weatherTipsList.innerHTML = tips.map(tip => `<li><i class="fas fa-cloud"></i> ${tip}</li>`).join('');
  }
}

// Get weather icon based on condition
function getWeatherIcon(condition) {
  // Handle undefined, null or non-string conditions
  if (!condition || typeof condition !== 'string') {
    return 'fas fa-question-circle'; // Default icon for unknown conditions
  }
  
  try {
    condition = condition.toLowerCase();
    
    if (condition.includes('clear') || condition.includes('sunny')) {
      return 'fas fa-sun';
    } else if (condition.includes('cloud')) {
      return 'fas fa-cloud';
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      return 'fas fa-cloud-rain';
    } else if (condition.includes('thunder') || condition.includes('storm')) {
      return 'fas fa-bolt';
    } else if (condition.includes('snow')) {
      return 'fas fa-snowflake';
    } else if (condition.includes('fog') || condition.includes('mist')) {
      return 'fas fa-smog';
    } else if (condition.includes('wind')) {
      return 'fas fa-wind';
    } else {
      return 'fas fa-cloud'; // Default for other weather conditions
    }
  } catch (error) {
    console.error('Error in getWeatherIcon:', error);
    return 'fas fa-question-circle';
  }
}

// Transport icon function is already defined above

// Get weather tips based on conditions
function getWeatherTips(currentWeather, forecast) {
  // Return exactly 2 concise, actionable and distinct tips
  const tipsSet = new Set();
  const cond = (currentWeather?.condition || '').toLowerCase();
  const temp = typeof currentWeather?.temperature === 'number' ? currentWeather.temperature : null;

  // 1) Prioritize current condition-specific tips
  if (cond.includes('rain') || cond.includes('drizzle')) {
    tipsSet.add('It’s rainy — carry an umbrella or raincoat');
  } else if (cond.includes('snow')) {
    tipsSet.add('Snowy — wear warm, waterproof layers and sturdy shoes');
  } else if (cond.includes('thunder') || cond.includes('storm')) {
    tipsSet.add('Stormy — avoid exposed outdoor areas');
  } else if (cond.includes('wind')) {
    tipsSet.add('Windy — secure loose items and avoid high viewpoints');
  } else if (cond.includes('sun') || cond.includes('clear')) {
    tipsSet.add('Sunny — wear sunscreen and sunglasses');
  } else if (cond.includes('cloud')) {
    // Mild cloudy conditions default tip
    tipsSet.add('Cloudy — carry a light layer; brief showers possible');
  }

  // 2) Add a temperature-based tip (current)
  if (typeof temp === 'number') {
    if (temp >= 30 && tipsSet.size < 2) tipsSet.add('Hot — stay hydrated and plan outdoor time for morning/evening');
    else if (temp <= 10 && tipsSet.size < 2) tipsSet.add('Cold — bring a jacket and layer up');
  }

  // 3) If still short, glance at forecast patterns
  if (tipsSet.size < 2) {
    const days = Array.isArray(forecast) ? forecast : (forecast?.days || []);
    let rainAhead = 0, hotAhead = 0, coldAhead = 0;
    days.forEach(d => {
      const dCond = (d?.condition || d?.conditions || '').toLowerCase();
      const avg = d?.temperature?.avg ?? (typeof d?.high === 'number' && typeof d?.low === 'number' ? (d.high + d.low) / 2 : null);
      if (dCond.includes('rain') || dCond.includes('drizzle')) rainAhead++;
      if (typeof avg === 'number') {
        if (avg >= 30) hotAhead++;
        if (avg <= 5) coldAhead++;
      }
    });
    if (rainAhead >= 1 && tipsSet.size < 2) tipsSet.add('Rain expected — plan one indoor alternative');
    if (hotAhead >= 1 && tipsSet.size < 2) tipsSet.add('Hot days ahead — carry water and a hat');
    if (coldAhead >= 1 && tipsSet.size < 2) tipsSet.add('Chilly days ahead — pack warm layers');
  }

  // 4) Ensure exactly 2 short, distinct tips with safe fallbacks
  const fallbacks = [
    'Keep plans flexible and check the daily forecast',
    'Carry a light layer for cooler evenings'
  ];
  for (const fb of fallbacks) {
    if (tipsSet.size >= 2) break;
    tipsSet.add(fb);
  }
  return Array.from(tipsSet).slice(0, 2);
}

// Get sustainability class based on score
function getSustainabilityClass(score) { return 'neutral'; }
function getSustainabilityLabel(score) { return 'N/A'; }

// Generate and display AI recommendations based on trip preferences
async function generateAIRecommendations(trip) {
  console.log('generateAIRecommendations called with trip:', trip);
  const recommendationsContainer = document.getElementById('trip-recommendations');
  if (!recommendationsContainer) {
    console.error('Recommendations container not found');
    return;
  }
  
  const preferences = trip.preferences || {};
  const travelStyle = preferences.travelStyle || [];
  const destination = trip.destination;
  const budget = trip.budget?.total || 2000;
  const duration = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24));
  const travelers = (trip.travelers?.adults || 0) + (trip.travelers?.children || 0) || 1;
  
  console.log('Trip details for recommendations:', { 
    destination, 
    budget, 
    duration, 
    travelers, 
    travelStyle 
  });
  
  // Show loading state
  recommendationsContainer.innerHTML = `
    <div class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Generating AI recommendations...</p>
    </div>
  `;
  
  try {
    // Check if AI recommendations already exist in the trip data
    if (trip.aiRecommendations && 
        trip.aiRecommendations.activities && 
        trip.aiRecommendations.activities.length > 0 && 
        trip.aiRecommendations.budget && 
        trip.aiRecommendations.budget.length > 0 && 
        trip.aiRecommendations.time && 
        trip.aiRecommendations.time.length > 0) {
      console.log('Using existing AI recommendations');
      renderRecommendations(trip.aiRecommendations, destination, budget, duration);
      return;
    }
    
    console.log('Fetching fresh AI recommendations');
    
    // Prepare the request data
    const requestData = {
      destination,
      budget,
      duration,
      travelers,
      travelStyle,
      foodPreferences: preferences.foodPreferences || [],
      accessibility: preferences.accessibility || {}
    };
    
    // Use the RecommendationService to fetch AI recommendations
    const aiRecommendations = await RecommendationService.getAIRecommendations(requestData, getToken());
    console.log('AI recommendations received:', aiRecommendations);
    
    if (!aiRecommendations || !aiRecommendations.activities) {
      throw new Error('Invalid AI recommendations received');
    }
    
    // Save the recommendations to the trip
    await TripService.updateTrip(tripId, { aiRecommendations }, getToken());
    console.log('AI recommendations saved to trip');
    
    // Render the recommendations
    renderRecommendations(aiRecommendations, destination, budget, duration);
    
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    
    // Fallback to basic recommendations if AI fails
    console.log('Using fallback recommendations');
    const fallbackRecommendations = generateFallbackRecommendations(destination, travelStyle, budget, duration);
    renderRecommendations(fallbackRecommendations, destination, budget, duration);
  }
}

// Helper function to render recommendations
function renderRecommendations(recommendations, destination, budget, duration) {
  console.log('renderRecommendations called with:', { recommendations, destination, budget, duration });
  const recommendationsContainer = document.getElementById('trip-recommendations');
  if (!recommendationsContainer) {
    console.error('Recommendations container not found in renderRecommendations');
    return;
  }
  
  let recommendationsHTML = '';
  
  // Activity recommendations
  recommendationsHTML += `
    <div class="recommendation-card">
      <div class="recommendation-icon">
        <i class="fas fa-lightbulb"></i>
      </div>
      <div class="recommendation-content">
        <h4>Suggested Activities</h4>
        <ul class="recommendation-list">
  `;
  
  // Add AI-generated activity recommendations
  if (recommendations.activities && recommendations.activities.length > 0) {
    console.log('Rendering activities:', recommendations.activities);
    recommendations.activities.forEach(activity => {
      const icon = getActivityIcon(activity.type || 'general');
      recommendationsHTML += `<li><i class="${icon}"></i> ${activity.description}</li>`;
    });
  } else {
    recommendationsHTML += `<li><i class="fas fa-info-circle"></i> No activity recommendations available</li>`;
  }
  
  recommendationsHTML += `
        </ul>
      </div>
    </div>
  `;
  
  // Budget optimization recommendations
  recommendationsHTML += `
    <div class="recommendation-card">
      <div class="recommendation-icon">
        <i class="fas fa-coins"></i>
      </div>
      <div class="recommendation-content">
        <h4>Budget Optimization</h4>
        <ul class="recommendation-list">
  `;
  
  // Add AI-generated budget recommendations
  if (recommendations.budget && recommendations.budget.length > 0) {
    console.log('Rendering budget tips:', recommendations.budget);
    recommendations.budget.forEach(tip => {
      const icon = getBudgetIcon(tip.type || 'general');
      recommendationsHTML += `<li><i class="${icon}"></i> ${tip.description}</li>`;
    });
  } else {
    recommendationsHTML += `<li><i class="fas fa-info-circle"></i> No budget recommendations available</li>`;
  }
  
  recommendationsHTML += `
        </ul>
      </div>
    </div>
  `;
  
  // Time optimization recommendations
  recommendationsHTML += `
    <div class="recommendation-card">
      <div class="recommendation-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="recommendation-content">
        <h4>Time Optimization</h4>
        <ul class="recommendation-list">
  `;
  
  // Add AI-generated time recommendations
  if (recommendations.time && recommendations.time.length > 0) {
    console.log('Rendering time tips:', recommendations.time);
    recommendations.time.forEach(tip => {
      const icon = getTimeIcon(tip.type || 'general');
      recommendationsHTML += `<li><i class="${icon}"></i> ${tip.description}</li>`;
    });
  } else {
    recommendationsHTML += `<li><i class="fas fa-info-circle"></i> No time optimization recommendations available</li>`;
  }
  
  recommendationsHTML += `
        </ul>
      </div>
    </div>
  `;
  
  console.log('Setting innerHTML for recommendations container');
  recommendationsContainer.innerHTML = recommendationsHTML;
  console.log('Recommendations rendered successfully');
}

// Helper function to generate fallback recommendations if AI fails
function generateFallbackRecommendations(destination, travelStyle, budget, duration) {
  const dailyBudget = Math.round(budget / duration);
  
  return {
    activities: [
      { type: 'landmark', description: `Visit landmarks and museums in ${destination}` },
      { type: 'local', description: `Attend local cultural events` },
      { type: 'nature', description: `Explore natural attractions nearby` },
      { type: 'food', description: `Try local cuisine and specialties` }
    ],
    budget: [
      { type: 'daily', description: `Daily budget: $${dailyBudget}` },
      { type: 'accommodation', description: dailyBudget < 100 ? 'Consider hostels to save money' : 
                                            dailyBudget < 200 ? 'Mid-range hotels offer good value' : 
                                            'Premium accommodations fit your budget' },
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

// Helper function to get appropriate icon for activity type
function getActivityIcon(type) {
  const iconMap = {
    'landmark': 'fas fa-landmark',
    'museum': 'fas fa-museum',
    'nature': 'fas fa-mountain',
    'adventure': 'fas fa-hiking',
    'water': 'fas fa-water',
    'food': 'fas fa-utensils',
    'shopping': 'fas fa-shopping-bag',
    'cultural': 'fas fa-theater-masks',
    'relaxation': 'fas fa-umbrella-beach',
    'nightlife': 'fas fa-cocktail',
    'local': 'fas fa-users',
    'religious': 'fas fa-place-of-worship',
    'tour': 'fas fa-route',
    'general': 'fas fa-star'
  };
  
  return iconMap[type] || 'fas fa-star';
}

// Helper function to get appropriate icon for budget tip type
function getBudgetIcon(type) {
  const iconMap = {
    'daily': 'fas fa-calculator',
    'accommodation': 'fas fa-bed',
    'food': 'fas fa-utensils',
    'transport': 'fas fa-bus',
    'activities': 'fas fa-ticket-alt',
    'shopping': 'fas fa-shopping-bag',
    'saving': 'fas fa-piggy-bank',
    'luxury': 'fas fa-concierge-bell',
    'general': 'fas fa-coins'
  };
  
  return iconMap[type] || 'fas fa-coins';
}

// Helper function to get appropriate icon for time tip type
function getTimeIcon(type) {
  const iconMap = {
    'planning': 'fas fa-calendar-alt',
    'location': 'fas fa-map-marker-alt',
    'transport': 'fas fa-route',
    'rest': 'fas fa-bed',
    'flexibility': 'fas fa-random',
    'efficiency': 'fas fa-tachometer-alt',
    'priority': 'fas fa-list-ol',
    'general': 'fas fa-clock'
  };
  
  return iconMap[type] || 'fas fa-clock';
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Fetch trip notes
async function fetchTripNotes(trip) {
  // Prefer backend source of truth
  let notes = [];
  try {
    notes = await TripService.getTripNotes(trip._id || tripId, token);
  } catch (e) {
    console.warn('Falling back to notes on trip object due to API issue:', e);
    notes = trip.notes || [];
  }
  
  if (!Array.isArray(notes) || notes.length === 0) {
    notesContainer.innerHTML = '';
    emptyNotes.style.display = 'flex';
  } else {
    emptyNotes.style.display = 'none';
    
    let notesHTML = '';
    notes.forEach(note => {
      const date = new Date(note.createdAt);
      const dateFormatted = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      let categoryIcon = 'fas fa-sticky-note';
      switch (note.category) {
        case 'transport':
          categoryIcon = 'fas fa-plane';
          break;
        case 'accommodation':
          categoryIcon = 'fas fa-hotel';
          break;
        case 'activities':
          categoryIcon = 'fas fa-hiking';
          break;
        case 'food':
          categoryIcon = 'fas fa-utensils';
          break;
        case 'packing':
          categoryIcon = 'fas fa-suitcase';
          break;
      }
      
      notesHTML += `
        <div class="note-card" data-note-id="${note._id}">
          <div class="note-header">
            <div class="note-category">
              <i class="${categoryIcon}"></i> ${capitalizeFirstLetter(note.category)}
            </div>
            <div class="note-actions">
              <button class="btn-icon" data-action="edit-note" title="Edit Note">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon" data-action="delete-note" title="Delete Note">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          <div class="note-content">
            <h4 class="note-title">${note.title}</h4>
            <div class="note-text">${note.content}</div>
          </div>
          <div class="note-footer">
            <div class="note-date">
              <i class="fas fa-calendar-alt"></i> ${dateFormatted}
            </div>
          </div>
        </div>
      `;
    });
    
    notesContainer.innerHTML = notesHTML;
    
    // Add event listeners for note actions
    const editButtons = notesContainer.querySelectorAll('[data-action="edit-note"]');
    const deleteButtons = notesContainer.querySelectorAll('[data-action="delete-note"]');
    
    editButtons.forEach(button => {
      button.addEventListener('click', function() {
        const noteCard = this.closest('.note-card');
        const noteId = noteCard.dataset.noteId;
        editNote(noteId);
      });
    });
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', function() {
        const noteCard = this.closest('.note-card');
        const noteId = noteCard.dataset.noteId;
        const noteTitle = noteCard.querySelector('.note-title').textContent;
        deleteNote(noteId, noteTitle);
      });
    });
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Initialize all DOM elements first
  initializeDOMElements();
  
  // Update overview cards immediately to prevent "Loading..." text
  updateOverviewCards();
  
  // Fetch trip data on page load
  fetchTripData();
  
  // Theme toggle functionality
  const themeSwitch = document.getElementById('theme-switch');
  const body = document.body;
  const logoutBtn = document.getElementById('logout-btn');
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.setAttribute('data-theme', savedTheme);
    if (themeSwitch) {
      themeSwitch.checked = savedTheme === 'dark';
    }
  }
  
  // Theme switch event listener
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
  document.addEventListener('click', function(event) {
    if (userDropdown && !event.target.closest('.user-menu')) {
      userDropdown.classList.remove('active');
    }
  });
  
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons and tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding tab
      this.classList.add('active');
      const tabId = this.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Edit budget button
  editBudgetBtn.addEventListener('click', function() {
    openBudgetModal();
  });
  
  // Cancel budget edit
  cancelBudgetBtn.addEventListener('click', function() {
    closeBudgetModal();
  });
  
  // Close budget modal when clicking outside
  editBudgetModal.addEventListener('click', function(event) {
    if (event.target === editBudgetModal) {
      closeBudgetModal();
    }
  });
  
  // Close budget modal with X button
  document.querySelector('#edit-budget-modal .modal-close').addEventListener('click', function() {
    closeBudgetModal();
  });
  
  // Budget slider events
  const budgetSliders = document.querySelectorAll('.budget-slider-item input[type="range"]');
  budgetSliders.forEach(slider => {
    slider.addEventListener('input', updateBudgetSliders);
  });
  
  // Budget total input event
  budgetTotalInput.addEventListener('input', updateBudgetSliders);
  
  // Edit budget form submission
  editBudgetForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const totalBudget = parseInt(budgetTotalInput.value);
    const transportPercentage = parseInt(document.getElementById('transport-slider').value);
    const accommodationPercentage = parseInt(document.getElementById('accommodation-slider').value);
    const foodPercentage = parseInt(document.getElementById('food-slider').value);
    const activitiesPercentage = parseInt(document.getElementById('activities-slider').value);
    const otherPercentage = parseInt(document.getElementById('other-slider').value);
    
    // Validate total percentage
    const totalPercentage = transportPercentage + accommodationPercentage + foodPercentage + activitiesPercentage + otherPercentage;
    if (totalPercentage !== 100) {
      document.getElementById('edit-budget-error').textContent = 'Total percentage must equal 100%';
      return;
    }
    
    // Create budget data
    const budgetData = {
      total: totalBudget,
      currency: 'INR',
      breakdown: {
        transport: Math.round(totalBudget * transportPercentage / 100),
        accommodation: Math.round(totalBudget * accommodationPercentage / 100),
        food: Math.round(totalBudget * foodPercentage / 100),
        activities: Math.round(totalBudget * activitiesPercentage / 100),
        other: Math.round(totalBudget * otherPercentage / 100)
      }
    };
    
    try {
      await TripService.updateTripBudget(tripId, budgetData, token);
      closeBudgetModal();
      fetchTripData(); // Refresh trip data
    } catch (error) {
      console.error('Error updating budget:', error);
      document.getElementById('edit-budget-error').textContent = error.message || 'Failed to update budget. Please try again.';
    }
  });
  
  // Add note button
  addNoteBtn.addEventListener('click', function() {
    openAddNoteModal();
  });
  
  // Cancel note addition
  cancelNoteBtn.addEventListener('click', function() {
    closeAddNoteModal();
  });
  
  // Close note modal when clicking outside
  addNoteModal.addEventListener('click', function(event) {
    if (event.target === addNoteModal) {
      closeAddNoteModal();
    }
  });
  
  // Close note modal with X button
  document.querySelector('#add-note-modal .modal-close').addEventListener('click', function() {
    closeAddNoteModal();
  });
  
  // Add note form submission
  addNoteForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const category = document.getElementById('note-category').value;
    
    const noteData = {
      title,
      content,
      category
    };
    
    try {
      await TripService.addTripNote(tripId, noteData, token);
      closeAddNoteModal();
      fetchTripData(); // Refresh trip data
    } catch (error) {
      console.error('Error adding note:', error);
      document.getElementById('add-note-error').textContent = error.message || 'Failed to add note. Please try again.';
    }
  });
  
  // Logout button
  logoutBtn.addEventListener('click', function(event) {
    event.preventDefault();
    logout();
  });
}); // End of DOMContentLoaded event listener

// Open budget modal
function openBudgetModal() {
  const editBudgetModal = document.getElementById('edit-budget-modal');
  editBudgetModal.classList.add('active');
  document.body.classList.add('modal-open');
}

// Close budget modal
function closeBudgetModal() {
  const editBudgetModal = document.getElementById('edit-budget-modal');
  editBudgetModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.getElementById('edit-budget-error').textContent = '';
}

// Open add note modal
function openAddNoteModal() {
  addNoteModal.classList.add('active');
  document.body.classList.add('modal-open');
}

// Close add note modal
function closeAddNoteModal() {
  addNoteModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  addNoteForm.reset();
  document.getElementById('add-note-error').textContent = '';
}

// Edit an existing note (simple prompt-based editor for now)
async function editNote(noteId) {
  try {
    const noteCard = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!noteCard) return;
    const currentTitle = noteCard.querySelector('.note-title')?.textContent || '';
    const currentContent = noteCard.querySelector('.note-text')?.textContent || '';
    const currentCategory = noteCard.querySelector('.note-category')?.textContent?.trim().toLowerCase() || 'general';

    const newTitle = prompt('Edit note title:', currentTitle) ?? currentTitle;
    const newContent = prompt('Edit note content:', currentContent) ?? currentContent;
    const newCategory = prompt('Edit category (general, transport, accommodation, activities, food, packing):', currentCategory) ?? currentCategory;

    const payload = { title: newTitle, content: newContent, category: newCategory };
    await TripService.updateTripNote(tripId, noteId, payload, token);
    // Refresh notes
    const trip = await TripService.getTripById(tripId, token);
    fetchTripNotes(trip);
  } catch (err) {
    console.error('Error editing note:', err);
    alert(err.message || 'Failed to edit note');
  }
}

// Delete an existing note
async function deleteNote(noteId, noteTitle = '') {
  try {
    const confirmed = confirm(`Delete note${noteTitle ? `: "${noteTitle}"` : ''}?`);
    if (!confirmed) return;
    await TripService.deleteTripNote(tripId, noteId, token);
    // Refresh notes
    const trip = await TripService.getTripById(tripId, token);
    fetchTripNotes(trip);
  } catch (err) {
    console.error('Error deleting note:', err);
    alert(err.message || 'Failed to delete note');
  }
}
