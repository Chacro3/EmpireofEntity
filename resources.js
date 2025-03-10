/**
 * Empires of Eternity - Resource Manager
 * Handles resource collection, storage, and costs for game actions
 */

class ResourceManager {
  /**
   * Create a new resource manager
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // Resource storage for each civilization
    this.resources = {
      SOLARI: { ...CONFIG.RESOURCES.STARTING },
      LUNARI: { ...CONFIG.RESOURCES.STARTING },
    };

    // Resource rates (per second)
    this.rates = {
      SOLARI: {
        income: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
        expense: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
      },
      LUNARI: {
        income: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
        expense: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
      },
    };

    // Resource alerts
    this.alerts = {
      SOLARI: new Set(),
      LUNARI: new Set(),
    };

    // Building and unit costs
    this.costs = this.initializeCosts();

    Utils.log("ResourceManager created");
  }

  /**
   * Initialize costs for all buildings, units, and upgrades
   * @returns {Object} Cost structures
   */
  initializeCosts() {
    // Note: These could alternatively be loaded from a separate config file
    return {
      buildings: {
        // Basic buildings per age
        house: [
          { wood: 100 }, // Stone Age
          { wood: 120, stone: 30 }, // Bronze Age
          { wood: 150, stone: 50 }, // Iron Age
          { wood: 180, stone: 80, gold: 20 }, // Golden Age
          { wood: 220, stone: 100, gold: 30, iron: 10 }, // Eternal Age
        ],
        hut: [
          { wood: 100 }, // Stone Age
          { wood: 120, stone: 30 }, // Bronze Age
          { wood: 150, stone: 50 }, // Iron Age
          { wood: 180, stone: 80, gold: 20 }, // Golden Age
          { wood: 220, stone: 100, gold: 30, iron: 10 }, // Eternal Age
        ],
        granary: [
          { wood: 150, stone: 50 }, // Stone Age
          { wood: 180, stone: 70 }, // Bronze Age
          { wood: 220, stone: 100, gold: 20 }, // Iron Age
          { wood: 280, stone: 140, gold: 40 }, // Golden Age
          { wood: 350, stone: 180, gold: 60, iron: 20 }, // Eternal Age
        ],
        storehouse: [
          { wood: 150, stone: 50 }, // Stone Age
          { wood: 180, stone: 70 }, // Bronze Age
          { wood: 220, stone: 100, gold: 20 }, // Iron Age
          { wood: 280, stone: 140, gold: 40 }, // Golden Age
          { wood: 350, stone: 180, gold: 60, iron: 20 }, // Eternal Age
        ],
        lumber_mill: [
          { wood: 120, stone: 40 }, // Stone Age
          { wood: 150, stone: 60 }, // Bronze Age
          { wood: 190, stone: 90, gold: 20 }, // Iron Age
          { wood: 240, stone: 120, gold: 30 }, // Golden Age
          { wood: 300, stone: 150, gold: 50, iron: 20 }, // Eternal Age
        ],
        sawmill: [
          { wood: 120, stone: 40 }, // Stone Age
          { wood: 150, stone: 60 }, // Bronze Age
          { wood: 190, stone: 90, gold: 20 }, // Iron Age
          { wood: 240, stone: 120, gold: 30 }, // Golden Age
          { wood: 300, stone: 150, gold: 50, iron: 20 }, // Eternal Age
        ],
        barracks: [
          { wood: 200, stone: 100 }, // Stone Age
          { wood: 250, stone: 150, gold: 50 }, // Bronze Age
          { wood: 300, stone: 200, gold: 80, iron: 50 }, // Iron Age
          { wood: 400, stone: 250, gold: 120, iron: 80 }, // Golden Age
          { wood: 500, stone: 300, gold: 150, iron: 100 }, // Eternal Age
        ],
        training_ground: [
          { wood: 200, stone: 100 }, // Stone Age
          { wood: 250, stone: 150, gold: 50 }, // Bronze Age
          { wood: 300, stone: 200, gold: 80, iron: 50 }, // Iron Age
          { wood: 400, stone: 250, gold: 120, iron: 80 }, // Golden Age
          { wood: 500, stone: 300, gold: 150, iron: 100 }, // Eternal Age
        ],
        solar_forge: [
          { wood: 0, stone: 0 }, // Stone Age (not available)
          { wood: 300, stone: 200, gold: 100 }, // Bronze Age
          { wood: 350, stone: 250, gold: 150, iron: 80 }, // Iron Age
          { wood: 450, stone: 300, gold: 200, iron: 120 }, // Golden Age
          { wood: 550, stone: 350, gold: 250, iron: 150 }, // Eternal Age
        ],
        moon_kiln: [
          { wood: 0, stone: 0 }, // Stone Age (not available)
          { wood: 300, stone: 200, gold: 100 }, // Bronze Age
          { wood: 350, stone: 250, gold: 150, iron: 80 }, // Iron Age
          { wood: 450, stone: 300, gold: 200, iron: 120 }, // Golden Age
          { wood: 550, stone: 350, gold: 250, iron: 150 }, // Eternal Age
        ],
        market: [
          { wood: 180, stone: 80 }, // Stone Age
          { wood: 220, stone: 120, gold: 40 }, // Bronze Age
          { wood: 270, stone: 160, gold: 70, iron: 20 }, // Iron Age
          { wood: 340, stone: 200, gold: 100, iron: 40 }, // Golden Age
          { wood: 420, stone: 250, gold: 130, iron: 60 }, // Eternal Age
        ],
        trade_post: [
          { wood: 180, stone: 80 }, // Stone Age
          { wood: 220, stone: 120, gold: 40 }, // Bronze Age
          { wood: 270, stone: 160, gold: 70, iron: 20 }, // Iron Age
          { wood: 340, stone: 200, gold: 100, iron: 40 }, // Golden Age
          { wood: 420, stone: 250, gold: 130, iron: 60 }, // Eternal Age
        ],
        temple: [
          { wood: 250, stone: 150, gold: 50 }, // Stone Age
          { wood: 300, stone: 200, gold: 100 }, // Bronze Age
          { wood: 380, stone: 280, gold: 150, iron: 50 }, // Iron Age
          { wood: 480, stone: 350, gold: 200, iron: 100 }, // Golden Age
          { wood: 600, stone: 450, gold: 250, iron: 150 }, // Eternal Age
        ],
        shrine: [
          { wood: 250, stone: 150, gold: 50 }, // Stone Age
          { wood: 300, stone: 200, gold: 100 }, // Bronze Age
          { wood: 380, stone: 280, gold: 150, iron: 50 }, // Iron Age
          { wood: 480, stone: 350, gold: 200, iron: 100 }, // Golden Age
          { wood: 600, stone: 450, gold: 250, iron: 150 }, // Eternal Age
        ],
        tower: [
          { wood: 150, stone: 200 }, // Stone Age
          { wood: 180, stone: 250, gold: 40 }, // Bronze Age
          { wood: 220, stone: 300, gold: 60, iron: 30 }, // Iron Age
          { wood: 280, stone: 380, gold: 90, iron: 60 }, // Golden Age
          { wood: 350, stone: 450, gold: 120, iron: 90 }, // Eternal Age
        ],
        watchtower: [
          { wood: 150, stone: 200 }, // Stone Age
          { wood: 180, stone: 250, gold: 40 }, // Bronze Age
          { wood: 220, stone: 300, gold: 60, iron: 30 }, // Iron Age
          { wood: 280, stone: 380, gold: 90, iron: 60 }, // Golden Age
          { wood: 350, stone: 450, gold: 120, iron: 90 }, // Eternal Age
        ],
        town_center: [
          { wood: 400, stone: 300, gold: 100 }, // Stone Age
          { wood: 500, stone: 400, gold: 200 }, // Bronze Age
          { wood: 600, stone: 500, gold: 300, iron: 100 }, // Iron Age
          { wood: 800, stone: 600, gold: 400, iron: 200 }, // Golden Age
          { wood: 1000, stone: 800, gold: 500, iron: 300 }, // Eternal Age
        ],
        wonder: [
          { wood: 2000, stone: 1500, gold: 1000, iron: 500 }, // Any age
          { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
          { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
          { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
          { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
        ],
      },

      // Wall costs
      walls: [
        { wood: 50 }, // Stone Age
        { wood: 75, stone: 25 }, // Bronze Age
        { wood: 100, stone: 50 }, // Iron Age
        { wood: 150, stone: 75, iron: 25 }, // Golden Age
        { wood: 200, stone: 100, iron: 50 }, // Eternal Age
      ],

      gates: [
        { wood: 100, stone: 50 }, // Stone Age
        { wood: 150, stone: 75 }, // Bronze Age
        { wood: 200, stone: 100, iron: 25 }, // Iron Age
        { wood: 300, stone: 150, iron: 50 }, // Golden Age
        { wood: 400, stone: 200, iron: 100 }, // Eternal Age
      ],

      // Unit costs
      units: {
        // Villagers
        villager: [
          { food: 50 }, // Stone Age
          { food: 75 }, // Bronze Age
          { food: 100 }, // Iron Age
          { food: 125 }, // Golden Age
          { food: 150 }, // Eternal Age
        ],

        // Solari units
        sun_spearman: [
          { food: 60 }, // Stone Age
          { food: 70, wood: 20 }, // Bronze Age
          { food: 80, wood: 30, iron: 10 }, // Iron Age
          { food: 100, wood: 40, iron: 20 }, // Golden Age
          { food: 120, wood: 50, iron: 30 }, // Eternal Age
        ],
        solar_archer: [
          { food: 0 }, // Stone Age (not available)
          { food: 50, wood: 30 }, // Bronze Age
          { food: 60, wood: 40, iron: 10 }, // Iron Age
          { food: 70, wood: 50, iron: 20 }, // Golden Age
          { food: 90, wood: 60, iron: 30 }, // Eternal Age
        ],
        desert_cavalry: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 80, gold: 40 }, // Iron Age
          { food: 100, gold: 60, iron: 20 }, // Golden Age
          { food: 120, gold: 80, iron: 30 }, // Eternal Age
        ],
        sunforged_knight: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 0 }, // Iron Age (not available)
          { food: 100, gold: 60, iron: 30 }, // Golden Age
          { food: 120, gold: 80, iron: 40 }, // Eternal Age
        ],
        sun_catapult: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { wood: 300, iron: 150, gold: 50 }, // Iron Age
          { wood: 350, iron: 200, gold: 75 }, // Golden Age
          { wood: 400, iron: 250, gold: 100 }, // Eternal Age
        ],

        // Lunari units
        moon_skirmisher: [
          { food: 60 }, // Stone Age
          { food: 70, wood: 20 }, // Bronze Age
          { food: 80, wood: 30, iron: 10 }, // Iron Age
          { food: 100, wood: 40, iron: 20 }, // Golden Age
          { food: 120, wood: 50, iron: 30 }, // Eternal Age
        ],
        lunar_hunter: [
          { food: 0 }, // Stone Age (not available)
          { food: 50, wood: 30 }, // Bronze Age
          { food: 60, wood: 40, iron: 10 }, // Iron Age
          { food: 70, wood: 50, iron: 20 }, // Golden Age
          { food: 90, wood: 60, iron: 30 }, // Eternal Age
        ],
        night_rider: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 80, gold: 40 }, // Iron Age
          { food: 100, gold: 60, iron: 20 }, // Golden Age
          { food: 120, gold: 80, iron: 30 }, // Eternal Age
        ],
        shadow_blade: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 0 }, // Iron Age (not available)
          { food: 100, gold: 60, iron: 30 }, // Golden Age
          { food: 120, gold: 80, iron: 40 }, // Eternal Age
        ],
        moon_trebuchet: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { wood: 300, iron: 150, gold: 50 }, // Iron Age
          { wood: 350, iron: 200, gold: 75 }, // Golden Age
          { wood: 400, iron: 250, gold: 100 }, // Eternal Age
        ],

        // Heroes
        sun_king: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 500, gold: 200, iron: 100 }, // Iron Age
          { food: 600, gold: 250, iron: 150 }, // Golden Age
          { food: 700, gold: 300, iron: 200 }, // Eternal Age
        ],
        dawn_sage: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 0 }, // Iron Age (not available)
          { food: 400, gold: 300, iron: 150 }, // Golden Age
          { food: 500, gold: 400, iron: 200 }, // Eternal Age
        ],
        moon_priestess: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 500, gold: 200, iron: 100 }, // Iron Age
          { food: 600, gold: 250, iron: 150 }, // Golden Age
          { food: 700, gold: 300, iron: 200 }, // Eternal Age
        ],
        nightstalker: [
          { food: 0 }, // Stone Age (not available)
          { food: 0 }, // Bronze Age (not available)
          { food: 0 }, // Iron Age (not available)
          { food: 400, gold: 300, iron: 150 }, // Golden Age
          { food: 500, gold: 400, iron: 200 }, // Eternal Age
        ],
      },
    };
  }

  /**
   * Initialize the resource manager
   */
  init() {
    // Reset resources to starting values
    this.resources = {
      SOLARI: { ...CONFIG.RESOURCES.STARTING },
      LUNARI: { ...CONFIG.RESOURCES.STARTING },
    };

    // Reset rates
    this.rates = {
      SOLARI: {
        income: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
        expense: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
      },
      LUNARI: {
        income: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
        expense: { wood: 0, food: 0, gold: 0, stone: 0, iron: 0 },
      },
    };

    // Reset alerts
    this.alerts = {
      SOLARI: new Set(),
      LUNARI: new Set(),
    };

    Utils.log("ResourceManager initialized");
    return this;
  }

  /**
   * Update resource values based on rates
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    // Update resources for each civilization
    for (const civ of ["SOLARI", "LUNARI"]) {
      // Apply income rates
      for (const resource in this.rates[civ].income) {
        const amount = this.rates[civ].income[resource] * deltaTime;
        this.addResource(resource, amount, civ);
      }

      // Apply expense rates
      for (const resource in this.rates[civ].expense) {
        const amount = this.rates[civ].expense[resource] * deltaTime;
        this.deductResource(resource, amount, civ);
      }

      // Update alert status
      this.updateAlerts(civ);
    }
  }

  /**
   * Update resource alerts
   * @param {string} civ - Civilization key
   */
  updateAlerts(civ) {
    // Check for low resources
    for (const resource of CONFIG.RESOURCES.TYPES) {
      const amount = this.resources[civ][resource] || 0;
      const alertKey = `low_${resource}`;

      // Check if amount is low (below 50)
      if (amount < 50) {
        if (!this.alerts[civ].has(alertKey)) {
          // Add alert
          this.alerts[civ].add(alertKey);

          // Send alert notification
          const alertSystem = this.game.getSystem("alertSystem");
          if (alertSystem) {
            alertSystem.addAlert(`Low ${resource}!`, "resource", civ);
          }
        }
      } else {
        // Remove alert if it exists
        this.alerts[civ].delete(alertKey);
      }
    }

    // Check for resource depletion alerts
    // These would be triggered by the map system when resources are depleted
  }

  /**
   * Get current resources for a civilization
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {Object} Resource amounts
   */
  getResources(civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    return { ...this.resources[civ] };
  }

  /**
   * Get a specific resource amount
   * @param {string} resource - Resource type
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {number} Resource amount
   */
  getResource(resource, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    return this.resources[civ][resource] || 0;
  }

  /**
   * Add resources to a civilization
   * @param {Object} resources - Resources to add {wood: 100, food: 50, etc.}
   * @param {string} civ - Civilization key (defaults to player civilization)
   */
  addResources(resources, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    for (const resource in resources) {
      this.addResource(resource, resources[resource], civ);
    }
  }

  /**
   * Add a resource amount to a civilization
   * @param {string} resource - Resource type
   * @param {number} amount - Amount to add
   * @param {string} civ - Civilization key (defaults to player civilization)
   */
  addResource(resource, amount, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Initialize if needed
    if (!this.resources[civ][resource]) {
      this.resources[civ][resource] = 0;
    }

    // Add resource
    this.resources[civ][resource] += amount;

    // Round to 2 decimal places to avoid floating-point issues
    this.resources[civ][resource] =
      Math.round(this.resources[civ][resource] * 100) / 100;
  }

  /**
   * Deduct resources from a civilization
   * @param {Object} resources - Resources to deduct {wood: 100, food: 50, etc.}
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if successfully deducted
   */
  deductResources(resources, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Check if enough resources
    if (!this.canAffordResources(resources, civ)) {
      return false;
    }

    // Deduct resources
    for (const resource in resources) {
      this.deductResource(resource, resources[resource], civ);
    }

    return true;
  }

  /**
   * Deduct a resource amount from a civilization
   * @param {string} resource - Resource type
   * @param {number} amount - Amount to deduct
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if successfully deducted
   */
  deductResource(resource, amount, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Initialize if needed
    if (!this.resources[civ][resource]) {
      this.resources[civ][resource] = 0;
    }

    // Check if enough resource
    if (this.resources[civ][resource] < amount) {
      return false;
    }

    // Deduct resource
    this.resources[civ][resource] -= amount;

    // Round to 2 decimal places to avoid floating-point issues
    this.resources[civ][resource] =
      Math.round(this.resources[civ][resource] * 100) / 100;

    return true;
  }

  /**
   * Check if a civilization can afford resources
   * @param {Object} resources - Resources to check {wood: 100, food: 50, etc.}
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if can afford
   */
  canAffordResources(resources, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    for (const resource in resources) {
      const currentAmount = this.resources[civ][resource] || 0;

      if (currentAmount < resources[resource]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get building cost
   * @param {string} buildingType - Building type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {Object} Cost in resources
   */
  getBuildingCost(buildingType, age, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Get base cost
    const costs = this.costs.buildings;

    if (!costs[buildingType] || !costs[buildingType][age]) {
      return {};
    }

    const baseCost = { ...costs[buildingType][age] };

    // Apply civilization bonuses
    if (
      civ === "SOLARI" &&
      CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount
    ) {
      // Apply Solari building wood discount
      const discount = CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount;

      if (baseCost.wood) {
        baseCost.wood = Math.floor(baseCost.wood * (1 - discount));
      }
    }

    return baseCost;
  }

  /**
   * Check if can afford a building
   * @param {string} buildingType - Building type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if can afford
   */
  canAffordBuilding(buildingType, age, civ = null) {
    const cost = this.getBuildingCost(buildingType, age, civ);
    return this.canAffordResources(cost, civ);
  }

  /**
   * Deduct cost for a building
   * @param {string} buildingType - Building type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if successfully deducted
   */
  deductBuildingCost(buildingType, age, civ = null) {
    const cost = this.getBuildingCost(buildingType, age, civ);
    return this.deductResources(cost, civ);
  }

  /**
   * Get wall segment cost
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {Object} Cost in resources
   */
  getWallSegmentCost(age, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Get base cost
    const baseCost = { ...this.costs.walls[age] };

    // Apply civilization bonuses
    if (
      civ === "SOLARI" &&
      CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount
    ) {
      // Apply Solari building wood discount
      const discount = CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount;

      if (baseCost.wood) {
        baseCost.wood = Math.floor(baseCost.wood * (1 - discount));
      }
    }

    return baseCost;
  }

  /**
   * Get gate cost
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {Object} Cost in resources
   */
  getGateCost(age, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Get base cost
    const baseCost = { ...this.costs.gates[age] };

    // Apply civilization bonuses
    if (
      civ === "SOLARI" &&
      CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount
    ) {
      // Apply Solari building wood discount
      const discount = CONFIG.CIVILIZATIONS.SOLARI.uniquePerks.buildingDiscount;

      if (baseCost.wood) {
        baseCost.wood = Math.floor(baseCost.wood * (1 - discount));
      }
    }

    return baseCost;
  }

  /**
   * Get unit cost
   * @param {string} unitType - Unit type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {Object} Cost in resources
   */
  getUnitCost(unitType, age, civ = null) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Get base cost
    const costs = this.costs.units;

    if (!costs[unitType] || !costs[unitType][age]) {
      return {};
    }

    return { ...costs[unitType][age] };
  }

  /**
   * Check if can afford a unit
   * @param {string} unitType - Unit type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if can afford
   */
  canAffordUnit(unitType, age, civ = null) {
    const cost = this.getUnitCost(unitType, age, civ);
    return this.canAffordResources(cost, civ);
  }

  /**
   * Deduct cost for a unit
   * @param {string} unitType - Unit type
   * @param {number} age - Age level (0-4)
   * @param {string} civ - Civilization key (defaults to player civilization)
   * @returns {boolean} True if successfully deducted
   */
  deductUnitCost(unitType, age, civ = null) {
    const cost = this.getUnitCost(unitType, age, civ);
    return this.deductResources(cost, civ);
  }

  /**
   * Reset resources to starting values
   * @param {string} civ - Civilization key (defaults to both)
   */
  resetResources(civ = null) {
    if (civ) {
      this.resources[civ] = { ...CONFIG.RESOURCES.STARTING };
    } else {
      this.resources.SOLARI = { ...CONFIG.RESOURCES.STARTING };
      this.resources.LUNARI = { ...CONFIG.RESOURCES.STARTING };
    }
  }

  /**
   * Set resource income rate
   * @param {string} resource - Resource type
   * @param {number} rate - Income rate per second
   * @param {string} civ - Civilization key
   */
  setIncomeRate(resource, rate, civ) {
    if (!this.rates[civ].income[resource]) {
      this.rates[civ].income[resource] = 0;
    }

    this.rates[civ].income[resource] = rate;
  }

  /**
   * Add to resource income rate
   * @param {string} resource - Resource type
   * @param {number} rate - Income rate to add
   * @param {string} civ - Civilization key
   */
  addIncomeRate(resource, rate, civ) {
    if (!this.rates[civ].income[resource]) {
      this.rates[civ].income[resource] = 0;
    }

    this.rates[civ].income[resource] += rate;
  }

  /**
   * Set resource expense rate
   * @param {string} resource - Resource type
   * @param {number} rate - Expense rate per second
   * @param {string} civ - Civilization key
   */
  setExpenseRate(resource, rate, civ) {
    if (!this.rates[civ].expense[resource]) {
      this.rates[civ].expense[resource] = 0;
    }

    this.rates[civ].expense[resource] = rate;
  }

  /**
   * Add to resource expense rate
   * @param {string} resource - Resource type
   * @param {number} rate - Expense rate to add
   * @param {string} civ - Civilization key
   */
  addExpenseRate(resource, rate, civ) {
    if (!this.rates[civ].expense[resource]) {
      this.rates[civ].expense[resource] = 0;
    }

    this.rates[civ].expense[resource] += rate;
  }

  /**
   * Check if a civilization meets requirements for age advancement
   * @param {number} targetAge - Target age level (0-4)
   * @param {string} civ - Civilization key
   * @returns {boolean} True if requirements are met
   */
  canAdvanceAge(targetAge, civ) {
    // Check if target age is valid
    if (targetAge < 1 || targetAge >= CONFIG.AGES.NAMES.length) {
      return false;
    }

    // Get requirements
    const requirements = CONFIG.AGES.REQUIREMENTS[targetAge];

    // Check if resources meet requirements
    return this.canAffordResources(requirements, civ);
  }

  /**
   * Get list of missing resources for age advancement
   * @param {number} targetAge - Target age level (0-4)
   * @param {string} civ - Civilization key
   * @returns {Object} Missing resources {resource: amount}
   */
  getMissingResourcesForAge(targetAge, civ) {
    // Check if target age is valid
    if (targetAge < 1 || targetAge >= CONFIG.AGES.NAMES.length) {
      return {};
    }

    // Get requirements
    const requirements = CONFIG.AGES.REQUIREMENTS[targetAge];
    const missing = {};

    // Check each resource
    for (const resource in requirements) {
      const required = requirements[resource];
      const current = this.getResource(resource, civ);

      if (current < required) {
        missing[resource] = required - current;
      }
    }

    return missing;
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = ResourceManager;
} else {
  window.ResourceManager = ResourceManager;
}
