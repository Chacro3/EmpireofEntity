// Base Entity Class
class Entity {
  constructor(id, properties, engine) {
    this.id = id;
    this.engine = engine;
    this.type = properties.type || "entity";
    this.x = properties.x || 0;
    this.y = properties.y || 0;
    this.width = properties.width || 30;
    this.height = properties.height || 30;
    this.hp = properties.hp || 100;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 0;
    this.ar = properties.ar || 0;
    this.owner = properties.owner || "none"; // player, enemy, none
    this.isUnderAttack = false;
    this.lastDamageTime = 0;
  }

  contains(x, y) {
    return (
      x >= this.x &&
      x < this.x + this.width &&
      y >= this.y &&
      y < this.y + this.height
    );
  }

  intersects(x, y, width, height) {
    return (
      this.x < x + width &&
      this.x + this.width > x &&
      this.y < y + height &&
      this.y + this.height > y
    );
  }

  takeDamage(amount, damageType, attacker) {
    // Apply defense reduction
    let damage = Math.max(1, amount - this.dp);

    // Apply damage type modifiers
    if (damageType && this.dp) {
      if (damageType === "slashing" && this.dp < 15) {
        damage *= 1.25; // Bonus vs. low DP
      } else if (damageType === "slashing" && this.dp > 25) {
        damage *= 0.75; // Penalty vs. high DP
      } else if (damageType === "piercing" && this.dp >= 15 && this.dp <= 25) {
        damage *= 1.25; // Bonus vs. medium DP
      } else if (damageType === "piercing" && this.dp > 35) {
        damage *= 0.75; // Penalty vs. high DP
      } else if (damageType === "blunt" && this.dp > 25) {
        damage *= 1.25; // Bonus vs. high DP
      } else if (damageType === "blunt" && this.dp < 15) {
        damage *= 0.75; // Penalty vs. low DP
      }
    }

    // Apply formation bonus if applicable
    if (this.formationBonus && this.formationBonus.damageReduction) {
      damage *= 1 - this.formationBonus.damageReduction;
    }

    // Apply damage
    this.hp -= Math.floor(damage);
    if (this.hp < 0) this.hp = 0;

    // Mark as under attack
    this.isUnderAttack = true;
    this.lastDamageTime = performance.now();

    // Auto counter-attack if this is a military unit
    if (this.canAttack && attacker && attacker.owner !== this.owner) {
      this.assignAttack(attacker);
    }

    return damage;
  }

  render(context) {
    // Draw the entity
    const color =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : this.owner === "enemy"
        ? "#F44336"
        : "#9E9E9E"; // Red for enemy, gray for neutral

    context.fillStyle = color;
    context.fillRect(this.x, this.y, this.width, this.height);

    // Draw HP bar if damaged
    if (this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336"; // Red
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF"; // White
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Villager Entity
class Villager extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "villager";
    this.width = 20;
    this.height = 20;

    // Set initial stats based on age
    const ageStats = {
      stone: { hp: 50, dp: 5, ar: 5 },
      bronze: { hp: 60, dp: 6, ar: 6 },
      iron: { hp: 70, dp: 7, ar: 7 },
      golden: { hp: 80, dp: 8, ar: 8 },
      eternal: { hp: 90, dp: 9, ar: 9 },
    };

    const currentAge = engine.gameState.currentAge;
    const stats = ageStats[currentAge] || ageStats.stone;

    this.hp = properties.hp || stats.hp;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || stats.dp;
    this.ar = properties.ar || stats.ar;

    // Movement
    this.speed = 100; // pixels per second
    this.targetX = null;
    this.targetY = null;

    // State
    this.state = "idle"; // idle, moving, gathering, building, repairing, attacking
    this.targetEntity = null;
    this.gatherRate = 1; // resources per second
    this.buildRate = 10; // HP per second
    this.repairRate = 5; // HP per second
    this.isSelected = false;
    this.canMove = true;
    this.canAttack = true;
    this.attackRange = 20;
    this.attackType = "blunt";
    this.attackCooldown = 2; // seconds
    this.lastAttackTime = 0;
    this.carriedResources = null; // { type, amount }
  }

  setTarget(position) {
    this.targetX = position.x;
    this.targetY = position.y;
    this.state = "moving";
    this.targetEntity = null;
  }

  assignGather(resourceEntity) {
    this.targetEntity = resourceEntity;
    this.state = "gathering";
    this.targetX = resourceEntity.x;
    this.targetY = resourceEntity.y;
  }

  assignGatherFromBuilding(buildingEntity) {
    this.targetEntity = buildingEntity;
    this.state = "gathering";
    this.targetX = buildingEntity.x;
    this.targetY = buildingEntity.y;
  }

  assignBuild(buildingEntity) {
    this.targetEntity = buildingEntity;
    this.state = "building";
    this.targetX = buildingEntity.x;
    this.targetY = buildingEntity.y;
  }

  assignRepair(entity) {
    this.targetEntity = entity;
    this.state = "repairing";
    this.targetX = entity.x;
    this.targetY = entity.y;
  }

  assignAttack(entity) {
    this.targetEntity = entity;
    this.state = "attacking";
    this.targetX = entity.x;
    this.targetY = entity.y;
  }

  update(deltaTime) {
    // Apply civilization gathering bonus if applicable
    const gatherBonus =
      this.engine.civilizationManager.getPerk("resourceGather") || 1;
    this.gatherRate = 1 * gatherBonus;

    switch (this.state) {
      case "idle":
        // Do nothing
        break;

      case "moving":
        this.updateMovement(deltaTime);
        break;

      case "gathering":
        if (this.targetEntity) {
          // If we're not close enough, move towards the resource
          if (!this.isCloseToTarget()) {
            this.updateMovement(deltaTime);
          } else {
            // Gather the resource
            this.gatherResource(deltaTime);
          }
        } else {
          // Target entity no longer exists
          this.state = "idle";
        }
        break;

      case "building":
        if (this.targetEntity && this.targetEntity.isBuilding) {
          // If we're not close enough, move towards the building
          if (!this.isCloseToTarget()) {
            this.updateMovement(deltaTime);
          } else {
            // Build the building
            this.buildStructure(deltaTime);
          }
        } else {
          // Target entity no longer exists or is completed
          this.state = "idle";
        }
        break;

      case "repairing":
        if (
          this.targetEntity &&
          this.targetEntity.hp < this.targetEntity.maxHp
        ) {
          // If we're not close enough, move towards the entity
          if (!this.isCloseToTarget()) {
            this.updateMovement(deltaTime);
          } else {
            // Repair the entity
            this.repairStructure(deltaTime);
          }
        } else {
          // Target entity no longer exists or is fully repaired
          this.state = "idle";
        }
        break;

      case "attacking":
        if (this.targetEntity && this.targetEntity.hp > 0) {
          // If we're not in attack range, move towards the target
          const distToTarget = this.getDistanceToEntity(this.targetEntity);
          if (distToTarget > this.attackRange) {
            this.updateMovement(deltaTime);
          } else {
            // Attack the target
            this.attack(deltaTime);
          }
        } else {
          // Target entity no longer exists
          this.state = "idle";
        }
        break;
    }

    // If we're carrying resources but no longer gathering, return them
    if (this.carriedResources && this.state !== "gathering") {
      this.returnResources();
    }

    // Villager retreat if HP gets too low
    if (this.hp < this.maxHp * 0.25 && this.isUnderAttack) {
      this.retreat();
    }
  }

  updateMovement(deltaTime) {
    if (this.targetX === null || this.targetY === null) return;

    // Calculate distance to target
    const dx = this.targetX - (this.x + this.width / 2);
    const dy = this.targetY - (this.y + this.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're close enough, stop moving
    if (distance < 5) {
      if (this.state === "moving") this.state = "idle";
      return;
    }

    // Calculate movement
    const speedWithBonus = this.speed;
    const moveDistance = speedWithBonus * deltaTime;
    const moveRatio = moveDistance / distance;

    // Move towards target
    this.x += dx * moveRatio;
    this.y += dy * moveRatio;

    // Update target entity position for moving targets
    if (
      this.targetEntity &&
      (this.state === "attacking" || this.state === "gathering") &&
      (this.targetEntity.x !== this.targetX ||
        this.targetEntity.y !== this.targetY)
    ) {
      this.targetX = this.targetEntity.x;
      this.targetY = this.targetEntity.y;
    }
  }

  isCloseToTarget() {
    if (!this.targetEntity) return false;

    const distance = this.getDistanceToEntity(this.targetEntity);
    return distance < 30; // Close enough to interact
  }

  getDistanceToEntity(entity) {
    const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
    const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  gatherResource(deltaTime) {
    if (!this.targetEntity || this.targetEntity.type !== "resource") return;

    // Apply gather rate
    const amountGathered = this.gatherRate * deltaTime;

    // If the resource has enough, gather it
    if (this.targetEntity.amount >= amountGathered) {
      this.targetEntity.amount -= amountGathered;

      // Store the gathered resource
      if (!this.carriedResources) {
        this.carriedResources = {
          type: this.targetEntity.resourceType,
          amount: amountGathered,
        };
      } else if (
        this.carriedResources.type === this.targetEntity.resourceType
      ) {
        this.carriedResources.amount += amountGathered;
      }

      // If we're carrying enough, return it
      if (this.carriedResources.amount >= 10) {
        this.returnResources();
      }

      // If the resource is depleted, notify resource manager
      if (this.targetEntity.amount <= 0) {
        this.engine.resourceManager.resourceNodeDepleted(this.targetEntity);
        this.engine.entityManager.removeEntity(this.targetEntity);
        this.targetEntity = null;
        this.state = "idle";
      }
    } else {
      // Resource is depleted
      this.returnResources();
      this.state = "idle";
    }
  }

  returnResources() {
    if (!this.carriedResources) return;

    // Add the resources to the player's stockpile
    const resources = {
      [this.carriedResources.type]: Math.floor(this.carriedResources.amount),
    };

    this.engine.resourceManager.addResources(resources);
    this.carriedResources = null;
  }

  buildStructure(deltaTime) {
    if (!this.targetEntity || !this.targetEntity.isBuilding) return;

    // Apply build rate
    this.targetEntity.buildProgress += this.buildRate * deltaTime;

    // If the building is complete, mark it as not building
    if (this.targetEntity.buildProgress >= this.targetEntity.buildTime) {
      this.targetEntity.isBuilding = false;
      this.targetEntity.buildProgress = this.targetEntity.buildTime;
      this.state = "idle";

      // Check if this is a villager capacity building
      if (
        this.targetEntity.buildingType === "house" ||
        this.targetEntity.buildingType === "hut"
      ) {
        // Update UI to show new villager capacity
        this.engine.uiManager.updateUnitCapacity();
      }
    }
  }

  repairStructure(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp >= this.targetEntity.maxHp) {
      this.state = "idle";
      return;
    }

    // Calculate HP to repair
    const hpToRepair = Math.min(
      this.repairRate * deltaTime,
      this.targetEntity.maxHp - this.targetEntity.hp
    );

    // Check if we have resources for the repair
    if (!this.engine.resourceManager.canRepair(this.targetEntity, hpToRepair)) {
      this.engine.uiManager.showAlert("Not enough resources for repair!");
      this.state = "idle";
      return;
    }

    // Spend resources for the repair
    this.engine.resourceManager.spendRepairResources(
      this.targetEntity,
      hpToRepair
    );

    // Repair the structure
    this.targetEntity.hp += hpToRepair;

    // If fully repaired, stop repairing
    if (this.targetEntity.hp >= this.targetEntity.maxHp) {
      this.targetEntity.hp = this.targetEntity.maxHp;
      this.state = "idle";
    }
  }

  attack(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp <= 0) {
      this.state = "idle";
      return;
    }

    // Check attack cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAttackTime < this.attackCooldown) return;

    // Attack the target
    this.targetEntity.takeDamage(this.ar, this.attackType, this);

    // Reset attack cooldown
    this.lastAttackTime = now;

    // If target is destroyed, stop attacking
    if (this.targetEntity.hp <= 0) {
      this.state = "idle";
    }
  }

  retreat() {
    // Find the nearest building owned by the player
    const buildings = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "building"
    );
    if (buildings.length === 0) {
      // No buildings to retreat to, just run away
      this.targetX = this.x - 100;
      this.targetY = this.y - 100;
      this.state = "moving";
      return;
    }

    // Find the closest building
    let closestBuilding = null;
    let minDistance = Infinity;

    for (const building of buildings) {
      const distance = this.getDistanceToEntity(building);
      if (distance < minDistance) {
        closestBuilding = building;
        minDistance = distance;
      }
    }

    // Retreat to the closest building
    this.targetX = closestBuilding.x;
    this.targetY = closestBuilding.y;
    this.state = "moving";
  }

  render(context) {
    // Determine color based on owner and villager state
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : this.owner === "enemy"
        ? "#F44336"
        : "#9E9E9E"; // Red for enemy, gray for neutral

    // Draw the villager with more detailed appearance
    // Basic body
    context.fillStyle = civilizationColor;
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2 - 2,
      0,
      Math.PI * 2
    );
    context.fill();

