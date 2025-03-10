/**
 * AI Difficulty Settings
 *
 * Defines difficulty levels and modifiers for AI players.
 * These settings control how challenging the AI opponent will be.
 */

export class AIDifficulty {
  /**
   * Create difficulty settings
   */
  constructor() {
    // Define difficulty levels
    this.difficultyLevels = {
      easy: this.getEasySettings(),
      medium: this.getMediumSettings(),
      hard: this.getHardSettings(),
      expert: this.getExpertSettings(),
    };
  }

  /**
   * Get settings for Easy difficulty
   * @returns {Object} Settings for Easy difficulty
   */
  getEasySettings() {
    return {
      // Resource bonuses
      resourceMultiplier: 1.0, // No resource bonus
      gatheringRateMultiplier: 0.8, // Slower gathering rate

      // Building and research
      buildSpeedMultiplier: 0.8, // Slower building
      researchSpeedMultiplier: 0.8, // Slower research

      // Military
      unitTrainingSpeedMultiplier: 0.9, // Slower unit training
      unitDamageMultiplier: 0.8, // Lower unit damage
      unitHealthMultiplier: 0.9, // Lower unit health

      // Decision making
      updateFrequencyMultiplier: 1.5, // Slower updates (less responsive)
      explorationEfficiency: 0.7, // Less efficient exploration
      resourceImbalanceTolerance: 0.4, // More tolerant of resource imbalance
      tacticalIntelligence: 0.6, // Lower tactical intelligence

      // Timing advantages
      ageAdvancementDelayMs: 180000, // Delay age advancement by 3 minutes
      attackTimingDelayMs: 240000, // Delay attacks by 4 minutes

      // Strategic limitations
      maxMilitaryRatio: 0.4, // Lower max military ratio
      maxVillagers: 30, // Cap on villager count
      maxExpansions: 1, // Limit to one expansion

      // Handicaps
      startingResourceBonus: 0, // No starting resource bonus
      revealMap: false, // No map reveal
      seeAll: false, // No "see all" cheating
    };
  }

  /**
   * Get settings for Medium difficulty
   * @returns {Object} Settings for Medium difficulty
   */
  getMediumSettings() {
    return {
      // Resource handling
      resourceMultiplier: 1.0, // No resource bonus
      gatheringRateMultiplier: 1.0, // Normal gathering rate

      // Building and research
      buildSpeedMultiplier: 1.0, // Normal building speed
      researchSpeedMultiplier: 1.0, // Normal research speed

      // Military
      unitTrainingSpeedMultiplier: 1.0, // Normal unit training
      unitDamageMultiplier: 1.0, // Normal unit damage
      unitHealthMultiplier: 1.0, // Normal unit health

      // Decision making
      updateFrequencyMultiplier: 1.0, // Normal update frequency
      explorationEfficiency: 0.85, // Decent exploration
      resourceImbalanceTolerance: 0.3, // Normal resource imbalance tolerance
      tacticalIntelligence: 0.75, // Normal tactical intelligence

      // Timing advantages
      ageAdvancementDelayMs: 60000, // Minor delay in age advancement (1 min)
      attackTimingDelayMs: 120000, // Minor delay in attacks (2 mins)

      // Strategic limitations
      maxMilitaryRatio: 0.5, // Normal max military ratio
      maxVillagers: 60, // Normal villager cap
      maxExpansions: 2, // Allow 2 expansions

      // Handicaps
      startingResourceBonus: 0, // No starting resource bonus
      revealMap: false, // No map reveal
      seeAll: false, // No "see all" cheating
    };
  }

