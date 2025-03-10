/**
 * Wonder Entity Class
 *
 * Represents a Wonder, a special building that can trigger victory conditions.
 * Wonders are age-specific, expensive, and provide unique bonuses.
 */

import { Building } from "./building.js";
import { config } from "../config.js";

export class Wonder extends Building {
  /**
   * Create a new Wonder
   * @param {Game} game - Reference to the main game object
   * @param {number} x - X position on the map
   * @param {number} y - Y position on the map
   * @param {number} playerId - ID of the player who owns this Wonder
   * @param {string} wonderType - Type of wonder (e.g., 'pyramid', 'colossus', 'temple')
   * @param {number} age - The age this wonder belongs to
   */
  constructor(game, x, y, playerId, wonderType, age) {
    super(
      game,
      x,
      y,
      config.WONDERS[wonderType].width,
      config.WONDERS[wonderType].height,
      playerId
    );

    this.type = "wonder";
    this.wonderType = wonderType;
    this.age = age;

    // Set wonder-specific properties from config
    const wonderConfig = config.WONDERS[wonderType];
    this.name = wonderConfig.name;
    this.description = wonderConfig.description;
    this.maxHP = wonderConfig.hp;
    this.hp = this.maxHP;
    this.constructionTime = wonderConfig.constructionTime;
    this.completed = false;
    this.completionTimer = null;
    this.completionProgress = 0;

    // Victory-related
    this.victoryTimer = null;
    this.victoryCountdown = config.WONDER_VICTORY_TIME_MS;
    this.victoryStarted = false;

    // Wonder bonuses
    this.bonuses = wonderConfig.bonuses || {};

    // Appearance
    this.constructionPhases = wonderConfig.constructionPhases || 3;
    this.currentConstructionPhase = 0;

    // Add wonder to player's list of wonders
    if (this.owner) {
      this.owner.wonders.push(this);
    }

    // Register with victory condition system
    this.game.victoryManager.registerWonder(this);
  }

  /**
   * Start the construction process
   */
  startConstruction() {
    // Deduct resources
    const costs = config.WONDERS[this.wonderType].cost;
    this.owner.resources.deductResources(costs);

    // Start construction sound
    this.game.audio.playSound("wonder_construction_start", this.x, this.y);

    // Emit construction event
    this.game.events.emit("wonderConstructionStarted", {
      wonderType: this.wonderType,
      owner: this.owner.id,
      position: { x: this.x, y: this.y },
    });

    // Start construction timer
    this.constructing = true;
    this.completionTimer = setTimeout(() => {
      this.completeConstruction();
    }, this.constructionTime);

    // Initialize construction progress
    this.completionProgress = 0;

    // Schedule periodic updates for construction progress
    this.constructionInterval = setInterval(() => {
      this.updateConstructionProgress();
    }, 1000); // Update every second
  }

  /**
   * Update construction progress
   */
  updateConstructionProgress() {
    // Calculate new progress
    const progressStep = 100 / (this.constructionTime / 1000);
    this.completionProgress += progressStep;

    // Cap at 100%
    if (this.completionProgress > 100) {
      this.completionProgress = 100;
    }

    // Update construction phase if needed
    const newPhase = Math.floor(
      (this.completionProgress / 100) * this.constructionPhases
    );
    if (newPhase > this.currentConstructionPhase) {
      this.currentConstructionPhase = newPhase;
      // Play construction phase sound
      this.game.audio.playSound("wonder_construction_phase", this.x, this.y);
    }

    // Emit progress event
    this.game.events.emit("wonderConstructionProgress", {
      wonderType: this.wonderType,
      owner: this.owner.id,
      progress: this.completionProgress,
      phase: this.currentConstructionPhase,
    });
  }

