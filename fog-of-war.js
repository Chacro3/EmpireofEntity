/**
 * Empires of Eternity - Fog of War System
 * Manages map visibility, exploration, and fog of war effects
 */

class FogOfWar {
  /**
   * Create a new fog of war system
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // Fog state for each player
    this.fogState = {
      SOLARI: null,
      LUNARI: null,
    };

    // Visibility grids (0 = unexplored, 1 = explored, 2 = visible)
    this.visibility = {
      SOLARI: null,
      LUNARI: null,
    };

    // Map dimensions
    this.width = 0;
    this.height = 0;

    // Fog texture for rendering
    this.fogTexture = null;
    this.fogCanvas = null;
    this.fogCtx = null;

    // Timestamp of last full update
    this.lastFullUpdate = 0;

    // Update frequency
    this.fullUpdateInterval = 500; // ms

    Utils.log("FogOfWar created");
  }

  /**
   * Initialize the fog of war system
   * @param {number} width - Map width
   * @param {number} height - Map height
   */
  init(width, height) {
    this.width = width;
    this.height = height;

    // Initialize visibility grids
    this.visibility.SOLARI = new Uint8Array(width * height);
    this.visibility.LUNARI = new Uint8Array(width * height);

    // Create fog rendering canvas
    this.fogCanvas = document.createElement("canvas");
    this.fogCanvas.width = width;
    this.fogCanvas.height = height;
    this.fogCtx = this.fogCanvas.getContext("2d", { alpha: true });

    // Initialize texture
    this.updateFogTexture("SOLARI");

    Utils.log(`FogOfWar initialized (${width}x${height})`);
    return this;
  }

  /**
   * Get visibility state at a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} player - Player key
   * @returns {number} Visibility state (0 = unexplored, 1 = explored, 2 = visible)
   */
  getVisibility(x, y, player) {
    // Check bounds
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return 0;
    }

