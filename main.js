/**
 * Empires of Eternity - Main Initialization Script
 * Handles game startup, asset loading, and connects all game systems
 */

// Global game instance
window.gameInstance = null;

/**
 * Initialize the game when the DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // Check if initialization should be handled by game-engine.js initGame function
  if (typeof window.initGame === "function") {
    // Get civilization from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCiv = urlParams.get("civ") || "solari";

    // Initialize through game engine's init function
    window.gameInstance = window.initGame(selectedCiv);
  } else {
    // Initialize the game directly
    initializeGame();
  }
});

/**
 * Main game initialization function
 */
function initializeGame() {
  console.log("Initializing Empires of Eternity...");

  // Create utils if not already created
  if (!window.Utils) {
    window.Utils = {
      log: function (msg, category = "info") {
        const prefix = `[${category.toUpperCase()}] `;
        console.log(prefix + msg);
      },
      error: function (msg) {
        console.error("[ERROR] " + msg);
      },
      randomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      },
      clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
      },
    };
  }

  Utils.log("Starting game initialization", "main");

  // Set up the game container
  const gameContainer = {
    systems: {},

    // Game state
    gameTime: 0,
    deltaTime: 0,
    running: false,

    // Players data
    players: [
      { id: 0, civilization: "solari", isHuman: true, name: "Player 1" },
      { id: 1, civilization: "lunari", isHuman: false, name: "AI 1" },
    ],
    currentPlayer: 0, // Human player is always player 0

    // Event system
    events: {},

    // System registration
    registerSystem: function (name, system) {
      this.systems[name] = system;
      return system;
    },

    // Get a system by name
    getSystem: function (name) {
      return this.systems[name] || null;
    },

    // Event registration
    on: function (event, callback) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(callback);
    },

    // Event emission
    emit: function (event, data) {
      if (this.events[event]) {
        for (const callback of this.events[event]) {
          callback(data);
        }
      }
    },

    // Start the game loop
    start: function () {
      if (this.running) return;

      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));

      Utils.log("Game started", "main");
    },

    // Game loop
    gameLoop: function (timestamp) {
      if (!this.running) return;

      // Calculate delta time
      this.deltaTime = timestamp - (this.lastTime || timestamp);
      this.lastTime = timestamp;

      // Update game time
      this.gameTime += this.deltaTime;

      // Cap delta time to prevent huge jumps if tab was inactive
      const maxDelta = 1000 / 20; // Minimum of 20 FPS
      const deltaTime = Math.min(this.deltaTime, maxDelta);

      // Update all systems
      this.update(deltaTime);

      // Render
      this.render();

      // Continue loop
      requestAnimationFrame(this.gameLoop.bind(this));
    },

    // Update all systems
    update: function (deltaTime) {
      // Update each system that has an update method
      for (const systemName in this.systems) {
        const system = this.systems[systemName];
        if (system && typeof system.update === "function") {
          try {
            system.update(deltaTime);
          } catch (error) {
            Utils.error(`Error updating ${systemName}: ${error.message}`);
            console.error(error);
          }
        }
      }
    },

    // Render the game
    render: function () {
      // Get renderer system
      const renderer = this.getSystem("renderer");
      if (renderer && typeof renderer.render === "function") {
        try {
          renderer.render();
        } catch (error) {
          Utils.error(`Error rendering: ${error.message}`);
          console.error(error);
        }
      }
    },
  };

  // Store the game instance globally
  window.gameInstance = gameContainer;

  // Initialize game systems in the correct order
  initializeSystems(gameContainer)
    .then(() => {
      // Create initial game entities
      createInitialEntities(gameContainer);

      // Start the game loop
      gameContainer.start();

      // Hide loading screen
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        loadingScreen.style.display = "none";
      }

      // Show game container
      const gameContainer = document.getElementById("game-container");
      if (gameContainer) {
        gameContainer.style.display = "block";
      }

      Utils.log("Game initialized successfully", "main");
    })
    .catch((error) => {
      Utils.error(`Failed to initialize game: ${error.message}`);
      console.error(error);

      // Show error message on loading screen
      const statusEl = document.getElementById("loading-status");
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = "red";
      }
    });
}

