const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['destination', 'activity', 'accommodation', 'restaurant', 'transport'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  location: {
    name: String,
    country: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  images: [String],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  price: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    category: {
      type: String,
      enum: ['budget', 'moderate', 'luxury']
    }
  },
  season: [{
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter']
  }],
  tags: [String],
  sustainabilityScore: {
    type: Number,
    min: 1,
    max: 5
  },
  safetyScore: {
    type: Number,
    min: 1,
    max: 5
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    hearingAccessible: Boolean,
    visuallyAccessible: Boolean
  },
  petFriendly: Boolean,
  familyFriendly: Boolean,
  relevanceScore: Number, // AI-calculated score based on user preferences
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
