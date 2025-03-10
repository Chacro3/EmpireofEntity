/**
 * @fileoverview Simplified victory conditions system for Empires of Eternity
 * Handles win conditions, defeat scenarios, and game state tracking.
 */

/**
 * VictorySystem manages victory conditions and game outcomes
 */
export class VictorySystem {
  /**
   * Create a new victory conditions system
   * @param {Object} game - Reference to the main game object
   */
  constructor(game) {
    this.game = game;

    // Track player state
    this.playerState = {};

    // Track victories and defeats
    this.victories = [];
    this.defeats = [];

    // Game ended flag
    this.gameEnded = false;

    // Game has started properly flag - prevents premature victory
    this.gameStarted = false;
    this.startupGracePeriod = 60000; // 60 seconds before victory possible

    // Victory conditions
    this.victoryConditions = {
      domination: {
        name: "Domination Victory",
        description:
          "Defeat all enemy civilizations by destroying their main buildings.",
        icon: "victory_domination",
        checkCondition: this.checkDominationVictory.bind(this),
      },
      wonder: {
        name: "Wonder Victory",
        description: "Build a Wonder and protect it for a set amount of time.",
        icon: "victory_wonder",
        checkCondition: this.checkWonderVictory.bind(this),
      },
      economic: {
        name: "Economic Victory",
        description: "Accumulate a vast wealth of resources.",
        icon: "victory_economic",
        checkCondition: this.checkEconomicVictory.bind(this),
      },
    };

    // Victory progress tracking
    this.victoryProgress = {};

    // Wonder victory timeouts
    this.wonderVictoryTimers = {};

    // Victory thresholds
    this.WONDER_VICTORY_TIME = 600000; // 10 minutes
    this.ECONOMIC_VICTORY_RESOURCES = {
      food: 10000,
      wood: 10000,
      gold: 10000,
      stone: 8000,
      iron: 5000,
    };

    // Defeat conditions
    this.defeatConditions = {
      eliminated: {
        name: "Elimination",
        description: "All your main buildings have been destroyed.",
        icon: "defeat_eliminated",
      },
      surrender: {
        name: "Surrender",
        description: "You have surrendered the game.",
        icon: "defeat_surrender",
      },
    };

    // Default display
    this.displayElement =
      document.getElementById("messages") || document.createElement("div");

    console.log("Victory system constructed");
  }

  /**
   * Initialize the victory system
   */
  init() {
    console.log("Victory system initializing");

    // Set up number of players and opponents
    const numPlayers = this.game.players?.length || 2; // Default to 2 if not specified

    console.log(`Setting up victory system for ${numPlayers} players`);

    // Initialize player states
    for (let i = 0; i < numPlayers; i++) {
      this.playerState[i] = {
        active: true, // All players start active
        defeated: false,
        victorious: false,
        eliminationProgress: 0, // Percentage of critical buildings destroyed
        wonderProgress: 0, // Percentage of wonder timer completed
        economicProgress: 0, // Percentage of economic resources accumulated
      };

      // Initialize victory progress
      this.victoryProgress[i] = {};
      for (const condition in this.victoryConditions) {
        this.victoryProgress[i][condition] = 0;
      }
    }

    // Set up entity event listeners if entity manager exists
    if (this.game.entityManager) {
      this.game.entityManager.on &&
        this.game.entityManager.on(
          "entityDeath",
          this.handleEntityDeath.bind(this)
        );
      this.game.entityManager.on &&
        this.game.entityManager.on(
          "entityCreated",
          this.handleEntityCreated.bind(this)
        );
    } else {
      console.warn(
        "EntityManager not available, some victory conditions may not work properly"
      );
    }

    console.log("Victory system initialized");
  }