    // Add clothing details
    context.fillStyle = this.owner === "player" ? "#FFFFFF" : "#E0E0E0"; // White/light gray
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2 - 5,
      0,
      Math.PI,
      true
    );
    context.fill();

    // Draw head
    context.fillStyle = "#FFCC80"; // Light skin tone
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2 - 4,
      4,
      0,
      Math.PI * 2
    );
    context.fill();

    // Add tool based on state
    if (this.state === "gathering") {
      // Draw axe or pickaxe
      context.strokeStyle = "#5D4037"; // Dark brown
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.x + this.width - 2, this.y + 5);
      context.lineTo(this.x + this.width + 5, this.y + 12);
      context.stroke();

      // Axe head
      context.fillStyle = "#BDBDBD"; // Light gray
      context.beginPath();
      context.moveTo(this.x + this.width + 5, this.y + 8);
      context.lineTo(this.x + this.width + 9, this.y + 12);
      context.lineTo(this.x + this.width + 5, this.y + 16);
      context.closePath();
      context.fill();
    } else if (this.state === "building" || this.state === "repairing") {
      // Draw hammer
      context.strokeStyle = "#5D4037"; // Dark brown
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.x + this.width - 2, this.y + 5);
      context.lineTo(this.x + this.width + 5, this.y + 12);
      context.stroke();

      // Hammer head
      context.fillStyle = "#BDBDBD"; // Light gray
      context.fillRect(this.x + this.width + 3, this.y + 8, 6, 5);
    }

    // Draw carried resources
    if (this.carriedResources) {
      const resourceColors = {
        wood: "#795548", // Brown
        food: "#8BC34A", // Light green
        gold: "#FFC107", // Amber
        stone: "#9E9E9E", // Gray
        iron: "#78909C", // Blue gray
      };

      context.fillStyle =
        resourceColors[this.carriedResources.type] || "#9C27B0"; // Purple default
      context.fillRect(this.x + this.width - 5, this.y, 5, 5);
    }

    // Draw state indicator
    const stateColors = {
      gathering: "#8BC34A", // Light green
      building: "#2196F3", // Blue
      repairing: "#FF9800", // Orange
      attacking: "#F44336", // Red
    };

    if (stateColors[this.state]) {
      context.fillStyle = stateColors[this.state];
      context.fillRect(this.x, this.y, 5, 5);
    }

    // Draw HP bar if damaged
    if (this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 3;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336"; // Red
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF"; // White
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Soldier Entity
class Soldier extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "soldier";
    this.soldierType = properties.soldierType || "spearman";
    this.width = 20;
    this.height = 20;

    // Set soldier-specific properties
    this.hp = properties.hp || 100;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 10;
    this.ar = properties.ar || 15;

    // Movement
    this.speed = 80; // pixels per second
    this.targetX = null;
    this.targetY = null;

    // Combat
    this.attackRange = properties.attackRange || 25;
    this.attackType = properties.attackType || "slashing";
    this.attackCooldown = properties.attackCooldown || 1.5; // seconds
    this.lastAttackTime = 0;

    // State
    this.state = "idle"; // idle, moving, attacking
    this.targetEntity = null;
    this.isSelected = false;
    this.canMove = true;
    this.canAttack = true;

    // Formation
    this.formation = null; // line, wedge, square, skirmish
    this.formationPosition = null;
    this.formationBonus = null;
  }

  setTarget(position) {
    this.targetX = position.x;
    this.targetY = position.y;
    this.state = "moving";
    this.targetEntity = null;

    // Call onMove if in formation
    if (this.onMove) this.onMove();
  }

  assignAttack(entity) {
    this.targetEntity = entity;
    this.state = "attacking";
    this.targetX = entity.x;
    this.targetY = entity.y;

    // Call onMove if in formation
    if (this.onMove) this.onMove();
  }

  update(deltaTime) {
    // Apply civilization bonus if applicable
    const attackBonus =
      this.engine.civilizationManager.getPerk("soldierAttack") || 1;

    // Apply formation bonus
    let speedMultiplier = 1;
    let attackRangeMultiplier = 1;
    let arMultiplier = 1;

    if (this.formationBonus) {
      if (this.formationBonus.moveSpeed)
        speedMultiplier = this.formationBonus.moveSpeed;
      if (this.formationBonus.attackRange)
        attackRangeMultiplier = this.formationBonus.attackRange;
      if (this.formationBonus.attackDamage)
        arMultiplier = this.formationBonus.attackDamage;
    }

    // Apply bonuses
    this.speed = 80 * speedMultiplier;
    this.attackRange = 25 * attackRangeMultiplier;
    this.ar = 15 * arMultiplier * attackBonus;

    switch (this.state) {
      case "idle":
        // Check if we need to move to formation position
        if (this.formation && this.formationPosition) {
          const dx = this.formationPosition.x - (this.x + this.width / 2);
          const dy = this.formationPosition.y - (this.y + this.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 5) {
            this.targetX = this.formationPosition.x;
            this.targetY = this.formationPosition.y;
            this.state = "moving";
          }
        }
        break;

      case "moving":
        this.updateMovement(deltaTime);
        break;

      case "attacking":
        if (this.targetEntity && this.targetEntity.hp > 0) {
          // If we're not in attack range, move towards the target
          const distToTarget = this.getDistanceToEntity(this.targetEntity);
          if (distToTarget > this.attackRange) {
            this.updateMovement(deltaTime);
          } else {
            // Attack the target
            this.attack(deltaTime);
          }
        } else {
          // Target entity no longer exists
          this.state = "idle";
        }
        break;
    }

    // Auto-counter attack if we're idle and something attacks us
    if (this.isUnderAttack && this.state === "idle") {
      // Find the nearest enemy
      const enemies = this.engine.entityManager.getEntitiesByOwner(
        this.owner === "player" ? "enemy" : "player"
      );

      let nearestEnemy = null;
      let minDistance = Infinity;

      for (const enemy of enemies) {
        const distance = this.getDistanceToEntity(enemy);
        if (distance < minDistance && distance < 150) {
          // Only counter within 150 pixels
          nearestEnemy = enemy;
          minDistance = distance;
        }
      }

      if (nearestEnemy) {
        this.assignAttack(nearestEnemy);
      }
    }
  }

  updateMovement(deltaTime) {
    if (this.targetX === null || this.targetY === null) return;

    // Calculate distance to target
    const dx = this.targetX - (this.x + this.width / 2);
    const dy = this.targetY - (this.y + this.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're close enough, stop moving
    if (distance < 5) {
      if (this.state === "moving") this.state = "idle";
      return;
    }

    // Calculate movement
    const moveDistance = this.speed * deltaTime;
    const moveRatio = moveDistance / distance;

    // Move towards target
    this.x += dx * moveRatio;
    this.y += dy * moveRatio;

    // Update target entity position for moving targets
    if (
      this.targetEntity &&
      this.state === "attacking" &&
      (this.targetEntity.x !== this.targetX ||
        this.targetEntity.y !== this.targetY)
    ) {
      this.targetX = this.targetEntity.x;
      this.targetY = this.targetEntity.y;
    }
  }

  getDistanceToEntity(entity) {
    const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
    const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  attack(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp <= 0) {
      this.state = "idle";
      return;
    }

    // Check attack cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAttackTime < this.attackCooldown) return;

    // Attack the target
    this.targetEntity.takeDamage(this.ar, this.attackType, this);

    // Reset attack cooldown
    this.lastAttackTime = now;

    // If target is destroyed, stop attacking
    if (this.targetEntity.hp <= 0) {
      this.state = "idle";
    }
  }

  render(context) {
    // Determine color based on owner and soldier type
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Draw the soldier body as a square with armor details
    context.fillStyle = civilizationColor;
    context.fillRect(this.x, this.y, this.width, this.height);

    // Draw armor details based on soldier type
    if (this.soldierType === "spearman" || this.soldierType === "skirmisher") {
      // Light armor - diagonal stripe
      context.fillStyle = "#E0E0E0"; // Light gray
      context.beginPath();
      context.moveTo(this.x, this.y);
      context.lineTo(this.x + this.width, this.y + this.height);
      context.lineTo(this.x + this.width, this.y + this.height - 4);
      context.lineTo(this.x + 4, this.y);
      context.closePath();
      context.fill();
    } else if (this.soldierType === "archer" || this.soldierType === "hunter") {
      // Medium armor - horizontal band
      context.fillStyle = "#E0E0E0"; // Light gray
      context.fillRect(this.x, this.y + this.height / 2 - 2, this.width, 4);
    } else {
      // Heavy armor - chest plate
      context.fillStyle = "#E0E0E0"; // Light gray
      context.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);

      context.fillStyle = civilizationColor; // Restore unit color
      context.fillRect(
        this.x + 6,
        this.y + 6,
        this.width - 12,
        this.height - 12
      );
    }

    // Add weapon indicator based on attack type
    if (this.attackType === "slashing") {
      // Sword - diagonal line
      context.strokeStyle = "#BDBDBD"; // Light gray
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.x + this.width, this.y);
      context.lineTo(this.x + this.width + 6, this.y - 6);
      context.stroke();
    } else if (this.attackType === "piercing") {
      // Bow/Arrow or Spear - horizontal line
      context.strokeStyle = "#BDBDBD"; // Light gray
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.x + this.width, this.y + this.height / 2);
      context.lineTo(this.x + this.width + 6, this.y + this.height / 2);
      context.stroke();
    } else if (this.attackType === "blunt") {
      // Mace/Hammer - circle
      context.fillStyle = "#BDBDBD"; // Light gray
      context.beginPath();
      context.arc(
        this.x + this.width + 3,
        this.y + this.height / 2,
        3,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    // Draw HP bar if damaged
    if (this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 3;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Draw formation indicator
    if (this.formation) {
      const formationColors = {
        line: "#81D4FA", // Light blue
        wedge: "#FFB74D", // Orange
        square: "#CE93D8", // Purple
        skirmish: "#A5D6A7", // Light green
      };

      const color = formationColors[this.formation] || "#FFFFFF";

      context.fillStyle = color;
      context.fillRect(this.x, this.y, 5, 5);
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336"; // Red
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF"; // White
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Siege Unit Entity
class SiegeUnit extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "siege";
    this.siegeType = properties.siegeType || "catapult";
    this.width = 30;
    this.height = 30;

    // Set siege-specific properties
    this.hp = properties.hp || 100;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 5;
    this.ar = properties.ar || 50;

    // Movement
    this.speed = 40; // pixels per second (slow)
    this.targetX = null;
    this.targetY = null;

    // Combat
    this.attackRange = properties.attackRange || 150; // Long range
    this.attackType = "blunt";
    this.attackCooldown = 3; // seconds (slow attack)
    this.lastAttackTime = 0;

    // State
    this.state = "idle"; // idle, moving, attacking
    this.targetEntity = null;
    this.isSelected = false;
    this.canMove = true;
    this.canAttack = true;
    this.isRepairable = true;

    // Formation
    this.formation = null;
    this.formationPosition = null;
    this.formationBonus = null;
  }

  setTarget(position) {
    this.targetX = position.x;
    this.targetY = position.y;
    this.state = "moving";
    this.targetEntity = null;
  }

  assignAttack(entity) {
    this.targetEntity = entity;
    this.state = "attacking";
    this.targetX = entity.x;
    this.targetY = entity.y;
  }

  update(deltaTime) {
    switch (this.state) {
      case "idle":
        // Check if we need to move to formation position
        if (this.formation && this.formationPosition) {
          const dx = this.formationPosition.x - (this.x + this.width / 2);
          const dy = this.formationPosition.y - (this.y + this.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 5) {
            this.targetX = this.formationPosition.x;
            this.targetY = this.formationPosition.y;
            this.state = "moving";
          }
        }
        break;

      case "moving":
        this.updateMovement(deltaTime);
        break;

      case "attacking":
        if (this.targetEntity && this.targetEntity.hp > 0) {
          // If we're not in attack range, move towards the target
          const distToTarget = this.getDistanceToEntity(this.targetEntity);
          if (distToTarget > this.attackRange) {
            this.updateMovement(deltaTime);
          } else {
            // Attack the target
            this.attack(deltaTime);
          }
        } else {
          // Target entity no longer exists
          this.state = "idle";
        }
        break;
    }
  }

  updateMovement(deltaTime) {
    if (this.targetX === null || this.targetY === null) return;

    // Calculate distance to target
    const dx = this.targetX - (this.x + this.width / 2);
    const dy = this.targetY - (this.y + this.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're close enough, stop moving
    if (distance < 5) {
      if (this.state === "moving") this.state = "idle";
      return;
    }

    // Calculate movement
    const moveDistance = this.speed * deltaTime;
    const moveRatio = moveDistance / distance;

    // Move towards target
    this.x += dx * moveRatio;
    this.y += dy * moveRatio;

    // Update target entity position for moving targets
    if (
      this.targetEntity &&
      this.state === "attacking" &&
      (this.targetEntity.x !== this.targetX ||
        this.targetEntity.y !== this.targetY)
    ) {
      this.targetX = this.targetEntity.x;
      this.targetY = this.targetEntity.y;
    }
  }

  getDistanceToEntity(entity) {
    const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
    const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  attack(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp <= 0) {
      this.state = "idle";
      return;
    }

    // Check attack cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAttackTime < this.attackCooldown) return;

    // Apply bonus damage to buildings
    let damage = this.ar;
    if (
      this.targetEntity.type === "building" ||
      this.targetEntity.type === "wall" ||
      this.targetEntity.type === "wonder"
    ) {
      damage *= 1.5; // 50% bonus vs buildings
    }

    // Attack the target
    this.targetEntity.takeDamage(damage, this.attackType, this);

    // Reset attack cooldown
    this.lastAttackTime = now;

    // If target is destroyed, stop attacking
    if (this.targetEntity.hp <= 0) {
      this.state = "idle";
    }
  }

  render(context) {
    // Determine color based on owner and siege type
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Draw the siege unit base (wheels/platform)
    context.fillStyle = "#8D6E63"; // Brown
    context.fillRect(
      this.x,
      this.y + this.height / 2,
      this.width,
      this.height / 2
    );

    // Draw wheels
    context.fillStyle = "#5D4037"; // Dark brown
    context.beginPath();
    context.arc(this.x + 7, this.y + this.height - 7, 7, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(
      this.x + this.width - 7,
      this.y + this.height - 7,
      7,
      0,
      Math.PI * 2
    );
    context.fill();

    // Draw main structure based on siege type
    if (this.siegeType === "catapult" || this.siegeType === "trebuchet") {
      // Draw arm
      context.fillStyle = "#8D6E63"; // Brown
      context.fillRect(
        this.x + this.width / 2 - 2,
        this.y + 5,
        4,
        this.height / 2
      );

      // Draw throwing mechanism
      context.fillStyle = civilizationColor;
      context.beginPath();
      context.arc(this.x + this.width / 2, this.y + 5, 5, 0, Math.PI * 2);
      context.fill();
    } else {
      // Generic siege engine
      context.fillStyle = civilizationColor;
      context.fillRect(
        this.x + 5,
        this.y + 5,
        this.width - 10,
        this.height / 2 - 5
      );
    }

    // Draw HP bar if damaged
    if (this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 4;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336"; // Red
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF"; // White
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Hero Unit Entity
class HeroUnit extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "hero";
    this.heroType = properties.heroType || "leader";
    this.width = 25;
    this.height = 25;

    // Set hero-specific properties
    this.hp = properties.hp || 300;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 25;
    this.ar = properties.ar || 30;

    // Movement
    this.speed = 70; // pixels per second
    this.targetX = null;
    this.targetY = null;

    // Combat
    this.attackRange = properties.attackRange || 30;
    this.attackType = properties.attackType || "slashing";
    this.attackCooldown = 1.2; // seconds
    this.lastAttackTime = 0;

    // Special ability
    this.abilityName = properties.abilityName || "None";
    this.abilityCooldown = properties.abilityCooldown || 60; // seconds
    this.lastAbilityTime = 0;
    this.abilityRange = properties.abilityRange || 100;

    // State
    this.state = "idle"; // idle, moving, attacking, casting
    this.targetEntity = null;
    this.isSelected = false;
    this.canMove = true;
    this.canAttack = true;

    // Heroes can regenerate over time if they have the tech
    this.canRegenerate = this.engine.gameState.currentAge === "eternal";
    this.regenRate = 0.5; // HP per second
  }

  setTarget(position) {
    this.targetX = position.x;
    this.targetY = position.y;
    this.state = "moving";
    this.targetEntity = null;
  }

  assignAttack(entity) {
    this.targetEntity = entity;
    this.state = "attacking";
    this.targetX = entity.x;
    this.targetY = entity.y;
  }

  useAbility(targetPosition) {
    // Check cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAbilityTime < this.abilityCooldown) {
      this.engine.uiManager.showAlert("Ability on cooldown!");
      return false;
    }

    // Use the ability based on hero type
    switch (this.heroType) {
      case "sun_king":
        // Solar Flare - AOE damage
        this.castSolarFlare(targetPosition);
        break;

      case "dawn_sage":
        // Radiant Healing - AOE healing
        this.castRadiantHealing(targetPosition);
        break;

      case "moon_priestess":
        // Lunar Veil - Stealth
        this.castLunarVeil(targetPosition);
        break;

      case "nightstalker":
        // Shadow Strike - Single target damage
        this.castShadowStrike(targetPosition);
        break;

      default:
        return false;
    }

    // Set cooldown
    this.lastAbilityTime = now;
    return true;
  }

  castSolarFlare(targetPosition) {
    // Deal 100 damage in a small area
    const radius = 50;

    // Get all entities in the radius
    const entities = this.engine.entityManager.entities.filter((entity) => {
      if (entity.owner === this.owner) return false; // Don't damage friendly units

      const dx = entity.x + entity.width / 2 - targetPosition.x;
      const dy = entity.y + entity.height / 2 - targetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= radius;
    });

    // Deal damage to all entities in the radius
    for (const entity of entities) {
      entity.takeDamage(100, "magical", this);
    }

    // Visual effect
    this.engine.uiManager.createEffect(
      "explosion",
      targetPosition.x,
      targetPosition.y,
      radius
    );
  }

  castRadiantHealing(targetPosition) {
    // Heal 150 HP to all nearby friendly units
    const radius = 80;

    // Get all friendly entities in the radius
    const entities = this.engine.entityManager.entities.filter((entity) => {
      if (entity.owner !== this.owner) return false; // Only heal friendly units
      if (entity.hp >= entity.maxHp) return false; // Only heal damaged units

      const dx = entity.x + entity.width / 2 - targetPosition.x;
      const dy = entity.y + entity.height / 2 - targetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= radius;
    });

    // Heal all entities in the radius
    for (const entity of entities) {
      entity.hp = Math.min(entity.hp + 150, entity.maxHp);
    }

    // Visual effect
    this.engine.uiManager.createEffect(
      "healing",
      targetPosition.x,
      targetPosition.y,
      radius
    );
  }

  castLunarVeil(targetPosition) {
    // Grant stealth to nearby units for 15s
    const radius = 60;

    // Get all friendly entities in the radius
    const entities = this.engine.entityManager.entities.filter((entity) => {
      if (entity.owner !== this.owner) return false; // Only affect friendly units
      if (entity.type !== "soldier" && entity.type !== "villager") return false; // Only affect units

      const dx = entity.x + entity.width / 2 - targetPosition.x;
      const dy = entity.y + entity.height / 2 - targetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= radius;
    });

    // Grant stealth to all entities in the radius
    for (const entity of entities) {
      entity.stealthUntil = performance.now() + 15000; // 15 seconds
    }

    // Visual effect
    this.engine.uiManager.createEffect(
      "stealth",
      targetPosition.x,
      targetPosition.y,
      radius
    );
  }

  castShadowStrike(targetPosition) {
    // Deal 120 damage to a single target

    // Find the closest entity to the target position
    let closestEntity = null;
    let minDistance = Infinity;

    for (const entity of this.engine.entityManager.entities) {
      if (entity.owner === this.owner) continue; // Don't damage friendly units

      const dx = entity.x + entity.width / 2 - targetPosition.x;
      const dy = entity.y + entity.height / 2 - targetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance <= 30) {
        // Must be close to click
        closestEntity = entity;
        minDistance = distance;
      }
    }

    // Deal damage to the closest entity
    if (closestEntity) {
      closestEntity.takeDamage(120, "magical", this);

      // Visual effect
      this.engine.uiManager.createEffect(
        "shadow_strike",
        closestEntity.x,
        closestEntity.y
      );
    }
  }

  update(deltaTime) {
    // Regenerate HP if enabled
    if (this.canRegenerate && this.hp < this.maxHp) {
      this.hp += this.regenRate * deltaTime;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    switch (this.state) {
      case "idle":
        // Idle behavior
        break;

      case "moving":
        this.updateMovement(deltaTime);
        break;

      case "attacking":
        if (this.targetEntity && this.targetEntity.hp > 0) {
          // If we're not in attack range, move towards the target
          const distToTarget = this.getDistanceToEntity(this.targetEntity);
          if (distToTarget > this.attackRange) {
            this.updateMovement(deltaTime);
          } else {
            // Attack the target
            this.attack(deltaTime);
          }
        } else {
          // Target entity no longer exists
          this.state = "idle";
        }
        break;

      case "casting":
        // Ability is handled separately
        this.state = "idle";
        break;
    }
  }

  updateMovement(deltaTime) {
    if (this.targetX === null || this.targetY === null) return;

    // Calculate distance to target
    const dx = this.targetX - (this.x + this.width / 2);
    const dy = this.targetY - (this.y + this.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're close enough, stop moving
    if (distance < 5) {
      if (this.state === "moving") this.state = "idle";
      return;
    }

    // Calculate movement
    const moveDistance = this.speed * deltaTime;
    const moveRatio = moveDistance / distance;

    // Move towards target
    this.x += dx * moveRatio;
    this.y += dy * moveRatio;

    // Update target entity position for moving targets
    if (
      this.targetEntity &&
      this.state === "attacking" &&
      (this.targetEntity.x !== this.targetX ||
        this.targetEntity.y !== this.targetY)
    ) {
      this.targetX = this.targetEntity.x;
      this.targetY = this.targetEntity.y;
    }
  }

  getDistanceToEntity(entity) {
    const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
    const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  attack(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp <= 0) {
      this.state = "idle";
      return;
    }

    // Check attack cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAttackTime < this.attackCooldown) return;

    // Attack the target
    this.targetEntity.takeDamage(this.ar, this.attackType, this);

    // Reset attack cooldown
    this.lastAttackTime = now;

    // If target is destroyed, stop attacking
    if (this.targetEntity.hp <= 0) {
      this.state = "idle";
    }
  }

  render(context) {
    // Determine color based on owner and hero type
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Draw the hero unit as larger, more distinctive unit
    context.fillStyle = civilizationColor;
    context.fillRect(this.x, this.y, this.width, this.height);

    // Draw distinctive hero features - crown/cape

    // Draw a crown on top
    context.fillStyle = this.owner === "player" ? "#FFD700" : "#C0C0C0"; // Gold or silver
    context.beginPath();
    context.moveTo(this.x + 5, this.y);
    context.lineTo(this.x + this.width / 2, this.y - 5);
    context.lineTo(this.x + this.width - 5, this.y);
    context.closePath();
    context.fill();

    // Draw cape/cloak
    context.fillStyle =
      this.heroType === "sun_king" || this.heroType === "dawn_sage"
        ? "#FFD700"
        : "#C0C0C0"; // Gold or silver based on faction

    context.beginPath();
    context.moveTo(this.x, this.y + 5);
    context.lineTo(this.x - 5, this.y + this.height);
    context.lineTo(this.x + 5, this.y + this.height);
    context.closePath();
    context.fill();

    // Draw hero symbol based on type
    if (this.heroType === "sun_king" || this.heroType === "moon_priestess") {
      // Leader - star symbol
      context.fillStyle = "#FFFFFF";
      context.beginPath();
      context.moveTo(this.x + this.width / 2, this.y + 5);
      context.lineTo(this.x + this.width / 2 + 3, this.y + 12);
      context.lineTo(this.x + this.width / 2 + 10, this.y + 12);
      context.lineTo(this.x + this.width / 2 + 5, this.y + 16);
      context.lineTo(this.x + this.width / 2 + 8, this.y + 23);
      context.lineTo(this.x + this.width / 2, this.y + 19);
      context.lineTo(this.x + this.width / 2 - 8, this.y + 23);
      context.lineTo(this.x + this.width / 2 - 5, this.y + 16);
      context.lineTo(this.x + this.width / 2 - 10, this.y + 12);
      context.lineTo(this.x + this.width / 2 - 3, this.y + 12);
      context.closePath();
      context.fill();
    } else {
      // Support/assassin - circle symbol
      context.fillStyle = "#FFFFFF";
      context.beginPath();
      context.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        5,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    // Draw HP bar
    const hpRatio = this.hp / this.maxHp;
    const barWidth = this.width;
    const barHeight = 4;

    // Background
    context.fillStyle = "#000000";
    context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

    // Health
    context.fillStyle =
      hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
    context.fillRect(
      this.x,
      this.y - barHeight - 2,
      barWidth * hpRatio,
      barHeight
    );

    // Draw ability cooldown indicator
    const now = performance.now() / 1000;
    const cooldownRatio = Math.min(
      1,
      (now - this.lastAbilityTime) / this.abilityCooldown
    );

    // Draw a small indicator in the corner
    context.fillStyle = cooldownRatio >= 1 ? "#00BCD4" : "#9E9E9E"; // Cyan when ready, gray when on cooldown
    context.beginPath();
    context.arc(
      this.x + this.width - 5,
      this.y + this.height - 5,
      3,
      0,
      Math.PI * 2 * cooldownRatio
    );
    context.lineTo(this.x + this.width - 5, this.y + this.height - 5);
    context.closePath();
    context.fill();

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336"; // Red
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF"; // White
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Building Entity
class Building extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "building";
    this.buildingType = properties.type;
    this.width = properties.width || 40;
    this.height = properties.height || 40;

    // Building-specific properties
    this.hp = properties.hp || 200;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 10;
    this.ar = properties.ar || 0;

    // Building status
    this.isBuilding =
      properties.isBuilding !== undefined ? properties.isBuilding : true;
    this.buildTime = properties.buildTime || 15;
    this.buildProgress = properties.buildProgress || 0;
    this.isRepairable = true;

    // Production
    this.produces = properties.produces || null;
    this.productionRate = properties.productionRate || 0;
    this.productionProgress = 0;
    this.stored = 0;
    this.maxStored = properties.maxStored || 100;
  }

  update(deltaTime) {
    // If still building, nothing else to update
    if (this.isBuilding) return;

    // Production logic (if this building produces resources)
    if (this.produces && this.productionRate > 0) {
      this.productionProgress += this.productionRate * deltaTime;

      if (this.productionProgress >= 1) {
        // Add produced resources to storage
        this.stored += Math.floor(this.productionProgress);
        this.productionProgress %= 1;

        // Cap at maximum storage
        if (this.stored > this.maxStored) {
          this.stored = this.maxStored;
        }
      }
    }
  }

  render(context) {
    // Determine color based on owner and building type
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Special handling for town center - larger and more distinctive
    if (this.buildingType === "town_center") {
      // Draw base building
      context.fillStyle = this.isBuilding ? "#9E9E9E" : civilizationColor;
      context.fillRect(this.x, this.y, this.width, this.height);

      // Draw distinctive features
      if (!this.isBuilding) {
        // Draw a banner on top
        context.fillStyle = this.owner === "player" ? "#FFFFFF" : "#8D6E63";
        context.fillRect(this.x + this.width / 2 - 5, this.y - 10, 10, 15);

        // Draw windows
        context.fillStyle = "#FFD700"; // Gold windows for light
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue; // Skip center
            context.fillRect(
              this.x + 15 + i * 25,
              this.y + 15 + j * 25,
              10,
              10
            );
          }
        }

        // Draw door
        context.fillStyle = "#8B4513"; // Brown
        context.fillRect(
          this.x + this.width / 2 - 10,
          this.y + this.height - 20,
          20,
          20
        );

        // Draw roof
        context.fillStyle =
          this.owner === "player"
            ? this.engine.civilizationManager.currentCivilization === "solari"
              ? "#FFD700"
              : "#C0C0C0"
            : "#A1887F";

        context.beginPath();
        context.moveTo(this.x - 5, this.y);
        context.lineTo(this.x + this.width / 2, this.y - 15);
        context.lineTo(this.x + this.width + 5, this.y);
        context.closePath();
        context.fill();
      }
    } else {
      // Regular building rendering
      context.fillStyle = this.isBuilding ? "#9E9E9E" : civilizationColor;
      context.fillRect(this.x, this.y, this.width, this.height);

      // Draw building type indicator
      const buildingTypeColors = {
        house: "#ADD8E6", // Light blue
        hut: "#ADD8E6", // Light blue
        barracks: "#8B4513", // Brown
        training_ground: "#8B4513", // Brown
        lumber_mill: "#228B22", // Green
        sawmill: "#228B22", // Green
        granary: "#FFD700", // Gold
        storehouse: "#FFA500", // Orange
        market: "#800080", // Purple
        trade_post: "#800080", // Purple
        temple: "#FFFFFF", // White
        shrine: "#FFFFFF", // White
        forge: "#A52A2A", // Dark red
        kiln: "#A52A2A", // Dark red
        tower: "#607D8B", // Blue gray
        watchtower: "#607D8B", // Blue gray
      };

      const typeColor = buildingTypeColors[this.buildingType] || "#FFFFFF";

      // Draw a colored strip at the top
      context.fillStyle = typeColor;
      context.fillRect(this.x, this.y, this.width, 5);

      // Add some building details if completed
      if (!this.isBuilding) {
        // Draw basic building features based on building type
        if (this.buildingType === "house" || this.buildingType === "hut") {
          // Draw door
          context.fillStyle = "#8B4513"; // Brown
          context.fillRect(
            this.x + this.width / 2 - 5,
            this.y + this.height - 10,
            10,
            10
          );

          // Draw window
          context.fillStyle = "#E0E0E0"; // Light gray
          context.fillRect(this.x + this.width / 4 - 5, this.y + 10, 10, 10);
          context.fillRect(
            this.x + (3 * this.width) / 4 - 5,
            this.y + 10,
            10,
            10
          );

          // Draw roof
          context.fillStyle =
            this.owner === "player"
              ? this.engine.civilizationManager.currentCivilization === "solari"
                ? "#FFD700"
                : "#C0C0C0"
              : "#A1887F";

          context.beginPath();
          context.moveTo(this.x, this.y);
          context.lineTo(this.x + this.width / 2, this.y - 10);
          context.lineTo(this.x + this.width, this.y);
          context.closePath();
          context.fill();
        } else if (
          this.buildingType === "barracks" ||
          this.buildingType === "training_ground"
        ) {
          // Draw banner
          context.fillStyle =
            this.owner === "player" ? civilizationColor : "#8D6E63";
          context.fillRect(this.x + 5, this.y - 15, 5, 15);
          context.fillRect(this.x + this.width - 10, this.y - 15, 5, 15);

          // Draw flag
          context.fillStyle =
            this.owner === "player"
              ? this.engine.civilizationManager.currentCivilization === "solari"
                ? "#FFD700"
                : "#C0C0C0"
              : "#A1887F";
          context.fillRect(this.x + 10, this.y - 12, 10, 8);
          context.fillRect(this.x + this.width - 20, this.y - 12, 10, 8);
        }
      }
    }

    // Draw build progress if under construction
    if (this.isBuilding) {
      const progressRatio = this.buildProgress / this.buildTime;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Progress
      context.fillStyle = "#4169E1"; // Royal blue
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * progressRatio,
        barHeight
      );
    }

    // Draw HP bar if damaged
    if (!this.isBuilding && this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Draw storage indicator if this building produces resources
    if (this.produces && !this.isBuilding) {
      const storageRatio = this.stored / this.maxStored;
      const barWidth = 10;
      const barHeight = this.height - 10;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(
        this.x + this.width + 2,
        this.y + 5,
        barWidth,
        barHeight
      );

      // Storage
      context.fillStyle = "#81C784"; // Light green
      const fillHeight = barHeight * storageRatio;
      context.fillRect(
        this.x + this.width + 2,
        this.y + 5 + barHeight - fillHeight,
        barWidth,
        fillHeight
      );

      // Production type indicator
      const resourceColors = {
        wood: "#795548", // Brown
        food: "#8BC34A", // Light green
        gold: "#FFC107", // Amber
        stone: "#9E9E9E", // Gray
        iron: "#78909C", // Blue gray
      };

      context.fillStyle = resourceColors[this.produces] || "#9C27B0";
      context.fillRect(this.x + this.width + 2, this.y, barWidth, 5);
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Wall Entity
class Wall extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "wall";
    this.width = properties.width || 40;
    this.height = properties.height || 40;

    // Wall-specific properties
    this.hp = properties.hp || 500;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 25;

    // Wall status
    this.isBuilding =
      properties.isBuilding !== undefined ? properties.isBuilding : true;
    this.buildTime = properties.buildTime || 10;
    this.buildProgress = properties.buildProgress || 0;
    this.isRepairable = true;
  }

  update(deltaTime) {
    // Nothing to update for walls
  }

  render(context) {
    // Determine color based on owner and age
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Draw the wall with texture
    if (this.isBuilding) {
      // Simple gray block for wall under construction
      context.fillStyle = "#9E9E9E";
      context.fillRect(this.x, this.y, this.width, this.height);
    } else {
      // Completed wall with texture
      const wallColor =
        this.owner === "player"
          ? this.engine.civilizationManager.currentCivilization === "solari"
            ? "#D2B48C"
            : "#9E9E9E"
          : "#8D6E63";

      // Draw wall base
      context.fillStyle = wallColor;
      context.fillRect(this.x, this.y, this.width, this.height);

      // Draw brick pattern
      context.strokeStyle =
        this.owner === "player"
          ? this.engine.civilizationManager.currentCivilization === "solari"
            ? "#A1887F"
            : "#757575"
          : "#5D4037";
      context.lineWidth = 1;

      // Horizontal lines
      for (let i = 1; i < 3; i++) {
        context.beginPath();
        context.moveTo(this.x, this.y + (i * this.height) / 3);
        context.lineTo(this.x + this.width, this.y + (i * this.height) / 3);
        context.stroke();
      }

      // Vertical lines - offset on alternate rows to look like bricks
      for (let j = 0; j < 3; j++) {
        const yStart = this.y + (j * this.height) / 3;
        const yEnd = this.y + ((j + 1) * this.height) / 3;

        const offset = j % 2 === 0 ? 0 : this.width / 4;

        for (let i = 0; i < 3; i++) {
          context.beginPath();
          context.moveTo(this.x + offset + (i * this.width) / 2, yStart);
          context.lineTo(this.x + offset + (i * this.width) / 2, yEnd);
          context.stroke();
        }
      }

      // Draw top crenellations
      context.fillStyle = wallColor;
      for (let i = 0; i < 3; i++) {
        context.fillRect(
          this.x + (i * this.width) / 3,
          this.y - 5,
          this.width / 6,
          5
        );
      }
    }

    // Draw build progress if under construction
    if (this.isBuilding) {
      const progressRatio = this.buildProgress / this.buildTime;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Progress
      context.fillStyle = "#4169E1"; // Royal blue
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * progressRatio,
        barHeight
      );
    }

    // Draw HP bar if damaged
    if (!this.isBuilding && this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Draw wall cracks if damaged
    if (!this.isBuilding && this.hp < this.maxHp * 0.5) {
      const cracksCount = Math.ceil((1 - this.hp / this.maxHp) * 5);

      context.strokeStyle = "#000000";
      context.lineWidth = 1;

      for (let i = 0; i < cracksCount; i++) {
        const startX = this.x + Math.random() * this.width;
        const startY = this.y + Math.random() * this.height;

        context.beginPath();
        context.moveTo(startX, startY);

        // Create a jagged crack line
        let currentX = startX;
        let currentY = startY;

        for (let j = 0; j < 3; j++) {
          currentX += Math.random() * 10 - 5;
          currentY += Math.random() * 10 - 5;
          context.lineTo(currentX, currentY);
        }

        context.stroke();
      }
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Wonder Entity
class Wonder extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "wonder";
    this.wonderType =
      properties.wonderType ||
      (properties.owner === "player"
        ? engine.civilizationManager.getWonderType()
        : "enemy_wonder");
    this.width = properties.width || 80;
    this.height = properties.height || 80;

    // Wonder-specific properties
    this.hp = properties.hp || 2000;
    this.maxHp = properties.maxHp || this.hp;
    this.dp = properties.dp || 60;

    // Wonder status
    this.isBuilding =
      properties.isBuilding !== undefined ? properties.isBuilding : true;
    this.buildTime = properties.buildTime || 300; // 5 minutes in Stone age
    this.buildProgress = properties.buildProgress || 0;
    this.isRepairable = true;

    // Adjust build time based on age
    const ageBuildTimeMultiplier = {
      stone: 1,
      bronze: 0.8,
      iron: 0.6,
      golden: 0.4,
      eternal: 0.2,
    };

    const currentAge = engine.gameState.currentAge;
    this.buildTime *= ageBuildTimeMultiplier[currentAge] || 1;
  }

  update(deltaTime) {
    // Nothing to update for wonders
  }

  render(context) {
    // Determine color based on owner
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    // Draw the wonder
    if (this.isBuilding) {
      // Under construction - simple gray with scaffolding
      context.fillStyle = "#9E9E9E";
      context.fillRect(this.x, this.y, this.width, this.height);

      // Draw scaffolding
      context.strokeStyle = "#795548"; // Brown
      context.lineWidth = 2;

      // Vertical support beams
      for (let i = 0; i <= 4; i++) {
        const x = this.x + (i * this.width) / 4;
        context.beginPath();
        context.moveTo(x, this.y);
        context.lineTo(x, this.y + this.height);
        context.stroke();
      }

      // Horizontal support beams
      for (let i = 0; i <= 4; i++) {
        const y = this.y + (i * this.height) / 4;
        context.beginPath();
        context.moveTo(this.x, y);
        context.lineTo(this.x + this.width, y);
        context.stroke();
      }
    } else {
      // Completed wonder
      // Draw base
      context.fillStyle = civilizationColor;
      context.fillRect(this.x, this.y, this.width, this.height);

      // Add details based on wonder type
      if (this.wonderType === "sun_pyramid") {
        // Draw pyramid shape
        context.fillStyle = "#FFD700"; // Gold
        context.beginPath();
        context.moveTo(this.x + this.width / 2, this.y);
        context.lineTo(this.x + this.width - 10, this.y + this.height - 10);
        context.lineTo(this.x + 10, this.y + this.height - 10);
        context.closePath();
        context.fill();

        // Add stepped levels
        context.strokeStyle = "#DAA520"; // Goldenrod
        context.lineWidth = 2;

        for (let i = 1; i <= 4; i++) {
          const ratio = i / 5;
          context.beginPath();
          context.moveTo(
            this.x + (ratio * this.width) / 2,
            this.y + ratio * this.height
          );
          context.lineTo(
            this.x + this.width - (ratio * this.width) / 2,
            this.y + ratio * this.height
          );
          context.stroke();
        }

        // Add sun symbol at top
        context.fillStyle = "#FFA500"; // Orange
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + 10, 8, 0, Math.PI * 2);
        context.fill();

        // Sun rays
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          context.beginPath();
          context.moveTo(
            this.x + this.width / 2 + Math.cos(angle) * 8,
            this.y + 10 + Math.sin(angle) * 8
          );
          context.lineTo(
            this.x + this.width / 2 + Math.cos(angle) * 15,
            this.y + 10 + Math.sin(angle) * 15
          );
          context.stroke();
        }
      } else if (this.wonderType === "moon_sanctuary") {
        // Draw dome shape
        context.fillStyle = "#C0C0C0"; // Silver
        context.beginPath();
        context.arc(
          this.x + this.width / 2,
          this.y + this.height / 2,
          this.width / 3,
          0,
          Math.PI * 2
        );
        context.fill();

        // Add columns around
        context.fillStyle = "#E0E0E0"; // Light gray
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const columnX =
            this.x + this.width / 2 + Math.cos(angle) * (this.width / 2 - 10);
          const columnY =
            this.y + this.height / 2 + Math.sin(angle) * (this.height / 2 - 10);

          context.fillRect(columnX - 5, columnY - 5, 10, 10);
        }

        // Add moon symbol
        context.fillStyle = "#E0E0E0"; // Light gray
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + 15, 10, 0, Math.PI * 2);
        context.fill();

        // Create crescent shape
        context.fillStyle = civilizationColor;
        context.beginPath();
        context.arc(
          this.x + this.width / 2 + 5,
          this.y + 15,
          9,
          0,
          Math.PI * 2
        );
        context.fill();
      } else {
        // Generic wonder with decorative elements
        context.strokeStyle = "#FFFFFF";
        context.lineWidth = 2;

        // Draw a decorative pattern
        for (let i = 1; i < 4; i++) {
          const margin = i * 10;
          context.strokeRect(
            this.x + margin,
            this.y + margin,
            this.width - 2 * margin,
            this.height - 2 * margin
          );
        }
      }
    }

    // Draw build progress if under construction
    if (this.isBuilding) {
      const progressRatio = this.buildProgress / this.buildTime;
      const barWidth = this.width;
      const barHeight = 8;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Progress
      context.fillStyle = "#4169E1"; // Royal blue
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * progressRatio,
        barHeight
      );
    }

    // Draw HP bar if damaged
    if (!this.isBuilding && this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 8;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336";
      context.lineWidth = 3;
      context.strokeRect(
        this.x - 3,
        this.y - 3,
        this.width + 6,
        this.height + 6
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 3;
      context.strokeRect(
        this.x - 3,
        this.y - 3,
        this.width + 6,
        this.height + 6
      );
    }
  }
}

// Resource Entity
class Resource extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "resource";
    this.resourceType = properties.resourceType || "wood";
    this.amount = properties.amount || 500;
    this.initialAmount = this.amount;
    this.width = properties.width || 30;
    this.height = properties.height || 30;
    this.isUnderAttack = false; // Resources can't be attacked
  }

  update(deltaTime) {
    // Check for regrowth (only for wood)
    if (this.resourceType === "wood" && this.amount === 0) {
      // 1% chance per second to regrow
      const regrowChance = 0.01 * deltaTime;
      if (Math.random() < regrowChance) {
        this.amount = this.initialAmount;
      }
    }
  }

  render(context) {
    // Get center coordinates
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Draw based on resource type with more distinct visuals
    switch (this.resourceType) {
      case "wood":
        // Draw trunk
        context.fillStyle = "#795548"; // Brown
        context.fillRect(centerX - 4, centerY - 2, 8, 20);

        // Draw tree foliage (three layers for more detailed look)
        context.fillStyle = "#33691E"; // Dark green
        // Bottom layer (largest)
        context.beginPath();
        context.moveTo(centerX - 15, centerY);
        context.lineTo(centerX, centerY - 25);
        context.lineTo(centerX + 15, centerY);
        context.closePath();
        context.fill();

        // Middle layer
        context.fillStyle = "#388E3C"; // Medium green
        context.beginPath();
        context.moveTo(centerX - 12, centerY - 10);
        context.lineTo(centerX, centerY - 30);
        context.lineTo(centerX + 12, centerY - 10);
        context.closePath();
        context.fill();

        // Top layer (smallest)
        context.fillStyle = "#43A047"; // Lighter green
        context.beginPath();
        context.moveTo(centerX - 8, centerY - 18);
        context.lineTo(centerX, centerY - 35);
        context.lineTo(centerX + 8, centerY - 18);
        context.closePath();
        context.fill();
        break;

      case "food":
        context.fillStyle = "#81C784"; // Medium green background
        context.fillRect(this.x, this.y, this.width, this.height);

        // Draw food indicator (berries in a bush)
        context.fillStyle = "#D32F2F"; // Red berries
        for (let i = 0; i < 8; i++) {
          const dotX = centerX - 12 + (i % 4) * 8;
          const dotY = centerY - 6 + Math.floor(i / 4) * 12;
          context.beginPath();
          context.arc(dotX, dotY, 3, 0, Math.PI * 2);
          context.fill();
        }

        // Draw leaves around berries
        context.fillStyle = "#388E3C"; // Green leaves
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI * 2 * (i / 6);
          const leafX = centerX + Math.cos(angle) * 15;
          const leafY = centerY + Math.sin(angle) * 15;

          context.beginPath();
          context.ellipse(leafX, leafY, 6, 8, angle, 0, Math.PI * 2);
          context.fill();
        }
        break;

      // Continuing the Resource class render method...

      case "gold":
        // Draw rock formation
        context.fillStyle = "#757575"; // Gray
        context.fillRect(this.x, this.y, this.width, this.height);

        // Draw gold nuggets
        context.fillStyle = "#FFC107"; // Amber
        for (let i = 0; i < 5; i++) {
          const nuggetX = this.x + 5 + (i % 3) * 8;
          const nuggetY = this.y + 5 + Math.floor(i / 3) * 8;
          const nuggetSize = 4 + Math.random() * 6;

          context.beginPath();
          context.arc(nuggetX, nuggetY, nuggetSize / 2, 0, Math.PI * 2);
          context.fill();
        }

        // Add sparkle effect
        context.fillStyle = "#FFEB3B"; // Yellow
        context.beginPath();
        context.arc(this.x + 10, this.y + 5, 2, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(this.x + 25, this.y + 15, 2, 0, Math.PI * 2);
        context.fill();
        break;

      case "stone":
        // Draw multiple stones clustered together
        const stoneColors = ["#9E9E9E", "#757575", "#616161"]; // Different gray shades

        for (let i = 0; i < 4; i++) {
          const stoneX = this.x + 5 + (i % 2) * 15;
          const stoneY = this.y + 5 + Math.floor(i / 2) * 15;
          const stoneSize = 8 + Math.random() * 8;

          context.fillStyle = stoneColors[i % stoneColors.length];
          context.beginPath();
          context.arc(stoneX, stoneY, stoneSize, 0, Math.PI * 2);
          context.fill();
        }

        // Add highlights
        context.fillStyle = "#E0E0E0"; // Light gray
        context.beginPath();
        context.arc(this.x + 10, this.y + 8, 2, 0, Math.PI * 2);
        context.fill();
        break;

      case "iron":
        // Draw rock with iron vein
        context.fillStyle = "#616161"; // Dark gray
        context.fillRect(this.x, this.y, this.width, this.height);

        // Draw iron veins
        context.fillStyle = "#78909C"; // Blue-gray
        context.beginPath();
        context.moveTo(this.x + 5, this.y + 5);
        context.lineTo(this.x + 15, this.y + 10);
        context.lineTo(this.x + 25, this.y + 5);
        context.lineTo(this.x + 25, this.y + 15);
        context.lineTo(this.x + 15, this.y + 25);
        context.lineTo(this.x + 5, this.y + 20);
        context.closePath();
        context.fill();

        // Add metallic highlight
        context.fillStyle = "#B0BEC5"; // Light blue-gray
        context.beginPath();
        context.arc(this.x + 15, this.y + 10, 3, 0, Math.PI * 2);
        context.fill();
        break;

      default:
        // Generic resource
        context.fillStyle = "#9C27B0"; // Purple
        context.fillRect(this.x, this.y, this.width, this.height);
        break;
    }

    // Draw resource amount indicator if it's being depleted
    if (this.amount < this.initialAmount) {
      const amountRatio = this.amount / this.initialAmount;
      const barWidth = this.width;
      const barHeight = 4;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Amount
      context.fillStyle = "#81C784"; // Light green
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * amountRatio,
        barHeight
      );

      // If nearly depleted, add indicator
      if (amountRatio < 0.25) {
        context.fillStyle = "#F44336"; // Red
        context.fillRect(this.x, this.y, 5, 5);
      }
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Decoration Entity (non-interactive elements for visual variety)
class Decoration extends Entity {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "decoration";
    this.decorationType = properties.decorationType || "grass";
    this.width = properties.width || 20;
    this.height = properties.height || 20;
    this.isSelectable = false; // Decorations can't be selected
    this.hp = 1; // Decorations have minimal HP as they're just visual
  }

  update(deltaTime) {
    // Decorations don't need updates
  }

  render(context) {
    switch (this.decorationType) {
      case "grass":
        // Draw grass patch
        context.fillStyle = "#7CB342"; // Light green

        // Draw multiple grass blades
        for (let i = 0; i < 5; i++) {
          const bladeX = this.x + 2 + i * 4;
          const bladeHeight = 5 + Math.floor(Math.random() * 5);

          context.beginPath();
          context.moveTo(bladeX, this.y + this.height);
          context.lineTo(bladeX + 2, this.y + this.height - bladeHeight);
          context.lineTo(bladeX + 4, this.y + this.height);
          context.closePath();
          context.fill();
        }
        break;

      case "flower":
        // Draw stem
        context.fillStyle = "#7CB342"; // Light green
        context.fillRect(
          this.x + this.width / 2 - 1,
          this.y + 5,
          2,
          this.height - 5
        );

        // Draw flower
        const flowerColors = [
          "#F44336",
          "#E91E63",
          "#9C27B0",
          "#FFEB3B",
          "#FFFFFF",
        ];
        const flowerColor =
          flowerColors[Math.floor(Math.random() * flowerColors.length)];

        context.fillStyle = flowerColor;
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + 5, 5, 0, Math.PI * 2);
        context.fill();

        // Draw center
        context.fillStyle = "#FFC107"; // Amber
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + 5, 2, 0, Math.PI * 2);
        context.fill();
        break;

      case "rock":
        // Draw a small rock
        context.fillStyle = "#9E9E9E"; // Gray
        context.beginPath();
        context.arc(
          this.x + this.width / 2,
          this.y + this.height / 2,
          this.width / 2,
          0,
          Math.PI * 2
        );
        context.fill();

        // Add highlight
        context.fillStyle = "#E0E0E0"; // Light gray
        context.beginPath();
        context.arc(
          this.x + this.width / 2 - 2,
          this.y + this.height / 2 - 2,
          2,
          0,
          Math.PI * 2
        );
        context.fill();
        break;

      case "bush":
        // Draw a bush with multiple circular parts
        context.fillStyle = "#388E3C"; // Medium green

        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 0 && j === 0) continue; // Skip top-left
            if (i === 0 && j === 2) continue; // Skip top-right
            if (i === 2 && j === 0) continue; // Skip bottom-left
            if (i === 2 && j === 2) continue; // Skip bottom-right

            const circleX = this.x + 5 + j * 5;
            const circleY = this.y + 5 + i * 5;
            const radius = 5 + Math.random() * 2;

            context.beginPath();
            context.arc(circleX, circleY, radius, 0, Math.PI * 2);
            context.fill();
          }
        }
        break;

      default:
        // Generic decoration
        context.fillStyle = "#9E9E9E"; // Gray
        context.fillRect(this.x, this.y, this.width, this.height);
        break;
    }
  }
}

