/**
 * @fileoverview Base civilization class for Empires of Eternity
 * Defines the core structure for all civilizations and their unique traits.
 */

import { config } from "../config.js";

/**
 * Base Civilization class that all specific civilizations extend
 */
export class Civilization {
  /**
   * Create a new civilization
   * @param {Object} game - Reference to the main game object
   * @param {number} playerId - ID of the player using this civilization
   */
  constructor(game, playerId) {
    this.game = game;
    this.playerId = playerId;

    // Default civilization properties
    this.id = "base";
    this.name = "Base Civilization";
    this.description = "Base civilization class. Should not be used directly.";
    this.icon = "civ_base";
    this.color = "#999999";

    // Bonus info for UI display
    this.bonuses = [
      {
        name: "No bonuses",
        description: "This is a base class with no inherent bonuses.",
      },
    ];

    // Resource bonuses (gathering rates, start amounts, etc)
    this.resourceBonuses = {
      startingResources: {
        food: 0,
        wood: 0,
        gold: 0,
        stone: 0,
        iron: 0,
      },
      gatheringRates: {
        food: 1.0,
        wood: 1.0,
        gold: 1.0,
        stone: 1.0,
        iron: 1.0,
      },
      resourceCosts: {
        food: 1.0,
        wood: 1.0,
        gold: 1.0,
        stone: 1.0,
        iron: 1.0,
      },
    };

    // Unit bonuses (HP, attack, speed, etc)
    this.unitBonuses = {
      // Global bonuses applied to all units
      global: {
        hp: 1.0,
        attack: 1.0,
        armor: 1.0,
        speed: 1.0,
        buildTime: 1.0,
        cost: 1.0,
        lineOfSight: 1.0,
      },
      // Unit-specific bonuses
      unitTypes: {},
    };

    // Building bonuses (HP, build time, etc)
    this.buildingBonuses = {
      // Global bonuses applied to all buildings
      global: {
        hp: 1.0,
        armor: 1.0,
        buildTime: 1.0,
        cost: 1.0,
        productionSpeed: 1.0,
      },
      // Building-specific bonuses
      buildingTypes: {},
    };

    // Technology bonuses
    this.techBonuses = {
      researchTime: 1.0,
      researchCost: 1.0,
      // Tech-specific bonuses will be defined by subclasses
      techTypes: {},
    };

    // Age bonuses
    this.ageBonuses = {
      advancementTime: 1.0,
      advancementCost: 1.0,
      // Lists of bonuses unlocked in each age
      ageUnlocks: {
        0: [], // Stone Age
        1: [], // Bronze Age
        2: [], // Iron Age
        3: [], // Imperial Age
        4: [], // Eternal Age
      },
    };

    // Unique units and buildings
    this.uniqueUnits = [];
    this.uniqueBuildings = [];
    this.uniqueTechnologies = [];

    // Special abilities and traits
    this.specialAbilities = [];

    // Tech tree modifications (disabled or enabled techs)
    this.techTreeModifications = {
      disabled: [],
      enabled: [],
    };

    // Cultural traits that affect gameplay
    this.culturalTraits = [];

    // Starting units and buildings
    this.startingUnits = [
      { type: "villager", count: 3 },
      { type: "scout", count: 1 },
    ];

    this.startingBuildings = [{ type: "towncenter", count: 1 }];
  }

  /**
   * Initialize the civilization
   */
  init() {
    console.log(
      `Initializing ${this.name} civilization for player ${this.playerId}`
    );

    // Apply civilization bonuses
    this.applyBonuses();

    // Create starting units and buildings
    this.createStartingEntities();
  }

