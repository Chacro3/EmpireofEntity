/**
 * AI Behaviors
 *
 * Defines specific behaviors and strategies for AI players.
 * These are used by the AIPlayer class to customize AI styles.
 */

import { Utils } from "../core/utils.js";

export class AIBehaviors {
  /**
   * Create a repository of AI behaviors
   * @param {Game} game - The game instance
   */
  constructor(game) {
    this.game = game;

    // Register all behavior strategies
    this.strategies = {
      // Economy strategies
      economy: {
        balanced: this.balancedEconomy,
        boomingEconomy: this.boomingEconomy,
        aggressiveEconomy: this.aggressiveEconomy,
        defensiveEconomy: this.defensiveEconomy,
      },

      // Military strategies
      military: {
        balanced: this.balancedMilitary,
        rushStrategy: this.rushStrategy,
        defenseStrategy: this.defenseStrategy,
        turtleStrategy: this.turtleStrategy,
        imperialStrategy: this.imperialStrategy,
      },

      // Build order strategies
      buildOrder: {
        standard: this.standardBuildOrder,
        fastCastle: this.fastCastleBuildOrder,
        rushBuildOrder: this.rushBuildOrder,
        boomBuildOrder: this.boomBuildOrder,
      },

      // Technology strategies
      technology: {
        balanced: this.balancedTechnology,
        militaryFocus: this.militaryTechnology,
        economyFocus: this.economyTechnology,
        imperialFocus: this.imperialTechnology,
      },

      // Unit composition strategies
      unitComposition: {
        balanced: this.balancedArmy,
        infantryHeavy: this.infantryHeavyArmy,
        archerHeavy: this.archerHeavyArmy,
        cavalryHeavy: this.cavalryHeavyArmy,
        siegeHeavy: this.siegeHeavyArmy,
      },
    };
  }

  /**
   * Create a behavior profile based on difficulty and personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @param {string} civilizationType - Type of civilization
   * @returns {Object} Behavior profile
   */
  createBehaviorProfile(personality, difficulty, civilizationType) {
    // Base parameters adjusted by personality and difficulty
    const profile = {
      // Core behavior selections
      economyStrategy: this.selectEconomyStrategy(
        personality,
        civilizationType
      ),
      militaryStrategy: this.selectMilitaryStrategy(
        personality,
        civilizationType
      ),
      buildOrderStrategy: this.selectBuildOrderStrategy(
        personality,
        civilizationType
      ),
      technologyStrategy: this.selectTechnologyStrategy(
        personality,
        civilizationType
      ),
      unitCompositionStrategy: this.selectUnitCompositionStrategy(
        personality,
        civilizationType
      ),

      // Economy parameters
      villagerRatio: this.calculateVillagerRatio(personality, difficulty),
      resourcePriorities: this.calculateResourcePriorities(
        personality,
        civilizationType
      ),
      expansionThreshold: this.calculateExpansionThreshold(
        personality,
        difficulty
      ),

      // Military parameters
      aggressionLevel:
        personality.aggressiveness *
        this.getDifficultyMultiplier(difficulty, "aggression"),
      attackThreshold: this.calculateAttackThreshold(personality, difficulty),
      retreatThreshold: this.calculateRetreatThreshold(personality, difficulty),

      // Timing parameters
      ageUpTiming: this.calculateAgeUpTiming(personality, difficulty),
      attackTimings: this.calculateAttackTimings(personality, difficulty),
    };

    return profile;
  }

  /**
   * Select an economy strategy based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {string} Economy strategy name
   */
  selectEconomyStrategy(personality, civilizationType) {
    // Weigh the options based on personality
    const options = [
      { name: "balanced", weight: 1.0 },
      { name: "boomingEconomy", weight: personality.economyFocus * 1.5 },
      { name: "aggressiveEconomy", weight: personality.aggressiveness * 1.5 },
      { name: "defensiveEconomy", weight: personality.defensiveness * 1.5 },
    ];

    // Adjust weights based on civilization
    if (civilizationType === "solari") {
      // Solari get bonus to gold, prefer aggressive
      options.find((o) => o.name === "aggressiveEconomy").weight += 0.5;
    } else if (civilizationType === "lunari") {
      // Lunari get bonus to research, prefer booming
      options.find((o) => o.name === "boomingEconomy").weight += 0.5;
    }

    // Choose weighted random option
    const weights = options.map((o) => o.weight);
    const index = Utils.weightedRandomIndex(weights);

    return options[index].name;
  }

  /**
   * Select a military strategy based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {string} Military strategy name
   */
  selectMilitaryStrategy(personality, civilizationType) {
    // Weigh the options based on personality
    const options = [
      { name: "balanced", weight: 1.0 },
      { name: "rushStrategy", weight: personality.aggressiveness * 1.5 },
      { name: "defenseStrategy", weight: personality.defensiveness * 1.5 },
      {
        name: "turtleStrategy",
        weight: (personality.defensiveness + personality.economyFocus) * 0.75,
      },
      { name: "imperialStrategy", weight: personality.economyFocus * 1.5 },
    ];

    // Adjust weights based on civilization
    if (civilizationType === "solari") {
      // Solari prefer aggressive strategies
      options.find((o) => o.name === "rushStrategy").weight += 0.5;
    } else if (civilizationType === "lunari") {
      // Lunari prefer defensive strategies
      options.find((o) => o.name === "defenseStrategy").weight += 0.5;
    }

    // Choose weighted random option
    const weights = options.map((o) => o.weight);
    const index = Utils.weightedRandomIndex(weights);

    return options[index].name;
  }

