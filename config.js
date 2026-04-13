import Constants from "expo-constants";
import { Platform } from "react-native";

// API Configuration
// Auto-detect host from Expo in development to avoid stale hardcoded LAN IPs.
// Fallback order: EXPO_PUBLIC_API_BASE_URL -> Expo host -> localhost.
const expoHost = Constants.expoConfig?.hostUri?.split(":")?.[0];
const detectedBaseUrl = expoHost ? `http://${expoHost}:8000` : null;
const androidEmulatorBaseUrl = "http://10.150.221.219:8000";
const isAndroidEmulator = Platform.OS === "android" && Constants.isDevice === false;

export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_BASE_URL ||
	(isAndroidEmulator ? androidEmulatorBaseUrl : null) ||
	detectedBaseUrl ||
	"http://localhost:8000";

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

