const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const groupController = require('../controllers/groupController');

// @route   POST /api/groups
// @desc    Create a new travel group
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Group name is required').not().isEmpty()
    ]
  ],
  groupController.createGroup
);

// @route   GET /api/groups
// @desc    Get all groups for the current user
// @access  Private
router.get('/', auth, groupController.getGroups);

// @route   GET /api/groups/:id
// @desc    Get a group by ID
// @access  Private
router.get('/:id', auth, groupController.getGroupById);

// @route   PUT /api/groups/:id
// @desc    Update a group
// @access  Private
router.put('/:id', auth, groupController.updateGroup);

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private
router.delete('/:id', auth, groupController.deleteGroup);

// @route   POST /api/groups/:id/invite
// @desc    Invite a user to a group
// @access  Private
router.post(
  '/:id/invite',
  [
    auth,
    [
      check('email', 'Email is required').isEmail()
    ]
  ],
  groupController.inviteToGroup
);

// @route   POST /api/groups/join
// @desc    Join a group with invite code
// @access  Private
router.post(
  '/join',
  [
    auth,
    [
      check('inviteCode', 'Invite code is required').not().isEmpty()
    ]
  ],
  groupController.joinGroup
);

// @route   PUT /api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.put('/:id/leave', auth, groupController.leaveGroup);

// @route   PUT /api/groups/:id/members/:userId
// @desc    Update member role
// @access  Private
router.put('/:id/members/:userId', auth, groupController.updateMemberRole);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove a member from a group
// @access  Private
router.delete('/:id/members/:userId', auth, groupController.removeMember);

// @route   GET /api/groups/:id/preferences
// @desc    Get group preferences
// @access  Private
router.get('/:id/preferences', auth, groupController.getGroupPreferences);

// @route   PUT /api/groups/:id/trips/:tripId
// @desc    Add a trip to a group
// @access  Private
router.put('/:id/trips/:tripId', auth, groupController.addTripToGroup);

// @route   DELETE /api/groups/:id/trips/:tripId
// @desc    Remove a trip from a group
// @access  Private
router.delete('/:id/trips/:tripId', auth, groupController.removeTripFromGroup);

module.exports = router;
