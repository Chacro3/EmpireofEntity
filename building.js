/**
 * Empires of Eternity - Building Entity
 * Represents all structures that can be built (houses, production buildings, military buildings, wonders)
 */

class Building extends Entity {
  /**
   * Create a new building
   * @param {Object} params - Building parameters
   */
  constructor(params = {}) {
    // Set default building properties
    params.type = "building";
    params.width = params.width || 1;
    params.height = params.height || 1;

    // Call parent constructor
    super(params);

    // Building-specific properties
    this.buildingType = params.buildingType || "basic";
    this.constructionProgress = params.constructionProgress || 0; // 0-100 percent
    this.constructed = params.constructed || false; // Whether building is fully constructed

    // Production properties
    this.productionType = params.productionType || null; // Resource or unit being produced
    this.productionProgress = params.productionProgress || 0; // 0-100 percent
    this.productionQueue = params.productionQueue || []; // Queue of items to produce
    this.productionCapacity = params.productionCapacity || 5; // Max queue size

    // Resource production
    this.resourceProduction = params.resourceProduction || {}; // Resources produced per second
    this.resourceStorage = params.resourceStorage || {}; // Current stored resources
    this.maxResourceStorage = params.maxResourceStorage || {}; // Maximum storage for each resource

    // Influence and control
    this.influenceRadius = params.influenceRadius || 5; // Radius of influence/control
    this.populationSupport = params.populationSupport || 0; // Number of villagers supported (e.g., houses)

    // Research and upgrades
    this.availableTechs = params.availableTechs || []; // Technologies that can be researched here
    this.currentResearch = params.currentResearch || null; // Currently researching tech
    this.researchProgress = params.researchProgress || 0; // 0-100 percent

    // Building state
    this.workersAssigned = params.workersAssigned || 0; // Number of workers currently constructing
    this.gateState = params.gateState || "closed"; // For gates: 'open' or 'closed'

    // Visual settings
    this.shadow = params.shadow !== undefined ? params.shadow : true; // Whether building casts a shadow
    this.shadowOffsetX = params.shadowOffsetX || 0.3;
    this.shadowOffsetY = params.shadowOffsetY || 0.3;
    this.shadowAlpha = params.shadowAlpha || 0.5;

    // Age-specific appearance
    this.ageLevel = params.ageLevel || 0; // 0-4, corresponding to the 5 ages

    // Attached units (for garrisoning)
    this.garrisonedUnits = params.garrisonedUnits || [];
    this.maxGarrison = params.maxGarrison || 0;

    // Initialize building state based on type
    this.initializeBuildingType();

    // Apply civilization bonuses
    this.applyCivilizationBonuses();

    Utils.log(`Created ${this.buildingType} building for ${this.owner}`);
  }

  /**
   * Initialize building properties based on building type
   */
  initializeBuildingType() {
    // Set building properties based on type
    switch (this.buildingType) {
      case "house":
      case "hut":
        this.populationSupport = 5;
        this.maxGarrison = 0;
        this.influenceRadius = 3;
        break;

      case "granary":
      case "storehouse":
        this.maxResourceStorage = { food: 500 };
        this.influenceRadius = 4;
        break;

      case "lumber_mill":
      case "sawmill":
        this.maxResourceStorage = { wood: 500 };
        this.influenceRadius = 4;
        break;

      case "barracks":
      case "training_ground":
        this.productionCapacity = 8;
        this.maxGarrison = 5;
        this.influenceRadius = 5;
        break;

      case "solar_forge":
      case "moon_kiln":
        this.maxResourceStorage = { iron: 300 };
        this.influenceRadius = 5;
        // Available techs would be set based on age and civ
        break;

      case "market":
      case "trade_post":
        this.resourceProduction = { gold: 0.5 }; // 0.5 gold per second
        this.maxResourceStorage = { gold: 500 };
        this.influenceRadius = 6;
        break;

      case "temple":
      case "shrine":
        this.influenceRadius = 8;
        // Available techs would be set based on age and civ
        break;

      case "tower":
      case "watchtower":
        this.maxGarrison = 3;
        this.influenceRadius = 8; // Visibility radius
        this.attackRange = 6;
        break;

      case "sun_spire":
      case "moon_obelisk":
        this.resourceProduction = {
          wood: 0.8,
          food: 0.8,
          gold: 0.8,
          stone: 0.4,
          iron: 0.4,
        };
        this.influenceRadius = 10;
        break;

      case "town_center":
        this.populationSupport = 10;
        this.maxGarrison = 10;
        this.influenceRadius = 8;
        this.productionCapacity = 10;
        this.maxResourceStorage = {
          wood: 200,
          food: 200,
          gold: 200,
          stone: 100,
          iron: 100,
        };
        break;

      case "wonder":
        this.influenceRadius = 15;
        // Bonuses would depend on civilization
        break;

      case "wall":
        // Walls are handled by their own class, but including for completeness
        this.influenceRadius = 0;
        break;
    }
  }

