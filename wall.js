/**
 * Empires of Eternity - Wall Entity
 * Represents wall segments and gates, which have special pass-through rules for friendlies
 */

class Wall extends Entity {
  /**
   * Create a new wall segment
   * @param {Object} params - Wall parameters
   */
  constructor(params = {}) {
    // Set default wall properties
    params.type = "wall";
    params.width = params.width || 1;
    params.height = params.height || 1;

    // Call parent constructor
    super(params);

    // Wall-specific properties
    this.wallType = params.wallType || "wall"; // 'wall' or 'gate'
    this.constructionProgress = params.constructionProgress || 0; // 0-100 percent
    this.constructed = params.constructed || false; // Whether wall is fully constructed
    this.gateState = params.gateState || "closed"; // For gates: 'open' or 'closed'
    this.connected = { north: false, east: false, south: false, west: false }; // Connection to adjacent walls
    this.breached = params.breached || false; // Whether wall has been breached (HP=0 but not removed)

    // Visual settings
    this.shadowOffsetX = params.shadowOffsetX || 0.2;
    this.shadowOffsetY = params.shadowOffsetY || 0.2;
    this.shadowAlpha = params.shadowAlpha || 0.4;

    // Age-specific appearance
    this.ageLevel = params.ageLevel || 0; // 0-4, corresponding to the 5 ages

    // Apply civilization bonuses
    this.applyCivilizationBonuses();

    Utils.log(
      `Created ${this.wallType} for ${this.owner} at (${this.x}, ${this.y})`
    );
  }

  /**
   * Apply civilization-specific bonuses to wall
   */
  applyCivilizationBonuses() {
    // Get civilization config
    const civConfig = CONFIG.CIVILIZATIONS[this.owner];
    if (!civConfig) return;

    // Apply civilization bonuses
    if (this.owner === "SOLARI") {
      // Example: Solari walls might have more HP
      this.maxHp += Math.floor(this.maxHp * 0.05); // 5% more HP for walls
      this.hp = this.maxHp; // If already constructed
    } else if (this.owner === "LUNARI") {
      // Example: Lunari walls might have more defense points
      this.dp += 2; // +2 defense points
    }
  }

  /**
   * Check if a unit can pass through the wall
   * @param {Entity} unit - Unit to check
   * @returns {boolean} True if unit can pass through
   */
  canPass(unit) {
    // Check if unit exists and is active
    if (!unit || !unit.active) return false;

    // Always allow passage if wall is breached
    if (this.breached) return true;

    // If this is a gate, check gate state
    if (this.wallType === "gate" && this.gateState === "open") return true;

    // Only allow passage for units of the same owner
    return unit.owner === this.owner;
  }

  /**
   * Toggle gate state (open/closed)
   * @returns {string} New gate state
   */
  toggleGate() {
    if (this.wallType !== "gate") {
      return this.gateState;
    }

    // Toggle state
    this.gateState = this.gateState === "closed" ? "open" : "closed";

    // Trigger gate toggle event
    this.triggerEvent("toggleGate", {
      entity: this,
      state: this.gateState,
    });

    return this.gateState;
  }

  /**
   * Update the wall's state
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    // Update base entity state
    super.update(deltaTime);

    // Update connections to adjacent walls
    this.updateConnections();
  }

  /**
   * Update connections to adjacent walls
   */
  updateConnections() {
    // Get entity manager
    const game = window.gameInstance;
    const entityManager = game ? game.getSystem("entityManager") : null;

    if (!entityManager) return;

    // Check each direction
    const directions = [
      { dir: "north", x: 0, y: -1 },
      { dir: "east", x: 1, y: 0 },
      { dir: "south", x: 0, y: 1 },
      { dir: "west", x: -1, y: 0 },
    ];

    for (const dir of directions) {
      const adjacentX = this.x + dir.x;
      const adjacentY = this.y + dir.y;

      // Check if there's a wall at this position
      const entities = entityManager.getEntitiesAt(adjacentX, adjacentY);
      const adjacentWall = entities.find(
        (e) => e.type === "wall" && e.owner === this.owner
      );

      // Update connection state
      this.connected[dir.dir] = !!adjacentWall;
    }
  }

  /**
   * Contribute to wall construction
   * @param {number} amount - Amount of construction progress to add
   * @param {Entity} builder - Entity doing the construction
   */
  build(amount, builder) {
    if (this.constructed) return;

    // Add to HP
    this.hp = Math.min(this.maxHp, this.hp + amount);

    // Update construction progress
    this.constructionProgress = Math.min(100, (this.hp / this.maxHp) * 100);

    // Check if construction is complete
    if (this.hp >= this.maxHp) {
      this.finishConstruction();
    }

    // Trigger build event
    this.triggerEvent("build", {
      entity: this,
      builder: builder,
      amount: amount,
      progress: this.constructionProgress,
    });
  }

