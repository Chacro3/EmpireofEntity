/**
 * @fileoverview Lunari civilization for Empires of Eternity
 * A civilization that specializes in night, magic, and defensive structures.
 */

import { Civilization } from "./civilization.js";
import { config } from "../config.js";

/**
 * Lunari civilization class
 */
export class LunariCivilization extends Civilization {
  /**
   * Create a new Lunari civilization
   * @param {Object} game - Reference to the main game object
   * @param {number} playerId - ID of the player using this civilization
   */
  constructor(game, playerId) {
    super(game, playerId);

    // Lunari civilization properties
    this.id = "lunari";
    this.name = "Lunari Covenant";
    this.description =
      "The Lunari Covenant harnesses the power of the moon and stars, excelling in mystical arts, defensive structures, and nighttime operations. Their economy is focused on resource efficiency rather than rapid production.";
    this.icon = "civ_lunari";
    this.color = "#C0C0FF"; // Silvery blue

    // Bonus info for UI display
    this.bonuses = [
      {
        name: "Children of the Moon",
        description:
          "Lunari units gain +20% armor and +10% speed during nighttime.",
      },
      {
        name: "Mystical Insight",
        description: "All technologies research 15% faster and cost 10% less.",
      },
      {
        name: "Efficient Harvesting",
        description:
          "All resource deposits yield an additional 10% resources before depletion.",
      },
      {
        name: "Defensive Mastery",
        description: "Defensive structures have +25% HP and attack range.",
      },
      {
        name: "Resource Conservation",
        description:
          "Buildings cost 10% less stone and iron, and military units cost 10% less food.",
      },
    ];

    // Resource bonuses (gathering rates, start amounts, etc)
    this.resourceBonuses = {
      startingResources: {
        food: 200,
        wood: 250,
        gold: 100,
        stone: 150,
        iron: 100,
      },
      gatheringRates: {
        food: 1.0,
        wood: 1.1, // 10% faster wood gathering
        gold: 1.0,
        stone: 1.1, // 10% faster stone gathering
        iron: 1.1, // 10% faster iron gathering
      },
      resourceCosts: {
        food: 0.9, // 10% cheaper food costs
        wood: 1.0,
        gold: 1.0,
        stone: 0.9, // 10% cheaper stone costs
        iron: 0.9, // 10% cheaper iron costs
      },
    };

    // Unit bonuses
    this.unitBonuses = {
      // Global bonuses
      global: {
        hp: 1.0,
        attack: 1.0,
        armor: 1.0, // Base armor, +20% during night applied dynamically
        speed: 1.0, // Base speed, +10% during night applied dynamically
        buildTime: 1.0,
        cost: 1.0,
        lineOfSight: 1.15, // 15% better vision overall
      },
      // Unit-specific bonuses
      unitTypes: {
        villager: {
          gatheringRate: {
            wood: 1.05, // 5% faster wood gathering for villagers
            stone: 1.05, // 5% faster stone gathering for villagers
            iron: 1.05, // 5% faster iron gathering for villagers
          },
          buildSpeed: 1.1, // 10% faster building construction
        },
        spearman: {
          armor: 1.15, // +15% armor for spearmen
          buildTime: 0.9, // 10% faster training
        },
        archer: {
          range: 1.15, // +15% range for archers
          cost: 0.9, // 10% cheaper archers
        },
        priest: {
          healingRate: 1.2, // 20% faster healing
          range: 1.1, // 10% more range
        },
      },
    };

    // Building bonuses
    this.buildingBonuses = {
      // Global bonuses
      global: {
        hp: 1.0,
        armor: 1.1, // +10% armor for all buildings
        buildTime: 1.0,
        cost: 1.0,
        productionSpeed: 1.0,
      },
      // Building-specific bonuses
      buildingTypes: {
        tower: {
          hp: 1.25, // +25% HP for defensive structures
          range: 1.25, // +25% range for defensive structures
          attack: 1.15, // +15% attack for defensive structures
        },
        wall: {
          hp: 1.25, // +25% HP for walls
          buildTime: 0.9, // 10% faster wall construction
        },
        university: {
          researchSpeed: 1.2, // +20% research speed
        },
        temple: {
          healingRate: 1.15, // +15% healing rate
          radius: 1.2, // +20% temple influence radius
        },
      },
    };

    // Technology bonuses
    this.techBonuses = {
      researchTime: 0.85, // 15% faster research
      researchCost: 0.9, // 10% cheaper research
      // Tech-specific bonuses
      techTypes: {
        masonry: {
          researchTime: 0.8, // 20% faster masonry research
          effects: {
            buildingHpBonus: 0.05, // Additional +5% building HP from this tech
          },
        },
        mysticism: {
          researchTime: 0.8, // 20% faster mysticism research
          effects: {
            priestRangeBonus: 0.1, // Additional +10% priest range from this tech
          },
        },
      },
    };

    // Age bonuses
    this.ageBonuses = {
      advancementTime: 1.0, // Standard age advancement time
      advancementCost: 0.9, // 10% cheaper age advancement
      // Age-specific bonuses
      ageUnlocks: {
        0: [], // Stone Age
        1: [
          // Bronze Age
          {
            type: "unit_buff",
            unitType: "spearman",
            stat: "armor",
            value: 0.1, // +10% armor for spearmen
          },
          {
            type: "building_buff",
            buildingType: "wall",
            stat: "hp",
            value: 0.1, // +10% HP for walls
          },
        ],
        2: [
          // Iron Age
          {
            type: "resource_gathering",
            resource: "iron",
            value: 0.1, // Additional +10% iron gathering
          },
          {
            type: "unit_buff",
            unitType: "archer",
            stat: "attack",
            value: 0.1, // +10% attack for archers
          },
        ],
        3: [
          // Imperial Age
          {
            type: "unit_buff",
            unitType: "moonStalker",
            stat: "attack",
            value: 0.15, // +15% attack for unique unit
          },
          {
            type: "building_buff",
            buildingType: "lunarObservatory",
            stat: "radius",
            value: 0.2, // +20% radius for unique building
          },
        ],
        4: [
          // Eternal Age
          {
            type: "unit_buff",
            stat: "armor",
            value: 0.1, // +10% armor for all units
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
        id: "moonStalker",
        name: "Moon Stalker",
        description:
          "Stealthy archer with increased attack and stealth capabilities during nighttime. Can temporarily cloak allied units nearby.",
        age: 3, // Imperial Age
        cost: {
          food: 40,
          wood: 60,
          gold: 30,
        },
        stats: {
          hp: 120,
          attack: 12,
          armor: 2,
          speed: 1.1,
          attackRange: 6,
          attackSpeed: 1.7,
          lineOfSight: 8,
        },
        abilities: [
          {
            id: "lunar_veil",
            name: "Lunar Veil",
            description:
              "Cloaks nearby allied units for a short time, making them invisible to enemies",
            cooldown: 60,
            duration: 10,
            radius: 3,
          },
        ],
        counters: ["cavalry", "skirmisher"],
        counteredBy: ["scout", "lightCavalry"],
        bonusVs: ["infantry", "siege"],
        trainTime: 30,
      },
      {
        id: "astralCaster",
        name: "Astral Caster",
        description:
          "Powerful spellcaster unit that can cast defensive spells and drain enemy resources.",
        age: 3, // Imperial Age
        cost: {
          food: 30,
          gold: 70,
          iron: 20,
        },
        stats: {
          hp: 80,
          attack: 6,
          armor: 1,
          speed: 0.9,
          attackRange: 4,
          attackSpeed: 2.0,
          lineOfSight: 7,
        },
        abilities: [
          {
            id: "astral_shield",
            name: "Astral Shield",
            description:
              "Creates a protective barrier around friendly units, reducing incoming damage by 50%",
            cooldown: 45,
            duration: 8,
            radius: 4,
          },
          {
            id: "resource_drain",
            name: "Resource Drain",
            description:
              "Drains resources from nearby enemy buildings, transferring them to Lunari storage",
            cooldown: 90,
            amount: 20, // Resources drained
            radius: 5,
          },
        ],
        counters: ["infantry", "archer"],
        counteredBy: ["cavalry", "siegeWeapon"],
        bonusVs: ["priest", "villager"],
        trainTime: 35,
      },
    ];

    // Unique buildings
    this.uniqueBuildings = [
      {
        id: "lunarObservatory",
        name: "Lunar Observatory",
        description:
          "A unique building that provides vision of a large area and enhances nearby units during nighttime. Can also research powerful lunar technologies.",
        age: 2, // Iron Age
        cost: {
          wood: 100,
          stone: 120,
          gold: 50,
        },
        stats: {
          hp: 1600,
          armor: 3,
          buildTime: 45,
          influenceRadius: 12,
        },
        aura: {
          name: "Lunar Blessing",
          effects: {
            armor: 1.15, // +15% armor for nearby units
            speed: 1.1, // +10% speed for nearby units
          },
          nightOnly: true, // Only active during nighttime
        },
        abilities: [
          {
            id: "reveal_map",
            name: "Celestial Vision",
            description: "Reveals a large area of the map temporarily",
            cooldown: 120,
            duration: 15,
            radius: 20,
          },
        ],
        research: ["lunar_attunement", "veil_of_night", "astral_resonance"],
      },
      {
        id: "moonShroud",
        name: "Moon Shroud",
        description:
          "Defensive structure that conceals nearby buildings and units from enemy scouts during nighttime.",
        age: 2, // Iron Age
        cost: {
          wood: 80,
          stone: 100,
          iron: 30,
        },
        stats: {
          hp: 1000,
          armor: 2,
          buildTime: 30,
          cloakRadius: 8,
        },
        abilities: [
          {
            id: "night_shroud",
            name: "Night Shroud",
            description:
              "Conceals nearby units and buildings from enemy vision during nighttime",
            nightOnly: true,
            radius: 8,
          },
        ],
      },
    ];

    // Unique technologies
    this.uniqueTechnologies = [
      {
        id: "lunar_attunement",
        name: "Lunar Attunement",
        description:
          "Increases the night vision of all units by 30% and makes them immune to movement penalties during nighttime.",
        age: 2, // Iron Age
        cost: {
          food: 250,
          gold: 150,
        },
        researchTime: 40,
        effects: {
          unitBuff: {
            nightVisionBonus: 0.3,
            nightMovementImmunity: true,
          },
        },
        requires: ["lunarObservatory"],
      },
      {
        id: "veil_of_night",
        name: "Veil of Night",
        description:
          "All defensive structures gain cloaking during nighttime, making them invisible until enemies get very close.",
        age: 3, // Imperial Age
        cost: {
          wood: 300,
          gold: 200,
          iron: 100,
        },
        researchTime: 55,
        effects: {
          buildingAbility: {
            categories: ["defensive"],
            ability: "night_cloak",
            nightOnly: true,
          },
        },
        requires: ["lunarObservatory", "lunar_attunement"],
      },
      {
        id: "astral_resonance",
        name: "Astral Resonance",
        description:
          "Lunar Observatories periodically generate a small amount of all resources based on the number of units under their influence.",
        age: 4, // Eternal Age
        cost: {
          food: 400,
          gold: 300,
          iron: 200,
        },
        researchTime: 70,
        effects: {
          buildingAbility: {
            building: "lunarObservatory",
            ability: {
              id: "astral_harvest",
              resourceGeneration: true,
              generationRate: 0.1, // Per unit in radius
              radius: 12,
            },
          },
        },
        requires: ["lunarObservatory", "veil_of_night"],
      },
    ];

    // Special abilities and traits
    this.specialAbilities = [
      {
        id: "children_of_the_moon",
        name: "Children of the Moon",
        description:
          "All Lunari units gain defensive bonuses during nighttime and have enhanced vision in darkness.",
        effects: {
          nightArmorBonus: 0.2, // +20% armor during night
          nightSpeedBonus: 0.1, // +10% speed during night
          nightVisionBonus: 0.15, // +15% vision during night
        },
        icon: "ability_lunar_power",
      },
      {
        id: "resource_efficiency",
        name: "Resource Efficiency",
        description:
          "Lunari resource deposits yield more resources before depletion and buildings consume fewer resources for construction.",
        effects: {
          resourceYieldBonus: 0.1, // +10% resources from deposits
          buildingResourceDiscount: 0.1, // 10% resource discount for buildings
        },
        icon: "ability_efficiency",
      },
    ];

    // Tech tree modifications
    this.techTreeModifications = {
      disabled: ["solar_devotion", "divine_radiance"], // Can't research sun-based techs
      enabled: ["mysticism", "astral_magic"], // Special magic techs
    };

    // Cultural traits
    this.culturalTraits = [
      {
        id: "moonlight_reverence",
        name: "Moonlight Reverence",
        description:
          "The Lunari civilization reveres the moon and stars, drawing power from the night sky and the mystical energies it contains.",
        effects: "Nighttime bonuses to defense and mobility.",
        icon: "trait_moon_reverence",
      },
      {
        id: "mystic_knowledge",
        name: "Mystic Knowledge",
        description:
          "The Lunari are known for their deep understanding of the mystical arts and celestial knowledge.",
        effects: "Enhanced research capabilities and unique magical abilities.",
        icon: "trait_mysticism",
      },
    ];

    // Starting units and buildings
    this.startingUnits = [
      { type: "villager", count: 3 },
      { type: "scout", count: 2 }, // One extra scout
    ];

    this.startingBuildings = [{ type: "towncenter", count: 1 }];

    // Time-of-day bonuses cache
    this.nightTimeCache = {
      lastUpdate: 0,
      isNight: false,
    };

    // Resource depletion bonus tracking
    this.resourceDepletionTracking = {
      enabled: true,
      // Track deposits and their extended amounts
      deposits: {},
    };
  }

  /**
   * Initialize the Lunari civilization
   */
  init() {
    super.init();

    // Register time-of-day event listener
    if (this.game.weatherSystem) {
      this.game.on("timeChanged", this.onTimeOfDayChanged.bind(this));
    }

    // Register resource and entity events
    this.game.on("resourceNodeCreated", this.onResourceNodeCreated.bind(this));
    this.game.on("entityCreated", this.onEntityCreated.bind(this));

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
    if (this.nightTimeCache.lastUpdate === this.game.gameTime) {
      return;
    }

    this.nightTimeCache.lastUpdate = this.game.gameTime;

    // Skip if day/night state hasn't changed
    if (this.nightTimeCache.isNight === !timeInfo.isDay) {
      return;
    }

    this.nightTimeCache.isNight = !timeInfo.isDay;

    // Update unit modifiers
    this.updateUnitBonuses(this.nightTimeCache.isNight);

    // Update building abilities
    this.updateBuildingAbilities(this.nightTimeCache.isNight);

    // Update observatory auras
    this.updateObservatoryAuras(this.nightTimeCache.isNight);
  }

  /**
   * Update unit bonuses based on day/night cycle
   * @param {boolean} isNight - Whether it's nighttime
   */
  updateUnitBonuses(isNight) {
    if (!this.game.entityManager) {
      return;
    }

    // Calculate modifiers
    let armorModifier = 1.0;
    let speedModifier = 1.0;
    let visionModifier = 1.0;

    if (isNight) {
      // Apply night bonuses
      armorModifier = 1.0 + this.specialAbilities[0].effects.nightArmorBonus;
      speedModifier = 1.0 + this.specialAbilities[0].effects.nightSpeedBonus;
      visionModifier = 1.0 + this.specialAbilities[0].effects.nightVisionBonus;

      // Check for Lunar Attunement technology
      const hasLunarAttunement = this.game.techManager?.hasTechnology(
        this.playerId,
        "lunar_attunement"
      );
      if (hasLunarAttunement) {
        visionModifier += 0.3; // Additional +30% night vision
      }
    }

    // Update all units
    this.game.entityManager.applyDayNightBonuses(
      this.playerId,
      {
        armor: armorModifier,
        speed: speedModifier,
        lineOfSight: visionModifier,
      },
      "all"
    );
  }

  /**
   * Update building abilities based on day/night cycle
   * @param {boolean} isNight - Whether it's nighttime
   */
  updateBuildingAbilities(isNight) {
    if (!this.game.entityManager) {
      return;
    }

    // Check for Veil of Night technology
    const hasVeilOfNight = this.game.techManager?.hasTechnology(
      this.playerId,
      "veil_of_night"
    );

    if (hasVeilOfNight) {
      // Get all defensive structures
      const defensiveBuildings =
        this.game.entityManager.getEntitiesByCategories(
          this.playerId,
          "building",
          ["defensive"]
        );

      // Toggle cloaking based on time
      for (const building of defensiveBuildings) {
        building.isCloaked = isNight;
      }
    }

    // Update Moon Shroud buildings
    const moonShrouds = this.game.entityManager.getEntitiesByType(
      this.playerId,
      "building",
      "moonShroud"
    );

    for (const shroud of moonShrouds) {
      if (shroud.abilities) {
        for (const ability of shroud.abilities) {
          if (ability.id === "night_shroud") {
            ability.active = isNight;
          }
        }
      }
    }
  }

  /**
   * Update Lunar Observatory auras based on day/night cycle
   * @param {boolean} isNight - Whether it's nighttime
   */
  updateObservatoryAuras(isNight) {
    if (!this.game.entityManager) {
      return;
    }

    // Get all Lunar Observatories
    const observatories = this.game.entityManager.getEntitiesByType(
      this.playerId,
      "building",
      "lunarObservatory"
    );

    // Enable/disable their auras based on time
    for (const observatory of observatories) {
      if (observatory.aura) {
        observatory.aura.active = isNight;
      }

      // If Astral Resonance is researched, update resource generation rate
      if (
        this.game.techManager?.hasTechnology(this.playerId, "astral_resonance")
      ) {
        if (observatory.abilities) {
          for (const ability of observatory.abilities) {
            if (ability.id === "astral_harvest") {
              ability.active = true; // Always active, but more effective at night
              ability.effectMultiplier = isNight ? 1.0 : 0.5; // Half efficiency during day
            }
          }
        }
      }
    }
  }

  /**
   * Handle resource node creation event
   * @param {Object} data - Event data
   */
  onResourceNodeCreated(data) {
    // Only apply bonus to resource nodes in Lunari territory
    if (!data.node || !this.isInLunariTerritory(data.node)) {
      return;
    }

    // Apply resource yield bonus
    const yieldBonus = this.specialAbilities[1].effects.resourceYieldBonus; // 10%
    const originalAmount = data.node.totalAmount;
    const bonusAmount = Math.floor(originalAmount * yieldBonus);

    // Increase the total resource amount
    data.node.totalAmount += bonusAmount;
    data.node.currentAmount += bonusAmount;

    // Track this deposit for stats
    this.resourceDepletionTracking.deposits[data.node.id] = {
      type: data.node.resourceType,
      originalAmount: originalAmount,
      bonusAmount: bonusAmount,
    };
  }

  /**
   * Check if a position is in Lunari territory
   * @param {Object} entity - Entity to check
   * @returns {boolean} True if in Lunari territory
   */
  isInLunariTerritory(entity) {
    // If we have territory system, use it
    if (this.game.influenceMap) {
      return (
        this.game.influenceMap.getControllingPlayer(entity.x, entity.y) ===
        this.playerId
      );
    }

    // Without territory system, check if it's near a Lunari building
    if (this.game.entityManager) {
      const nearbyBuildings = this.game.entityManager.getEntitiesInRadius(
        entity.x,
        entity.y,
        20 * this.game.map.gridCellSize, // 20 grid cells radius
        (e) => e.type === "building" && e.owner === this.playerId
      );

      return nearbyBuildings.length > 0;
    }

    return false;
  }

  /**
   * Handle entity creation event
   * @param {Object} data - Event data
   */
  onEntityCreated(data) {
    const entity = data.entity;

    // Only process Lunari entities
    if (entity.owner !== this.playerId) {
      return;
    }

    // Special handling for Moon Stalkers
    if (entity.type === "unit" && entity.unitType === "moonStalker") {
      // Enhance night capabilities
      entity.nightVisionBonus = 0.5; // 50% better vision at night
      entity.nightAttackBonus = 0.25; // 25% more attack at night
      entity.nightStealthBonus = true; // Harder to detect at night

      // Apply current night bonuses if it's night
      if (this.nightTimeCache.isNight) {
        entity.lineOfSight *= 1 + entity.nightVisionBonus;
        entity.attack *= 1 + entity.nightAttackBonus;
      }
    }

    // Special handling for Lunar Observatory
    if (
      entity.type === "building" &&
      entity.buildingType === "lunarObservatory"
    ) {
      // Initialize with correct aura state
      if (entity.aura) {
        entity.aura.active = this.nightTimeCache.isNight;
      }

      // Add Celestial Vision ability
      if (!entity.abilities) {
        entity.abilities = [];
      }

      entity.abilities.push({
        id: "reveal_map",
        name: "Celestial Vision",
        cooldown: 120,
        currentCooldown: 0,
        use: function (game) {
          // Reveal large area of map
          game.map.revealArea(
            entity.x,
            entity.y,
            20 * game.map.gridCellSize, // 20 grid cells radius
            entity.owner,
            15000 // 15 seconds
          );

          // Start cooldown
          this.currentCooldown = this.cooldown;

          // Visual effect
          if (game.renderer) {
            game.renderer.addEffect({
              type: "celestial_vision",
              x: entity.x,
              y: entity.y,
              radius: 20 * game.map.gridCellSize,
              duration: 2000,
            });
          }

          // Sound effect
          if (game.audioSystem) {
            game.audioSystem.playSound("celestial_vision", {
              x: entity.x,
              y: entity.y,
            });
          }
        },
      });
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
      case "resourceNodeDepleted":
        this.handleResourceDepletion(eventData);
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
   * Handle resource depletion event
   * @param {Object} data - Event data
   */
  handleResourceDepletion(data) {
    // Only track if this was a deposit we enhanced
    const depositInfo = this.resourceDepletionTracking.deposits[data.nodeId];
    if (!depositInfo) {
      return;
    }

    // Send notification about the bonus resources
    if (this.game.uiManager) {
      this.game.uiManager.showNotification(
        `Efficient harvesting yielded an additional ${depositInfo.bonusAmount} ${depositInfo.type}!`,
        "resource"
      );
    }

    // Remove from tracking
    delete this.resourceDepletionTracking.deposits[data.nodeId];
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

    // Special case for Moon Shroud
    if (building.buildingType === "moonShroud") {
      // Initialize shroud ability
      if (!building.abilities) {
        building.abilities = [];
      }

      building.abilities.push({
        id: "night_shroud",
        name: "Night Shroud",
        active: this.nightTimeCache.isNight,
        radius: 8,
        effect: "cloak",
      });

      // Apply initial effect if it's night
      if (this.nightTimeCache.isNight) {
        this.applyShroudEffect(building);
      }
    }

    // Special case for Lunar Observatory
    if (building.buildingType === "lunarObservatory") {
      // Update initial aura state
      if (building.aura) {
        building.aura.active = this.nightTimeCache.isNight;
      }
    }
  }

  /**
   * Apply shroud effect to nearby units and buildings
   * @param {Object} shroud - Moon Shroud building
   */
  applyShroudEffect(shroud) {
    if (!this.game.entityManager) {
      return;
    }

    // Find friendly entities in range
    const entities = this.game.entityManager.getEntitiesInRadius(
      shroud.x,
      shroud.y,
      shroud.abilities[0].radius * this.game.map.gridCellSize,
      (entity) => entity.owner === this.playerId
    );

    // Apply cloaking
    for (const entity of entities) {
      entity.isCloaked = true;
      entity.cloakSource = shroud.id;
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
      case "lunar_attunement":
        // Update day/night bonuses to apply new effects
        this.updateDayNightBonuses();
        break;

      case "veil_of_night":
        this.applyVeilOfNight();
        break;

      case "astral_resonance":
        this.applyAstralResonance();
        break;
    }
  }

  /**
   * Apply effects of Veil of Night technology
   */
  applyVeilOfNight() {
    // Get all defensive buildings
    const defensiveBuildings = this.game.entityManager?.getEntitiesByCategories(
      this.playerId,
      "building",
      ["defensive"]
    );

    if (!defensiveBuildings) {
      return;
    }

    // Apply night cloaking ability to each building
    for (const building of defensiveBuildings) {
      // Add cloaking ability
      if (!building.abilities) {
        building.abilities = [];
      }

      building.abilities.push({
        id: "night_cloak",
        name: "Night Cloak",
        active: this.nightTimeCache.isNight,
      });

      // Apply immediately if it's night
      building.isCloaked = this.nightTimeCache.isNight;
    }
  }

  /**
   * Apply effects of Astral Resonance technology
   */
  applyAstralResonance() {
    // Get all lunar observatories
    const observatories = this.game.entityManager?.getEntitiesByType(
      this.playerId,
      "building",
      "lunarObservatory"
    );

    if (!observatories) {
      return;
    }

    // Add resource generation ability to each observatory
    for (const observatory of observatories) {
      if (!observatory.abilities) {
        observatory.abilities = [];
      }

      observatory.abilities.push({
        id: "astral_harvest",
        name: "Astral Harvest",
        active: true,
        effectMultiplier: this.nightTimeCache.isNight ? 1.0 : 0.5,
        generationRate: 0.1, // Base rate per unit
        radius: 12,
        lastHarvestTime: this.game.gameTime,
      });

      // Register for resource generation updates
      if (this.game.resourceManager) {
        // Setup interval for resource generation
        observatory.harvestInterval = setInterval(() => {
          this.generateObservatoryResources(observatory);
        }, 10000); // Check every 10 seconds
      }
    }
  }

  /**
   * Generate resources from a Lunar Observatory with Astral Resonance
   * @param {Object} observatory - Lunar Observatory building
   */
  generateObservatoryResources(observatory) {
    // Skip if not active
    if (
      !observatory.isAlive ||
      !observatory.abilities ||
      !observatory.abilities.find((a) => a.id === "astral_harvest" && a.active)
    ) {
      return;
    }

    const ability = observatory.abilities.find(
      (a) => a.id === "astral_harvest"
    );

    // Count units in radius
    const units = this.game.entityManager.getEntitiesInRadius(
      observatory.x,
      observatory.y,
      ability.radius * this.game.map.gridCellSize,
      (entity) => entity.type === "unit" && entity.owner === this.playerId
    );

    // Calculate resources based on unit count and day/night multiplier
    const unitCount = units.length;
    const baseAmount = unitCount * ability.generationRate;
    const finalAmount = Math.floor(baseAmount * ability.effectMultiplier);

    if (finalAmount > 0) {
      // Add resources
      const resources = ["food", "wood", "gold", "stone", "iron"];
      for (const resource of resources) {
        this.game.resourceManager.addResource(
          this.playerId,
          resource,
          finalAmount
        );
      }

      // Visual effect
      if (this.game.renderer) {
        this.game.renderer.addEffect({
          type: "astral_harvest",
          x: observatory.x,
          y: observatory.y,
          radius: (ability.radius * this.game.map.gridCellSize) / 2,
          duration: 2000,
        });
      }

      // Update last harvest time
      ability.lastHarvestTime = this.game.gameTime;
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

    // Bonus resources when advancing to a new age
    if (data.newAge >= 2) {
      // Iron Age or higher
      // Provide resource boost based on age
      const ageMultiplier = data.newAge - 1;

      // Calculate resource bonuses
      const resources = {
        food: 100 * ageMultiplier,
        wood: 100 * ageMultiplier,
        stone: 50 * ageMultiplier,
        gold: 50 * ageMultiplier,
        iron: 25 * ageMultiplier,
      };

      // Add resources
      if (this.game.resourceManager) {
        for (const resource in resources) {
          this.game.resourceManager.addResource(
            this.playerId,
            resource,
            resources[resource]
          );
        }

        // Notification
        if (this.game.uiManager) {
          this.game.uiManager.showNotification(
            `The wisdom of the ages grants efficiency. Your storehouses fill with additional resources!`,
            "age_advancement"
          );
        }
      }
    }
  }
}