  /**
   * Apply civilization-specific bonuses to building
   */
  applyCivilizationBonuses() {
    // Get civilization config
    const civConfig = CONFIG.CIVILIZATIONS[this.owner];
    if (!civConfig) return;

    // Apply civilization bonuses
    if (this.owner === "SOLARI") {
      // Solari building discount is applied during construction cost calculation

      // Example: Solari buildings might have more HP
      if (this.buildingType === "tower") {
        this.maxHp += Math.floor(this.maxHp * 0.1); // 10% more HP for towers
        this.hp = this.maxHp; // If already constructed
      }
    } else if (this.owner === "LUNARI") {
      // Example: Lunari shrines might have larger influence radius
      if (this.buildingType === "shrine") {
        this.influenceRadius += 2; // +2 tile influence radius
      }
    }
  }

  /**
   * Update the building's state
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    // Update base entity state
    super.update(deltaTime);

    // Only update if fully constructed
    if (this.constructed) {
      // Update production
      this.updateProduction(deltaTime);

      // Update research
      this.updateResearch(deltaTime);

      // Generate resources if this building produces them
      this.generateResources(deltaTime);
    }
  }

  /**
   * Update production progress
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateProduction(deltaTime) {
    if (!this.productionType || this.productionQueue.length === 0) return;

    // Get current production item
    const currentItem = this.productionQueue[0];

    // Update progress
    this.productionProgress += (deltaTime / currentItem.time) * 100;

    // Check if production complete
    if (this.productionProgress >= 100) {
      // Produce the item
      this.completeProduction();

      // Reset progress for next item
      this.productionProgress = 0;

      // Get next item in queue
      this.productionQueue.shift();

      if (this.productionQueue.length > 0) {
        // Start producing next item
        this.productionType = this.productionQueue[0].type;
      } else {
        // Queue empty
        this.productionType = null;
      }
    }
  }

  /**
   * Complete production of current item
   */
  completeProduction() {
    if (!this.productionType || this.productionQueue.length === 0) return;

    const currentItem = this.productionQueue[0];

    // Get entity manager
    const game = window.gameInstance;
    const entityManager = game ? game.getSystem("entityManager") : null;

    if (!entityManager) return;

    // Create the entity based on production type
    if (currentItem.category === "unit") {
      // Find a valid spawn position near the building
      const spawnPos = this.findSpawnPosition();

      if (spawnPos) {
        // Create the unit
        const unit = entityManager.createUnit({
          type: currentItem.unitType === "villager" ? "villager" : "unit",
          unitType: currentItem.unitType,
          x: spawnPos.x,
          y: spawnPos.y,
          owner: this.owner,
          ageLevel: this.ageLevel,
        });

        // Trigger production event
        this.triggerEvent("produce", {
          entity: this,
          product: unit,
          type: currentItem.type,
        });
      }
    } else if (currentItem.category === "tech") {
      // Research completion is handled in updateResearch
    }
  }

  /**
   * Find a valid spawn position for produced units
   * @returns {Object|null} Valid spawn position {x, y} or null if none found
   */
  findSpawnPosition() {
    // Try positions around the building
    const center = this.getCenter();
    const directions = [
      { x: 0, y: -1.5 }, // North
      { x: 1.5, y: 0 }, // East
      { x: 0, y: 1.5 }, // South
      { x: -1.5, y: 0 }, // West
      { x: 1, y: -1 }, // Northeast
      { x: 1, y: 1 }, // Southeast
      { x: -1, y: 1 }, // Southwest
      { x: -1, y: -1 }, // Northwest
    ];

    // Get map and entity manager to check for valid positions
    const game = window.gameInstance;
    const map = game ? game.getSystem("map") : null;
    const entityManager = game ? game.getSystem("entityManager") : null;

    if (!map || !entityManager) return null;

    // Check each direction
    for (const dir of directions) {
      const x = center.x + dir.x;
      const y = center.y + dir.y;

      // Check if position is valid (within bounds and no entities)
      if (x >= 0 && y >= 0 && x < map.width && y < map.height) {
        const tile = map.getTile(Math.floor(x), Math.floor(y));

        if (tile && tile.passable) {
          // Check if there's no entity at this position
          const entities = entityManager.getEntitiesAt(
            Math.floor(x),
            Math.floor(y)
          );

          if (entities.length === 0) {
            return { x, y };
          }
        }
      }
    }

    // No valid position found
    return null;
  }

