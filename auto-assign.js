/**
 * @fileoverview Auto-assign system for Empires of Eternity
 * Handles automatic assignment of villagers to resources and tasks.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

/**
 * AutoAssignSystem manages automatic assignment of villagers to resources
 */
export class AutoAssignSystem {
  /**
   * Create a new auto-assign system
   * @param {Object} game - Reference to the main game object
   * @param {Object} entityManager - Reference to the entity manager
   */
  constructor(game, entityManager) {
    this.game = game;
    this.entityManager = entityManager;

    // Track auto-assign status for each player
    this.autoAssignEnabled = {};

    // Track resource priorities for each player (1-5, with 5 being highest)
    this.resourcePriorities = {};

    // Track distribution ratios for each player
    this.distributionRatios = {};

    // Track auto-assigned villagers for each player
    this.assignedVillagers = {};

    // Update interval (in milliseconds)
    this.updateInterval = config.AUTO_ASSIGN_UPDATE_INTERVAL || 5000;
    this.lastUpdateTime = 0;

    // Default ratios and priorities
    this.defaultPriorities = {
      food: 3,
      wood: 3,
      gold: 2,
      stone: 2,
      iron: 1,
    };

    // Minimum guaranteed villagers per resource type
    this.minimumVillagers = {
      food: 3,
      wood: 3,
      gold: 1,
      stone: 1,
      iron: 0,
    };

    // Maximum distance for auto-assignment (grid cells)
    this.maxAssignmentDistance = config.AUTO_ASSIGN_MAX_DISTANCE || 40;

    // Flags for advanced features
    this.enableSmartDistribution = true; // Adjust based on current needs
    this.enableResourceDepletion = true; // Move villagers when resources deplete
    this.enableProximityPriority = true; // Prefer closer resources
  }

  /**
   * Initialize the auto-assign system
   */
  init() {
    console.log("Auto-assign system initialized");

    // Initialize data for each player
    for (let i = 0; i < config.MAX_PLAYERS; i++) {
      this.autoAssignEnabled[i] = false;
      this.resourcePriorities[i] = { ...this.defaultPriorities };
      this.assignedVillagers[i] = {};

      // Default distribution based on priorities
      this.updateDistributionRatios(i);
    }

    // Listen for entity events
    this.entityManager.on("entityCreated", this.handleEntityCreated.bind(this));
    this.entityManager.on("entityDeath", this.handleEntityDeath.bind(this));
  }

  /**
   * Update the auto-assign system
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    const currentTime = this.game.gameTime;

    // Only update at intervals to avoid excessive processing
    if (currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = currentTime;

    // Update assignments for each player with auto-assign enabled
    for (let playerId = 0; playerId < config.MAX_PLAYERS; playerId++) {
      if (this.autoAssignEnabled[playerId]) {
        this.updatePlayerAssignments(playerId);
      }
    }
  }

  /**
   * Update assignments for a specific player
   * @param {number} playerId - ID of the player
   */
  updatePlayerAssignments(playerId) {
    // Get all villagers belonging to this player
    const villagers = this.entityManager.getEntitiesByType(
      playerId,
      "unit",
      "villager"
    );

    // Get idle/unassigned villagers
    const idleVillagers = villagers.filter(
      (villager) => villager.state === "idle" || !villager.isAutoAssigned
    );

    // Get currently assigned villagers
    const assignedVillagers = villagers.filter(
      (villager) => villager.isAutoAssigned && villager.state !== "idle"
    );

    // Reorganize if needed
    if (this.enableSmartDistribution) {
      this.smartRebalanceVillagers(playerId, assignedVillagers);
    }

    // Assign idle villagers
    this.assignIdleVillagers(playerId, idleVillagers);

    // Check for depleted resources and reassign those villagers
    if (this.enableResourceDepletion) {
      this.handleResourceDepletion(playerId, assignedVillagers);
    }
  }

  /**
   * Toggle auto-assign for a player
   * @param {number} playerId - ID of the player
   * @returns {boolean} New auto-assign state
   */
  toggleAutoAssign(playerId) {
    this.autoAssignEnabled[playerId] = !this.autoAssignEnabled[playerId];

    console.log(
      `Auto-assign for player ${playerId} set to ${this.autoAssignEnabled[playerId]}`
    );

    // If enabled, immediately run assignment
    if (this.autoAssignEnabled[playerId]) {
      this.updatePlayerAssignments(playerId);
    } else {
      // If disabled, clear auto-assign flags from villagers
      this.clearAutoAssignFlags(playerId);
    }

    return this.autoAssignEnabled[playerId];
  }

