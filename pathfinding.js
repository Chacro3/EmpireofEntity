/**
 * @fileoverview Pathfinding implementation for Empires of Eternity
 * Handles A* pathfinding, path smoothing, and dynamic path recalculation.
 */

import { config } from "../config.js";
import { Utils } from "../core/utils.js";

/**
 * Pathfinding system for finding paths through the game map
 */
export class PathfindingSystem {
  /**
   * Create a new pathfinding system
   * @param {Object} game - Reference to the main game object
   * @param {Object} map - Reference to the map object
   */
  constructor(game, map) {
    this.game = game;
    this.map = map;

    // Path cache for common paths
    this.pathCache = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Maximum cache entries to prevent memory issues
    this.maxCacheEntries = config.PATHFINDING_CACHE_SIZE || 1000;

    // Pathfinding stats
    this.totalPathsCalculated = 0;
    this.totalPathfindingTime = 0;

    // Path reuse settings
    this.reuseThreshold = config.PATHFINDING_REUSE_THRESHOLD || 5; // Grid cells

    // Directions for neighbor calculations
    this.directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: -1 }, // Northeast
      { x: 1, y: 0 }, // East
      { x: 1, y: 1 }, // Southeast
      { x: 0, y: 1 }, // South
      { x: -1, y: 1 }, // Southwest
      { x: -1, y: 0 }, // West
      { x: -1, y: -1 }, // Northwest
    ];

    // Cost multipliers
    this.straightCost = 10;
    this.diagonalCost = 14; // Approximately sqrt(2) * 10

    // Directions for node connections
    this.nodeDirections = {};
    this.directions.forEach((dir, index) => {
      this.nodeDirections[`${dir.x},${dir.y}`] = index;
    });

    // Path smoothing parameters
    this.smoothingLookahead = config.PATHFINDING_SMOOTHING_LOOKAHEAD || 3;
  }

  /**
   * Initialize the pathfinding system
   */
  init() {
    console.log("Pathfinding system initialized");
  }

  /**
   * Find a path from start to end positions
   * @param {number} startX - Start X position in world coordinates
   * @param {number} startY - Start Y position in world coordinates
   * @param {number} endX - End X position in world coordinates
   * @param {number} endY - End Y position in world coordinates
   * @param {Object} options - Pathfinding options
   * @param {boolean} options.ignoreUnits - Whether to ignore units as obstacles
   * @param {boolean} options.ignoreResources - Whether to ignore resources as obstacles
   * @param {boolean} options.allowDiagonal - Whether to allow diagonal movement
   * @param {number} options.unitSize - Size of the unit (for collision checking)
   * @param {number} options.owner - Owner ID (for checking if walls can be passed)
   * @param {number} options.pathingRadius - Additional pathing radius to keep from obstacles
   * @returns {Array} Array of path points {x, y}
   */
  findPath(startX, startY, endX, endY, options = {}) {
    const startTime = performance.now();

    // Set default options
    options = {
      ignoreUnits: false,
      ignoreResources: false,
      allowDiagonal: true,
      unitSize: 1,
      owner: 0,
      pathingRadius: 0,
      ...options,
    };

    // Convert to grid coordinates
    const gridStart = this.worldToGrid(startX, startY);
    const gridEnd = this.worldToGrid(endX, endY);

    // Check if path is already cached
    const cacheKey = this.getCacheKey(gridStart, gridEnd, options);
    const cachedPath = this.getFromCache(cacheKey);

    if (cachedPath) {
      return this.postProcessPath(
        cachedPath,
        startX,
        startY,
        endX,
        endY,
        options
      );
    }

    // Check if start and end are the same or adjacent
    if (this.isSameOrAdjacent(gridStart, gridEnd)) {
      return [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ];
    }

    // Check if end position is passable
    if (!this.isPassable(gridEnd.x, gridEnd.y, options)) {
      // Find nearest passable position
      const nearest = this.findNearestPassable(gridEnd.x, gridEnd.y, options);
      if (nearest) {
        gridEnd.x = nearest.x;
        gridEnd.y = nearest.y;
        const worldPos = this.gridToWorld(nearest.x, nearest.y);
        endX = worldPos.x;
        endY = worldPos.y;
      } else {
        // No passable position found
        return [{ x: startX, y: startY }];
      }
    }

    // Perform A* pathfinding
    const path = this.aStar(gridStart, gridEnd, options);

    // Convert grid path to world coordinates
    const worldPath = path.map((point) => this.gridToWorld(point.x, point.y));

    // Post-process the path
    const finalPath = this.postProcessPath(
      worldPath,
      startX,
      startY,
      endX,
      endY,
      options
    );

    // Cache the path if it's not trivial
    if (finalPath.length > 2) {
      this.addToCache(cacheKey, worldPath);
    }

    // Update stats
    this.totalPathsCalculated++;
    this.totalPathfindingTime += performance.now() - startTime;

    return finalPath;
  }

  /**
   * Perform A* pathfinding algorithm
   * @param {Object} start - Start position {x, y} in grid coordinates
   * @param {Object} end - End position {x, y} in grid coordinates
   * @param {Object} options - Pathfinding options
   * @returns {Array} Array of path points in grid coordinates
   */
  aStar(start, end, options) {
    // Initialize open and closed sets
    const openSet = new PriorityQueue();
    const closedSet = new Set();

    // Start node
    const startNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      parent: null,
    };

    startNode.f = startNode.g + startNode.h;
    openSet.enqueue(startNode, startNode.f);

    // Track node references by position
    const nodeMap = new Map();
    nodeMap.set(`${start.x},${start.y}`, startNode);

    // Main A* loop
    while (!openSet.isEmpty()) {
      // Get the node with lowest f score
      const current = openSet.dequeue();

      // Check if we've reached the goal
      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      // Add current to closed set
      closedSet.add(`${current.x},${current.y}`);

      // Check all neighbors
      const neighbors = this.getNeighbors(current, options);

      for (const neighbor of neighbors) {
        // Skip if in closed set
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        // Calculate tentative g score
        const tentativeG = current.g + this.getMovementCost(current, neighbor);

        // Get existing neighbor node or create new one
        let neighborNode = nodeMap.get(neighborKey);

        if (!neighborNode) {
          // Create new node
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: Infinity,
            h: this.heuristic(neighbor, end),
            parent: null,
          };
          nodeMap.set(neighborKey, neighborNode);
        }

        // Update node if this path is better
        if (tentativeG < neighborNode.g) {
          neighborNode.parent = current;
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;

          // Add to open set if not already there
          if (!openSet.contains(neighborNode)) {
            openSet.enqueue(neighborNode, neighborNode.f);
          } else {
            // Update position in priority queue
            openSet.updatePriority(neighborNode, neighborNode.f);
          }
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Get the movement cost between two adjacent nodes
   * @param {Object} from - Starting node
   * @param {Object} to - Ending node
   * @returns {number} Movement cost
   */
  getMovementCost(from, to) {
    // Diagonal movement costs more
    const isDiagonal = from.x !== to.x && from.y !== to.y;
    let cost = isDiagonal ? this.diagonalCost : this.straightCost;

    // Terrain difficulty modifiers (1.0 = normal, higher = slower)
    const terrainCost = this.map.getTerrainMovementFactor(to.x, to.y);
    cost *= terrainCost;

    return cost;
  }

  /**
   * Calculate Manhattan distance heuristic
   * @param {Object} a - First point
   * @param {Object} b - Second point
   * @returns {number} Heuristic value
   */
  heuristic(a, b) {
    // Diagonal shortcut distance (Chebyshev distance with tie-breaking)
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const straight = dx + dy;
    const diagonal = Math.min(dx, dy);

    // Add a small tie-breaking factor to prevent zigzagging paths
    return (
      this.straightCost * (straight - diagonal) +
      this.diagonalCost * diagonal +
      0.001 * (dx + dy)
    );
  }

  /**
   * Get valid neighboring cells
   * @param {Object} node - Current node
   * @param {Object} options - Pathfinding options
   * @returns {Array} Array of valid neighbors
   */
  getNeighbors(node, options) {
    const neighbors = [];

    // Check all directions
    for (let i = 0; i < this.directions.length; i++) {
      // Skip diagonal directions if not allowed
      if (!options.allowDiagonal && i % 2 === 1) continue;

      const dir = this.directions[i];
      const neighborX = node.x + dir.x;
      const neighborY = node.y + dir.y;

      // Check if neighbor is passable
      if (this.isPassable(neighborX, neighborY, options)) {
        neighbors.push({ x: neighborX, y: neighborY });
      }
    }

    return neighbors;
  }

  /**
   * Check if a grid cell is passable
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {Object} options - Pathfinding options
   * @returns {boolean} True if passable
   */
  isPassable(x, y, options) {
    // Check map bounds
    if (!this.map.isInBounds(x, y)) {
      return false;
    }

    // Check terrain
    if (!this.map.isWalkable(x, y)) {
      return false;
    }

    // Check for buildings and walls if not ignoring them
    if (!options.ignoreBuildings) {
      const buildings = this.map.getBuildingsAt(x, y);

      for (const building of buildings) {
        // If it's a wall, check if it belongs to the same player
        if (building.type === "wall" && building.owner === options.owner) {
          // Player's own walls are passable
          continue;
        }

        // If it's a gate that's open, it's passable
        if (building.type === "wall" && building.isGate && building.isOpen) {
          continue;
        }

        // Otherwise building is an obstacle
        return false;
      }
    }

    // Check for resources if not ignoring them
    if (!options.ignoreResources) {
      const resources = this.map.getResourcesAt(x, y);
      if (resources.length > 0) {
        return false;
      }
    }

    // Check for units if not ignoring them
    if (!options.ignoreUnits) {
      const units = this.map.getUnitsAt(x, y);
      if (units.length > 0) {
        return false;
      }
    }

    // Account for unit size and pathing radius
    if (options.unitSize > 1 || options.pathingRadius > 0) {
      const effectiveSize = Math.max(
        1,
        Math.ceil(options.unitSize / this.map.gridCellSize) +
          Math.ceil(options.pathingRadius / this.map.gridCellSize)
      );

      // Check surrounding cells based on unit size
      if (effectiveSize > 1) {
        const halfSize = Math.floor(effectiveSize / 2);

        for (let offsetX = -halfSize; offsetX <= halfSize; offsetX++) {
          for (let offsetY = -halfSize; offsetY <= halfSize; offsetY++) {
            // Skip the center cell as we've already checked it
            if (offsetX === 0 && offsetY === 0) continue;

            const checkX = x + offsetX;
            const checkY = y + offsetY;

            // Check bounds
            if (!this.map.isInBounds(checkX, checkY)) {
              return false;
            }

            // Check terrain
            if (!this.map.isWalkable(checkX, checkY)) {
              return false;
            }

            // Check buildings
            if (!options.ignoreBuildings) {
              const buildings = this.map.getBuildingsAt(checkX, checkY);
              if (buildings.length > 0) {
                return false;
              }
            }

            // Check resources
            if (!options.ignoreResources) {
              const resources = this.map.getResourcesAt(checkX, checkY);
              if (resources.length > 0) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Find the nearest passable grid cell to the given coordinates
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {Object} options - Pathfinding options
   * @returns {Object|null} Nearest passable position or null if none found
   */
  findNearestPassable(x, y, options) {
    // Spiral outward from the point to find nearest passable cell
    const maxRadius = 10; // Maximum search radius

    for (let radius = 1; radius <= maxRadius; radius++) {
      // Check perimeter of square with given radius
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
          // Only check perimeter
          if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) {
            continue;
          }

          const checkX = x + offsetX;
          const checkY = y + offsetY;

          if (this.isPassable(checkX, checkY, options)) {
            return { x: checkX, y: checkY };
          }
        }
      }
    }

    return null; // No passable position found within search radius
  }

  /**
   * Reconstruct path from A* result
   * @param {Object} endNode - End node with parent references
   * @returns {Array} Array of points in the path
   */
  reconstructPath(endNode) {
    const path = [];
    let current = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  /**
   * Convert world coordinates to grid coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Grid coordinates {x, y}
   */
  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.map.gridCellSize),
      y: Math.floor(worldY / this.map.gridCellSize),
    };
  }

  /**
   * Convert grid coordinates to world coordinates (center of grid cell)
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {Object} World coordinates {x, y}
   */
  gridToWorld(gridX, gridY) {
    return {
      x: (gridX + 0.5) * this.map.gridCellSize,
      y: (gridY + 0.5) * this.map.gridCellSize,
    };
  }

  /**
   * Post-process a path for smoothness and add start/end points
   * @param {Array} path - Raw path
   * @param {number} startX - Original start X
   * @param {number} startY - Original start Y
   * @param {number} endX - Original end X
   * @param {number} endY - Original end Y
   * @param {Object} options - Pathfinding options
   * @returns {Array} Processed path
   */
  postProcessPath(path, startX, startY, endX, endY, options) {
    if (!path || path.length === 0) {
      return [{ x: startX, y: startY }];
    }

    // Start with original start point
    const finalPath = [{ x: startX, y: startY }];

    // Add smoothed path points
    if (path.length > 2) {
      // Apply path smoothing
      const smoothedPath = this.smoothPath(path, options);

      // Add smoothed points to final path
      for (let i = 0; i < smoothedPath.length; i++) {
        finalPath.push(smoothedPath[i]);
      }
    } else {
      // Path is already minimal, just add the points
      for (let i = 0; i < path.length; i++) {
        finalPath.push(path[i]);
      }
    }

    // Ensure end point is included
    const lastPoint = finalPath[finalPath.length - 1];
    if (lastPoint.x !== endX || lastPoint.y !== endY) {
      finalPath.push({ x: endX, y: endY });
    }

    return finalPath;
  }

  /**
   * Smooth a path by removing unnecessary waypoints
   * @param {Array} path - Path to smooth
   * @param {Object} options - Pathfinding options
   * @returns {Array} Smoothed path
   */
  smoothPath(path, options) {
    if (path.length <= 2) return path;

    const smoothed = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      // Look ahead to find furthest visible point
      let furthestVisible = currentIndex + 1;

      for (
        let i = currentIndex + 2;
        i < path.length && i <= currentIndex + this.smoothingLookahead;
        i++
      ) {
        if (this.isLineClear(path[currentIndex], path[i], options)) {
          furthestVisible = i;
        }
      }

      // Add furthest visible point to smoothed path
      smoothed.push(path[furthestVisible]);
      currentIndex = furthestVisible;
    }

    return smoothed;
  }

  /**
   * Check if a straight line between two points is clear of obstacles
   * @param {Object} a - First point
   * @param {Object} b - Second point
   * @param {Object} options - Pathfinding options
   * @returns {boolean} True if line is clear
   */
  isLineClear(a, b, options) {
    // Use Bresenham's line algorithm to check cells along the line
    const gridA = this.worldToGrid(a.x, a.y);
    const gridB = this.worldToGrid(b.x, b.y);

    const points = this.getBresenhamLine(gridA.x, gridA.y, gridB.x, gridB.y);

    // Check each point on the line
    for (const point of points) {
      if (!this.isPassable(point.x, point.y, options)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get Bresenham line between two points
   * @param {number} x0 - Start X
   * @param {number} y0 - Start Y
   * @param {number} x1 - End X
   * @param {number} y1 - End Y
   * @returns {Array} Array of points on the line
   */
  getBresenhamLine(x0, y0, x1, y1) {
    const points = [];

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      points.push({ x: x0, y: y0 });

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return points;
  }

  /**
   * Check if two grid positions are the same or adjacent
   * @param {Object} a - First position
   * @param {Object} b - Second position
   * @returns {boolean} True if same or adjacent
   */
  isSameOrAdjacent(a, b) {
    return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
  }

  /**
   * Get a cache key for path caching
   * @param {Object} start - Start position
   * @param {Object} end - End position
   * @param {Object} options - Pathfinding options
   * @returns {string} Cache key
   */
  getCacheKey(start, end, options) {
    return `${start.x},${start.y}:${end.x},${end.y}:${options.unitSize}:${
      options.owner
    }:${options.ignoreUnits ? 1 : 0}`;
  }

  /**
   * Get a path from the cache if available
   * @param {string} key - Cache key
   * @returns {Array|null} Cached path or null if not found
   */
  getFromCache(key) {
    const path = this.pathCache[key];

    if (path) {
      this.cacheHits++;
      return path;
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Add a path to the cache
   * @param {string} key - Cache key
   * @param {Array} path - Path to cache
   */
  addToCache(key, path) {
    // Remove oldest path if cache is full
    if (Object.keys(this.pathCache).length >= this.maxCacheEntries) {
      const oldestKey = Object.keys(this.pathCache)[0];
      delete this.pathCache[oldestKey];
    }

    this.pathCache[key] = path.slice(); // Clone the path
  }

  /**
   * Clear the path cache
   */
  clearCache() {
    this.pathCache = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Check if a unit can reuse part of an existing path
   * @param {Object} unit - Unit entity
   * @param {Object} target - Target position
   * @param {Array} currentPath - Current path
   * @param {Object} options - Pathfinding options
   * @returns {Array|null} New path or null if can't reuse
   */
  tryReuseExistingPath(unit, target, currentPath, options) {
    if (!currentPath || currentPath.length < 2) {
      return null;
    }

    // Find closest point on current path
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < currentPath.length; i++) {
      const distance = Utils.distance(
        unit.x,
        unit.y,
        currentPath[i].x,
        currentPath[i].y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    // If closest point is too far, don't reuse
    if (closestDistance > this.reuseThreshold * this.map.gridCellSize) {
      return null;
    }

    // Create a new path from closest point to the end
    const truncatedPath = currentPath.slice(closestIndex);

    // Check if end of path is close to target
    const lastPoint = truncatedPath[truncatedPath.length - 1];
    const distanceToTarget = Utils.distance(
      lastPoint.x,
      lastPoint.y,
      target.x,
      target.y
    );

    if (distanceToTarget <= this.reuseThreshold * this.map.gridCellSize) {
      // Can reuse path and just add target at the end
      return [...truncatedPath, { x: target.x, y: target.y }];
    }

    // Calculate path from end of truncated path to target
    const endPath = this.findPath(
      lastPoint.x,
      lastPoint.y,
      target.x,
      target.y,
      options
    );

    if (endPath.length > 0) {
      // Remove first point of endPath as it's the same as last point of truncatedPath
      endPath.shift();
      return [...truncatedPath, ...endPath];
    }

    return null;
  }

  /**
   * Find a path that avoids other moving units
   * @param {number} startX - Start X position
   * @param {number} startY - Start Y position
   * @param {number} endX - End X position
   * @param {number} endY - End Y position
   * @param {Object} options - Pathfinding options
   * @returns {Array} Path that avoids other units
   */
  findPathAvoidingUnits(startX, startY, endX, endY, options) {
    // Start with normal pathfinding
    const normalPath = this.findPath(startX, startY, endX, endY, options);

    // If we found a clear path, return it
    if (normalPath.length > 0) {
      return normalPath;
    }

    // Try again but ignore units
    const modifiedOptions = {
      ...options,
      ignoreUnits: true,
    };

    return this.findPath(startX, startY, endX, endY, modifiedOptions);
  }

  /**
   * Find a formation movement path
   * @param {Object} formation - Formation to move
   * @param {Object} target - Target position
   * @param {Object} options - Pathfinding options
   * @returns {Object} Path data for the formation
   */
  findFormationPath(formation, target, options) {
    // Find path for formation center
    const path = this.findPath(
      formation.position.x,
      formation.position.y,
      target.x,
      target.y,
      {
        ...options,
        unitSize: 3, // Larger size to ensure formation can fit
        pathingRadius: 1,
      }
    );

    if (path.length === 0) {
      return null;
    }

    // Calculate facing directions for each segment
    const facings = [];

    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;

      let facing;
      if (Math.abs(dx) > Math.abs(dy)) {
        facing = dx > 0 ? "right" : "left";
      } else {
        facing = dy > 0 ? "down" : "up";
      }

      facings.push(facing);
    }

    // Add final facing
    facings.push(facings[facings.length - 1] || "down");

    return {
      path,
      facings,
    };
  }

  /**
   * Get pathfinding statistics
   * @returns {Object} Pathfinding stats
   */
  getStats() {
    return {
      totalPathsCalculated: this.totalPathsCalculated,
      averagePathTime:
        this.totalPathsCalculated > 0
          ? this.totalPathfindingTime / this.totalPathsCalculated
          : 0,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate:
        this.cacheHits + this.cacheMisses > 0
          ? this.cacheHits / (this.cacheHits + this.cacheMisses)
          : 0,
      activeCacheEntries: Object.keys(this.pathCache).length,
    };
  }
}

/**
 * Priority queue implementation for A* pathfinding
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
    this.elementMap = new Map(); // Map to track element indices
  }

  /**
   * Add an element to the queue
   * @param {Object} element - Element to add
   * @param {number} priority - Priority value (lower = higher priority)
   */
  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elementMap.set(element, this.elements.length - 1);
    this.bubbleUp(this.elements.length - 1);
  }

  /**
   * Remove and return the highest priority element
   * @returns {Object} Highest priority element
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const result = this.elements[0].element;
    const end = this.elements.pop();
    this.elementMap.delete(result);

    if (this.elements.length > 0) {
      this.elements[0] = end;
      this.elementMap.set(end.element, 0);
      this.sinkDown(0);
    }

    return result;
  }

  /**
   * Check if an element is in the queue
   * @param {Object} element - Element to check
   * @returns {boolean} True if element is in queue
   */
  contains(element) {
    return this.elementMap.has(element);
  }

  /**
   * Update the priority of an element
   * @param {Object} element - Element to update
   * @param {number} priority - New priority value
   */
  updatePriority(element, priority) {
    const index = this.elementMap.get(element);

    if (index !== undefined) {
      const oldPriority = this.elements[index].priority;
      this.elements[index].priority = priority;

      if (priority < oldPriority) {
        this.bubbleUp(index);
      } else {
        this.sinkDown(index);
      }
    }
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.elements.length === 0;
  }

  /**
   * Move an element up the heap
   * @param {number} index - Element index
   */
  bubbleUp(index) {
    const element = this.elements[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.elements[parentIndex];

      if (element.priority >= parent.priority) {
        break;
      }

      // Swap with parent
      this.elements[parentIndex] = element;
      this.elements[index] = parent;

      // Update map
      this.elementMap.set(element.element, parentIndex);
      this.elementMap.set(parent.element, index);

      index = parentIndex;
    }
  }

  /**
   * Move an element down the heap
   * @param {number} index - Element index
   */
  sinkDown(index) {
    const length = this.elements.length;
    const element = this.elements[index];

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex = null;

      // Check left child
      if (leftChildIndex < length) {
        const leftChild = this.elements[leftChildIndex];

        if (leftChild.priority < element.priority) {
          swapIndex = leftChildIndex;
        }
      }

      // Check right child
      if (rightChildIndex < length) {
        const rightChild = this.elements[rightChildIndex];

        if (
          (swapIndex === null && rightChild.priority < element.priority) ||
          (swapIndex !== null &&
            rightChild.priority < this.elements[swapIndex].priority)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      // No need to swap
      if (swapIndex === null) {
        break;
      }

      // Perform swap
      const swap = this.elements[swapIndex];
      this.elements[swapIndex] = element;
      this.elements[index] = swap;

      // Update map
      this.elementMap.set(element.element, swapIndex);
      this.elementMap.set(swap.element, index);

      index = swapIndex;
    }
  }
}
