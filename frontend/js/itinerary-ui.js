/**
 * Itinerary UI Module
 * Handles UI interactions for the itinerary builder
 */

import { getState, saveItinerary } from './itinerary-core.js';

// Reference to the global state
let state;

/**
 * Initialize the UI
 * @param {Object} globalState - The global state object
 */
export function initUI(globalState) {
  state = globalState;
  
  // Set up theme toggle
  setupThemeToggle();
  
  // Set up user menu
  setupUserMenu();
  
  // Set up mobile menu
  setupMobileMenu();
  
  // Set up save button
  document.getElementById('save-itinerary-btn').addEventListener('click', saveItinerary);
  
  // Update user info
  updateUserInfo();
}

/**
 * Set up theme toggle functionality
 */
function setupThemeToggle() {
  const themeSwitch = document.getElementById('theme-switch');
  const body = document.body;
  
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

/**
 * Set up user menu functionality
 */
function setupUserMenu() {
  const userMenuBtn = document.querySelector('.user-menu-btn');
  const userDropdown = document.querySelector('.user-dropdown');
  
  userMenuBtn.addEventListener('click', function() {
    userDropdown.classList.toggle('active');
  });
  
  // Close user dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.user-menu')) {
      userDropdown.classList.remove('active');
    }
  });
}

/**
 * Set up mobile menu functionality
 */
function setupMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  menuToggle.addEventListener('click', function() {
    nav.classList.toggle('active');
  });
}

/**
 * Update user information in the UI
 */
function updateUserInfo() {
  const userNameElement = document.querySelector('.user-name');
  const userAvatarElement = document.querySelector('.user-avatar');
  
  if (state.user) {
    userNameElement.textContent = state.user.username || 'User';
    userAvatarElement.src = `https://ui-avatars.com/api/?name=${state.user.username || 'User'}&background=4CAFAB&color=fff`;
  }
}

/**
 * Show loading state
 */
export function showLoading() {
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.querySelector('.loading-overlay');
  
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  
  // Show loading overlay
  loadingOverlay.classList.add('active');
  document.body.classList.add('loading');
}

/**
 * Hide loading state
 */
export function hideLoading() {
  const loadingOverlay = document.querySelector('.loading-overlay');
  
  if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
    document.body.classList.remove('loading');
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
export function showError(message) {
  // Create error toast if it doesn't exist
  let errorToast = document.querySelector('.error-toast');
  
  if (!errorToast) {
    errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    document.body.appendChild(errorToast);
  }
  
  // Set error message
  errorToast.innerHTML = `
    <div class="error-icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="error-message">${message}</div>
    <button class="error-close">&times;</button>
  `;
  
  // Show error toast
  errorToast.classList.add('active');
  
  // Add close button event listener
  errorToast.querySelector('.error-close').addEventListener('click', function() {
    errorToast.classList.remove('active');
  });
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorToast.classList.remove('active');
  }, 5000);
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
export function showSuccess(message) {
  // Create success toast if it doesn't exist
  let successToast = document.querySelector('.success-toast');
  
  if (!successToast) {
    successToast = document.createElement('div');
    successToast.className = 'success-toast';
    document.body.appendChild(successToast);
  }
  
  // Set success message
  successToast.innerHTML = `
    <div class="success-icon">
      <i class="fas fa-check-circle"></i>
    </div>
    <div class="success-message">${message}</div>
    <button class="success-close">&times;</button>
  `;
  
  // Show success toast
  successToast.classList.add('active');
  
  // Add close button event listener
  successToast.querySelector('.success-close').addEventListener('click', function() {
    successToast.classList.remove('active');
  });
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    successToast.classList.remove('active');
  }, 3000);
}
