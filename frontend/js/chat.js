/**
 * Chat Assistant JavaScript for the Travel Planner application
 * Handles AI-powered chat assistant functionality, conversation history, and context-aware responses
 */

import { TripService, ChatService, WeatherService } from '../services/api.js';
import { getToken, getUser, logout } from '../services/auth.js';

// Check if user is authenticated, redirect to login if not
const token = getToken();
if (!token) {
  window.location.href = 'login.html';
}

// Get user data
const user = getUser();

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatTitle = document.getElementById('chat-title');
const activeTripElement = document.getElementById('active-trip');
const chatHistoryList = document.getElementById('chat-history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const changeTripBtn = document.getElementById('change-trip-btn');
const saveChatBtn = document.getElementById('save-chat-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const tripSelectionModal = document.getElementById('trip-selection-modal');
const tripSelectionList = document.getElementById('trip-selection-list');
const cancelTripSelectionBtn = document.getElementById('cancel-trip-selection-btn');
const noTripBtn = document.getElementById('no-trip-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameElement = document.querySelector('.user-name');
const userAvatarElement = document.querySelector('.user-avatar');
const queryButtons = document.querySelectorAll('.query-btn');

// Chat state
let activeConversationId = null;
let activeTrip = null;
let conversations = [];
let isProcessing = false;
let messageQueue = [];

// Set user name and avatar
if (user) {
  userNameElement.textContent = user.username || 'User';
  userAvatarElement.src = `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=4CAFAB&color=fff`;
}

// Initialize the page
async function initializePage() {
  try {
    // Load conversations
    await loadConversations();
    
    // Check for active trip in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('trip') || localStorage.getItem('activeChatTripId');
    
    if (tripId) {
      // Load active trip
      await loadActiveTrip(tripId);
    } else {
      // Show no active trip
      displayNoActiveTrip();
    }
    
    // Check for conversation ID in URL
    const conversationId = urlParams.get('conversation');
    if (conversationId) {
      // Load conversation
      await loadConversation(conversationId);
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showError('Failed to initialize chat. Please try again later.');
  }
}

/**
 * Load user's conversations
 */
async function loadConversations() {
  try {
    // Fetch conversations
    conversations = await ChatService.getConversations(token);
    
    // Display conversations in history list
    displayConversationHistory(conversations);
  } catch (error) {
    console.error('Error loading conversations:', error);
    chatHistoryList.innerHTML = `
      <div class="empty-state">
        <p>No conversation history</p>
      </div>
    `;
  }
}

/**
 * Display conversation history
 */
function displayConversationHistory(conversations) {
  if (!conversations || conversations.length === 0) {
    chatHistoryList.innerHTML = `
      <div class="empty-state">
        <p>No conversation history</p>
      </div>
    `;
    return;
  }
  
  let historyHTML = '';
  
  conversations.forEach(conversation => {
    const date = new Date(conversation.updatedAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const isActive = conversation._id === activeConversationId ? 'active' : '';
    const tripInfo = conversation.tripContext ? `<div class="history-trip"><i class="fas fa-map-marker-alt"></i> ${conversation.tripContext.destination}</div>` : '';
    
    historyHTML += `
      <div class="history-item ${isActive}" data-conversation-id="${conversation._id}">
        <div class="history-title">${conversation.title || 'Untitled Conversation'}</div>
        ${tripInfo}
        <div class="history-date">${formattedDate}</div>
      </div>
    `;
  });
  
  chatHistoryList.innerHTML = historyHTML;
  
  // Add event listeners to history items
  const historyItems = document.querySelectorAll('.history-item');
  historyItems.forEach(item => {
    item.addEventListener('click', function() {
      const conversationId = this.dataset.conversationId;
      loadConversation(conversationId);
    });
  });
}

/**
 * Load active trip
 */
async function loadActiveTrip(tripId) {
  try {
    // Fetch trip data
    activeTrip = await TripService.getTripById(tripId, token);
    
    // Save active trip ID to localStorage
    localStorage.setItem('activeChatTripId', tripId);
    
    // Display active trip
    displayActiveTrip(activeTrip);
  } catch (error) {
    console.error('Error loading active trip:', error);
    displayNoActiveTrip();
  }
}

/**
 * Display active trip
 */
function displayActiveTrip(trip) {
  // Format dates
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const startDateFormatted = startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  const endDateFormatted = endDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Update active trip element
  activeTripElement.innerHTML = `
    <div class="trip-card">
      <div class="trip-title">${trip.title}</div>
      <div class="trip-destination">
        <i class="fas fa-map-marker-alt"></i> ${trip.destination}
      </div>
      <div class="trip-dates">
        <i class="fas fa-calendar-alt"></i> ${startDateFormatted} - ${endDateFormatted}
      </div>
      <a href="trip-details.html?id=${trip._id}" class="trip-link">
        <i class="fas fa-external-link-alt"></i> View Trip
      </a>
    </div>
  `;
}

/**
 * Display no active trip
 */
function displayNoActiveTrip() {
  activeTrip = null;
  localStorage.removeItem('activeChatTripId');
  
  activeTripElement.innerHTML = `
    <div class="empty-state">
      <p>No active trip selected</p>
      <button class="btn btn-secondary btn-sm" id="select-trip-btn">
        <i class="fas fa-map-marker-alt"></i> Select Trip
      </button>
    </div>
  `;
  
  // Add event listener to select trip button
  document.getElementById('select-trip-btn').addEventListener('click', openTripSelectionModal);
}

/**
 * Load conversation
 */
async function loadConversation(conversationId) {
  try {
    // Clear current messages
    chatMessages.innerHTML = '';
    
    // Show loading
    showLoading();
    
    // Fetch conversation
    const conversation = await ChatService.getConversation(conversationId, token);
    
    // Set active conversation ID
    activeConversationId = conversationId;
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('conversation', conversationId);
    window.history.pushState({}, '', url);
    
    // Update chat title
    chatTitle.textContent = conversation.title || 'Untitled Conversation';
    
    // If conversation has trip context and no active trip, load it
    if (conversation.tripContext && (!activeTrip || activeTrip._id !== conversation.tripContext._id)) {
      await loadActiveTrip(conversation.tripContext._id);
    }
    
    // Display messages
    conversation.messages.forEach(message => {
      addMessageToChat(message.role, message.content);
    });
    
    // Update conversation history
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      if (item.dataset.conversationId === conversationId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Hide loading
    hideLoading();
    
    // Scroll to bottom
    scrollToBottom();
  } catch (error) {
    console.error('Error loading conversation:', error);
    hideLoading();
    showError('Failed to load conversation. Please try again.');
  }
}

/**
 * Create a new conversation
 */
async function createNewConversation() {
  try {
    // Clear current messages
    chatMessages.innerHTML = '';
    
    // Reset active conversation ID
    activeConversationId = null;
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.delete('conversation');
    window.history.pushState({}, '', url);
    
    // Update chat title
    chatTitle.textContent = 'New Conversation';
    
    // Add welcome message
    addWelcomeMessage();
    
    // Update conversation history
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      item.classList.remove('active');
    });
  } catch (error) {
    console.error('Error creating new conversation:', error);
    showError('Failed to create new conversation. Please try again.');
  }
}

/**
 * Add welcome message
 */
function addWelcomeMessage() {
  const welcomeHTML = `
    <div class="message assistant-message welcome-message">
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-content">
        <div class="message-text">
          <h4>Hello! I'm your AI Travel Assistant.</h4>
          <p>I can help you with:</p>
          <ul>
            <li>Information about destinations</li>
            <li>Travel recommendations and tips</li>
            <li>Weather forecasts for your trip</li>
            <li>Visa and entry requirements</li>
            <li>Currency and payment advice</li>
            <li>Local customs and cultural information</li>
          </ul>
          <p>How can I assist with your travel plans today?</p>
        </div>
      </div>
    </div>
  `;
  
  chatMessages.innerHTML = welcomeHTML;
}

/**
 * Send message to chat
 */
async function sendMessage(message) {
  try {
    // Don't send empty messages
    if (!message.trim()) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input
    messageInput.value = '';
    
    // Show typing indicator
    addTypingIndicator();
    
    // Scroll to bottom
    scrollToBottom();
    
    // If no active conversation, create one
    if (!activeConversationId) {
      // Create conversation
      const newConversation = await ChatService.createConversation({
        title: generateConversationTitle(message),
        tripContext: activeTrip ? activeTrip._id : null
      }, token);
      
      // Set active conversation ID
      activeConversationId = newConversation._id;
      
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('conversation', activeConversationId);
      window.history.pushState({}, '', url);
      
      // Update chat title
      chatTitle.textContent = newConversation.title;
    }
    
    // Send message to API
    const response = await ChatService.sendMessage(activeConversationId, {
      role: 'user',
      content: message
    }, token);
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Add assistant message to chat
    addMessageToChat('assistant', response.reply.content);
    
    // Reload conversations to update history
    await loadConversations();
    
    // Scroll to bottom
    scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Add error message
    addErrorMessage();
    
    // Scroll to bottom
    scrollToBottom();
  }
}

/**
 * Add message to chat
 */
function addMessageToChat(role, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role}-message`;
  
  const avatarElement = document.createElement('div');
  avatarElement.className = 'message-avatar';
  
  if (role === 'user') {
    avatarElement.innerHTML = `<img src="${userAvatarElement.src}" alt="User">`;
  } else {
    avatarElement.innerHTML = `<i class="fas fa-robot"></i>`;
  }
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  
  const textElement = document.createElement('div');
  textElement.className = 'message-text';
  
  // Convert markdown-like formatting to HTML
  const formattedContent = formatMessageContent(content);
  textElement.innerHTML = formattedContent;
  
  contentElement.appendChild(textElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentElement);
  
  chatMessages.appendChild(messageElement);
}

/**
 * Format message content (convert markdown-like syntax to HTML)
 */
function formatMessageContent(content) {
  // Replace URLs with links
  content = content.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Replace ** for bold
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace * for italic
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Replace newlines with <br>
  content = content.replace(/\n/g, '<br>');
  
  return content;
}

/**
 * Add typing indicator
 */
function addTypingIndicator() {
  const typingElement = document.createElement('div');
  typingElement.className = 'message assistant-message typing-indicator';
  typingElement.id = 'typing-indicator';
  
  typingElement.innerHTML = `
    <div class="message-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(typingElement);
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
  const typingElement = document.getElementById('typing-indicator');
  if (typingElement) {
    typingElement.remove();
  }
}

/**
 * Add error message
 */
function addErrorMessage() {
  const errorElement = document.createElement('div');
  errorElement.className = 'message system-message error-message';
  
  errorElement.innerHTML = `
    <div class="message-content">
      <div class="message-text">
        <i class="fas fa-exclamation-circle"></i>
        <p>Sorry, there was an error processing your message. Please try again.</p>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(errorElement);
}

/**
 * Generate conversation title from first message
 */
function generateConversationTitle(message) {
  // Use first 5 words or 30 characters, whichever is shorter
  const words = message.split(' ').slice(0, 5).join(' ');
  if (words.length <= 30) {
    return words;
  } else {
    return words.substring(0, 27) + '...';
  }
}

/**
 * Save conversation with custom title
 */
async function saveConversationWithTitle() {
  if (!activeConversationId) {
    showError('No active conversation to save.');
    return;
  }
  
  const title = prompt('Enter a title for this conversation:');
  if (!title) return;
  
  try {
    // Update conversation title
    await ChatService.updateConversation(activeConversationId, { title }, token);
    
    // Update chat title
    chatTitle.textContent = title;
    
    // Reload conversations to update history
    await loadConversations();
    
    showSuccess('Conversation saved.');
  } catch (error) {
    console.error('Error saving conversation:', error);
    showError('Failed to save conversation. Please try again.');
  }
}

/**
 * Clear conversation
 */
async function clearConversation() {
  if (!confirm('Are you sure you want to clear this conversation? This cannot be undone.')) {
    return;
  }
  
  try {
    if (activeConversationId) {
      // Delete conversation
      await ChatService.deleteConversation(activeConversationId, token);
      
      // Reload conversations to update history
      await loadConversations();
    }
    
    // Create new conversation
    createNewConversation();
    
    showSuccess('Conversation cleared.');
  } catch (error) {
    console.error('Error clearing conversation:', error);
    showError('Failed to clear conversation. Please try again.');
  }
}

/**
 * Open trip selection modal
 */
async function openTripSelectionModal() {
  try {
    // Show loading
    tripSelectionList.innerHTML = '<div class="loading"></div>';
    
    // Show modal
    tripSelectionModal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // Fetch user trips
    const trips = await TripService.getUserTrips(token);
    
    // Display trips in selection list
    if (!trips || trips.length === 0) {
      tripSelectionList.innerHTML = `
        <div class="empty-state">
          <p>You don't have any trips yet.</p>
          <a href="dashboard.html" class="btn btn-primary btn-sm">
            <i class="fas fa-plus"></i> Create a Trip
          </a>
        </div>
      `;
      return;
    }
    
    let tripsHTML = '';
    
    trips.forEach(trip => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const startDateFormatted = startDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
      const endDateFormatted = endDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      tripsHTML += `
        <div class="trip-selection-item" data-trip-id="${trip._id}">
          <div class="trip-selection-content">
            <div class="trip-title">${trip.title}</div>
            <div class="trip-destination">
              <i class="fas fa-map-marker-alt"></i> ${trip.destination}
            </div>
            <div class="trip-dates">
              <i class="fas fa-calendar-alt"></i> ${startDateFormatted} - ${endDateFormatted}
            </div>
          </div>
          <div class="trip-selection-action">
            <button class="btn btn-primary btn-sm select-trip-btn" data-trip-id="${trip._id}">
              Select
            </button>
          </div>
        </div>
      `;
    });
    
    tripSelectionList.innerHTML = tripsHTML;
    
    // Add event listeners to select trip buttons
    const selectTripButtons = document.querySelectorAll('.select-trip-btn');
    selectTripButtons.forEach(button => {
      button.addEventListener('click', function() {
        const tripId = this.dataset.tripId;
        selectTrip(tripId);
      });
    });
  } catch (error) {
    console.error('Error loading trips:', error);
    tripSelectionList.innerHTML = `
      <div class="error-message">
        <p>Failed to load trips. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Close trip selection modal
 */
function closeTripSelectionModal() {
  tripSelectionModal.classList.remove('active');
  document.body.classList.remove('modal-open');
}

/**
 * Select trip
 */
async function selectTrip(tripId) {
  try {
    // Load active trip
    await loadActiveTrip(tripId);
    
    // Close modal
    closeTripSelectionModal();
    
    // If there's an active conversation, update its trip context
    if (activeConversationId) {
      await ChatService.updateConversation(activeConversationId, {
        tripContext: tripId
      }, token);
    }
    
    showSuccess('Trip selected.');
  } catch (error) {
    console.error('Error selecting trip:', error);
    showError('Failed to select trip. Please try again.');
  }
}

/**
 * Continue without a trip
 */
function continueWithoutTrip() {
  // Clear active trip
  displayNoActiveTrip();
  
  // Close modal
  closeTripSelectionModal();
}

/**
 * Show loading state
 */
function showLoading() {
  // Add loading class to chat messages
  chatMessages.classList.add('loading');
}

/**
 * Hide loading state
 */
function hideLoading() {
  // Remove loading class from chat messages
  chatMessages.classList.remove('loading');
}

/**
 * Show error message
 */
function showError(message) {
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
 */
function showSuccess(message) {
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

/**
 * Scroll to bottom of chat messages
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Auto-resize textarea
 */
function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize page
  initializePage();
  
  // Chat form submission
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    sendMessage(messageInput.value);
  });
  
  // Auto-resize textarea on input
  messageInput.addEventListener('input', autoResizeTextarea);
  
  // New chat button
  newChatBtn.addEventListener('click', createNewConversation);
  
  // Change trip button
  changeTripBtn.addEventListener('click', openTripSelectionModal);
  
  // Save chat button
  saveChatBtn.addEventListener('click', saveConversationWithTitle);
  
  // Clear chat button
  clearChatBtn.addEventListener('click', clearConversation);
  
  // Cancel trip selection button
  cancelTripSelectionBtn.addEventListener('click', closeTripSelectionModal);
  
  // No trip button
  noTripBtn.addEventListener('click', continueWithoutTrip);
  
  // Close trip selection modal when clicking outside
  tripSelectionModal.addEventListener('click', function(event) {
    if (event.target === this) {
      closeTripSelectionModal();
    }
  });
  
  // Close trip selection modal with X button
  document.querySelector('#trip-selection-modal .modal-close').addEventListener('click', closeTripSelectionModal);
  
  // Suggested query buttons
  queryButtons.forEach(button => {
    button.addEventListener('click', function() {
      const query = this.dataset.query;
      messageInput.value = query;
      autoResizeTextarea();
      sendMessage(query);
    });
  });
  
  // Theme toggle functionality
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
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  menuToggle.addEventListener('click', function() {
    nav.classList.toggle('active');
  });
  
  // User menu toggle
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
  
  // Logout button
  logoutBtn.addEventListener('click', function(event) {
    event.preventDefault();
    logout();
  });
});