  /**
   * Complete wonder construction
   */
  completeConstruction() {
    if (this.constructionInterval) {
      clearInterval(this.constructionInterval);
      this.constructionInterval = null;
    }

    this.constructing = false;
    this.completed = true;
    this.completionProgress = 100;
    this.currentConstructionPhase = this.constructionPhases;

    // Play completion sound
    this.game.audio.playSound("wonder_completed", this.x, this.y);

    // Apply bonuses from wonder
    this.applyBonuses();

    // Emit completion event
    this.game.events.emit("wonderCompleted", {
      wonderType: this.wonderType,
      owner: this.owner.id,
    });

    // Start victory countdown if appropriate
    if (config.VICTORY_CONDITIONS.includes("wonder")) {
      this.startVictoryCountdown();
    }

    // Create a global alert for all players
    this.game.alertSystem.createGlobalAlert({
      type: "wonder",
      message: `${this.owner.name} has completed the ${this.name}!`,
      position: { x: this.x, y: this.y },
      wonderType: this.wonderType,
      owner: this.owner.id,
    });
  }

  /**
   * Apply wonder bonuses to owner's civilization
   */
  applyBonuses() {
    if (!this.owner || !this.bonuses) return;

    for (const [bonusType, value] of Object.entries(this.bonuses)) {
      switch (bonusType) {
        case "resourceRate":
          // Apply resource rate bonuses
          for (const [resource, bonus] of Object.entries(value)) {
            this.owner.resources.addRateBonus(resource, bonus);
          }
          break;

        case "unitBonus":
          // Apply unit-specific bonuses
          for (const [unitType, stats] of Object.entries(value)) {
            this.owner.addUnitBonus(unitType, stats);
          }
          break;

        case "buildingBonus":
          // Apply building-specific bonuses
          for (const [buildingType, stats] of Object.entries(value)) {
            this.owner.addBuildingBonus(buildingType, stats);
          }
          break;

        case "populationCap":
          // Increase population cap
          this.owner.maxPopulation += value;
          break;

        case "techUnlock":
          // Unlock technologies
          for (const tech of value) {
            this.owner.techManager.unlockTechnology(tech);
          }
          break;

        case "visionBonus":
          // Increase vision range
          this.owner.visionBonus += value;
          break;

        case "specialAbility":
          // Enable special abilities
          this.owner.enableSpecialAbility(value);
          break;

        default:
          console.warn(`Unknown wonder bonus type: ${bonusType}`);
      }
    }

    // Update UI to reflect bonuses
    this.game.ui.updateResourceDisplay();

    // Update all existing entities to apply bonuses
    if (this.owner) {
      this.owner.applyBonusesToAllEntities();
    }
  }

  /**
   * Start the victory countdown
   */
  startVictoryCountdown() {
    if (this.victoryStarted) return;

    this.victoryStarted = true;

    // Emit event for victory countdown start
    this.game.events.emit("wonderVictoryCountdownStarted", {
      wonderType: this.wonderType,
      owner: this.owner.id,
      timeRemaining: this.victoryCountdown,
    });

    // Create a global alert for all players
    this.game.alertSystem.createGlobalAlert({
      type: "wonder_victory",
      message: `${this.owner.name} has started a Wonder Victory countdown!`,
      position: { x: this.x, y: this.y },
      wonderType: this.wonderType,
      owner: this.owner.id,
      timeRemaining: this.victoryCountdown,
    });

    // Start victory timer
    this.victoryTimer = setInterval(() => {
      this.updateVictoryCountdown();
    }, 1000); // Update every second
  }

  /**
   * Update the victory countdown
   */
  updateVictoryCountdown() {
    this.victoryCountdown -= 1000;

    // Emit time remaining event every minute or when time is low
    if (this.victoryCountdown % 60000 === 0 || this.victoryCountdown <= 10000) {
      this.game.events.emit("wonderVictoryCountdownUpdate", {
        wonderType: this.wonderType,
        owner: this.owner.id,
        timeRemaining: this.victoryCountdown,
      });

      // Generate alerts at specific intervals
      if (
        this.victoryCountdown === 60000 || // 1 minute
        this.victoryCountdown === 30000 || // 30 seconds
        this.victoryCountdown === 10000
      ) {
        // 10 seconds

        const timeStr =
          this.victoryCountdown === 60000
            ? "1 minute"
            : `${this.victoryCountdown / 1000} seconds`;

        this.game.alertSystem.createGlobalAlert({
          type: "wonder_victory_countdown",
          message: `${this.owner.name}'s Wonder Victory in ${timeStr}!`,
          position: { x: this.x, y: this.y },
          wonderType: this.wonderType,
          owner: this.owner.id,
          timeRemaining: this.victoryCountdown,
        });
      }
    }

    // Check for victory condition
    if (this.victoryCountdown <= 0) {
      this.achieveVictory();
    }
  }