  /**
   * Clear auto-assign flags from all of a player's villagers
   * @param {number} playerId - ID of the player
   */
  clearAutoAssignFlags(playerId) {
    const villagers = this.entityManager.getEntitiesByType(
      playerId,
      "unit",
      "villager"
    );

    villagers.forEach((villager) => {
      villager.isAutoAssigned = false;
    });

    // Clear tracking
    this.assignedVillagers[playerId] = {};
  }

  /**
   * Set priority for a specific resource
   * @param {number} playerId - ID of the player
   * @param {string} resource - Resource type
   * @param {number} priority - Priority level (1-5)
   */
  setResourcePriority(playerId, resource, priority) {
    // Validate inputs
    if (!this.resourcePriorities[playerId]) {
      this.resourcePriorities[playerId] = { ...this.defaultPriorities };
    }

    if (!this.defaultPriorities.hasOwnProperty(resource)) {
      console.error(`Invalid resource type: ${resource}`);
      return;
    }

    priority = Math.max(1, Math.min(5, priority)); // Clamp between 1-5

    // Update priority
    this.resourcePriorities[playerId][resource] = priority;

    // Update distribution ratios
    this.updateDistributionRatios(playerId);

    console.log(`Player ${playerId} set ${resource} priority to ${priority}`);

    // If auto-assign is enabled, update assignments
    if (this.autoAssignEnabled[playerId]) {
      this.updatePlayerAssignments(playerId);
    }
  }

  /**
   * Update distribution ratios based on priorities
   * @param {number} playerId - ID of the player
   */
  updateDistributionRatios(playerId) {
    if (!this.resourcePriorities[playerId]) {
      return;
    }

    // Calculate total priority points
    let totalPriority = 0;
    for (const resource in this.resourcePriorities[playerId]) {
      totalPriority += this.resourcePriorities[playerId][resource];
    }

    // Calculate ratios
    const ratios = {};
    for (const resource in this.resourcePriorities[playerId]) {
      ratios[resource] =
        this.resourcePriorities[playerId][resource] / totalPriority;
    }

    this.distributionRatios[playerId] = ratios;
  }

  /**
   * Smart rebalance of already assigned villagers
   * @param {number} playerId - ID of the player
   * @param {Array} assignedVillagers - Array of currently assigned villagers
   */
  smartRebalanceVillagers(playerId, assignedVillagers) {
    if (!assignedVillagers || assignedVillagers.length === 0) {
      return;
    }

    // Count current distribution
    const currentDistribution = this.getCurrentDistribution(assignedVillagers);

    // Check resource rates and player needs to adjust priorities
    this.adjustPrioritiesBasedOnNeeds(playerId);

    // Calculate target distribution
    const targetDistribution = this.calculateTargetDistribution(
      playerId,
      assignedVillagers.length
    );

    // Find resources with too many or too few villagers
    const overassigned = {};
    const underassigned = {};

    for (const resource in targetDistribution) {
      const current = currentDistribution[resource] || 0;
      const target = targetDistribution[resource];

      if (current > target) {
        overassigned[resource] = current - target;
      } else if (current < target) {
        underassigned[resource] = target - current;
      }
    }

    // Reassign villagers from overassigned to underassigned resources
    for (const resource in overassigned) {
      // Skip if no resources are underassigned
      if (Object.keys(underassigned).length === 0) {
        break;
      }

      const villagersToReassign = Math.min(
        Math.floor(overassigned[resource]),
        assignedVillagers.filter(
          (v) => v.resourceType === resource && v.isAutoAssigned
        ).length
      );

      for (let i = 0; i < villagersToReassign; i++) {
        // Find villager to reassign
        const villager = assignedVillagers.find(
          (v) => v.resourceType === resource && v.isAutoAssigned
        );

        if (!villager) {
          break;
        }

        // Find most underassigned resource
        let targetResource = null;
        let maxShortage = 0;

        for (const res in underassigned) {
          if (underassigned[res] > maxShortage) {
            maxShortage = underassigned[res];
            targetResource = res;
          }
        }

        if (targetResource) {
          // Clear current assignment
          villager.isAutoAssigned = false;
          assignedVillagers = assignedVillagers.filter(
            (v) => v.id !== villager.id
          );

          // Remove from tracking
          if (this.assignedVillagers[playerId][resource]) {
            this.assignedVillagers[playerId][resource] = this.assignedVillagers[
              playerId
            ][resource].filter((id) => id !== villager.id);
          }

          // Assign to new resource
          this.assignVillagerToResource(villager, targetResource);

          // Update counts
          underassigned[targetResource]--;
          if (underassigned[targetResource] <= 0) {
            delete underassigned[targetResource];
          }
        }
      }
    }
  }