    const index = y * this.width + x;
    return this.visibility[player][index];
  }

  /**
   * Check if a position is visible
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} player - Player key
   * @returns {boolean} True if position is visible
   */
  isVisible(x, y, player) {
    return this.getVisibility(x, y, player) === 2;
  }

  /**
   * Check if a position is explored
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} player - Player key
   * @returns {boolean} True if position is explored
   */
  isExplored(x, y, player) {
    return this.getVisibility(x, y, player) >= 1;
  }

  /**
   * Reveal an area around a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - View radius
   * @param {string} player - Player key
   */
  revealArea(x, y, radius, player) {
    // Round to integers
    x = Math.floor(x);
    y = Math.floor(y);

    // Check bounds
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }

    // Get visibility grid
    const grid = this.visibility[player];

    // Reveal area
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        // Skip if out of bounds
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
          continue;
        }

        // Calculate distance from center
        const distSq = dx * dx + dy * dy;

        // Skip if beyond radius
        if (distSq > radius * radius) {
          continue;
        }

        // Get index in grid
        const index = ty * this.width + tx;

        // Check for line of sight if needed
        let hasLineOfSight = true;

        // Perform line of sight check for tiles near the edge of view radius
        if (distSq > (radius - 1) * (radius - 1)) {
          // Simple Bresenham line algorithm
          hasLineOfSight = this.hasLineOfSight(x, y, tx, ty, player);
        }

        // Reveal tile if in line of sight
        if (hasLineOfSight) {
          grid[index] = 2; // Set to visible
        }
      }
    }
  }

  /**
   * Check if there's line of sight between two points
   * @param {number} x1 - Starting X coordinate
   * @param {number} y1 - Starting Y coordinate
   * @param {number} x2 - Ending X coordinate
   * @param {number} y2 - Ending Y coordinate
   * @param {string} player - Player key
   * @returns {boolean} True if there's line of sight
   */
  hasLineOfSight(x1, y1, x2, y2, player) {
    // Get map
    const map = this.game.getSystem("map");
    if (!map) return true;

    // Use Bresenham's line algorithm
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      // Check for obstacles
      if (x !== x1 || y !== y1) {
        // Skip starting point
        const tile = map.getTile(x, y);

        if (tile && !tile.passable) {
          return false; // Blocked by obstacle
        }
      }

      // Reached destination
      if (x === x2 && y === y2) {
        return true;
      }

      // Calculate next point
      const e2 = 2 * err;

      if (e2 > -dy) {
        if (x === x2) break;
        err -= dy;
        x += sx;
      }

      if (e2 < dx) {
        if (y === y2) break;
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  /**
   * Mark explored areas that are no longer visible
   * @param {string} player - Player key
   */
  updateExploredAreas(player) {
    const grid = this.visibility[player];

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 2) {
        grid[i] = 1; // Set to explored
      }
    }
  }

  /**
   * Update fog of war based on entity positions
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    const now = Date.now();

    // Only do full updates periodically to avoid performance issues
    if (now - this.lastFullUpdate >= this.fullUpdateInterval) {
      this.fullUpdate();
      this.lastFullUpdate = now;
    }
  }

  /**
   * Perform a full fog of war update
   */
  fullUpdate() {
    // Get entity manager
    const entityManager = this.game.getSystem("entityManager");
    if (!entityManager) return;

    // Get player civilization
    const playerCiv = this.game.state.selectedCivilization;

    // Reset visibility for both civilizations (keep explored areas)
    this.updateExploredAreas("SOLARI");
    this.updateExploredAreas("LUNARI");

    // Update from entity positions
    for (const civ of ["SOLARI", "LUNARI"]) {
      // Get all entities belonging to this civilization
      const entities = entityManager.getEntitiesByOwner(civ);

      // Reveal areas around each entity
      for (const entity of entities) {
        // Skip if entity is not active
        if (!entity.active) continue;

        // Determine view range
        let viewRange = 3; // Default

        if (entity.type === "unit" || entity.type === "villager") {
          viewRange = 4;
        } else if (entity.type === "building") {
          if (
            entity.buildingType === "tower" ||
            entity.buildingType === "watchtower"
          ) {
            viewRange = 8;
          } else {
            viewRange = 5;
          }
        }

        // Reveal area
        this.revealArea(entity.x, entity.y, viewRange, civ);
      }
    }

    // Update fog texture for the player
    this.updateFogTexture(playerCiv);
  }

  /**
   * Update fog texture for rendering
   * @param {string} player - Player key
   */
  updateFogTexture(player) {
    const grid = this.visibility[player];

    // Clear canvas
    this.fogCtx.clearRect(0, 0, this.width, this.height);

    // Create ImageData
    const imageData = this.fogCtx.createImageData(this.width, this.height);
    const data = imageData.data;

    // Fill pixel data
    for (let i = 0; i < grid.length; i++) {
      const visibility = grid[i];
      const pixelIndex = i * 4;

      if (visibility === 0) {
        // Unexplored - solid black
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 255;
      } else if (visibility === 1) {
        // Explored but not visible - semi-transparent black
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 128;
      } else {
        // Visible - transparent
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 0;
      }
    }

    // Update canvas
    this.fogCtx.putImageData(imageData, 0, 0);

    // Create texture
    this.fogTexture = this.fogCanvas;
  }

  /**
   * Render fog of war
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {number} scale - Render scale
   */
  render(ctx, x, y, width, height, scale) {
    if (!this.fogTexture) return;

    // Draw fog texture
    ctx.drawImage(
      this.fogTexture,
      0,
      0,
      this.width,
      this.height,
      x,
      y,
      width,
      height
    );
  }

  /**
   * Reveal entire map for a player (debug/cheat function)
   * @param {string} player - Player key
   */
  revealMap(player) {
    const grid = this.visibility[player];

    for (let i = 0; i < grid.length; i++) {
      grid[i] = 2; // Set all tiles to visible
    }

    this.updateFogTexture(player);
    Utils.log(`Map revealed for ${player}`);
  }

  /**
   * Reset fog of war to initial state
   * @param {string} player - Player key
   */
  reset(player) {
    if (player) {
      // Reset for specific player
      this.visibility[player] = new Uint8Array(this.width * this.height);
    } else {
      // Reset for all players
      this.visibility.SOLARI = new Uint8Array(this.width * this.height);
      this.visibility.LUNARI = new Uint8Array(this.width * this.height);
    }

    this.updateFogTexture(this.game.state.selectedCivilization);
    Utils.log("Fog of war reset");
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = FogOfWar;
} else {
  window.FogOfWar = FogOfWar;
}