  /**
   * Apply all civilization bonuses
   */
  applyBonuses() {
    // Apply resource gathering rate bonuses
    if (this.game.resourceManager) {
      this.game.resourceManager.setGatheringRateModifiers(
        this.playerId,
        this.resourceBonuses.gatheringRates
      );

      // Apply resource cost modifiers
      this.game.resourceManager.setCostModifiers(
        this.playerId,
        this.resourceBonuses.resourceCosts
      );

      // Add starting resources
      this.game.resourceManager.addResources(
        this.playerId,
        this.resourceBonuses.startingResources
      );
    }

    // Apply unit and building bonuses
    if (this.game.entityManager) {
      // Register bonuses with entity manager so they're applied to new entities
      this.game.entityManager.registerCivilizationBonuses(this.playerId, {
        unitBonuses: this.unitBonuses,
        buildingBonuses: this.buildingBonuses,
      });
    }

    // Apply tech bonuses
    if (this.game.techManager) {
      this.game.techManager.setCivilizationBonuses(
        this.playerId,
        this.techBonuses
      );

      // Apply tech tree modifications
      for (const techId of this.techTreeModifications.disabled) {
        this.game.techManager.disableTechnology(this.playerId, techId);
      }

      for (const techId of this.techTreeModifications.enabled) {
        this.game.techManager.enableTechnology(this.playerId, techId);
      }
    }

    // Apply age advancement bonuses
    if (this.game.ageSystem) {
      // Register age bonuses with age system
      this.game.ageSystem.setCivilizationBonuses(
        this.playerId,
        this.ageBonuses
      );
    }
  }

  /**
   * Create starting units and buildings
   */
  createStartingEntities() {
    // Skip if entity manager is not available
    if (!this.game.entityManager) {
      return;
    }

    // Get starting position from map
    const startingPosition = this.game.map.getStartingPosition(this.playerId);

    if (!startingPosition) {
      console.error(`No starting position found for player ${this.playerId}`);
      return;
    }

    // Create town center first
    const townCenter = this.startingBuildings.find(
      (b) => b.type === "towncenter"
    );
    if (townCenter) {
      const tcEntity = this.game.entityManager.createBuilding(
        "towncenter",
        this.playerId,
        startingPosition.x,
        startingPosition.y
      );

      // Set town center as completed (no build time at start)
      if (tcEntity) {
        tcEntity.constructionProgress = 100;
        tcEntity.isConstructed = true;
      }
    }

    // Create other starting buildings
    for (const building of this.startingBuildings) {
      // Skip town center (already created)
      if (building.type === "towncenter") {
        continue;
      }

      // Find suitable position near town center
      for (let i = 0; i < building.count; i++) {
        const position = this.findBuildingPosition(
          startingPosition.x,
          startingPosition.y,
          building.type
        );

        if (position) {
          const entity = this.game.entityManager.createBuilding(
            building.type,
            this.playerId,
            position.x,
            position.y
          );

          // Set building as completed
          if (entity) {
            entity.constructionProgress = 100;
            entity.isConstructed = true;
          }
        }
      }
    }

    // Create starting units
    for (const unit of this.startingUnits) {
      // Find suitable positions near town center
      for (let i = 0; i < unit.count; i++) {
        const position = this.findUnitPosition(
          startingPosition.x,
          startingPosition.y
        );

        if (position) {
          this.game.entityManager.createUnit(
            unit.type,
            this.playerId,
            position.x,
            position.y
          );
        }
      }
    }
  }