  /**
   * Get settings for Hard difficulty
   * @returns {Object} Settings for Hard difficulty
   */
  getHardSettings() {
    return {
      // Resource handling
      resourceMultiplier: 1.2, // 20% resource bonus
      gatheringRateMultiplier: 1.2, // Faster gathering rate

      // Building and research
      buildSpeedMultiplier: 1.2, // Faster building
      researchSpeedMultiplier: 1.2, // Faster research

      // Military
      unitTrainingSpeedMultiplier: 1.1, // Faster unit training
      unitDamageMultiplier: 1.1, // Higher unit damage
      unitHealthMultiplier: 1.1, // Higher unit health

      // Decision making
      updateFrequencyMultiplier: 0.8, // More frequent updates (more responsive)
      explorationEfficiency: 0.95, // More efficient exploration
      resourceImbalanceTolerance: 0.2, // Less tolerant of resource imbalance
      tacticalIntelligence: 0.9, // Higher tactical intelligence

      // Timing advantages
      ageAdvancementDelayMs: 0, // No delay in age advancement
      attackTimingDelayMs: 0, // No delay in attacks

      // Strategic capabilities
      maxMilitaryRatio: 0.6, // Higher max military ratio
      maxVillagers: 80, // Higher villager cap
      maxExpansions: 3, // Allow 3 expansions

      // Handicaps
      startingResourceBonus: 200, // Small starting resource bonus
      revealMap: false, // No map reveal
      seeAll: false, // No "see all" cheating
    };
  }

  /**
   * Get settings for Expert difficulty
   * @returns {Object} Settings for Expert difficulty
   */
  getExpertSettings() {
    return {
      // Resource handling
      resourceMultiplier: 1.5, // 50% resource bonus
      gatheringRateMultiplier: 1.5, // Much faster gathering rate

      // Building and research
      buildSpeedMultiplier: 1.5, // Much faster building
      researchSpeedMultiplier: 1.5, // Much faster research

      // Military
      unitTrainingSpeedMultiplier: 1.3, // Much faster unit training
      unitDamageMultiplier: 1.2, // Higher unit damage
      unitHealthMultiplier: 1.2, // Higher unit health

      // Decision making
      updateFrequencyMultiplier: 0.6, // Much more frequent updates
      explorationEfficiency: 1.0, // Perfect exploration
      resourceImbalanceTolerance: 0.1, // Very sensitive to resource imbalance
      tacticalIntelligence: 1.0, // Maximum tactical intelligence

      // Timing advantages
      ageAdvancementDelayMs: -60000, // Advance faster (1 min head start)
      attackTimingDelayMs: -60000, // Attack earlier (1 min head start)

      // Strategic capabilities
      maxMilitaryRatio: 0.7, // Very high max military ratio
      maxVillagers: 100, // Very high villager cap
      maxExpansions: 4, // Allow 4 expansions

      // Handicaps
      startingResourceBonus: 500, // Large starting resource bonus
      revealMap: true, // AI knows the map layout
      seeAll: false, // No "see all" cheating (too unfair)
    };
  }

  /**
   * Get difficulty settings
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {Object} Difficulty settings
   */
  getSettings(difficultyLevel) {
    return (
      this.difficultyLevels[difficultyLevel] || this.difficultyLevels["medium"]
    );
  }

  /**
   * Apply difficulty settings to an AI player
   * @param {AIPlayer} aiPlayer - The AI player to apply settings to
   * @param {string} difficultyLevel - Difficulty level name
   */
  applyDifficultySettings(aiPlayer, difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);

    // Apply resource gathering bonuses
    aiPlayer.params.resourceGatheringRate = settings.gatheringRateMultiplier;

    // Apply building and research speed bonuses
    aiPlayer.params.buildSpeed = settings.buildSpeedMultiplier;
    aiPlayer.params.researchSpeed = settings.researchSpeedMultiplier;

    // Apply unit training speed bonus
    aiPlayer.params.unitTrainingSpeed = settings.unitTrainingSpeedMultiplier;

