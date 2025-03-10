/**
 * Empires of Eternity - Game Engine
 * Core game engine that manages all game systems and logic
 */

class GameEngine {
  constructor(config = {}) {
    // Game systems
    this.systems = {};

    // Game state
    this.gameTime = 0;
    this.deltaTime = 0;
    this.lastUpdateTime = 0;
    this.running = false;
    this.initialized = false;

    // Player data
    this.players = [
      { id: 0, civilization: "solari", isHuman: true, name: "Player 1" },
      { id: 1, civilization: "lunari", isHuman: false, name: "AI 1" },
    ];
    this.currentPlayer = 0; // Human player ID

    // Create global references for easy access
    window.gameEngine = this;

    // Events system
    this.events = {};

    // Canvas and context
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Map size and view
    this.mapSize = { width: 2000, height: 2000 };
    this.viewPort = { 
        x: 0, 
        y: 0, 
        width: this.canvas.width, 
        height: this.canvas.height 
    };
    
    // Game time tracking
    this.gameTime = 0;
    this.dayNightCycle = {
        currentTime: 0,
        dayLength: 300, // 5 minutes per day/night cycle
        isDay: true
    };
    
    // Game state flags
    this.paused = false;
    this.debugMode = false;
    
    // Game speed (for fast-forward)
    this.gameSpeed = 1.0;
    
    // Bind methods
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    
    // Config
    this.config = Object.assign({}, window.CONFIG || {}, config);

    console.log("Game Engine created");
  }

  /**
   * Initialize the game engine and all systems
   * @param {Object} options - Initialization options
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async init(options = {}) {
    console.log("Initializing Game Engine...");

    // Prevent multiple initializations
    if (this.initialized) {
      console.warn("Game Engine already initialized");
      return Promise.resolve(this);
    }

    try {
      // First, initialize utility system (required by all other systems)
      this.initUtils();
      Utils.log("Utils initialized", "engine");

      // Create necessary directories in assets if they don't exist (for development)
      this.createAssetDirectories();

      // Next, initialize each core system in dependency order
      await this.initSystems(options);

      // Mark as initialized
      this.initialized = true;
      Utils.log("Game Engine initialized successfully", "engine");

      return this;
    } catch (error) {
      Utils.log("Error initializing Game Engine: " + error.message, "error");
      console.error(error);
      throw error;
    }
  }

  /**
   * Initialize the Utils global object with utility functions
   */
  initUtils() {
    // Create global Utils object
    window.Utils = {
      // Logging with categories
      log: function (message, category = "info") {
        const prefix = `[${category.toUpperCase()}] `;
        console.log(prefix + message);

        // Also update status element if available
        const statusEl = document.getElementById("loading-status");
        if (statusEl && category !== "debug") {
          statusEl.textContent = message;
        }
      },

      // Error logging
      error: function (message) {
        console.error("[ERROR] " + message);

        // Also update status element if available
        const statusEl = document.getElementById("loading-status");
        if (statusEl) {
          statusEl.textContent = "Error: " + message;
          statusEl.style.color = "red";
        }
      },

      // Math utilities
      randomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      },

      clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
      },

      lerp: function (a, b, t) {
        return a + (b - a) * t;
      },

