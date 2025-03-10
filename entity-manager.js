/**
 * Empires of Eternity - Entity Manager
 * Manages all entities in the game world, handling creation, updates, and queries
 */

class EntityManager {
  /**
   * Create a new entity manager
   * @param {Game} game - Game instance
   */
  constructor(game) {
      this.game = game;
      
      // Entity tracking
      this.entities = new Map(); // Map of all entities by ID
      this.entitiesByType = new Map(); // Map of entities grouped by type
      this.entitiesByOwner = new Map(); // Map of entities grouped by owner
      this.spatialGrid = null; // Grid for spatial queries
      
      // Entity creation trackers
      this.lastEntityId = 0;
      
      // Command queue for unit actions
      this.commandQueue = [];
      
      console.log('EntityManager created'); // Replaced Utils.log with console.log
  }

  /**
   * Initialize the entity manager
   */
  init() {
      // Initialize spatial grid for the current map
      const map = this.game.getSystem('map');
      
      if (map) {
          this.spatialGrid = new SpatialGrid(map.width, map.height);
      } else {
          // Default size if no map
          this.spatialGrid = new SpatialGrid(50, 50);
      }
      
      console.log('EntityManager initialized'); // Replaced Utils.log with console.log
      return this;
  }

  /**
   * Update all entities
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
      // Update each entity
      for (const [id, entity] of this.entities) {
          if (entity.active) {
              entity.update(deltaTime);
              
              // Update spatial grid if entity moved
              if (entity.lastX !== entity.x || entity.lastY !== entity.y) {
                  this.spatialGrid.updateEntity(entity);
                  entity.lastX = entity.x;
                  entity.lastY = entity.y;
              }
          }
      }
      
      // Process command queue
      this.processCommandQueue();
      
      // Check for dead entities and remove them
      this.cleanupEntities();
  }

  /**
   * Process the command queue
   */
  processCommandQueue() {
      // Process a limited number of commands per frame
      const maxCommands = 10;
      let processed = 0;
      
      while (this.commandQueue.length > 0 && processed < maxCommands) {
          const command = this.commandQueue.shift();
          this.executeCommand(command);
          processed++;
      }
  }

  /**
   * Execute a command
   * @param {Object} command - Command to execute
   */
  executeCommand(command) {
      // Get entities to command
      const entities = command.entityIds.map(id => this.getEntityById(id)).filter(e => e && e.active);
      
      if (entities.length === 0) return;
      
      // Execute command based on type
      switch (command.type) {
          case 'move':
              this.executeMove(entities, command.x, command.y);
              break;
              
          case 'attack':
              const target = this.getEntityById(command.targetId);
              if (target && target.active) {
                  this.executeAttack(entities, target);
              }
              break;
              
          case 'gather':
              const resource = this.getEntityById(command.resourceId);
              if (resource && resource.active) {
                  this.executeGather(entities, resource);
              }
              break;
              
          case 'build':
              const building = this.getEntityById(command.buildingId);
              if (building && building.active) {
                  this.executeBuild(entities, building);
              }
              break;
              
          case 'repair':
              const structure = this.getEntityById(command.structureId);
              if (structure && structure.active) {
                  this.executeRepair(entities, structure);
              }
              break;
              
          case 'formation':
              this.executeFormation(entities, command.formation);
              break;
              
          case 'stop':
              this.executeStop(entities);
              break;
      }
  }

  /**
   * Execute a move command
   * @param {Array} entities - Entities to move
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   */
  executeMove(entities, x, y) {
      // Basic implementation - each unit moves independently
      for (const entity of entities) {
          if (entity.moveTo) {
              entity.moveTo(x, y);
          }
      }
      
      // If units are in formation, use formation movement
      if (entities.length > 1 && entities[0].formation) {
          this.executeFormationMove(entities, x, y);
      }
  }