// Gate Entity (extends Wall but can be opened/closed)
class Gate extends Wall {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "gate";
    this.isOpen = properties.isOpen || false;
    this.canPassThrough = this.isOpen;
    this.isSelectable = true;
  }

  toggleGate() {
    this.isOpen = !this.isOpen;
    this.canPassThrough = this.isOpen;
  }

  render(context) {
    // Determine color based on owner
    const civilizationColor =
      this.owner === "player"
        ? this.engine.civilizationManager.getColor()
        : "#F44336";

    if (this.isBuilding) {
      // Under construction, just like a wall
      super.render(context);
      return;
    }

    // Draw the gate frame
    context.fillStyle = "#5D4037"; // Dark brown frame
    context.fillRect(this.x, this.y, this.width, 5); // Top
    context.fillRect(this.x, this.y + this.height - 5, this.width, 5); // Bottom
    context.fillRect(this.x, this.y, 5, this.height); // Left
    context.fillRect(this.x + this.width - 5, this.y, 5, this.height); // Right

    // Draw the gate itself
    if (this.isOpen) {
      // Draw open gate (showing the opening)
      context.fillStyle = "#8D6E63"; // Light brown
      context.fillRect(this.x + 5, this.y + 5, 5, this.height - 10); // Left part folded
      context.fillRect(
        this.x + this.width - 10,
        this.y + 5,
        5,
        this.height - 10
      ); // Right part folded
    } else {
      // Draw closed gate
      context.fillStyle = "#8D6E63"; // Light brown
      context.fillRect(
        this.x + 5,
        this.y + 5,
        this.width - 10,
        this.height - 10
      );

      // Add gate details - horizontal planks
      context.fillStyle = "#6D4C41"; // Darker brown for detail
      for (let i = 0; i < 3; i++) {
        context.fillRect(
          this.x + 8,
          this.y + 10 + (i * (this.height - 20)) / 3,
          this.width - 16,
          5
        );
      }

      // Add hinges
      context.fillStyle = "#424242"; // Dark gray metal
      context.fillRect(this.x + 7, this.y + 10, 8, 8); // Top left
      context.fillRect(this.x + 7, this.y + this.height - 18, 8, 8); // Bottom left
      context.fillRect(this.x + this.width - 15, this.y + 10, 8, 8); // Top right
      context.fillRect(
        this.x + this.width - 15,
        this.y + this.height - 18,
        8,
        8
      ); // Bottom right
    }

    // Draw gate status indicator
    context.fillStyle = this.isOpen ? "#4CAF50" : "#F44336"; // Green when open, red when closed
    context.fillRect(this.x + this.width / 2 - 5, this.y - 2, 10, 5);

    // Draw HP bar if damaged
    if (!this.isBuilding && this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const barWidth = this.width;
      const barHeight = 5;

      // Background
      context.fillStyle = "#000000";
      context.fillRect(this.x, this.y - barHeight - 2, barWidth, barHeight);

      // Health
      context.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FFC107" : "#F44336";
      context.fillRect(
        this.x,
        this.y - barHeight - 2,
        barWidth * hpRatio,
        barHeight
      );
    }

    // Flash if under attack
    if (this.isUnderAttack && performance.now() - this.lastDamageTime < 1000) {
      context.strokeStyle = "#F44336";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }

    // Draw outline if selected
    if (this.isSelected) {
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(
        this.x - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
  }
}

// Tower Entity (extends Building but with attack capabilities)
class Tower extends Building {
  constructor(id, properties, engine) {
    super(id, properties, engine);
    this.type = "tower";
    this.buildingType = "tower";

    // Tower-specific properties
    this.canAttack = true;
    this.attackRange = properties.attackRange || 150;
    this.attackCooldown = properties.attackCooldown || 2; // seconds
    this.lastAttackTime = 0;
    this.ar = properties.ar || 15; // Attack rating
    this.attackType = "piercing";

    // Tower state
    this.targetEntity = null;
    this.state = "idle"; // idle, attacking
  }

  update(deltaTime) {
    // Skip if still under construction
    if (this.isBuilding) return;

    // Auto-target if no target or target destroyed
    if (
      this.state !== "attacking" ||
      !this.targetEntity ||
      this.targetEntity.hp <= 0
    ) {
      this.findTarget();
    }

    // If we have a target, attack it
    if (this.state === "attacking" && this.targetEntity) {
      this.attack(deltaTime);
    }
  }

  findTarget() {
    // Find the nearest enemy within range
    const enemies = this.engine.entityManager.getEntitiesByOwner(
      this.owner === "player" ? "enemy" : "player"
    );

    let nearestEnemy = null;
    let minDistance = Infinity;

    for (const enemy of enemies) {
      const distance = this.getDistanceToEntity(enemy);
      if (distance < minDistance && distance <= this.attackRange) {
        nearestEnemy = enemy;
        minDistance = distance;
      }
    }

    if (nearestEnemy) {
      this.targetEntity = nearestEnemy;
      this.state = "attacking";
    } else {
      this.targetEntity = null;
      this.state = "idle";
    }
  }

  getDistanceToEntity(entity) {
    const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
    const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  attack(deltaTime) {
    if (!this.targetEntity || this.targetEntity.hp <= 0) {
      this.state = "idle";
      return;
    }

    // Check attack cooldown
    const now = performance.now() / 1000; // Convert to seconds
    if (now - this.lastAttackTime < this.attackCooldown) return;

    // Attack the target
    this.targetEntity.takeDamage(this.ar, this.attackType, this);

    // Reset attack cooldown
    this.lastAttackTime = now;

    // If target is destroyed, find new target
    if (this.targetEntity.hp <= 0) {
      this.findTarget();
    }
  }

  render(context) {
    // Basic building rendering
    super.render(context);

    // Add tower-specific visuals
    if (!this.isBuilding) {
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;

      // Draw tower top (battlements)
      context.fillStyle =
        this.owner === "player"
          ? this.engine.civilizationManager.getColor()
          : "#F44336";

      // Draw crenellations
      for (let i = 0; i < 4; i++) {
        context.fillRect(
          this.x + 5 + (i * (this.width - 10)) / 3,
          this.y - 5,
          (this.width - 10) / 6,
          5
        );
      }

      // Draw attack indicator if attacking
      if (this.state === "attacking" && this.targetEntity) {
        const targetX = this.targetEntity.x + this.targetEntity.width / 2;
        const targetY = this.targetEntity.y + this.targetEntity.height / 2;

        // Draw firing line
        context.strokeStyle = "#FFEB3B"; // Yellow
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(targetX, targetY);
        context.stroke();

        // Draw arrow/projectile
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const ratio = 0.7; // Position arrow 70% of the way to target

        const arrowX = centerX + dx * ratio;
        const arrowY = centerY + dy * ratio;
        const angle = Math.atan2(dy, dx);

        context.save();
        context.translate(arrowX, arrowY);
        context.rotate(angle);

        // Draw arrow
        context.fillStyle = "#E0E0E0"; // Light gray
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-8, -2);
        context.lineTo(-6, 0);
        context.lineTo(-8, 2);
        context.closePath();
        context.fill();

        context.restore();
      }

      // Draw range indicator if selected
      if (this.isSelected) {
        context.strokeStyle = "rgba(255, 255, 255, 0.3)";
        context.lineWidth = 1;
        context.beginPath();
        context.arc(centerX, centerY, this.attackRange, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }
}

// Formation Manager
class FormationManager {
  constructor(engine) {
    this.engine = engine;
    this.formations = {}; // Format: { formationId: { type, units, positions } }

    // Formation type bonuses
    this.formationBonuses = {
      line: {
        attackDamage: 1.2, // +20% attack damage
        damageReduction: 0.1, // 10% damage reduction
        moveSpeed: 0.8, // 20% speed penalty
      },
      wedge: {
        attackDamage: 1.5, // +50% attack damage
        damageReduction: 0, // No damage reduction
        moveSpeed: 0.9, // 10% speed penalty
      },
      square: {
        attackDamage: 1.0, // No attack bonus
        damageReduction: 0.3, // 30% damage reduction
        moveSpeed: 0.7, // 30% speed penalty
      },
      skirmish: {
        attackDamage: 0.9, // -10% attack damage
        damageReduction: 0, // No damage reduction
        moveSpeed: 1.2, // 20% speed bonus
      },
    };

    this.nextFormationId = 1;
  }

  createFormation(units, formationType) {
    if (units.length === 0) return null;

    const formationId = this.nextFormationId++;
    const bonuses = this.formationBonuses[formationType] || {};

    // Calculate formation positions
    const positions = this.calculateFormationPositions(units, formationType);

    // Create the formation
    this.formations[formationId] = {
      type: formationType,
      units: units,
      positions: positions,
      bonuses: bonuses,
    };

    // Assign units to the formation
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      unit.formation = formationType;
      unit.formationPosition = positions[i];
      unit.formationBonus = bonuses;

      // Add formation movement callback
      unit.onMove = () => this.onFormationUnitMove(formationId);
    }

    return formationId;
  }

  onFormationUnitMove(formationId) {
    // When one unit moves, all formation units should move to maintain formation
    const formation = this.formations[formationId];
    if (!formation) return;

    // TODO: Implement formation movement logic
    // This would recalculate positions based on the new centerpoint
  }

  calculateFormationPositions(units, formationType) {
    const positions = [];

    // Calculate center position of all units
    let centerX = 0;
    let centerY = 0;

    for (const unit of units) {
      centerX += unit.x + unit.width / 2;
      centerY += unit.y + unit.height / 2;
    }

    centerX /= units.length;
    centerY /= units.length;

    // Calculate positions based on formation type
    switch (formationType) {
      case "line":
        // Units in a horizontal line
        const lineWidth = units.length * 30; // 30 pixels per unit
        const lineStart = centerX - lineWidth / 2;

        for (let i = 0; i < units.length; i++) {
          positions.push({
            x: lineStart + i * 30,
            y: centerY,
          });
        }
        break;

      case "wedge":
        // V-shaped formation
        for (let i = 0; i < units.length; i++) {
          const row = Math.floor(i / 3);
          const col = i % 3;

          positions.push({
            x: centerX + (col - 1) * 30 + row * 15,
            y: centerY + row * 25,
          });
        }
        break;

      case "square":
        // Square/rectangle formation
        const sideLength = Math.ceil(Math.sqrt(units.length));

        for (let i = 0; i < units.length; i++) {
          const row = Math.floor(i / sideLength);
          const col = i % sideLength;

          positions.push({
            x: centerX + (col - sideLength / 2) * 25,
            y: centerY + (row - sideLength / 2) * 25,
          });
        }
        break;

      case "skirmish":
        // Loose, spread out formation
        for (let i = 0; i < units.length; i++) {
          positions.push({
            x: centerX + (Math.random() * 2 - 1) * 50,
            y: centerY + (Math.random() * 2 - 1) * 50,
          });
        }
        break;

      default:
        // Default to a simple cluster
        for (let i = 0; i < units.length; i++) {
          const angle = (i / units.length) * Math.PI * 2;
          positions.push({
            x: centerX + Math.cos(angle) * 30,
            y: centerY + Math.sin(angle) * 30,
          });
        }
        break;
    }

    return positions;
  }

  disbandFormation(formationId) {
    const formation = this.formations[formationId];
    if (!formation) return;

    // Remove formation from units
    for (const unit of formation.units) {
      unit.formation = null;
      unit.formationPosition = null;
      unit.formationBonus = null;
      unit.onMove = null;
    }

    // Remove formation
    delete this.formations[formationId];
  }

  updateFormations() {
    // Update all formations
    for (const formationId in this.formations) {
      const formation = this.formations[formationId];

      // Check if any units are missing or dead
      formation.units = formation.units.filter(
        (unit) =>
          unit &&
          unit.hp > 0 &&
          this.engine.entityManager.entities.includes(unit)
      );

      // Disband if not enough units left
      if (formation.units.length < 2) {
        this.disbandFormation(formationId);
        continue;
      }

      // Recalculate positions if needed
      // This could be triggered by specific events rather than every update
    }
  }
}

// Entity Factory
class EntityFactory {
  constructor(engine) {
    this.engine = engine;
    this.nextEntityId = 1;
  }

  createEntity(type, properties = {}) {
    const id = this.nextEntityId++;
    let entity;

    switch (type) {
      case "villager":
        entity = new Villager(id, properties, this.engine);
        break;

      case "soldier":
        entity = new Soldier(id, properties, this.engine);
        break;

      case "siege":
        entity = new SiegeUnit(id, properties, this.engine);
        break;

      case "hero":
        entity = new HeroUnit(id, properties, this.engine);
        break;

      case "building":
        entity = new Building(id, properties, this.engine);
        break;

      case "wall":
        entity = new Wall(id, properties, this.engine);
        break;

      case "gate":
        entity = new Gate(id, properties, this.engine);
        break;

      case "tower":
        entity = new Tower(id, properties, this.engine);
        break;

      case "wonder":
        entity = new Wonder(id, properties, this.engine);
        break;

      case "resource":
        entity = new Resource(id, properties, this.engine);
        break;

      case "decoration":
        entity = new Decoration(id, properties, this.engine);
        break;

      default:
        entity = new Entity(id, properties, this.engine);
        break;
    }

    return entity;
  }

  createVillager(x, y, owner) {
    return this.createEntity("villager", {
      x,
      y,
      owner,
    });
  }

  createSoldier(x, y, owner, soldierType) {
    // Set properties based on soldier type
    const soldierProperties = {
      spearman: {
        ar: 15,
        dp: 12,
        attackType: "piercing",
        attackCooldown: 1.5,
      },
      swordsman: {
        ar: 20,
        dp: 15,
        attackType: "slashing",
        attackCooldown: 1.2,
      },
      archer: {
        ar: 12,
        dp: 8,
        attackType: "piercing",
        attackRange: 120,
        attackCooldown: 2,
      },
      skirmisher: {
        ar: 10,
        dp: 5,
        attackType: "piercing",
        attackRange: 100,
        attackCooldown: 1,
      },
      heavyInfantry: {
        ar: 25,
        dp: 25,
        attackType: "blunt",
        attackCooldown: 2,
      },
    };

    const properties = soldierProperties[soldierType] || {};
    properties.x = x;
    properties.y = y;
    properties.owner = owner;
    properties.soldierType = soldierType;

    return this.createEntity("soldier", properties);
  }

  // Continuing the EntityFactory class...

  createSiegeUnit(x, y, owner, siegeType) {
    // Set properties based on siege type
    const siegeProperties = {
      catapult: {
        ar: 50,
        attackRange: 150,
        attackCooldown: 3,
      },
      ballista: {
        ar: 40,
        attackRange: 180,
        attackCooldown: 2,
      },
      ram: {
        ar: 80,
        attackRange: 20,
        attackCooldown: 2.5,
      },
    };

    const properties = siegeProperties[siegeType] || {};
    properties.x = x;
    properties.y = y;
    properties.owner = owner;
    properties.siegeType = siegeType;

    return this.createEntity("siege", properties);
  }

  createHeroUnit(x, y, owner, heroType) {
    // Set properties based on hero type
    const heroProperties = {
      sun_king: {
        ar: 30,
        dp: 25,
        hp: 300,
        maxHp: 300,
        attackType: "slashing",
        abilityName: "Solar Flare",
        abilityCooldown: 60,
      },
      dawn_sage: {
        ar: 20,
        dp: 15,
        hp: 250,
        maxHp: 250,
        attackType: "magical",
        abilityName: "Radiant Healing",
        abilityCooldown: 90,
      },
      moon_priestess: {
        ar: 25,
        dp: 20,
        hp: 275,
        maxHp: 275,
        attackType: "magical",
        abilityName: "Lunar Veil",
        abilityCooldown: 75,
      },
      nightstalker: {
        ar: 35,
        dp: 15,
        hp: 225,
        maxHp: 225,
        attackType: "slashing",
        abilityName: "Shadow Strike",
        abilityCooldown: 45,
      },
    };

    const properties = heroProperties[heroType] || {};
    properties.x = x;
    properties.y = y;
    properties.owner = owner;
    properties.heroType = heroType;

    return this.createEntity("hero", properties);
  }

  createBuilding(x, y, owner, buildingType, isBuilding = true) {
    // Set properties based on building type
    const buildingProperties = {
      town_center: {
        width: 80,
        height: 80,
        hp: 1000,
        maxHp: 1000,
        dp: 30,
        buildTime: 180, // 3 minutes
      },
      house: {
        width: 40,
        height: 40,
        hp: 200,
        maxHp: 200,
        dp: 5,
        buildTime: 30,
      },
      barracks: {
        width: 60,
        height: 60,
        hp: 500,
        maxHp: 500,
        dp: 15,
        buildTime: 45,
      },
      lumber_mill: {
        width: 50,
        height: 50,
        hp: 300,
        maxHp: 300,
        dp: 10,
        buildTime: 40,
        produces: "wood",
        productionRate: 0.1,
      },
      granary: {
        width: 50,
        height: 50,
        hp: 300,
        maxHp: 300,
        dp: 10,
        buildTime: 40,
        produces: "food",
        productionRate: 0.1,
      },
      market: {
        width: 60,
        height: 60,
        hp: 400,
        maxHp: 400,
        dp: 10,
        buildTime: 50,
      },
      temple: {
        width: 70,
        height: 70,
        hp: 600,
        maxHp: 600,
        dp: 20,
        buildTime: 60,
      },
      forge: {
        width: 50,
        height: 50,
        hp: 400,
        maxHp: 400,
        dp: 15,
        buildTime: 45,
        produces: "iron",
        productionRate: 0.05,
      },
    };

    const properties = buildingProperties[buildingType] || {};
    properties.x = x;
    properties.y = y;
    properties.owner = owner;
    properties.type = buildingType;
    properties.isBuilding = isBuilding;

    return this.createEntity("building", properties);
  }

  createWall(x, y, owner, isBuilding = true) {
    return this.createEntity("wall", {
      x,
      y,
      owner,
      isBuilding,
      width: 40,
      height: 20,
    });
  }

  createGate(x, y, owner, isBuilding = true) {
    return this.createEntity("gate", {
      x,
      y,
      owner,
      isBuilding,
      width: 40,
      height: 20,
    });
  }

  createTower(x, y, owner, isBuilding = true) {
    return this.createEntity("tower", {
      x,
      y,
      owner,
      isBuilding,
      width: 40,
      height: 60,
      hp: 600,
      maxHp: 600,
      dp: 20,
      attackRange: 150,
      ar: 15,
    });
  }

  createWonder(x, y, owner, isBuilding = true) {
    return this.createEntity("wonder", {
      x,
      y,
      owner,
      isBuilding,
      wonderType:
        owner === "player"
          ? this.engine.civilizationManager.getWonderType()
          : "enemy_wonder",
    });
  }

  createResource(x, y, resourceType, amount = 500) {
    const resourceSizes = {
      wood: { width: 30, height: 50 },
      food: { width: 30, height: 30 },
      gold: { width: 30, height: 30 },
      stone: { width: 40, height: 40 },
      iron: { width: 35, height: 35 },
    };

    const size = resourceSizes[resourceType] || { width: 30, height: 30 };

    return this.createEntity("resource", {
      x,
      y,
      width: size.width,
      height: size.height,
      resourceType,
      amount,
    });
  }

  createDecoration(x, y, decorationType) {
    const decorationSizes = {
      grass: { width: 20, height: 10 },
      flower: { width: 10, height: 15 },
      rock: { width: 15, height: 15 },
      bush: { width: 20, height: 20 },
    };

    const size = decorationSizes[decorationType] || { width: 20, height: 20 };

    return this.createEntity("decoration", {
      x,
      y,
      width: size.width,
      height: size.height,
      decorationType,
    });
  }
}

// Entity Manager
class EntityManager {
  constructor(engine) {
    this.engine = engine;
    this.entities = [];
    this.entityFactory = new EntityFactory(engine);
    this.selectedEntities = [];
  }

  addEntity(entity) {
    this.entities.push(entity);
    return entity;
  }

  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      // Remove from selection if selected
      this.deselectEntity(entity);

      // Remove from entities array
      this.entities.splice(index, 1);
    }
  }

  getEntityById(id) {
    return this.entities.find((entity) => entity.id === id);
  }

  getEntitiesAtPosition(x, y) {
    return this.entities.filter((entity) => entity.contains(x, y));
  }

  getEntitiesInArea(x, y, width, height) {
    return this.entities.filter((entity) =>
      entity.intersects(x, y, width, height)
    );
  }

  getEntitiesByType(type) {
    return this.entities.filter((entity) => entity.type === type);
  }

  getEntitiesByOwner(owner) {
    return this.entities.filter((entity) => entity.owner === owner);
  }

  getEntitiesByOwnerAndType(owner, type) {
    return this.entities.filter(
      (entity) => entity.owner === owner && entity.type === type
    );
  }

  selectEntity(entity) {
    if (!entity.isSelected && entity.owner === "player") {
      entity.isSelected = true;
      this.selectedEntities.push(entity);

      // Update UI
      this.engine.uiManager.updateSelectionInfo(this.selectedEntities);
    }
  }

  deselectEntity(entity) {
    const index = this.selectedEntities.indexOf(entity);
    if (index !== -1) {
      entity.isSelected = false;
      this.selectedEntities.splice(index, 1);

      // Update UI
      this.engine.uiManager.updateSelectionInfo(this.selectedEntities);
    }
  }

  selectEntitiesInArea(x, y, width, height) {
    // First deselect all currently selected entities
    this.clearSelection();

    // Then select all player-owned entities in the area
    const entities = this.getEntitiesInArea(x, y, width, height).filter(
      (entity) => entity.owner === "player"
    );

    for (const entity of entities) {
      this.selectEntity(entity);
    }
  }

  clearSelection() {
    for (const entity of this.selectedEntities) {
      entity.isSelected = false;
    }

    this.selectedEntities = [];

    // Update UI
    this.engine.uiManager.updateSelectionInfo(this.selectedEntities);
  }

  getSelectedEntities() {
    return this.selectedEntities;
  }

  update(deltaTime) {
    // Update all entities
    for (const entity of this.entities) {
      entity.update(deltaTime);

      // Reset attack indicator after a delay
      if (
        entity.isUnderAttack &&
        performance.now() - entity.lastDamageTime > 1000
      ) {
        entity.isUnderAttack = false;
      }

      // Remove dead entities
      if (entity.hp <= 0) {
        this.removeEntity(entity);
      }
    }
  }

  render(context) {
    // Sort entities by y-position for proper depth drawing
    const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);

    // Render all entities
    for (const entity of sortedEntities) {
      entity.render(context);
    }
  }
}

