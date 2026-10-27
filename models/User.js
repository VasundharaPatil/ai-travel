const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    travelStyle: [{
      type: String,
      enum: ['adventure', 'luxury', 'cultural', 'relaxation', 'budget']
    }],
    foodPreferences: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'no-restrictions']
    }],
    accessibility: {
      type: Boolean,
      default: false
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    safetyPriority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  },
  groupProfiles: [{
    name: String,
    members: [{
      name: String,
      preferences: {
        travelStyle: [String],
        foodPreferences: [String],
        accessibility: Boolean,
        petFriendly: Boolean,
        safetyPriority: Number
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
