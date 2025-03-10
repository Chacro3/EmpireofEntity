/**
 * Empires of Eternity - Technology Tree Manager
 * Handles technology research, upgrades, and age advancements
 */

class TechManager {
  /**
   * Create a new technology manager
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // Technology research state for each civilization
    this.researchedTech = {
      SOLARI: new Set(),
      LUNARI: new Set(),
    };

    // Technology definitions
    this.techDefinitions = this.initializeTechDefinitions();

    // Active technology effects
    this.activeEffects = {
      SOLARI: {},
      LUNARI: {},
    };

    Utils.log("TechManager created");
  }

  /**
   * Initialize technology definitions
   * @returns {Object} Technology definitions
   */
  initializeTechDefinitions() {
    return {
      // Solari tech tree
      // Stone Age technologies
      solar_tools: {
        id: "solar_tools",
        name: "Solar Tools",
        description: "+20% villager gather speed",
        age: 0, // Stone Age
        cost: { wood: 100, food: 50 },
        building: "temple",
        effects: [{ type: "villager_gather_speed", bonus: 0.2 }],
        civilization: "SOLARI",
      },
      sunlit_paths: {
        id: "sunlit_paths",
        name: "Sunlit Paths",
        description: "+15% villager movement speed",
        age: 0, // Stone Age
        cost: { wood: 80 },
        building: "temple",
        effects: [{ type: "villager_movement_speed", bonus: 0.15 }],
        civilization: "SOLARI",
      },
      basic_masonry: {
        id: "basic_masonry",
        name: "Basic Masonry",
        description: "+100 HP to all buildings",
        age: 0, // Stone Age
        cost: { wood: 150 },
        building: "temple",
        effects: [{ type: "building_hp", bonus: 100 }],
        civilization: "SOLARI",
      },
      spear_sharpening: {
        id: "spear_sharpening",
        name: "Spear Sharpening",
        description: "+5 attack to spearmen",
        age: 0, // Stone Age
        cost: { food: 50 },
        building: "temple",
        effects: [{ type: "unit_attack", unitType: "sun_spearman", bonus: 5 }],
        civilization: "SOLARI",
      },
      trade_caravans: {
        id: "trade_caravans",
        name: "Trade Caravans",
        description: "Markets generate +10% gold",
        age: 0, // Stone Age
        cost: { wood: 100, gold: 20 },
        building: "temple",
        effects: [
          {
            type: "building_resource_generation",
            buildingType: "market",
            resource: "gold",
            bonus: 0.1,
          },
        ],
        civilization: "SOLARI",
      },

      // Bronze Age Solari technologies
      bronze_weapons: {
        id: "bronze_weapons",
        name: "Bronze Weapons",
        description: "+10 attack to infantry",
        age: 1, // Bronze Age
        cost: { wood: 200, gold: 50 },
        building: "solar_forge",
        effects: [{ type: "unit_attack", unitType: "sun_spearman", bonus: 10 }],
        civilization: "SOLARI",
      },
      sandstone_walls: {
        id: "sandstone_walls",
        name: "Sandstone Walls",
        description: "+200 HP to walls",
        age: 1, // Bronze Age
        cost: { wood: 150, stone: 50 },
        building: "solar_forge",
        effects: [{ type: "wall_hp", bonus: 200 }],
        civilization: "SOLARI",
      },
      irrigation: {
        id: "irrigation",
        name: "Irrigation",
        description: "Farms produce +25% food",
        age: 1, // Bronze Age
        cost: { food: 200, wood: 100 },
        building: "solar_forge",
        effects: [
          {
            type: "building_resource_generation",
            buildingType: "granary",
            resource: "food",
            bonus: 0.25,
          },
        ],
        civilization: "SOLARI",
      },
      archery_drills: {
        id: "archery_drills",
        name: "Archery Drills",
        description: "+5 attack to archers",
        age: 1, // Bronze Age
        cost: { food: 100, wood: 50 },
        building: "solar_forge",
        effects: [{ type: "unit_attack", unitType: "solar_archer", bonus: 5 }],
        civilization: "SOLARI",
      },
      camel_saddles: {
        id: "camel_saddles",
        name: "Camel Saddles",
        description: "Unlocks Desert Cavalry early",
        age: 1, // Bronze Age
        cost: { food: 150, gold: 50 },
        building: "solar_forge",
        effects: [{ type: "unlock_unit", unitType: "desert_cavalry" }],
        civilization: "SOLARI",
      },

      // More Solari techs for other ages would follow...

      // Lunari tech tree
      // Stone Age technologies
      lunar_blades: {
        id: "lunar_blades",
        name: "Lunar Blades",
        description: "+20% villager gather speed",
        age: 0, // Stone Age
        cost: { wood: 100, food: 50 },
        building: "shrine",
        effects: [{ type: "villager_gather_speed", bonus: 0.2 }],
        civilization: "LUNARI",
      },
      moonlit_trails: {
        id: "moonlit_trails",
        name: "Moonlit Trails",
        description: "+15% villager movement speed",
        age: 0, // Stone Age
        cost: { wood: 80 },
        building: "shrine",
        effects: [{ type: "villager_movement_speed", bonus: 0.15 }],
        civilization: "LUNARI",
      },
      wooden_frames: {
        id: "wooden_frames",
        name: "Wooden Frames",
        description: "+100 HP to all buildings",
        age: 0, // Stone Age
        cost: { wood: 150 },
        building: "shrine",
        effects: [{ type: "building_hp", bonus: 100 }],
        civilization: "LUNARI",
      },
      skirmish_tactics: {
        id: "skirmish_tactics",
        name: "Skirmish Tactics",
        description: "+5 attack to skirmishers",
        age: 0, // Stone Age
        cost: { food: 50 },
        building: "shrine",
        effects: [
          { type: "unit_attack", unitType: "moon_skirmisher", bonus: 5 },
        ],
        civilization: "LUNARI",
      },
      night_markets: {
        id: "night_markets",
        name: "Night Markets",
        description: "Trade Posts generate +10% gold",
        age: 0, // Stone Age
        cost: { wood: 100, gold: 20 },
        building: "shrine",
        effects: [
          {
            type: "building_resource_generation",
            buildingType: "trade_post",
            resource: "gold",
            bonus: 0.1,
          },
        ],
        civilization: "LUNARI",
      },

      // Bronze Age Lunari technologies
      bronze_tips: {
        id: "bronze_tips",
        name: "Bronze Tips",
        description: "+10 attack to infantry",
        age: 1, // Bronze Age
        cost: { wood: 200, gold: 50 },
        building: "moon_kiln",
        effects: [
          { type: "unit_attack", unitType: "moon_skirmisher", bonus: 10 },
        ],
        civilization: "LUNARI",
      },
      palisade_reinforcement: {
        id: "palisade_reinforcement",
        name: "Palisade Reinforcement",
        description: "+200 HP to palisades",
        age: 1, // Bronze Age
        cost: { wood: 150, stone: 50 },
        building: "moon_kiln",
        effects: [{ type: "wall_hp", bonus: 200 }],
        civilization: "LUNARI",
      },
      hunting_traps: {
        id: "hunting_traps",
        name: "Hunting Traps",
        description: "+25% food from hunting",
        age: 1, // Bronze Age
        cost: { food: 200, wood: 100 },
        building: "moon_kiln",
        effects: [
          {
            type: "building_resource_generation",
            buildingType: "storehouse",
            resource: "food",
            bonus: 0.25,
          },
        ],
        civilization: "LUNARI",
      },
      bowstring_tension: {
        id: "bowstring_tension",
        name: "Bowstring Tension",
        description: "+5 attack to hunters",
        age: 1, // Bronze Age
        cost: { food: 100, wood: 50 },
        building: "moon_kiln",
        effects: [{ type: "unit_attack", unitType: "lunar_hunter", bonus: 5 }],
        civilization: "LUNARI",
      },
      wolf_riders: {
        id: "wolf_riders",
        name: "Wolf Riders",
        description: "Unlocks Night Riders early",
        age: 1, // Bronze Age
        cost: { food: 150, gold: 50 },
        building: "moon_kiln",
        effects: [{ type: "unlock_unit", unitType: "night_rider" }],
        civilization: "LUNARI",
      },

      // More Lunari techs for other ages would follow...
    };
  }

