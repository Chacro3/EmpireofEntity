/**
 * Empires of Eternity - Utility Functions
 * Contains helper methods for common operations throughout the game
 */

// Create global Utils object
window.Utils = {
  /**
   * Log a message to the console (with timestamp)
   * @param {string} message - Message to log
   */
  log: function (message) {
    const now = new Date();
    const timestamp = now.toTimeString().split(" ")[0];
    console.log(`[${timestamp}] ${message}`);
  },

  /**
   * Create a deep clone of an object or array
   * @param {*} obj - Object to clone
   * @returns {*} Deep clone of the object
   */
  deepClone: function (obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    // Handle Array
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item));
    }

    // Handle Object
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.deepClone(obj[key]);
      }
    }

    return result;
  },

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  generateId: function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * Calculate distance between two points
   * @param {number} x1 - First point X coordinate
   * @param {number} y1 - First point Y coordinate
   * @param {number} x2 - Second point X coordinate
   * @param {number} y2 - Second point Y coordinate
   * @returns {number} Distance between points
   */
  distance: function (x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Check if a point is inside a rectangle
   * @param {number} x - Point X coordinate
   * @param {number} y - Point Y coordinate
   * @param {number} rectX - Rectangle X coordinate
   * @param {number} rectY - Rectangle Y coordinate
   * @param {number} rectWidth - Rectangle width
   * @param {number} rectHeight - Rectangle height
   * @returns {boolean} True if point is in rectangle
   */
  pointInRect: function (x, y, rectX, rectY, rectWidth, rectHeight) {
    return (
      x >= rectX &&
      x <= rectX + rectWidth &&
      y >= rectY &&
      y <= rectY + rectHeight
    );
  },

  /**
   * Calculate damage based on attack rating, defense points, and damage type
   * @param {number} attackRating - Attacker's attack rating
   * @param {number} defensePoints - Defender's defense points
   * @param {string} damageType - Type of damage (slashing, piercing, blunt)
   * @returns {number} Final damage amount
   */
  calculateDamage: function (attackRating, defensePoints, damageType) {
    // Base damage calculation
    let damage = Math.max(1, attackRating - defensePoints / 2);

    // Apply damage type modifiers if CONFIG is available
    if (
      typeof CONFIG !== "undefined" &&
      CONFIG.STATS &&
      CONFIG.STATS.DAMAGE_TYPES
    ) {
      const damageTypes = CONFIG.STATS.DAMAGE_TYPES;

      if (damageType === "slashing" && damageTypes.SLASHING) {
        // Slashing is good against low DP, bad against high DP
        if (defensePoints < 15 && damageTypes.SLASHING.lowDPBonus) {
          damage *= 1 + damageTypes.SLASHING.lowDPBonus;
        } else if (defensePoints > 25 && damageTypes.SLASHING.highDPPenalty) {
          damage *= 1 + damageTypes.SLASHING.highDPPenalty;
        }
      } else if (damageType === "piercing" && damageTypes.PIERCING) {
        // Piercing is good against medium DP, bad against very high DP
        if (
          defensePoints >= 15 &&
          defensePoints <= 25 &&
          damageTypes.PIERCING.mediumDPBonus
        ) {
          damage *= 1 + damageTypes.PIERCING.mediumDPBonus;
        } else if (
          defensePoints > 35 &&
          damageTypes.PIERCING.veryHighDPPenalty
        ) {
          damage *= 1 + damageTypes.PIERCING.veryHighDPPenalty;
        }
      } else if (damageType === "blunt" && damageTypes.BLUNT) {
        // Blunt is good against high DP, bad against low DP
        if (defensePoints > 25 && damageTypes.BLUNT.highDPBonus) {
          damage *= 1 + damageTypes.BLUNT.highDPBonus;
        } else if (defensePoints < 15 && damageTypes.BLUNT.lowDPPenalty) {
          damage *= 1 + damageTypes.BLUNT.lowDPPenalty;
        }
      }
    }

    // Ensure minimum damage of 1
    return Math.max(1, Math.round(damage));
  },

  /**
   * Get a random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  randomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Format a number with commas for thousands
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber: function (num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Format time in seconds to MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime: function (seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  },

  /**
   * Shuffle an array (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray: function (array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },
};

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
