/**
 * Empires of Eternity - Unit Entity
 * Represents all movable units (soldiers, villagers, heroes) in the game
 */

class Unit extends Entity {
  /**
   * Create a new unit
   * @param {Object} params - Unit parameters
   */
  constructor(params = {}) {
    // Set default unit properties
    params.type = params.type || "unit";
    params.width = params.width || 1;
    params.height = params.height || 1;
    params.speed = params.speed || 2; // Default 2 tiles per second

    // Call parent constructor
    super(params);

    // Unit-specific properties
    this.unitType = params.unitType || "infantry"; // infantry, ranged, cavalry, siege, villager, hero
    this.damageType = params.damageType || "slashing"; // slashing, piercing, blunt

    // Resource carrying capacity (for villagers)
    this.carryCapacity = params.carryCapacity || 0;
    this.carryingResource = params.carryingResource || null;
    this.carryingAmount = params.carryingAmount || 0;

    // Work efficiency
    this.gatherRate = params.gatherRate || 1; // Resources per second
    this.buildRate = params.buildRate || 10; // HP per second
    this.repairRate = params.repairRate || 5; // HP per second

    // Current job
    this.currentJob = {
      type: null, // gather, build, repair
      target: null, // target entity
      time: 0, // time spent on job
    };

    // Formation properties
    this.formation = params.formation || null; // line, wedge, square, skirmish
    this.formationIndex = params.formationIndex || -1; // Position in formation
    this.formationOffset = { x: 0, y: 0 }; // Offset from formation center

    // Auto counter-attack behavior
    this.counterAttack =
      params.counterAttack !== undefined ? params.counterAttack : true;

    // Status effects
    this.statusEffects = [];

    // Apply civilization bonuses
    this.applyCivilizationBonuses();

    Utils.log(`Created ${this.unitType} unit for ${this.owner}`);
  }

  /**
   * Apply civilization-specific bonuses to unit
   */
  applyCivilizationBonuses() {
    // Get civilization config
    const civConfig = CONFIG.CIVILIZATIONS[this.owner];
    if (!civConfig) return;

    // Apply civilization bonuses
    if (this.type === "villager") {
      // Solari gathering bonus
      if (civConfig.uniquePerks.gatherBonus) {
        this.gatherRate *= 1 + civConfig.uniquePerks.gatherBonus;
      }

      // Lunari movement speed bonus
      if (civConfig.uniquePerks.villagerMovementSpeed) {
        this.speed *= 1 + civConfig.uniquePerks.villagerMovementSpeed;
      }
    } else if (this.type === "unit" || this.type === "hero") {
      // Lunari training speed bonus is applied during creation, not here
      // Day/night bonuses would be applied during game updates
      // Apply age-specific bonuses
      // Would be handled by the research/tech system
    }
  }

  /**
   * Update the unit's state
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    // Update status effects
    this.updateStatusEffects(deltaTime);

    // Update unit state
    super.update(deltaTime);

    // Update current job
    if (this.currentJob.type) {
      this.currentJob.time += deltaTime;

      switch (this.currentJob.type) {
        case "gather":
          this.updateGathering(deltaTime);
          break;
        case "build":
          this.updateConstructing(deltaTime);
          break;
        case "repair":
          this.updateRepairing(deltaTime);
          break;
      }
    }
  }

  /**
   * Update gathering resources job
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateGathering(deltaTime) {
    const target = this.currentJob.target;

    // Check if target is valid
    if (!target || !target.active || target.amount <= 0) {
      this.stopGathering();
      return;
    }

    // Check if we're at the target
    const distance = Utils.distance(this.x, this.y, target.x, target.y);

    if (distance > 1) {
      // Move to target
      this.moveTo(target.x, target.y);
      return;
    }

    // Stop moving if we were
    if (this.state === "moving") {
      this.stopMoving();
      this.state = "gathering";
    }

    // Check if carrying at capacity
    if (this.carryingAmount >= this.carryCapacity) {
      this.returnResources();
      return;
    }

    // Gather resources
    const amountToGather = this.gatherRate * deltaTime;

    // Get map for resource manipulation
    const game = window.gameInstance;
    const map = game ? game.getSystem("map") : null;

    if (map) {
      const gathered = map.gatherResource(target.x, target.y, amountToGather);

      if (gathered > 0) {
        // Add to carrying amount
        if (!this.carryingResource) {
          this.carryingResource = target.resourceType;
        }

        this.carryingAmount += gathered;

        // Trigger gathering event
        this.triggerEvent("gather", {
          entity: this,
          target: target,
          resourceType: target.resourceType,
          amount: gathered,
        });
      }

      // Check if resource is depleted
      if (target.amount <= 0 || target.depleted) {
        this.stopGathering();

        // Find another nearby resource of the same type
        this.findNearestResource(target.resourceType);
      }
    }
  }

  /**
   * Find the nearest resource of a given type
   * @param {string} resourceType - Type of resource to find
   */
  findNearestResource(resourceType) {
    const game = window.gameInstance;
    const map = game ? game.getSystem("map") : null;

    if (!map) return;

    // Get all resources of the requested type
    const resources = map.getResourcesByType(resourceType);

    if (resources.length === 0) return;

    // Find the nearest non-depleted resource
    let nearest = null;
    let nearestDistance = Infinity;

    for (const resource of resources) {
      if (resource.depleted || resource.amount <= 0) continue;

      const distance = Utils.distance(this.x, this.y, resource.x, resource.y);

      if (distance < nearestDistance) {
        nearest = resource;
        nearestDistance = distance;
      }
    }

    // Gather from the nearest resource if found
    if (nearest) {
      this.gather(nearest);
    }
  }

