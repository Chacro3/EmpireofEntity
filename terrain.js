/**
 * @fileoverview Terrain system for Empires of Eternity
 * Handles terrain types, their properties, and effects on gameplay.
 */

import { config } from "../config.js";

/**
 * TerrainSystem manages different terrain types and their gameplay effects
 */
export class TerrainSystem {
  /**
   * Create a new terrain system
   * @param {Object} game - Reference to the main game object
   * @param {Object} map - Reference to the map object
   */
  constructor(game, map) {
    this.game = game;
    this.map = map;

    // Define terrain types and their properties
    this.terrainTypes = {
      grass: {
        name: "Grass",
        description:
          "Flat grassy terrain suitable for building and easy to traverse.",
        movementFactor: 1.0, // Base movement speed (1.0 = normal)
        buildable: true, // Can buildings be placed here
        harvestable: false, // Can resources be harvested directly from this terrain
        terrainDefenseBonus: 0, // Additional defense bonus when fighting on this terrain
        resourceBonuses: {}, // No resource bonuses
        unitEffects: {}, // No special effects for units
        appearanceVariants: 3, // Number of appearance variants
        shallowWater: false,
        elevation: 0, // Base elevation
        passable: true, // Can units move through this
      },

      forest: {
        name: "Forest",
        description:
          "Dense forest with harvestable wood. Reduces movement speed but provides defensive bonuses.",
        movementFactor: 0.8, // 20% slower movement
        buildable: false,
        harvestable: true,
        harvestResource: "wood",
        harvestAmount: 100, // Base amount per tree
        terrainDefenseBonus: 2, // +2 defense for units in forest
        lineSightBlocking: true, // Blocks line of sight
        resourceBonuses: {},
        unitEffects: {
          cavalry: {
            movementFactor: 0.6, // Cavalry is 40% slower in forests
          },
          infantry: {
            attack: 1, // Infantry gets attack bonus in forests
          },
        },
        appearanceVariants: 4,
        shallowWater: false,
        elevation: 0,
        passable: true,
        removalCost: {
          // Cost to clear forest
          wood: 0,
          food: 0,
          gold: 0,
          stone: 0,
          time: 10000, // 10 seconds to clear
        },
        clearTerrainType: "grass", // When cleared, becomes grass
      },

      mountain: {
        name: "Mountain",
        description:
          "Steep mountain terrain. Impassable but can be mined for stone resources.",
        movementFactor: 0.0, // Impassable
        buildable: false,
        harvestable: true,
        harvestResource: "stone",
        harvestAmount: 150, // Base amount per mountain tile
        terrainDefenseBonus: 0, // Not relevant as it's impassable
        lineSightBonus: 4, // +4 tiles line of sight when on mountain
        resourceBonuses: {},
        unitEffects: {},
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 3, // High elevation
        passable: false,
      },

      hills: {
        name: "Hills",
        description:
          "Rolling hills. Slows movement but provides defensive and line of sight bonuses.",
        movementFactor: 0.8, // 20% slower movement
        buildable: true,
        harvestable: false,
        terrainDefenseBonus: 1, // +1 defense
        lineSightBonus: 2, // +2 tiles line of sight when on hills
        resourceBonuses: {},
        unitEffects: {
          archer: {
            attackRange: 1, // Archers get +1 range on hills
          },
        },
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 1, // Low elevation
        passable: true,
      },

      water: {
        name: "Water",
        description:
          "Deep water. Impassable for land units but ships can move freely.",
        movementFactor: 0.0, // Impassable for land units
        buildable: false,
        harvestable: true,
        harvestResource: "food", // Fishing
        harvestAmount: 200, // Base amount for fishing spots
        terrainDefenseBonus: 0,
        resourceBonuses: {},
        unitEffects: {
          ship: {
            movementFactor: 1.2, // Ships move 20% faster in deep water
          },
        },
        appearanceVariants: 2,
        shallowWater: false,
        elevation: -1, // Below base elevation
        passable: false,
        navalPassable: true, // Ships can move here
      },

      shallowWater: {
        name: "Shallow Water",
        description:
          "Shallow water. Slows land units but ships can move through.",
        movementFactor: 0.5, // 50% slower movement for land units
        buildable: false,
        harvestable: true,
        harvestResource: "food", // Fishing
        harvestAmount: 150, // Base amount for fishing spots
        terrainDefenseBonus: -1, // -1 defense (vulnerable in water)
        resourceBonuses: {},
        unitEffects: {
          ship: {
            movementFactor: 0.8, // Ships move 20% slower in shallow water
          },
        },
        appearanceVariants: 2,
        shallowWater: true,
        elevation: -0.5, // Just below base elevation
        passable: true,
        navalPassable: true,
      },

      desert: {
        name: "Desert",
        description:
          "Dry desert terrain. No natural resources but good for certain buildings.",
        movementFactor: 0.9, // 10% slower movement
        buildable: true,
        harvestable: false,
        terrainDefenseBonus: -1, // -1 defense (exposed in desert)
        resourceBonuses: {},
        unitEffects: {
          camel: {
            movementFactor: 1.2, // Camels move 20% faster in desert
            attack: 1, // +1 attack in desert
          },
        },
        buildingEffects: {
          solariTemple: {
            productionBonus: 0.2, // Solari temples are 20% more effective in desert
          },
        },
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 0,
        passable: true,
      },

      swamp: {
        name: "Swamp",
        description:
          "Boggy swampland. Greatly reduces movement speed and blocks building.",
        movementFactor: 0.6, // 40% slower movement
        buildable: false,
        harvestable: false,
        terrainDefenseBonus: 0,
        resourceBonuses: {},
        unitEffects: {
          heavyInfantry: {
            movementFactor: 0.4, // Heavy infantry is 60% slower in swamp
          },
          cavalry: {
            movementFactor: 0.4, // Cavalry is 60% slower in swamp
          },
        },
        appearanceVariants: 2,
        shallowWater: true,
        elevation: -0.2,
        passable: true,
      },

      road: {
        name: "Road",
        description: "Man-made road that increases movement speed.",
        movementFactor: 1.3, // 30% faster movement
        buildable: false, // Can't build on roads directly
        harvestable: false,
        terrainDefenseBonus: -1, // -1 defense (exposed on roads)
        resourceBonuses: {},
        unitEffects: {
          trader: {
            movementFactor: 1.5, // Traders move 50% faster on roads
          },
        },
        appearanceVariants: 4, // Different road directions
        shallowWater: false,
        elevation: 0,
        passable: true,
        constructable: true, // Can be built by players
        constructionCost: {
          wood: 5,
          stone: 5,
        },
      },

      goldOre: {
        name: "Gold Ore",
        description: "Gold-rich terrain that can be mined for gold resources.",
        movementFactor: 0.8, // 20% slower movement
        buildable: false,
        harvestable: true,
        harvestResource: "gold",
        harvestAmount: 150, // Base amount per gold tile
        terrainDefenseBonus: 0,
        resourceBonuses: {},
        unitEffects: {},
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 0,
        passable: true,
      },

      ironOre: {
        name: "Iron Ore",
        description: "Iron-rich terrain that can be mined for iron resources.",
        movementFactor: 0.8, // 20% slower movement
        buildable: false,
        harvestable: true,
        harvestResource: "iron",
        harvestAmount: 150, // Base amount per iron tile
        terrainDefenseBonus: 0,
        resourceBonuses: {},
        unitEffects: {},
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 0,
        passable: true,
      },

      farmland: {
        name: "Farmland",
        description:
          "Fertile land ideal for farming. Increases food production.",
        movementFactor: 1.0,
        buildable: true,
        harvestable: false,
        terrainDefenseBonus: 0,
        resourceBonuses: {
          farm: {
            resource: "food",
            bonus: 0.2, // Farms produce 20% more food on farmland
          },
        },
        unitEffects: {},
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 0,
        passable: true,
      },

      berryBush: {
        name: "Berry Bush",
        description: "Bushes with wild berries that can be gathered for food.",
        movementFactor: 0.9, // 10% slower movement
        buildable: false,
        harvestable: true,
        harvestResource: "food",
        harvestAmount: 100, // Base amount per berry bush
        terrainDefenseBonus: 0,
        resourceBonuses: {},
        unitEffects: {},
        appearanceVariants: 2,
        shallowWater: false,
        elevation: 0,
        passable: true,
        depletable: true, // Can be fully harvested
      },

      ruins: {
        name: "Ancient Ruins",
        description:
          "Ruins of an ancient civilization. May contain treasures or special resources.",
        movementFactor: 0.8, // 20% slower movement
        buildable: false,
        harvestable: false,
        terrainDefenseBonus: 1, // +1 defense
        treasureSite: true, // Can contain treasures
        resourceBonuses: {},
        unitEffects: {},
        appearanceVariants: 3,
        shallowWater: false,
        elevation: 0,
        passable: true,
        explorable: true, // Can be explored for one-time benefits
      },
    };

    // Season effects on terrain
    this.seasonEffects = {
      spring: {
        grass: { movementFactor: 1.0 },
        forest: { harvestAmount: 110 }, // 10% more wood in spring
        farmland: { resourceBonuses: { farm: { bonus: 0.3 } } }, // Better farming in spring
      },
      summer: {
        desert: { movementFactor: 0.8 }, // Desert is harder to traverse in summer
        water: { movementFactor: 1.3 }, // Ships move faster in calm summer waters
      },
      autumn: {
        forest: { harvestAmount: 120 }, // 20% more wood in autumn
        berryBush: { harvestAmount: 120 }, // 20% more food from berries in autumn
      },
      winter: {
        grass: { movementFactor: 0.9 }, // Slower movement in winter
        water: { movementFactor: 0.0, passable: true }, // Frozen water becomes passable
        shallowWater: { movementFactor: 0.8, navalPassable: false }, // Shallow water harder for ships
        farmland: { resourceBonuses: { farm: { bonus: 0 } } }, // No farming bonus in winter
      },
    };
  }

