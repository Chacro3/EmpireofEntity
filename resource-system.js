/**
 * Empires of Eternity - Resource Management System
 * Handles resource gathering, storage, rates, and economy
 */

class ResourceSystem {
  /**
   * Create resource management system
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;

    // Resource quantities - initialize from game config
    this.resources = Utils.deepClone(CONFIG.RESOURCES.STARTING);

    // Resource rates (per second)
    this.rates = {
      wood: 0,
      food: 0,
      gold: 0,
      stone: 0,
      iron: 0,
    };

    // Resource gatherers and sources
    this.gatherers = {
      wood: [],
      food: [],
      gold: [],
      stone: [],
      iron: [],
    };

    // Resource sources - tracking resource node depletion
    this.sources = {
      wood: [], // Trees
      food: [], // Berry bushes, animals
      gold: [], // Gold mines
      stone: [], // Stone quarries
      iron: [], // Iron deposits
    };

    // Resource limits - based on storage buildings
    this.limits = {
      wood: 1000,
      food: 1000,
      gold: 500,
      stone: 500,
      iron: 300,
    };

    // Resource warnings (levels at which to warn if low)
    this.warningLevels = {
      wood: 50,
      food: 50,
      gold: 30,
      stone: 20,
      iron: 20,
    };

    // Cached civilization bonuses
    this.civBonuses = {
      gatherRates: {},
      storageCapacity: {},
      buildingCostReduction: {},
    };

    // Last update time
    this.lastUpdateTime = 0;

    Utils.log("Resource system initialized");
  }

  /**
   * Initialize the resource system
   * @param {string} civilization - Selected civilization
   */
  init(civilization) {
    // Cache civilization bonuses
    const civConfig = CONFIG.CIVILIZATIONS[civilization];
    if (civConfig) {
      // Apply Solari gathering bonus if applicable
      if (civConfig.uniquePerks.gatherBonus) {
        const bonus = civConfig.uniquePerks.gatherBonus;
        for (const resourceType of CONFIG.RESOURCES.TYPES) {
          this.civBonuses.gatherRates[resourceType] = 1 + bonus;
        }
        Utils.log(
          `Applied ${civConfig.name} gathering bonus: +${bonus * 100}%`
        );
      }

      // Apply Solari building discount if applicable
      if (civConfig.uniquePerks.buildingDiscount) {
        const discount = civConfig.uniquePerks.buildingDiscount;
        this.civBonuses.buildingCostReduction.wood = 1 - discount;
        Utils.log(
          `Applied ${civConfig.name} building discount: -${discount * 100}%`
        );
      }
    }

    Utils.log("Resource system initialized for " + civilization);
  }

  /**
   * Update resource quantities based on rates
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!deltaTime) return;

    // Update resource quantities based on rates
    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      if (this.rates[resourceType] !== 0) {
        const delta = this.rates[resourceType] * deltaTime;
        this.resources[resourceType] += delta;

        // Enforce resource limits
        if (this.resources[resourceType] > this.limits[resourceType]) {
          this.resources[resourceType] = this.limits[resourceType];
        }

        // Ensure resources never go below zero
        if (this.resources[resourceType] < 0) {
          this.resources[resourceType] = 0;
        }
      }
    }

    // Check for resource warnings
    this.checkResourceWarnings();

    // Update the game state resources
    if (this.game && this.game.state) {
      this.game.state.resources = Utils.deepClone(this.resources);
    }

    // Update the UI if available
    this.updateUI();
  }

  /**
   * Register a villager as gathering a specific resource
   * @param {Entity} villager - The villager entity
   * @param {string} resourceType - Resource type being gathered
   * @param {Object} source - Resource source information
   */
  registerGatherer(villager, resourceType, source) {
    if (!CONFIG.RESOURCES.TYPES.includes(resourceType)) {
      Utils.log(`Invalid resource type: ${resourceType}`);
      return false;
    }

    // Remove villager from any current gathering activity
    this.unregisterGatherer(villager);

    // Add villager to gatherers for this resource
    this.gatherers[resourceType].push({
      villager: villager,
      source: source,
      rate: this.getGatherRate(resourceType, villager),
    });

    // Update resource rates
    this.updateResourceRates();

    return true;
  }

