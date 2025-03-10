/**
 * @fileoverview Building system for Empires of Eternity
 * Handles building placement, construction, upgrades, and special abilities.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

/**
 * BuildingSystem manages all aspects of building creation and functionality
 */
export class BuildingSystem {
  /**
   * Create a new building system
   * @param {Object} game - Reference to the main game object
   * @param {Object} entityManager - Reference to the entity manager
   */
  constructor(game, entityManager) {
    this.game = game;
    this.entityManager = entityManager;

    // Building types and definitions are loaded from config
    this.buildingTypes = config.BUILDINGS || {};

    // Currently placed but not yet constructed buildings
    this.pendingBuildings = [];

    // Building upgrade paths
    this.upgradeOptions = {};

    // Building zones for territory control
    this.buildingZones = {};

    // Track building production
    this.productionQueues = {};

    // Currently visible ghost building (for placement preview)
    this.ghostBuilding = null;

    // Building placement restrictions
    this.placementRestrictions = {
      minDistanceFromSameType: 4, // Grid cells
      minDistanceFromResources: 1, // Grid cells
      maxDistanceFromOwnBuildings: 15, // Grid cells, except first building
    };

    // Building foundations by player
    this.buildingFoundations = {};

    // Building event handlers
    this.eventHandlers = {};

    // Building ability cooldowns
    this.abilityCooldowns = {};
  }

  /**
   * Initialize the building system
   */
  init() {
    console.log("Building system initialized");

    // Initialize production queues for each player
    for (let i = 0; i < config.MAX_PLAYERS; i++) {
      this.productionQueues[i] = {};
      this.buildingFoundations[i] = [];
    }

    // Set up upgrade paths
    this.initUpgradePaths();

    // Register event listeners
    this.game.on("entityCreated", this.handleEntityCreated.bind(this));
    this.game.on("entityDestroyed", this.handleEntityDestroyed.bind(this));
  }

  /**
   * Update the building system
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Update building construction progress
    this.updateConstructionProgress(deltaTime);

    // Update building production queues
    this.updateProductionQueues(deltaTime);

    // Update building abilities and cooldowns
    this.updateAbilityCooldowns(deltaTime);

    // Update building zones
    this.updateBuildingZones();
  }

  /**
   * Initialize building upgrade paths
   */
  initUpgradePaths() {
    // Set up upgrade options for each building type
    for (const buildingType in this.buildingTypes) {
      const building = this.buildingTypes[buildingType];

      if (building.upgradeTo) {
        if (!Array.isArray(building.upgradeTo)) {
          building.upgradeTo = [building.upgradeTo];
        }

        for (const upgradePath of building.upgradeTo) {
          // Ensure upgrade exists
          if (this.buildingTypes[upgradePath]) {
            if (!this.upgradeOptions[buildingType]) {
              this.upgradeOptions[buildingType] = [];
            }

            this.upgradeOptions[buildingType].push(upgradePath);
          }
        }
      }
    }
  }

  /**
   * Start placing a building (create ghost building for preview)
   * @param {string} buildingType - Type of building to place
   * @param {number} playerId - ID of the player
   * @returns {Object|null} Ghost building or null if invalid type
   */
  startPlacingBuilding(buildingType, playerId) {
    // Check if building type exists
    if (!this.buildingTypes[buildingType]) {
      console.error(`Invalid building type: ${buildingType}`);
      return null;
    }

    const buildingData = this.buildingTypes[buildingType];

    // Create ghost building
    this.ghostBuilding = {
      type: "building",
      buildingType: buildingType,
      width: buildingData.size?.width || 2,
      height: buildingData.size?.height || 2,
      owner: playerId,
      x: 0,
      y: 0,
      isGhost: true,
      canPlace: false,
    };

    return this.ghostBuilding;
  }

  /**
   * Update ghost building position and check if placement is valid
   * @param {number} x - X position in world coordinates
   * @param {number} y - Y position in world coordinates
   * @returns {boolean} Whether placement is valid at this position
   */
  updateGhostBuilding(x, y) {
    if (!this.ghostBuilding) {
      return false;
    }

    // Update position
    this.ghostBuilding.x = x;
    this.ghostBuilding.y = y;

    // Check if placement is valid
    this.ghostBuilding.canPlace = this.canPlaceBuilding(
      x,
      y,
      this.ghostBuilding.width,
      this.ghostBuilding.height,
      this.ghostBuilding.owner,
      this.ghostBuilding.buildingType
    );

    return this.ghostBuilding.canPlace;
  }

  /**
   * Cancel building placement
   */
  cancelPlacement() {
    this.ghostBuilding = null;
  }

