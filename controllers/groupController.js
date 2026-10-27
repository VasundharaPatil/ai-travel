const Group = require('../models/Group');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { validationResult } = require('express-validator');

// @desc    Create a new travel group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, preferences } = req.body;

  try {
    // Create a new group
    const newGroup = new Group({
      name,
      description,
      creator: req.user.id,
      members: [{
        user: req.user.id,
        role: 'admin',
        status: 'active'
      }]
    });

    // Add preferences if provided
    if (preferences) {
      // Validate travel styles
      if (preferences.travelStyle) {
        const validTravelStyles = ['adventure', 'luxury', 'cultural', 'relaxation', 'budget'];
        const filteredTravelStyles = preferences.travelStyle.filter(style => 
          validTravelStyles.includes(style)
        );
        if (filteredTravelStyles.length > 0) {
          newGroup.preferences.travelStyle = filteredTravelStyles;
        }
      }

      // Validate food preferences
      if (preferences.foodPreferences) {
        const validFoodPreferences = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'no-restrictions'];
        const filteredFoodPreferences = preferences.foodPreferences.filter(pref => 
          validFoodPreferences.includes(pref)
        );
        if (filteredFoodPreferences.length > 0) {
          newGroup.preferences.foodPreferences = filteredFoodPreferences;
        }
      }

      // Set other preferences
      if (typeof preferences.accessibility === 'boolean') {
        newGroup.preferences.accessibility = preferences.accessibility;
      }
      if (typeof preferences.petFriendly === 'boolean') {
        newGroup.preferences.petFriendly = preferences.petFriendly;
      }
      if (preferences.safetyPriority >= 1 && preferences.safetyPriority <= 5) {
        newGroup.preferences.safetyPriority = preferences.safetyPriority;
      }
      // Sustainability removed
      if (typeof preferences.childFriendly === 'boolean') {
        newGroup.preferences.childFriendly = preferences.childFriendly;
      }
      if (typeof preferences.seniorFriendly === 'boolean') {
        newGroup.preferences.seniorFriendly = preferences.seniorFriendly;
      }
    }

    await newGroup.save();

    res.json(newGroup);
  } catch (err) {
    console.error('Error creating group:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all groups for the current user
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    // Find all groups where the user is a member
    const groups = await Group.find({
      'members.user': req.user.id
    }).populate('creator', 'name email');

    res.json(groups);
  } catch (err) {
    console.error('Error getting groups:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a group by ID
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email')
      .populate('trips');

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.isMember(req.user.id) && group.creator.id !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (err) {
    console.error('Error getting group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update a group
// @route   PUT /api/groups/:id
// @access  Private
exports.updateGroup = async (req, res) => {
  const { name, description, preferences } = req.body;

  try {
    let group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to update this group' });
    }

    // Update basic info
    if (name) group.name = name;
    if (description) group.description = description;

    // Update preferences if provided
    if (preferences) {
      // Validate travel styles
      if (preferences.travelStyle) {
        const validTravelStyles = ['adventure', 'luxury', 'cultural', 'relaxation', 'budget'];
        const filteredTravelStyles = preferences.travelStyle.filter(style => 
          validTravelStyles.includes(style)
        );
        if (filteredTravelStyles.length > 0) {
          group.preferences.travelStyle = filteredTravelStyles;
        }
      }

      // Validate food preferences
      if (preferences.foodPreferences) {
        const validFoodPreferences = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'no-restrictions'];
        const filteredFoodPreferences = preferences.foodPreferences.filter(pref => 
          validFoodPreferences.includes(pref)
        );
        if (filteredFoodPreferences.length > 0) {
          group.preferences.foodPreferences = filteredFoodPreferences;
        }
      }

      // Set other preferences
      if (typeof preferences.accessibility === 'boolean') {
        group.preferences.accessibility = preferences.accessibility;
      }
      if (typeof preferences.petFriendly === 'boolean') {
        group.preferences.petFriendly = preferences.petFriendly;
      }
      if (preferences.safetyPriority >= 1 && preferences.safetyPriority <= 5) {
        group.preferences.safetyPriority = preferences.safetyPriority;
      }
      // Sustainability removed
      if (typeof preferences.childFriendly === 'boolean') {
        group.preferences.childFriendly = preferences.childFriendly;
      }
      if (typeof preferences.seniorFriendly === 'boolean') {
        group.preferences.seniorFriendly = preferences.seniorFriendly;
      }
    }

    // Update last active timestamp
    group.lastActive = Date.now();

    await group.save();

    res.json(group);
  } catch (err) {
    console.error('Error updating group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is the creator of the group
    if (group.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this group' });
    }

    await group.remove();

    res.json({ msg: 'Group removed' });
  } catch (err) {
    console.error('Error deleting group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Invite a user to a group
// @route   POST /api/groups/:id/invite
// @access  Private
exports.inviteToGroup = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required' });
  }

  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to invite to this group' });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ msg: 'User is already a member of this group' });
    }

    // Add user to members with invited status
    group.members.push({
      user: user._id,
      role: 'member',
      status: 'invited',
      dateAdded: Date.now()
    });

    await group.save();

    // TODO: Send invitation email to user

    res.json({ msg: 'Invitation sent', group });
  } catch (err) {
    console.error('Error inviting to group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Join a group with invite code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroup = async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ msg: 'Invite code is required' });
  }

  try {
    // Find group by invite code
    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({ msg: 'Invalid invite code' });
    }

    // Check if user is already a member
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.user.id
    );

    if (memberIndex !== -1) {
      // User is already a member, update status to active if not already
      if (group.members[memberIndex].status !== 'active') {
        group.members[memberIndex].status = 'active';
        await group.save();
      }
      return res.json({ msg: 'You are now an active member of this group', group });
    }

    // Add user to members with active status
    group.members.push({
      user: req.user.id,
      role: 'member',
      status: 'active',
      dateAdded: Date.now()
    });

    await group.save();

    res.json({ msg: 'Successfully joined the group', group });
  } catch (err) {
    console.error('Error joining group:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Leave a group
// @route   PUT /api/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.user.id
    );

    if (memberIndex === -1) {
      return res.status(400).json({ msg: 'You are not a member of this group' });
    }

    // Check if user is the creator
    if (group.creator.toString() === req.user.id) {
      return res.status(400).json({ 
        msg: 'Group creator cannot leave. Please delete the group or transfer ownership first.' 
      });
    }

    // Remove user from members
    group.members.splice(memberIndex, 1);

    await group.save();

    res.json({ msg: 'Successfully left the group' });
  } catch (err) {
    console.error('Error leaving group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update member role
// @route   PUT /api/groups/:id/members/:userId
// @access  Private
exports.updateMemberRole = async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'member'].includes(role)) {
    return res.status(400).json({ msg: 'Valid role is required' });
  }

  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to update member roles' });
    }

    // Find the member
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.params.userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ msg: 'Member not found' });
    }

    // Update member role
    group.members[memberIndex].role = role;

    await group.save();

    res.json({ msg: 'Member role updated', group });
  } catch (err) {
    console.error('Error updating member role:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or member not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Remove a member from a group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to remove members' });
    }

    // Check if trying to remove the creator
    if (group.creator.toString() === req.params.userId) {
      return res.status(400).json({ msg: 'Cannot remove the group creator' });
    }

    // Find the member
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.params.userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ msg: 'Member not found' });
    }

    // Remove the member
    group.members.splice(memberIndex, 1);

    await group.save();

    res.json({ msg: 'Member removed', group });
  } catch (err) {
    console.error('Error removing member:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or member not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Get group preferences
// @route   GET /api/groups/:id/preferences
// @access  Private
exports.getGroupPreferences = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.isMember(req.user.id) && group.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to view group preferences' });
    }

    // Get aggregated preferences
    const aggregatedPreferences = group.calculateAggregatedPreferences();

    res.json({
      groupPreferences: group.preferences,
      aggregatedPreferences
    });
  } catch (err) {
    console.error('Error getting group preferences:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Add a trip to a group
// @route   PUT /api/groups/:id/trips/:tripId
// @access  Private
exports.addTripToGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const trip = await Trip.findById(req.params.tripId);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    if (!trip) {
      return res.status(404).json({ msg: 'Trip not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to add trips to this group' });
    }

    // Check if user owns the trip
    if (trip.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to add this trip' });
    }

    // Check if trip is already in the group
    if (group.trips.includes(req.params.tripId)) {
      return res.status(400).json({ msg: 'Trip is already in this group' });
    }

    // Add trip to group
    group.trips.push(req.params.tripId);

    await group.save();

    res.json({ msg: 'Trip added to group', group });
  } catch (err) {
    console.error('Error adding trip to group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or trip not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Remove a trip from a group
// @route   DELETE /api/groups/:id/trips/:tripId
// @access  Private
exports.removeTripFromGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.isAdmin(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to remove trips from this group' });
    }

    // Check if trip is in the group
    const tripIndex = group.trips.indexOf(req.params.tripId);
    if (tripIndex === -1) {
      return res.status(400).json({ msg: 'Trip is not in this group' });
    }

    // Remove trip from group
    group.trips.splice(tripIndex, 1);

    await group.save();

    res.json({ msg: 'Trip removed from group', group });
  } catch (err) {
    console.error('Error removing trip from group:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or trip not found' });
    }
    res.status(500).send('Server error');
  }
};
