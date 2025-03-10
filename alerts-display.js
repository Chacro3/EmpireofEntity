/**
 * Alerts Display Component
 *
 * Displays alert notifications for important game events like
 * attacks, resource depletions, building completions, etc.
 */

import { config } from "../config.js";

export class AlertsDisplay {
  /**
   * Create a new alerts display component
   * @param {UIManager} uiManager - The UI manager instance
   * @param {Game} game - Reference to the main game object
   */
  constructor(uiManager, game) {
    this.uiManager = uiManager;
    this.game = game;
    this.alerts = [];
    this.maxAlerts = 5; // Maximum number of visible alerts
    this.alertLifetime = 5000; // How long alerts stay visible (ms)

    // Create container element
    this.container = document.createElement("div");
    this.container.className = "alerts-container";
    this.container.style.position = "absolute";
    this.container.style.top = "100px";
    this.container.style.right = "10px";
    this.container.style.width = "300px";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.gap = "5px";
    this.container.style.zIndex = "100";

    // Add to DOM
    document.getElementById("game-ui").appendChild(this.container);

    // Register event listeners
    this.registerEvents();
  }

  /**
   * Register event listeners
   */
  registerEvents() {
    // Listen for alert events
    this.game.events.on("alertCreated", (alert) => {
      this.addAlert(alert);
    });

    // Listen for game speed changes to adjust animation durations
    this.game.events.on("gameSpeedChanged", (speed) => {
      // Adjust animation durations based on game speed
      const speedFactor = config.GAME_SPEEDS[speed].factor;
      this.container.style.setProperty(
        "--alert-animation-duration",
        `${Math.max(0.2, 0.5 / speedFactor)}s`
      );
    });
  }

  /**
   * Add a new alert
   * @param {Object} alert - Alert data
   */
  addAlert(alert) {
    // Create alert element
    const alertElement = this.createAlertElement(alert);

    // Add to container at the top
    if (this.container.firstChild) {
      this.container.insertBefore(alertElement, this.container.firstChild);
    } else {
      this.container.appendChild(alertElement);
    }

    // Store alert data
    this.alerts.push({
      id: alert.id,
      element: alertElement,
      timestamp: Date.now(),
      position: alert.position,
    });

    // Play alert sound
    this.playAlertSound(alert);

    // Handle alert lifetime
    setTimeout(() => {
      this.removeAlert(alert.id);
    }, this.alertLifetime);

    // Check if we have too many alerts
    this.pruneAlerts();
  }

