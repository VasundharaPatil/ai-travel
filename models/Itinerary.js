const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['sightseeing', 'food', 'adventure', 'relaxation', 'cultural', 'shopping', 'transport', 'accommodation'],
    default: 'sightseeing'
  },
  startTime: {
    type: String,
    get: function(v) {
      // Return as is if it's a string
      return v;
    },
    set: function(v) {
      // If it's a Date object, convert to string
      if (v instanceof Date) {
        return v.toISOString();
      }
      // Otherwise return as is
      return v;
    }
  },
  endTime: {
    type: String,
    get: function(v) {
      // Return as is if it's a string
      return v;
    },
    set: function(v) {
      // If it's a Date object, convert to string
      if (v instanceof Date) {
        return v.toISOString();
      }
      // Otherwise return as is
      return v;
    }
  },
  duration: {
    type: Number, // Duration in minutes
    default: 120
  },
  cost: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  location: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      }
    },
    address: {
      type: String
    }
  },
  bookingStatus: {
    type: String,
    enum: ['booked', 'not-booked', 'in-progress'],
    default: 'not-booked'
  },
  weatherSensitive: {
    type: Boolean,
    default: false
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    hearingAccessible: Boolean,
    visuallyAccessible: Boolean
  }
});

const dayPlanSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  activities: [activitySchema],
  notes: String,
  weatherForecast: {
    temperature: Number,
    conditions: String,
    precipitation: Number
  },
  totalDayCost: Number
});

const itinerarySchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  theme: {
    type: String,
    enum: ['relaxation', 'adventure', 'cultural', 'food-tour', 'family-friendly', 'budget', 'luxury', 'custom'],
    default: 'custom'
  },
  days: [dayPlanSchema],
  totalCost: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

itinerarySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total cost from all activities
  let totalCost = 0;
  this.days.forEach(day => {
    let dayTotal = 0;
    day.activities.forEach(activity => {
      if (activity.cost && activity.cost.amount) {
        dayTotal += activity.cost.amount;
      }
    });
    day.totalDayCost = dayTotal;
    totalCost += dayTotal;
  });
  this.totalCost = totalCost;
  
  next();
});

module.exports = mongoose.model('Itinerary', itinerarySchema);
