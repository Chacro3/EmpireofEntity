// Game Engine - Core System
class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext("2d");
    this.gameState = {
      currentCiv: null,
      currentAge: "stone",
      selectedEntities: [],
      dragStart: null,
      dragEnd: null,
      isBuilding: false,
      buildingType: null,
      buildingTemplate: null,
      isWallBuilding: false,
      wallStart: null,
      wallEnd: null,
      autoAssignEnabled: false,
      lastAlertTime: 0,
      alerts: [],
      victoryProgress: {
        domination: 0, // Percentage of enemy buildings destroyed
        economic: 0, // Percentage of resources accumulated for victory
        techComplete: false, // All technologies researched
      },
    };

    // Initialize modules
    this.resourceManager = new ResourceManager(this);
    this.map = new Map(this);
    this.entityManager = new EntityManager(this);
    this.civilizationManager = new CivilizationManager(this);
    this.techTree = new TechTree(this);
    this.combatManager = new CombatManager(this);
    this.uiManager = new UIManager(this);

    // Game loop variables
    this.lastTimestamp = 0;
    this.fps = 60;
    this.frameDelay = 1000 / this.fps;
    this.isRunning = false;

    // Event bindings
    this.bindEvents();
  }

  initialize(civName, mapName) {
    // Load map
    this.map.loadMap(mapName || "default");

    // Set civilization
    this.civilizationManager.setCivilization(civName || "solari");

    // Initialize starting resources
    this.resourceManager.initializeResources();

    // Create starting units (2 villagers)
    this.createStartingUnits();

    // Update UI
    this.uiManager.updateResourceDisplay();
    this.uiManager.updateAgeIndicator();

    // Start game loop
    this.start();
  }

  createStartingUnits() {
    // Create 2 starting villagers at the center of the map
    const centerX = Math.floor(this.map.width / 2) * this.map.tileSize;
    const centerY = Math.floor(this.map.height / 2) * this.map.tileSize;

    for (let i = 0; i < 2; i++) {
      this.entityManager.createEntity("villager", {
        x: centerX + i * 20,
        y: centerY,
        owner: "player",
      });
    }
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Key events
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.gameState.isBuilding) {
      // Start building placement
      this.startPlaceBuildingAt(x, y);
      return;
    }

    if (this.gameState.isWallBuilding) {
      // Start wall placement
      this.gameState.wallStart = { x, y };
      return;
    }

    // Start selection box
    this.gameState.dragStart = { x, y };
    this.gameState.dragEnd = { x, y };
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.gameState.isBuilding) {
      // Move building template
      this.gameState.buildingTemplate.x =
        Math.floor(x / this.map.tileSize) * this.map.tileSize;
      this.gameState.buildingTemplate.y =
        Math.floor(y / this.map.tileSize) * this.map.tileSize;
      return;
    }

    if (this.gameState.isWallBuilding && this.gameState.wallStart) {
      // Update wall endpoint
      this.gameState.wallEnd = { x, y };
      return;
    }

    if (this.gameState.dragStart) {
      // Update selection box
      this.gameState.dragEnd = { x, y };
    }
  }

  handleMouseUp(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.gameState.isBuilding) {
      // Place building
      this.finalizeBuildingPlacement();
      return;
    }

    if (this.gameState.isWallBuilding && this.gameState.wallStart) {
      // Finalize wall placement
      this.gameState.wallEnd = { x, y };
      this.finalizeWallPlacement();
      return;
    }

    if (this.gameState.dragStart) {
      // Finalize selection
      this.gameState.dragEnd = { x, y };
      this.finalizeSelection();
      this.gameState.dragStart = null;
      this.gameState.dragEnd = null;
    }
  }

  // Touch event handlers (to ensure mobile support)
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.handleMouseMove(mouseEvent);
  }

  handleTouchEnd(event) {
    event.preventDefault();
    const mouseEvent = new MouseEvent("mouseup", {});
    this.handleMouseUp(mouseEvent);
  }

  handleKeyDown(event) {
    // Hotkeys
    switch (event.key) {
      case "a":
        // Toggle auto-assign
        this.toggleAutoAssign();
        break;
      case "Escape":
        // Cancel building or selection
        this.cancelCurrentAction();
        break;
    }
  }

  startPlaceBuildingAt(x, y) {
    // Get building data from civilization manager
    const buildingData = this.civilizationManager.getBuildingData(
      this.gameState.buildingType
    );

    // Check if we can afford it
    if (!this.resourceManager.canAfford(buildingData.cost)) {
      this.uiManager.showAlert("Not enough resources!");
      this.cancelCurrentAction();
      return;
    }

    // Create building template
    this.gameState.buildingTemplate = {
      type: this.gameState.buildingType,
      x: Math.floor(x / this.map.tileSize) * this.map.tileSize,
      y: Math.floor(y / this.map.tileSize) * this.map.tileSize,
      width: buildingData.width || this.map.tileSize,
      height: buildingData.height || this.map.tileSize,
      isValid: true,
    };
  }

  finalizeBuildingPlacement() {
    if (
      !this.gameState.buildingTemplate ||
      !this.gameState.buildingTemplate.isValid
    ) {
      this.cancelCurrentAction();
      return;
    }

    // Get building data
    const buildingData = this.civilizationManager.getBuildingData(
      this.gameState.buildingType
    );

    // Spend resources
    this.resourceManager.spendResources(buildingData.cost);

    // Create the building entity
    this.entityManager.createEntity("building", {
      type: this.gameState.buildingType,
      x: this.gameState.buildingTemplate.x,
      y: this.gameState.buildingTemplate.y,
      width: buildingData.width || this.map.tileSize,
      height: buildingData.height || this.map.tileSize,
      hp: buildingData.hp,
      maxHp: buildingData.hp,
      dp: buildingData.dp,
      ar: buildingData.ar || 0,
      buildTime: buildingData.buildTime,
      buildProgress: 0,
      isBuilding: true,
      owner: "player",
    });

    // Update UI
    this.uiManager.updateResourceDisplay();

    // Reset state
    this.cancelCurrentAction();
  }

  startWallBuilding() {
    this.gameState.isWallBuilding = true;
    this.gameState.isBuilding = false;
    this.gameState.buildingType = "wall";

    this.uiManager.showAlert("Click and drag to build walls");
  }

  finalizeWallPlacement() {
    if (!this.gameState.wallStart || !this.gameState.wallEnd) {
      this.cancelCurrentAction();
      return;
    }

    const wallData = this.civilizationManager.getBuildingData("wall");

    // Calculate wall segments (distance / tileSize)
    const dx = this.gameState.wallEnd.x - this.gameState.wallStart.x;
    const dy = this.gameState.wallEnd.y - this.gameState.wallStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const segmentCount = Math.ceil(distance / this.map.tileSize);

    // Calculate total cost
    const totalCost = {};
    for (const resource in wallData.cost) {
      totalCost[resource] = wallData.cost[resource] * segmentCount;
    }

    // Check if we can afford it
    if (!this.resourceManager.canAfford(totalCost)) {
      this.uiManager.showAlert("Not enough resources for wall!");
      this.cancelCurrentAction();
      return;
    }

    // Spend resources
    this.resourceManager.spendResources(totalCost);

    // Place wall segments
    for (let i = 0; i <= segmentCount; i++) {
      const progress = i / segmentCount;
      const x = this.gameState.wallStart.x + dx * progress;
      const y = this.gameState.wallStart.y + dy * progress;

      this.entityManager.createEntity("wall", {
        x: Math.floor(x / this.map.tileSize) * this.map.tileSize,
        y: Math.floor(y / this.map.tileSize) * this.map.tileSize,
        width: this.map.tileSize,
        height: this.map.tileSize,
        hp: wallData.hp,
        maxHp: wallData.hp,
        dp: wallData.dp,
        buildTime: wallData.buildTime,
        buildProgress: 0,
        isBuilding: true,
        owner: "player",
      });
    }

    // Update UI
    this.uiManager.updateResourceDisplay();

    // Reset state
    this.cancelCurrentAction();
  }

  finalizeSelection() {
    if (!this.gameState.dragStart || !this.gameState.dragEnd) return;

    // Normalize selection box (in case of dragging from bottom-right to top-left)
    const selectionBox = {
      x: Math.min(this.gameState.dragStart.x, this.gameState.dragEnd.x),
      y: Math.min(this.gameState.dragStart.y, this.gameState.dragEnd.y),
      width: Math.abs(this.gameState.dragEnd.x - this.gameState.dragStart.x),
      height: Math.abs(this.gameState.dragEnd.y - this.gameState.dragStart.y),
    };

    // Small selection box = single click
    if (selectionBox.width < 5 && selectionBox.height < 5) {
      // Single selection
      const clickX = this.gameState.dragStart.x;
      const clickY = this.gameState.dragStart.y;
      this.gameState.selectedEntities = this.entityManager.getEntitiesAt(
        clickX,
        clickY
      );
    } else {
      // Box selection (villagers and soldiers only)
      this.gameState.selectedEntities = this.entityManager.getEntitiesInBox(
        selectionBox.x,
        selectionBox.y,
        selectionBox.width,
        selectionBox.height,
        ["villager", "soldier"]
      );
    }

    // Update UI to show selected units
    this.uiManager.updateSelectionPanel();
  }

  cancelCurrentAction() {
    this.gameState.isBuilding = false;
    this.gameState.buildingType = null;
    this.gameState.buildingTemplate = null;
    this.gameState.isWallBuilding = false;
    this.gameState.wallStart = null;
    this.gameState.wallEnd = null;
  }

  toggleAutoAssign() {
    this.gameState.autoAssignEnabled = !this.gameState.autoAssignEnabled;

    if (this.gameState.autoAssignEnabled) {
      this.uiManager.showAlert("Auto-assign enabled");
    } else {
      this.uiManager.showAlert("Auto-assign disabled");
    }
  }

  startBuildingProcess(type) {
    this.gameState.isBuilding = true;
    this.gameState.buildingType = type;
    this.gameState.isWallBuilding = false;

    this.uiManager.showAlert(`Select location for ${type}`);
  }

  issueCommand(command, targetPosition) {
    if (this.gameState.selectedEntities.length === 0) return;

    const entities = this.gameState.selectedEntities;

    switch (command) {
      case "move":
        // Move selected units to target
        entities.forEach((entity) => {
          if (entity.canMove) {
            entity.setTarget(targetPosition);
          }
        });
        break;

      case "gather":
        // Assign villagers to gather
        const resourceEntity = this.entityManager.getResourceAt(
          targetPosition.x,
          targetPosition.y
        );

        if (resourceEntity) {
          entities.forEach((entity) => {
            if (entity.type === "villager") {
              entity.assignGather(resourceEntity);
            }
          });
        }
        break;

      case "build":
        // Assign villagers to build
        const buildingEntity = this.entityManager.getBuildingAt(
          targetPosition.x,
          targetPosition.y
        );

        if (buildingEntity && buildingEntity.isBuilding) {
          entities.forEach((entity) => {
            if (entity.type === "villager") {
              entity.assignBuild(buildingEntity);
            }
          });
        }
        break;

      case "repair":
        // Assign villagers to repair
        const repairTarget = this.entityManager.getRepairableAt(
          targetPosition.x,
          targetPosition.y
        );

        if (repairTarget && repairTarget.hp < repairTarget.maxHp) {
          entities.forEach((entity) => {
            if (entity.type === "villager") {
              entity.assignRepair(repairTarget);
            }
          });
        }
        break;

      case "attack":
        // Assign units to attack
        const targetEntity = this.entityManager.getEntityAt(
          targetPosition.x,
          targetPosition.y
        );

        if (targetEntity && targetEntity.owner !== "player") {
          entities.forEach((entity) => {
            if (entity.canAttack) {
              entity.assignAttack(targetEntity);
            }
          });
        }
        break;
    }
  }

  createFormation(formationType) {
    if (this.gameState.selectedEntities.length < 5) return;

    // Filter for military units
    const units = this.gameState.selectedEntities.filter(
      (entity) => entity.type === "soldier" || entity.type === "siege"
    );

    if (units.length >= 5) {
      this.entityManager.createFormation(units, formationType);
      this.uiManager.showAlert(`${formationType} formation created`);
    }
  }

  advanceAge() {
    const currentAge = this.gameState.currentAge;
    let nextAge;

    switch (currentAge) {
      case "stone":
        nextAge = "bronze";
        break;
      case "bronze":
        nextAge = "iron";
        break;
      case "iron":
        nextAge = "golden";
        break;
      case "golden":
        nextAge = "eternal";
        break;
      default:
        return; // Already at highest age
    }

    // Get age advancement cost
    const ageCost = this.civilizationManager.getAgeAdvancementCost(nextAge);

    // Check if we can afford it
    if (!this.resourceManager.canAfford(ageCost)) {
      this.uiManager.showAlert(
        `Not enough resources to advance to ${nextAge} age!`
      );
      return;
    }

    // Spend resources
    this.resourceManager.spendResources(ageCost);

    // Update age
    this.gameState.currentAge = nextAge;

    // Update civilization bonuses, unit/building stats for the new age
    this.civilizationManager.updateCivilizationForAge(nextAge);

    // Update UI
    this.uiManager.updateAgeIndicator();
    this.uiManager.updateResourceDisplay();

    this.uiManager.showAlert(`Advanced to ${nextAge} Age!`, true); // Important message
  }

  update(deltaTime) {
    // Update all entities
    this.entityManager.update(deltaTime);

    // Check for auto-assign if enabled
    if (this.gameState.autoAssignEnabled) {
      this.entityManager.updateAutoAssign();
    }

    // Handle resource collection
    this.resourceManager.update(deltaTime);

    // Update combat
    this.combatManager.update(deltaTime);

    // Check for alerts (attacks, resource depletion)
    this.checkForAlerts();

    // Check victory conditions
    this.checkVictoryConditions();
  }

  render() {
    // Clear canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render map
    this.map.render(this.context);

    // Render entities
    this.entityManager.render(this.context);

    // Render building template if placing a building
    if (this.gameState.isBuilding && this.gameState.buildingTemplate) {
      this.uiManager.renderBuildingTemplate(
        this.context,
        this.gameState.buildingTemplate
      );
    }

    // Render wall placement if building a wall
    if (
      this.gameState.isWallBuilding &&
      this.gameState.wallStart &&
      this.gameState.wallEnd
    ) {
      this.uiManager.renderWallTemplate(
        this.context,
        this.gameState.wallStart,
        this.gameState.wallEnd
      );
    }

    // Render selection box if dragging
    if (this.gameState.dragStart && this.gameState.dragEnd) {
      this.uiManager.renderSelectionBox(
        this.context,
        this.gameState.dragStart,
        this.gameState.dragEnd
      );
    }

    // Render UI elements
    this.uiManager.render(this.context);
  }

  checkForAlerts() {
    // Check for attacks (if any entity is under attack)
    const entitiesUnderAttack = this.entityManager.getEntitiesUnderAttack();

    if (
      entitiesUnderAttack.length > 0 &&
      performance.now() - this.gameState.lastAlertTime > 5000
    ) {
      // Play attack sound
      this.uiManager.playSound("attack");

      // Show alert
      const attackedEntity = entitiesUnderAttack[0];
      this.uiManager.showAlert(
        `${
          attackedEntity.type.charAt(0).toUpperCase() +
          attackedEntity.type.slice(1)
        } under attack!`,
        true
      );

      // Ping on the minimap
      this.uiManager.pingMinimap(attackedEntity.x, attackedEntity.y, "attack");

      this.gameState.lastAlertTime = performance.now();
    }

    // Check for resource depletion
    const depletedResources = this.resourceManager.getDepletedResources();

    if (depletedResources.length > 0) {
      for (const resource of depletedResources) {
        this.uiManager.showAlert(
          `${
            resource.type.charAt(0).toUpperCase() + resource.type.slice(1)
          } depleted!`
        );
        this.uiManager.pingMinimap(resource.x, resource.y, "resource");
      }
    }

    // Check for low resources
    for (const resourceType in this.resourceManager.resources) {
      const amount = this.resourceManager.resources[resourceType];
      if (amount < 50) {
        this.uiManager.showAlert(`Low ${resourceType}!`);
      }
    }
  }

  checkVictoryConditions() {
    // Check for victory conditions

    // Domination victory (all enemy buildings destroyed)
    const enemyBuildings = this.entityManager.getEntitiesByOwnerAndType(
      "enemy",
      "building"
    );

    if (enemyBuildings.length === 0) {
      this.victory("domination");
      return;
    }

    // Economic victory (all tech researched and enough resources)
    const allTechResearched = this.techTree.isAllResearched();
    const resourcesForVictory = {
      wood: 10000,
      food: 10000,
      gold: 10000,
      stone: 5000,
      iron: 5000,
    };

    if (allTechResearched) {
      this.gameState.victoryProgress.techComplete = true;

      // Check resources
      let resourceProgress = 0;
      let targetResourceSum = 0;

      for (const resourceType in resourcesForVictory) {
        const target = resourcesForVictory[resourceType];
        const current = Math.min(
          this.resourceManager.resources[resourceType],
          target
        );

        resourceProgress += current;
        targetResourceSum += target;
      }

      this.gameState.victoryProgress.economic =
        resourceProgress / targetResourceSum;

      if (this.gameState.victoryProgress.economic >= 1) {
        this.victory("economic");
        return;
      }
    }
  }

  victory(type) {
    this.stop();
    this.uiManager.showVictoryScreen(type);
  }

  defeat() {
    this.stop();
    this.uiManager.showDefeatScreen();
  }

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    // Calculate delta time
    const deltaTime = timestamp - this.lastTimestamp;

    // Throttle to target FPS
    if (deltaTime >= this.frameDelay) {
      this.lastTimestamp = timestamp;

      // Update game state
      this.update(deltaTime / 1000); // Convert to seconds

      // Render
      this.render();
    }

    // Request next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  stop() {
    this.isRunning = false;
  }
}

// Game initialization
window.addEventListener("load", () => {
  const game = new GameEngine("gameCanvas");
  game.initialize("solari", "default");

  // Expose game object to global scope for debugging
  window.game = game;
});
