const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    total: {
      type: Number,
      required: true
    },
    perPerson: {
      type: Number
    },
    breakdown: {
      transport: {
        type: Number,
        default: 0
      },
      accommodation: {
        type: Number,
        default: 0
      },
      food: {
        type: Number,
        default: 0
      },
      activities: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    },
    currency: {
      type: String,
      default: 'USD'
    },
    alerts: [
      {
        type: {
          type: String,
          enum: ['increase', 'decrease', 'opportunity', 'warning'],
          required: true
        },
        message: {
          type: String,
          required: true
        },
        date: {
          type: Date,
          default: Date.now
        },
        read: {
          type: Boolean,
          default: false
        }
      }
    ],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  travelers: {
    adults: {
      type: Number,
      default: 1
    },
    children: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    travelStyle: [String],
    foodPreferences: [String],
    accessibility: Boolean,
    petFriendly: Boolean
  },
  itinerary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary'
  },
  status: {
    type: String,
    enum: ['planning', 'booked', 'in-progress', 'completed', 'cancelled'],
    default: 'planning'
  },
  aiRecommendations: {
    activities: [{
      type: { type: String },
      description: { type: String }
    }],
    budget: [{
      type: { type: String },
      description: { type: String }
    }],
    time: [{
      type: { type: String },
      description: { type: String }
    }],
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Notes for the trip
  notes: [
    {
      title: { type: String, required: true },
      content: { type: String, required: true },
      category: {
        type: String,
        enum: ['general', 'transport', 'accommodation', 'activities', 'food', 'packing'],
        default: 'general'
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

tripSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Trip', tripSchema);
