/**
 * Authentication Utility for the Travel Planner application
 * Handles token storage, retrieval, and authentication state
 */

// Token key in localStorage
const TOKEN_KEY = 'token';
const USER_KEY = 'username';
const USER_ID_KEY = 'userId';

// Store authentication token
const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Get authentication token
const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Remove authentication token
const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_ID_KEY);
};

// Store user data
const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Get user data
const getUser = () => {
  const userData = localStorage.getItem(USER_KEY);
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (error) {
    // If the userData is not valid JSON but is a string, create a user object with it as the username
    if (typeof userData === 'string') {
      return { username: userData, userId: userData };
    }
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!getToken();
};

// Login user (store token and user data)
const login = (token, user) => {
  setToken(token);
  setUser(user);
};

// Logout user (remove token and user data)
const logout = () => {
  removeToken();
  window.location.href = 'login.html';
};

// Export authentication utilities
export {
  setToken,
  getToken,
  removeToken,
  setUser,
  getUser,
  isAuthenticated,
  login,
  logout
};
