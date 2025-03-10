/**
 * Empires of Eternity - Core Game Engine
 * Manages the game loop, state, and coordinates between game systems
 */

class Game {
  constructor(civilization) {
    console.log("Game constructor called with civilization:", civilization);

    // Game state
    this.state = {
      running: false,
      paused: false,
      initialized: false,
      currentAge: 0, // 0 = Stone Age
      selectedCivilization: civilization || null,
      selectedEntities: [],
      resources: Utils.deepClone(CONFIG.RESOURCES.STARTING),
      gameTime: 0, // Time in seconds
      dayNightCycle: {
        time: 0, // 0 to 1 (0 = dawn, 0.5 = dusk, 1 = dawn)
        cycleLength: 300, // 5 minutes per day/night cycle
      },
    };

    // Game systems
    this.systems = {
      renderer: null,
      input: null,
      audio: null,
      map: null,
      uiManager: null,
      entityManager: null,
      aiManager: null,
      alertSystem: null,
      resourceSystem: null,
    };

    // Core timing variables
    this.lastUpdateTime = 0;
    this.updateInterval = 1000 / CONFIG.CANVAS.TARGET_FPS;
    this.accumulatedTime = 0;
    this.animationFrameId = null;

    // Bind methods to maintain context
    this.update = this.update.bind(this);
    this.gameLoop = this.gameLoop.bind(this);

    // Debug rendering - make sure canvas is working
    const canvas = document.getElementById("game-canvas");
    if (canvas) {
      // Set canvas dimensions from config
      canvas.width = CONFIG.CANVAS.WIDTH || 1280;
      canvas.height = CONFIG.CANVAS.HEIGHT || 720;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw initialization text
        ctx.fillStyle = "#FFD700";
        ctx.font = "24px Arial";
        ctx.fillText("Game initializing...", 50, 50);
        ctx.fillText("Civilization: " + civilization, 50, 100);

        console.log("Canvas initialized:", canvas.width, "x", canvas.height);
      } else {
        console.error("Failed to get canvas context!");
      }
    } else {
      console.error("Game canvas not found!");
    }

