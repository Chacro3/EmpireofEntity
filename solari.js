/**
 * @fileoverview Solari civilization for Empires of Eternity
 * A civilization that specializes in light, gold, and military prowess.
 */

import { Civilization } from "./civilization.js";
import { config } from "../config.js";

/**
 * Solari civilization class
 */
export class SolariCivilization extends Civilization {
  /**
   * Create a new Solari civilization
   * @param {Object} game - Reference to the main game object
   * @param {number} playerId - ID of the player using this civilization
   */
  constructor(game, playerId) {
    super(game, playerId);

    // Solari civilization properties
    this.id = "solari";
    this.name = "Solari Empire";
    this.description =
      "The Solari Empire draws power from the sun and specializes in gold mining, military training, and light infantry. Their buildings benefit from sunlight, and they excel at offensive warfare.";
    this.icon = "civ_solari";
    this.color = "#FFD700"; // Gold

    // Bonus info for UI display
    this.bonuses = [
      {
        name: "Children of the Sun",
        description: "Solari units gain +15% attack during daylight hours.",
      },
      {
        name: "Golden Economy",
        description:
          "Gold mines yield +25% resources and miners work 15% faster.",
      },
      {
        name: "Military Tradition",
        description: "Military units train 20% faster and cost 10% less wood.",
      },
      {
        name: "Solar Architecture",
        description:
          "Buildings gain +10% HP and work 15% faster during daylight hours.",
      },
      {
        name: "Swift Advancement",
        description: "Age advancement research is 10% faster.",
      },
    ];

    // Resource bonuses (gathering rates, start amounts, etc)
    this.resourceBonuses = {
      startingResources: {
        food: 250,
        wood: 200,
        gold: 150,
        stone: 100,
        iron: 0,
      },
      gatheringRates: {
        food: 1.0,
        wood: 1.0,
        gold: 1.25, // 25% faster gold gathering
        stone: 1.0,
        iron: 1.0,
      },
      resourceCosts: {
        food: 1.0,
        wood: 0.9, // 10% cheaper wood costs
        gold: 1.0,
        stone: 1.0,
        iron: 1.0,
      },
    };

    // Unit bonuses
    this.unitBonuses = {
      // Global bonuses
      global: {
        hp: 1.0,
        attack: 1.0, // Base attack, +15% during day applied dynamically
        armor: 1.0,
        speed: 1.05, // 5% faster movement
        buildTime: 0.8, // 20% faster training for military units
        cost: 1.0,
        lineOfSight: 1.1, // 10% better vision
      },
      // Unit-specific bonuses
      unitTypes: {
        villager: {
          buildTime: 1.0, // Regular villager training speed (override global)
          gatheringRate: {
            gold: 1.15, // 15% faster gold gathering for villagers
          },
        },
        swordsman: {
          attack: 1.1, // +10% attack for swordsmen (stacks with day bonus)
          buildTime: 0.7, // 30% faster training for swordsmen
        },
        archer: {
          attack: 1.05, // +5% attack for archers
          range: 1.1, // +10% range for archers
        },
        cavalry: {
          speed: 1.1, // +10% speed for cavalry (stacks with global)
          cost: 0.9, // 10% cheaper cavalry
        },
      },
    };

    // Building bonuses
    this.buildingBonuses = {
      // Global bonuses
      global: {
        hp: 1.1, // +10% HP for all buildings
        armor: 1.0,
        buildTime: 1.0,
        cost: 1.0,
        productionSpeed: 1.0, // Base production speed, +15% during day
      },
      // Building-specific bonuses
      buildingTypes: {
        towncenter: {
          productionSpeed: 1.1, // +10% villager production
        },
        barracks: {
          productionSpeed: 1.15, // +15% unit production speed
        },
        market: {
          tradingRate: 1.2, // +20% trade income
        },
        temple: {
          productionSpeed: 1.2, // +20% temple production
          radius: 1.15, // +15% temple influence radius
        },
      },
    };

    // Technology bonuses
    this.techBonuses = {
      researchTime: 0.9, // 10% faster research
      researchCost: 1.0,
      // Tech-specific bonuses
      techTypes: {
        military_traditions: {
          researchTime: 0.8, // 20% faster for key military tech
          effects: {
            attackBonus: 0.05, // Additional +5% attack from this tech
          },
        },
        advanced_metallurgy: {
          researchTime: 0.85, // 15% faster metallurgy research
          effects: {
            attackBonus: 0.05, // Additional +5% attack from this tech
          },
        },
      },
    };

    // Age bonuses
    this.ageBonuses = {
      advancementTime: 0.9, // 10% faster age advancement
      advancementCost: 1.0,
      // Age-specific bonuses
      ageUnlocks: {
        0: [], // Stone Age
        1: [
          // Bronze Age
          {
            type: "unit_buff",
            unitType: "swordsman",
            stat: "attack",
            value: 0.1, // +10% attack for swordsmen
          },
          {
            type: "building_buff",
            buildingType: "barracks",
            stat: "productionSpeed",
            value: 0.05, // +5% production speed for barracks
          },
        ],
        2: [
          // Iron Age
          {
            type: "unit_buff",
            unitType: "archer",
            stat: "attack",
            value: 0.1, // +10% attack for archers
          },
          {
            type: "resource_gathering",
            resource: "gold",
            value: 0.1, // Additional +10% gold gathering
          },
        ],
        3: [
          // Imperial Age
          {
            type: "unit_buff",
            unitType: "sunlancer",
            stat: "attack",
            value: 0.15, // +15% attack for unique unit
          },
          {
            type: "building_buff",
            buildingType: "solariShrine",
            stat: "radius",
            value: 0.2, // +20% radius for unique building
          },
        ],
        4: [
          // Eternal Age
          {
            type: "unit_buff",
            stat: "attack",
            value: 0.1, // +10% attack for all units
          },
          {
            type: "building_buff",
            stat: "hp",
            value: 0.15, // +15% HP for all buildings
          },
        ],
      },
    };

    // Unique units
    this.uniqueUnits = [
      {
        id: "sunlancer",
        name: "Sun Lancer",
        description:
          "Elite cavalry unit that deals bonus damage during daytime and has a sun-burst attack that damages multiple enemies.",
        age: 3, // Imperial Age
        cost: {
          food: 80,
          gold: 60,
          iron: 20,
        },
        stats: {
          hp: 180,
          attack: 14,
          armor: 3,
          speed: 1.3,
          attackRange: 1,
          attackSpeed: 1.8,
          lineOfSight: 7,
        },
        abilities: [
          {
            id: "solar_burst",
            name: "Solar Burst",
            description: "Damages all enemies in a small radius",
            cooldown: 30,
            damage: 8,
            radius: 2,
          },
        ],
        counters: ["spearman", "pikeman"],
        counteredBy: ["camelrider", "halberdier"],
        bonusVs: ["archer", "skirmisher"],
        trainTime: 25,
      },
      {
        id: "solarGuard",
        name: "Solar Guard",
        description:
          "Elite infantry unit with superior armor and attack. They get attack and defense bonuses when fighting near Solari temples.",
        age: 3, // Imperial Age
        cost: {
          food: 60,
          gold: 45,
          iron: 15,
        },
        stats: {
          hp: 120,
          attack: 12,
          armor: 5,
          speed: 0.9,
          attackRange: 1,
          attackSpeed: 1.5,
          lineOfSight: 5,
        },
        abilities: [
          {
            id: "sun_shield",
            name: "Sun Shield",
            description: "Temporarily increases armor by 4",
            cooldown: 40,
            duration: 8,
          },
        ],
        counters: ["skirmisher", "swordsman"],
        counteredBy: ["archer", "cavalry"],
        bonusVs: ["spearman", "monk"],
        trainTime: 20,
      },
    ];

    // Unique buildings
    this.uniqueBuildings = [
      {
        id: "solariShrine",
        name: "Solar Shrine",
        description:
          "A unique temple that provides attack and defense bonuses to nearby units during daytime. Can also train priests and research powerful sun-based technologies.",
        age: 2, // Iron Age
        cost: {
          wood: 120,
          stone: 80,
          gold: 60,
        },
        stats: {
          hp: 1800,
          armor: 2,
          buildTime: 50,
          influenceRadius: 10,
        },
        aura: {
          name: "Solar Blessing",
          effects: {
            attack: 1.1, // +10% attack for nearby units
            armor: 1.05, // +5% armor for nearby units
          },
          dayOnly: true, // Only active during daytime
        },
        production: ["priest", "sunpriest"],
        research: ["solar_devotion", "sun_warriors", "divine_radiance"],
      },
      {
        id: "goldFoundry",
        name: "Gold Foundry",
        description:
          "Specialized mining camp that processes gold more efficiently and provides a small trickle of passive gold income.",
        age: 2, // Iron Age
        cost: {
          wood: 150,
          stone: 60,
        },
        stats: {
          hp: 1200,
          armor: 1,
          buildTime: 35,
          goldGenerationRate: 0.2, // Gold per second
        },
        gatheringBonuses: {
          gold: 1.2, // +20% gold gathering rate
        },
      },
    ];

    // Unique technologies
    this.uniqueTechnologies = [
      {
        id: "solar_devotion",
        name: "Solar Devotion",
        description:
          "Increases the influence radius of all temples and Solar Shrines by 20% and makes their auras 15% more effective.",
        age: 2, // Iron Age
        cost: {
          food: 300,
          gold: 200,
        },
        researchTime: 45,
        effects: {
          buildingBuff: {
            types: ["temple", "solariShrine"],
            radius: 1.2,
            auraEffectiveness: 1.15,
          },
        },
        requires: ["temple"],
      },
      {
        id: "sun_warriors",
        name: "Sun Warriors",
        description:
          "All military units gain +15% attack and +10% HP during daytime.",
        age: 3, // Imperial Age
        cost: {
          food: 500,
          gold: 350,
        },
        researchTime: 60,
        effects: {
          unitBuff: {
            categories: ["military"],
            dayAttackBonus: 0.15,
            dayHpBonus: 0.1,
          },
        },
        requires: ["solariShrine"],
      },
      {
        id: "divine_radiance",
        name: "Divine Radiance",
        description:
          "Solar Shrines periodically heal nearby friendly units and damage nearby enemy units.",
        age: 4, // Eternal Age
        cost: {
          food: 400,
          gold: 600,
          iron: 200,
        },
        researchTime: 80,
        effects: {
          buildingAbility: {
            building: "solariShrine",
            ability: {
              id: "radiance_aura",
              healing: 2, // HP per second for allies
              damage: 1, // HP per second for enemies
              radius: 8,
            },
          },
        },
        requires: ["solariShrine", "sun_warriors"],
      },
    ];

    // Special abilities and traits
    this.specialAbilities = [
      {
        id: "children_of_the_sun",
        name: "Children of the Sun",
        description:
          "All Solari units gain attack bonuses during daylight hours and have reduced performance at night.",
        effects: {
          dayAttackBonus: 0.15, // +15% attack during day
          nightAttackPenalty: 0.1, // -10% attack during night
        },
        icon: "ability_solar_power",
      },
      {
        id: "gold_affinity",
        name: "Gold Affinity",
        description:
          "Solari can construct special Gold Foundries that process gold more efficiently and generate a small passive income.",
        effects: {
          goldFoundry: {
            enabled: true,
          },
        },
        icon: "ability_gold_affinity",
      },
    ];

    // Tech tree modifications
    this.techTreeModifications = {
      disabled: ["darkness_mastery", "shadow_warriors"], // Can't research dark-based techs
      enabled: ["advanced_metallurgy", "solar_forging"], // Special metallurgy techs
    };

    // Cultural traits
    this.culturalTraits = [
      {
        id: "worship_the_sun",
        name: "Sun Worship",
        description:
          "The Solari civilization worships the sun and believes its power flows through them, granting strength and vitality during daylight.",
        effects: "Daytime bonuses to combat and production.",
        icon: "trait_sun_worship",
      },
      {
        id: "gold_obsession",
        name: "Gold Obsession",
        description:
          "The Solari value gold above all other metals, seeing it as a physical manifestation of the sun's power.",
        effects: "Improved gold mining and specialized gold structures.",
        icon: "trait_gold_focus",
      },
    ];

    // Starting units and buildings
    this.startingUnits = [
      { type: "villager", count: 4 }, // One extra villager
      { type: "scout", count: 1 },
    ];

    this.startingBuildings = [{ type: "towncenter", count: 1 }];

    // Time-of-day bonuses cache
    this.dayTimeCache = {
      lastUpdate: 0,
      isDay: true,
    };
  }

