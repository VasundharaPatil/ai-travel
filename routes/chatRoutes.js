const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// @route   GET /api/chat/conversations
// @desc    Get all conversations for a user
// @access  Private
router.get('/conversations', auth, chatController.getConversations);

// @route   GET /api/chat/conversations/:id
// @desc    Get a conversation by ID
// @access  Private
router.get('/conversations/:id', auth, chatController.getConversation);

// @route   POST /api/chat/conversations
// @desc    Create a new conversation
// @access  Private
router.post(
  '/conversations',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  chatController.createConversation
);

// @route   PUT /api/chat/conversations/:id
// @desc    Update a conversation
// @access  Private
router.put('/conversations/:id', auth, chatController.updateConversation);

// @route   DELETE /api/chat/conversations/:id
// @desc    Delete a conversation
// @access  Private
router.delete('/conversations/:id', auth, chatController.deleteConversation);

// @route   POST /api/chat/conversations/:id/messages
// @desc    Send a message to a conversation
// @access  Private
router.post(
  '/conversations/:id/messages',
  [
    auth,
    [
      check('content', 'Message content is required').not().isEmpty(),
      check('role', 'Message role is required').not().isEmpty()
    ]
  ],
  chatController.sendMessage
);

module.exports = router;