  /**
   * Add an item to the production queue
   * @param {Object} item - Item to produce {type, category, unitType, time, cost}
   * @returns {boolean} True if successfully added to queue
   */
  queueProduction(item) {
    // Check if queue is full
    if (this.productionQueue.length >= this.productionCapacity) {
      return false;
    }

    // Check if resources are available
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (!resourceManager) return false;

    if (!resourceManager.canAffordResources(item.cost)) {
      return false;
    }

    // Deduct resources
    resourceManager.deductResources(item.cost);

    // Add to queue
    this.productionQueue.push(item);

    // If this is the first item, start production
    if (this.productionQueue.length === 1) {
      this.productionType = item.type;
      this.productionProgress = 0;
    }

    // Trigger queue event
    this.triggerEvent("queue", {
      entity: this,
      item: item,
    });

    return true;
  }

  /**
   * Cancel an item in the production queue
   * @param {number} index - Index of item to cancel (0 = current item)
   * @returns {boolean} True if successfully canceled
   */
  cancelProduction(index) {
    // Check if index is valid
    if (index < 0 || index >= this.productionQueue.length) {
      return false;
    }

    // Get item
    const item = this.productionQueue[index];

    // Refund resources (full refund for queue, partial for in-progress)
    const refundPercentage =
      index === 0 ? 1 - this.productionProgress / 100 : 1;

    // Calculate refund
    const refund = {};
    for (const resource in item.cost) {
      refund[resource] = Math.floor(item.cost[resource] * refundPercentage);
    }

    // Add resources back to player
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (resourceManager) {
      resourceManager.addResources(refund);
    }

    // Remove from queue
    this.productionQueue.splice(index, 1);

    // If this was the current item, reset production
    if (index === 0) {
      this.productionProgress = 0;

      if (this.productionQueue.length > 0) {
        this.productionType = this.productionQueue[0].type;
      } else {
        this.productionType = null;
      }
    }

    // Trigger cancel event
    this.triggerEvent("cancelProduction", {
      entity: this,
      item: item,
      refund: refund,
    });

    return true;
  }

  /**
   * Update research progress
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateResearch(deltaTime) {
    if (!this.currentResearch) return;

    // Update progress
    this.researchProgress += (deltaTime / this.currentResearch.time) * 100;

    // Check if research complete
    if (this.researchProgress >= 100) {
      // Complete research
      this.completeResearch();

      // Reset research
      this.currentResearch = null;
      this.researchProgress = 0;
    }
  }

  /**
   * Complete current research
   */
  completeResearch() {
    if (!this.currentResearch) return;

    // Apply research effects
    const game = window.gameInstance;
    const techManager = game ? game.getSystem("techManager") : null;

    if (techManager) {
      techManager.applyTechnology(this.currentResearch.id, this.owner);
    }

    // Remove from available techs
    const index = this.availableTechs.findIndex(
      (tech) => tech.id === this.currentResearch.id
    );
    if (index >= 0) {
      this.availableTechs.splice(index, 1);
    }

    // Trigger research complete event
    this.triggerEvent("researchComplete", {
      entity: this,
      tech: this.currentResearch,
    });
  }

  /**
   * Start researching a technology
   * @param {string} techId - ID of technology to research
   * @returns {boolean} True if research started successfully
   */
  startResearch(techId) {
    // Check if already researching
    if (this.currentResearch) {
      return false;
    }

    // Find tech in available techs
    const tech = this.availableTechs.find((t) => t.id === techId);
    if (!tech) {
      return false;
    }

    // Check if resources are available
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (!resourceManager) return false;

    if (!resourceManager.canAffordResources(tech.cost)) {
      return false;
    }

    // Deduct resources
    resourceManager.deductResources(tech.cost);

    // Start research
    this.currentResearch = tech;
    this.researchProgress = 0;

    // Trigger research start event
    this.triggerEvent("researchStart", {
      entity: this,
      tech: tech,
    });

    return true;
  }

