/**
 * Minimap Component
 *
 * Displays a small overview of the game map, showing terrain, resources,
 * units, buildings, and the current viewport location.
 * Allows clicking to navigate to locations on the map.
 */

import { config } from "../config.js";

export class Minimap {
  /**
   * Create a new minimap component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.visible = true;
    this.size = 200; // Size of the minimap in pixels
    this.borderWidth = 2;
    this.scale = 0; // Will be calculated based on map size
    this.isDragging = false;

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "minimap-container";
    this.container.style.position = "absolute";
    this.container.style.bottom = "10px";
    this.container.style.right = "10px";
    this.container.style.width = `${this.size}px`;
    this.container.style.height = `${this.size}px`;
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.container.style.border = `${this.borderWidth}px solid #444`;
    this.container.style.borderRadius = "5px";
    this.container.style.zIndex = "100";
    this.container.style.overflow = "hidden";

    // Create canvas for the minimap
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.container.appendChild(this.canvas);

    // Get 2D context
    this.ctx = this.canvas.getContext("2d");

    // Create viewport indicator
    this.viewportIndicator = document.createElement("div");
    this.viewportIndicator.className = "viewport-indicator";
    this.viewportIndicator.style.position = "absolute";
    this.viewportIndicator.style.borderStyle = "solid";
    this.viewportIndicator.style.borderColor = "rgba(255, 255, 255, 0.7)";
    this.viewportIndicator.style.borderWidth = "2px";
    this.viewportIndicator.style.pointerEvents = "none";

    this.container.appendChild(this.viewportIndicator);

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Calculate scale
    this.calculateScale();

    // Register event listeners
    this.registerEvents();

    // Initial render
    this.render();
  }

  /**
   * Calculate the scale factor for minimap rendering
   */
  calculateScale() {
    const mapWidth = this.game.map.width;
    const mapHeight = this.game.map.height;

    // Calculate scale to fit the map in the minimap
    this.scale = Math.min(this.size / mapWidth, this.size / mapHeight);
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Map click event
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.handleMinimapClick(e);
    });

    // Map drag events
    document.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        this.handleMinimapClick(e);
      }
    });

    document.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Toggle visibility
    document.addEventListener("keydown", (e) => {
      if (e.key === "m" || e.key === "M") {
        this.toggleVisibility();
      }
    });

    // Viewport changes
    this.game.events.on("viewportChanged", () => {
      this.updateViewportIndicator();
    });

    // Map creation/loading
    this.game.events.on("mapLoaded", () => {
      this.calculateScale();
      this.renderBaseMap();
    });

    // Entity events for minimap updates
    this.game.events.on("entityCreated", () => {
      this.needsFullUpdate = true;
    });

    this.game.events.on("entityRemoved", () => {
      this.needsFullUpdate = true;
    });

    // Register for fog of war updates
    this.game.events.on("fogOfWarUpdated", () => {
      this.needsFullUpdate = true;
    });
  }

  /**
   * Handle mouse clicks on the minimap
   * @param {MouseEvent} e - Mouse event
   */
  handleMinimapClick(e) {
    // Get click position relative to the minimap
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to map coordinates
    const mapX = Math.floor(x / this.scale);
    const mapY = Math.floor(y / this.scale);

    // Center viewport on this point
    this.game.centerViewOnPoint(mapX, mapY);

    // Play sound
    this.game.audio.playSound("ui_click");
  }

  /**
   * Update the viewport indicator position and size
   */
  updateViewportIndicator() {
    const viewport = this.game.renderer.getViewport();

    // Calculate indicator position and size
    const left = viewport.x * this.scale;
    const top = viewport.y * this.scale;
    const width = viewport.width * this.scale;
    const height = viewport.height * this.scale;

    // Update indicator style
    this.viewportIndicator.style.left = `${left}px`;
    this.viewportIndicator.style.top = `${top}px`;
    this.viewportIndicator.style.width = `${width}px`;
    this.viewportIndicator.style.height = `${height}px`;
  }

  /**
   * Render the base map (terrain and resources)
   * This doesn't change often, so we render it once and cache it
   */
  renderBaseMap() {
    const mapWidth = this.game.map.width;
    const mapHeight = this.game.map.height;

    // Create an offscreen canvas to render the base map
    this.baseMapCanvas = document.createElement("canvas");
    this.baseMapCanvas.width = this.size;
    this.baseMapCanvas.height = this.size;

    const baseCtx = this.baseMapCanvas.getContext("2d");

    // Clear canvas
    baseCtx.fillStyle = "#000";
    baseCtx.fillRect(0, 0, this.size, this.size);

    // Render terrain
    for (let y = 0; y < mapHeight; y += config.TILE_SIZE) {
      for (let x = 0; x < mapWidth; x += config.TILE_SIZE) {
        const terrainType = this.game.map.getTerrainAt(x, y);
        const color = this.getTerrainColor(terrainType);

        const miniX = x * this.scale;
        const miniY = y * this.scale;
        const miniSize = Math.max(1, config.TILE_SIZE * this.scale);

        baseCtx.fillStyle = color;
        baseCtx.fillRect(miniX, miniY, miniSize, miniSize);
      }
    }

    // Render resources (trees, gold, stone, etc.)
    this.game.map.resources.forEach((resource) => {
      const miniX = resource.x * this.scale;
      const miniY = resource.y * this.scale;
      const miniWidth = Math.max(1, resource.width * this.scale);
      const miniHeight = Math.max(1, resource.height * this.scale);

      baseCtx.fillStyle = this.getResourceColor(resource.resourceType);
      baseCtx.fillRect(miniX, miniY, miniWidth, miniHeight);
    });

    // This flag tracks if we need to re-render the entities
    this.needsFullUpdate = true;
  }

  /**
   * Get color for terrain type
   * @param {string} terrainType - Type of terrain
   * @returns {string} CSS color
   */
  getTerrainColor(terrainType) {
    switch (terrainType) {
      case "grass":
        return "#4CAF50"; // Green
      case "forest":
        return "#2E7D32"; // Dark green
      case "water":
        return "#2196F3"; // Blue
      case "deepWater":
        return "#0D47A1"; // Dark blue
      case "mountain":
        return "#795548"; // Brown
      case "desert":
        return "#FFD54F"; // Yellow
      case "snow":
        return "#ECEFF1"; // Off-white
      case "mud":
        return "#5D4037"; // Brown
      case "road":
        return "#8D6E63"; // Light brown
      case "cliff":
        return "#757575"; // Grey
      default:
        return "#9E9E9E"; // Grey
    }
  }

  /**
   * Get color for resource type
   * @param {string} resourceType - Type of resource
   * @returns {string} CSS color
   */
  getResourceColor(resourceType) {
    switch (resourceType) {
      case "wood":
        return "#33691E"; // Dark green
      case "food":
        return "#FF5722"; // Orange/red
      case "gold":
        return "#FFC107"; // Yellow
      case "stone":
        return "#78909C"; // Blue-grey
      case "iron":
        return "#616161"; // Dark grey
      default:
        return "#9E9E9E"; // Grey
    }
  }

  /**
   * Get color for player
   * @param {number} playerId - Player ID
   * @returns {string} CSS color
   */
  getPlayerColor(playerId) {
    const player = this.game.players[playerId];
    if (player) {
      return player.primaryColor;
    }
    return "#9E9E9E"; // Grey for unknown
  }

  /**
   * Render the minimap
   */
  render() {
    if (!this.visible) return;

    // Render base map if needed
    if (!this.baseMapCanvas) {
      this.renderBaseMap();
    }

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.size, this.size);

    // Draw the base map first
    this.ctx.drawImage(this.baseMapCanvas, 0, 0);

    // Only do a full update when needed
    if (this.needsFullUpdate) {
      this.renderEntities();
      this.needsFullUpdate = false;
    }

    // Update viewport indicator
    this.updateViewportIndicator();
  }

  /**
   * Render entities on the minimap
   */
  renderEntities() {
    const currentPlayerId = this.game.currentPlayerId;
    const fogOfWar = this.game.map.fogOfWar;

    // Buildings (render first as they're larger)
    this.game.entityManager
      .getEntitiesByType("building")
      .forEach((building) => {
        // Skip if in fog of war
        if (
          fogOfWar &&
          !fogOfWar.isVisible(building.x, building.y, currentPlayerId)
        ) {
          return;
        }

        const miniX = building.x * this.scale;
        const miniY = building.y * this.scale;
        const miniWidth = Math.max(2, building.width * this.scale);
        const miniHeight = Math.max(2, building.height * this.scale);

        this.ctx.fillStyle = this.getPlayerColor(building.owner);
        this.ctx.fillRect(miniX, miniY, miniWidth, miniHeight);
      });

    // Walls
    this.game.entityManager.getEntitiesByType("wall").forEach((wall) => {
      // Skip if in fog of war
      if (fogOfWar && !fogOfWar.isVisible(wall.x, wall.y, currentPlayerId)) {
        return;
      }

      const miniX = wall.x * this.scale;
      const miniY = wall.y * this.scale;
      const miniWidth = Math.max(1, wall.width * this.scale);
      const miniHeight = Math.max(1, wall.height * this.scale);

      this.ctx.fillStyle = this.getPlayerColor(wall.owner);
      this.ctx.fillRect(miniX, miniY, miniWidth, miniHeight);
    });

    // Units (render as dots)
    this.game.entityManager.getEntitiesByType("unit").forEach((unit) => {
      // Skip if in fog of war
      if (fogOfWar && !fogOfWar.isVisible(unit.x, unit.y, currentPlayerId)) {
        return;
      }

      const miniX = unit.x * this.scale;
      const miniY = unit.y * this.scale;
      const miniSize = 2; // Small dots for units

      this.ctx.fillStyle = this.getPlayerColor(unit.owner);

      // Highlight player's own units a bit more
      if (unit.owner === currentPlayerId) {
        this.ctx.fillRect(miniX - 1, miniY - 1, miniSize + 2, miniSize + 2);
      } else {
        this.ctx.fillRect(miniX, miniY, miniSize, miniSize);
      }
    });

    // Render fog of war as a semi-transparent overlay
    if (fogOfWar) {
      const mapWidth = this.game.map.width;
      const mapHeight = this.game.map.height;
      const tileSize = config.TILE_SIZE;

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";

      // Render fog in chunks to improve performance
      const chunkSize = 4 * tileSize; // Check fog in chunks

      for (let y = 0; y < mapHeight; y += chunkSize) {
        for (let x = 0; x < mapWidth; x += chunkSize) {
          // Only render if the chunk is not visible
          if (!fogOfWar.isVisible(x, y, currentPlayerId)) {
            const miniX = x * this.scale;
            const miniY = y * this.scale;
            const miniSize = Math.max(1, chunkSize * this.scale);

            this.ctx.fillRect(miniX, miniY, miniSize, miniSize);
          }
        }
      }
    }

    // Render alerts as blinking dots
    this.renderAlerts();
  }

  /**
   * Render alert indicators on the minimap
   */
  renderAlerts() {
    const alerts = this.game.alertSystem.getActiveAlerts();
    const currentTime = Date.now();

    alerts.forEach((alert) => {
      // Skip alerts without positions
      if (!alert.position) return;

      // Calculate position on minimap
      const miniX = alert.position.x * this.scale;
      const miniY = alert.position.y * this.scale;

      // Make alerts blink (alternate every 500ms)
      const blink = Math.floor(currentTime / 500) % 2 === 0;

      if (blink) {
        // Draw alert indicator
        let color;

        switch (alert.type) {
          case "attack":
            color = "#FF0000"; // Red for attacks
            break;
          case "resource":
            color = "#FFD700"; // Gold for resources
            break;
          case "building":
            color = "#00FF00"; // Green for buildings
            break;
          case "research":
            color = "#00FFFF"; // Cyan for research
            break;
          case "wonder":
            color = "#FF00FF"; // Purple for wonders
            break;
          default:
            color = "#FFFFFF"; // White for others
        }

        // Draw alert as a pulsing circle
        const baseSize = 4;
        const pulseAmount = (Math.sin(currentTime * 0.01) + 1) * 2;
        const size = baseSize + pulseAmount;

        this.ctx.beginPath();
        this.ctx.arc(miniX, miniY, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
    });
  }

  /**
   * Toggle the minimap visibility
   */
  toggleVisibility() {
    if (this.visible) {
      this.container.style.display = "none";
      this.visible = false;
    } else {
      this.container.style.display = "block";
      this.visible = true;
      this.needsFullUpdate = true;
      this.render();
    }
  }

  /**
   * Show the minimap
   */
  show() {
    this.container.style.display = "block";
    this.visible = true;
    this.needsFullUpdate = true;
    this.render();
  }

  /**
   * Hide the minimap
   */
  hide() {
    this.container.style.display = "none";
    this.visible = false;
  }

  /**
   * Update the minimap
   * This is called on each game frame
   */
  update() {
    if (this.visible) {
      this.render();
    }
  }

  /**
   * Resize the minimap
   * @param {number} size - New size in pixels
   */
  resize(size) {
    this.size = size;
    this.canvas.width = size;
    this.canvas.height = size;
    this.container.style.width = `${size}px`;
    this.container.style.height = `${size}px`;

    // Recalculate scale
    this.calculateScale();

    // Render again
    this.baseMapCanvas = null; // Force re-render of base map
    this.needsFullUpdate = true;
    this.render();
  }

  /**
   * Clean up the minimap
   */
  cleanup() {
    // Remove event listeners
    this.canvas.removeEventListener("mousedown", this.handleMinimapClick);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
