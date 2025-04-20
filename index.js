const API_KEY = "a2253a3e39bddcbae326acff50a2e65c";

// DOM Elements
const cityNameElement = document.getElementById('city-name');
const currentDateElement = document.getElementById('current-date');
const temperatureElement = document.getElementById('temperature');
const weatherDescElement = document.getElementById('weather-description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const pressureElement = document.getElementById('pressure');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const currentLocationBtn = document.getElementById('current-location-btn');
const saveLocationBtn = document.getElementById('save-location-btn');
const savedLocationsContainer = document.getElementById('saved-locations-container');
const weatherAlert = document.getElementById('weather-alert');
const alertText = document.getElementById('alert-text');
const loadingIndicator = document.querySelector('.loading');

// Utility Functions
function showLoading() {
    loadingIndicator.classList.add('active');
}

function hideLoading() {
    loadingIndicator.classList.remove('active');
}

function showAlert(message) {
    alertText.textContent = message;
    weatherAlert.style.display = 'block';
    setTimeout(() => {
        weatherAlert.style.display = 'none';
    }, 5000);
}

function setBackgroundByWeather(condition, timeOfDay) {
    let bg;
    switch (condition.toLowerCase()) {
        case 'clear':
            bg = timeOfDay === 'day' ?
                'https://images.unsplash.com/photo-1601297183305-6df142704ea2' :
                'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99';
            break;
        case 'clouds':
            bg = timeOfDay === 'day' ?
                'https://images.unsplash.com/photo-1525920955777-02e13f29c7f0' :
                'https://images.unsplash.com/photo-1534088568595-a066f410bcda';
            break;
        case 'rain':
        case 'drizzle':
            bg = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0';
            break;
        case 'thunderstorm':
            bg = 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28';
            break;
        case 'snow':
            bg = 'https://images.unsplash.com/photo-1491002052546-bf38f186af56';
            break;
        case 'mist':
        case 'fog':
        case 'haze':
            bg = 'https://images.unsplash.com/photo-1585508889431-a1d0d9c5a324';
            break;
        default:
            bg = timeOfDay === 'day' ?
                'https://images.unsplash.com/photo-1601297183305-6df142704ea2' :
                'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99';
    }
    const bgUrl = `url('${bg}?auto=format&fit=crop&w=1350&q=80')`;
    document.body.style.backgroundImage = bgUrl;
    localStorage.setItem('currentBackground', bgUrl);
}

function isDaytime(currentTime, sunrise, sunset) {
    return currentTime > sunrise && currentTime < sunset ? 'day' : 'night';
}

// Weather Functions
async function updateWeather(city) {
    try {
        showLoading();
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'City not found');
        
        const timeOfDay = isDaytime(data.dt, data.sys.sunrise, data.sys.sunset);
        setBackgroundByWeather(data.weather[0].main, timeOfDay);

        cityNameElement.textContent = `${data.name}, ${data.sys.country}`;
        currentDateElement.textContent = new Date().toLocaleDateString();
        temperatureElement.textContent = `${Math.round(data.main.temp)}°C`;
        weatherDescElement.textContent = data.weather[0].description;
        humidityElement.textContent = `${data.main.humidity}%`;
        windSpeedElement.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
        pressureElement.textContent = `${data.main.pressure} hPa`;

        if (data.weather[0].main.toLowerCase().includes("storm")) {
            showAlert("Storm warning in effect. Please stay indoors.");
        }

        localStorage.setItem("lastCity", data.name);
    } catch (err) {
        alert("Error: " + (err.message || "Failed to fetch weather data"));
    } finally {
        hideLoading();
    }
}

async function getUserLocation() {
    showLoading();
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            
            const { latitude, longitude } = position.coords;
            const geoRes = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
            );
            
            if (!geoRes.ok) throw new Error('Geocoding API error');
            
            const geoData = await geoRes.json();
            if (!geoData.length) throw new Error('Location not found');
            
            await updateWeather(geoData[0].name);
        } catch (error) {
            hideLoading();
            alert(`Error: ${error.message}`);
            console.error("Location error:", error);
        }
    } else {
        hideLoading();
        alert("Geolocation is not supported by your browser");
    }
}

function loadSavedLocations() {
    const saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    savedLocationsContainer.innerHTML = saved.map(loc => `
        <div class="location-card" onclick="updateWeather('${loc}')">
            ${loc}
            <button class="remove-location" onclick="removeLocation('${loc}', event)">×</button>
        </div>
    `).join("");
}

function removeLocation(location, event) {
    event.stopPropagation();
    let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
    saved = saved.filter(loc => loc !== location);
    localStorage.setItem("savedLocations", JSON.stringify(saved));
    loadSavedLocations();
}

// Event Listeners
function setupEventListeners() {
    // Load saved background
    const savedBg = localStorage.getItem('currentBackground');
    if (savedBg) {
        document.body.style.backgroundImage = savedBg;
    }

    // Initialize with last city or default
    const lastCity = localStorage.getItem("lastCity") || "London";
    updateWeather(lastCity);
    loadSavedLocations();

    // Button event listeners
    currentLocationBtn.addEventListener("click", getUserLocation);
    searchBtn.addEventListener("click", () => {
        const city = searchInput.value.trim();
        if (city) updateWeather(city);
    });
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const city = searchInput.value.trim();
            if (city) updateWeather(city);
        }
    });
    saveLocationBtn.addEventListener("click", () => {
        const city = cityNameElement.textContent.split(",")[0].trim();
        let saved = JSON.parse(localStorage.getItem("savedLocations")) || [];
        if (!saved.includes(city)) {
            saved.push(city);
            localStorage.setItem("savedLocations", JSON.stringify(saved));
            loadSavedLocations();
            alert(`${city} has been saved to your locations!`);
        }
    });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", setupEventListeners);