  /**
   * Unregister a villager from gathering
   * @param {Entity} villager - The villager entity
   */
  unregisterGatherer(villager) {
    let wasGathering = false;

    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      const index = this.gatherers[resourceType].findIndex(
        (g) => g.villager.id === villager.id
      );
      if (index !== -1) {
        this.gatherers[resourceType].splice(index, 1);
        wasGathering = true;
      }
    }

    if (wasGathering) {
      // Update resource rates
      this.updateResourceRates();
    }

    return wasGathering;
  }

  /**
   * Register a resource source
   * @param {string} resourceType - Type of resource
   * @param {Object} source - Resource source information
   * @param {number} amount - Amount of resource available
   */
  registerSource(resourceType, source, amount) {
    if (!CONFIG.RESOURCES.TYPES.includes(resourceType)) {
      Utils.log(`Invalid resource type: ${resourceType}`);
      return false;
    }

    this.sources[resourceType].push({
      source: source,
      amount: amount,
      maxAmount: amount,
      position: { x: source.x, y: source.y },
    });

    return true;
  }

  /**
   * Unregister a resource source (when depleted)
   * @param {string} resourceType - Type of resource
   * @param {Object} source - Resource source to remove
   */
  unregisterSource(resourceType, source) {
    if (!CONFIG.RESOURCES.TYPES.includes(resourceType)) return false;

    const index = this.sources[resourceType].findIndex(
      (s) => s.source.id === source.id
    );
    if (index !== -1) {
      this.sources[resourceType].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Update resource rates based on gatherers
   */
  updateResourceRates() {
    // Reset rates
    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      this.rates[resourceType] = 0;
    }

    // Calculate rates from gatherers
    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      for (const gatherer of this.gatherers[resourceType]) {
        this.rates[resourceType] += gatherer.rate;
      }
    }

    // Log updated rates
    Utils.log("Updated resource rates:", this.rates);
  }

  /**
   * Get base gather rate for a resource type and villager
   * @param {string} resourceType - Type of resource
   * @param {Entity} villager - Villager entity
   * @returns {number} Gather rate in resources per second
   */
  getGatherRate(resourceType, villager) {
    // Get base rate from config
    let baseRate = CONFIG.RESOURCES.GATHER_RATE.base;

    // Apply resource-specific rate modifier
    if (CONFIG.RESOURCES.GATHER_RATE[resourceType]) {
      baseRate *= CONFIG.RESOURCES.GATHER_RATE[resourceType];
    }

    // Apply civilization bonus if any
    if (this.civBonuses.gatherRates[resourceType]) {
      baseRate *= this.civBonuses.gatherRates[resourceType];
    }

    // Apply villager-specific bonuses (from techs, etc)
    if (villager && villager.attributes.gatherBonus) {
      baseRate *= 1 + villager.attributes.gatherBonus;
    }

    return baseRate;
  }

  /**
   * Deplete a resource source
   * @param {string} resourceType - Type of resource
   * @param {Object} source - Resource source
   * @param {number} amount - Amount to deplete
   * @returns {boolean} True if source was depleted completely
   */
  depleteSource(resourceType, source, amount) {
    if (!CONFIG.RESOURCES.TYPES.includes(resourceType)) return false;

    const sourceObj = this.sources[resourceType].find(
      (s) => s.source.id === source.id
    );
    if (!sourceObj) return false;

    sourceObj.amount -= amount;

    // If depleted
    if (sourceObj.amount <= 0) {
      sourceObj.amount = 0;

      // Notify any gatherers to stop
      for (const gatherer of this.gatherers[resourceType]) {
        if (gatherer.source.id === source.id) {
          // Would normally call some method on villager
          if (gatherer.villager.stopGathering) {
            gatherer.villager.stopGathering();
          }
        }
      }

      // Remove this source
      this.unregisterSource(resourceType, source);

      return true;
    }

    return false;
  }

  /**
   * Check if we can afford a cost
   * @param {Object} cost - Cost object with resource types and amounts
   * @returns {boolean} True if we have enough resources
   */
  canAfford(cost) {
    for (const resourceType in cost) {
      if (this.resources[resourceType] < cost[resourceType]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Spend resources for a purchase
   * @param {Object} cost - Cost object with resource types and amounts
   * @returns {boolean} True if purchase was successful
   */
  spendResources(cost) {
    if (!this.canAfford(cost)) {
      return false;
    }

    // Deduct resources
    for (const resourceType in cost) {
      this.resources[resourceType] -= cost[resourceType];
    }

    // Update the game state resources
    if (this.game && this.game.state) {
      this.game.state.resources = Utils.deepClone(this.resources);
    }

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Add resources to the stockpile
   * @param {string} resourceType - Type of resource to add
   * @param {number} amount - Amount to add
   * @returns {boolean} True if successful
   */
  addResources(resourceType, amount) {
    if (!CONFIG.RESOURCES.TYPES.includes(resourceType)) {
      Utils.log(`Invalid resource type: ${resourceType}`);
      return false;
    }

    this.resources[resourceType] += amount;

    // Cap resources at limit
    if (this.resources[resourceType] > this.limits[resourceType]) {
      this.resources[resourceType] = this.limits[resourceType];
    }

    // Update the game state resources
    if (this.game && this.game.state) {
      this.game.state.resources = Utils.deepClone(this.resources);
    }

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Check for low resource warnings
   */
  checkResourceWarnings() {
    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      if (this.resources[resourceType] <= this.warningLevels[resourceType]) {
        // Only warn if we're actively using this resource (have gatherers or a rate)
        if (
          this.gatherers[resourceType].length > 0 ||
          this.rates[resourceType] !== 0
        ) {
          // Would trigger a warning via alert system
          if (this.game && this.game.systems.alertSystem) {
            this.game.systems.alertSystem.addAlert(
              `Low ${resourceType} warning!`
            );
          }
        }
      }
    }
  }

  /**
   * Get the cost of a building type
   * @param {string} buildingType - Type of building
   * @returns {Object} Cost object with resource types and amounts
   */
  getBuildingCost(buildingType) {
    // These would ideally come from a buildings config
    // Simplified example costs
    const baseCosts = {
      house: { wood: 30 },
      barracks: { wood: 100, stone: 50 },
      granary: { wood: 60, stone: 20 },
      wall: { stone: 20 },
      tower: { stone: 100, wood: 50 },
      townCenter: { wood: 200, stone: 100 },
      storehouse: { wood: 100 },
      farm: { wood: 60 },
      market: { wood: 150, gold: 50 },
      temple: { wood: 200, gold: 100, stone: 50 },
    };

    // Get base cost
    const baseCost = baseCosts[buildingType] || { wood: 50 };

    // Apply civilization building discount if any
    const finalCost = {};
    for (const resourceType in baseCost) {
      let cost = baseCost[resourceType];

      // Apply discount
      if (
        resourceType === "wood" &&
        this.civBonuses.buildingCostReduction.wood
      ) {
        cost *= this.civBonuses.buildingCostReduction.wood;
      }

      // Age scaling - buildings get more expensive in later ages
      if (this.game && this.game.state) {
        const ageMultiplier = 1 + this.game.state.currentAge * 0.1; // 10% more per age
        cost *= ageMultiplier;
      }

      finalCost[resourceType] = Math.floor(cost);
    }

    return finalCost;
  }

  /**
   * Get the cost of a unit type
   * @param {string} unitType - Type of unit
   * @returns {Object} Cost object with resource types and amounts
   */
  getUnitCost(unitType) {
    // These would ideally come from a units config
    // Simplified example costs
    const baseCosts = {
      villager: { food: 50 },
      spearman: { food: 60, wood: 20 },
      archer: { food: 40, wood: 40 },
      swordsman: { food: 60, gold: 20 },
      cavalry: { food: 80, gold: 30 },
      siegeRam: { wood: 180, gold: 80 },
      catapult: { wood: 160, gold: 120 },
      priest: { food: 30, gold: 90 },
    };

    // Get base cost
    const baseCost = baseCosts[unitType] || { food: 50 };

    // Apply civilization unit discount if any
    const finalCost = {};
    for (const resourceType in baseCost) {
      let cost = baseCost[resourceType];

      // Age scaling - units get slightly more expensive in later ages
      if (this.game && this.game.state) {
        const ageMultiplier = 1 + this.game.state.currentAge * 0.05; // 5% more per age
        cost *= ageMultiplier;
      }

      finalCost[resourceType] = Math.floor(cost);
    }

    return finalCost;
  }

  /**
   * Check if a civilization can advance to the next age
   * @returns {boolean} True if can advance
   */
  canAdvanceAge() {
    if (!this.game || !this.game.state) return false;

    const currentAge = this.game.state.currentAge;

    // Can't advance beyond max age
    if (currentAge >= CONFIG.AGES.NAMES.length - 1) {
      return false;
    }

    // Get requirements for next age
    const nextAge = currentAge + 1;
    const requirements = CONFIG.AGES.REQUIREMENTS[nextAge];

    // Check if we have enough resources
    return this.canAfford(requirements);
  }

  /**
   * Get resource deposit rates for a given civilization
   * @param {string} civilization - Civilization name
   * @returns {Object} Deposit rates for each resource
   */
  getDepositRates(civilization) {
    const rates = {};

    // Base deposit rates
    for (const resourceType of CONFIG.RESOURCES.TYPES) {
      rates[resourceType] = 1; // One unit per deposit by default
    }

    // Apply civilization bonuses if applicable
    const civConfig = CONFIG.CIVILIZATIONS[civilization];
    if (civConfig && civConfig.uniquePerks.gatherBonus) {
      for (const resourceType of CONFIG.RESOURCES.TYPES) {
        rates[resourceType] *= 1 + civConfig.uniquePerks.gatherBonus;
      }
    }

    return rates;
  }

  /**
   * Update the UI to display current resources
   */
  updateUI() {
    // Update the UI if it exists
    const resourcesElement = document.getElementById("resources");
    if (resourcesElement) {
      let html = "<div>Resources:</div>";
      for (const resourceType of CONFIG.RESOURCES.TYPES) {
        const value = Math.floor(this.resources[resourceType]);
        html += `<span class="${resourceType}">${resourceType}: ${value}</span> `;
      }
      resourcesElement.innerHTML = html;
    }
  }

  /**
   * Get current resource info
   * @returns {Object} Current resources and rates
   */
  getResourceInfo() {
    return {
      resources: Utils.deepClone(this.resources),
      rates: Utils.deepClone(this.rates),
      limits: Utils.deepClone(this.limits),
    };
  }

  /**
   * Set resource limits
   * @param {Object} newLimits - Updated resource limits
   */
  setResourceLimits(newLimits) {
    for (const resourceType in newLimits) {
      if (this.limits.hasOwnProperty(resourceType)) {
        this.limits[resourceType] = newLimits[resourceType];
      }
    }
  }

  /**
   * Serialize resource system state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      resources: Utils.deepClone(this.resources),
      rates: Utils.deepClone(this.rates),
      limits: Utils.deepClone(this.limits),
      gatherers: this.gatherers.map((g) => ({
        villagerId: g.villager.id,
        sourceId: g.source.id,
        resourceType: g.resourceType,
        rate: g.rate,
      })),
      sources: this.sources.map((s) => ({
        id: s.source.id,
        resourceType: s.resourceType,
        amount: s.amount,
        maxAmount: s.maxAmount,
        position: s.position,
      })),
    };
  }

  /**
   * Deserialize resource system state
   * @param {Object} data - Serialized state
   * @param {Game} game - Game instance
   * @returns {ResourceSystem} Deserialized resource system
   */
  static deserialize(data, game) {
    const system = new ResourceSystem(game);

    system.resources = Utils.deepClone(data.resources);
    system.rates = Utils.deepClone(data.rates);
    system.limits = Utils.deepClone(data.limits);

    // Sources and gatherers would need to be reconnected to actual entities
    // This would require accessing the entity manager

    return system;
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = ResourceSystem;
} else if (typeof window !== "undefined") {
  window.ResourceSystem = ResourceSystem;
}