  /**
   * Select a build order strategy based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {string} Build order strategy name
   */
  selectBuildOrderStrategy(personality, civilizationType) {
    // Weigh the options based on personality
    const options = [
      { name: "standard", weight: 1.0 },
      {
        name: "fastCastle",
        weight: (personality.economyFocus + personality.riskTaking) * 0.75,
      },
      { name: "rushBuildOrder", weight: personality.aggressiveness * 1.5 },
      { name: "boomBuildOrder", weight: personality.economyFocus * 1.5 },
    ];

    // Adjust weights based on civilization
    if (civilizationType === "solari") {
      // Solari prefer rush build orders
      options.find((o) => o.name === "rushBuildOrder").weight += 0.5;
    } else if (civilizationType === "lunari") {
      // Lunari prefer booming or fast castle
      options.find((o) => o.name === "boomBuildOrder").weight += 0.3;
      options.find((o) => o.name === "fastCastle").weight += 0.3;
    }

    // Choose weighted random option
    const weights = options.map((o) => o.weight);
    const index = Utils.weightedRandomIndex(weights);

    return options[index].name;
  }

  /**
   * Select a technology strategy based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {string} Technology strategy name
   */
  selectTechnologyStrategy(personality, civilizationType) {
    // Weigh the options based on personality
    const options = [
      { name: "balanced", weight: 1.0 },
      { name: "militaryFocus", weight: personality.aggressiveness * 1.5 },
      { name: "economyFocus", weight: personality.economyFocus * 1.5 },
      {
        name: "imperialFocus",
        weight: (personality.economyFocus + personality.riskTaking) * 0.75,
      },
    ];

    // Adjust weights based on civilization
    if (civilizationType === "solari") {
      // Solari prefer military technology
      options.find((o) => o.name === "militaryFocus").weight += 0.5;
    } else if (civilizationType === "lunari") {
      // Lunari prefer economic technology
      options.find((o) => o.name === "economyFocus").weight += 0.5;
    }

    // Choose weighted random option
    const weights = options.map((o) => o.weight);
    const index = Utils.weightedRandomIndex(weights);

    return options[index].name;
  }

  /**
   * Select a unit composition strategy based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {string} Unit composition strategy name
   */
  selectUnitCompositionStrategy(personality, civilizationType) {
    // Get preferred unit type from personality
    const preferredUnits = personality.preferredMilitaryUnits;

    // Find the most preferred unit type
    let highestPreference = 0;
    let mostPreferredType = "balanced";

    for (const [unitType, preference] of Object.entries(preferredUnits)) {
      if (preference > highestPreference) {
        highestPreference = preference;

        // Map unit type to composition strategy
        switch (unitType) {
          case "spearman":
          case "swordsman":
            mostPreferredType = "infantryHeavy";
            break;
          case "archer":
            mostPreferredType = "archerHeavy";
            break;
          case "cavalry":
            mostPreferredType = "cavalryHeavy";
            break;
          case "siege":
            mostPreferredType = "siegeHeavy";
            break;
          default:
            mostPreferredType = "balanced";
        }
      }
    }

    // Adjust based on civilization
    if (civilizationType === "solari" && Utils.randFloat(0, 1) < 0.6) {
      return "cavalryHeavy"; // Solari often favor cavalry
    } else if (civilizationType === "lunari" && Utils.randFloat(0, 1) < 0.6) {
      return "archerHeavy"; // Lunari often favor archers
    }

    return mostPreferredType;
  }

  /**
   * Calculate the optimal villager ratio based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {Object} Villager ratio throughout game phases
   */
  calculateVillagerRatio(personality, difficulty) {
    // Base ratios by game phase
    const baseRatios = {
      early: 0.8, // 80% of population in early game
      mid: 0.6, // 60% in mid game
      late: 0.4, // 40% in late game
    };

    // Adjust based on economy focus (higher = more villagers)
    const economyFactor = 0.7 + personality.economyFocus * 0.6;

    // Adjust based on difficulty (higher = more efficient)
    const difficultyMultiplier = this.getDifficultyMultiplier(
      difficulty,
      "economy"
    );

    return {
      early: Math.min(
        0.95,
        baseRatios.early * economyFactor * difficultyMultiplier
      ),
      mid: Math.min(0.8, baseRatios.mid * economyFactor * difficultyMultiplier),
      late: Math.min(
        0.6,
        baseRatios.late * economyFactor * difficultyMultiplier
      ),
    };
  }

  /**
   * Calculate resource priorities based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} civilizationType - Type of civilization
   * @returns {Object} Resource priorities
   */
  calculateResourcePriorities(personality, civilizationType) {
    // Base priorities
    const basePriorities = {
      food: 1.0,
      wood: 1.0,
      gold: 1.0,
      stone: 0.7,
      iron: 0.7,
    };

    // Adjust based on preferred resource ratio from personality
    const preferredRatio = personality.preferResourceRatio;

    // Combine with base priorities
    const priorities = {};
    for (const resource in basePriorities) {
      priorities[resource] =
        basePriorities[resource] * (preferredRatio[resource] || 1.0);
    }

    // Adjust based on civilization
    if (civilizationType === "solari") {
      // Solari get bonus to gold
      priorities.gold *= 1.2;
    } else if (civilizationType === "lunari") {
      // Lunari get bonus to stone and iron
      priorities.stone *= 1.2;
      priorities.iron *= 1.2;
    }

    // Adjust based on aggression (more aggressive = more gold for military)
    if (personality.aggressiveness > 0.6) {
      priorities.food *= 1.1;
      priorities.gold *= 1.1;
      priorities.wood *= 0.9;
    }

    // Adjust based on expanding tendency (more expanding = more wood and stone)
    if (personality.expandingTendency > 0.6) {
      priorities.wood *= 1.1;
      priorities.stone *= 1.1;
    }

    return priorities;
  }

