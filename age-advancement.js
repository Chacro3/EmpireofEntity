/**
 * @fileoverview Age advancement system for Empires of Eternity
 * Handles progression through game ages, unlocking new buildings, units and technologies.
 */

import { config } from "../config.js";

/**
 * AgeSystem manages player advancement through game ages
 */
export class AgeSystem {
  /**
   * Create a new age advancement system
   * @param {Object} game - Reference to the main game object
   */
  constructor(game) {
    this.game = game;

    // Track current age for each player
    this.playerAges = {};

    // Track age advancement progress
    this.ageProgress = {};

    // Age definitions with names, requirements, and unlocks
    this.ages = {
      0: {
        id: 0,
        name: "Stone Age",
        description:
          "The beginning of civilization. Focus on gathering resources and basic shelter.",
        icon: "age_stone",
        unlocks: {
          buildings: ["towncenter", "house", "granary", "woodcamp", "quarry"],
          units: ["villager", "scout"],
          technologies: [
            "basic_tools",
            "basic_hunting",
            "basic_farming",
            "basic_construction",
            "primitive_weapons",
          ],
        },
      },
      1: {
        id: 1,
        name: "Bronze Age",
        description:
          "The dawn of metallurgy. Militaries form and walls protect settlements.",
        icon: "age_bronze",
        requirements: {
          buildings: ["towncenter"],
          resources: {
            food: 500,
            wood: 300,
            stone: 100,
          },
          time: 60000, // 60 seconds
        },
        unlocks: {
          buildings: [
            "barracks",
            "wall",
            "gate",
            "marketplace",
            "blacksmith",
            "tower",
          ],
          units: ["swordsman", "spearman", "slinger"],
          technologies: [
            "bronze_weapons",
            "masonry",
            "wheel",
            "armor_crafting",
            "irrigation",
          ],
        },
      },
      2: {
        id: 2,
        name: "Iron Age",
        description:
          "Advanced metallurgy and engineering. Warfare becomes more sophisticated.",
        icon: "age_iron",
        requirements: {
          buildings: ["towncenter", "barracks", "blacksmith"],
          resources: {
            food: 800,
            wood: 500,
            gold: 200,
            stone: 200,
          },
          time: 90000, // 90 seconds
        },
        unlocks: {
          buildings: [
            "stable",
            "archeryrange",
            "storehouse",
            "temple",
            "siegeworkshop",
          ],
          units: ["archer", "cavalry", "catapult", "priest"],
          technologies: [
            "iron_weapons",
            "writing",
            "mathematics",
            "horsemanship",
            "architecture",
          ],
        },
      },
      3: {
        id: 3,
        name: "Imperial Age",
        description:
          "The height of classical civilization. Advanced military units and wonders.",
        icon: "age_imperial",
        requirements: {
          buildings: ["towncenter", "temple", "marketplace"],
          resources: {
            food: 1200,
            wood: 800,
            gold: 500,
            stone: 500,
            iron: 300,
          },
          time: 120000, // 120 seconds
        },
        unlocks: {
          buildings: [
            "capitol",
            "fortress",
            "university",
            "harbor",
            "wondersite",
          ],
          units: [
            "swordmaster",
            "heavycavalry",
            "trebuchet",
            "warmachine",
            "hero",
          ],
          technologies: [
            "steel_weapons",
            "engineering",
            "medicine",
            "tactics",
            "philosophy",
          ],
        },
      },
      4: {
        id: 4,
        name: "Eternal Age",
        description:
          "The pinnacle of civilization. Legendary units and ultimate wonders.",
        icon: "age_eternal",
        requirements: {
          buildings: ["towncenter", "capitol", "university", "wondersite"],
          resources: {
            food: 2000,
            wood: 1500,
            gold: 1000,
            stone: 1000,
            iron: 800,
          },
          time: 180000, // 180 seconds
        },
        unlocks: {
          buildings: [
            "greatwonder",
            "colosseum",
            "divinetemple",
            "grandlibrary",
          ],
          units: ["champion", "legendarywarrior", "siegetitan", "demigod"],
          technologies: [
            "divine_metallurgy",
            "ascension",
            "legendary_warfare",
            "eternal_wisdom",
            "transcendence",
          ],
        },
        // Special age bonuses
        bonuses: {
          resourceGatherRate: 0.2, // +20% gather rate
          unitHP: 0.15, // +15% unit HP
          buildingHP: 0.2, // +20% building HP
          researchSpeed: 0.25, // +25% research speed
        },
      },
    };

    // Civilization-specific age features
    this.civAgeModifiers = {
      solari: {
        // Solari advance through ages 10% faster
        advancementTimeModifier: 0.9,
        // Solari get unique age bonuses
        ageBonuses: {
          1: {
            // Bronze Age
            unitAttack: 0.1, // +10% attack for Bronze Age units
          },
          3: {
            // Imperial Age
            buildingHP: 0.15, // +15% building HP in Imperial
          },
        },
        // Custom age names
        ageNames: {
          0: "Dawn Age",
          4: "Solar Ascendance",
        },
      },
      lunari: {
        // Lunari have reduced resource requirements for ages
        resourceRequirementModifier: 0.9, // 10% discount
        // Lunari get unique age bonuses
        ageBonuses: {
          2: {
            // Iron Age
            unitSpeed: 0.1, // +10% movement speed in Iron Age
          },
          4: {
            // Eternal Age
            resourceGatherRate: 0.3, // +30% resource gather rate in Eternal
          },
        },
        // Custom age names
        ageNames: {
          0: "Twilight Age",
          4: "Lunar Transcendence",
        },
      },
    };
  }

