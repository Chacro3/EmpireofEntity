/**
 * Empires of Eternity - Configuration Wrapper
 * This file ensures the CONFIG object is globally accessible
 */

// If CONFIG is defined in config.js but not globally, make it global
if (typeof CONFIG !== 'undefined' && typeof window.CONFIG === 'undefined') {
    window.CONFIG = CONFIG;
    console.log('CONFIG loaded and made global by config-wrapper.js');
} else if (typeof window.CONFIG === 'undefined') {
    // Create default CONFIG if it doesn't exist at all
    window.CONFIG = {
        // Game Settings
        GAME_VERSION: "1.0.0",
        GAME_TITLE: "Empires of Eternity",
        DEBUG_MODE: true,

        // Canvas Settings
        CANVAS: {
            WIDTH: 1280,
            HEIGHT: 720,
            TARGET_FPS: 60,
        },

        // Map Settings
        MAP: {
            DEFAULT_SIZE: 40,
            TILE_SIZE: 64,
            MAX_SIZE: 80,
            TERRAIN_TYPES: ["plains", "forest", "desert", "hills", "mountains"],
            RESOURCE_DENSITY: 0.12,
        },

        // Resources
        RESOURCES: {
            TYPES: ["wood", "food", "gold", "stone", "iron"],
            STARTING: {
                wood: 200,
                food: 200,
                gold: 100,
                stone: 0,
                iron: 0,
            }
        }
    };
    console.warn('CONFIG not found, created default CONFIG by config-wrapper.js');
} else {
    console.log('CONFIG already globally available');
}

// Export as module for ES modules compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CONFIG;
} 