  /**
   * Execute a formation move command
   * @param {Array} entities - Entities in formation
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   */
  executeFormationMove(entities, x, y) {
      // Get formation type
      const formation = entities[0].formation;
      
      // Calculate direction vector to target
      const centerX = entities.reduce((sum, e) => sum + e.x, 0) / entities.length;
      const centerY = entities.reduce((sum, e) => sum + e.y, 0) / entities.length;
      
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize direction vector
      const dirX = distance > 0 ? dx / distance : 0;
      const dirY = distance > 0 ? dy / distance : 0;
      
      // Move each unit in formation
      for (const entity of entities) {
          if (entity.moveToFormation) {
              entity.moveToFormation(x, y, dirX, dirY);
          }
      }
  }

  /**
   * Execute an attack command
   * @param {Array} entities - Entities to attack with
   * @param {Entity} target - Target to attack
   */
  executeAttack(entities, target) {
      for (const entity of entities) {
          if (entity.attack && entity.canAttack(target)) {
              entity.attack(target);
          }
      }
  }

  /**
   * Execute a gather command
   * @param {Array} entities - Entities to gather with
   * @param {Entity} resource - Resource to gather
   */
  executeGather(entities, resource) {
      for (const entity of entities) {
          if (entity.gather && entity.canGather(resource)) {
              entity.gather(resource);
          }
      }
  }

  /**
   * Execute a build command
   * @param {Array} entities - Entities to build with
   * @param {Entity} building - Building to construct
   */
  executeBuild(entities, building) {
      for (const entity of entities) {
          if (entity.construct && entity.canConstruct(building)) {
              entity.construct(building);
          }
      }
  }

  /**
   * Execute a repair command
   * @param {Array} entities - Entities to repair with
   * @param {Entity} structure - Structure to repair
   */
  executeRepair(entities, structure) {
      for (const entity of entities) {
          if (entity.repair && entity.canRepair(structure)) {
              entity.repair(structure);
          }
      }
  }

  /**
   * Execute a formation command
   * @param {Array} entities - Entities to set formation for
   * @param {string} formation - Formation type
   */
  executeFormation(entities, formation) {
      // Only valid for units
      const units = entities.filter(e => e.type === 'unit' || e.type === 'hero');
      
      if (units.length < 3) return;
      
      // Get the center position
      const centerX = units.reduce((sum, u) => sum + u.x, 0) / units.length;
      const centerY = units.reduce((sum, u) => sum + u.y, 0) / units.length;
      
      // Set formation based on type
      switch (formation) {
          case 'line':
              this.setLineFormation(units, centerX, centerY);
              break;
              
          case 'wedge':
              this.setWedgeFormation(units, centerX, centerY);
              break;
              
          case 'square':
              this.setSquareFormation(units, centerX, centerY);
              break;
              
          case 'skirmish':
              this.setSkirmishFormation(units, centerX, centerY);
              break;
      }
  }

