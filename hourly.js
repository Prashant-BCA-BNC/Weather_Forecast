// API Key for OpenWeatherMap API
const API_KEY = "a2253a3e39bddcbae326acff50a2e65c";

// DOM Elements
const cityNameElement = document.getElementById('city-name');
const currentDateElement = document.getElementById('current-date');
const hourlyContainer = document.getElementById('hourly-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const currentLocationBtn = document.getElementById('current-location-btn');
const loadingIndicator = document.querySelector('.loading');
let hourlyChart = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load last searched city from local storage
    const lastCity = localStorage.getItem('lastCity') || "london";
    
    getHourlyForecast(lastCity);
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    currentLocationBtn.addEventListener('click', getUserLocation);
});

// Handle search
function handleSearch() {
    const city = searchInput.value.trim();
    if (city) {
        showLoading();
        getHourlyForecast(city);
    }
}

// Get user's current location
function getUserLocation() {
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {  // Make this async
                try {
                    const { latitude, longitude } = position.coords;
                    // Update based on which page you're on
                    if (window.location.pathname.includes('hourly')) {
                        await getHourlyForecastByCoordinates(latitude, longitude);
                    } else if (window.location.pathname.includes('4day')) {
                        await getForecastByCoordinates(latitude, longitude);
                    } else {
                        await getDailyForecastByCoordinates(latitude, longitude);
                    }
                } catch (error) {
                    hideLoading();
                    alert(`Error: ${error.message}`);
                }
            },
            (error) => {
                hideLoading();
                alert(`Error getting location: ${error.message}`);
            }
        );
    } else {
        hideLoading();
        alert("Geolocation is not supported by your browser");
    }
}

// create hourly temperature trend chart
function createTemperatureChart(hourlyData) {
    const ctx = document.getElementById('hourly-chart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (hourlyChart) {
        hourlyChart.destroy();
    }
    
    // Extract data for chart (next 8 hours for better readability)
    const labels = hourlyData.list.slice(0, 8).map(item => {
        const date = new Date(item.dt * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit' });
    });
    
    const temps = hourlyData.list.slice(0, 8).map(item => item.main.temp);
    
    // Create new chart
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temps,
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'white'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'white'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

// Get hourly forecast data by city name
async function getHourlyForecast(city) {
    try {
        showLoading();
        
        // Get current weather for coordinates
        const currentWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
        );
        
        if (!currentWeatherResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        const { lat, lon } = currentWeatherData.coord;
        
        // Get forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Update city and date
        cityNameElement.textContent = `${currentWeatherData.name}, ${currentWeatherData.sys.country}`;
        currentDateElement.textContent = formatDate(new Date());
        
        // Save to local storage
        localStorage.setItem('lastCity', currentWeatherData.name);
        
        // Display hourly forecast
        displayHourlyForecast(forecastData);
        
        // Change background based on weather
        setBackgroundByWeather(currentWeatherData.weather[0].main, 
                              isDaytime(currentWeatherData.dt, currentWeatherData.sys.sunrise, currentWeatherData.sys.sunset));
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error details:', error);
        alert(`Error fetching weather data: ${error.message}`);
    }
}

// Get hourly forecast by coordinates
async function getHourlyForecastByCoordinates(lat, lon) {
    try {
        showLoading();
        
        // Get current weather for location name
        const currentWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!currentWeatherResponse.ok) {
            throw new Error('Location not found');
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        
        // Get forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Update city and date
        cityNameElement.textContent = `${currentWeatherData.name}, ${currentWeatherData.sys.country}`;
        currentDateElement.textContent = formatDate(new Date());
        
        // Save to local storage
        localStorage.setItem('lastCity', currentWeatherData.name);
        
        // Display hourly forecast
        displayHourlyForecast(forecastData);
        
        // Change background based on weather
        setBackgroundByWeather(currentWeatherData.weather[0].main, 
                              isDaytime(currentWeatherData.dt, currentWeatherData.sys.sunrise, currentWeatherData.sys.sunset));
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error details:', error);
        alert(`Error fetching weather data: ${error.message}`);
    }
}

// Check if it's daytime
function isDaytime(currentTime, sunrise, sunset) {
    return currentTime > sunrise && currentTime < sunset ? 'day' : 'night';
}

// Display hourly forecast for the next 24 hours
function displayHourlyForecast(forecastData) {
    hourlyContainer.innerHTML = '';
    
    // Display hourly forecast for the next 24 hours (3-hour intervals from API)
    const hoursToShow = Math.min(24, forecastData.list.length);
    
    for (let i = 0; i < hoursToShow; i++) {
        const hourData = forecastData.list[i];
        const date = new Date(hourData.dt * 1000);
        
        const hourlyItem = document.createElement('div');
        hourlyItem.classList.add('hourly-item');
        
        hourlyItem.innerHTML = `
            <h3>${formatHour(date)}</h3>
            <img src="http://openweathermap.org/img/wn/${hourData.weather[0].icon}.png" alt="${hourData.weather[0].description}">
            <p class="hourly-temp">${Math.round(hourData.main.temp)}°C</p>
            <p>${hourData.weather[0].description}</p>
            <div class="hourly-details">
                <p>Humidity: ${hourData.main.humidity}%</p>
                <p>Wind: ${(hourData.wind.speed * 3.6).toFixed(1)} km/h</p>
            </div>
        `;
        
        hourlyContainer.appendChild(hourlyItem);
    }
    
    // Create temperature chart
    createTemperatureChart(forecastData);
}

// Format date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format hour
function formatHour(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Set background based on weather condition and time of day
function setBackgroundByWeather(weatherCondition, timeOfDay) {
    let backgroundImage;
    
    switch (weatherCondition.toLowerCase()) {
        case 'clear':
            backgroundImage = timeOfDay === 'day' ? 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' :
                'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
            break;
        case 'clouds':
            backgroundImage = timeOfDay === 'day' ? 'https://images.unsplash.com/photo-1525920955777-02e13f29c7f0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' :
                'https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-1.2.1&auto=format&fit=crop&w=1351&q=80';
            break;
        case 'rain':
        case 'drizzle':
            backgroundImage = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
            break;
        case 'thunderstorm':
            backgroundImage = 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?ixlib=rb-1.2.1&auto=format&fit=crop&w=1351&q=80';
            break;
        case 'snow':
            backgroundImage = 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
            break;
        case 'mist':
        case 'fog':
        case 'haze':
            backgroundImage = 'https://images.unsplash.com/photo-1585508889431-a1d0d9c5a324?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
            break;
        default:
            backgroundImage = timeOfDay === 'day' ? 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' :
                'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    }
    
    document.body.style.backgroundImage = `url('${backgroundImage}')`;
}

// Show loading indicator
function showLoading() {
    loadingIndicator.classList.add('active');
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.remove('active');
}