  /**
   * Assign idle villagers to resources
   * @param {number} playerId - ID of the player
   * @param {Array} idleVillagers - Array of idle villagers
   */
  assignIdleVillagers(playerId, idleVillagers) {
    if (!idleVillagers || idleVillagers.length === 0) {
      return;
    }

    // Get all villagers for this player to determine current distribution
    const allVillagers = this.entityManager.getEntitiesByType(
      playerId,
      "unit",
      "villager"
    );
    const assignedVillagers = allVillagers.filter(
      (v) => v.state !== "idle" && v.isAutoAssigned
    );

    // Calculate target distribution
    const currentCount = assignedVillagers.length;
    const targetDistribution = this.calculateTargetDistribution(
      playerId,
      currentCount + idleVillagers.length
    );

    // Get current distribution
    const currentDistribution = this.getCurrentDistribution(assignedVillagers);

    // Calculate shortages for each resource
    const shortages = {};
    for (const resource in targetDistribution) {
      const current = currentDistribution[resource] || 0;
      const target = targetDistribution[resource];

      if (current < target) {
        shortages[resource] = target - current;
      }
    }

    // Assign villagers based on shortages
    for (const villager of idleVillagers) {
      // Find resource with highest shortage
      let targetResource = null;
      let maxShortage = 0;

      for (const resource in shortages) {
        if (shortages[resource] > maxShortage) {
          maxShortage = shortages[resource];
          targetResource = resource;
        }
      }

      // If no shortage, assign based on ratios
      if (!targetResource) {
        targetResource = this.getHighestPriorityResource(playerId);
      }

      // Assign villager to resource
      this.assignVillagerToResource(villager, targetResource);

      // Update shortages
      if (shortages[targetResource]) {
        shortages[targetResource]--;
        if (shortages[targetResource] <= 0) {
          delete shortages[targetResource];
        }
      }
    }
  }

  /**
   * Handle reassignment of villagers from depleted resources
   * @param {number} playerId - ID of the player
   * @param {Array} assignedVillagers - Array of currently assigned villagers
   */
  handleResourceDepletion(playerId, assignedVillagers) {
    for (const villager of assignedVillagers) {
      // Check if villager is gathering but the resource is depleted
      if (villager.state === "gathering" && villager.targetResource) {
        const resource = villager.targetResource;

        // Check if resource is depleted
        if (resource.currentAmount <= 0 || !resource.isAlive) {
          // Find new resource of the same type
          this.assignVillagerToResource(villager, villager.resourceType);
        }
      }
    }
  }

  /**
   * Assign a villager to gather a specific resource type
   * @param {Object} villager - Villager unit
   * @param {string} resourceType - Type of resource to gather
   */
  assignVillagerToResource(villager, resourceType) {
    // Find closest resource of specified type
    const resourceNodes = this.findResourcesOfType(
      villager.owner,
      resourceType,
      villager.x,
      villager.y
    );

    if (resourceNodes.length === 0) {
      // No resources of this type found
      console.log(`No ${resourceType} resources found for auto-assign`);
      return;
    }

    // Pick the best resource (considering distance and amount)
    const bestResource = this.pickBestResource(villager, resourceNodes);

    if (!bestResource) {
      return;
    }

    // Assign villager to gather this resource
    this.entityManager.commandGather(villager, bestResource);

    // Mark as auto-assigned
    villager.isAutoAssigned = true;
    villager.resourceType = resourceType;

    // Track the assignment
    if (!this.assignedVillagers[villager.owner][resourceType]) {
      this.assignedVillagers[villager.owner][resourceType] = [];
    }

    if (
      !this.assignedVillagers[villager.owner][resourceType].includes(
        villager.id
      )
    ) {
      this.assignedVillagers[villager.owner][resourceType].push(villager.id);
    }
  }

