/**
 * Empires of Eternity - UI Manager
 * Manages the game's user interface components and interactions
 */

class UIManager {
  /**
   * Create a new UI manager
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // UI components
    this.components = {
      resourceDisplay: null,
      minimap: null,
      selectionPanel: null,
      buildingMenu: null,
      unitPanel: null,
      techPanel: null,
      alertDisplay: null,
      actionButtons: null,
    };

    // UI state
    this.state = {
      activePanel: null,
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      tooltipTarget: null,
      buildingPlacement: null,
      menuOpen: false,
    };

    // UI DOM elements
    this.domElements = {
      resourceBar: null,
      bottomPanel: null,
      sidePanel: null,
      minimap: null,
      tooltip: null,
      alertContainer: null,
    };

    // UI styling
    this.styles = {
      fontFamily: "'Arial', sans-serif",
      fontSize: 14,
      fontColor: "#FFFFFF",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      panelColor: "rgba(0, 0, 0, 0.85)",
      borderColor: "#666666",
      selectedColor: "#FFCC00",
      buttonColor: "#444444",
      buttonHoverColor: "#666666",
      buttonActiveColor: "#888888",
      resourceColors: {
        wood: "#8B4513", // Brown
        food: "#FF6347", // Red
        gold: "#FFD700", // Yellow
        stone: "#A9A9A9", // Gray
        iron: "#708090", // Steel blue
      },
      civColors: {
        SOLARI: "#FFD700", // Gold
        LUNARI: "#C0C0C0", // Silver
      },
    };

    // Tooltip timer
    this.tooltipTimer = null;

    Utils.log("UIManager created");
  }

  /**
   * Initialize the UI manager
   * @param {HTMLElement} container - Container element for UI
   */
  init(container) {
    this.container = container;

    // Create UI components
    this.createUIComponents();

    // Create DOM elements
    this.createDOMElements();

    // Initialize event listeners
    this.initEventListeners();

    Utils.log("UIManager initialized");
    return this;
  }

  /**
   * Create UI components
   */
  createUIComponents() {
    // Create resource display
    this.components.resourceDisplay = {
      resources: {},
      update: (resources) => {
        this.components.resourceDisplay.resources = resources;
        this.updateResourceDisplay();
      },
    };

    // Create minimap
    this.components.minimap = {
      width: CONFIG.UI.MINIMAP_SIZE,
      height: CONFIG.UI.MINIMAP_SIZE,
      scale: 0.1, // Scale factor based on map size
      rect: { x: 0, y: 0, width: 0, height: 0 },
      onClick: (x, y) => {
        this.handleMinimapClick(x, y);
      },
    };

    // Create selection panel
    this.components.selectionPanel = {
      selectedEntities: [],
      update: (entities) => {
        this.components.selectionPanel.selectedEntities = entities;
        this.updateSelectionPanel();
      },
    };

    // Create building menu
    this.components.buildingMenu = {
      buildings: [],
      age: 0,
      visible: false,
      toggle: () => {
        this.components.buildingMenu.visible =
          !this.components.buildingMenu.visible;
        this.updateBuildingMenu();
      },
      select: (buildingType) => {
        this.selectBuilding(buildingType);
      },
    };

    // Create unit panel
    this.components.unitPanel = {
      units: [],
      visible: false,
      toggle: () => {
        this.components.unitPanel.visible = !this.components.unitPanel.visible;
        this.updateUnitPanel();
      },
      select: (unitType) => {
        this.selectUnit(unitType);
      },
    };

    // Create tech panel
    this.components.techPanel = {
      techs: [],
      visible: false,
      toggle: () => {
        this.components.techPanel.visible = !this.components.techPanel.visible;
        this.updateTechPanel();
      },
      selectTech: (techId) => {
        this.selectTech(techId);
      },
    };

    // Create alert display
    this.components.alertDisplay = {
      alerts: [],
      add: (text, type, civ) => {
        this.addAlert(text, type, civ);
      },
      remove: (alertId) => {
        this.removeAlert(alertId);
      },
    };

    // Create action buttons
    this.components.actionButtons = {
      actions: [],
      update: (entities) => {
        this.updateActionButtons(entities);
      },
    };
  }

