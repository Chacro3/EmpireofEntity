/**
 * @fileoverview Formation system for Empires of Eternity
 * Handles military unit formations, movement patterns, and formation bonuses.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

/**
 * FormationSystem manages all military unit formations
 */
export class FormationSystem {
  /**
   * Create a new formation system
   * @param {Object} game - Reference to the main game object
   * @param {Object} entityManager - Reference to the entity manager
   */
  constructor(game, entityManager) {
    this.game = game;
    this.entityManager = entityManager;

    // Track all active formations
    this.activeFormations = {};
    this.nextFormationId = 1;

    // Define available formation types
    this.formationTypes = {
      line: {
        name: "Line",
        description:
          "Units form a horizontal line. Effective for holding position and absorbing charges.",
        icon: "formation_line",
        bonuses: {
          armor: 1,
          attackRange: 1,
        },
        unitSpacing: 1.2, // Multiplier for spacing between units
        defaultFacing: "down",
        speedMatching: true, // All units move at the speed of the slowest unit
      },
      column: {
        name: "Column",
        description:
          "Units form a vertical column. Good for rapid movement through narrow areas.",
        icon: "formation_column",
        bonuses: {
          speed: 0.1, // 10% speed bonus
          turnRate: 0.2, // 20% faster turning
        },
        unitSpacing: 1.0,
        defaultFacing: "down",
        speedMatching: true,
      },
      wedge: {
        name: "Wedge",
        description:
          "Units form a V-shape. Excellent for breaking through enemy lines.",
        icon: "formation_wedge",
        bonuses: {
          attack: 1,
          chargeBonus: 0.2, // 20% more damage on initial attack
        },
        unitSpacing: 1.1,
        defaultFacing: "down",
        speedMatching: true,
      },
      square: {
        name: "Square",
        description:
          "Units form a defensive square. Provides strong defense from all sides.",
        icon: "formation_square",
        bonuses: {
          armor: 2,
          speed: -0.1, // 10% speed reduction
        },
        unitSpacing: 0.9,
        defaultFacing: "out", // Units face outward
        speedMatching: true,
      },
      circle: {
        name: "Circle",
        description:
          "Units form a circle. Good for protecting weaker units in the center.",
        icon: "formation_circle",
        bonuses: {
          armor: 1,
          attackRange: 1,
        },
        unitSpacing: 1.0,
        defaultFacing: "out",
        speedMatching: true,
      },
      scatter: {
        name: "Scattered",
        description: "Units spread out. Effective against area damage attacks.",
        icon: "formation_scatter",
        bonuses: {
          areaResistance: 0.3, // 30% less damage from area effects
        },
        unitSpacing: 2.0,
        defaultFacing: "down",
        speedMatching: false, // Units move at their own speed
      },
      skirmish: {
        name: "Skirmish",
        description:
          "Units maintain distance from enemies. Good for ranged units.",
        icon: "formation_skirmish",
        bonuses: {
          attackRange: 2,
          retreatOnClose: true, // Units automatically back away when enemies get too close
        },
        unitSpacing: 1.5,
        defaultFacing: "down",
        speedMatching: false,
      },
      staggered: {
        name: "Staggered",
        description:
          "Units arrange in staggered lines. Balanced formation for mixed units.",
        icon: "formation_staggered",
        bonuses: {
          attackRate: 0.1, // 10% faster attacks
          lineOfSight: 1, // +1 vision range
        },
        unitSpacing: 1.3,
        defaultFacing: "down",
        speedMatching: true,
      },
    };
  }

  /**
   * Initialize the formation system
   */
  init() {
    console.log("Formation system initialized");

    // Listen for entity death events to update formations
    this.entityManager.on("entityDeath", this.handleEntityDeath.bind(this));
  }