  /**
   * Initialize the Solari civilization
   */
  init() {
    super.init();

    // Register time-of-day event listener
    if (this.game.weatherSystem) {
      this.game.on("timeChanged", this.onTimeOfDayChanged.bind(this));
    }

    // Apply initial day/night bonuses
    this.updateDayNightBonuses();
  }

  /**
   * Handle time of day changes
   * @param {Object} data - Event data
   */
  onTimeOfDayChanged(data) {
    this.updateDayNightBonuses();
  }

  /**
   * Update bonuses based on day/night cycle
   */
  updateDayNightBonuses() {
    // Skip if weather system is not available
    if (!this.game.weatherSystem) {
      return;
    }

    // Get current time information
    const timeInfo = this.game.weatherSystem.getTimeOfDay();

    // Skip if time hasn't changed
    if (this.dayTimeCache.lastUpdate === this.game.gameTime) {
      return;
    }

    this.dayTimeCache.lastUpdate = this.game.gameTime;

    // Skip if day/night state hasn't changed
    if (this.dayTimeCache.isDay === timeInfo.isDay) {
      return;
    }

    this.dayTimeCache.isDay = timeInfo.isDay;

    // Update unit attack modifiers
    this.updateUnitBonuses(timeInfo.isDay);

    // Update building production modifiers
    this.updateBuildingBonuses(timeInfo.isDay);

    // Update shrine auras
    this.updateShrineAuras(timeInfo.isDay);
  }