/**
 * Initialize all game systems in the correct order
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when all systems are initialized
 */
async function initializeSystems(game) {
  Utils.log("Initializing game systems...", "main");

  try {
    // 1. Initialize Map system first
    await initializeMapSystem(game);

    // 2. Initialize Renderer (depends on map)
    await initializeRendererSystem(game);

    // 3. Initialize Entity Manager (depends on map)
    await initializeEntitySystem(game);

    // 4. Initialize Resource Manager
    await initializeResourceSystem(game);

    // 5. Initialize Input System (depends on renderer)
    await initializeInputSystem(game);

    // 6. Initialize UI System (depends on renderer and resources)
    await initializeUISystem(game);

    // 7. Initialize Victory System last (prevent premature victory)
    await initializeVictorySystem(game);

    Utils.log("All systems initialized", "main");
    return Promise.resolve();
  } catch (error) {
    Utils.error(`System initialization error: ${error.message}`);
    return Promise.reject(error);
  }
}

/**
 * Initialize the Map system
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the map is initialized
 */
async function initializeMapSystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing map system...", "main");

      // Check if Map class exists
      if (typeof Map !== "function") {
        Utils.error("Map class not found!");
        reject(new Error("Map class not found"));
        return;
      }

      // Create map instance
      const map = new Map(game);

      // Generate map
      const mapSize = window.CONFIG?.MAP?.DEFAULT_SIZE || 40;
      map.generate(mapSize, {
        seed: Math.floor(Math.random() * 1000000),
        terrainVariation: 0.7,
        resourceDensity: window.CONFIG?.MAP?.RESOURCE_DENSITY || 0.12,
        symmetric: true,
      });

      // Register the map system
      game.registerSystem("map", map);

      Utils.log(`Map generated (${mapSize}x${mapSize})`, "map");
      resolve(map);
    } catch (error) {
      Utils.error(`Failed to initialize map: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the Renderer system
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the renderer is initialized
 */
async function initializeRendererSystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing renderer system...", "main");

      // Check if Renderer class exists
      if (typeof Renderer !== "function") {
        Utils.error("Renderer class not found!");
        reject(new Error("Renderer class not found"));
        return;
      }

      // Get canvas element
      const canvas = document.getElementById("game-canvas");
      if (!canvas) {
        Utils.error("Canvas element not found!");
        reject(new Error("Canvas element not found"));
        return;
      }

      // Create renderer instance
      const renderer = new Renderer(game);

      // Initialize renderer with canvas
      renderer.init(canvas);

      // Register the renderer system
      game.registerSystem("renderer", renderer);

      // Load assets (but continue even if this fails)
      renderer
        .loadAssets()
        .then(() => {
          Utils.log("Assets loaded successfully", "renderer");
          resolve(renderer);
        })
        .catch((error) => {
          Utils.log(
            "Asset loading failed, continuing with placeholders",
            "renderer"
          );
          resolve(renderer); // Continue anyway
        });
    } catch (error) {
      Utils.error(`Failed to initialize renderer: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the Entity Manager system
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the entity manager is initialized
 */
async function initializeEntitySystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing entity system...", "main");

      // Create a minimal entity manager if class is not available
      let EntityManager;

      if (typeof window.EntityManager === "function") {
        EntityManager = window.EntityManager;
      } else {
        // Fallback entity manager
        EntityManager = class MinimalEntityManager {
          constructor(game) {
            this.game = game;
            this.entities = [];
            this.nextId = 1;
            this.eventListeners = {};

            Utils.log("Using minimal entity manager", "entity");
          }

          on(event, callback) {
            if (!this.eventListeners[event]) {
              this.eventListeners[event] = [];
            }
            this.eventListeners[event].push(callback);
          }

          emit(event, data) {
            if (this.eventListeners[event]) {
              for (const callback of this.eventListeners[event]) {
                callback(data);
              }
            }
          }

          createEntity(type, properties = {}) {
            const entity = {
              id: this.nextId++,
              type,
              ...properties,
            };
            this.entities.push(entity);
            this.emit("entityCreated", { entity });
            return entity;
          }

          getEntityById(id) {
            return this.entities.find((e) => e.id === id) || null;
          }

          getEntitiesByType(owner, type, subtype) {
            return this.entities.filter((e) => {
              if (owner !== undefined && e.owner !== owner) return false;
              if (type !== undefined && e.type !== type) return false;
              if (subtype !== undefined && e.subtype !== subtype) return false;
              return true;
            });
          }

          getEntitiesInRect(x, y, width, height) {
            return this.entities.filter((e) => {
              const ex = e.x || 0;
              const ey = e.y || 0;
              const ew = e.width || 1;
              const eh = e.height || 1;

              return (
                ex < x + width && ex + ew > x && ey < y + height && ey + eh > y
              );
            });
          }

          update(deltaTime) {
            // Update all entities that have an update method
            for (const entity of this.entities) {
              if (entity.update) {
                try {
                  entity.update(deltaTime);
                } catch (error) {
                  Utils.error(
                    `Error updating entity ${entity.id}: ${error.message}`
                  );
                }
              }
            }
          }
        };
      }

      // Create entity manager instance
      const entityManager = new EntityManager(game);

      // Register the entity manager
      game.registerSystem("entityManager", entityManager);

      Utils.log("Entity manager initialized", "entity");
      resolve(entityManager);
    } catch (error) {
      Utils.error(`Failed to initialize entity manager: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the Resource Manager system
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the resource manager is initialized
 */
async function initializeResourceSystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing resource system...", "main");

      // Create a minimal resource manager if class is not available
      let ResourceManager;

      if (typeof window.ResourceManager === "function") {
        ResourceManager = window.ResourceManager;
      } else {
        // Fallback resource manager
        ResourceManager = class MinimalResourceManager {
          constructor(game) {
            this.game = game;
            this.playerResources = {};

            // Initialize resources for all players
            this.initializeResources();

            Utils.log("Using minimal resource manager", "resource");
          }

          initializeResources() {
            const defaultStartingResources = {
              wood: 200,
              food: 200,
              gold: 100,
              stone: 0,
              iron: 0,
            };

            // Get starting resources from CONFIG if available
            const startingResources =
              window.CONFIG?.RESOURCES?.STARTING || defaultStartingResources;

            // Set up resources for each player
            for (const player of this.game.players) {
              this.playerResources[player.id] = { ...startingResources };
            }
          }

          getResource(playerId, resourceType) {
            if (!this.playerResources[playerId]) return 0;
            return this.playerResources[playerId][resourceType] || 0;
          }

          modifyResource(playerId, resourceType, amount) {
            if (!this.playerResources[playerId]) {
              this.playerResources[playerId] = {};
            }

            if (!this.playerResources[playerId][resourceType]) {
              this.playerResources[playerId][resourceType] = 0;
            }

            this.playerResources[playerId][resourceType] += amount;

            // Ensure resources don't go negative
            if (this.playerResources[playerId][resourceType] < 0) {
              this.playerResources[playerId][resourceType] = 0;
            }

            return this.playerResources[playerId][resourceType];
          }

          update() {
            // Nothing to update in minimal resource manager
          }
        };
      }

      // Create resource manager instance
      const resourceManager = new ResourceManager(game);

      // Register the resource manager
      game.registerSystem("resourceManager", resourceManager);

      Utils.log("Resource manager initialized", "resource");
      resolve(resourceManager);
    } catch (error) {
      Utils.error(`Failed to initialize resource manager: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the Input System
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the input system is initialized
 */
async function initializeInputSystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing input system...", "main");

      // Create a minimal input system
      const inputSystem = {
        game: game,
        canvas: document.getElementById("game-canvas"),

        mouse: {
          x: 0,
          y: 0,
          gridX: 0,
          gridY: 0,
          isDown: false,
        },

        currentAction: {
          type: null,
          data: null,
        },

        init: function () {
          if (!this.canvas) {
            Utils.error("Canvas element not found for input system!");
            return;
          }

          // Add event listeners
          this.canvas.addEventListener(
            "mousemove",
            this.handleMouseMove.bind(this)
          );
          this.canvas.addEventListener(
            "mousedown",
            this.handleMouseDown.bind(this)
          );
          this.canvas.addEventListener(
            "mouseup",
            this.handleMouseUp.bind(this)
          );
          this.canvas.addEventListener(
            "wheel",
            this.handleMouseWheel.bind(this)
          );

          window.addEventListener("keydown", this.handleKeyDown.bind(this));
          window.addEventListener("keyup", this.handleKeyUp.bind(this));

          Utils.log("Input event handlers attached", "input");
        },

        update: function () {
          // Nothing to update in minimal input system
        },

        handleMouseMove: function (event) {
          this.mouse.x = event.clientX;
          this.mouse.y = event.clientY;

          // Convert to grid coordinates
          const renderer = this.game.getSystem("renderer");
          if (renderer) {
            const worldX = renderer.screenToWorldX(this.mouse.x);
            const worldY = renderer.screenToWorldY(this.mouse.y);

            const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;

            this.mouse.gridX = Math.floor(worldX / tileSize);
            this.mouse.gridY = Math.floor(worldY / tileSize);
          }
        },

        handleMouseDown: function (event) {
          this.mouse.isDown = true;

          // Set action to select
          this.currentAction = {
            type: "select",
            startX: this.mouse.x,
            startY: this.mouse.y,
            selectionBox: null,
          };
        },

        handleMouseUp: function (event) {
          this.mouse.isDown = false;

          // If selecting, perform selection
          if (this.currentAction.type === "select") {
            // For now, just clear the action
            this.currentAction = { type: null };
          }
        },

        handleMouseWheel: function (event) {
          const renderer = this.game.getSystem("renderer");
          if (renderer) {
            // Zoom in or out
            const direction = event.deltaY < 0 ? 1 : -1;
            renderer.zoom(direction, event.clientX, event.clientY);
          }

          // Prevent default scroll behavior
          event.preventDefault();
        },

        handleKeyDown: function (event) {
          const key = event.key.toLowerCase();

          // Handle camera panning with arrow keys
          const renderer = this.game.getSystem("renderer");
          if (renderer) {
            const panSpeed = 10;

            switch (key) {
              case "arrowup":
              case "w":
                renderer.pan(0, -panSpeed);
                break;
              case "arrowdown":
              case "s":
                renderer.pan(0, panSpeed);
                break;
              case "arrowleft":
              case "a":
                renderer.pan(-panSpeed, 0);
                break;
              case "arrowright":
              case "d":
                renderer.pan(panSpeed, 0);
                break;
            }
          }

          // Debug toggle
          if (key === "`" || key === "backquote") {
            const renderer = this.game.getSystem("renderer");
            if (renderer) {
              renderer.toggleDebug();
            }
          }

          // Test button actions
          if (key === "t") {
            const btnTest = document.getElementById("btnTest");
            if (btnTest) btnTest.click();
          }
        },

        handleKeyUp: function (event) {
          // Nothing special to do on key up yet
        },
      };

      // Initialize input system
      inputSystem.init();

      // Register the input system
      game.registerSystem("input", inputSystem);

      Utils.log("Input system initialized", "input");
      resolve(inputSystem);
    } catch (error) {
      Utils.error(`Failed to initialize input system: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the UI System
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the UI system is initialized
 */
async function initializeUISystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing UI system...", "main");

      // Create a minimal UI system
      const uiSystem = {
        game: game,

        // UI element references
        elements: {
          resources: document.getElementById("resources"),
          entityInfo: document.getElementById("entity-info"),
          actionsPanel: document.getElementById("actions-panel"),
          messages: document.getElementById("messages"),
          ageDisplay: document.getElementById("age-display"),
          minimap: document.getElementById("minimap"),
          selectionInfo: document.getElementById("selection-info"),
        },

        init: function () {
          // Initialize UI elements
          this.updateResourceDisplay();
          this.updateAgeDisplay();
        },

        update: function () {
          // Update UI elements
          this.updateResourceDisplay();
        },

        render: function (ctx) {
          // Nothing to render in minimal UI system
        },

        updateResourceDisplay: function () {
          if (!this.elements.resources) return;

          const resourceManager = this.game.getSystem("resourceManager");
          if (!resourceManager) return;

          const resources =
            resourceManager.playerResources[this.game.currentPlayer];
          if (!resources) return;

          // Create HTML for resources
          let html = "";

          for (const [resource, amount] of Object.entries(resources)) {
            html += `
              <div class="resource">
                <div class="resource-icon ${resource}">${resource
              .charAt(0)
              .toUpperCase()}</div>
                <span>${amount}</span>
              </div>
            `;
          }

          this.elements.resources.innerHTML = html;
        },

        updateAgeDisplay: function () {
          if (!this.elements.ageDisplay) return;

          // Just display Stone Age for now
          this.elements.ageDisplay.textContent = "Age: Stone Age";
        },

        displayMessage: function (message, isImportant = false) {
          if (!this.elements.messages) return;

          this.elements.messages.textContent = message;

          if (isImportant) {
            this.elements.messages.style.color = "#ff0000";
            this.elements.messages.style.fontWeight = "bold";
          } else {
            this.elements.messages.style.color = "#ffffff";
            this.elements.messages.style.fontWeight = "normal";
          }

          // Auto-hide after a few seconds
          setTimeout(() => {
            if (this.elements.messages.textContent === message) {
              this.elements.messages.textContent = "";
            }
          }, 5000);
        },

        showVictoryScreen: function (data) {
          if (!this.elements.messages) return;

          this.elements.messages.textContent = `${data.victoryInfo.name.toUpperCase()}!`;
          this.elements.messages.style.color = "#ffff00";
          this.elements.messages.style.fontWeight = "bold";
        },

        showDefeatScreen: function (data) {
          if (!this.elements.messages) return;

          this.elements.messages.textContent = "DEFEAT!";
          this.elements.messages.style.color = "#ff0000";
          this.elements.messages.style.fontWeight = "bold";
        },
      };

      // Initialize UI system
      uiSystem.init();

      // Register the UI system
      game.registerSystem("uiManager", uiSystem);

      Utils.log("UI system initialized", "ui");
      resolve(uiSystem);
    } catch (error) {
      Utils.error(`Failed to initialize UI system: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Initialize the Victory System
 * @param {Object} game - The game container
 * @returns {Promise} Promise that resolves when the victory system is initialized
 */
async function initializeVictorySystem(game) {
  return new Promise((resolve, reject) => {
    try {
      Utils.log("Initializing victory system...", "main");

      // Check if VictorySystem class exists
      if (typeof VictorySystem === "function") {
        // Create victory system
        const victorySystem = new VictorySystem(game);

        // Initialize victory system
        victorySystem.init();

        // Register the victory system
        game.registerSystem("victorySystem", victorySystem);

        Utils.log("Victory system initialized", "victory");
        resolve(victorySystem);
      } else {
        // Create a minimal victory system
        const minVictorySystem = {
          game: game,
          gameStarted: false,
          gameEnded: false,
          startupGracePeriod: 60000, // 60 seconds grace period

          init: function () {
            Utils.log("Minimal victory system initialized", "victory");
          },

          update: function (deltaTime) {
            // Update game time
            if (!this.game.gameTime) {
              this.game.gameTime = 0;
            }

            // Don't check for victory during grace period
            if (this.game.gameTime < this.startupGracePeriod) {
              // Clear any victory messages
              const uiManager = this.game.getSystem("uiManager");
              if (uiManager && uiManager.elements.messages) {
                uiManager.elements.messages.textContent = "";
              }
              return;
            }

            // Set game as started once past grace period
            if (
              !this.gameStarted &&
              this.game.gameTime >= this.startupGracePeriod
            ) {
              this.gameStarted = true;
              Utils.log(
                "Game started properly, victory conditions now active",
                "victory"
              );
            }
          },

          isGameOver: function () {
            return this.gameEnded;
          },
        };

        // Initialize victory system
        minVictorySystem.init();

        // Register the victory system
        game.registerSystem("victorySystem", minVictorySystem);

        Utils.log("Minimal victory system initialized", "victory");
        resolve(minVictorySystem);
      }
    } catch (error) {
      Utils.error(`Failed to initialize victory system: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Create initial game entities (player units, buildings, etc.)
 * @param {Object} game - The game container
 */
function createInitialEntities(game) {
  try {
    Utils.log("Creating initial game entities...", "main");

    const entityManager = game.getSystem("entityManager");
    const map = game.getSystem("map");

    if (!entityManager || !map) {
      Utils.log(
        "Entity manager or map not available, skipping entity creation",
        "warning"
      );
      return;
    }

    // Create starting units for player and AI
    createStartingEntities(game, 0); // Player
    createStartingEntities(game, 1); // AI

    Utils.log("Initial entities created", "main");
  } catch (error) {
    Utils.error(`Failed to create initial entities: ${error.message}`);
    console.error(error);
  }
}

/**
 * Create starting entities for a player
 * @param {Object} game - The game container
 * @param {number} playerId - ID of the player
 */
function createStartingEntities(game, playerId) {
  const entityManager = game.getSystem("entityManager");
  const map = game.getSystem("map");

  if (!entityManager || !map) return;

  try {
    // Determine start position based on player ID
    const startX =
      playerId === 0
        ? Math.floor(map.width * 0.15) // Player start in top-left
        : Math.floor(map.width * 0.85); // AI start in bottom-right

    const startY =
      playerId === 0
        ? Math.floor(map.height * 0.15)
        : Math.floor(map.height * 0.85);

    // Get civilization
    const civ = game.players[playerId].civilization.toUpperCase();

    // Create town center
    const townCenter = entityManager.createEntity("building", {
      owner: playerId,
      civilization: civ,
      buildingType: "townCenter",
      x: startX,
      y: startY,
      width: 2,
      height: 2,
      hp: 500,
      maxHp: 500,
      isCritical: true,
      constructionProgress: 100, // Already built
    });

    // Create initial villagers
    for (let i = 0; i < 3; i++) {
      const offsetX = -1 + (i % 3);
      const offsetY = 2 + Math.floor(i / 3);

      entityManager.createEntity("villager", {
        owner: playerId,
        civilization: civ,
        x: startX + offsetX,
        y: startY + offsetY,
        hp: 50,
        maxHp: 50,
        state: "idle",
      });
    }

    // Create initial soldiers
    if (playerId === 0) {
      // Only for human player
      entityManager.createEntity("unit", {
        owner: playerId,
        civilization: civ,
        unitType: "infantry",
        x: startX - 2,
        y: startY + 3,
        hp: 100,
        maxHp: 100,
        state: "idle",
      });
    }

    Utils.log(`Created starting entities for player ${playerId}`, "entity");
  } catch (error) {
    Utils.error(
      `Failed to create starting entities for player ${playerId}: ${error.message}`
    );
    console.error(error);
  }
}

/**
 * Add a test map render button (development use only)
 */
function addTestButtons() {
  // Create button container if it doesn't exist
  let buttonContainer = document.getElementById("debug-buttons");
  if (!buttonContainer) {
    buttonContainer = document.createElement("div");
    buttonContainer.id = "debug-buttons";
    buttonContainer.style.position = "absolute";
    buttonContainer.style.right = "10px";
    buttonContainer.style.top = "10px";
    buttonContainer.style.zIndex = "1000";
    document.body.appendChild(buttonContainer);
  }

  // Add Test Map Render button
  const btnTest = document.createElement("button");
  btnTest.id = "btnTest";
  btnTest.textContent = "Test Map Render";
  btnTest.onclick = () => {
    const game = window.gameInstance;
    if (!game) return;

    const map = game.getSystem("map");
    const renderer = game.getSystem("renderer");

    if (map && renderer) {
      Utils.log("Testing map renderer", "debug");
      renderer.centerCamera();
      renderer.render();
    }
  };

  // Add Debug Toggle button
  const btnDebug = document.createElement("button");
  btnDebug.textContent = "Toggle Debug";
  btnDebug.onclick = () => {
    const game = window.gameInstance;
    if (!game) return;

    const renderer = game.getSystem("renderer");
    if (renderer) {
      renderer.toggleDebug();
    }
  };

  // Add buttons to container
  buttonContainer.appendChild(btnTest);
  buttonContainer.appendChild(btnDebug);
}

// Add test buttons in development mode
if (window.CONFIG?.DEBUG_MODE) {
  document.addEventListener("DOMContentLoaded", addTestButtons);
}