  /**
   * Update all active formations
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    // Update each active formation
    Object.values(this.activeFormations).forEach((formation) => {
      this.updateFormation(formation, deltaTime);
    });
  }

  /**
   * Create a new formation with the given units and type
   * @param {Array} units - Array of unit entities to add to the formation
   * @param {string} formationType - Type of formation
   * @param {number} playerId - ID of the player who owns the formation
   * @returns {Object} The created formation
   */
  createFormation(units, formationType, playerId) {
    // Validate formation type
    if (!this.formationTypes[formationType]) {
      formationType = "line"; // Default to line formation
    }

    // Filter units to ensure they're valid and belong to the player
    const validUnits = units.filter((unit) => {
      return (
        unit &&
        unit.type === "unit" &&
        unit.isAlive &&
        unit.owner === playerId &&
        !unit.isBuilder
      ); // Don't put villagers in military formations
    });

    if (validUnits.length === 0) {
      return null;
    }

    // Create formation ID
    const formationId = `f_${this.nextFormationId++}`;

    // Get formation configuration
    const formationConfig = this.formationTypes[formationType];

    // Create the formation object
    const formation = {
      id: formationId,
      type: formationType,
      units: validUnits.map((unit) => unit.id),
      leader: validUnits[0].id, // First unit is the leader by default
      playerId: playerId,
      position: this.calculateFormationCenter(validUnits),
      targetPosition: null,
      currentFacing: formationConfig.defaultFacing,
      isMoving: false,
      speedFactor: 1.0 + (formationConfig.bonuses.speed || 0),
      formationPositions: {}, // Will store relative positions for each unit
    };

    // Calculate formation positions
    this.calculateFormationPositions(formation);

    // Apply formation bonuses to units
    this.applyFormationBonuses(formation);

    // Set formation reference in each unit
    validUnits.forEach((unit) => {
      unit.formation = formationId;
      unit.formationPosition = this.getUnitFormationPosition(
        formation,
        unit.id
      );
    });

    // Store the formation
    this.activeFormations[formationId] = formation;

    // Log formation creation
    console.log(
      `Created ${formationType} formation with ${validUnits.length} units`
    );

    return formation;
  }

  /**
   * Calculate the center position of a group of units
   * @param {Array} units - Array of unit entities
   * @returns {Object} Center position {x, y}
   */
  calculateFormationCenter(units) {
    let totalX = 0;
    let totalY = 0;

    units.forEach((unit) => {
      totalX += unit.x + unit.width / 2;
      totalY += unit.y + unit.height / 2;
    });

    return {
      x: totalX / units.length,
      y: totalY / units.length,
    };
  }

  /**
   * Calculate formation positions for each unit
   * @param {Object} formation - Formation to calculate positions for
   */
  calculateFormationPositions(formation) {
    const formationType = this.formationTypes[formation.type];
    const unitCount = formation.units.length;

    // Get actual unit objects
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    if (units.length === 0) {
      return;
    }

    // Get average unit size for spacing calculations
    const avgWidth =
      units.reduce((sum, unit) => sum + unit.width, 0) / units.length;
    const avgHeight =
      units.reduce((sum, unit) => sum + unit.height, 0) / units.length;
    const spacing = Math.max(avgWidth, avgHeight) * formationType.unitSpacing;

    // Calculate positions based on formation type
    switch (formation.type) {
      case "line":
        this.calculateLineFormation(formation, units, spacing);
        break;

      case "column":
        this.calculateColumnFormation(formation, units, spacing);
        break;

      case "wedge":
        this.calculateWedgeFormation(formation, units, spacing);
        break;

      case "square":
        this.calculateSquareFormation(formation, units, spacing);
        break;

      case "circle":
        this.calculateCircleFormation(formation, units, spacing);
        break;

      case "scatter":
        this.calculateScatterFormation(formation, units, spacing);
        break;

      case "skirmish":
        this.calculateSkirmishFormation(formation, units, spacing);
        break;

      case "staggered":
        this.calculateStaggeredFormation(formation, units, spacing);
        break;

      default:
        this.calculateLineFormation(formation, units, spacing);
    }
  }

