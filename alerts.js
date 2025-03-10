/**
 * Empires of Eternity - Alert System
 * Manages game alerts and notifications for important events
 */

class AlertSystem {
  /**
   * Create a new alert system
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // Alert queues for each civilization
    this.alerts = {
      SOLARI: [],
      LUNARI: [],
    };

    // Alert sounds and visuals
    this.alertTypes = {
      attack: {
        sound: "alert_attack",
        icon: "⚔️",
        color: "#e74c3c",
        priority: 1, // Higher priority
        duration: CONFIG.UI.ALERT_DURATION,
      },
      lowResource: {
        sound: "alert_resource",
        icon: "⚠️",
        color: "#f39c12",
        priority: 2,
        duration: CONFIG.UI.ALERT_DURATION,
      },
      resourceDepleted: {
        sound: "alert_resource",
        icon: "⬇️",
        color: "#f39c12",
        priority: 2,
        duration: CONFIG.UI.ALERT_DURATION,
      },
      construction: {
        sound: "alert_construction",
        icon: "🏗️",
        color: "#2ecc71",
        priority: 3,
        duration: CONFIG.UI.ALERT_DURATION,
      },
      research: {
        sound: "alert_research",
        icon: "📚",
        color: "#3498db",
        priority: 3,
        duration: CONFIG.UI.ALERT_DURATION,
      },
      unitReady: {
        sound: "alert_unit",
        icon: "👤",
        color: "#9b59b6",
        priority: 3,
        duration: CONFIG.UI.ALERT_DURATION,
      },
      info: {
        sound: "alert_info",
        icon: "ℹ️",
        color: "#3498db",
        priority: 4,
        duration: CONFIG.UI.ALERT_DURATION,
      },
    };

    // Map ping positions (for attacks, etc.)
    this.mapPings = [];

    // Minimap ping duration in ms
    this.pingDuration = 3000;

    Utils.log("AlertSystem created");
  }

  /**
   * Initialize the alert system
   */
  init() {
    // Clear existing alerts
    this.alerts = {
      SOLARI: [],
      LUNARI: [],
    };

    // Clear map pings
    this.mapPings = [];

    Utils.log("AlertSystem initialized");
    return this;
  }

  /**
   * Update alert system
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    // Update map pings
    this.updateMapPings(deltaTime);

    // Remove expired alerts
    this.cleanupAlerts();
  }

  /**
   * Update map pings
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateMapPings(deltaTime) {
    const currentTime = Date.now();

    // Remove expired pings
    this.mapPings = this.mapPings.filter((ping) => {
      const elapsed = currentTime - ping.created;
      return elapsed < this.pingDuration;
    });
  }

  /**
   * Clean up expired alerts
   */
  cleanupAlerts() {
    const currentTime = Date.now();

    for (const civ in this.alerts) {
      this.alerts[civ] = this.alerts[civ].filter((alert) => {
        const elapsed = currentTime - alert.created;
        return elapsed < alert.duration;
      });
    }
  }

  /**
   * Add an alert
   * @param {string} message - Alert message
   * @param {string} type - Alert type
   * @param {string} civ - Civilization key
   * @param {Object} data - Additional alert data
   */
  addAlert(message, type = "info", civ = null, data = {}) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    // Get alert type configuration
    const alertTypeConfig = this.alertTypes[type] || this.alertTypes.info;

