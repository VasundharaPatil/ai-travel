const chatService = require('../services/chatService');
const { validationResult } = require('express-validator');

// @desc    Get all conversations for a user
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const conversations = await chatService.getConversations(req.user.id);
    res.json(conversations);
  } catch (err) {
    console.error('Error getting conversations:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Get a conversation by ID
// @route   GET /api/chat/conversations/:id
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const conversation = await chatService.getConversation(req.params.id, req.user.id);
    res.json(conversation);
  } catch (err) {
    console.error('Error getting conversation by ID:', err.message);
    if (err.message === 'Conversation not found' || err.message === 'Not authorized to access this conversation') {
      return res.status(404).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Create a new conversation
// @route   POST /api/chat/conversations
// @access  Private
exports.createConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, tripContext } = req.body;

  try {
    const conversation = await chatService.createConversation(
      req.user.id,
      title,
      tripContext
    );

    res.json(conversation);
  } catch (err) {
    console.error('Error creating conversation:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Update a conversation
// @route   PUT /api/chat/conversations/:id
// @access  Private
exports.updateConversation = async (req, res) => {
  try {
    const conversation = await chatService.updateConversation(
      req.params.id,
      req.user.id,
      req.body
    );

    res.json(conversation);
  } catch (err) {
    console.error('Error updating conversation:', err.message);
    if (err.message === 'Conversation not found' || err.message === 'Not authorized to update this conversation') {
      return res.status(404).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/chat/conversations/:id
// @access  Private
exports.deleteConversation = async (req, res) => {
  try {
    await chatService.deleteConversation(req.params.id, req.user.id);
    res.json({ msg: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Error deleting conversation:', err.message);
    if (err.message === 'Conversation not found' || err.message === 'Not authorized to delete this conversation') {
      return res.status(404).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// @desc    Send a message to a conversation
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, role } = req.body;
  const conversationId = req.params.id;

  try {
    // Add the user's message to the conversation
    const message = await chatService.addMessageToConversation(
      conversationId,
      req.user.id,
      { role, content }
    );

    // Generate AI response
    const reply = await chatService.generateAIResponse(
      conversationId,
      req.user.id,
      content
    );

    res.json({ message, reply });
  } catch (err) {
    console.error('Error sending message:', err.message);
    if (err.message === 'Conversation not found' || err.message === 'Not authorized to access this conversation') {
      return res.status(404).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