  /**
   * Calculate line formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateLineFormation(formation, units, spacing) {
    const totalWidth = (units.length - 1) * spacing;
    const startX = -totalWidth / 2;

    units.forEach((unit, index) => {
      formation.formationPositions[unit.id] = {
        relativeX: startX + index * spacing,
        relativeY: 0,
        facing: formation.currentFacing,
      };
    });
  }

  /**
   * Calculate column formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateColumnFormation(formation, units, spacing) {
    const totalHeight = (units.length - 1) * spacing;
    const startY = -totalHeight / 2;

    units.forEach((unit, index) => {
      formation.formationPositions[unit.id] = {
        relativeX: 0,
        relativeY: startY + index * spacing,
        facing: formation.currentFacing,
      };
    });
  }

  /**
   * Calculate wedge formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateWedgeFormation(formation, units, spacing) {
    // Leader at the front, others form a V behind
    const leader = units[0];

    formation.formationPositions[leader.id] = {
      relativeX: 0,
      relativeY: -spacing * 2, // Leader is at the front
      facing: formation.currentFacing,
    };

    const remainingUnits = units.slice(1);
    const halfCount = Math.ceil(remainingUnits.length / 2);

    // Left side of the wedge
    for (let i = 0; i < halfCount; i++) {
      const unit = remainingUnits[i];
      formation.formationPositions[unit.id] = {
        relativeX: -spacing * (i + 1),
        relativeY: spacing * i,
        facing: formation.currentFacing,
      };
    }

    // Right side of the wedge
    for (let i = halfCount; i < remainingUnits.length; i++) {
      const unit = remainingUnits[i];
      const rightIndex = i - halfCount;
      formation.formationPositions[unit.id] = {
        relativeX: spacing * (rightIndex + 1),
        relativeY: spacing * rightIndex,
        facing: formation.currentFacing,
      };
    }
  }

  /**
   * Calculate square formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateSquareFormation(formation, units, spacing) {
    const sideLength = Math.ceil(Math.sqrt(units.length));

    units.forEach((unit, index) => {
      const row = Math.floor(index / sideLength);
      const col = index % sideLength;

      // Calculate position within square
      const relX = (col - (sideLength - 1) / 2) * spacing;
      const relY = (row - (sideLength - 1) / 2) * spacing;

      // Determine facing based on position (outward from center)
      let facing = formation.currentFacing;
      if (formation.currentFacing === "out") {
        // Determine edge position and set facing accordingly
        if (row === 0) facing = "up";
        else if (row === sideLength - 1) facing = "down";
        else if (col === 0) facing = "left";
        else if (col === sideLength - 1) facing = "right";
        else facing = "down"; // Default for interior units
      }

      formation.formationPositions[unit.id] = {
        relativeX: relX,
        relativeY: relY,
        facing: facing,
      };
    });
  }

  /**
   * Calculate circle formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateCircleFormation(formation, units, spacing) {
    const radius = (spacing * units.length) / (2 * Math.PI);

    units.forEach((unit, index) => {
      const angle = (index / units.length) * 2 * Math.PI;

      const relX = Math.sin(angle) * radius;
      const relY = Math.cos(angle) * radius;

      // Determine facing based on position (outward from center)
      let facing = formation.currentFacing;
      if (formation.currentFacing === "out") {
        // Calculate facing angle (opposite of position angle)
        const facingAngle = angle + Math.PI;

        // Convert angle to facing direction
        if (facingAngle >= (7 * Math.PI) / 4 || facingAngle < Math.PI / 4) {
          facing = "down";
        } else if (
          facingAngle >= Math.PI / 4 &&
          facingAngle < (3 * Math.PI) / 4
        ) {
          facing = "right";
        } else if (
          facingAngle >= (3 * Math.PI) / 4 &&
          facingAngle < (5 * Math.PI) / 4
        ) {
          facing = "up";
        } else {
          facing = "left";
        }
      }

      formation.formationPositions[unit.id] = {
        relativeX: relX,
        relativeY: relY,
        facing: facing,
      };
    });
  }

  /**
   * Calculate scatter formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateScatterFormation(formation, units, spacing) {
    const radius = spacing * Math.sqrt(units.length);

    units.forEach((unit, index) => {
      // Use a spiral pattern for more uniform distribution
      const angle = index * (Math.PI * 0.618033988749895); // Golden angle
      const distance = spacing * Math.sqrt(index);

      const relX = Math.sin(angle) * distance;
      const relY = Math.cos(angle) * distance;

      formation.formationPositions[unit.id] = {
        relativeX: relX,
        relativeY: relY,
        facing: formation.currentFacing,
      };
    });
  }

  /**
   * Calculate skirmish formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateSkirmishFormation(formation, units, spacing) {
    // Similar to scatter but with more emphasis on spacing for ranged units
    const radius = spacing * Math.sqrt(units.length) * 1.2; // Extra spacing

    units.forEach((unit, index) => {
      // Sort by attack range - longer range units go to the back
      units.sort((a, b) => (b.attackRange || 0) - (a.attackRange || 0));

      // Calculate position in a rough arc
      const arcWidth = Math.min(
        units.length * spacing,
        (2 * Math.PI * radius) / 3
      );
      const startX = -arcWidth / 2;

      const relX = startX + (index / (units.length - 1)) * arcWidth;
      const relY = unit.attackRange ? -spacing * (unit.attackRange / 5) : 0;

      formation.formationPositions[unit.id] = {
        relativeX: relX,
        relativeY: relY,
        facing: formation.currentFacing,
      };
    });
  }

  /**
   * Calculate staggered formation positions
   * @param {Object} formation - Formation object
   * @param {Array} units - Array of unit entities
   * @param {number} spacing - Spacing between units
   */
  calculateStaggeredFormation(formation, units, spacing) {
    const rows = Math.ceil(Math.sqrt(units.length));
    const cols = Math.ceil(units.length / rows);

    units.forEach((unit, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      // Stagger alternate rows
      const staggerOffset = row % 2 === 0 ? 0 : spacing / 2;

      const relX = (col - (cols - 1) / 2) * spacing + staggerOffset;
      const relY = (row - (rows - 1) / 2) * spacing;

      formation.formationPositions[unit.id] = {
        relativeX: relX,
        relativeY: relY,
        facing: formation.currentFacing,
      };
    });
  }

