// 4day.js
const API_KEY = "a2253a3e39bddcbae326acff50a2e65c";

const cityNameEl = document.getElementById("city-name");
const currentDateEl = document.getElementById("current-date");
const forecastContainer = document.getElementById("forecast");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const currentLocationBtn = document.getElementById("current-location-btn");

function showLoading() {
    document.querySelector(".loading").classList.add("active");
}

function hideLoading() {
    document.querySelector(".loading").classList.remove("active");
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

    document.body.style.backgroundImage = `url('${bg}?auto=format&fit=crop&w=1350&q=80')`;
}

function isDaytime(currentTime, sunrise, sunset) {
    return currentTime > sunrise && currentTime < sunset ? 'day' : 'night';
}

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

async function getForecast(city) {
    try {
        showLoading();
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
        const weatherData = await weatherRes.json();
        if (!weatherRes.ok) throw new Error(weatherData.message);

        const { lat, lon } = weatherData.coord;
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const forecastData = await forecastRes.json();

        const timeOfDay = isDaytime(weatherData.dt, weatherData.sys.sunrise, weatherData.sys.sunset);
        setBackgroundByWeather(weatherData.weather[0].main, timeOfDay);

        const daily = {};
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const key = date.toDateString();
            if (!daily[key]) daily[key] = [];
            daily[key].push(item);
        });

        const days = Object.keys(daily).slice(1, 5); // next 4 days (skip today)
        forecastContainer.innerHTML = "";
        days.forEach(dayKey => {
            const items = daily[dayKey];
            const avgTemp = Math.round(items.reduce((acc, item) => acc + item.main.temp, 0) / items.length);
            const icon = items[0].weather[0].icon;
            const desc = items[0].weather[0].description;
            const high = Math.round(Math.max(...items.map(i => i.main.temp_max)));
            const low = Math.round(Math.min(...items.map(i => i.main.temp_min)));
            const humidity = Math.round(items.reduce((acc, i) => acc + i.main.humidity, 0) / items.length);
            const wind = (items.reduce((acc, i) => acc + i.wind.speed, 0) / items.length * 3.6).toFixed(1);

            forecastContainer.innerHTML += `
                <div class="forecast-day">
                    <h3>${new Date(dayKey).toLocaleDateString(undefined, { weekday: 'long' })}</h3>
                    <p class="forecast-date">${dayKey}</p>
                    <img src="http://openweathermap.org/img/wn/${icon}.png" alt="${desc}" />
                    <p class="forecast-temp">${avgTemp}°C</p>
                    <p class="forecast-description">${desc}</p>
                    <div class="forecast-details">
                        <p>H: ${high}°C | L: ${low}°C</p>
                        <p>Humidity: ${humidity}%</p>
                        <p>Wind: ${wind} km/h</p>
                    </div>
                </div>`;
        });

        cityNameEl.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
        currentDateEl.textContent = new Date().toLocaleDateString();
        hideLoading();
    } catch (err) {
        alert("Error fetching forecast: " + err.message);
        hideLoading();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const lastCity = localStorage.getItem("lastCity") || "London";
    getForecast(lastCity);

    searchBtn.addEventListener("click", () => {
        const city = searchInput.value.trim();
        if (city) getForecast(city);
    });

    currentLocationBtn.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
                    const data = await res.json();
                    getForecast(data.name);
                } catch (err) {
                    alert("Error fetching location forecast");
                }
            });
        } else {
            alert("Geolocation not supported");
        }
    });
});
