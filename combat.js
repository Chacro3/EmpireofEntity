/**
 * @fileoverview Combat system for Empires of Eternity
 * Handles combat mechanics including attacks, damage calculation, ranged vs melee,
 * and special abilities. Integrates with the entity and damage-type systems.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

/**
 * CombatSystem handles all combat-related interactions between units and buildings
 */
export class CombatSystem {
  /**
   * Create a new combat system
   * @param {Object} game - Reference to the main game object
   * @param {Object} entityManager - Reference to the entity manager
   */
  constructor(game, entityManager) {
    this.game = game;
    this.entityManager = entityManager;
    this.combatEventQueue = [];
    this.lastCombatTick = 0;

    // Track current battles for statistics and AI decision-making
    this.activeBattles = [];

    // Keep track of damage done by each player for statistics
    this.damageStats = {};
    for (let playerId = 0; playerId < config.MAX_PLAYERS; playerId++) {
      this.damageStats[playerId] = {
        damageDone: 0,
        unitsKilled: 0,
        buildingsDestroyed: 0,
      };
    }
  }

  /**
   * Initialize the combat system
   */
  init() {
    console.log("Combat system initialized");

    // Subscribe to entity events
    this.entityManager.on("entityAttack", this.handleAttackCommand.bind(this));
    this.entityManager.on("entityDeath", this.handleEntityDeath.bind(this));
  }

  /**
   * Update combat state for the current game tick
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Process attack commands and cooldowns
    this.processAttackCooldowns(deltaTime);

    // Process combat events
    this.processCombatEvents();

    // Update active battles
    this.updateActiveBattles();
  }

  /**
   * Process attack cooldowns for all entities
   * @param {number} deltaTime - Time elapsed since last update
   */
  processAttackCooldowns(deltaTime) {
    const allCombatEntities = this.entityManager
      .getAllEntities()
      .filter((entity) => entity.hasAttackCapability);

    allCombatEntities.forEach((entity) => {
      if (entity.attackCooldown > 0) {
        entity.attackCooldown -= deltaTime;

        // Check if cooldown is finished and entity has attack queued
        if (entity.attackCooldown <= 0 && entity.targetEntity) {
          this.executeAttack(entity, entity.targetEntity);
        }
      }
    });
  }

  /**
   * Handle an attack command from a unit or building
   * @param {Object} data - Attack command data
   * @param {Object} data.attacker - Entity initiating the attack
   * @param {Object} data.target - Target entity
   */
  handleAttackCommand(data) {
    const { attacker, target } = data;

    // Validate the attack command
    if (!this.canAttack(attacker, target)) {
      return;
    }

    // Set the attacker's target
    attacker.targetEntity = target;

    // If unit is not in range, move towards the target
    if (!this.isInAttackRange(attacker, target)) {
      // Calculate position to move to that's within attack range
      const movePosition = this.calculateAttackPosition(attacker, target);
      attacker.moveTo(movePosition.x, movePosition.y);
      attacker.state = "moving_to_attack";
    } else {
      // Already in range, attack immediately if no cooldown
      if (attacker.attackCooldown <= 0) {
        this.executeAttack(attacker, target);
      }
    }
  }

  /**
   * Check if an entity can attack another entity
   * @param {Object} attacker - Entity initiating the attack
   * @param {Object} target - Target entity
   * @returns {boolean} True if the attack is valid
   */
  canAttack(attacker, target) {
    // Check if attacker is able to attack (not dead or in a non-attacking state)
    if (!attacker || !attacker.isAlive || !attacker.hasAttackCapability) {
      return false;
    }

    // Check if target exists and is alive
    if (!target || !target.isAlive) {
      return false;
    }

    // Check team - can't attack friendly units unless in special situations
    if (attacker.owner === target.owner) {
      return false;
    }

    // Check if the attacker's attack type can target this entity type
    return this.canTargetEntityType(attacker, target);
  }

