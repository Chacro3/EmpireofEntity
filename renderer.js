/**
 * Empires of Entity - Renderer System
 * Handles all visual aspects of the game, from terrain rendering to UI elements
 */

class Renderer {
  constructor(game) {
    this.game = game;
    this.canvas = null;
    this.ctx = null;

    // Camera settings
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      minZoom: 0.5,
      maxZoom: 2,
    };

    // Assets collections
    this.assets = {
      terrainTiles: {},
      resources: {},
      units: {},
      buildings: {},
      effects: {},
      ui: {},
    };

    // Debug mode
    this.debugMode = false;
    this.framesThisSecond = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;

    // PBR rendering materials
    this.materials = {
      diffuse: null,
      alpha: null,
      metalness: null,
      roughness: null,
      normal: null,
    };

    // Render layers for z-ordering
    this.layers = {
      TERRAIN: 0,
      RESOURCES: 1,
      BUILDINGS: 2,
      UNITS: 3,
      EFFECTS: 4,
      UI: 5,
    };

    // Lighting settings for PBR
    this.lighting = {
      direction: { x: 0.5, y: 0.5, z: -1 }, // Light direction
      ambient: 0.3, // Ambient light intensity
      diffuse: 0.7, // Diffuse light intensity
      specular: 0.5, // Specular light intensity
      time: 0, // For moving light (day/night cycle)
    };

    // Keeps track of loaded assets
    this.assetsLoaded = 0;
    this.assetsTotal = 0;

    // Make utils available
    if (!window.Utils) {
      window.Utils = {
        log: function (msg) {
          console.log(msg);
        },
        error: function (msg) {
          console.error(msg);
        },
      };
    }