  /**
   * Return gathered resources to a drop-off point
   */
  returnResources() {
    if (!this.carryingResource || this.carryingAmount <= 0) {
      this.stopGathering();
      return;
    }

    // Find nearest drop-off point for the resource type
    const game = window.gameInstance;
    const entityManager = game ? game.getSystem("entityManager") : null;

    if (!entityManager) return;

    // Get all valid drop-off buildings owned by this unit's owner
    const dropOffTypes = this.getDropOffBuildingTypes(this.carryingResource);
    const dropOffBuildings = entityManager.getEntitiesByTypesAndOwner(
      dropOffTypes,
      this.owner,
      true // only consider fully constructed buildings
    );

    if (dropOffBuildings.length === 0) {
      // No valid drop-off points
      Utils.log(`No valid drop-off point for ${this.carryingResource}`);
      return;
    }

    // Find the nearest drop-off building
    let nearest = null;
    let nearestDistance = Infinity;

    for (const building of dropOffBuildings) {
      const center = building.getCenter();
      const distance = Utils.distance(this.x, this.y, center.x, center.y);

      if (distance < nearestDistance) {
        nearest = building;
        nearestDistance = distance;
      }
    }

    if (!nearest) return;

    // Move to drop-off building
    const center = nearest.getCenter();

    // Check if we're at the drop-off point
    const dropOffDistance = Utils.distance(this.x, this.y, center.x, center.y);

    if (dropOffDistance <= 1.5) {
      // We've reached the drop-off point, deliver resources
      this.deliverResources(nearest);
    } else {
      // Move to drop-off point
      this.moveTo(center.x, center.y);
      this.state = "returning";
    }
  }

  /**
   * Deliver resources to a drop-off building
   * @param {Entity} building - Building to deliver resources to
   */
  deliverResources(building) {
    if (!this.carryingResource || this.carryingAmount <= 0) {
      this.stopGathering();
      return;
    }

    // Add resources to player's stockpile
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (!resourceManager) return;

    resourceManager.addResource(this.carryingResource, this.carryingAmount);

    // Trigger deliver event
    this.triggerEvent("deliver", {
      entity: this,
      building: building,
      resourceType: this.carryingResource,
      amount: this.carryingAmount,
    });

    // Clear carrying status
    const resourceType = this.carryingResource; // Save for later
    this.carryingResource = null;
    this.carryingAmount = 0;

    // If we were gathering, return to the resource
    if (this.currentJob.type === "gather" && this.currentJob.target) {
      this.gather(this.currentJob.target);
    } else {
      // Find another resource of the same type
      this.findNearestResource(resourceType);
    }
  }

  /**
   * Get valid drop-off building types for a resource
   * @param {string} resourceType - Type of resource
   * @returns {Array} Array of valid building types
   */
  getDropOffBuildingTypes(resourceType) {
    switch (resourceType) {
      case "wood":
        return ["lumber_mill", "town_center"];
      case "food":
        return ["granary", "storehouse", "town_center"];
      case "gold":
        return ["market", "trade_post", "town_center"];
      case "stone":
        return ["storage", "town_center"];
      case "iron":
        return ["forge", "kiln", "town_center"];
      default:
        return ["town_center"];
    }
  }