  /**
   * Check if attacker can target the given entity type
   * @param {Object} attacker - Entity initiating the attack
   * @param {Object} target - Target entity
   * @returns {boolean} True if the target type is valid
   */
  canTargetEntityType(attacker, target) {
    // Some units can only attack ground or only attack air
    if (attacker.attackType === "ground_only" && target.isAirUnit) {
      return false;
    }

    if (attacker.attackType === "air_only" && !target.isAirUnit) {
      return false;
    }

    // Buildings can't be attacked during construction unless specifically allowed
    if (
      target.type === "building" &&
      target.constructionProgress < 100 &&
      !attacker.canAttackConstructing
    ) {
      return false;
    }

    // Walls and gates have special attack rules
    if (target.type === "wall" && target.isGate && target.isOpen) {
      // Open gates can't be attacked
      return false;
    }

    return true;
  }

  /**
   * Check if an entity is within attack range of another entity
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @returns {boolean} True if in range
   */
  isInAttackRange(attacker, target) {
    // Get the distance between the attacker and target
    const distance = Utils.distance(
      attacker.x + attacker.width / 2,
      attacker.y + attacker.height / 2,
      target.x + target.width / 2,
      target.y + target.height / 2
    );

    // Account for entity sizes by subtracting target radius
    const adjustedDistance = distance - (target.width + target.height) / 4;

    // Compare with attack range
    return adjustedDistance <= attacker.attackRange;
  }

  /**
   * Calculate the optimal position for the attacker to move to for attacking the target
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @returns {Object} Position {x, y} for the attacker to move to
   */
  calculateAttackPosition(attacker, target) {
    // Get the center positions
    const attackerCenterX = attacker.x + attacker.width / 2;
    const attackerCenterY = attacker.y + attacker.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    // Calculate direction from attacker to target
    const dx = targetCenterX - attackerCenterX;
    const dy = targetCenterY - attackerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate position just within attack range
    const attackRange = attacker.attackRange;
    const targetRadius = (target.width + target.height) / 4;
    const desiredDistance = attackRange * 0.8 + targetRadius; // 80% of max range

    // If already closer than 80% of range, don't move closer
    if (distance <= desiredDistance) {
      return { x: attackerCenterX, y: attackerCenterY };
    }

    // Calculate new position at desired distance
    const ratio = desiredDistance / distance;
    const newX = attackerCenterX + dx * ratio - attacker.width / 2;
    const newY = attackerCenterY + dy * ratio - attacker.height / 2;

    return { x: newX, y: newY };
  }

  /**
   * Execute an attack from one entity to another
   * @param {Object} attacker - Entity initiating the attack
   * @param {Object} target - Target entity
   */
  executeAttack(attacker, target) {
    // Validate attack is still valid
    if (
      !this.canAttack(attacker, target) ||
      !this.isInAttackRange(attacker, target)
    ) {
      // Target is no longer valid or in range
      attacker.targetEntity = null;
      attacker.state = "idle";
      return;
    }

    // Set state to attacking
    attacker.state = "attacking";

    // Calculate damage based on attack, defense, and damage types
    const damage = this.calculateDamage(attacker, target);

    // Add attack to combat events queue
    this.combatEventQueue.push({
      type: "attack",
      attacker,
      target,
      damage,
      time: this.game.gameTime,
    });

    // Reset attack cooldown
    attacker.attackCooldown = attacker.attackSpeed;

    // Trigger onAttack for custom effects
    if (attacker.onAttack) {
      attacker.onAttack(target, damage);
    }

    // In some cases, we might want multiple units to attack together
    this.checkForCoordinatedAttacks(attacker, target);
  }

  /**
   * Calculate damage based on attacker's attack value, target's defense, and damage types
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @returns {number} Final damage value
   */
  calculateDamage(attacker, target) {
    // Base damage
    let damage = attacker.attack;

    // Check for bonus damage based on unit type
    if (attacker.bonusDamage) {
      for (const [targetType, bonus] of Object.entries(attacker.bonusDamage)) {
        if (target.categories && target.categories.includes(targetType)) {
          damage += bonus;
        }
      }
    }

    // Apply damage modifiers based on damage type vs armor type
    const damageType = attacker.damageType || "normal";
    const armorType = target.armorType || "normal";

    // Get damage modifier from config based on damage type vs armor type
    const modifier =
      config.DAMAGE_TYPE_MODIFIERS[damageType]?.[armorType] || 1.0;
    damage *= modifier;

    // Apply armor reduction
    damage -= target.armor;

    // Ensure minimum damage of 1
    damage = Math.max(1, Math.round(damage));

    // Randomize damage by ±10% for non-siege units to add variety
    if (attacker.type !== "siege") {
      const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      damage = Math.round(damage * randomFactor);
    }

    // Apply civilization bonuses and effects
    if (attacker.civilization) {
      // Apply attack bonuses from the civilization
      const civBonuses = config.CIVILIZATION_BONUSES[attacker.civilization];
      if (civBonuses && civBonuses.attackBonus) {
        damage *= civBonuses.attackBonus;
      }
    }

    // Apply tech effects
    if (this.game.techManager) {
      damage = this.game.techManager.applyTechEffectsToAttack(
        attacker.owner,
        damage,
        attacker,
        target
      );
    }

    return Math.round(damage);
  }

