/**
 * Unit Panel Component
 *
 * Displays information about selected units and provides action buttons
 * for controlling them.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class UnitPanel {
  /**
   * Create a new unit panel component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.visible = false;
    this.selectedUnits = [];

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "unit-panel";
    this.container.style.position = "absolute";
    this.container.style.bottom = "10px";
    this.container.style.left = "50%";
    this.container.style.transform = "translateX(-50%)";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.container.style.borderRadius = "5px";
    this.container.style.padding = "10px";
    this.container.style.color = "#fff";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.fontSize = "14px";
    this.container.style.zIndex = "100";
    this.container.style.display = "none";
    this.container.style.userSelect = "none";
    this.container.style.minWidth = "500px";

    // Create panel sections
    this.createSelectionInfo();
    this.createActionButtons();

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Register event listeners
    this.registerEvents();
  }

  /**
   * Create the selection info section
   */
  createSelectionInfo() {
    this.selectionInfo = document.createElement("div");
    this.selectionInfo.className = "selection-info";
    this.selectionInfo.style.display = "flex";
    this.selectionInfo.style.alignItems = "center";
    this.selectionInfo.style.marginBottom = "10px";

    // Portrait container
    this.portraitContainer = document.createElement("div");
    this.portraitContainer.className = "portrait-container";
    this.portraitContainer.style.width = "64px";
    this.portraitContainer.style.height = "64px";
    this.portraitContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.portraitContainer.style.borderRadius = "3px";
    this.portraitContainer.style.marginRight = "10px";
    this.portraitContainer.style.display = "flex";
    this.portraitContainer.style.alignItems = "center";
    this.portraitContainer.style.justifyContent = "center";

    // Portrait image
    this.portrait = document.createElement("img");
    this.portrait.className = "unit-portrait";
    this.portrait.style.maxWidth = "64px";
    this.portrait.style.maxHeight = "64px";

    this.portraitContainer.appendChild(this.portrait);

    // Selection details
    this.selectionDetails = document.createElement("div");
    this.selectionDetails.className = "selection-details";
    this.selectionDetails.style.flex = "1";

    // Unit name and count
    this.selectionName = document.createElement("div");
    this.selectionName.className = "selection-name";
    this.selectionName.style.fontSize = "16px";
    this.selectionName.style.fontWeight = "bold";
    this.selectionName.style.marginBottom = "5px";

    // Unit stats
    this.selectionStats = document.createElement("div");
    this.selectionStats.className = "selection-stats";
    this.selectionStats.style.display = "grid";
    this.selectionStats.style.gridTemplateColumns = "repeat(3, 1fr)";
    this.selectionStats.style.gap = "5px";
    this.selectionStats.style.fontSize = "12px";

    this.selectionDetails.appendChild(this.selectionName);
    this.selectionDetails.appendChild(this.selectionStats);

    // Group info
    this.groupInfo = document.createElement("div");
    this.groupInfo.className = "group-info";
    this.groupInfo.style.marginLeft = "10px";
    this.groupInfo.style.display = "flex";
    this.groupInfo.style.flexDirection = "column";
    this.groupInfo.style.alignItems = "center";

    this.groupLabel = document.createElement("div");
    this.groupLabel.className = "group-label";
    this.groupLabel.style.fontSize = "12px";
    this.groupLabel.style.marginBottom = "5px";
    this.groupLabel.textContent = "Group";

    this.groupNumber = document.createElement("div");
    this.groupNumber.className = "group-number";
    this.groupNumber.style.width = "24px";
    this.groupNumber.style.height = "24px";
    this.groupNumber.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    this.groupNumber.style.borderRadius = "3px";
    this.groupNumber.style.display = "flex";
    this.groupNumber.style.alignItems = "center";
    this.groupNumber.style.justifyContent = "center";
    this.groupNumber.style.fontWeight = "bold";

    this.groupInfo.appendChild(this.groupLabel);
    this.groupInfo.appendChild(this.groupNumber);

    // Add components to selection info
    this.selectionInfo.appendChild(this.portraitContainer);
    this.selectionInfo.appendChild(this.selectionDetails);
    this.selectionInfo.appendChild(this.groupInfo);

    this.container.appendChild(this.selectionInfo);
  }

  /**
   * Create action buttons section
   */
  createActionButtons() {
    this.actionButtons = document.createElement("div");
    this.actionButtons.className = "action-buttons";
    this.actionButtons.style.display = "flex";
    this.actionButtons.style.flexWrap = "wrap";
    this.actionButtons.style.gap = "5px";

    // Action buttons will be created dynamically based on selected units

    this.container.appendChild(this.actionButtons);
  }

  /**
   * Update the panel with selected units
   * @param {Array<Entity>} units - Array of selected units
   */
  updateSelection(units) {
    this.selectedUnits = units;

    if (units.length === 0) {
      this.hide();
      return;
    }

    // Update portrait and name
    this.updateSelectionInfo();

    // Update action buttons
    this.updateActionButtons();

    // Show the panel
    this.show();
  }

  /**
   * Update selection information (portrait, name, stats)
   */
  updateSelectionInfo() {
    const units = this.selectedUnits;

    if (units.length === 0) return;

    // Check if all units are of the same type
    const firstUnitType = units[0].unitType;
    const homogeneousSelection = units.every(
      (unit) => unit.unitType === firstUnitType
    );

    // Set portrait and name based on selection
    if (homogeneousSelection) {
      // Single unit type
      this.portrait.src = `assets/ui/portraits/${firstUnitType}.png`;

      if (units.length === 1) {
        // Single unit
        const unit = units[0];
        this.selectionName.textContent = Utils.formatUnitName(unit.unitType);

        // Show detailed stats for a single unit
        this.selectionStats.innerHTML = "";

        // HP
        const hpStat = document.createElement("div");
        hpStat.textContent = `HP: ${Math.ceil(unit.hp)}/${unit.maxHP}`;
        this.selectionStats.appendChild(hpStat);

        // Attack
        if (unit.attackDamage > 0) {
          const attackStat = document.createElement("div");
          attackStat.textContent = `Attack: ${unit.attackDamage}`;
          this.selectionStats.appendChild(attackStat);
        }

        // Armor
        const armorStat = document.createElement("div");
        armorStat.textContent = `Armor: ${unit.armor}`;
        this.selectionStats.appendChild(armorStat);

        // Range (if applicable)
        if (unit.attackRange > 1) {
          const rangeStat = document.createElement("div");
          rangeStat.textContent = `Range: ${unit.attackRange}`;
          this.selectionStats.appendChild(rangeStat);
        }

        // Speed
        const speedStat = document.createElement("div");
        speedStat.textContent = `Speed: ${unit.moveSpeed}`;
        this.selectionStats.appendChild(speedStat);

        // Carrying capacity (villagers)
        if (unit.unitType === "villager" && unit.carryCapacity) {
          const capacityStat = document.createElement("div");
          capacityStat.textContent = `Capacity: ${unit.carryCapacity}`;
          this.selectionStats.appendChild(capacityStat);
        }

        // Show currently carried resources (villagers)
        if (unit.unitType === "villager" && unit.carryingResource) {
          const carryingStat = document.createElement("div");
          carryingStat.textContent = `Carrying: ${unit.carryingAmount} ${unit.carryingResource}`;
          this.selectionStats.appendChild(carryingStat);
        }

        // Level and XP (heroes)
        if (unit.isHero) {
          const levelStat = document.createElement("div");
          levelStat.textContent = `Level: ${unit.level}`;
          this.selectionStats.appendChild(levelStat);

          const xpStat = document.createElement("div");
          xpStat.textContent = `XP: ${unit.xp}/${unit.xpForNextLevel}`;
          this.selectionStats.appendChild(xpStat);
        }
      } else {
        // Multiple units of the same type
        this.selectionName.textContent = `${Utils.formatUnitName(
          firstUnitType
        )} (${units.length})`;

        // Show aggregate stats
        this.selectionStats.innerHTML = "";

        // Average HP
        const totalHP = units.reduce((sum, unit) => sum + unit.hp, 0);
        const totalMaxHP = units.reduce((sum, unit) => sum + unit.maxHP, 0);
        const hpStat = document.createElement("div");
        hpStat.textContent = `HP: ${Math.ceil(totalHP)}/${totalMaxHP}`;
        this.selectionStats.appendChild(hpStat);

        // Attack
        if (units[0].attackDamage > 0) {
          const attackStat = document.createElement("div");
          attackStat.textContent = `Attack: ${units[0].attackDamage}`;
          this.selectionStats.appendChild(attackStat);
        }

        // Armor
        const armorStat = document.createElement("div");
        armorStat.textContent = `Armor: ${units[0].armor}`;
        this.selectionStats.appendChild(armorStat);
      }
    } else {
      // Mixed unit types
      this.portrait.src = "assets/ui/portraits/mixed_units.png";
      this.selectionName.textContent = `Mixed Units (${units.length})`;

      // Show count by type
      this.selectionStats.innerHTML = "";

      const unitCounts = {};
      units.forEach((unit) => {
        unitCounts[unit.unitType] = (unitCounts[unit.unitType] || 0) + 1;
      });

      for (const [type, count] of Object.entries(unitCounts)) {
        const typeStat = document.createElement("div");
        typeStat.textContent = `${Utils.formatUnitName(type)}: ${count}`;
        this.selectionStats.appendChild(typeStat);
      }
    }

    // Update group info
    const group = units[0].group;

    if (group !== undefined && group !== null) {
      this.groupNumber.textContent = group + 1; // Display as 1-based
      this.groupInfo.style.display = "flex";
    } else {
      this.groupInfo.style.display = "none";
    }
  }

  /**
   * Update action buttons based on selected units
   */
  updateActionButtons() {
    // Clear existing buttons
    this.actionButtons.innerHTML = "";

    const units = this.selectedUnits;

    if (units.length === 0) return;

    // Common actions
    this.addActionButton("move", "Move", "Move selected units", () =>
      this.game.input.startMoveCommand()
    );

    this.addActionButton("stop", "Stop", "Stop all current actions", () =>
      this.issueCommand("stop")
    );

    // Check if any units can attack
    const canAttack = units.some((unit) => unit.attackDamage > 0);
    if (canAttack) {
      this.addActionButton(
        "attack",
        "Attack",
        "Attack enemies or structures",
        () => this.game.input.startAttackCommand()
      );
    }

    // Check if all units are villagers
    const allVillagers = units.every((unit) => unit.unitType === "villager");
    if (allVillagers) {
      // Villager actions
      this.addActionButton("build", "Build", "Construct a building", () =>
        this.uiManager.showBuildingMenu()
      );

      this.addActionButton("gather", "Gather", "Gather resources", () =>
        this.game.input.startGatherCommand()
      );

      this.addActionButton("repair", "Repair", "Repair damaged buildings", () =>
        this.game.input.startRepairCommand()
      );

      // Auto-assign toggle
      const isAutoAssigned = units[0].autoAssigned;
      const autoAssignColor = isAutoAssigned ? "#88FF88" : "#FFFFFF";

      this.addActionButton(
        "auto-assign",
        "Auto",
        "Toggle automatic resource gathering",
        () => this.issueCommand("toggleAutoAssign"),
        autoAssignColor
      );
    }

    // Military formation buttons (if multiple military units)
    const militaryUnits = units.filter(
      (unit) => unit.unitType !== "villager" && !unit.isHero
    );

    if (militaryUnits.length > 1) {
      // Add formation buttons
      this.addActionButton("formation-line", "Line", "Line formation", () =>
        this.issueCommand("setFormation", { formation: "line" })
      );

      this.addActionButton("formation-box", "Box", "Box formation", () =>
        this.issueCommand("setFormation", { formation: "box" })
      );

      this.addActionButton(
        "formation-scattered",
        "Scatter",
        "Scattered formation",
        () => this.issueCommand("setFormation", { formation: "scattered" })
      );

      // Stance buttons
      this.addActionButton(
        "stance-aggressive",
        "Aggressive",
        "Attack enemies on sight",
        () => this.issueCommand("setStance", { stance: "aggressive" })
      );

      this.addActionButton(
        "stance-defensive",
        "Defensive",
        "Attack when attacked",
        () => this.issueCommand("setStance", { stance: "defensive" })
      );

      this.addActionButton(
        "stance-passive",
        "Passive",
        "Never attack automatically",
        () => this.issueCommand("setStance", { stance: "passive" })
      );
    }

    // Add patrol action for military units
    if (militaryUnits.length > 0) {
      this.addActionButton(
        "patrol",
        "Patrol",
        "Patrol between two points",
        () => this.game.input.startPatrolCommand()
      );
    }

    // Hero abilities (if a single hero is selected)
    const singleHero = units.length === 1 && units[0].isHero;
    if (singleHero) {
      const hero = units[0];

      // Add hero abilities
      if (hero.abilities) {
        for (const ability of hero.abilities) {
          if (ability.level <= hero.level) {
            // Hero has unlocked this ability
            const cooldownPercent = hero.getAbilityCooldownPercent(ability.id);
            const isReady = cooldownPercent === 0;

            this.addActionButton(
              `ability-${ability.id}`,
              ability.name,
              ability.description,
              () => this.issueCommand("useAbility", { abilityId: ability.id }),
              isReady ? "#FFFFFF" : "#888888",
              cooldownPercent
            );
          }
        }
      }
    }

    // Group assignment buttons
    this.addGroupButtons();
  }

  /**
   * Add action button to panel
   * @param {string} icon - Button icon name
   * @param {string} label - Button label
   * @param {string} tooltip - Button tooltip
   * @param {Function} onClick - Click handler
   * @param {string} textColor - Text color (optional)
   * @param {number} cooldownPercent - Cooldown overlay percentage (optional)
   */
  addActionButton(
    icon,
    label,
    tooltip,
    onClick,
    textColor = "#FFFFFF",
    cooldownPercent = 0
  ) {
    const button = document.createElement("div");
    button.className = `action-button ${icon}`;
    button.style.width = "60px";
    button.style.height = "60px";
    button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
    button.style.borderRadius = "5px";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.cursor = "pointer";
    button.style.padding = "5px";
    button.style.boxSizing = "border-box";
    button.title = tooltip;

    // Button icon
    const iconElement = document.createElement("img");
    iconElement.src = `assets/ui/icons/${icon}.png`;
    iconElement.alt = icon;
    iconElement.style.width = "32px";
    iconElement.style.height = "32px";
    iconElement.style.marginBottom = "3px";

    // Button label
    const labelElement = document.createElement("div");
    labelElement.className = "button-label";
    labelElement.textContent = label;
    labelElement.style.fontSize = "11px";
    labelElement.style.color = textColor;

    button.appendChild(iconElement);
    button.appendChild(labelElement);

    // Add cooldown overlay if needed
    if (cooldownPercent > 0) {
      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.className = "cooldown-overlay";
      cooldownOverlay.style.position = "absolute";
      cooldownOverlay.style.bottom = "0";
      cooldownOverlay.style.left = "0";
      cooldownOverlay.style.width = "100%";
      cooldownOverlay.style.height = `${cooldownPercent}%`;
      cooldownOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
      cooldownOverlay.style.borderRadius = "0 0 5px 5px";
      cooldownOverlay.style.pointerEvents = "none";

      button.style.position = "relative";
      button.style.overflow = "hidden";
      button.appendChild(cooldownOverlay);
    }

    // Add event listeners
    button.addEventListener("click", onClick);

    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
    });

    this.actionButtons.appendChild(button);
  }

  /**
   * Add group assignment buttons
   */
  addGroupButtons() {
    const groupButtonsContainer = document.createElement("div");
    groupButtonsContainer.className = "group-buttons-container";
    groupButtonsContainer.style.display = "flex";
    groupButtonsContainer.style.flexDirection = "column";
    groupButtonsContainer.style.gap = "5px";
    groupButtonsContainer.style.marginLeft = "10px";

    const groupLabel = document.createElement("div");
    groupLabel.textContent = "Assign Group:";
    groupLabel.style.fontSize = "12px";
    groupLabel.style.marginBottom = "3px";

    const groupButtons = document.createElement("div");
    groupButtons.className = "group-buttons";
    groupButtons.style.display = "flex";
    groupButtons.style.gap = "5px";

    // Create buttons for groups 1-9
    for (let i = 1; i <= 9; i++) {
      const groupButton = document.createElement("div");
      groupButton.className = `group-button group-${i}`;
      groupButton.textContent = i;
      groupButton.style.width = "24px";
      groupButton.style.height = "24px";
      groupButton.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      groupButton.style.borderRadius = "3px";
      groupButton.style.display = "flex";
      groupButton.style.alignItems = "center";
      groupButton.style.justifyContent = "center";
      groupButton.style.cursor = "pointer";
      groupButton.style.fontWeight = "bold";

      // Highlight if units are already in this group
      const groupIndex = i - 1; // Convert to 0-based
      if (this.selectedUnits.some((unit) => unit.group === groupIndex)) {
        groupButton.style.backgroundColor = "rgba(100, 150, 255, 0.6)";
      }

      // Add event listeners
      groupButton.addEventListener("click", () => {
        this.issueCommand("assignGroup", { group: groupIndex });

        // Update button appearance
        groupButtons.querySelectorAll(".group-button").forEach((button) => {
          button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
        });
        groupButton.style.backgroundColor = "rgba(100, 150, 255, 0.6)";

        // Play sound
        this.game.audio.playSound("ui_group_assign");
      });

      groupButton.addEventListener("mouseover", () => {
        if (!this.selectedUnits.some((unit) => unit.group === groupIndex)) {
          groupButton.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
        }
      });

      groupButton.addEventListener("mouseout", () => {
        if (!this.selectedUnits.some((unit) => unit.group === groupIndex)) {
          groupButton.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
        }
      });

      groupButtons.appendChild(groupButton);
    }

    groupButtonsContainer.appendChild(groupLabel);
    groupButtonsContainer.appendChild(groupButtons);

    this.actionButtons.appendChild(groupButtonsContainer);
  }

  /**
   * Issue a command to selected units
   * @param {string} command - Command name
   * @param {Object} params - Command parameters
   */
  issueCommand(command, params = {}) {
    if (this.selectedUnits.length === 0) return;

    const entityIds = this.selectedUnits.map((unit) => unit.id);

    // Issue command through entity manager
    this.game.entityManager.executeCommand(command, entityIds, params);

    // Play command sound
    switch (command) {
      case "stop":
        this.game.audio.playSound("unit_stop");
        break;
      case "toggleAutoAssign":
        this.game.audio.playSound("ui_toggle");
        // Update button appearance on next frame
        setTimeout(() => this.updateActionButtons(), 50);
        break;
      case "setFormation":
        this.game.audio.playSound("unit_formation");
        break;
      case "setStance":
        this.game.audio.playSound("unit_stance");
        break;
      case "useAbility":
        this.game.audio.playSound("hero_ability");
        // Update button appearance on next frame
        setTimeout(() => this.updateActionButtons(), 50);
        break;
      default:
        this.game.audio.playSound("unit_select");
    }
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Listen for selection changes
    this.game.events.on("selectionChanged", (data) => {
      if (data.type === "units") {
        this.updateSelection(data.entities);
      } else {
        // Non-unit selection - hide unit panel
        this.hide();
      }
    });

    // Listen for unit state changes that might affect the UI
    this.game.events.on("unitStateChanged", (data) => {
      // Update if the changed unit is in our selection
      if (this.selectedUnits.some((unit) => unit.id === data.unitId)) {
        // Refresh unit info and actions
        this.updateSelectionInfo();
        this.updateActionButtons();
      }
    });

    // Listen for ability cooldown updates
    this.game.events.on("abilityCooldownUpdate", (data) => {
      // Update if the unit is in our selection
      if (this.selectedUnits.some((unit) => unit.id === data.unitId)) {
        this.updateActionButtons();
      }
    });
  }

  /**
   * Show the unit panel
   */
  show() {
    this.container.style.display = "block";
    this.visible = true;
  }

  /**
   * Hide the unit panel
   */
  hide() {
    this.container.style.display = "none";
    this.visible = false;
    this.selectedUnits = [];
  }

  /**
   * Clean up the unit panel
   */
  cleanup() {
    // Remove event listeners

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
/**
 * Unit Panel Component
 *
 * Displays information about selected units and provides action buttons
 * for controlling them.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

export class UnitPanel {
  /**
   * Create a new unit panel component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.visible = false;
    this.selectedUnits = [];

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "unit-panel";
    this.container.style.position = "absolute";
    this.container.style.bottom = "10px";
    this.container.style.left = "50%";
    this.container.style.transform = "translateX(-50%)";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.container.style.borderRadius = "5px";
    this.container.style.padding = "10px";
    this.container.style.color = "#fff";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.fontSize = "14px";
    this.container.style.zIndex = "100";
    this.container.style.display = "none";
    this.container.style.userSelect = "none";
    this.container.style.minWidth = "500px";

    // Create panel sections
    this.createSelectionInfo();
    this.createActionButtons();

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Register event listeners
    this.registerEvents();
  }

  /**
   * Create the selection info section
   */
  createSelectionInfo() {
    this.selectionInfo = document.createElement("div");
    this.selectionInfo.className = "selection-info";
    this.selectionInfo.style.display = "flex";
    this.selectionInfo.style.alignItems = "center";
    this.selectionInfo.style.marginBottom = "10px";

    // Portrait container
    this.portraitContainer = document.createElement("div");
    this.portraitContainer.className = "portrait-container";
    this.portraitContainer.style.width = "64px";
    this.portraitContainer.style.height = "64px";
    this.portraitContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.portraitContainer.style.borderRadius = "3px";
    this.portraitContainer.style.marginRight = "10px";
    this.portraitContainer.style.display = "flex";
    this.portraitContainer.style.alignItems = "center";
    this.portraitContainer.style.justifyContent = "center";

    // Portrait image
    this.portrait = document.createElement("img");
    this.portrait.className = "unit-portrait";
    this.portrait.style.maxWidth = "64px";
    this.portrait.style.maxHeight = "64px";

    this.portraitContainer.appendChild(this.portrait);

    // Selection details
    this.selectionDetails = document.createElement("div");
    this.selectionDetails.className = "selection-details";
    this.selectionDetails.style.flex = "1";

    // Unit name and count
    this.selectionName = document.createElement("div");
    this.selectionName.className = "selection-name";
    this.selectionName.style.fontSize = "16px";
    this.selectionName.style.fontWeight = "bold";
    this.selectionName.style.marginBottom = "5px";

    // Unit stats
    this.selectionStats = document.createElement("div");
    this.selectionStats.className = "selection-stats";
    this.selectionStats.style.display = "grid";
    this.selectionStats.style.gridTemplateColumns = "repeat(3, 1fr)";
    this.selectionStats.style.gap = "5px";
    this.selectionStats.style.fontSize = "12px";

    this.selectionDetails.appendChild(this.selectionName);
    this.selectionDetails.appendChild(this.selectionStats);

    // Group info
    this.groupInfo = document.createElement("div");
    this.groupInfo.className = "group-info";
    this.groupInfo.style.marginLeft = "10px";
    this.groupInfo.style.display = "flex";
    this.groupInfo.style.flexDirection = "column";
    this.groupInfo.style.alignItems = "center";

    this.groupLabel = document.createElement("div");
    this.groupLabel.className = "group-label";
    this.groupLabel.style.fontSize = "12px";
    this.groupLabel.style.marginBottom = "5px";
    this.groupLabel.textContent = "Group";

    this.groupNumber = document.createElement("div");
    this.groupNumber.className = "group-number";
    this.groupNumber.style.width = "24px";
    this.groupNumber.style.height = "24px";
    this.groupNumber.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    this.groupNumber.style.borderRadius = "3px";
    this.groupNumber.style.display = "flex";
    this.groupNumber.style.alignItems = "center";
    this.groupNumber.style.justifyContent = "center";
    this.groupNumber.style.fontWeight = "bold";

    this.groupInfo.appendChild(this.groupLabel);
    this.groupInfo.appendChild(this.groupNumber);

    // Add components to selection info
    this.selectionInfo.appendChild(this.portraitContainer);
    this.selectionInfo.appendChild(this.selectionDetails);
    this.selectionInfo.appendChild(this.groupInfo);

    this.container.appendChild(this.selectionInfo);
  }

  /**
   * Create action buttons section
   */
  createActionButtons() {
    this.actionButtons = document.createElement("div");
    this.actionButtons.className = "action-buttons";
    this.actionButtons.style.display = "flex";
    this.actionButtons.style.flexWrap = "wrap";
    this.actionButtons.style.gap = "5px";

    // Action buttons will be created dynamically based on selected units

    this.container.appendChild(this.actionButtons);
  }

  /**
   * Update the panel with selected units
   * @param {Array<Entity>} units - Array of selected units
   */
  updateSelection(units) {
    this.selectedUnits = units;

    if (units.length === 0) {
      this.hide();
      return;
    }

    // Update portrait and name
    this.updateSelectionInfo();

    // Update action buttons
    this.updateActionButtons();

    // Show the panel
    this.show();
  }

  /**
   * Update selection information (portrait, name, stats)
   */
  updateSelectionInfo() {
    const units = this.selectedUnits;

    if (units.length === 0) return;

    // Check if all units are of the same type
    const firstUnitType = units[0].unitType;
    const homogeneousSelection = units.every(
      (unit) => unit.unitType === firstUnitType
    );

    // Set portrait and name based on selection
    if (homogeneousSelection) {
      // Single unit type
      this.portrait.src = `assets/ui/portraits/${firstUnitType}.png`;

      if (units.length === 1) {
        // Single unit
        const unit = units[0];
        this.selectionName.textContent = Utils.formatUnitName(unit.unitType);

        // Show detailed stats for a single unit
        this.selectionStats.innerHTML = "";

        // HP
        const hpStat = document.createElement("div");
        hpStat.textContent = `HP: ${Math.ceil(unit.hp)}/${unit.maxHP}`;
        this.selectionStats.appendChild(hpStat);

        // Attack
        if (unit.attackDamage > 0) {
          const attackStat = document.createElement("div");
          attackStat.textContent = `Attack: ${unit.attackDamage}`;
          this.selectionStats.appendChild(attackStat);
        }

        // Armor
        const armorStat = document.createElement("div");
        armorStat.textContent = `Armor: ${unit.armor}`;
        this.selectionStats.appendChild(armorStat);

        // Range (if applicable)
        if (unit.attackRange > 1) {
          const rangeStat = document.createElement("div");
          rangeStat.textContent = `Range: ${unit.attackRange}`;
          this.selectionStats.appendChild(rangeStat);
        }

        // Speed
        const speedStat = document.createElement("div");
        speedStat.textContent = `Speed: ${unit.moveSpeed}`;
        this.selectionStats.appendChild(speedStat);

        // Carrying capacity (villagers)
        if (unit.unitType === "villager" && unit.carryCapacity) {
          const capacityStat = document.createElement("div");
          capacityStat.textContent = `Capacity: ${unit.carryCapacity}`;
          this.selectionStats.appendChild(capacityStat);
        }

        // Show currently carried resources (villagers)
        if (unit.unitType === "villager" && unit.carryingResource) {
          const carryingStat = document.createElement("div");
          carryingStat.textContent = `Carrying: ${unit.carryingAmount} ${unit.carryingResource}`;
          this.selectionStats.appendChild(carryingStat);
        }

        // Level and XP (heroes)
        if (unit.isHero) {
          const levelStat = document.createElement("div");
          levelStat.textContent = `Level: ${unit.level}`;
          this.selectionStats.appendChild(levelStat);

          const xpStat = document.createElement("div");
          xpStat.textContent = `XP: ${unit.xp}/${unit.xpForNextLevel}`;
          this.selectionStats.appendChild(xpStat);
        }
      } else {
        // Multiple units of the same type
        this.selectionName.textContent = `${Utils.formatUnitName(
          firstUnitType
        )} (${units.length})`;

        // Show aggregate stats
        this.selectionStats.innerHTML = "";

        // Average HP
        const totalHP = units.reduce((sum, unit) => sum + unit.hp, 0);
        const totalMaxHP = units.reduce((sum, unit) => sum + unit.maxHP, 0);
        const hpStat = document.createElement("div");
        hpStat.textContent = `HP: ${Math.ceil(totalHP)}/${totalMaxHP}`;
        this.selectionStats.appendChild(hpStat);

        // Attack
        if (units[0].attackDamage > 0) {
          const attackStat = document.createElement("div");
          attackStat.textContent = `Attack: ${units[0].attackDamage}`;
          this.selectionStats.appendChild(attackStat);
        }

        // Armor
        const armorStat = document.createElement("div");
        armorStat.textContent = `Armor: ${units[0].armor}`;
        this.selectionStats.appendChild(armorStat);
      }
    } else {
      // Mixed unit types
      this.portrait.src = "assets/ui/portraits/mixed_units.png";
      this.selectionName.textContent = `Mixed Units (${units.length})`;

      // Show count by type
      this.selectionStats.innerHTML = "";

      const unitCounts = {};
      units.forEach((unit) => {
        unitCounts[unit.unitType] = (unitCounts[unit.unitType] || 0) + 1;
      });

      for (const [type, count] of Object.entries(unitCounts)) {
        const typeStat = document.createElement("div");
        typeStat.textContent = `${Utils.formatUnitName(type)}: ${count}`;
        this.selectionStats.appendChild(typeStat);
      }
    }

    // Update group info
    const group = units[0].group;

    if (group !== undefined && group !== null) {
      this.groupNumber.textContent = group + 1; // Display as 1-based
      this.groupInfo.style.display = "flex";
    } else {
      this.groupInfo.style.display = "none";
    }
  }

  /**
   * Update action buttons based on selected units
   */
  updateActionButtons() {
    // Clear existing buttons
    this.actionButtons.innerHTML = "";

    const units = this.selectedUnits;

    if (units.length === 0) return;

    // Common actions
    this.addActionButton("move", "Move", "Move selected units", () =>
      this.game.input.startMoveCommand()
    );

    this.addActionButton("stop", "Stop", "Stop all current actions", () =>
      this.issueCommand("stop")
    );

    // Check if any units can attack
    const canAttack = units.some((unit) => unit.attackDamage > 0);
    if (canAttack) {
      this.addActionButton(
        "attack",
        "Attack",
        "Attack enemies or structures",
        () => this.game.input.startAttackCommand()
      );
    }

    // Check if all units are villagers
    const allVillagers = units.every((unit) => unit.unitType === "villager");
    if (allVillagers) {
      // Villager actions
      this.addActionButton("build", "Build", "Construct a building", () =>
        this.uiManager.showBuildingMenu()
      );

      this.addActionButton("gather", "Gather", "Gather resources", () =>
        this.game.input.startGatherCommand()
      );

      this.addActionButton("repair", "Repair", "Repair damaged buildings", () =>
        this.game.input.startRepairCommand()
      );

      // Auto-assign toggle
      const isAutoAssigned = units[0].autoAssigned;
      const autoAssignColor = isAutoAssigned ? "#88FF88" : "#FFFFFF";

      this.addActionButton(
        "auto-assign",
        "Auto",
        "Toggle automatic resource gathering",
        () => this.issueCommand("toggleAutoAssign"),
        autoAssignColor
      );
    }

    // Military formation buttons (if multiple military units)
    const militaryUnits = units.filter(
      (unit) => unit.unitType !== "villager" && !unit.isHero
    );

    if (militaryUnits.length > 1) {
      // Add formation buttons
      this.addActionButton("formation-line", "Line", "Line formation", () =>
        this.issueCommand("setFormation", { formation: "line" })
      );

      this.addActionButton("formation-box", "Box", "Box formation", () =>
        this.issueCommand("setFormation", { formation: "box" })
      );

      this.addActionButton(
        "formation-scattered",
        "Scatter",
        "Scattered formation",
        () => this.issueCommand("setFormation", { formation: "scattered" })
      );

      // Stance buttons
      this.addActionButton(
        "stance-aggressive",
        "Aggressive",
        "Attack enemies on sight",
        () => this.issueCommand("setStance", { stance: "aggressive" })
      );

      this.addActionButton(
        "stance-defensive",
        "Defensive",
        "Attack when attacked",
        () => this.issueCommand("setStance", { stance: "defensive" })
      );

      this.addActionButton(
        "stance-passive",
        "Passive",
        "Never attack automatically",
        () => this.issueCommand("setStance", { stance: "passive" })
      );
    }

    // Add patrol action for military units
    if (militaryUnits.length > 0) {
      this.addActionButton(
        "patrol",
        "Patrol",
        "Patrol between two points",
        () => this.game.input.startPatrolCommand()
      );
    }

    // Hero abilities (if a single hero is selected)
    const singleHero = units.length === 1 && units[0].isHero;
    if (singleHero) {
      const hero = units[0];

      // Add hero abilities
      if (hero.abilities) {
        for (const ability of hero.abilities) {
          if (ability.level <= hero.level) {
            // Hero has unlocked this ability
            const cooldownPercent = hero.getAbilityCooldownPercent(ability.id);
            const isReady = cooldownPercent === 0;

            this.addActionButton(
              `ability-${ability.id}`,
              ability.name,
              ability.description,
              () => this.issueCommand("useAbility", { abilityId: ability.id }),
              isReady ? "#FFFFFF" : "#888888",
              cooldownPercent
            );
          }
        }
      }
    }

    // Group assignment buttons
    this.addGroupButtons();
  }

  /**
   * Add action button to panel
   * @param {string} icon - Button icon name
   * @param {string} label - Button label
   * @param {string} tooltip - Button tooltip
   * @param {Function} onClick - Click handler
   * @param {string} textColor - Text color (optional)
   * @param {number} cooldownPercent - Cooldown overlay percentage (optional)
   */
  addActionButton(
    icon,
    label,
    tooltip,
    onClick,
    textColor = "#FFFFFF",
    cooldownPercent = 0
  ) {
    const button = document.createElement("div");
    button.className = `action-button ${icon}`;
    button.style.width = "60px";
    button.style.height = "60px";
    button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
    button.style.borderRadius = "5px";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.cursor = "pointer";
    button.style.padding = "5px";
    button.style.boxSizing = "border-box";
    button.title = tooltip;

    // Button icon
    const iconElement = document.createElement("img");
    iconElement.src = `assets/ui/icons/${icon}.png`;
    iconElement.alt = icon;
    iconElement.style.width = "32px";
    iconElement.style.height = "32px";
    iconElement.style.marginBottom = "3px";

    // Button label
    const labelElement = document.createElement("div");
    labelElement.className = "button-label";
    labelElement.textContent = label;
    labelElement.style.fontSize = "11px";
    labelElement.style.color = textColor;

    button.appendChild(iconElement);
    button.appendChild(labelElement);

    // Add cooldown overlay if needed
    if (cooldownPercent > 0) {
      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.className = "cooldown-overlay";
      cooldownOverlay.style.position = "absolute";
      cooldownOverlay.style.bottom = "0";
      cooldownOverlay.style.left = "0";
      cooldownOverlay.style.width = "100%";
      cooldownOverlay.style.height = `${cooldownPercent}%`;
      cooldownOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
      cooldownOverlay.style.borderRadius = "0 0 5px 5px";
      cooldownOverlay.style.pointerEvents = "none";

      button.style.position = "relative";
      button.style.overflow = "hidden";
      button.appendChild(cooldownOverlay);
    }

    // Add event listeners
    button.addEventListener("click", onClick);

    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
    });

    this.actionButtons.appendChild(button);
  }

  /**
   * Add group assignment buttons
   */
  addGroupButtons() {
    const groupButtonsContainer = document.createElement("div");
    groupButtonsContainer.className = "group-buttons-container";
    groupButtonsContainer.style.display = "flex";
    groupButtonsContainer.style.flexDirection = "column";
    groupButtonsContainer.style.gap = "5px";
    groupButtonsContainer.style.marginLeft = "10px";

    const groupLabel = document.createElement("div");
    groupLabel.textContent = "Assign Group:";
    groupLabel.style.fontSize = "12px";
    groupLabel.style.marginBottom = "3px";

    const groupButtons = document.createElement("div");
    groupButtons.className = "group-buttons";
    groupButtons.style.display = "flex";
    groupButtons.style.gap = "5px";

    // Create buttons for groups 1-9
    for (let i = 1; i <= 9; i++) {
      const groupButton = document.createElement("div");
      groupButton.className = `group-button group-${i}`;
      groupButton.textContent = i;
      groupButton.style.width = "24px";
      groupButton.style.height = "24px";
      groupButton.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
      groupButton.style.borderRadius = "3px";
      groupButton.style.display = "flex";
      groupButton.style.alignItems = "center";
      groupButton.style.justifyContent = "center";
      groupButton.style.cursor = "pointer";
      groupButton.style.fontWeight = "bold";

      // Highlight if units are already in this group
      const groupIndex = i - 1; // Convert to 0-based
      if (this.selectedUnits.some((unit) => unit.group === groupIndex)) {
        groupButton.style.backgroundColor = "rgba(100, 150, 255, 0.6)";
      }

      // Add event listeners
      groupButton.addEventListener("click", () => {
        this.issueCommand("assignGroup", { group: groupIndex });

        // Update button appearance
        groupButtons.querySelectorAll(".group-button").forEach((button) => {
          button.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
        });
        groupButton.style.backgroundColor = "rgba(100, 150, 255, 0.6)";

        // Play sound
        this.game.audio.playSound("ui_group_assign");
      });

      groupButton.addEventListener("mouseover", () => {
        if (!this.selectedUnits.some((unit) => unit.group === groupIndex)) {
          groupButton.style.backgroundColor = "rgba(80, 80, 80, 0.8)";
        }
      });

      groupButton.addEventListener("mouseout", () => {
        if (!this.selectedUnits.some((unit) => unit.group === groupIndex)) {
          groupButton.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
        }
      });

      groupButtons.appendChild(groupButton);
    }

    groupButtonsContainer.appendChild(groupLabel);
    groupButtonsContainer.appendChild(groupButtons);

    this.actionButtons.appendChild(groupButtonsContainer);
  }

  /**
   * Issue a command to selected units
   * @param {string} command - Command name
   * @param {Object} params - Command parameters
   */
  issueCommand(command, params = {}) {
    if (this.selectedUnits.length === 0) return;

    const entityIds = this.selectedUnits.map((unit) => unit.id);

    // Issue command through entity manager
    this.game.entityManager.executeCommand(command, entityIds, params);

    // Play command sound
    switch (command) {
      case "stop":
        this.game.audio.playSound("unit_stop");
        break;
      case "toggleAutoAssign":
        this.game.audio.playSound("ui_toggle");
        // Update button appearance on next frame
        setTimeout(() => this.updateActionButtons(), 50);
        break;
      case "setFormation":
        this.game.audio.playSound("unit_formation");
        break;
      case "setStance":
        this.game.audio.playSound("unit_stance");
        break;
      case "useAbility":
        this.game.audio.playSound("hero_ability");
        // Update button appearance on next frame
        setTimeout(() => this.updateActionButtons(), 50);
        break;
      default:
        this.game.audio.playSound("unit_select");
    }
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Listen for selection changes
    this.game.events.on("selectionChanged", (data) => {
      if (data.type === "units") {
        this.updateSelection(data.entities);
      } else {
        // Non-unit selection - hide unit panel
        this.hide();
      }
    });

    // Listen for unit state changes that might affect the UI
    this.game.events.on("unitStateChanged", (data) => {
      // Update if the changed unit is in our selection
      if (this.selectedUnits.some((unit) => unit.id === data.unitId)) {
        // Refresh unit info and actions
        this.updateSelectionInfo();
        this.updateActionButtons();
      }
    });

    // Listen for ability cooldown updates
    this.game.events.on("abilityCooldownUpdate", (data) => {
      // Update if the unit is in our selection
      if (this.selectedUnits.some((unit) => unit.id === data.unitId)) {
        this.updateActionButtons();
      }
    });
  }

  /**
   * Show the unit panel
   */
  show() {
    this.container.style.display = "block";
    this.visible = true;
  }

  /**
   * Hide the unit panel
   */
  hide() {
    this.container.style.display = "none";
    this.visible = false;
    this.selectedUnits = [];
  }

  /**
   * Clean up the unit panel
   */
  cleanup() {
    // Remove event listeners

    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