  /**
   * Update unit bonuses based on day/night cycle
   * @param {boolean} isDay - Whether it's daytime
   */
  updateUnitBonuses(isDay) {
    if (!this.game.entityManager) {
      return;
    }

    // Calculate attack modifier
    let attackModifier;
    let hasSunWarriors = this.game.techManager?.hasTechnology(
      this.playerId,
      "sun_warriors"
    );

    if (isDay) {
      // Apply base bonus + additional tech bonus if researched
      attackModifier = this.specialAbilities[0].effects.dayAttackBonus;
      if (hasSunWarriors) {
        attackModifier += 0.15; // Additional +15% from Sun Warriors
      }
    } else {
      // Apply night penalty
      attackModifier = -this.specialAbilities[0].effects.nightAttackPenalty;
    }

    // Update all military units
    this.game.entityManager.applyDayNightBonuses(
      this.playerId,
      {
        attack: 1 + attackModifier,
        hp: isDay && hasSunWarriors ? 1.1 : 1.0, // +10% HP during day with Sun Warriors
      },
      "military"
    );
  }

  /**
   * Update building bonuses based on day/night cycle
   * @param {boolean} isDay - Whether it's daytime
   */
  updateBuildingBonuses(isDay) {
    if (!this.game.entityManager) {
      return;
    }

    // Production speed boost during day
    const productionModifier = isDay ? 1.15 : 1.0;

    // Update all buildings
    this.game.entityManager.applyDayNightBonuses(
      this.playerId,
      {
        productionSpeed: productionModifier,
      },
      "building"
    );
  }