  /**
   * Calculate expansion threshold based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {number} Expansion threshold
   */
  calculateExpansionThreshold(personality, difficulty) {
    // Base threshold (villager count before expanding)
    let baseThreshold = 20;

    // Adjust based on expanding tendency (lower = expand earlier)
    baseThreshold -= personality.expandingTendency * 10;

    // Adjust based on difficulty (harder = expand earlier)
    const difficultyAdjustment = {
      easy: 5,
      medium: 0,
      hard: -5,
      expert: -8,
    };

    baseThreshold += difficultyAdjustment[difficulty] || 0;

    // Clamp to reasonable values
    return Math.max(12, Math.min(30, baseThreshold));
  }

  /**
   * Calculate attack threshold based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {number} Attack threshold (military units)
   */
  calculateAttackThreshold(personality, difficulty) {
    // Base threshold (military units before attacking)
    let baseThreshold = 10;

    // Adjust based on aggressiveness (lower = attack earlier)
    baseThreshold -= personality.aggressiveness * 5;

    // Adjust based on risk taking (lower = more willing to attack with fewer units)
    baseThreshold -= personality.riskTaking * 3;

    // Adjust based on difficulty (harder = more efficient attacks)
    const difficultyAdjustment = {
      easy: 4,
      medium: 0,
      hard: -3,
      expert: -5,
    };

    baseThreshold += difficultyAdjustment[difficulty] || 0;

    // Clamp to reasonable values
    return Math.max(3, Math.min(20, baseThreshold));
  }

  /**
   * Calculate retreat threshold based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {number} Retreat threshold (HP percentage)
   */
  calculateRetreatThreshold(personality, difficulty) {
    // Base threshold (HP percentage before retreating)
    let baseThreshold = 0.3;

    // Adjust based on aggressiveness (lower = retreat later)
    baseThreshold -= personality.aggressiveness * 0.1;

    // Adjust based on risk taking (lower = more willing to fight to the death)
    baseThreshold -= personality.riskTaking * 0.1;

    // Adjust based on difficulty (harder = more efficient decisions)
    const difficultyAdjustment = {
      easy: 0.1,
      medium: 0,
      hard: -0.05,
      expert: -0.1,
    };

    baseThreshold += difficultyAdjustment[difficulty] || 0;

    // Clamp to reasonable values
    return Math.max(0.1, Math.min(0.5, baseThreshold));
  }

  /**
   * Calculate age up timing based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {Object} Age up timing (villager count for each age)
   */
  calculateAgeUpTiming(personality, difficulty) {
    // Base timings (villager count before advancing age)
    const baseTimings = {
      age2: 20, // Advance to Bronze Age at 20 villagers
      age3: 35, // Advance to Iron Age at 35 villagers
      age4: 50, // Advance to Imperial Age at 50 villagers
      age5: 70, // Advance to Eternal Age at 70 villagers
    };

    // Adjust based on economy focus (higher = age up later with more economy)
    const economyFactor = 1 + (personality.economyFocus - 0.5) * 0.4;

    // Adjust based on aggression (higher = age up earlier for military)
    const aggressionFactor = 1 - (personality.aggressiveness - 0.5) * 0.4;

    // Combine factors
    const combinedFactor = economyFactor * aggressionFactor;

    // Apply difficulty adjustment
    const difficultyMultiplier = this.getDifficultyMultiplier(
      difficulty,
      "ageUp"
    );

    return {
      age2: Math.round(
        baseTimings.age2 * combinedFactor * difficultyMultiplier
      ),
      age3: Math.round(
        baseTimings.age3 * combinedFactor * difficultyMultiplier
      ),
      age4: Math.round(
        baseTimings.age4 * combinedFactor * difficultyMultiplier
      ),
      age5: Math.round(
        baseTimings.age5 * combinedFactor * difficultyMultiplier
      ),
    };
  }

  /**
   * Calculate attack timings based on personality
   * @param {Object} personality - AI personality traits
   * @param {string} difficulty - Difficulty level
   * @returns {Object} Attack timings
   */
  calculateAttackTimings(personality, difficulty) {
    // Base timings (game time in minutes)
    const baseTimings = {
      firstAttack: 10, // First attack at 10 minutes
      secondAttack: 20, // Second attack at 20 minutes
      majorAttack: 30, // Major attack at 30 minutes
      continuousAttacks: 40, // Continuous attacks after 40 minutes
    };

    // Adjust based on aggressiveness (lower = earlier attacks)
    const aggressionFactor = 1 - (personality.aggressiveness - 0.5) * 0.5;

    // Apply difficulty adjustment
    const difficultyMultiplier = this.getDifficultyMultiplier(
      difficulty,
      "attack"
    );

    // Combined factor
    const factor = aggressionFactor * difficultyMultiplier;

    return {
      firstAttack: Math.round(baseTimings.firstAttack * factor),
      secondAttack: Math.round(baseTimings.secondAttack * factor),
      majorAttack: Math.round(baseTimings.majorAttack * factor),
      continuousAttacks: Math.round(baseTimings.continuousAttacks * factor),
    };
  }

  /**
   * Get a difficulty multiplier for various aspects
   * @param {string} difficulty - Difficulty level
   * @param {string} aspect - Aspect to adjust
   * @returns {number} Multiplier
   */
  getDifficultyMultiplier(difficulty, aspect) {
    // Default multipliers by difficulty
    const multipliers = {
      easy: {
        economy: 1.2, // Needs more villagers
        aggression: 0.8, // Less aggressive
        ageUp: 1.2, // Ages up later
        attack: 1.3, // Attacks later
      },
      medium: {
        economy: 1.0,
        aggression: 1.0,
        ageUp: 1.0,
        attack: 1.0,
      },
      hard: {
        economy: 0.9, // Needs fewer villagers
        aggression: 1.2, // More aggressive
        ageUp: 0.9, // Ages up earlier
        attack: 0.8, // Attacks earlier
      },
      expert: {
        economy: 0.8, // Very efficient economy
        aggression: 1.4, // Very aggressive
        ageUp: 0.8, // Ages up much earlier
        attack: 0.7, // Attacks much earlier
      },
    };

    // Get multiplier for the specified aspect
    return multipliers[difficulty]?.[aspect] || 1.0;
  }

