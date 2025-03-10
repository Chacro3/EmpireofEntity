/**
 * Empires of Eternity - Entity Base Class
 * Provides the foundation for all game objects (units, buildings, resources, etc.)
 * Updated for Phaser integration
 */

class Entity {
  /**
   * Create a new entity
   * @param {Object} params - Entity parameters
   */
  constructor(params = {}) {
    // Core properties
    this.id = params.id || Utils.generateId();
    this.type = params.type || "unknown";
    this.owner = params.owner || null; // Civilization that owns this entity

    // Position and dimensions
    this.x = params.x || 0; // Grid X coordinate
    this.y = params.y || 0; // Grid Y coordinate
    this.width = params.width || 1; // Width in grid cells
    this.height = params.height || 1; // Height in grid cells

    // Stats
    this.hp = params.hp || 0; // Current health points
    this.maxHp = params.maxHp || 0; // Maximum health points
    this.dp = params.dp || 0; // Defense points
    this.ar = params.ar || 0; // Attack rating

    // Combat and damage
    this.damageType = params.damageType || null; // Slashing, piercing, blunt
    this.attackRange = params.attackRange || 1; // Attack range in tiles
    this.attackCooldown = params.attackCooldown || 1; // Seconds between attacks
    this.currentCooldown = 0; // Current cooldown timer

    // State flags
    this.selected = false; // Whether entity is selected
    this.visible = params.visible || false; // Whether entity is visible on-screen
    this.active = true; // Whether entity is active (can be disabled/removed)
    this.deployed = params.deployed || true; // Whether entity has been fully placed/built

    // Animation state
    this.state = params.state || "idle"; // Current state (idle, moving, attacking, etc.)
    this.stateTime = 0; // Time spent in current state
    this.animFrame = 0; // Current animation frame

    // Movement
    this.speed = params.speed || 0; // Movement speed (tiles per second)
    this.targetX = null; // Target X position
    this.targetY = null; // Target Y position
    this.path = null; // Current path being followed
    this.pathIndex = 0; // Index in current path

    // Attributes and tags
    this.attributes = params.attributes || {}; // Additional attributes
    this.tags = params.tags || []; // Tags for grouping/filtering

    // Event listeners
    this.listeners = {
      select: [],
      deselect: [],
      damage: [],
      death: [],
      move: [],
      attack: [],
      create: [],
      destroy: [],
    };

    // Phaser integration
    this.sprite = params.sprite || null;
    this.selectionIndicator = null;
    this.healthBar = null;

    // Get tile size from CONFIG
    this.tileSize = CONFIG ? CONFIG.MAP.TILE_SIZE : 64;

    // Trigger create event
    this.triggerEvent("create", { entity: this });

    Utils.log(
      `Created entity ${this.id} of type ${this.type} at (${this.x}, ${this.y})`
    );

    // Initialize visuals if sprite exists
    if (this.sprite) {
      this.initializeVisuals();
    }
  }

  /**
   * Initialize entity visuals
   */
  initializeVisuals() {
    // Set sprite position
    this.updateSpritePosition();

    // Set sprite depth based on Y position for isometric effect
    this.sprite.setDepth(this.y);

    // Set sprite origin to bottom center for better visual placement
    this.sprite.setOrigin(0.5, 0.75);

    // Add health bar if this is a unit or building
    if (this.type !== "resource" && this.maxHp > 0) {
      this.createHealthBar();
    }
  }

  /**
   * Create health bar for this entity
   */
  createHealthBar() {
    if (!this.sprite || !this.sprite.scene) return;

    const scene = this.sprite.scene;
    const width = 32;
    const height = 4;

    // Create background
    const barBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - this.sprite.height / 2 - 5,
      width,
      height,
      0x000000,
      0.7
    );

    // Create health fill
    const barFill = scene.add.rectangle(
      this.sprite.x - width / 2,
      this.sprite.y - this.sprite.height / 2 - 5,
      width * (this.hp / this.maxHp),
      height,
      0x00ff00,
      1
    );
    barFill.setOrigin(0, 0.5);

