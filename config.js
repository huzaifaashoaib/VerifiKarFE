// API Configuration
// Change this to your computer's IP address when testing on physical device
// Use 'localhost' when testing on web/emulator on same machine
export const API_BASE_URL = 'http://192.168.1.235:8000';

// OpenStreetMap/OpenRouteService routing configuration
// Replace this placeholder with your own OpenRouteService API key.
export const OSM_ROUTING_API_KEY = 'YOUR_OPENROUTESERVICE_API_KEY';

// Optional OSM tile provider key.
// If you use a provider that requires a key (recommended for production),
// replace this placeholder and set OSM_TILES_URL to that provider's URL template.
export const OSM_TILES_API_KEY = 'YOUR_OSM_TILES_API_KEY';

// Default to a policy-safe OSM-based tiles endpoint (no key required).
// This avoids direct use of tile.openstreetmap.org, which can block app traffic.
export const OSM_TILES_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

