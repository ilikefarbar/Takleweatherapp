// Global variables
let cesiumViewer;
let coordinates = {};
let isRotating = true;
let searchedCities = [];

// Weather data fetching
async function fetchWeather(city = null) {
    const apiKey = "b1b46e6c81535adbe2f3752efafbf8c0";
    let url = "";

    if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    } else {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    console.log("Your Location Weather:", data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            }, () => {
                alert("Unable to retrieve location.");
                reject(new Error("Location access denied"));
            });
        });
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Weather for ${city}:`, data);
        return data;
    } catch (error) {
        console.error("Error fetching weather:", error);
        throw error;
    }
}

// Get coordinates from place name
async function getCoordinates(place) {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(place)}&limit=1&appid=06dfd1434d06a67542e57d2bd37a0d5d`);
    const data = await response.json();
    if (data && data.length > 0) {
        return {
            lat: data[0].lat,
            lon: data[0].lon,
            name: data[0].name,
            country: data[0].country
        };
    }
    return null;
}

// Update weather card
function updateWeatherCard(weatherData, cityName) {
    const tempInt = Math.round(weatherData.main.temp);
    const timestamp = new Date().toLocaleTimeString();
    return `
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-2xl font-medium text-gray-900">${cityName}</h3>
                <p class="text-gray-500">${weatherData.weather[0].description}</p>
                <p class="text-sm text-gray-400">Last updated: ${timestamp}</p>
            </div>
            <div class="text-right">
                <div class="text-6xl font-light text-gray-900">${tempInt}°</div>
                <div class="text-sm text-gray-500">Feels like ${Math.round(weatherData.main.feels_like)}°</div>
            </div>
        </div>
    `;
}

// Initialize Cesium viewer
window.onload = function() {
    try {
        Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2OTNlOTk3Yi1jM2MwLTQxNTEtODJiNi0wOThkMDlmYjIwMjciLCJpZCI6MjgzOTc2LCJpYXQiOjE3NDE4NzExMjJ9.Y8BEVrj6TV08f8aUtY0awwO9QnWed2BUGU5Wq-f1HTE";

        cesiumViewer = new Cesium.Viewer("cesiumContainer", {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            geocoder: false,
            terrainProvider: new Cesium.EllipsoidTerrainProvider()
        });

        // Make sure the globe is visible
        cesiumViewer.scene.globe.show = true;
        cesiumViewer.scene.backgroundColor = Cesium.Color.BLACK;
        cesiumViewer.scene.globe.enableLighting = true;

        // Add equator line
        cesiumViewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(
                    Array.from({ length: 360 }, (_, i) => [i - 180, 0]).flat()
                ),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.ORANGE.withAlpha(0.5),
                    dashLength: 16.0
                })
            }
        });

        // Tropic of Cancer (23.5°N)
        cesiumViewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(
                    Array.from({ length: 360 }, (_, i) => [i - 180, 23.5]).flat()
                ),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.YELLOW.withAlpha(0.5),
                    dashLength: 16.0
                })
            }
        });

        // Tropic of Capricorn (23.5°S)
        cesiumViewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(
                    Array.from({ length: 360 }, (_, i) => [i - 180, -23.5]).flat()
                ),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.YELLOW.withAlpha(0.5),
                    dashLength: 16.0
                })
            }
        });

        // Arctic Circle (66.5°N)
        cesiumViewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(
                    Array.from({ length: 360 }, (_, i) => [i - 180, 66.5]).flat()
                ),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.CYAN.withAlpha(0.5),
                    dashLength: 16.0
                })
            }
        });

        // Antarctic Circle (66.5°S)
        cesiumViewer.entities.add({
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(
                    Array.from({ length: 360 }, (_, i) => [i - 180, -66.5]).flat()
                ),
                width: 2,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.CYAN.withAlpha(0.5),
                    dashLength: 16.0
                })
            }
        });

        // Set initial view
        cesiumViewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000)
        });

        // Setup event listeners
        document.getElementById("cityInput").addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                searchCity();
            }
        });

        // Add weather layers
        setupWeatherLayers();
        addGeographicalLabels(); //Added geographical labels
    } catch (error) {
        console.error("Error initializing Cesium:", error);
    }
};

