/**
 * Empires of Eternity - Map System
 * Handles map generation, terrain management, and resource placement
 */

class Map {
  constructor(game) {
    this.game = game;

    // Map dimensions and data
    this.width = 0;
    this.height = 0;
    this.tiles = [];
    this.fogOfWar = []; // 0 = unexplored, 1 = explored but not visible, 2 = visible

    // Resource nodes
    this.resources = [];

    // Pathfinding grid
    this.pathfindingGrid = null;

    // Make sure Utils is available
    if (!window.Utils) {
      window.Utils = {
        log: function (msg) {
          console.log(msg);
        },
        randomInt: function (min, max) {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        clamp: function (value, min, max) {
          return Math.max(min, Math.min(max, value));
        },
      };
    }

    Utils.log("Map system created");
  }

  /**
   * Generate a new map
   * @param {number} size - Size of the map (width and height)
   * @param {Object} options - Map generation options
   */
  generate(size, options = {}) {
    // Set map dimensions
    this.width = size;
    this.height = size;

    // Default options
    const defaults = {
      terrainVariation: 0.7, // 0-1, higher = more varied terrain
      resourceDensity:
        (window.CONFIG &&
          window.CONFIG.MAP &&
          window.CONFIG.MAP.RESOURCE_DENSITY) ||
        0.12, // % of map with resources
      symmetric: true, // Mirror the map for balanced gameplay
      seed: Math.floor(Math.random() * 1000000), // Random seed for generation
    };

    // Merge options with defaults
    const settings = { ...defaults, ...options };

    Utils.log(`Generating ${size}x${size} map with seed ${settings.seed}`);

    // Initialize map arrays
    this.tiles = new Array(this.height);
    this.fogOfWar = new Array(this.height);

    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = new Array(this.width);
      this.fogOfWar[y] = new Array(this.width).fill(0); // Start fully unexplored
    }

    try {
      // Generate terrain
      this.generateTerrain(settings);

      // Place resources
      this.placeResources(settings);

      // Initialize pathfinding grid
      this.initPathfinding();

      Utils.log("Map generation complete");
    } catch (error) {
      Utils.log("Error generating map: " + error.message);
      console.error(error);

      // Fall back to a simple checkerboard pattern if generation fails
      this.generateFallbackMap();
    }

    return this;
  }