  /**
   * Initialize the terrain system
   */
  init() {
    console.log("Terrain system initialized");

    // Set the current season (default to spring)
    this.currentSeason = "spring";

    // Apply season effects
    this.applySeasonEffects(this.currentSeason);
  }

  /**
   * Get terrain type data by name
   * @param {string} terrainType - Name of the terrain type
   * @returns {Object} Terrain type data
   */
  getTerrainData(terrainType) {
    return this.terrainTypes[terrainType] || this.terrainTypes.grass;
  }

  /**
   * Get movement factor for a specific terrain type
   * @param {string} terrainType - Name of the terrain type
   * @returns {number} Movement factor (1.0 = normal)
   */
  getMovementFactor(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.movementFactor;
  }

  /**
   * Check if a terrain type is buildable
   * @param {string} terrainType - Name of the terrain type
   * @returns {boolean} True if buildings can be placed on this terrain
   */
  isBuildable(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.buildable;
  }

  /**
   * Check if a terrain type is passable by land units
   * @param {string} terrainType - Name of the terrain type
   * @returns {boolean} True if land units can move through this terrain
   */
  isPassable(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.passable;
  }

  /**
   * Check if a terrain type is passable by naval units
   * @param {string} terrainType - Name of the terrain type
   * @returns {boolean} True if naval units can move through this terrain
   */
  isNavalPassable(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.navalPassable || false;
  }