  /**
   * Update victory conditions
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Skip if game already ended
    if (this.gameEnded) {
      return;
    }

    // Update game time tracking
    if (!this.game.gameTime) {
      this.game.gameTime = 0;
    }
    this.game.gameTime += deltaTime;

    // Don't check for victory during grace period
    if (this.game.gameTime < this.startupGracePeriod) {
      // Clear any victory messages that might have been set erroneously
      this.displayElement.textContent = "";
      return;
    }

    // Set game as started once we're past the grace period
    if (!this.gameStarted && this.game.gameTime >= this.startupGracePeriod) {
      this.gameStarted = true;
      console.log("Game started properly, victory conditions now active");
    }

    // Check for AI player defeats (may have no buildings left)
    this.checkAIDefeats();

    // Check all victory conditions for all active players
    for (let playerId in this.playerState) {
      playerId = parseInt(playerId, 10);

      // Skip defeated or inactive players
      if (
        !this.playerState[playerId].active ||
        this.playerState[playerId].defeated
      ) {
        continue;
      }

      // Check each victory condition
      for (const condition in this.victoryConditions) {
        const progress =
          this.victoryConditions[condition].checkCondition(playerId);
        this.victoryProgress[playerId][condition] = progress;

        // Update player state with progress
        switch (condition) {
          case "wonder":
            this.playerState[playerId].wonderProgress = progress;
            break;
          case "economic":
            this.playerState[playerId].economicProgress = progress;
            break;
        }

        // Check if player has achieved this victory condition
        if (progress >= 100) {
          this.declareVictory(playerId, condition);
          return;
        }
      }
    }

    // Check if only one player/team is left
    this.checkLastManStanding();
  }

  /**
   * Check for domination victory (all enemies defeated)
   * @param {number} playerId - ID of the player
   * @returns {number} Victory progress percentage (0-100)
   */
  checkDominationVictory(playerId) {
    // Must be after startup grace period
    if (!this.gameStarted) {
      return 0;
    }

    // Count active opponents
    let totalOpponents = 0;
    let defeatedOpponents = 0;

    for (const id in this.playerState) {
      const pid = parseInt(id, 10);
      // Skip self and inactive players
      if (pid === playerId || !this.playerState[pid].active) {
        continue;
      }

      // Count opponents
      totalOpponents++;

      // Count defeated opponents
      if (this.playerState[pid].defeated) {
        defeatedOpponents++;
      }
    }

    // Special case: no opponents
    if (totalOpponents === 0) {
      // In a single player game, don't grant instant victory
      // Player must still achieve one of the other victory conditions
      return 0;
    }

    // If all opponents defeated, victory!
    if (defeatedOpponents === totalOpponents) {
      return 100;
    }

    // Calculate progress
    return Math.floor((defeatedOpponents / totalOpponents) * 100);
  }

  /**
   * Check for wonder victory (wonder built and timer expired)
   * @param {number} playerId - ID of the player
   * @returns {number} Victory progress percentage (0-100)
   */
  checkWonderVictory(playerId) {
    // Must be after startup grace period
    if (!this.gameStarted) {
      return 0;
    }

    // Skip if entity manager is not available
    if (!this.game.entityManager) {
      return 0;
    }

    // Check if player has a wonder
    const wonders =
      this.game.entityManager.getEntitiesByType?.(
        playerId,
        "building",
        "wonder"
      ) || [];

    // Filter to only include completed wonders
    const completedWonders = wonders.filter(
      (wonder) => wonder.constructionProgress >= 100
    );

    if (completedWonders.length === 0) {
      // No completed wonders
      return 0;
    }

    // Check if timer is running
    if (!this.wonderVictoryTimers[playerId]) {
      // Start timer
      this.wonderVictoryTimers[playerId] = {
        startTime: this.game.gameTime,
        wonderId: completedWonders[0].id,
      };

      // Announce wonder construction
      this.displayMessage(
        `Player ${
          playerId + 1
        } has built a Wonder! They will win in 10 minutes if it's not destroyed.`
      );
    }

    // Calculate progress
    const timer = this.wonderVictoryTimers[playerId];
    const wonderStillExists = this.game.entityManager.getEntityById?.(
      timer.wonderId
    );

    if (!wonderStillExists) {
      // Wonder was destroyed
      delete this.wonderVictoryTimers[playerId];

      // Announce wonder destruction
      this.displayMessage(
        `Player ${playerId + 1}'s Wonder has been destroyed!`
      );
      return 0;
    }

    const elapsedTime = this.game.gameTime - timer.startTime;
    const progress = Math.min(
      100,
      Math.floor((elapsedTime / this.WONDER_VICTORY_TIME) * 100)
    );

    // Announce progress milestones
    if (progress % 25 === 0 && progress > 0 && progress < 100) {
      const timeLeft = Math.ceil(
        (this.WONDER_VICTORY_TIME - elapsedTime) / 60000
      );

      this.displayMessage(
        `Player ${
          playerId + 1
        }'s Wonder victory at ${progress}%! ${timeLeft} minutes remaining.`
      );
    }

    return progress;
  }