  /**
   * Set line formation
   * @param {Array} units - Units to place in formation
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   */
  setLineFormation(units, centerX, centerY) {
      const width = units.length;
      const spacing = 0.5;
      
      for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          const offsetX = (i - width / 2) * spacing;
          
          unit.setFormation('line', i, { x: offsetX, y: 0 });
      }
  }

  /**
   * Set wedge formation
   * @param {Array} units - Units to place in formation
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   */
  setWedgeFormation(units, centerX, centerY) {
      let row = 0;
      let rowPos = 0;
      let rowUnits = 1;
      
      for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          
          // Calculate position in wedge
          const offsetX = (rowPos - (rowUnits - 1) / 2) * 0.5;
          const offsetY = row * 0.5;
          
          unit.setFormation('wedge', i, { x: offsetX, y: offsetY });
          
          // Update row position
          rowPos++;
          if (rowPos >= rowUnits) {
              row++;
              rowUnits += 2;
              rowPos = 0;
          }
      }
  }

  /**
   * Set square formation
   * @param {Array} units - Units to place in formation
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   */
  setSquareFormation(units, centerX, centerY) {
      const size = Math.ceil(Math.sqrt(units.length));
      const spacing = 0.5;
      
      for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          const row = Math.floor(i / size);
          const col = i % size;
          
          const offsetX = (col - size / 2) * spacing;
          const offsetY = (row - size / 2) * spacing;
          
          unit.setFormation('square', i, { x: offsetX, y: offsetY });
      }
  }

  /**
   * Set skirmish formation
   * @param {Array} units - Units to place in formation
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   */
  setSkirmishFormation(units, centerX, centerY) {
      const spacing = 1.0; // Wider spacing for skirmish
      
      for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          
          // Use a modified spiral pattern for more irregular formation
          const angle = i * 0.7;
          const radius = 0.5 + Math.sqrt(i) * 0.3;
          
          const offsetX = Math.cos(angle) * radius * spacing;
          const offsetY = Math.sin(angle) * radius * spacing;
          
          unit.setFormation('skirmish', i, { x: offsetX, y: offsetY });
      }
  }

  /**
   * Execute a stop command
   * @param {Array} entities - Entities to stop
   */
  executeStop(entities) {
      for (const entity of entities) {
          // Stop any ongoing actions
          if (entity.stopMoving) entity.stopMoving();
          if (entity.stopAttacking) entity.stopAttacking();
          if (entity.stopGathering) entity.stopGathering();
          if (entity.stopConstructing) entity.stopConstructing();
          if (entity.stopRepairing) entity.stopRepairing();
      }
  }

  /**
   * Issue a movement command
   * @param {Array} entities - Entities to move
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   */
  moveUnits(entities, x, y) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'move',
          entityIds: entityIds,
          x: x,
          y: y
      });
  }

  /**
   * Issue an attack command
   * @param {Array} entities - Entities to attack with
   * @param {Entity} target - Target to attack
   */
  attackTarget(entities, target) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'attack',
          entityIds: entityIds,
          targetId: target.id
      });
  }

  /**
   * Issue a gather command
   * @param {Array} entities - Entities to gather with
   * @param {Entity} resource - Resource to gather
   */
  gatherResource(entities, resource) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'gather',
          entityIds: entityIds,
          resourceId: resource.id
      });
  }

  /**
   * Issue a build command
   * @param {Array} entities - Entities to build with
   * @param {Entity} building - Building to construct
   */
  assignVillagersToConstruct(entities, building) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'build',
          entityIds: entityIds,
          buildingId: building.id
      });
  }

  /**
   * Issue a repair command
   * @param {Array} entities - Entities to repair with
   * @param {Entity} structure - Structure to repair
   */
  repairStructure(entities, structure) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'repair',
          entityIds: entityIds,
          structureId: structure.id
      });
  }

  /**
   * Set formation for a group of units
   * @param {Array} entities - Entities to set formation for
   * @param {string} formation - Formation type
   */
  setFormation(entities, formation) {
      const entityIds = entities.map(e => e.id);
      
      this.commandQueue.push({
          type: 'formation',
          entityIds: entityIds,
          formation: formation
      });
  }

  /**
   * Create starting entities for a civilization
   * @param {Object} civilization - Civilization configuration
   */
  createStartingEntities(civilization) {
      const civKey = civilization.name === 'The Solari' ? 'SOLARI' : 'LUNARI';
      const map = this.game.getSystem('map');
      
      if (!map) return;
      
      // Determine starting location based on civilization
      let startX, startY;
      
      if (civKey === 'SOLARI') {
          startX = Math.floor(map.width * 0.15);
          startY = Math.floor(map.height * 0.15);
      } else {
          startX = Math.floor(map.width * 0.85);
          startY = Math.floor(map.height * 0.85);
      }
      
      // Create town center
      const townCenter = this.createBuilding({
          buildingType: 'town_center',
          x: startX,
          y: startY,
          owner: civKey,
          width: 3,
          height: 3,
          hp: 1000,
          maxHp: 1000,
          dp: 20,
          constructed: true
      });
      
      // Create starting villagers
      for (let i = 0; i < 2; i++) {
          this.createUnit({
              type: 'villager',
              x: startX + i - 1,
              y: startY + 3,
              owner: civKey,
              hp: 50, // Replaced CONFIG.STATS.VILLAGER[0].hp with default value
              maxHp: 50, // Replaced CONFIG.STATS.VILLAGER[0].hp with default value
              dp: 5, // Replaced CONFIG.STATS.VILLAGER[0].dp with default value
              ar: 5, // Replaced CONFIG.STATS.VILLAGER[0].ar with default value
              speed: 2,
              carryCapacity: 20,
              gatherRate: civKey === 'SOLARI' ? 1.2 : 1 // Solari gather bonus
          });
      }
      
      console.log(`Created starting entities for ${civKey}`); // Replaced Utils.log with console.log
  }

  /**
   * Clean up inactive entities
   */
  cleanupEntities() {
      const entitiesToRemove = [];
      
      // Find inactive entities
      for (const [id, entity] of this.entities) {
          if (!entity.active) {
              entitiesToRemove.push(id);
          }
      }
      
      // Remove inactive entities
      for (const id of entitiesToRemove) {
          this.removeEntity(id);
      }
  }

  /**
   * Add an entity to the manager
   * @param {Entity} entity - Entity to add
   * @returns {Entity} The added entity
   */
  addEntity(entity) {
      // Add to entity map
      this.entities.set(entity.id, entity);
      
      // Add to type map
      if (!this.entitiesByType.has(entity.type)) {
          this.entitiesByType.set(entity.type, new Set());
      }
      this.entitiesByType.get(entity.type).add(entity.id);
      
      // Add to owner map if owned
      if (entity.owner) {
          if (!this.entitiesByOwner.has(entity.owner)) {
              this.entitiesByOwner.set(entity.owner, new Set());
          }
          this.entitiesByOwner.get(entity.owner).add(entity.id);
      }
      
      // Add to spatial grid
      this.spatialGrid.addEntity(entity);
      
      // Set initial last position for tracking movement
      entity.lastX = entity.x;
      entity.lastY = entity.y;
      
      return entity;
  }

  /**
   * Remove an entity from the manager
   * @param {string} entityId - ID of entity to remove
   */
  removeEntity(entityId) {
      const entity = this.entities.get(entityId);
      
      if (!entity) return;
      
      // Remove from entity map
      this.entities.delete(entityId);
      
      // Remove from type map
      if (this.entitiesByType.has(entity.type)) {
          this.entitiesByType.get(entity.type).delete(entityId);
      }
      
      // Remove from owner map
      if (entity.owner && this.entitiesByOwner.has(entity.owner)) {
          this.entitiesByOwner.get(entity.owner).delete(entityId);
      }
      
      // Remove from spatial grid
      this.spatialGrid.removeEntity(entity);
  }

  /**
   * Create an entity
   * @param {string} type - Entity type
   * @param {Object} params - Entity parameters
   * @returns {Entity} The created entity
   */
  createEntity(type, params = {}) {
      // Generate a unique ID
      this.lastEntityId++;
      params.id = `entity_${this.lastEntityId}`;
      
      // Create entity based on type
      let entity;
      
      switch (type) {
          case 'unit':
              entity = new Unit(params);
              break;
              
          case 'building':
              entity = new Building(params);
              break;
              
          case 'wall':
              entity = new Wall(params);
              break;
              
          case 'resource':
              entity = new Entity({ ...params, type: 'resource' });
              break;
              
          default:
              entity = new Entity(params);
              break;
      }
      
      // Add to manager
      return this.addEntity(entity);
  }

  /**
   * Create a unit
   * @param {Object} params - Unit parameters
   * @returns {Unit} The created unit
   */
  createUnit(params = {}) {
      // Set default values
      const defaults = {
          hp: 50, // Replaced CONFIG.STATS.VILLAGER[0].hp with default value
          maxHp: 50, // Replaced CONFIG.STATS.VILLAGER[0].hp with default value
          dp: 5, // Replaced CONFIG.STATS.VILLAGER[0].dp with default value
          ar: 5 // Replaced CONFIG.STATS.VILLAGER[0].ar with default value
      };
      
      // Create unit
      return this.createEntity('unit', { ...defaults, ...params });
  }

  /**
   * Create a building
   * @param {Object} params - Building parameters
   * @returns {Building} The created building
   */
  createBuilding(params = {}) {
      // Set default values
      let defaults = {
          hp: 0, // Buildings start at 0 HP and need to be constructed
          maxHp: 0
      };
      
      // Get building stats from config based on type (placeholder since CONFIG is undefined)
      if (params.buildingType) {
          defaults.maxHp = 500; // Placeholder default max HP
          defaults.dp = 20; // Placeholder default defense
      }
      
      // Set initial HP based on max (construction progress)
      if (params.constructed) {
          defaults.hp = defaults.maxHp;
      }
      
      // Create building
      return this.createEntity('building', { ...defaults, ...params });
  }

  /**
   * Create a wall segment
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} owner - Owner civilization
   * @param {number} ageLevel - Age level
   * @returns {Wall} The created wall
   */
  createWallSegment(x, y, owner, ageLevel = 0) {
      // Set default values
      const defaults = {
          wallType: 'wall',
          x: x,
          y: y,
          owner: owner,
          width: 1,
          height: 1,
          hp: 0,
          maxHp: 500,
          dp: 25,
          ageLevel: ageLevel
      };
      
      // Apply age bonuses (placeholder since CONFIG is undefined)
      defaults.maxHp += 100 * ageLevel; // Placeholder age bonus
      defaults.dp += 5 * ageLevel; // Placeholder age bonus
      
      // Create wall
      return this.createEntity('wall', defaults);
  }

  /**
   * Create a gate
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} owner - Owner civilization
   * @param {number} ageLevel - Age level
   * @returns {Wall} The created gate
   */
  createGate(x, y, owner, ageLevel = 0) {
      // Set default values
      const defaults = {
          wallType: 'gate',
          x: x,
          y: y,
          owner: owner,
          width: 1,
          height: 1,
          hp: 0,
          maxHp: 400,
          dp: 20,
          ageLevel: ageLevel,
          gateState: 'closed'
      };
      
      // Apply age bonuses (placeholder since CONFIG is undefined)
      defaults.maxHp += 100 * ageLevel; // Placeholder age bonus
      defaults.dp += 5 * ageLevel; // Placeholder age bonus
      
      // Create gate
      return this.createEntity('wall', defaults);
  }

  /**
   * Create a wonder
   * @param {Object} params - Wonder parameters
   * @returns {Building} The created wonder
   */
  createWonder(params = {}) {
      // Set default values
      const defaults = {
          buildingType: 'wonder',
          width: 4,
          height: 4,
          hp: 0,
          maxHp: 2000,
          dp: 60
      };
      
      // Create wonder
      return this.createEntity('building', { ...defaults, ...params });
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Entity|null} Entity or null if not found
   */
  getEntityById(id) {
      return this.entities.get(id) || null;
  }

  /**
   * Get entities of a specific type
   * @param {string} type - Entity type
   * @returns {Array} Array of entities
   */
  getEntitiesByType(type) {
      if (!this.entitiesByType.has(type)) return [];
      
      return Array.from(this.entitiesByType.get(type))
          .map(id => this.entities.get(id))
          .filter(e => e && e.active);
  }

  /**
   * Get entities of multiple types
   * @param {Array} types - Array of entity types
   * @returns {Array} Array of entities
   */
  getEntitiesByTypes(types) {
      return types.flatMap(type => this.getEntitiesByType(type));
  }

  /**
   * Get entities by type and owner
   * @param {string} type - Entity type
   * @param {string} owner - Owner civilization
   * @param {boolean} activeOnly - Whether to only return active entities
   * @returns {Array} Array of entities
   */
  getEntitiesByTypeAndOwner(type, owner, activeOnly = true) {
      const entities = this.getEntitiesByType(type);
      return entities.filter(e => e.owner === owner && (!activeOnly || e.active));
  }

  /**
   * Get entities by multiple types and owner
   * @param {Array} types - Array of entity types
   * @param {string} owner - Owner civilization
   * @param {boolean} activeOnly - Whether to only return active entities
   * @returns {Array} Array of entities
   */
  getEntitiesByTypesAndOwner(types, owner, activeOnly = true) {
      return types.flatMap(type => this.getEntitiesByTypeAndOwner(type, owner, activeOnly));
  }

  /**
   * Get all entities owned by a civilization
   * @param {string} owner - Owner civilization
   * @returns {Array} Array of entities
   */
  getEntitiesByOwner(owner) {
      if (!this.entitiesByOwner.has(owner)) return [];
      
      return Array.from(this.entitiesByOwner.get(owner))
          .map(id => this.entities.get(id))
          .filter(e => e && e.active);
  }

  /**
   * Get entities at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of entities
   */
  getEntitiesAt(x, y) {
      return this.spatialGrid.getEntitiesAt(x, y);
  }

  /**
   * Get entity at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Entity|null} Entity or null if none found
   */
  getEntityAtPosition(x, y) {
      const entities = this.getEntitiesAt(x, y);
      return entities.length > 0 ? entities[0] : null;
  }

  /**
   * Check if an area is clear of entities
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Area width
   * @param {number} height - Area height
   * @returns {boolean} True if area is clear
   */
  isAreaClear(x, y, width, height) {
      // Check all positions in the area
      for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
              const entities = this.getEntitiesAt(x + dx, y + dy);
              
              if (entities.length > 0) {
                  return false;
              }
          }
      }
      
      return true;
  }

  /**
   * Get entities in a rectangular area
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Area width
   * @param {number} height - Area height
   * @param {string} owner - Optional owner filter
   * @returns {Array} Array of entities
   */
  getEntitiesInBox(x, y, width, height, owner = null) {
      const entities = this.spatialGrid.getEntitiesInRect(x, y, width, height);
      
      // Filter by owner if specified
      if (owner) {
          return entities.filter(e => e.owner === owner);
      }
      
      return entities;
  }

  /**
   * Get entities in a circular area
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} radius - Radius
   * @param {string} owner - Optional owner filter
   * @returns {Array} Array of entities
   */
  getEntitiesInRadius(x, y, radius, owner = null) {
      // Get entities in the bounding box
      const boxX = x - radius;
      const boxY = y - radius;
      const boxSize = radius * 2;
      
      const boxEntities = this.spatialGrid.getEntitiesInRect(boxX, boxY, boxSize, boxSize);
      
      // Filter by distance and owner
      return boxEntities.filter(e => {
          // Check distance
          const distance = Utils.distance(x, y, e.x + e.width / 2, e.y + e.height / 2);
          const withinRadius = distance <= radius;
          
          // Check owner if specified
          return withinRadius && (!owner || e.owner === owner);
      });
  }

  /**
   * Get the nearest entity of a specific type
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} type - Entity type
   * @param {string} owner - Optional owner filter
   * @param {number} maxDistance - Maximum search distance
   * @returns {Entity|null} Nearest entity or null if none found
   */
  getNearestEntity(x, y, type, owner = null, maxDistance = Infinity) {
      const entities = this.getEntitiesByType(type);
      
      let nearest = null;
      let nearestDistance = maxDistance;
      
      for (const entity of entities) {
          // Skip if wrong owner
          if (owner && entity.owner !== owner) continue;
          
          // Calculate distance
          const distance = Utils.distance(x, y, entity.x + entity.width / 2, entity.y + entity.height / 2);
          
          if (distance < nearestDistance) {
              nearest = entity;
              nearestDistance = distance;
          }
      }
      
      return nearest;
  }

  /**
   * Spatial grid for efficient entity lookups
   */
  class SpatialGrid {
      /**
       * Create a new spatial grid
       * @param {number} width - Grid width
       * @param {number} height - Grid height
       */
      constructor(width, height) {
          this.width = width;
          this.height = height;
          this.cells = new Map(); // Map of cell IDs to entity sets
      }

      /**
       * Get cell ID for a position
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {string} Cell ID
       */
      getCellId(x, y) {
          return `${Math.floor(x)},${Math.floor(y)}`;
      }

      /**
       * Add an entity to the grid
       * @param {Entity} entity - Entity to add
       */
      addEntity(entity) {
          // Add to all covered cells
          for (let y = entity.y; y < entity.y + entity.height; y++) {
              for (let x = entity.x; x < entity.x + entity.width; x++) {
                  const cellId = this.getCellId(x, y);
                  
                  if (!this.cells.has(cellId)) {
                      this.cells.set(cellId, new Set());
                  }
                  
                  this.cells.get(cellId).add(entity);
              }
          }
      }

      /**
       * Remove an entity from the grid
       * @param {Entity} entity - Entity to remove
       */
      removeEntity(entity) {
          // Remove from all covered cells
          for (let y = entity.y; y < entity.y + entity.height; y++) {
              for (let x = entity.x; x < entity.x + entity.width; x++) {
                  const cellId = this.getCellId(x, y);
                  
                  if (this.cells.has(cellId)) {
                      this.cells.get(cellId).delete(entity);
                  }
              }
          }
      }

      /**
       * Update an entity's position in the grid
       * @param {Entity} entity - Entity to update
       */
      updateEntity(entity) {
          // Remove from old position
          for (let y = entity.lastY; y < entity.lastY + entity.height; y++) {
              for (let x = entity.lastX; x < entity.lastX + entity.width; x++) {
                  const cellId = this.getCellId(x, y);
                  
                  if (this.cells.has(cellId)) {
                      this.cells.get(cellId).delete(entity);
                  }
              }
          }
          
          // Add to new position
          this.addEntity(entity);
      }

      /**
       * Get entities at a specific position
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {Array} Array of entities
       */
      getEntitiesAt(x, y) {
          const cellId = this.getCellId(x, y);
          
          if (!this.cells.has(cellId)) {
              return [];
          }
          
          // Filter entities that actually contain the point
          return Array.from(this.cells.get(cellId)).filter(entity => {
              return entity.active && entity.containsPoint(x, y);
          });
      }

      /**
       * Get entities in a rectangular area
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @param {number} width - Area width
       * @param {number} height - Area height
       * @returns {Array} Array of entities
       */
      getEntitiesInRect(x, y, width, height) {
          const entities = new Set();
          
          // Check all cells in the rectangle
          for (let cy = Math.floor(y); cy < Math.ceil(y + height); cy++) {
              for (let cx = Math.floor(x); cx < Math.ceil(x + width); cx++) {
                  const cellId = this.getCellId(cx, cy);
                  
                  if (this.cells.has(cellId)) {
                      // Add all entities in this cell
                      for (const entity of this.cells.get(cellId)) {
                          if (entity.active && entity.intersectsRect(x, y, width, height)) {
                              entities.add(entity);
                          }
                      }
                  }
              }
          }
          
          return Array.from(entities);
      }
  }
}

// Export for ES modules or make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EntityManager;
} else {
  window.EntityManager = EntityManager;
}