  /**
   * Initialize the age system
   */
  init() {
    console.log("Age advancement system initialized");

    // Set all players to starting age
    for (let i = 0; i < config.MAX_PLAYERS; i++) {
      this.playerAges[i] = 0; // Stone Age
      this.ageProgress[i] = {
        currentlyAdvancing: false,
        targetAge: 0,
        progress: 0,
        startTime: 0,
        requiredTime: 0,
      };
    }
  }

  /**
   * Update age advancement progress
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Update advancement progress for each player
    for (let playerId = 0; playerId < config.MAX_PLAYERS; playerId++) {
      const progress = this.ageProgress[playerId];

      if (progress.currentlyAdvancing) {
        // Calculate elapsed time
        const elapsedTime = this.game.gameTime - progress.startTime;

        // Update progress percentage
        progress.progress = Math.min(1.0, elapsedTime / progress.requiredTime);

        // Check if advancement is complete
        if (progress.progress >= 1.0) {
          this.completeAgeAdvancement(playerId, progress.targetAge);
        }
      }
    }
  }

  /**
   * Begin advancing to the next age
   * @param {number} playerId - ID of the player
   * @returns {boolean} True if advancement started successfully
   */
  startAdvancingAge(playerId) {
    const currentAge = this.getPlayerAge(playerId);
    const nextAge = currentAge + 1;

    // Check if next age exists
    if (!this.ages[nextAge]) {
      console.log(
        `Player ${playerId} is already at maximum age (${currentAge})`
      );
      return false;
    }

    // Check if already advancing
    if (this.ageProgress[playerId].currentlyAdvancing) {
      console.log(
        `Player ${playerId} is already advancing to age ${this.ageProgress[playerId].targetAge}`
      );
      return false;
    }

    // Check requirements
    if (!this.meetsAgeRequirements(playerId, nextAge)) {
      console.log(
        `Player ${playerId} does not meet requirements for age ${nextAge}`
      );
      return false;
    }

    // Deduct resources
    if (!this.deductAgeResources(playerId, nextAge)) {
      console.log(`Player ${playerId} cannot afford age ${nextAge}`);
      return false;
    }

    // Start advancement
    const nextAgeData = this.ages[nextAge];
    let requiredTime = nextAgeData.requirements.time;

    // Apply civilization modifiers if applicable
    const playerCiv = this.game.players[playerId].civilization;
    if (
      playerCiv &&
      this.civAgeModifiers[playerCiv] &&
      this.civAgeModifiers[playerCiv].advancementTimeModifier
    ) {
      requiredTime *= this.civAgeModifiers[playerCiv].advancementTimeModifier;
    }

    this.ageProgress[playerId] = {
      currentlyAdvancing: true,
      targetAge: nextAge,
      progress: 0,
      startTime: this.game.gameTime,
      requiredTime: requiredTime,
    };

    console.log(`Player ${playerId} is advancing to age ${nextAge}`);

    // Notify UI to show advancement progress
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.showAgeAdvancementProgress(nextAge, requiredTime);
    }

