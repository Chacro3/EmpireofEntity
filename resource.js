/**
 * Resource Entity Class
 *
 * Represents resource nodes on the map such as trees, berry bushes, gold mines, etc.
 * Resources can be gathered by villagers and have a limited amount before depletion.
 */

import { Entity } from "./entity.js";
import { config } from "../config.js";

export class Resource extends Entity {
  /**
   * Create a new resource node
   * @param {Game} game - Reference to the main game object
   * @param {number} x - X position on the map
   * @param {number} y - Y position on the map
   * @param {string} type - The resource type ('wood', 'food', 'gold', 'stone', 'iron')
   * @param {number} amount - The initial amount of the resource
   */
  constructor(game, x, y, type, amount) {
    // Set appropriate size based on resource type
    let width, height;
    switch (type) {
      case "wood":
        width = config.TREE_WIDTH;
        height = config.TREE_HEIGHT;
        break;
      case "food":
        width = config.BERRY_BUSH_WIDTH;
        height = config.BERRY_BUSH_HEIGHT;
        break;
      case "gold":
      case "stone":
      case "iron":
        width = config.MINE_WIDTH;
        height = config.MINE_HEIGHT;
        break;
      default:
        width = 32;
        height = 32;
    }

    super(game, x, y, width, height);

    this.type = "resource";
    this.resourceType = type;
    this.initialAmount = amount;
    this.amount = amount;
    this.gatheringSpots = this.calculateGatheringSpots();
    this.gatherers = new Set(); // Track units gathering from this resource

    // Determine appropriate sprites based on resource type
    this.sprites = this.determineSprites();

    // Set collision properties
    this.blocksMovement = true;
    this.blocksVision = type === "wood"; // Only trees block vision

    // Track depletion status
    this.depleted = false;
    this.regrowthTimer = null;

    // Determine if this resource is part of a larger cluster
    this.cluster = null;
  }

  /**
   * Calculate valid gathering spots around the resource
   * @returns {Array<{x: number, y: number}>} Array of valid positions to gather from
   */
  calculateGatheringSpots() {
    const spots = [];
    // Check surrounding tiles in a grid around the resource
    for (let xOffset = -1; xOffset <= this.width / 32; xOffset++) {
      for (let yOffset = -1; yOffset <= this.height / 32; yOffset++) {
        // Skip the center tiles where the resource itself is
        if (
          xOffset >= 0 &&
          xOffset < this.width / 32 &&
          yOffset >= 0 &&
          yOffset < this.height / 32
        ) {
          continue;
        }

        const spotX = this.x + xOffset * 32;
        const spotY = this.y + yOffset * 32;

        // Validate the spot is on walkable terrain
        if (this.game.map.isWalkable(spotX, spotY)) {
          spots.push({ x: spotX, y: spotY });
        }
      }
    }
    return spots;
  }

  /**
   * Determine sprites to use based on resource type
   * @returns {Object} Object containing sprite information
   */
  determineSprites() {
    switch (this.resourceType) {
      case "wood":
        return {
          full: "tree_full",
          half: "tree_half",
          stump: "tree_stump",
        };
      case "food":
        return {
          full: "berry_bush_full",
          half: "berry_bush_half",
          depleted: "berry_bush_empty",
        };
      case "gold":
        return {
          full: "gold_mine_full",
          half: "gold_mine_half",
          depleted: "gold_mine_empty",
        };
      case "stone":
        return {
          full: "stone_mine_full",
          half: "stone_mine_half",
          depleted: "stone_mine_empty",
        };
      case "iron":
        return {
          full: "iron_mine_full",
          half: "iron_mine_half",
          depleted: "iron_mine_empty",
        };
      default:
        return {
          full: "unknown_resource",
          half: "unknown_resource",
          depleted: "unknown_resource",
        };
    }
  }