  /**
   * Apply a behavior to an AI player
   * @param {AIPlayer} aiPlayer - The AI player
   * @param {string} behaviorType - Type of behavior
   * @param {string} behaviorName - Name of behavior
   */
  applyBehavior(aiPlayer, behaviorType, behaviorName) {
    // Get the behavior function
    const behaviorFn = this.strategies[behaviorType]?.[behaviorName];

    if (typeof behaviorFn === "function") {
      // Apply the behavior to the AI player
      behaviorFn.call(this, aiPlayer);
    } else {
      console.warn(`Unknown behavior: ${behaviorType}.${behaviorName}`);
    }
  }

  /**
   * Apply a complete behavior profile to an AI
   * @param {AIPlayer} aiPlayer - The AI player
   * @param {Object} profile - Behavior profile
   */
  applyBehaviorProfile(aiPlayer, profile) {
    // Apply each strategy from the profile
    this.applyBehavior(aiPlayer, "economy", profile.economyStrategy);
    this.applyBehavior(aiPlayer, "military", profile.militaryStrategy);
    this.applyBehavior(aiPlayer, "buildOrder", profile.buildOrderStrategy);
    this.applyBehavior(aiPlayer, "technology", profile.technologyStrategy);
    this.applyBehavior(
      aiPlayer,
      "unitComposition",
      profile.unitCompositionStrategy
    );

    // Apply numerical parameters
    aiPlayer.params.villagerRatio = profile.villagerRatio;

    // Update resource priorities
    for (const resource in profile.resourcePriorities) {
      aiPlayer.params[`${resource}Priority`] =
        profile.resourcePriorities[resource];
    }

    // Update military parameters
    aiPlayer.params.retreatHealthThreshold = profile.retreatThreshold;
    aiPlayer.params.groupSizeThreshold = profile.attackThreshold;

    // Save the profile for future reference
    aiPlayer.behaviorProfile = profile;
  }

  //==========================================================================
  // Economy Strategies
  //==========================================================================