// Resource Manager
class ResourceManager {
  constructor(engine) {
    this.engine = engine;
    this.resources = {
      wood: 200,
      food: 200,
      gold: 100,
      stone: 100,
      iron: 0,
    };

    // Resource costs for different entities
    this.entityCosts = {
      villager: { food: 50 },
      spearman: { food: 40, wood: 20 },
      swordsman: { food: 40, gold: 20 },
      archer: { food: 30, wood: 40 },
      skirmisher: { food: 25, wood: 30 },
      heavyInfantry: { food: 60, gold: 30, iron: 10 },
      catapult: { wood: 100, gold: 50 },
      ballista: { wood: 120, gold: 40 },
      ram: { wood: 150 },
      house: { wood: 30 },
      barracks: { wood: 100, stone: 50 },
      lumber_mill: { wood: 80, stone: 30 },
      granary: { wood: 80, stone: 30 },
      market: { wood: 100, gold: 50 },
      temple: { wood: 100, stone: 100, gold: 50 },
      forge: { wood: 80, stone: 60, iron: 20 },
      wall: { stone: 20 },
      gate: { wood: 20, stone: 20 },
      tower: { stone: 100, wood: 50 },
      wonder: { wood: 500, stone: 500, gold: 500, food: 500 },
    };

    // Resource gathering spots
    this.resourceSpots = [];
  }