      // Distance between two points
      distance: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      },

      // Check if a point is inside a rectangle
      pointInRect: function (px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
      },

      // Parse URL parameters
      getUrlParam: function (param, defaultValue = null) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param) || defaultValue;
      },

      // Deep clone an object
      deepClone: function (obj) {
        return JSON.parse(JSON.stringify(obj));
      },
    };
  }

  /**
   * Ensure necessary asset directories exist
   * This helps prevent errors if assets are missing
   */
  createAssetDirectories() {
    // In a browser environment, we can't create directories directly
    // This method creates empty placeholder images for assets that might be missing

    // Create a function to create placeholder images for missing assets
    window.createPlaceholderAsset = function (type, color = "#999999") {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Draw colored background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 64, 64);

      // Draw text label
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(type, 32, 32);

      // Draw border
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 64, 64);

      const img = new Image();
      img.src = canvas.toDataURL();
      return img;
    };

    // Create a global object to hold placeholder assets
    window.placeholderAssets = {
      terrain: {
        plains: createPlaceholderAsset("Plains", "#8FB36D"),
        forest: createPlaceholderAsset("Forest", "#2D6A4F"),
        desert: createPlaceholderAsset("Desert", "#F2CC8F"),
        hills: createPlaceholderAsset("Hills", "#A68C69"),
        mountains: createPlaceholderAsset("Mountains", "#6F6F6F"),
      },
      resources: {
        wood: createPlaceholderAsset("Wood", "#8B4513"),
        food: createPlaceholderAsset("Food", "#FF6347"),
        gold: createPlaceholderAsset("Gold", "#FFD700"),
        stone: createPlaceholderAsset("Stone", "#A9A9A9"),
        iron: createPlaceholderAsset("Iron", "#708090"),
      },
      units: {
        solari: {
          villager: createPlaceholderAsset("S-Villager", "#FFD700"),
          infantry: createPlaceholderAsset("S-Infantry", "#FFD700"),
          ranged: createPlaceholderAsset("S-Ranged", "#FFD700"),
        },
        lunari: {
          villager: createPlaceholderAsset("L-Villager", "#C0C0C0"),
          infantry: createPlaceholderAsset("L-Infantry", "#C0C0C0"),
          ranged: createPlaceholderAsset("L-Ranged", "#C0C0C0"),
        },
      },
      buildings: {
        solari: {
          house: createPlaceholderAsset("S-House", "#FFD700"),
          barracks: createPlaceholderAsset("S-Barracks", "#FFD700"),
          wonder: createPlaceholderAsset("S-Wonder", "#FFD700"),
          wall: createPlaceholderAsset("S-Wall", "#FFD700"),
        },
        lunari: {
          house: createPlaceholderAsset("L-House", "#C0C0C0"),
          barracks: createPlaceholderAsset("L-Barracks", "#C0C0C0"),
          wonder: createPlaceholderAsset("L-Wonder", "#C0C0C0"),
          wall: createPlaceholderAsset("L-Wall", "#C0C0C0"),
        },
      },
      effects: {
        attack: createPlaceholderAsset("Attack", "#FF0000"),
        build: createPlaceholderAsset("Build", "#00FF00"),
        gather: createPlaceholderAsset("Gather", "#0000FF"),
        repair: createPlaceholderAsset("Repair", "#FFFF00"),
      },
      ui: {
        selection: createPlaceholderAsset("Selection", "#FFFFFF"),
        panel: createPlaceholderAsset("Panel", "#333333"),
      },
    };
  }

  /**
   * Initialize all game systems
   * @param {Object} options - Initialization options
   * @returns {Promise} Promise that resolves when systems are initialized
   */
  async initSystems(options) {
    try {
      // Update loading status
      Utils.log("Initializing game systems...", "engine");

      // 1. Create basic manager for system registration
      this.systemManager = {
        register: (name, system) => {
          this.systems[name] = system;
          return system;
        },
        get: (name) => this.systems[name],
      };

      // 2. Initialize core systems in dependency order

      // Create map system first (other systems depend on it)
      this.initMapSystem(options);

      // Create renderer (depends on map)
      await this.initRendererSystem(options);

      // Create entity manager (depends on map and renderer)
      this.initEntitySystem(options);

      // Create resource manager
      this.initResourceSystem(options);

      // Create AI system
      this.initAISystem(options);

      // Create input system (depends on renderer)
      this.initInputSystem(options);

      // Create UI system (depends on entity and resource managers)
      this.initUISystem(options);

      // Create victory system last (depends on entity, resource, and UI)
      this.initVictorySystem(options);

      Utils.log("All game systems initialized", "engine");
      return Promise.resolve();
    } catch (error) {
      Utils.error(`Failed to initialize game systems: ${error.message}`);
      return Promise.reject(error);
    }
  }

  /**
   * Initialize the map system
   * @param {Object} options - Map options
   */
  initMapSystem(options) {
    Utils.log("Initializing map system...", "engine");

    // Create map system
    if (typeof Map === "undefined") {
      Utils.error("Map class not found!");

      // Create a fallback minimal Map class
      window.Map = class FallbackMap {
        constructor(game) {
          this.game = game;
          this.width = 40;
          this.height = 40;
          this.tiles = [];
          this.fogOfWar = [];
          this.resources = [];

          this.initializeEmptyMap();
        }

        initializeEmptyMap() {
          // Create empty tile arrays
          this.tiles = new Array(this.height);
          this.fogOfWar = new Array(this.height);

          for (let y = 0; y < this.height; y++) {
            this.tiles[y] = new Array(this.width);
            this.fogOfWar[y] = new Array(this.width).fill(0);

            for (let x = 0; x < this.width; x++) {
              // Checkerboard pattern for fallback
              const isEven = (x + y) % 2 === 0;
              const terrainType = isEven ? "plains" : "desert";

              this.tiles[y][x] = {
                type: terrainType,
                elevation: 0,
                moisture: 0,
                passable: true,
                buildable: true,
              };
            }
          }
        }

        generate(size, options = {}) {
          this.width = size;
          this.height = size;
          this.initializeEmptyMap();
          return this;
        }

        // Simplified required methods
        updateVisibility() {}
        getTile(x, y) {
          if (x < 0 || y < 0 || x >= this.width || y >= this.height)
            return null;
          return this.tiles[y][x];
        }
        isTerrainBuildable() {
          return true;
        }
        getResourceAt() {
          return null;
        }
        update() {}
      };
    }

    // Create the map system
    const mapSystem = new Map(this);

    // Get map size from options or CONFIG
    const mapSize =
      options.mapSize ||
      (CONFIG && CONFIG.MAP && CONFIG.MAP.DEFAULT_SIZE) ||
      40;

    // Generate the map
    mapSystem.generate(mapSize, {
      seed: options.seed || Math.floor(Math.random() * 1000000),
      terrainVariation: options.terrainVariation || 0.7,
      resourceDensity:
        options.resourceDensity ||
        (CONFIG && CONFIG.MAP && CONFIG.MAP.RESOURCE_DENSITY) ||
        0.12,
      symmetric: options.symmetric !== undefined ? options.symmetric : true,
    });

    // Register the map system
    this.systemManager.register("map", mapSystem);

    Utils.log(`Map generated: ${mapSize}x${mapSize}`, "map");
    return mapSystem;
  }

  /**
   * Initialize the renderer system
   * @param {Object} options - Renderer options
   * @returns {Promise} Promise that resolves when renderer is initialized
   */
  async initRendererSystem(options) {
    Utils.log("Initializing renderer system...", "engine");

    // Create renderer system
    if (typeof Renderer === "undefined") {
      Utils.error("Renderer class not found!");
      return null;
    }

    // Get canvas
    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
      Utils.error("Canvas element not found!");
      return null;
    }

    // Create the renderer
    const renderer = new Renderer(this);

    // Initialize renderer
    renderer.init(canvas);

    // Override asset loading to use placeholders when real assets fail to load
    const originalLoadAssets = renderer.loadAssets;
    renderer.loadAssets = async function () {
      try {
        // First try to load real assets
        await originalLoadAssets.call(this);
      } catch (error) {
        Utils.log("Using placeholder assets due to loading errors", "renderer");

        // Fall back to placeholder assets
        this.assets.terrainTiles = window.placeholderAssets.terrain;
        this.assets.resources = window.placeholderAssets.resources;
        this.assets.units = window.placeholderAssets.units;
        this.assets.buildings = window.placeholderAssets.buildings;
        this.assets.effects = window.placeholderAssets.effects;
        this.assets.ui = window.placeholderAssets.ui;
      }

      return Promise.resolve();
    };

    // Load assets
    await renderer.loadAssets();

    // Register the renderer system
    this.systemManager.register("renderer", renderer);

    Utils.log("Renderer initialized", "renderer");
    return renderer;
  }

  /**
   * Initialize the entity system
   * @param {Object} options - Entity system options
   */
  initEntitySystem(options) {
    Utils.log("Initializing entity system...", "engine");

    // Create a simplified entity manager if the real one isn't available
    if (typeof window.EntityManager === "undefined") {
      Utils.log(
        "EntityManager class not found, creating minimal implementation",
        "warning"
      );

      // Create a fallback minimal EntityManager class
      window.EntityManager = class FallbackEntityManager {
        constructor(game) {
          this.game = game;
          this.entities = [];
          this.nextId = 1;
          this.eventListeners = {};
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
          // Nothing to update in fallback
        }
      };
    }

    // Create entity manager
    const entityManager = new window.EntityManager(this);

    // Register the entity manager
    this.systemManager.register("entityManager", entityManager);

    Utils.log("Entity system initialized", "engine");
    return entityManager;
  }

  /**
   * Initialize the resource system
   * @param {Object} options - Resource system options
   */
  initResourceSystem(options) {
    Utils.log("Initializing resource system...", "engine");

    // Create a simplified resource manager if the real one isn't available
    if (typeof window.ResourceManager === "undefined") {
      Utils.log(
        "ResourceManager class not found, creating minimal implementation",
        "warning"
      );

      // Create a fallback ResourceManager class
      window.ResourceManager = class FallbackResourceManager {
        constructor(game) {
          this.game = game;
          this.playerResources = {};

          // Initialize starting resources for all players
          this.initializeResources();
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
            (CONFIG && CONFIG.RESOURCES && CONFIG.RESOURCES.STARTING) ||
            defaultStartingResources;

          // Set up resources for each player
          for (const player of this.game.players) {
            this.playerResources[player.id] = {
              ...startingResources,
            };
          }
        }

        getResource(playerId, resourceType) {
          if (!this.playerResources[playerId]) return 0;
          return this.playerResources[playerId][resourceType] || 0;
        }

        modifyResource(playerId, resourceType, amount) {
          if (!this.playerResources[playerId]) return 0;

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

        canAfford(playerId, costs) {
          if (!this.playerResources[playerId]) return false;

          for (const [resourceType, amount] of Object.entries(costs)) {
            if ((this.playerResources[playerId][resourceType] || 0) < amount) {
              return false;
            }
          }

          return true;
        }

        deductResources(playerId, costs) {
          if (!this.canAfford(playerId, costs)) return false;

          for (const [resourceType, amount] of Object.entries(costs)) {
            this.modifyResource(playerId, resourceType, -amount);
          }

          return true;
        }

        update(deltaTime) {
          // Nothing to update in fallback
        }
      };
    }

    // Create resource manager
    const resourceManager = new window.ResourceManager(this);

    // Register the resource manager
    this.systemManager.register("resourceManager", resourceManager);

    Utils.log("Resource system initialized", "engine");
    return resourceManager;
  }

  /**
   * Initialize the AI system
   * @param {Object} options - AI system options
   */
  initAISystem(options) {
    Utils.log("Initializing AI system...", "engine");

    // Simplified AI system
    const aiSystem = {
      game: this,
      update: function (deltaTime) {
        // No AI behavior in simplified version
      },
    };

    // Register the AI system
    this.systemManager.register("aiSystem", aiSystem);

    Utils.log("AI system initialized", "engine");
    return aiSystem;
  }

  /**
   * Initialize the input system
   * @param {Object} options - Input system options
   */
  initInputSystem(options) {
    Utils.log("Initializing input system...", "engine");

    // Create a simplified input system
    const inputSystem = {
      game: this,
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
        if (!this.canvas) return;

        this.canvas.addEventListener(
          "mousemove",
          this.handleMouseMove.bind(this)
        );
        this.canvas.addEventListener(
          "mousedown",
          this.handleMouseDown.bind(this)
        );
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("wheel", this.handleMouseWheel.bind(this));

        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));

        Utils.log("Input event handlers attached", "input");
      },

      update: function (deltaTime) {
        // Nothing to update in simplified input system
      },

      handleMouseMove: function (event) {
        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;

        // Convert to grid coordinates
        const renderer = this.game.getSystem("renderer");
        if (renderer) {
          const worldX = renderer.screenToWorldX(this.mouse.x);
          const worldY = renderer.screenToWorldY(this.mouse.y);

          const tileSize = (CONFIG && CONFIG.MAP && CONFIG.MAP.TILE_SIZE) || 64;

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
      },

      handleKeyUp: function (event) {
        // Handle key up events if needed
      },
    };

    // Initialize the input system
    inputSystem.init();

    // Register the input system
    this.systemManager.register("input", inputSystem);

    Utils.log("Input system initialized", "engine");
    return inputSystem;
  }

  /**
   * Initialize the UI system
   * @param {Object} options - UI system options
   */
  initUISystem(options) {
    Utils.log("Initializing UI system...", "engine");

    // Create a simplified UI system
    const uiSystem = {
      game: this,

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

      // Initialize UI
      init: function () {
        this.updateResourceDisplay();
        this.updateAgeDisplay();

        Utils.log("UI elements initialized", "ui");
      },

      // Update UI state
      update: function (deltaTime) {
        this.updateResourceDisplay();
      },

      // Custom render function for canvas-based UI elements
      render: function (ctx) {
        // Nothing to render in simplified UI
      },

      // Update resource display
      updateResourceDisplay: function () {
        if (!this.elements.resources) return;

        const resourceManager = this.game.getSystem("resourceManager");
        if (!resourceManager) return;

        const playerResources =
          resourceManager.playerResources[this.game.currentPlayer];
        if (!playerResources) return;

        // Create resource display HTML
        let html = "";

        for (const [resource, amount] of Object.entries(playerResources)) {
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

      // Update age display
      updateAgeDisplay: function () {
        if (!this.elements.ageDisplay) return;

        // For now, just display Stone Age
        this.elements.ageDisplay.textContent = "Age: Stone Age";
      },

      // Display a message
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

      // Display victory screen
      showVictoryScreen: function (data) {
        if (!this.elements.messages) return;

        this.elements.messages.textContent = `${data.victoryInfo.name.toUpperCase()}!`;
        this.elements.messages.style.color = "#ffff00";
        this.elements.messages.style.fontWeight = "bold";
      },

      // Display defeat screen
      showDefeatScreen: function (data) {
        if (!this.elements.messages) return;

        this.elements.messages.textContent = "DEFEAT!";
        this.elements.messages.style.color = "#ff0000";
        this.elements.messages.style.fontWeight = "bold";
      },
    };

    // Initialize the UI system
    uiSystem.init();

    // Register the UI system
    this.systemManager.register("uiManager", uiSystem);

    Utils.log("UI system initialized", "engine");
    return uiSystem;
  }

  /**
   * Initialize the victory system
   * @param {Object} options - Victory system options
   */
  initVictorySystem(options) {
    Utils.log("Initializing victory system...", "engine");

    // Load VictorySystem if available
    if (typeof window.VictorySystem === "function") {
      try {
        const victorySystem = new window.VictorySystem(this);

        // Initialize victory system
        victorySystem.init();

        // Register the victory system
        this.systemManager.register("victorySystem", victorySystem);

        Utils.log("Victory system initialized", "engine");
        return victorySystem;
      } catch (error) {
        Utils.error(`Error initializing victory system: ${error.message}`);
      }
    }

    // Fallback to a simplified victory system
    const fallbackVictorySystem = {
      game: this,
      gameStarted: false,
      startupGracePeriod: 60000, // 60 seconds grace period
      gameEnded: false,

      init: function () {
        Utils.log("Simplified victory system initialized", "victory");
      },

      update: function (deltaTime) {
        // Update game time
        if (!this.game.gameTime) {
          this.game.gameTime = 0;
        }
        this.game.gameTime += deltaTime;

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

    // Register the fallback victory system
    this.systemManager.register("victorySystem", fallbackVictorySystem);

    Utils.log("Simplified victory system initialized", "engine");
    return fallbackVictorySystem;
  }

  /**
   * Get a game system by name
   * @param {string} name - Name of the system
   * @returns {Object|null} - The system instance, or null if not found
   */
  getSystem(name) {
    return this.systems[name] || null;
  }

  /**
   * Start the game
   */
  start() {
    Utils.log("Starting game...", "engine");

    if (!this.initialized) {
      Utils.error("Cannot start game: Engine not initialized!");
      return;
    }

    // Set running flag
    this.running = true;

    // Start the game loop
    this.lastUpdateTime = performance.now();
    this.gameLoop();

    Utils.log("Game started", "engine");

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
  }

  /**
   * Main game loop
   */
  gameLoop() {
    // If game is not running, stop the loop
    if (!this.running) return;

    // Calculate delta time
    const currentTime = performance.now();
    this.deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Prevent massive delta times (e.g. after tab was inactive)
    if (this.deltaTime > 1000) {
      this.deltaTime = 1000 / 60; // Cap at 60 FPS equivalent
    }

    // Update all systems
    this.update(this.deltaTime);

    // Render
    this.render();

    // Schedule next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Update all game systems
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Update each system
    for (const systemName in this.systems) {
      const system = this.systems[systemName];
      if (system && typeof system.update === "function") {
        try {
          system.update(deltaTime);
        } catch (error) {
          Utils.error(`Error updating ${systemName} system: ${error.message}`);
          console.error(error);
        }
      }
    }

    // Update game logic
    // ...
  }

  /**
   * Render the game
   */
  render() {
    // Get renderer
    const renderer = this.getSystem("renderer");
    if (!renderer) return;

    // Render the game
    try {
      renderer.render();
    } catch (error) {
      Utils.error(`Error rendering: ${error.message}`);
      console.error(error);
    }
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this.running) return;

    this.running = false;
    Utils.log("Game paused", "engine");
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.running) return;

    this.running = true;
    this.lastUpdateTime = performance.now();
    this.gameLoop();
    Utils.log("Game resumed", "engine");
  }

  /**
   * Stop the game
   */
  stop() {
    this.running = false;
    Utils.log("Game stopped", "engine");
  }

  /**
   * Event system: Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Event system: Trigger event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    if (this.events[event]) {
      for (const callback of this.events[event]) {
        callback(data);
      }
    }
  }
}

// Initialize the game engine when script is loaded
function initGame(selectedCiv = "solari") {
  // Create game engine
  const gameEngine = new GameEngine();

  // Get civilization from URL or parameter
  const civilization = selectedCiv || Utils.getUrlParam("civ", "solari");

  // Set civilization
  gameEngine.players[0].civilization = civilization;

  // Initialize the engine
  gameEngine
    .init()
    .then(() => {
      // Start the game once initialized
      gameEngine.start();
    })
    .catch((error) => {
      console.error("Failed to initialize game:", error);

      // Show error message
      const statusEl = document.getElementById("loading-status");
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = "red";
      }
    });

  return gameEngine;
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameEngine, initGame };
} else {
  window.GameEngine = GameEngine;
  window.initGame = initGame;
}
