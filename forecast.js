// API Key for OpenWeatherMap API
const API_KEY = "a2253a3e39bddcbae326acff50a2e65c";

// DOM Elements
const cityNameElement = document.getElementById('city-name');
const currentDateElement = document.getElementById('current-date');
const forecastContainer = document.getElementById('forecast-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const currentLocationBtn = document.getElementById('current-location-btn');
const loadingIndicator = document.querySelector('.loading');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load last searched city from local storage
    const lastCity = localStorage.getItem('lastCity') || "london";
    
    getDailyForecast(lastCity);
    
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
        getDailyForecast(city);
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

// Get daily forecast data by city name
async function getDailyForecast(city) {
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
        
        // Group forecast by day
        const dailyForecast = processDailyForecast(forecastData);
        
        // Update city and date
        cityNameElement.textContent = `${currentWeatherData.name}, ${currentWeatherData.sys.country}`;
        currentDateElement.textContent = formatDate(new Date());
        
        // Save to local storage
        localStorage.setItem('lastCity', currentWeatherData.name);
        
        // Display daily forecast
        displayDailyForecast(dailyForecast);
        
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

// Get daily forecast by coordinates
async function getDailyForecastByCoordinates(lat, lon) {
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
        
        // Group forecast by day
        const dailyForecast = processDailyForecast(forecastData);
        
        // Update city and date
        cityNameElement.textContent = `${currentWeatherData.name}, ${currentWeatherData.sys.country}`;
        currentDateElement.textContent = formatDate(new Date());
        
        // Save to local storage
        localStorage.setItem('lastCity', currentWeatherData.name);
        
        // Display daily forecast
        displayDailyForecast(dailyForecast);
        
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

// Process forecast data to get daily forecast
function processDailyForecast(forecastData) {
    const dailyForecast = {};
    
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();
        
        if (!dailyForecast[dateString]) {
            dailyForecast[dateString] = {
                date: date,
                temps: [item.main.temp],
                maxTemp: item.main.temp_max,
                minTemp: item.main.temp_min,
                weather: [item.weather[0]],
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                humidity: [item.main.humidity],
                wind: [item.wind.speed]
            };
        } else {
            dailyForecast[dateString].temps.push(item.main.temp);
            dailyForecast[dateString].weather.push(item.weather[0]);
            dailyForecast[dateString].humidity.push(item.main.humidity);
            dailyForecast[dateString].wind.push(item.wind.speed);
            
            // Update max and min temps
            if (item.main.temp_max > dailyForecast[dateString].maxTemp) {
                dailyForecast[dateString].maxTemp = item.main.temp_max;
            }
            if (item.main.temp_min < dailyForecast[dateString].minTemp) {
                dailyForecast[dateString].minTemp = item.main.temp_min;
            }
        }
    });
    
    // Process the data to get average values
    Object.keys(dailyForecast).forEach(key => {
        const day = dailyForecast[key];
        
        // Calculate average temperature
        day.avgTemp = day.temps.reduce((sum, temp) => sum + temp, 0) / day.temps.length;
        
        // Get most frequent weather condition
        const weatherCounts = {};
        day.weather.forEach(w => {
            if (!weatherCounts[w.id]) {
                weatherCounts[w.id] = { count: 1, weather: w };
            } else {
                weatherCounts[w.id].count++;
            }
        });
        
        // Find the most common weather
        let maxCount = 0;
        let mostCommonWeather = null;
        
        Object.values(weatherCounts).forEach(item => {
            if (item.count > maxCount) {
                maxCount = item.count;
                mostCommonWeather = item.weather;
            }
        });
        
        day.mainWeather = mostCommonWeather;
        
        // Calculate average humidity and wind
        day.avgHumidity = day.humidity.reduce((sum, h) => sum + h, 0) / day.humidity.length;
        day.avgWind = day.wind.reduce((sum, w) => sum + w, 0) / day.wind.length;
    });
    
    // Convert to array and sort by date
    return Object.values(dailyForecast).sort((a, b) => a.date - b.date);
}

// Check if it's daytime
function isDaytime(currentTime, sunrise, sunset) {
    return currentTime > sunrise && currentTime < sunset ? 'day' : 'night';
}

// Display daily forecast for the next 4 days
function displayDailyForecast(dailyForecast) {
    forecastContainer.innerHTML = '';
    
    // Skip today and display next 4 days
    const daysToShow = Math.min(4, dailyForecast.length - 1);
    
    for (let i = 1; i <= daysToShow; i++) {
        const dayData = dailyForecast[i];
        if (!dayData) continue;
        
        const forecastCard = document.createElement('div');
        forecastCard.classList.add('forecast-card');
        
        forecastCard.innerHTML = `
            <div class="forecast-header">
                <h3>${formatDay(dayData.date)}</h3>
                <p class="forecast-date">${formatDateShort(dayData.date)}</p>
            </div>
            <div class="forecast-body">
                <img src="http://openweathermap.org/img/wn/${dayData.mainWeather.icon}@2x.png" alt="${dayData.mainWeather.description}">
                <p class="forecast-temp">${Math.round(dayData.avgTemp)}°C</p>
                <p class="forecast-description">${dayData.mainWeather.description}</p>
                <div class="forecast-details">
                    <p>H: ${Math.round(dayData.maxTemp)}°C | L: ${Math.round(dayData.minTemp)}°C</p>
                    <p>Humidity: ${Math.round(dayData.avgHumidity)}%</p>
                    <p>Wind: ${(dayData.avgWind * 3.6).toFixed(1)} km/h</p>
                </div>
            </div>
        `;
        
        forecastContainer.appendChild(forecastCard);
    }
}

// Format date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format date short
function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format day
function formatDay(date) {
    const options = { weekday: 'long' };
    return date.toLocaleDateString('en-US', options);
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