  addResource(type, amount) {
    if (this.resources[type] !== undefined) {
      this.resources[type] += amount;

      // Update UI
      this.engine.uiManager.updateResourceDisplay(this.resources);
    }
  }

  addResources(resourcesObj) {
    for (const type in resourcesObj) {
      this.addResource(type, resourcesObj[type]);
    }
  }

  spendResource(type, amount) {
    if (this.resources[type] !== undefined && this.resources[type] >= amount) {
      this.resources[type] -= amount;

      // Update UI
      this.engine.uiManager.updateResourceDisplay(this.resources);
      return true;
    }
    return false;
  }

  spendResources(resourcesObj) {
    // First check if we have enough resources
    for (const type in resourcesObj) {
      if (this.resources[type] < resourcesObj[type]) {
        return false;
      }
    }

    // Then spend them
    for (const type in resourcesObj) {
      this.spendResource(type, resourcesObj[type]);
    }

    return true;
  }

  canAfford(entityType) {
    const cost = this.entityCosts[entityType];
    if (!cost) return true;

    for (const type in cost) {
      if (this.resources[type] < cost[type]) {
        return false;
      }
    }

    return true;
  }

  getCost(entityType) {
    return this.entityCosts[entityType] || {};
  }

  addResourceNode(resourceEntity) {
    this.resourceSpots.push(resourceEntity);
  }