  /**
   * Check if a building can be placed at a specific position
   * @param {number} x - X position in world coordinates
   * @param {number} y - Y position in world coordinates
   * @param {number} width - Building width in grid cells
   * @param {number} height - Building height in grid cells
   * @param {number} playerId - ID of the player
   * @param {string} buildingType - Type of building
   * @returns {boolean} Whether placement is valid
   */
  canPlaceBuilding(x, y, width, height, playerId, buildingType) {
    // Convert to grid coordinates
    const gridX = Math.floor(x / this.game.map.gridCellSize);
    const gridY = Math.floor(y / this.game.map.gridCellSize);

    // Check map bounds
    if (
      gridX < 0 ||
      gridY < 0 ||
      gridX + width > this.game.map.width ||
      gridY + height > this.game.map.height
    ) {
      return false;
    }

    // Check terrain passability
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const terrainX = gridX + dx;
        const terrainY = gridY + dy;

        // Check if terrain is buildable
        if (!this.game.map.isBuildable(terrainX, terrainY)) {
          return false;
        }
      }
    }

    // Check for collisions with other entities
    const collisionArea = {
      x: gridX * this.game.map.gridCellSize,
      y: gridY * this.game.map.gridCellSize,
      width: width * this.game.map.gridCellSize,
      height: height * this.game.map.gridCellSize,
    };

    const collidingEntities = this.entityManager.getEntitiesInRect(
      collisionArea.x,
      collisionArea.y,
      collisionArea.width,
      collisionArea.height
    );

    if (collidingEntities.length > 0) {
      return false;
    }

    // Check building-specific placement restrictions
    if (
      !this.checkBuildingRestrictions(
        gridX,
        gridY,
        width,
        height,
        playerId,
        buildingType
      )
    ) {
      return false;
    }

    // Check if in player's territory (except first buildings)
    if (
      !this.isFirstBuilding(playerId, buildingType) &&
      !this.isInPlayerTerritory(gridX, gridY, playerId)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check building-specific placement restrictions
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {number} width - Building width in grid cells
   * @param {number} height - Building height in grid cells
   * @param {number} playerId - ID of the player
   * @param {string} buildingType - Type of building
   * @returns {boolean} Whether placement meets restrictions
   */
  checkBuildingRestrictions(
    gridX,
    gridY,
    width,
    height,
    playerId,
    buildingType
  ) {
    const buildingData = this.buildingTypes[buildingType];

    // Check minimum distance from same building type
    if (this.placementRestrictions.minDistanceFromSameType > 0) {
      const sameTypeBuildings = this.entityManager.getEntitiesByType(
        playerId,
        "building",
        buildingType
      );

      for (const building of sameTypeBuildings) {
        const buildingGridX = Math.floor(
          building.x / this.game.map.gridCellSize
        );
        const buildingGridY = Math.floor(
          building.y / this.game.map.gridCellSize
        );

        const distance = Math.max(
          Math.abs(gridX - buildingGridX),
          Math.abs(gridY - buildingGridY)
        );

        if (distance < this.placementRestrictions.minDistanceFromSameType) {
          return false;
        }
      }
    }

    // Check minimum distance from resources
    if (this.placementRestrictions.minDistanceFromResources > 0) {
      const resources = this.entityManager.getEntitiesByType(null, "resource");

      for (const resource of resources) {
        const resourceGridX = Math.floor(
          resource.x / this.game.map.gridCellSize
        );
        const resourceGridY = Math.floor(
          resource.y / this.game.map.gridCellSize
        );

        const distance = Math.max(
          Math.abs(gridX - resourceGridX),
          Math.abs(gridY - resourceGridY)
        );

        if (distance < this.placementRestrictions.minDistanceFromResources) {
          return false;
        }
      }
    }

    // Check maximum distance from own buildings (except first building)
    if (
      !this.isFirstBuilding(playerId, buildingType) &&
      this.placementRestrictions.maxDistanceFromOwnBuildings > 0
    ) {
      const ownBuildings = this.entityManager.getEntitiesByType(
        playerId,
        "building"
      );

      if (ownBuildings.length > 0) {
        let minDistance = Infinity;

        for (const building of ownBuildings) {
          const buildingGridX = Math.floor(
            building.x / this.game.map.gridCellSize
          );
          const buildingGridY = Math.floor(
            building.y / this.game.map.gridCellSize
          );

          const distance = Math.max(
            Math.abs(gridX - buildingGridX),
            Math.abs(gridY - buildingGridY)
          );

          minDistance = Math.min(minDistance, distance);
        }

        if (
          minDistance > this.placementRestrictions.maxDistanceFromOwnBuildings
        ) {
          return false;
        }
      }
    }

    // Check if building has special placement requirements
    if (buildingData.placementRequirements) {
      // Near water requirement
      if (buildingData.placementRequirements.nearWater) {
        const hasWaterNearby = this.isWaterNearby(gridX, gridY, 2);
        if (!hasWaterNearby) {
          return false;
        }
      }

      // Near resource requirement
      if (buildingData.placementRequirements.nearResource) {
        const resourceType = buildingData.placementRequirements.nearResource;
        const hasResourceNearby = this.isResourceNearby(
          gridX,
          gridY,
          resourceType,
          3
        );
        if (!hasResourceNearby) {
          return false;
        }
      }

      // Requires specific terrain
      if (buildingData.placementRequirements.terrain) {
        const requiredTerrain = buildingData.placementRequirements.terrain;
        const hasCorrectTerrain = this.hasTerrainType(
          gridX,
          gridY,
          width,
          height,
          requiredTerrain
        );
        if (!hasCorrectTerrain) {
          return false;
        }
      }

      // Check building requirements
      if (buildingData.placementRequirements.buildings) {
        for (const requiredBuilding of buildingData.placementRequirements
          .buildings) {
          const hasRequiredBuilding = this.entityManager.hasEntityOfType(
            playerId,
            "building",
            requiredBuilding
          );

          if (!hasRequiredBuilding) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if this is the player's first building of any type
   * @param {number} playerId - ID of the player
   * @param {string} buildingType - Type of building
   * @returns {boolean} Whether this is the first building
   */
  isFirstBuilding(playerId, buildingType) {
    // Town Center is always allowed as first building
    if (buildingType === "towncenter") {
      const townCenters = this.entityManager.getEntitiesByType(
        playerId,
        "building",
        "towncenter"
      );

      return townCenters.length === 0;
    }

    // Check if player has any buildings
    const buildings = this.entityManager.getEntitiesByType(
      playerId,
      "building"
    );

    return buildings.length === 0;
  }

  /**
   * Check if a position is in a player's territory
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {number} playerId - ID of the player
   * @returns {boolean} Whether the position is in the player's territory
   */
  isInPlayerTerritory(gridX, gridY, playerId) {
    // If we have an influence map, use that to check territory
    if (this.game.influenceMap) {
      return (
        this.game.influenceMap.getControllingPlayer(gridX, gridY) === playerId
      );
    }

    // Otherwise, check proximity to existing buildings
    const nearbyBuildings = this.entityManager.getEntitiesInRadius(
      gridX * this.game.map.gridCellSize,
      gridY * this.game.map.gridCellSize,
      this.placementRestrictions.maxDistanceFromOwnBuildings *
        this.game.map.gridCellSize,
      (entity) => entity.type === "building" && entity.owner === playerId
    );

    return nearbyBuildings.length > 0;
  }

  /**
   * Check if there's water nearby
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {number} radius - Search radius in grid cells
   * @returns {boolean} Whether water is nearby
   */
  isWaterNearby(gridX, gridY, radius) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = gridX + dx;
        const y = gridY + dy;

        // Skip if out of bounds
        if (
          x < 0 ||
          y < 0 ||
          x >= this.game.map.width ||
          y >= this.game.map.height
        ) {
          continue;
        }

        const terrainType = this.game.map.getTerrainType(x, y);
        if (terrainType === "water" || terrainType === "shallowWater") {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a specific resource type is nearby
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {string} resourceType - Type of resource
   * @param {number} radius - Search radius in grid cells
   * @returns {boolean} Whether the resource is nearby
   */
  isResourceNearby(gridX, gridY, resourceType, radius) {
    const resources = this.entityManager.getEntitiesInRadius(
      gridX * this.game.map.gridCellSize,
      gridY * this.game.map.gridCellSize,
      radius * this.game.map.gridCellSize,
      (entity) =>
        entity.type === "resource" && entity.resourceType === resourceType
    );

    return resources.length > 0;
  }

  /**
   * Check if an area contains a specific terrain type
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {number} width - Area width in grid cells
   * @param {number} height - Area height in grid cells
   * @param {string|Array} terrainTypes - Required terrain type(s)
   * @returns {boolean} Whether the area has the required terrain
   */
  hasTerrainType(gridX, gridY, width, height, terrainTypes) {
    // Convert single terrain type to array
    if (!Array.isArray(terrainTypes)) {
      terrainTypes = [terrainTypes];
    }

    // Check each cell in the area
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const x = gridX + dx;
        const y = gridY + dy;

        // Skip if out of bounds
        if (
          x < 0 ||
          y < 0 ||
          x >= this.game.map.width ||
          y >= this.game.map.height
        ) {
          continue;
        }

        const terrainType = this.game.map.getTerrainType(x, y);
        if (!terrainTypes.includes(terrainType)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Place a building at the current ghost building position
   * @returns {Object|null} The placed building entity or null if invalid
   */
  placeBuilding() {
    if (!this.ghostBuilding || !this.ghostBuilding.canPlace) {
      return null;
    }

    const { x, y, buildingType, owner } = this.ghostBuilding;

    // Get building data
    const buildingData = this.buildingTypes[buildingType];

    // Calculate resource costs (applying civilization modifiers)
    const baseCost = buildingData.cost;
    const finalCost = {};

    if (this.game.civilizations && this.game.civilizations[owner]) {
      // Apply civilization-specific costs
      const civCost =
        this.game.civilizations[owner].getBuildingCost(buildingType);

      if (civCost) {
        Object.assign(finalCost, civCost);
      } else {
        Object.assign(finalCost, baseCost);
      }
    } else {
      // Use default costs
      Object.assign(finalCost, baseCost);
    }

    // Check if player has enough resources
    if (this.game.resourceManager) {
      for (const resource in finalCost) {
        const amount = finalCost[resource];

        if (this.game.resourceManager.getResource(owner, resource) < amount) {
          // Not enough resources
          return null;
        }
      }

      // Deduct resources
      for (const resource in finalCost) {
        const amount = finalCost[resource];
        this.game.resourceManager.deductResource(owner, resource, amount);
      }
    }

    // Create the building entity
    const building = this.entityManager.createBuilding(
      buildingType,
      owner,
      x,
      y
    );

    if (!building) {
      // Building creation failed
      // Refund resources
      if (this.game.resourceManager) {
        for (const resource in finalCost) {
          const amount = finalCost[resource];
          this.game.resourceManager.addResource(owner, resource, amount);
        }
      }

      return null;
    }

    // Set initial state
    building.constructionProgress = 0;
    building.isConstructed = false;
    building.buildTime = buildingData.buildTime * 1000; // Convert to milliseconds
    building.constructionRemaining = building.buildTime;

    // Apply civilization bonuses to build time
    if (this.game.civilizations && this.game.civilizations[owner]) {
      const buildTimeModifier = this.game.civilizations[owner].getBuildingBonus(
        buildingType,
        "buildTime"
      );

      building.constructionRemaining *= buildTimeModifier;
    }

    // Add to pending buildings
    this.pendingBuildings.push(building);

    // Add to player's building foundations
    this.buildingFoundations[owner].push(building.id);

    // Create foundation effect
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "building_foundation",
        x: building.x,
        y: building.y,
        width: building.width * this.game.map.gridCellSize,
        height: building.height * this.game.map.gridCellSize,
        duration: building.constructionRemaining,
      });
    }

    // Play construction sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("building_foundation", {
        x: building.x,
        y: building.y,
      });
    }

    // Add alert for player
    if (this.game.alertSystem) {
      this.game.alertSystem.addAlert({
        type: "building_started",
        message: `Started construction of ${buildingData.name}`,
        x: building.x,
        y: building.y,
        priority: "low",
      });
    }

    // Reset ghost building
    this.ghostBuilding = null;

    return building;
  }

  /**
   * Send villagers to help construct a building
   * @param {Array} villagers - Array of villager entities
   * @param {Object} building - Building entity to construct
   * @returns {boolean} Whether the assignment was successful
   */
  assignVillagersToConstruction(villagers, building) {
    if (!building || building.isConstructed || villagers.length === 0) {
      return false;
    }

    // Set each villager to build
    for (const villager of villagers) {
      this.entityManager.commandBuild(villager, building);
    }

    return true;
  }

  /**
   * Update construction progress for pending buildings
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateConstructionProgress(deltaTime) {
    for (let i = this.pendingBuildings.length - 1; i >= 0; i--) {
      const building = this.pendingBuildings[i];

      // Check if building is valid
      if (!building || !building.isAlive) {
        this.pendingBuildings.splice(i, 1);
        continue;
      }

      // Calculate progress
      let progressIncrease = 0;

      // If villagers are working on it, progress is faster
      const builders = this.entityManager.getBuilders(building.id);
      const buildersCount = builders.length;

      if (buildersCount > 0) {
        // Each villager contributes to building speed
        // First villager gives 100% speed, each additional one adds diminishing returns
        const builderEfficiency = 1 + Math.log(buildersCount + 1) / Math.log(4);
        progressIncrease = deltaTime * builderEfficiency;
      } else {
        // Slow auto-progress even without builders
        progressIncrease = deltaTime * 0.1; // 10% of normal speed
      }

      // Update remaining time
      building.constructionRemaining -= progressIncrease;

      // Ensure it doesn't go below zero
      building.constructionRemaining = Math.max(
        0,
        building.constructionRemaining
      );

      // Calculate progress percentage
      building.constructionProgress =
        ((building.buildTime - building.constructionRemaining) /
          building.buildTime) *
        100;

      // Check if construction is complete
      if (building.constructionProgress >= 100) {
        building.constructionProgress = 100;
        building.isConstructed = true;

        // Remove from pending buildings
        this.pendingBuildings.splice(i, 1);

        // Remove from foundations
        const foundationIndex = this.buildingFoundations[
          building.owner
        ].indexOf(building.id);
        if (foundationIndex !== -1) {
          this.buildingFoundations[building.owner].splice(foundationIndex, 1);
        }

        // Initialize building features
        this.initializeBuilding(building);

        // Trigger construction complete event
        this.game.emit("buildingConstructionComplete", {
          building: building,
          playerId: building.owner,
        });

        // Notify builders to stop building
        for (const builder of builders) {
          builder.targetBuilding = null;
          builder.state = "idle";
        }

        // Play completion sound
        if (this.game.audioSystem) {
          this.game.audioSystem.playSound("building_complete", {
            x: building.x,
            y: building.y,
          });
        }

        // Add alert for player
        if (this.game.alertSystem) {
          this.game.alertSystem.addAlert({
            type: "building_complete",
            message: `${
              this.buildingTypes[building.buildingType].name
            } construction complete`,
            x: building.x,
            y: building.y,
            priority: "medium",
          });
        }
      }
    }
  }

  /**
   * Initialize a newly constructed building
   * @param {Object} building - Building entity
   */
  initializeBuilding(building) {
    const buildingData = this.buildingTypes[building.buildingType];

    // Set up production queue if the building can produce units
    if (buildingData.production) {
      if (!this.productionQueues[building.owner][building.id]) {
        this.productionQueues[building.owner][building.id] = {
          queue: [],
          currentProduction: null,
          productionProgress: 0,
          productionTime: 0,
        };
      }
    }

    // Initialize building zone
    if (buildingData.influenceRadius) {
      const radius = buildingData.influenceRadius;

      this.buildingZones[building.id] = {
        x: building.x,
        y: building.y,
        radius: radius * this.game.map.gridCellSize,
        owner: building.owner,
        type: building.buildingType,
        effects: buildingData.aura || {},
      };
    }

    // Initialize building abilities
    if (buildingData.abilities) {
      building.abilities = buildingData.abilities.map((ability) => ({
        ...ability,
        cooldown: 0,
      }));
    }

    // Initialize dynamic properties
    building.maxHp = buildingData.hp;
    building.currentHp = building.maxHp;
    building.armor = buildingData.armor || 0;
    building.attack = buildingData.attack || 0;
    building.attackRange = buildingData.attackRange || 0;
    building.lineOfSight = buildingData.lineOfSight || 5;

    // Apply civilization bonuses
    if (this.game.civilizations && this.game.civilizations[building.owner]) {
      const civ = this.game.civilizations[building.owner];

      building.maxHp *= civ.getBuildingBonus(building.buildingType, "hp");
      building.currentHp = building.maxHp;
      building.armor *= civ.getBuildingBonus(building.buildingType, "armor");

      if (building.attack) {
        building.attack *= civ.getBuildingBonus(
          building.buildingType,
          "attack"
        );
      }

      if (building.attackRange) {
        building.attackRange *= civ.getBuildingBonus(
          building.buildingType,
          "range"
        );
      }
    }

    // Register any special event handlers
    if (buildingData.eventHandlers) {
      for (const eventType in buildingData.eventHandlers) {
        if (!this.eventHandlers[eventType]) {
          this.eventHandlers[eventType] = [];
        }

        this.eventHandlers[eventType].push({
          buildingId: building.id,
          handler: buildingData.eventHandlers[eventType],
        });
      }
    }

    // Update territory
    this.game.map.updateVisibility(building.owner);

    // Update building appearance
    building.appearance = {
      state: "default",
      variant: Math.floor(Math.random() * (buildingData.variants || 1)),
    };
  }

  /**
   * Update production queues for all buildings
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateProductionQueues(deltaTime) {
    for (const playerId in this.productionQueues) {
      for (const buildingId in this.productionQueues[playerId]) {
        const queue = this.productionQueues[playerId][buildingId];

        // Skip if building is not constructed
        const building = this.entityManager.getEntityById(buildingId);
        if (!building || !building.isConstructed) {
          continue;
        }

        // If there's an active production
        if (queue.currentProduction) {
          // Update progress
          queue.productionProgress += deltaTime;

          // Check if production is complete
          if (queue.productionProgress >= queue.productionTime) {
            this.completeProduction(building, queue);
          }
        } else if (queue.queue.length > 0) {
          // Start next item in queue
          this.startNextProduction(building, queue);
        }
      }
    }
  }

  /**
   * Start producing the next item in the queue
   * @param {Object} building - Building entity
   * @param {Object} queue - Production queue
   */
  startNextProduction(building, queue) {
    // Get next item from queue
    const nextItem = queue.queue.shift();

    if (!nextItem) {
      return;
    }

    // Set as current production
    queue.currentProduction = nextItem;
    queue.productionProgress = 0;

    // Calculate production time
    let productionTime;

    if (nextItem.type === "unit") {
      const unitData = config.UNITS[nextItem.unitType];
      productionTime = unitData.buildTime * 1000; // Convert to milliseconds

      // Apply civilization modifiers
      if (this.game.civilizations && this.game.civilizations[building.owner]) {
        const civ = this.game.civilizations[building.owner];
        productionTime *= civ.getUnitBonus(nextItem.unitType, "buildTime");
      }
    } else if (nextItem.type === "research") {
      const techData = config.TECHNOLOGIES[nextItem.techId];
      productionTime = techData.researchTime * 1000; // Convert to milliseconds

      // Apply civilization modifiers
      if (this.game.civilizations && this.game.civilizations[building.owner]) {
        const civ = this.game.civilizations[building.owner];
        productionTime *= civ.getTechResearchTimeModifier(nextItem.techId);
      }
    } else if (nextItem.type === "upgrade") {
      const upgradeData = this.buildingTypes[nextItem.targetType];
      productionTime = (upgradeData.upgradeTime || 30) * 1000; // Default 30 seconds
    }

    // Apply building's production speed modifier
    if (building.productionSpeedModifier) {
      productionTime /= building.productionSpeedModifier;
    }

    queue.productionTime = productionTime;

    // Play production start sound
    if (this.game.audioSystem) {
      const soundType =
        nextItem.type === "unit"
          ? "unit_production_start"
          : nextItem.type === "research"
          ? "research_start"
          : "upgrade_start";

      this.game.audioSystem.playSound(soundType, {
        x: building.x,
        y: building.y,
      });
    }
  }

  /**
   * Complete production of the current item
   * @param {Object} building - Building entity
   * @param {Object} queue - Production queue
   */
  completeProduction(building, queue) {
    const production = queue.currentProduction;

    if (!production) {
      return;
    }

    // Handle different production types
    if (production.type === "unit") {
      this.completeUnitProduction(building, production);
    } else if (production.type === "research") {
      this.completeResearch(building, production);
    } else if (production.type === "upgrade") {
      this.completeUpgrade(building, production);
    }

    // Clear current production
    queue.currentProduction = null;
    queue.productionProgress = 0;
    queue.productionTime = 0;

    // Start next production if there's something in the queue
    if (queue.queue.length > 0) {
      this.startNextProduction(building, queue);
    }
  }

  /**
   * Complete production of a unit
   * @param {Object} building - Building entity
   * @param {Object} production - Production data
   */
  completeUnitProduction(building, production) {
    const { unitType } = production;

    // Find a valid position to place the unit
    const spawnPosition = this.findUnitSpawnPosition(building);

    if (!spawnPosition) {
      // Queue is full, re-queue this unit
      const queue = this.productionQueues[building.owner][building.id];
      queue.queue.unshift(production);

      // Add alert if it's the player's building
      if (building.owner === this.game.currentPlayer && this.game.alertSystem) {
        this.game.alertSystem.addAlert({
          type: "spawn_blocked",
          message: `Cannot spawn ${unitType} - area is blocked`,
          x: building.x,
          y: building.y,
          priority: "high",
        });
      }

      return;
    }

    // Create the unit
    const unit = this.entityManager.createUnit(
      unitType,
      building.owner,
      spawnPosition.x,
      spawnPosition.y
    );

    if (!unit) {
      console.error(`Failed to create unit ${unitType}`);
      return;
    }

    // Unit creation effects
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "unit_creation",
        x: spawnPosition.x,
        y: spawnPosition.y,
        unitType: unitType,
        duration: 1000,
      });
    }

    // Play unit created sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("unit_created", {
        x: spawnPosition.x,
        y: spawnPosition.y,
      });
    }

    // Call the unit's init method if it exists
    if (unit.init) {
      unit.init();
    }

    // Add alert
    if (this.game.alertSystem && building.owner === this.game.currentPlayer) {
      this.game.alertSystem.addAlert({
        type: "unit_created",
        message: `${config.UNITS[unitType].name} created`,
        x: spawnPosition.x,
        y: spawnPosition.y,
        priority: "low",
      });
    }
  }

  /**
   * Find a valid position to spawn a unit from a building
   * @param {Object} building - Building entity
   * @returns {Object|null} Spawn position or null if no valid position found
   */
  findUnitSpawnPosition(building) {
    const buildingWidth = building.width * this.game.map.gridCellSize;
    const buildingHeight = building.height * this.game.map.gridCellSize;

    // Try positions around the building perimeter
    const perimeterPoints = this.getPerimeterPoints(
      building.x,
      building.y,
      buildingWidth,
      buildingHeight
    );

    for (const point of perimeterPoints) {
      // Check if position is valid for unit placement
      if (this.game.map.canPlaceUnit(point.x, point.y)) {
        return point;
      }
    }

    // Try positions in increasing distance until we find a valid one
    for (let distance = 1; distance <= 5; distance++) {
      const points = this.getPointsAtDistance(
        building.x + buildingWidth / 2,
        building.y + buildingHeight / 2,
        distance * this.game.map.gridCellSize
      );

      for (const point of points) {
        if (this.game.map.canPlaceUnit(point.x, point.y)) {
          return point;
        }
      }
    }

    return null;
  }

  /**
   * Get points around the perimeter of a rectangle
   * @param {number} x - Rectangle left position
   * @param {number} y - Rectangle top position
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @returns {Array} Array of perimeter points
   */
  getPerimeterPoints(x, y, width, height) {
    const points = [];
    const cellSize = this.game.map.gridCellSize;
    const padding = cellSize / 2;

    // Points along bottom edge
    for (let px = x + padding; px < x + width; px += cellSize) {
      points.push({ x: px, y: y + height + padding });
    }

    // Points along right edge
    for (let py = y + padding; py < y + height; py += cellSize) {
      points.push({ x: x + width + padding, y: py });
    }

    // Points along top edge
    for (let px = x + width - padding; px > x; px -= cellSize) {
      points.push({ x: px, y: y - padding });
    }

    // Points along left edge
    for (let py = y + height - padding; py > y; py -= cellSize) {
      points.push({ x: x - padding, y: py });
    }

    // Shuffle points to avoid always spawning in the same place
    return Utils.shuffleArray(points);
  }

  /**
   * Get points at a specific distance from a center point
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} distance - Distance from center
   * @returns {Array} Array of points at the specified distance
   */
  getPointsAtDistance(centerX, centerY, distance) {
    const points = [];
    const cellSize = this.game.map.gridCellSize;
    const steps = Math.max(8, Math.floor((2 * Math.PI * distance) / cellSize));

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      points.push({ x, y });
    }

    // Shuffle points to avoid always spawning in the same place
    return Utils.shuffleArray(points);
  }

  /**
   * Complete research of a technology
   * @param {Object} building - Building entity
   * @param {Object} production - Production data
   */
  completeResearch(building, production) {
    const { techId } = production;

    // Add technology to player's researched technologies
    if (this.game.techManager) {
      this.game.techManager.addResearchedTechnology(building.owner, techId);
    }

    // Research completion effects
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "research_complete",
        x: building.x,
        y: building.y,
        duration: 2000,
      });
    }

    // Play research complete sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("research_complete", {
        x: building.x,
        y: building.y,
      });
    }

    // Trigger research complete event
    this.game.emit("technologyResearched", {
      playerId: building.owner,
      technologyId: techId,
      building: building,
    });

    // Add alert
    if (this.game.alertSystem && building.owner === this.game.currentPlayer) {
      this.game.alertSystem.addAlert({
        type: "research_complete",
        message: `${config.TECHNOLOGIES[techId].name} research complete`,
        x: building.x,
        y: building.y,
        priority: "medium",
      });
    }
  }

  /**
   * Complete upgrade of a building
   * @param {Object} building - Building entity
   * @param {Object} production - Production data
   */
  completeUpgrade(building, production) {
    const { targetType } = production;

    // Store building properties to transfer
    const oldBuildingId = building.id;
    const oldX = building.x;
    const oldY = building.y;
    const owner = building.owner;

    // Remove old building entity (but don't trigger destruction effects)
    building.isBeingUpgraded = true;
    this.entityManager.removeEntity(building.id);

    // Create new upgraded building
    const newBuilding = this.entityManager.createBuilding(
      targetType,
      owner,
      oldX,
      oldY
    );

    if (!newBuilding) {
      console.error(`Failed to create upgraded building ${targetType}`);
      return;
    }

    // Set as fully constructed
    newBuilding.constructionProgress = 100;
    newBuilding.isConstructed = true;

    // Initialize the new building
    this.initializeBuilding(newBuilding);

    // Transfer any active production queue
    if (this.productionQueues[owner][oldBuildingId]) {
      this.productionQueues[owner][newBuilding.id] =
        this.productionQueues[owner][oldBuildingId];

      delete this.productionQueues[owner][oldBuildingId];
    }

    // Transfer building zone
    if (this.buildingZones[oldBuildingId]) {
      this.buildingZones[newBuilding.id] = this.buildingZones[oldBuildingId];
      this.buildingZones[newBuilding.id].type = targetType;

      delete this.buildingZones[oldBuildingId];
    }

    // Upgrade completion effects
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "building_upgrade",
        x: newBuilding.x,
        y: newBuilding.y,
        width: newBuilding.width * this.game.map.gridCellSize,
        height: newBuilding.height * this.game.map.gridCellSize,
        duration: 2000,
      });
    }

    // Play upgrade complete sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("upgrade_complete", {
        x: newBuilding.x,
        y: newBuilding.y,
      });
    }

    // Trigger upgrade complete event
    this.game.emit("buildingUpgraded", {
      playerId: owner,
      oldBuildingType: building.buildingType,
      newBuildingType: targetType,
      building: newBuilding,
    });

    // Add alert
    if (this.game.alertSystem && owner === this.game.currentPlayer) {
      this.game.alertSystem.addAlert({
        type: "upgrade_complete",
        message: `${this.buildingTypes[targetType].name} upgrade complete`,
        x: newBuilding.x,
        y: newBuilding.y,
        priority: "medium",
      });
    }
  }

  /**
   * Add a unit to a building's production queue
   * @param {Object} building - Building entity
   * @param {string} unitType - Type of unit to produce
   * @returns {boolean} Whether the unit was successfully added to the queue
   */
  queueUnit(building, unitType) {
    // Check if building can produce this unit
    const buildingData = this.buildingTypes[building.buildingType];

    if (
      !buildingData.production ||
      !buildingData.production.includes(unitType)
    ) {
      return false;
    }

    // Check if player can afford the unit
    const unitData = config.UNITS[unitType];

    if (!unitData) {
      return false;
    }

    // Calculate cost (applying civilization modifiers)
    const baseCost = unitData.cost;
    const finalCost = {};

    if (this.game.civilizations && this.game.civilizations[building.owner]) {
      // Apply civilization-specific costs
      const civCost =
        this.game.civilizations[building.owner].getUnitCost(unitType);

      if (civCost) {
        Object.assign(finalCost, civCost);
      } else {
        Object.assign(finalCost, baseCost);
      }
    } else {
      // Use default costs
      Object.assign(finalCost, baseCost);
    }

    // Check resources
    if (this.game.resourceManager) {
      for (const resource in finalCost) {
        const amount = finalCost[resource];

        if (
          this.game.resourceManager.getResource(building.owner, resource) <
          amount
        ) {
          // Not enough resources
          return false;
        }
      }

      // Deduct resources
      for (const resource in finalCost) {
        const amount = finalCost[resource];
        this.game.resourceManager.deductResource(
          building.owner,
          resource,
          amount
        );
      }
    }

    // Add to production queue
    const queue = this.productionQueues[building.owner][building.id];

    if (!queue) {
      // Initialize queue if it doesn't exist
      this.productionQueues[building.owner][building.id] = {
        queue: [{ type: "unit", unitType }],
        currentProduction: null,
        productionProgress: 0,
        productionTime: 0,
      };
    } else {
      queue.queue.push({ type: "unit", unitType });

      // If nothing is currently being produced, start this unit
      if (!queue.currentProduction) {
        this.startNextProduction(building, queue);
      }
    }

    return true;
  }

  /**
   * Queue a technology research in a building
   * @param {Object} building - Building entity
   * @param {string} techId - ID of the technology to research
   * @returns {boolean} Whether the technology was successfully queued
   */
  queueResearch(building, techId) {
    // Check if building can research this technology
    const buildingData = this.buildingTypes[building.buildingType];

    if (!buildingData.research || !buildingData.research.includes(techId)) {
      return false;
    }

    // Check if the player has already researched this technology
    if (
      this.game.techManager &&
      this.game.techManager.hasTechnology(building.owner, techId)
    ) {
      return false;
    }

    // Check if player can afford the research
    const techData = config.TECHNOLOGIES[techId];

    if (!techData) {
      return false;
    }

    // Calculate cost (applying civilization modifiers)
    const baseCost = techData.cost;
    const finalCost = {};

    if (this.game.civilizations && this.game.civilizations[building.owner]) {
      // Apply civilization-specific costs
      const costModifier =
        this.game.civilizations[building.owner].getTechResearchCostModifier(
          techId
        );

      for (const resource in baseCost) {
        finalCost[resource] = Math.floor(baseCost[resource] * costModifier);
      }
    } else {
      // Use default costs
      Object.assign(finalCost, baseCost);
    }

    // Check resources
    if (this.game.resourceManager) {
      for (const resource in finalCost) {
        const amount = finalCost[resource];

        if (
          this.game.resourceManager.getResource(building.owner, resource) <
          amount
        ) {
          // Not enough resources
          return false;
        }
      }

      // Deduct resources
      for (const resource in finalCost) {
        const amount = finalCost[resource];
        this.game.resourceManager.deductResource(
          building.owner,
          resource,
          amount
        );
      }
    }

    // Add to production queue
    const queue = this.productionQueues[building.owner][building.id];

    if (!queue) {
      // Initialize queue if it doesn't exist
      this.productionQueues[building.owner][building.id] = {
        queue: [{ type: "research", techId }],
        currentProduction: null,
        productionProgress: 0,
        productionTime: 0,
      };
    } else {
      queue.queue.push({ type: "research", techId });

      // If nothing is currently being produced, start this research
      if (!queue.currentProduction) {
        this.startNextProduction(building, queue);
      }
    }

    return true;
  }

  /**
   * Queue a building upgrade
   * @param {Object} building - Building entity to upgrade
   * @param {string} targetType - Type to upgrade to
   * @returns {boolean} Whether the upgrade was successfully queued
   */
  queueUpgrade(building, targetType) {
    // Check if this building can be upgraded to the target type
    if (!this.canUpgradeToType(building, targetType)) {
      return false;
    }

    // Check if player can afford the upgrade
    const targetBuildingData = this.buildingTypes[targetType];

    if (!targetBuildingData) {
      return false;
    }

    // Calculate upgrade cost (typically the difference between buildings)
    const baseCost = targetBuildingData.upgradeCost || {};
    const finalCost = {};

    if (this.game.civilizations && this.game.civilizations[building.owner]) {
      // Apply civilization-specific costs
      const civCost =
        this.game.civilizations[building.owner].getBuildingCost(targetType);

      // Use upgrade cost or calculate from difference
      if (Object.keys(baseCost).length > 0) {
        for (const resource in baseCost) {
          finalCost[resource] = Math.floor(
            baseCost[resource] *
              this.game.civilizations[building.owner].getCostModifier(resource)
          );
        }
      } else if (civCost) {
        const currentCost = this.game.civilizations[
          building.owner
        ].getBuildingCost(building.buildingType);

        // Calculate difference
        for (const resource in civCost) {
          const upgradeCost = Math.max(
            0,
            civCost[resource] - (currentCost[resource] || 0)
          );
          finalCost[resource] = upgradeCost;
        }
      }
    } else {
      // Use default costs
      Object.assign(finalCost, baseCost);
    }

    // Check resources
    if (this.game.resourceManager) {
      for (const resource in finalCost) {
        const amount = finalCost[resource];

        if (
          this.game.resourceManager.getResource(building.owner, resource) <
          amount
        ) {
          // Not enough resources
          return false;
        }
      }

      // Deduct resources
      for (const resource in finalCost) {
        const amount = finalCost[resource];
        this.game.resourceManager.deductResource(
          building.owner,
          resource,
          amount
        );
      }
    }

    // Add to production queue
    const queue = this.productionQueues[building.owner][building.id];

    if (!queue) {
      // Initialize queue if it doesn't exist
      this.productionQueues[building.owner][building.id] = {
        queue: [{ type: "upgrade", targetType }],
        currentProduction: null,
        productionProgress: 0,
        productionTime: 0,
      };
    } else {
      queue.queue.push({ type: "upgrade", targetType });

      // If nothing is currently being produced, start this upgrade
      if (!queue.currentProduction) {
        this.startNextProduction(building, queue);
      }
    }

    return true;
  }

  /**
   * Check if a building can be upgraded to a specific type
   * @param {Object} building - Building entity
   * @param {string} targetType - Target building type
   * @returns {boolean} Whether the upgrade is valid
   */
  canUpgradeToType(building, targetType) {
    // Check if this building has an upgrade path
    if (!this.upgradeOptions[building.buildingType]) {
      return false;
    }

    // Check if target type is a valid upgrade
    return this.upgradeOptions[building.buildingType].includes(targetType);
  }

  /**
   * Cancel production of an item in the queue
   * @param {Object} building - Building entity
   * @param {number} index - Index in the queue (or -1 for current production)
   * @returns {boolean} Whether the item was successfully canceled
   */
  cancelProduction(building, index) {
    const queue = this.productionQueues[building.owner][building.id];

    if (!queue) {
      return false;
    }

    let canceledItem;

    if (index === -1) {
      // Cancel current production
      canceledItem = queue.currentProduction;
      queue.currentProduction = null;
      queue.productionProgress = 0;
      queue.productionTime = 0;

      // Start next item in queue
      if (queue.queue.length > 0) {
        this.startNextProduction(building, queue);
      }
    } else if (index >= 0 && index < queue.queue.length) {
      // Cancel item in queue
      canceledItem = queue.queue.splice(index, 1)[0];
    } else {
      return false;
    }

    // Refund resources
    if (canceledItem && this.game.resourceManager) {
      let cost;

      if (canceledItem.type === "unit") {
        const unitData = config.UNITS[canceledItem.unitType];
        cost = unitData.cost;
      } else if (canceledItem.type === "research") {
        const techData = config.TECHNOLOGIES[canceledItem.techId];
        cost = techData.cost;
      } else if (canceledItem.type === "upgrade") {
        const targetBuildingData = this.buildingTypes[canceledItem.targetType];
        cost = targetBuildingData.upgradeCost || {};
      }

      if (cost) {
        // Refund 75% of cost
        for (const resource in cost) {
          const refundAmount = Math.floor(cost[resource] * 0.75);
          this.game.resourceManager.addResource(
            building.owner,
            resource,
            refundAmount
          );
        }
      }
    }

    return true;
  }

  /**
   * Use a building ability
   * @param {Object} building - Building entity
   * @param {string} abilityId - ID of the ability to use
   * @returns {boolean} Whether the ability was successfully used
   */
  useAbility(building, abilityId) {
    // Check if building has this ability
    if (!building.abilities) {
      return false;
    }

    const ability = building.abilities.find((a) => a.id === abilityId);

    if (!ability) {
      return false;
    }

    // Check if ability is on cooldown
    const cooldownKey = `${building.id}_${abilityId}`;
    const cooldown = this.abilityCooldowns[cooldownKey];

    if (cooldown && cooldown > 0) {
      return false;
    }

    // Use the ability
    const abilityData = ability.use
      ? ability
      : this.findAbilityData(building.buildingType, abilityId);

    if (!abilityData || !abilityData.use) {
      return false;
    }

    // Execute ability
    abilityData.use(this.game, building);

    // Set cooldown
    this.abilityCooldowns[cooldownKey] = abilityData.cooldown * 1000; // Convert to milliseconds

    // Play ability sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound(`ability_${abilityId}`, {
        x: building.x,
        y: building.y,
      });
    }

    return true;
  }

  /**
   * Find ability data for a building type
   * @param {string} buildingType - Type of building
   * @param {string} abilityId - ID of the ability
   * @returns {Object|null} Ability data or null if not found
   */
  findAbilityData(buildingType, abilityId) {
    const buildingData = this.buildingTypes[buildingType];

    if (!buildingData || !buildingData.abilities) {
      return null;
    }

    return buildingData.abilities.find((a) => a.id === abilityId);
  }

  /**
   * Update ability cooldowns
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateAbilityCooldowns(deltaTime) {
    for (const key in this.abilityCooldowns) {
      if (this.abilityCooldowns[key] > 0) {
        this.abilityCooldowns[key] -= deltaTime;

        // Ensure it doesn't go below zero
        if (this.abilityCooldowns[key] < 0) {
          this.abilityCooldowns[key] = 0;
        }
      }
    }
  }

  /**
   * Get ability cooldown for a specific building and ability
   * @param {Object} building - Building entity
   * @param {string} abilityId - ID of the ability
   * @returns {number} Remaining cooldown in milliseconds
   */
  getAbilityCooldown(building, abilityId) {
    const cooldownKey = `${building.id}_${abilityId}`;
    return this.abilityCooldowns[cooldownKey] || 0;
  }

  /**
   * Update building zones
   */
  updateBuildingZones() {
    for (const buildingId in this.buildingZones) {
      const zone = this.buildingZones[buildingId];
      const building = this.entityManager.getEntityById(buildingId);

      // Remove zone if building no longer exists
      if (!building || !building.isAlive) {
        delete this.buildingZones[buildingId];
        continue;
      }

      // Update position (in case building moved)
      zone.x = building.x + (building.width * this.game.map.gridCellSize) / 2;
      zone.y = building.y + (building.height * this.game.map.gridCellSize) / 2;

      // Apply zone effects
      this.applyZoneEffects(zone);
    }
  }

  /**
   * Apply effects of a building zone
   * @param {Object} zone - Building zone
   */
  applyZoneEffects(zone) {
    // Find entities within the zone
    const entities = this.entityManager.getEntitiesInRadius(
      zone.x,
      zone.y,
      zone.radius,
      (entity) => entity.isAlive
    );

    // Apply effects
    for (const entity of entities) {
      // Skip entities that don't belong to the same player (unless effect applies to all)
      if (entity.owner !== zone.owner && !zone.effects.affectsAll) {
        continue;
      }

      // Apply appropriate effects based on entity type
      if (entity.type === "unit" && zone.effects.unitEffects) {
        this.applyUnitZoneEffects(entity, zone);
      } else if (entity.type === "building" && zone.effects.buildingEffects) {
        this.applyBuildingZoneEffects(entity, zone);
      }
    }
  }

  /**
   * Apply zone effects to a unit
   * @param {Object} unit - Unit entity
   * @param {Object} zone - Building zone
   */
  applyUnitZoneEffects(unit, zone) {
    const effects = zone.effects.unitEffects;

    // Apply temporary stat modifiers
    if (effects.tempStatModifiers) {
      for (const stat in effects.tempStatModifiers) {
        const modifier = effects.tempStatModifiers[stat];

        // Store original value if not already stored
        if (unit.originalStats === undefined) {
          unit.originalStats = {};
        }

        if (unit.originalStats[stat] === undefined) {
          unit.originalStats[stat] = unit[stat];
        }

        // Apply modifier
        unit[stat] = unit.originalStats[stat] * modifier;
      }

      // Track that this unit is under the effect of a zone
      unit.affectedByZone = true;
      unit.zoneEffectExpiry = this.game.gameTime + 2000; // Effects last 2 seconds past leaving zone
    }

    // Apply healing
    if (effects.healing && unit.currentHp < unit.maxHp) {
      unit.currentHp = Math.min(unit.maxHp, unit.currentHp + effects.healing);

      // Healing visual effect
      if (this.game.renderer) {
        this.game.renderer.addEffect({
          type: "healing",
          entity: unit,
          amount: effects.healing,
          duration: 1000,
        });
      }
    }
  }

  /**
   * Apply zone effects to a building
   * @param {Object} building - Building entity
   * @param {Object} zone - Building zone
   */
  applyBuildingZoneEffects(building, zone) {
    const effects = zone.effects.buildingEffects;

    // Apply effects similar to unit effects
    // This would be expanded based on specific building effects needed
  }

  /**
   * Get all building types available for a player at their current age
   * @param {number} playerId - ID of the player
   * @returns {Array} Array of available building types
   */
  getAvailableBuildingTypes(playerId) {
    // Get player's current age
    const playerAge = this.game.ageSystem
      ? this.game.ageSystem.getPlayerAge(playerId)
      : 0;

    // Get civilization-specific available buildings
    if (this.game.civilizations && this.game.civilizations[playerId]) {
      return this.game.civilizations[playerId].getAvailableBuildings(playerAge);
    }

    // Fallback to default age buildings
    return config.AGE_BUILDINGS[playerAge] || [];
  }

  /**
   * Get building data for a specific building type
   * @param {string} buildingType - Type of building
   * @returns {Object|null} Building data or null if not found
   */
  getBuildingData(buildingType) {
    return this.buildingTypes[buildingType] || null;
  }

  /**
   * Get production queue for a building
   * @param {Object} building - Building entity
   * @returns {Object|null} Production queue or null if none exists
   */
  getProductionQueue(building) {
    return this.productionQueues[building.owner]?.[building.id] || null;
  }

  /**
   * Get upgrade options for a building
   * @param {Object} building - Building entity
   * @returns {Array} Array of available upgrade types
   */
  getUpgradeOptions(building) {
    return this.upgradeOptions[building.buildingType] || [];
  }

  /**
   * Handle entity created event
   * @param {Object} data - Event data
   */
  handleEntityCreated(data) {
    const entity = data.entity;

    // Skip non-buildings
    if (entity.type !== "building") {
      return;
    }

    // Handle new buildings
    if (!entity.isConstructed) {
      // Add to pending buildings if not already there
      if (!this.pendingBuildings.some((b) => b.id === entity.id)) {
        this.pendingBuildings.push(entity);
      }

      // Add to building foundations if not already there
      if (!this.buildingFoundations[entity.owner].includes(entity.id)) {
        this.buildingFoundations[entity.owner].push(entity.id);
      }
    } else {
      // Initialize already constructed buildings
      this.initializeBuilding(entity);
    }
  }

  /**
   * Handle entity destroyed event
   * @param {Object} data - Event data
   */
  handleEntityDestroyed(data) {
    const entity = data.entity;

    // Skip non-buildings
    if (entity.type !== "building") {
      return;
    }

    // Remove from pending buildings
    this.pendingBuildings = this.pendingBuildings.filter(
      (b) => b.id !== entity.id
    );

    // Remove from building foundations
    const foundationIndex = this.buildingFoundations[entity.owner]?.indexOf(
      entity.id
    );
    if (foundationIndex !== -1) {
      this.buildingFoundations[entity.owner].splice(foundationIndex, 1);
    }

    // Remove from production queues
    if (this.productionQueues[entity.owner]?.[entity.id]) {
      delete this.productionQueues[entity.owner][entity.id];
    }

    // Remove building zone
    if (this.buildingZones[entity.id]) {
      delete this.buildingZones[entity.id];
    }

    // Remove event handlers
    for (const eventType in this.eventHandlers) {
      this.eventHandlers[eventType] = this.eventHandlers[eventType]?.filter(
        (handler) => handler.buildingId !== entity.id
      );
    }

    // Remove ability cooldowns
    for (const key in this.abilityCooldowns) {
      if (key.startsWith(`${entity.id}_`)) {
        delete this.abilityCooldowns[key];
      }
    }
  }

  /**
   * Get all buildings under construction for a player
   * @param {number} playerId - ID of the player
   * @returns {Array} Array of building entities under construction
   */
  getBuildingsUnderConstruction(playerId) {
    return this.pendingBuildings.filter((b) => b.owner === playerId);
  }

  /**
   * Get the building currently producing a unit type
   * @param {number} playerId - ID of the player
   * @param {string} unitType - Type of unit
   * @returns {Object|null} Building entity or null if none found
   */
  getBuildingProducingUnitType(playerId, unitType) {
    for (const buildingId in this.productionQueues[playerId]) {
      const queue = this.productionQueues[playerId][buildingId];

      // Check current production
      if (
        queue.currentProduction &&
        queue.currentProduction.type === "unit" &&
        queue.currentProduction.unitType === unitType
      ) {
        return this.entityManager.getEntityById(buildingId);
      }

      // Check queued items
      if (
        queue.queue.some(
          (item) => item.type === "unit" && item.unitType === unitType
        )
      ) {
        return this.entityManager.getEntityById(buildingId);
      }
    }

    return null;
  }

  /**
   * Get all buildings with a specific ability
   * @param {number} playerId - ID of the player
   * @param {string} abilityId - ID of the ability
   * @returns {Array} Array of building entities with the ability
   */
  getBuildingsWithAbility(playerId, abilityId) {
    return this.entityManager
      .getEntitiesByType(playerId, "building")
      .filter(
        (building) =>
          building.abilities &&
          building.abilities.some((a) => a.id === abilityId)
      );
  }
}