  /**
   * Create DOM elements for UI
   */
  createDOMElements() {
    // Create resource bar
    this.domElements.resourceBar = document.createElement("div");
    this.domElements.resourceBar.className = "resource-bar";
    this.applyStyles(this.domElements.resourceBar, {
      position: "absolute",
      top: "10px",
      left: "10px",
      width: "calc(100% - 20px)",
      height: "30px",
      backgroundColor: this.styles.backgroundColor,
      borderRadius: "4px",
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
      padding: "0 10px",
      zIndex: "100",
    });
    this.container.appendChild(this.domElements.resourceBar);

    // Create bottom panel
    this.domElements.bottomPanel = document.createElement("div");
    this.domElements.bottomPanel.className = "bottom-panel";
    this.applyStyles(this.domElements.bottomPanel, {
      position: "absolute",
      bottom: "10px",
      left: "10px",
      width: "calc(100% - 220px)", // Leave space for minimap
      height: "150px",
      backgroundColor: this.styles.panelColor,
      borderRadius: "4px",
      display: "flex",
      flexDirection: "column",
      zIndex: "100",
    });
    this.container.appendChild(this.domElements.bottomPanel);

    // Create minimap container
    this.domElements.minimap = document.createElement("div");
    this.domElements.minimap.className = "minimap";
    this.applyStyles(this.domElements.minimap, {
      position: "absolute",
      bottom: "10px",
      right: "10px",
      width: CONFIG.UI.MINIMAP_SIZE + "px",
      height: CONFIG.UI.MINIMAP_SIZE + "px",
      backgroundColor: this.styles.panelColor,
      borderRadius: "4px",
      overflow: "hidden",
      zIndex: "100",
    });
    this.container.appendChild(this.domElements.minimap);

    // Create minimap canvas
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = CONFIG.UI.MINIMAP_SIZE;
    this.minimapCanvas.height = CONFIG.UI.MINIMAP_SIZE;
    this.domElements.minimap.appendChild(this.minimapCanvas);

    // Create side panel
    this.domElements.sidePanel = document.createElement("div");
    this.domElements.sidePanel.className = "side-panel";
    this.applyStyles(this.domElements.sidePanel, {
      position: "absolute",
      top: "50px",
      right: "10px",
      width: "250px",
      height: "calc(100% - 270px)",
      backgroundColor: this.styles.panelColor,
      borderRadius: "4px",
      display: "flex",
      flexDirection: "column",
      zIndex: "100",
      visibility: "hidden",
    });
    this.container.appendChild(this.domElements.sidePanel);

    // Create tooltip
    this.domElements.tooltip = document.createElement("div");
    this.domElements.tooltip.className = "tooltip";
    this.applyStyles(this.domElements.tooltip, {
      position: "absolute",
      backgroundColor: this.styles.backgroundColor,
      padding: "5px",
      borderRadius: "3px",
      maxWidth: "200px",
      zIndex: "200",
      fontSize: "12px",
      color: this.styles.fontColor,
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.2s",
    });
    this.container.appendChild(this.domElements.tooltip);

    // Create alert container
    this.domElements.alertContainer = document.createElement("div");
    this.domElements.alertContainer.className = "alert-container";
    this.applyStyles(this.domElements.alertContainer, {
      position: "absolute",
      top: "50px",
      left: "10px",
      width: "250px",
      maxHeight: "60%",
      display: "flex",
      flexDirection: "column",
      pointerEvents: "none",
      zIndex: "150",
    });
    this.container.appendChild(this.domElements.alertContainer);
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Minimap click
    this.minimapCanvas.addEventListener("click", (e) => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.components.minimap.onClick(x, y);
    });