  /**
   * Check for economic victory (accumulate vast wealth)
   * @param {number} playerId - ID of the player
   * @returns {number} Victory progress percentage (0-100)
   */
  checkEconomicVictory(playerId) {
    // Must be after startup grace period
    if (!this.gameStarted) {
      return 0;
    }

    // Skip if resource manager is not available
    if (!this.game.resourceManager) {
      return 0;
    }

    // Get player resources
    const resources = {};
    let totalProgress = 0;
    let resourceCount = 0;

    for (const resource in this.ECONOMIC_VICTORY_RESOURCES) {
      resources[resource] =
        this.game.resourceManager.getResource?.(playerId, resource) || 0;

      // Calculate progress for this resource
      const targetAmount = this.ECONOMIC_VICTORY_RESOURCES[resource];
      const resourceProgress = Math.min(
        100,
        Math.floor((resources[resource] / targetAmount) * 100)
      );

      totalProgress += resourceProgress;
      resourceCount++;
    }

    // Calculate average progress across all resources
    const averageProgress = Math.floor(totalProgress / resourceCount);

    // If all resources exceed targets, victory!
    for (const resource in this.ECONOMIC_VICTORY_RESOURCES) {
      if (resources[resource] < this.ECONOMIC_VICTORY_RESOURCES[resource]) {
        return averageProgress;
      }
    }

    return 100;
  }

  /**
   * Check if there's only one player left
   */
  checkLastManStanding() {
    // Skip during grace period
    if (!this.gameStarted) {
      return;
    }

    // Count active players
    const activePlayers = [];

    for (const id in this.playerState) {
      const playerId = parseInt(id, 10);
      if (
        this.playerState[playerId].active &&
        !this.playerState[playerId].defeated
      ) {
        activePlayers.push(playerId);
      }
    }

    // If only one player is active, they win by domination
    if (activePlayers.length === 1) {
      const playerId = activePlayers[0];
      this.declareVictory(playerId, "domination");
    }
  }

  /**
   * Check if AI players should be defeated (no buildings left)
   */
  checkAIDefeats() {
    // Skip if entity manager is not available
    if (!this.game.entityManager) {
      return;
    }

    for (const id in this.playerState) {
      const playerId = parseInt(id, 10);

      // Skip players that are not active, human, or already defeated
      if (
        !this.playerState[playerId].active ||
        (this.game.players && this.game.players[playerId]?.isHuman) ||
        this.playerState[playerId].defeated
      ) {
        continue;
      }

      // Check if player still has buildings
      const buildings =
        this.game.entityManager.getEntitiesByType?.(playerId, "building") || [];

      if (buildings.length === 0) {
        this.declareDefeat(playerId, "eliminated");
      }
    }
  }