  resourceNodeDepleted(resourceEntity) {
    const index = this.resourceSpots.indexOf(resourceEntity);
    if (index !== -1) {
      this.resourceSpots.splice(index, 1);
    }
  }

  getNearestResourceByType(position, type) {
    let nearestResource = null;
    let minDistance = Infinity;

    for (const resource of this.resourceSpots) {
      if (resource.resourceType === type && resource.amount > 0) {
        const dx = resource.x - position.x;
        const dy = resource.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          nearestResource = resource;
          minDistance = distance;
        }
      }
    }

    return nearestResource;
  }

  canRepair(entity, hpAmount) {
    // Calculate repair cost based on entity type and HP amount
    const repairCost = this.calculateRepairCost(entity, hpAmount);

    // Check if we have enough resources
    return this.canAffordRepair(repairCost);
  }

  spendRepairResources(entity, hpAmount) {
    const repairCost = this.calculateRepairCost(entity, hpAmount);
    return this.spendResources(repairCost);
  }

  calculateRepairCost(entity, hpAmount) {
    const repairCost = {};

    // 1 unit of repair costs a percentage of the original build cost
    const hpRatio = hpAmount / entity.maxHp;

    if (entity.type === "building" || entity.type === "wonder") {
      const originalCost = this.entityCosts[entity.buildingType] || {};

      for (const resourceType in originalCost) {
        repairCost[resourceType] = Math.ceil(
          originalCost[resourceType] * hpRatio * 0.3
        );
      }
    } else if (entity.type === "wall" || entity.type === "gate") {
      repairCost.stone = Math.ceil(5 * hpRatio);
    } else if (entity.type === "tower") {
      repairCost.stone = Math.ceil(15 * hpRatio);
      repairCost.wood = Math.ceil(10 * hpRatio);
    } else if (entity.type === "siege") {
      repairCost.wood = Math.ceil(20 * hpRatio);
    }

    return repairCost;
  }

  canAffordRepair(repairCost) {
    for (const type in repairCost) {
      if (this.resources[type] < repairCost[type]) {
        return false;
      }
    }

    return true;
  }

  updateResourceCosts() {
    // Age-based technology cost adjustments
    const ageCostMultipliers = {
      stone: 1,
      bronze: 1.2,
      iron: 1.5,
      golden: 1.8,
      eternal: 2,
    };

    const currentAge = this.engine.gameState.currentAge;
    const multiplier = ageCostMultipliers[currentAge] || 1;

    // Apply civilization bonuses and penalties
    const civResourceBonuses =
      this.engine.civilizationManager.getResourceCostModifiers();

    // Update costs for advanced units/buildings
    if (currentAge === "bronze" || currentAge === "iron") {
      this.entityCosts.heavyInfantry = {
        food: 60 * multiplier,
        gold: 30 * multiplier,
        iron: 10,
      };
      this.entityCosts.swordsman = {
        food: 40 * multiplier,
        gold: 20 * multiplier,
      };

      // Apply civ bonuses
      for (const unitType in this.entityCosts) {
        for (const resourceType in this.entityCosts[unitType]) {
          // Apply general multiplier
          this.entityCosts[unitType][resourceType] *= multiplier;

          // Apply civilization-specific bonuses
          if (civResourceBonuses[resourceType]) {
            this.entityCosts[unitType][resourceType] *=
              civResourceBonuses[resourceType];
          }

          // Round to nearest integer
          this.entityCosts[unitType][resourceType] = Math.round(
            this.entityCosts[unitType][resourceType]
          );
        }
      }
    }
  }
}

// Civilization Manager
class CivilizationManager {
  constructor(engine) {
    this.engine = engine;
    this.civilizations = {
      solari: {
        name: "Solari Empire",
        color: "#FFC107", // Amber
        wonderType: "sun_pyramid",
        perks: {
          resourceGather: 1.2, // 20% faster resource gathering
          soldierAttack: 1.1, // 10% more soldier attack
          buildingHp: 1.2, // 20% more building HP
        },
        techTree: {
          age3: ["sunforge_weapons", "sun_blessed_farms"],
          age4: ["imperial_metallurgy", "solar_architecture"],
          age5: ["ancient_sun_magic"],
        },
        resourceModifiers: {
          food: 0.9, // 10% cheaper food costs
          gold: 1.1, // 10% more expensive gold costs
        },
      },
      lunari: {
        name: "Lunari Confederation",
        color: "#9FA8DA", // Light blue indigo
        wonderType: "moon_sanctuary",
        perks: {
          unitMove: 1.15, // 15% faster unit movement
          buildTime: 0.85, // 15% faster building construction
          resourceStorage: 1.3, // 30% more resource storage
        },
        techTree: {
          age3: ["moonsilver_arrows", "nighttime_tactics"],
          age4: ["silver_metallurgy", "lunar_architecture"],
          age5: ["ancient_moon_magic"],
        },
        resourceModifiers: {
          wood: 0.9, // 10% cheaper wood costs
          stone: 1.1, // 10% more expensive stone costs
        },
      },
    };

    this.currentCivilization = "solari"; // Default
    this.techs = {
      researched: [],
    };
  }

  setCivilization(civName) {
    if (this.civilizations[civName]) {
      this.currentCivilization = civName;

      // Apply civilization bonuses
      this.applyBonuses();

      return true;
    }
    return false;
  }

  getCivilization() {
    return this.civilizations[this.currentCivilization];
  }

  getCivilizationName() {
    return this.getCivilization().name;
  }

  getColor() {
    return this.getCivilization().color;
  }

  getWonderType() {
    return this.getCivilization().wonderType;
  }

  getPerk(perkName) {
    const civ = this.getCivilization();
    return civ.perks[perkName] || 1; // Return 1 (no multiplier) if perk doesn't exist
  }

  getResourceCostModifiers() {
    const civ = this.getCivilization();
    return civ.resourceModifiers || {};
  }

  applyBonuses() {
    const civ = this.getCivilization();

    // Apply building HP bonus to existing buildings
    if (civ.perks.buildingHp) {
      const buildings = this.engine.entityManager.getEntitiesByOwnerAndType(
        "player",
        "building"
      );
      const walls = this.engine.entityManager.getEntitiesByOwnerAndType(
        "player",
        "wall"
      );
      const towers = this.engine.entityManager.getEntitiesByOwnerAndType(
        "player",
        "tower"
      );
      const wonders = this.engine.entityManager.getEntitiesByOwnerAndType(
        "player",
        "wonder"
      );

      const allStructures = [...buildings, ...walls, ...towers, ...wonders];

      for (const building of allStructures) {
        if (!building.maxHpModified) {
          building.maxHp *= civ.perks.buildingHp;
          building.hp *= civ.perks.buildingHp;
          building.maxHpModified = true;
        }
      }
    }

    // Apply resource gathering bonus
    // This is handled in the Villager update method

    // Apply movement speed bonus
    // This is handled in the unit update methods

    // Apply soldier attack bonus
    // This is handled in the Soldier update method
  }

  researchTech(techName) {
    // Check if tech is valid for current civilization and age
    const civ = this.getCivilization();
    const currentAge = this.engine.gameState.currentAge;

    let techFound = false;

    for (const age in civ.techTree) {
      if (civ.techTree[age].includes(techName)) {
        techFound = true;
        break;
      }
    }

    if (!techFound) {
      console.error(`Tech ${techName} not found in ${civ.name} tech tree`);
      return false;
    }

    // Check if already researched
    if (this.techs.researched.includes(techName)) {
      console.error(`Tech ${techName} already researched`);
      return false;
    }

    // Apply tech effects
    this.applyTechEffects(techName);

    // Mark as researched
    this.techs.researched.push(techName);

    return true;
  }

  applyTechEffects(techName) {
    // Apply specific tech effects
    switch (techName) {
      case "sunforge_weapons":
        // Increase soldier attack by 20%
        const soldiers = this.engine.entityManager.getEntitiesByOwnerAndType(
          "player",
          "soldier"
        );
        for (const soldier of soldiers) {
          soldier.ar *= 1.2;
        }
        break;

      case "sun_blessed_farms":
        // Increase food production by 25%
        const foodBuildings = this.engine.entityManager.entities.filter(
          (entity) => entity.owner === "player" && entity.produces === "food"
        );

        for (const building of foodBuildings) {
          building.productionRate *= 1.25;
        }
        break;

      case "moonsilver_arrows":
        // Increase archer range by 20%
        const archers = this.engine.entityManager.entities.filter(
          (entity) =>
            entity.owner === "player" && entity.soldierType === "archer"
        );

        for (const archer of archers) {
          archer.attackRange *= 1.2;
        }
        break;

      case "nighttime_tactics":
        // Increase unit speed at night by 20%
        // This is handled in the unit update methods
        break;

      case "imperial_metallurgy":
      case "silver_metallurgy":
        // Increase soldier defense by 25%
        const allSoldiers = this.engine.entityManager.getEntitiesByOwnerAndType(
          "player",
          "soldier"
        );
        for (const soldier of allSoldiers) {
          soldier.dp *= 1.25;
        }
        break;

      case "solar_architecture":
      case "lunar_architecture":
        // Buildings cost 15% less resources
        // This affects all future buildings constructed
        break;

      case "ancient_sun_magic":
      case "ancient_moon_magic":
        // Unlock hero special abilities and reduce cooldown by 33%
        const heroes = this.engine.entityManager.getEntitiesByOwnerAndType(
          "player",
          "hero"
        );
        for (const hero of heroes) {
          hero.abilityCooldown *= 0.67;
        }
        break;
    }
  }

