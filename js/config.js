// js/config.js
// Centralized configuration to eliminate magic numbers from the codebase.

export const CONFIG = {
    // API Configuration
    API_URL: '',
    
    // Security & Anti-Spam
    COOLDOWN_MS: 1500,
    MAX_INPUT_LENGTH: 400,
    
    // AI Cache
    CACHE_MAX_SIZE: 50,
    CACHE_TTL_MS: 600000,
    
    // 3D Engine Configuration
    ENGINE_ORBIT_RADIUS_FAN: 350,
    ENGINE_ORBIT_RADIUS_TACTICAL: 420,
    ENGINE_CAMERA_LERP_SPEED: 0.05,
    ENGINE_CAMERA_ZOOM_SPEED: 0.1,
    LOD_DISTANCE_THRESHOLD: 400,
    
    // Accessibility
    A11Y_TOAST_DURATION: 4000,
};