    // Window resize
    window.addEventListener(
      "resize",
      Utils.debounce(() => {
        this.resize();
      }, 100)
    );
  }

  /**
   * Handle window resize
   */
  resize() {
    // Update UI sizing based on window size
  }

  /**
   * Apply CSS styles to an element
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }

  /**
   * Update the UI based on game state
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    // Update resource display
    const resourceManager = this.game.getSystem("resourceManager");
    if (resourceManager) {
      const resources = resourceManager.getResources();
      this.components.resourceDisplay.update(resources);
    }

    // Update selection panel
    this.components.selectionPanel.update(this.game.state.selectedEntities);

    // Update minimap
    this.updateMinimap();

    // Update alerts
    this.updateAlerts(deltaTime);

    // Update tooltip
    this.updateTooltip(deltaTime);
  }

  /**
   * Render the UI
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Render UI elements directly on canvas
    // For this implementation, we're using DOM elements instead
  }

  /**
   * Update resource display
   */
  updateResourceDisplay() {
    // Clear existing content
    this.domElements.resourceBar.innerHTML = "";

    // Get current age
    const age = this.game.state.currentAge;
    const ageName = CONFIG.AGES.NAMES[age];

    // Add age display
    const ageDisplay = document.createElement("div");
    ageDisplay.className = "age-display";
    this.applyStyles(ageDisplay, {
      marginRight: "15px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      color: this.styles.fontColor,
    });
    ageDisplay.textContent = ageName;
    this.domElements.resourceBar.appendChild(ageDisplay);

    // Add separator
    const separator = document.createElement("div");
    this.applyStyles(separator, {
      width: "1px",
      height: "20px",
      backgroundColor: this.styles.borderColor,
      marginRight: "15px",
    });
    this.domElements.resourceBar.appendChild(separator);

    // Add each resource
    const resources = this.components.resourceDisplay.resources;
    const resourceTypes = CONFIG.RESOURCES.TYPES;

    for (const resource of resourceTypes) {
      const amount = resources[resource] || 0;

      const resourceElement = document.createElement("div");
      resourceElement.className = `resource ${resource}`;
      this.applyStyles(resourceElement, {
        display: "flex",
        alignItems: "center",
        marginRight: "15px",
        color: this.styles.fontColor,
      });

      // Resource icon
      const icon = document.createElement("div");
      icon.className = `resource-icon ${resource}`;
      this.applyStyles(icon, {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        backgroundColor: this.styles.resourceColors[resource],
        marginRight: "5px",
      });
      resourceElement.appendChild(icon);

      // Resource amount
      const amountText = document.createElement("span");
      amountText.textContent = Utils.formatNumber(Math.floor(amount));
      resourceElement.appendChild(amountText);

      // Add to resource bar
      this.domElements.resourceBar.appendChild(resourceElement);

      // Add data for tooltip
      resourceElement.dataset.tooltip =
        resource.charAt(0).toUpperCase() + resource.slice(1);

      // Add tooltip listener
      resourceElement.addEventListener("mouseenter", () => {
        this.showTooltip(resourceElement, resourceElement.dataset.tooltip);
      });

      resourceElement.addEventListener("mouseleave", () => {
        this.hideTooltip();
      });
    }
  }

  /**
   * Update the minimap
   */
  updateMinimap() {
    const ctx = this.minimapCanvas.getContext("2d");
    const map = this.game.getSystem("map");
    const entityManager = this.game.getSystem("entityManager");

    if (!map || !entityManager) return;

    // Clear minimap
    ctx.fillStyle = "#000000";
    ctx.fillRect(
      0,
      0,
      this.components.minimap.width,
      this.components.minimap.height
    );

    // Calculate scale factor
    const scaleX = this.components.minimap.width / map.width;
    const scaleY = this.components.minimap.height / map.height;

    // Draw terrain
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);

        if (tile) {
          const minimapX = x * scaleX;
          const minimapY = y * scaleY;
          const tileSize = 1; // 1 pixel per tile for minimap

          // Set color based on terrain and fog of war
          if (map.isVisible(x, y)) {
            // Visible terrain
            ctx.fillStyle = this.getTerrainColor(tile.type);
          } else if (map.isExplored(x, y)) {
            // Explored but not visible
            const color = this.getTerrainColor(tile.type);
            const darkenedColor = this.darkenColor(color, 0.5);
            ctx.fillStyle = darkenedColor;
          } else {
            // Unexplored
            ctx.fillStyle = "#000000";
          }

          // Draw tile
          ctx.fillRect(
            minimapX,
            minimapY,
            Math.ceil(scaleX),
            Math.ceil(scaleY)
          );
        }
      }
    }

    // Draw entities
    for (const [id, entity] of entityManager.entities) {
      if (!entity.active || !map.isVisible(entity.x, entity.y)) continue;

      const minimapX = entity.x * scaleX;
      const minimapY = entity.y * scaleY;
      const entitySize = Math.max(2, Math.ceil(scaleX * entity.width)); // Minimum 2 pixels

      // Set color based on entity type and owner
      let color = "#FFFFFF";

      if (entity.owner) {
        color = this.styles.civColors[entity.owner];
      }

      // Different shape based on entity type
      ctx.fillStyle = color;

      switch (entity.type) {
        case "unit":
        case "villager":
        case "hero":
          // Small dot for units
          ctx.beginPath();
          ctx.arc(
            minimapX + entitySize / 2,
            minimapY + entitySize / 2,
            entitySize / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          break;

        case "building":
        case "wall":
        case "wonder":
          // Rectangle for buildings and walls
          ctx.fillRect(minimapX, minimapY, entitySize, entitySize);
          break;

        case "resource":
          // Small square for resources
          ctx.fillStyle =
            this.styles.resourceColors[entity.resourceType] || "#FFFFFF";
          ctx.fillRect(minimapX, minimapY, entitySize, entitySize);
          break;
      }

      // Highlight selected entities
      if (entity.selected) {
        ctx.strokeStyle = this.styles.selectedColor;
        ctx.lineWidth = 1;

        if (
          entity.type === "unit" ||
          entity.type === "villager" ||
          entity.type === "hero"
        ) {
          ctx.beginPath();
          ctx.arc(
            minimapX + entitySize / 2,
            minimapY + entitySize / 2,
            entitySize,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        } else {
          ctx.strokeRect(
            minimapX - 1,
            minimapY - 1,
            entitySize + 2,
            entitySize + 2
          );
        }
      }
    }

    // Draw viewport rectangle
    const renderer = this.game.getSystem("renderer");
    if (renderer) {
      const visibleWorldRect = renderer.getVisibleWorldRect();

      // Convert world coordinates to minimap coordinates
      const minimapViewX = (visibleWorldRect.x / CONFIG.MAP.TILE_SIZE) * scaleX;
      const minimapViewY = (visibleWorldRect.y / CONFIG.MAP.TILE_SIZE) * scaleY;
      const minimapViewWidth =
        (visibleWorldRect.width / CONFIG.MAP.TILE_SIZE) * scaleX;
      const minimapViewHeight =
        (visibleWorldRect.height / CONFIG.MAP.TILE_SIZE) * scaleY;

      // Draw rectangle
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        minimapViewX,
        minimapViewY,
        minimapViewWidth,
        minimapViewHeight
      );

      // Store for click handling
      this.components.minimap.rect = {
        x: minimapViewX,
        y: minimapViewY,
        width: minimapViewWidth,
        height: minimapViewHeight,
      };
    }
  }

  /**
   * Handle minimap click
   * @param {number} x - Click X coordinate
   * @param {number} y - Click Y coordinate
   */
  handleMinimapClick(x, y) {
    const map = this.game.getSystem("map");
    const renderer = this.game.getSystem("renderer");

    if (!map || !renderer) return;

    // Calculate scale factor
    const scaleX = this.components.minimap.width / map.width;
    const scaleY = this.components.minimap.height / map.height;

    // Convert minimap coordinates to world coordinates
    const worldX = (x / scaleX) * CONFIG.MAP.TILE_SIZE;
    const worldY = (y / scaleY) * CONFIG.MAP.TILE_SIZE;

    // Center the camera on this point
    renderer.centerCamera(worldX, worldY);
  }

  /**
   * Update selection panel
   */
  updateSelectionPanel() {
    // Clear existing content
    this.domElements.bottomPanel.innerHTML = "";

    const selectedEntities = this.components.selectionPanel.selectedEntities;

    if (selectedEntities.length === 0) {
      // No selection
      const noSelection = document.createElement("div");
      this.applyStyles(noSelection, {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        color: this.styles.fontColor,
        fontSize: "16px",
      });
      noSelection.textContent = "No selection";
      this.domElements.bottomPanel.appendChild(noSelection);

      // Hide side panel
      this.showSidePanel(false);
      return;
    }

    // Group identical units
    const groupedEntities = this.groupEntities(selectedEntities);

    // Single entity selection
    if (selectedEntities.length === 1) {
      const entity = selectedEntities[0];

      // Create selection info panel
      const infoPanel = document.createElement("div");
      this.applyStyles(infoPanel, {
        display: "flex",
        padding: "10px",
        height: "100%",
      });

      // Entity icon/portrait
      const iconContainer = document.createElement("div");
      this.applyStyles(iconContainer, {
        width: "80px",
        height: "80px",
        backgroundColor: entity.owner
          ? this.styles.civColors[entity.owner]
          : "#FFFFFF",
        marginRight: "10px",
        borderRadius: "4px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "40px",
        color: "#000000",
      });

      // Set icon based on entity type
      let iconText = "?";

      switch (entity.type) {
        case "villager":
          iconText = "V";
          break;
        case "unit":
          iconText = "U";
          break;
        case "building":
          iconText = "B";
          break;
        case "wall":
          iconText = "W";
          break;
        case "hero":
          iconText = "H";
          break;
      }

      iconContainer.textContent = iconText;
      infoPanel.appendChild(iconContainer);

      // Entity details
      const detailsContainer = document.createElement("div");
      this.applyStyles(detailsContainer, {
        flex: "1",
        display: "flex",
        flexDirection: "column",
        color: this.styles.fontColor,
      });

      // Entity name/type
      const nameElement = document.createElement("div");
      this.applyStyles(nameElement, {
        fontSize: "16px",
        fontWeight: "bold",
        marginBottom: "5px",
      });

      let entityName =
        entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
      if (entity.unitType) {
        entityName = entity.unitType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      } else if (entity.buildingType) {
        entityName = entity.buildingType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      } else if (entity.wallType) {
        entityName =
          entity.wallType.charAt(0).toUpperCase() + entity.wallType.slice(1);
      }

      nameElement.textContent = entityName;
      detailsContainer.appendChild(nameElement);

      // Health bar
      if (entity.hp !== undefined && entity.maxHp !== undefined) {
        const healthContainer = document.createElement("div");
        this.applyStyles(healthContainer, {
          marginBottom: "5px",
          width: "100%",
        });

        // Health label
        const healthLabel = document.createElement("div");
        this.applyStyles(healthLabel, {
          fontSize: "12px",
          marginBottom: "2px",
        });
        healthLabel.textContent = `HP: ${Math.floor(entity.hp)}/${
          entity.maxHp
        }`;
        healthContainer.appendChild(healthLabel);

        // Health bar background
        const healthBarBg = document.createElement("div");
        this.applyStyles(healthBarBg, {
          width: "100%",
          height: "12px",
          backgroundColor: "#333333",
          borderRadius: "2px",
        });

        // Health bar fill
        const healthPercentage = (entity.hp / entity.maxHp) * 100;
        const healthBarFill = document.createElement("div");
        this.applyStyles(healthBarFill, {
          width: `${healthPercentage}%`,
          height: "100%",
          backgroundColor:
            healthPercentage > 60
              ? "#22CC22"
              : healthPercentage > 30
              ? "#CCCC22"
              : "#CC2222",
          borderRadius: "2px",
          transition: "width 0.3s",
        });
        healthBarBg.appendChild(healthBarFill);
        healthContainer.appendChild(healthBarBg);

        detailsContainer.appendChild(healthContainer);
      }

      // Attack and defense
      if (entity.ar !== undefined || entity.dp !== undefined) {
        const combatStats = document.createElement("div");
        this.applyStyles(combatStats, {
          display: "flex",
          marginBottom: "5px",
        });

        if (entity.ar !== undefined) {
          const attackElement = document.createElement("div");
          this.applyStyles(attackElement, {
            marginRight: "10px",
          });
          attackElement.textContent = `Attack: ${entity.ar}`;
          combatStats.appendChild(attackElement);
        }

        if (entity.dp !== undefined) {
          const defenseElement = document.createElement("div");
          defenseElement.textContent = `Defense: ${entity.dp}`;
          combatStats.appendChild(defenseElement);
        }

        detailsContainer.appendChild(combatStats);
      }

      // Building specific stats
      if (entity.type === "building" && entity.constructed) {
        // Production
        if (entity.productionType) {
          const production = document.createElement("div");
          this.applyStyles(production, {
            marginBottom: "5px",
          });

          let progressText = "";
          if (entity.productionProgress !== undefined) {
            progressText = ` (${Math.floor(entity.productionProgress)}%)`;
          }

          production.textContent = `Producing: ${entity.productionType}${progressText}`;
          detailsContainer.appendChild(production);
        }

        // Resource generation
        if (entity.resourceProduction) {
          const resourceGen = document.createElement("div");
          this.applyStyles(resourceGen, {
            marginBottom: "5px",
          });

          const resources = [];
          for (const resource in entity.resourceProduction) {
            if (entity.resourceProduction[resource] > 0) {
              resources.push(
                `${resource}: +${entity.resourceProduction[resource].toFixed(
                  1
                )}/s`
              );
            }
          }

          if (resources.length > 0) {
            resourceGen.textContent = `Generates: ${resources.join(", ")}`;
            detailsContainer.appendChild(resourceGen);
          }
        }
      }

      // Villager stats
      if (entity.type === "villager") {
        if (entity.carryingResource && entity.carryingAmount > 0) {
          const carrying = document.createElement("div");
          this.applyStyles(carrying, {
            marginBottom: "5px",
          });
          carrying.textContent = `Carrying: ${Math.floor(
            entity.carryingAmount
          )} ${entity.carryingResource}`;
          detailsContainer.appendChild(carrying);
        }

        if (entity.currentJob.type) {
          const job = document.createElement("div");
          this.applyStyles(job, {
            marginBottom: "5px",
          });

          job.textContent = `Current job: ${entity.currentJob.type}`;
          detailsContainer.appendChild(job);
        }
      }

      infoPanel.appendChild(detailsContainer);
      this.domElements.bottomPanel.appendChild(infoPanel);

      // Create action buttons
      this.updateActionButtons([entity]);

      // Show side panel for some entity types
      if (entity.type === "building" && entity.constructed) {
        this.showBuildingPanel(entity);
      } else {
        this.showSidePanel(false);
      }
    } else {
      // Multiple entity selection
      const selectionGrid = document.createElement("div");
      this.applyStyles(selectionGrid, {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        gap: "5px",
        padding: "10px",
        height: "100%",
        overflowY: "auto",
      });

      // Create grid items for each entity group
      for (const group of groupedEntities) {
        const gridItem = document.createElement("div");
        this.applyStyles(gridItem, {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          padding: "5px",
          cursor: "pointer",
        });

        // Entity icon
        const icon = document.createElement("div");
        this.applyStyles(icon, {
          width: "50px",
          height: "50px",
          backgroundColor: group.owner
            ? this.styles.civColors[group.owner]
            : "#FFFFFF",
          borderRadius: "4px",
          marginBottom: "5px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          color: "#000000",
        });

        // Set icon text based on entity type
        let iconText = "?";
        switch (group.type) {
          case "villager":
            iconText = "V";
            break;
          case "unit":
            iconText = "U";
            break;
          case "building":
            iconText = "B";
            break;
          case "wall":
            iconText = "W";
            break;
          case "hero":
            iconText = "H";
            break;
        }

        icon.textContent = iconText;
        gridItem.appendChild(icon);

        // Entity name and count
        const name = document.createElement("div");
        this.applyStyles(name, {
          color: this.styles.fontColor,
          fontSize: "12px",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: "100%",
        });

        let entityName =
          group.type.charAt(0).toUpperCase() + group.type.slice(1);
        if (group.unitType) {
          entityName = group.unitType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        } else if (group.buildingType) {
          entityName = group.buildingType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        } else if (group.wallType) {
          entityName =
            group.wallType.charAt(0).toUpperCase() + group.wallType.slice(1);
        }

        if (group.count > 1) {
          name.textContent = `${entityName} (${group.count})`;
        } else {
          name.textContent = entityName;
        }

        gridItem.appendChild(name);
        selectionGrid.appendChild(gridItem);
      }

      this.domElements.bottomPanel.appendChild(selectionGrid);

      // Create action buttons for the entity group
      this.updateActionButtons(selectedEntities);

      // Hide side panel for multiple selection
      this.showSidePanel(false);
    }
  }

  /**
   * Group similar entities
   * @param {Array} entities - Entities to group
   * @returns {Array} Grouped entities
   */
  groupEntities(entities) {
    const groups = new Map();

    for (const entity of entities) {
      // Create a key based on entity type
      let key = entity.type;

      if (entity.unitType) key += `_${entity.unitType}`;
      else if (entity.buildingType) key += `_${entity.buildingType}`;
      else if (entity.wallType) key += `_${entity.wallType}`;

      // Add owner to key
      key += `_${entity.owner || "neutral"}`;

      // Get or create group
      if (!groups.has(key)) {
        groups.set(key, {
          type: entity.type,
          unitType: entity.unitType,
          buildingType: entity.buildingType,
          wallType: entity.wallType,
          owner: entity.owner,
          entities: [],
          count: 0,
        });
      }

      // Add to group
      groups.get(key).entities.push(entity);
      groups.get(key).count++;
    }

    return Array.from(groups.values());
  }

  /**
   * Update action buttons based on selection
   * @param {Array} entities - Selected entities
   */
  updateActionButtons(entities) {
    // Create action buttons container
    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";
    this.applyStyles(actionBar, {
      position: "absolute",
      bottom: "0",
      left: "0",
      width: "100%",
      height: "40px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderBottomLeftRadius: "4px",
      borderBottomRightRadius: "4px",
      display: "flex",
      padding: "5px",
    });

    // Determine available actions based on selection
    const actions = this.getAvailableActions(entities);

    // Create buttons for each action
    for (const action of actions) {
      const button = document.createElement("div");
      button.className = `action-button ${action.id}`;
      this.applyStyles(button, {
        width: "30px",
        height: "30px",
        backgroundColor: this.styles.buttonColor,
        borderRadius: "4px",
        marginRight: "5px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: this.styles.fontColor,
        cursor: "pointer",
        fontSize: "12px",
        transition: "background-color 0.2s",
      });

      // Button text/icon
      button.textContent = action.icon || action.id.charAt(0).toUpperCase();

      // Add tooltip
      button.dataset.tooltip = action.name;

      // Add hover effect
      button.addEventListener("mouseenter", () => {
        this.applyStyles(button, {
          backgroundColor: this.styles.buttonHoverColor,
        });
        this.showTooltip(button, action.name);
      });

      button.addEventListener("mouseleave", () => {
        this.applyStyles(button, {
          backgroundColor: this.styles.buttonColor,
        });
        this.hideTooltip();
      });

      // Add click handler
      button.addEventListener("click", () => {
        action.onClick(entities);
      });

      actionBar.appendChild(button);
    }

    // Add to bottom panel
    this.domElements.bottomPanel.appendChild(actionBar);
  }

  /**
   * Get available actions for the selected entities
   * @param {Array} entities - Selected entities
   * @returns {Array} Available actions
   */
  getAvailableActions(entities) {
    const actions = [];

    // No entities
    if (entities.length === 0) {
      return actions;
    }

    // Common actions for all entities
    actions.push({
      id: "stop",
      name: "Stop current action",
      icon: "⬛",
      onClick: (entities) => {
        this.executeCommand("stop", entities);
      },
    });

    // Check entity types
    const hasVillagers = entities.some((e) => e.type === "villager");
    const hasUnits = entities.some(
      (e) => e.type === "unit" || e.type === "hero"
    );
    const hasBuildings = entities.some(
      (e) => e.type === "building" && e.constructed
    );

    // Villager-specific actions
    if (hasVillagers) {
      actions.push({
        id: "gather",
        name: "Gather resources",
        icon: "🪓",
        onClick: (entities) => {
          this.state.activePanel = "gather";
          this.game.getSystem("input").currentAction = {
            type: "gatherSelect",
            data: { entities: entities },
          };
        },
      });

      actions.push({
        id: "build",
        name: "Build structure",
        icon: "🏗️",
        onClick: (entities) => {
          this.openBuildMenu(entities);
        },
      });

      actions.push({
        id: "repair",
        name: "Repair structure",
        icon: "🔧",
        onClick: (entities) => {
          this.state.activePanel = "repair";
          this.game.getSystem("input").currentAction = {
            type: "repairSelect",
            data: { entities: entities },
          };
        },
      });
    }

    // Combat unit actions
    if (hasUnits) {
      actions.push({
        id: "attack",
        name: "Attack",
        icon: "⚔️",
        onClick: (entities) => {
          this.state.activePanel = "attack";
          this.game.getSystem("input").currentAction = {
            type: "attackSelect",
            data: { entities: entities },
          };
        },
      });

      // Formation actions if multiple units
      if (entities.length > 2) {
        actions.push({
          id: "formation",
          name: "Set formation",
          icon: "⬛",
          onClick: (entities) => {
            this.openFormationMenu(entities);
          },
        });
      }
    }

    // Building-specific actions
    if (
      entities.length === 1 &&
      entities[0].type === "building" &&
      entities[0].constructed
    ) {
      const building = entities[0];

      // Training units
      if (
        building.buildingType === "barracks" ||
        building.buildingType === "training_ground"
      ) {
        actions.push({
          id: "train",
          name: "Train units",
          icon: "👤",
          onClick: (entities) => {
            this.openUnitTrainingMenu(building);
          },
        });
      }

      // Research
      if (
        building.buildingType === "temple" ||
        building.buildingType === "shrine" ||
        building.buildingType === "solar_forge" ||
        building.buildingType === "moon_kiln"
      ) {
        actions.push({
          id: "research",
          name: "Research technology",
          icon: "📚",
          onClick: (entities) => {
            this.openResearchMenu(building);
          },
        });
      }

      // Gates
      if (building.wallType === "gate") {
        actions.push({
          id: "toggleGate",
          name: building.gateState === "closed" ? "Open Gate" : "Close Gate",
          icon: building.gateState === "closed" ? "🔓" : "🔒",
          onClick: (entities) => {
            this.executeCommand("toggleGate", entities);
          },
        });
      }
    }

    return actions;
  }

  /**
   * Execute a command
   * @param {string} command - Command to execute
   * @param {Array} entities - Entities to command
   * @param {Object} data - Command data
   */
  executeCommand(command, entities, data = {}) {
    // Get entity manager
    const entityManager = this.game.getSystem("entityManager");
    if (!entityManager) return;

    // Execute command based on type
    switch (command) {
      case "stop":
        entityManager.executeStop(entities);
        break;

      case "toggleGate":
        if (entities.length === 1 && entities[0].wallType === "gate") {
          entities[0].toggleGate();
        }
        break;

      case "formation":
        if (data.formation) {
          entityManager.setFormation(entities, data.formation);
        }
        break;
    }
  }

  /**
   * Show the side panel for a building
   * @param {Entity} building - Building entity
   */
  showBuildingPanel(building) {
    // Clear side panel
    this.domElements.sidePanel.innerHTML = "";

    // Show panel
    this.showSidePanel(true);

    // Create header
    const header = document.createElement("div");
    this.applyStyles(header, {
      padding: "10px",
      fontWeight: "bold",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      color: this.styles.fontColor,
      borderTopLeftRadius: "4px",
      borderTopRightRadius: "4px",
    });

    const buildingName = building.buildingType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    header.textContent = buildingName;
    this.domElements.sidePanel.appendChild(header);

    // Create content based on building type
    const content = document.createElement("div");
    this.applyStyles(content, {
      flex: "1",
      overflowY: "auto",
      padding: "10px",
    });

    // Production queue for military buildings
    if (
      building.buildingType === "barracks" ||
      building.buildingType === "training_ground"
    ) {
      const queueTitle = document.createElement("div");
      this.applyStyles(queueTitle, {
        marginBottom: "10px",
        color: this.styles.fontColor,
        fontSize: "14px",
        fontWeight: "bold",
      });
      queueTitle.textContent = "Production Queue";
      content.appendChild(queueTitle);

      // Production queue
      const queue = document.createElement("div");
      this.applyStyles(queue, {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      });

      if (building.productionQueue && building.productionQueue.length > 0) {
        for (let i = 0; i < building.productionQueue.length; i++) {
          const item = building.productionQueue[i];

          const queueItem = document.createElement("div");
          this.applyStyles(queueItem, {
            display: "flex",
            alignItems: "center",
            padding: "5px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "4px",
          });

          // Item name
          const name = document.createElement("div");
          this.applyStyles(name, {
            flex: "1",
            color: this.styles.fontColor,
          });
          name.textContent = `${i + 1}. ${item.type}`;

          // Progress bar for first item
          if (i === 0 && building.productionProgress !== undefined) {
            name.textContent += ` (${Math.floor(
              building.productionProgress
            )}%)`;
          }

          queueItem.appendChild(name);

          // Cancel button
          const cancelButton = document.createElement("div");
          this.applyStyles(cancelButton, {
            width: "20px",
            height: "20px",
            backgroundColor: this.styles.buttonColor,
            borderRadius: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: this.styles.fontColor,
            cursor: "pointer",
            fontSize: "12px",
          });
          cancelButton.textContent = "X";

          // Cancel handler
          cancelButton.addEventListener("click", () => {
            if (building.cancelProduction) {
              building.cancelProduction(i);
              this.showBuildingPanel(building); // Refresh panel
            }
          });

          queueItem.appendChild(cancelButton);
          queue.appendChild(queueItem);
        }
      } else {
        const empty = document.createElement("div");
        this.applyStyles(empty, {
          color: this.styles.fontColor,
          fontStyle: "italic",
        });
        empty.textContent = "Queue is empty";
        queue.appendChild(empty);
      }

      content.appendChild(queue);
    }

    // Research for temples and forges
    if (
      building.buildingType === "temple" ||
      building.buildingType === "shrine" ||
      building.buildingType === "solar_forge" ||
      building.buildingType === "moon_kiln"
    ) {
      const researchTitle = document.createElement("div");
      this.applyStyles(researchTitle, {
        marginBottom: "10px",
        color: this.styles.fontColor,
        fontSize: "14px",
        fontWeight: "bold",
      });
      researchTitle.textContent = "Current Research";
      content.appendChild(researchTitle);

      // Current research
      const research = document.createElement("div");

      if (building.currentResearch) {
        this.applyStyles(research, {
          display: "flex",
          flexDirection: "column",
          padding: "5px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          marginBottom: "10px",
        });

        // Research name
        const name = document.createElement("div");
        this.applyStyles(name, {
          color: this.styles.fontColor,
          marginBottom: "5px",
        });
        name.textContent = building.currentResearch.name;
        research.appendChild(name);

        // Progress bar
        const progressContainer = document.createElement("div");
        this.applyStyles(progressContainer, {
          width: "100%",
          height: "10px",
          backgroundColor: "#333333",
          borderRadius: "2px",
          overflow: "hidden",
        });

        const progressBar = document.createElement("div");
        this.applyStyles(progressBar, {
          width: `${building.researchProgress}%`,
          height: "100%",
          backgroundColor: "#4CAF50",
          transition: "width 0.3s",
        });

        progressContainer.appendChild(progressBar);
        research.appendChild(progressContainer);

        // Progress percentage
        const percentage = document.createElement("div");
        this.applyStyles(percentage, {
          color: this.styles.fontColor,
          fontSize: "12px",
          marginTop: "2px",
          textAlign: "right",
        });
        percentage.textContent = `${Math.floor(building.researchProgress)}%`;
        research.appendChild(percentage);

        // Cancel button
        const cancelButton = document.createElement("div");
        this.applyStyles(cancelButton, {
          alignSelf: "flex-end",
          marginTop: "5px",
          padding: "3px 8px",
          backgroundColor: this.styles.buttonColor,
          borderRadius: "4px",
          color: this.styles.fontColor,
          cursor: "pointer",
          fontSize: "12px",
        });
        cancelButton.textContent = "Cancel";

        // Cancel handler
        cancelButton.addEventListener("click", () => {
          if (building.cancelResearch) {
            building.cancelResearch();
            this.showBuildingPanel(building); // Refresh panel
          }
        });

        research.appendChild(cancelButton);
      } else {
        this.applyStyles(research, {
          color: this.styles.fontColor,
          fontStyle: "italic",
          marginBottom: "10px",
        });
        research.textContent = "No active research";
      }

      content.appendChild(research);

      // Available techs
      const techsTitle = document.createElement("div");
      this.applyStyles(techsTitle, {
        marginBottom: "10px",
        color: this.styles.fontColor,
        fontSize: "14px",
        fontWeight: "bold",
      });
      techsTitle.textContent = "Available Technologies";
      content.appendChild(techsTitle);

      // Get available techs from tech manager
      const techManager = this.game.getSystem("techManager");
      const currentAge = this.game.state.currentAge;

      if (techManager) {
        const availableTechs = techManager.getBuildingTechs(
          building.buildingType,
          building.owner,
          currentAge
        );

        if (availableTechs.length > 0) {
          const techList = document.createElement("div");
          this.applyStyles(techList, {
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          });

          for (const tech of availableTechs) {
            const techItem = document.createElement("div");
            this.applyStyles(techItem, {
              display: "flex",
              flexDirection: "column",
              padding: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              cursor: "pointer",
            });

            // Tech name
            const name = document.createElement("div");
            this.applyStyles(name, {
              color: this.styles.fontColor,
              fontWeight: "bold",
              marginBottom: "3px",
            });
            name.textContent = tech.name;
            techItem.appendChild(name);

            // Tech description
            const description = document.createElement("div");
            this.applyStyles(description, {
              color: this.styles.fontColor,
              fontSize: "12px",
              marginBottom: "5px",
            });
            description.textContent = tech.description;
            techItem.appendChild(description);

            // Tech cost
            const cost = document.createElement("div");
            this.applyStyles(cost, {
              display: "flex",
              gap: "5px",
              fontSize: "12px",
            });

            for (const resource in tech.cost) {
              const resourceCost = document.createElement("div");
              this.applyStyles(resourceCost, {
                color:
                  this.styles.resourceColors[resource] || this.styles.fontColor,
              });
              resourceCost.textContent = `${resource}: ${tech.cost[resource]}`;
              cost.appendChild(resourceCost);
            }

            techItem.appendChild(cost);

            // Check if can afford
            const resourceManager = this.game.getSystem("resourceManager");
            let canAfford = false;

            if (resourceManager) {
              canAfford = resourceManager.canAffordResources(
                tech.cost,
                building.owner
              );
            }

            // Add click handler
            techItem.addEventListener("click", () => {
              if (
                canAfford &&
                techManager.startResearch(tech.id, building.owner)
              ) {
                this.showBuildingPanel(building); // Refresh panel
              }
            });

            // Gray out if can't afford
            if (!canAfford) {
              this.applyStyles(techItem, {
                opacity: "0.5",
                cursor: "not-allowed",
              });
            }

            techList.appendChild(techItem);
          }

          content.appendChild(techList);
        } else {
          const empty = document.createElement("div");
          this.applyStyles(empty, {
            color: this.styles.fontColor,
            fontStyle: "italic",
          });
          empty.textContent = "No technologies available";
          content.appendChild(empty);
        }
      }
    }

    this.domElements.sidePanel.appendChild(content);
  }

  /**
   * Open the building menu
   * @param {Array} entities - Selected entities (villagers)
   */
  openBuildMenu(entities) {
    // TODO: Implement building menu
  }

  /**
   * Open the unit training menu
   * @param {Entity} building - Building entity
   */
  openUnitTrainingMenu(building) {
    // TODO: Implement unit training menu
  }

  /**
   * Open the research menu
   * @param {Entity} building - Building entity
   */
  openResearchMenu(building) {
    // Already handled in showBuildingPanel
  }

  /**
   * Open the formation menu
   * @param {Array} entities - Selected entities
   */
  openFormationMenu(entities) {
    // TODO: Implement formation menu
  }

  /**
   * Show or hide the side panel
   * @param {boolean} show - Whether to show the panel
   */
  showSidePanel(show) {
    this.applyStyles(this.domElements.sidePanel, {
      visibility: show ? "visible" : "hidden",
    });
  }

  /**
   * Update alerts
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateAlerts(deltaTime) {
    // TODO: Implement alert updates
  }

  /**
   * Add an alert
   * @param {string} text - Alert text
   * @param {string} type - Alert type
   * @param {string} civ - Civilization key
   */
  addAlert(text, type = "info", civ = null) {
    // Create alert element
    const alertId = `alert_${Date.now()}`;
    const alert = document.createElement("div");
    alert.id = alertId;
    alert.className = `alert ${type}`;

    this.applyStyles(alert, {
      padding: "8px 12px",
      backgroundColor: this.styles.backgroundColor,
      color: this.styles.fontColor,
      borderRadius: "4px",
      marginBottom: "5px",
      maxWidth: "100%",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
      transform: "translateX(-100%)",
      transition: "transform 0.3s, opacity 0.3s",
      opacity: "0",
    });

    // Set left border color based on type
    let borderColor = "#FFFFFF";
    switch (type) {
      case "info":
        borderColor = "#3498db";
        break;
      case "warning":
        borderColor = "#f39c12";
        break;
      case "error":
        borderColor = "#e74c3c";
        break;
      case "success":
        borderColor = "#2ecc71";
        break;
      case "resource":
        borderColor = "#f1c40f";
        break;
      case "attack":
        borderColor = "#c0392b";
        break;
      case "research":
        borderColor = "#9b59b6";
        break;
    }

    this.applyStyles(alert, {
      borderLeft: `4px solid ${borderColor}`,
    });

    // Create content
    alert.textContent = text;

    // Add alert to container
    this.domElements.alertContainer.insertBefore(
      alert,
      this.domElements.alertContainer.firstChild
    );

    // Animate in
    setTimeout(() => {
      this.applyStyles(alert, {
        transform: "translateX(0)",
        opacity: "1",
      });
    }, 10);

    // Auto remove after delay
    setTimeout(() => {
      this.removeAlert(alertId);
    }, CONFIG.UI.ALERT_DURATION * 1000);

    // Add to alerts array
    const alertData = {
      id: alertId,
      text: text,
      type: type,
      civ: civ,
      time: Date.now(),
    };

    this.components.alertDisplay.alerts.push(alertData);

    // Limit number of alerts
    if (this.components.alertDisplay.alerts.length > 10) {
      const oldestAlert = this.components.alertDisplay.alerts.shift();
      this.removeAlert(oldestAlert.id);
    }
  }

  /**
   * Remove an alert
   * @param {string} alertId - ID of alert to remove
   */
  removeAlert(alertId) {
    const alert = document.getElementById(alertId);

    if (alert) {
      // Animate out
      this.applyStyles(alert, {
        transform: "translateX(-100%)",
        opacity: "0",
      });

      // Remove from DOM after animation
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 300);
    }

    // Remove from alerts array
    const index = this.components.alertDisplay.alerts.findIndex(
      (a) => a.id === alertId
    );

    if (index !== -1) {
      this.components.alertDisplay.alerts.splice(index, 1);
    }
  }

  /**
   * Show a tooltip
   * @param {HTMLElement} target - Target element
   * @param {string} text - Tooltip text
   */
  showTooltip(target, text) {
    // Clear any existing tooltip timer
    clearTimeout(this.tooltipTimer);

    // Position tooltip
    const rect = target.getBoundingClientRect();

    this.applyStyles(this.domElements.tooltip, {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top - 30}px`,
      transform: "translateX(-50%)",
      opacity: "0",
    });

    // Set text
    this.domElements.tooltip.textContent = text;

    // Show after small delay
    this.tooltipTimer = setTimeout(() => {
      this.applyStyles(this.domElements.tooltip, {
        opacity: "1",
      });
    }, 200);
  }

  /**
   * Hide the tooltip
   */
  hideTooltip() {
    clearTimeout(this.tooltipTimer);

    this.applyStyles(this.domElements.tooltip, {
      opacity: "0",
    });
  }

  /**
   * Get color for terrain type
   * @param {string} terrainType - Terrain type
   * @returns {string} Color string
   */
  getTerrainColor(terrainType) {
    switch (terrainType) {
      case "plains":
        return "#8FB36D"; // Light green
      case "forest":
        return "#2D6A4F"; // Dark green
      case "desert":
        return "#F2CC8F"; // Sand
      case "hills":
        return "#A68C69"; // Brown
      case "mountains":
        return "#6F6F6F"; // Gray
      default:
        return "#000000"; // Black for unknown
    }
  }

  /**
   * Darken a color
   * @param {string} color - Color to darken
   * @param {number} amount - Amount to darken (0-1)
   * @returns {string} Darkened color
   */
  darkenColor(color, amount) {
    // Convert hex to RGB
    let r, g, b;

    if (color.startsWith("#")) {
      const hex = color.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (color.startsWith("rgb")) {
      const matches = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    } else {
      return color;
    }

    // Darken
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = UIManager;
} else {
  window.UIManager = UIManager;
}
