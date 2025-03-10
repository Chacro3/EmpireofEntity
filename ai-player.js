/**
 * AI Player
 *
 * Implements computer-controlled player logic for the game.
 * Handles resource gathering, building placement, military tactics,
 * and other AI decision making.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class AIPlayer {
  /**
   * Create a new AI player
   * @param {Game} game - The game instance
   * @param {number} playerId - The AI player's ID
   * @param {string} difficulty - AI difficulty level
   */
  constructor(game, playerId, difficulty = "medium") {
    this.game = game;
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.player = game.players[playerId];

    // AI parameters (adjusted based on difficulty)
    this.params = this.setDifficultyParams(difficulty);

    // AI state
    this.state = {
      phase: "early", // early, mid, late
      lastPhaseCheck: 0,
      militaryFocus: false,
      underAttack: false,
      lastAttackTime: 0,
      economyFocus: true,
      expandingTerritory: false,
      resourcePriority: "balanced",
      enemyIntelligence: [], // Information about enemies
      territoryControl: [], // Areas controlled by this AI
      buildQueue: [], // Buildings to construct
      researchQueue: [], // Technologies to research
      unitQueue: [], // Units to train
      tacticalGroups: [], // Military unit groups
      resourceGatherers: {
        food: [],
        wood: [],
        gold: [],
        stone: [],
        iron: [],
      },
      buildLocations: [], // Good spots for buildings
      resourceLocations: {}, // Resource locations by type
      baseLocation: null, // Center of AI's base
      scouted: false, // Whether initial scouting is complete
      wallsBuilt: false,
      focusedResearch: false, // Whether focused on specific research path
    };

    // Update timers and intervals
    this.timers = {
      globalUpdate: null,
      economyUpdate: null,
      militaryUpdate: null,
      buildingUpdate: null,
      researchUpdate: null,
      scoutingUpdate: null,
      defensiveUpdate: null,
      diplomacyUpdate: null,
    };

    // Personality traits
    this.personality = this.generatePersonality();

    // Initialize AI
    this.initialize();
  }

  /**
   * Set AI parameters based on difficulty
   * @param {string} difficulty - Difficulty level
   * @returns {Object} AI parameters
   */
  setDifficultyParams(difficulty) {
    const baseParams = {
      updateInterval: 2000, // How often to update AI state (ms)
      economyInterval: 5000, // How often to check economy (ms)
      militaryInterval: 7000, // How often to update military (ms)
      buildingInterval: 10000, // How often to check buildings (ms)
      researchInterval: 15000, // How often to check research (ms)
      scoutingInterval: 30000, // How often to update exploration (ms)
      defensiveInterval: 8000, // How often to check defenses (ms)
      diplomacyInterval: 20000, // How often to update diplomacy (ms)

      resourceIdleThreshold: 0.2, // Percentage of idle workers before assigning
      resourceImbalanceThreshold: 0.5, // Threshold for resource imbalance

      minGarrisonRatio: 0.1, // Minimum ratio of units to keep in base
      minVillagerRatio: 0.5, // Minimum ratio of villagers to total pop

      // Building placement parameters
      buildingSpacing: 1, // Tiles between buildings
      defensiveRadius: 15, // Distance for defensive buildings from base
      expansionRadius: 25, // Distance for expansions from base

      // Combat parameters
      retreatHealthThreshold: 0.3, // Health percentage to retreat
      groupSizeThreshold: 5, // Minimum group size for attacks
      opportunisticAttackThreshold: 0.7, // Threshold for opportunistic attacks

      // Research priorities
      economyResearchPriority: 0.5, // 0-1, higher = more focus on economy
      militaryResearchPriority: 0.5, // 0-1, higher = more focus on military

      // Resource allocation
      foodPriority: 0.25,
      woodPriority: 0.25,
      goldPriority: 0.2,
      stonePriority: 0.15,
      ironPriority: 0.15,

      // Decision randomness (0-1, higher = more random decisions)
      randomnessFactor: 0.3,

      // Boost factors (1.0 = normal, higher values give AI advantages)
      resourceGatheringRate: 1.0,
      buildSpeed: 1.0,
      researchSpeed: 1.0,
      unitTrainingSpeed: 1.0,
    };

    // Adjust parameters based on difficulty
    switch (difficulty) {
      case "easy":
        return {
          ...baseParams,
          updateInterval: 3000,
          economyInterval: 8000,
          militaryInterval: 10000,
          randomnessFactor: 0.5,
          resourceIdleThreshold: 0.3,
          retreatHealthThreshold: 0.4,
          resourceGatheringRate: 0.8,
          buildSpeed: 0.8,
          researchSpeed: 0.8,
          unitTrainingSpeed: 0.8,
        };

      case "medium":
        return baseParams; // Default values

      case "hard":
        return {
          ...baseParams,
          updateInterval: 1500,
          economyInterval: 4000,
          militaryInterval: 5000,
          randomnessFactor: 0.2,
          resourceIdleThreshold: 0.15,
          retreatHealthThreshold: 0.25,
          resourceGatheringRate: 1.2,
          buildSpeed: 1.1,
          researchSpeed: 1.1,
          unitTrainingSpeed: 1.1,
        };

      case "expert":
        return {
          ...baseParams,
          updateInterval: 1000,
          economyInterval: 2500,
          militaryInterval: 3000,
          randomnessFactor: 0.1,
          resourceIdleThreshold: 0.1,
          retreatHealthThreshold: 0.2,
          resourceGatheringRate: 1.5,
          buildSpeed: 1.2,
          researchSpeed: 1.2,
          unitTrainingSpeed: 1.2,
        };

      default:
        return baseParams;
    }
  }

  /**
   * Generate AI personality traits
   * @returns {Object} Personality traits
   */
  generatePersonality() {
    // Generate random personality traits within certain bounds
    const aggressiveness = Utils.randFloat(0.3, 0.7);
    const defensiveness = Utils.randFloat(0.3, 0.7);
    const economyFocus = Utils.randFloat(0.3, 0.7);
    const expandingTendency = Utils.randFloat(0.3, 0.7);
    const riskTaking = Utils.randFloat(0.3, 0.7);

    // Modify based on civilization and difficulty
    let aggMod = 0;
    let defMod = 0;
    let ecoMod = 0;
    let expMod = 0;

    // Civ-specific adjustments
    if (this.player.civilization === "solari") {
      aggMod += 0.1;
      ecoMod -= 0.05;
      expMod += 0.1;
    } else if (this.player.civilization === "lunari") {
      defMod += 0.1;
      ecoMod += 0.1;
      expMod -= 0.05;
    }

    // Difficulty adjustments
    if (this.difficulty === "hard" || this.difficulty === "expert") {
      aggMod += 0.1;
      defMod += 0.1;
      ecoMod += 0.1;
      expMod += 0.1;
      riskTaking += 0.1;
    } else if (this.difficulty === "easy") {
      aggMod -= 0.1;
      defMod -= 0.1;
      ecoMod -= 0.1;
      expMod -= 0.1;
      riskTaking -= 0.1;
    }

    // Apply modifiers with clamping
    return {
      aggressiveness: Utils.clamp(aggressiveness + aggMod, 0.1, 0.9),
      defensiveness: Utils.clamp(defensiveness + defMod, 0.1, 0.9),
      economyFocus: Utils.clamp(economyFocus + ecoMod, 0.1, 0.9),
      expandingTendency: Utils.clamp(expandingTendency + expMod, 0.1, 0.9),
      riskTaking: Utils.clamp(riskTaking, 0.1, 0.9),

      // Strategy preferences (weighted randomization)
      preferredMilitaryUnits: this.generatePreferredUnits(),
      preferredTechs: this.generatePreferredTechs(),
      preferredFormations: this.generatePreferredFormations(),
      preferResourceRatio: this.generateResourcePreference(),
    };
  }

  /**
   * Generate preferred military unit types
   * @returns {Object} Map of unit types to preference weights
   */
  generatePreferredUnits() {
    // Different AI players will favor different unit compositions
    const unitTypes = ["spearman", "archer", "swordsman", "cavalry", "siege"];
    const preferences = {};

    // Assign random weights
    unitTypes.forEach((type) => {
      preferences[type] = Utils.randFloat(0.5, 1.5);
    });

    // Boost 1-2 unit types to create a specialization
    const specializations = Utils.randInt(1, 2);
    for (let i = 0; i < specializations; i++) {
      const unitType = Utils.randomChoice(unitTypes);
      preferences[unitType] += Utils.randFloat(0.5, 1.0);
    }

    return preferences;
  }

  /**
   * Generate preferred technologies
   * @returns {Object} Map of tech categories to preference weights
   */
  generatePreferredTechs() {
    const techCategories = ["military", "economy", "utility"];
    const preferences = {};

    techCategories.forEach((category) => {
      preferences[category] = Utils.randFloat(0.5, 1.5);
    });

    // Boost one category for specialization
    const specialization = Utils.randomChoice(techCategories);
    preferences[specialization] += Utils.randFloat(0.5, 1.0);

    return preferences;
  }

  /**
   * Generate preferred formations
   * @returns {Object} Map of formation types to preference weights
   */
  generatePreferredFormations() {
    const formationTypes = ["line", "box", "scattered", "wedge", "flank"];
    const preferences = {};

    formationTypes.forEach((formation) => {
      preferences[formation] = Utils.randFloat(0.5, 1.5);
    });

    // Boost one formation type
    const preferred = Utils.randomChoice(formationTypes);
    preferences[preferred] += Utils.randFloat(0.5, 1.0);

    return preferences;
  }

  /**
   * Generate resource gathering preferences
   * @returns {Object} Map of resource types to preference weights
   */
  generateResourcePreference() {
    return {
      food: Utils.randFloat(0.7, 1.3),
      wood: Utils.randFloat(0.7, 1.3),
      gold: Utils.randFloat(0.7, 1.3),
      stone: Utils.randFloat(0.7, 1.3),
      iron: Utils.randFloat(0.7, 1.3),
    };
  }

  /**
   * Initialize AI systems
   */
  initialize() {
    console.log(`Initializing AI player ${this.playerId} (${this.difficulty})`);

    // Analyze starting position and resources
    this.analyzeStartingPosition();

    // Set up update intervals
    this.setupUpdateIntervals();

    // Set up event listeners
    this.registerEventListeners();

    // Initial tasks
    this.initialActions();
  }

  /**
   * Analyze the AI's starting position
   */
  analyzeStartingPosition() {
    // Find town center (or similar starting building)
    const townCenters = this.game.entityManager.getEntitiesByTypeAndOwner(
      "townCenter",
      this.playerId
    );

    if (townCenters.length > 0) {
      const townCenter = townCenters[0];
      this.state.baseLocation = { x: townCenter.x, y: townCenter.y };

      // Find resources near base
      this.scanResourcesAroundBase();
    } else {
      // Fallback: use starting units
      const units = this.game.entityManager.getEntitiesByOwner(this.playerId);
      if (units.length > 0) {
        // Calculate centroid of all units
        let sumX = 0,
          sumY = 0;
        for (const unit of units) {
          sumX += unit.x;
          sumY += unit.y;
        }

        this.state.baseLocation = {
          x: sumX / units.length,
          y: sumY / units.length,
        };

        this.scanResourcesAroundBase();
      } else {
        console.warn(
          `AI player ${this.playerId} couldn't determine base location`
        );
      }
    }
  }

  /**
   * Scan for resources around the base
   */
  scanResourcesAroundBase() {
    if (!this.state.baseLocation) return;

    const base = this.state.baseLocation;
    const scanRadius = config.AI_INITIAL_SCAN_RADIUS || 500;

    // Find resources within radius
    const resources = this.game.entityManager.getEntitiesInCircle(
      base.x,
      base.y,
      scanRadius,
      (entity) => entity.type === "resource"
    );

    // Group by resource type
    this.state.resourceLocations = {
      food: [],
      wood: [],
      gold: [],
      stone: [],
      iron: [],
    };

    for (const resource of resources) {
      if (this.state.resourceLocations[resource.resourceType]) {
        this.state.resourceLocations[resource.resourceType].push({
          id: resource.id,
          x: resource.x,
          y: resource.y,
          amount: resource.amount,
          distance: Utils.distance(base.x, base.y, resource.x, resource.y),
        });
      }
    }

    // Sort resources by distance from base
    for (const type in this.state.resourceLocations) {
      this.state.resourceLocations[type].sort(
        (a, b) => a.distance - b.distance
      );
    }

    // Determine good building locations around base
    this.findBuildLocations();
  }

  /**
   * Find suitable building locations
   */
  findBuildLocations() {
    if (!this.state.baseLocation) return;

    const base = this.state.baseLocation;
    const scanRadius = config.AI_BUILDING_SCAN_RADIUS || 300;

    // Scan in expanding circles
    this.state.buildLocations = [];

    for (let radius = 50; radius <= scanRadius; radius += 50) {
      // Get points in a circle around base
      const points = this.getPointsInCircle(base.x, base.y, radius, 8);

      for (const point of points) {
        // Check if location is suitable for building
        if (this.isSuitableBuildLocation(point.x, point.y)) {
          this.state.buildLocations.push(point);
        }
      }
    }
  }

  /**
   * Get evenly distributed points on a circle
   * @param {number} centerX - Circle center X
   * @param {number} centerY - Circle center Y
   * @param {number} radius - Circle radius
   * @param {number} count - Number of points
   * @returns {Array<{x: number, y: number}>} Array of points
   */
  getPointsInCircle(centerX, centerY, radius, count) {
    const points = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      points.push({ x, y });
    }

    return points;
  }

  /**
   * Check if a location is suitable for building
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} Whether location is suitable
   */
  isSuitableBuildLocation(x, y) {
    // Check if location is on walkable terrain
    if (!this.game.map.isWalkable(x, y)) {
      return false;
    }

    // Check for proximity to other buildings
    const nearbyEntities = this.game.entityManager.getEntitiesInCircle(
      x,
      y,
      this.params.buildingSpacing * 32,
      (entity) => entity.type === "building" || entity.type === "resource"
    );

    if (nearbyEntities.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Set up update intervals for AI systems
   */
  setupUpdateIntervals() {
    // Main AI update loop
    this.timers.globalUpdate = setInterval(() => {
      this.update();
    }, this.params.updateInterval);

    // Economy management
    this.timers.economyUpdate = setInterval(() => {
      this.updateEconomy();
    }, this.params.economyInterval);

    // Military management
    this.timers.militaryUpdate = setInterval(() => {
      this.updateMilitary();
    }, this.params.militaryInterval);

    // Building management
    this.timers.buildingUpdate = setInterval(() => {
      this.updateBuildings();
    }, this.params.buildingInterval);

    // Research management
    this.timers.researchUpdate = setInterval(() => {
      this.updateResearch();
    }, this.params.researchInterval);

    // Scouting management
    this.timers.scoutingUpdate = setInterval(() => {
      this.updateScouting();
    }, this.params.scoutingInterval);

    // Defensive management
    this.timers.defensiveUpdate = setInterval(() => {
      this.updateDefenses();
    }, this.params.defensiveInterval);

    // Diplomacy management (if applicable)
    if (this.params.diplomacyInterval) {
      this.timers.diplomacyUpdate = setInterval(() => {
        this.updateDiplomacy();
      }, this.params.diplomacyInterval);
    }
  }

  /**
   * Register event listeners
   */
  registerEventListeners() {
    // Listen for attack alerts
    this.game.events.on("alertCreated", (alert) => {
      if (alert.type === "attack" && alert.targetPlayerId === this.playerId) {
        this.handleAttackAlert(alert);
      }
    });

    // Listen for unit deaths
    this.game.events.on("entityRemoved", (entity) => {
      if (entity.owner === this.playerId) {
        this.handleEntityLost(entity);
      }
    });

    // Listen for resource depletion
    this.game.events.on("resourceDepleted", (resource) => {
      this.handleResourceDepleted(resource);
    });

    // Listen for building completion
    this.game.events.on("buildingConstructed", (data) => {
      if (data.owner === this.playerId) {
        this.handleBuildingComplete(data);
      }
    });

    // Listen for research completion
    this.game.events.on("researchCompleted", (data) => {
      if (data.playerId === this.playerId) {
        this.handleResearchComplete(data);
      }
    });

    // Listen for age advancement
    this.game.events.on("ageAdvance", (data) => {
      if (data.playerId === this.playerId) {
        this.handleAgeAdvance(data);
      }
    });
  }

  /**
   * Perform initial actions when AI is created
   */
  initialActions() {
    // Initial resource assignments
    this.assignInitialGatherers();

    // Initial building plans
    this.planInitialBuildings();

    // Initial scouting
    this.sendInitialScouts();
  }

  /**
   * Assign initial gatherers to resources
   */
  assignInitialGatherers() {
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    if (villagers.length === 0) return;

    // Distribute initial villagers
    // Default distribution: 50% food, 30% wood, 20% gold
    const foodCount = Math.floor(villagers.length * 0.5);
    const woodCount = Math.floor(villagers.length * 0.3);
    const goldCount = villagers.length - foodCount - woodCount;

    let assignedCount = 0;

    // Assign food gatherers
    if (this.state.resourceLocations.food.length > 0) {
      for (let i = 0; i < foodCount && assignedCount < villagers.length; i++) {
        const foodSource =
          this.state.resourceLocations.food[
            i % this.state.resourceLocations.food.length
          ];
        const resource = this.game.entityManager.getEntityById(foodSource.id);

        if (resource) {
          this.commandUnitToGather(villagers[assignedCount], resource);
          this.state.resourceGatherers.food.push(villagers[assignedCount].id);
          assignedCount++;
        }
      }
    }

    // Assign wood gatherers
    if (this.state.resourceLocations.wood.length > 0) {
      for (let i = 0; i < woodCount && assignedCount < villagers.length; i++) {
        const woodSource =
          this.state.resourceLocations.wood[
            i % this.state.resourceLocations.wood.length
          ];
        const resource = this.game.entityManager.getEntityById(woodSource.id);

        if (resource) {
          this.commandUnitToGather(villagers[assignedCount], resource);
          this.state.resourceGatherers.wood.push(villagers[assignedCount].id);
          assignedCount++;
        }
      }
    }

    // Assign gold gatherers
    if (this.state.resourceLocations.gold.length > 0) {
      for (let i = 0; i < goldCount && assignedCount < villagers.length; i++) {
        const goldSource =
          this.state.resourceLocations.gold[
            i % this.state.resourceLocations.gold.length
          ];
        const resource = this.game.entityManager.getEntityById(goldSource.id);

        if (resource) {
          this.commandUnitToGather(villagers[assignedCount], resource);
          this.state.resourceGatherers.gold.push(villagers[assignedCount].id);
          assignedCount++;
        }
      }
    }

    // If we still have unassigned villagers, assign them to wood as a fallback
    if (
      assignedCount < villagers.length &&
      this.state.resourceLocations.wood.length > 0
    ) {
      for (let i = assignedCount; i < villagers.length; i++) {
        const woodSource =
          this.state.resourceLocations.wood[
            i % this.state.resourceLocations.wood.length
          ];
        const resource = this.game.entityManager.getEntityById(woodSource.id);

        if (resource) {
          this.commandUnitToGather(villagers[i], resource);
          this.state.resourceGatherers.wood.push(villagers[i].id);
        }
      }
    }
  }

  /**
   * Command a unit to gather a resource
   * @param {Entity} unit - The unit to command
   * @param {Entity} resource - The resource to gather
   */
  commandUnitToGather(unit, resource) {
    if (!unit || !resource) return;

    // Issue gather command
    this.game.entityManager.executeCommand("gather", [unit.id], {
      resourceId: resource.id,
    });
  }

  /**
   * Plan initial buildings to construct
   */
  planInitialBuildings() {
    // Plan houses based on starting units
    const startingUnits = this.game.entityManager.getEntitiesByOwner(
      this.playerId
    );
    const villagerCount = startingUnits.filter(
      (unit) => unit.unitType === "villager"
    ).length;

    // Queue houses if we're close to population limit
    const housePopulation = config.HOUSE_POPULATION || 5;
    const currentPopulation = this.player.getCurrentPopulation();
    const maxPopulation = this.player.getMaxPopulation();

    if (currentPopulation + 2 >= maxPopulation) {
      this.queueBuilding("house");
    }

    // Plan basic resource buildings
    if (villagerCount >= 6) {
      // Queue resource drop-off buildings
      this.queueBuilding("lumberCamp");

      // Queue additional houses if needed
      if (currentPopulation + 4 >= maxPopulation) {
        this.queueBuilding("house");
      }
    }
  }

  /**
   * Queue a building for construction
   * @param {string} buildingType - Type of building to construct
   * @param {Object} options - Additional options
   * @returns {boolean} Success
   */
  queueBuilding(buildingType, options = {}) {
    // Check if we can afford the building
    const buildingConfig = config.BUILDINGS[buildingType];

    if (!buildingConfig) {
      console.warn(`AI tried to queue unknown building: ${buildingType}`);
      return false;
    }

    // Default priority is medium (2)
    const priority = options.priority || 2;

    // Add to build queue
    this.state.buildQueue.push({
      type: buildingType,
      priority: priority,
      location: options.location || null,
      assignedWorkers: [],
      status: "queued",
    });

    // Sort queue by priority (higher numbers first)
    this.state.buildQueue.sort((a, b) => b.priority - a.priority);

    return true;
  }

  /**
   * Send initial scouts to explore the map
   */
  sendInitialScouts() {
    // Find a scout or repurpose a villager if needed
    const scouts = this.game.entityManager.getEntitiesByTypeAndOwner(
      "scout",
      this.playerId
    );

    if (scouts.length > 0) {
      // Use existing scouts
      for (const scout of scouts) {
        this.assignScoutingMission(scout);
      }
    } else {
      // Check if we need to create a scout from a villager
      const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
        "villager",
        this.playerId
      );

      if (villagers.length >= 6) {
        // Convert one villager to scouting duty
        const scoutVillager = villagers[villagers.length - 1];
        this.assignScoutingMission(scoutVillager);
      }
    }
  }

  /**
   * Assign a scouting mission to a unit
   * @param {Entity} unit - The unit to assign
   */
  assignScoutingMission(unit) {
    if (!unit) return;

    // Get base location or use map center as fallback
    const baseX = this.state.baseLocation
      ? this.state.baseLocation.x
      : this.game.map.width / 2;
    const baseY = this.state.baseLocation
      ? this.state.baseLocation.y
      : this.game.map.height / 2;

    // Calculate several points to scout
    const scoutRadius = this.game.map.width / 4;
    const numPoints = 4;
    const scoutPoints = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = baseX + Math.cos(angle) * scoutRadius;
      const y = baseY + Math.sin(angle) * scoutRadius;

      // Clamp to map boundaries
      const clampedX = Utils.clamp(x, 0, this.game.map.width);
      const clampedY = Utils.clamp(y, 0, this.game.map.height);

      scoutPoints.push({ x: clampedX, y: clampedY });
    }

    // Command unit to move to each point in sequence
    for (const point of scoutPoints) {
      this.game.entityManager.executeCommand("move", [unit.id], {
        x: point.x,
        y: point.y,
        queueMove: true,
      });
    }

    // Finally return to base
    this.game.entityManager.executeCommand("move", [unit.id], {
      x: baseX,
      y: baseY,
      queueMove: true,
    });
  }

  /**
   * Main AI update function
   */
  update() {
    // Check for phase transitions
    this.checkPhaseTransition();

    // Update resource imbalance detection
    this.checkResourceImbalance();

    // Process building queue
    this.processBuildQueue();

    // Process unit training queue
    this.processUnitQueue();

    // Process tactical groups
    this.processTacticalGroups();
  }

  /**
   * Check if AI should transition to a new phase
   */
  checkPhaseTransition() {
    const currentTime = this.game.time;

    // Only check periodically
    if (currentTime - this.state.lastPhaseCheck < 60000) {
      // 1 minute
      return;
    }

    this.state.lastPhaseCheck = currentTime;

    // Determine phase based on age, population, and time
    const currentAge = this.player.age;
    const currentPopulation = this.player.getCurrentPopulation();
    const gameTimeMinutes = currentTime / 60000;

    if (currentAge >= 3 || currentPopulation >= 80 || gameTimeMinutes >= 30) {
      if (this.state.phase !== "late") {
        this.transitionToPhase("late");
      }
    } else if (
      currentAge >= 2 ||
      currentPopulation >= 40 ||
      gameTimeMinutes >= 15
    ) {
      if (this.state.phase !== "mid") {
        this.transitionToPhase("mid");
      }
    }
  }

  /**
   * Transition AI to a new phase
   * @param {string} newPhase - The new phase
   */
  transitionToPhase(newPhase) {
    console.log(
      `AI player ${this.playerId} transitioning from ${this.state.phase} to ${newPhase} phase`
    );

    const oldPhase = this.state.phase;
    this.state.phase = newPhase;

    // Adjust strategy based on new phase
    if (newPhase === "mid") {
      // Mid-game adjustments
      if (this.personality.economyFocus > this.personality.aggressiveness) {
        // Economy-focused AI
        this.adjustResourcePriorities({
          food: 1.2,
          wood: 1.2,
          gold: 1.0,
          stone: 0.8,
          iron: 0.8,
        });
        this.queueBuilding("market", { priority: 3 });
      } else {
        // Military-focused AI
        this.adjustResourcePriorities({
          food: 1.0,
          wood: 0.8,
          gold: 1.2,
          iron: 1.2,
          stone: 0.8,
        });
        this.queueBuilding("barracks", { priority: 3 });
        this.state.militaryFocus = true;
      }

      // Always plan defensive structures in mid-game
      this.planDefensiveStructures();
    } else if (newPhase === "late") {
      // Late-game adjustments
      // Focus more on military and less on economy
      this.state.militaryFocus = true;
      this.adjustResourcePriorities({
        food: 1.0,
        wood: 0.8,
        gold: 1.2,
        iron: 1.2,
        stone: 1.0,
      });

      // Queue advanced military and expansion
      this.queueBuilding("siege workshop", { priority: 3 });

      // Plan for wonders depending on personality
      if (Utils.randFloat(0, 1) < this.personality.riskTaking) {
        this.planWonder();
      }
    }
  }

  /**
   * Adjust resource gathering priorities
   * @param {Object} priorities - New priorities
   */
  adjustResourcePriorities(priorities) {
    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];

    for (const type of resourceTypes) {
      if (priorities[type]) {
        this.params[`${type}Priority`] = priorities[type];
      }
    }

    // Re-balance gatherers
    this.rebalanceGatherers();
  }

  /**
   * Plan defensive structures based on game state
   */
  planDefensiveStructures() {
    if (!this.state.baseLocation) return;

    const base = this.state.baseLocation;

    // Plan towers at strategic locations
    const towerLocations = 4;
    for (let i = 0; i < towerLocations; i++) {
      const angle = (i / towerLocations) * Math.PI * 2;
      const distance = this.params.defensiveRadius * 32;

      const x = base.x + Math.cos(angle) * distance;
      const y = base.y + Math.sin(angle) * distance;

      this.queueBuilding("watchtower", {
        location: { x, y },
        priority: 2,
      });
    }

    // Plan walls if personality is defensive
    if (this.personality.defensiveness > 0.5) {
      this.planWalls();
    }
  }

  /**
   * Plan walls around the base
   */
  planWalls() {
    this.state.wallsPlanned = true;

    // This would be a complex algorithm to place walls strategically
    // For now, schedule for the defensive update
    this.state.needWallPlanning = true;
  }

  /**
   * Plan building a wonder
   */
  planWonder() {
    // Check if we can afford a wonder
    const wonderTypes = Object.keys(config.WONDERS || {});

    if (wonderTypes.length === 0) return;

    // Choose a wonder type based on the AI's age
    const availableWonders = wonderTypes.filter(
      (type) => config.WONDERS[type].requiredAge <= this.player.age
    );

    if (availableWonders.length === 0) return;

    // Select a wonder based on personality and current situation
    const wonderChoice = Utils.randomChoice(availableWonders);

    // Queue the wonder with very high priority once economy is strong
    this.queueBuilding(wonderChoice, { priority: 4 });
  }

  /**
   * Check for resource imbalances and adjust gatherer distribution
   */
  checkResourceImbalance() {
    const resources = this.player.resources;

    // Check if any resource is critically low
    let criticalResource = null;
    let criticalRatio = 1.0;

    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];

    for (const type of resourceTypes) {
      const amount = resources.getResource(type);
      const rate = resources.getResourceRate(type);

      // Consider a resource critical if:
      // 1. It has a negative income rate
      // 2. Its amount is below a threshold
      if (rate < 0 && amount < 200) {
        const urgency = 1 - amount / 200;
        if (urgency > criticalRatio) {
          criticalResource = type;
          criticalRatio = urgency;
        }
      }
    }

    // If we have a critical resource, prioritize it
    if (criticalResource) {
      const oldPriority = this.params[`${criticalResource}Priority`];
      this.params[`${criticalResource}Priority`] = Math.min(
        2.0,
        oldPriority * 1.5
      );

      // Rebalance gatherers immediately
      this.rebalanceGatherers();
    }
  }

  /**
   * Process the building queue and initiate construction
   */
  processBuildQueue() {
    if (this.state.buildQueue.length === 0) return;

    // Get available villagers for construction
    const availableVillagers = this.getIdleVillagers();

    if (availableVillagers.length === 0) return;

    // Process highest priority building first
    const buildingTask = this.state.buildQueue[0];

    // Check if we can afford it
    const buildingConfig = config.BUILDINGS[buildingTask.type];

    if (!this.player.resources.canAfford(buildingConfig.cost)) {
      return;
    }

    // Find a location for the building
    let buildLocation = buildingTask.location;

    if (!buildLocation) {
      buildLocation = this.findBuildingLocation(buildingTask.type);

      if (!buildLocation) {
        // No suitable location found, try again later
        return;
      }

      buildingTask.location = buildLocation;
    }

    // Assign villagers to the task
    const numVillagersNeeded = Math.min(
      3, // Maximum 3 villagers per building
      availableVillagers.length
    );

    const assignedVillagers = availableVillagers.slice(0, numVillagersNeeded);
    buildingTask.assignedWorkers = assignedVillagers.map((v) => v.id);
    buildingTask.status = "in_progress";

    // Command villagers to build
    this.game.entityManager.executeCommand(
      "build",
      assignedVillagers.map((v) => v.id),
      {
        buildingType: buildingTask.type,
        x: buildLocation.x,
        y: buildLocation.y,
      }
    );

    // Remove from queue
    this.state.buildQueue.shift();
  }

  /**
   * Process the unit training queue
   */
  processUnitQueue() {
    if (this.state.unitQueue.length === 0) return;

    // Find military buildings that can train units
    const militaryBuildings = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter((entity) => entity.type === "building" && entity.canTrainUnits);

    if (militaryBuildings.length === 0) return;

    // Process highest priority unit first
    const unitTask = this.state.unitQueue[0];

    // Check if we can afford it
    const unitConfig = config.UNITS[unitTask.type];

    if (!this.player.resources.canAfford(unitConfig.cost)) {
      return;
    }

    // Find a building that can train this unit
    const building = militaryBuildings.find(
      (b) =>
        b.trainsUnits && b.trainsUnits.includes(unitTask.type) && !b.isTraining
    );

    if (!building) {
      return;
    }

    // Train the unit
    this.game.entityManager.executeCommand("train", [building.id], {
      unitType: unitTask.type,
    });

    // Remove from queue
    this.state.unitQueue.shift();
  }

  /**
   * Process tactical groups for military operations
   */
  processTacticalGroups() {
    // Check if we have any tactical groups
    if (this.state.tacticalGroups.length === 0) {
      // Create new tactical groups if we have enough military units
      this.organizeTacticalGroups();
      return;
    }

    // Update existing tactical groups
    for (const group of this.state.tacticalGroups) {
      this.updateTacticalGroup(group);
    }
  }

  /**
   * Organize military units into tactical groups
   */
  organizeTacticalGroups() {
    // Get all military units
    const militaryUnits = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "unit" &&
          entity.unitType !== "villager" &&
          entity.unitType !== "scout"
      );

    if (militaryUnits.length < this.params.groupSizeThreshold) {
      return;
    }

    // Group units by type
    const unitsByType = {};

    for (const unit of militaryUnits) {
      if (!unitsByType[unit.unitType]) {
        unitsByType[unit.unitType] = [];
      }

      unitsByType[unit.unitType].push(unit);
    }

    // Create balanced groups
    const newGroups = [];

    // If we have enough units, create a new tactical group
    if (militaryUnits.length >= this.params.groupSizeThreshold) {
      const groupUnits = [];

      // Try to get a mix of unit types
      for (const type in unitsByType) {
        const unitsOfType = unitsByType[type];
        const numToTake = Math.min(
          Math.ceil(unitsOfType.length * 0.7), // Take up to 70% of each type
          Math.ceil(
            this.params.groupSizeThreshold / Object.keys(unitsByType).length
          ) // Balanced distribution
        );

        for (let i = 0; i < numToTake && i < unitsOfType.length; i++) {
          groupUnits.push(unitsOfType[i]);
        }
      }

      if (groupUnits.length >= this.params.groupSizeThreshold) {
        // Create the tactical group
        const group = {
          id: `group_${Date.now()}`,
          units: groupUnits.map((u) => u.id),
          state: "forming", // forming, assembled, moving, attacking, retreating
          target: null,
          assemblyPoint: this.getAssemblyPoint(),
          formation: this.chooseFormation(),
        };

        newGroups.push(group);

        // Command units to assemble
        this.commandGroupToAssemble(group);
      }
    }

    // Add new groups to tactical groups
    this.state.tacticalGroups = [...this.state.tacticalGroups, ...newGroups];
  }

  /**
   * Update a tactical group's state and commands
   * @param {Object} group - The tactical group
   */
  updateTacticalGroup(group) {
    // Check if group still exists (units may have died)
    const groupUnits = this.getGroupUnits(group);

    if (groupUnits.length < this.params.groupSizeThreshold / 2) {
      // Group is too small, disband
      this.disbandTacticalGroup(group);
      return;
    }

    // Update group state based on current situation
    switch (group.state) {
      case "forming":
        this.updateFormingGroup(group);
        break;

      case "assembled":
        this.updateAssembledGroup(group);
        break;

      case "moving":
        this.updateMovingGroup(group);
        break;

      case "attacking":
        this.updateAttackingGroup(group);
        break;

      case "retreating":
        this.updateRetreatingGroup(group);
        break;
    }
  }

  /**
   * Get the units in a tactical group
   * @param {Object} group - The tactical group
   * @returns {Array<Entity>} Group units
   */
  getGroupUnits(group) {
    return group.units
      .map((id) => this.game.entityManager.getEntityById(id))
      .filter((unit) => unit !== null);
  }

  /**
   * Disband a tactical group
   * @param {Object} group - The tactical group
   */
  disbandTacticalGroup(group) {
    // Remove from tactical groups
    const index = this.state.tacticalGroups.findIndex((g) => g.id === group.id);

    if (index !== -1) {
      this.state.tacticalGroups.splice(index, 1);
    }
  }

  /**
   * Update a forming tactical group
   * @param {Object} group - The tactical group
   */
  updateFormingGroup(group) {
    // Check if units have reached assembly point
    const groupUnits = this.getGroupUnits(group);

    if (groupUnits.length === 0) {
      this.disbandTacticalGroup(group);
      return;
    }

    // Count units at assembly point
    let unitsAtAssembly = 0;
    const assemblyRange = 100; // Distance considered "at assembly point"

    for (const unit of groupUnits) {
      const distance = Utils.distance(
        unit.x,
        unit.y,
        group.assemblyPoint.x,
        group.assemblyPoint.y
      );

      if (distance <= assemblyRange) {
        unitsAtAssembly++;
      }
    }

    // If most units have assembled, transition to assembled state
    if (unitsAtAssembly >= groupUnits.length * 0.7) {
      group.state = "assembled";

      // Apply formation
      this.applyFormationToGroup(group);
    }
  }

  /**
   * Update an assembled tactical group
   * @param {Object} group - The tactical group
   */
  updateAssembledGroup(group) {
    // Decide what to do with the assembled group

    // If under attack, respond to the threat
    if (this.state.underAttack) {
      const attackLocation = this.getLatestAttackLocation();

      if (attackLocation) {
        group.target = attackLocation;
        group.state = "moving";
        this.commandGroupToMove(group);
        return;
      }
    }

    // Otherwise, look for targets or important locations
    const target = this.findGroupTarget(group);

    if (target) {
      group.target = target;
      group.state = "moving";
      this.commandGroupToMove(group);
    }
  }

  /**
   * Update a moving tactical group
   * @param {Object} group - The tactical group
   */
  updateMovingGroup(group) {
    if (!group.target) {
      group.state = "assembled";
      return;
    }

    // Check if units have reached the target
    const groupUnits = this.getGroupUnits(group);

    if (groupUnits.length === 0) {
      this.disbandTacticalGroup(group);
      return;
    }

    // Count units at target location
    let unitsAtTarget = 0;
    const targetRange = 150; // Distance considered "at target"

    for (const unit of groupUnits) {
      const distance = Utils.distance(
        unit.x,
        unit.y,
        group.target.x,
        group.target.y
      );

      if (distance <= targetRange) {
        unitsAtTarget++;
      }
    }

    // If most units have reached the target, look for enemies
    if (unitsAtTarget >= groupUnits.length * 0.7) {
      // Look for enemies near the target
      const enemies = this.game.entityManager.getEntitiesInCircle(
        group.target.x,
        group.target.y,
        200,
        (entity) =>
          entity.owner !== this.playerId &&
          (entity.type === "unit" || entity.type === "building")
      );

      if (enemies.length > 0) {
        // Enemy found, attack
        group.target = {
          x: enemies[0].x,
          y: enemies[0].y,
          entityId: enemies[0].id,
        };

        group.state = "attacking";
        this.commandGroupToAttack(group);
      } else {
        // No enemies, return to assembled state
        group.state = "assembled";
      }
    }
  }

  /**
   * Update an attacking tactical group
   * @param {Object} group - The tactical group
   */
  updateAttackingGroup(group) {
    if (!group.target) {
      group.state = "assembled";
      return;
    }

    // Check if the target still exists
    const targetEntity = group.target.entityId
      ? this.game.entityManager.getEntityById(group.target.entityId)
      : null;

    if (!targetEntity) {
      // Target is gone, look for new target
      const groupUnits = this.getGroupUnits(group);

      if (groupUnits.length === 0) {
        this.disbandTacticalGroup(group);
        return;
      }

      // Look for new targets in the area
      const newTarget = this.findNearbyTarget(group);

      if (newTarget) {
        // New target found, attack
        group.target = newTarget;
        this.commandGroupToAttack(group);
      } else {
        // No targets, return to assembled state
        group.state = "assembled";
      }

      return;
    }

    // Check if group needs to retreat
    const groupUnits = this.getGroupUnits(group);
    let averageHealth = 0;

    for (const unit of groupUnits) {
      averageHealth += unit.hp / unit.maxHP;
    }

    averageHealth /= groupUnits.length;

    if (averageHealth < this.params.retreatHealthThreshold) {
      // Group is too damaged, retreat
      group.state = "retreating";
      group.target = this.getRetreatLocation();
      this.commandGroupToMove(group);
    }
  }

  /**
   * Update a retreating tactical group
   * @param {Object} group - The tactical group
   */
  updateRetreatingGroup(group) {
    if (!group.target) {
      group.state = "assembled";
      return;
    }

    // Check if units have reached the retreat point
    const groupUnits = this.getGroupUnits(group);

    if (groupUnits.length === 0) {
      this.disbandTacticalGroup(group);
      return;
    }

    // Count units at retreat point
    let unitsAtRetreat = 0;
    const retreatRange = 150; // Distance considered "at retreat point"

    for (const unit of groupUnits) {
      const distance = Utils.distance(
        unit.x,
        unit.y,
        group.target.x,
        group.target.y
      );

      if (distance <= retreatRange) {
        unitsAtRetreat++;
      }
    }

    // If most units have retreated, return to assembled state
    if (unitsAtRetreat >= groupUnits.length * 0.7) {
      group.state = "assembled";
      group.target = null;

      // Apply formation
      this.applyFormationToGroup(group);
    }
  }

  /**
   * Command a tactical group to assemble at the assembly point
   * @param {Object} group - The tactical group
   */
  commandGroupToAssemble(group) {
    const groupUnits = this.getGroupUnits(group);

    // Command units to move to assembly point
    this.game.entityManager.executeCommand(
      "move",
      groupUnits.map((u) => u.id),
      {
        x: group.assemblyPoint.x,
        y: group.assemblyPoint.y,
      }
    );
  }

  /**
   * Command a tactical group to move to a target
   * @param {Object} group - The tactical group
   */
  commandGroupToMove(group) {
    if (!group.target) return;

    const groupUnits = this.getGroupUnits(group);

    // Command units to move to target
    this.game.entityManager.executeCommand(
      "move",
      groupUnits.map((u) => u.id),
      {
        x: group.target.x,
        y: group.target.y,
        formation: group.formation,
      }
    );
  }

  /**
   * Command a tactical group to attack a target
   * @param {Object} group - The tactical group
   */
  commandGroupToAttack(group) {
    if (!group.target) return;

    const groupUnits = this.getGroupUnits(group);

    // If target is an entity, use attack command
    if (group.target.entityId) {
      this.game.entityManager.executeCommand(
        "attack",
        groupUnits.map((u) => u.id),
        {
          targetId: group.target.entityId,
        }
      );
    } else {
      // Otherwise use attack-move command
      this.game.entityManager.executeCommand(
        "attackMove",
        groupUnits.map((u) => u.id),
        {
          x: group.target.x,
          y: group.target.y,
        }
      );
    }
  }

  /**
   * Apply formation to a tactical group
   * @param {Object} group - The tactical group
   */
  applyFormationToGroup(group) {
    if (!group.formation) return;

    const groupUnits = this.getGroupUnits(group);

    // Set formation
    this.game.entityManager.executeCommand(
      "setFormation",
      groupUnits.map((u) => u.id),
      {
        formation: group.formation,
      }
    );
  }

  /**
   * Get an assembly point for a tactical group
   * @returns {Object} Assembly point coordinates
   */
  getAssemblyPoint() {
    if (!this.state.baseLocation) {
      return { x: this.game.map.width / 2, y: this.game.map.height / 2 };
    }

    // Get a point near the base, but not too close
    const base = this.state.baseLocation;
    const angle = Utils.randFloat(0, Math.PI * 2);
    const distance = Utils.randFloat(200, 300);

    return {
      x: base.x + Math.cos(angle) * distance,
      y: base.y + Math.sin(angle) * distance,
    };
  }

  /**
   * Get a retreat location for a tactical group
   * @returns {Object} Retreat point coordinates
   */
  getRetreatLocation() {
    if (!this.state.baseLocation) {
      return { x: this.game.map.width / 2, y: this.game.map.height / 2 };
    }

    // Retreat to the base
    return { ...this.state.baseLocation };
  }

  /**
   * Choose a formation for a tactical group
   * @returns {string} Formation type
   */
  chooseFormation() {
    // Choose based on personality preferences
    const formationTypes = Object.keys(this.personality.preferredFormations);

    // Weight the choices based on preference values
    const weights = formationTypes.map(
      (type) => this.personality.preferredFormations[type]
    );

    // Choose random formation weighted by preferences
    return Utils.weightedRandomChoice(formationTypes, weights);
  }

  /**
   * Find a target for a tactical group
   * @param {Object} group - The tactical group
   * @returns {Object|null} Target location
   */
  findGroupTarget(group) {
    // Priority:
    // 1. Defense if under attack
    // 2. Nearby enemy economic buildings
    // 3. Enemy military buildings
    // 4. Expansion resources

    if (this.state.underAttack) {
      return this.getLatestAttackLocation();
    }

    // Check if we should be aggressive
    if (Utils.randFloat(0, 1) < this.personality.aggressiveness) {
      // Find enemy buildings to attack
      const enemyBuildings = this.game.entityManager
        .getAllEntities()
        .filter(
          (entity) =>
            entity.owner !== this.playerId && entity.type === "building"
        );

      if (enemyBuildings.length > 0) {
        // Sort by priority and distance
        const sortedBuildings = enemyBuildings.sort((a, b) => {
          // Prioritize economic buildings
          const aIsEconomic =
            a.buildingType === "townCenter" ||
            a.buildingType === "mill" ||
            a.buildingType === "lumberCamp";
          const bIsEconomic =
            b.buildingType === "townCenter" ||
            b.buildingType === "mill" ||
            b.buildingType === "lumberCamp";

          if (aIsEconomic && !bIsEconomic) return -1;
          if (!aIsEconomic && bIsEconomic) return 1;

          // Then sort by distance
          const groupUnits = this.getGroupUnits(group);
          if (groupUnits.length === 0) return 0;

          const groupCenterX =
            groupUnits.reduce((sum, u) => sum + u.x, 0) / groupUnits.length;
          const groupCenterY =
            groupUnits.reduce((sum, u) => sum + u.y, 0) / groupUnits.length;

          const distA = Utils.distance(groupCenterX, groupCenterY, a.x, a.y);
          const distB = Utils.distance(groupCenterX, groupCenterY, b.x, b.y);

          return distA - distB;
        });

        // Take the best target
        const target = sortedBuildings[0];

        return {
          x: target.x,
          y: target.y,
          entityId: target.id,
        };
      }
    }

    // Look for expansion resources or exploration targets
    return this.findExplorationTarget(group);
  }

  /**
   * Find a nearby target for a tactical group
   * @param {Object} group - The tactical group
   * @returns {Object|null} Target location
   */
  findNearbyTarget(group) {
    // Look for enemies near the current location
    const groupUnits = this.getGroupUnits(group);
    if (groupUnits.length === 0) return null;

    // Calculate group center
    const centerX =
      groupUnits.reduce((sum, u) => sum + u.x, 0) / groupUnits.length;
    const centerY =
      groupUnits.reduce((sum, u) => sum + u.y, 0) / groupUnits.length;

    // Look for enemies within range
    const searchRadius = 300;
    const enemies = this.game.entityManager.getEntitiesInCircle(
      centerX,
      centerY,
      searchRadius,
      (entity) =>
        entity.owner !== this.playerId &&
        (entity.type === "unit" || entity.type === "building")
    );

    if (enemies.length === 0) return null;

    // Prioritize buildings over units
    const buildings = enemies.filter((e) => e.type === "building");
    const target = buildings.length > 0 ? buildings[0] : enemies[0];

    return {
      x: target.x,
      y: target.y,
      entityId: target.id,
    };
  }

  /**
   * Find an exploration target for a tactical group
   * @param {Object} group - The tactical group
   * @returns {Object|null} Target location
   */
  findExplorationTarget(group) {
    // If fog of war is enabled, look for unexplored areas
    if (this.game.map.fogOfWar) {
      // Simple exploration: pick a random point at a distance
      const baseX = this.state.baseLocation
        ? this.state.baseLocation.x
        : this.game.map.width / 2;
      const baseY = this.state.baseLocation
        ? this.state.baseLocation.y
        : this.game.map.height / 2;

      const angle = Utils.randFloat(0, Math.PI * 2);
      const distance = Utils.randFloat(
        this.params.expansionRadius * 32,
        this.params.expansionRadius * 64
      );

      const targetX = baseX + Math.cos(angle) * distance;
      const targetY = baseY + Math.sin(angle) * distance;

      // Clamp to map boundaries
      return {
        x: Utils.clamp(targetX, 0, this.game.map.width),
        y: Utils.clamp(targetY, 0, this.game.map.height),
      };
    }

    // Look for resource hotspots if no fog of war
    const resourceSpots = this.game.map.resources.filter(
      (r) => r.resourceType === "gold" || r.resourceType === "stone"
    );

    if (resourceSpots.length > 0) {
      const spot = Utils.randomChoice(resourceSpots);

      return {
        x: spot.x,
        y: spot.y,
      };
    }

    // Fallback to a random location
    return {
      x: Utils.randFloat(0, this.game.map.width),
      y: Utils.randFloat(0, this.game.map.height),
    };
  }

  /**
   * Get the latest attack location
   * @returns {Object|null} Attack location
   */
  getLatestAttackLocation() {
    // Check if we have a recent attack
    if (
      !this.state.lastAttackPosition ||
      Date.now() - this.state.lastAttackTime > 60000
    ) {
      return null;
    }

    return { ...this.state.lastAttackPosition };
  }

  /**
   * Update the economy
   */
  updateEconomy() {
    // Check if we need more villagers
    this.checkVillagerCount();

    // Rebalance gatherers based on resource needs
    this.rebalanceGatherers();

    // Check if we need to expand to new resource locations
    this.checkResourceExpansion();

    // Check if we need more drop-off buildings
    this.checkDropOffBuildings();
  }

  /**
   * Check if we need more villagers
   */
  checkVillagerCount() {
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );
    const currentPopulation = this.player.getCurrentPopulation();
    const maxPopulation = this.player.getMaxPopulation();

    // Calculate optimal villager count based on game phase
    let optimalVillagerRatio;

    switch (this.state.phase) {
      case "early":
        optimalVillagerRatio = 0.8; // 80% villagers in early game
        break;
      case "mid":
        optimalVillagerRatio = 0.6; // 60% villagers in mid game
        break;
      case "late":
        optimalVillagerRatio = 0.4; // 40% villagers in late game
        break;
      default:
        optimalVillagerRatio = 0.6;
    }

    // Adjust based on personality
    optimalVillagerRatio *= 0.8 + this.personality.economyFocus * 0.4;

    // Calculate how many villagers we need
    const optimalVillagerCount = Math.floor(
      maxPopulation * optimalVillagerRatio
    );

    // If we have less than optimal, train more
    if (
      villagers.length < optimalVillagerCount &&
      currentPopulation < maxPopulation
    ) {
      // Find a town center
      const townCenters = this.game.entityManager.getEntitiesByTypeAndOwner(
        "townCenter",
        this.playerId
      );

      if (townCenters.length > 0 && !townCenters[0].isTraining) {
        this.game.entityManager.executeCommand("train", [townCenters[0].id], {
          unitType: "villager",
        });
      }
    }

    // Check if we need more houses
    const housesNeeded = this.checkHousesNeeded();

    if (housesNeeded > 0) {
      // Queue houses
      for (let i = 0; i < housesNeeded; i++) {
        this.queueBuilding("house", { priority: 3 });
      }
    }
  }

  /**
   * Check how many houses we need
   * @returns {number} Number of houses needed
   */
  checkHousesNeeded() {
    const currentPopulation = this.player.getCurrentPopulation();
    const maxPopulation = this.player.getMaxPopulation();

    // If we're close to population cap, build more houses
    if (currentPopulation >= maxPopulation - 5) {
      const housePopulation = config.HOUSE_POPULATION || 5;
      const housesNeeded = Math.ceil(
        (currentPopulation + 10 - maxPopulation) / housePopulation
      );

      return Math.max(0, housesNeeded);
    }

    return 0;
  }

  /**
   * Rebalance gatherers based on resource needs
   */
  rebalanceGatherers() {
    // Get all villagers
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    if (villagers.length === 0) return;

    // Get current resource gatherers
    this.updateResourceGatherersList();

    // Calculate optimal distribution based on priorities and current resources
    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];
    const resourceWeights = {};
    let totalWeight = 0;

    for (const type of resourceTypes) {
      // Get base priority
      let weight = this.params[`${type}Priority`];

      // Adjust based on current reserves
      const amount = this.player.resources.getResource(type);
      if (amount < 100) {
        weight *= 1.5; // Increase weight for low resources
      } else if (amount > 1000) {
        weight *= 0.5; // Decrease weight for abundant resources
      }

      // Adjust based on whether we have accessible resources of this type
      if (this.state.resourceLocations[type].length === 0) {
        weight = 0; // No accessible resources
      }

      resourceWeights[type] = weight;
      totalWeight += weight;
    }

    // Calculate optimal count for each resource
    const optimalCounts = {};

    for (const type of resourceTypes) {
      if (totalWeight === 0) {
        optimalCounts[type] = 0;
      } else {
        optimalCounts[type] = Math.round(
          (resourceWeights[type] / totalWeight) * villagers.length
        );
      }
    }

    // Adjust current distribution towards optimal
    for (const type of resourceTypes) {
      const current = this.state.resourceGatherers[type].length;
      const optimal = optimalCounts[type];

      if (current < optimal) {
        // Need more gatherers on this resource
        const deficit = optimal - current;
        this.assignMoreGatherers(type, deficit);
      } else if (current > optimal) {
        // Too many gatherers on this resource
        const surplus = current - optimal;
        this.reassignGatherers(type, surplus);
      }
    }
  }

  /**
   * Update the list of resource gatherers
   */
  updateResourceGatherersList() {
    // Reset gatherer lists
    for (const type in this.state.resourceGatherers) {
      this.state.resourceGatherers[type] = [];
    }

    // Get all villagers
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    // Check what each villager is gathering
    for (const villager of villagers) {
      if (villager.gathering && villager.gatheringType) {
        const resourceType = villager.gatheringType;

        if (this.state.resourceGatherers[resourceType]) {
          this.state.resourceGatherers[resourceType].push(villager.id);
        }
      }
    }
  }

  /**
   * Assign more gatherers to a resource type
   * @param {string} resourceType - Type of resource
   * @param {number} count - Number of gatherers to assign
   */
  assignMoreGatherers(resourceType, count) {
    // Find idle or less important villagers
    const idleVillagers = this.getIdleVillagers();

    if (idleVillagers.length >= count) {
      // Use idle villagers first
      this.assignVillagersToResource(
        idleVillagers.slice(0, count),
        resourceType
      );
      return;
    }

    // If not enough idle villagers, reassign from other resources
    const still_needed = count - idleVillagers.length;
    this.assignVillagersToResource(idleVillagers, resourceType);

    // Determine which resources to take from
    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];
    const sourcesAndWeights = [];

    for (const type of resourceTypes) {
      if (type === resourceType) continue;

      const weight = 1 / (this.params[`${type}Priority`] || 0.1);
      const available = this.state.resourceGatherers[type].length;

      if (available > 0) {
        sourcesAndWeights.push({
          type,
          weight,
          available,
        });
      }
    }

    // Sort by weight (higher weight = less important)
    sourcesAndWeights.sort((a, b) => b.weight - a.weight);

    // Reassign villagers
    let reassigned = 0;

    for (const source of sourcesAndWeights) {
      if (reassigned >= still_needed) break;

      const toTake = Math.min(source.available, still_needed - reassigned);

      if (toTake > 0) {
        // Get villagers from this source
        const villagerIds = this.state.resourceGatherers[source.type].slice(
          0,
          toTake
        );
        const villagers = villagerIds
          .map((id) => this.game.entityManager.getEntityById(id))
          .filter((v) => v !== null);

        this.assignVillagersToResource(villagers, resourceType);
        reassigned += villagers.length;
      }
    }
  }

  /**
   * Reassign some gatherers from a resource type
   * @param {string} resourceType - Type of resource
   * @param {number} count - Number of gatherers to reassign
   */
  reassignGatherers(resourceType, count) {
    // Find gatherers of this resource type
    const gathererIds = this.state.resourceGatherers[resourceType].slice(
      0,
      count
    );
    const gatherers = gathererIds
      .map((id) => this.game.entityManager.getEntityById(id))
      .filter((v) => v !== null);

    if (gatherers.length === 0) return;

    // Determine which resources need more gatherers
    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];
    const targetsAndWeights = [];

    for (const type of resourceTypes) {
      if (type === resourceType) continue;

      // Skip if we don't have accessible resources of this type
      if (this.state.resourceLocations[type].length === 0) continue;

      const weight = this.params[`${type}Priority`] || 0.1;

      targetsAndWeights.push({
        type,
        weight,
      });
    }

    // Sort by weight (higher weight = more important)
    targetsAndWeights.sort((a, b) => b.weight - a.weight);

    // Reassign gatherers
    for (let i = 0; i < gatherers.length; i++) {
      const target = targetsAndWeights[i % targetsAndWeights.length];
      this.assignVillagersToResource([gatherers[i]], target.type);
    }
  }

  /**
   * Assign villagers to gather a specific resource
   * @param {Array<Entity>} villagers - Villagers to assign
   * @param {string} resourceType - Type of resource to gather
   */
  assignVillagersToResource(villagers, resourceType) {
    if (villagers.length === 0) return;

    // Get available resources of this type
    const availableResources = this.state.resourceLocations[resourceType];

    if (availableResources.length === 0) return;

    // Distribute villagers among resources
    for (let i = 0; i < villagers.length; i++) {
      const resourceInfo = availableResources[i % availableResources.length];
      const resource = this.game.entityManager.getEntityById(resourceInfo.id);

      if (resource) {
        this.commandUnitToGather(villagers[i], resource);

        // Update our tracking
        this.state.resourceGatherers[resourceType].push(villagers[i].id);
      }
    }
  }

  /**
   * Get idle villagers (not gathering or building)
   * @returns {Array<Entity>} Idle villagers
   */
  getIdleVillagers() {
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    return villagers.filter(
      (v) =>
        !v.gathering && !v.constructing && !v.repairing && v.state === "idle"
    );
  }

  /**
   * Check if we need to expand to new resource locations
   */
  checkResourceExpansion() {
    const currentPhase = this.state.phase;

    // In mid and late game, look for more resources
    if (currentPhase === "mid" || currentPhase === "late") {
      // Check if we're low on any critical resource type
      const resourceTypes = ["food", "wood", "gold", "stone", "iron"];

      for (const type of resourceTypes) {
        const availableResources = this.state.resourceLocations[type];

        // If we have few resources of this type, look for more
        if (availableResources.length < 2) {
          this.scanForNewResources(type);
        }
      }
    }
  }

  /**
   * Scan for new resources of a specific type
   * @param {string} resourceType - Type of resource
   */
  scanForNewResources(resourceType) {
    if (!this.state.baseLocation) return;

    const base = this.state.baseLocation;
    const scanRadius = this.params.expansionRadius * 32;

    // Find resources within radius
    const resources = this.game.entityManager.getEntitiesInCircle(
      base.x,
      base.y,
      scanRadius,
      (entity) =>
        entity.type === "resource" && entity.resourceType === resourceType
    );

    // Filter out resources we already know about
    const knownIds = new Set(
      this.state.resourceLocations[resourceType].map((r) => r.id)
    );
    const newResources = resources.filter((r) => !knownIds.has(r.id));

    if (newResources.length > 0) {
      // Add new resources to our knowledge
      for (const resource of newResources) {
        this.state.resourceLocations[resourceType].push({
          id: resource.id,
          x: resource.x,
          y: resource.y,
          amount: resource.amount,
          distance: Utils.distance(base.x, base.y, resource.x, resource.y),
        });
      }

      // Sort by distance
      this.state.resourceLocations[resourceType].sort(
        (a, b) => a.distance - b.distance
      );

      // If the resource is far, build a drop-off point
      if (newResources[0].distance > 500) {
        this.planResourceDropOff(resourceType, newResources[0]);
      }
    } else {
      // No new resources found, consider building a market for trade
      if (resourceType === "gold" || resourceType === "iron") {
        const markets = this.game.entityManager.getEntitiesByTypeAndOwner(
          "market",
          this.playerId
        );

        if (markets.length === 0) {
          this.queueBuilding("market", { priority: 3 });
        }
      }
    }
  }

  /**
   * Plan a resource drop-off building near a resource
   * @param {string} resourceType - Type of resource
   * @param {Entity} resource - The resource entity
   */
  planResourceDropOff(resourceType, resource) {
    // Determine which building type to build
    let buildingType;

    switch (resourceType) {
      case "food":
        buildingType = "mill";
        break;
      case "wood":
        buildingType = "lumberCamp";
        break;
      case "gold":
      case "stone":
      case "iron":
        buildingType = "miningCamp";
        break;
      default:
        return;
    }

    // Find a good location near the resource
    const location = this.findDropOffLocation(resource);

    if (location) {
      this.queueBuilding(buildingType, {
        location,
        priority: 3,
      });
    }
  }

  /**
   * Find a good location for a drop-off building
   * @param {Entity} resource - The resource entity
   * @returns {Object|null} Location coordinates
   */
  findDropOffLocation(resource) {
    if (!resource) return null;

    // Try to find a spot near the resource but not on top of it
    const searchRadius = 64; // 2 tiles
    const searchPoints = 8;

    for (let i = 0; i < searchPoints; i++) {
      const angle = (i / searchPoints) * Math.PI * 2;
      const x = resource.x + Math.cos(angle) * searchRadius;
      const y = resource.y + Math.sin(angle) * searchRadius;

      if (this.isSuitableBuildLocation(x, y)) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Check if we need more resource drop-off buildings
   */
  checkDropOffBuildings() {
    // Get all resource gatherers
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );
    const gatheringVillagers = villagers.filter((v) => v.gathering);

    if (gatheringVillagers.length < 5) return;

    // Check distance to drop-off points
    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];
    const dropOffNeeds = {};

    for (const type of resourceTypes) {
      dropOffNeeds[type] = false;

      // Get gatherers of this type
      const gatherers = gatheringVillagers.filter(
        (v) => v.gatheringType === type
      );

      if (gatherers.length < 3) continue; // Not enough gatherers to bother

      // Check average drop-off distance
      let totalDistance = 0;

      for (const gatherer of gatherers) {
        if (gatherer.dropOffDistance) {
          totalDistance += gatherer.dropOffDistance;
        }
      }

      const avgDistance = totalDistance / gatherers.length;

      // If average distance is too far, need a new drop-off
      if (avgDistance > 500) {
        dropOffNeeds[type] = true;
      }
    }

    // Queue drop-off buildings where needed
    for (const type in dropOffNeeds) {
      if (dropOffNeeds[type]) {
        // Find a central location for the gatherers
        const gatherers = gatheringVillagers.filter(
          (v) => v.gatheringType === type
        );
        const centerX =
          gatherers.reduce((sum, v) => sum + v.x, 0) / gatherers.length;
        const centerY =
          gatherers.reduce((sum, v) => sum + v.y, 0) / gatherers.length;

        // Determine building type
        let buildingType;

        switch (type) {
          case "food":
            buildingType = "mill";
            break;
          case "wood":
            buildingType = "lumberCamp";
            break;
          case "gold":
          case "stone":
          case "iron":
            buildingType = "miningCamp";
            break;
          default:
            continue;
        }

        // Find a location near the center
        const location = this.findBuildingLocationNear(
          buildingType,
          centerX,
          centerY
        );

        if (location) {
          this.queueBuilding(buildingType, {
            location,
            priority: 2,
          });
        }
      }
    }
  }

  /**
   * Find a building location near a point
   * @param {string} buildingType - Type of building
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @returns {Object|null} Location coordinates
   */
  findBuildingLocationNear(buildingType, x, y) {
    const buildingConfig = config.BUILDINGS[buildingType];
    if (!buildingConfig) return null;

    const width = buildingConfig.width;
    const height = buildingConfig.height;

    // Try concentric circles outward
    for (let radius = 64; radius <= 256; radius += 64) {
      const points = this.getPointsInCircle(x, y, radius, 8);

      for (const point of points) {
        if (this.game.map.canPlaceBuilding(point.x, point.y, width, height)) {
          return point;
        }
      }
    }

    return null;
  }

  /**
   * Update military units and strategy
   */
  updateMilitary() {
    // Check if we need military buildings
    this.checkMilitaryBuildings();

    // Train military units
    this.trainMilitaryUnits();

    // Update tactical groups
    this.updateTacticalGroups();

    // Check if we need to research military upgrades
    this.checkMilitaryResearch();
  }

  /**
   * Check if we need military buildings
   */
  checkMilitaryBuildings() {
    const currentPhase = this.state.phase;

    // Different buildings for different phases
    if (currentPhase === "early") {
      // Early game: basic military
      const barracks = this.game.entityManager.getEntitiesByTypeAndOwner(
        "barracks",
        this.playerId
      );

      if (barracks.length === 0) {
        this.queueBuilding("barracks", { priority: 2 });
      }
    } else if (currentPhase === "mid") {
      // Mid game: expanded military options
      const archeryRange = this.game.entityManager.getEntitiesByTypeAndOwner(
        "archeryRange",
        this.playerId
      );
      const stables = this.game.entityManager.getEntitiesByTypeAndOwner(
        "stables",
        this.playerId
      );

      if (archeryRange.length === 0) {
        this.queueBuilding("archeryRange", { priority: 2 });
      }

      if (stables.length === 0 && this.player.age >= 2) {
        this.queueBuilding("stables", { priority: 2 });
      }
    } else if (currentPhase === "late") {
      // Late game: advanced military
      const siegeWorkshop = this.game.entityManager.getEntitiesByTypeAndOwner(
        "siegeWorkshop",
        this.playerId
      );

      if (siegeWorkshop.length === 0 && this.player.age >= 3) {
        this.queueBuilding("siegeWorkshop", { priority: 2 });
      }
    }
  }

  /**
   /**
     * Train military units based on strategy
     */
  trainMilitaryUnits() {
    // Find military buildings
    const militaryBuildings = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "building" &&
          entity.canTrainUnits &&
          !entity.isTraining
      );

    if (militaryBuildings.length === 0) return;

    // Check if we need more military units
    const currentPopulation = this.player.getCurrentPopulation();
    const maxPopulation = this.player.getMaxPopulation();

    // Don't train if near population cap
    if (currentPopulation >= maxPopulation - 2) return;

    // Calculate target military composition
    const currentMilitary = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "unit" &&
          entity.unitType !== "villager" &&
          entity.unitType !== "scout"
      );

    // Determine if we need more military
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );
    const militaryRatio =
      currentMilitary.length / (currentMilitary.length + villagers.length);

    // Target military ratio increases throughout the game
    let targetRatio;
    switch (this.state.phase) {
      case "early":
        targetRatio = 0.2; // 20% military in early game
        break;
      case "mid":
        targetRatio = 0.4; // 40% military in mid game
        break;
      case "late":
        targetRatio = 0.6; // 60% military in late game
        break;
      default:
        targetRatio = 0.4;
    }

    // Adjust based on personality
    targetRatio *= 0.8 + this.personality.aggressiveness * 0.4;

    // If under attack, increase target ratio
    if (this.state.underAttack) {
      targetRatio += 0.2;
    }

    // If we don't need more military, don't train
    if (militaryRatio >= targetRatio && currentMilitary.length >= 10) {
      return;
    }

    // Decide what units to train
    const unitOptions = [];

    // Get trainable units from each building
    for (const building of militaryBuildings) {
      if (building.trainsUnits) {
        for (const unitType of building.trainsUnits) {
          // Check if unit is available in current age
          const unitConfig = config.UNITS[unitType];

          if (unitConfig && unitConfig.requiredAge <= this.player.age) {
            unitOptions.push({
              type: unitType,
              building: building,
              preference:
                this.personality.preferredMilitaryUnits[unitType] || 1.0,
            });
          }
        }
      }
    }

    if (unitOptions.length === 0) return;

    // Weight options by preference and randomness
    const weights = unitOptions.map(
      (option) =>
        option.preference *
        (1 +
          Utils.randFloat(
            -this.params.randomnessFactor,
            this.params.randomnessFactor
          ))
    );

    // Choose a unit to train
    const chosenIndex = Utils.weightedRandomIndex(weights);
    const chosen = unitOptions[chosenIndex];

    // Check if we can afford it
    const unitConfig = config.UNITS[chosen.type];

    if (this.player.resources.canAfford(unitConfig.cost)) {
      // Train the unit
      this.game.entityManager.executeCommand("train", [chosen.building.id], {
        unitType: chosen.type,
      });
    }
  }

  /**
   * Update tactical groups for military operations
   */
  updateTacticalGroups() {
    // Clean up invalid groups
    this.state.tacticalGroups = this.state.tacticalGroups.filter((group) => {
      const units = this.getGroupUnits(group);
      return units.length >= 2; // Require at least 2 units for a group
    });

    // If we have too many small groups, consolidate them
    if (this.state.tacticalGroups.length > 3) {
      this.consolidateTacticalGroups();
    }

    // Check if we need new groups
    const ungroupedMilitary = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "unit" &&
          entity.unitType !== "villager" &&
          entity.unitType !== "scout" &&
          !this.isUnitInTacticalGroup(entity.id)
      );

    if (ungroupedMilitary.length >= this.params.groupSizeThreshold) {
      this.organizeTacticalGroups();
    }
  }

  /**
   * Check if a unit is in any tactical group
   * @param {string} unitId - The unit ID
   * @returns {boolean} True if unit is in a group
   */
  isUnitInTacticalGroup(unitId) {
    return this.state.tacticalGroups.some((group) =>
      group.units.includes(unitId)
    );
  }

  /**
   * Consolidate small tactical groups into larger ones
   */
  consolidateTacticalGroups() {
    // Sort groups by size (smallest first)
    this.state.tacticalGroups.sort(
      (a, b) => this.getGroupUnits(a).length - this.getGroupUnits(b).length
    );

    // If the smallest group is still reasonably sized, don't consolidate
    if (
      this.getGroupUnits(this.state.tacticalGroups[0]).length >=
      this.params.groupSizeThreshold
    ) {
      return;
    }

    // Merge the smallest group into others
    const smallGroup = this.state.tacticalGroups.shift();
    const smallGroupUnits = this.getGroupUnits(smallGroup);

    if (this.state.tacticalGroups.length > 0 && smallGroupUnits.length > 0) {
      // Add to the first group
      const targetGroup = this.state.tacticalGroups[0];
      targetGroup.units = [
        ...targetGroup.units,
        ...smallGroupUnits.map((u) => u.id),
      ];

      // Reset group state to forming so units will gather at the assembly point
      targetGroup.state = "forming";
      this.commandGroupToAssemble(targetGroup);
    }
  }

  /**
   * Check if we need to research military upgrades
   */
  checkMilitaryResearch() {
    // Only research if we have enough economy
    const resources = this.player.resources;
    const foodAmount = resources.getResource("food");
    const goldAmount = resources.getResource("gold");

    if (foodAmount < 400 || goldAmount < 300) {
      return; // Not enough resources
    }

    // Find research buildings
    const researchBuildings = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "building" &&
          entity.canResearch &&
          !entity.isResearching
      );

    if (researchBuildings.length === 0) return;

    // Get available military technologies
    const availableTechs = [];

    for (const building of researchBuildings) {
      if (building.availableResearch) {
        for (const techId of building.availableResearch) {
          const techConfig = config.TECHNOLOGIES[techId];

          if (
            techConfig &&
            techConfig.category === "military" &&
            techConfig.requiredAge <= this.player.age &&
            this.player.resources.canAfford(techConfig.cost)
          ) {
            // Check if tech has military benefit
            const hasMilitaryEffect = techConfig.effects.some(
              (effect) =>
                effect.type === "unitStat" ||
                effect.type === "movementSpeed" ||
                effect.type === "damage"
            );

            if (hasMilitaryEffect) {
              availableTechs.push({
                id: techId,
                building: building,
                cost: techConfig.cost,
              });
            }
          }
        }
      }
    }

    if (availableTechs.length === 0) return;

    // Choose a tech to research - prioritize cheaper ones early
    availableTechs.sort((a, b) => {
      const aCost = a.cost.food + a.cost.gold + (a.cost.iron || 0);
      const bCost = b.cost.food + b.cost.gold + (b.cost.iron || 0);
      return aCost - bCost;
    });

    // Research the first one
    const chosenTech = availableTechs[0];

    this.game.entityManager.executeCommand(
      "research",
      [chosenTech.building.id],
      {
        technologyId: chosenTech.id,
      }
    );
  }

  /**
   * Update buildings and construction priorities
   */
  updateBuildings() {
    // Check phase-specific building needs
    this.checkPhaseSpecificBuildings();

    // Process building queue
    this.processBuildQueue();

    // Check if we need defensive buildings
    if (this.state.phase !== "early") {
      this.checkDefensiveBuildings();
    }

    // Check if we need economic buildings
    this.checkEconomicBuildings();
  }

  /**
   * Check if we need phase-specific buildings
   */
  checkPhaseSpecificBuildings() {
    const currentPhase = this.state.phase;

    if (currentPhase === "early") {
      // Early game: basic infrastructure
      this.checkEarlyGameBuildings();
    } else if (currentPhase === "mid") {
      // Mid game: expansion buildings
      this.checkMidGameBuildings();
    } else if (currentPhase === "late") {
      // Late game: advanced buildings
      this.checkLateGameBuildings();
    }
  }

  /**
   * Check if we need early game buildings
   */
  checkEarlyGameBuildings() {
    // Check for basic buildings
    this.checkBasicBuildings();

    // Check if we need houses
    const housesNeeded = this.checkHousesNeeded();
    for (let i = 0; i < housesNeeded; i++) {
      this.queueBuilding("house", { priority: 3 });
    }

    // Check if we need basic military
    const barracks = this.game.entityManager.getEntitiesByTypeAndOwner(
      "barracks",
      this.playerId
    );
    if (barracks.length === 0) {
      this.queueBuilding("barracks", { priority: 2 });
    }
  }

  /**
   * Check if we need basic infrastructure buildings
   */
  checkBasicBuildings() {
    // Check for basic resource buildings
    const lumberCamps = this.game.entityManager.getEntitiesByTypeAndOwner(
      "lumberCamp",
      this.playerId
    );
    const mills = this.game.entityManager.getEntitiesByTypeAndOwner(
      "mill",
      this.playerId
    );
    const miningCamps = this.game.entityManager.getEntitiesByTypeAndOwner(
      "miningCamp",
      this.playerId
    );

    // Check if we have wood resources
    if (
      lumberCamps.length === 0 &&
      this.state.resourceLocations.wood.length > 0
    ) {
      this.queueBuilding("lumberCamp", { priority: 3 });
    }

    // Check if we have food resources
    if (mills.length === 0 && this.state.resourceLocations.food.length > 0) {
      this.queueBuilding("mill", { priority: 3 });
    }

    // Check if we have gold or stone resources
    if (
      miningCamps.length === 0 &&
      (this.state.resourceLocations.gold.length > 0 ||
        this.state.resourceLocations.stone.length > 0)
    ) {
      this.queueBuilding("miningCamp", { priority: 3 });
    }
  }

  /**
   * Check if we need mid game buildings
   */
  checkMidGameBuildings() {
    // Check if we have a barracks first
    const barracks = this.game.entityManager.getEntitiesByTypeAndOwner(
      "barracks",
      this.playerId
    );
    if (barracks.length === 0) {
      this.queueBuilding("barracks", { priority: 3 });
      return; // Build barracks first
    }

    // Check for expanded military options
    const archeryRange = this.game.entityManager.getEntitiesByTypeAndOwner(
      "archeryRange",
      this.playerId
    );
    const stables = this.game.entityManager.getEntitiesByTypeAndOwner(
      "stables",
      this.playerId
    );

    if (archeryRange.length === 0) {
      this.queueBuilding("archeryRange", { priority: 2 });
    }

    if (stables.length === 0 && this.player.age >= 2) {
      this.queueBuilding("stables", { priority: 2 });
    }

    // Check for market
    const market = this.game.entityManager.getEntitiesByTypeAndOwner(
      "market",
      this.playerId
    );
    if (market.length === 0) {
      this.queueBuilding("market", { priority: 2 });
    }

    // Check for blacksmith
    const blacksmith = this.game.entityManager.getEntitiesByTypeAndOwner(
      "blacksmith",
      this.playerId
    );
    if (blacksmith.length === 0) {
      this.queueBuilding("blacksmith", { priority: 2 });
    }
  }

  /**
   * Check if we need late game buildings
   */
  checkLateGameBuildings() {
    // Check for advanced military
    const siegeWorkshop = this.game.entityManager.getEntitiesByTypeAndOwner(
      "siegeWorkshop",
      this.playerId
    );
    if (siegeWorkshop.length === 0 && this.player.age >= 3) {
      this.queueBuilding("siegeWorkshop", { priority: 3 });
    }

    // Check for university
    const university = this.game.entityManager.getEntitiesByTypeAndOwner(
      "university",
      this.playerId
    );
    if (university.length === 0 && this.player.age >= 3) {
      this.queueBuilding("university", { priority: 2 });
    }

    // Check if we should plan a wonder
    if (
      this.player.age >= 4 &&
      Utils.randFloat(0, 1) < this.personality.riskTaking
    ) {
      // Only occasionally check for wonders
      if (Math.random() < 0.1) {
        this.planWonder();
      }
    }
  }

  /**
   * Check if we need defensive buildings
   */
  checkDefensiveBuildings() {
    // Skip if we've recently checked
    const now = Date.now();
    if (this.lastDefensiveCheck && now - this.lastDefensiveCheck < 60000) {
      return;
    }

    this.lastDefensiveCheck = now;

    // If we're under attack or in mid/late game, build defenses
    if (this.state.underAttack || this.state.phase !== "early") {
      // Check for watchtowers
      const watchtowers = this.game.entityManager.getEntitiesByTypeAndOwner(
        "watchtower",
        this.playerId
      );

      // More towers as game progresses
      let targetTowers;
      switch (this.state.phase) {
        case "early":
          targetTowers = 0;
          break;
        case "mid":
          targetTowers = 4;
          break;
        case "late":
          targetTowers = 8;
          break;
        default:
          targetTowers = 4;
      }

      // More towers if under attack
      if (this.state.underAttack) {
        targetTowers += 2;
      }

      // Adjust based on personality
      targetTowers *= 0.5 + this.personality.defensiveness;

      if (watchtowers.length < targetTowers) {
        // Place towers strategically
        this.planWatchtowers(targetTowers - watchtowers.length);
      }

      // Check for walls if defensive personality
      if (this.personality.defensiveness > 0.6 && !this.state.wallsBuilt) {
        this.planWalls();
      }
    }
  }

  /**
   * Plan strategic placement of watchtowers
   * @param {number} count - Number of towers to plan
   */
  planWatchtowers(count) {
    if (!this.state.baseLocation) return;

    const base = this.state.baseLocation;

    // Place towers at different distances and angles
    for (let i = 0; i < count; i++) {
      // Vary the distance based on game phase
      let minRadius, maxRadius;

      switch (this.state.phase) {
        case "early":
          minRadius = 200;
          maxRadius = 300;
          break;
        case "mid":
          minRadius = 250;
          maxRadius = 400;
          break;
        case "late":
          minRadius = 300;
          maxRadius = 500;
          break;
        default:
          minRadius = 250;
          maxRadius = 400;
      }

      // If under attack, place some towers closer to base
      if (this.state.underAttack && i % 2 === 0) {
        minRadius /= 2;
        maxRadius /= 2;
      }

      const radius = Utils.randFloat(minRadius, maxRadius);
      const angle = (i / count) * Math.PI * 2 + Utils.randFloat(-0.2, 0.2);

      const x = base.x + Math.cos(angle) * radius;
      const y = base.y + Math.sin(angle) * radius;

      // Check if location is valid
      if (this.isSuitableBuildLocation(x, y)) {
        this.queueBuilding("watchtower", {
          location: { x, y },
          priority: this.state.underAttack ? 3 : 2,
        });
      }
    }
  }

  /**
   * Check if we need economic buildings
   */
  checkEconomicBuildings() {
    // Check if we need additional town centers
    this.checkAdditionalTownCenters();

    // Check if we need more resource buildings
    this.checkResourceBuildings();
  }

  /**
   * Check if we need additional town centers
   */
  checkAdditionalTownCenters() {
    // Only consider in mid to late game
    if (this.state.phase === "early") return;

    const townCenters = this.game.entityManager.getEntitiesByTypeAndOwner(
      "townCenter",
      this.playerId
    );

    // Consider building another town center if we have enough resources and villagers
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    // Need at least 25 villagers before considering expansion
    if (villagers.length < 25) return;

    // Target number of town centers based on game phase and map size
    let targetTownCenters;

    switch (this.state.phase) {
      case "mid":
        targetTownCenters = 2;
        break;
      case "late":
        targetTownCenters = 3;
        break;
      default:
        targetTownCenters = 2;
    }

    // Adjust based on personality
    if (this.personality.expandingTendency > 0.6) {
      targetTownCenters += 1;
    }

    if (townCenters.length < targetTownCenters) {
      // Look for a good expansion location
      const expansionLocation = this.findExpansionLocation();

      if (expansionLocation) {
        this.queueBuilding("townCenter", {
          location: expansionLocation,
          priority: 3,
        });
      }
    }
  }

  /**
   * Find a good location for expansion
   * @returns {Object|null} Location coordinates
   */
  findExpansionLocation() {
    if (!this.state.baseLocation) return null;

    const base = this.state.baseLocation;

    // Look for resources away from main base
    let bestScore = 0;
    let bestLocation = null;

    // Try different angles and distances
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      for (let distance = 600; distance <= 1000; distance += 200) {
        const x = base.x + Math.cos(angle) * distance;
        const y = base.y + Math.sin(angle) * distance;

        // Skip if off map
        if (
          x < 0 ||
          y < 0 ||
          x >= this.game.map.width ||
          y >= this.game.map.height
        ) {
          continue;
        }

        // Evaluate location quality
        const score = this.evaluateExpansionLocation(x, y);

        if (score > bestScore) {
          bestScore = score;
          bestLocation = { x, y };
        }
      }
    }

    return bestLocation;
  }

  /**
   * Evaluate the quality of an expansion location
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Location score
   */
  evaluateExpansionLocation(x, y) {
    // Check if location is buildable
    if (!this.isSuitableBuildLocation(x, y)) {
      return 0;
    }

    let score = 0;

    // Check for nearby resources
    const searchRadius = 400;
    const resources = this.game.entityManager.getEntitiesInCircle(
      x,
      y,
      searchRadius,
      (entity) => entity.type === "resource"
    );

    // Score based on resource types and amounts
    for (const resource of resources) {
      const distance = Utils.distance(x, y, resource.x, resource.y);
      let resourceValue;

      switch (resource.resourceType) {
        case "food":
          resourceValue = 1;
          break;
        case "wood":
          resourceValue = 1;
          break;
        case "gold":
          resourceValue = 2;
          break;
        case "stone":
          resourceValue = 1.5;
          break;
        case "iron":
          resourceValue = 2;
          break;
        default:
          resourceValue = 1;
      }

      // Resources closer to the expansion point are more valuable
      const distanceFactor = 1 - distance / searchRadius;
      score += resourceValue * distanceFactor * (resource.amount / 1000);
    }

    // Subtract score for nearby enemy buildings
    const enemyBuildings = this.game.entityManager.getEntitiesInCircle(
      x,
      y,
      searchRadius * 1.5,
      (entity) => entity.type === "building" && entity.owner !== this.playerId
    );

    for (const building of enemyBuildings) {
      const distance = Utils.distance(x, y, building.x, building.y);
      const distanceFactor = 1 - distance / (searchRadius * 1.5);
      score -= 5 * distanceFactor;
    }

    // Add score for distance from main base (not too close)
    const baseDistance = Utils.distance(
      x,
      y,
      this.state.baseLocation.x,
      this.state.baseLocation.y
    );
    if (baseDistance < 400) {
      score *= 0.5; // Penalize locations too close to main base
    }

    return score;
  }

  /**
   * Check if we need additional resource buildings
   */
  checkResourceBuildings() {
    // Calculate optimal number of each resource building based on villager count
    const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.playerId
    );

    if (villagers.length < 10) return;

    // Scale with villager count
    const villagerFactor = villagers.length / 20; // 1.0 at 20 villagers

    // Buildings per resource type
    this.checkResourceBuildingType(
      "mill",
      "food",
      Math.ceil(1 + villagerFactor)
    );
    this.checkResourceBuildingType(
      "lumberCamp",
      "wood",
      Math.ceil(1 + villagerFactor)
    );
    this.checkResourceBuildingType(
      "miningCamp",
      "gold",
      Math.ceil(1 + villagerFactor * 0.5)
    );
    this.checkResourceBuildingType(
      "miningCamp",
      "stone",
      Math.ceil(villagerFactor * 0.5)
    );
    this.checkResourceBuildingType(
      "miningCamp",
      "iron",
      Math.ceil(villagerFactor * 0.5)
    );
  }

  /**
   * Check if we need additional resource buildings of a specific type
   * @param {string} buildingType - Type of building
   * @param {string} resourceType - Type of resource
   * @param {number} targetCount - Target number of buildings
   */
  checkResourceBuildingType(buildingType, resourceType, targetCount) {
    // Check current buildings of this type
    const buildings = this.game.entityManager.getEntitiesByTypeAndOwner(
      buildingType,
      this.playerId
    );

    // If we already have enough, skip
    if (buildings.length >= targetCount) return;

    // Check if we have resources of this type
    if (this.state.resourceLocations[resourceType].length === 0) return;

    // Find a good location near resources
    const resourceInfo = this.state.resourceLocations[resourceType][0]; // Use the closest resource
    const resource = this.game.entityManager.getEntityById(resourceInfo.id);

    if (!resource) return;

    // Find a location near the resource
    const location = this.findDropOffLocation(resource);

    if (location) {
      this.queueBuilding(buildingType, {
        location,
        priority: 2,
      });
    }
  }

  /**
   * Update research priorities and queue
   */
  updateResearch() {
    // Check if we can advance to the next age
    this.checkAgeAdvancement();

    // Queue important technologies
    this.queueKeyTechnologies();
  }

  /**
   * Check if we can advance to the next age
   */
  checkAgeAdvancement() {
    const currentAge = this.player.age;
    const maxAge = config.AGE_NAMES.length - 1;

    // If already at max age, nothing to do
    if (currentAge >= maxAge) return;

    // Check if we meet requirements for next age
    const nextAge = currentAge + 1;
    const ageReqs = config.AGE_REQUIREMENTS[nextAge];

    if (!ageReqs) return;

    // Check resource requirements
    if (!this.player.resources.canAfford(ageReqs.resources)) {
      return;
    }

    // Check building requirements
    if (ageReqs.buildings) {
      for (const buildingType of ageReqs.buildings) {
        if (!this.player.hasBuildingType(buildingType)) {
          return;
        }
      }
    }

    // Start age advancement
    this.player.startAgeAdvancement();
  }

  /**
   * Queue important technologies based on strategy
   */
  queueKeyTechnologies() {
    // Only research if we have enough economy
    const resources = this.player.resources;
    const foodAmount = resources.getResource("food");
    const woodAmount = resources.getResource("wood");
    const goldAmount = resources.getResource("gold");

    if (foodAmount < 300 || woodAmount < 300 || goldAmount < 200) {
      return; // Not enough resources
    }

    // Find research buildings
    const researchBuildings = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "building" &&
          entity.canResearch &&
          !entity.isResearching
      );

    if (researchBuildings.length === 0) return;

    // Get all available technologies
    const availableTechs = [];

    for (const building of researchBuildings) {
      if (building.availableResearch) {
        for (const techId of building.availableResearch) {
          const techConfig = config.TECHNOLOGIES[techId];

          if (
            techConfig &&
            techConfig.requiredAge <= this.player.age &&
            this.player.resources.canAfford(techConfig.cost)
          ) {
            // Calculate a score for this tech
            const score = this.calculateTechScore(techId, techConfig);

            availableTechs.push({
              id: techId,
              building: building,
              cost: techConfig.cost,
              score: score,
            });
          }
        }
      }
    }

    if (availableTechs.length === 0) return;

    // Sort by score (highest first)
    availableTechs.sort((a, b) => b.score - a.score);

    // Research the highest scoring tech
    const chosenTech = availableTechs[0];

    this.game.entityManager.executeCommand(
      "research",
      [chosenTech.building.id],
      {
        technologyId: chosenTech.id,
      }
    );
  }

  /**
   * Calculate a score for a technology based on AI strategy
   * @param {string} techId - Technology ID
   * @param {Object} techConfig - Technology configuration
   * @returns {number} Technology score
   */
  calculateTechScore(techId, techConfig) {
    let score = 1.0;

    // Base score by category
    switch (techConfig.category) {
      case "military":
        score *= this.personality.aggressiveness * 2;

        // If under attack, military techs are more important
        if (this.state.underAttack) {
          score *= 1.5;
        }
        break;

      case "economy":
        score *= this.personality.economyFocus * 2;

        // In early game, economy techs are more important
        if (this.state.phase === "early") {
          score *= 1.5;
        }
        break;

      case "utility":
        score *= 1.0;
        break;
    }

    // Adjust based on effects
    if (techConfig.effects) {
      for (const effect of techConfig.effects) {
        switch (effect.type) {
          case "unitStat":
            // Check if this is a preferred unit type
            if (this.personality.preferredMilitaryUnits[effect.unitType]) {
              score *=
                1 +
                this.personality.preferredMilitaryUnits[effect.unitType] * 0.5;
            }
            break;

          case "resourceRate":
            // Resource gathering improvements are valuable
            score *= 1.3;
            break;

          case "buildSpeed":
            // Build speed is good for expansion
            score *= 1 + this.personality.expandingTendency * 0.3;
            break;

          case "movementSpeed":
            // Movement speed helps with map control
            score *= 1.2;
            break;
        }
      }
    }

    // Adjust based on cost
    const totalCost =
      techConfig.cost.food +
      (techConfig.cost.wood || 0) +
      (techConfig.cost.gold || 0) +
      (techConfig.cost.stone || 0) +
      (techConfig.cost.iron || 0);

    score /= Math.sqrt(totalCost / 100); // Expensive techs need higher base score

    // Add some randomness
    score *=
      1 +
      Utils.randFloat(
        -this.params.randomnessFactor,
        this.params.randomnessFactor
      );

    return score;
  }

  /**
   * Update scouting and map exploration
   */
  updateScouting() {
    // Only scout periodically
    const now = Date.now();
    if (this.lastScoutUpdate && now - this.lastScoutUpdate < 30000) {
      return;
    }

    this.lastScoutUpdate = now;

    // In early game, use dedicated scouts
    if (this.state.phase === "early" && !this.state.scouted) {
      this.handleEarlyGameScouting();
    } else {
      // In mid/late game, use military for scouting
      this.handleLateGameScouting();
    }
  }

  /**
   * Handle early game scouting
   */
  handleEarlyGameScouting() {
    // Find scouts or repurpose villagers
    const scouts = this.game.entityManager.getEntitiesByTypeAndOwner(
      "scout",
      this.playerId
    );

    if (scouts.length > 0) {
      // Use existing scouts
      for (const scout of scouts) {
        if (scout.state === "idle") {
          this.assignScoutingMission(scout);
        }
      }
    } else {
      // Check if we should convert a villager to scout
      const villagers = this.game.entityManager.getEntitiesByTypeAndOwner(
        "villager",
        this.playerId
      );

      if (villagers.length >= 6 && !this.state.scoutSent) {
        this.state.scoutSent = true;

        // Use one villager for scouting
        const scoutVillager = villagers[villagers.length - 1];
        this.assignScoutingMission(scoutVillager);
      }
    }
  }

  /**
   * Handle mid/late game scouting
   */
  handleLateGameScouting() {
    // Use small groups for map control and scouting
    const militaryUnits = this.game.entityManager
      .getEntitiesByOwner(this.playerId)
      .filter(
        (entity) =>
          entity.type === "unit" &&
          entity.unitType !== "villager" &&
          entity.state === "idle"
      );

    if (militaryUnits.length < 3) return;

    // Create a small scouting party (2-3 units)
    const scoutPartySize = Math.min(3, Math.floor(militaryUnits.length / 4));

    if (scoutPartySize > 0) {
      const scoutParty = militaryUnits.slice(0, scoutPartySize);

      // Send to unexplored areas or strategic points
      const targetPoint = this.getStrategicScoutingPoint();

      if (targetPoint) {
        // Command scout party to move
        this.game.entityManager.executeCommand(
          "move",
          scoutParty.map((u) => u.id),
          {
            x: targetPoint.x,
            y: targetPoint.y,
          }
        );
      }
    }
  }

  /**
   * Get a strategic point for scouting
   * @returns {Object} Target coordinates
   */
  getStrategicScoutingPoint() {
    // Check for key resources first
    const goldResources = this.game.map.resources.filter(
      (r) => r.resourceType === "gold" && r.amount > 0
    );

    if (goldResources.length > 0) {
      const target = Utils.randomChoice(goldResources);
      return { x: target.x, y: target.y };
    }

    // Check for unexplored areas if fog of war is enabled
    if (this.game.map.fogOfWar) {
      // Prefer areas not yet explored
      const mapWidth = this.game.map.width;
      const mapHeight = this.game.map.height;

      // Try random points until finding an unexplored one
      for (let i = 0; i < 10; i++) {
        const x = Utils.randFloat(0, mapWidth);
        const y = Utils.randFloat(0, mapHeight);

        if (!this.game.map.fogOfWar.isExplored(x, y, this.playerId)) {
          return { x, y };
        }
      }
    }

    // Fallback to a random point on the map
    return {
      x: Utils.randFloat(0, this.game.map.width),
      y: Utils.randFloat(0, this.game.map.height),
    };
  }

  /**
   * Update defensive strategy
   */
  updateDefenses() {
    // Check if still under attack
    const now = Date.now();
    if (this.state.underAttack && now - this.state.lastAttackTime > 60000) {
      // No attacks in the last minute, clear attack state
      this.state.underAttack = false;
    }

    // Update defensive posture
    this.updateDefensivePosture();

    // Plan wall placement if needed
    if (this.state.needWallPlanning) {
      this.planWallPlacement();
    }
  }

  /**
   * Update defensive posture based on threat level
   */
  updateDefensivePosture() {
    // If under attack, recall military to base
    if (this.state.underAttack) {
      // Get military units not already defending
      const militaryUnits = this.game.entityManager
        .getEntitiesByOwner(this.playerId)
        .filter(
          (entity) =>
            entity.type === "unit" &&
            entity.unitType !== "villager" &&
            entity.unitType !== "scout" &&
            entity.state !== "defending"
        );

      // Check if we have enough units to defend
      if (militaryUnits.length >= 3) {
        // Move to attack location
        if (this.state.lastAttackPosition) {
          // Command units to attack-move to position
          this.game.entityManager.executeCommand(
            "attackMove",
            militaryUnits.map((u) => u.id),
            {
              x: this.state.lastAttackPosition.x,
              y: this.state.lastAttackPosition.y,
            }
          );

          // Mark units as defending
          for (const unit of militaryUnits) {
            unit.state = "defending";
          }
        }
      }
    }
  }

  /**
   * Plan wall placement around base
   */
  planWallPlacement() {
    if (!this.state.baseLocation) return;

    this.state.needWallPlanning = false;

    // Generate a rough circle of wall segments around the base
    const base = this.state.baseLocation;
    const radius = 350; // Wall radius
    const segments = 16; // Number of wall segments

    // Place wall segments in a circle
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;

      const x1 = base.x + Math.cos(angle) * radius;
      const y1 = base.y + Math.sin(angle) * radius;

      const x2 = base.x + Math.cos(nextAngle) * radius;
      const y2 = base.y + Math.sin(nextAngle) * radius;

      // Queue wall segment between points
      this.queueWallSegment(x1, y1, x2, y2);
    }

    // Place gates at N, E, S, W positions
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = base.x + Math.cos(angle) * radius;
      const y = base.y + Math.sin(angle) * radius;

      // Queue a gate
      this.queueBuilding("gate", {
        location: { x, y },
        priority: 2,
      });
    }

    this.state.wallsBuilt = true;
  }

  /**
   * Queue a wall segment between two points
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  queueWallSegment(x1, y1, x2, y2) {
    // Calculate midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Calculate distance
    const distance = Utils.distance(x1, y1, x2, y2);

    // Skip if too short
    if (distance < 32) return;

    // Calculate direction
    const dirX = (x2 - x1) / distance;
    const dirY = (y2 - y1) / distance;

    // Place wall segments along the line
    const wallLength = 32; // Length of one wall segment
    const numSegments = Math.floor(distance / wallLength);

    for (let i = 0; i < numSegments; i++) {
      const segX = x1 + dirX * (i * wallLength);
      const segY = y1 + dirY * (i * wallLength);

      // Check if location is suitable
      if (this.isSuitableBuildLocation(segX, segY)) {
        this.queueBuilding("wall", {
          location: { x: segX, y: segY },
          priority: 2,
        });
      }
    }
  }

  /**
   * Update diplomacy with other players
   */
  updateDiplomacy() {
    // This would handle trade, alliances, etc.
    // For now, just handle resource trading if market exists
    this.handleResourceTrading();
  }

  /**
   * Handle resource trading at markets
   */
  handleResourceTrading() {
    // Check if we have a market
    const markets = this.game.entityManager.getEntitiesByTypeAndOwner(
      "market",
      this.playerId
    );

    if (markets.length === 0) return;

    // Check for resource imbalances
    const resources = this.player.resources;

    // Find excess and deficit resources
    let excessResource = null;
    let deficitResource = null;
    let excessAmount = 0;
    let deficitRatio = 0;

    const resourceTypes = ["food", "wood", "gold", "stone", "iron"];

    for (const type of resourceTypes) {
      const amount = resources.getResource(type);
      const rate = resources.getResourceRate(type);

      // Excess: high amount and positive rate
      if (amount > 1000 && rate > 0) {
        if (amount > excessAmount) {
          excessResource = type;
          excessAmount = amount;
        }
      }

      // Deficit: low amount and negative rate
      if (amount < 200 && rate < 0) {
        const ratio = Math.abs(rate) / (amount + 1); // Higher ratio = bigger deficit
        if (ratio > deficitRatio) {
          deficitResource = type;
          deficitRatio = ratio;
        }
      }
    }

    // If we have both excess and deficit, trade
    if (excessResource && deficitResource && excessAmount > 300) {
      // Trade parameters
      const tradeAmount = Math.min(200, excessAmount - 300); // Keep at least 300 in reserve

      // Execute trade command
      this.game.entityManager.executeCommand("trade", [markets[0].id], {
        sellResource: excessResource,
        buyResource: deficitResource,
        amount: tradeAmount,
      });
    }
  }

  /**
   * Handle an attack alert
   * @param {Object} alert - Alert data
   */
  handleAttackAlert(alert) {
    this.state.underAttack = true;
    this.state.lastAttackTime = Date.now();
    this.state.lastAttackPosition = alert.position;

    // Handle immediate defense
    this.defendAttack(alert);
  }

  /**
   * Defend against an attack
   * @param {Object} alert - Attack alert
   */
  defendAttack(alert) {
    // Get nearby military units
    const position = alert.position;
    const radius = 300;

    const nearbyMilitary = this.game.entityManager.getEntitiesInCircle(
      position.x,
      position.y,
      radius,
      (entity) =>
        entity.owner === this.playerId &&
        entity.type === "unit" &&
        entity.unitType !== "villager"
    );

    if (nearbyMilitary.length > 0) {
      // Order units to defend
      this.game.entityManager.executeCommand(
        "attackMove",
        nearbyMilitary.map((u) => u.id),
        {
          x: position.x,
          y: position.y,
        }
      );
    }

    // Get nearby villagers
    const nearbyVillagers = this.game.entityManager.getEntitiesInCircle(
      position.x,
      position.y,
      radius,
      (entity) =>
        entity.owner === this.playerId &&
        entity.type === "unit" &&
        entity.unitType === "villager"
    );

    if (nearbyVillagers.length > 0) {
      // Order villagers to flee to town center or other safe building
      const safeBuildings = this.game.entityManager
        .getEntitiesByOwner(this.playerId)
        .filter(
          (entity) =>
            entity.type === "building" &&
            (entity.buildingType === "townCenter" ||
              entity.buildingType === "tower" ||
              entity.buildingType === "castle")
        );

      if (safeBuildings.length > 0) {
        // Find closest safe building
        let closestBuilding = safeBuildings[0];
        let closestDistance = Utils.distance(
          position.x,
          position.y,
          closestBuilding.x,
          closestBuilding.y
        );

        for (let i = 1; i < safeBuildings.length; i++) {
          const building = safeBuildings[i];
          const distance = Utils.distance(
            position.x,
            position.y,
            building.x,
            building.y
          );

          if (distance < closestDistance) {
            closestBuilding = building;
            closestDistance = distance;
          }
        }

        // Order villagers to flee to safe building
        this.game.entityManager.executeCommand(
          "move",
          nearbyVillagers.map((v) => v.id),
          {
            x: closestBuilding.x,
            y: closestBuilding.y,
          }
        );
      }
    }
  }

  /**
   * Handle an entity being lost (destroyed)
   * @param {Entity} entity - The lost entity
   */
  handleEntityLost(entity) {
    // Update gatherer lists if a villager was lost
    if (entity.type === "unit" && entity.unitType === "villager") {
      this.updateResourceGatherersList();
    }

    // Handle building loss
    if (entity.type === "building") {
      // Queue replacement for critical buildings
      if (
        entity.buildingType === "townCenter" ||
        entity.buildingType === "mill" ||
        entity.buildingType === "lumberCamp" ||
        entity.buildingType === "miningCamp"
      ) {
        this.queueBuilding(entity.buildingType, { priority: 3 });
      }
    }
  }

  /**
   * Handle a resource being depleted
   * @param {Entity} resource - The depleted resource
   */
  handleResourceDepleted(resource) {
    // Remove from resource locations
    for (const type in this.state.resourceLocations) {
      this.state.resourceLocations[type] = this.state.resourceLocations[
        type
      ].filter((r) => r.id !== resource.id);
    }

    // Rebalance gatherers
    this.rebalanceGatherers();
  }

  /**
   * Handle building completion
   * @param {Object} data - Building data
   */
  handleBuildingComplete(data) {
    // If a town center was completed, scan for resources around it
    if (data.buildingType === "townCenter") {
      const building = this.game.entityManager.getEntityById(data.buildingId);

      if (building) {
        // Scan for resources around new town center
        const scanRadius = 500;

        // Find resources within radius
        const resources = this.game.entityManager.getEntitiesInCircle(
          building.x,
          building.y,
          scanRadius,
          (entity) => entity.type === "resource"
        );

        // Add to resource locations
        for (const resource of resources) {
          const resourceType = resource.resourceType;

          if (this.state.resourceLocations[resourceType]) {
            // Check if already known
            const isKnown = this.state.resourceLocations[resourceType].some(
              (r) => r.id === resource.id
            );

            if (!isKnown) {
              this.state.resourceLocations[resourceType].push({
                id: resource.id,
                x: resource.x,
                y: resource.y,
                amount: resource.amount,
                distance: Utils.distance(
                  building.x,
                  building.y,
                  resource.x,
                  resource.y
                ),
              });
            }
          }
        }

        // Sort resources by distance
        for (const type in this.state.resourceLocations) {
          this.state.resourceLocations[type].sort(
            (a, b) => a.distance - b.distance
          );
        }
      }
    }
  }

  /**
   * Handle research completion
   * @param {Object} data - Research data
   */
  handleResearchComplete(data) {
    // Queue dependent technologies if valuable
    if (this.state.focusedResearch) {
      // Find technologies that require this one
      const techId = data.technologyId;
      const relatedTechs = [];

      for (const id in config.TECHNOLOGIES) {
        const tech = config.TECHNOLOGIES[id];

        if (
          tech.requirements &&
          tech.requirements.technologies &&
          tech.requirements.technologies.includes(techId)
        ) {
          relatedTechs.push(id);
        }
      }

      // Find a building that can research these
      for (const relatedTechId of relatedTechs) {
        const relatedTech = config.TECHNOLOGIES[relatedTechId];

        // Skip if too expensive
        if (
          (relatedTech && relatedTech.cost.food > 500) ||
          relatedTech.cost.gold > 500
        ) {
          continue;
        }

        // Find a building that can research this
        const researchBuildings = this.game.entityManager
          .getEntitiesByOwner(this.playerId)
          .filter(
            (entity) =>
              entity.type === "building" &&
              entity.canResearch &&
              entity.availableResearch &&
              entity.availableResearch.includes(relatedTechId)
          );

        if (researchBuildings.length > 0) {
          // Queue research
          this.game.entityManager.executeCommand(
            "research",
            [researchBuildings[0].id],
            {
              technologyId: relatedTechId,
            }
          );

          // Only queue one tech at a time
          break;
        }
      }
    }
  }

  /**
   * Handle age advancement
   * @param {Object} data - Age data
   */
  handleAgeAdvance(data) {
    console.log(`AI player ${this.playerId} advanced to age ${data.newAge}`);

    // Update phase if needed
    if (data.newAge >= 3 && this.state.phase !== "late") {
      this.transitionToPhase("late");
    } else if (data.newAge >= 2 && this.state.phase === "early") {
      this.transitionToPhase("mid");
    }

    // Queue age-specific buildings
    this.queueAgeSpecificBuildings(data.newAge);
  }

  /**
   * Queue age-specific buildings
   * @param {number} age - New age
   */
  queueAgeSpecificBuildings(age) {
    switch (age) {
      case 1: // Stone Age
        // Basic buildings already handled
        break;

      case 2: // Bronze Age
        this.queueBuilding("barracks", { priority: 3 });
        this.queueBuilding("market", { priority: 2 });
        break;

      case 3: // Iron Age
        this.queueBuilding("archeryRange", { priority: 3 });
        this.queueBuilding("stables", { priority: 2 });
        this.queueBuilding("blacksmith", { priority: 2 });
        break;

      case 4: // Imperial Age
        this.queueBuilding("siegeWorkshop", { priority: 3 });
        this.queueBuilding("university", { priority: 2 });
        break;

      case 5: // Eternal Age
        this.planWonder();
        break;
    }
  }

  /**
   * Find a building location
   * @param {string} buildingType - Type of building
   * @returns {Object|null} Location coordinates
   */
  findBuildingLocation(buildingType) {
    // Try to use pre-computed build locations
    if (this.state.buildLocations.length > 0) {
      // Find first suitable location
      for (let i = 0; i < this.state.buildLocations.length; i++) {
        const location = this.state.buildLocations[i];

        // Check if still valid
        if (
          this.game.map.canPlaceBuilding(
            location.x,
            location.y,
            config.BUILDINGS[buildingType].width,
            config.BUILDINGS[buildingType].height
          )
        ) {
          // Remove from available locations
          this.state.buildLocations.splice(i, 1);
          return location;
        }
      }
    }

    // Fallback: search near base
    if (this.state.baseLocation) {
      const base = this.state.baseLocation;

      // Try at different distances
      for (let radius = 100; radius <= 400; radius += 50) {
        const points = this.getPointsInCircle(base.x, base.y, radius, 8);

        for (const point of points) {
          if (
            this.game.map.canPlaceBuilding(
              point.x,
              point.y,
              config.BUILDINGS[buildingType].width,
              config.BUILDINGS[buildingType].height
            )
          ) {
            return point;
          }
        }
      }
    }

    return null;
  }

  /**
   * Clean up AI resources
   */
  cleanup() {
    // Clear all timers
    for (const key in this.timers) {
      if (this.timers[key]) {
        clearInterval(this.timers[key]);
        this.timers[key] = null;
      }
    }

    // Clear references
    this.game = null;
    this.player = null;
    this.state = null;
  }
}