  /**
   * Get the formation position for a specific unit
   * @param {Object} formation - Formation
   * @param {string} unitId - Unit ID
   * @returns {Object} Formation position {relativeX, relativeY, facing}
   */
  getUnitFormationPosition(formation, unitId) {
    return (
      formation.formationPositions[unitId] || {
        relativeX: 0,
        relativeY: 0,
        facing: formation.currentFacing,
      }
    );
  }

  /**
   * Apply formation bonuses to all units in the formation
   * @param {Object} formation - Formation
   */
  applyFormationBonuses(formation) {
    const formationType = this.formationTypes[formation.type];
    const bonuses = formationType.bonuses;

    // Get units
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    // Apply bonuses to each unit
    units.forEach((unit) => {
      // Store original values if not already stored
      if (!unit.originalStats) {
        unit.originalStats = {
          attack: unit.attack,
          armor: unit.armor,
          attackRange: unit.attackRange,
          attackSpeed: unit.attackSpeed,
          speed: unit.speed,
          turnRate: unit.turnRate,
        };
      }

      // Apply bonuses
      if (bonuses.attack) {
        unit.attack = unit.originalStats.attack + bonuses.attack;
      }

      if (bonuses.armor) {
        unit.armor = unit.originalStats.armor + bonuses.armor;
      }

      if (bonuses.attackRange) {
        unit.attackRange = unit.originalStats.attackRange + bonuses.attackRange;
      }

      if (bonuses.attackRate) {
        unit.attackSpeed =
          unit.originalStats.attackSpeed * (1 - bonuses.attackRate);
      }

      if (bonuses.speed) {
        unit.speed = unit.originalStats.speed * (1 + bonuses.speed);
      }

      if (bonuses.turnRate) {
        unit.turnRate = unit.originalStats.turnRate * (1 + bonuses.turnRate);
      }

      // Apply special behaviors
      unit.formationBonuses = { ...bonuses };

      // For example, retreating on close combat for skirmish formation
      if (bonuses.retreatOnClose) {
        unit.retreatOnClose = true;
      }

      // Charge bonuses
      if (bonuses.chargeBonus) {
        unit.chargeBonus = bonuses.chargeBonus;
      }
    });
  }

