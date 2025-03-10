/**
 * Resource Display Component
 *
 * Displays the player's current resources, rates, and age information
 * at the top of the game screen.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class ResourceDisplay {
  /**
   * Create a new resource display component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "resource-display";
    this.container.style.position = "absolute";
    this.container.style.top = "10px";
    this.container.style.left = "50%";
    this.container.style.transform = "translateX(-50%)";
    this.container.style.display = "flex";
    this.container.style.gap = "20px";
    this.container.style.padding = "8px 16px";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    this.container.style.borderRadius = "5px";
    this.container.style.color = "#fff";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.fontSize = "14px";
    this.container.style.zIndex = "100";
    this.container.style.userSelect = "none";

    // Create individual resource displays
    this.resourceElements = {};

    // Create age display
    this.ageDisplay = document.createElement("div");
    this.ageDisplay.className = "age-display";
    this.ageDisplay.style.display = "flex";
    this.ageDisplay.style.alignItems = "center";
    this.ageDisplay.style.gap = "5px";

    const ageIcon = document.createElement("img");
    ageIcon.className = "age-icon";
    ageIcon.width = 24;
    ageIcon.height = 24;
    ageIcon.style.filter = "brightness(1.5)";
    this.ageIcon = ageIcon;

    const ageText = document.createElement("span");
    ageText.className = "age-text";
    this.ageText = ageText;

    this.ageDisplay.appendChild(ageIcon);
    this.ageDisplay.appendChild(ageText);

    // Create population display
    this.populationDisplay = document.createElement("div");
    this.populationDisplay.className = "population-display";
    this.populationDisplay.style.display = "flex";
    this.populationDisplay.style.alignItems = "center";
    this.populationDisplay.style.gap = "5px";

    const popIcon = document.createElement("img");
    popIcon.src = "assets/ui/icons/population.png";
    popIcon.width = 20;
    popIcon.height = 20;

    const popText = document.createElement("span");
    popText.className = "population-text";
    this.populationText = popText;

    this.populationDisplay.appendChild(popIcon);
    this.populationDisplay.appendChild(popText);

    // Add displays to container
    this.container.appendChild(this.ageDisplay);

    // Initialize resource elements
    this.initializeResourceElements();

    // Add population display
    this.container.appendChild(this.populationDisplay);

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Setup tooltips
    this.setupTooltips();

    // Initialize with starting values
    this.update();
  }

  /**
   * Initialize resource display elements
   */
  initializeResourceElements() {
    const resources = ["food", "wood", "gold", "stone", "iron"];

    resources.forEach((resource) => {
      const resourceElement = document.createElement("div");
      resourceElement.className = `resource ${resource}`;
      resourceElement.style.display = "flex";
      resourceElement.style.alignItems = "center";
      resourceElement.style.gap = "5px";

      // Resource icon
      const icon = document.createElement("img");
      icon.src = `assets/ui/icons/${resource}.png`;
      icon.width = 20;
      icon.height = 20;
      icon.alt = resource;

      // Resource amount
      const amount = document.createElement("span");
      amount.className = `${resource}-amount`;

      // Resource rate (shown when hovering)
      const rate = document.createElement("span");
      rate.className = `${resource}-rate`;
      rate.style.fontSize = "12px";
      rate.style.color = "#aaa";
      rate.style.marginLeft = "3px";

      resourceElement.appendChild(icon);
      resourceElement.appendChild(amount);
      resourceElement.appendChild(rate);

      this.resourceElements[resource] = {
        element: resourceElement,
        amountElement: amount,
        rateElement: rate,
      };

      this.container.appendChild(resourceElement);
    });
  }

  /**
   * Setup tooltips for resource displays
   */
  setupTooltips() {
    const resources = ["food", "wood", "gold", "stone", "iron"];

    resources.forEach((resource) => {
      const element = this.resourceElements[resource].element;

      // Create tooltip element
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.visibility = "hidden";
      tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      tooltip.style.color = "#fff";
      tooltip.style.padding = "5px 10px";
      tooltip.style.borderRadius = "3px";
      tooltip.style.fontSize = "12px";
      tooltip.style.zIndex = "200";
      tooltip.style.width = "200px";
      tooltip.style.pointerEvents = "none";

      document.body.appendChild(tooltip);

      // Show tooltip on hover
      element.addEventListener("mouseenter", () => {
        this.updateTooltip(tooltip, resource);
        tooltip.style.visibility = "visible";
      });

      element.addEventListener("mousemove", (e) => {
        tooltip.style.left = e.pageX + 10 + "px";
        tooltip.style.top = e.pageY + 10 + "px";
      });

      element.addEventListener("mouseleave", () => {
        tooltip.style.visibility = "hidden";
      });

      // Store tooltip reference
      this.resourceElements[resource].tooltip = tooltip;
    });

    // Setup age tooltip
    const ageTooltip = document.createElement("div");
    ageTooltip.className = "tooltip";
    ageTooltip.style.position = "absolute";
    ageTooltip.style.visibility = "hidden";
    ageTooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    ageTooltip.style.color = "#fff";
    ageTooltip.style.padding = "5px 10px";
    ageTooltip.style.borderRadius = "3px";
    ageTooltip.style.fontSize = "12px";
    ageTooltip.style.zIndex = "200";
    ageTooltip.style.width = "200px";
    ageTooltip.style.pointerEvents = "none";

    document.body.appendChild(ageTooltip);

    this.ageDisplay.addEventListener("mouseenter", () => {
      this.updateAgeTooltip(ageTooltip);
      ageTooltip.style.visibility = "visible";
    });

    this.ageDisplay.addEventListener("mousemove", (e) => {
      ageTooltip.style.left = e.pageX + 10 + "px";
      ageTooltip.style.top = e.pageY + 10 + "px";
    });

    this.ageDisplay.addEventListener("mouseleave", () => {
      ageTooltip.style.visibility = "hidden";
    });

    this.ageTooltip = ageTooltip;

    // Setup population tooltip
    const popTooltip = document.createElement("div");
    popTooltip.className = "tooltip";
    popTooltip.style.position = "absolute";
    popTooltip.style.visibility = "hidden";
    popTooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    popTooltip.style.color = "#fff";
    popTooltip.style.padding = "5px 10px";
    popTooltip.style.borderRadius = "3px";
    popTooltip.style.fontSize = "12px";
    popTooltip.style.zIndex = "200";
    popTooltip.style.width = "200px";
    popTooltip.style.pointerEvents = "none";

    document.body.appendChild(popTooltip);

    this.populationDisplay.addEventListener("mouseenter", () => {
      this.updatePopulationTooltip(popTooltip);
      popTooltip.style.visibility = "visible";
    });

    this.populationDisplay.addEventListener("mousemove", (e) => {
      popTooltip.style.left = e.pageX + 10 + "px";
      popTooltip.style.top = e.pageY + 10 + "px";
    });

    this.populationDisplay.addEventListener("mouseleave", () => {
      popTooltip.style.visibility = "hidden";
    });

    this.populationTooltip = popTooltip;
  }

  /**
   * Update a resource tooltip with current information
   * @param {HTMLElement} tooltip - The tooltip element
   * @param {string} resource - Resource type
   */
  updateTooltip(tooltip, resource) {
    const player = this.game.players[this.game.currentPlayerId];
    const resourceManager = player.resources;

    const amount = resourceManager.getResource(resource);
    const rate = resourceManager.getResourceRate(resource);

    let tooltipContent = `<strong>${Utils.capitalizeFirstLetter(
      resource
    )}</strong><br>`;
    tooltipContent += `Amount: ${amount}<br>`;
    tooltipContent += `Rate: ${rate > 0 ? "+" : ""}${rate.toFixed(
      1
    )}/min<br><br>`;

    // Add income breakdown
    tooltipContent += `<strong>Income:</strong><br>`;
    const income = resourceManager.getResourceIncomeBreakdown(resource);

    for (const [source, value] of Object.entries(income)) {
      if (value > 0) {
        tooltipContent += `${Utils.capitalizeFirstLetter(
          source
        )}: +${value.toFixed(1)}<br>`;
      }
    }

    // Add expense breakdown if any
    const expenses = resourceManager.getResourceExpenseBreakdown(resource);
    let hasExpenses = false;

    for (const value of Object.values(expenses)) {
      if (value > 0) {
        hasExpenses = true;
        break;
      }
    }

    if (hasExpenses) {
      tooltipContent += `<br><strong>Expenses:</strong><br>`;

      for (const [source, value] of Object.entries(expenses)) {
        if (value > 0) {
          tooltipContent += `${Utils.capitalizeFirstLetter(
            source
          )}: -${value.toFixed(1)}<br>`;
        }
      }
    }

    tooltip.innerHTML = tooltipContent;
  }

  /**
   * Update the age tooltip with current information
   * @param {HTMLElement} tooltip - The tooltip element
   */
  updateAgeTooltip(tooltip) {
    const player = this.game.players[this.game.currentPlayerId];
    const currentAge = player.age;
    const nextAge = player.age + 1;

    let tooltipContent = `<strong>${config.AGE_NAMES[currentAge]}</strong><br>`;
    tooltipContent += `Current age benefits:<br>`;

    // Add current age benefits
    const currentAgeBenefits = config.AGE_BENEFITS[currentAge];
    for (const [benefit, value] of Object.entries(currentAgeBenefits)) {
      tooltipContent += `- ${this.formatAgeBenefit(benefit, value)}<br>`;
    }

    // Add next age information if available
    if (nextAge < config.AGE_NAMES.length) {
      const nextAgeRequirements = config.AGE_REQUIREMENTS[nextAge];
      const nextAgeBenefits = config.AGE_BENEFITS[nextAge];

      tooltipContent += `<br><strong>Next Age: ${config.AGE_NAMES[nextAge]}</strong><br>`;
      tooltipContent += `Requirements:<br>`;

      // Add resource requirements
      for (const [resource, amount] of Object.entries(
        nextAgeRequirements.resources
      )) {
        const current = player.resources.getResource(resource);
        const color = current >= amount ? "#00FF00" : "#FF0000";
        tooltipContent += `- ${Utils.capitalizeFirstLetter(
          resource
        )}: <span style="color: ${color}">${current}/${amount}</span><br>`;
      }

      // Add building requirements if any
      if (
        nextAgeRequirements.buildings &&
        nextAgeRequirements.buildings.length > 0
      ) {
        tooltipContent += `Buildings needed:<br>`;
        for (const building of nextAgeRequirements.buildings) {
          const hasBuildingType = player.hasBuildingType(building);
          const color = hasBuildingType ? "#00FF00" : "#FF0000";
          tooltipContent += `- <span style="color: ${color}">${Utils.formatBuildingName(
            building
          )}</span><br>`;
        }
      }

      // Add next age benefits
      tooltipContent += `<br>Benefits:<br>`;
      for (const [benefit, value] of Object.entries(nextAgeBenefits)) {
        tooltipContent += `- ${this.formatAgeBenefit(benefit, value)}<br>`;
      }
    } else {
      tooltipContent += `<br>You have reached the final age!`;
    }

    tooltip.innerHTML = tooltipContent;
  }

  /**
   * Format age benefit for display
   * @param {string} benefit - Benefit type
   * @param {*} value - Benefit value
   * @returns {string} Formatted benefit text
   */
  formatAgeBenefit(benefit, value) {
    switch (benefit) {
      case "buildingUnlocks":
        return `Unlocks ${value.length} buildings`;
      case "unitUnlocks":
        return `Unlocks ${value.length} units`;
      case "technologyUnlocks":
        return `Unlocks ${value.length} technologies`;
      case "resourceBonus":
        let bonusText = "Resource bonuses: ";
        for (const [resource, bonus] of Object.entries(value)) {
          bonusText += `${resource} +${bonus}%, `;
        }
        return bonusText.slice(0, -2); // Remove trailing comma and space
      case "populationCap":
        return `Population cap increased by ${value}`;
      default:
        return `${benefit}: ${value}`;
    }
  }

  /**
   * Update the population tooltip with current information
   * @param {HTMLElement} tooltip - The tooltip element
   */
  updatePopulationTooltip(tooltip) {
    const player = this.game.players[this.game.currentPlayerId];
    const currentPop = player.getCurrentPopulation();
    const maxPop = player.getMaxPopulation();
    const houseCount = player.getBuildingCountByType("house");

    let tooltipContent = `<strong>Population</strong><br>`;
    tooltipContent += `Current: ${currentPop}<br>`;
    tooltipContent += `Maximum: ${maxPop}<br><br>`;

    // Add breakdown by unit type
    tooltipContent += `<strong>Population breakdown:</strong><br>`;

    const unitCounts = player.getUnitCounts();
    for (const [unitType, count] of Object.entries(unitCounts)) {
      if (count > 0) {
        tooltipContent += `${Utils.formatUnitName(unitType)}: ${count}<br>`;
      }
    }

    // Add house information
    tooltipContent += `<br><strong>Housing:</strong><br>`;
    tooltipContent += `Houses: ${houseCount}<br>`;
    tooltipContent += `Housing provided: ${
      houseCount * config.HOUSE_POPULATION
    }<br>`;
    tooltipContent += `Base population: ${config.BASE_POPULATION}<br>`;

    // Add population cap by age
    tooltipContent += `Age bonus: +${
      config.AGE_BENEFITS[player.age].populationCap || 0
    }<br>`;

    // Add civilization bonus if any
    if (player.bonuses && player.bonuses.populationCap) {
      tooltipContent += `Civilization bonus: +${player.bonuses.populationCap}<br>`;
    }

    tooltip.innerHTML = tooltipContent;
  }

  /**
   * Update the resource display with current values
   */
  update() {
    const player = this.game.players[this.game.currentPlayerId];
    const resourceManager = player.resources;

    // Update resources
    Object.keys(this.resourceElements).forEach((resource) => {
      const amount = resourceManager.getResource(resource);
      const rate = resourceManager.getResourceRate(resource);
      const elements = this.resourceElements[resource];

      // Format amount with comma separators
      elements.amountElement.textContent = Utils.formatNumber(amount);

      // Show rate only if not zero
      if (rate !== 0) {
        const sign = rate > 0 ? "+" : "";
        elements.rateElement.textContent = `(${sign}${rate.toFixed(1)})`;
        elements.rateElement.style.color = rate > 0 ? "#8F8" : "#F88";
      } else {
        elements.rateElement.textContent = "";
      }

      // Highlight if low
      const lowThreshold = config.RESOURCE_LOW_WARNING_THRESHOLD;
      if (amount < lowThreshold) {
        elements.amountElement.style.color = "#FF6666";
      } else {
        elements.amountElement.style.color = "#FFFFFF";
      }
    });

    // Update age display
    this.ageText.textContent = config.AGE_NAMES[player.age];
    this.ageIcon.src = `assets/ui/icons/age_${player.age}.png`;

    // Update population display
    const currentPop = player.getCurrentPopulation();
    const maxPop = player.getMaxPopulation();
    this.populationText.textContent = `${currentPop}/${maxPop}`;

    // Highlight if near population cap
    if (currentPop >= maxPop) {
      this.populationText.style.color = "#FF0000";
    } else if (currentPop >= maxPop * 0.8) {
      this.populationText.style.color = "#FFAA00";
    } else {
      this.populationText.style.color = "#FFFFFF";
    }
  }

  /**
   * Show the resource display
   */
  show() {
    this.container.style.display = "flex";
  }

  /**
   * Hide the resource display
   */
  hide() {
    this.container.style.display = "none";
  }

  /**
   * Clean up the resource display
   */
  cleanup() {
    // Remove event listeners
    Object.values(this.resourceElements).forEach((elements) => {
      const element = elements.element;
      const tooltip = elements.tooltip;

      element.removeEventListener("mouseenter", null);
      element.removeEventListener("mousemove", null);
      element.removeEventListener("mouseleave", null);

      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });

    this.ageDisplay.removeEventListener("mouseenter", null);
    this.ageDisplay.removeEventListener("mousemove", null);
    this.ageDisplay.removeEventListener("mouseleave", null);

    // Remove tooltips
    if (this.ageTooltip && this.ageTooltip.parentNode) {
      this.ageTooltip.parentNode.removeChild(this.ageTooltip);
    }

    if (this.populationTooltip && this.populationTooltip.parentNode) {
      this.populationTooltip.parentNode.removeChild(this.populationTooltip);
    }

    // Remove main container
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