  /**
   * Trigger victory for the owner
   */
  achieveVictory() {
    if (this.victoryTimer) {
      clearInterval(this.victoryTimer);
      this.victoryTimer = null;
    }

    // Declare victory
    this.game.victoryManager.declareVictory(this.owner.id, "wonder", {
      wonderType: this.wonderType,
      wonderName: this.name,
    });
  }

  /**
   * Handle wonder damage and destruction
   * @param {number} amount - Amount of damage
   * @param {Entity} attacker - Entity that caused the damage
   */
  takeDamage(amount, attacker) {
    super.takeDamage(amount, attacker);

    // If wonder is destroyed, cancel victory countdown
    if (this.hp <= 0) {
      if (this.victoryTimer) {
        clearInterval(this.victoryTimer);
        this.victoryTimer = null;
      }

      if (this.victoryStarted) {
        this.victoryStarted = false;

        // Emit event for victory countdown canceled
        this.game.events.emit("wonderVictoryCountdownCanceled", {
          wonderType: this.wonderType,
          owner: this.owner.id,
        });

        // Create a global alert for all players
        this.game.alertSystem.createGlobalAlert({
          type: "wonder_destroyed",
          message: `${this.owner.name}'s ${this.name} has been destroyed!`,
          position: { x: this.x, y: this.y },
          wonderType: this.wonderType,
          owner: this.owner.id,
        });
      }
    }
  }

  /**
   * Cancel construction if in progress
   */
  cancelConstruction() {
    if (!this.constructing) return;

    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }

    if (this.constructionInterval) {
      clearInterval(this.constructionInterval);
      this.constructionInterval = null;
    }

    this.constructing = false;

    // Refund a percentage of resources
    const costs = config.WONDERS[this.wonderType].cost;
    const refundPercentage = config.CONSTRUCTION_CANCEL_REFUND_PERCENTAGE;

    const refunds = {};
    for (const [resource, amount] of Object.entries(costs)) {
      refunds[resource] = Math.floor(amount * (refundPercentage / 100));
    }

    this.owner.resources.addResources(refunds);

    // Emit cancellation event
    this.game.events.emit("wonderConstructionCanceled", {
      wonderType: this.wonderType,
      owner: this.owner.id,
      position: { x: this.x, y: this.y },
    });