  /**
   * Update building construction job
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateConstructing(deltaTime) {
    const target = this.currentJob.target;

    // Check if target is valid
    if (!target || !target.active) {
      this.stopConstructing();
      return;
    }

    // Check if construction is complete
    if (target.hp >= target.maxHp) {
      this.stopConstructing();
      return;
    }

    // Check if we're at the target
    const distance = Utils.distance(
      this.x,
      this.y,
      target.getCenter().x,
      target.getCenter().y
    );

    if (distance > 1.5) {
      // Move to target
      this.moveTo(target.getCenter().x, target.getCenter().y);
      return;
    }

    // Stop moving if we were
    if (this.state === "moving") {
      this.stopMoving();
      this.state = "constructing";
    }

    // Contribute to construction
    const buildAmount = this.buildRate * deltaTime;
    target.build(buildAmount, this);

    // Trigger construction event
    this.triggerEvent("construct", {
      entity: this,
      target: target,
      amount: buildAmount,
    });
  }

  /**
   * Update building repair job
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateRepairing(deltaTime) {
    const target = this.currentJob.target;

    // Check if target is valid
    if (!target || !target.active) {
      this.stopRepairing();
      return;
    }

    // Check if repair is complete
    if (target.hp >= target.maxHp) {
      this.stopRepairing();
      return;
    }

    // Check if we're at the target
    const distance = Utils.distance(
      this.x,
      this.y,
      target.getCenter().x,
      target.getCenter().y
    );

    if (distance > 1.5) {
      // Move to target
      this.moveTo(target.getCenter().x, target.getCenter().y);
      return;
    }

    // Stop moving if we were
    if (this.state === "moving") {
      this.stopMoving();
      this.state = "repairing";
    }

    // Check if we have resources for repair
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (!resourceManager) return;

    // Calculate repair cost (simplified - in reality would depend on building type and damage)
    const repairAmount = this.repairRate * deltaTime;
    const woodCost = Math.ceil(repairAmount / 5); // 1 wood per 5 HP

    if (resourceManager.canAffordResources({ wood: woodCost })) {
      // Deduct resources
      resourceManager.deductResources({ wood: woodCost });

      // Repair the building
      target.repair(repairAmount, this);

      // Trigger repair event
      this.triggerEvent("repair", {
        entity: this,
        target: target,
        amount: repairAmount,
        cost: { wood: woodCost },
      });
    } else {
      // Not enough resources
      this.stopRepairing();

      // Trigger resource shortage event
      this.triggerEvent("resourceShortage", {
        entity: this,
        resource: "wood",
        required: woodCost,
      });
    }
  }

  /**
   * Update status effects
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateStatusEffects(deltaTime) {
    // Update and remove expired effects
    this.statusEffects = this.statusEffects.filter((effect) => {
      effect.duration -= deltaTime;

      // Return false to remove effect when expired
      return effect.duration > 0;
    });
  }

  /**
   * Apply a status effect
   * @param {string} effectType - Type of effect
   * @param {Object} params - Effect parameters
   */
  applyEffect(effectType, params = {}) {
    // Default parameters
    const defaultParams = {
      duration: 10, // 10 seconds
      magnitude: 1,
      source: null,
    };

    // Merge with defaults
    const effectParams = { ...defaultParams, ...params };

    // Check if effect already exists
    const existingIndex = this.statusEffects.findIndex(
      (e) => e.type === effectType
    );

    if (existingIndex >= 0) {
      // Update existing effect
      const existing = this.statusEffects[existingIndex];

      // Refresh or extend duration
      existing.duration = Math.max(existing.duration, effectParams.duration);

      // Update magnitude if higher
      existing.magnitude = Math.max(existing.magnitude, effectParams.magnitude);
    } else {
      // Add new effect
      this.statusEffects.push({
        type: effectType,
        duration: effectParams.duration,
        magnitude: effectParams.magnitude,
        source: effectParams.source,
      });

      // Apply immediate effect
      this.applyEffectImpact(effectType, effectParams.magnitude);
    }

    // Trigger effect event
    this.triggerEvent("effect", {
      entity: this,
      effectType: effectType,
      params: effectParams,
    });
  }

  /**
   * Apply the impact of a status effect
   * @param {string} effectType - Type of effect
   * @param {number} magnitude - Effect magnitude
   */
  applyEffectImpact(effectType, magnitude) {
    switch (effectType) {
      case "speedBoost":
        this.speed *= 1 + magnitude;
        break;
      case "speedSlow":
        this.speed *= 1 - magnitude;
        break;
      case "damageBoost":
        this.ar *= 1 + magnitude;
        break;
      case "defenseBoost":
        this.dp *= 1 + magnitude;
        break;
      case "healing":
        // Healing is applied over time in updateStatusEffects
        break;
      case "poison":
        // Damage is applied over time in updateStatusEffects
        break;
    }
  }