  /**
   * Generate a simple checkerboard map as a fallback
   */
  generateFallbackMap() {
    Utils.log("Generating fallback map");

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Simple checkerboard pattern
        const isEven = (x + y) % 2 === 0;

        this.tiles[y][x] = {
          type: isEven ? "plains" : "desert",
          elevation: 0,
          moisture: 0,
          passable: true,
          buildable: true,
        };
      }
    }

    // Create starting areas
    this.createStartingArea(
      Math.floor(this.width * 0.15),
      Math.floor(this.height * 0.15),
      10
    );
    this.createStartingArea(
      Math.floor(this.width * 0.85),
      Math.floor(this.height * 0.85),
      10
    );

    // Initialize pathfinding grid
    this.initPathfinding();
  }

  /**
   * Generate terrain for the map
   * @param {Object} settings - Generation settings
   */
  generateTerrain(settings) {
    // Create noise function
    const noise = this.createSimplexNoise(settings.seed);

    // Generate basic terrain
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Calculate symmetric coordinate if needed
        let noiseX = x,
          noiseY = y;

        if (settings.symmetric) {
          // Use distance from center for symmetric maps
          const centerX = this.width / 2;
          const centerY = this.height / 2;
          noiseX = Math.abs(x - centerX);
          noiseY = Math.abs(y - centerY);
        }

        // Generate noise values at different scales for more natural terrain
        const elevation =
          noise(noiseX * 0.05, noiseY * 0.05) * 0.5 +
          noise(noiseX * 0.1, noiseY * 0.1) * 0.3 +
          noise(noiseX * 0.2, noiseY * 0.2) * 0.2;

        const moisture =
          noise(noiseX * 0.05 + 1000, noiseY * 0.05 + 1000) * 0.5 +
          noise(noiseX * 0.1 + 1000, noiseY * 0.1 + 1000) * 0.3 +
          noise(noiseX * 0.2 + 1000, noiseY * 0.2 + 1000) * 0.2;

        // Convert noise values to terrain types
        let terrainType;

        if (elevation > 0.6) {
          terrainType = "mountains"; // High elevation = mountains
        } else if (elevation > 0.4) {
          terrainType = "hills"; // Medium-high elevation = hills
        } else if (moisture > 0.6) {
          terrainType = "forest"; // Wet lowlands = forest
        } else if (moisture < -0.4) {
          terrainType = "desert"; // Dry lowlands = desert
        } else {
          terrainType = "plains"; // Default = plains
        }

        // Create tile
        this.tiles[y][x] = {
          type: terrainType,
          elevation: elevation,
          moisture: moisture,
          passable: terrainType !== "mountains", // Mountains are impassable
          buildable: terrainType !== "mountains" && terrainType !== "forest", // Can't build on mountains or forests
        };
      }
    }

    // Create starting areas - flatten terrain around spawn points
    this.createStartingAreas();
  }

  /**
   * Create starting areas for players
   */
  createStartingAreas() {
    // Create Solari starting area in top-left
    this.createStartingArea(
      Math.floor(this.width * 0.15),
      Math.floor(this.height * 0.15),
      10
    );

    // Create Lunari starting area in bottom-right
    this.createStartingArea(
      Math.floor(this.width * 0.85),
      Math.floor(this.height * 0.85),
      10
    );
  }

  /**
   * Create a starting area of flat, buildable terrain
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Radius of the area
   */
  createStartingArea(centerX, centerY, radius) {
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        // Skip if outside map bounds
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;

        // Calculate distance from center (squared for efficiency)
        const distSq = Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2);

        if (distSq <= radius * radius) {
          // Inner circle - all plains
          if (distSq <= Math.pow(radius * 0.7, 2)) {
            this.tiles[y][x] = {
              type: "plains",
              elevation: 0,
              moisture: 0,
              passable: true,
              buildable: true,
            };
          }
          // Outer ring - no mountains
          else {
            if (this.tiles[y][x].type === "mountains") {
              this.tiles[y][x].type = "hills";
              this.tiles[y][x].passable = true;
            }

            if (this.tiles[y][x].type === "forest") {
              this.tiles[y][x].buildable = false;
            } else {
              this.tiles[y][x].buildable = true;
            }
          }
        }
      }
    }
  }

  /**
   * Place resources on the map
   * @param {Object} settings - Generation settings
   */
  placeResources(settings) {
    // Clear existing resources
    this.resources = [];

    // Calculate number of resources to place
    const totalTiles = this.width * this.height;
    const resourceCount = Math.floor(totalTiles * settings.resourceDensity);

    // Track used positions to avoid overlaps
    const usedPositions = new Set();

    // Place resource nodes
    let placedCount = 0;

    // Create resource distribution
    const distribution = {
      wood: 0.4, // 40% trees
      food: 0.25, // 25% food sources
      gold: 0.15, // 15% gold mines
      stone: 0.1, // 10% stone quarries
      iron: 0.1, // 10% iron deposits
    };

    // Function to check if position is suitable for resource
    const isValidPosition = (x, y, resourceType) => {
      // Check bounds
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
        return false;
      }

      // Check if position is already used
      if (usedPositions.has(`${x},${y}`)) {
        return false;
      }

      // Check terrain compatibility
      const tile = this.tiles[y][x];

      switch (resourceType) {
        case "wood":
          return tile.type === "forest" || tile.type === "plains";
        case "food":
          return tile.type === "plains" || tile.type === "forest";
        case "gold":
          return tile.type === "hills" || tile.type === "mountains";
        case "stone":
          return tile.type === "hills" || tile.type === "mountains";
        case "iron":
          return tile.type === "hills" || tile.type === "mountains";
        default:
          return false;
      }
    };

    // Helper to place a cluster of resources
    const placeResourceCluster = (resourceType, clusterSize, attempts) => {
      for (let i = 0; i < attempts && placedCount < resourceCount; i++) {
        // Find a random valid position for the cluster center
        let centerX, centerY;
        let found = false;

        for (let attempt = 0; attempt < 50; attempt++) {
          centerX = Utils.randomInt(0, this.width - 1);
          centerY = Utils.randomInt(0, this.height - 1);

          if (isValidPosition(centerX, centerY, resourceType)) {
            found = true;
            break;
          }
        }

        if (!found) continue;

        // Place a cluster of resources
        const actualClusterSize = Utils.randomInt(
          Math.max(1, clusterSize - 2),
          clusterSize + 2
        );

        for (
          let j = 0;
          j < actualClusterSize && placedCount < resourceCount;
          j++
        ) {
          // Random position near center
          const offsetX = Utils.randomInt(-2, 2);
          const offsetY = Utils.randomInt(-2, 2);

          const x = centerX + offsetX;
          const y = centerY + offsetY;

          if (isValidPosition(x, y, resourceType)) {
            // Calculate resource amount
            let amount;
            const config = window.CONFIG || {};
            const resourceConfig = config.RESOURCES || {};
            const depletionConfig = resourceConfig.DEPLETION || {};

            switch (resourceType) {
              case "wood":
                amount = depletionConfig.tree || 500;
                break;
              case "food":
                amount = depletionConfig.berry_bush || 200;
                break;
              case "gold":
                amount = depletionConfig.gold_mine || 1000;
                break;
              case "stone":
                amount = depletionConfig.stone_quarry || 1200;
                break;
              case "iron":
                amount = depletionConfig.iron_deposit || 800;
                break;
            }

            // Add some variation to resource amount
            amount = Math.round((amount * Utils.randomInt(80, 120)) / 100);

            // Create resource node
            this.resources.push({
              type: "resource",
              resourceType: resourceType,
              x: x,
              y: y,
              amount: amount,
              originalAmount: amount,
            });

            // Mark position as used
            usedPositions.add(`${x},${y}`);

            // Update tile buildability
            this.tiles[y][x].buildable = false;

            // Count resource
            placedCount++;
          }
        }
      }
    };

    try {
      // Place resource clusters
      Object.entries(distribution).forEach(([resourceType, ratio]) => {
        const targetCount = Math.floor(resourceCount * ratio);
        let clusterSize;

        // Different cluster sizes for different resources
        switch (resourceType) {
          case "wood":
            clusterSize = 8; // Larger clusters for forests
            break;
          case "food":
            clusterSize = 4; // Medium clusters for food
            break;
          case "gold":
          case "stone":
          case "iron":
            clusterSize = 3; // Smaller clusters for minerals
            break;
          default:
            clusterSize = 1;
        }

        // Place clusters until target count is reached
        const attempts = Math.ceil(targetCount / clusterSize);
        placeResourceCluster(resourceType, clusterSize, attempts);
      });

      Utils.log(`Placed ${this.resources.length} resource nodes`);
    } catch (error) {
      Utils.log("Error placing resources: " + error.message);
      console.error(error);
    }
  }

  /**
   * Initialize pathfinding grid
   */
  initPathfinding() {
    try {
      // Create grid representation for pathfinding
      const grid = [];

      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let x = 0; x < this.width; x++) {
          // 0 = walkable, 1 = obstacle
          row.push(this.tiles[y][x].passable ? 0 : 1);
        }
        grid.push(row);
      }

      // Store grid for pathfinding
      this.pathfindingGrid = grid;

      Utils.log("Pathfinding grid initialized");
    } catch (error) {
      Utils.log("Error initializing pathfinding: " + error.message);
      console.error(error);

      // Fallback to empty pathfinding grid
      this.pathfindingGrid = Array(this.height)
        .fill()
        .map(() => Array(this.width).fill(0));
    }
  }

  /**
   * Find a path between two points
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @returns {Array|null} Array of path coordinates or null if no path found
   */
  findPath(startX, startY, endX, endY) {
    // Boundary checks
    if (
      startX < 0 ||
      startY < 0 ||
      startX >= this.width ||
      startY >= this.height ||
      endX < 0 ||
      endY < 0 ||
      endX >= this.width ||
      endY >= this.height
    ) {
      return null;
    }

    // Check if destination is passable
    if (!this.tiles[endY][endX].passable) {
      // Find nearest passable tile
      const nearest = this.findNearestPassableTile(endX, endY);
      if (nearest) {
        endX = nearest.x;
        endY = nearest.y;
      } else {
        return null;
      }
    }

    try {
      // A* pathfinding
      const openSet = [];
      const closedSet = new Set();
      const gScore = {};
      const fScore = {};
      const cameFrom = {};

      // Initialize starting node
      const startKey = `${startX},${startY}`;
      gScore[startKey] = 0;
      fScore[startKey] = this.heuristic(startX, startY, endX, endY);
      openSet.push({
        x: startX,
        y: startY,
        f: fScore[startKey],
      });

      // A* search loop
      while (openSet.length > 0) {
        // Sort open set by fScore
        openSet.sort((a, b) => a.f - b.f);

        // Get node with lowest fScore
        const current = openSet.shift();
        const currentKey = `${current.x},${current.y}`;

        // Check if we've reached the goal
        if (current.x === endX && current.y === endY) {
          return this.reconstructPath(cameFrom, endX, endY);
        }

        // Add to closed set
        closedSet.add(currentKey);

        // Check neighbors
        const neighbors = this.getNeighbors(current.x, current.y);

        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;

          // Skip if in closed set
          if (closedSet.has(neighborKey)) {
            continue;
          }

          // Calculate tentative gScore
          const tentativeGScore = gScore[currentKey] + 1;

          // Check if neighbor is in open set
          const inOpenSet = openSet.findIndex(
            (n) => n.x === neighbor.x && n.y === neighbor.y
          );

          if (inOpenSet === -1 || tentativeGScore < gScore[neighborKey]) {
            // This path is better than previous ones
            cameFrom[neighborKey] = { x: current.x, y: current.y };
            gScore[neighborKey] = tentativeGScore;
            fScore[neighborKey] =
              tentativeGScore +
              this.heuristic(neighbor.x, neighbor.y, endX, endY);

            if (inOpenSet === -1) {
              openSet.push({
                x: neighbor.x,
                y: neighbor.y,
                f: fScore[neighborKey],
              });
            } else {
              openSet[inOpenSet].f = fScore[neighborKey];
            }
          }
        }
      }
    } catch (error) {
      Utils.log("Error finding path: " + error.message);
      console.error(error);
    }

    // No path found
    return null;
  }

  /**
   * Get valid neighbors for a tile
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of valid neighbor coordinates
   */
  getNeighbors(x, y) {
    const neighbors = [];
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: -1 }, // Northeast
      { x: 1, y: 0 }, // East
      { x: 1, y: 1 }, // Southeast
      { x: 0, y: 1 }, // South
      { x: -1, y: 1 }, // Southwest
      { x: -1, y: 0 }, // West
      { x: -1, y: -1 }, // Northwest
    ];

    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;

      // Check bounds
      if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
        continue;
      }

      // Check if passable
      if (this.tiles[ny][nx].passable) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * Heuristic function for A* pathfinding
   * @param {number} x1 - Starting X coordinate
   * @param {number} y1 - Starting Y coordinate
   * @param {number} x2 - Ending X coordinate
   * @param {number} y2 - Ending Y coordinate
   * @returns {number} Heuristic value
   */
  heuristic(x1, y1, x2, y2) {
    // Using diagonal distance
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  /**
   * Reconstruct path from A* result
   * @param {Object} cameFrom - Map of node predecessors
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @returns {Array} Array of path coordinates
   */
  reconstructPath(cameFrom, endX, endY) {
    const path = [];
    let current = { x: endX, y: endY };

    path.unshift(current);

    while (cameFrom[`${current.x},${current.y}`]) {
      current = cameFrom[`${current.x},${current.y}`];
      path.unshift(current);
    }

    return path;
  }

  /**
   * Find the nearest passable tile to a given position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} maxDistance - Maximum search distance
   * @returns {Object|null} Nearest passable tile or null if none found
   */
  findNearestPassableTile(x, y, maxDistance = 5) {
    // BFS search for nearest passable tile
    const queue = [{ x, y, distance: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      // Skip if visited
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      // Check if passable
      if (
        current.x >= 0 &&
        current.y >= 0 &&
        current.x < this.width &&
        current.y < this.height &&
        this.tiles[current.y][current.x].passable
      ) {
        return { x: current.x, y: current.y };
      }

      // Check distance limit
      if (current.distance >= maxDistance) {
        continue;
      }

      // Add neighbors to queue
      const directions = [
        { x: 0, y: -1 }, // North
        { x: 1, y: 0 }, // East
        { x: 0, y: 1 }, // South
        { x: -1, y: 0 }, // West
      ];

      for (const dir of directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;

        // Skip if out of bounds
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
          continue;
        }

        queue.push({ x: nx, y: ny, distance: current.distance + 1 });
      }
    }

    return null;
  }

  /**
   * Get a tile at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Tile data or null if out of bounds
   */
  getTile(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return null;
    }

    return this.tiles[y][x];
  }

  /**
   * Update the visibility of the map for a civilization
   * @param {string} civilization - Civilization key
   * @param {Array} visiblePositions - Array of {x, y} visible positions
   * @param {number} viewRange - Visibility range in tiles
   */
  updateVisibility(civilization, visiblePositions, viewRange) {
    // For simplicity, we're using a single fog of war for all civs
    // In a full implementation, each civ would have its own fog array

    // Reset visibility (but keep explored areas)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.fogOfWar[y][x] === 2) {
          this.fogOfWar[y][x] = 1; // Visible -> Explored
        }
      }
    }

    // Update visibility for each position
    for (const pos of visiblePositions) {
      this.updateVisibilityForPosition(pos.x, pos.y, viewRange);
    }
  }

  /**
   * Update visibility for a single position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} viewRange - Visibility range in tiles
   */
  updateVisibilityForPosition(x, y, viewRange) {
    // Basic visibility calculation
    for (let dy = -viewRange; dy <= viewRange; dy++) {
      for (let dx = -viewRange; dx <= viewRange; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        // Skip if out of bounds
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
          continue;
        }

        // Calculate distance from source
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Skip if beyond view range
        if (distance > viewRange) {
          continue;
        }

        // Update fog of war
        this.fogOfWar[ty][tx] = 2; // Visible
      }
    }
  }

  /**
   * Check if a position is visible
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if the position is visible
   */
  isVisible(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return false;
    }

    return this.fogOfWar[y][x] === 2;
  }

  /**
   * Check if a position is explored (discovered but not currently visible)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if the position is explored
   */
  isExplored(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return false;
    }

    return this.fogOfWar[y][x] >= 1;
  }

  /**
   * Check if a building can be placed at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Building width
   * @param {number} height - Building height
   * @returns {boolean} True if placement is valid
   */
  isTerrainBuildable(x, y, width, height) {
    // Check each tile in the building's footprint
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        // Check if out of bounds
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
          return false;
        }

        // Check if tile is buildable
        if (!this.tiles[ty][tx].buildable) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get resource at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Resource or null if none found
   */
  getResourceAt(x, y) {
    return this.resources.find((r) => r.x === x && r.y === y) || null;
  }

  /**
   * Get resources of a specific type
   * @param {string} resourceType - Type of resource
   * @returns {Array} Array of resources of the specified type
   */
  getResourcesByType(resourceType) {
    return this.resources.filter((r) => r.resourceType === resourceType);
  }

  /**
   * Deplete a resource by a specified amount
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} amount - Amount to gather
   * @returns {number} Actual amount gathered
   */
  gatherResource(x, y, amount) {
    const resource = this.getResourceAt(x, y);

    if (!resource || resource.amount <= 0) {
      return 0;
    }

    // Calculate actual gather amount
    const actualGather = Math.min(resource.amount, amount);

    // Reduce resource amount
    resource.amount -= actualGather;

    // Check if resource is depleted
    if (resource.amount <= 0) {
      // Mark the resource as depleted
      resource.depleted = true;

      // Make the tile buildable again
      this.tiles[y][x].buildable = true;

      Utils.log(`Resource at (${x}, ${y}) depleted`);
    }

    return actualGather;
  }

  /**
   * Update the map
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    try {
      // Regrow trees over time
      for (const resource of this.resources) {
        if (resource.resourceType === "wood" && resource.depleted) {
          // Random chance to regrow
          if (Math.random() < 0.0001 * deltaTime) {
            resource.amount = Math.floor(resource.originalAmount * 0.5);
            resource.depleted = false;

            // Make tile unbuildable again
            this.tiles[resource.y][resource.x].buildable = false;

            Utils.log(`Tree at (${resource.x}, ${resource.y}) regrown`);
          }
        }
      }
    } catch (error) {
      Utils.log("Error updating map: " + error.message);
      console.error(error);
    }
  }

  /**
   * Create a simplex noise function
   * @param {number} seed - Seed for noise generation
   * @returns {Function} Noise function(x, y) -> -1 to 1
   */
  createSimplexNoise(seed) {
    // This is a simplified 2D noise implementation
    // In a real game, you would use a proper noise library

    // Create a pseudo-random number generator from the seed
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Generate permutation table
    const permutation = Array(256)
      .fill(0)
      .map((_, i) => i);

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }

    // Extend permutation to avoid wrapping
    const perm = permutation.concat(permutation);

    // Skew and unskew factors
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    // Helper functions
    const dot2 = (g, x, y) => g[0] * x + g[1] * y;

    const grad3 = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    // Return the noise function
    return (x, y) => {
      try {
        // Skew input space
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        // Unskew back to get the cell origin
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;

        // Relative x, y coordinates
        const x0 = x - X0;
        const y0 = y - Y0;

        // Determine simplex (triangle) we're in
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;

        // Offsets for other corners
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        // Wrap indices for permutation
        const ii = i & 255;
        const jj = j & 255;

        // Calculate contribution from each corner
        const n0 = this.calcCornerNoise(
          x0,
          y0,
          perm[(ii + perm[jj]) & 255] & 7,
          grad3
        );
        const n1 = this.calcCornerNoise(
          x1,
          y1,
          perm[(ii + i1 + perm[jj + j1]) & 255] & 7,
          grad3
        );
        const n2 = this.calcCornerNoise(
          x2,
          y2,
          perm[(ii + 1 + perm[jj + 1]) & 255] & 7,
          grad3
        );

        // Sum contributions (scaled to -1..1)
        return 70 * (n0 + n1 + n2);
      } catch (error) {
        // If there's an error in noise calculation, return a random value
        // This prevents the entire map generation from failing
        console.error("Error in noise calculation:", error);
        return Math.random() * 2 - 1;
      }
    };
  }

  /**
   * Calculate noise contribution from a corner
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} gi - Gradient index
   * @param {Array} grad3 - Gradient vectors
   * @returns {number} Noise contribution
   */
  calcCornerNoise(x, y, gi, grad3) {
    // Calculate falloff factor
    const t = 0.5 - x * x - y * y;

    if (t < 0) return 0;

    // Calculate noise contribution
    const g = grad3[gi];
    return t * t * t * t * (g[0] * x + g[1] * y);
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = Map;
} else {
  window.Map = Map;
}
