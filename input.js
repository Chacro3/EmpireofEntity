/**
 * Empires of Eternity - Input Handler
 * Manages user input (mouse, touch, keyboard) and gesture recognition
 */

class InputHandler {
  constructor(game) {
    this.game = game;
    this.canvas = null;

    // Input states
    this.mouse = {
      x: 0,
      y: 0,
      gridX: 0,
      gridY: 0,
      leftDown: false,
      rightDown: false,
      dragStart: { x: 0, y: 0 },
      isDragging: false,
    };

    this.keyboard = {
      keysDown: {},
      shortcuts: {
        // Game controls
        p: () =>
          this.game.state.paused ? this.game.resume() : this.game.pause(),
        escape: () => this.cancelCurrentAction(),

        // Selection shortcuts
        a: () => this.selectAllMilitaryUnits(),
        v: () => this.selectAllVillagers(),

        // Group selection (1-9)
        1: () => this.handleGroupControl(1, false),
        2: () => this.handleGroupControl(2, false),
        3: () => this.handleGroupControl(3, false),
        4: () => this.handleGroupControl(4, false),
        5: () => this.handleGroupControl(5, false),

        // Group assignment (Ctrl + 1-9)
        "ctrl+1": () => this.handleGroupControl(1, true),
        "ctrl+2": () => this.handleGroupControl(2, true),
        "ctrl+3": () => this.handleGroupControl(3, true),
        "ctrl+4": () => this.handleGroupControl(4, true),
        "ctrl+5": () => this.handleGroupControl(5, true),

        // Auto-assign villagers
        q: () => this.toggleAutoAssign(),

        // Formation keys
        f: () => this.cycleFormations(),

        // Building shortcuts
        b: () => this.openBuildMenu(),
        w: () => this.startWallPlacement(),

        // Camera controls
        arrowup: () => this.panCamera(0, -1),
        arrowdown: () => this.panCamera(0, 1),
        arrowleft: () => this.panCamera(-1, 0),
        arrowright: () => this.panCamera(1, 0),
      },
    };

    this.touch = {
      touches: [],
      lastTap: 0,
      doubleTapDelay: 300, // ms
    };

    // Current action
    this.currentAction = {
      type: null, // 'select', 'build', 'wallPlace', 'move', 'attack', etc.
      data: null, // Additional data for the action
      selectionBox: null, // For box selection
    };

    // Unit groups (for hotkeys)
    this.unitGroups = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    this.eventsBound = false;

    // Throttled/debounced handlers
    this.throttledMouseMove = Utils.throttle(
      this.handleMouseMove.bind(this),
      16
    ); // ~60fps
    this.debouncedResize = Utils.debounce(this.handleResize.bind(this), 250);

    Utils.log("InputHandler created");
  }

  /**
   * Initialize the input handler
   * @param {HTMLCanvasElement} canvas - Game canvas
   */
  init(canvas) {
    this.canvas = canvas;

    if (this.eventsBound) {
      this.removeEventListeners();
    }

    this.addEventListeners();
    Utils.log("InputHandler initialized");
    return this;
  }