    // Create alert object
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message: message,
      type: type,
      icon: alertTypeConfig.icon,
      color: alertTypeConfig.color,
      priority: alertTypeConfig.priority,
      duration: alertTypeConfig.duration * 1000, // Convert to ms
      created: Date.now(),
      read: false,
      data: data,
    };

    // Add to appropriate queue
    this.alerts[civ].push(alert);

    // Sort alerts by priority
    this.alerts[civ].sort((a, b) => a.priority - b.priority);

    // Limit queue size
    if (this.alerts[civ].length > 10) {
      this.alerts[civ].pop(); // Remove oldest (lower priority)
    }

    // Play sound
    const audio = this.game.getSystem("audio");
    if (audio && alertTypeConfig.sound) {
      audio.play(alertTypeConfig.sound);
    }

    // If this is a player alert, notify UI
    if (civ === this.game.state.selectedCivilization) {
      const ui = this.game.getSystem("uiManager");
      if (ui && ui.components.alertDisplay) {
        ui.components.alertDisplay.add(message, type, civ);
      }
    }

    // Special handling for attacks - add map ping
    if (type === "attack" && data.position) {
      this.addMapPing(data.position.x, data.position.y, "#e74c3c");
    }

    Utils.log(`Alert added: ${message} (${type})`);
  }

  /**
   * Add a map ping
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - Ping color
   */
  addMapPing(x, y, color = "#FFFFFF") {
    this.mapPings.push({
      x: x,
      y: y,
      color: color,
      created: Date.now(),
      size: 1.0, // Initial size, will be animated
    });
  }

  /**
   * Get active alerts for a civilization
   * @param {string} civ - Civilization key
   * @returns {Array} Active alerts
   */
  getAlerts(civ) {
    return this.alerts[civ];
  }

  /**
   * Get map pings for rendering
   * @returns {Array} Active map pings
   */
  getMapPings() {
    return this.mapPings;
  }

  /**
   * Mark an alert as read
   * @param {string} alertId - Alert ID
   * @param {string} civ - Civilization key
   */
  markAsRead(alertId, civ) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    const alert = this.alerts[civ].find((a) => a.id === alertId);

    if (alert) {
      alert.read = true;
    }
  }

  /**
   * Clear all alerts for a civilization
   * @param {string} civ - Civilization key
   */
  clearAlerts(civ) {
    if (!civ) {
      civ = this.game.state.selectedCivilization;
    }

    this.alerts[civ] = [];
  }

  /**
   * Create an attack alert
   * @param {Entity} target - Entity being attacked
   * @param {Entity} attacker - Attacking entity
   */
  createAttackAlert(target, attacker) {
    // Only alert if target belongs to player
    if (!target || !target.owner) return;

    let message = "";
    let position = { x: target.x, y: target.y };

    // Different message based on entity type
    switch (target.type) {
      case "villager":
        message = "Villager under attack!";
        break;

      case "unit":
      case "hero":
        message = `${target.unitType} under attack!`;
        break;

      case "building":
        message = `${target.buildingType} under attack!`;
        break;

      case "wall":
        if (target.wallType === "gate") {
          message = "Gate under attack!";
        } else {
          message = "Wall under attack!";
        }
        break;

      default:
        message = "Unit under attack!";
    }

    this.addAlert(message, "attack", target.owner, {
      position,
      target,
      attacker,
    });
  }

  /**
   * Create a wall breach alert
   * @param {Entity} wall - Wall entity
   * @param {Entity} breacher - Entity that breached the wall
   */
  createWallBreachAlert(wall, breacher) {
    if (!wall || !wall.owner) return;

    const message =
      wall.wallType === "gate" ? "Gate breached!" : "Wall breached!";
    const position = { x: wall.x, y: wall.y };

    this.addAlert(message, "attack", wall.owner, { position, wall, breacher });
  }

  /**
   * Create a resource depletion alert
   * @param {string} resourceType - Type of resource
   * @param {Object} position - Position {x, y}
   * @param {string} civ - Civilization key
   */
  createResourceDepletionAlert(resourceType, position, civ) {
    const message = `${
      resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
    } depleted`;

    this.addAlert(message, "resourceDepleted", civ, { position, resourceType });
  }

  /**
   * Create a low resource alert
   * @param {string} resourceType - Type of resource
   * @param {number} amount - Current amount
   * @param {string} civ - Civilization key
   */
  createLowResourceAlert(resourceType, amount, civ) {
    const message = `Low ${resourceType}: ${amount}`;

    this.addAlert(message, "lowResource", civ, { resourceType, amount });
  }

  /**
   * Create a construction complete alert
   * @param {Entity} building - Completed building
   */
  createConstructionCompleteAlert(building) {
    if (!building || !building.owner) return;

    let buildingName = building.buildingType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const message = `${buildingName} construction complete`;
    const position = { x: building.x, y: building.y };

    this.addAlert(message, "construction", building.owner, {
      position,
      building,
    });
  }

  /**
   * Create a research complete alert
   * @param {Object} tech - Completed technology
   * @param {string} civ - Civilization key
   */
  createResearchCompleteAlert(tech, civ) {
    const message = `Research complete: ${tech.name}`;

    this.addAlert(message, "research", civ, { tech });
  }

  /**
   * Create a unit ready alert
   * @param {Entity} unit - Ready unit
   * @param {Entity} building - Building that produced the unit
   */
  createUnitReadyAlert(unit, building) {
    if (!unit || !unit.owner) return;

    let unitName = unit.unitType
      ? unit.unitType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Unit";
    const message = `${unitName} ready`;
    const position = { x: unit.x, y: unit.y };

    this.addAlert(message, "unitReady", unit.owner, {
      position,
      unit,
      building,
    });
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = AlertSystem;
} else {
  window.AlertSystem = AlertSystem;
}
