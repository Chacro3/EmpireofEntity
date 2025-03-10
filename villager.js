// Villager unit implementation for Empires of Eternity
import { createEntity } from "./entity.js";

// Create a new villager entity
export function createVillager(scene, config) {
  // Create base entity with villager defaults
  const villagerConfig = {
    type: "villager",
    hp: 50,
    maxHp: 50,
    attack: 3,
    defense: 1,
    speed: 80,
    ...config,
  };

  // Create the base entity
  const villager = createEntity(scene, villagerConfig);

  // Add villager-specific properties
  const villagerExtension = {
    // Resources the villager is carrying
    carrying: {
      type: null,
      amount: 0,
      maxAmount: 10,
    },

    // Gathering properties
    gatherTarget: null,
    gatherProgress: 0,
    gatherRate: 1, // Units per second

    // Building properties
    buildTarget: null,
    buildProgress: 0,
    buildRate: 0.5, // Units per second

    // Villager-specific update function
    update(delta) {
      // Call the base entity update
      const prototype = Object.getPrototypeOf(this);
      prototype.update.call(this, delta);

      // Villager-specific logic
      const deltaSeconds = delta / 1000;

      // If carrying resources, check if near drop-off point
      if (this.carrying.type && this.carrying.amount > 0) {
        // In a real implementation, we'd check if near a drop-off building
        // For now, just check if near center
        const centerX =
          Math.floor(window.CONFIG.MAP.DEFAULT_SIZE / 2) *
          window.CONFIG.MAP.TILE_SIZE;
        const centerY =
          Math.floor(window.CONFIG.MAP.DEFAULT_SIZE / 2) *
          window.CONFIG.MAP.TILE_SIZE;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          // Drop off resources
          this.dropOffResources();
        }
      }
    },

    // Override base gather method
    gatherResource(deltaSeconds) {
      if (!this.gatherTarget) return;

      // If carrying max resources, go drop them off
      if (this.carrying.amount >= this.carrying.maxAmount) {
        // Find dropoff point (center for now)
        const centerX =
          Math.floor(window.CONFIG.MAP.DEFAULT_SIZE / 2) *
          window.CONFIG.MAP.TILE_SIZE;
        const centerY =
          Math.floor(window.CONFIG.MAP.DEFAULT_SIZE / 2) *
          window.CONFIG.MAP.TILE_SIZE;

        this.moveTo(centerX, centerY);
        return;
      }

      // Otherwise, gather from the target
      this.gatherProgress += this.gatherRate * deltaSeconds;

      if (this.gatherProgress >= 1) {
        // Gather a unit of resource
        this.gatherProgress = 0;

        if (!this.carrying.type) {
          this.carrying.type = this.gatherTarget.resource;
        }

        if (this.carrying.type === this.gatherTarget.resource) {
          this.carrying.amount++;

          // Create floating text to show gathering
          const resourceText = this.scene.add.text(this.x, this.y - 20, "+1", {
            fontSize: "14px",
            fill: getResourceColor(this.carrying.type),
            stroke: "#000000",
            strokeThickness: 2,
          });

          // Animate resource text
          this.scene.tweens.add({
            targets: resourceText,
            y: this.y - 30,
            alpha: 0,
            duration: 600,
            onComplete: () => {
              resourceText.destroy();
            },
          });

          console.log(
            `Gathered ${this.carrying.type}, now carrying ${this.carrying.amount}`
          );
        }
      }
    },

    // Drop off gathered resources
    dropOffResources() {
      if (!this.carrying.type || this.carrying.amount <= 0) return;

      // Add resources to player's stockpile
      this.scene.gameData.resources[this.carrying.type] += this.carrying.amount;

      // Create text to show resource deposit
      const depositText = this.scene.add.text(
        this.x,
        this.y - 20,
        `+${this.carrying.amount} ${this.carrying.type}`,
        {
          fontSize: "14px",
          fill: getResourceColor(this.carrying.type),
          stroke: "#000000",
          strokeThickness: 2,
        }
      );

      // Animate deposit text
      this.scene.tweens.add({
        targets: depositText,
        y: this.y - 40,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          depositText.destroy();
        },
      });

      console.log(`Dropped off ${this.carrying.amount} ${this.carrying.type}`);

      // Reset carrying
      this.carrying.type = null;
      this.carrying.amount = 0;

      // If we have a gather target, go back to it
      if (this.gatherTarget) {
        this.moveTo(this.gatherTarget.x, this.gatherTarget.y);
      }
    },

    // Start gathering from a resource
    startGathering(resourceTile) {
      this.gatherTarget = resourceTile;
      this.currentAction = "gathering";
      console.log(`Villager started gathering ${resourceTile.resource}`);
    },

    // Start building a structure
    startBuilding(buildingType, x, y) {
      // Check if we have enough resources
      const buildingCost = getBuildingCost(buildingType);
      const resources = this.scene.gameData.resources;

      // Check if we can afford it
      let canBuild = true;
      for (const resource in buildingCost) {
        if (resources[resource] < buildingCost[resource]) {
          canBuild = false;
          console.log(`Not enough ${resource} to build ${buildingType}`);
          break;
        }
      }

      if (!canBuild) return false;

      // Deduct resources
      for (const resource in buildingCost) {
        resources[resource] -= buildingCost[resource];
      }

      // Create building placeholder
      const building = {
        type: buildingType,
        x: x,
        y: y,
        progress: 0,
        maxProgress: getBuildingTime(buildingType),
        visual: this.scene.add.rectangle(x, y, 48, 48, 0x808080, 0.5),
      };

      this.buildTarget = building;
      this.currentAction = "building";

      // Move to building site
      this.moveTo(x, y);

      console.log(`Villager started building ${buildingType}`);
      return true;
    },
  };

  // Merge the extension with the base villager
  Object.assign(villager, villagerExtension);

  return villager;
}

// Helper functions

// Get resource color
function getResourceColor(resourceType) {
  const colors = {
    wood: "#8B4513",
    food: "#32CD32",
    gold: "#FFD700",
    stone: "#A9A9A9",
    iron: "#C0C0C0",
  };

  return colors[resourceType] || "#FFFFFF";
}

// Get building cost based on type
function getBuildingCost(buildingType) {
  const costs = {
    house: { wood: 30 },
    barracks: { wood: 100, stone: 50 },
    wall: { stone: 20 },
    tower: { stone: 100, wood: 50 },
  };

  return costs[buildingType] || { wood: 50 };
}

// Get building time based on type
function getBuildingTime(buildingType) {
  const times = {
    house: 10,
    barracks: 20,
    wall: 5,
    tower: 15,
  };

  return times[buildingType] || 10;
}