  /**
   * Get an available gathering spot
   * @param {Unit} unit - The unit requesting a gathering spot
   * @returns {Object|null} Position object or null if no spots available
   */
  getGatheringSpot(unit) {
    // If unit already has a spot, return it
    for (const gatherer of this.gatherers) {
      if (gatherer.unit === unit) {
        return gatherer.spot;
      }
    }

    // Find spots that aren't being used
    const availableSpots = this.gatheringSpots.filter((spot) => {
      return !Array.from(this.gatherers).some(
        (g) => g.spot.x === spot.x && g.spot.y === spot.y
      );
    });

    if (availableSpots.length > 0) {
      // Find the closest available spot
      const closestSpot = availableSpots.reduce((closest, spot) => {
        const distance = Math.hypot(unit.x - spot.x, unit.y - spot.y);
        if (closest === null || distance < closest.distance) {
          return { spot, distance };
        }
        return closest;
      }, null);

      // Assign the spot to the unit
      this.gatherers.add({ unit, spot: closestSpot.spot });
      return closestSpot.spot;
    }

    // No spots available
    return null;
  }

  /**
   * Release a gathering spot when unit is done
   * @param {Unit} unit - The unit releasing its spot
   */
  releaseGatheringSpot(unit) {
    for (const gatherer of this.gatherers) {
      if (gatherer.unit === unit) {
        this.gatherers.delete(gatherer);
        break;
      }
    }
  }

  /**
   * Handle a unit gathering from this resource
   * @param {Unit} unit - The unit gathering
   * @param {number} amount - Amount to gather
   * @returns {number} Amount actually gathered
   */
  gather(unit, amount) {
    if (this.depleted) return 0;

    // Limit gather amount to what's available
    const actualAmount = Math.min(this.amount, amount);
    this.amount -= actualAmount;

    // Check if resource is now depleted
    if (this.amount <= 0) {
      this.amount = 0;
      this.handleDepletion();
    } else if (this.amount <= this.initialAmount / 2) {
      // Update appearance when half depleted
      this.currentSprite = this.sprites.half;
      // Emit event for resource state change
      this.game.events.emit("resourceStateChange", this);
    }

    return actualAmount;
  }

  /**
   * Handle resource depletion
   */
  handleDepletion() {
    this.depleted = true;

    // Update sprite to depleted/stump appearance
    this.currentSprite =
      this.resourceType === "wood" ? this.sprites.stump : this.sprites.depleted;

    // Tell all gatherers to stop gathering
    for (const gatherer of this.gatherers) {
      gatherer.unit.stopGathering();
    }
    this.gatherers.clear();

    // Emit depletion event
    this.game.events.emit("resourceDepleted", this);

    // For trees, they may regrow after some time
    if (this.resourceType === "wood" && config.TREES_REGROW) {
      this.startRegrowthTimer();
    }

    // If this resource is no longer blocking, update the map
    if (this.blocksMovement) {
      this.blocksMovement = false;
      this.game.map.updateWalkable(this.x, this.y, true);
    }
  }

  /**
   * Start a regrowth timer for wood resources
   */
  startRegrowthTimer() {
    const regrowthTime =
      config.TREE_REGROWTH_TIME_MS +
      Math.random() * config.TREE_REGROWTH_VARIANCE_MS;

    this.regrowthTimer = setTimeout(() => {
      this.regrow();
    }, regrowthTime);
  }

  /**
   * Regrow the resource
   */
  regrow() {
    // Only trees should regrow
    if (this.resourceType !== "wood") return;

    this.amount = this.initialAmount;
    this.depleted = false;
    this.currentSprite = this.sprites.full;
    this.blocksMovement = true;
    this.blocksVision = true;

    // Update the map
    this.game.map.updateWalkable(this.x, this.y, false);

    // Emit regrowth event
    this.game.events.emit("resourceRegrown", this);
  }

  /**
   * Get the current appearance state of the resource
   * @returns {string} State description: 'full', 'half', or 'depleted'
   */
  getState() {
    if (this.depleted) {
      return "depleted";
    } else if (this.amount <= this.initialAmount / 2) {
      return "half";
    } else {
      return "full";
    }
  }