  /**
   * Update Solar Shrine auras based on day/night cycle
   * @param {boolean} isDay - Whether it's daytime
   */
  updateShrineAuras(isDay) {
    if (!this.game.entityManager) {
      return;
    }

    // Get all Solar Shrines
    const shrines = this.game.entityManager.getEntitiesByType(
      this.playerId,
      "building",
      "solariShrine"
    );

    // Enable/disable their auras based on time
    for (const shrine of shrines) {
      if (shrine.aura) {
        shrine.aura.active = isDay;
      }

      // If Divine Radiance is researched, update that ability too
      if (shrine.abilities && shrine.abilities.includes("radiance_aura")) {
        shrine.abilityActive = isDay;
      }
    }
  }

  /**
   * React to game events
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   */
  onGameEvent(eventType, eventData) {
    super.onGameEvent(eventType, eventData);

    switch (eventType) {
      case "resourceDepositComplete":
        this.handleResourceDeposit(eventData);
        break;

      case "buildingConstructionComplete":
        this.handleBuildingComplete(eventData);
        break;

      case "technologyResearched":
        this.handleTechResearched(eventData);
        break;

      case "ageAdvancement":
        this.handleAgeAdvancement(eventData);
        break;
    }
  }

  /**
   * Handle resource deposit completion
   * @param {Object} data - Event data
   */
  handleResourceDeposit(data) {
    // Check if player deposited gold
    if (data.playerId === this.playerId && data.resource === "gold") {
      // Bonus gold nuggets chance (5%)
      if (Math.random() < 0.05) {
        const bonusAmount = Math.floor(data.amount * 0.15); // 15% bonus

        // Add bonus gold
        if (this.game.resourceManager) {
          this.game.resourceManager.addResource(
            this.playerId,
            "gold",
            bonusAmount
          );
        }

        // Send notification
        if (this.game.uiManager) {
          this.game.uiManager.showNotification(
            `Found ${bonusAmount} gold nuggets!`,
            "gold"
          );
        }
      }
    }
  }