  /**
   * Find a suitable position for a building near a center point
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {string} buildingType - Type of building
   * @returns {Object|null} Position {x, y} or null if no position found
   */
  findBuildingPosition(centerX, centerY, buildingType) {
    // Get building dimensions
    const buildingData = config.BUILDINGS[buildingType] || {
      width: 2,
      height: 2,
    };
    const width = buildingData.width || 2;
    const height = buildingData.height || 2;

    // Try positions in increasing distance from center
    for (let distance = 5; distance <= 20; distance += 2) {
      // Try multiple angles
      for (let angle = 0; angle < 360; angle += 30) {
        const radian = (angle * Math.PI) / 180;
        const x = centerX + Math.cos(radian) * distance;
        const y = centerY + Math.sin(radian) * distance;

        // Check if position is valid for building
        if (
          this.game.map.canPlaceBuilding(x, y, width, height, this.playerId)
        ) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Find a suitable position for a unit near a center point
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @returns {Object|null} Position {x, y} or null if no position found
   */
  findUnitPosition(centerX, centerY) {
    // Try positions in increasing distance from center
    for (let distance = 2; distance <= 10; distance++) {
      // Try multiple angles
      for (let angle = 0; angle < 360; angle += 20) {
        const radian = (angle * Math.PI) / 180;
        const x = centerX + Math.cos(radian) * distance;
        const y = centerY + Math.sin(radian) * distance;

        // Check if position is valid for unit
        if (this.game.map.canPlaceUnit(x, y)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Get the gathering rate modifier for a specific resource
   * @param {string} resourceType - Type of resource
   * @returns {number} Gathering rate modifier
   */
  getGatheringRateModifier(resourceType) {
    return this.resourceBonuses.gatheringRates[resourceType] || 1.0;
  }

  /**
   * Get the cost modifier for a specific resource
   * @param {string} resourceType - Type of resource
   * @returns {number} Cost modifier
   */
  getCostModifier(resourceType) {
    return this.resourceBonuses.resourceCosts[resourceType] || 1.0;
  }

  /**
   * Get unit bonus modifier
   * @param {string} unitType - Type of unit
   * @param {string} bonusType - Type of bonus (hp, attack, etc)
   * @returns {number} Bonus modifier
   */
  getUnitBonus(unitType, bonusType) {
    // Check for unit-specific bonus
    const unitTypeBonuses = this.unitBonuses.unitTypes[unitType];
    if (unitTypeBonuses && unitTypeBonuses[bonusType] !== undefined) {
      return unitTypeBonuses[bonusType];
    }

    // Fall back to global bonus
    return this.unitBonuses.global[bonusType] || 1.0;
  }

  /**
   * Get building bonus modifier
   * @param {string} buildingType - Type of building
   * @param {string} bonusType - Type of bonus (hp, buildTime, etc)
   * @returns {number} Bonus modifier
   */
  getBuildingBonus(buildingType, bonusType) {
    // Check for building-specific bonus
    const buildingTypeBonuses =
      this.buildingBonuses.buildingTypes[buildingType];
    if (buildingTypeBonuses && buildingTypeBonuses[bonusType] !== undefined) {
      return buildingTypeBonuses[bonusType];
    }

    // Fall back to global bonus
    return this.buildingBonuses.global[bonusType] || 1.0;
  }

  /**
   * Get tech research time modifier
   * @param {string} techId - ID of the technology
   * @returns {number} Research time modifier
   */
  getTechResearchTimeModifier(techId) {
    // Check for tech-specific bonus
    const techTypeBonuses = this.techBonuses.techTypes[techId];
    if (techTypeBonuses && techTypeBonuses.researchTime !== undefined) {
      return techTypeBonuses.researchTime;
    }

    // Fall back to global bonus
    return this.techBonuses.researchTime || 1.0;
  }

  /**
   * Get tech research cost modifier
   * @param {string} techId - ID of the technology
   * @returns {number} Research cost modifier
   */
  getTechResearchCostModifier(techId) {
    // Check for tech-specific bonus
    const techTypeBonuses = this.techBonuses.techTypes[techId];
    if (techTypeBonuses && techTypeBonuses.researchCost !== undefined) {
      return techTypeBonuses.researchCost;
    }

    // Fall back to global bonus
    return this.techBonuses.researchCost || 1.0;
  }

  /**
   * Get age advancement time modifier
   * @returns {number} Age advancement time modifier
   */
  getAgeAdvancementTimeModifier() {
    return this.ageBonuses.advancementTime || 1.0;
  }

  /**
   * Get age advancement cost modifier
   * @returns {number} Age advancement cost modifier
   */
  getAgeAdvancementCostModifier() {
    return this.ageBonuses.advancementCost || 1.0;
  }

  /**
   * Get unique units available to this civilization
   * @returns {Array} Array of unique unit definitions
   */
  getUniqueUnits() {
    return this.uniqueUnits;
  }

  /**
   * Get unique buildings available to this civilization
   * @returns {Array} Array of unique building definitions
   */
  getUniqueBuildings() {
    return this.uniqueBuildings;
  }

  /**
   * Get unique technologies available to this civilization
   * @returns {Array} Array of unique technology definitions
   */
  getUniqueTechnologies() {
    return this.uniqueTechnologies;
  }

  /**
   * Get all bonuses for display in UI
   * @returns {Array} Array of bonus descriptions
   */
  getBonusDescriptions() {
    return this.bonuses;
  }

  /**
   * Get civilization information for UI
   * @returns {Object} Civilization info
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      color: this.color,
      bonuses: this.bonuses,
      uniqueUnits: this.uniqueUnits.map((unit) => ({
        id: unit.id,
        name: unit.name,
        description: unit.description,
        age: unit.age,
      })),
      uniqueBuildings: this.uniqueBuildings.map((building) => ({
        id: building.id,
        name: building.name,
        description: building.description,
        age: building.age,
      })),
      uniqueTechnologies: this.uniqueTechnologies.map((tech) => ({
        id: tech.id,
        name: tech.name,
        description: tech.description,
        age: tech.age,
      })),
      specialAbilities: this.specialAbilities,
    };
  }

  /**
   * Get civilization-specific unit cost
   * @param {string} unitType - Type of unit
   * @returns {Object|null} Cost object or null if not found
   */
  getUnitCost(unitType) {
    // Check for unique units
    const uniqueUnit = this.uniqueUnits.find((u) => u.id === unitType);
    if (uniqueUnit && uniqueUnit.cost) {
      return uniqueUnit.cost;
    }

    // Get base cost from config
    const baseCost = config.UNITS[unitType]?.cost;
    if (!baseCost) {
      return null;
    }

    // Apply civilization modifiers
    const modifiedCost = {};
    for (const resource in baseCost) {
      const modifier = this.getCostModifier(resource);
      modifiedCost[resource] = Math.floor(baseCost[resource] * modifier);
    }

    return modifiedCost;
  }

  /**
   * Get civilization-specific building cost
   * @param {string} buildingType - Type of building
   * @returns {Object|null} Cost object or null if not found
   */
  getBuildingCost(buildingType) {
    // Check for unique buildings
    const uniqueBuilding = this.uniqueBuildings.find(
      (b) => b.id === buildingType
    );
    if (uniqueBuilding && uniqueBuilding.cost) {
      return uniqueBuilding.cost;
    }

    // Get base cost from config
    const baseCost = config.BUILDINGS[buildingType]?.cost;
    if (!baseCost) {
      return null;
    }

    // Apply civilization modifiers
    const modifiedCost = {};
    for (const resource in baseCost) {
      const modifier = this.getCostModifier(resource);
      modifiedCost[resource] = Math.floor(baseCost[resource] * modifier);
    }

    return modifiedCost;
  }

  /**
   * React to a game event
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   */
  onGameEvent(eventType, eventData) {
    // Base class does not respond to events
    // Subclasses can override this method to implement civilization-specific behaviors
  }

  /**
   * Get age-specific bonuses
   * @param {number} age - Age level
   * @returns {Array} Array of bonus objects
   */
  getAgeBonuses(age) {
    return this.ageBonuses.ageUnlocks[age] || [];
  }

  /**
   * Apply age-specific bonuses when advancing to a new age
   * @param {number} age - New age level
   */
  applyAgeBonuses(age) {
    const bonuses = this.getAgeBonuses(age);

    for (const bonus of bonuses) {
      this.applyBonus(bonus);
    }
  }

  /**
   * Apply a specific bonus
   * @param {Object} bonus - Bonus definition
   */
  applyBonus(bonus) {
    switch (bonus.type) {
      case "resource_gathering":
        this.resourceBonuses.gatheringRates[bonus.resource] *= 1 + bonus.value;
        // Update resource manager
        if (this.game.resourceManager) {
          this.game.resourceManager.setGatheringRateModifier(
            this.playerId,
            bonus.resource,
            this.resourceBonuses.gatheringRates[bonus.resource]
          );
        }
        break;

      case "unit_buff":
        if (bonus.unitType) {
          // Unit-specific buff
          if (!this.unitBonuses.unitTypes[bonus.unitType]) {
            this.unitBonuses.unitTypes[bonus.unitType] = {};
          }
          this.unitBonuses.unitTypes[bonus.unitType][bonus.stat] *=
            1 + bonus.value;
        } else {
          // Global unit buff
          this.unitBonuses.global[bonus.stat] *= 1 + bonus.value;
        }
        break;

      case "building_buff":
        if (bonus.buildingType) {
          // Building-specific buff
          if (!this.buildingBonuses.buildingTypes[bonus.buildingType]) {
            this.buildingBonuses.buildingTypes[bonus.buildingType] = {};
          }
          this.buildingBonuses.buildingTypes[bonus.buildingType][bonus.stat] *=
            1 + bonus.value;
        } else {
          // Global building buff
          this.buildingBonuses.global[bonus.stat] *= 1 + bonus.value;
        }
        break;

      case "unlock_unit":
        // Update entity manager
        if (this.game.entityManager) {
          this.game.entityManager.unlockUnitForPlayer(
            this.playerId,
            bonus.unitType
          );
        }
        break;

      case "unlock_building":
        // Update entity manager
        if (this.game.entityManager) {
          this.game.entityManager.unlockBuildingForPlayer(
            this.playerId,
            bonus.buildingType
          );
        }
        break;

      case "unlock_tech":
        // Update tech manager
        if (this.game.techManager) {
          this.game.techManager.unlockTechnologyForPlayer(
            this.playerId,
            bonus.techId
          );
        }
        break;
    }
  }

  /**
   * Get a list of available units for this civilization at the given age
   * @param {number} age - Age level
   * @returns {Array} Array of available unit types
   */
  getAvailableUnits(age) {
    // Start with common units for this age
    const units = config.AGE_UNITS[age] ? [...config.AGE_UNITS[age]] : [];

    // Add unique units available at this age
    for (const unit of this.uniqueUnits) {
      if (unit.age <= age) {
        units.push(unit.id);
      }
    }

    // Filter out any disabled units
    return units.filter(
      (unitType) => !this.techTreeModifications.disabled.includes(unitType)
    );
  }

  /**
   * Get a list of available buildings for this civilization at the given age
   * @param {number} age - Age level
   * @returns {Array} Array of available building types
   */
  getAvailableBuildings(age) {
    // Start with common buildings for this age
    const buildings = config.AGE_BUILDINGS[age]
      ? [...config.AGE_BUILDINGS[age]]
      : [];

    // Add unique buildings available at this age
    for (const building of this.uniqueBuildings) {
      if (building.age <= age) {
        buildings.push(building.id);
      }
    }

    // Filter out any disabled buildings
    return buildings.filter(
      (buildingType) =>
        !this.techTreeModifications.disabled.includes(buildingType)
    );
  }

  /**
   * Get a list of available technologies for this civilization at the given age
   * @param {number} age - Age level
   * @returns {Array} Array of available technology IDs
   */
  getAvailableTechnologies(age) {
    // Start with common technologies for this age
    const technologies = config.AGE_TECHNOLOGIES[age]
      ? [...config.AGE_TECHNOLOGIES[age]]
      : [];

    // Add unique technologies available at this age
    for (const tech of this.uniqueTechnologies) {
      if (tech.age <= age) {
        technologies.push(tech.id);
      }
    }

    // Filter out disabled technologies and add enabled ones
    return technologies
      .filter((techId) => !this.techTreeModifications.disabled.includes(techId))
      .concat(
        this.techTreeModifications.enabled.filter((techId) => {
          const techConfig = config.TECHNOLOGIES[techId];
          return techConfig && techConfig.age <= age;
        })
      );
  }
}