  /**
   * Get harvest resource info for a terrain type
   * @param {string} terrainType - Name of the terrain type
   * @returns {Object|null} Resource info or null if not harvestable
   */
  getHarvestInfo(terrainType) {
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.harvestable) {
      return null;
    }

    return {
      resource: terrain.harvestResource,
      amount: terrain.harvestAmount,
    };
  }

  /**
   * Get defense bonus provided by a terrain type
   * @param {string} terrainType - Name of the terrain type
   * @returns {number} Defense bonus
   */
  getDefenseBonus(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.terrainDefenseBonus || 0;
  }

  /**
   * Get line of sight bonus provided by a terrain type
   * @param {string} terrainType - Name of the terrain type
   * @returns {number} Line of sight bonus
   */
  getLineOfSightBonus(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.lineSightBonus || 0;
  }

  /**
   * Check if a terrain type blocks line of sight
   * @param {string} terrainType - Name of the terrain type
   * @returns {boolean} True if terrain blocks line of sight
   */
  blocksLineOfSight(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.lineSightBlocking || false;
  }

  /**
   * Get unit effects for a specific terrain and unit type
   * @param {string} terrainType - Name of the terrain type
   * @param {string} unitType - Type of unit
   * @returns {Object} Unit effects
   */
  getUnitEffects(terrainType, unitType) {
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.unitEffects || !terrain.unitEffects[unitType]) {
      return {};
    }

    return terrain.unitEffects[unitType];
  }

  /**
   * Get resource bonuses for a specific terrain and building type
   * @param {string} terrainType - Name of the terrain type
   * @param {string} buildingType - Type of building
   * @returns {Object|null} Resource bonus info or null if no bonus
   */
  getResourceBonus(terrainType, buildingType) {
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.resourceBonuses || !terrain.resourceBonuses[buildingType]) {
      return null;
    }

    return terrain.resourceBonuses[buildingType];
  }

  /**
   * Get building effects for a specific terrain and building type
   * @param {string} terrainType - Name of the terrain type
   * @param {string} buildingType - Type of building
   * @returns {Object} Building effects
   */
  getBuildingEffects(terrainType, buildingType) {
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.buildingEffects || !terrain.buildingEffects[buildingType]) {
      return {};
    }

    return terrain.buildingEffects[buildingType];
  }

  /**
   * Calculate combined movement factor for a unit on specific terrain
   * @param {Object} unit - Unit entity
   * @param {string} terrainType - Name of the terrain type
   * @returns {number} Combined movement factor
   */
  calculateMovementFactor(unit, terrainType) {
    // Get base terrain movement factor
    const terrain = this.getTerrainData(terrainType);
    let factor = terrain.movementFactor;

    // If terrain is impassable for land units, return 0
    if (factor === 0 && !unit.isNaval && !terrain.navalPassable) {
      return 0;
    }

    // If terrain is only naval passable and unit is land, return 0
    if (!terrain.passable && !unit.isNaval && terrain.navalPassable) {
      return 0;
    }

    // Apply unit-specific terrain modifiers
    const unitEffects = this.getUnitEffects(terrainType, unit.unitType);
    if (unitEffects.movementFactor) {
      factor = unitEffects.movementFactor;
    }

    // Apply weather effects if any
    if (this.game.weatherSystem) {
      const weatherFactor =
        this.game.weatherSystem.getMovementFactor(terrainType);
      factor *= weatherFactor;
    }

    // Apply technology bonuses
    if (this.game.techManager) {
      const techBonus = this.game.techManager.getTerrainMovementBonus(
        unit.owner,
        terrainType,
        unit.unitType
      );

      if (techBonus) {
        factor *= 1 + techBonus;
      }
    }

    // Ensure minimum factor
    return Math.max(0.1, factor);
  }

  /**
   * Get terrain type at specific map coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @returns {string} Terrain type name
   */
  getTerrainAt(x, y) {
    return this.map.getTerrainType(x, y);
  }

  /**
   * Change terrain type at specific map coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {string} newTerrainType - New terrain type name
   * @returns {boolean} True if terrain was changed successfully
   */
  changeTerrainAt(x, y, newTerrainType) {
    // Check if new terrain type is valid
    if (!this.terrainTypes[newTerrainType]) {
      return false;
    }

    // Check if the coordinates are valid
    if (!this.map.isInBounds(x, y)) {
      return false;
    }

    // Change terrain type
    this.map.setTerrainType(x, y, newTerrainType);

    // Update pathfinding if available
    if (this.game.pathfinding) {
      this.game.pathfinding.clearCache();
    }

    return true;
  }

  /**
   * Clear a natural resource (like forest) to another terrain type
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @returns {Object|null} Cost information or null if not clearable
   */
  getClearTerrainCost(x, y) {
    const terrainType = this.getTerrainAt(x, y);
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.removalCost || !terrain.clearTerrainType) {
      return null;
    }

    return {
      cost: terrain.removalCost,
      newTerrainType: terrain.clearTerrainType,
    };
  }

  /**
   * Clear terrain at specific coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} playerId - ID of the player clearing the terrain
   * @returns {boolean} True if clearing was successful
   */
  clearTerrain(x, y, playerId) {
    const clearInfo = this.getClearTerrainCost(x, y);

    if (!clearInfo) {
      return false;
    }

    // Check if player can afford the cost
    if (this.game.resourceManager) {
      for (const resource in clearInfo.cost) {
        if (resource !== "time") {
          const amount = clearInfo.cost[resource];

          if (
            this.game.resourceManager.getResource(playerId, resource) < amount
          ) {
            return false;
          }
        }
      }

      // Deduct resources
      for (const resource in clearInfo.cost) {
        if (resource !== "time") {
          const amount = clearInfo.cost[resource];
          this.game.resourceManager.deductResource(playerId, resource, amount);
        }
      }
    }

    // Change terrain type
    this.changeTerrainAt(x, y, clearInfo.newTerrainType);

    return true;
  }

  /**
   * Build a road on specific coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} playerId - ID of the player building the road
   * @returns {boolean} True if road building was successful
   */
  buildRoad(x, y, playerId) {
    const terrainType = this.getTerrainAt(x, y);
    const terrain = this.getTerrainData(terrainType);

    // Check if terrain is passable and not already a road
    if (!terrain.passable || terrainType === "road") {
      return false;
    }

    // Get road terrain data
    const roadTerrain = this.terrainTypes.road;

    // Check if player can afford the cost
    if (this.game.resourceManager) {
      for (const resource in roadTerrain.constructionCost) {
        const amount = roadTerrain.constructionCost[resource];

        if (
          this.game.resourceManager.getResource(playerId, resource) < amount
        ) {
          return false;
        }
      }

      // Deduct resources
      for (const resource in roadTerrain.constructionCost) {
        const amount = roadTerrain.constructionCost[resource];
        this.game.resourceManager.deductResource(playerId, resource, amount);
      }
    }

    // Change terrain to road
    this.changeTerrainAt(x, y, "road");

    // Update adjacent road appearances for connections
    this.updateRoadConnections(x, y);

    return true;
  }

  /**
   * Update road connections for a new road segment
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   */
  updateRoadConnections(x, y) {
    // Check each adjacent cell for roads
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 }, // East
      { x: 0, y: 1 }, // South
      { x: -1, y: 0 }, // West
    ];

    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;

      // Skip if out of bounds
      if (!this.map.isInBounds(nx, ny)) {
        continue;
      }

      // If there's a road, update its appearance
      if (this.getTerrainAt(nx, ny) === "road") {
        this.updateRoadAppearance(nx, ny);
      }
    }

    // Update the new road's appearance
    this.updateRoadAppearance(x, y);
  }

  /**
   * Update road appearance based on connections
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   */
  updateRoadAppearance(x, y) {
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 }, // East
      { x: 0, y: 1 }, // South
      { x: -1, y: 0 }, // West
    ];

    // Check which directions have road connections
    const connections = [];

    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      const nx = x + dir.x;
      const ny = y + dir.y;

      // Skip if out of bounds
      if (!this.map.isInBounds(nx, ny)) {
        continue;
      }

      // If there's a road, add to connections
      if (this.getTerrainAt(nx, ny) === "road") {
        connections.push(i);
      }
    }

    // Determine road appearance based on connections
    let appearanceIndex = 0;

    if (connections.length === 1) {
      // Dead end
      appearanceIndex = connections[0];
    } else if (connections.length === 2) {
      // Straight or corner
      if (
        (connections.includes(0) && connections.includes(2)) ||
        (connections.includes(1) && connections.includes(3))
      ) {
        // Straight road
        appearanceIndex = connections.includes(0) ? 0 : 1;
      } else {
        // Corner road
        if (connections.includes(0) && connections.includes(1)) {
          appearanceIndex = 0;
        } else if (connections.includes(1) && connections.includes(2)) {
          appearanceIndex = 1;
        } else if (connections.includes(2) && connections.includes(3)) {
          appearanceIndex = 2;
        } else {
          appearanceIndex = 3;
        }
      }
    } else if (connections.length === 3) {
      // T-junction
      appearanceIndex = 0;
    } else if (connections.length === 4) {
      // Crossroads
      appearanceIndex = 1;
    }

    // Update appearance in the map
    this.map.setTerrainAppearance(x, y, appearanceIndex);
  }

  /**
   * Change the current season
   * @param {string} season - New season name ('spring', 'summer', 'autumn', 'winter')
   */
  changeSeason(season) {
    if (!this.seasonEffects[season]) {
      console.error(`Invalid season: ${season}`);
      return;
    }

    // Store old season for reference
    const oldSeason = this.currentSeason;

    // Set new season
    this.currentSeason = season;

    // Apply season effects
    this.applySeasonEffects(season);

    console.log(`Season changed from ${oldSeason} to ${season}`);

    // Notify about season change
    if (this.game.alertSystem) {
      this.game.alertSystem.addAlert({
        type: "season_change",
        message: `The season has changed to ${season}`,
        priority: "medium",
      });
    }

    // Play season change sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound(`season_${season}`);
    }

    // Clear pathfinding cache as movement factors have changed
    if (this.game.pathfinding) {
      this.game.pathfinding.clearCache();
    }
  }

  /**
   * Apply season effects to terrain types
   * @param {string} season - Season name
   */
  applySeasonEffects(season) {
    const effects = this.seasonEffects[season];

    if (!effects) {
      return;
    }

    // First, reset all terrain types to their default values
    for (const terrainType in this.terrainTypes) {
      // Store original values if not already stored
      if (!this.terrainTypes[terrainType].original) {
        this.terrainTypes[terrainType].original = {
          movementFactor: this.terrainTypes[terrainType].movementFactor,
          harvestAmount: this.terrainTypes[terrainType].harvestAmount,
          passable: this.terrainTypes[terrainType].passable,
          navalPassable: this.terrainTypes[terrainType].navalPassable,
          resourceBonuses: JSON.parse(
            JSON.stringify(this.terrainTypes[terrainType].resourceBonuses || {})
          ),
        };
      } else {
        // Restore original values
        this.terrainTypes[terrainType].movementFactor =
          this.terrainTypes[terrainType].original.movementFactor;
        this.terrainTypes[terrainType].harvestAmount =
          this.terrainTypes[terrainType].original.harvestAmount;
        this.terrainTypes[terrainType].passable =
          this.terrainTypes[terrainType].original.passable;
        this.terrainTypes[terrainType].navalPassable =
          this.terrainTypes[terrainType].original.navalPassable;
        this.terrainTypes[terrainType].resourceBonuses = JSON.parse(
          JSON.stringify(
            this.terrainTypes[terrainType].original.resourceBonuses || {}
          )
        );
      }
    }

    // Apply season-specific effects
    for (const terrainType in effects) {
      const terrainEffects = effects[terrainType];

      // Skip if terrain type doesn't exist
      if (!this.terrainTypes[terrainType]) {
        continue;
      }

      // Apply each effect
      for (const property in terrainEffects) {
        if (property === "resourceBonuses") {
          // Handle resource bonuses separately (they're nested)
          for (const buildingType in terrainEffects.resourceBonuses) {
            if (!this.terrainTypes[terrainType].resourceBonuses) {
              this.terrainTypes[terrainType].resourceBonuses = {};
            }

            if (!this.terrainTypes[terrainType].resourceBonuses[buildingType]) {
              this.terrainTypes[terrainType].resourceBonuses[buildingType] = {};
            }

            for (const bonusProperty in terrainEffects.resourceBonuses[
              buildingType
            ]) {
              this.terrainTypes[terrainType].resourceBonuses[buildingType][
                bonusProperty
              ] = terrainEffects.resourceBonuses[buildingType][bonusProperty];
            }
          }
        } else {
          // Apply simple property
          this.terrainTypes[terrainType][property] = terrainEffects[property];
        }
      }
    }
  }

  /**
   * Get the current season
   * @returns {string} Current season name
   */
  getCurrentSeason() {
    return this.currentSeason;
  }

  /**
   * Explore a special terrain feature (like ruins)
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} playerId - ID of the player exploring
   * @returns {Object|null} Exploration result or null if not explorable
   */
  exploreTerrain(x, y, playerId) {
    const terrainType = this.getTerrainAt(x, y);
    const terrain = this.getTerrainData(terrainType);

    if (!terrain.explorable) {
      return null;
    }

    // Mark as explored to prevent multiple explorations
    this.map.setExplored(x, y, playerId);

    // Determine random reward
    const rewardType = this.determineExplorationReward(terrainType);

    // Grant the reward
    this.grantExplorationReward(playerId, rewardType);

    // Return information about the reward
    return {
      type: rewardType.type,
      message: rewardType.message,
      amount: rewardType.amount,
    };
  }

  /**
   * Determine random reward for exploration
   * @param {string} terrainType - Terrain being explored
   * @returns {Object} Reward type information
   */
  determineExplorationReward(terrainType) {
    // Different terrain types can have different reward distributions
    let rewards = [
      {
        type: "resource",
        resource: "gold",
        amount: 100,
        weight: 30,
        message: "Found gold!",
      },
      {
        type: "resource",
        resource: "wood",
        amount: 100,
        weight: 20,
        message: "Found wood supplies!",
      },
      {
        type: "resource",
        resource: "food",
        amount: 100,
        weight: 20,
        message: "Found food supplies!",
      },
      {
        type: "resource",
        resource: "stone",
        amount: 50,
        weight: 15,
        message: "Found stone!",
      },
      {
        type: "resource",
        resource: "iron",
        amount: 40,
        weight: 10,
        message: "Found iron ore!",
      },
      {
        type: "technology",
        amount: 1,
        weight: 5,
        message: "Discovered ancient knowledge!",
      },
    ];

    // Adjust rewards based on terrain type
    if (terrainType === "ruins") {
      // Ruins have better rewards
      rewards = rewards.map((r) => {
        if (r.type === "resource") {
          r.amount *= 1.5;
        }
        return r;
      });

      // Add special rewards for ruins
      rewards.push(
        {
          type: "unit",
          unitType: "explorer",
          amount: 1,
          weight: 3,
          message: "Found survivors!",
        },
        {
          type: "artifact",
          amount: 1,
          weight: 2,
          message: "Found an ancient artifact!",
        }
      );
    }

    // Calculate total weight
    let totalWeight = 0;
    for (const reward of rewards) {
      totalWeight += reward.weight;
    }

    // Random selection based on weights
    let random = Math.random() * totalWeight;
    for (const reward of rewards) {
      random -= reward.weight;
      if (random <= 0) {
        return reward;
      }
    }

    // Fallback
    return rewards[0];
  }

  /**
   * Grant exploration reward to a player
   * @param {number} playerId - ID of the player
   * @param {Object} reward - Reward information
   */
  grantExplorationReward(playerId, reward) {
    switch (reward.type) {
      case "resource":
        // Add resources
        if (this.game.resourceManager) {
          this.game.resourceManager.addResource(
            playerId,
            reward.resource,
            reward.amount
          );
        }
        break;

      case "technology":
        // Grant random technology
        if (this.game.techManager) {
          this.game.techManager.grantRandomTechnology(playerId);
        }
        break;

      case "unit":
        // Spawn a unit
        if (this.game.entityManager) {
          // Find a nearby passable position
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            for (let offsetY = -1; offsetY <= 1; offsetY++) {
              const nx = x + offsetX;
              const ny = y + offsetY;

              // Skip if out of bounds
              if (!this.map.isInBounds(nx, ny)) {
                continue;
              }

              // Check if position is passable
              if (this.isPassable(this.getTerrainAt(nx, ny))) {
                // Spawn unit
                this.game.entityManager.createUnit(
                  reward.unitType,
                  playerId,
                  nx * this.map.gridCellSize,
                  ny * this.map.gridCellSize
                );
                return;
              }
            }
          }
        }
        break;

      case "artifact":
        // Grant special item or effect
        if (this.game.itemManager) {
          this.game.itemManager.grantRandomArtifact(playerId);
        }
        break;
    }
  }

  /**
   * Get elevation level at specific coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @returns {number} Elevation level
   */
  getElevation(x, y) {
    const terrainType = this.getTerrainAt(x, y);
    const terrain = this.getTerrainData(terrainType);

    return terrain.elevation || 0;
  }

  /**
   * Get a list of all terrain types
   * @returns {Array} Array of terrain type names
   */
  getAllTerrainTypes() {
    return Object.keys(this.terrainTypes);
  }

  /**
   * Get terrain appearance variant for decoration
   * @param {string} terrainType - Name of the terrain type
   * @returns {number} Number of appearance variants
   */
  getAppearanceVariants(terrainType) {
    const terrain = this.getTerrainData(terrainType);
    return terrain.appearanceVariants || 1;
  }
}