  /**
   * Remove a status effect
   * @param {string} effectType - Type of effect to remove
   */
  removeEffect(effectType) {
    const index = this.statusEffects.findIndex((e) => e.type === effectType);

    if (index >= 0) {
      const effect = this.statusEffects[index];

      // Remove effect
      this.statusEffects.splice(index, 1);

      // Revert effect impact
      this.revertEffectImpact(effectType, effect.magnitude);

      // Trigger effect removed event
      this.triggerEvent("effectRemoved", {
        entity: this,
        effectType: effectType,
      });
    }
  }

  /**
   * Revert the impact of a status effect
   * @param {string} effectType - Type of effect
   * @param {number} magnitude - Effect magnitude
   */
  revertEffectImpact(effectType, magnitude) {
    switch (effectType) {
      case "speedBoost":
        this.speed /= 1 + magnitude;
        break;
      case "speedSlow":
        this.speed /= 1 - magnitude;
        break;
      case "damageBoost":
        this.ar /= 1 + magnitude;
        break;
      case "defenseBoost":
        this.dp /= 1 + magnitude;
        break;
    }
  }

  /**
   * Get total effect magnitude for a given type
   * @param {string} effectType - Type of effect
   * @returns {number} Total magnitude of all matching effects
   */
  getEffectMagnitude(effectType) {
    return this.statusEffects
      .filter((e) => e.type === effectType)
      .reduce((total, effect) => total + effect.magnitude, 0);
  }

  /**
   * Start gathering resources from a target
   * @param {Entity} target - Resource node to gather from
   */
  gather(target) {
    if (!target || !target.active || !this.canGather(target)) return;

    // Set gathering job
    this.currentJob = {
      type: "gather",
      target: target,
      time: 0,
    };

    // Move to target
    this.moveTo(target.x, target.y);

    Utils.log(
      `Unit ${this.id} gathering ${target.resourceType} at (${target.x}, ${target.y})`
    );
  }

  /**
   * Check if unit can gather from a target
   * @param {Entity} target - Target to check
   * @returns {boolean} True if unit can gather from target
   */
  canGather(target) {
    // Only villagers can gather
    if (this.type !== "villager") return false;

    // Check target type
    if (!target || !target.active || target.type !== "resource") return false;

    // Check if resource is depleted
    if (target.depleted || target.amount <= 0) return false;

    // Check if we're already carrying a different resource type
    if (
      this.carryingResource &&
      this.carryingResource !== target.resourceType
    ) {
      return false;
    }

    return true;
  }

  /**
   * Stop gathering resources
   */
  stopGathering() {
    if (this.currentJob.type === "gather") {
      this.currentJob = { type: null, target: null, time: 0 };

      if (this.state === "gathering") {
        this.state = "idle";
      }
    }
  }

  /**
   * Start constructing a building
   * @param {Entity} building - Building to construct
   */
  construct(building) {
    if (!building || !building.active || !this.canConstruct(building)) return;

    // Set constructing job
    this.currentJob = {
      type: "build",
      target: building,
      time: 0,
    };

    // Move to building
    const center = building.getCenter();
    this.moveTo(center.x, center.y);

    Utils.log(`Unit ${this.id} constructing building ${building.id}`);
  }

  /**
   * Check if unit can construct a building
   * @param {Entity} building - Building to check
   * @returns {boolean} True if unit can construct the building
   */
  canConstruct(building) {
    // Only villagers can construct
    if (this.type !== "villager") return false;

    // Check target type
    if (!building || !building.active || building.type !== "building")
      return false;

    // Check if building is already complete
    if (building.hp >= building.maxHp) return false;

    // Check if building is owned by this unit's civilization
    if (building.owner !== this.owner) return false;

    return true;
  }

  /**
   * Stop constructing
   */
  stopConstructing() {
    if (this.currentJob.type === "build") {
      this.currentJob = { type: null, target: null, time: 0 };

      if (this.state === "constructing") {
        this.state = "idle";
      }
    }
  }

  /**
   * Start repairing a structure
   * @param {Entity} structure - Structure to repair
   */
  repair(structure) {
    if (!structure || !structure.active || !this.canRepair(structure)) return;

    // Set repairing job
    this.currentJob = {
      type: "repair",
      target: structure,
      time: 0,
    };

    // Move to structure
    const center = structure.getCenter();
    this.moveTo(center.x, center.y);

    Utils.log(`Unit ${this.id} repairing structure ${structure.id}`);
  }