  /**
   * Process all queued combat events
   */
  processCombatEvents() {
    while (this.combatEventQueue.length > 0) {
      const event = this.combatEventQueue.shift();

      switch (event.type) {
        case "attack":
          this.applyDamage(event.attacker, event.target, event.damage);
          break;

        case "ranged_volley":
          this.processRangedVolley(event);
          break;

        case "special_ability":
          this.processSpecialAbility(event);
          break;
      }
    }
  }

  /**
   * Apply damage to target entity
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @param {number} damage - Amount of damage to apply
   */
  applyDamage(attacker, target, damage) {
    // Check if target is still valid
    if (!target || !target.isAlive) {
      return;
    }

    // Apply damage to target
    target.currentHp -= damage;

    // Track damage for statistics
    if (attacker && attacker.owner !== undefined) {
      this.damageStats[attacker.owner].damageDone += damage;
    }

    // Trigger onDamaged for custom effects
    if (target.onDamaged) {
      target.onDamaged(attacker, damage);
    }

    // Check if target is destroyed
    if (target.currentHp <= 0) {
      this.handleEntityDestroyed(attacker, target);
    } else {
      // If target is a unit and it's not already attacking, it might counterattack
      this.handleCounterAttack(attacker, target);
    }

    // Create visual effect for damage
    this.createDamageEffect(target, damage);

    // Play damage sound
    if (this.game.audioSystem) {
      this.game.audioSystem.playSound(
        target.type === "building" ? "building_damage" : "unit_damage",
        { x: target.x, y: target.y }
      );
    }
  }

  /**
   * Handle counterattack from target to attacker
   * @param {Object} attacker - Original attacking entity
   * @param {Object} target - Target entity that may counterattack
   */
  handleCounterAttack(attacker, target) {
    // Check if target is a unit with attack capability and not already attacking
    if (
      target.type === "unit" &&
      target.hasAttackCapability &&
      target.state !== "attacking" &&
      target.attackCooldown <= 0
    ) {
      // Check if the target can attack back
      if (
        this.canAttack(target, attacker) &&
        this.isInAttackRange(target, attacker)
      ) {
        // Target counterattacks
        target.targetEntity = attacker;
        this.executeAttack(target, attacker);
      }
    }
  }

  /**
   * Handle entity being destroyed
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity that was destroyed
   */
  handleEntityDestroyed(attacker, target) {
    // Update stats
    if (attacker && attacker.owner !== undefined) {
      if (target.type === "unit") {
        this.damageStats[attacker.owner].unitsKilled++;
      } else if (target.type === "building") {
        this.damageStats[attacker.owner].buildingsDestroyed++;
      }
    }

    // Handle special cases
    if (target.type === "wall") {
      // Walls become "breached" instead of destroyed
      target.isBreached = true;
      target.currentHp = 0;

      // Play wall breach sound
      if (this.game.audioSystem) {
        this.game.audioSystem.playSound("wall_breach", {
          x: target.x,
          y: target.y,
        });
      }
    } else {
      // Mark entity as dead and trigger death event
      target.isAlive = false;
      target.state = "dead";

      // Notify entity manager
      this.entityManager.emit("entityDeath", {
        entity: target,
        killer: attacker,
      });

      // Play death sound
      if (this.game.audioSystem) {
        const soundType =
          target.type === "building" ? "building_destroyed" : "unit_death";
        this.game.audioSystem.playSound(soundType, {
          x: target.x,
          y: target.y,
        });
      }

      // Award experience to hero units (if applicable)
      if (attacker && attacker.isHero) {
        this.awardExperienceToHero(attacker, target);
      }
    }

    // Create explosion or death effect
    this.createDeathEffect(target);

    // Check victory conditions
    if (target.type === "wonder" || target.isMainBuilding) {
      this.game.checkVictoryConditions();
    }
  }