    Utils.log("Renderer created");
  }

  /**
   * Initialize the renderer with a canvas
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Get canvas dimensions from CONFIG or set defaults
    if (window.CONFIG && window.CONFIG.CANVAS) {
      canvas.width = window.CONFIG.CANVAS.WIDTH || 1280;
      canvas.height = window.CONFIG.CANVAS.HEIGHT || 720;
    } else {
      canvas.width = 1280;
      canvas.height = 720;
    }

    Utils.log(
      `Renderer initialized with canvas ${canvas.width}x${canvas.height}`
    );

    // Set initial camera position to center of map
    this.centerCamera();
  }

  /**
   * Load all required game assets
   * @returns {Promise} Promise that resolves when all assets are loaded
   */
  loadAssets() {
    return new Promise((resolve, reject) => {
      Utils.log("Loading game assets...");

      // First, load the PBR textures for terrain rendering
      this.loadTerrainTextures()
        .then(() => {
          Utils.log("Terrain textures loaded successfully");

          // Next, load other game assets
          this.loadGameAssets()
            .then(() => {
              Utils.log("All game assets loaded successfully");
              resolve();
            })
            .catch((error) => {
              Utils.log("Error loading game assets: " + error.message, "error");
              // Continue anyway with what we could load
              resolve();
            });
        })
        .catch((error) => {
          Utils.log(
            "Error loading terrain textures: " + error.message,
            "error"
          );
          Utils.log("Falling back to placeholder assets");
          this.createPlaceholderAssets();
          resolve(); // Resolve anyway to allow the game to continue
        });
    });
  }

  /**
   * Load the terrain PBR textures
   * @returns {Promise} Promise that resolves when terrain textures are loaded
   */
  loadTerrainTextures() {
    return new Promise((resolve, reject) => {
      const texturesToLoad = [
        { name: "diffuse", path: "assets/images/maps/T_Props_diffuse.png" },
        { name: "alpha", path: "assets/images/maps/T_Props_alpha.png" },
        { name: "metalness", path: "assets/images/maps/T_Props_metalness.png" },
        { name: "roughness", path: "assets/images/maps/T_Props_roughness.png" },
      ];

      this.assetsTotal = texturesToLoad.length;
      this.assetsLoaded = 0;

      texturesToLoad.forEach((texture) => {
        const img = new Image();

        img.onload = () => {
          this.materials[texture.name] = img;
          this.assetsLoaded++;

          Utils.log(
            `Loaded texture: ${texture.name} (${this.assetsLoaded}/${this.assetsTotal})`
          );

          // Once all textures are loaded, process them into terrain tiles
          if (this.assetsLoaded === this.assetsTotal) {
            this.processTerrainTextures()
              .then(() => resolve())
              .catch((error) => reject(error));
          }
        };

        img.onerror = () => {
          Utils.log(`Failed to load texture: ${texture.name}`, "error");
          reject(new Error(`Failed to load texture: ${texture.name}`));
        };

        img.src = texture.path;
      });
    });
  }

  /**
   * Process the loaded PBR textures into usable terrain tiles
   * @returns {Promise} Promise that resolves when processing is complete
   */
  processTerrainTextures() {
    return new Promise(async (resolve, reject) => {
      try {
        Utils.log("Processing terrain textures into tiles...");

        // Create terrain tiles using the PBR textures
        this.assets.terrainTiles.plains = await this.createTerrainTile(
          { x: 0, y: 0, width: 256, height: 256 },
          { r: 100, g: 200, b: 100, a: 0.1 } // Green tint for plains
        );

        this.assets.terrainTiles.forest = await this.createTerrainTile(
          { x: 256, y: 0, width: 256, height: 256 },
          { r: 0, g: 90, b: 0, a: 0.3 } // Dark green tint for forests
        );

        this.assets.terrainTiles.desert = await this.createTerrainTile(
          { x: 0, y: 256, width: 256, height: 256 },
          { r: 210, g: 180, b: 140, a: 0.3 } // Sandy tint for deserts
        );

        this.assets.terrainTiles.hills = await this.createTerrainTile(
          { x: 256, y: 256, width: 256, height: 256 },
          { r: 140, g: 120, b: 100, a: 0.2 } // Brown tint for hills
        );

        this.assets.terrainTiles.mountains = await this.createTerrainTile(
          { x: 512, y: 0, width: 256, height: 256 },
          { r: 80, g: 80, b: 90, a: 0.4 } // Gray tint for mountains
        );

        Utils.log("All terrain tiles created successfully");
        resolve();
      } catch (error) {
        reject(
          new Error("Failed to process terrain textures: " + error.message)
        );
      }
    });
  }

  /**
   * Create a terrain tile using the PBR textures
   * @param {Object} source - Source rectangle in the texture {x, y, width, height}
   * @param {Object} tint - Color tint to apply {r, g, b, a}
   * @returns {Promise<HTMLImageElement>} The created terrain tile image
   */
  createTerrainTile(source, tint) {
    return new Promise((resolve) => {
      // Create a canvas to process the textures
      const canvas = document.createElement("canvas");
      const tileSize = 64; // Size of the terrain tile
      canvas.width = tileSize;
      canvas.height = tileSize;
      const ctx = canvas.getContext("2d");

      // Draw the base diffuse texture
      ctx.drawImage(
        this.materials.diffuse,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        tileSize,
        tileSize
      );

      // Apply the alpha mask if available
      if (this.materials.alpha) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(
          this.materials.alpha,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          tileSize,
          tileSize
        );
        ctx.globalCompositeOperation = "source-over";
      }

      // Apply metalness and roughness as overlay for visual detail
      if (this.materials.metalness) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.3;
        ctx.drawImage(
          this.materials.metalness,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          tileSize,
          tileSize
        );
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1.0;
      }

      if (this.materials.roughness) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.4;
        ctx.drawImage(
          this.materials.roughness,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          tileSize,
          tileSize
        );
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1.0;
      }

      // Apply color tint
      if (tint) {
        ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`;
        ctx.fillRect(0, 0, tileSize, tileSize);
      }

      // Add subtle texture for more visual interest
      this.addTerrainTexture(ctx, tileSize);

      // Create a new image from the canvas
      const terrainTile = new Image();
      terrainTile.onload = () => resolve(terrainTile);
      terrainTile.src = canvas.toDataURL();
    });
  }

  /**
   * Add subtle texture detail to terrain tiles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} size - Size of the terrain tile
   */
  addTerrainTexture(ctx, size) {
    // Add subtle noise pattern
    ctx.save();
    ctx.globalCompositeOperation = "overlay";

    // Create noise pattern
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = Math.random() * 2;

      ctx.fillStyle =
        Math.random() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Load other game assets like resources, units, buildings, etc.
   * @returns {Promise} Promise that resolves when assets are loaded
   */
  loadGameAssets() {
    return new Promise((resolve, reject) => {
      // Collection of asset promises
      const assetPromises = [];

      // Resources assets
      assetPromises.push(
        Promise.all([
          this.loadImage("assets/images/common/wood.png").then(
            (img) => (this.assets.resources.wood = img)
          ),
          this.loadImage("assets/images/common/food.png").then(
            (img) => (this.assets.resources.food = img)
          ),
          this.loadImage("assets/images/common/gold.png").then(
            (img) => (this.assets.resources.gold = img)
          ),
          this.loadImage("assets/images/common/stone.png").then(
            (img) => (this.assets.resources.stone = img)
          ),
          this.loadImage("assets/images/common/iron.png").then(
            (img) => (this.assets.resources.iron = img)
          ),
        ]).catch((error) => {
          Utils.log(
            "Failed to load resource assets, using placeholders",
            "warning"
          );
          this.createPlaceholderResourceAssets();
        })
      );

      // Try to load unit assets
      assetPromises.push(
        this.loadUnitAssets().catch((error) => {
          Utils.log(
            "Failed to load unit assets, using placeholders",
            "warning"
          );
          this.createPlaceholderUnitAssets();
        })
      );

      // Try to load building assets
      assetPromises.push(
        this.loadBuildingAssets().catch((error) => {
          Utils.log(
            "Failed to load building assets, using placeholders",
            "warning"
          );
          this.createPlaceholderBuildingAssets();
        })
      );

      // UI assets
      assetPromises.push(
        Promise.all([
          this.loadImage("assets/images/ui/selection.png").then(
            (img) => (this.assets.ui.selection = img)
          ),
          this.loadImage("assets/images/ui/button.png").then(
            (img) => (this.assets.ui.button = img)
          ),
        ]).catch((error) => {
          Utils.log("Failed to load UI assets, using placeholders", "warning");
          this.createPlaceholderUIAssets();
        })
      );

      // Resolve when all asset groups are loaded (or fallbacks created)
      Promise.all(assetPromises)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  /**
   * Load a single image with error handling
   * @param {string} src - Path to the image
   * @returns {Promise<HTMLImageElement>} Promise that resolves with the loaded image
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = () => {
        Utils.log(`Failed to load image: ${src}`, "warning");
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  /**
   * Try to load unit assets for both civilizations
   * @returns {Promise} Promise that resolves when unit assets are loaded
   */
  loadUnitAssets() {
    return new Promise((resolve, reject) => {
      // Initialize collections
      this.assets.units.solari = {};
      this.assets.units.lunari = {};

      const unitAssetPromises = [];

      // Solari units
      const solariUnits = [
        "villager",
        "infantry",
        "ranged",
        "cavalry",
        "siege",
      ];
      solariUnits.forEach((unit) => {
        unitAssetPromises.push(
          this.loadImage(`assets/images/solari/${unit}.png`)
            .then((img) => (this.assets.units.solari[unit] = img))
            .catch((error) => {
              // Continue without this asset
              Utils.log(`Failed to load Solari ${unit} asset`, "warning");
            })
        );
      });

      // Lunari units
      const lunariUnits = [
        "villager",
        "infantry",
        "ranged",
        "cavalry",
        "siege",
      ];
      lunariUnits.forEach((unit) => {
        unitAssetPromises.push(
          this.loadImage(`assets/images/lunari/${unit}.png`)
            .then((img) => (this.assets.units.lunari[unit] = img))
            .catch((error) => {
              // Continue without this asset
              Utils.log(`Failed to load Lunari ${unit} asset`, "warning");
            })
        );
      });

      // Resolve when all unit assets are loaded or failed
      Promise.all(unitAssetPromises)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  /**
   * Try to load building assets for both civilizations
   * @returns {Promise} Promise that resolves when building assets are loaded
   */
  loadBuildingAssets() {
    return new Promise((resolve, reject) => {
      // Initialize collections
      this.assets.buildings.solari = {};
      this.assets.buildings.lunari = {};

      const buildingAssetPromises = [];

      // Solari buildings
      const solariBuildings = [
        "house",
        "barracks",
        "townCenter",
        "wall",
        "wonder",
      ];
      solariBuildings.forEach((building) => {
        buildingAssetPromises.push(
          this.loadImage(`assets/images/solari/${building}.png`)
            .then((img) => (this.assets.buildings.solari[building] = img))
            .catch((error) => {
              // Continue without this asset
              Utils.log(`Failed to load Solari ${building} asset`, "warning");
            })
        );
      });

      // Lunari buildings
      const lunariBuildings = [
        "house",
        "barracks",
        "townCenter",
        "wall",
        "wonder",
      ];
      lunariBuildings.forEach((building) => {
        buildingAssetPromises.push(
          this.loadImage(`assets/images/lunari/${building}.png`)
            .then((img) => (this.assets.buildings.lunari[building] = img))
            .catch((error) => {
              // Continue without this asset
              Utils.log(`Failed to load Lunari ${building} asset`, "warning");
            })
        );
      });

      // Resolve when all building assets are loaded or failed
      Promise.all(buildingAssetPromises)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  /**
   * Create placeholder assets if loading fails
   */
  createPlaceholderAssets() {
    Utils.log("Creating placeholder assets");

    this.createPlaceholderTerrainAssets();
    this.createPlaceholderResourceAssets();
    this.createPlaceholderUnitAssets();
    this.createPlaceholderBuildingAssets();
    this.createPlaceholderUIAssets();
  }

  /**
   * Create placeholder terrain assets
   */
  createPlaceholderTerrainAssets() {
    const terrainTypes = ["plains", "forest", "desert", "hills", "mountains"];
    const colors = {
      plains: "#8FB36D",
      forest: "#2D6A4F",
      desert: "#F2CC8F",
      hills: "#A68C69",
      mountains: "#6F6F6F",
    };

    terrainTypes.forEach((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Fill with terrain color
      ctx.fillStyle = colors[type];
      ctx.fillRect(0, 0, 64, 64);

      // Add a grid
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 64, 64);

      // Add terrain type label
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(type, 32, 32);

      const img = new Image();
      img.src = canvas.toDataURL();
      this.assets.terrainTiles[type] = img;
    });
  }

  /**
   * Create placeholder resource assets
   */
  createPlaceholderResourceAssets() {
    const resourceTypes = ["wood", "food", "gold", "stone", "iron"];
    const colors = {
      wood: "#8B4513",
      food: "#32CD32",
      gold: "#FFD700",
      stone: "#C0C0C0",
      iron: "#708090",
    };

    resourceTypes.forEach((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      // Fill with resource color
      ctx.fillStyle = colors[type];
      ctx.beginPath();
      ctx.arc(16, 16, 12, 0, Math.PI * 2);
      ctx.fill();

      // Add resource type label
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(type.charAt(0).toUpperCase(), 16, 16);

      const img = new Image();
      img.src = canvas.toDataURL();
      this.assets.resources[type] = img;
    });
  }

  /**
   * Create placeholder unit assets
   */
  createPlaceholderUnitAssets() {
    const unitTypes = ["villager", "infantry", "ranged", "cavalry", "siege"];
    const civilizations = ["solari", "lunari"];
    const colors = {
      solari: "#FFD700", // Gold
      lunari: "#C0C0C0", // Silver
    };

    civilizations.forEach((civ) => {
      this.assets.units[civ] = {};

      unitTypes.forEach((type) => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");

        // Fill with civilization color
        ctx.fillStyle = colors[civ];
        ctx.beginPath();

        // Different shapes for different unit types
        switch (type) {
          case "villager":
            ctx.arc(16, 16, 8, 0, Math.PI * 2); // Circle
            break;
          case "infantry":
            ctx.rect(8, 8, 16, 16); // Square
            break;
          case "ranged":
            ctx.moveTo(16, 8);
            ctx.lineTo(24, 24);
            ctx.lineTo(8, 24);
            ctx.closePath(); // Triangle
            break;
          case "cavalry":
            ctx.moveTo(8, 8);
            ctx.lineTo(24, 8);
            ctx.lineTo(24, 24);
            ctx.lineTo(8, 24);
            ctx.closePath(); // Diamond
            break;
          case "siege":
            ctx.rect(8, 12, 16, 8); // Rectangle
            break;
        }

        ctx.fill();

        // Add border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Add unit type initial
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(type.charAt(0).toUpperCase(), 16, 16);

        const img = new Image();
        img.src = canvas.toDataURL();
        this.assets.units[civ][type] = img;
      });
    });
  }

  /**
   * Create placeholder building assets
   */
  createPlaceholderBuildingAssets() {
    const buildingTypes = ["house", "barracks", "townCenter", "wall", "wonder"];
    const civilizations = ["solari", "lunari"];
    const colors = {
      solari: "#FFD700", // Gold
      lunari: "#C0C0C0", // Silver
    };
    const sizes = {
      house: { width: 32, height: 32 },
      barracks: { width: 48, height: 48 },
      townCenter: { width: 64, height: 64 },
      wall: { width: 16, height: 32 },
      wonder: { width: 96, height: 96 },
    };

    civilizations.forEach((civ) => {
      this.assets.buildings[civ] = {};

      buildingTypes.forEach((type) => {
        const size = sizes[type];
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d");

        // Fill with civilization color
        ctx.fillStyle = colors[civ];
        ctx.rect(0, 0, size.width, size.height);
        ctx.fill();

        // Add border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add building type label
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let displayName = type;
        if (type === "townCenter") displayName = "TC";
        ctx.fillText(displayName, size.width / 2, size.height / 2);

        const img = new Image();
        img.src = canvas.toDataURL();
        this.assets.buildings[civ][type] = img;
      });
    });
  }

  /**
   * Create placeholder UI assets
   */
  createPlaceholderUIAssets() {
    // Selection indicator
    const selCanvas = document.createElement("canvas");
    selCanvas.width = 64;
    selCanvas.height = 64;
    const selCtx = selCanvas.getContext("2d");

    selCtx.strokeStyle = "rgba(0, 255, 0, 0.7)";
    selCtx.lineWidth = 2;
    selCtx.setLineDash([5, 3]);
    selCtx.strokeRect(2, 2, 60, 60);

    const selImg = new Image();
    selImg.src = selCanvas.toDataURL();
    this.assets.ui.selection = selImg;

    // Button
    const btnCanvas = document.createElement("canvas");
    btnCanvas.width = 100;
    btnCanvas.height = 30;
    const btnCtx = btnCanvas.getContext("2d");

    // Button background
    btnCtx.fillStyle = "rgba(80, 80, 80, 0.8)";
    btnCtx.rect(0, 0, 100, 30);
    btnCtx.fill();

    // Button border
    btnCtx.strokeStyle = "rgba(150, 150, 150, 0.9)";
    btnCtx.lineWidth = 1;
    btnCtx.stroke();

    // Button text
    btnCtx.fillStyle = "white";
    btnCtx.font = "12px Arial";
    btnCtx.textAlign = "center";
    btnCtx.textBaseline = "middle";
    btnCtx.fillText("Button", 50, 15);

    const btnImg = new Image();
    btnImg.src = btnCanvas.toDataURL();
    this.assets.ui.button = btnImg;
  }

  /**
   * Center the camera on the map
   */
  centerCamera() {
    const map = this.game.getSystem("map");
    if (!map) return;

    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;

    // Center on middle of map
    this.camera.x = (map.width * tileSize) / 2 - this.canvas.width / 2;
    this.camera.y = (map.height * tileSize) / 2 - this.canvas.height / 2;
  }

  /**
   * Pan the camera by the specified amount
   * @param {number} dx - X amount to pan
   * @param {number} dy - Y amount to pan
   */
  pan(dx, dy) {
    this.camera.x += dx;
    this.camera.y += dy;

    // Apply bounds
    this.applyCameraBounds();
  }

  /**
   * Zoom the camera at the specified point
   * @param {number} direction - Zoom direction (1 for in, -1 for out)
   * @param {number} centerX - X coordinate of the zoom center
   * @param {number} centerY - Y coordinate of the zoom center
   */
  zoom(direction, centerX, centerY) {
    // Get world position before zoom
    const worldX = this.screenToWorldX(centerX);
    const worldY = this.screenToWorldY(centerY);

    // Apply zoom
    const zoomFactor = 0.1;
    const newZoom = this.camera.zoom + direction * zoomFactor;
    this.camera.zoom = Math.max(
      this.camera.minZoom,
      Math.min(this.camera.maxZoom, newZoom)
    );

    // Adjust camera to keep the point under the mouse at the same position
    this.camera.x = worldX - centerX / this.camera.zoom;
    this.camera.y = worldY - centerY / this.camera.zoom;

    // Apply bounds
    this.applyCameraBounds();
  }

  /**
   * Apply bounds to the camera so it doesn't go too far from the map
   */
  applyCameraBounds() {
    const map = this.game.getSystem("map");
    if (!map) return;

    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;

    // Calculate map bounds
    const mapWidth = map.width * tileSize;
    const mapHeight = map.height * tileSize;

    // Calculate visible map area with zoom
    const visibleWidth = this.canvas.width / this.camera.zoom;
    const visibleHeight = this.canvas.height / this.camera.zoom;

    // Apply bounds with some padding
    const padding = 2 * tileSize; // Allow camera to go slightly beyond map edges

    this.camera.x = Math.max(
      -padding,
      Math.min(this.camera.x, mapWidth - visibleWidth + padding)
    );
    this.camera.y = Math.max(
      -padding,
      Math.min(this.camera.y, mapHeight - visibleHeight + padding)
    );
  }

  /**
   * Convert screen X coordinate to world X coordinate
   * @param {number} screenX - Screen X coordinate
   * @returns {number} World X coordinate
   */
  screenToWorldX(screenX) {
    return this.camera.x + screenX / this.camera.zoom;
  }

  /**
   * Convert screen Y coordinate to world Y coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {number} World Y coordinate
   */
  screenToWorldY(screenY) {
    return this.camera.y + screenY / this.camera.zoom;
  }

  /**
   * Convert world X coordinate to screen X coordinate
   * @param {number} worldX - World X coordinate
   * @returns {number} Screen X coordinate
   */
  worldToScreenX(worldX) {
    return (worldX - this.camera.x) * this.camera.zoom;
  }

  /**
   * Convert world Y coordinate to screen Y coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {number} Screen Y coordinate
   */
  worldToScreenY(worldY) {
    return (worldY - this.camera.y) * this.camera.zoom;
  }

  /**
   * Check if a world position is visible on screen
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} width - Width of the object
   * @param {number} height - Height of the object
   * @returns {boolean} True if visible
   */
  isVisible(worldX, worldY, width = 0, height = 0) {
    const screenX = this.worldToScreenX(worldX);
    const screenY = this.worldToScreenY(worldY);
    const screenWidth = width * this.camera.zoom;
    const screenHeight = height * this.camera.zoom;

    return (
      screenX + screenWidth >= 0 &&
      screenY + screenHeight >= 0 &&
      screenX <= this.canvas.width &&
      screenY <= this.canvas.height
    );
  }

  /**
   * Render the game
   */
  render() {
    // Clear the canvas
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform
    this.ctx.save();
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Render map
    this.renderMap();

    // Render entities
    this.renderEntities();

    // Restore original transform
    this.ctx.restore();

    // Render UI (in screen space)
    this.renderUI();

    // Render debug info if enabled
    if (this.debugMode) {
      this.renderDebugInfo();
    }

    // Update FPS counter
    this.updateFPS();
  }

  /**
   * Render the map terrain and resources
   */
  renderMap() {
    const map = this.game.getSystem("map");
    if (!map) return;

    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;

    // Calculate visible map area
    const startX = Math.floor(this.camera.x / tileSize);
    const startY = Math.floor(this.camera.y / tileSize);
    const endX = Math.ceil(
      (this.camera.x + this.canvas.width / this.camera.zoom) / tileSize
    );
    const endY = Math.ceil(
      (this.camera.y + this.canvas.height / this.camera.zoom) / tileSize
    );

    // Clamp to map bounds
    const visibleStartX = Math.max(0, startX);
    const visibleStartY = Math.max(0, startY);
    const visibleEndX = Math.min(map.width - 1, endX);
    const visibleEndY = Math.min(map.height - 1, endY);

    // Render visible terrain tiles
    for (let y = visibleStartY; y <= visibleEndY; y++) {
      for (let x = visibleStartX; x <= visibleEndX; x++) {
        // Check fog of war
        if (!map.isExplored(x, y)) {
          // Draw unexplored fog of war
          this.ctx.fillStyle = "black";
          this.ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          continue;
        }

        // Get tile type
        const tile = map.getTile(x, y);
        if (!tile) continue;

        // Get terrain texture
        const terrainTexture = this.assets.terrainTiles[tile.type];
        if (!terrainTexture) {
          // Fallback if texture not found
          this.ctx.fillStyle = "#666666";
          this.ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else {
          // Draw terrain texture
          this.ctx.drawImage(
            terrainTexture,
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
          );
        }

        // Apply fog of war effect for explored but not visible tiles
        if (!map.isVisible(x, y)) {
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          this.ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // Render resources on the map
    this.renderResources(
      map,
      tileSize,
      visibleStartX,
      visibleStartY,
      visibleEndX,
      visibleEndY
    );
  }

  /**
   * Render resources on the map
   * @param {Object} map - Map system
   * @param {number} tileSize - Size of map tiles
   * @param {number} startX - Start X coordinate
   * @param {number} startY - Start Y coordinate
   * @param {number} endX - End X coordinate
   * @param {number} endY - End Y coordinate
   */
  renderResources(map, tileSize, startX, startY, endX, endY) {
    // Render only resources in the visible area
    for (const resource of map.resources) {
      if (
        resource.x >= startX &&
        resource.x <= endX &&
        resource.y >= startY &&
        resource.y <= endY &&
        !resource.depleted &&
        map.isExplored(resource.x, resource.y)
      ) {
        // Get resource texture
        const resourceTexture = this.assets.resources[resource.resourceType];
        if (!resourceTexture) continue;

        // Calculate resource position
        const x =
          resource.x * tileSize + tileSize / 2 - resourceTexture.width / 2;
        const y =
          resource.y * tileSize + tileSize / 2 - resourceTexture.height / 2;

        // Draw resource
        this.ctx.drawImage(resourceTexture, x, y);

        // Apply fog of war effect if not visible
        if (!map.isVisible(resource.x, resource.y)) {
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          this.ctx.fillRect(
            resource.x * tileSize,
            resource.y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    }
  }

  /**
   * Render all game entities (buildings, units, etc.)
   */
  renderEntities() {
    const entityManager = this.game.getSystem("entityManager");
    if (!entityManager) return;

    // Get all entities
    const entities = entityManager.entities || [];

    // Sort entities by layer for correct rendering order
    const sortedEntities = [...entities].sort((a, b) => {
      // First by type (buildings behind units)
      if (a.type === "building" && b.type !== "building") return -1;
      if (a.type !== "building" && b.type === "building") return 1;

      // Then by Y position (for depth)
      return a.y - b.y;
    });

    // Render each entity
    for (const entity of sortedEntities) {
      // Skip if not visible
      if (
        !this.isVisible(
          entity.x,
          entity.y,
          entity.width || 1,
          entity.height || 1
        )
      ) {
        continue;
      }

      // Skip if in unexplored area
      const map = this.game.getSystem("map");
      if (map && !map.isExplored(Math.floor(entity.x), Math.floor(entity.y))) {
        continue;
      }

      // Render based on entity type
      switch (entity.type) {
        case "building":
          this.renderBuilding(entity);
          break;
        case "unit":
        case "villager":
          this.renderUnit(entity);
          break;
        case "resource":
          // Resources are rendered in renderResources
          break;
        default:
          this.renderGenericEntity(entity);
      }

      // Apply fog of war effect if not visible
      if (map && !map.isVisible(Math.floor(entity.x), Math.floor(entity.y))) {
        const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.fillRect(
          entity.x * tileSize,
          entity.y * tileSize,
          (entity.width || 1) * tileSize,
          (entity.height || 1) * tileSize
        );
      }

      // Render selection indicator if selected
      if (entity.selected) {
        this.renderSelectionIndicator(entity);
      }
    }
  }

  /**
   * Render a building entity
   * @param {Object} building - Building entity
   */
  renderBuilding(building) {
    // Get building texture
    const civ = building.civilization?.toLowerCase() || "solari";
    const buildingType = building.buildingType || "house";

    let texture;
    if (
      this.assets.buildings[civ] &&
      this.assets.buildings[civ][buildingType]
    ) {
      texture = this.assets.buildings[civ][buildingType];
    } else {
      texture = this.assets.buildings.solari.house; // Fallback
    }

    if (!texture) return;

    // Calculate building position (based on tile size)
    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;
    const x = building.x * tileSize;
    const y = building.y * tileSize;
    const width = (building.width || 1) * tileSize;
    const height = (building.height || 1) * tileSize;

    // Draw building
    this.ctx.drawImage(texture, x, y, width, height);

    // Draw construction progress if not complete
    if (
      building.constructionProgress !== undefined &&
      building.constructionProgress < 100
    ) {
      // Draw progress bar
      const progressWidth = width * (building.constructionProgress / 100);

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(x, y + height - 5, width, 5);

      this.ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      this.ctx.fillRect(x, y + height - 5, progressWidth, 5);
    }

    // Draw HP bar if damaged
    if (building.hp < building.maxHp) {
      this.drawHealthBar(x, y, width, building.hp, building.maxHp);
    }
  }

  /**
   * Render a unit entity
   * @param {Object} unit - Unit entity
   */
  renderUnit(unit) {
    // Get unit texture
    const civ = unit.civilization?.toLowerCase() || "solari";
    let unitType =
      unit.unitType || (unit.type === "villager" ? "villager" : "infantry");

    let texture;
    if (this.assets.units[civ] && this.assets.units[civ][unitType]) {
      texture = this.assets.units[civ][unitType];
    } else {
      texture = this.assets.units.solari.infantry; // Fallback
    }

    if (!texture) return;

    // Calculate unit position (based on tile size)
    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;
    const x = unit.x * tileSize;
    const y = unit.y * tileSize;

    // Draw unit
    this.ctx.drawImage(texture, x, y);

    // Draw HP bar if damaged
    if (unit.hp < unit.maxHp) {
      this.drawHealthBar(x, y, texture.width || 32, unit.hp, unit.maxHp);
    }

    // Draw state indicator
    this.drawUnitStateIndicator(unit, x, y);
  }

  /**
   * Render a generic entity with a placeholder
   * @param {Object} entity - Generic entity
   */
  renderGenericEntity(entity) {
    // Use a simple colored rectangle for unknown entity types
    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;
    const x = entity.x * tileSize;
    const y = entity.y * tileSize;
    const width = (entity.width || 1) * tileSize;
    const height = (entity.height || 1) * tileSize;

    // Color based on owner
    let color;
    if (entity.owner === 0) {
      color = "#0000ff"; // Blue for player
    } else if (entity.owner === 1) {
      color = "#ff0000"; // Red for AI
    } else {
      color = "#888888"; // Gray for neutral
    }

    // Draw entity
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);

    // Draw border
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Draw entity type
    this.ctx.fillStyle = "white";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(entity.type, x + width / 2, y + height / 2);
  }

  /**
   * Draw a health bar for an entity
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width of the entity
   * @param {number} hp - Current HP
   * @param {number} maxHp - Maximum HP
   */
  drawHealthBar(x, y, width, hp, maxHp) {
    const barWidth = width;
    const barHeight = 4;
    const healthPercent = hp / maxHp;

    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(x, y - barHeight - 1, barWidth, barHeight);

    // Health
    const healthColor =
      healthPercent > 0.5
        ? "#00ff00"
        : healthPercent > 0.25
        ? "#ffff00"
        : "#ff0000";
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(
      x,
      y - barHeight - 1,
      barWidth * healthPercent,
      barHeight
    );
  }

  /**
   * Draw a state indicator for a unit
   * @param {Object} unit - Unit entity
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  drawUnitStateIndicator(unit, x, y) {
    if (!unit.currentAction && !unit.state) return;

    const state = unit.currentAction || unit.state;

    // Draw small icon based on unit state
    const size = 8;
    const iconX = x + 24 - size / 2;
    const iconY = y + 24 - size / 2;

    // Different colors for different states
    let color;
    switch (state) {
      case "moving":
        color = "#ffffff"; // White
        break;
      case "attacking":
        color = "#ff0000"; // Red
        break;
      case "gathering":
        color = "#ffff00"; // Yellow
        break;
      case "building":
        color = "#00ff00"; // Green
        break;
      default:
        color = "#888888"; // Gray for idle or unknown
    }

    // Draw state indicator
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(iconX, iconY, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /**
   * Render a selection indicator for an entity
   * @param {Object} entity - Selected entity
   */
  renderSelectionIndicator(entity) {
    // Get selection texture or draw manually
    const tileSize = window.CONFIG?.MAP?.TILE_SIZE || 64;
    const x = entity.x * tileSize;
    const y = entity.y * tileSize;
    const width = (entity.width || 1) * tileSize;
    const height = (entity.height || 1) * tileSize;

    // Use selection texture if available
    const selectionTexture = this.assets.ui.selection;
    if (selectionTexture) {
      // Draw selection texture stretched to entity size
      this.ctx.drawImage(selectionTexture, x - 2, y - 2, width + 4, height + 4);
    } else {
      // Draw selection indicator manually
      this.ctx.strokeStyle = "#00ff00";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 3]);
      this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Render UI elements
   */
  renderUI() {
    // For now, UI is rendered by the DOM
    // This would render canvas-based UI elements like minimap, selection boxes, etc.

    // Render selection box if dragging
    const input = this.game.getSystem("input");
    if (
      input &&
      input.currentAction &&
      input.currentAction.type === "select" &&
      input.mouse.isDown
    ) {
      const startX = input.currentAction.startX;
      const startY = input.currentAction.startY;
      const endX = input.mouse.x;
      const endY = input.mouse.y;

      // Draw selection box
      this.ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 2]);

      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      this.ctx.strokeRect(left, top, width, height);
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Render debug information
   */
  renderDebugInfo() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(10, 10, 200, 100);

    this.ctx.fillStyle = "white";
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    // FPS counter
    this.ctx.fillText(`FPS: ${this.fps}`, 15, 15);

    // Camera info
    this.ctx.fillText(
      `Camera: (${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)})`,
      15,
      30
    );
    this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 15, 45);

    // Mouse position
    const input = this.game.getSystem("input");
    if (input) {
      this.ctx.fillText(`Mouse: (${input.mouse.x}, ${input.mouse.y})`, 15, 60);
      this.ctx.fillText(
        `Grid: (${input.mouse.gridX}, ${input.mouse.gridY})`,
        15,
        75
      );
    }

    // Entity count
    const entityManager = this.game.getSystem("entityManager");
    if (entityManager) {
      this.ctx.fillText(
        `Entities: ${entityManager.entities?.length || 0}`,
        15,
        90
      );
    }
  }

  /**
   * Update FPS counter
   */
  updateFPS() {
    const now = performance.now();

    // Count frames
    this.framesThisSecond++;

    // Update FPS once per second
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.framesThisSecond;
      this.framesThisSecond = 0;
      this.lastFpsUpdate = now;
    }
  }

  /**
   * Toggle debug mode
   */
  toggleDebug() {
    this.debugMode = !this.debugMode;
    Utils.log(`Debug mode ${this.debugMode ? "enabled" : "disabled"}`);
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Renderer;
} else {
  window.Renderer = Renderer;
}
