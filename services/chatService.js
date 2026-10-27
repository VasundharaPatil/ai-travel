const Conversation = require('../models/Conversation');
const Trip = require('../models/Trip');
const User = require('../models/User');
const weatherService = require('./weatherService');
require('dotenv').config();
const { geminiConfig } = require('../config/gemini-config');

// Initialize Gemini model for chat service
const geminiModel = geminiConfig.getModel('gemini-2.5-flash');

/**
 * Chat Service for handling AI-powered travel assistant conversations
 */
class ChatService {
  constructor() {
    this.cache = {}; // Simple in-memory cache for travel information
    this.cacheTTL = 86400000; // 24 hours in milliseconds
  }
  
  /**
   * Get all conversations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of conversations
   */
  async getConversations(userId) {
    try {
      const conversations = await Conversation.find({ user: userId })
        .sort({ updatedAt: -1 })
        .populate('tripContext', 'title destination startDate endDate');
      return conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }
  
  /**
   * Get a conversation by ID
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Conversation object
   */
  async getConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('tripContext', 'title destination startDate endDate travelers budget');
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Verify user owns the conversation
      if (conversation.user.toString() !== userId) {
        throw new Error('Not authorized to access this conversation');
      }
      
      return conversation;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }
  
  /**
   * Create a new conversation
   * @param {string} userId - User ID
   * @param {string} title - Conversation title
   * @param {string} tripContextId - Trip ID for context (optional)
   * @returns {Promise<Object>} - New conversation object
   */
  async createConversation(userId, title, tripContextId = null) {
    try {
      // Create conversation object
      const conversationData = {
        user: userId,
        title,
        messages: [],
      };
      
      // Add trip context if provided
      if (tripContextId) {
        const trip = await Trip.findById(tripContextId);
        if (trip && trip.user.toString() === userId) {
          conversationData.tripContext = trip._id;
        }
      }
      
      // Create and save new conversation
      const conversation = new Conversation(conversationData);
      await conversation.save();
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Update a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated conversation
   */
  async updateConversation(conversationId, userId, updateData) {
    try {
      // Find conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Verify user owns the conversation
      if (conversation.user.toString() !== userId) {
        throw new Error('Not authorized to update this conversation');
      }
      
      // Update allowed fields
      if (updateData.title) {
        conversation.title = updateData.title;
      }
      
      // Update trip context if provided
      if (updateData.tripContext) {
        const trip = await Trip.findById(updateData.tripContext);
        if (trip && trip.user.toString() === userId) {
          conversation.tripContext = trip._id;
        }
      }
      
      // Save updated conversation
      await conversation.save();
      
      return conversation;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Delete a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteConversation(conversationId, userId) {
    try {
      // Find conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Verify user owns the conversation
      if (conversation.user.toString() !== userId) {
        throw new Error('Not authorized to delete this conversation');
      }
      
      // Delete conversation
      await Conversation.findByIdAndDelete(conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
  
  /**
   * Add a message to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} - Added message
   */
  async addMessageToConversation(conversationId, userId, messageData) {
    try {
      // Find conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Verify user owns the conversation
      if (conversation.user.toString() !== userId) {
        throw new Error('Not authorized to access this conversation');
      }
      
      // Create message object
      const message = {
        role: messageData.role,
        content: messageData.content,
        timestamp: Date.now()
      };
      
      // Add message to conversation
      conversation.messages.push(message);
      
      // Update conversation timestamp
      conversation.updatedAt = Date.now();
      
      // Save conversation
      await conversation.save();
      
      return message;
    } catch (error) {
      console.error('Error adding message to conversation:', error);
      throw error;
    }
  }

  /**
   * Process a user message and generate an AI response
   * @param {string} userId - User ID
   * @param {string} chatId - Chat ID (optional, for existing conversations)
   * @param {string} message - User message
   * @param {Object} context - Additional context (optional)
   * @returns {Promise<Object>} - Chat response
   */
  async processMessage(userId, chatId, message, context = {}) {
    try {
      let chat;

      // Get or create chat
      if (chatId) {
        chat = await Chat.findById(chatId);
        if (!chat) {
          throw new Error('Chat not found');
        }
        
        // Verify user owns the chat
        if (chat.user.toString() !== userId) {
          throw new Error('Not authorized to access this chat');
        }
      } else {
        // Create a new chat
        chat = new Chat({
          user: userId,
          title: this.generateChatTitle(message),
          messages: [],
          context: {}
        });
      }

      // Update chat context if provided
      if (context.tripId) {
        const trip = await Trip.findById(context.tripId);
        if (trip && trip.user.toString() === userId) {
          chat.trip = trip._id;
          chat.context.activeTrip = trip._id;
          chat.context.activeDestination = trip.destination;
          chat.context.travelDates = {
            startDate: trip.startDate,
            endDate: trip.endDate
          };
        }
      }

      // Add user message to chat
      chat.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
        context: {
          location: context.location || chat.context.activeDestination,
          tripStage: context.tripStage || null
        }
      });

      // Generate AI response
      const aiResponse = await this.generateAIResponse(chat, message);

      // Add AI response to chat
      chat.messages.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: Date.now(),
        context: aiResponse.context || {}
      });

      // Update chat title for new chats
      if (!chatId) {
        chat.title = this.generateChatTitle(message);
      }

      // Save chat
      await chat.save();

      return {
        chatId: chat._id,
        title: chat.title,
        message: aiResponse.content,
        context: aiResponse.context
      };
    } catch (error) {
      console.error('Error processing chat message:', error);
      throw error;
    }
  }

  /**
   * Generate an AI response for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} userMessage - User message
   * @returns {Promise<Object>} - AI response
   */
  async generateAIResponse(conversationId, userId, userMessage) {
    try {
      // Find conversation
      const conversation = await Conversation.findById(conversationId)
        .populate('tripContext', 'title destination startDate endDate travelers budget')
        .populate('user', 'preferences');
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Verify user owns the conversation
      if (conversation.user._id.toString() !== userId) {
        throw new Error('Not authorized to access this conversation');
      }
      
      // Using Google's Gemini API with hardcoded key
      try {
        // Gemini API is already initialized at the top of the file
        console.log('Using Google Gemini API for response generation');
      } catch (error) {
        console.log('Error with Gemini API, using fallback response');
        const fallbackResponse = {
          role: 'assistant',
          content: "I'm sorry, I'm not able to process your request at the moment. Please try again later.",
          timestamp: Date.now()
        };
        
        // Add response to conversation
        conversation.messages.push(fallbackResponse);
        conversation.updatedAt = Date.now();
        await conversation.save();
        
        return fallbackResponse;
      }
      
      // Prepare context for the AI
      let contextInfo = '';
      let tripInfo = '';

      if (conversation.tripContext) {
        const trip = conversation.tripContext;
        tripInfo = `\nActive Trip Information:\n- Destination: ${trip.destination}\n- Dates: ${new Date(trip.startDate).toLocaleDateString()} to ${new Date(trip.endDate).toLocaleDateString()}\n`;
        
        if (trip.budget && trip.budget.total) {
          tripInfo += `- Budget: ${trip.budget.total} ${trip.budget.currency || 'INR'}\n`;
        }
        
        if (trip.travelers) {
          tripInfo += `- Travelers: ${trip.travelers.adults || 1} adults`;
          if (trip.travelers.children > 0) {
            tripInfo += `, ${trip.travelers.children} children`;
          }
          tripInfo += '\n';
        }
      }

      const user = conversation.user;
      if (user && user.preferences) {
        contextInfo = '\nUser Preferences:';
        
        if (user.preferences.travelStyle && user.preferences.travelStyle.length > 0) {
          contextInfo += `\n- Travel Style: ${user.preferences.travelStyle.join(', ')}`;
        }
        
        if (user.preferences.foodPreferences && user.preferences.foodPreferences.length > 0) {
          contextInfo += `\n- Food Preferences: ${user.preferences.foodPreferences.join(', ')}`;
        } else {
          contextInfo += '\n- Food Preferences: No specific preferences';
        }
        
        if (user.preferences.accessibility) {
          contextInfo += '\n- Accessibility Needs: Yes';
        }
        
        if (user.preferences.petFriendly) {
          contextInfo += '\n- Pet Friendly: Yes';
        }
        
        contextInfo += '\n';
      }

      // Prepare conversation history (last 10 messages max)
      const conversationHistory = conversation.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add system message at the beginning
      const systemMessage = {
        role: 'system',
        content: `You are an AI-powered travel assistant helping with travel planning, information, and recommendations. ${tripInfo}${contextInfo}\n\nProvide helpful, concise responses about travel destinations, visa requirements, local customs, transportation options, and travel tips. If you don't know something specific, be honest about it. Always prioritize user safety and provide practical advice.`
      };

      // Detect if the message is about weather
      const isWeatherQuery = this.isWeatherRelated(userMessage);
      let weatherInfo = '';

      if (isWeatherQuery && conversation.tripContext && conversation.tripContext.destination) {
        try {
          const destination = conversation.tripContext.destination;
          const weatherData = await weatherService.getCurrentWeather(destination);
          
          if (weatherData) {
            weatherInfo = `\nCurrent Weather in ${destination}:\n- Temperature: ${weatherData.temperature}°C\n- Conditions: ${weatherData.conditions}\n- Description: ${weatherData.description}\n`;
          }

          // If trip dates are in the future, add forecast
          if (conversation.tripContext.startDate && conversation.tripContext.endDate) {
            const startDate = new Date(conversation.tripContext.startDate);
            const endDate = new Date(conversation.tripContext.endDate);
            const now = new Date();

            if (startDate > now) {
              const forecast = await weatherService.getForecast(
                destination,
                startDate,
                endDate
              );

              if (forecast && forecast.length > 0) {
                weatherInfo += '\nWeather Forecast for your trip:\n';
                forecast.forEach(day => {
                  weatherInfo += `- ${new Date(day.date).toLocaleDateString()}: ${day.temperature.min}-${day.temperature.max}°C, ${day.conditions}\n`;
                });
              }
            }
          }

          // Add weather info to system message
          if (weatherInfo) {
            systemMessage.content += weatherInfo;
          }
        } catch (weatherError) {
          console.error('Error fetching weather for chat:', weatherError);
        }
      }

      // Detect if the message is about visa requirements
      const isVisaQuery = this.isVisaRelated(userMessage);
      if (isVisaQuery && chat.context.activeDestination) {
        try {
          const visaInfo = await this.getVisaInformation(user.preferences.nationality, chat.context.activeDestination);
          if (visaInfo) {
            systemMessage.content += `\nVisa Information for ${chat.context.activeDestination}:\n${visaInfo}\n`;
          }
        } catch (visaError) {
          console.error('Error fetching visa information for chat:', visaError);
        }
      }

      // Detect if the message is about currency or money
      const isCurrencyQuery = this.isCurrencyRelated(message);
      if (isCurrencyQuery && chat.context.activeDestination) {
        try {
          const currencyInfo = await this.getCurrencyInformation(chat.context.activeDestination);
          if (currencyInfo) {
            systemMessage.content += `\nCurrency Information for ${chat.context.activeDestination}:\n${currencyInfo}\n`;
          }
        } catch (currencyError) {
          console.error('Error fetching currency information for chat:', currencyError);
        }
      }

      // Prepare prompt for Gemini
      let fullPrompt = systemMessage.content + '\n\n';
      
      // Add conversation history
      conversationHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      
      // Add current user message
      fullPrompt += `User: ${userMessage}\n\nAssistant: `;

      // Call Gemini API
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      
      // Extract response
      const responseContent = response.text();

      // Create AI response message
      const aiResponse = {
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now()
      };
      
      // Add response to conversation
      conversation.messages.push(aiResponse);
      conversation.updatedAt = Date.now();
      await conversation.save();
      
      return aiResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Create fallback response
      const fallbackResponse = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: Date.now()
      };
      
      // Add fallback response to conversation
      conversation.messages.push(fallbackResponse);
      conversation.updatedAt = Date.now();
      await conversation.save();
      
      return fallbackResponse;
    }
  }

  /**
   * Generate a title for a new chat based on the first message
   * @param {string} message - First user message
   * @returns {string} - Generated title
   */
  generateChatTitle(message) {
    // Truncate message if too long
    const truncatedMessage = message.length > 30 ? message.substring(0, 30) + '...' : message;
    return `Chat about: ${truncatedMessage}`;
  }

  /**
   * Check if a message is related to weather
   * @param {string} message - User message
   * @returns {boolean} - True if weather related
   */
  isWeatherRelated(message) {
    const weatherKeywords = ['weather', 'temperature', 'rain', 'sunny', 'forecast', 'climate', 'hot', 'cold', 'warm', 'cool', 'humidity'];
    const lowerMessage = message.toLowerCase();
    return weatherKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if a message is related to visa requirements
   * @param {string} message - User message
   * @returns {boolean} - True if visa related
   */
  isVisaRelated(message) {
    const visaKeywords = ['visa', 'passport', 'entry requirement', 'travel document', 'border', 'immigration', 'customs'];
    const lowerMessage = message.toLowerCase();
    return visaKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if a message is related to currency or money
   * @param {string} message - User message
   * @returns {boolean} - True if currency related
   */
  isCurrencyRelated(message) {
    const currencyKeywords = ['currency', 'money', 'exchange rate', 'cash', 'atm', 'credit card', 'payment', 'dollar', 'euro', 'pound', 'yen'];
    const lowerMessage = message.toLowerCase();
    return currencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Get visa information for a nationality and destination
   * @param {string} nationality - User's nationality
   * @param {string} destination - Destination country
   * @returns {Promise<string>} - Visa information
   */
  async getVisaInformation(nationality, destination) {
    // In a real implementation, this would call an external API
    // For this implementation, we'll use a simple cache and mock data
    
    const cacheKey = `visa_${nationality}_${destination}`;
    
    // Check cache
    if (this.cache[cacheKey] && this.cache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
      return this.cache[cacheKey].data;
    }
    
    // Mock visa information
    // In a real implementation, this would be fetched from an API
    const visaInfo = `- This is simplified visa information for demonstration purposes.\n- Travelers from most countries need a valid passport.\n- Visa requirements vary based on nationality and purpose of visit.\n- Always check with the embassy or official government websites for the most accurate information.`;
    
    // Cache the result
    this.cache[cacheKey] = {
      data: visaInfo,
      timestamp: Date.now()
    };
    
    return visaInfo;
  }

  /**
   * Get currency information for a destination
   * @param {string} destination - Destination country or city
   * @returns {Promise<string>} - Currency information
   */
  async getCurrencyInformation(destination) {
    // In a real implementation, this would call an external API
    // For this implementation, we'll use a simple cache and mock data
    
    const cacheKey = `currency_${destination}`;
    
    // Check cache
    if (this.cache[cacheKey] && this.cache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
      return this.cache[cacheKey].data;
    }
    
    // Mock currency information
    // In a real implementation, this would be fetched from an API
    const currencyInfo = `- This is simplified currency information for demonstration purposes.\n- Major credit cards are widely accepted in most tourist areas.\n- It's advisable to carry some local currency for small purchases and in rural areas.\n- ATMs are generally available in urban areas and tourist destinations.`;
    
    // Cache the result
    this.cache[cacheKey] = {
      data: currencyInfo,
      timestamp: Date.now()
    };
    
    return currencyInfo;
  }

  /**
   * Get all chats for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of chats
   */
  async getUserChats(userId) {
    try {
      const chats = await Chat.find({ user: userId })
        .sort({ updatedAt: -1 })
        .select('title updatedAt messages');

      return chats.map(chat => ({
        id: chat._id,
        title: chat.title,
        lastMessage: chat.messages.length > 0 ? 
          chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...' : 
          'No messages',
        messageCount: chat.messages.length,
        updatedAt: chat.updatedAt
      }));
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }

  /**
   * Get a chat by ID
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Chat object
   */
  async getChatById(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId)
        .populate('trip', 'destination startDate endDate');

      if (!chat) {
        throw new Error('Chat not found');
      }

      // Verify user owns the chat
      if (chat.user.toString() !== userId) {
        throw new Error('Not authorized to access this chat');
      }

      return chat;
    } catch (error) {
      console.error('Error getting chat by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteChat(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        throw new Error('Chat not found');
      }

      // Verify user owns the chat
      if (chat.user.toString() !== userId) {
        throw new Error('Not authorized to delete this chat');
      }

      await chat.remove();
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