  /**
   * Award experience to hero units when they kill enemies
   * @param {Object} hero - Hero unit
   * @param {Object} killedEntity - Entity that was killed
   */
  awardExperienceToHero(hero, killedEntity) {
    if (!hero.experience) {
      hero.experience = 0;
    }

    // Calculate XP based on entity type and level
    let xpValue = 0;

    if (killedEntity.type === "unit") {
      xpValue = killedEntity.level ? killedEntity.level * 10 : 10;

      // Bonus XP for special units
      if (killedEntity.isHero) {
        xpValue *= 5; // Bonus for killing enemy heroes
      } else if (killedEntity.isSiege) {
        xpValue *= 2; // Bonus for killing siege units
      }
    } else if (killedEntity.type === "building") {
      xpValue = 25;

      // Bonus XP for military buildings and wonders
      if (killedEntity.category === "military") {
        xpValue = 40;
      } else if (killedEntity.type === "wonder") {
        xpValue = 200;
      }
    }

    // Add experience
    hero.experience += xpValue;

    // Check for level up
    this.checkHeroLevelUp(hero);
  }

  /**
   * Check if a hero can level up
   * @param {Object} hero - Hero unit
   */
  checkHeroLevelUp(hero) {
    // Get current level
    const currentLevel = hero.level || 1;

    // Calculate XP needed for next level (exponential scaling)
    const xpForNextLevel = 100 * Math.pow(1.5, currentLevel - 1);

    if (hero.experience >= xpForNextLevel) {
      // Level up
      hero.level = currentLevel + 1;
      hero.experience -= xpForNextLevel;

      // Increase stats
      hero.maxHp += 50;
      hero.currentHp = hero.maxHp; // Heal to full
      hero.attack += 5;
      hero.armor += 2;

      // Add ability at specific levels
      if (currentLevel + 1 === 3 || currentLevel + 1 === 5) {
        this.unlockHeroAbility(hero, currentLevel + 1);
      }

      // Visual and sound effects
      this.createLevelUpEffect(hero);

      if (this.game.audioSystem) {
        this.game.audioSystem.playSound("hero_level_up", {
          x: hero.x,
          y: hero.y,
        });
      }

      // Check if hero can level up again
      this.checkHeroLevelUp(hero);
    }
  }

  /**
   * Unlock a new ability for a hero at a specific level
   * @param {Object} hero - Hero unit
   * @param {number} level - New hero level
   */
  unlockHeroAbility(hero, level) {
    // Get hero abilities based on civilization and hero type
    const abilities =
      config.HERO_ABILITIES[hero.civilization]?.[hero.heroType] || [];

    // Find ability for this level
    const newAbility = abilities.find((ability) => ability.level === level);

    if (newAbility) {
      if (!hero.abilities) {
        hero.abilities = [];
      }

      // Add ability to hero
      hero.abilities.push({
        id: newAbility.id,
        name: newAbility.name,
        cooldown: 0,
        maxCooldown: newAbility.cooldown,
      });

      // Notify UI
      if (this.game.uiManager && hero.owner === this.game.currentPlayer) {
        this.game.uiManager.showNewAbilityNotification(hero, newAbility);
      }
    }
  }

  /**
   * Process a ranged volley attack (for archers and other ranged units)
   * @param {Object} event - Ranged volley event data
   */
  processRangedVolley(event) {
    const { attacker, targets, baseDamage, time } = event;

    // Apply damage to all targets with reduced damage for secondary targets
    targets.forEach((target, index) => {
      // First target takes full damage, others take reduced damage
      const damageReduction = index === 0 ? 1 : 0.5;
      const damage = Math.round(baseDamage * damageReduction);

      this.applyDamage(attacker, target, damage);
    });
  }