    // Apply decision making parameters
    aiPlayer.params.updateInterval = Math.round(
      aiPlayer.params.updateInterval * settings.updateFrequencyMultiplier
    );
    aiPlayer.params.economyInterval = Math.round(
      aiPlayer.params.economyInterval * settings.updateFrequencyMultiplier
    );
    aiPlayer.params.militaryInterval = Math.round(
      aiPlayer.params.militaryInterval * settings.updateFrequencyMultiplier
    );
    aiPlayer.params.buildingInterval = Math.round(
      aiPlayer.params.buildingInterval * settings.updateFrequencyMultiplier
    );
    aiPlayer.params.researchInterval = Math.round(
      aiPlayer.params.researchInterval * settings.updateFrequencyMultiplier
    );

    // Apply tactical parameters
    aiPlayer.params.resourceIdleThreshold *= 2 - settings.tacticalIntelligence;
    aiPlayer.params.retreatHealthThreshold *= 2 - settings.tacticalIntelligence;

    // Apply strategic limitations
    aiPlayer.maxVillagers = settings.maxVillagers;
    aiPlayer.maxExpansions = settings.maxExpansions;

    // Apply starting resource bonus if any
    if (settings.startingResourceBonus > 0) {
      aiPlayer.player.resources.addResources({
        food: settings.startingResourceBonus,
        wood: settings.startingResourceBonus,
        gold: settings.startingResourceBonus,
        stone: Math.floor(settings.startingResourceBonus / 2),
        iron: Math.floor(settings.startingResourceBonus / 2),
      });
    }

    // Apply map awareness if enabled
    if (settings.revealMap && aiPlayer.game.map.fogOfWar) {
      aiPlayer.game.map.fogOfWar.revealMapForPlayer(aiPlayer.playerId);
    }
  }

  /**
   * Apply unit bonuses based on difficulty level
   * @param {Entity} unit - The unit to apply bonuses to
   * @param {string} difficultyLevel - Difficulty level name
   */
  applyUnitBonuses(unit, difficultyLevel) {
    // Only apply to AI units
    if (!unit.owner || unit.owner === unit.game.currentPlayerId) {
      return;
    }

    const settings = this.getSettings(difficultyLevel);

    // Apply damage and health bonuses
    unit.attackDamage = Math.round(
      unit.attackDamage * settings.unitDamageMultiplier
    );
    unit.maxHP = Math.round(unit.maxHP * settings.unitHealthMultiplier);
    unit.hp = unit.maxHP; // Reset HP to new max
  }

  /**
   * Apply resource multipliers for AI resource gains
   * @param {number} amount - Original resource amount
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Adjusted resource amount
   */
  adjustResourceAmount(amount, difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return Math.round(amount * settings.resourceMultiplier);
  }

  /**
   * Get adjusted age advancement timing
   * @param {number} baseTimeMs - Base time in milliseconds
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Adjusted time in milliseconds
   */
  getAgeAdvancementTime(baseTimeMs, difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return baseTimeMs + settings.ageAdvancementDelayMs;
  }

  /**
   * Get adjusted attack timing
   * @param {number} baseTimeMs - Base time in milliseconds
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Adjusted time in milliseconds
   */
  getAttackTiming(baseTimeMs, difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return baseTimeMs + settings.attackTimingDelayMs;
  }

  /**
   * Check if AI can see through fog of war
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {boolean} Whether AI can see through fog
   */
  canSeeAll(difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return settings.seeAll;
  }

  /**
   * Get unit training time multiplier
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Training time multiplier
   */
  getTrainingTimeMultiplier(difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return 1 / settings.unitTrainingSpeedMultiplier; // Invert for time reduction
  }

  /**
   * Get build time multiplier
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Build time multiplier
   */
  getBuildTimeMultiplier(difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return 1 / settings.buildSpeedMultiplier; // Invert for time reduction
  }

  /**
   * Get research time multiplier
   * @param {string} difficultyLevel - Difficulty level name
   * @returns {number} Research time multiplier
   */
  getResearchTimeMultiplier(difficultyLevel) {
    const settings = this.getSettings(difficultyLevel);
    return 1 / settings.researchSpeedMultiplier; // Invert for time reduction
  }
}