// Search city function
async function searchCity() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    try {
        const locationData = await getCoordinates(city);
        if (locationData) {
            const cityName = `${locationData.name}, ${locationData.country}`;

            coordinates[cityName] = {
                lat: locationData.lat,
                lon: locationData.lon
            };

            // Fetch weather data
            const weatherData = await fetchWeather(city);

            // Update weather display
            updateWeatherDisplay(weatherData, cityName);

            // Update globe view
            updateGlobeView(locationData);

            // Clear input
            document.getElementById("cityInput").value = "";
        } else {
            console.log("City not found");
            showError("City not found");
        }
    } catch (error) {
        console.error("Error searching city:", error);
        showError("Error searching city");
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
}

async function updateWeatherDisplay(weatherData, cityName) {
    const weatherContainer = document.getElementById('weatherContainer');
    weatherContainer.innerHTML = '';

    // Fetch 7-day forecast
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=06dfd1434d06a67542e57d2bd37a0d5d&units=metric`);
    const forecastData = await forecastResponse.json();

    const sevenDayForecast = forecastData.list.reduce((acc, item) => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = {
                temp: item.main.temp,
                humidity: item.main.humidity,
                wind: item.wind.speed,
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                rain: item.rain ? item.rain['3h'] : 0,
                pressure: item.main.pressure,
                feels_like: item.main.feels_like
            };
        }
        return acc;
    }, {});

    const forecastHtml = Object.entries(sevenDayForecast)
        .map(([date, data]) => `
            <div class="forecast-day p-4 bg-white rounded-lg shadow">
                <div class="text-lg font-semibold">${date}</div>
                <img src="https://openweathermap.org/img/w/${data.icon}.png" alt="weather">
                <div class="text-3xl">${Math.round(data.temp)}°C</div>
                <div class="text-sm text-gray-600">${data.description}</div>
                <div class="text-sm">💨 ${data.wind} m/s</div>
                <div class="text-sm">💧 ${data.humidity}%</div>
                <div class="text-sm">🌧️ ${data.rain || 0} mm</div>
                <div class="text-sm">🌡️ Feels like: ${Math.round(data.feels_like)}°C</div>
                <div class="text-sm">📊 Pressure: ${data.pressure} hPa</div>
            </div>
        `).join('');

    const weatherInfo = document.createElement('div');
    weatherInfo.className = 'p-6 bg-white rounded-lg shadow-lg mb-4';

    const isRaining = weatherData.weather[0].main === 'Rain' || weatherData.weather[0].main === 'Drizzle';
    const rainStatus = isRaining ? '<div class="text-blue-600 font-semibold mt-2">🌧️ It is currently raining here</div>' : '';

    weatherInfo.innerHTML = `
        ${updateWeatherCard(weatherData, cityName)}
        ${rainStatus}
        <div class="mt-8">
            <h3 class="text-xl font-semibold mb-4">7-Day Forecast</h3>
            <div class="forecast-container flex gap-4 overflow-x-auto pb-4">
                ${forecastHtml}
            </div>
        </div>
        <div class="mt-4">
            <canvas id="tempChart_${cityName.replace(/[^a-zA-Z0-9]/g, '_')}" width="400" height="200"></canvas>
        </div>
    `;

    weatherContainer.appendChild(weatherInfo);

    // Create temperature chart
    const temps = forecastData.list.slice(0, 8).map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString(),
        temp: Math.round(item.main.temp),
        rain: item.pop * 100,
        description: item.weather[0].description
    }));

    const ctx = document.getElementById(`tempChart_${cityName.replace(/[^a-zA-Z0-9]/g, '_')}`).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: temps.map(item => item.time),
            datasets: [{
                label: 'Temperature (°C)',
                data: temps.map(item => item.temp),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                yAxisID: 'y'
            },
            {
                label: 'Chance of Rain (%)',
                data: temps.map(item => item.rain),
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '24-Hour Temperature Forecast'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // Add precipitation layer for rain visualization
    const precipLayer = new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=06dfd1434d06a67542e57d2bd37a0d5d',
            minimumLevel: 0,
            maximumLevel: 20,
            tileWidth: 256,
            tileHeight: 256
        })
    );
    cesiumViewer.scene.imageryLayers.add(precipLayer);

    // Configure precipitation button
    const precipToggleBtn = document.getElementById('precipToggleBtn');
    if (precipToggleBtn) {
        precipLayer.show = false; // Initialize as hidden
        precipToggleBtn.onclick = () => {
            precipLayer.show = !precipLayer.show;
            precipToggleBtn.style.backgroundColor = precipLayer.show ? 'rgba(255, 165, 0, 0.6)' : 'white';
        };
    }
}

function updateGlobeView(locationData) {
    if (cesiumViewer) {
        isRotating = false;
        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                locationData.lon,
                locationData.lat,
                15000
            ),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0
            },
            duration: 3
        });
    }
}

function setupWeatherLayers() {
    if (!cesiumViewer) return;

    const cloudLayer = new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=06dfd1434d06a67542e57d2bd37a0d5d'
        })
    );
    cesiumViewer.imageryLayers.add(cloudLayer);
    cloudLayer.show = false;

    const windLayer = new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=06dfd1434d06a67542e57d2bd37a0d5d'
        })
    );
    cesiumViewer.imageryLayers.add(windLayer);
    windLayer.show = false;

    const tempLayer = new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=06dfd1434d06a67542e57d2bd37a0d5d'
        })
    );
    cesiumViewer.imageryLayers.add(tempLayer);
    tempLayer.show = false;

    // Setup toggle buttons
    setupToggleButtons(cloudLayer, windLayer, tempLayer);
}

function setupToggleButtons(cloudLayer, windLayer, tempLayer) {
    const windToggleBtn = document.getElementById('windToggleBtn');
    if (windToggleBtn) {
        windToggleBtn.onclick = () => {
            windLayer.show = !windLayer.show;
            windToggleBtn.style.backgroundColor = windLayer.show ? 'rgba(255, 165, 0, 0.6)' : 'white';
        };
    }

    const cloudToggleBtn = document.getElementById('cloudToggleBtn');
    if (cloudToggleBtn) {
        cloudToggleBtn.onclick = () => {
            cloudLayer.show = !cloudLayer.show;
            cloudToggleBtn.style.backgroundColor = cloudLayer.show ? 'rgba(255, 165, 0, 0.6)' : 'white';
        };
    }

    const tempToggleBtn = document.getElementById('tempToggleBtn');
    if (tempToggleBtn) {
        tempToggleBtn.onclick = () => {
            tempLayer.show = !tempLayer.show;
            tempToggleBtn.style.backgroundColor = tempLayer.show ? 'rgba(255, 165, 0, 0.6)' : 'white';
        };
    }
}

function zoomIn() {
    if (cesiumViewer) {
        cesiumViewer.camera.zoomIn(1000000.0);
    }
}

function zoomOut() {
    if (cesiumViewer) {
        cesiumViewer.camera.zoomOut(1000000.0);
    }
}

function recenterGlobe() {
    if (cesiumViewer) {
        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
            duration: 2
        });
    }
}

// Add geographical labels
function addGeographicalLabels() {
    const labels = [
        // Continents
        { name: "North America", lon: -100, lat: 45 },
        { name: "South America", lon: -60, lat: -20 },
        { name: "Europe", lon: 15, lat: 50 },
        { name: "Africa", lon: 20, lat: 0 },
        { name: "Asia", lon: 90, lat: 45 },
        { name: "Australia", lon: 135, lat: -25 },
        { name: "Antarctica", lon: 0, lat: -80 },

        // Oceans and Seas
        { name: "Pacific Ocean", lon: -180, lat: 0 },
        { name: "Atlantic Ocean", lon: -40, lat: 0 },
        { name: "Indian Ocean", lon: 80, lat: -20 },
        { name: "Arctic Ocean", lon: 0, lat: 80 },
        { name: "Mediterranean Sea", lon: 20, lat: 35 },
        { name: "Caribbean Sea", lon: -75, lat: 15 },
        { name: "South China Sea", lon: 115, lat: 15 }
    ];

    labels.forEach(location => {
        cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(location.lon, location.lat),
            label: {
                text: location.name,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scaleByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 5.0e7, 0.5)
            }
        });
    });
}