  /**
   * Balanced economy strategy
   * @param {AIPlayer} ai - AI player
   */
  balancedEconomy(ai) {
    // Balanced distribution with slight focus on food and wood
    ai.adjustResourcePriorities({
      food: 1.1,
      wood: 1.1,
      gold: 1.0,
      stone: 0.8,
      iron: 0.8,
    });

    // Queue basic economic buildings
    if (ai.state.phase === "early") {
      ai.queueBuilding("mill", { priority: 3 });
      ai.queueBuilding("lumberCamp", { priority: 3 });
    }

    // Schedule market for mid game
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
        .length
    ) {
      ai.queueBuilding("market", { priority: 2 });
    }
  }

  /**
   * Booming economy strategy (heavy focus on economic growth)
   * @param {AIPlayer} ai - AI player
   */
  boomingEconomy(ai) {
    // Strong emphasis on resource gathering and expansion
    ai.adjustResourcePriorities({
      food: 1.2,
      wood: 1.2,
      gold: 0.8,
      stone: 0.7,
      iron: 0.7,
    });

    // Queue extra economic buildings
    if (ai.state.phase === "early") {
      ai.queueBuilding("mill", { priority: 3 });
      ai.queueBuilding("lumberCamp", { priority: 3 });
    }

    // Queue additional town centers in mid game
    if (ai.state.phase === "mid") {
      const townCenters = ai.game.entityManager.getEntitiesByTypeAndOwner(
        "townCenter",
        ai.playerId
      );

      if (townCenters.length < 2) {
        ai.queueBuilding("townCenter", { priority: 3 });
      }
    }

    // Schedule market and more resource buildings
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
        .length
    ) {
      ai.queueBuilding("market", { priority: 3 });
    }

    // More aggressive villager production
    ai.params.minVillagerRatio = 0.7; // Higher villager ratio
  }

  /**
   * Aggressive economy strategy (focus on military support)
   * @param {AIPlayer} ai - AI player
   */
  aggressiveEconomy(ai) {
    // Focus on resources needed for military
    ai.adjustResourcePriorities({
      food: 1.3,
      wood: 0.9,
      gold: 1.3,
      stone: 0.6,
      iron: 1.1,
    });

    // Queue basic economy buildings with lower priority
    if (ai.state.phase === "early") {
      ai.queueBuilding("mill", { priority: 2 });
      ai.queueBuilding("lumberCamp", { priority: 2 });
    }

    // Earlier blacksmith
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner(
        "blacksmith",
        ai.playerId
      ).length
    ) {
      ai.queueBuilding("blacksmith", { priority: 3 });
    }

    // Lower villager ratio to focus on military
    ai.params.minVillagerRatio = 0.5;
  }

  /**
   * Defensive economy strategy (focus on steady growth and defense)
   * @param {AIPlayer} ai - AI player
   */
  defensiveEconomy(ai) {
    // Focus on resources needed for defense and steady growth
    ai.adjustResourcePriorities({
      food: 1.0,
      wood: 1.2,
      gold: 0.8,
      stone: 1.3,
      iron: 0.9,
    });

    // Queue basic economy buildings
    if (ai.state.phase === "early") {
      ai.queueBuilding("mill", { priority: 3 });
      ai.queueBuilding("lumberCamp", { priority: 3 });
    }

    // Queue defensive structures
    if (ai.state.phase === "mid") {
      ai.planDefensiveStructures();
    }

    // Moderate villager ratio
    ai.params.minVillagerRatio = 0.6;
  }

  //==========================================================================
  // Military Strategies
  //==========================================================================

  /**
   * Balanced military strategy
   * @param {AIPlayer} ai - AI player
   */
  balancedMilitary(ai) {
    // Moderate aggression and defense
    ai.params.aggressiveness = 0.5;
    ai.params.defensiveness = 0.5;

    // Standard thresholds
    ai.params.retreatHealthThreshold = 0.3;
    ai.params.groupSizeThreshold = 8;

    // Queue military buildings at moderate priority
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      ai.queueBuilding("archeryRange", { priority: 2 });
      ai.queueBuilding("stables", { priority: 2 });
    } else if (ai.state.phase === "late") {
      ai.queueBuilding("siegeWorkshop", { priority: 2 });
    }
  }

  /**
   * Rush strategy (early aggression)
   * @param {AIPlayer} ai - AI player
   */
  rushStrategy(ai) {
    // High aggression, low defense
    ai.params.aggressiveness = 0.8;
    ai.params.defensiveness = 0.3;

    // More willing to take risks
    ai.params.retreatHealthThreshold = 0.2;
    ai.params.groupSizeThreshold = 5; // Attack with fewer units

    // Early military buildings with high priority
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 3 });

      // Train military units as soon as barracks is built
      const barracks = ai.game.entityManager.getEntitiesByTypeAndOwner(
        "barracks",
        ai.playerId
      );
      if (barracks.length > 0 && !barracks[0].isTraining) {
        ai.game.entityManager.executeCommand("train", [barracks[0].id], {
          unitType: "spearman",
        });
      }
    }

    // Queue forward military buildings if in mid-game
    if (ai.state.phase === "mid") {
      // Find a forward position
      if (ai.state.baseLocation) {
        const enemyBases = ai.getEnemyBaseLocations();

        if (enemyBases.length > 0) {
          // Get direction to closest enemy base
          const enemyBase = enemyBases[0];
          const dx = enemyBase.x - ai.state.baseLocation.x;
          const dy = enemyBase.y - ai.state.baseLocation.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Find a position 2/3 of the way to enemy
          const forwardX = ai.state.baseLocation.x + dx * 0.66;
          const forwardY = ai.state.baseLocation.y + dy * 0.66;

          // Queue forward barracks
          ai.queueBuilding("barracks", {
            location: { x: forwardX, y: forwardY },
            priority: 3,
          });
        }
      }
    }
  }

  /**
   * Defense strategy (focus on protecting territory)
   * @param {AIPlayer} ai - AI player
   */
  defenseStrategy(ai) {
    // Low aggression, high defense
    ai.params.aggressiveness = 0.3;
    ai.params.defensiveness = 0.8;

    // More conservative in combat
    ai.params.retreatHealthThreshold = 0.4;
    ai.params.groupSizeThreshold = 10; // Larger army before attacking

    // Queue defensive buildings with high priority
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      // Queue watchtowers
      ai.planWatchtowers(4);

      // Queue archery range for ranged defense
      ai.queueBuilding("archeryRange", { priority: 3 });
    }

    // Plan walls in mid-game
    if (ai.state.phase === "mid" && !ai.state.wallsBuilt) {
      ai.planWalls();
    }
  }

  /**
   * Turtle strategy (extreme defensive focus)
   * @param {AIPlayer} ai - AI player
   */
  turtleStrategy(ai) {
    // Very low aggression, very high defense
    ai.params.aggressiveness = 0.2;
    ai.params.defensiveness = 0.9;

    // Very conservative in combat
    ai.params.retreatHealthThreshold = 0.5;
    ai.params.groupSizeThreshold = 15; // Very large army before attacking

    // Focus on resource gathering
    ai.adjustResourcePriorities({
      food: 1.0,
      wood: 1.2,
      gold: 0.8,
      stone: 1.5, // High stone priority for walls and towers
      iron: 0.7,
    });

    // Queue defensive buildings with very high priority
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      // Queue multiple watchtowers
      ai.planWatchtowers(6);

      // Queue walls immediately
      if (!ai.state.wallsBuilt) {
        ai.planWalls();
      }
    }

    // Higher garrisoning ratio
    ai.params.minGarrisonRatio = 0.3; // Keep more units for defense
  }

  /**
   * Imperial strategy (focus on reaching late game)
   * @param {AIPlayer} ai - AI player
   */
  imperialStrategy(ai) {
    // Moderate aggression and defense
    ai.params.aggressiveness = 0.4;
    ai.params.defensiveness = 0.6;

    // Standard combat parameters
    ai.params.retreatHealthThreshold = 0.3;
    ai.params.groupSizeThreshold = 10;

    // Focus on resources needed for advancing ages
    ai.adjustResourcePriorities({
      food: 1.2,
      wood: 1.1,
      gold: 1.2,
      stone: 0.8,
      iron: 0.7,
    });

    // Queue required buildings for age advancement
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      ai.queueBuilding("market", { priority: 3 });
      ai.queueBuilding("blacksmith", { priority: 3 });
    } else if (ai.state.phase === "late") {
      ai.queueBuilding("university", { priority: 3 });
    }

    // Focus on age advancement research
    ai.state.focusedResearch = true;
  }

  //==========================================================================
  // Build Order Strategies
  //==========================================================================

  /**
   * Standard build order
   * @param {AIPlayer} ai - AI player
   */
  standardBuildOrder(ai) {
    // Early game build order
    if (ai.state.phase === "early") {
      // First 6 villagers on food
      if (ai.getVillagerCount() < 6) {
        ai.focusGatherers("food");
      }
      // Next 3 on wood
      else if (ai.getVillagerCount() < 9) {
        ai.focusGatherers("wood");
      }
      // Next 3 on gold
      else if (ai.getVillagerCount() < 12) {
        ai.focusGatherers("gold");
      }
      // Next 4 on food
      else if (ai.getVillagerCount() < 16) {
        ai.focusGatherers("food");
      }

      // Build order
      if (ai.getVillagerCount() >= 6) {
        ai.queueBuilding("house", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 10) {
        ai.queueBuilding("lumberCamp", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 12) {
        ai.queueBuilding("barracks", { priority: 2 });
      }
      if (ai.getVillagerCount() >= 14) {
        ai.queueBuilding("mill", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 20) {
        // Consider age advancement
        ai.checkAgeAdvancement();
      }
    }
    // Mid game build order
    else if (ai.state.phase === "mid") {
      // More balanced economy
      ai.rebalanceGatherers();

      // Build military and economy buildings
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "archeryRange",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("archeryRange", { priority: 2 });
      }
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
          .length
      ) {
        ai.queueBuilding("market", { priority: 2 });
      }
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "blacksmith",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("blacksmith", { priority: 2 });
      }

      // Consider researching important technologies
      ai.queueKeyTechnologies();
    }
  }

  /**
   * Fast Castle build order (quick advancement to Castle Age)
   * @param {AIPlayer} ai - AI player
   */
  fastCastleBuildOrder(ai) {
    // Early game - focus on economy and minimal defense
    if (ai.state.phase === "early") {
      // First 8 villagers on food
      if (ai.getVillagerCount() < 8) {
        ai.focusGatherers("food");
      }
      // Next 6 on wood
      else if (ai.getVillagerCount() < 14) {
        ai.focusGatherers("wood");
      }
      // Next 6 on gold
      else if (ai.getVillagerCount() < 20) {
        ai.focusGatherers("gold");
      }

      // Build order
      if (ai.getVillagerCount() >= 6) {
        ai.queueBuilding("house", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 10) {
        ai.queueBuilding("lumberCamp", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 14) {
        ai.queueBuilding("mill", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 16) {
        ai.queueBuilding("barracks", { priority: 2 }); // Only one military building
      }
      if (ai.getVillagerCount() >= 20) {
        // Put high priority on age advancement
        ai.checkAgeAdvancement();
      }
    }
    // Mid game - rush to Age 3
    else if (ai.state.phase === "mid") {
      // Focus resources for next age
      ai.adjustResourcePriorities({
        food: 1.3,
        wood: 1.0,
        gold: 1.3,
        stone: 0.6,
        iron: 0.8,
      });

      // Build requirements for next age
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
          .length
      ) {
        ai.queueBuilding("market", { priority: 3 });
      }
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "blacksmith",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("blacksmith", { priority: 3 });
      }

      // Minimal military investment
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "archeryRange",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("archeryRange", { priority: 1 });
      }

      // Focus on age advancement
      ai.checkAgeAdvancement();
    }
  }

  /**
   * Rush build order (early military pressure)
   * @param {AIPlayer} ai - AI player
   */
  rushBuildOrder(ai) {
    // Early game - focus on quick military
    if (ai.state.phase === "early") {
      // First 5 villagers on food
      if (ai.getVillagerCount() < 5) {
        ai.focusGatherers("food");
      }
      // Next 3 on wood
      else if (ai.getVillagerCount() < 8) {
        ai.focusGatherers("wood");
      }
      // Next 3 on gold
      else if (ai.getVillagerCount() < 11) {
        ai.focusGatherers("gold");
      }
      // Rest on food
      else {
        ai.focusGatherers("food");
      }

      // Aggressive build order
      if (ai.getVillagerCount() >= 5) {
        ai.queueBuilding("house", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 8) {
        ai.queueBuilding("lumberCamp", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 9) {
        ai.queueBuilding("barracks", { priority: 3 }); // Earlier barracks with higher priority
      }
      if (ai.getVillagerCount() >= 11) {
        ai.queueBuilding("mill", { priority: 2 });
      }
      if (ai.getVillagerCount() >= 12) {
        // Train military units immediately
        const barracks = ai.game.entityManager.getEntitiesByTypeAndOwner(
          "barracks",
          ai.playerId
        );
        if (barracks.length > 0 && !barracks[0].isTraining) {
          ai.game.entityManager.executeCommand("train", [barracks[0].id], {
            unitType: "spearman",
          });
        }
      }
    }
    // Mid game - focus on military pressure
    else if (ai.state.phase === "mid") {
      // Resource priority for military
      ai.adjustResourcePriorities({
        food: 1.3,
        wood: 1.0,
        gold: 1.3,
        stone: 0.7,
        iron: 1.0,
      });

      // Aggressive military build-up
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "archeryRange",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("archeryRange", { priority: 3 });
      }
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner("barracks", ai.playerId)
          .length < 2
      ) {
        ai.queueBuilding("barracks", { priority: 3 }); // Second barracks
      }
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "blacksmith",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("blacksmith", { priority: 3 });
      }

      // Research military techs
      ai.state.focusedResearch = true;
    }
  }

  /**
   * Boom build order (economy-focused expansion)
   * @param {AIPlayer} ai - AI player
   */
  boomBuildOrder(ai) {
    // Early game - maximize economy
    if (ai.state.phase === "early") {
      // First 7 villagers on food
      if (ai.getVillagerCount() < 7) {
        ai.focusGatherers("food");
      }
      // Next 5 on wood
      else if (ai.getVillagerCount() < 12) {
        ai.focusGatherers("wood");
      }
      // Next 3 on gold
      else if (ai.getVillagerCount() < 15) {
        ai.focusGatherers("gold");
      }
      // Rest balanced between food and wood
      else if (ai.getVillagerCount() < 20) {
        if (ai.getVillagerCount() % 2 === 0) {
          ai.focusGatherers("food");
        } else {
          ai.focusGatherers("wood");
        }
      }

      // Economy-focused build order
      if (ai.getVillagerCount() >= 6) {
        ai.queueBuilding("house", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 9) {
        ai.queueBuilding("lumberCamp", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 11) {
        ai.queueBuilding("mill", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 15) {
        ai.queueBuilding("house", { priority: 3 });
      }
      if (ai.getVillagerCount() >= 16) {
        ai.queueBuilding("barracks", { priority: 2 }); // Later barracks with lower priority
      }
    }
    // Mid game - economic expansion
    else if (ai.state.phase === "mid") {
      // Resource priority for economy and expansion
      ai.adjustResourcePriorities({
        food: 1.2,
        wood: 1.3,
        gold: 0.9,
        stone: 0.9,
        iron: 0.7,
      });

      // Economy buildings have higher priority
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
          .length
      ) {
        ai.queueBuilding("market", { priority: 3 });
      }

      // Second town center for boom
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner(
          "townCenter",
          ai.playerId
        ).length < 2
      ) {
        ai.queueBuilding("townCenter", { priority: 3 });
      }

      // Additional resource buildings
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner("mill", ai.playerId)
          .length < 2
      ) {
        ai.queueBuilding("mill", { priority: 3 });
      }
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner(
          "lumberCamp",
          ai.playerId
        ).length < 2
      ) {
        ai.queueBuilding("lumberCamp", { priority: 3 });
      }

      // Minimal military
      if (
        !ai.game.entityManager.getEntitiesByTypeAndOwner(
          "archeryRange",
          ai.playerId
        ).length
      ) {
        ai.queueBuilding("archeryRange", { priority: 2 });
      }
    }
  }

  //==========================================================================
  // Technology Strategies
  //==========================================================================

  /**
   * Balanced technology strategy
   * @param {AIPlayer} ai - AI player
   */
  balancedTechnology(ai) {
    // Equal research priorities
    ai.params.economyResearchPriority = 0.5;
    ai.params.militaryResearchPriority = 0.5;

    // Focus on core technologies in both areas
    if (ai.state.phase === "early") {
      // Early game: resource gathering improvements
      ai.focusOnTechCategory("economy");
    } else if (ai.state.phase === "mid") {
      // Mid game: military upgrades and economy
      if (ai.game.time % 2 === 0) {
        ai.focusOnTechCategory("military");
      } else {
        ai.focusOnTechCategory("economy");
      }
    } else if (ai.state.phase === "late") {
      // Late game: advanced military and utility
      if (ai.game.time % 2 === 0) {
        ai.focusOnTechCategory("military");
      } else {
        ai.focusOnTechCategory("utility");
      }
    }
  }

  /**
   * Military technology strategy (focus on combat upgrades)
   * @param {AIPlayer} ai - AI player
   */
  militaryTechnology(ai) {
    // Higher military research priority
    ai.params.economyResearchPriority = 0.3;
    ai.params.militaryResearchPriority = 0.7;

    // Focus on offensive technologies
    if (ai.state.phase === "early") {
      // Early game: basic military
      ai.focusOnTechCategory("military");
    } else if (ai.state.phase === "mid") {
      // Mid game: focus on unit upgrades
      ai.focusOnTechTypes(["damage", "armor", "attack speed"]);
    } else if (ai.state.phase === "late") {
      // Late game: advanced military and siege
      ai.focusOnTechTypes(["siege damage", "advanced weapons"]);
    }

    // Earlier blacksmith
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner(
        "blacksmith",
        ai.playerId
      ).length
    ) {
      ai.queueBuilding("blacksmith", { priority: 3 });
    }
  }

  /**
   * Economy technology strategy (focus on resource gathering)
   * @param {AIPlayer} ai - AI player
   */
  economyTechnology(ai) {
    // Higher economy research priority
    ai.params.economyResearchPriority = 0.7;
    ai.params.militaryResearchPriority = 0.3;

    // Focus on economy technologies
    if (ai.state.phase === "early") {
      // Early game: gathering rate improvements
      ai.focusOnTechTypes(["gather rate", "carry capacity"]);
    } else if (ai.state.phase === "mid") {
      // Mid game: advanced economy
      ai.focusOnTechTypes(["resource generation", "build speed"]);
    } else if (ai.state.phase === "late") {
      // Late game: resource efficiency
      ai.focusOnTechTypes(["trade efficiency", "resource efficiency"]);
    }

    // Earlier market
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner("market", ai.playerId)
        .length
    ) {
      ai.queueBuilding("market", { priority: 3 });
    }
  }

  /**
   * Imperial technology strategy (focus on age advancement)
   * @param {AIPlayer} ai - AI player
   */
  imperialTechnology(ai) {
    // Balanced research priorities but focused on advancement
    ai.params.economyResearchPriority = 0.5;
    ai.params.militaryResearchPriority = 0.5;

    // Focus on technologies required for age advancement
    if (ai.state.phase === "early") {
      // Early game: key bronze age techs
      ai.focusOnTechsForAgeAdvancement(2);
    } else if (ai.state.phase === "mid") {
      // Mid game: key iron age techs
      ai.focusOnTechsForAgeAdvancement(3);
    } else if (ai.state.phase === "late") {
      // Late game: key imperial techs
      ai.focusOnTechsForAgeAdvancement(4);
    }

    // Make sure we have buildings needed for next age
    ai.checkBuildingsForNextAge();
  }

  //==========================================================================
  // Unit Composition Strategies
  //==========================================================================

  /**
   * Balanced army composition
   * @param {AIPlayer} ai - AI player
   */
  balancedArmy(ai) {
    // Even distribution of unit types
    ai.setUnitProductionRatios({
      spearman: 0.2,
      archer: 0.2,
      swordsman: 0.2,
      cavalry: 0.2,
      siege: 0.1,
      special: 0.1,
    });

    // All military buildings
    if (ai.state.phase === "mid") {
      ai.queueBuilding("barracks", { priority: 2 });
      ai.queueBuilding("archeryRange", { priority: 2 });

      if (ai.player.age >= 2) {
        ai.queueBuilding("stables", { priority: 2 });
      }
    } else if (ai.state.phase === "late") {
      ai.queueBuilding("siegeWorkshop", { priority: 2 });
    }
  }

  /**
   * Infantry-heavy army composition
   * @param {AIPlayer} ai - AI player
   */
  infantryHeavyArmy(ai) {
    // Focus on infantry units
    ai.setUnitProductionRatios({
      spearman: 0.3,
      swordsman: 0.4,
      archer: 0.1,
      cavalry: 0.1,
      siege: 0.05,
      special: 0.05,
    });

    // Prioritize barracks
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 3 });
    } else if (ai.state.phase === "mid") {
      // Multiple barracks
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner("barracks", ai.playerId)
          .length < 2
      ) {
        ai.queueBuilding("barracks", { priority: 3 });
      }

      // Other military buildings with lower priority
      ai.queueBuilding("archeryRange", { priority: 1 });
      if (ai.player.age >= 2) {
        ai.queueBuilding("stables", { priority: 1 });
      }
    }

    // Earlier blacksmith for infantry upgrades
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner(
        "blacksmith",
        ai.playerId
      ).length
    ) {
      ai.queueBuilding("blacksmith", { priority: 3 });
    }
  }

  /**
   * Archer-heavy army composition
   * @param {AIPlayer} ai - AI player
   */
  archerHeavyArmy(ai) {
    // Focus on archer units
    ai.setUnitProductionRatios({
      archer: 0.5,
      spearman: 0.2,
      swordsman: 0.1,
      cavalry: 0.1,
      siege: 0.05,
      special: 0.05,
    });

    // Prioritize archery range
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      ai.queueBuilding("archeryRange", { priority: 3 });

      // Multiple archery ranges
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner(
          "archeryRange",
          ai.playerId
        ).length < 2
      ) {
        ai.queueBuilding("archeryRange", { priority: 3 });
      }

      // Other military buildings with lower priority
      if (ai.player.age >= 2) {
        ai.queueBuilding("stables", { priority: 1 });
      }
    }

    // Earlier blacksmith for archer upgrades
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner(
        "blacksmith",
        ai.playerId
      ).length
    ) {
      ai.queueBuilding("blacksmith", { priority: 3 });
    }
  }

  /**
   * Cavalry-heavy army composition
   * @param {AIPlayer} ai - AI player
   */
  cavalryHeavyArmy(ai) {
    // Focus on cavalry units
    ai.setUnitProductionRatios({
      cavalry: 0.5,
      spearman: 0.1,
      swordsman: 0.1,
      archer: 0.2,
      siege: 0.05,
      special: 0.05,
    });

    // Basic barracks in early game
    if (ai.state.phase === "early") {
      ai.queueBuilding("barracks", { priority: 2 });
    } else if (ai.state.phase === "mid") {
      // Prioritize stables
      if (ai.player.age >= 2) {
        ai.queueBuilding("stables", { priority: 3 });

        // Multiple stables
        if (
          ai.game.entityManager.getEntitiesByTypeAndOwner(
            "stables",
            ai.playerId
          ).length < 2
        ) {
          ai.queueBuilding("stables", { priority: 3 });
        }
      }

      // Other military buildings with lower priority
      ai.queueBuilding("archeryRange", { priority: 2 });
    }

    // Earlier blacksmith for cavalry upgrades
    if (
      ai.state.phase === "mid" &&
      !ai.game.entityManager.getEntitiesByTypeAndOwner(
        "blacksmith",
        ai.playerId
      ).length
    ) {
      ai.queueBuilding("blacksmith", { priority: 3 });
    }
  }

  /**
   * Siege-heavy army composition (late-game focus)
   * @param {AIPlayer} ai - AI player
   */
  siegeHeavyArmy(ai) {
    // Only viable in late game
    if (ai.state.phase === "early" || ai.state.phase === "mid") {
      // Use balanced composition until late game
      ai.setUnitProductionRatios({
        spearman: 0.2,
        archer: 0.2,
        swordsman: 0.2,
        cavalry: 0.2,
        siege: 0.1,
        special: 0.1,
      });

      // Basic military buildings
      if (ai.state.phase === "early") {
        ai.queueBuilding("barracks", { priority: 2 });
      } else if (ai.state.phase === "mid") {
        ai.queueBuilding("archeryRange", { priority: 2 });
        if (ai.player.age >= 2) {
          ai.queueBuilding("stables", { priority: 2 });
        }
      }
    } else {
      // Late game siege focus
      ai.setUnitProductionRatios({
        siege: 0.4,
        archer: 0.2,
        cavalry: 0.2,
        spearman: 0.1,
        swordsman: 0.05,
        special: 0.05,
      });

      // Prioritize siege workshop
      ai.queueBuilding("siegeWorkshop", { priority: 3 });

      // Multiple siege workshops
      if (
        ai.game.entityManager.getEntitiesByTypeAndOwner(
          "siegeWorkshop",
          ai.playerId
        ).length < 2
      ) {
        ai.queueBuilding("siegeWorkshop", { priority: 3 });
      }

      // Support military buildings
      ai.queueBuilding("archeryRange", { priority: 2 });
      ai.queueBuilding("stables", { priority: 2 });
    }

    // Research siege technologies
    ai.focusOnTechTypes(["siege damage", "siege range"]);
  }
}