  /**
   * Add event listeners to the document and canvas
   */
  addEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.throttledMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener(
      "contextmenu",
      this.handleContextMenu.bind(this)
    );
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    // Touch events (for mobile)
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));

    // Window events
    window.addEventListener("resize", this.debouncedResize);

    this.eventsBound = true;
    Utils.log("Event listeners added");
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    // Mouse events
    this.canvas.removeEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );
    this.canvas.removeEventListener("mousemove", this.throttledMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.removeEventListener(
      "contextmenu",
      this.handleContextMenu.bind(this)
    );
    this.canvas.removeEventListener("wheel", this.handleWheel.bind(this));

    // Touch events
    this.canvas.removeEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.canvas.removeEventListener(
      "touchmove",
      this.handleTouchMove.bind(this)
    );
    this.canvas.removeEventListener("touchend", this.handleTouchEnd.bind(this));

    // Keyboard events
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("keyup", this.handleKeyUp.bind(this));

    // Window events
    window.removeEventListener("resize", this.debouncedResize);

    this.eventsBound = false;
    Utils.log("Event listeners removed");
  }

  /**
   * Update input state
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    // Update grid position based on mouse coordinates
    const gridPos = Utils.pixelToGrid(this.mouse.x, this.mouse.y);
    this.mouse.gridX = gridPos.x;
    this.mouse.gridY = gridPos.y;

    // Handle continuous key presses (e.g., camera panning)
    for (const key in this.keyboard.keysDown) {
      if (this.keyboard.keysDown[key] && this.keyboard.shortcuts[key]) {
        // Only apply movement shortcuts continuously
        if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
          this.keyboard.shortcuts[key]();
        }
      }
    }

    // Update current action
    this.updateCurrentAction(deltaTime);
  }

  /**
   * Update the current user action
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateCurrentAction(deltaTime) {
    switch (this.currentAction.type) {
      case "select":
        // Update selection box if dragging
        if (this.mouse.isDragging) {
          this.currentAction.selectionBox = {
            x: Math.min(this.mouse.dragStart.x, this.mouse.x),
            y: Math.min(this.mouse.dragStart.y, this.mouse.y),
            width: Math.abs(this.mouse.x - this.mouse.dragStart.x),
            height: Math.abs(this.mouse.y - this.mouse.dragStart.y),
          };
        }
        break;

      case "build":
        // Show building preview at current mouse position
        this.currentAction.data.previewX = this.mouse.gridX;
        this.currentAction.data.previewY = this.mouse.gridY;

        // Check if placement is valid
        const buildingType = this.currentAction.data.buildingType;
        this.currentAction.data.isValidPlacement = this.checkBuildingPlacement(
          buildingType,
          this.mouse.gridX,
          this.mouse.gridY
        );
        break;

      case "wallPlace":
        // Show wall preview between drag start and current position
        if (this.mouse.isDragging) {
          // Calculate wall path
          const wallPath = this.calculateWallPath(
            this.mouse.dragStart.gridX,
            this.mouse.dragStart.gridY,
            this.mouse.gridX,
            this.mouse.gridY
          );

          this.currentAction.data.wallPath = wallPath;

          // Check if placement is valid
          this.currentAction.data.isValidPlacement =
            this.checkWallPlacement(wallPath);
        }
        break;
    }
  }

  /* ===== MOUSE EVENT HANDLERS ===== */

  /**
   * Handle mouse down event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    e.preventDefault();

    // Update mouse position
    this.updateMousePosition(e);

    if (e.button === 0) {
      // Left mouse button
      this.mouse.leftDown = true;
      this.mouse.dragStart = {
        x: this.mouse.x,
        y: this.mouse.y,
        gridX: this.mouse.gridX,
        gridY: this.mouse.gridY,
      };

      this.handleLeftClick();
    } else if (e.button === 2) {
      // Right mouse button
      this.mouse.rightDown = true;
      this.handleRightClick();
    }
  }

  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    // Update mouse position
    this.updateMousePosition(e);

    // Check if dragging
    if (this.mouse.leftDown) {
      const dragThreshold = 5; // pixels
      const distance = Utils.distance(
        this.mouse.dragStart.x,
        this.mouse.dragStart.y,
        this.mouse.x,
        this.mouse.y
      );

      if (distance > dragThreshold) {
        this.mouse.isDragging = true;
        this.handleDrag();
      }
    }
  }

  /**
   * Handle mouse up event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseUp(e) {
    e.preventDefault();

    this.updateMousePosition(e);

    if (e.button === 0) {
      // Left mouse button
      this.mouse.leftDown = false;

      if (this.mouse.isDragging) {
        this.handleDragEnd();
        this.mouse.isDragging = false;
      }
    } else if (e.button === 2) {
      // Right mouse button
      this.mouse.rightDown = false;
    }
  }

  /**
   * Handle context menu (right click)
   * @param {MouseEvent} e - Mouse event
   */
  handleContextMenu(e) {
    e.preventDefault(); // Prevent browser context menu
  }

  /**
   * Handle mouse wheel event
   * @param {WheelEvent} e - Wheel event
   */
  handleWheel(e) {
    e.preventDefault();

    // Zoom in/out
    const zoomDirection = e.deltaY > 0 ? -1 : 1;
    const renderer = this.game.getSystem("renderer");

    if (renderer) {
      renderer.zoom(zoomDirection, this.mouse.x, this.mouse.y);
    }
  }

  /**
   * Update mouse position from event
   * @param {MouseEvent} e - Mouse event
   */
  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  /* ===== TOUCH EVENT HANDLERS ===== */

  /**
   * Handle touch start event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    e.preventDefault();

    // Store touches
    this.touch.touches = [...e.touches];

    // Check for double tap
    const now = Date.now();
    if (
      now - this.touch.lastTap < this.touch.doubleTapDelay &&
      e.touches.length === 1
    ) {
      this.handleDoubleTap(e.touches[0]);
    }
    this.touch.lastTap = now;

    // Single tap - simulate left click
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.mouse.x = touch.clientX - this.canvas.getBoundingClientRect().left;
      this.mouse.y = touch.clientY - this.canvas.getBoundingClientRect().top;
      this.mouse.leftDown = true;
      this.mouse.dragStart = {
        x: this.mouse.x,
        y: this.mouse.y,
        gridX: this.mouse.gridX,
        gridY: this.mouse.gridY,
      };

      this.handleLeftClick();
    }
    // Two-finger tap - simulate right click
    else if (e.touches.length === 2) {
      const touch = e.touches[0];
      this.mouse.x = touch.clientX - this.canvas.getBoundingClientRect().left;
      this.mouse.y = touch.clientY - this.canvas.getBoundingClientRect().top;
      this.mouse.rightDown = true;

      this.handleRightClick();
    }
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    e.preventDefault();

    // Handle single touch drag (selection, building placement)
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();

      this.mouse.x = touch.clientX - rect.left;
      this.mouse.y = touch.clientY - rect.top;

      // Check if dragging
      if (this.mouse.leftDown) {
        const dragThreshold = 10; // Higher threshold for touch
        const distance = Utils.distance(
          this.mouse.dragStart.x,
          this.mouse.dragStart.y,
          this.mouse.x,
          this.mouse.y
        );

        if (distance > dragThreshold) {
          this.mouse.isDragging = true;
          this.handleDrag();
        }
      }
    }
    // Handle two-finger pinch (zoom)
    else if (e.touches.length === 2) {
      // Implementation for pinch-to-zoom would go here
      // For now, just a placeholder
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      // TODO: Compare with previous distance to determine zoom direction
    }
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    e.preventDefault();

    if (this.mouse.leftDown) {
      this.mouse.leftDown = false;

      if (this.mouse.isDragging) {
        this.handleDragEnd();
        this.mouse.isDragging = false;
      }
    }

    if (this.mouse.rightDown) {
      this.mouse.rightDown = false;
    }

    // Update stored touches
    this.touch.touches = [...e.touches];
  }

  /**
   * Handle double tap (touch equivalent of double click)
   * @param {Touch} touch - Touch object
   */
  handleDoubleTap(touch) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = touch.clientX - rect.left;
    this.mouse.y = touch.clientY - rect.top;

    // Select all units of the same type at mouse position
    const entityManager = this.game.getSystem("entityManager");
    const entity = entityManager.getEntityAtPosition(
      this.mouse.gridX,
      this.mouse.gridY
    );

    if (entity && (entity.type === "unit" || entity.type === "villager")) {
      const sameTypeUnits = entityManager.getEntitiesByTypeAndOwner(
        entity.unitType,
        this.game.state.selectedCivilization,
        true // visibleOnly
      );

      this.game.state.selectedEntities = sameTypeUnits;
      Utils.log(
        `Selected ${sameTypeUnits.length} ${entity.unitType} units via double tap`
      );
    }
  }

  /* ===== KEYBOARD EVENT HANDLERS ===== */

  /**
   * Handle key down event
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    this.keyboard.keysDown[key] = true;

    // Handle Ctrl + Key combinations
    if (e.ctrlKey) {
      const combo = `ctrl+${key}`;

      if (this.keyboard.shortcuts[combo]) {
        e.preventDefault();
        this.keyboard.shortcuts[combo]();
      }
    }
    // Handle single key shortcuts
    else if (this.keyboard.shortcuts[key]) {
      // Only prevent default for game-specific keys
      if (key !== "f5" && key !== "f12") {
        e.preventDefault();
      }

      this.keyboard.shortcuts[key]();
    }
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keyboard.keysDown[key] = false;
  }

  /**
   * Handle window resize event
   */
  handleResize() {
    // Update canvas size
    const renderer = this.game.getSystem("renderer");
    if (renderer) {
      renderer.resizeCanvas();
    }

    Utils.log("Window resized, canvas updated");
  }

  /* ===== ACTION HANDLERS ===== */

  /**
   * Handle left click action
   */
  handleLeftClick() {
    // Different behavior based on current action
    switch (this.currentAction.type) {
      case null:
        // Default: Start selection
        this.startSelection();
        break;

      case "build":
        // Place building if valid
        if (this.currentAction.data.isValidPlacement) {
          this.placeBuilding();
        }
        break;

      case "wallPlace":
        // Start wall drawing
        this.currentAction.data = {
          startX: this.mouse.gridX,
          startY: this.mouse.gridY,
          wallPath: [],
        };
        break;
    }
  }

  /**
   * Handle right click action
   */
  handleRightClick() {
    // Cancel current action if any
    if (this.currentAction.type) {
      this.cancelCurrentAction();
      return;
    }

    // Check if we have entities selected
    if (this.game.state.selectedEntities.length > 0) {
      const entityManager = this.game.getSystem("entityManager");

      // Check if clicking on an enemy entity
      const targetEntity = entityManager.getEntityAtPosition(
        this.mouse.gridX,
        this.mouse.gridY
      );

      if (
        targetEntity &&
        targetEntity.owner !== this.game.state.selectedCivilization
      ) {
        // Attack command
        this.commandSelectedUnits("attack", { target: targetEntity });
      } else {
        // Move command
        this.commandSelectedUnits("move", {
          x: this.mouse.gridX,
          y: this.mouse.gridY,
        });
      }
    }
  }

  /**
   * Handle drag action
   */
  handleDrag() {
    switch (this.currentAction.type) {
      case "select":
        // Update selection box
        this.currentAction.selectionBox = {
          x: Math.min(this.mouse.dragStart.x, this.mouse.x),
          y: Math.min(this.mouse.dragStart.y, this.mouse.y),
          width: Math.abs(this.mouse.x - this.mouse.dragStart.x),
          height: Math.abs(this.mouse.y - this.mouse.dragStart.y),
        };
        break;

      case "wallPlace":
        // Update wall path
        const wallPath = this.calculateWallPath(
          this.mouse.dragStart.gridX,
          this.mouse.dragStart.gridY,
          this.mouse.gridX,
          this.mouse.gridY
        );

        this.currentAction.data.wallPath = wallPath;

        // Check if placement is valid
        this.currentAction.data.isValidPlacement =
          this.checkWallPlacement(wallPath);
        break;
    }
  }

  /**
   * Handle drag end action
   */
  handleDragEnd() {
    switch (this.currentAction.type) {
      case "select":
        // Finalize selection
        this.finalizeSelection();
        break;

      case "wallPlace":
        // Place wall if valid
        if (this.currentAction.data.isValidPlacement) {
          this.placeWall(this.currentAction.data.wallPath);
        }
        break;
    }
  }

  /* ===== GAME ACTION METHODS ===== */

  /**
   * Start selection action
   */
  startSelection() {
    this.currentAction = {
      type: "select",
      selectionBox: null,
    };
  }

  /**
   * Finalize selection
   */
  finalizeSelection() {
    if (!this.currentAction.selectionBox) {
      // Single click selection
      const entityManager = this.game.getSystem("entityManager");
      const entity = entityManager.getEntityAtPosition(
        this.mouse.gridX,
        this.mouse.gridY
      );

      if (entity && entity.owner === this.game.state.selectedCivilization) {
        this.game.state.selectedEntities = [entity];
        Utils.log(
          `Selected ${entity.type} at (${this.mouse.gridX}, ${this.mouse.gridY})`
        );
      } else {
        this.game.state.selectedEntities = [];
        Utils.log("Deselected all entities");
      }
    } else {
      // Box selection
      const entityManager = this.game.getSystem("entityManager");
      const box = this.currentAction.selectionBox;

      // Convert pixel box to grid box
      const gridBox = {
        x: Math.floor(box.x / CONFIG.MAP.TILE_SIZE),
        y: Math.floor(box.y / CONFIG.MAP.TILE_SIZE),
        width: Math.ceil(box.width / CONFIG.MAP.TILE_SIZE),
        height: Math.ceil(box.height / CONFIG.MAP.TILE_SIZE),
      };

      const selectedEntities = entityManager.getEntitiesInBox(
        gridBox.x,
        gridBox.y,
        gridBox.width,
        gridBox.height,
        this.game.state.selectedCivilization
      );

      this.game.state.selectedEntities = selectedEntities;
      Utils.log(`Selected ${selectedEntities.length} entities in box`);
    }

    // Clear selection action
    this.currentAction = { type: null };
  }

  /**
   * Open the build menu
   */
  openBuildMenu() {
    Utils.log("Opening build menu");
    const uiManager = this.game.getSystem("uiManager");
    if (uiManager) {
      uiManager.openBuildMenu();
    }
  }

  /**
   * Start building placement
   * @param {string} buildingType - Type of building to place
   */
  startBuildingPlacement(buildingType) {
    Utils.log(`Starting placement for ${buildingType}`);

    this.currentAction = {
      type: "build",
      data: {
        buildingType: buildingType,
        previewX: this.mouse.gridX,
        previewY: this.mouse.gridY,
        isValidPlacement: false,
      },
    };

    // Check if placement is valid initially
    this.currentAction.data.isValidPlacement = this.checkBuildingPlacement(
      buildingType,
      this.mouse.gridX,
      this.mouse.gridY
    );
  }

  /**
   * Check if building placement is valid
   * @param {string} buildingType - Type of building
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {boolean} True if placement is valid
   */
  checkBuildingPlacement(buildingType, gridX, gridY) {
    // This is a placeholder for the real implementation
    const entityManager = this.game.getSystem("entityManager");
    const map = this.game.getSystem("map");

    // Building dimensions would come from a building config
    const width = 1; // Default size
    const height = 1;

    // Check if area is clear of other entities
    const isAreaClear = entityManager.isAreaClear(gridX, gridY, width, height);

    // Check if terrain is valid for building
    const isTerrainValid = map.isTerrainBuildable(gridX, gridY, width, height);

    return isAreaClear && isTerrainValid;
  }

  /**
   * Place a building at the current position
   */
  placeBuilding() {
    const buildingType = this.currentAction.data.buildingType;
    const gridX = this.currentAction.data.previewX;
    const gridY = this.currentAction.data.previewY;

    Utils.log(`Placing ${buildingType} at (${gridX}, ${gridY})`);

    const entityManager = this.game.getSystem("entityManager");

    // Check if enough resources
    const resourceManager = this.game.getSystem("resourceManager");
    const canAfford = resourceManager.canAffordBuilding(
      buildingType,
      this.game.state.currentAge
    );

    if (canAfford) {
      // Deduct resources
      resourceManager.deductBuildingCost(
        buildingType,
        this.game.state.currentAge
      );

      // Create the building
      const building = entityManager.createBuilding(
        buildingType,
        gridX,
        gridY,
        this.game.state.selectedCivilization,
        this.game.state.currentAge
      );

      // Assign villagers to construct if any are selected
      const selectedVillagers = this.game.state.selectedEntities.filter(
        (e) => e.type === "villager"
      );
      if (selectedVillagers.length > 0) {
        entityManager.assignVillagersToConstruct(selectedVillagers, building);
      }

      // Play sound
      this.game.getSystem("audio").play("buildingPlace");

      // Add alert
      this.game
        .getSystem("alertSystem")
        .addAlert(`Started construction of ${buildingType}`);
    } else {
      // Not enough resources
      this.game
        .getSystem("alertSystem")
        .addAlert("Not enough resources to build " + buildingType);
      this.game.getSystem("audio").play("error");
    }

    // Clear action
    this.currentAction = { type: null };
  }

  /**
   * Start wall placement
   */
  startWallPlacement() {
    Utils.log("Starting wall placement");

    this.currentAction = {
      type: "wallPlace",
      data: {
        startX: null,
        startY: null,
        wallPath: [],
        isValidPlacement: false,
      },
    };
  }

  /**
   * Calculate wall path between two points
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @returns {Array} Array of wall segment coordinates
   */
  calculateWallPath(startX, startY, endX, endY) {
    // For simplicity, create a straight line between points
    // In a real implementation, you might want to use a better algorithm
    const path = [];

    // Use Bresenham's line algorithm
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;

    let x = startX;
    let y = startY;

    while (true) {
      path.push({ x, y });

      if (x === endX && y === endY) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return path;
  }

  /**
   * Check if wall placement is valid
   * @param {Array} wallPath - Array of wall segment coordinates
   * @returns {boolean} True if placement is valid
   */
  checkWallPlacement(wallPath) {
    // This is a placeholder for the real implementation
    const entityManager = this.game.getSystem("entityManager");
    const map = this.game.getSystem("map");

    // Check each segment for validity
    for (const segment of wallPath) {
      // Check if area is clear of other entities
      const isAreaClear = entityManager.isAreaClear(segment.x, segment.y, 1, 1);

      // Check if terrain is valid for building
      const isTerrainValid = map.isTerrainBuildable(segment.x, segment.y, 1, 1);

      if (!isAreaClear || !isTerrainValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Place wall segments along the specified path
   * @param {Array} wallPath - Array of wall segment coordinates
   */
  placeWall(wallPath) {
    Utils.log(`Placing wall with ${wallPath.length} segments`);

    const entityManager = this.game.getSystem("entityManager");
    const resourceManager = this.game.getSystem("resourceManager");

    // Calculate cost based on current age
    const segmentCost = resourceManager.getWallSegmentCost(
      this.game.state.currentAge
    );
    const totalCost = {};

    for (const resource in segmentCost) {
      totalCost[resource] = segmentCost[resource] * wallPath.length;
    }

    // Check if enough resources
    const canAfford = resourceManager.canAffordResources(totalCost);

    if (canAfford) {
      // Deduct resources
      resourceManager.deductResources(totalCost);

      // Create wall segments
      for (const segment of wallPath) {
        entityManager.createWallSegment(
          segment.x,
          segment.y,
          this.game.state.selectedCivilization,
          this.game.state.currentAge
        );
      }

      // Play sound
      this.game.getSystem("audio").play("wallPlace");

      // Add alert
      this.game
        .getSystem("alertSystem")
        .addAlert(`Placed ${wallPath.length} wall segments`);
    } else {
      // Not enough resources
      this.game
        .getSystem("alertSystem")
        .addAlert("Not enough resources to build wall");
      this.game.getSystem("audio").play("error");
    }

    // Clear action
    this.currentAction = { type: null };
  }

  /**
   * Command selected units
   * @param {string} command - Command type (move, attack, etc.)
   * @param {Object} data - Command data
   */
  commandSelectedUnits(command, data) {
    const selectedUnits = this.game.state.selectedEntities.filter(
      (e) => e.type === "unit" || e.type === "villager" || e.type === "hero"
    );

    if (selectedUnits.length === 0) {
      return;
    }

    Utils.log(`Commanding ${selectedUnits.length} units to ${command}`);

    const entityManager = this.game.getSystem("entityManager");

    switch (command) {
      case "move":
        entityManager.moveUnits(selectedUnits, data.x, data.y);
        this.game.getSystem("audio").play("unitMove");
        break;

      case "attack":
        entityManager.attackTarget(selectedUnits, data.target);
        this.game.getSystem("audio").play("unitAttack");
        break;

      case "gather":
        const gatherableUnits = selectedUnits.filter(
          (u) => u.type === "villager"
        );
        entityManager.gatherResource(gatherableUnits, data.resource);
        this.game.getSystem("audio").play("villagerGather");
        break;

      case "repair":
        const repairUnits = selectedUnits.filter((u) => u.type === "villager");
        entityManager.repairStructure(repairUnits, data.structure);
        this.game.getSystem("audio").play("villagerRepair");
        break;

      case "setFormation":
        const militaryUnits = selectedUnits.filter((u) => u.type === "unit");
        entityManager.setFormation(militaryUnits, data.formation);
        this.game.getSystem("audio").play("formationSet");
        break;
    }
  }

  /**
   * Cancel the current action
   */
  cancelCurrentAction() {
    if (this.currentAction.type) {
      Utils.log(`Canceling ${this.currentAction.type} action`);
      this.currentAction = { type: null };

      // Play cancel sound
      this.game.getSystem("audio").play("actionCancel");
    }
  }

  /**
   * Select all military units (non-villagers)
   */
  selectAllMilitaryUnits() {
    const entityManager = this.game.getSystem("entityManager");
    const militaryUnits = entityManager.getEntitiesByTypeAndOwner(
      "unit",
      this.game.state.selectedCivilization,
      true // visibleOnly
    );

    this.game.state.selectedEntities = militaryUnits;
    Utils.log(`Selected ${militaryUnits.length} military units`);
  }

  /**
   * Select all villagers
   */
  selectAllVillagers() {
    const entityManager = this.game.getSystem("entityManager");
    const villagers = entityManager.getEntitiesByTypeAndOwner(
      "villager",
      this.game.state.selectedCivilization,
      true // visibleOnly
    );

    this.game.state.selectedEntities = villagers;
    Utils.log(`Selected ${villagers.length} villagers`);
  }

  /**
   * Handle group control (assignment or selection)
   * @param {number} groupNumber - Group number (1-5)
   * @param {boolean} assign - True to assign, false to select
   */
  handleGroupControl(groupNumber, assign) {
    if (assign) {
      // Assign selected units to group
      this.unitGroups[groupNumber] = [...this.game.state.selectedEntities]
        .filter(
          (e) => e.type === "unit" || e.type === "villager" || e.type === "hero"
        )
        .map((e) => e.id);

      Utils.log(
        `Assigned ${this.unitGroups[groupNumber].length} units to group ${groupNumber}`
      );
      this.game.getSystem("audio").play("groupAssign");
    } else {
      // Select units in group
      const entityManager = this.game.getSystem("entityManager");
      const groupUnits = this.unitGroups[groupNumber]
        .map((id) => entityManager.getEntityById(id))
        .filter((e) => e !== null); // Filter out any entities that no longer exist

      this.game.state.selectedEntities = groupUnits;
      Utils.log(
        `Selected ${groupUnits.length} units from group ${groupNumber}`
      );
      this.game.getSystem("audio").play("groupSelect");
    }
  }

  /**
   * Toggle auto-assign for villagers
   */
  toggleAutoAssign() {
    const autoAssign = this.game.getState().autoAssignVillagers;
    this.game.state.autoAssignVillagers = !autoAssign;

    Utils.log(`Auto-assign villagers: ${!autoAssign}`);
    this.game
      .getSystem("alertSystem")
      .addAlert(`Auto-assign villagers: ${!autoAssign ? "ON" : "OFF"}`);
    this.game.getSystem("audio").play(!autoAssign ? "toggleOn" : "toggleOff");
  }

  /**
   * Cycle through formations for selected units
   */
  cycleFormations() {
    const formations = ["line", "wedge", "square", "skirmish"];
    const selectedUnits = this.game.state.selectedEntities.filter(
      (e) => e.type === "unit"
    );

    if (selectedUnits.length === 0) {
      return;
    }

    // Get current formation of first unit
    const currentFormation = selectedUnits[0].formation || "none";
    const currentIndex = formations.indexOf(currentFormation);
    const nextIndex = (currentIndex + 1) % formations.length;
    const nextFormation = formations[nextIndex];

    this.commandSelectedUnits("setFormation", { formation: nextFormation });
    Utils.log(`Cycled formation to ${nextFormation}`);
  }

  /**
   * Pan the camera
   * @param {number} dirX - X direction (-1, 0, 1)
   * @param {number} dirY - Y direction (-1, 0, 1)
   */
  panCamera(dirX, dirY) {
    const renderer = this.game.getSystem("renderer");
    if (renderer) {
      const speed = 10; // Pixels per update
      renderer.pan(dirX * speed, dirY * speed);
    }
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = InputHandler;
} else {
  window.InputHandler = InputHandler;
}
