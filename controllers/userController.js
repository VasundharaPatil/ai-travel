const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// @desc    Register a user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, preferences } = req.body;

  try {
    // Check if user exists with this email
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Email already in use. Please use a different email address.' });
    }
    
    // Check if username is already taken
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Username already taken. Please choose a different username.' });
    }

    user = new User({
      username,
      email,
      password,
      preferences
    });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Return JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    // Make sure JWT_SECRET is available
    const jwtSecret = process.env.JWT_SECRET || 'fallbacksecretkey123456789012345678901234';
    
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT Sign Error:', err);
          return res.status(500).json({ msg: 'Token generation failed' });
        }
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
      }
    );
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
module.exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Return JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    // Make sure JWT_SECRET is available
    const jwtSecret = process.env.JWT_SECRET || 'fallbacksecretkey123456789012345678901234';
    
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT Sign Error:', err);
          return res.status(500).json({ msg: 'Token generation failed' });
        }
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
      }
    );
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  const { username, email } = req.body;
  
  // Build user object
  const userFields = {};
  if (username) userFields.username = username;
  if (email) userFields.email = email;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updateUserPreferences = async (req, res) => {
  const { preferences } = req.body;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Validate preferences
    const validTravelStyles = ['adventure', 'luxury', 'cultural', 'relaxation', 'budget'];
    const validFoodPreferences = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'no-restrictions'];
    
    // Ensure travel styles are valid
    if (preferences.travelStyle && Array.isArray(preferences.travelStyle)) {
      preferences.travelStyle = preferences.travelStyle.filter(style => validTravelStyles.includes(style));
    }
    
    // Ensure food preferences are valid
    if (preferences.foodPreferences && Array.isArray(preferences.foodPreferences)) {
      preferences.foodPreferences = preferences.foodPreferences.filter(pref => validFoodPreferences.includes(pref));
    }
    
    // Ensure safety priority is within range
    if (preferences.safetyPriority) {
      preferences.safetyPriority = Math.min(Math.max(parseInt(preferences.safetyPriority), 1), 5);
    }

    // Merge with existing preferences to avoid overwriting unspecified fields
    const updatedPreferences = {
      ...user.preferences,
      ...preferences
    };

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences: updatedPreferences } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Create a group profile
// @route   POST /api/users/groups
// @access  Private
exports.createGroupProfile = async (req, res) => {
  const { name, members } = req.body;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const newGroup = {
      name,
      members
    };

    user.groupProfiles.unshift(newGroup);
    await user.save();

    res.json(user.groupProfiles);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Update a group profile
// @route   PUT /api/users/groups/:id
// @access  Private
exports.updateGroupProfile = async (req, res) => {
  const { name, members } = req.body;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find the group
    const groupIndex = user.groupProfiles.findIndex(
      group => group._id.toString() === req.params.id
    );

    if (groupIndex === -1) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    if (name) user.groupProfiles[groupIndex].name = name;
    if (members) user.groupProfiles[groupIndex].members = members;

    await user.save();

    res.json(user.groupProfiles);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};

// @desc    Delete a group profile
// @route   DELETE /api/users/groups/:id
// @access  Private
exports.deleteGroupProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find the group
    const groupIndex = user.groupProfiles.findIndex(
      group => group._id.toString() === req.params.id
    );

    if (groupIndex === -1) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    user.groupProfiles.splice(groupIndex, 1);
    await user.save();

    res.json(user.groupProfiles);
  } catch (err) {
    console.error('User registration error:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      // Check which field caused the duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        msg: `${field === 'username' ? 'Username' : 'Email'} already exists. Please choose a different one.`
      });
    }
    
    res.status(500).json({ msg: 'Server error during registration. Please try again.' });
  }
};
