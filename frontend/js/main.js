/**
 * Main JavaScript file for the Travel Planner application
 * This file loads common components and handles authentication state
 */

import Navbar from '../components/navbar.js';
import { AuthService } from '../services/api.js';

class App {
  constructor() {
    // Get authentication token
    this.token = localStorage.getItem('token');
    this.isAuthenticated = !!this.token;
    
    // Get current page from URL
    this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Check if we're in a redirect loop (to prevent infinite redirects)
    this.redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
    
    // Pages that require authentication
    this.protectedPages = [
      'dashboard.html',
      'trip-details.html',
      'itinerary-builder.html',
      'itinerary.html',
      'chat.html',
      'profile.html',
      'preferences.html',
      'sustainability.html'
    ];
    
    // Pages that should redirect to dashboard if already authenticated
    this.authPages = [
      'login.html',
      'signup.html'
    ];
  }

  /**
   * Initialize the application
   */
  async init() {
    // Check authentication status
    await this.checkAuthStatus();
    
    // Load components
    this.loadComponents();
    
    // Handle page-specific initialization
    this.initializePage();
  }

  /**
   * Check if the user is authenticated
   */
  async checkAuthStatus() {
    // Prevent redirect loops
    if (this.redirectCount > 3) {
      console.error('Too many redirects detected, stopping redirect chain');
      sessionStorage.setItem('redirectCount', '0');
      return;
    }
    
    // Redirect if on protected page but not authenticated
    if (this.protectedPages.includes(this.currentPage) && !this.isAuthenticated) {
      sessionStorage.setItem('redirectCount', (this.redirectCount + 1).toString());
      window.location.href = 'login.html?redirect=' + encodeURIComponent(this.currentPage);
      return;
    }
    
    // Redirect if on auth page but already authenticated
    if (this.authPages.includes(this.currentPage) && this.isAuthenticated) {
      // Only redirect if we're not already in a redirect loop
      if (this.redirectCount < 2) {
        sessionStorage.setItem('redirectCount', (this.redirectCount + 1).toString());
        window.location.href = 'dashboard.html';
        return;
      }
    }
    
    // Reset redirect count if we're not redirecting
    sessionStorage.setItem('redirectCount', '0');
    
    // Verify token validity if authenticated
    if (this.isAuthenticated) {
      try {
        // Attempt to get user profile with token
        await AuthService.getProfile(this.token);
      } catch (error) {
        console.error('Authentication error:', error);
        // Token is invalid, clear it and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        
        if (this.protectedPages.includes(this.currentPage)) {
          window.location.href = 'login.html?redirect=' + encodeURIComponent(this.currentPage);
        }
      }
    }
  }

  /**
   * Load common components
   */
  loadComponents() {
    // Initialize navbar
    const navbar = new Navbar();
    navbar.init();
    
    // Footer removed as requested
  }

  /**
   * Initialize page-specific functionality
   */
  initializePage() {
    // Add loading indicator for API calls
    this.setupLoadingIndicator();
    
    // Setup global error handling
    this.setupErrorHandling();
  }

  /**
   * Setup loading indicator for API calls
   */
  setupLoadingIndicator() {
    // Create loading indicator element if it doesn't exist
    if (!document.getElementById('loading-indicator')) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'loading-indicator';
      loadingIndicator.className = 'loading-indicator';
      loadingIndicator.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
      document.body.appendChild(loadingIndicator);
    }
    
    // Show loading indicator before each fetch request
    const originalFetch = window.fetch;
    window.fetch = function() {
      document.getElementById('loading-indicator').classList.add('active');
      
      return originalFetch.apply(this, arguments)
        .then(response => {
          document.getElementById('loading-indicator').classList.remove('active');
          return response;
        })
        .catch(error => {
          document.getElementById('loading-indicator').classList.remove('active');
          throw error;
        });
    };
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      
      // Display error toast if toast container exists
      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
          <div class="toast-header bg-danger text-white">
            <strong class="me-auto">Error</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div class="toast-body">
            ${event.error?.message || 'An unexpected error occurred'}
          </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
          toast.remove();
        }, 5000);
      }
    });
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
