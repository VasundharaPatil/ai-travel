const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Import controllers (to be implemented)
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  updateUserPreferences,
  createGroupProfile,
  updateGroupProfile,
  deleteGroupProfile
} = require('../controllers/userController');

// Import middleware (to be implemented)
const auth = require('../middleware/auth');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post(
  '/register', 
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  registerUser
);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  loginUser
);

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getUserProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateUserProfile);

// @route   PUT api/users/preferences
// @desc    Update user travel preferences
// @access  Private
router.put('/preferences', auth, updateUserPreferences);

// @route   POST api/users/groups
// @desc    Create a new group profile
// @access  Private
router.post('/groups', auth, createGroupProfile);

// @route   PUT api/users/groups/:id
// @desc    Update a group profile
// @access  Private
router.put('/groups/:id', auth, updateGroupProfile);

// @route   DELETE api/users/groups/:id
// @desc    Delete a group profile
// @access  Private
router.delete('/groups/:id', auth, deleteGroupProfile);

module.exports = router;