  /**
   * Create an alert element
   * @param {Object} alert - Alert data
   * @returns {HTMLElement} Alert element
   */
  createAlertElement(alert) {
    const alertElement = document.createElement("div");
    alertElement.className = `alert-item alert-${alert.type}`;
    alertElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    alertElement.style.color = "#fff";
    alertElement.style.borderRadius = "5px";
    alertElement.style.padding = "10px";
    alertElement.style.display = "flex";
    alertElement.style.alignItems = "center";
    alertElement.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";
    alertElement.style.cursor = "pointer";
    alertElement.style.transition = "opacity 0.3s, transform 0.3s";
    alertElement.style.opacity = "0";
    alertElement.style.transform = "translateX(50px)";

    // Add border and color based on alert type
    switch (alert.type) {
      case "attack":
        alertElement.style.borderLeft = "4px solid #FF4136"; // Red
        break;
      case "resource":
        alertElement.style.borderLeft = "4px solid #FFDC00"; // Yellow
        break;
      case "building":
        alertElement.style.borderLeft = "4px solid #2ECC40"; // Green
        break;
      case "research":
        alertElement.style.borderLeft = "4px solid #0074D9"; // Blue
        break;
      case "wonder":
        alertElement.style.borderLeft = "4px solid #B10DC9"; // Purple
        break;
      case "victory":
        alertElement.style.borderLeft = "4px solid #F012BE"; // Pink
        break;
      case "defeat":
        alertElement.style.borderLeft = "4px solid #111111"; // Black
        break;
      default:
        alertElement.style.borderLeft = "4px solid #AAAAAA"; // Grey
    }

    // Add icon
    const iconElement = document.createElement("div");
    iconElement.className = "alert-icon";
    iconElement.style.width = "24px";
    iconElement.style.height = "24px";
    iconElement.style.marginRight = "10px";
    iconElement.style.backgroundSize = "contain";
    iconElement.style.backgroundRepeat = "no-repeat";
    iconElement.style.backgroundPosition = "center";
    iconElement.style.flexShrink = "0";

    // Set icon based on alert type
    iconElement.style.backgroundImage = `url('assets/ui/icons/alert_${alert.type}.png')`;

    // Add text
    const textElement = document.createElement("div");
    textElement.className = "alert-text";
    textElement.style.flex = "1";
    textElement.textContent = alert.message;

    // Add close button
    const closeButton = document.createElement("div");
    closeButton.className = "alert-close";
    closeButton.style.width = "16px";
    closeButton.style.height = "16px";
    closeButton.style.marginLeft = "10px";
    closeButton.style.cursor = "pointer";
    closeButton.style.color = "#999";
    closeButton.style.fontSize = "16px";
    closeButton.style.lineHeight = "16px";
    closeButton.style.textAlign = "center";
    closeButton.innerHTML = "&times;";

    closeButton.addEventListener("mouseover", () => {
      closeButton.style.color = "#fff";
    });

    closeButton.addEventListener("mouseout", () => {
      closeButton.style.color = "#999";
    });

    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeAlert(alert.id);
    });

    // Add to alert element
    alertElement.appendChild(iconElement);
    alertElement.appendChild(textElement);
    alertElement.appendChild(closeButton);

    // Add click handler to jump to location if available
    if (alert.position) {
      alertElement.addEventListener("click", () => {
        this.game.centerViewOnPoint(alert.position.x, alert.position.y);

        // Play sound
        this.game.audio.playSound("ui_click");
      });

      alertElement.style.cursor = "pointer";
    } else {
      alertElement.style.cursor = "default";
    }

    // Animate in
    setTimeout(() => {
      alertElement.style.opacity = "1";
      alertElement.style.transform = "translateX(0)";
    }, 10);

    return alertElement;
  }

  /**
   * Remove an alert
   * @param {string} alertId - Alert ID to remove
   */
  removeAlert(alertId) {
    const alertIndex = this.alerts.findIndex((a) => a.id === alertId);

    if (alertIndex === -1) return;

    const alert = this.alerts[alertIndex];
    const element = alert.element;

    // Animate out
    element.style.opacity = "0";
    element.style.transform = "translateX(50px)";

    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);

    // Remove from alerts array
    this.alerts.splice(alertIndex, 1);
  }

  /**
   * Play appropriate sound for the alert
   * @param {Object} alert - Alert data
   */
  playAlertSound(alert) {
    switch (alert.type) {
      case "attack":
        this.game.audio.playSound("alert_attack");
        break;
      case "resource":
        this.game.audio.playSound("alert_resource");
        break;
      case "building":
        this.game.audio.playSound("alert_building");
        break;
      case "research":
        this.game.audio.playSound("alert_research");
        break;
      case "wonder":
        this.game.audio.playSound("alert_wonder");
        break;
      case "victory":
        this.game.audio.playSound("victory");
        break;
      case "defeat":
        this.game.audio.playSound("defeat");
        break;
      default:
        this.game.audio.playSound("alert_generic");
    }
  }

  /**
   * Remove excess alerts if we have too many
   */
  pruneAlerts() {
    if (this.alerts.length > this.maxAlerts) {
      // Remove oldest alerts
      const excessCount = this.alerts.length - this.maxAlerts;

      for (let i = 0; i < excessCount; i++) {
        const oldestAlert = this.alerts.reduce((oldest, current) => {
          return current.timestamp < oldest.timestamp ? current : oldest;
        }, this.alerts[0]);

        this.removeAlert(oldestAlert.id);
      }
    }
  }

  /**
   * Update alert lifetimes and remove expired ones
   */
  update() {
    const currentTime = Date.now();

    // Check for expired alerts
    this.alerts.forEach((alert) => {
      const age = currentTime - alert.timestamp;

      if (age > this.alertLifetime) {
        this.removeAlert(alert.id);
      }
    });
  }

  /**
   * Clean up the alerts display
   */
  cleanup() {
    // Remove from DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
