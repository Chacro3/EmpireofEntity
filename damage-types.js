/**
 * @fileoverview Damage type system for Empires of Eternity
 * Handles all damage types, armor types, and their interactions in combat.
 * Provides modifiers for different damage/armor type combinations.
 */

import { config } from "../config.js";

/**
 * DamageTypeSystem manages all damage types and their effectiveness against different armor types
 */
export class DamageTypeSystem {
  /**
   * Create a new damage type system
   * @param {Object} game - Reference to the main game object
   */
  constructor(game) {
    this.game = game;

    // Define the damage types and their descriptions
    this.damageTypes = {
      normal: {
        name: "Normal",
        description: "Standard damage with no special properties",
        icon: "normal_damage",
      },
      pierce: {
        name: "Pierce",
        description:
          "Effective against light armor, less effective against heavy armor",
        icon: "pierce_damage",
      },
      slash: {
        name: "Slash",
        description:
          "Effective against unarmored targets, less effective against armored targets",
        icon: "slash_damage",
      },
      crush: {
        name: "Crush",
        description:
          "Effective against heavy armor and buildings, less effective against light armor",
        icon: "crush_damage",
      },
      siege: {
        name: "Siege",
        description:
          "Very effective against buildings, less effective against mobile units",
        icon: "siege_damage",
      },
      magic: {
        name: "Magic",
        description:
          "Ignores some armor, effective against all targets but reduced by magic resistance",
        icon: "magic_damage",
      },
      fire: {
        name: "Fire",
        description:
          "Does damage over time, effective against wooden structures and crowds",
        icon: "fire_damage",
      },
      nature: {
        name: "Nature",
        description:
          "Poisons targets, effective against organic units, less effective against structures",
        icon: "nature_damage",
      },
      holy: {
        name: "Holy",
        description:
          "Effective against dark units, less effective against light units",
        icon: "holy_damage",
        specialEffect: "bonus_vs_dark",
      },
      dark: {
        name: "Dark",
        description:
          "Effective against light units, less effective against dark units",
        icon: "dark_damage",
        specialEffect: "bonus_vs_light",
      },
    };

    // Define armor types and their descriptions
    this.armorTypes = {
      unarmored: {
        name: "Unarmored",
        description: "No protection, vulnerable to all damage types",
        icon: "unarmored",
      },
      light: {
        name: "Light Armor",
        description: "Provides modest protection, vulnerable to pierce damage",
        icon: "light_armor",
      },
      medium: {
        name: "Medium Armor",
        description: "Balanced protection against most damage types",
        icon: "medium_armor",
      },
      heavy: {
        name: "Heavy Armor",
        description: "Strong protection, vulnerable to crush damage",
        icon: "heavy_armor",
      },
      fortified: {
        name: "Fortified",
        description:
          "Very strong protection used by buildings, vulnerable to siege damage",
        icon: "fortified",
      },
      magic: {
        name: "Magic Barrier",
        description:
          "Protection against magic damage, less effective against physical damage",
        icon: "magic_barrier",
      },
      light_aligned: {
        name: "Light Aligned",
        description: "Resistant to holy damage, vulnerable to dark damage",
        icon: "light_aligned",
      },
      dark_aligned: {
        name: "Dark Aligned",
        description: "Resistant to dark damage, vulnerable to holy damage",
        icon: "dark_aligned",
      },
    };

    // Damage type effectiveness against different armor types
    // Values > 1.0 mean the damage is more effective, < 1.0 mean less effective
    this.damageModifiers = {
      normal: {
        unarmored: 1.0,
        light: 1.0,
        medium: 0.9,
        heavy: 0.8,
        fortified: 0.7,
        magic: 1.0,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      pierce: {
        unarmored: 1.2,
        light: 1.5,
        medium: 1.0,
        heavy: 0.7,
        fortified: 0.5,
        magic: 1.0,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      slash: {
        unarmored: 1.5,
        light: 1.2,
        medium: 1.0,
        heavy: 0.8,
        fortified: 0.6,
        magic: 1.0,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      crush: {
        unarmored: 1.1,
        light: 0.8,
        medium: 1.1,
        heavy: 1.3,
        fortified: 1.1,
        magic: 1.0,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      siege: {
        unarmored: 0.75,
        light: 0.75,
        medium: 0.75,
        heavy: 0.9,
        fortified: 2.0,
        magic: 0.5,
        light_aligned: 0.75,
        dark_aligned: 0.75,
      },
      magic: {
        unarmored: 1.2,
        light: 1.1,
        medium: 1.1,
        heavy: 1.1,
        fortified: 0.8,
        magic: 0.5,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      fire: {
        unarmored: 1.3,
        light: 1.1,
        medium: 1.0,
        heavy: 0.9,
        fortified: 1.2, // Effective vs wooden structures
        magic: 0.7,
        light_aligned: 1.2,
        dark_aligned: 0.8,
      },
      nature: {
        unarmored: 1.3,
        light: 1.1,
        medium: 1.0,
        heavy: 0.9,
        fortified: 0.6,
        magic: 0.8,
        light_aligned: 1.0,
        dark_aligned: 1.0,
      },
      holy: {
        unarmored: 1.0,
        light: 1.0,
        medium: 1.0,
        heavy: 1.0,
        fortified: 0.8,
        magic: 1.2,
        light_aligned: 0.6,
        dark_aligned: 1.5,
      },
      dark: {
        unarmored: 1.0,
        light: 1.0,
        medium: 1.0,
        heavy: 1.0,
        fortified: 0.8,
        magic: 1.2,
        light_aligned: 1.5,
        dark_aligned: 0.6,
      },
    };

    // Special effects that can be applied by certain damage types
    this.specialEffects = {
      fire_damage_over_time: {
        name: "Burning",
        description: "Target takes fire damage over time",
        duration: 5000, // 5 seconds
        tickInterval: 1000, // 1 second
        damagePerTick: 3,
        icon: "effect_burning",
      },
      nature_poison: {
        name: "Poisoned",
        description: "Target takes poison damage over time and moves slower",
        duration: 8000, // 8 seconds
        tickInterval: 2000, // 2 seconds
        damagePerTick: 2,
        speedReduction: 0.2, // 20% slower
        icon: "effect_poisoned",
      },
      magic_arcane_surge: {
        name: "Arcane Surge",
        description: "Target takes increased magic damage",
        duration: 10000, // 10 seconds
        magicVulnerability: 0.3, // 30% more magic damage
        icon: "effect_arcane_surge",
      },
      holy_illumination: {
        name: "Illumination",
        description:
          "Dark units take more damage and cannot use special abilities",
        duration: 12000, // 12 seconds
        damageIncrease: 0.25, // 25% more damage
        disableAbilities: true,
        icon: "effect_illumination",
      },
      dark_corruption: {
        name: "Corruption",
        description: "Light units take more damage and have reduced healing",
        duration: 12000, // 12 seconds
        damageIncrease: 0.25, // 25% more damage
        healingReduction: 0.5, // 50% less healing
        icon: "effect_corruption",
      },
      crush_stun: {
        name: "Stunned",
        description: "Target is stunned and cannot move or attack",
        duration: 1500, // 1.5 seconds
        canMove: false,
        canAttack: false,
        icon: "effect_stunned",
      },
      pierce_bleeding: {
        name: "Bleeding",
        description: "Target takes damage over time",
        duration: 6000, // 6 seconds
        tickInterval: 1000, // 1 second
        damagePerTick: 2,
        icon: "effect_bleeding",
      },
    };

    // Determine which damage types have a chance to apply special effects
    this.effectChances = {
      fire: {
        effect: "fire_damage_over_time",
        chance: 0.3, // 30% chance
      },
      nature: {
        effect: "nature_poison",
        chance: 0.25, // 25% chance
      },
      magic: {
        effect: "magic_arcane_surge",
        chance: 0.2, // 20% chance
      },
      holy: {
        effect: "holy_illumination",
        chance: 0.2, // 20% chance
      },
      dark: {
        effect: "dark_corruption",
        chance: 0.2, // 20% chance
      },
      crush: {
        effect: "crush_stun",
        chance: 0.15, // 15% chance
      },
      pierce: {
        effect: "pierce_bleeding",
        chance: 0.2, // 20% chance
      },
    };
  }

  /**
   * Initialize the damage type system
   */
  init() {
    console.log("Damage type system initialized");
  }

  /**
   * Get the modifier for a specific damage type against an armor type
   * @param {string} damageType - Type of damage
   * @param {string} armorType - Type of armor
   * @returns {number} Damage modifier (multiplier)
   */
  getModifier(damageType, armorType) {
    // Default to normal damage and unarmored if types don't exist
    const damage =
      this.damageModifiers[damageType] || this.damageModifiers.normal;
    const modifier = damage[armorType] || damage.unarmored;

    return modifier;
  }

  /**
   * Get information about a damage type
   * @param {string} damageType - Type of damage
   * @returns {Object} Damage type information
   */
  getDamageTypeInfo(damageType) {
    return this.damageTypes[damageType] || this.damageTypes.normal;
  }

  /**
   * Get information about an armor type
   * @param {string} armorType - Type of armor
   * @returns {Object} Armor type information
   */
  getArmorTypeInfo(armorType) {
    return this.armorTypes[armorType] || this.armorTypes.unarmored;
  }

  /**
   * Calculate if a special effect should be applied based on damage type
   * @param {string} damageType - Type of damage
   * @returns {Object|null} Effect to apply, or null if no effect
   */
  calculateSpecialEffect(damageType) {
    const effectData = this.effectChances[damageType];

    // If this damage type has no special effects, return null
    if (!effectData) {
      return null;
    }

    // Roll for chance to apply effect
    const roll = Math.random();
    if (roll <= effectData.chance) {
      // Get the effect details
      const effect = this.specialEffects[effectData.effect];

      // Return effect with an instance ID and start time
      return {
        id: effectData.effect,
        name: effect.name,
        description: effect.description,
        duration: effect.duration,
        startTime: this.game.gameTime,
        ...effect,
      };
    }

    return null;
  }

  /**
   * Apply a special effect to an entity
   * @param {Object} entity - Entity to apply effect to
   * @param {Object} effect - Effect data
   */
  applySpecialEffect(entity, effect) {
    // Initialize effects array if it doesn't exist
    if (!entity.activeEffects) {
      entity.activeEffects = [];
    }

    // Check if entity already has this effect
    const existingEffect = entity.activeEffects.find((e) => e.id === effect.id);

    if (existingEffect) {
      // Refresh the duration
      existingEffect.startTime = this.game.gameTime;
    } else {
      // Add the new effect
      entity.activeEffects.push({
        ...effect,
        lastTickTime: this.game.gameTime, // For DoT effects
      });

      // Apply immediate effects
      this.applyEffectImpact(entity, effect);

      // Add visual effect
      if (this.game.renderer) {
        this.game.renderer.addEffect({
          type: "status_effect",
          entity: entity,
          effectId: effect.id,
          duration: effect.duration,
        });
      }

      // Play sound effect
      if (this.game.audioSystem) {
        this.game.audioSystem.playSound(`effect_${effect.id}`, {
          x: entity.x,
          y: entity.y,
        });
      }
    }
  }

  /**
   * Apply immediate impact of an effect to an entity
   * @param {Object} entity - Entity to apply effect to
   * @param {Object} effect - Effect data
   */
  applyEffectImpact(entity, effect) {
    // Apply stat changes
    if (effect.speedReduction) {
      entity.speedMultiplier = entity.speedMultiplier || 1;
      entity.speedMultiplier *= 1 - effect.speedReduction;
    }

    if (effect.magicVulnerability) {
      entity.magicResistance = entity.magicResistance || 0;
      entity.magicResistance -= effect.magicVulnerability * 100;
    }

    if (effect.canMove === false) {
      entity.canMove = false;
    }

    if (effect.canAttack === false) {
      entity.canAttack = false;
    }

    if (effect.disableAbilities) {
      entity.abilitiesDisabled = true;
    }
  }

  /**
   * Remove a special effect from an entity
   * @param {Object} entity - Entity to remove effect from
   * @param {Object} effect - Effect to remove
   */
  removeSpecialEffect(entity, effect) {
    if (!entity.activeEffects) return;

    // Find the effect
    const index = entity.activeEffects.findIndex((e) => e.id === effect.id);

    if (index !== -1) {
      const removedEffect = entity.activeEffects[index];

      // Remove the effect
      entity.activeEffects.splice(index, 1);

      // Undo stat changes
      if (removedEffect.speedReduction) {
        entity.speedMultiplier /= 1 - removedEffect.speedReduction;
      }

      if (removedEffect.magicVulnerability) {
        entity.magicResistance += removedEffect.magicVulnerability * 100;
      }

      if (removedEffect.canMove === false) {
        entity.canMove = true;
      }

      if (removedEffect.canAttack === false) {
        entity.canAttack = true;
      }

      if (removedEffect.disableAbilities) {
        entity.abilitiesDisabled = false;
      }

      // Add visual effect for effect expiration
      if (this.game.renderer) {
        this.game.renderer.addEffect({
          type: "effect_expire",
          entity: entity,
          effectId: effect.id,
          duration: 1000,
        });
      }
    }
  }

  /**
   * Update all active effects on entities
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    const currentTime = this.game.gameTime;

    // Get all entities with active effects
    const entities = this.game.entityManager
      .getAllEntities()
      .filter(
        (entity) => entity.activeEffects && entity.activeEffects.length > 0
      );

    // Update effects for each entity
    entities.forEach((entity) => {
      const expiredEffects = [];

      // Check each effect
      entity.activeEffects.forEach((effect) => {
        // Check if effect has expired
        if (currentTime - effect.startTime >= effect.duration) {
          expiredEffects.push(effect);
          return;
        }

        // Apply periodic damage for DoT effects
        if (effect.damagePerTick && effect.tickInterval) {
          if (currentTime - effect.lastTickTime >= effect.tickInterval) {
            // Apply tick damage
            entity.currentHp -= effect.damagePerTick;
            effect.lastTickTime = currentTime;

            // Create damage number visual
            if (this.game.renderer) {
              this.game.renderer.addEffect({
                type: "damage_text",
                x: entity.x + entity.width / 2,
                y: entity.y,
                value: effect.damagePerTick,
                effectType: effect.id,
                duration: 1000,
              });
            }

            // Check if entity was killed by the effect
            if (entity.currentHp <= 0 && entity.isAlive) {
              entity.isAlive = false;
              this.game.entityManager.emit("entityDeath", {
                entity: entity,
                killer: null,
              });
            }
          }
        }
      });

      // Remove expired effects
      expiredEffects.forEach((effect) => {
        this.removeSpecialEffect(entity, effect);
      });
    });
  }

  /**
   * Get all possible armor types
   * @returns {Array} List of armor type ids
   */
  getAllArmorTypes() {
    return Object.keys(this.armorTypes);
  }

  /**
   * Get all possible damage types
   * @returns {Array} List of damage type ids
   */
  getAllDamageTypes() {
    return Object.keys(this.damageTypes);
  }

  /**
   * Get detailed comparison of damage types vs armor types
   * @returns {Object} Matrix of damage type effectiveness
   */
  getDamageComparisonMatrix() {
    const damageTypes = this.getAllDamageTypes();
    const armorTypes = this.getAllArmorTypes();

    const matrix = {};

    damageTypes.forEach((damageType) => {
      matrix[damageType] = {};

      armorTypes.forEach((armorType) => {
        matrix[damageType][armorType] = this.getModifier(damageType, armorType);
      });
    });

    return matrix;
  }

  /**
   * Get the best damage type against a specific armor type
   * @param {string} armorType - Type of armor
   * @returns {string} Best damage type to use
   */
  getBestDamageType(armorType) {
    const damageTypes = this.getAllDamageTypes();
    let bestType = "normal";
    let bestModifier = 0;

    damageTypes.forEach((damageType) => {
      const modifier = this.getModifier(damageType, armorType);
      if (modifier > bestModifier) {
        bestModifier = modifier;
        bestType = damageType;
      }
    });

    return bestType;
  }

  /**
   * Get the weakest armor type against a specific damage type
   * @param {string} damageType - Type of damage
   * @returns {string} Most vulnerable armor type
   */
  getWeakestArmorType(damageType) {
    const armorTypes = this.getAllArmorTypes();
    let weakestType = "unarmored";
    let highestModifier = 0;

    armorTypes.forEach((armorType) => {
      const modifier = this.getModifier(damageType, armorType);
      if (modifier > highestModifier) {
        highestModifier = modifier;
        weakestType = armorType;
      }
    });

    return weakestType;
  }

  /**
   * Create a tooltip text showing damage effectiveness
   * @param {string} damageType - Type of damage
   * @param {string} armorType - Type of armor
   * @returns {string} Formatted tooltip text
   */
  getDamageEffectivenessTooltip(damageType, armorType) {
    const modifier = this.getModifier(damageType, armorType);
    const percentage = Math.round(modifier * 100);

    let effectivenessText;
    if (modifier >= 1.5) {
      effectivenessText = "Very Effective";
    } else if (modifier >= 1.2) {
      effectivenessText = "Effective";
    } else if (modifier >= 0.8) {
      effectivenessText = "Normal";
    } else if (modifier >= 0.5) {
      effectivenessText = "Ineffective";
    } else {
      effectivenessText = "Very Ineffective";
    }

    return `${this.damageTypes[damageType].name} vs ${this.armorTypes[armorType].name}: ${percentage}% damage (${effectivenessText})`;
  }
}