  /**
   * Process a special ability effect
   * @param {Object} event - Special ability event data
   */
  processSpecialAbility(event) {
    const { caster, abilityId, targets, position } = event;

    // Get ability definition
    const ability = config.ABILITIES[abilityId];
    if (!ability) return;

    // Apply ability effects based on type
    switch (ability.type) {
      case "damage":
        // Damage all targets in area
        targets.forEach((target) => {
          const damage = this.calculateAbilityDamage(caster, target, ability);
          this.applyDamage(caster, target, damage);
        });
        break;

      case "heal":
        // Heal all targets in area
        targets.forEach((target) => {
          const healAmount = ability.baseValue;
          target.currentHp = Math.min(
            target.maxHp,
            target.currentHp + healAmount
          );
          this.createHealEffect(target, healAmount);
        });
        break;

      case "buff":
        // Apply buff to all targets
        targets.forEach((target) => {
          this.applyBuff(target, ability);
        });
        break;

      case "debuff":
        // Apply debuff to all targets
        targets.forEach((target) => {
          this.applyDebuff(target, ability);
        });
        break;
    }

    // Set ability cooldown
    const abilityIndex = caster.abilities.findIndex((a) => a.id === abilityId);
    if (abilityIndex !== -1) {
      caster.abilities[abilityIndex].cooldown = ability.cooldown;
    }

    // Create visual effect
    this.createAbilityEffect(ability, position, targets);

    // Play sound effect
    if (this.game.audioSystem && ability.sound) {
      this.game.audioSystem.playSound(ability.sound, position);
    }
  }

  /**
   * Calculate damage for a special ability
   * @param {Object} caster - Entity casting the ability
   * @param {Object} target - Target entity
   * @param {Object} ability - Ability definition
   * @returns {number} Final damage value
   */
  calculateAbilityDamage(caster, target, ability) {
    let damage = ability.baseValue;

    // Some abilities scale with caster's attack or level
    if (ability.attackScaling && caster.attack) {
      damage += caster.attack * ability.attackScaling;
    }

    if (ability.levelScaling && caster.level) {
      damage += caster.level * ability.levelScaling;
    }

    // Apply resistance reductions
    if (target.magicResistance && ability.damageType === "magic") {
      damage *= 1 - target.magicResistance / 100;
    }

    return Math.round(damage);
  }

  /**
   * Apply a buff effect to a target
   * @param {Object} target - Target entity
   * @param {Object} buff - Buff definition
   */
  applyBuff(target, buff) {
    // Initialize buffs array if needed
    if (!target.buffs) {
      target.buffs = [];
    }

    // Create buff instance
    const buffInstance = {
      id: buff.id,
      name: buff.name,
      duration: buff.duration,
      effects: { ...buff.effects },
    };

    // Apply immediate effects
    Object.entries(buff.effects).forEach(([stat, value]) => {
      if (stat === "attackBonus") {
        target.attack *= 1 + value / 100;
      } else if (stat === "armorBonus") {
        target.armor += value;
      } else if (stat === "speedBonus") {
        target.speed *= 1 + value / 100;
      } else if (stat === "healthRegen") {
        // Health regen is applied over time
      }
    });

    // Add buff to target
    target.buffs.push(buffInstance);

    // Create visual effect
    this.createBuffEffect(target, buff);
  }

  /**
   * Apply a debuff effect to a target
   * @param {Object} target - Target entity
   * @param {Object} debuff - Debuff definition
   */
  applyDebuff(target, debuff) {
    // Initialize debuffs array if needed
    if (!target.debuffs) {
      target.debuffs = [];
    }

    // Create debuff instance
    const debuffInstance = {
      id: debuff.id,
      name: debuff.name,
      duration: debuff.duration,
      effects: { ...debuff.effects },
    };

    // Apply immediate effects
    Object.entries(debuff.effects).forEach(([stat, value]) => {
      if (stat === "attackReduction") {
        target.attack *= 1 - value / 100;
      } else if (stat === "armorReduction") {
        target.armor = Math.max(0, target.armor - value);
      } else if (stat === "slowAmount") {
        target.speed *= 1 - value / 100;
      } else if (stat === "damageOverTime") {
        // DoT is applied over time
      }
    });

    // Add debuff to target
    target.debuffs.push(debuffInstance);

    // Create visual effect
    this.createDebuffEffect(target, debuff);
  }

