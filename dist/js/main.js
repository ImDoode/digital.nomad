function spinGlobe() {
  const zoom = APP_CONFIG.map.getZoom();
  if (APP_CONFIG.spinEnabled && !APP_CONFIG.userInteracting && zoom < APP_CONFIG.maxSpinZoom) {
    let distancePerSecond = 360 / APP_CONFIG.secondsPerRevolution;
    if (zoom > APP_CONFIG.slowSpinZoom) {
      const zoomDif =
        (APP_CONFIG.maxSpinZoom - zoom) / (APP_CONFIG.maxSpinZoom - APP_CONFIG.slowSpinZoom);
      distancePerSecond *= zoomDif;
    }
    const center = APP_CONFIG.map.getCenter();
    center.lng += distancePerSecond;
    APP_CONFIG.map.easeTo({ center, duration: 1000, easing: (n) => n });
  }
}

function initMap(container) {
  APP_CONFIG.map = new mapboxgl.Map({
    container: container,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: APP_CONFIG.center,
    zoom: APP_CONFIG.zoom,
    bearing: 10,
    pitch: 0,
    attributionControl: false,
    renderWorldCopies: true,
    maxBounds: [
      [-180, -85],
      [180, 85],
    ],
  });
  APP_CONFIG.map.on('mousedown', () => {
    APP_CONFIG.userInteracting = true;
  });
  APP_CONFIG.map.on('mouseup', () => {
    APP_CONFIG.userInteracting = false;
    spinGlobe();
  });
  
  APP_CONFIG.map.on('dragend', () => {
    APP_CONFIG.userInteracting = false;
    spinGlobe();
  });
  APP_CONFIG.map.on('pitchend', () => {
    APP_CONFIG.userInteracting = false;
    spinGlobe();
  });
  APP_CONFIG.map.on('rotateend', () => {
    APP_CONFIG.userInteracting = false;
    spinGlobe();
  });
  APP_CONFIG.map.on('moveend', () => {
    spinGlobe();
  });
}

function animateMap() {
  const newZoomLevel = 5; // Здесь вы можете указать желаемый уровень зума
  const newCenter = [100.4221548, 5.258407]; // Здесь вы указываете новые координаты центра
  APP_CONFIG.map.easeTo({
    zoom: newZoomLevel,
    center: newCenter,
    pitch: 0,
    bearing: 0,
    duration: 2000, // Продолжительность анимации в миллисекундах
    easing: (t) => t, // Функция анимации (может быть изменена по вашим потребностям)
  });
  APP_CONFIG.spinEnabled = false;
}

function getLocations() {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(APP_CONFIG.locationUrl);

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.locations && Array.isArray(data.locations)) {
        resolve(data.locations);
      } else {
        reject(new Error('Массив locations не найден в данных.'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

mapboxgl.accessToken = 'pk.eyJ1IjoiaW1kb29kZSIsImEiOiJjbG1uMzM3NjEwOXc0Mm5zNmJiZmNpZ2t5In0.Y1L0Wb9a4EEUqJNF-D5dgg'; // Замените на свой токен

const APP_CONFIG = {
  center: [50.4221548, 5.258407],
  zoom: 1,
  map: null,
  secondsPerRevolution: 30,
  maxSpinZoom: 5,
  slowSpinZoom: 3,
  userInteracting: false,
  spinEnabled: true,
  locationUrl: 'http://localhost:5500/user_data/trip/big-long-trip-msia-sg-thai-north-laos-viet_7783449/locations.json',
  locations: [],
  routeDrawed: false
};

function loadLocations() {
  getLocations()
    .then((data) => {
      data.sort(function(a, b) {
        return b.time - a.time;
      });
      APP_CONFIG.locations = data;
      if (!APP_CONFIG.routeDrawed) {
        drawRoute(data);
      }
    })
    .catch((error) => {
      console.error('Произошла ошибка при выполнении запроса:', error);
    });
}

function drawRoute(locations) {
  APP_CONFIG.routeDrawed = true;
  // Добавляем маркеры
  locations.forEach(function(location, index) {
    new mapboxgl.Marker()
      .setLngLat([location.lon, location.lat])
      .addTo(APP_CONFIG.map);

    // Соединяем маркеры белой линией (кроме первой точки)
    return;
    if (index > 0) {
      var coordinates = [
        [locations[index - 1].lon, locations[index - 1].lat],
        [location.lon, location.lat]
      ];

      APP_CONFIG.map.addLayer({
        'id': 'line' + index,
        'type': 'line',
        'source': {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'LineString',
              'coordinates': coordinates
            }
          }
        },
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': 'white',
          'line-width': 2
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initMap('js-map');
  APP_CONFIG.map.on('load', () => {
    if (!APP_CONFIG.routeDrawed && !!APP_CONFIG.locations) {
      drawRoute(APP_CONFIG.locations);
    }
  })
  spinGlobe();
  loadLocations();
  
  setTimeout(() => { animateMap() }, 4000);
});