  /**
   * Assign this resource to a cluster
   * @param {Object} cluster - The resource cluster object
   */
  setCluster(cluster) {
    this.cluster = cluster;
  }

  /**
   * Get harvestable amount remaining
   * @returns {number} Amount of resource remaining
   */
  getAmountRemaining() {
    return this.amount;
  }

  /**
   * Get percentage of resource remaining
   * @returns {number} Percentage from 0-100
   */
  getPercentRemaining() {
    return (this.amount / this.initialAmount) * 100;
  }

  /**
   * Override update method to handle regrowth and other time-based effects
   * @param {number} deltaTime - Time elapsed since last update in ms
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Additional resource-specific update logic can go here
  }

  /**
   * Clean up when resource is removed from the game
   */
  cleanup() {
    super.cleanup();

    // Clear regrowth timer if active
    if (this.regrowthTimer) {
      clearTimeout(this.regrowthTimer);
      this.regrowthTimer = null;
    }

    // Release all gathering spots
    this.gatherers.clear();
  }

  /**
   * Draw the resource on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} viewportX - Viewport X offset
   * @param {number} viewportY - Viewport Y offset
   */
  draw(ctx, viewportX, viewportY) {
    const screenX = this.x - viewportX;
    const screenY = this.y - viewportY;

    // Determine which sprite to use based on resource state
    let sprite;
    if (this.depleted) {
      sprite =
        this.resourceType === "wood"
          ? this.sprites.stump
          : this.sprites.depleted;
    } else if (this.amount <= this.initialAmount / 2) {
      sprite = this.sprites.half;
    } else {
      sprite = this.sprites.full;
    }

    // Draw the appropriate sprite
    if (this.game.assets.isLoaded(sprite)) {
      ctx.drawImage(
        this.game.assets.getImage(sprite),
        screenX,
        screenY,
        this.width,
        this.height
      );
    } else {
      // Fallback if sprite not loaded
      ctx.fillStyle = this.getFallbackColor();
      ctx.fillRect(screenX, screenY, this.width, this.height);
    }

    // Debug mode: draw gathering spots
    if (config.DEBUG_DRAW_GATHERING_SPOTS) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      for (const spot of this.gatheringSpots) {
        ctx.beginPath();
        ctx.arc(spot.x - viewportX, spot.y - viewportY, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw amount remaining in debug mode
    if (config.DEBUG_DRAW_RESOURCE_AMOUNTS) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px Arial";
      ctx.fillText(
        `${this.amount}/${this.initialAmount}`,
        screenX,
        screenY - 5
      );
    }
  }

  /**
   * Get a fallback color for the resource type
   * @returns {string} CSS color
   */
  getFallbackColor() {
    switch (this.resourceType) {
      case "wood":
        return "#006400"; // Dark green
      case "food":
        return "#FF0000"; // Red
      case "gold":
        return "#FFD700"; // Gold
      case "stone":
        return "#808080"; // Gray
      case "iron":
        return "#708090"; // Slate gray
      default:
        return "#FFFFFF";
    }
  }

  /**
   * Serialize resource data for saving
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      ...super.serialize(),
      resourceType: this.resourceType,
      amount: this.amount,
      initialAmount: this.initialAmount,
      depleted: this.depleted,
    };
  }

  /**
   * Deserialize data to restore resource state
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    super.deserialize(data);
    this.resourceType = data.resourceType;
    this.amount = data.amount;
    this.initialAmount = data.initialAmount;
    this.depleted = data.depleted;

    // Update appearance based on current state
    if (this.depleted) {
      this.currentSprite =
        this.resourceType === "wood"
          ? this.sprites.stump
          : this.sprites.depleted;
    } else if (this.amount <= this.initialAmount / 2) {
      this.currentSprite = this.sprites.half;
    } else {
      this.currentSprite = this.sprites.full;
    }

    // Recalculate gathering spots
    this.gatheringSpots = this.calculateGatheringSpots();
  }
}