  /**
   * Initialize the technology manager
   */
  init() {
    // Reset research state
    this.researchedTech = {
      SOLARI: new Set(),
      LUNARI: new Set(),
    };

    // Reset active effects
    this.activeEffects = {
      SOLARI: {},
      LUNARI: {},
    };

    Utils.log("TechManager initialized");
    return this;
  }

  /**
   * Get available technologies for a civilization
   * @param {string} civ - Civilization key
   * @param {number} age - Current age
   * @returns {Array} Array of available technologies
   */
  getAvailableTechs(civ, age) {
    const available = [];

    // Iterate through all technologies
    for (const techId in this.techDefinitions) {
      const tech = this.techDefinitions[techId];

      // Check if tech belongs to civilization and age
      if (tech.civilization === civ && tech.age <= age) {
        // Check if not already researched
        if (!this.researchedTech[civ].has(techId)) {
          available.push(tech);
        }
      }
    }

    return available;
  }

  /**
   * Get technologies available at a specific building
   * @param {string} buildingType - Building type
   * @param {string} civ - Civilization key
   * @param {number} age - Current age
   * @returns {Array} Array of available technologies
   */
  getBuildingTechs(buildingType, civ, age) {
    return this.getAvailableTechs(civ, age).filter(
      (tech) => tech.building === buildingType
    );
  }