  hasTech(techName) {
    return this.techs.researched.includes(techName);
  }

  getTechTree() {
    return this.getCivilization().techTree;
  }

  getAvailableTechs() {
    const currentAge = this.engine.gameState.currentAge;
    const techTree = this.getTechTree();

    // Map age names to numeric values for comparison
    const ageValues = {
      stone: 1,
      bronze: 2,
      iron: 3,
      golden: 4,
      eternal: 5,
    };

    const currentAgeValue = ageValues[currentAge];

    // Get all techs up to the current age
    const availableTechs = [];

    for (const age in techTree) {
      // Get numeric age value from the key (e.g., 'age3' -> 3)
      const ageNumber = parseInt(age.replace("age", ""));

      if (ageNumber <= currentAgeValue) {
        availableTechs.push(...techTree[age]);
      }
    }

    // Filter out already researched techs
    return availableTechs.filter(
      (tech) => !this.techs.researched.includes(tech)
    );
  }
}

// UI Manager
class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.uiElements = {};
    this.effects = []; // Visual effects
    this.alerts = []; // Temporary alert messages
  }

  init() {
    // Initialize UI elements here
    // This could create DOM elements or set up canvas-based UI
  }

  updateResourceDisplay(resources) {
    // Update resource display in UI
    console.log("Resources:", resources);
    // DOM or canvas updates would happen here
  }

  updateSelectionInfo(selectedEntities) {
    // Update selection info in UI
    console.log(
      "Selected:",
      selectedEntities.map((e) => e.type)
    );
    // DOM or canvas updates would happen here
  }

  updateUnitCapacity() {
    // Update unit capacity display
    const villagers = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "villager"
    ).length;
    const soldiers = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "soldier"
    ).length;
    const maxCapacity = this.engine.gameState.maxPopulation;

    console.log(`Population: ${villagers + soldiers}/${maxCapacity}`);
    // DOM or canvas updates would happen here
  }

  showAlert(message) {
    // Add temporary alert message
    this.alerts.push({
      message,
      time: performance.now(),
      duration: 3000, // 3 seconds
    });

    console.log("Alert:", message);
  }

  createEffect(effectType, x, y, size = 20) {
    // Create visual effect
    this.effects.push({
      type: effectType,
      x,
      y,
      size,
      startTime: performance.now(),
      duration: 1000, // 1 second
    });
  }

  update(deltaTime) {
    // Update effects
    this.effects = this.effects.filter((effect) => {
      return performance.now() - effect.startTime < effect.duration;
    });

    // Update alerts
    this.alerts = this.alerts.filter((alert) => {
      return performance.now() - alert.time < alert.duration;
    });
  }

  render(context) {
    // Render effects
    for (const effect of this.effects) {
      this.renderEffect(context, effect);
    }

    // Render alerts
    this.renderAlerts(context);

    // Render other UI elements as needed
  }

  renderEffect(context, effect) {
    const progress = (performance.now() - effect.startTime) / effect.duration;
    const alpha = 1 - progress;

    switch (effect.type) {
      case "explosion":
        context.fillStyle = `rgba(255, 87, 34, ${alpha})`;
        context.beginPath();
        context.arc(effect.x, effect.y, effect.size * progress, 0, Math.PI * 2);
        context.fill();

        // Add fire particles
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const distance = effect.size * progress * 0.8;

          context.fillStyle = `rgba(255, 193, 7, ${alpha})`;
          context.beginPath();
          context.arc(
            effect.x + Math.cos(angle) * distance,
            effect.y + Math.sin(angle) * distance,
            effect.size * 0.2,
            0,
            Math.PI * 2
          );
          context.fill();
        }
        break;

      case "healing":
        context.fillStyle = `rgba(76, 175, 80, ${alpha})`;
        context.beginPath();
        context.arc(
          effect.x,
          effect.y,
          effect.size * (1 - progress),
          0,
          Math.PI * 2
        );
        context.fill();

        // Add healing crosses
        context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        context.lineWidth = 2;

        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + progress * Math.PI;
          const distance = effect.size * 0.6 * progress;
          const x = effect.x + Math.cos(angle) * distance;
          const y = effect.y + Math.sin(angle) * distance;
          const size = effect.size * 0.2;

          // Draw cross
          context.beginPath();
          context.moveTo(x - size, y);
          context.lineTo(x + size, y);
          context.stroke();

          context.beginPath();
          context.moveTo(x, y - size);
          context.lineTo(x, y + size);
          context.stroke();
        }
        break;

      case "stealth":
        context.strokeStyle = `rgba(170, 170, 170, ${alpha})`;
        context.lineWidth = 1;

        // Draw fading rings
        for (let i = 0; i < 3; i++) {
          const size = effect.size * (0.5 + i * 0.25) * progress;
          context.beginPath();
          context.arc(effect.x, effect.y, size, 0, Math.PI * 2);
          context.stroke();
        }

        // Draw fog particle effect
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * effect.size * progress;
          const size = 2 + Math.random() * 4;

          context.fillStyle = `rgba(200, 200, 200, ${alpha * 0.5})`;
          context.beginPath();
          context.arc(
            effect.x + Math.cos(angle) * distance,
            effect.y + Math.sin(angle) * distance,
            size,
            0,
            Math.PI * 2
          );
          context.fill();
        }
        break;

      case "shadow_strike":
        context.fillStyle = `rgba(33, 33, 33, ${alpha})`;
        context.beginPath();
        context.arc(effect.x, effect.y, 10, 0, Math.PI * 2);
        context.fill();

        // Draw shadow tendrils
        context.strokeStyle = `rgba(33, 33, 33, ${alpha})`;
        context.lineWidth = 2;

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const startDistance = 10;
          const endDistance = 20 + progress * 10;

          context.beginPath();
          context.moveTo(
            effect.x + Math.cos(angle) * startDistance,
            effect.y + Math.sin(angle) * startDistance
          );
          context.lineTo(
            effect.x + Math.cos(angle) * endDistance,
            effect.y + Math.sin(angle) * endDistance
          );
          context.stroke();
        }
        break;
    }
  }

  renderAlerts(context) {
    context.textAlign = "center";
    context.font = "16px Arial";

    for (let i = 0; i < this.alerts.length; i++) {
      const alert = this.alerts[i];
      const progress = (performance.now() - alert.time) / alert.duration;
      const alpha =
        progress < 0.1
          ? progress * 10
          : progress > 0.9
          ? (1 - progress) * 10
          : 1;

      context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      context.fillText(alert.message, 400, 100 + i * 30);
    }
  }
}

// Game State Manager
class GameStateManager {
  constructor(engine) {
    this.engine = engine;
    this.gameState = {
      currentAge: "stone",
      ageProgress: 0,
      maxPopulation: 10,
      dayNightCycle: true,
      timeOfDay: 0, // 0-1, 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight
      timeScale: 1, // 1 = normal speed
      paused: false,
      victory: false,
      defeat: false,
      score: 0,
    };

    // Age advancement requirements
    this.ageRequirements = {
      bronze: {
        buildings: [
          { type: "temple", count: 1 },
          { type: "barracks", count: 1 },
        ],
        resources: {
          food: 500,
          wood: 500,
          stone: 300,
        },
        time: 300, // 5 minutes
      },
      iron: {
        buildings: [
          { type: "forge", count: 1 },
          { type: "market", count: 1 },
        ],
        resources: {
          food: 1000,
          wood: 1000,
          stone: 500,
          gold: 300,
        },
        time: 600, // 10 minutes
      },
      golden: {
        buildings: [
          { type: "wonder", count: 1, progress: 0.5 }, // Wonder 50% complete
        ],
        resources: {
          food: 2000,
          wood: 2000,
          stone: 1000,
          gold: 1000,
          iron: 500,
        },
        time: 1200, // 20 minutes
      },
      eternal: {
        buildings: [
          { type: "wonder", count: 1, complete: true }, // Wonder 100% complete
        ],
        resources: {
          food: 5000,
          wood: 5000,
          stone: 2500,
          gold: 2500,
          iron: 1000,
        },
        time: 1800, // 30 minutes
      },
    };
  }

  update(deltaTime) {
    if (this.gameState.paused) return;

    // Update time of day
    if (this.gameState.dayNightCycle) {
      this.gameState.timeOfDay += deltaTime * 0.01 * this.gameState.timeScale;
      if (this.gameState.timeOfDay >= 1) {
        this.gameState.timeOfDay -= 1;
      }
    }

    // Check for age advancement
    this.checkAgeAdvancement();

    // Check victory/defeat conditions
    this.checkVictoryDefeat();

    // Update score
    this.updateScore();
  }

  checkAgeAdvancement() {
    const currentAge = this.gameState.currentAge;

    // Can't advance beyond eternal age
    if (currentAge === "eternal") return;

    // Determine next age
    const nextAges = {
      stone: "bronze",
      bronze: "iron",
      iron: "golden",
      golden: "eternal",
    };

    const nextAge = nextAges[currentAge];

    if (!nextAge) return;

    // Check requirements
    const requirements = this.ageRequirements[nextAge];
    let requirementsMet = true;

    // Check building requirements
    for (const buildingReq of requirements.buildings) {
      const buildings = this.engine.entityManager.entities.filter(
        (entity) =>
          entity.owner === "player" &&
          entity.type === "building" &&
          entity.buildingType === buildingReq.type &&
          !entity.isBuilding // Must be completed
      );

      if (buildings.length < buildingReq.count) {
        requirementsMet = false;
        break;
      }

      // Check wonder progress if specified
      if (buildingReq.type === "wonder" && buildingReq.progress) {
        const wonder = buildings[0];
        if (wonder && buildingReq.complete && wonder.isBuilding) {
          requirementsMet = false;
          break;
        } else if (
          wonder &&
          buildingReq.progress &&
          wonder.isBuilding &&
          wonder.buildProgress / wonder.buildTime < buildingReq.progress
        ) {
          requirementsMet = false;
          break;
        }
      }
    }

    // Check resource requirements
    if (requirementsMet) {
      for (const resourceType in requirements.resources) {
        if (
          this.engine.resourceManager.resources[resourceType] <
          requirements.resources[resourceType]
        ) {
          requirementsMet = false;
          break;
        }
      }
    }

    // Check time requirement
    // This is a minimum time in the current age
    if (requirementsMet && this.gameState.ageProgress < requirements.time) {
      requirementsMet = false;
    }

    // If all requirements met, advance to next age
    if (requirementsMet) {
      this.advanceAge(nextAge);
    } else {
      // If not yet met, increment age progress
      this.gameState.ageProgress += this.gameState.timeScale;
    }
  }

  advanceAge(newAge) {
    const oldAge = this.gameState.currentAge;
    this.gameState.currentAge = newAge;
    this.gameState.ageProgress = 0;

    // Increase population cap
    const populationIncreases = {
      bronze: 20,
      iron: 30,
      golden: 50,
      eternal: 100,
    };

    this.gameState.maxPopulation += populationIncreases[newAge] || 0;

    // Apply age advancement effects
    this.applyAgeAdvancementEffects(oldAge, newAge);

    // Update UI
    this.engine.uiManager.showAlert(`Advanced to ${newAge} age!`);

    // Update costs based on new age
    this.engine.resourceManager.updateResourceCosts();
  }

  applyAgeAdvancementEffects(oldAge, newAge) {
    // Improve units based on age advancement
    const soldiers = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "soldier"
    );
    const buildings = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "building"
    );

    // Unit stat improvements
    for (const soldier of soldiers) {
      // Basic improvements
      soldier.ar *= 1.2; // 20% more attack
      soldier.dp *= 1.2; // 20% more defense
      soldier.maxHp *= 1.1; // 10% more HP
      soldier.hp = soldier.maxHp; // Heal fully
    }

    // Building improvements
    for (const building of buildings) {
      building.dp *= 1.1; // 10% more defense
    }

    // Age-specific improvements
    switch (newAge) {
      case "bronze":
        // Enable new unit types
        // This would update the UI and game logic
        break;

      case "iron":
        // Enable iron resource gathering
        // Find iron resource spots and make them visible
        this.engine.entityManager.entities.forEach((entity) => {
          if (entity.type === "resource" && entity.resourceType === "iron") {
            // Make iron resources visible and gatherable
          }
        });
        break;

      case "golden":
        // Enable advanced buildings and improvements
        break;

      case "eternal":
        // Enable hero unit regeneration
        const heroes = this.engine.entityManager.getEntitiesByOwnerAndType(
          "player",
          "hero"
        );
        for (const hero of heroes) {
          hero.canRegenerate = true;
        }
        break;
    }
  }

  checkVictoryDefeat() {
    // Check for victory conditions
    const playerWonder = this.engine.entityManager.entities.find(
      (entity) =>
        entity.type === "wonder" &&
        entity.owner === "player" &&
        !entity.isBuilding
    );

    const enemyWonder = this.engine.entityManager.entities.find(
      (entity) =>
        entity.type === "wonder" &&
        entity.owner === "enemy" &&
        !entity.isBuilding
    );

    // Victory - player wonder completed and stood for 10 minutes
    if (
      playerWonder &&
      playerWonder.completionTime &&
      performance.now() - playerWonder.completionTime > 600000
    ) {
      this.gameState.victory = true;
    }

    // Defeat - enemy wonder completed and stood for 10 minutes
    if (
      enemyWonder &&
      enemyWonder.completionTime &&
      performance.now() - enemyWonder.completionTime > 600000
    ) {
      this.gameState.defeat = true;
    }

    // Defeat - all player buildings and units destroyed
    const playerEntities =
      this.engine.entityManager.getEntitiesByOwner("player");
    if (playerEntities.length === 0) {
      this.gameState.defeat = true;
    }

    // Victory - all enemy buildings and units destroyed
    const enemyEntities = this.engine.entityManager.getEntitiesByOwner("enemy");
    if (enemyEntities.length === 0) {
      this.gameState.victory = true;
    }

    // Handle victory/defeat
    if (this.gameState.victory) {
      this.handleVictory();
    } else if (this.gameState.defeat) {
      this.handleDefeat();
    }
  }

  handleVictory() {
    if (this.gameState.victoryHandled) return;

    this.gameState.paused = true;
    this.gameState.victoryHandled = true;

    // Show victory message
    this.engine.uiManager.showAlert(
      "Victory! Your civilization has triumphed!"
    );

    // Calculate final score
    this.updateScore(true);

    // Display score and stats
    console.log("Final Score:", this.gameState.score);
  }

  handleDefeat() {
    if (this.gameState.defeatHandled) return;

    this.gameState.paused = true;
    this.gameState.defeatHandled = true;

    // Show defeat message
    this.engine.uiManager.showAlert("Defeat! Your civilization has fallen!");

    // Calculate final score
    this.updateScore(true);

    // Display score and stats
    console.log("Final Score:", this.gameState.score);
  }

  updateScore(isFinal = false) {
    // Calculate score based on various factors
    let score = 0;

    // Resources
    const resources = this.engine.resourceManager.resources;
    score += resources.food * 0.1;
    score += resources.wood * 0.1;
    score += resources.stone * 0.2;
    score += resources.gold * 0.5;
    score += resources.iron * 0.5;

    // Units
    const villagers = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "villager"
    );
    const soldiers = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "soldier"
    );
    const heroes = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "hero"
    );

    score += villagers.length * 10;
    score += soldiers.length * 20;
    score += heroes.length * 100;

    // Buildings
    const buildings = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "building"
    );
    const wonders = this.engine.entityManager.getEntitiesByOwnerAndType(
      "player",
      "wonder"
    );

    score += buildings.length * 50;
    score += wonders.length * 500;

    // Age
    const ageScores = {
      stone: 0,
      bronze: 100,
      iron: 300,
      golden: 600,
      eternal: 1000,
    };

    score += ageScores[this.gameState.currentAge] || 0;

    // Technologies
    score += this.engine.civilizationManager.techs.researched.length * 100;

    // Final score multipliers
    if (isFinal) {
      if (this.gameState.victory) {
        score *= 1.5; // Victory bonus
      }

      // Time score bonus/penalty
      const gameTime = this.gameState.ageProgress; // Using age progress as a proxy for game time
      if (gameTime < 1800) {
        // Less than 30 minutes
        score *= 1.2; // Quick victory bonus
      } else if (gameTime > 3600) {
        // More than 60 minutes
        score *= 0.8; // Long game penalty
      }
    }

    this.gameState.score = Math.floor(score);
  }

  getLightLevel() {
    // Calculate light level based on time of day
    // 0-1 value, with 0 being darkest (midnight) and 1 being brightest (noon)
    const time = this.gameState.timeOfDay;

    if (time < 0.25) {
      // Dawn - getting brighter
      return 0.5 + time * 2;
    } else if (time < 0.5) {
      // Day - full brightness
      return 1.0;
    } else if (time < 0.75) {
      // Dusk - getting darker
      return 1.0 - (time - 0.5) * 2;
    } else {
      // Night - darkness
      return 0.5 - (time - 0.75) * 2;
    }
  }
}