  /**
   * Find resources of a specific type
   * @param {number} playerId - ID of the player
   * @param {string} resourceType - Type of resource
   * @param {number} x - X coordinate for distance calculation
   * @param {number} y - Y coordinate for distance calculation
   * @returns {Array} Array of resource entities
   */
  findResourcesOfType(playerId, resourceType, x, y) {
    // Get all resource entities of the specified type
    const resources = this.entityManager.getEntitiesByType(
      null,
      "resource",
      resourceType
    );

    // Filter by visibility and amount
    return resources.filter((resource) => {
      // Check if resource is visible to the player
      if (!this.game.map.isExplored(playerId, resource.x, resource.y)) {
        return false;
      }

      // Check if resource has remaining amount
      if (resource.currentAmount <= 0) {
        return false;
      }

      // Check distance
      const distance = Utils.distance(x, y, resource.x, resource.y);
      return (
        distance <= this.maxAssignmentDistance * this.game.map.gridCellSize
      );
    });
  }

  /**
   * Pick the best resource from a list based on distance and amount
   * @param {Object} villager - Villager unit
   * @param {Array} resources - Array of resource entities
   * @returns {Object} Best resource entity
   */
  pickBestResource(villager, resources) {
    if (resources.length === 0) {
      return null;
    }

    // If only one resource, pick it
    if (resources.length === 1) {
      return resources[0];
    }

    let bestResource = null;
    let bestScore = -Infinity;

    // Find nearest dropoff point for this resource type
    const dropoffPoint = this.findNearestDropoff(
      villager.owner,
      villager.x,
      villager.y,
      villager.resourceType
    );

    // Calculate score for each resource
    for (const resource of resources) {
      // Base score on resource amount
      let score = resource.currentAmount / 100;

      // Factor in distance from villager (closer is better)
      const distanceToResource = Utils.distance(
        villager.x,
        villager.y,
        resource.x,
        resource.y
      );

      score -= distanceToResource / 100;

      // If we have a dropoff point, factor in round trip distance
      if (dropoffPoint) {
        const distanceToDropoff = Utils.distance(
          resource.x,
          resource.y,
          dropoffPoint.x,
          dropoffPoint.y
        );

        score -= distanceToDropoff / 200; // Round trip is less important than initial distance
      }

      // Check for congestion (too many villagers on same resource)
      const gatheringVillagers = this.entityManager.getUnitsGatheringResource(
        resource.id
      );
      score -= gatheringVillagers.length * 0.5; // Each villager reduces score

      if (score > bestScore) {
        bestScore = score;
        bestResource = resource;
      }
    }

    return bestResource;
  }

  /**
   * Find the nearest resource dropoff point
   * @param {number} playerId - ID of the player
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} resourceType - Type of resource
   * @returns {Object} Nearest dropoff building
   */
  findNearestDropoff(playerId, x, y, resourceType) {
    let dropoffTypes = ["towncenter"]; // All resources can be dropped at town center

    // Add resource-specific dropoff points
    switch (resourceType) {
      case "food":
        dropoffTypes.push("granary");
        break;

      case "wood":
        dropoffTypes.push("lumbercamp");
        break;

      case "gold":
      case "stone":
      case "iron":
        dropoffTypes.push("storehouse");
        break;
    }

    // Get all dropoff buildings for this player
    const dropoffs = this.entityManager.getEntitiesByTypes(
      playerId,
      "building",
      dropoffTypes
    );

    // Find the closest one
    let nearestDropoff = null;
    let nearestDistance = Infinity;

    for (const dropoff of dropoffs) {
      // Skip buildings under construction
      if (dropoff.constructionProgress < 100) {
        continue;
      }

      const distance = Utils.distance(x, y, dropoff.x, dropoff.y);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestDropoff = dropoff;
      }
    }