  /**
   * Complete wall construction
   */
  finishConstruction() {
    this.constructed = true;
    this.constructionProgress = 100;
    this.hp = this.maxHp;

    // Trigger construction complete event
    this.triggerEvent("constructionComplete", {
      entity: this,
    });
  }

  /**
   * Repair wall damage
   * @param {number} amount - Amount of HP to repair
   * @param {Entity} repairer - Entity doing the repair
   */
  repair(amount, repairer) {
    if (!this.constructed) return;

    // If breached, require more resources to repair
    const effectiveAmount = this.breached ? amount * 0.5 : amount;

    // Add to HP
    this.hp = Math.min(this.maxHp, this.hp + effectiveAmount);

    // If wall was breached and now has HP, it's no longer breached
    if (this.breached && this.hp > 0) {
      this.breached = false;
    }

    // Trigger repair event
    this.triggerEvent("repair", {
      entity: this,
      repairer: repairer,
      amount: effectiveAmount,
    });
  }

  /**
   * Handle taking damage from an attacker
   * @param {number} amount - Amount of damage to take
   * @param {Entity} attacker - Entity causing the damage
   */
  takeDamage(amount, attacker) {
    // Apply damage
    super.takeDamage(amount, attacker);

    // Check if the wall is heavily damaged for alerts
    if (this.hp > 0 && this.hp <= this.maxHp * 0.25) {
      // Trigger critical damage event
      this.triggerEvent("criticalDamage", {
        entity: this,
        attacker: attacker,
        hp: this.hp,
        maxHp: this.maxHp,
      });
    }
  }

  /**
   * Die from damage
   * @param {Entity} killer - Entity that killed this one
   */
  die(killer) {
    // Instead of removing the wall, mark it as breached
    this.breached = true;
    this.hp = 0;

    // Trigger breach event
    this.triggerEvent("breach", {
      entity: this,
      killer: killer,
    });

    // Do not call super.die() to avoid deactivating the entity
    // We want the wall to remain in the game world as a breached wall

    // Instead, trigger a custom death event
    this.triggerEvent("death", {
      entity: this,
      killer: killer,
    });
  }

  /**
   * Check if this wall can connect to another wall
   * @param {Wall} other - Other wall to check
   * @returns {boolean} True if walls can connect
   */
  canConnectTo(other) {
    // Walls can only connect to walls of the same owner
    if (!other || other.type !== "wall" || other.owner !== this.owner) {
      return false;
    }

    // Check if walls are adjacent
    const dx = Math.abs(this.x - other.x);
    const dy = Math.abs(this.y - other.y);

    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  /**
   * Get the wall's connection type for visual rendering
   * @returns {string} Connection type identifier
   */
  getConnectionType() {
    // Convert connections to a type string for rendering
    const { north, east, south, west } = this.connected;

    if (north && east && south && west) return "cross";
    if (north && east && south) return "t_west";
    if (north && east && west) return "t_south";
    if (north && south && west) return "t_east";
    if (east && south && west) return "t_north";
    if (north && south) return "vertical";
    if (east && west) return "horizontal";
    if (north && east) return "corner_sw";
    if (north && west) return "corner_se";
    if (south && east) return "corner_nw";
    if (south && west) return "corner_ne";
    if (north) return "end_south";
    if (east) return "end_west";
    if (south) return "end_north";
    if (west) return "end_east";

    return "single";
  }

  /**
   * Get serializable data for this wall
   * @returns {Object} Serialized wall data
   */
  serialize() {
    // Get base entity data
    const data = super.serialize();

    // Add wall-specific data
    data.wallType = this.wallType;
    data.constructionProgress = this.constructionProgress;
    data.constructed = this.constructed;
    data.gateState = this.gateState;
    data.connected = { ...this.connected };
    data.breached = this.breached;
    data.shadowOffsetX = this.shadowOffsetX;
    data.shadowOffsetY = this.shadowOffsetY;
    data.shadowAlpha = this.shadowAlpha;
    data.ageLevel = this.ageLevel;

    return data;
  }

  /**
   * Create a wall from serialized data
   * @param {Object} data - Serialized wall data
   * @returns {Wall} Deserialized wall
   */
  static deserialize(data) {
    return new Wall(data);
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Wall;
} else {
  window.Wall = Wall;
}
