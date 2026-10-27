/**
 * Sustainability Service for scoring and recommending eco-friendly travel options
 */
class SustainabilityService {
  constructor() {
    // Sustainability scoring weights
    this.weights = {
      transport: 0.4,  // Transport has the highest impact
      accommodation: 0.3,
      activities: 0.2,
      food: 0.1
    };
    
    // Cache for storing sustainability data
    this.cache = {};
    this.cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  /**
   * Calculate sustainability score for a transport option
   * @param {string} type - Transport type (flight, train, bus, car, etc.)
   * @param {number} distance - Distance in kilometers
   * @param {Object} options - Additional options
   * @returns {number} - Sustainability score (1-5)
   */
  calculateTransportScore(type, distance, options = {}) {
    // Base scores for different transport types (1-5, 5 being most sustainable)
    const baseScores = {
      'walking': 5,
      'cycling': 5,
      'electric-scooter': 4.5,
      'public-transit': 4,
      'train': 4,
      'bus': 3.5,
      'ferry': 3,
      'shared-car': 3,
      'electric-car': 3,
      'car': 2,
      'taxi': 2,
      'flight': 1
    };

    // Get base score for transport type
    let score = baseScores[type.toLowerCase()] || 2.5;

    // Adjust score based on distance
    if (type.toLowerCase() === 'flight') {
      // Short flights are less efficient per km than long flights
      if (distance < 500) {
        score -= 0.5;
      } else if (distance > 3000) {
        score += 0.5;
      }
    }

    // Adjust for additional options
    if (options.electric && ['car', 'taxi', 'scooter'].includes(type.toLowerCase())) {
      score += 1;
    }
    if (options.shared && ['car', 'taxi'].includes(type.toLowerCase())) {
      score += 0.5;
    }
    if (options.biofuel && ['flight', 'bus', 'ferry'].includes(type.toLowerCase())) {
      score += 0.5;
    }

    // Ensure score is within 1-5 range
    return Math.max(1, Math.min(5, score));
  }

  /**
   * Calculate sustainability score for accommodation
   * @param {string} type - Accommodation type
   * @param {Object} features - Sustainability features
   * @returns {number} - Sustainability score (1-5)
   */
  calculateAccommodationScore(type, features = {}) {
    // Base scores for different accommodation types
    const baseScores = {
      'eco-lodge': 4.5,
      'hostel': 3.5,
      'apartment': 3,
      'guesthouse': 3,
      'hotel': 2.5,
      'resort': 2
    };

    // Get base score for accommodation type
    let score = baseScores[type.toLowerCase()] || 2.5;

    // Adjust for sustainability features
    if (features.ecoCertified) score += 0.5;
    if (features.renewableEnergy) score += 0.5;
    if (features.waterConservation) score += 0.3;
    if (features.wasteReduction) score += 0.3;
    if (features.locallyOwned) score += 0.5;
    if (features.organicFood) score += 0.3;

    // Ensure score is within 1-5 range
    return Math.max(1, Math.min(5, score));
  }

  /**
   * Calculate sustainability score for an activity
   * @param {string} type - Activity type
   * @param {Object} options - Additional options
   * @returns {number} - Sustainability score (1-5)
   */
  calculateActivityScore(type, options = {}) {
    // Base scores for different activity types
    const baseScores = {
      'hiking': 5,
      'cycling': 5,
      'swimming': 4.5,
      'wildlife-watching': 4.5,
      'cultural-tour': 4,
      'museum': 4,
      'local-market': 4,
      'food-tour': 3.5,
      'boat-tour': 3,
      'safari': 2.5,
      'helicopter-tour': 1,
      'jet-ski': 1
    };

    // Get base score for activity type
    let score = baseScores[type.toLowerCase()] || 3;

    // Adjust for additional options
    if (options.locallyOwned) score += 0.5;
    if (options.conservationFocus) score += 1;
    if (options.educationalValue) score += 0.5;
    if (options.motorized && !['helicopter-tour', 'jet-ski'].includes(type.toLowerCase())) {
      score -= 1;
    }

    // Ensure score is within 1-5 range
    return Math.max(1, Math.min(5, score));
  }

  /**
   * Calculate overall sustainability score for a trip
   * @param {Object} trip - Trip object with transport, accommodation, and activities
   * @returns {number} - Overall sustainability score (1-5)
   */
  calculateTripScore(trip) {
    let transportScore = 0;
    let accommodationScore = 0;
    let activitiesScore = 0;
    let foodScore = 3; // Default food score

    // Calculate transport score
    if (trip.transport && trip.transport.length > 0) {
      transportScore = trip.transport.reduce((sum, t) => {
        return sum + (t.sustainabilityScore || this.calculateTransportScore(t.type, t.distance, t.options));
      }, 0) / trip.transport.length;
    }

    // Calculate accommodation score
    if (trip.accommodation && trip.accommodation.length > 0) {
      accommodationScore = trip.accommodation.reduce((sum, a) => {
        return sum + (a.sustainabilityScore || this.calculateAccommodationScore(a.type, a.features));
      }, 0) / trip.accommodation.length;
    }

    // Calculate activities score
    if (trip.activities && trip.activities.length > 0) {
      activitiesScore = trip.activities.reduce((sum, a) => {
        return sum + (a.sustainabilityScore || this.calculateActivityScore(a.type, a.options));
      }, 0) / trip.activities.length;
    }

    // Calculate weighted average
    const weightedScore = (
      transportScore * this.weights.transport +
      accommodationScore * this.weights.accommodation +
      activitiesScore * this.weights.activities +
      foodScore * this.weights.food
    );

    return weightedScore;
  }

  /**
   * Calculate carbon footprint for a transport option
   * @param {string} type - Transport type
   * @param {number} distance - Distance in kilometers
   * @param {Object} options - Additional options
   * @returns {number} - Carbon footprint in kg CO2
   */
  calculateTransportCarbonFootprint(type, distance, options = {}) {
    // Average carbon emissions per passenger kilometer (in kg CO2)
    const emissionsFactors = {
      'walking': 0,
      'cycling': 0,
      'electric-scooter': 0.02,
      'public-transit': 0.04,
      'train': 0.06,
      'bus': 0.1,
      'ferry': 0.12,
      'shared-car': 0.07,
      'electric-car': 0.05,
      'car': 0.17,
      'taxi': 0.17,
      'flight': 0.25
    };

    // Get emissions factor for transport type
    let factor = emissionsFactors[type.toLowerCase()] || 0.15;

    // Adjust for additional options
    if (options.electric && ['car', 'taxi', 'scooter'].includes(type.toLowerCase())) {
      factor *= 0.3; // 70% reduction for electric vehicles
    }
    if (options.shared && ['car', 'taxi'].includes(type.toLowerCase())) {
      factor /= options.passengers || 2; // Divide by number of passengers
    }
    if (options.biofuel && ['flight', 'bus', 'ferry'].includes(type.toLowerCase())) {
      factor *= 0.8; // 20% reduction for biofuel
    }

    // Calculate total carbon footprint
    return factor * distance;
  }

  /**
   * Calculate carbon footprint for accommodation
   * @param {string} type - Accommodation type
   * @param {number} nights - Number of nights
   * @param {Object} features - Sustainability features
   * @returns {number} - Carbon footprint in kg CO2
   */
  calculateAccommodationCarbonFootprint(type, nights, features = {}) {
    // Average carbon emissions per room per night (in kg CO2)
    const emissionsFactors = {
      'eco-lodge': 5,
      'hostel': 8,
      'apartment': 10,
      'guesthouse': 12,
      'hotel': 15,
      'resort': 25
    };

    // Get emissions factor for accommodation type
    let factor = emissionsFactors[type.toLowerCase()] || 15;

    // Adjust for sustainability features
    if (features.ecoCertified) factor *= 0.8;
    if (features.renewableEnergy) factor *= 0.7;
    if (features.waterConservation) factor *= 0.9;
    if (features.wasteReduction) factor *= 0.9;

    // Calculate total carbon footprint
    return factor * nights;
  }

  /**
   * Calculate carbon footprint for an activity
   * @param {string} type - Activity type
   * @param {Object} options - Additional options
   * @returns {number} - Carbon footprint in kg CO2
   */
  calculateActivityCarbonFootprint(type, options = {}) {
    // Base carbon footprints for different activity types (in kg CO2)
    const baseFootprints = {
      'hiking': 0.1,
      'cycling': 0.2,
      'swimming': 0.5,
      'wildlife-watching': 1,
      'cultural-tour': 2,
      'museum': 1,
      'local-market': 1,
      'food-tour': 2,
      'boat-tour': 5,
      'safari': 10,
      'helicopter-tour': 50,
      'jet-ski': 15
    };

    // Get base footprint for activity type
    let footprint = baseFootprints[type.toLowerCase()] || 3;

    // Adjust for additional options
    if (options.motorized && !['helicopter-tour', 'jet-ski'].includes(type.toLowerCase())) {
      footprint *= 2;
    }

    return footprint;
  }
  
  /**
   * Get sustainable transport alternatives
   * @param {string} type - Current transport type
   * @param {number} distance - Distance in kilometers
   * @param {string} origin - Origin location
   * @param {string} destination - Destination location
   * @returns {Array} - Array of sustainable transport alternatives
   */
  getSustainableTransportAlternatives(type, distance, origin, destination) {
    // Cache key based on parameters
    const cacheKey = `transport_${origin}_${destination}_${distance}`;
    
    // Check cache
    if (this.cache[cacheKey] && this.cache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
      return this.cache[cacheKey].data;
    }
    
    // Generate sustainable alternatives based on distance
    const alternatives = [];
    
    // Long distance (typically flight)
    if (distance > 500) {
      alternatives.push({
        type: 'train',
        name: 'High-Speed Train',
        description: 'Travel by train instead of flying to reduce carbon emissions by up to 90%',
        carbonReduction: 80,
        sustainabilityScore: 4,
        travelTime: Math.round(distance / 100) + ' hours',  // Rough estimate
        costComparison: 'Similar or slightly higher than flying',
        benefits: ['Reduced carbon footprint', 'More comfortable seating', 'Scenic views', 'No airport security lines']
      });
      
      alternatives.push({
        type: 'bus',
        name: 'Express Coach',
        description: 'Long-distance bus services offer a low-carbon alternative to flying',
        carbonReduction: 70,
        sustainabilityScore: 4.5,
        travelTime: Math.round(distance / 60) + ' hours',  // Rough estimate
        costComparison: 'Usually cheaper than flying',
        benefits: ['Significantly lower emissions', 'Budget-friendly', 'WiFi and amenities available']
      });
      
      alternatives.push({
        type: 'carpool',
        name: 'Carpool/Rideshare',
        description: 'Share a ride with others heading to the same destination',
        carbonReduction: 60,
        sustainabilityScore: 3.5,
        travelTime: Math.round(distance / 70) + ' hours',  // Rough estimate
        costComparison: 'Much cheaper than flying',
        benefits: ['Split fuel costs', 'Reduced per-person emissions', 'Flexible schedule']
      });
    }
    // Medium distance
    else if (distance > 100) {
      alternatives.push({
        type: 'train',
        name: 'Passenger Train',
        description: 'Trains produce significantly less emissions than cars or planes',
        carbonReduction: 70,
        sustainabilityScore: 4.5,
        travelTime: Math.round(distance / 80) + ' hours',
        costComparison: 'Comparable to driving',
        benefits: ['Relax during travel', 'Work or read en route', 'No parking hassles']
      });
      
      alternatives.push({
        type: 'bus',
        name: 'Intercity Bus',
        description: 'Modern buses are efficient and comfortable for medium distances',
        carbonReduction: 60,
        sustainabilityScore: 4,
        travelTime: Math.round(distance / 60) + ' hours',
        costComparison: 'Usually cheaper than driving alone',
        benefits: ['No driving stress', 'Reduced emissions', 'Affordable option']
      });
      
      alternatives.push({
        type: 'electric-car',
        name: 'Electric Vehicle',
        description: 'If driving is necessary, consider renting an electric vehicle',
        carbonReduction: 50,
        sustainabilityScore: 3.5,
        travelTime: Math.round(distance / 90) + ' hours',
        costComparison: 'Similar to conventional car rental plus charging',
        benefits: ['Zero direct emissions', 'Quiet ride', 'Latest technology']
      });
    }
    // Short distance
    else {
      alternatives.push({
        type: 'bicycle',
        name: 'Cycling',
        description: 'For shorter trips, cycling is emission-free and healthy',
        carbonReduction: 100,
        sustainabilityScore: 5,
        travelTime: Math.round(distance / 15) + ' hours',
        costComparison: 'Free (if you have a bike)',
        benefits: ['Zero emissions', 'Physical exercise', 'No traffic jams', 'No parking costs']
      });
      
      alternatives.push({
        type: 'public-transit',
        name: 'Public Transit',
        description: 'Local buses, trams, or metros are efficient for city travel',
        carbonReduction: 80,
        sustainabilityScore: 4.5,
        travelTime: Math.round(distance / 30) + ' hours',
        costComparison: 'Much cheaper than driving and parking',
        benefits: ['Reduced traffic congestion', 'No parking hassles', 'Reduced emissions']
      });
      
      alternatives.push({
        type: 'walking',
        name: 'Walking',
        description: 'For very short distances, walking is the most sustainable option',
        carbonReduction: 100,
        sustainabilityScore: 5,
        travelTime: Math.round(distance / 5) + ' hours',
        costComparison: 'Free',
        benefits: ['Zero emissions', 'Health benefits', 'Experience the local area']
      });
    }
    
    // Add destination-specific options
    if (destination.toLowerCase() === 'goa') {
      alternatives.push({
        type: 'ferry',
        name: 'Coastal Ferry',
        description: 'Take a scenic ferry along the coast to Goa',
        carbonReduction: 50,
        sustainabilityScore: 3.5,
        travelTime: '8-10 hours',
        costComparison: 'Moderate',
        benefits: ['Scenic coastal views', 'Relaxing journey', 'Unique experience']
      });
    }
    
    // Cache the results
    this.cache[cacheKey] = {
      data: alternatives,
      timestamp: Date.now()
    };
    
    return alternatives;
  }

  /**
   * Get sustainable accommodation options
   * @param {string} destination - Destination location
   * @param {string} currentType - Current accommodation type
   * @returns {Promise<Array>} - Array of sustainable accommodation options
   */
  async getSustainableAccommodations(destination, currentType = null) {
    // In a real implementation, this would call an external API
    // For this implementation, we'll use a simple cache and mock data
    
    const cacheKey = `eco_accommodation_${destination}`;
    
    // Check cache
    if (this.cache[cacheKey] && this.cache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
      return this.cache[cacheKey].data;
    }
    
    // Mock sustainable accommodation options
    // In a real implementation, these would be fetched from an API
    const accommodations = [
      {
        type: 'eco-lodge',
        name: 'Green Haven Eco-Lodge',
        description: 'Sustainable lodge with solar power and rainwater harvesting',
        features: {
          ecoCertified: true,
          renewableEnergy: true,
          waterConservation: true,
          wasteReduction: true,
          locallyOwned: true
        },
        sustainabilityScore: 5,
        priceCategory: 'moderate'
      },
      {
        type: 'hostel',
        name: 'EcoStay Hostel',
        description: 'Environmentally conscious hostel with community focus',
        features: {
          ecoCertified: true,
          renewableEnergy: false,
          waterConservation: true,
          wasteReduction: true,
          locallyOwned: true
        },
        sustainabilityScore: 4,
        priceCategory: 'budget'
      },
      {
        type: 'hotel',
        name: 'Green Leaf Hotel',
        description: 'Eco-certified hotel with sustainable practices',
        features: {
          ecoCertified: true,
          renewableEnergy: true,
          waterConservation: true,
          wasteReduction: false,
          locallyOwned: false
        },
        sustainabilityScore: 4,
        priceCategory: 'moderate'
      },
      {
        type: 'guesthouse',
        name: 'Local Family Guesthouse',
        description: 'Stay with a local family in their eco-friendly home',
        features: {
          ecoCertified: false,
          renewableEnergy: false,
          waterConservation: true,
          wasteReduction: true,
          locallyOwned: true
        },
        sustainabilityScore: 4.5,
        priceCategory: 'budget'
      },
      {
        type: 'apartment',
        name: 'Sustainable City Apartment',
        description: 'Self-catering apartment with energy-efficient appliances',
        features: {
          ecoCertified: false,
          renewableEnergy: true,
          waterConservation: true,
          wasteReduction: true,
          locallyOwned: true
        },
        sustainabilityScore: 3.5,
        priceCategory: 'moderate'
      }
    ];
    
    // Add destination-specific options
    if (destination.toLowerCase() === 'goa') {
      accommodations.push({
        type: 'eco-resort',
        name: 'Goa Green Beach Resort',
        description: 'Beachfront eco-resort with sustainable practices',
        features: {
          ecoCertified: true,
          renewableEnergy: true,
          waterConservation: true,
          wasteReduction: true,
          locallyOwned: false
        },
        sustainabilityScore: 4,
        priceCategory: 'premium'
      });
    }
    
    // Cache the results
    this.cache[cacheKey] = {
      data: accommodations,
      timestamp: Date.now()
    };
    
    return accommodations;
  }

  /**
   * Get sustainable activity options
   * @param {string} destination - Destination location
   * @param {string} currentType - Current activity type
   * @returns {Promise<Array>} - Array of sustainable activity options
   */
  async getSustainableActivities(destination, currentType = null) {
    // In a real implementation, this would call an external API
    // For this implementation, we'll use a simple cache and mock data
    
    const cacheKey = `eco_activities_${destination}`;
    
    // Check cache
    if (this.cache[cacheKey] && this.cache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
      return this.cache[cacheKey].data;
    }
    
    // Mock sustainable activity options
    // In a real implementation, these would be fetched from an API
    const activities = [
      {
        type: 'hiking',
        name: 'Nature Reserve Trail Hike',
        description: 'Guided hike through protected natural areas',
        options: {
          locallyOwned: true,
          conservationFocus: true,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 5,
        priceCategory: 'budget'
      },
      {
        type: 'cycling',
        name: 'City Bike Tour',
        description: 'Explore the city on a bicycle with a local guide',
        options: {
          locallyOwned: true,
          conservationFocus: false,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 5,
        priceCategory: 'budget'
      },
      {
        type: 'cultural-tour',
        name: 'Local Heritage Walk',
        description: 'Walking tour of cultural and historical sites with local guides',
        options: {
          locallyOwned: true,
          conservationFocus: false,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 4.5,
        priceCategory: 'budget'
      },
      {
        type: 'wildlife-watching',
        name: 'Responsible Wildlife Observation',
        description: 'Observe local wildlife with certified eco-guides',
        options: {
          locallyOwned: true,
          conservationFocus: true,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 4.5,
        priceCategory: 'moderate'
      },
      {
        type: 'food-tour',
        name: 'Local Food Experience',
        description: 'Sample local cuisine made with locally-sourced ingredients',
        options: {
          locallyOwned: true,
          conservationFocus: false,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 4,
        priceCategory: 'moderate'
      }
    ];
    
    // Add destination-specific options
    if (destination.toLowerCase() === 'goa') {
      activities.push({
        type: 'beach-cleanup',
        name: 'Community Beach Cleanup',
        description: 'Join locals in cleaning up beaches and learn about marine conservation',
        options: {
          locallyOwned: true,
          conservationFocus: true,
          educationalValue: true,
          motorized: false
        },
        sustainabilityScore: 5,
        priceCategory: 'free'
      });
    }
    
    // Cache the results
    this.cache[cacheKey] = {
      data: activities,
      timestamp: Date.now()
    };
    
    return activities;
  }

  /**
   * Get sustainability tips for a destination
   * @param {string} destination - Destination location
   * @returns {Promise<Array>} - Array of sustainability tips
   */
  async getSustainabilityTips(destination) {
    // General sustainability tips
    const generalTips = [
      'Bring a reusable water bottle and shopping bag to reduce plastic waste',
      'Choose walking, cycling, or public transport whenever possible',
      'Support locally-owned businesses and restaurants',
      'Respect local customs and wildlife by maintaining a safe distance',
      'Conserve water and energy by taking shorter showers and turning off lights',
      'Use reef-safe sunscreen if swimming in oceans or lakes',
      'Offset your carbon footprint through verified carbon offset programs',
      'Participate in local conservation efforts or beach cleanups',
      'Choose accommodations with eco-certifications or sustainable practices',
      'Eat local, seasonal, and plant-based foods when possible'
    ];
    
    // Destination-specific tips
    const destinationTips = {
      'goa': [
        'Respect marine life by not touching coral or feeding fish',
        'Choose eco-friendly water activities like kayaking instead of jet skis',
        'Support local artisans by purchasing handmade souvenirs',
        'Participate in beach cleanup initiatives that run regularly',
        'Visit organic spice farms and support sustainable agriculture'
      ],
      'mumbai': [
        'Use the extensive local train network instead of taxis',
        'Visit urban gardens and eco-initiatives like Mahim Nature Park',
        'Support restaurants that source ingredients locally',
        'Choose walking tours to explore historic neighborhoods',
        'Visit during non-peak seasons to reduce overtourism impact'
      ],
      'delhi': [
        'Use the metro system to reduce air pollution from road transport',
        'Visit sustainable markets like Dilli Haat for eco-friendly crafts',
        'Choose accommodations with water conservation practices',
        'Support restaurants serving local, seasonal North Indian cuisine',
        'Visit eco-parks and protected urban green spaces'
      ]
    };
    
    // Combine general tips with destination-specific tips
    let tips = [...generalTips];
    
    const destinationLower = destination.toLowerCase().split(',')[0].trim();
    if (destinationTips[destinationLower]) {
      tips = [...destinationTips[destinationLower], ...generalTips];
    }
    
    // Shuffle and return a subset of tips
    return this.shuffleArray(tips).slice(0, 5);
  }

  /**
   * Calculate total carbon footprint for a trip
   * @param {Object} trip - Trip object with transport, accommodation, and activities
   * @returns {Object} - Carbon footprint breakdown
   */
  calculateCarbonFootprint(trip) {
    let transportFootprint = 0;
    let accommodationFootprint = 0;
    let activitiesFootprint = 0;
    let foodFootprint = 0;
    
    // Calculate transport footprint
    if (trip.transport && trip.transport.length > 0) {
      transportFootprint = trip.transport.reduce((sum, t) => {
        return sum + this.calculateTransportCarbonFootprint(t.type, t.distance, t.options);
      }, 0);
    }
    
    // Calculate accommodation footprint
    // Estimate trip duration in nights
    const tripDuration = trip.endDate && trip.startDate ? 
      Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) : 7;
    
    if (trip.accommodation && trip.accommodation.length > 0) {
      accommodationFootprint = trip.accommodation.reduce((sum, a) => {
        return sum + this.calculateAccommodationCarbonFootprint(a.type, tripDuration, a.features);
      }, 0);
    }
    
    // Calculate activities footprint
    if (trip.activities && trip.activities.length > 0) {
      activitiesFootprint = trip.activities.reduce((sum, a) => {
        return sum + this.calculateActivityCarbonFootprint(a.type, a.options);
      }, 0);
    }
    
    // Estimate food footprint based on trip duration
    // Average carbon footprint per person per day for food (in kg CO2)
    const foodEmissionPerDay = 4; // Global average
    foodFootprint = foodEmissionPerDay * tripDuration;
    
    // Calculate total footprint
    const totalFootprint = transportFootprint + accommodationFootprint + activitiesFootprint + foodFootprint;
    
    // Calculate trees needed to offset (1 tree absorbs about 25kg CO2 per year)
    const treesNeeded = Math.ceil(totalFootprint / 25);
    
    return {
      total: totalFootprint,
      breakdown: {
        transport: transportFootprint,
        accommodation: accommodationFootprint,
        activities: activitiesFootprint,
        food: foodFootprint
      },
      treesNeeded
    };
  }

  /**
   * Shuffle an array (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

module.exports = new SustainabilityService();