    return nearestDropoff;
  }

  /**
   * Get the current distribution of villagers across resource types
   * @param {Array} assignedVillagers - Array of assigned villagers
   * @returns {Object} Distribution counts by resource type
   */
  getCurrentDistribution(assignedVillagers) {
    const distribution = {};

    for (const villager of assignedVillagers) {
      if (villager.resourceType) {
        distribution[villager.resourceType] =
          (distribution[villager.resourceType] || 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Calculate target distribution based on priorities and villager count
   * @param {number} playerId - ID of the player
   * @param {number} villagerCount - Total number of villagers
   * @returns {Object} Target distribution
   */
  calculateTargetDistribution(playerId, villagerCount) {
    if (!this.distributionRatios[playerId]) {
      this.updateDistributionRatios(playerId);
    }

    const ratios = this.distributionRatios[playerId];
    const distribution = {};
    let assignedVillagers = 0;

    // First, ensure minimum villagers per resource type
    for (const resource in this.minimumVillagers) {
      const minimum = Math.min(
        this.minimumVillagers[resource],
        villagerCount - assignedVillagers
      );
      distribution[resource] = minimum;
      assignedVillagers += minimum;
    }

    // If we've assigned all villagers, return
    if (assignedVillagers >= villagerCount) {
      return distribution;
    }

    // Distribute remaining villagers according to ratios
    const remainingVillagers = villagerCount - assignedVillagers;

    // Calculate raw distribution
    const rawDistribution = {};
    for (const resource in ratios) {
      rawDistribution[resource] = Math.floor(
        remainingVillagers * ratios[resource]
      );
      distribution[resource] =
        (distribution[resource] || 0) + rawDistribution[resource];
      assignedVillagers += rawDistribution[resource];
    }

    // Assign any leftover villagers to the highest priority resource
    while (assignedVillagers < villagerCount) {
      const highestPriority = this.getHighestPriorityResource(playerId);
      distribution[highestPriority]++;
      assignedVillagers++;
    }

    return distribution;
  }

  /**
   * Get the resource with the highest priority
   * @param {number} playerId - ID of the player
   * @returns {string} Resource type
   */
  getHighestPriorityResource(playerId) {
    const priorities = this.resourcePriorities[playerId];
    let highestResource = null;
    let highestPriority = -1;

    for (const resource in priorities) {
      if (priorities[resource] > highestPriority) {
        highestPriority = priorities[resource];
        highestResource = resource;
      }
    }

    return highestResource;
  }

  /**
   * Adjust priorities based on player's current needs
   * @param {number} playerId - ID of the player
   */
  adjustPrioritiesBasedOnNeeds(playerId) {
    // Skip if smart distribution is disabled
    if (!this.enableSmartDistribution) {
      return;
    }

    // Get current resource amounts
    const resources = {};
    for (const resource in this.defaultPriorities) {
      resources[resource] = this.game.resourceManager.getResource(
        playerId,
        resource
      );
    }

    // Get resource rates
    const rates = this.game.resourceManager.getResourceRates(playerId);

    // Check for specific needs

    // 1. Low food can cause population decline, make it highest priority if very low
    if (resources.food < 100 && rates.food < 0) {
      this.resourcePriorities[playerId].food = 5;
    }

    // 2. Need wood for buildings
    const buildingsInProgress =
      this.entityManager.getBuildingsUnderConstruction(playerId);
    if (buildingsInProgress.length > 0 && resources.wood < 200) {
      this.resourcePriorities[playerId].wood = Math.max(
        this.resourcePriorities[playerId].wood,
        4
      );
    }

    // 3. If we have a lot of a resource, reduce its priority
    for (const resource in resources) {
      // Skip food which is constantly consumed
      if (resource === "food") continue;

      if (resources[resource] > 1000) {
        this.resourcePriorities[playerId][resource] = Math.max(
          1,
          this.resourcePriorities[playerId][resource] - 1
        );
      }
    }

    // 4. If we're approaching age advancement, prioritize those resources
    const currentAge = this.game.ageSystem?.getPlayerAge(playerId) || 0;
    const nextAge = currentAge + 1;

    if (this.game.ageSystem && this.game.ageSystem.ages[nextAge]) {
      const ageRequirements =
        this.game.ageSystem.ages[nextAge].requirements?.resources;

      if (ageRequirements) {
        let needsResources = false;

        for (const resource in ageRequirements) {
          if (resources[resource] < ageRequirements[resource] * 0.8) {
            needsResources = true;
            this.resourcePriorities[playerId][resource] = Math.max(
              this.resourcePriorities[playerId][resource],
              4
            );
          }
        }

        if (needsResources) {
          // Update distribution ratios with new priorities
          this.updateDistributionRatios(playerId);
        }
      }
    }
  }

  /**
   * Handle entity created events
   * @param {Object} data - Entity created event data
   */
  handleEntityCreated(data) {
    const entity = data.entity;

    // If a new villager is created and auto-assign is enabled, assign it
    if (
      entity.type === "unit" &&
      entity.unitType === "villager" &&
      this.autoAssignEnabled[entity.owner]
    ) {
      // Wait a short time for the villager to finish spawning
      setTimeout(() => {
        if (entity.isAlive && !entity.isAutoAssigned) {
          const resourceType = this.getHighestPriorityResource(entity.owner);
          this.assignVillagerToResource(entity, resourceType);
        }
      }, 1000);
    }
  }

  /**
   * Handle entity death events
   * @param {Object} data - Entity death event data
   */
  handleEntityDeath(data) {
    const entity = data.entity;

    // If a villager dies, remove it from tracking
    if (
      entity.type === "unit" &&
      entity.unitType === "villager" &&
      entity.isAutoAssigned
    ) {
      const playerId = entity.owner;
      const resourceType = entity.resourceType;

      if (
        this.assignedVillagers[playerId] &&
        this.assignedVillagers[playerId][resourceType]
      ) {
        this.assignedVillagers[playerId][resourceType] = this.assignedVillagers[
          playerId
        ][resourceType].filter((id) => id !== entity.id);
      }
    }
  }

  /**
   * Get the auto-assign status for a player
   * @param {number} playerId - ID of the player
   * @returns {boolean} Auto-assign enabled status
   */
  isAutoAssignEnabled(playerId) {
    return this.autoAssignEnabled[playerId] || false;
  }

  /**
   * Get resource priorities for a player
   * @param {number} playerId - ID of the player
   * @returns {Object} Resource priorities
   */
  getResourcePriorities(playerId) {
    return { ...this.resourcePriorities[playerId] };
  }

  /**
   * Get the current auto-assign statistics for a player
   * @param {number} playerId - ID of the player
   * @returns {Object} Auto-assign statistics
   */
  getAutoAssignStats(playerId) {
    const assignedCounts = {};
    let totalAssigned = 0;

    // Count assigned villagers
    for (const resource in this.assignedVillagers[playerId]) {
      assignedCounts[resource] =
        this.assignedVillagers[playerId][resource].length;
      totalAssigned += assignedCounts[resource];
    }

    // Get total villagers
    const allVillagers = this.entityManager.getEntitiesByType(
      playerId,
      "unit",
      "villager"
    );

    return {
      enabled: this.autoAssignEnabled[playerId],
      totalVillagers: allVillagers.length,
      assignedVillagers: totalAssigned,
      distribution: assignedCounts,
      priorities: this.getResourcePriorities(playerId),
    };
  }

  /**
   * Reset priorities to default values
   * @param {number} playerId - ID of the player
   */
  resetPriorities(playerId) {
    this.resourcePriorities[playerId] = { ...this.defaultPriorities };
    this.updateDistributionRatios(playerId);

    console.log(`Reset resource priorities for player ${playerId}`);

    // If auto-assign is enabled, update assignments
    if (this.autoAssignEnabled[playerId]) {
      this.updatePlayerAssignments(playerId);
    }
  }

  /**
   * Set distribution mode (smart or fixed)
   * @param {boolean} smartDistribution - Whether to use smart distribution
   */
  setSmartDistribution(smartDistribution) {
    this.enableSmartDistribution = smartDistribution;
    console.log(`Smart distribution set to ${smartDistribution}`);
  }

  /**
   * Set the maximum distance for auto-assignment
   * @param {number} distance - Maximum distance in grid cells
   */
  setMaxAssignmentDistance(distance) {
    this.maxAssignmentDistance = Math.max(10, Math.min(100, distance));
    console.log(`Max assignment distance set to ${this.maxAssignmentDistance}`);
  }
}