// Game Engine
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");

    // Game systems
    this.entityManager = new EntityManager(this);
    this.resourceManager = new ResourceManager(this);
    this.civilizationManager = new CivilizationManager(this);
    this.gameState = new GameStateManager(this);
    this.uiManager = new UIManager(this);
    this.formationManager = new FormationManager(this);

    // Input handling
    this.input = {
      mouse: { x: 0, y: 0, down: false },
      keys: {},
      dragStart: null,
      dragEnd: null,
    };

    // Camera/viewport
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetX: 0,
      targetY: 0,
      targetZoom: 1,
      speed: 500,
      zoomSpeed: 0.5,
      bounds: { minX: 0, minY: 0, maxX: 3000, maxY: 2000 },
    };

    // Game loop variables
    this.lastTime = 0;
    this.running = false;
  }

  init() {
    // Setup event listeners
    this.setupEventListeners();

    // Initialize UI
    this.uiManager.init();

    // Initialize game state
    this.initGame();

    // Start game loop
    this.running = true;
    this.gameLoop();
  }

  setupEventListeners() {
    // Mouse move
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouse.x = e.clientX - rect.left;
      this.input.mouse.y = e.clientY - rect.top;

      // Update drag end if dragging
      if (this.input.mouse.down && this.input.dragStart) {
        this.input.dragEnd = { x: this.input.mouse.x, y: this.input.mouse.y };
      }
    });

    // Mouse down
    this.canvas.addEventListener("mousedown", (e) => {
      this.input.mouse.down = true;

      // Start drag
      this.input.dragStart = { x: this.input.mouse.x, y: this.input.mouse.y };
      this.input.dragEnd = null;
    });

    // Mouse up
    this.canvas.addEventListener("mouseup", (e) => {
      this.input.mouse.down = false;

      // Handle selection or command
      if (this.input.dragStart && this.input.dragEnd) {
        // Area selection
        this.handleAreaSelection();
      } else {
        // Single click
        this.handleClick();
      }

      // Reset drag
      this.input.dragStart = null;
      this.input.dragEnd = null;
    });

    // Key down
    window.addEventListener("keydown", (e) => {
      this.input.keys[e.key] = true;

      // Camera movement with arrow keys
      const cameraSpeed = 20;
      if (e.key === "ArrowUp") {
        this.camera.targetY -= cameraSpeed;
      } else if (e.key === "ArrowDown") {
        this.camera.targetY += cameraSpeed;
      } else if (e.key === "ArrowLeft") {
        this.camera.targetX -= cameraSpeed;
      } else if (e.key === "ArrowRight") {
        this.camera.targetX += cameraSpeed;
      }

      // Enforce camera bounds
      this.camera.targetX = Math.max(
        this.camera.bounds.minX,
        Math.min(this.camera.bounds.maxX, this.camera.targetX)
      );
      this.camera.targetY = Math.max(
        this.camera.bounds.minY,
        Math.min(this.camera.bounds.maxY, this.camera.targetY)
      );
    });

    // Key up
    window.addEventListener("keyup", (e) => {
      this.input.keys[e.key] = false;
    });

    // Mouse wheel for zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      if (e.deltaY < 0) {
        // Zoom in
        this.camera.targetZoom = Math.min(2.0, this.camera.targetZoom + 0.1);
      } else {
        // Zoom out
        this.camera.targetZoom = Math.max(0.5, this.camera.targetZoom - 0.1);
      }
    });
  }

  handleClick() {
    // Convert screen position to world position
    const worldX = this.input.mouse.x / this.camera.zoom + this.camera.x;
    const worldY = this.input.mouse.y / this.camera.zoom + this.camera.y;

    // Check if we clicked on an entity
    const entities = this.entityManager.getEntitiesAtPosition(worldX, worldY);

    if (entities.length > 0) {
      // Sort by player-owned first
      entities.sort((a, b) => {
        if (a.owner === "player" && b.owner !== "player") return -1;
        if (a.owner !== "player" && b.owner === "player") return 1;
        return 0;
      });

      const entity = entities[0];

      if (entity.owner === "player") {
        // Shift-click to add to selection
        if (this.input.keys["Shift"]) {
          this.entityManager.selectEntity(entity);
        } else {
          // Clear previous selection and select this entity
          this.entityManager.clearSelection();
          this.entityManager.selectEntity(entity);
        }
      } else {
        // If we have units selected and click on non-player entity, command them
        const selectedEntities = this.entityManager.getSelectedEntities();

        if (selectedEntities.length > 0) {
          // Attack if it's an enemy
          if (entity.owner === "enemy") {
            for (const selected of selectedEntities) {
              if (selected.canAttack) {
                selected.assignAttack(entity);
              }
            }
          } else if (entity.type === "resource") {
            // Gather if it's a resource
            for (const selected of selectedEntities) {
              if (selected.type === "villager") {
                selected.assignGather(entity);
              }
            }
          } else if (entity.isBuilding) {
            // Build if it's under construction
            for (const selected of selectedEntities) {
              if (selected.type === "villager") {
                selected.assignBuild(entity);
              }
            }
          } else if (entity.hp < entity.maxHp && entity.isRepairable) {
            // Repair if it's damaged
            for (const selected of selectedEntities) {
              if (selected.type === "villager") {
                selected.assignRepair(entity);
              }
            }
          }
        }
      }
    } else {
      // Clicked on empty space - command selected units to move
      const selectedEntities = this.entityManager.getSelectedEntities();

      for (const entity of selectedEntities) {
        if (entity.canMove) {
          entity.setTarget({ x: worldX, y: worldY });
        }
      }
    }
  }

  handleAreaSelection() {
    // Convert screen positions to world positions
    const startX = this.input.dragStart.x / this.camera.zoom + this.camera.x;
    const startY = this.input.dragStart.y / this.camera.zoom + this.camera.y;
    const endX = this.input.dragEnd.x / this.camera.zoom + this.camera.x;
    const endY = this.input.dragEnd.y / this.camera.zoom + this.camera.y;

    // Normalize rectangle (ensure startX <= endX and startY <= endY)
    const selectionX = Math.min(startX, endX);
    const selectionY = Math.min(startY, endY);
    const selectionWidth = Math.abs(endX - startX);
    const selectionHeight = Math.abs(endY - startY);

    // Select entities in the area
    this.entityManager.selectEntitiesInArea(
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );
  }

  initGame() {
    // Create initial entities
    this.createStartingEntities();

    // Set initial camera position
    this.camera.x = 500;
    this.camera.y = 500;
    this.camera.targetX = this.camera.x;
    this.camera.targetY = this.camera.y;
  }

  createStartingEntities() {
    // Create town center
    const townCenter = this.entityManager.entityFactory.createBuilding(
      600,
      500,
      "player",
      "town_center",
      false
    );
    this.entityManager.addEntity(townCenter);

    // Create initial villagers
    for (let i = 0; i < 5; i++) {
      const villager = this.entityManager.entityFactory.createVillager(
        650 + i * 25,
        550,
        "player"
      );
      this.entityManager.addEntity(villager);
    }

    // Create resource spots
    this.createResources();

    // Create decorations
    this.createDecorations();

    // Create enemy base (if this is a scenario with enemies)
    // this.createEnemyBase();
  }

  createResources() {
    // Create resource spots

    // Forests (wood)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 300 + i * 100 + Math.random() * 50;
        const y = 300 + j * 100 + Math.random() * 50;

        const wood = this.entityManager.entityFactory.createResource(
          x,
          y,
          "wood",
          500 + Math.floor(Math.random() * 200)
        );
        this.entityManager.addEntity(wood);
        this.resourceManager.addResourceNode(wood);
      }
    }

    // Berry bushes (food)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const x = 800 + i * 50 + Math.random() * 30;
        const y = 400 + j * 50 + Math.random() * 30;

        const food = this.entityManager.entityFactory.createResource(
          x,
          y,
          "food",
          300 + Math.floor(Math.random() * 100)
        );
        this.entityManager.addEntity(food);
        this.resourceManager.addResourceNode(food);
      }
    }

    // Stone deposits
    for (let i = 0; i < 2; i++) {
      const x = 500 + i * 200 + Math.random() * 100;
      const y = 700 + Math.random() * 100;

      const stone = this.entityManager.entityFactory.createResource(
        x,
        y,
        "stone",
        400 + Math.floor(Math.random() * 200)
      );
      this.entityManager.addEntity(stone);
      this.resourceManager.addResourceNode(stone);
    }

    // Gold deposits
    for (let i = 0; i < 2; i++) {
      const x = 800 + i * 150 + Math.random() * 50;
      const y = 600 + Math.random() * 100;

      const gold = this.entityManager.entityFactory.createResource(
        x,
        y,
        "gold",
        300 + Math.floor(Math.random() * 100)
      );
      this.entityManager.addEntity(gold);
      this.resourceManager.addResourceNode(gold);
    }

    // Iron deposits (initially hidden until Iron Age)
    for (let i = 0; i < 2; i++) {
      const x = 900 + i * 150 + Math.random() * 50;
      const y = 800 + Math.random() * 100;

      const iron = this.entityManager.entityFactory.createResource(
        x,
        y,
        "iron",
        250 + Math.floor(Math.random() * 100)
      );
      // Hide iron until Iron Age
      iron.hidden = true;
      this.entityManager.addEntity(iron);
      this.resourceManager.addResourceNode(iron);
    }
  }

  createDecorations() {
    // Add visual decorations

    // Grass patches
    for (let i = 0; i < 50; i++) {
      const x = 200 + Math.random() * 1000;
      const y = 200 + Math.random() * 1000;

      const grass = this.entityManager.entityFactory.createDecoration(
        x,
        y,
        "grass"
      );
      this.entityManager.addEntity(grass);
    }

    // Flowers
    for (let i = 0; i < 30; i++) {
      const x = 200 + Math.random() * 1000;
      const y = 200 + Math.random() * 1000;

      const flower = this.entityManager.entityFactory.createDecoration(
        x,
        y,
        "flower"
      );
      this.entityManager.addEntity(flower);
    }

    // Rocks
    for (let i = 0; i < 20; i++) {
      const x = 200 + Math.random() * 1000;
      const y = 200 + Math.random() * 1000;

      const rock = this.entityManager.entityFactory.createDecoration(
        x,
        y,
        "rock"
      );
      this.entityManager.addEntity(rock);
    }

    // Bushes
    for (let i = 0; i < 15; i++) {
      const x = 200 + Math.random() * 1000;
      const y = 200 + Math.random() * 1000;

      const bush = this.entityManager.entityFactory.createDecoration(
        x,
        y,
        "bush"
      );
      this.entityManager.addEntity(bush);
    }
  }

  createEnemyBase() {
    // Create enemy town center
    const townCenter = this.entityManager.entityFactory.createBuilding(
      1500,
      500,
      "enemy",
      "town_center",
      false
    );
    this.entityManager.addEntity(townCenter);

    // Create enemy villagers
    for (let i = 0; i < 3; i++) {
      const villager = this.entityManager.entityFactory.createVillager(
        1550 + i * 25,
        550,
        "enemy"
      );
      this.entityManager.addEntity(villager);
    }

    // Create enemy soldiers
    for (let i = 0; i < 2; i++) {
      const soldier = this.entityManager.entityFactory.createSoldier(
        1500 + i * 25,
        600,
        "enemy",
        "spearman"
      );
      this.entityManager.addEntity(soldier);
    }
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    // Calculate delta time
    if (!this.lastTime) this.lastTime = timestamp;
    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = timestamp;

    // Update game state
    this.update(deltaTime);

    // Render
    this.render();

    // Request next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    // Cap delta time to prevent large jumps
    const dt = Math.min(deltaTime, 0.1);

    // Update game state
    if (!this.gameState.gameState.paused) {
      // Update camera
      this.updateCamera(dt);

      // Update all game systems
      this.gameState.update(dt);
      this.entityManager.update(dt);
      this.formationManager.updateFormations();
      this.uiManager.update(dt);
    }
  }

  updateCamera(deltaTime) {
    // Smooth camera movement
    const cameraDx = this.camera.targetX - this.camera.x;
    const cameraDy = this.camera.targetY - this.camera.y;
    const cameraDzoom = this.camera.targetZoom - this.camera.zoom;

    this.camera.x += cameraDx * this.camera.speed * deltaTime;
    this.camera.y += cameraDy * this.camera.speed * deltaTime;
    this.camera.zoom += cameraDzoom * this.camera.zoomSpeed;

    // Enforce camera bounds
    this.camera.x = Math.max(
      this.camera.bounds.minX,
      Math.min(this.camera.bounds.maxX, this.camera.x)
    );
    this.camera.y = Math.max(
      this.camera.bounds.minY,
      Math.min(this.camera.bounds.maxY, this.camera.y)
    );
  }

  render() {
    // Clear the canvas
    this.context.fillStyle = "#AAD751"; // Green background (grass)
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply day/night cycle lighting
    const lightLevel = this.gameState.getLightLevel();
    this.context.fillStyle = `rgba(0, 0, 50, ${0.7 - lightLevel * 0.7})`; // Blue-tinted darkness
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for camera transform
    this.context.save();

    // Apply camera transform
    this.context.translate(
      -this.camera.x * this.camera.zoom,
      -this.camera.y * this.camera.zoom
    );
    this.context.scale(this.camera.zoom, this.camera.zoom);

    // Render entities
    this.entityManager.render(this.context);

    // Render selection box
    if (this.input.dragStart && this.input.dragEnd) {
      const startX = this.input.dragStart.x / this.camera.zoom + this.camera.x;
      const startY = this.input.dragStart.y / this.camera.zoom + this.camera.y;
      const endX = this.input.dragEnd.x / this.camera.zoom + this.camera.x;
      const endY = this.input.dragEnd.y / this.camera.zoom + this.camera.y;

      const selectionX = Math.min(startX, endX);
      const selectionY = Math.min(startY, endY);
      const selectionWidth = Math.abs(endX - startX);
      const selectionHeight = Math.abs(endY - startY);

      this.context.strokeStyle = "rgba(255, 255, 255, 0.7)";
      this.context.lineWidth = 2;
      this.context.strokeRect(
        selectionX,
        selectionY,
        selectionWidth,
        selectionHeight
      );
      this.context.fillStyle = "rgba(255, 255, 255, 0.1)";
      this.context.fillRect(
        selectionX,
        selectionY,
        selectionWidth,
        selectionHeight
      );
    }

    // Restore context
    this.context.restore();

    // Render UI elements (not affected by camera)
    this.uiManager.render(this.context);

    // Render victory/defeat screen
    if (this.gameState.gameState.victory) {
      this.renderVictoryScreen();
    } else if (this.gameState.gameState.defeat) {
      this.renderDefeatScreen();
    }
  }

  renderVictoryScreen() {
    this.context.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.fillStyle = "#FFD700"; // Gold
    this.context.font = "48px Arial";
    this.context.textAlign = "center";
    this.context.fillText(
      "VICTORY",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.context.fillStyle = "#FFFFFF";
    this.context.font = "24px Arial";
    this.context.fillText(
      `Score: ${this.gameState.gameState.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10
    );

    this.context.font = "18px Arial";
    this.context.fillText(
      "Your civilization has reached the height of prosperity!",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }

  renderDefeatScreen() {
    this.context.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.fillStyle = "#B71C1C"; // Dark red
    this.context.font = "48px Arial";
    this.context.textAlign = "center";
    this.context.fillText(
      "DEFEAT",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.context.fillStyle = "#FFFFFF";
    this.context.font = "24px Arial";
    this.context.fillText(
      `Score: ${this.gameState.gameState.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10
    );

    this.context.font = "18px Arial";
    this.context.fillText(
      "Your civilization has fallen into ruin...",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }
}

// Exports for use in the main application
if (typeof module !== "undefined") {
  module.exports = {
    Entity,
    Villager,
    Soldier,
    SiegeUnit,
    HeroUnit,
    Building,
    Wall,
    Wonder,
    Resource,
    Decoration,
    Gate,
    Tower,
    FormationManager,
    EntityFactory,
    EntityManager,
    ResourceManager,
    CivilizationManager,
    UIManager,
    GameStateManager,
    GameEngine,
  };
}