    // Play cancel sound
    this.game.audio.playSound("construction_canceled", this.x, this.y);
  }

  /**
   * Draw the wonder on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} viewportX - Viewport X offset
   * @param {number} viewportY - Viewport Y offset
   */
  draw(ctx, viewportX, viewportY) {
    const screenX = this.x - viewportX;
    const screenY = this.y - viewportY;

    // Determine which sprite to use based on construction phase
    let spriteName;
    if (!this.completed && this.constructing) {
      // During construction, use phase-specific sprites
      spriteName = `wonder_${this.wonderType}_construction_${this.currentConstructionPhase}`;
    } else if (this.completed) {
      // Complete wonder
      spriteName = `wonder_${this.wonderType}_complete`;

      // Add victory countdown effect if active
      if (this.victoryStarted) {
        // Draw aura effect around wonder
        const glowRadius = Math.min(this.width, this.height) * 0.7;
        const gradient = ctx.createRadialGradient(
          screenX + this.width / 2,
          screenY + this.height / 2,
          0,
          screenX + this.width / 2,
          screenY + this.height / 2,
          glowRadius
        );

        // Get player color for the glow
        const ownerColor = this.owner ? this.owner.primaryColor : "#FFFFFF";

        gradient.addColorStop(0, `${ownerColor}80`); // Semi-transparent
        gradient.addColorStop(0.7, `${ownerColor}40`); // More transparent
        gradient.addColorStop(1, `${ownerColor}00`); // Fully transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          screenX + this.width / 2,
          screenY + this.height / 2,
          glowRadius,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Pulse effect based on countdown
        const pulseFrequency = Math.max(
          0.5,
          (this.victoryCountdown / config.WONDER_VICTORY_TIME_MS) * 2
        );
        const pulseAmount =
          0.2 * Math.sin(Date.now() * 0.001 * pulseFrequency) + 0.8;

        ctx.globalAlpha = pulseAmount;
      }
    } else {
      // Foundation only when not under construction
      spriteName = `wonder_${this.wonderType}_foundation`;
    }

    // Draw the appropriate sprite
    if (this.game.assets.isLoaded(spriteName)) {
      ctx.drawImage(
        this.game.assets.getImage(spriteName),
        screenX,
        screenY,
        this.width,
        this.height
      );
    } else {
      // Fallback if sprite not loaded
      ctx.fillStyle = this.owner ? this.owner.primaryColor : "#FFFFFF";
      ctx.fillRect(screenX, screenY, this.width, this.height);

      ctx.fillStyle = "#000000";
      ctx.font = "14px Arial";
      ctx.fillText(
        `Wonder: ${this.name}`,
        screenX + 10,
        screenY + this.height / 2
      );
    }

    // Reset alpha if it was changed
    ctx.globalAlpha = 1.0;

    // Draw construction progress if building
    if (this.constructing) {
      const progressBarWidth = this.width - 10;
      const progressBarHeight = 8;

      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(
        screenX + 5,
        screenY - 15,
        progressBarWidth,
        progressBarHeight
      );

      // Progress bar
      ctx.fillStyle = "#00FF00";
      ctx.fillRect(
        screenX + 5,
        screenY - 15,
        progressBarWidth * (this.completionProgress / 100),
        progressBarHeight
      );
    }

    // Draw victory countdown if active
    if (this.victoryStarted) {
      const minutes = Math.floor(this.victoryCountdown / 60000);
      const seconds = Math.floor((this.victoryCountdown % 60000) / 1000);
      const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // Background for text
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(screenX + this.width / 2 - 40, screenY - 30, 80, 25);

      // Time text
      ctx.fillStyle = "#FFFF00";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(timeText, screenX + this.width / 2, screenY - 12);

      // Reset text alignment
      ctx.textAlign = "left";
    }

    // Draw selection indicator if selected
    if (this.selected) {
      this.drawSelectionIndicator(ctx, screenX, screenY);
    }

    // Draw health bar
    this.drawHealthBar(ctx, screenX, screenY);
  }

  /**
   * Clean up when wonder is removed from the game
   */
  cleanup() {
    super.cleanup();

    // Clear timers
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }

    if (this.constructionInterval) {
      clearInterval(this.constructionInterval);
      this.constructionInterval = null;
    }

    if (this.victoryTimer) {
      clearInterval(this.victoryTimer);
      this.victoryTimer = null;
    }

    // Unregister from victory manager
    this.game.victoryManager.unregisterWonder(this);

    // Remove from owner's wonder list
    if (this.owner && this.owner.wonders) {
      const index = this.owner.wonders.indexOf(this);
      if (index !== -1) {
        this.owner.wonders.splice(index, 1);
      }
    }
  }

  /**
   * Serialize wonder data for saving
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      ...super.serialize(),
      wonderType: this.wonderType,
      age: this.age,
      completed: this.completed,
      completionProgress: this.completionProgress,
      currentConstructionPhase: this.currentConstructionPhase,
      victoryStarted: this.victoryStarted,
      victoryCountdown: this.victoryCountdown,
    };
  }

  /**
   * Deserialize data to restore wonder state
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    super.deserialize(data);

    this.wonderType = data.wonderType;
    this.age = data.age;
    this.completed = data.completed;
    this.completionProgress = data.completionProgress;
    this.currentConstructionPhase = data.currentConstructionPhase;
    this.victoryStarted = data.victoryStarted;
    this.victoryCountdown = data.victoryCountdown;

    // Restart victory countdown if it was active
    if (this.victoryStarted) {
      this.victoryTimer = setInterval(() => {
        this.updateVictoryCountdown();
      }, 1000);
    }

    // Register with victory manager
    this.game.victoryManager.registerWonder(this);
  }
}