  /**
   * Start researching a technology
   * @param {string} techId - Technology ID
   * @param {string} civ - Civilization key
   * @returns {boolean} True if research started successfully
   */
  startResearch(techId, civ) {
    // Get tech definition
    const tech = this.techDefinitions[techId];

    if (!tech) {
      Utils.log(`Tech not found: ${techId}`);
      return false;
    }

    // Check if already researched
    if (this.researchedTech[civ].has(techId)) {
      Utils.log(`Tech already researched: ${techId}`);
      return false;
    }

    // Check if resources are available
    const resourceManager = this.game.getSystem("resourceManager");
    if (!resourceManager) {
      Utils.log("Resource manager not found");
      return false;
    }

    if (!resourceManager.canAffordResources(tech.cost, civ)) {
      Utils.log(`Cannot afford tech ${techId}`);
      return false;
    }

    // Deduct resources
    resourceManager.deductResources(tech.cost, civ);

    // Find research building
    const entityManager = this.game.getSystem("entityManager");
    if (!entityManager) {
      Utils.log("Entity manager not found");
      return false;
    }

    const buildings = entityManager.getEntitiesByTypeAndOwner("building", civ);
    const researchBuilding = buildings.find(
      (b) => b.buildingType === tech.building && b.constructed
    );

    if (!researchBuilding) {
      Utils.log(`No valid ${tech.building} found for research`);
      return false;
    }

    // Start research at building
    if (researchBuilding.startResearch) {
      const success = researchBuilding.startResearch({
        id: techId,
        name: tech.name,
        time: this.getResearchTime(tech),
        cost: tech.cost,
      });

      if (success) {
        Utils.log(`Started research of ${tech.name}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get research time for a technology
   * @param {Object} tech - Technology definition
   * @returns {number} Research time in seconds
   */
  getResearchTime(tech) {
    // Base research time scales with age and cost
    const baseTime = 30; // seconds
    const ageFactor = 1 + tech.age * 0.5; // Higher ages take longer
    const costFactor =
      Object.values(tech.cost).reduce((sum, value) => sum + value, 0) / 100;

    return Math.round(baseTime * ageFactor * (1 + costFactor));
  }

  /**
   * Complete research of a technology
   * @param {string} techId - Technology ID
   * @param {string} civ - Civilization key
   */
  completeResearch(techId, civ) {
    // Get tech definition
    const tech = this.techDefinitions[techId];

    if (!tech) {
      Utils.log(`Tech not found: ${techId}`);
      return;
    }

    // Add to researched techs
    this.researchedTech[civ].add(techId);

    // Apply effects
    this.applyTechnology(techId, civ);

    // Trigger research complete event
    const alertSystem = this.game.getSystem("alertSystem");
    if (alertSystem) {
      alertSystem.addAlert(`Research complete: ${tech.name}`, "research", civ);
    }

    Utils.log(`Completed research of ${tech.name}`);
  }

  /**
   * Apply technology effects
   * @param {string} techId - Technology ID
   * @param {string} civ - Civilization key
   */
  applyTechnology(techId, civ) {
    // Get tech definition
    const tech = this.techDefinitions[techId];

    if (!tech) {
      Utils.log(`Tech not found: ${techId}`);
      return;
    }

    // Apply each effect
    for (const effect of tech.effects) {
      this.applyEffect(effect, civ);
    }
  }

  /**
   * Apply a technology effect
   * @param {Object} effect - Effect definition
   * @param {string} civ - Civilization key
   */
  applyEffect(effect, civ) {
    const entityManager = this.game.getSystem("entityManager");
    if (!entityManager) return;

    switch (effect.type) {
      case "villager_gather_speed":
        // Apply to all villagers
        const villagers = entityManager.getEntitiesByTypeAndOwner(
          "villager",
          civ
        );
        for (const villager of villagers) {
          villager.gatherRate *= 1 + effect.bonus;
        }

        // Store effect for future villagers
        if (!this.activeEffects[civ]["villager_gather_speed"]) {
          this.activeEffects[civ]["villager_gather_speed"] = 0;
        }
        this.activeEffects[civ]["villager_gather_speed"] += effect.bonus;
        break;

      case "villager_movement_speed":
        // Apply to all villagers
        const villagers2 = entityManager.getEntitiesByTypeAndOwner(
          "villager",
          civ
        );
        for (const villager of villagers2) {
          villager.speed *= 1 + effect.bonus;
        }

        // Store effect for future villagers
        if (!this.activeEffects[civ]["villager_movement_speed"]) {
          this.activeEffects[civ]["villager_movement_speed"] = 0;
        }
        this.activeEffects[civ]["villager_movement_speed"] += effect.bonus;
        break;

      case "building_hp":
        // Apply to all buildings
        const buildings = entityManager.getEntitiesByTypeAndOwner(
          "building",
          civ
        );
        for (const building of buildings) {
          // Add HP bonus
          building.maxHp += effect.bonus;

          // If fully constructed, also add to current HP
          if (building.constructed) {
            building.hp += effect.bonus;
          }
        }

        // Store effect for future buildings
        if (!this.activeEffects[civ]["building_hp"]) {
          this.activeEffects[civ]["building_hp"] = 0;
        }
        this.activeEffects[civ]["building_hp"] += effect.bonus;
        break;

      case "unit_attack":
        // Apply to specific unit type
        const units = entityManager.getEntitiesByTypeAndOwner("unit", civ);
        for (const unit of units) {
          if (unit.unitType === effect.unitType) {
            unit.ar += effect.bonus;
          }
        }

        // Store effect for future units
        const effectKey = `unit_attack_${effect.unitType}`;
        if (!this.activeEffects[civ][effectKey]) {
          this.activeEffects[civ][effectKey] = 0;
        }
        this.activeEffects[civ][effectKey] += effect.bonus;
        break;

      case "building_resource_generation":
        // Apply to specific building type
        const buildings2 = entityManager.getEntitiesByTypeAndOwner(
          "building",
          civ
        );
        for (const building of buildings2) {
          if (building.buildingType === effect.buildingType) {
            // Update resource production
            if (!building.resourceProduction) {
              building.resourceProduction = {};
            }

            if (!building.resourceProduction[effect.resource]) {
              building.resourceProduction[effect.resource] = 0;
            }

            building.resourceProduction[effect.resource] *= 1 + effect.bonus;
          }
        }

        // Store effect for future buildings
        const effectKey2 = `building_resource_${effect.buildingType}_${effect.resource}`;
        if (!this.activeEffects[civ][effectKey2]) {
          this.activeEffects[civ][effectKey2] = 0;
        }
        this.activeEffects[civ][effectKey2] += effect.bonus;
        break;

      case "wall_hp":
        // Apply to all walls
        const walls = entityManager.getEntitiesByTypeAndOwner("wall", civ);
        for (const wall of walls) {
          // Add HP bonus
          wall.maxHp += effect.bonus;

          // If fully constructed, also add to current HP
          if (wall.constructed) {
            wall.hp += effect.bonus;
          }
        }

        // Store effect for future walls
        if (!this.activeEffects[civ]["wall_hp"]) {
          this.activeEffects[civ]["wall_hp"] = 0;
        }
        this.activeEffects[civ]["wall_hp"] += effect.bonus;
        break;

      case "unlock_unit":
        // Just store the unlock effect
        const effectKey3 = `unlock_unit_${effect.unitType}`;
        this.activeEffects[civ][effectKey3] = true;
        break;
    }
  }

  /**
   * Apply stored effects to a new entity
   * @param {Entity} entity - Entity to apply effects to
   */
  applyEffectsToEntity(entity) {
    if (!entity || !entity.owner) return;

    const civ = entity.owner;
    const effects = this.activeEffects[civ];

    // Apply effects based on entity type
    if (entity.type === "villager") {
      // Villager gather speed
      if (effects["villager_gather_speed"]) {
        entity.gatherRate *= 1 + effects["villager_gather_speed"];
      }

      // Villager movement speed
      if (effects["villager_movement_speed"]) {
        entity.speed *= 1 + effects["villager_movement_speed"];
      }
    } else if (entity.type === "unit") {
      // Unit attack bonus for specific unit type
      const attackKey = `unit_attack_${entity.unitType}`;
      if (effects[attackKey]) {
        entity.ar += effects[attackKey];
      }
    } else if (entity.type === "building") {
      // Building HP bonus
      if (effects["building_hp"]) {
        entity.maxHp += effects["building_hp"];

        // Also add to current HP if constructed
        if (entity.constructed) {
          entity.hp += effects["building_hp"];
        }
      }

      // Building resource production
      const resourceKey = `building_resource_${entity.buildingType}`;
      for (const effectKey in effects) {
        if (effectKey.startsWith(resourceKey)) {
          const resource = effectKey.split("_")[3]; // Extract resource from key

          if (!entity.resourceProduction) {
            entity.resourceProduction = {};
          }

          if (!entity.resourceProduction[resource]) {
            entity.resourceProduction[resource] = 0;
          }

          entity.resourceProduction[resource] *= 1 + effects[effectKey];
        }
      }
    } else if (entity.type === "wall") {
      // Wall HP bonus
      if (effects["wall_hp"]) {
        entity.maxHp += effects["wall_hp"];

        // Also add to current HP if constructed
        if (entity.constructed) {
          entity.hp += effects["wall_hp"];
        }
      }
    }
  }

  /**
   * Check if a unit type is unlocked
   * @param {string} unitType - Unit type
   * @param {string} civ - Civilization key
   * @param {number} age - Current age
   * @returns {boolean} True if unit is unlocked
   */
  isUnitUnlocked(unitType, civ, age) {
    // Check if unlocked by tech
    const unlockKey = `unlock_unit_${unitType}`;
    if (this.activeEffects[civ][unlockKey]) {
      return true;
    }

    // Otherwise, unit is unlocked based on age and civ
    // This is a simplified check - in reality, would check unit definitions
    return true;
  }

  /**
   * Get the total number of technologies researched by a civilization
   * @param {string} civ - Civilization key
   * @returns {number} Number of researched technologies
   */
  getResearchedCount(civ) {
    return this.researchedTech[civ].size;
  }

  /**
   * Get the total number of technologies available to a civilization
   * @param {string} civ - Civilization key
   * @returns {number} Number of available technologies
   */
  getTotalTechCount(civ) {
    return Object.values(this.techDefinitions).filter(
      (tech) => tech.civilization === civ
    ).length;
  }

  /**
   * Check if all technologies have been researched
   * @param {string} civ - Civilization key
   * @returns {boolean} True if all technologies are researched
   */
  hasAllTech(civ) {
    const totalCount = this.getTotalTechCount(civ);
    const researchedCount = this.getResearchedCount(civ);

    return researchedCount >= totalCount;
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = TechManager;
} else {
  window.TechManager = TechManager;
}
