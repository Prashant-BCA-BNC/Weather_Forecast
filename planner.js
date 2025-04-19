// API Key for OpenWeatherMap API
const API_KEY = "a2253a3e39bddcbae326acff50a2e65c";

// DOM Elements
const eventForm = document.getElementById('event-form');
const eventNameInput = document.getElementById('event-name');
const eventLocationInput = document.getElementById('event-location');
const eventDateInput = document.getElementById('event-date');
const eventTimeInput = document.getElementById('event-time');
const eventTypeInput = document.getElementById('event-type');
const eventWeatherResult = document.getElementById('event-weather-result');
const savedEventsContainer = document.getElementById('saved-events-container');
const loadingIndicator = document.querySelector('.loading');

// Load saved background
document.addEventListener('DOMContentLoaded', () => {
    const savedBg = localStorage.getItem('currentBackground');
    if (savedBg) {
        document.body.style.backgroundImage = savedBg;
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    eventDateInput.value = tomorrow.toISOString().split('T')[0];
    
    // Set default time
    eventTimeInput.value = '12:00';
    
    // Load saved events
    loadSavedEvents();
    
    // Event listeners
    eventForm.addEventListener('submit', handleEventSubmit);
    
    // Button event listeners
    document.getElementById('save-event-btn').addEventListener('click', saveEvent);
    document.getElementById('new-search-btn').addEventListener('click', () => {
        eventWeatherResult.style.display = 'none';
        eventForm.reset();
        
        // Reset to tomorrow's date
        eventDateInput.value = tomorrow.toISOString().split('T')[0];
        eventTimeInput.value = '12:00';
    });
});

// Event recommendation messages based on weather conditions
const weatherRecommendations = {
    clear: {
        outdoor: "Perfect clear skies for your outdoor event! Don't forget sunscreen and maybe set up some shade.",
        indoor: "It's a beautiful day outside, but your indoor event will be comfortable too! Consider opening windows for fresh air.",
        sports: "Ideal weather for sports! Clear skies mean great visibility and perfect conditions for outdoor activities.",
        picnic: "A gorgeous day for a picnic! Clear skies and sunshine make for perfect picnic weather.",
        travel: "Excellent clear conditions for traveling! Perfect visibility will make your journey pleasant.",
        other: "Beautiful clear weather for your event! The sky is smiling on your plans today."
    },
    clouds: {
        outdoor: "Partly cloudy conditions will provide nice shade for your outdoor event! Perfect for staying cool.",
        indoor: "Cloudy skies outside, but you'll be comfortable indoors! Your event will be cozy and pleasant.",
        sports: "Good conditions for sports activities with clouds providing some relief from direct sun.",
        picnic: "A nice day for a picnic with some cloud cover. Bring a light jacket just in case!",
        travel: "Decent travel conditions with some cloud cover. Visibility should be good for your journey.",
        other: "Pleasant cloudy weather for your event. Not too hot and comfortable conditions overall."
    },
    rain: {
        outdoor: "Rain is expected! Consider setting up tents or moving your outdoor event indoors if possible.",
        indoor: "Rainy day outside, but your indoor event will be cozy and dry! The rain sounds will add a nice ambiance.",
        sports: "Rain expected - might need to reschedule outdoor sports or prepare for wet conditions. Indoor activities recommended.",
        picnic: "Not ideal picnic weather with rain forecast. Perhaps consider a cozy indoor gathering instead!",
        travel: "Travel with caution as rain is expected. Allow extra time and drive carefully if going by car.",
        other: "Rain expected for your event. Perfect day for enjoying hot beverages and the cozy atmosphere!"
    },
    drizzle: {
        outdoor: "Light drizzle expected. A canopy or small tents would keep your outdoor event comfortable.",
        indoor: "Light drizzle outside, but perfectly dry indoors! Your event will be cozy and comfortable.",
        sports: "Light drizzle might affect outdoor sports - be prepared with appropriate gear or consider indoor alternatives.",
        picnic: "Light drizzle expected - bring a canopy or consider a sheltered picnic area.",
        travel: "Light drizzle forecasted for travel day. Shouldn't impact travel much, but pack a light raincoat.",
        other: "Light drizzle expected. A cozy atmosphere for your event and perfect for feeling refreshed!"
    },
    thunderstorm: {
        outdoor: "Thunderstorms expected! Strongly recommend moving your outdoor event indoors for safety.",
        indoor: "Thunderstorms forecasted outside, but you'll be safe and dry indoors. The dramatic weather might add atmosphere!",
        sports: "Thunderstorms expected - outdoor sports should be rescheduled for safety reasons.",
        picnic: "Thunderstorms are forecasted - not suitable for a picnic. Please consider rescheduling for safety.",
        travel: "Thunderstorms expected - consider rescheduling travel if possible or take extra precautions.",
        other: "Thunderstorms expected. Stay safe indoors and enjoy the dramatic weather from inside!"
    },
    snow: {
        outdoor: "Snowy conditions expected! Your outdoor event will have a magical winter atmosphere.",
        indoor: "Snow expected outside - your indoor event will be cozy and warm with beautiful snowy views!",
        sports: "Snow expected - perfect for winter sports, but regular sports might need to adapt or move indoors.",
        picnic: "Snow expected - consider turning your picnic into a winter wonderland experience with hot drinks!",
        travel: "Snowy conditions forecasted. Check road conditions and allow extra time for safe travel.",
        other: "Snow expected! Your event will have that magical winter atmosphere everyone loves."
    },
    mist: {
        outdoor: "Misty conditions expected - will add a mystical atmosphere to your outdoor event!",
        indoor: "Misty conditions outside will create a magical view from your indoor event space.",
        sports: "Misty conditions might limit visibility for some sports. Take appropriate precautions.",
        picnic: "Misty conditions expected - will create a magical atmosphere for your picnic!",
        travel: "Misty conditions forecasted. Drive carefully with reduced visibility and use appropriate lights.",
        other: "Misty conditions will add a magical, ethereal quality to your event day!"
    },
    default: "Whatever the weather, your event is sure to be wonderful! Make the most of the day."
};

// Handle event form submission
async function handleEventSubmit(e) {
    e.preventDefault();
    
    const eventName = eventNameInput.value.trim();
    const location = eventLocationInput.value.trim();
    const date = eventDateInput.value;
    const time = eventTimeInput.value;
    const eventType = eventTypeInput.value;
    
    if (!eventName || !location || !date || !time || !eventType) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        showLoading();
        
        // Get weather for the selected location and date
        const weatherData = await getWeatherForEvent(location, date);
        
        if (weatherData) {
            displayEventWeather(weatherData, {
                name: eventName,
                location: location,
                date: date,
                time: time,
                type: eventType
            });
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

// Get weather data for event
async function getWeatherForEvent(location, date) {
    try {
        // First get coordinates for the location
        const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`
        );
        
        if (!geoResponse.ok) {
            throw new Error('Location not found');
        }
        
        const geoData = await geoResponse.json();
        
        if (!geoData.length) {
            throw new Error('Location not found');
        }
        
        const { lat, lon } = geoData[0];
        
        // Calculate Unix timestamp for the selected date (noon)
        const eventDate = new Date(date);
        eventDate.setHours(12, 0, 0, 0);
        const timestamp = Math.floor(eventDate.getTime() / 1000);
        
        // Get forecast data
        // Try the One Call API 3.0 first, fall back to 5-day forecast if needed
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Find the forecast closest to the requested date
        const targetDate = new Date(date).setHours(0, 0, 0, 0);
        
        let closestForecast = null;
        let minTimeDiff = Infinity;
        
        forecastData.list.forEach(item => {
            const forecastDate = new Date(item.dt * 1000);
            const forecastDay = new Date(forecastDate).setHours(0, 0, 0, 0);
            
            if (forecastDay === targetDate) {
                const timeDiff = Math.abs(forecastDate - eventDate);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestForecast = item;
                }
            }
        });
        
        if (!closestForecast) {
            throw new Error('No forecast data available for the selected date. Please choose a date within the next 5 days.');
        }
        
        // Add location data to the forecast
        closestForecast.location = {
            name: geoData[0].name,
            country: geoData[0].country
        };
        
        return closestForecast;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

// Display event weather
function displayEventWeather(weatherData, eventDetails) {
    // Set event details
    document.getElementById('result-event-name').textContent = eventDetails.name;
    document.getElementById('result-location').textContent = `${weatherData.location.name}, ${weatherData.location.country}`;
    
    const formattedDate = new Date(`${eventDetails.date}T${eventDetails.time}`).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
    
    document.getElementById('result-datetime').textContent = formattedDate;
    
    // Convert event type value to display text
    const eventTypeDisplay = {
        outdoor: "Outdoor Activity",
        indoor: "Indoor Event",
        sports: "Sports",
        picnic: "Picnic",
        travel: "Travel",
        other: "Other"
    };
    
    document.getElementById('result-event-type').textContent = eventTypeDisplay[eventDetails.type] || eventDetails.type;
    
    // Set weather details
    document.getElementById('result-temperature').textContent = `${Math.round(weatherData.main.temp)}°C`;
    document.getElementById('result-weather-description').textContent = weatherData.weather[0].description;
    document.getElementById('result-humidity').textContent = `${weatherData.main.humidity}%`;
    document.getElementById('result-wind').textContent = `${(weatherData.wind.speed * 3.6).toFixed(1)} km/h`;
    
    // Set weather icon (using standard size without @2x for consistency)
    const iconUrl = `http://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`;
    document.getElementById('result-weather-icon').src = iconUrl;
    
    // Display recommendation based on weather and event type
    displayRecommendation(weatherData.weather[0].main.toLowerCase(), eventDetails.type);
    
    // Store the current weather data for saving
    document.querySelector('.event-weather-result').dataset.weatherData = JSON.stringify({
        temp: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon
    });
    
    // Show the result section
    eventWeatherResult.style.display = 'block';
    
    // Scroll to result
    eventWeatherResult.scrollIntoView({ behavior: 'smooth' });
}

// Display recommendation
function displayRecommendation(weatherCondition, eventType) {
    const weatherTypes = ['clear', 'clouds', 'rain', 'drizzle', 'thunderstorm', 'snow', 'mist'];
    const recommendationEl = document.getElementById('weather-recommendation');
    
    // Normalize weather condition
    let condition = 'default';
    for (const type of weatherTypes) {
        if (weatherCondition.includes(type)) {
            condition = type;
            break;
        }
    }
    
    // Get recommendation
    const recommendations = weatherRecommendations[condition] || {};
    const recommendation = recommendations[eventType] || weatherRecommendations.default;
    
    recommendationEl.textContent = recommendation;
    
    // Add icon based on recommendation sentiment
    if (condition === 'clear' || condition === 'clouds') {
        recommendationEl.innerHTML = `<span class="material-icons recommendation-icon positive">thumb_up</span> ${recommendation}`;
    } else if (condition === 'rain' || condition === 'drizzle') {
        recommendationEl.innerHTML = `<span class="material-icons recommendation-icon neutral">info</span> ${recommendation}`;
    } else if (condition === 'thunderstorm') {
        recommendationEl.innerHTML = `<span class="material-icons recommendation-icon negative">warning</span> ${recommendation}`;
    } else {
        recommendationEl.innerHTML = recommendation;
    }
}

// Save event
function saveEvent() {
    const eventName = document.getElementById('result-event-name').textContent;
    const location = document.getElementById('result-location').textContent;
    const datetime = document.getElementById('result-datetime').textContent;
    const eventType = document.getElementById('result-event-type').textContent;
    
    // Get weather data from the dataset
    const weatherData = JSON.parse(document.querySelector('.event-weather-result').dataset.weatherData);
    
    const eventData = {
        id: Date.now(), // Unique ID
        name: eventName,
        location: location,
        datetime: datetime,
        type: eventType,
        weather: weatherData
    };
    
    // Load existing events
    let savedEvents = JSON.parse(localStorage.getItem('weatherEvents')) || [];
    
    // Add new event
    savedEvents.push(eventData);
    
    // Save back to localStorage
    localStorage.setItem('weatherEvents', JSON.stringify(savedEvents));
    
    // Update display
    loadSavedEvents();
    
    // Show confirmation
    alert('Event saved successfully!');
}

// Load saved events
function loadSavedEvents() {
    const savedEvents = JSON.parse(localStorage.getItem('weatherEvents')) || [];
    savedEventsContainer.innerHTML = '';
    
    if (savedEvents.length === 0) {
        savedEventsContainer.innerHTML = '<p>No saved events yet.</p>';
        return;
    }
    
    savedEvents.forEach((event, index) => {
        const eventCard = document.createElement('div');
        eventCard.classList.add('event-card');
        
        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p class="event-date">${event.datetime}</p>
            <p>${event.location}</p>
            <div class="event-weather">
                <img src="http://openweathermap.org/img/wn/${event.weather.icon}.png" alt="${event.weather.description}">
                <span>${event.weather.temp}°C</span>
            </div>
            <button class="remove-event" data-index="${index}">×</button>
        `;
        
        savedEventsContainer.appendChild(eventCard);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-event').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = e.target.getAttribute('data-index');
            removeEvent(index);
        });
    });
}

// Remove event
function removeEvent(index) {
    let savedEvents = JSON.parse(localStorage.getItem('weatherEvents')) || [];
    savedEvents.splice(index, 1);
    localStorage.setItem('weatherEvents', JSON.stringify(savedEvents));
    loadSavedEvents();
}

// Show loading indicator
function showLoading() {
    loadingIndicator.classList.add('active');
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.remove('active');
}