  /**
   * Handle building construction completion
   * @param {Object} data - Event data
   */
  handleBuildingComplete(data) {
    // Only process for this player
    if (data.playerId !== this.playerId) {
      return;
    }

    const building = data.building;

    // Special case for Gold Foundry
    if (building.buildingType === "goldFoundry") {
      // Register for gold generation updates
      if (this.game.resourceManager) {
        this.game.resourceManager.registerPassiveGenerator(
          this.playerId,
          "gold",
          building.id,
          building.goldGenerationRate || 0.2
        );
      }
    }

    // Handle Solar Shrine
    if (building.buildingType === "solariShrine") {
      // Update initial aura state based on time of day
      if (this.game.weatherSystem) {
        const timeInfo = this.game.weatherSystem.getTimeOfDay();
        if (building.aura) {
          building.aura.active = timeInfo.isDay;
        }
      }
    }
  }

  /**
   * Handle technology research completion
   * @param {Object} data - Event data
   */
  handleTechResearched(data) {
    // Only process for this player
    if (data.playerId !== this.playerId) {
      return;
    }

    const techId = data.technologyId;

    switch (techId) {
      case "solar_devotion":
        this.applySolarDevotion();
        break;

      case "sun_warriors":
        // Update day/night bonuses to apply new effects
        this.updateDayNightBonuses();
        break;

      case "divine_radiance":
        this.applyDivineRadiance();
        break;
    }
  }

  /**
   * Apply effects of Solar Devotion technology
   */
  applySolarDevotion() {
    // Get all temples and solar shrines
    const buildings = this.game.entityManager?.getEntitiesByTypes(
      this.playerId,
      "building",
      ["temple", "solariShrine"]
    );

    if (!buildings) {
      return;
    }

    // Apply buffs to each building
    for (const building of buildings) {
      // Increase influence radius
      if (building.influenceRadius) {
        building.influenceRadius *= 1.2; // +20%
      }

      // Increase aura effectiveness
      if (building.aura && building.aura.effects) {
        for (const effect in building.aura.effects) {
          building.aura.effects[effect] =
            1 + (building.aura.effects[effect] - 1) * 1.15;
        }
      }
    }
  }

  /**
   * Apply effects of Divine Radiance technology
   */
  applyDivineRadiance() {
    // Get all solar shrines
    const shrines = this.game.entityManager?.getEntitiesByType(
      this.playerId,
      "building",
      "solariShrine"
    );

    if (!shrines) {
      return;
    }

    // Add radiance ability to each shrine
    for (const shrine of shrines) {
      if (!shrine.abilities) {
        shrine.abilities = [];
      }

      shrine.abilities.push("radiance_aura");

      // Set initial state based on time of day
      if (this.game.weatherSystem) {
        const timeInfo = this.game.weatherSystem.getTimeOfDay();
        shrine.abilityActive = timeInfo.isDay;
      } else {
        shrine.abilityActive = true;
      }
    }
  }

  /**
   * Handle age advancement
   * @param {Object} data - Event data
   */
  handleAgeAdvancement(data) {
    // Only process for this player
    if (data.playerId !== this.playerId) {
      return;
    }

    // Apply age-specific bonuses
    this.applyAgeBonuses(data.newAge);

    // Bonus resource gift when advancing to Imperial Age
    if (data.newAge === 3) {
      // Imperial Age
      // Send a shipment of gold to celebrate
      if (this.game.resourceManager) {
        this.game.resourceManager.addResource(this.playerId, "gold", 300);

        // Notification
        if (this.game.uiManager) {
          this.game.uiManager.showNotification(
            "The Imperial treasury sends 300 gold in celebration of your advancement!",
            "age_advancement"
          );
        }
      }
    }
  }
}
