const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      },
      status: {
        type: String,
        enum: ['invited', 'active', 'inactive'],
        default: 'invited'
      },
      dateAdded: {
        type: Date,
        default: Date.now
      }
    }
  ],
  preferences: {
    travelStyle: {
      type: [String],
      enum: ['adventure', 'luxury', 'cultural', 'relaxation', 'budget'],
      default: ['cultural']
    },
    foodPreferences: {
      type: [String],
      enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'no-restrictions'],
      default: ['no-restrictions']
    },
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
    },
    childFriendly: {
      type: Boolean,
      default: false
    },
    seniorFriendly: {
      type: Boolean,
      default: false
    }
  },
  trips: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'trip'
    }
  ],
  inviteCode: {
    type: String,
    unique: true
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Generate a random invite code before saving
GroupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    // Generate a random 8-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.inviteCode = code;
  }
  next();
});

// Method to check if a user is a member of the group
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    member.status === 'active'
  );
};

// Method to check if a user is an admin of the group
GroupSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    member.role === 'admin' && 
    member.status === 'active'
  ) || this.creator.toString() === userId.toString();
};

// Method to calculate aggregated preferences based on all active members
GroupSchema.methods.calculateAggregatedPreferences = function() {
  // Get all active members
  const activeMembers = this.members.filter(member => member.status === 'active');
  
  // If no active members, return the default preferences
  if (activeMembers.length === 0) {
    return this.preferences;
  }
  
  // Count preferences across all members
  const travelStyleCounts = {};
  const foodPreferencesCounts = {};
  let accessibilityCount = 0;
  let petFriendlyCount = 0;
  let safetyPrioritySum = 0;
  let childFriendlyCount = 0;
  let seniorFriendlyCount = 0;
  
  // This would need to fetch user data for each member to get their preferences
  // For simplicity, we're just using the group's preferences here
  // In a real implementation, you would query the database for each member's preferences
  
  // Calculate aggregated preferences
  const aggregatedPreferences = {
    travelStyle: this.preferences.travelStyle,
    foodPreferences: this.preferences.foodPreferences,
    accessibility: this.preferences.accessibility,
    petFriendly: this.preferences.petFriendly,
    safetyPriority: this.preferences.safetyPriority,
    childFriendly: this.preferences.childFriendly,
    seniorFriendly: this.preferences.seniorFriendly
  };
  
  return aggregatedPreferences;
};

module.exports = mongoose.model('group', GroupSchema);
