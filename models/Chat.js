const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trip'
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [
    {
      role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      context: {
        location: String,
        tripStage: {
          type: String,
          enum: ['planning', 'booking', 'during-trip', 'post-trip', null],
          default: null
        },
        relatedEntities: [
          {
            type: {
              type: String,
              enum: ['destination', 'activity', 'accommodation', 'transport', 'restaurant']
            },
            id: mongoose.Schema.Types.ObjectId,
            name: String
          }
        ]
      }
    }
  ],
  context: {
    activeTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'trip'
    },
    activeDestination: String,
    travelDates: {
      startDate: Date,
      endDate: Date
    },
    preferences: {
      travelStyle: [String],
      budget: String,
      interests: [String]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
ChatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('chat', ChatSchema);
