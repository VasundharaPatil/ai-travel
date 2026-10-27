const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Trip = require('./models/Trip');
const Itinerary = require('./models/Itinerary');
const Recommendation = require('./models/Recommendation');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Trip.deleteMany({});
    await Itinerary.deleteMany({});
    await Recommendation.deleteMany({});

    console.log('Cleared existing data');

    // Create sample user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      preferences: {
        travelStyle: ['adventure', 'cultural'],
        foodPreferences: ['vegetarian'],
        accessibility: false,
        petFriendly: true,
        safetyPriority: 4
      },
      groupProfiles: [
        {
          name: 'Family Trip',
          members: [
            {
              name: 'Partner',
              preferences: {
                travelStyle: ['relaxation', 'cultural'],
                foodPreferences: ['no-restrictions'],
                accessibility: false,
                petFriendly: true,
                safetyPriority: 5
              }
            },
            {
              name: 'Child',
              preferences: {
                travelStyle: ['adventure'],
                foodPreferences: ['no-restrictions'],
                accessibility: false,
                petFriendly: true,
                safetyPriority: 5
              }
            }
          ]
        }
      ]
    });

    const savedUser = await user.save();
    console.log('Created sample user');

    // Create sample trip
    const trip = new Trip({
      user: savedUser._id,
      title: 'Summer Vacation in Japan',
      destination: 'Tokyo, Japan',
      startDate: new Date('2025-07-10'),
      endDate: new Date('2025-07-20'),
      budget: {
        total: 5000,
        perPerson: 2500,
        breakdown: {
          transport: 1500,
          accommodation: 2000,
          food: 800,
          activities: 500,
          other: 200
        },
        currency: 'INR'
      },
      travelers: {
        adults: 2,
        children: 0
      },
      preferences: {
        travelStyle: ['cultural', 'adventure'],
        foodPreferences: ['vegetarian'],
        accessibility: false,
        petFriendly: false
      },
      status: 'planning'
    });

    const savedTrip = await trip.save();
    console.log('Created sample trip');

    // Create sample itinerary
    const startDate = new Date('2025-07-10');
    const endDate = new Date('2025-07-20');
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const days = [];
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      days.push({
        date: currentDate,
        activities: [
          {
            title: i === 0 ? 'Arrive at Narita Airport' : `Day ${i+1} Morning Activity`,
            description: i === 0 ? 'Arrival and transfer to hotel' : `Explore local attractions on day ${i+1}`,
            location: {
              name: 'Tokyo',
              coordinates: {
                latitude: 35.6762,
                longitude: 139.6503
              },
              address: 'Tokyo, Japan'
            },
            category: i === 0 ? 'transport' : 'sightseeing',
            startTime: new Date(`2025-07-${10+i}T10:00:00`),
            endTime: new Date(`2025-07-${10+i}T12:00:00`),
            duration: 120,
            cost: {
              amount: i === 0 ? 100 : 50,
              currency: 'INR'
            },
            bookingStatus: 'not-booked',
            weatherSensitive: false
          },
          {
            title: `Day ${i+1} Afternoon Activity`,
            description: `Enjoy local cuisine and culture on day ${i+1}`,
            location: {
              name: 'Tokyo',
              coordinates: {
                latitude: 35.6762,
                longitude: 139.6503
              },
              address: 'Tokyo, Japan'
            },
            category: 'food',
            startTime: new Date(`2025-07-${10+i}T14:00:00`),
            endTime: new Date(`2025-07-${10+i}T16:00:00`),
            duration: 120,
            cost: {
              amount: 60,
              currency: 'INR'
            },
            bookingStatus: 'not-booked',
            weatherSensitive: false
          }
        ],
        notes: `Day ${i+1} of Tokyo adventure`,
        weatherForecast: {
          temperature: 28,
          conditions: 'Sunny',
          precipitation: 10
        },
        totalDayCost: i === 0 ? 160 : 110
      });
    }

    const itinerary = new Itinerary({
      trip: savedTrip._id,
      theme: 'cultural',
      days,
      totalCost: 1270
    });

    const savedItinerary = await itinerary.save();
    console.log('Created sample itinerary');

    // Update trip with itinerary reference
    savedTrip.itinerary = savedItinerary._id;
    await savedTrip.save();

    // Create sample recommendations
    const recommendations = [
      {
        user: savedUser._id,
        type: 'destination',
        title: 'Kyoto, Japan',
        description: 'Historic city with beautiful temples and traditional culture',
        location: {
          name: 'Kyoto',
          country: 'Japan',
          city: 'Kyoto',
          coordinates: {
            latitude: 35.0116,
            longitude: 135.7681
          }
        },
        images: ['kyoto1.jpg', 'kyoto2.jpg'],
        rating: 4.8,
        price: {
          amount: 0,
          currency: 'INR',
          category: 'moderate'
        },
        season: ['spring', 'fall'],
        tags: ['cultural', 'historic', 'temples', 'traditional'],
        sustainabilityScore: 4,
        safetyScore: 5,
        accessibility: {
          wheelchairAccessible: true,
          hearingAccessible: true,
          visuallyAccessible: true
        },
        petFriendly: false,
        familyFriendly: true,
        relevanceScore: 95
      },
      {
        user: savedUser._id,
        type: 'activity',
        title: 'Tokyo Food Tour',
        description: 'Explore the culinary delights of Tokyo with a local guide',
        location: {
          name: 'Tokyo',
          country: 'Japan',
          city: 'Tokyo',
          coordinates: {
            latitude: 35.6762,
            longitude: 139.6503
          }
        },
        images: ['food-tour.jpg'],
        rating: 4.7,
        price: {
          amount: 120,
          currency: 'INR',
          category: 'moderate'
        },
        season: ['spring', 'summer', 'fall', 'winter'],
        tags: ['food', 'cultural', 'guided-tour', 'local-experience'],
        
        safetyScore: 5,
        accessibility: {
          wheelchairAccessible: true,
          hearingAccessible: true,
          visuallyAccessible: true
        },
        petFriendly: false,
        familyFriendly: true,
        relevanceScore: 90
      },
      {
        user: savedUser._id,
        type: 'accommodation',
        title: 'Eco-Friendly Ryokan',
        description: 'Traditional Japanese inn with modern eco-friendly amenities',
        location: {
          name: 'Tokyo',
          country: 'Japan',
          city: 'Tokyo',
          coordinates: {
            latitude: 35.6762,
            longitude: 139.6503
          }
        },
        images: ['ryokan.jpg'],
        rating: 4.6,
        price: {
          amount: 200,
          currency: 'INR',
          category: 'luxury'
        },
        season: ['spring', 'summer', 'fall', 'winter'],
        tags: ['traditional', 'eco-friendly', 'authentic', 'cultural'],
        sustainabilityScore: 5,
        safetyScore: 5,
        accessibility: {
          wheelchairAccessible: true,
          hearingAccessible: true,
          visuallyAccessible: true
        },
        petFriendly: false,
        familyFriendly: true,
        relevanceScore: 85
      }
    ];

    await Recommendation.insertMany(recommendations);
    console.log('Created sample recommendations');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

// Run the seed function
seedData();