  /**
   * Declare victory for a player
   * @param {number} playerId - ID of the victorious player
   * @param {string} victoryType - Type of victory
   */
  declareVictory(playerId, victoryType) {
    // Skip if game already ended
    if (this.gameEnded) {
      return;
    }

    // Skip if player already defeated or victorious
    if (
      this.playerState[playerId].defeated ||
      this.playerState[playerId].victorious
    ) {
      return;
    }

    // Mark player as victorious
    this.playerState[playerId].victorious = true;

    // Add to victories list
    this.victories.push({
      playerId: playerId,
      type: victoryType,
      time: this.game.gameTime,
      victoryInfo: this.victoryConditions[victoryType],
    });

    console.log(`Player ${playerId + 1} achieved ${victoryType} victory!`);

    // Declare defeat for all other players
    for (const id in this.playerState) {
      const i = parseInt(id, 10);
      if (
        i !== playerId &&
        this.playerState[i].active &&
        !this.playerState[i].defeated
      ) {
        this.declareDefeat(i, "defeated_by_opponent");
      }
    }

    // Set game ended flag
    this.gameEnded = true;

    // Show victory message
    const currentPlayerId = this.game.currentPlayer || 0;
    if (playerId === currentPlayerId) {
      this.displayVictoryScreen(playerId, victoryType);
    } else {
      this.displayDefeatScreen(currentPlayerId, "defeated_by_opponent");
    }

    // Play victory sound if audio system available
    if (this.game.audioSystem && this.game.audioSystem.playMusic) {
      this.game.audioSystem.playMusic("victory_theme");
    }

    // Trigger game over event
    if (this.game.emit) {
      this.game.emit("gameOver", {
        winner: playerId,
        victoryType: victoryType,
      });
    }
  }

  /**
   * Declare defeat for a player
   * @param {number} playerId - ID of the defeated player
   * @param {string} defeatType - Type of defeat
   */
  declareDefeat(playerId, defeatType) {
    // Skip if player already defeated or victorious
    if (
      this.playerState[playerId].defeated ||
      this.playerState[playerId].victorious
    ) {
      return;
    }

    // Mark player as defeated
    this.playerState[playerId].defeated = true;

    // Add to defeats list
    this.defeats.push({
      playerId: playerId,
      type: defeatType,
      time: this.game.gameTime,
      defeatInfo: this.defeatConditions[defeatType],
    });

    console.log(`Player ${playerId + 1} defeated (${defeatType})!`);

    // Show defeat screen if this is the current player
    const currentPlayerId = this.game.currentPlayer || 0;
    if (playerId === currentPlayerId && !this.gameEnded) {
      this.displayDefeatScreen(playerId, defeatType);
    }

    // Trigger defeat event
    if (this.game.emit) {
      this.game.emit("playerDefeated", {
        playerId: playerId,
        defeatType: defeatType,
      });
    }

    // Check for game over (only one player left)
    this.checkLastManStanding();
  }

  /**
   * Handle entity death events
   * @param {Object} data - Entity death event data
   */
  handleEntityDeath(data) {
    if (!data || !data.entity) return;

    const entity = data.entity;

    // Check if this is a critical building
    if (entity.type === "building" && entity.isCritical) {
      const playerId = entity.owner;

      // Check if this was the last critical building
      const criticalBuildings = (
        this.game.entityManager.getEntitiesByType?.(playerId, "building") || []
      ).filter((b) => b.isCritical);

      if (criticalBuildings.length === 0) {
        this.declareDefeat(playerId, "eliminated");
      }
    }

    // Handle wonder destruction
    if (entity.type === "building" && entity.buildingType === "wonder") {
      const playerId = entity.owner;

      // Stop wonder timer
      if (
        this.wonderVictoryTimers[playerId] &&
        this.wonderVictoryTimers[playerId].wonderId === entity.id
      ) {
        delete this.wonderVictoryTimers[playerId];

        // Announce wonder destruction
        this.displayMessage(
          `Player ${playerId + 1}'s Wonder has been destroyed!`
        );
      }
    }
  }