  /**
   * Cancel current research
   * @returns {boolean} True if successfully canceled
   */
  cancelResearch() {
    if (!this.currentResearch) {
      return false;
    }

    // Calculate refund (50% of cost)
    const refund = {};
    for (const resource in this.currentResearch.cost) {
      refund[resource] = Math.floor(this.currentResearch.cost[resource] * 0.5);
    }

    // Add resources back to player
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (resourceManager) {
      resourceManager.addResources(refund);
    }

    // Reset research
    const tech = this.currentResearch;
    this.currentResearch = null;
    this.researchProgress = 0;

    // Trigger cancel event
    this.triggerEvent("cancelResearch", {
      entity: this,
      tech: tech,
      refund: refund,
    });

    return true;
  }

  /**
   * Generate resources produced by this building
   * @param {number} deltaTime - Time elapsed since last update
   */
  generateResources(deltaTime) {
    if (!this.resourceProduction) return;

    // Get resource manager
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (!resourceManager) return;

    // Generate each resource
    for (const resource in this.resourceProduction) {
      const amount = this.resourceProduction[resource] * deltaTime;

      // Add to storage if building has storage
      if (this.maxResourceStorage && this.maxResourceStorage[resource]) {
        // Initialize storage if needed
        if (!this.resourceStorage[resource]) {
          this.resourceStorage[resource] = 0;
        }

        // Calculate max that can be stored
        const maxToStore =
          this.maxResourceStorage[resource] - this.resourceStorage[resource];
        const amountToStore = Math.min(amount, maxToStore);

        // Add to storage
        this.resourceStorage[resource] += amountToStore;
      } else {
        // Add directly to player resources
        resourceManager.addResource(resource, amount);
      }
    }
  }

  /**
   * Collect resources from building storage
   * @param {string} resource - Resource type to collect
   * @returns {number} Amount collected
   */
  collectResources(resource) {
    if (!this.resourceStorage || !this.resourceStorage[resource]) {
      return 0;
    }

    // Get amount to collect
    const amount = this.resourceStorage[resource];

    // Reset storage
    this.resourceStorage[resource] = 0;

    // Add to player resources
    const game = window.gameInstance;
    const resourceManager = game ? game.getSystem("resourceManager") : null;

    if (resourceManager) {
      resourceManager.addResource(resource, amount);
    }

    // Trigger collection event
    this.triggerEvent("collectResources", {
      entity: this,
      resource: resource,
      amount: amount,
    });

    return amount;
  }

  /**
   * Contribute to building construction
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
   * Complete building construction
   */
  finishConstruction() {
    this.constructed = true;
    this.constructionProgress = 100;
    this.hp = this.maxHp;

    // Trigger construction complete event
    this.triggerEvent("constructionComplete", {
      entity: this,
    });

    // If this is a house/hut, update population capacity
    if (this.buildingType === "house" || this.buildingType === "hut") {
      const game = window.gameInstance;
      const populationManager = game
        ? game.getSystem("populationManager")
        : null;

      if (populationManager) {
        populationManager.updateCapacity(this.owner);
      }
    }
  }

  /**
   * Repair building damage
   * @param {number} amount - Amount of HP to repair
   * @param {Entity} repairer - Entity doing the repair
   */
  repair(amount, repairer) {
    if (!this.constructed || this.hp >= this.maxHp) return;

    // Add to HP
    this.hp = Math.min(this.maxHp, this.hp + amount);

    // Trigger repair event
    this.triggerEvent("repair", {
      entity: this,
      repairer: repairer,
      amount: amount,
    });
  }

