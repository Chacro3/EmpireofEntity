/**
 * Empires of Eternity - Game Configuration
 * Contains all game constants, settings, and configuration values
 */

// Define window.CONFIG directly to ensure global availability
window.CONFIG = {
  // Game Settings
  GAME_VERSION: "1.0.0",
  GAME_TITLE: "Empires of Eternity",
  DEBUG_MODE: true, // Set to false for production

  // Canvas Settings
  CANVAS: {
    WIDTH: 1280,
    HEIGHT: 720,
    TARGET_FPS: 60,
  },

  // Map Settings
  MAP: {
    DEFAULT_SIZE: 40, // 40x40 grid
    TILE_SIZE: 64, // Size of each tile in pixels
    MAX_SIZE: 80, // Maximum map size
    TERRAIN_TYPES: ["plains", "forest", "desert", "hills", "mountains"],
    RESOURCE_DENSITY: 0.12, // 12% of map tiles have resources
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
    },
    DEPLETION: {
      tree: 500, // Wood per tree
      gold_mine: 1000, // Gold per mine
      stone_quarry: 1200, // Stone per quarry
      iron_deposit: 800, // Iron per deposit
      berry_bush: 200, // Food per bush
      animal: 300, // Food per animal
    },
    GATHER_RATE: {
      base: 1, // Resource units per second
      wood: 1,
      food: 1,
      gold: 0.8,
      stone: 0.7,
      iron: 0.6,
    },
  },

  // Ages
  AGES: {
    NAMES: ["Stone Age", "Bronze Age", "Iron Age", "Golden Age", "Eternal Age"],
    REQUIREMENTS: [
      {}, // Stone Age (starting age)
      { wood: 500, food: 300 }, // Bronze Age
      { wood: 800, food: 600, gold: 200 }, // Iron Age
      { wood: 1200, food: 1000, gold: 500, iron: 300 }, // Golden Age
      { wood: 2000, food: 1500, gold: 1000, iron: 800, stone: 500 }, // Eternal Age
    ],
  },

  // Civilization Settings
  CIVILIZATIONS: {
    SOLARI: {
      name: "The Solari",
      color: "#FFD700", // Gold
      villagerLimit: {
        initial: 5,
        perHouse: 5,
        perAge: 5,
      },
      uniquePerks: {
        gatherBonus: 0.2, // 20% faster resource gathering
        buildingDiscount: 0.1, // 10% less wood for buildings
      },
    },
    LUNARI: {
      name: "The Lunari",
      color: "#C0C0C0", // Silver
      villagerLimit: {
        initial: 5,
        perHouse: 5,
        perAge: 5,
      },
      uniquePerks: {
        soldierTrainingSpeed: 0.25, // 25% faster soldier training
        villagerMovementSpeed: 0.1, // 10% faster villager movement
      },
    },
  },

  // Build Times (in seconds)
  BUILD_TIMES: {
    // Villagers
    VILLAGER: [5, 6, 7, 8, 9], // By age

    // Soldiers by type and age
    INFANTRY: [10, 12, 14, 16, 18],
    RANGED: [0, 12, 14, 16, 18], // Not available in Stone Age
    CAVALRY: [0, 0, 16, 18, 20], // Available from Iron Age
    ELITE: [0, 0, 0, 20, 22], // Available from Golden Age
    SIEGE: [0, 0, 25, 27, 30], // Available from Iron Age

    // Buildings by type and age
    BASIC_BUILDING: [15, 18, 21, 24, 27],
    PRODUCTION_BUILDING: [20, 24, 28, 32, 36],
    MILITARY_BUILDING: [25, 30, 35, 40, 45],
    DEFENSIVE_BUILDING: [30, 35, 40, 45, 50],
    WALL_SEGMENT: [10, 12, 14, 16, 18],

    // Wonders (base time + age penalty)
    WONDER: {
      BASE: 60,
      AGE_PENALTY: [240, 180, 120, 60, 0], // Additional seconds by age
    },
  },

  // Base Stats
  STATS: {
    // HP, DP, AR for villagers by age
    VILLAGER: [
      { hp: 50, dp: 5, ar: 5 }, // Stone Age
      { hp: 60, dp: 6, ar: 6 }, // Bronze Age
      { hp: 70, dp: 7, ar: 7 }, // Iron Age
      { hp: 80, dp: 8, ar: 8 }, // Golden Age
      { hp: 90, dp: 9, ar: 9 }, // Eternal Age
    ],

    // Base Building Stats (Stone Age, no upgrades)
    BUILDINGS: {
      HOUSE: { hp: 200, dp: 10 },
      GRANARY: { hp: 250, dp: 12 },
      LUMBER_MILL: { hp: 200, dp: 10 },
      BARRACKS: { hp: 300, dp: 15 },
      FORGE: { hp: 350, dp: 18 },
      MARKET: { hp: 250, dp: 12 },
      TEMPLE: { hp: 400, dp: 20 },
      WALL: { hp: 500, dp: 25 },
      TOWER: { hp: 300, dp: 15, ar: 10 },
      WONDER: { hp: 2000, dp: 60 },
    },

    // Age progression stat increase per age
    AGE_PROGRESSION: {
      BUILDING_HP: [0, 50, 100, 150, 200], // Additional HP per age
      BUILDING_DP: [0, 5, 10, 15, 20], // Additional DP per age
    },

    // Damage Types
    DAMAGE_TYPES: {
      SLASHING: {
        lowDPBonus: 0.25, // +25% vs DP < 15
        highDPPenalty: -0.25, // -25% vs DP > 25
      },
      PIERCING: {
        mediumDPBonus: 0.25, // +25% vs DP 15-25
        veryHighDPPenalty: -0.25, // -25% vs DP > 35
      },
      BLUNT: {
        highDPBonus: 0.25, // +25% vs DP > 25
        lowDPPenalty: -0.25, // -25% vs DP < 15
      },
    },
  },

  // Victory Conditions
  VICTORY: {
    ECONOMIC: {
      RESOURCE_GOAL: {
        wood: 10000,
        food: 10000,
        gold: 10000,
        stone: 5000,
        iron: 5000,
      },
    },
  },

  // UI Settings
  UI: {
    COLORS: {
      TEXT: "#FFFFFF",
      BACKGROUND: "rgba(0, 0, 0, 0.7)",
      SOLARI: "#FFD700",
      LUNARI: "#C0C0C0",
      ALERT: "#FF0000",
      RESOURCE_ALERT: "#FFA500",
      HP_BAR: "#00FF00",
      DP_BAR: "#0000FF",
    },
    ALERT_DURATION: 5, // Seconds
    MINIMAP_SIZE: 200, // Pixels
  },

  // Audio Settings
  AUDIO: {
    MASTER_VOLUME: 0.8,
    SFX_VOLUME: 0.7,
    MUSIC_VOLUME: 0.5,
    VOICE_VOLUME: 0.6,
  },
};

// Also provide a standard CONFIG variable (for module compatibility)
var CONFIG = window.CONFIG;

// Log that config is available
console.log("CONFIG defined and available globally");

// For module compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