  /**
   * Remove formation bonuses from units
   * @param {Object} formation - Formation
   */
  removeFormationBonuses(formation) {
    // Get units
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    // Remove bonuses from each unit
    units.forEach((unit) => {
      if (unit.originalStats) {
        // Restore original stats
        unit.attack = unit.originalStats.attack;
        unit.armor = unit.originalStats.armor;
        unit.attackRange = unit.originalStats.attackRange;
        unit.attackSpeed = unit.originalStats.attackSpeed;
        unit.speed = unit.originalStats.speed;
        unit.turnRate = unit.originalStats.turnRate;

        // Clear original stats
        delete unit.originalStats;
      }

      // Remove special behaviors
      delete unit.formationBonuses;
      delete unit.retreatOnClose;
      delete unit.chargeBonus;
    });
  }

  /**
   * Move a formation to a target position
   * @param {Object} formation - Formation to move
   * @param {Object} targetPosition - Target position {x, y}
   */
  moveFormation(formation, targetPosition) {
    // Update formation target
    formation.targetPosition = targetPosition;
    formation.isMoving = true;

    // Calculate movement direction
    const dx = targetPosition.x - formation.position.x;
    const dy = targetPosition.y - formation.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update formation facing based on movement direction
    if (Math.abs(dx) > Math.abs(dy)) {
      formation.currentFacing = dx > 0 ? "right" : "left";
    } else {
      formation.currentFacing = dy > 0 ? "down" : "up";
    }

    // Recalculate formation positions with new facing
    this.calculateFormationPositions(formation);

    // Get units
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    // Calculate formation speed if using speed matching
    const formationType = this.formationTypes[formation.type];
    let formationSpeed = Infinity;

    if (formationType.speedMatching) {
      // Find the slowest unit
      units.forEach((unit) => {
        formationSpeed = Math.min(formationSpeed, unit.speed);
      });

      // Apply formation speed bonus
      formationSpeed *= formation.speedFactor;
    }

    // Move each unit to its formation position
    units.forEach((unit) => {
      // Get formation position
      const formationPos = this.getUnitFormationPosition(formation, unit.id);

      // Calculate world position
      const worldX = targetPosition.x + formationPos.relativeX;
      const worldY = targetPosition.y + formationPos.relativeY;

      // Set unit facing
      unit.facing =
        formationPos.facing === "out"
          ? this.getOutwardFacing(unit, formation)
          : formationPos.facing;

      // Move unit
      if (formationType.speedMatching) {
        // All units move at formation speed
        unit.moveTo(worldX, worldY, formationSpeed);
      } else {
        // Units move at their own speed
        unit.moveTo(worldX, worldY);
      }
    });
  }

