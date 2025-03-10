/**
 * Technology Panel Component
 *
 * Displays available technologies for research and tracks ongoing research.
 * Allows players to queue research projects to advance their civilization.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class TechPanel {
  /**
   * Create a new technology panel component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.visible = false;
    this.selectedBuilding = null;
    this.techCategories = ["military", "economy", "utility"];
    this.activeCategory = "military";

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "tech-panel";
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

    // Create tech grid
    this.techGrid = document.createElement("div");
    this.techGrid.className = "tech-grid";
    this.techGrid.style.display = "grid";
    this.techGrid.style.gridTemplateColumns = "repeat(4, 1fr)";
    this.techGrid.style.gap = "10px";
    this.techGrid.style.marginTop = "10px";

    this.container.appendChild(this.techGrid);

    // Create tech info panel
    this.infoPanel = document.createElement("div");
    this.infoPanel.className = "tech-info-panel";
    this.infoPanel.style.marginTop = "10px";
    this.infoPanel.style.padding = "10px";
    this.infoPanel.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    this.infoPanel.style.borderRadius = "3px";
    this.infoPanel.style.display = "none";

    this.container.appendChild(this.infoPanel);

    // Create research queue panel
    this.createResearchQueuePanel();

    // Add close button
    this.createCloseButton();

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Register event listeners
    this.registerEvents();
  }

  /**
   * Create the category tabs
   */
  createCategoryTabs() {
    const tabContainer = document.createElement("div");
    tabContainer.className = "tech-category-tabs";
    tabContainer.style.display = "flex";
    tabContainer.style.justifyContent = "center";
    tabContainer.style.gap = "10px";
    tabContainer.style.marginBottom = "5px";

    this.tabs = {};

    this.techCategories.forEach((category) => {
      const tab = document.createElement("div");
      tab.className = `tech-category-tab ${category}`;
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
   * Create the research queue panel
   */
  createResearchQueuePanel() {
    this.queuePanel = document.createElement("div");
    this.queuePanel.className = "research-queue-panel";
    this.queuePanel.style.marginTop = "10px";
    this.queuePanel.style.padding = "10px";
    this.queuePanel.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    this.queuePanel.style.borderRadius = "3px";

    const queueTitle = document.createElement("div");
    queueTitle.className = "queue-title";
    queueTitle.style.fontSize = "14px";
    queueTitle.style.fontWeight = "bold";
    queueTitle.style.marginBottom = "5px";
    queueTitle.textContent = "Research Queue";

    this.queueList = document.createElement("div");
    this.queueList.className = "queue-list";
    this.queueList.style.display = "flex";
    this.queueList.style.gap = "10px";
    this.queueList.style.minHeight = "60px";
    this.queueList.style.alignItems = "center";

    // Empty queue message
    this.emptyQueueMessage = document.createElement("div");
    this.emptyQueueMessage.className = "empty-queue-message";
    this.emptyQueueMessage.style.color = "#888";
    this.emptyQueueMessage.style.fontStyle = "italic";
    this.emptyQueueMessage.textContent = "No research in progress";

    this.queueList.appendChild(this.emptyQueueMessage);

    this.queuePanel.appendChild(queueTitle);
    this.queuePanel.appendChild(this.queueList);

    this.container.appendChild(this.queuePanel);
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
   * Set the active technology category
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

    // Clear tech info panel
    this.infoPanel.style.display = "none";

    // Repopulate technologies
    this.populateTechnologies();
  }

  /**
   * Show the panel with a selected building
   * @param {Building} building - Selected research building
   */
  showWithBuilding(building) {
    if (!building || !building.canResearch) {
      return;
    }

    this.selectedBuilding = building;
    this.populateTechnologies();
    this.updateResearchQueue();
    this.show();
  }

  /**
   * Populate the tech grid with available technologies
   */
  populateTechnologies() {
    // Clear existing content
    this.techGrid.innerHTML = "";

    if (!this.selectedBuilding) {
      return;
    }

    const player = this.game.players[this.game.currentPlayerId];
    const currentAge = player.age;

    // Get technologies for current category that can be researched in this building
    const technologies = this.getTechnologiesByCategory(this.activeCategory);

    technologies.forEach((techId) => {
      const techConfig = config.TECHNOLOGIES[techId];

      // Skip if tech is not available in current age
      if (techConfig.requiredAge > currentAge) {
        return;
      }

      // Skip if tech is already researched
      if (player.hasTechnology(techId)) {
        return;
      }

      // Skip if tech can't be researched in this building
      if (
        techConfig.researchBuilding &&
        !this.selectedBuilding.type.includes(techConfig.researchBuilding)
      ) {
        return;
      }

      // Check if tech has special requirements
      let meetsRequirements = true;
      if (techConfig.requirements) {
        meetsRequirements = this.checkTechRequirements(techId);
      }

      // Create tech item
      const techItem = document.createElement("div");
      techItem.className = `tech-item ${techId}`;
      techItem.style.width = "120px";
      techItem.style.height = "120px";
      techItem.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      techItem.style.borderRadius = "5px";
      techItem.style.display = "flex";
      techItem.style.flexDirection = "column";
      techItem.style.alignItems = "center";
      techItem.style.justifyContent = "center";
      techItem.style.cursor = "pointer";
      techItem.style.padding = "10px";
      techItem.style.boxSizing = "border-box";

      // Make unavailable techs more transparent
      if (!meetsRequirements) {
        techItem.style.opacity = "0.5";
        techItem.style.cursor = "not-allowed";
      }

      // Tech icon
      const icon = document.createElement("img");
      icon.src = `assets/ui/technologies/${techId}.png`;
      icon.alt = techId;
      icon.style.width = "60px";
      icon.style.height = "60px";
      icon.style.marginBottom = "10px";

      // Tech name
      const name = document.createElement("div");
      name.className = "tech-name";
      name.textContent = Utils.formatTechName(techId);
      name.style.fontSize = "12px";
      name.style.textAlign = "center";
      name.style.width = "100%";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";

      techItem.appendChild(icon);
      techItem.appendChild(name);

      // Add event listeners
      techItem.addEventListener("click", () => {
        if (meetsRequirements) {
          // Queue research
          this.queueResearch(techId);
        } else {
          // Show requirements
          this.showRequirementsInfo(techId);
        }
      });

      techItem.addEventListener("mouseover", () => {
        // Show detailed info
        this.showTechInfo(techId);

        if (meetsRequirements) {
          techItem.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
        }
      });

      techItem.addEventListener("mouseout", () => {
        techItem.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      });

      this.techGrid.appendChild(techItem);
    });

    // If no technologies available, show message
    if (this.techGrid.children.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.style.gridColumn = "1 / span 4";
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.padding = "20px";
      emptyMessage.style.color = "#888";
      emptyMessage.style.fontStyle = "italic";

      if (currentAge === config.AGE_NAMES.length - 1) {
        emptyMessage.textContent =
          "All technologies researched in this category.";
      } else {
        emptyMessage.textContent =
          "No technologies available in this category for your current age.";
      }

      this.techGrid.appendChild(emptyMessage);
    }
  }

  /**
   * Get technologies by category
   * @param {string} category - Category name
   * @returns {Array<string>} Array of technology IDs
   */
  getTechnologiesByCategory(category) {
    const technologies = [];

    Object.entries(config.TECHNOLOGIES).forEach(([techId, tech]) => {
      if (tech.category === category) {
        technologies.push(techId);
      }
    });

    return technologies;
  }

  /**
   * Check if all requirements for a technology are met
   * @param {string} techId - Technology ID
   * @returns {boolean} True if all requirements are met
   */
  checkTechRequirements(techId) {
    const player = this.game.players[this.game.currentPlayerId];
    const techConfig = config.TECHNOLOGIES[techId];

    if (!techConfig.requirements) {
      return true;
    }

    const requirements = techConfig.requirements;

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

    // Check for age requirement
    if (requirements.age && player.age < requirements.age) {
      return false;
    }

    return true;
  }

  /**
   * Show detailed technology information
   * @param {string} techId - Technology ID
   */
  showTechInfo(techId) {
    const techConfig = config.TECHNOLOGIES[techId];
    const player = this.game.players[this.game.currentPlayerId];

    // Clear and show info panel
    this.infoPanel.innerHTML = "";
    this.infoPanel.style.display = "block";

    // Tech name
    const nameElement = document.createElement("div");
    nameElement.className = "tech-info-name";
    nameElement.style.fontSize = "16px";
    nameElement.style.fontWeight = "bold";
    nameElement.style.marginBottom = "5px";
    nameElement.textContent = Utils.formatTechName(techId);

    // Tech description
    const descElement = document.createElement("div");
    descElement.className = "tech-info-description";
    descElement.style.fontSize = "12px";
    descElement.style.marginBottom = "10px";
    descElement.textContent = techConfig.description;

    // Tech effects
    const effectsElement = document.createElement("div");
    effectsElement.className = "tech-info-effects";

    if (techConfig.effects) {
      const effectsTitle = document.createElement("div");
      effectsTitle.style.fontWeight = "bold";
      effectsTitle.style.marginBottom = "5px";
      effectsTitle.textContent = "Effects:";
      effectsElement.appendChild(effectsTitle);

      const effectsList = document.createElement("ul");
      effectsList.style.paddingLeft = "20px";
      effectsList.style.fontSize = "12px";

      for (const effect of techConfig.effects) {
        const item = document.createElement("li");
        item.textContent = this.formatEffectText(effect);
        effectsList.appendChild(item);
      }

      effectsElement.appendChild(effectsList);
    }

    // Research stats
    const statsElement = document.createElement("div");
    statsElement.className = "tech-info-stats";
    statsElement.style.display = "grid";
    statsElement.style.gridTemplateColumns = "1fr 1fr";
    statsElement.style.gap = "5px";
    statsElement.style.fontSize = "12px";
    statsElement.style.marginTop = "10px";

    // Research time
    const timeElement = document.createElement("div");
    timeElement.textContent = `Research Time: ${Math.ceil(
      techConfig.researchTime / 1000
    )}s`;
    statsElement.appendChild(timeElement);

    // Age requirement
    const ageElement = document.createElement("div");
    ageElement.textContent = `Age: ${config.AGE_NAMES[techConfig.requiredAge]}`;
    statsElement.appendChild(ageElement);

    // Resource costs
    const costsElement = document.createElement("div");
    costsElement.className = "tech-info-costs";
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

    Object.entries(techConfig.cost).forEach(([resource, amount]) => {
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

    // Add all elements to info panel
    this.infoPanel.appendChild(nameElement);
    this.infoPanel.appendChild(descElement);
    this.infoPanel.appendChild(effectsElement);
    this.infoPanel.appendChild(statsElement);
    this.infoPanel.appendChild(costsElement);

    // Add requirements if any
    if (techConfig.requirements) {
      this.appendRequirementsInfo(techId);
    }
  }

  /**
   * Format effect text for display
   * @param {Object} effect - Effect object
   * @returns {string} Formatted effect text
   */
  formatEffectText(effect) {
    switch (effect.type) {
      case "unitStat":
        return `${Utils.formatUnitName(effect.unitType)}: ${effect.stat} ${
          effect.value > 0 ? "+" : ""
        }${effect.value}${effect.isPercentage ? "%" : ""}`;

      case "buildingStat":
        return `${Utils.formatBuildingName(effect.buildingType)}: ${
          effect.stat
        } ${effect.value > 0 ? "+" : ""}${effect.value}${
          effect.isPercentage ? "%" : ""
        }`;

      case "resourceRate":
        return `${Utils.capitalizeFirstLetter(
          effect.resource
        )} gathering rate: ${effect.value > 0 ? "+" : ""}${effect.value}%`;

      case "movementSpeed":
        return `${
          effect.unitType ? Utils.formatUnitName(effect.unitType) : "All units"
        } movement speed: ${effect.value > 0 ? "+" : ""}${effect.value}%`;

      case "buildSpeed":
        return `Villager build speed: ${effect.value > 0 ? "+" : ""}${
          effect.value
        }%`;

      case "researchSpeed":
        return `Research speed: ${effect.value > 0 ? "+" : ""}${effect.value}%`;

      case "unlockUnit":
        return `Unlocks ${Utils.formatUnitName(effect.unitType)}`;

      case "unlockBuilding":
        return `Unlocks ${Utils.formatBuildingName(effect.buildingType)}`;

      case "populationCap":
        return `Population cap: ${effect.value > 0 ? "+" : ""}${effect.value}`;

      case "revealMap":
        return `Reveals the entire map`;

      default:
        return `${effect.type}: ${effect.value}`;
    }
  }

  /**
   * Show technology requirements information
   * @param {string} techId - Technology ID
   */
  showRequirementsInfo(techId) {
    // Clear and show info panel
    this.infoPanel.innerHTML = "";
    this.infoPanel.style.display = "block";

    const titleElement = document.createElement("div");
    titleElement.style.fontSize = "16px";
    titleElement.style.fontWeight = "bold";
    titleElement.style.marginBottom = "10px";
    titleElement.textContent = `Requirements for ${Utils.formatTechName(
      techId
    )}`;

    this.infoPanel.appendChild(titleElement);

    this.appendRequirementsInfo(techId);
  }

  /**
   * Append requirements information to the info panel
   * @param {string} techId - Technology ID
   */
  appendRequirementsInfo(techId) {
    const techConfig = config.TECHNOLOGIES[techId];
    const player = this.game.players[this.game.currentPlayerId];

    if (!techConfig.requirements) {
      return;
    }

    const requirementsElement = document.createElement("div");
    requirementsElement.className = "tech-info-requirements";
    requirementsElement.style.marginTop = "10px";

    const requirementsTitle = document.createElement("div");
    requirementsTitle.style.fontWeight = "bold";
    requirementsTitle.style.marginBottom = "5px";
    requirementsTitle.textContent = "Requirements:";
    requirementsElement.appendChild(requirementsTitle);

    const requirementsList = document.createElement("ul");
    requirementsList.style.paddingLeft = "20px";
    requirementsList.style.fontSize = "12px";

    const requirements = techConfig.requirements;

    // Age requirement
    const ageItem = document.createElement("li");
    const ageReq = techConfig.requiredAge;
    const currentAge = player.age;

    ageItem.textContent = `${config.AGE_NAMES[ageReq]} or higher`;
    ageItem.style.color = currentAge >= ageReq ? "#88FF88" : "#FF8888";
    requirementsList.appendChild(ageItem);

    // Check specific age requirement if any
    if (requirements.age) {
      const specificAgeItem = document.createElement("li");
      specificAgeItem.textContent = `${
        config.AGE_NAMES[requirements.age]
      } or higher`;
      specificAgeItem.style.color =
        currentAge >= requirements.age ? "#88FF88" : "#FF8888";
      requirementsList.appendChild(specificAgeItem);
    }

    // Building requirements
    if (requirements.buildings) {
      for (const requiredBuilding of requirements.buildings) {
        const item = document.createElement("li");
        const hasBuildingType = player.hasBuildingType(requiredBuilding);

        item.textContent = Utils.formatBuildingName(requiredBuilding);
        item.style.color = hasBuildingType ? "#88FF88" : "#FF8888";
        requirementsList.appendChild(item);
      }
    }

    // Technology requirements
    if (requirements.technologies) {
      for (const requiredTech of requirements.technologies) {
        const item = document.createElement("li");
        const hasTech = player.hasTechnology(requiredTech);

        item.textContent = Utils.formatTechName(requiredTech);
        item.style.color = hasTech ? "#88FF88" : "#FF8888";
        requirementsList.appendChild(item);
      }
    }

    requirementsElement.appendChild(requirementsList);
    this.infoPanel.appendChild(requirementsElement);
  }

  /**
   * Queue a technology for research
   * @param {string} techId - Technology ID
   */
  queueResearch(techId) {
    // Check if building can research
    if (!this.selectedBuilding || !this.selectedBuilding.canResearch) {
      return;
    }

    const player = this.game.players[this.game.currentPlayerId];
    const techConfig = config.TECHNOLOGIES[techId];

    // Check if player can afford this tech
    if (!player.resources.canAfford(techConfig.cost)) {
      this.game.alertSystem.createAlert({
        type: "resource",
        message: "Not enough resources!",
        position: "bottom",
      });
      return;
    }

    // Queue research at the building
    const success = this.selectedBuilding.queueResearch(techId);

    if (success) {
      // Play sound
      this.game.audio.playSound("research_start");

      // Update research queue
      this.updateResearchQueue();
    }
  }

  /**
   * Update the research queue display
   */
  updateResearchQueue() {
    // Clear existing queue items
    this.queueList.innerHTML = "";

    if (!this.selectedBuilding) {
      this.queueList.appendChild(this.emptyQueueMessage);
      return;
    }

    const researchQueue = this.selectedBuilding.researchQueue;

    if (researchQueue.length === 0) {
      this.queueList.appendChild(this.emptyQueueMessage);
      return;
    }

    // Add each queued technology
    researchQueue.forEach((queueItem, index) => {
      const queueItemElement = document.createElement("div");
      queueItemElement.className = "queue-item";
      queueItemElement.style.position = "relative";
      queueItemElement.style.width = "50px";
      queueItemElement.style.height = "50px";
      queueItemElement.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      queueItemElement.style.borderRadius = "3px";
      queueItemElement.style.display = "flex";
      queueItemElement.style.alignItems = "center";
      queueItemElement.style.justifyContent = "center";

      // Tech icon
      const icon = document.createElement("img");
      icon.src = `assets/ui/technologies/${queueItem.techId}.png`;
      icon.alt = queueItem.techId;
      icon.style.width = "40px";
      icon.style.height = "40px";

      queueItemElement.appendChild(icon);

      // Add progress overlay for the first item (active research)
      if (index === 0 && queueItem.progress > 0) {
        const progressOverlay = document.createElement("div");
        progressOverlay.className = "progress-overlay";
        progressOverlay.style.position = "absolute";
        progressOverlay.style.bottom = "0";
        progressOverlay.style.left = "0";
        progressOverlay.style.width = "100%";
        progressOverlay.style.height = `${queueItem.progress}%`;
        progressOverlay.style.backgroundColor = "rgba(0, 200, 0, 0.3)";
        progressOverlay.style.borderRadius = "0 0 3px 3px";
        progressOverlay.style.pointerEvents = "none";

        queueItemElement.appendChild(progressOverlay);
      }

      // Add cancel button for queued research
      const cancelButton = document.createElement("div");
      cancelButton.className = "cancel-button";
      cancelButton.style.position = "absolute";
      cancelButton.style.top = "-5px";
      cancelButton.style.right = "-5px";
      cancelButton.style.width = "16px";
      cancelButton.style.height = "16px";
      cancelButton.style.backgroundColor = "rgba(200, 0, 0, 0.8)";
      cancelButton.style.borderRadius = "50%";
      cancelButton.style.display = "flex";
      cancelButton.style.alignItems = "center";
      cancelButton.style.justifyContent = "center";
      cancelButton.style.cursor = "pointer";
      cancelButton.style.fontSize = "12px";
      cancelButton.style.fontWeight = "bold";
      cancelButton.style.color = "#fff";
      cancelButton.textContent = "X";

      cancelButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.cancelResearch(index);
      });

      queueItemElement.appendChild(cancelButton);

      // Tooltip for tech name and progress
      queueItemElement.title = `${Utils.formatTechName(queueItem.techId)}${
        index === 0 ? ` (${Math.floor(queueItem.progress)}%)` : ""
      }`;

      this.queueList.appendChild(queueItemElement);
    });
  }

  /**
   * Cancel a research project in the queue
   * @param {number} index - Queue index
   */
  cancelResearch(index) {
    if (!this.selectedBuilding) {
      return;
    }

    const success = this.selectedBuilding.cancelResearch(index);

    if (success) {
      // Play sound
      this.game.audio.playSound("cancel");

      // Update research queue
      this.updateResearchQueue();
    }
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Listen for building selection
    this.game.events.on("selectionChanged", (data) => {
      if (data.type === "building" && data.entities.length === 1) {
        const building = data.entities[0];
        if (building.canResearch) {
          this.selectedBuilding = building;
          this.updateResearchQueue();
        } else {
          this.selectedBuilding = null;
          this.hide();
        }
      } else {
        this.selectedBuilding = null;
        this.hide();
      }
    });

    // Listen for research progress updates
    this.game.events.on("researchProgress", (data) => {
      if (
        this.selectedBuilding &&
        data.buildingId === this.selectedBuilding.id
      ) {
        this.updateResearchQueue();
      }
    });

    // Listen for research completed
    this.game.events.on("researchCompleted", (data) => {
      if (
        this.selectedBuilding &&
        data.buildingId === this.selectedBuilding.id
      ) {
        this.updateResearchQueue();
        this.populateTechnologies();
      }
    });

    // Listen for technology researched
    this.game.events.on("technologyResearched", (data) => {
      if (data.playerId === this.game.currentPlayerId) {
        this.populateTechnologies();
      }
    });

    // Listen for age advancement
    this.game.events.on("ageAdvance", (data) => {
      if (data.playerId === this.game.currentPlayerId) {
        this.populateTechnologies();
      }
    });

    // Listen for keyboard shortcut (T key)
    document.addEventListener("keydown", (e) => {
      if (e.key === "t" || e.key === "T") {
        if (this.selectedBuilding && this.selectedBuilding.canResearch) {
          if (this.visible) {
            this.hide();
          } else {
            this.showWithBuilding(this.selectedBuilding);
          }
        }
      }
    });
  }

  /**
   * Show the technology panel
   */
  show() {
    this.container.style.display = "block";
    this.visible = true;

    // Update UI state
    this.uiManager.setActiveMenu("tech");

    // Play sound
    this.game.audio.playSound("ui_open");
  }

  /**
   * Hide the technology panel
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
   * Toggle the technology panel
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else if (this.selectedBuilding && this.selectedBuilding.canResearch) {
      this.showWithBuilding(this.selectedBuilding);
    }
  }

  /**
   * Clean up the technology panel
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
