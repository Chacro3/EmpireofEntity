/**
 * Empires of Eternity - Civilization Selection Screen
 * Handles the UI and logic for choosing a civilization before starting the game
 */

class CivilizationSelector {
  /**
   * Initialize the civilization selector
   */
  constructor() {
    // Available civilizations from CONFIG
    this.civilizations = {};

    // Currently selected civilization
    this.selectedCiv = null;

    // DOM elements
    this.elements = {
      container: document.getElementById("civilization-selection"),
      civButtons: document.querySelectorAll(".civ-button"),
      civInfo: document.getElementById("civilization-info"),
      startButton: document.getElementById("start-game-button"),
      errorMessage: document.getElementById("error-message"),
    };

    // Initialize the selector
    this.init();
  }

  /**
   * Initialize the civilization selector
   */
  init() {
    // Load CONFIG if not already loaded
    if (typeof CONFIG === "undefined") {
      this.loadConfig()
        .then(() => this.setupUI())
        .catch((error) => {
          console.error("Failed to load configuration:", error);
          this.showError(
            "Failed to load game configuration. Please refresh the page."
          );
        });
    } else {
      this.setupUI();
    }
  }

  /**
   * Load the configuration file
   * @returns {Promise} Resolves when config is loaded
   */
  loadConfig() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/config.js";
      script.onload = () => {
        if (typeof CONFIG !== "undefined") {
          resolve();
        } else {
          reject(new Error("CONFIG not defined after loading config.js"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load config.js"));
      document.head.appendChild(script);
    });
  }

  /**
   * Set up the UI elements and event handlers
   */
  setupUI() {
    // Get civilizations from CONFIG
    if (CONFIG && CONFIG.CIVILIZATIONS) {
      this.civilizations = CONFIG.CIVILIZATIONS;
    } else {
      this.showError("Game configuration error: Civilizations not defined");
      return;
    }

    // Generate civilization buttons if they don't exist
    if (this.elements.civButtons.length === 0) {
      this.generateCivilizationButtons();
    } else {
      // Set up existing buttons
      this.elements.civButtons.forEach((button) => {
        const civKey = button.getAttribute("data-civ");
        button.addEventListener("click", () => this.selectCivilization(civKey));
      });
    }

    // Set up start button
    if (this.elements.startButton) {
      this.elements.startButton.addEventListener("click", () =>
        this.startGame()
      );
      // Initially disable start button until civilization is selected
      this.elements.startButton.disabled = true;
    }

    // Check for default/previous selection in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const defaultCiv =
      urlParams.get("civ") || localStorage.getItem("selectedCivilization");

    if (defaultCiv && this.civilizations[defaultCiv]) {
      this.selectCivilization(defaultCiv);
    }
  }

  /**
   * Generate civilization buttons dynamically
   */
  generateCivilizationButtons() {
    if (!this.elements.container) return;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "civilization-buttons";

    // Create a button for each civilization
    for (const civKey in this.civilizations) {
      const civ = this.civilizations[civKey];

      const button = document.createElement("button");
      button.className = "civ-button";
      button.setAttribute("data-civ", civKey);

      // Create button content
      const buttonContent = `
          <div class="civ-icon" style="background-color: ${civ.color}"></div>
          <div class="civ-name">${civ.name}</div>
        `;

      button.innerHTML = buttonContent;
      button.addEventListener("click", () => this.selectCivilization(civKey));

      buttonContainer.appendChild(button);
      this.elements.civButtons = [...(this.elements.civButtons || []), button];
    }

    this.elements.container.appendChild(buttonContainer);
  }

  /**
   * Handle civilization selection
   * @param {string} civKey - Key of the selected civilization
   */
  selectCivilization(civKey) {
    if (!this.civilizations[civKey]) {
      this.showError(`Invalid civilization: ${civKey}`);
      return;
    }

    // Update selected civilization
    this.selectedCiv = civKey;

    // Save selection to localStorage for persistence
    localStorage.setItem("selectedCivilization", civKey);

    // Update UI
    const civ = this.civilizations[civKey];

    // Update button styles
    this.elements.civButtons.forEach((button) => {
      if (button.getAttribute("data-civ") === civKey) {
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
      }
    });

    // Display civilization info
    if (this.elements.civInfo) {
      const perksList = this.formatCivPerks(civ.uniquePerks);
      const villagerInfo = this.formatVillagerLimits(civ.villagerLimit);

      this.elements.civInfo.innerHTML = `
          <h2>${civ.name}</h2>
          <div class="civ-emblem" style="background-color: ${civ.color}"></div>
          <div class="civ-description">
            <p>${this.getCivDescription(civKey)}</p>
            <h3>Unique Perks:</h3>
            <ul>${perksList}</ul>
            <h3>Villager Information:</h3>
            <p>${villagerInfo}</p>
          </div>
        `;
    }

    // Enable start button
    if (this.elements.startButton) {
      this.elements.startButton.disabled = false;
    }
  }

  /**
   * Format civilization perks for display
   * @param {Object} perks - Civilization perks
   * @returns {string} HTML list of perks
   */
  formatCivPerks(perks) {
    let perksList = "";

    if (perks.gatherBonus) {
      perksList += `<li><strong>Gather Bonus:</strong> +${
        perks.gatherBonus * 100
      }% gathering speed</li>`;
    }

    if (perks.buildingDiscount) {
      perksList += `<li><strong>Building Discount:</strong> -${
        perks.buildingDiscount * 100
      }% wood cost for buildings</li>`;
    }

    if (perks.soldierTrainingSpeed) {
      perksList += `<li><strong>Military Training:</strong> +${
        perks.soldierTrainingSpeed * 100
      }% faster soldier training</li>`;
    }

    if (perks.villagerMovementSpeed) {
      perksList += `<li><strong>Villager Movement:</strong> +${
        perks.villagerMovementSpeed * 100
      }% faster villager movement</li>`;
    }

    return perksList;
  }

  /**
   * Format villager limit info for display
   * @param {Object} limits - Villager limit info
   * @returns {string} Formatted villager info
   */
  formatVillagerLimits(limits) {
    return `Starting with ${limits.initial} villagers. +${limits.perHouse} population per house. +${limits.perAge} maximum population per age advancement.`;
  }

  /**
   * Get a description for each civilization
   * @param {string} civKey - Civilization key
   * @returns {string} Civilization description
   */
  getCivDescription(civKey) {
    const descriptions = {
      SOLARI:
        "Masters of the sun and daylight, the Solari civilization excels at resource gathering and construction. Their cities grow rapidly under the golden rays of the sun, and their economy flourishes with efficient resource management.",
      LUNARI:
        "Children of the moon and stars, the Lunari civilization commands powerful military units that move swiftly across the battlefield. Their soldiers are trained with exceptional efficiency, and their nocturnal nature grants them special advantages.",
    };

    return (
      descriptions[civKey.toUpperCase()] ||
      "A mighty civilization with unique strengths and cultural traditions."
    );
  }

  /**
   * Start the game with the selected civilization
   */
  startGame() {
    if (!this.selectedCiv) {
      this.showError("Please select a civilization first.");
      return;
    }

    // Redirect to game.html with the selected civilization
    window.location.href = `game.html?civ=${this.selectedCiv}`;
  }

  /**
   * Display an error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = "block";

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.elements.errorMessage.style.display = "none";
      }, 5000);
    } else {
      console.error(message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.civSelector = new CivilizationSelector();
});