    // Group them
    this.healthBar = {
      background: barBg,
      fill: barFill,
      update: () => {
        const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
        barFill.width = width * ratio;

        // Update position
        barBg.x = this.sprite.x;
        barBg.y = this.sprite.y - this.sprite.height / 2 - 5;
        barFill.x = this.sprite.x - width / 2;
        barFill.y = this.sprite.y - this.sprite.height / 2 - 5;

        // Update color based on health
        if (ratio > 0.6) {
          barFill.fillColor = 0x00ff00; // Green
        } else if (ratio > 0.3) {
          barFill.fillColor = 0xffff00; // Yellow
        } else {
          barFill.fillColor = 0xff0000; // Red
        }

        // Update visibility
        barBg.visible = this.selected || this.hp < this.maxHp;
        barFill.visible = this.selected || this.hp < this.maxHp;
      },
    };

    // Initially hide health bar unless damaged
    this.healthBar.background.visible = this.selected || this.hp < this.maxHp;
    this.healthBar.fill.visible = this.selected || this.hp < this.maxHp;

    // Set depth to always be above the sprite
    this.healthBar.background.setDepth(this.sprite.depth + 1);
    this.healthBar.fill.setDepth(this.sprite.depth + 1);
  }

  /**
   * Update the entity's sprite position
   */
  updateSpritePosition() {
    if (!this.sprite) return;

    // Convert grid coordinates to pixel coordinates
    const pixelX = this.x * this.tileSize;
    const pixelY = this.y * this.tileSize;

    this.sprite.x = pixelX;
    this.sprite.y = pixelY;

    // Update health bar if exists
    if (this.healthBar) {
      this.healthBar.update();
    }

    // Update selection indicator if exists
    if (this.selectionIndicator) {
      this.selectionIndicator.x = pixelX;
      this.selectionIndicator.y = pixelY;
    }
  }

  /**
   * Update the entity's state
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    // Update state time
    this.stateTime += deltaTime;

    // Handle attack cooldown
    if (this.currentCooldown > 0) {
      this.currentCooldown = Math.max(0, this.currentCooldown - deltaTime);
    }

    // Update based on current state
    switch (this.state) {
      case "moving":
        this.updateMovement(deltaTime);
        break;

      case "attacking":
        this.updateAttack(deltaTime);
        break;

      case "gathering":
        this.updateGathering(deltaTime);
        break;

      case "constructing":
        this.updateConstructing(deltaTime);
        break;

      case "repairing":
        this.updateRepairing(deltaTime);
        break;

      case "idle":
      default:
        // Idle animations or effects could be handled here
        break;
    }

    // Update health bar if exists
    if (this.healthBar) {
      this.healthBar.update();
    }
  }

  /**
   * Update movement state
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateMovement(deltaTime) {
    if (!this.path || this.pathIndex >= this.path.length) {
      this.stopMoving();
      return;
    }

    // Get current target point in path
    const target = this.path[this.pathIndex];

    // Calculate distance to move this frame
    const moveDistance = this.speed * deltaTime;

    // Calculate direction vector
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we've reached the target point (or close enough)
    if (distance <= moveDistance) {
      // Move directly to target
      this.x = target.x;
      this.y = target.y;

      // Move to next point in path
      this.pathIndex++;

      // If at end of path, stop moving
      if (this.pathIndex >= this.path.length) {
        this.stopMoving();
        return;
      }
    } else {
      // Move towards target
      const dirX = dx / distance;
      const dirY = dy / distance;

      this.x += dirX * moveDistance;
      this.y += dirY * moveDistance;
    }

    // Update sprite position
    this.updateSpritePosition();

    // Trigger move event
    this.triggerEvent("move", { entity: this, x: this.x, y: this.y });
  }

  /**
   * Update attack state
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateAttack(deltaTime) {
    // Check if we have a target
    if (!this.attackTarget || !this.attackTarget.active) {
      this.stopAttacking();
      return;
    }

    // Check if target is in range
    const distance = Utils.distance(
      this.x,
      this.y,
      this.attackTarget.x,
      this.attackTarget.y
    );

    if (distance > this.attackRange) {
      // Move towards target
      this.moveTo(this.attackTarget.x, this.attackTarget.y);
      return;
    }

    // Check cooldown
    if (this.currentCooldown <= 0) {
      // Perform attack
      this.performAttack();

      // Reset cooldown
      this.currentCooldown = this.attackCooldown;
    }
  }

  /**
   * Update gathering state (placeholder for resource gathering)
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateGathering(deltaTime) {
    // Should be implemented by specialized entity classes like Villager
  }

  /**
   * Update constructing state (placeholder for building construction)
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateConstructing(deltaTime) {
    // Should be implemented by specialized entity classes like Villager
  }

  /**
   * Update repairing state (placeholder for building/wall repair)
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateRepairing(deltaTime) {
    // Should be implemented by specialized entity classes like Villager
  }

  /**
   * Perform an attack on the current target
   */
  performAttack() {
    if (!this.attackTarget || !this.attackTarget.active) {
      this.stopAttacking();
      return;
    }

    // Calculate damage
    const damage = Utils.calculateDamage(
      this.ar,
      this.attackTarget.dp,
      this.damageType
    );

    // Apply damage to target
    this.attackTarget.takeDamage(damage, this);

    // Trigger attack event
    this.triggerEvent("attack", {
      entity: this,
      target: this.attackTarget,
      damage: damage,
    });

    // Create attack animation if sprite exists
    if (this.sprite && this.sprite.scene) {
      // Flash the attacker briefly
      this.sprite.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.7,
        duration: 100,
        yoyo: true,
      });

      // Create a projectile or slash effect based on unit type
      if (this.type === "archer" || this.type === "catapult") {
        this.createProjectile(this.attackTarget);
      } else {
        this.createSlashEffect(this.attackTarget);
      }
    }
  }

  /**
   * Create a projectile effect
   * @param {Entity} target - Target entity
   */
  createProjectile(target) {
    if (!this.sprite || !this.sprite.scene || !target.sprite) return;

    const scene = this.sprite.scene;
    const projectile = scene.add.circle(
      this.sprite.x,
      this.sprite.y,
      5,
      this.type === "archer" ? 0x000000 : 0x8b4513
    );

    // Set depth to be above units
    projectile.setDepth(9000);

    // Animate projectile to target
    scene.tweens.add({
      targets: projectile,
      x: target.sprite.x,
      y: target.sprite.y,
      duration: this.type === "archer" ? 300 : 500,
      ease: "Power1",
      onComplete: () => {
        // Create impact effect
        const impact = scene.add.circle(
          target.sprite.x,
          target.sprite.y,
          10,
          0xffffff,
          0.7
        );
        impact.setDepth(9001);

        // Fade out impact
        scene.tweens.add({
          targets: impact,
          alpha: 0,
          scale: 1.5,
          duration: 200,
          onComplete: () => {
            impact.destroy();
          },
        });

        projectile.destroy();
      },
    });
  }

  /**
   * Create a slash effect
   * @param {Entity} target - Target entity
   */
  createSlashEffect(target) {
    if (!this.sprite || !this.sprite.scene || !target.sprite) return;

    const scene = this.sprite.scene;
    const slashGraphics = scene.add.graphics();

    // Draw slash line
    slashGraphics.lineStyle(2, 0xffffff, 1);
    slashGraphics.lineBetween(
      this.sprite.x,
      this.sprite.y,
      target.sprite.x,
      target.sprite.y
    );

    // Set depth to be above units
    slashGraphics.setDepth(9000);

    // Fade out slash
    scene.tweens.add({
      targets: slashGraphics,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        slashGraphics.destroy();
      },
    });
  }

  /**
   * Take damage from an attacker
   * @param {number} amount - Amount of damage to take
   * @param {Entity} attacker - Entity causing the damage
   */
  takeDamage(amount, attacker) {
    if (!this.active) return;

    // Apply damage
    this.hp = Math.max(0, this.hp - amount);

    // Trigger damage event
    this.triggerEvent("damage", {
      entity: this,
      amount: amount,
      attacker: attacker,
    });

    // Update health bar
    if (this.healthBar) {
      this.healthBar.update();
    }

    // Create damage indicator if sprite exists
    if (this.sprite && this.sprite.scene) {
      const scene = this.sprite.scene;

      // Flash the sprite red
      scene.tweens.add({
        targets: this.sprite,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
      });

      // Create damage text
      const damageText = scene.add.text(
        this.sprite.x,
        this.sprite.y - 20,
        amount.toString(),
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ff0000",
          stroke: "#000000",
          strokeThickness: 2,
        }
      );
      damageText.setOrigin(0.5, 0.5);
      damageText.setDepth(9000);

      // Animate damage text
      scene.tweens.add({
        targets: damageText,
        y: this.sprite.y - 40,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          damageText.destroy();
        },
      });
    }

    // Check if killed
    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  /**
   * Die from damage
   * @param {Entity} killer - Entity that killed this one
   */
  die(killer) {
    // Trigger death event
    this.triggerEvent("death", { entity: this, killer: killer });

    // Deactivate entity
    this.active = false;

    // Create death effect if sprite exists
    if (this.sprite && this.sprite.scene) {
      const scene = this.sprite.scene;

      // Create death animation
      scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: 0.8,
        angle: 90,
        duration: 500,
        onComplete: () => {
          this.destroy();
        },
      });
    } else {
      this.destroy();
    }
  }

  /**
   * Move to a target position
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   */
  moveTo(targetX, targetY) {
    if (!this.active) return;

    // Set target position
    this.targetX = targetX;
    this.targetY = targetY;

    // Calculate path
    const game = window.gameInstance; // Assuming global game instance
    if (game) {
      const map = game.getSystem("map");
      if (map) {
        this.path = map.findPath(
          Math.floor(this.x),
          Math.floor(this.y),
          Math.floor(targetX),
          Math.floor(targetY)
        );

        if (this.path) {
          this.pathIndex = 0;
          this.state = "moving";

          // Skip first point if it's our current position
          if (
            this.path.length > 0 &&
            this.path[0].x === Math.floor(this.x) &&
            this.path[0].y === Math.floor(this.y)
          ) {
            this.pathIndex = 1;
          }

          // Trigger move event
          this.triggerEvent("move", {
            entity: this,
            targetX: targetX,
            targetY: targetY,
          });
        } else {
          Utils.log(
            `No path found for entity ${this.id} to (${targetX}, ${targetY})`
          );
        }
      }
    }
  }

  /**
   * Stop moving
   */
  stopMoving() {
    if (this.state === "moving") {
      this.state = "idle";
      this.stateTime = 0;
      this.path = null;
      this.pathIndex = 0;
      this.targetX = null;
      this.targetY = null;
    }
  }

  /**
   * Attack a target entity
   * @param {Entity} target - Target to attack
   */
  attack(target) {
    if (!this.active || !target || !target.active) return;

    // Set attack target
    this.attackTarget = target;
    this.state = "attacking";
    this.stateTime = 0;

    // Check if in range
    const distance = Utils.distance(this.x, this.y, target.x, target.y);

    if (distance > this.attackRange) {
      // Move towards target
      this.moveTo(target.x, target.y);
    } else {
      // Attack immediately if in range
      this.performAttack();
    }
  }

  /**
   * Stop attacking
   */
  stopAttacking() {
    if (this.state === "attacking") {
      this.state = "idle";
      this.stateTime = 0;
      this.attackTarget = null;
    }
  }

  /**
   * Check if entity can attack a target
   * @param {Entity} target - Target to check
   * @returns {boolean} True if entity can attack target
   */
  canAttack(target) {
    return (
      this.active &&
      target &&
      target.active &&
      target.owner !== this.owner &&
      this.ar > 0
    );
  }

  /**
   * Select this entity
   */
  select() {
    this.selected = true;

    // Create selection indicator if sprite exists
    if (this.sprite && this.sprite.scene && !this.selectionIndicator) {
      const scene = this.sprite.scene;

      this.selectionIndicator = scene.add.circle(
        this.sprite.x,
        this.sprite.y,
        20,
        0x00ff00,
        0.3
      );

      // Set to be below the sprite but above terrain
      this.selectionIndicator.setDepth(this.sprite.depth - 1);
    }

    // Show health bar
    if (this.healthBar) {
      this.healthBar.background.visible = true;
      this.healthBar.fill.visible = true;
    }

    this.triggerEvent("select", { entity: this });
  }

  /**
   * Deselect this entity
   */
  deselect() {
    this.selected = false;

    // Remove selection indicator
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }

    // Hide health bar unless damaged
    if (this.healthBar && this.hp === this.maxHp) {
      this.healthBar.background.visible = false;
      this.healthBar.fill.visible = false;
    }

    this.triggerEvent("deselect", { entity: this });
  }

  /**
   * Destroy this entity
   */
  destroy() {
    this.active = false;

    // Destroy sprite and visual elements
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }

    if (this.healthBar) {
      this.healthBar.background.destroy();
      this.healthBar.fill.destroy();
      this.healthBar = null;
    }

    this.triggerEvent("destroy", { entity: this });
  }

  /**
   * Check if this entity contains a point
   * @param {number} x - X coordinate to check
   * @param {number} y - Y coordinate to check
   * @returns {boolean} True if the entity contains the point
   */
  containsPoint(x, y) {
    if (this.sprite) {
      return this.sprite.getBounds().contains(x, y);
    }

    // Fallback to grid-based check
    const pixelX = x / this.tileSize;
    const pixelY = y / this.tileSize;

    return (
      pixelX >= this.x &&
      pixelX < this.x + this.width &&
      pixelY >= this.y &&
      pixelY < this.y + this.height
    );
  }

  /**
   * Check if this entity intersects a rectangle
   * @param {number} x - Rectangle X coordinate
   * @param {number} y - Rectangle Y coordinate
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @returns {boolean} True if the entity intersects the rectangle
   */
  intersectsRect(x, y, width, height) {
    if (this.sprite) {
      const bounds = this.sprite.getBounds();
      return Phaser.Geom.Rectangle.Overlaps(
        new Phaser.Geom.Rectangle(x, y, width, height),
        bounds
      );
    }

    // Fallback to grid-based check
    const entityLeft = this.x * this.tileSize;
    const entityTop = this.y * this.tileSize;
    const entityRight = entityLeft + this.width * this.tileSize;
    const entityBottom = entityTop + this.height * this.tileSize;

    return !(
      entityRight <= x ||
      entityLeft >= x + width ||
      entityBottom <= y ||
      entityTop >= y + height
    );
  }

  /**
   * Get the entity's center position
   * @returns {Object} Center position {x, y}
   */
  getCenter() {
    if (this.sprite) {
      return {
        x: this.sprite.x,
        y: this.sprite.y,
      };
    }

    return {
      x: (this.x + this.width / 2) * this.tileSize,
      y: (this.y + this.height / 2) * this.tileSize,
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback to remove
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * Trigger an event
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  triggerEvent(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  /**
   * Apply a status effect
   * @param {string} effectType - Type of effect
   * @param {Object} params - Effect parameters
   */
  applyEffect(effectType, params = {}) {
    // Should be implemented by specialized entity classes
  }

  /**
   * Remove a status effect
   * @param {string} effectType - Type of effect to remove
   */
  removeEffect(effectType) {
    // Should be implemented by specialized entity classes
  }

  /**
   * Get serializable data for this entity
   * @returns {Object} Serialized entity data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      owner: this.owner,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      hp: this.hp,
      maxHp: this.maxHp,
      dp: this.dp,
      ar: this.ar,
      state: this.state,
      active: this.active,
      attributes: { ...this.attributes },
      tags: [...this.tags],
    };
  }

  /**
   * Create an entity from serialized data
   * @param {Object} data - Serialized entity data
   * @returns {Entity} Deserialized entity
   */
  static deserialize(data) {
    return new Entity(data);
  }

  /**
   * Clone this entity
   * @returns {Entity} Clone of this entity
   */
  clone() {
    return new Entity(this.serialize());
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Entity;
} else {
  window.Entity = Entity;
}