  /**
   * Handle entity created events
   * @param {Object} data - Entity created event data
   */
  handleEntityCreated(data) {
    if (!data || !data.entity) return;

    const entity = data.entity;

    // Check if this is a wonder
    if (entity.type === "building" && entity.buildingType === "wonder") {
      const playerId = entity.owner;

      // Announce wonder construction when completed
      if (entity.constructionProgress >= 100) {
        // Start wonder timer
        this.wonderVictoryTimers[playerId] = {
          startTime: this.game.gameTime,
          wonderId: entity.id,
        };

        // Announce wonder construction
        this.displayMessage(
          `Player ${
            playerId + 1
          } has built a Wonder! They will win in 10 minutes if it's not destroyed.`
        );
      }
    }
  }

  /**
   * Display a victory screen or message
   * @param {number} playerId - ID of the victorious player
   * @param {string} victoryType - Type of victory
   */
  displayVictoryScreen(playerId, victoryType) {
    // Use UI manager if available
    if (this.game.uiManager && this.game.uiManager.showVictoryScreen) {
      const victoryInfo = this.victoryConditions[victoryType];
      const gameStats = this.collectGameStats(playerId);

      this.game.uiManager.showVictoryScreen({
        playerId,
        victoryType,
        victoryInfo,
        gameStats,
      });
    } else {
      // Simple fallback
      this.displayMessage(
        `${this.victoryConditions[victoryType].name.toUpperCase()}!`,
        true
      );
    }
  }

  /**
   * Display a defeat screen or message
   * @param {number} playerId - ID of the defeated player
   * @param {string} defeatType - Type of defeat
   */
  displayDefeatScreen(playerId, defeatType) {
    // Use UI manager if available
    if (this.game.uiManager && this.game.uiManager.showDefeatScreen) {
      const defeatInfo = this.defeatConditions[defeatType];
      const gameStats = this.collectGameStats(playerId);

      this.game.uiManager.showDefeatScreen({
        playerId,
        defeatType,
        defeatInfo,
        gameStats,
      });
    } else {
      // Simple fallback
      this.displayMessage("DEFEAT!", true);
    }

    // Play defeat sound if audio system available
    if (this.game.audioSystem && this.game.audioSystem.playMusic) {
      this.game.audioSystem.playMusic("defeat_theme");
    }
  }

  /**
   * Display a message to the player
   * @param {string} message - The message to display
   * @param {boolean} isImportant - Whether this is an important message
   */
  displayMessage(message, isImportant = false) {
    // Use alert system if available
    if (this.game.alertSystem && this.game.alertSystem.addAlert) {
      this.game.alertSystem.addAlert({
        type: isImportant ? "critical" : "info",
        message: message,
      });
      return;
    }

    // Otherwise use simple message display
    this.displayElement.textContent = message;

    if (isImportant) {
      this.displayElement.style.color = "#ff0000";
      this.displayElement.style.fontWeight = "bold";
    } else {
      this.displayElement.style.color = "#ffffff";
      this.displayElement.style.fontWeight = "normal";
    }

    console.log("Game message:", message);
  }

  /**
   * Collect basic game statistics
   * @param {number} playerId - ID of the player
   * @returns {Object} Game statistics
   */
  collectGameStats(playerId) {
    // Simplified stats object
    return {
      gameTime: this.game.gameTime || 0,
      score: 0,
      resources: {
        collected: {},
        spent: {},
      },
      military: {
        unitsCreated: 0,
        unitsLost: 0,
        unitsKilled: 0,
      },
    };
  }

  /**
   * Get player victory progress
   * @param {number} playerId - ID of the player
   * @returns {Object} Victory progress for each condition
   */
  getVictoryProgress(playerId) {
    return this.victoryProgress[playerId] || {};
  }

  /**
   * Check if the game has ended
   * @returns {boolean} True if the game has ended
   */
  isGameOver() {
    return this.gameEnded;
  }

  /**
   * Force surrender for a player
   * @param {number} playerId - ID of the player
   */
  surrender(playerId) {
    this.declareDefeat(playerId, "surrender");
  }
}