    Utils.log("Game instance created");
  }

  /**
   * Initialize the game with the selected civilization
   * @param {string} civilization - Selected civilization key
   * @param {Object} options - Additional game options
   */
  init(civilization, options = {}) {
    if (this.state.initialized) {
      Utils.log("Game already initialized");
      return;
    }

    Utils.log(`Initializing game with civilization: ${civilization}`);

    // Set civilization and apply starting bonuses
    this.state.selectedCivilization = civilization;

    // Initialize game systems
    this.initSystems();

    // Generate the map
    if (this.systems.map) {
      this.systems.map.generate(options.mapSize || CONFIG.MAP.DEFAULT_SIZE);
    } else {
      console.error("Map system not available during initialization");
    }

    // Set initial game state based on civilization
    this.applyInitialState();

    // Set initialized flag
    this.state.initialized = true;

    Utils.log("Game initialized successfully");

    // Draw confirmation on canvas that initialization succeeded
    const canvas = document.getElementById("game-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#006400";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "30px Arial";
        ctx.fillText("Game initialized successfully!", 50, 50);
        ctx.fillText("Starting game...", 50, 100);
      }
    }

    // Initialize resource system with civilization
    if (this.systems.resourceSystem) {
      this.systems.resourceSystem.init(civilization);
    }
  }

  /**
   * Initialize all game systems
   */
  initSystems() {
    Utils.log("Initializing game systems...");

    // Initialize renderer
    this.systems.renderer = {
      render: () => {
        // Get canvas and context
        const canvas = document.getElementById("game-canvas");
        if (!canvas) {
          console.error("Canvas not found for rendering");
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("Canvas context not available");
          return;
        }

        // Clear the canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw debug grid as placeholder
        const gridSize = 20;
        const cellSize = Math.min(canvas.width, canvas.height) / gridSize;

        for (let x = 0; x < gridSize; x++) {
          for (let y = 0; y < gridSize; y++) {
            // Alternate colors for grid
            if ((x + y) % 2 === 0) {
              ctx.fillStyle = "#111";
            } else {
              ctx.fillStyle = "#222";
            }

            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }

        // Show basic game info
        ctx.fillStyle = "#FFD700";
        ctx.font = "20px Arial";
        ctx.fillText(
          `Civilization: ${this.state.selectedCivilization}`,
          20,
          30
        );
        ctx.fillText(
          `Age: ${CONFIG.AGES.NAMES[this.state.currentAge]}`,
          20,
          60
        );
        ctx.fillText(`Game Time: ${Math.floor(this.state.gameTime)}s`, 20, 90);

        // Show resources
        let y = 120;
        ctx.font = "16px Arial";
        for (const resource in this.state.resources) {
          ctx.fillText(
            `${resource}: ${Math.floor(this.state.resources[resource])}`,
            20,
            y
          );
          y += 25;
        }

        console.log("Render completed");
      },
    };

    // Initialize input system
    this.systems.input = {
      update: () => {
        // Basic input handling - would be replaced with actual implementation
      },
    };

    // Initialize audio system
    this.systems.audio = {
      play: (sound) => {
        console.log(`Playing sound: ${sound}`);
        // Simple audio debugging implementation
        const audioElement = document.createElement("audio");
        audioElement.src = `assets/audio/sfx/${sound}.mp3`;
        audioElement.play().catch((e) => {
          console.warn(`Failed to play audio ${sound}:`, e);
        });
      },
    };

    // Initialize map system
    this.systems.map = {
      generate: (size) => {
        Utils.log(`Generating map of size ${size}`);
        // Draw a basic map to the canvas for debugging
        const canvas = document.getElementById("game-canvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cellSize = Math.min(canvas.width, canvas.height) / size;

        // Generate a simple map with terrain types
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            // Simple terrain generation
            const terrain = this.getRandomTerrain();
            const color = this.getTerrainColor(terrain);

            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

            // Add grid lines
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }

        Utils.log("Map generated successfully");
      },
      update: () => {},
      findPath: (startX, startY, endX, endY) => {
        // Simple direct path for now
        return [{ x: endX, y: endY }];
      },
    };

    // Initialize UI manager
    this.systems.uiManager = {
      update: () => {},
      render: () => {
        this.updateResourceDisplay();
      },
    };

    // Initialize entity manager
    this.systems.entityManager = {
      update: () => {},
      createStartingEntities: (civ) => {
        console.log(`Creating starting entities for ${civ.name}`);
      },
      getEntitiesByType: (type) => [],
    };

    // Initialize AI manager
    this.systems.aiManager = {
      update: () => {},
    };

    // Initialize alert system
    this.systems.alertSystem = {
      update: () => {},
      addAlert: (message) => {
        Utils.log(`ALERT: ${message}`);
        const messagesElement = document.getElementById("messages");
        if (messagesElement) {
          messagesElement.textContent = message;
          messagesElement.classList.add("fadeOut");

          // Reset fadeOut animation after it completes
          setTimeout(() => {
            messagesElement.classList.remove("fadeOut");
          }, 5000);
        }
      },
    };

    // Initialize resource system
    this.systems.resourceSystem = new ResourceSystem(this);

    Utils.log("Game systems initialized");
  }

  // Helper methods for map generation
  getRandomTerrain() {
    const terrainTypes = CONFIG.MAP.TERRAIN_TYPES;
    const index = Math.floor(Math.random() * terrainTypes.length);
    return terrainTypes[index];
  }

  getTerrainColor(terrain) {
    const colors = {
      plains: "#7CFC00",
      forest: "#228B22",
      desert: "#F5DEB3",
      hills: "#CD853F",
      mountains: "#808080",
    };

    return colors[terrain] || "#000";
  }

  /**
   * Apply initial game state based on selected civilization
   */
  applyInitialState() {
    const civ = CONFIG.CIVILIZATIONS[this.state.selectedCivilization];

    if (!civ) {
      Utils.log("Error: Invalid civilization selected");
      return;
    }

    // Create starting entities (villagers, town center)
    if (this.systems.entityManager) {
      this.systems.entityManager.createStartingEntities(civ);
    }

    // Apply civilization bonuses
    if (civ.uniquePerks.gatherBonus) {
      // Apply gathering bonus for Solari
      Utils.log(
        `Applied ${civ.name} gathering bonus: +${
          civ.uniquePerks.gatherBonus * 100
        }%`
      );
    }

    if (civ.uniquePerks.buildingDiscount) {
      // Apply building discount for Solari
      Utils.log(
        `Applied ${civ.name} building discount: -${
          civ.uniquePerks.buildingDiscount * 100
        }%`
      );
    }

    if (civ.uniquePerks.soldierTrainingSpeed) {
      // Apply soldier training speed bonus for Lunari
      Utils.log(
        `Applied ${civ.name} soldier training speed: +${
          civ.uniquePerks.soldierTrainingSpeed * 100
        }%`
      );
    }

    if (civ.uniquePerks.villagerMovementSpeed) {
      // Apply villager movement speed bonus for Lunari
      Utils.log(
        `Applied ${civ.name} villager movement speed: +${
          civ.uniquePerks.villagerMovementSpeed * 100
        }%`
      );
    }
  }

  /**
   * Start the game
   */
  start() {
    if (!this.state.initialized) {
      Utils.log("Cannot start game: Not initialized");
      this.init(this.state.selectedCivilization);
    }

    if (this.state.running) {
      Utils.log("Game already running");
      return;
    }

    Utils.log("Starting game");
    this.state.running = true;
    this.state.paused = false;
    this.lastUpdateTime = performance.now();

    if (this.systems.audio) {
      this.systems.audio.play("gameStart");
    }

    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert("Game started. Good luck!");
    }

    // Force a render after startup
    if (this.systems.renderer) {
      console.log("Force initial render");
      this.systems.renderer.render();
    }

    // Ensure map is generated
    if (this.systems.map && !this.mapGenerated) {
      console.log("Ensuring map is generated");
      this.systems.map.generate(CONFIG.MAP.DEFAULT_SIZE);
      this.mapGenerated = true;
    }

    // Start the game loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    // Update the resource display
    this.updateResourceDisplay();
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this.state.running || this.state.paused) {
      return;
    }

    Utils.log("Game paused");
    this.state.paused = true;

    if (this.systems.audio) {
      this.systems.audio.play("gamePause");
    }

    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert("Game paused");
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.state.running || !this.state.paused) {
      return;
    }

    Utils.log("Game resumed");
    this.state.paused = false;
    this.lastUpdateTime = performance.now();

    if (this.systems.audio) {
      this.systems.audio.play("gameResume");
    }

    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert("Game resumed");
    }
  }

  /**
   * Stop the game
   */
  stop() {
    if (!this.state.running) {
      return;
    }

    Utils.log("Stopping game");
    this.state.running = false;
    this.state.paused = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.systems.audio) {
      this.systems.audio.play("gameStop");
    }

    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert("Game stopped");
    }
  }

  /**
   * Reset the game
   */
  reset() {
    Utils.log("Resetting game");

    // Stop the current game if running
    if (this.state.running) {
      this.stop();
    }

    // Reset game state
    this.state = {
      running: false,
      paused: false,
      initialized: false,
      currentAge: 0,
      selectedCivilization: this.state.selectedCivilization, // Keep the selected civ
      selectedEntities: [],
      resources: Utils.deepClone(CONFIG.RESOURCES.STARTING),
      gameTime: 0,
      dayNightCycle: {
        time: 0,
        cycleLength: 300,
      },
    };

    Utils.log("Game reset complete");

    // Re-initialize
    this.init(this.state.selectedCivilization);
  }

  /**
   * Main update function, runs every frame
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    if (!this.state.running || this.state.paused) {
      return;
    }

    // Update game time
    this.state.gameTime += deltaTime;

    // Update day/night cycle
    this.state.dayNightCycle.time =
      (this.state.gameTime % this.state.dayNightCycle.cycleLength) /
      this.state.dayNightCycle.cycleLength;

    // Update all game systems
    if (this.systems.map) this.systems.map.update(deltaTime);
    if (this.systems.entityManager)
      this.systems.entityManager.update(deltaTime);
    if (this.systems.input) this.systems.input.update(deltaTime);
    if (this.systems.uiManager) this.systems.uiManager.update(deltaTime);
    if (this.systems.aiManager) this.systems.aiManager.update(deltaTime);
    if (this.systems.alertSystem) this.systems.alertSystem.update(deltaTime);
    if (this.systems.resourceSystem)
      this.systems.resourceSystem.update(deltaTime);

    // Check for age advancement
    this.checkAgeAdvancement();

    // Check victory conditions
    this.checkVictoryConditions();

    // Update resource display
    if (this.updateCounter % 10 === 0) {
      // Update every 10 frames
      this.updateResourceDisplay();
    }
    this.updateCounter = (this.updateCounter || 0) + 1;
  }

  /**
   * Main game loop
   * @param {number} timestamp - Current animation frame timestamp
   */
  gameLoop(timestamp) {
    if (!this.state.running) {
      return;
    }

    // Calculate elapsed time since last frame
    const elapsed = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;

    // Add to accumulated time
    this.accumulatedTime += elapsed;

    // Update game state with fixed time step for stability
    while (this.accumulatedTime >= this.updateInterval) {
      this.update(this.updateInterval / 1000); // Convert to seconds
      this.accumulatedTime -= this.updateInterval;
    }

    // Render the current state
    this.render();

    // Queue the next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Render the game
   */
  render() {
    if (!this.state.running) {
      return;
    }

    // Clear the canvas and render the game
    if (this.systems.renderer) {
      this.systems.renderer.render();
    }

    // Render UI elements
    if (this.systems.uiManager) {
      this.systems.uiManager.render();
    }
  }

  /**
   * Check if requirements for age advancement are met
   */
  checkAgeAdvancement() {
    if (this.state.currentAge >= CONFIG.AGES.NAMES.length - 1) {
      // Already at max age
      return;
    }

    const nextAge = this.state.currentAge + 1;
    const requirements = CONFIG.AGES.REQUIREMENTS[nextAge];
    let canAdvance = true;

    // Check if resources meet requirements
    for (const resource in requirements) {
      if (this.state.resources[resource] < requirements[resource]) {
        canAdvance = false;
        break;
      }
    }

    if (canAdvance) {
      this.advanceAge();
    }
  }

  /**
   * Advance to the next age
   */
  advanceAge() {
    const nextAge = this.state.currentAge + 1;

    if (nextAge >= CONFIG.AGES.NAMES.length) {
      return;
    }

    Utils.log(`Advancing to ${CONFIG.AGES.NAMES[nextAge]}`);

    // Deduct resources
    const requirements = CONFIG.AGES.REQUIREMENTS[nextAge];
    for (const resource in requirements) {
      this.state.resources[resource] -= requirements[resource];
    }

    // Update age
    this.state.currentAge = nextAge;

    // Play advancement sound
    if (this.systems.audio) {
      this.systems.audio.play("ageAdvance");
    }

    // Notify player
    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert(
        `Advanced to ${CONFIG.AGES.NAMES[nextAge]}!`
      );
    }

    // Update villager limit
    const civConfig = CONFIG.CIVILIZATIONS[this.state.selectedCivilization];
    if (civConfig && civConfig.villagerLimit.perAge) {
      // Apply age villager bonus
      Utils.log(
        `Villager limit increased by ${civConfig.villagerLimit.perAge}`
      );
    }
  }

  /**
   * Check if victory conditions are met
   */
  checkVictoryConditions() {
    // Check domination victory (all enemy buildings destroyed)
    const enemyBuildings = this.systems.entityManager
      ? this.systems.entityManager
          .getEntitiesByType("building")
          .filter((b) => b.owner !== this.state.selectedCivilization)
      : [];

    if (enemyBuildings.length === 0) {
      this.triggerVictory("domination");
      return;
    }

    // Check economic victory
    let hasAllTech = true; // Assume all tech is researched, would check against actual tech state

    if (hasAllTech) {
      const economicGoal = CONFIG.VICTORY.ECONOMIC.RESOURCE_GOAL;
      let hasEnoughResources = true;

      for (const resource in economicGoal) {
        if (this.state.resources[resource] < economicGoal[resource]) {
          hasEnoughResources = false;
          break;
        }
      }

      if (hasEnoughResources) {
        this.triggerVictory("economic");
      }
    }
  }

  /**
   * Trigger victory condition
   * @param {string} type - Type of victory (domination, economic)
   */
  triggerVictory(type) {
    Utils.log(`Victory achieved: ${type}`);
    this.pause();

    // Play victory sound
    if (this.systems.audio) {
      this.systems.audio.play("victory");
    }

    // Show victory message
    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert(`${type.toUpperCase()} VICTORY!`);
    }

    // Would show victory screen here
  }

  /**
   * Trigger defeat condition
   * @param {string} reason - Reason for defeat
   */
  triggerDefeat(reason) {
    Utils.log(`Defeat: ${reason}`);
    this.pause();

    // Play defeat sound
    if (this.systems.audio) {
      this.systems.audio.play("defeat");
    }

    // Show defeat message
    if (this.systems.alertSystem) {
      this.systems.alertSystem.addAlert(`DEFEAT: ${reason}`);
    }

    // Would show defeat screen here
  }

  /**
   * Get the current game state
   * @returns {Object} Current game state
   */
  getState() {
    return this.state;
  }

  /**
   * Get a specific game system
   * @param {string} systemName - Name of the system to retrieve
   * @returns {Object|null} The requested system or null if not found
   */
  getSystem(systemName) {
    return this.systems[systemName] || null;
  }

  /**
   * Update the resource display in the UI
   */
  updateResourceDisplay() {
    // Update the UI to display current resources
    const resourcesElement = document.getElementById("resources");
    if (resourcesElement) {
      let html = "";

      for (const type of CONFIG.RESOURCES.TYPES) {
        const value = Math.floor(this.state.resources[type]);
        html += `<div class="resource ${type}"><span class="resource-icon">${type
          .charAt(0)
          .toUpperCase()}</span> ${value}</div>`;
      }

      resourcesElement.innerHTML = html;
    }

    // Update age display
    const ageElement = document.getElementById("age-display");
    if (ageElement) {
      ageElement.textContent = CONFIG.AGES.NAMES[this.state.currentAge];
    }
  }
}

// Helper functions for debugging
function drawGrid(ctx, width, height, size) {
  const rows = Math.floor(height / size);
  const cols = Math.floor(width / size);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;

  // Draw rows
  for (let i = 0; i <= rows; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * size);
    ctx.lineTo(width, i * size);
    ctx.stroke();
  }

  // Draw columns
  for (let i = 0; i <= cols; i++) {
    ctx.beginPath();
    ctx.moveTo(i * size, 0);
    ctx.lineTo(i * size, height);
    ctx.stroke();
  }
}

// Add this at the end of js/core/game.js
if (typeof window !== "undefined") {
  window.Game = Game;

  // Helper function for initializing the game
  window.initGame = function (civilization) {
    console.log("Initializing game with civilization:", civilization);

    // Create game instance
    window.gameInstance = new Game(civilization);

    // Initialize the game
    window.gameInstance.init(civilization);

    // Explicitly start the game
    console.log("Starting game...");
    window.gameInstance.start();

    return window.gameInstance;
  };
}