  /**
   * Check if unit can repair a structure
   * @param {Entity} structure - Structure to check
   * @returns {boolean} True if unit can repair the structure
   */
  canRepair(structure) {
    // Only villagers can repair
    if (this.type !== "villager") return false;

    // Check target type
    if (!structure || !structure.active) return false;

    // Check if structure is a building or wall
    if (structure.type !== "building" && structure.type !== "wall")
      return false;

    // Check if structure needs repair
    if (structure.hp >= structure.maxHp) return false;

    // Check if structure is owned by this unit's civilization
    if (structure.owner !== this.owner) return false;

    return true;
  }

  /**
   * Stop repairing
   */
  stopRepairing() {
    if (this.currentJob.type === "repair") {
      this.currentJob = { type: null, target: null, time: 0 };

      if (this.state === "repairing") {
        this.state = "idle";
      }
    }
  }

  /**
   * Set the unit's formation
   * @param {string} formationType - Type of formation
   * @param {number} index - Index in formation
   * @param {Object} offset - Offset from formation center {x, y}
   */
  setFormation(formationType, index, offset) {
    this.formation = formationType;
    this.formationIndex = index;
    this.formationOffset = offset || { x: 0, y: 0 };

    Utils.log(
      `Unit ${this.id} set to formation ${formationType} at index ${index}`
    );
  }

  /**
   * Move to formation position
   * @param {number} centerX - X coordinate of formation center
   * @param {number} centerY - Y coordinate of formation center
   * @param {number} directionX - X direction vector
   * @param {number} directionY - Y direction vector
   */
  moveToFormation(centerX, centerY, directionX, directionY) {
    if (!this.formation || this.formationIndex < 0) return;

    // Calculate formation position
    let formationX = centerX;
    let formationY = centerY;

    switch (this.formation) {
      case "line":
        // Line perpendicular to direction vector
        formationX += -directionY * this.formationOffset.x;
        formationY += directionX * this.formationOffset.y;
        break;

      case "wedge":
        // V-shaped formation pointing in direction
        formationX +=
          directionX * this.formationOffset.y +
          directionY * this.formationOffset.x;
        formationY +=
          directionY * this.formationOffset.y -
          directionX * this.formationOffset.x;
        break;

      case "square":
        // Square formation around center
        formationX += this.formationOffset.x;
        formationY += this.formationOffset.y;
        break;

      case "skirmish":
        // Loose, scattered formation
        formationX += this.formationOffset.x * 1.5;
        formationY += this.formationOffset.y * 1.5;
        break;
    }

    // Move to formation position
    this.moveTo(formationX, formationY);
  }

  /**
   * Handle taking damage from an attacker
   * @param {number} amount - Amount of damage to take
   * @param {Entity} attacker - Entity causing the damage
   */
  takeDamage(amount, attacker) {
    // Apply damage
    super.takeDamage(amount, attacker);

    // If still alive and not already attacking the attacker, consider counter-attack
    if (
      this.active &&
      this.counterAttack &&
      attacker &&
      attacker.active &&
      attacker !== this.attackTarget &&
      attacker.owner !== this.owner
    ) {
      // Counter-attack if not a villager, or if a villager with no current job
      if (
        this.type !== "villager" ||
        (this.type === "villager" && !this.currentJob.type)
      ) {
        this.attack(attacker);
      }
    }
  }

  /**
   * Die from damage
   * @param {Entity} killer - Entity that killed this one
   */
  die(killer) {
    // Villagers drop resources when killed
    if (
      this.type === "villager" &&
      this.carryingResource &&
      this.carryingAmount > 0
    ) {
      // In a full implementation, would create a resource entity at the death location
      Utils.log(
        `Villager dropped ${this.carryingAmount} ${this.carryingResource}`
      );
    }

    // Call parent method
    super.die(killer);
  }

  /**
   * Get serializable data for this unit
   * @returns {Object} Serialized unit data
   */
  serialize() {
    // Get base entity data
    const data = super.serialize();

    // Add unit-specific data
    data.unitType = this.unitType;
    data.damageType = this.damageType;
    data.carryCapacity = this.carryCapacity;
    data.carryingResource = this.carryingResource;
    data.carryingAmount = this.carryingAmount;
    data.gatherRate = this.gatherRate;
    data.buildRate = this.buildRate;
    data.repairRate = this.repairRate;
    data.formation = this.formation;
    data.formationIndex = this.formationIndex;
    data.formationOffset = { ...this.formationOffset };
    data.counterAttack = this.counterAttack;

    return data;
  }

  /**
   * Create a unit from serialized data
   * @param {Object} data - Serialized unit data
   * @returns {Unit} Deserialized unit
   */
  static deserialize(data) {
    return new Unit(data);
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Unit;
} else {
  window.Unit = Unit;
}
