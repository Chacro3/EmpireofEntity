/**
 * Building Menu Component
 *
 * Displays a menu of available buildings that can be constructed by villagers.
 * Shows building costs, requirements, and allows players to select buildings for placement.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class BuildingMenu {
  /**
   * Create a new building menu component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.visible = false;
    this.buildingCategories = ["economic", "military", "special", "defensive"];
    this.activeCategory = "economic";

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "building-menu";
    this.container.style.position = "absolute";
    this.container.style.bottom = "80px";
    this.container.style.left = "50%";
    this.container.style.transform = "translateX(-50%)";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.container.style.borderRadius = "5px";
    this.container.style.padding = "10px";
    this.container.style.color = "#fff";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.fontSize = "14px";
    this.container.style.zIndex = "100";
    this.container.style.display = "none";
    this.container.style.userSelect = "none";
    this.container.style.minWidth = "600px";

    // Create category tabs
    this.createCategoryTabs();

    // Create building grid
    this.buildingGrid = document.createElement("div");
    this.buildingGrid.className = "building-grid";
    this.buildingGrid.style.display = "grid";
    this.buildingGrid.style.gridTemplateColumns = "repeat(5, 1fr)";
    this.buildingGrid.style.gap = "10px";
    this.buildingGrid.style.marginTop = "10px";

    this.container.appendChild(this.buildingGrid);

    // Create building info panel
    this.infoPanel = document.createElement("div");
    this.infoPanel.className = "building-info-panel";
    this.infoPanel.style.marginTop = "10px";
    this.infoPanel.style.padding = "10px";
    this.infoPanel.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    this.infoPanel.style.borderRadius = "3px";
    this.infoPanel.style.display = "none";

    this.container.appendChild(this.infoPanel);

    // Add close button
    this.createCloseButton();

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Initial population
    this.populateBuildings();

    // Register event listeners
    this.registerEvents();
  }

  /**
   * Create the category tabs
   */
  createCategoryTabs() {
    const tabContainer = document.createElement("div");
    tabContainer.className = "building-category-tabs";
    tabContainer.style.display = "flex";
    tabContainer.style.justifyContent = "center";
    tabContainer.style.gap = "10px";
    tabContainer.style.marginBottom = "5px";

    this.tabs = {};

    this.buildingCategories.forEach((category) => {
      const tab = document.createElement("div");
      tab.className = `building-category-tab ${category}`;
      tab.style.padding = "5px 15px";
      tab.style.cursor = "pointer";
      tab.style.borderRadius = "3px";
      tab.style.textAlign = "center";
      tab.style.fontWeight = "bold";
      tab.style.textTransform = "capitalize";
      tab.textContent = category;

      if (category === this.activeCategory) {
        tab.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
      } else {
        tab.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
      }

      tab.addEventListener("click", () => {
        this.setActiveCategory(category);
      });

      tab.addEventListener("mouseover", () => {
        if (category !== this.activeCategory) {
          tab.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }
      });

      tab.addEventListener("mouseout", () => {
        if (category !== this.activeCategory) {
          tab.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
        }
      });

      this.tabs[category] = tab;
      tabContainer.appendChild(tab);
    });

    this.container.appendChild(tabContainer);
  }

  /**
   * Create close button
   */
  createCloseButton() {
    const closeButton = document.createElement("div");
    closeButton.className = "close-button";
    closeButton.style.position = "absolute";
    closeButton.style.top = "5px";
    closeButton.style.right = "5px";
    closeButton.style.width = "20px";
    closeButton.style.height = "20px";
    closeButton.style.fontSize = "20px";
    closeButton.style.lineHeight = "20px";
    closeButton.style.textAlign = "center";
    closeButton.style.cursor = "pointer";
    closeButton.style.color = "#ccc";
    closeButton.innerHTML = "&times;";

    closeButton.addEventListener("mouseover", () => {
      closeButton.style.color = "#fff";
    });

    closeButton.addEventListener("mouseout", () => {
      closeButton.style.color = "#ccc";
    });

    closeButton.addEventListener("click", () => {
      this.hide();
    });

    this.container.appendChild(closeButton);
  }

  /**
   * Set the active building category
   * @param {string} category - Category name
   */
  setActiveCategory(category) {
    // Update active category
    this.activeCategory = category;

    // Update tab appearance
    Object.entries(this.tabs).forEach(([tabCategory, tab]) => {
      if (tabCategory === category) {
        tab.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
      } else {
        tab.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
      }
    });

    // Clear building info panel
    this.infoPanel.style.display = "none";

    // Repopulate buildings
    this.populateBuildings();
  }

  /**
   * Populate the building grid with available buildings
   */
  populateBuildings() {
    // Clear existing content
    this.buildingGrid.innerHTML = "";

    const player = this.game.players[this.game.currentPlayerId];
    const currentAge = player.age;

    // Get buildings for current category
    const buildings = this.getBuildingsByCategory(this.activeCategory);

    buildings.forEach((buildingType) => {
      const buildingConfig = config.BUILDINGS[buildingType];

      // Skip if building is not available in current age
      if (buildingConfig.requiredAge > currentAge) {
        return;
      }

      // Check if building has special requirements
      let meetsRequirements = true;
      if (buildingConfig.requirements) {
        meetsRequirements = this.checkBuildingRequirements(buildingType);
      }

      // Create building item
      const buildingItem = document.createElement("div");
      buildingItem.className = `building-item ${buildingType}`;
      buildingItem.style.width = "80px";
      buildingItem.style.height = "80px";
      buildingItem.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      buildingItem.style.borderRadius = "5px";
      buildingItem.style.display = "flex";
      buildingItem.style.flexDirection = "column";
      buildingItem.style.alignItems = "center";
      buildingItem.style.justifyContent = "center";
      buildingItem.style.cursor = "pointer";
      buildingItem.style.padding = "5px";
      buildingItem.style.boxSizing = "border-box";

      // Make unavailable buildings more transparent
      if (!meetsRequirements) {
        buildingItem.style.opacity = "0.5";
        buildingItem.style.cursor = "not-allowed";
      }

      // Building icon
      const icon = document.createElement("img");
      icon.src = `assets/ui/buildings/${buildingType}_icon.png`;
      icon.alt = buildingType;
      icon.style.width = "40px";
      icon.style.height = "40px";
      icon.style.marginBottom = "5px";

      // Building name
      const name = document.createElement("div");
      name.className = "building-name";
      name.textContent = Utils.formatBuildingName(buildingType);
      name.style.fontSize = "12px";
      name.style.textAlign = "center";
      name.style.width = "100%";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";

      buildingItem.appendChild(icon);
      buildingItem.appendChild(name);

      // Add event listeners
      buildingItem.addEventListener("click", () => {
        if (meetsRequirements) {
          // Select building for placement
          this.selectBuildingForPlacement(buildingType);
        } else {
          // Show requirements
          this.showRequirementsInfo(buildingType);
        }
      });

      buildingItem.addEventListener("mouseover", () => {
        // Show detailed info
        this.showBuildingInfo(buildingType);

        if (meetsRequirements) {
          buildingItem.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
        }
      });

      buildingItem.addEventListener("mouseout", () => {
        buildingItem.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      });

      this.buildingGrid.appendChild(buildingItem);
    });
  }

  /**
   * Get buildings by category
   * @param {string} category - Category name
   * @returns {Array<string>} Array of building types
   */
  getBuildingsByCategory(category) {
    const buildings = [];

    Object.entries(config.BUILDINGS).forEach(([buildingType, building]) => {
      if (building.category === category) {
        buildings.push(buildingType);
      }
    });

    return buildings;
  }

  /**
   * Check if all requirements for a building are met
   * @param {string} buildingType - Building type
   * @returns {boolean} True if all requirements are met
   */
  checkBuildingRequirements(buildingType) {
    const player = this.game.players[this.game.currentPlayerId];
    const buildingConfig = config.BUILDINGS[buildingType];

    if (!buildingConfig.requirements) {
      return true;
    }

    const requirements = buildingConfig.requirements;

    // Check for required buildings
    if (requirements.buildings) {
      for (const requiredBuilding of requirements.buildings) {
        if (!player.hasBuildingType(requiredBuilding)) {
          return false;
        }
      }
    }

    // Check for required technologies
    if (requirements.technologies) {
      for (const requiredTech of requirements.technologies) {
        if (!player.hasTechnology(requiredTech)) {
          return false;
        }
      }
    }

    // Check for unique building limit
    if (buildingConfig.unique) {
      const count = player.getBuildingCountByType(buildingType);
      if (count >= buildingConfig.limit) {
        return false;
      }
    }

    // Check for wonder limit (only one per age)
    if (buildingType === "wonder") {
      const wondersInAge = player.getWondersInAge(buildingConfig.requiredAge);
      if (wondersInAge > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Show detailed building information
   * @param {string} buildingType - Building type
   */
  showBuildingInfo(buildingType) {
    const buildingConfig = config.BUILDINGS[buildingType];
    const player = this.game.players[this.game.currentPlayerId];

    // Clear and show info panel
    this.infoPanel.innerHTML = "";
    this.infoPanel.style.display = "block";

    // Building name
    const nameElement = document.createElement("div");
    nameElement.className = "building-info-name";
    nameElement.style.fontSize = "16px";
    nameElement.style.fontWeight = "bold";
    nameElement.style.marginBottom = "5px";
    nameElement.textContent = Utils.formatBuildingName(buildingType);

    // Building description
    const descElement = document.createElement("div");
    descElement.className = "building-info-description";
    descElement.style.fontSize = "12px";
    descElement.style.marginBottom = "10px";
    descElement.textContent = buildingConfig.description;

    // Building stats
    const statsElement = document.createElement("div");
    statsElement.className = "building-info-stats";
    statsElement.style.display = "grid";
    statsElement.style.gridTemplateColumns = "1fr 1fr";
    statsElement.style.gap = "5px";
    statsElement.style.fontSize = "12px";

    // Hit points
    const hpElement = document.createElement("div");
    hpElement.textContent = `Hit Points: ${buildingConfig.hp}`;
    statsElement.appendChild(hpElement);

    // Build time
    const buildTimeElement = document.createElement("div");
    buildTimeElement.textContent = `Build Time: ${Math.ceil(
      buildingConfig.buildTime / 1000
    )}s`;
    statsElement.appendChild(buildTimeElement);

    // Size
    const sizeElement = document.createElement("div");
    sizeElement.textContent = `Size: ${buildingConfig.width / 32}x${
      buildingConfig.height / 32
    }`;
    statsElement.appendChild(sizeElement);

    // Age requirement
    const ageElement = document.createElement("div");
    ageElement.textContent = `Age: ${
      config.AGE_NAMES[buildingConfig.requiredAge]
    }`;
    statsElement.appendChild(ageElement);

    // Special stats based on building type
    if (buildingType === "house") {
      const popElement = document.createElement("div");
      popElement.textContent = `Population: +${config.HOUSE_POPULATION}`;
      statsElement.appendChild(popElement);
    } else if (buildingType.includes("resource")) {
      const dropElement = document.createElement("div");
      dropElement.textContent = "Resource drop-off point";
      statsElement.appendChild(dropElement);
    } else if (buildingConfig.garrison) {
      const garrisonElement = document.createElement("div");
      garrisonElement.textContent = `Garrison: ${buildingConfig.garrison}`;
      statsElement.appendChild(garrisonElement);
    }

    // Resource costs
    const costsElement = document.createElement("div");
    costsElement.className = "building-info-costs";
    costsElement.style.marginTop = "10px";
    costsElement.style.marginBottom = "10px";

    const costsTitle = document.createElement("div");
    costsTitle.style.fontWeight = "bold";
    costsTitle.style.marginBottom = "5px";
    costsTitle.textContent = "Resource Costs:";
    costsElement.appendChild(costsTitle);

    const costsGrid = document.createElement("div");
    costsGrid.style.display = "flex";
    costsGrid.style.gap = "15px";

    Object.entries(buildingConfig.cost).forEach(([resource, amount]) => {
      const costItem = document.createElement("div");
      costItem.style.display = "flex";
      costItem.style.alignItems = "center";

      const icon = document.createElement("img");
      icon.src = `assets/ui/icons/${resource}.png`;
      icon.alt = resource;
      icon.width = 16;
      icon.height = 16;
      icon.style.marginRight = "5px";

      const value = document.createElement("span");
      const playerAmount = player.resources.getResource(resource);
      value.textContent = amount;

      // Highlight if not enough resources
      if (playerAmount < amount) {
        value.style.color = "#FF6666";
      }

      costItem.appendChild(icon);
      costItem.appendChild(value);
      costsGrid.appendChild(costItem);
    });

    costsElement.appendChild(costsGrid);

    // Building specific abilities
    const abilitiesElement = document.createElement("div");
    abilitiesElement.className = "building-info-abilities";

    if (buildingConfig.abilities && buildingConfig.abilities.length > 0) {
      const abilitiesTitle = document.createElement("div");
      abilitiesTitle.style.fontWeight = "bold";
      abilitiesTitle.style.marginBottom = "5px";
      abilitiesTitle.textContent = "Abilities:";
      abilitiesElement.appendChild(abilitiesTitle);

      const abilitiesList = document.createElement("ul");
      abilitiesList.style.paddingLeft = "20px";
      abilitiesList.style.fontSize = "12px";

      buildingConfig.abilities.forEach((ability) => {
        const item = document.createElement("li");
        item.textContent = ability;
        abilitiesList.appendChild(item);
      });

      abilitiesElement.appendChild(abilitiesList);
    }

    // Add all elements to info panel
    this.infoPanel.appendChild(nameElement);
    this.infoPanel.appendChild(descElement);
    this.infoPanel.appendChild(statsElement);
    this.infoPanel.appendChild(costsElement);

    if (buildingConfig.abilities && buildingConfig.abilities.length > 0) {
      this.infoPanel.appendChild(abilitiesElement);
    }

    // Add requirements if any
    if (buildingConfig.requirements) {
      this.appendRequirementsInfo(buildingType);
    }
  }

  /**
   * Show building requirements information
   * @param {string} buildingType - Building type
   */
  showRequirementsInfo(buildingType) {
    // Clear and show info panel
    this.infoPanel.innerHTML = "";
    this.infoPanel.style.display = "block";

    const titleElement = document.createElement("div");
    titleElement.style.fontSize = "16px";
    titleElement.style.fontWeight = "bold";
    titleElement.style.marginBottom = "10px";
    titleElement.textContent = `Requirements for ${Utils.formatBuildingName(
      buildingType
    )}`;

    this.infoPanel.appendChild(titleElement);

    this.appendRequirementsInfo(buildingType);
  }

  /**
   * Append requirements information to the info panel
   * @param {string} buildingType - Building type
   */
  appendRequirementsInfo(buildingType) {
    const buildingConfig = config.BUILDINGS[buildingType];
    const player = this.game.players[this.game.currentPlayerId];

    if (!buildingConfig.requirements) {
      return;
    }

    const requirementsElement = document.createElement("div");
    requirementsElement.className = "building-info-requirements";
    requirementsElement.style.marginTop = "10px";

    const requirementsTitle = document.createElement("div");
    requirementsTitle.style.fontWeight = "bold";
    requirementsTitle.style.marginBottom = "5px";
    requirementsTitle.textContent = "Requirements:";
    requirementsElement.appendChild(requirementsTitle);

    const requirementsList = document.createElement("ul");
    requirementsList.style.paddingLeft = "20px";
    requirementsList.style.fontSize = "12px";

    const requirements = buildingConfig.requirements;

    // Age requirement
    const ageItem = document.createElement("li");
    const ageReq = buildingConfig.requiredAge;
    const currentAge = player.age;

    ageItem.textContent = `${config.AGE_NAMES[ageReq]} or higher`;
    ageItem.style.color = currentAge >= ageReq ? "#88FF88" : "#FF8888";
    requirementsList.appendChild(ageItem);

    // Building requirements
    if (requirements.buildings && requirements.buildings.length > 0) {
      for (const requiredBuilding of requirements.buildings) {
        const item = document.createElement("li");
        const hasBuildingType = player.hasBuildingType(requiredBuilding);

        item.textContent = Utils.formatBuildingName(requiredBuilding);
        item.style.color = hasBuildingType ? "#88FF88" : "#FF8888";
        requirementsList.appendChild(item);
      }
    }

    // Technology requirements
    if (requirements.technologies && requirements.technologies.length > 0) {
      for (const requiredTech of requirements.technologies) {
        const item = document.createElement("li");
        const hasTech = player.hasTechnology(requiredTech);

        item.textContent = Utils.formatTechName(requiredTech);
        item.style.color = hasTech ? "#88FF88" : "#FF8888";
        requirementsList.appendChild(item);
      }
    }

    // Unique building limit
    if (buildingConfig.unique) {
      const count = player.getBuildingCountByType(buildingType);
      const limit = buildingConfig.limit || 1;

      const item = document.createElement("li");
      item.textContent = `Limit: ${count}/${limit} buildings`;
      item.style.color = count < limit ? "#88FF88" : "#FF8888";
      requirementsList.appendChild(item);
    }

    // Wonder limit (one per age)
    if (buildingType === "wonder") {
      const wondersInAge = player.getWondersInAge(buildingConfig.requiredAge);

      const item = document.createElement("li");
      item.textContent = `Limit: One wonder per age`;
      item.style.color = wondersInAge === 0 ? "#88FF88" : "#FF8888";
      requirementsList.appendChild(item);
    }

    requirementsElement.appendChild(requirementsList);
    this.infoPanel.appendChild(requirementsElement);
  }

  /**
   * Select a building for placement
   * @param {string} buildingType - Building type
   */
  selectBuildingForPlacement(buildingType) {
    const player = this.game.players[this.game.currentPlayerId];
    const buildingConfig = config.BUILDINGS[buildingType];

    // Check if player can afford this building
    if (!player.resources.canAfford(buildingConfig.cost)) {
      this.game.alertSystem.createAlert({
        type: "resource",
        message: "Not enough resources!",
        position: "bottom",
      });
      return;
    }

    // Select building for placement
    this.game.input.startBuildingPlacement(buildingType);

    // Hide the menu
    this.hide();

    // Play sound
    this.game.audio.playSound("ui_select");
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Listen for age advancement to update building availability
    this.game.events.on("ageAdvance", (data) => {
      if (data.playerId === this.game.currentPlayerId) {
        this.populateBuildings();
      }
    });

    // Listen for technology research to update building availability
    this.game.events.on("technologyResearched", (data) => {
      if (data.playerId === this.game.currentPlayerId) {
        this.populateBuildings();
      }
    });

    // Listen for building construction to update unique building limits
    this.game.events.on("buildingConstructed", (data) => {
      if (data.owner === this.game.currentPlayerId) {
        this.populateBuildings();
      }
    });

    // Listen for keyboard shortcut (B key)
    document.addEventListener("keydown", (e) => {
      if (e.key === "b" || e.key === "B") {
        if (this.visible) {
          this.hide();
        } else {
          this.show();
        }
      }
    });
  }

  /**
   * Show the building menu
   */
  show() {
    this.container.style.display = "block";
    this.visible = true;
    this.populateBuildings();

    // Update UI state
    this.uiManager.setActiveMenu("building");

    // Play sound
    this.game.audio.playSound("ui_open");
  }

  /**
   * Hide the building menu
   */
  hide() {
    this.container.style.display = "none";
    this.visible = false;

    // Update UI state
    this.uiManager.clearActiveMenu();

    // Play sound
    this.game.audio.playSound("ui_close");
  }

  /**
   * Toggle the building menu
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Clean up the building menu
   */
  cleanup() {
    // Remove event listeners
    document.removeEventListener("keydown", this.handleKeyDown);

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
