// Main JavaScript for the Travel Planner App

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initNavigation();
    initSearchFunctionality();
    initCTAButtons();
    
    // Add smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
        });
    });
}

// Search functionality
function initSearchFunctionality() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-container .btn');
    
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', function() {
            const destination = searchInput.value.trim();
            if (destination) {
                // In a real app, this would navigate to a trip planning page
                // For now, just show an alert
                alert(`Starting to plan your trip to ${destination}! This would navigate to the trip planning page in the full app.`);
            } else {
                searchInput.placeholder = 'Please enter a destination';
                searchInput.classList.add('error');
                setTimeout(() => {
                    searchInput.classList.remove('error');
                    searchInput.placeholder = 'Where do you want to go?';
                }, 2000);
            }
        });
        
        // Allow pressing Enter to search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
}

// CTA Buttons functionality
function initCTAButtons() {
    const ctaButtons = document.querySelectorAll('.cta .btn, .user-actions .btn');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            
            if (buttonText === 'Sign In' || buttonText === 'Sign Up') {
                // In a real app, this would open a sign-in/sign-up modal or navigate to auth pages
                alert(`This would open the ${buttonText} form in the full app.`);
            } else if (buttonText === 'Get Started for Free') {
                // In a real app, this would navigate to the registration page
                alert('This would navigate to the registration page in the full app.');
            }
        });
    });
}

// Simulated API call function (for demonstration)
async function fetchFromAPI(endpoint, params = {}) {
    // This is a placeholder for actual API calls
    console.log(`Fetching from ${endpoint} with params:`, params);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data based on the endpoint
    switch (endpoint) {
        case 'destinations':
            return [
                { id: 1, name: 'Paris, France', image: 'paris.jpg', description: 'The City of Light' },
                { id: 2, name: 'Tokyo, Japan', image: 'tokyo.jpg', description: 'A blend of traditional and ultramodern' },
                { id: 3, name: 'New York, USA', image: 'newyork.jpg', description: 'The Big Apple' },
                { id: 4, name: 'Bali, Indonesia', image: 'bali.jpg', description: 'Island paradise' }
            ];
        
        case 'activities':
            return [
                { id: 1, name: 'Museum Tour', duration: '3 hours', price: '$25' },
                { id: 2, name: 'Food Tasting', duration: '2 hours', price: '$40' },
                { id: 3, name: 'Hiking Adventure', duration: '5 hours', price: '$30' },
                { id: 4, name: 'Historical Walk', duration: '2 hours', price: '$15' }
            ];
            
        default:
            return [];
    }
}

// Weather forecast simulation
function getWeatherForecast(destination, date) {
    // This would be replaced with a real weather API call
    const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy'];
    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 10; // Random temperature between 10-40°C
    
    return {
        destination,
        date,
        condition: randomCondition,
        temperature: randomTemp,
        humidity: Math.floor(Math.random() * 50) + 30 // Random humidity between 30-80%
    };
}

// Budget calculation functions
const budgetCalculator = {
    calculateTotalCost: function(accommodation, activities, transportation, food) {
        return accommodation + activities + transportation + food;
    },
    
    estimateDailyCost: function(destination, travelStyle = 'moderate') {
        // This would be replaced with real data in a production app
        const costEstimates = {
            'Paris': { budget: 100, moderate: 200, luxury: 400 },
            'Tokyo': { budget: 120, moderate: 220, luxury: 450 },
            'New York': { budget: 150, moderate: 300, luxury: 600 },
            'Bali': { budget: 50, moderate: 100, luxury: 250 }
        };
        
        // Default to moderate cost for unknown destinations
        const defaultCost = { budget: 80, moderate: 150, luxury: 300 };
        
        // Find the destination (partial match)
        const destinationKey = Object.keys(costEstimates).find(key => 
            destination.toLowerCase().includes(key.toLowerCase())
        );
        
        const costData = destinationKey ? costEstimates[destinationKey] : defaultCost;
        return costData[travelStyle] || costData.moderate;
    }
};

// AI recommendation simulation
function generateRecommendations(preferences) {
    // This would be replaced with actual AI-based recommendations
    console.log('Generating recommendations based on preferences:', preferences);
    
    // Simulate processing time
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                destinations: [
                    { name: 'Kyoto, Japan', match: '95%', reason: 'Matches your cultural interests' },
                    { name: 'Barcelona, Spain', match: '92%', reason: 'Food preferences and architecture' },
                    { name: 'Vancouver, Canada', match: '88%', reason: 'Outdoor activities and sustainability' }
                ],
                activities: [
                    { name: 'Local Cooking Class', match: '96%', reason: 'Food preferences' },
                    { name: 'Historical Walking Tour', match: '94%', reason: 'Interest in culture' },
                    { name: 'Nature Photography', match: '90%', reason: 'Outdoor activities' }
                ]
            });
        }, 1500);
    });
}