  /**
   * Garrison a unit inside the building
   * @param {Entity} unit - Unit to garrison
   * @returns {boolean} True if successfully garrisoned
   */
  garrison(unit) {
    // Check if building can garrison
    if (this.maxGarrison <= 0) {
      return false;
    }

    // Check if garrison is full
    if (this.garrisonedUnits.length >= this.maxGarrison) {
      return false;
    }

    // Check if unit is valid and of same owner
    if (!unit || !unit.active || unit.owner !== this.owner) {
      return false;
    }

    // Add unit to garrison
    this.garrisonedUnits.push(unit.id);

    // Hide unit
    unit.visible = false;

    // Stop unit actions
    if (unit.stopMoving) unit.stopMoving();
    if (unit.stopAttacking) unit.stopAttacking();

    // Trigger garrison event
    this.triggerEvent("garrison", {
      entity: this,
      unit: unit,
    });

    return true;
  }

  /**
   * Ungarrison a unit
   * @param {string} unitId - ID of unit to ungarrison
   * @returns {boolean} True if successfully ungarrisoned
   */
  ungarrison(unitId) {
    // Find unit in garrison
    const index = this.garrisonedUnits.indexOf(unitId);

    if (index === -1) {
      return false;
    }

    // Get entity manager
    const game = window.gameInstance;
    const entityManager = game ? game.getSystem("entityManager") : null;

    if (!entityManager) return false;

    // Get unit
    const unit = entityManager.getEntityById(unitId);

    if (!unit) {
      // Unit no longer exists, remove from list
      this.garrisonedUnits.splice(index, 1);
      return false;
    }

    // Find spawn position
    const spawnPos = this.findSpawnPosition();

    if (!spawnPos) {
      return false;
    }

    // Remove from garrison
    this.garrisonedUnits.splice(index, 1);

    // Place unit at spawn position
    unit.x = spawnPos.x;
    unit.y = spawnPos.y;
    unit.visible = true;

    // Trigger ungarrison event
    this.triggerEvent("ungarrison", {
      entity: this,
      unit: unit,
    });

    return true;
  }

  /**
   * Ungarrison all units
   * @returns {number} Number of units ungarrisoned
   */
  ungarrisonAll() {
    let count = 0;

    // Copy array to avoid modification issues during iteration
    const units = [...this.garrisonedUnits];

    for (const unitId of units) {
      if (this.ungarrison(unitId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Toggle gate state (open/closed)
   * @returns {string} New gate state
   */
  toggleGate() {
    if (this.buildingType !== "gate") {
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
   * Die from damage
   * @param {Entity} killer - Entity that killed this one
   */
  die(killer) {
    // Ungarrison all units
    this.ungarrisonAll();

    // If this is a house/hut, update population capacity
    if (this.buildingType === "house" || this.buildingType === "hut") {
      const game = window.gameInstance;
      const populationManager = game
        ? game.getSystem("populationManager")
        : null;

      if (populationManager) {
        populationManager.updateCapacity(this.owner);
      }
    }

    // Call parent method
    super.die(killer);
  }

  /**
   * Get serializable data for this building
   * @returns {Object} Serialized building data
   */
  serialize() {
    // Get base entity data
    const data = super.serialize();

    // Add building-specific data
    data.buildingType = this.buildingType;
    data.constructionProgress = this.constructionProgress;
    data.constructed = this.constructed;
    data.productionType = this.productionType;
    data.productionProgress = this.productionProgress;
    data.productionQueue = [...this.productionQueue];
    data.productionCapacity = this.productionCapacity;
    data.resourceProduction = { ...this.resourceProduction };
    data.resourceStorage = { ...this.resourceStorage };
    data.maxResourceStorage = { ...this.maxResourceStorage };
    data.influenceRadius = this.influenceRadius;
    data.populationSupport = this.populationSupport;
    data.availableTechs = [...this.availableTechs];
    data.currentResearch = this.currentResearch
      ? { ...this.currentResearch }
      : null;
    data.researchProgress = this.researchProgress;
    data.workersAssigned = this.workersAssigned;
    data.gateState = this.gateState;
    data.shadow = this.shadow;
    data.shadowOffsetX = this.shadowOffsetX;
    data.shadowOffsetY = this.shadowOffsetY;
    data.shadowAlpha = this.shadowAlpha;
    data.ageLevel = this.ageLevel;
    data.garrisonedUnits = [...this.garrisonedUnits];
    data.maxGarrison = this.maxGarrison;

    return data;
  }

  /**
   * Create a building from serialized data
   * @param {Object} data - Serialized building data
   * @returns {Building} Deserialized building
   */
  static deserialize(data) {
    return new Building(data);
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Building;
} else {
  window.Building = Building;
}