  /**
   * Create visual effect for damage
   * @param {Object} target - Target entity
   * @param {number} damage - Amount of damage
   */
  createDamageEffect(target, damage) {
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "damage_text",
        x: target.x + target.width / 2,
        y: target.y,
        value: damage,
        duration: 1000,
      });

      this.game.renderer.addEffect({
        type: "damage_flash",
        entity: target,
        duration: 200,
      });
    }
  }

  /**
   * Create heal effect
   * @param {Object} target - Target entity
   * @param {number} amount - Amount healed
   */
  createHealEffect(target, amount) {
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "heal_text",
        x: target.x + target.width / 2,
        y: target.y,
        value: amount,
        duration: 1000,
      });

      this.game.renderer.addEffect({
        type: "heal_glow",
        entity: target,
        duration: 500,
      });
    }
  }

  /**
   * Create death effect
   * @param {Object} entity - Entity that was destroyed
   */
  createDeathEffect(entity) {
    if (!this.game.renderer) return;

    if (entity.type === "building") {
      this.game.renderer.addEffect({
        type: "building_collapse",
        x: entity.x,
        y: entity.y,
        width: entity.width,
        height: entity.height,
        duration: 2000,
      });
    } else if (entity.type === "unit") {
      this.game.renderer.addEffect({
        type: "unit_death",
        x: entity.x,
        y: entity.y,
        unitType: entity.unitType,
        duration: 1500,
      });
    }
  }

  /**
   * Create level up effect
   * @param {Object} hero - Hero that leveled up
   */
  createLevelUpEffect(hero) {
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "level_up",
        entity: hero,
        duration: 2000,
      });
    }
  }

  /**
   * Create ability effect
   * @param {Object} ability - Ability definition
   * @param {Object} position - Position of the effect
   * @param {Array} targets - Affected targets
   */
  createAbilityEffect(ability, position, targets) {
    if (!this.game.renderer) return;

    this.game.renderer.addEffect({
      type: "ability_cast",
      x: position.x,
      y: position.y,
      abilityId: ability.id,
      radius: ability.radius,
      duration: ability.effectDuration || 1000,
      targets,
    });
  }

  /**
   * Create buff effect
   * @param {Object} target - Target entity
   * @param {Object} buff - Buff definition
   */
  createBuffEffect(target, buff) {
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "buff",
        entity: target,
        buffId: buff.id,
        duration: buff.duration,
      });
    }
  }

  /**
   * Create debuff effect
   * @param {Object} target - Target entity
   * @param {Object} debuff - Debuff definition
   */
  createDebuffEffect(target, debuff) {
    if (this.game.renderer) {
      this.game.renderer.addEffect({
        type: "debuff",
        entity: target,
        debuffId: debuff.id,
        duration: debuff.duration,
      });
    }
  }

  /**
   * Check for coordinated attacks when units are in formation
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   */
  checkForCoordinatedAttacks(attacker, target) {
    // Only handle coordinated attacks for units in formation
    if (attacker.type !== "unit" || !attacker.formation) {
      return;
    }

    // Get formation units that are also ready to attack
    const formationUnits = this.entityManager.getEntitiesByFormation(
      attacker.formation
    );

    formationUnits.forEach((unit) => {
      // Skip the original attacker and units that aren't ready
      if (unit.id === attacker.id || unit.attackCooldown > 0) {
        return;
      }

      // Check if unit can attack the target and is in range
      if (this.canAttack(unit, target) && this.isInAttackRange(unit, target)) {
        // Set the target and execute attack
        unit.targetEntity = target;
        this.executeAttack(unit, target);
      }
    });
  }

  /**
   * Handle entity death events
   * @param {Object} data - Death event data
   */
  handleEntityDeath(data) {
    const { entity, killer } = data;

    // Clear any entities that were targeting this entity
    this.entityManager.getAllEntities().forEach((otherEntity) => {
      if (
        otherEntity.targetEntity &&
        otherEntity.targetEntity.id === entity.id
      ) {
        otherEntity.targetEntity = null;

        // Return to idle state if attacking this entity
        if (otherEntity.state === "attacking") {
          otherEntity.state = "idle";
        }
      }
    });

    // Update active battles
    this.updateActiveBattlesOnDeath(entity);
  }

  /**
   * Update active battles information
   */
  updateActiveBattles() {
    // Check for new battles
    this.detectNewBattles();

    // Update existing battles
    this.activeBattles = this.activeBattles.filter((battle) => {
      // Update battle duration
      battle.duration = this.game.gameTime - battle.startTime;

      // Check if battle is still active
      const hasActiveUnits = battle.units.some((unitId) => {
        const unit = this.entityManager.getEntityById(unitId);
        return (
          unit &&
          unit.isAlive &&
          (unit.state === "attacking" || unit.state === "moving_to_attack")
        );
      });

      return hasActiveUnits && battle.duration < 60000; // End battle after 60 seconds of no activity
    });
  }

  /**
   * Detect new battles by looking for clusters of combat activity
   */
  detectNewBattles() {
    const combatUnits = this.entityManager
      .getAllEntities()
      .filter(
        (entity) =>
          entity.type === "unit" &&
          entity.isAlive &&
          (entity.state === "attacking" || entity.state === "moving_to_attack")
      );

    // Group nearby combat units into potential battles
    const potentialBattles = [];

    combatUnits.forEach((unit) => {
      // Check if this unit is already part of a detected battle
      const isInBattle = this.activeBattles.some((battle) =>
        battle.units.includes(unit.id)
      );

      if (isInBattle) return;

      // Check if unit is near an existing potential battle
      let addedToBattle = false;

      for (const battle of potentialBattles) {
        // Calculate distance to battle center
        const dx = unit.x - battle.centerX;
        const dy = unit.y - battle.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.BATTLE_DETECTION_RADIUS) {
          // Add unit to this battle
          battle.units.push(unit.id);

          // Update battle center and team counts
          battle.centerX =
            (battle.centerX * battle.unitCount + unit.x) /
            (battle.unitCount + 1);
          battle.centerY =
            (battle.centerY * battle.unitCount + unit.y) /
            (battle.unitCount + 1);
          battle.unitCount++;

          if (unit.owner === 0) {
            battle.playerUnits++;
          } else {
            battle.enemyUnits++;
          }

          addedToBattle = true;
          break;
        }
      }

      // If not added to any existing battle, create a new one
      if (!addedToBattle) {
        potentialBattles.push({
          centerX: unit.x,
          centerY: unit.y,
          units: [unit.id],
          unitCount: 1,
          playerUnits: unit.owner === 0 ? 1 : 0,
          enemyUnits: unit.owner !== 0 ? 1 : 0,
        });
      }
    });

    // Filter potential battles with multiple teams and sufficient units
    potentialBattles.forEach((battle) => {
      if (
        battle.playerUnits > 0 &&
        battle.enemyUnits > 0 &&
        battle.unitCount >= 4
      ) {
        // Check if this is part of an existing battle
        const existingBattle = this.activeBattles.find((existing) => {
          const dx = existing.centerX - battle.centerX;
          const dy = existing.centerY - battle.centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < config.BATTLE_DETECTION_RADIUS * 2;
        });

        if (existingBattle) {
          // Merge with existing battle
          battle.units.forEach((unitId) => {
            if (!existingBattle.units.includes(unitId)) {
              existingBattle.units.push(unitId);
            }
          });
        } else {
          // Create new battle
          this.activeBattles.push({
            id: "battle_" + this.game.gameTime,
            startTime: this.game.gameTime,
            duration: 0,
            centerX: battle.centerX,
            centerY: battle.centerY,
            units: battle.units,
            playerUnits: battle.playerUnits,
            enemyUnits: battle.enemyUnits,
          });

          // Notify of new battle for alerts
          this.game.alertSystem?.addAlert({
            type: "battle",
            message: "A battle has started!",
            x: battle.centerX,
            y: battle.centerY,
            priority: "high",
          });
        }
      }
    });
  }

  /**
   * Update active battles when an entity dies
   * @param {Object} entity - Entity that died
   */
  updateActiveBattlesOnDeath(entity) {
    this.activeBattles.forEach((battle) => {
      // Remove entity from battle
      const unitIndex = battle.units.indexOf(entity.id);
      if (unitIndex !== -1) {
        battle.units.splice(unitIndex, 1);

        // Update player/enemy unit counts
        if (entity.owner === 0) {
          battle.playerUnits--;
        } else {
          battle.enemyUnits--;
        }
      }
    });
  }

  /**
   * Get combat statistics for a player
   * @param {number} playerId - Player ID
   * @returns {Object} Combat statistics
   */
  getPlayerCombatStats(playerId) {
    return this.damageStats[playerId];
  }
}