    // Play advancement sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("age_advancement_start", {
        global: true,
      });
    }

    return true;
  }

  /**
   * Cancel the current age advancement
   * @param {number} playerId - ID of the player
   * @returns {boolean} True if advancement was canceled
   */
  cancelAgeAdvancement(playerId) {
    if (!this.ageProgress[playerId].currentlyAdvancing) {
      return false;
    }

    // Refund resources (partial)
    const targetAge = this.ageProgress[playerId].targetAge;
    const progress = this.ageProgress[playerId].progress;
    const refundPercentage = 0.75; // Refund 75% of resources

    const requiredResources = this.getAgeRequirementResources(
      playerId,
      targetAge
    );
    const refundResources = {};

    for (const resource in requiredResources) {
      refundResources[resource] = Math.floor(
        requiredResources[resource] * refundPercentage
      );
    }

    this.game.resourceManager.addResources(playerId, refundResources);

    // Reset advancement progress
    this.ageProgress[playerId] = {
      currentlyAdvancing: false,
      targetAge: 0,
      progress: 0,
      startTime: 0,
      requiredTime: 0,
    };

    console.log(`Player ${playerId} canceled advancement to age ${targetAge}`);

    // Notify UI
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.hideAgeAdvancementProgress();
    }

    return true;
  }

  /**
   * Complete age advancement for a player
   * @param {number} playerId - ID of the player
   * @param {number} newAge - New age level
   */
  completeAgeAdvancement(playerId, newAge) {
    // Update player age
    this.playerAges[playerId] = newAge;

    // Reset advancement progress
    this.ageProgress[playerId] = {
      currentlyAdvancing: false,
      targetAge: 0,
      progress: 0,
      startTime: 0,
      requiredTime: 0,
    };

    // Get age data
    const ageData = this.ages[newAge];

    // Apply age-specific bonuses
    this.applyAgeBonuses(playerId, newAge);

    // Update building and unit availability
    this.updateAvailableEntities(playerId, newAge);

    console.log(`Player ${playerId} advanced to ${ageData.name}`);

    // Notify UI
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.showAgeAdvancementComplete(newAge, ageData);
    }

    // Play advancement complete sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound("age_advancement_complete", {
        global: true,
      });
    }

    // Notify other systems
    this.game.entityManager.updateEntityAppearance(playerId, newAge);

    // Add alert
    if (this.game.alertSystem) {
      this.game.alertSystem.addAlert({
        type: "age_advancement",
        playerId: playerId,
        message: `Player ${playerId} has reached the ${ageData.name}!`,
        priority: "high",
      });
    }
  }

  /**
   * Check if a player meets all requirements for an age
   * @param {number} playerId - ID of the player
   * @param {number} age - Age to check requirements for
   * @returns {boolean} True if all requirements are met
   */
  meetsAgeRequirements(playerId, age) {
    const ageData = this.ages[age];

    if (!ageData || !ageData.requirements) {
      return false;
    }

    // Check required buildings
    if (ageData.requirements.buildings) {
      for (const buildingType of ageData.requirements.buildings) {
        const hasBuilding = this.game.entityManager.hasEntityOfType(
          playerId,
          "building",
          buildingType
        );

        if (!hasBuilding) {
          return false;
        }
      }
    }

    // Check required resources
    if (ageData.requirements.resources) {
      for (const resource in ageData.requirements.resources) {
        const requiredAmount = this.getModifiedResourceRequirement(
          playerId,
          resource,
          ageData.requirements.resources[resource],
          age
        );

        const playerAmount = this.game.resourceManager.getResource(
          playerId,
          resource
        );

        if (playerAmount < requiredAmount) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get modified resource requirement based on civilization bonuses
   * @param {number} playerId - ID of the player
   * @param {string} resource - Resource type
   * @param {number} baseAmount - Base required amount
   * @param {number} age - Target age
   * @returns {number} Modified resource requirement
   */
  getModifiedResourceRequirement(playerId, resource, baseAmount, age) {
    let modifier = 1.0;

    // Apply civilization modifiers
    const playerCiv = this.game.players[playerId].civilization;

    if (
      playerCiv &&
      this.civAgeModifiers[playerCiv] &&
      this.civAgeModifiers[playerCiv].resourceRequirementModifier
    ) {
      modifier *= this.civAgeModifiers[playerCiv].resourceRequirementModifier;
    }

    // Apply tech modifiers if applicable
    const techModifier = this.game.techManager?.getAgeAdvancementDiscount(
      playerId,
      resource
    );
    if (techModifier) {
      modifier *= 1 - techModifier;
    }

    return Math.floor(baseAmount * modifier);
  }

  /**
   * Get resource requirements for an age
   * @param {number} playerId - ID of the player
   * @param {number} age - Age to get requirements for
   * @returns {Object} Resource requirements
   */
  getAgeRequirementResources(playerId, age) {
    const ageData = this.ages[age];

    if (!ageData || !ageData.requirements || !ageData.requirements.resources) {
      return {};
    }

    const result = {};

    for (const resource in ageData.requirements.resources) {
      result[resource] = this.getModifiedResourceRequirement(
        playerId,
        resource,
        ageData.requirements.resources[resource],
        age
      );
    }

    return result;
  }

  /**
   * Deduct resources for age advancement
   * @param {number} playerId - ID of the player
   * @param {number} age - Age to deduct resources for
   * @returns {boolean} True if resources were successfully deducted
   */
  deductAgeResources(playerId, age) {
    const resources = this.getAgeRequirementResources(playerId, age);

    // Check if player has enough resources
    for (const resource in resources) {
      if (
        this.game.resourceManager.getResource(playerId, resource) <
        resources[resource]
      ) {
        return false;
      }
    }

    // Deduct resources
    for (const resource in resources) {
      this.game.resourceManager.deductResource(
        playerId,
        resource,
        resources[resource]
      );
    }

    return true;
  }

  /**
   * Apply age-specific bonuses to player
   * @param {number} playerId - ID of the player
   * @param {number} age - Age level
   */
  applyAgeBonuses(playerId, age) {
    // Apply standard age bonuses
    const ageData = this.ages[age];

    if (ageData.bonuses) {
      this.applyBonusEffects(playerId, ageData.bonuses);
    }

    // Apply civilization-specific age bonuses
    const playerCiv = this.game.players[playerId].civilization;

    if (
      playerCiv &&
      this.civAgeModifiers[playerCiv] &&
      this.civAgeModifiers[playerCiv].ageBonuses &&
      this.civAgeModifiers[playerCiv].ageBonuses[age]
    ) {
      this.applyBonusEffects(
        playerId,
        this.civAgeModifiers[playerCiv].ageBonuses[age]
      );
    }
  }

  /**
   * Apply bonus effects to player entities
   * @param {number} playerId - ID of the player
   * @param {Object} bonuses - Bonus effects to apply
   */
  applyBonusEffects(playerId, bonuses) {
    // Store bonuses in player data
    if (!this.game.players[playerId].ageBonuses) {
      this.game.players[playerId].ageBonuses = {};
    }

    // Apply and store each bonus
    for (const bonusType in bonuses) {
      const bonusValue = bonuses[bonusType];
      this.game.players[playerId].ageBonuses[bonusType] =
        (this.game.players[playerId].ageBonuses[bonusType] || 0) + bonusValue;

      // Apply bonus to existing entities
      switch (bonusType) {
        case "resourceGatherRate":
          // No need to update entities, as gather rate is checked dynamically
          break;

        case "unitHP":
          this.game.entityManager.updateUnitsHP(playerId, bonusValue);
          break;

        case "buildingHP":
          this.game.entityManager.updateBuildingsHP(playerId, bonusValue);
          break;

        case "unitAttack":
          this.game.entityManager.updateUnitsAttack(playerId, bonusValue);
          break;

        case "unitSpeed":
          this.game.entityManager.updateUnitsSpeed(playerId, bonusValue);
          break;

        case "researchSpeed":
          // Applied dynamically when researching
          break;
      }
    }
  }

  /**
   * Update available entities based on age
   * @param {number} playerId - ID of the player
   * @param {number} age - Age level
   */
  updateAvailableEntities(playerId, age) {
    // Create a list of all unlocked buildings, units, and technologies for this age and below
    const availableBuildings = new Set();
    const availableUnits = new Set();
    const availableTechnologies = new Set();

    // Add unlocks from all ages up to and including the current age
    for (let i = 0; i <= age; i++) {
      const ageData = this.ages[i];

      if (ageData.unlocks) {
        if (ageData.unlocks.buildings) {
          ageData.unlocks.buildings.forEach((building) =>
            availableBuildings.add(building)
          );
        }

        if (ageData.unlocks.units) {
          ageData.unlocks.units.forEach((unit) => availableUnits.add(unit));
        }

        if (ageData.unlocks.technologies) {
          ageData.unlocks.technologies.forEach((tech) =>
            availableTechnologies.add(tech)
          );
        }
      }
    }

    // Add civilization-specific units and buildings
    const playerCiv = this.game.players[playerId].civilization;

    if (playerCiv && config.CIVILIZATION_UNITS[playerCiv]) {
      config.CIVILIZATION_UNITS[playerCiv].forEach((unit) => {
        if (unit.age <= age) {
          availableUnits.add(unit.id);
        }
      });
    }

    if (playerCiv && config.CIVILIZATION_BUILDINGS[playerCiv]) {
      config.CIVILIZATION_BUILDINGS[playerCiv].forEach((building) => {
        if (building.age <= age) {
          availableBuildings.add(building.id);
        }
      });
    }

    // Update player's available entities
    this.game.players[playerId].availableBuildings =
      Array.from(availableBuildings);
    this.game.players[playerId].availableUnits = Array.from(availableUnits);
    this.game.players[playerId].availableTechnologies = Array.from(
      availableTechnologies
    );

    // Notify UI to update building and unit buttons
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.updateAvailableEntities();
    }
  }

  /**
   * Get a player's current age
   * @param {number} playerId - ID of the player
   * @returns {number} Current age
   */
  getPlayerAge(playerId) {
    return this.playerAges[playerId] || 0;
  }

  /**
   * Get age advancement progress for a player
   * @param {number} playerId - ID of the player
   * @returns {Object} Advancement progress data
   */
  getAdvancementProgress(playerId) {
    return this.ageProgress[playerId];
  }

  /**
   * Get age data for a specific age
   * @param {number} age - Age level
   * @param {string} [civilization] - Optional civilization name for custom age names
   * @returns {Object} Age data
   */
  getAgeData(age, civilization) {
    const ageData = { ...this.ages[age] };

    // Apply civilization-specific names if applicable
    if (
      civilization &&
      this.civAgeModifiers[civilization] &&
      this.civAgeModifiers[civilization].ageNames &&
      this.civAgeModifiers[civilization].ageNames[age]
    ) {
      ageData.name = this.civAgeModifiers[civilization].ageNames[age];
    }

    return ageData;
  }

  /**
   * Get the name of an age
   * @param {number} age - Age level
   * @param {string} [civilization] - Optional civilization name for custom age names
   * @returns {string} Age name
   */
  getAgeName(age, civilization) {
    if (
      civilization &&
      this.civAgeModifiers[civilization] &&
      this.civAgeModifiers[civilization].ageNames &&
      this.civAgeModifiers[civilization].ageNames[age]
    ) {
      return this.civAgeModifiers[civilization].ageNames[age];
    }

    return this.ages[age] ? this.ages[age].name : "Unknown Age";
  }

  /**
   * Check if a building is available in the current age
   * @param {number} playerId - ID of the player
   * @param {string} buildingType - Type of building
   * @returns {boolean} True if building is available
   */
  isBuildingAvailable(playerId, buildingType) {
    const availableBuildings =
      this.game.players[playerId].availableBuildings || [];
    return availableBuildings.includes(buildingType);
  }

  /**
   * Check if a unit is available in the current age
   * @param {number} playerId - ID of the player
   * @param {string} unitType - Type of unit
   * @returns {boolean} True if unit is available
   */
  isUnitAvailable(playerId, unitType) {
    const availableUnits = this.game.players[playerId].availableUnits || [];
    return availableUnits.includes(unitType);
  }

  /**
   * Check if a technology is available in the current age
   * @param {number} playerId - ID of the player
   * @param {string} techId - ID of the technology
   * @returns {boolean} True if technology is available
   */
  isTechnologyAvailable(playerId, techId) {
    const availableTechs =
      this.game.players[playerId].availableTechnologies || [];
    return availableTechs.includes(techId);
  }

  /**
   * Get a bonus value for a player based on age advancements
   * @param {number} playerId - ID of the player
   * @param {string} bonusType - Type of bonus
   * @returns {number} Bonus value (additive)
   */
  getAgeBonus(playerId, bonusType) {
    if (!this.game.players[playerId].ageBonuses) {
      return 0;
    }

    return this.game.players[playerId].ageBonuses[bonusType] || 0;
  }

  /**
   * Get total age advancement time for a player to reach their current age
   * @param {number} playerId - ID of the player
   * @returns {number} Total advancement time in milliseconds
   */
  getTotalAdvancementTime(playerId) {
    const currentAge = this.getPlayerAge(playerId);
    let totalTime = 0;

    // Sum up advancement times for all previous ages
    for (let i = 1; i <= currentAge; i++) {
      if (
        this.ages[i] &&
        this.ages[i].requirements &&
        this.ages[i].requirements.time
      ) {
        let ageTime = this.ages[i].requirements.time;

        // Apply civilization modifier
        const playerCiv = this.game.players[playerId].civilization;
        if (
          playerCiv &&
          this.civAgeModifiers[playerCiv] &&
          this.civAgeModifiers[playerCiv].advancementTimeModifier
        ) {
          ageTime *= this.civAgeModifiers[playerCiv].advancementTimeModifier;
        }

        totalTime += ageTime;
      }
    }

    return totalTime;
  }

  /**
   * Reset a player back to the starting age (for debugging or special scenarios)
   * @param {number} playerId - ID of the player
   */
  resetPlayerAge(playerId) {
    // Store old age for reference
    const oldAge = this.playerAges[playerId];

    // Reset to starting age
    this.playerAges[playerId] = 0;

    // Reset advancement progress
    this.ageProgress[playerId] = {
      currentlyAdvancing: false,
      targetAge: 0,
      progress: 0,
      startTime: 0,
      requiredTime: 0,
    };

    // Clear age bonuses
    this.game.players[playerId].ageBonuses = {};

    // Update available entities
    this.updateAvailableEntities(playerId, 0);

    console.log(`Player ${playerId} age reset from ${oldAge} to 0`);

    // Notify UI
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.showAgeReset();
    }
  }

  /**
   * Set a player's age directly (admin/debug function)
   * @param {number} playerId - ID of the player
   * @param {number} age - Age to set
   */
  setPlayerAge(playerId, age) {
    if (age < 0 || age > Object.keys(this.ages).length - 1) {
      console.error(`Invalid age: ${age}`);
      return;
    }

    // Store old age for reference
    const oldAge = this.playerAges[playerId];

    // Set new age
    this.playerAges[playerId] = age;

    // Reset advancement progress
    this.ageProgress[playerId] = {
      currentlyAdvancing: false,
      targetAge: 0,
      progress: 0,
      startTime: 0,
      requiredTime: 0,
    };

    // Clear existing age bonuses
    this.game.players[playerId].ageBonuses = {};

    // Apply age bonuses for all ages up to and including the new age
    for (let i = 1; i <= age; i++) {
      this.applyAgeBonuses(playerId, i);
    }

    // Update available entities
    this.updateAvailableEntities(playerId, age);

    console.log(`Player ${playerId} age set from ${oldAge} to ${age}`);

    // Notify UI
    if (this.game.uiManager && playerId === this.game.currentPlayer) {
      this.game.uiManager.showAgeSet(age, this.ages[age]);
    }
  }

  /**
   * Get the total count of ages in the game
   * @returns {number} Total number of ages
   */
  getTotalAgeCount() {
    return Object.keys(this.ages).length;
  }

  /**
   * Check if a player has reached the maximum age
   * @param {number} playerId - ID of the player
   * @returns {boolean} True if at maximum age
   */
  isAtMaxAge(playerId) {
    return this.playerAges[playerId] >= Object.keys(this.ages).length - 1;
  }
}