  /**
   * Calculate outward facing direction for a unit
   * @param {Object} unit - Unit entity
   * @param {Object} formation - Formation the unit is in
   * @returns {string} Facing direction
   */
  getOutwardFacing(unit, formation) {
    const formationPos = this.getUnitFormationPosition(formation, unit.id);

    // Calculate angle from formation center to unit
    const angle = Math.atan2(formationPos.relativeY, formationPos.relativeX);

    // Convert angle to direction
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
      return "right";
    } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
      return "down";
    } else if (angle >= (3 * Math.PI) / 4 || angle < (-3 * Math.PI) / 4) {
      return "left";
    } else {
      return "up";
    }
  }

  /**
   * Update a formation
   * @param {Object} formation - Formation to update
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateFormation(formation, deltaTime) {
    // Get units
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    // If no units remain, delete the formation
    if (units.length === 0) {
      this.disbandFormation(formation.id);
      return;
    }

    // Update formation center position based on units
    formation.position = this.calculateFormationCenter(units);

    // Check if formation has reached its target
    if (formation.isMoving && formation.targetPosition) {
      const dx = formation.targetPosition.x - formation.position.x;
      const dy = formation.targetPosition.y - formation.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        // Close enough to target
        formation.isMoving = false;

        // Stop all units
        units.forEach((unit) => {
          unit.stopMoving();
        });
      }
    }

    // Check for special formation behaviors
    const formationType = this.formationTypes[formation.type];

    if (formationType.bonuses.retreatOnClose) {
      this.handleRetreatBehavior(formation, units);
    }
  }

  /**
   * Handle retreat behavior for skirmish formations
   * @param {Object} formation - Formation
   * @param {Array} units - Array of unit entities
   */
  handleRetreatBehavior(formation, units) {
    // Get enemies near the formation
    const formationRadius = 100; // Approximate formation radius
    const nearbyEnemies = this.entityManager.getEntitiesInRadius(
      formation.position.x,
      formation.position.y,
      formationRadius + 50, // Extra range to detect approaching enemies
      (entity) =>
        entity.isAlive &&
        (entity.type === "unit" || entity.type === "building") &&
        entity.owner !== formation.playerId
    );

    if (nearbyEnemies.length > 0) {
      // Calculate retreat direction (away from closest enemy)
      const closestEnemy = nearbyEnemies.reduce(
        (closest, enemy) => {
          const distance = Utils.distance(
            formation.position.x,
            formation.position.y,
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2
          );

          return distance < closest.distance ? { enemy, distance } : closest;
        },
        { enemy: null, distance: Infinity }
      ).enemy;

      if (closestEnemy) {
        // Calculate direction away from enemy
        const dx =
          formation.position.x - (closestEnemy.x + closestEnemy.width / 2);
        const dy =
          formation.position.y - (closestEnemy.y + closestEnemy.height / 2);
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        // Normalize and scale to get retreat position
        const retreatDistance = 100;
        const retreatX =
          formation.position.x + (dx / magnitude) * retreatDistance;
        const retreatY =
          formation.position.y + (dy / magnitude) * retreatDistance;

        // Move formation to retreat position
        this.moveFormation(formation, { x: retreatX, y: retreatY });
      }
    }
  }

  /**
   * Disband a formation, removing all bonuses
   * @param {string} formationId - ID of the formation to disband
   */
  disbandFormation(formationId) {
    const formation = this.activeFormations[formationId];

    if (!formation) {
      return;
    }

    // Remove formation bonuses
    this.removeFormationBonuses(formation);

    // Clear formation references from units
    const units = formation.units
      .map((unitId) => this.entityManager.getEntityById(unitId))
      .filter((unit) => unit && unit.isAlive);

    units.forEach((unit) => {
      delete unit.formation;
      delete unit.formationPosition;
    });

    // Remove formation
    delete this.activeFormations[formationId];

    console.log(`Disbanded formation ${formationId}`);
  }

  /**
   * Change a formation's type
   * @param {string} formationId - ID of the formation
   * @param {string} newType - New formation type
   */
  changeFormationType(formationId, newType) {
    const formation = this.activeFormations[formationId];

    if (!formation || !this.formationTypes[newType]) {
      return;
    }

    // Remove current formation bonuses
    this.removeFormationBonuses(formation);

    // Update formation type
    formation.type = newType;
    formation.speedFactor =
      1.0 + (this.formationTypes[newType].bonuses.speed || 0);

    // Recalculate formation positions
    this.calculateFormationPositions(formation);

    // Apply new formation bonuses
    this.applyFormationBonuses(formation);

    // If formation was moving, continue to the target with new formation
    if (formation.isMoving && formation.targetPosition) {
      this.moveFormation(formation, formation.targetPosition);
    }

    console.log(`Changed formation ${formationId} to ${newType}`);
  }

  /**
   * Add units to an existing formation
   * @param {string} formationId - ID of the formation
   * @param {Array} newUnits - Array of units to add
   */
  addUnitsToFormation(formationId, newUnits) {
    const formation = this.activeFormations[formationId];

    if (!formation || !newUnits || newUnits.length === 0) {
      return;
    }

    // Filter units to ensure they're valid and belong to the player
    const validNewUnits = newUnits.filter((unit) => {
      return (
        unit &&
        unit.type === "unit" &&
        unit.isAlive &&
        unit.owner === formation.playerId &&
        !formation.units.includes(unit.id) &&
        !unit.isBuilder
      ); // Don't put villagers in military formations
    });

    if (validNewUnits.length === 0) {
      return;
    }

    // Add units to formation
    validNewUnits.forEach((unit) => {
      formation.units.push(unit.id);
      unit.formation = formationId;
    });

    // Recalculate formation positions
    this.calculateFormationPositions(formation);

    // Apply formation bonuses to new units
    this.applyFormationBonuses(formation);

    // If formation was moving, continue to the target with new formation
    if (formation.isMoving && formation.targetPosition) {
      this.moveFormation(formation, formation.targetPosition);
    }

    console.log(
      `Added ${validNewUnits.length} units to formation ${formationId}`
    );
  }

  /**
   * Remove units from a formation
   * @param {string} formationId - ID of the formation
   * @param {Array} units - Array of units to remove
   */
  removeUnitsFromFormation(formationId, units) {
    const formation = this.activeFormations[formationId];

    if (!formation || !units || units.length === 0) {
      return;
    }

    // Get unit IDs to remove
    const unitIdsToRemove = units.map((unit) => unit.id);

    // Remove formation bonuses from these units
    units.forEach((unit) => {
      if (unit.originalStats) {
        // Restore original stats
        unit.attack = unit.originalStats.attack;
        unit.armor = unit.originalStats.armor;
        unit.attackRange = unit.originalStats.attackRange;
        unit.attackSpeed = unit.originalStats.attackSpeed;
        unit.speed = unit.originalStats.speed;
        unit.turnRate = unit.originalStats.turnRate;

        // Clear original stats
        delete unit.originalStats;
      }

      // Remove formation references
      delete unit.formation;
      delete unit.formationPosition;
      delete unit.formationBonuses;
      delete unit.retreatOnClose;
      delete unit.chargeBonus;
    });

    // Update formation unit list
    formation.units = formation.units.filter(
      (unitId) => !unitIdsToRemove.includes(unitId)
    );

    // If no units remain, disband the formation
    if (formation.units.length === 0) {
      this.disbandFormation(formationId);
      return;
    }

    // Update leader if needed
    if (unitIdsToRemove.includes(formation.leader)) {
      formation.leader = formation.units[0];
    }

    // Recalculate formation positions
    this.calculateFormationPositions(formation);

    // If formation was moving, continue to the target with new formation
    if (formation.isMoving && formation.targetPosition) {
      this.moveFormation(formation, formation.targetPosition);
    }

    console.log(`Removed ${units.length} units from formation ${formationId}`);
  }

  /**
   * Handle entity death events
   * @param {Object} data - Death event data
   */
  handleEntityDeath(data) {
    const entity = data.entity;

    // Check if this entity was part of a formation
    if (entity.type === "unit" && entity.formation) {
      const formationId = entity.formation;
      const formation = this.activeFormations[formationId];

      if (formation) {
        // Remove unit from formation
        formation.units = formation.units.filter(
          (unitId) => unitId !== entity.id
        );
        delete formation.formationPositions[entity.id];

        // If no units remain, delete the formation
        if (formation.units.length === 0) {
          this.disbandFormation(formationId);
        } else {
          // Update leader if needed
          if (formation.leader === entity.id) {
            formation.leader = formation.units[0];
          }

          // Recalculate formation positions
          this.calculateFormationPositions(formation);
        }
      }
    }
  }

  /**
   * Get a formation by ID
   * @param {string} formationId - Formation ID
   * @returns {Object} Formation object
   */
  getFormation(formationId) {
    return this.activeFormations[formationId];
  }

  /**
   * Get all formations for a player
   * @param {number} playerId - Player ID
   * @returns {Array} Array of formation objects
   */
  getPlayerFormations(playerId) {
    return Object.values(this.activeFormations).filter(
      (formation) => formation.playerId === playerId
    );
  }

  /**
   * Get all available formation types
   * @returns {Object} Formation type definitions
   */
  getFormationTypes() {
    return this.formationTypes;
  }

  /**
   * Create a formation preview for UI display
   * @param {Array} units - Array of selected units
   * @param {string} formationType - Type of formation
   * @returns {Array} Array of preview positions
   */
  createFormationPreview(units, formationType) {
    // Create a temporary formation for preview
    const tempFormation = {
      id: "preview",
      type: formationType,
      units: units.map((unit) => unit.id),
      position: this.calculateFormationCenter(units),
      currentFacing: "down",
      formationPositions: {},
    };

    // Calculate formation positions
    this.calculateFormationPositions(tempFormation);

    // Create array of preview positions
    const preview = [];

    units.forEach((unit) => {
      const formationPos = this.getUnitFormationPosition(
        tempFormation,
        unit.id
      );

      preview.push({
        unitId: unit.id,
        x: tempFormation.position.x + formationPos.relativeX,
        y: tempFormation.position.y + formationPos.relativeY,
        facing: formationPos.facing,
      });
    });

    return preview;
  }
}
