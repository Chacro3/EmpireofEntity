/**
 * Empire of Entity - Simplified Map
 * Handles the game world, terrain, resources, and pathfinding
 */

class SimpleMap {
    constructor(width, height, game) {
        this.game = game;
        this.width = width || 2000;
        this.height = height || 2000;
        
        // Tile size for grid-based operations
        this.tileSize = 50;
        this.gridWidth = Math.ceil(this.width / this.tileSize);
        this.gridHeight = Math.ceil(this.height / this.tileSize);
        
        // Map layers
        this.terrainLayer = [];
        this.resourceLayer = [];
        this.visibilityLayer = [];
        
        // Resource definitions
        this.resourceTypes = {
            'food': {
                color: '#7cb342',
                size: 32,
                clusterSize: [3, 8],
                value: 150
            },
            'wood': {
                color: '#8d6e63',
                size: 32,
                clusterSize: [4, 10],
                value: 100
            },
            'gold': {
                color: '#fdd835',
                size: 32,
                clusterSize: [2, 5],
                value: 200
            },
            'stone': {
                color: '#90a4ae',
                size: 32,
                clusterSize: [3, 6],
                value: 150
            }
        };
        
        // Terrain types
        this.terrainTypes = {
            'grass': {
                color: '#4caf50',
                movementCost: 1.0,
                buildable: true
            },
            'water': {
                color: '#2196f3',
                movementCost: 10.0,
                buildable: false
            },
            'forest': {
                color: '#2e7d32',
                movementCost: 1.5,
                buildable: false
            },
            'hill': {
                color: '#8d6e63',
                movementCost: 2.0,
                buildable: true
            },
            'mountain': {
                color: '#757575',
                movementCost: 5.0,
                buildable: false
            }
        };
        
        // Initialize the map
        this.initializeMap();
    }
    
    /**
     * Initialize the map with default terrain
     */
    initializeMap() {
        // Initialize terrain layer with grass by default
        this.terrainLayer = new Array(this.gridHeight);
        for (let y = 0; y < this.gridHeight; y++) {
            this.terrainLayer[y] = new Array(this.gridWidth);
            for (let x = 0; x < this.gridWidth; x++) {
                this.terrainLayer[y][x] = 'grass';
            }
        }
        
        // Initialize resource layer (empty)
        this.resourceLayer = new Array(this.gridHeight);
        for (let y = 0; y < this.gridHeight; y++) {
            this.resourceLayer[y] = new Array(this.gridWidth);
            for (let x = 0; x < this.gridWidth; x++) {
                this.resourceLayer[y][x] = null;
            }
        }
        
        // Initialize visibility layer (all hidden)
        this.visibilityLayer = new Array(this.gridHeight);
        for (let y = 0; y < this.gridHeight; y++) {
            this.visibilityLayer[y] = new Array(this.gridWidth);
            for (let x = 0; x < this.gridWidth; x++) {
                this.visibilityLayer[y][x] = {
                    visible: false,
                    explored: false
                };
            }
        }
    }
    
    /**
     * Generate a random map with terrain features and resources
     */
    generateMap(options = {}) {
        const defaultOptions = {
            seed: Math.floor(Math.random() * 1000000),
            waterPercent: 0.15,
            forestPercent: 0.25,
            hillPercent: 0.15,
            mountainPercent: 0.05,
            resourceDensity: 0.5
        };
        
        const settings = { ...defaultOptions, ...options };
        
        // Reset the map
        this.initializeMap();
        
        // Generate base terrain
        this.generateTerrain(settings);
        
        // Place resources on the map
        this.placeResources(settings);
        
        // Create starting areas for players
        this.createStartingAreas();
        
        console.log("Map generated with seed:", settings.seed);
        return this;
    }
    
    /**
     * Generate terrain features
     */
    generateTerrain(settings) {
        // Simple noise-based terrain generation
        const noise = this.createSimpleNoise(settings.seed);
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const nx = x / this.gridWidth - 0.5;
                const ny = y / this.gridHeight - 0.5;
                
                // Generate noise values for different terrain features
                const n1 = noise(nx * 3, ny * 3); // Large features
                const n2 = noise(nx * 6, ny * 6) * 0.5; // Medium features
                const n3 = noise(nx * 12, ny * 12) * 0.25; // Small features
                
                // Combine noise
                const value = (n1 + n2 + n3) / 1.75;
                
                // Determine terrain type based on noise value
                if (value < -0.2) {
                    this.terrainLayer[y][x] = 'water';
                } else if (value < 0.1) {
                    this.terrainLayer[y][x] = 'grass';
                } else if (value < 0.4) {
                    // Add some randomness to forests
                    if (Math.random() < settings.forestPercent * 2) {
                        this.terrainLayer[y][x] = 'forest';
                    } else {
                        this.terrainLayer[y][x] = 'grass';
                    }
                } else if (value < 0.7) {
                    this.terrainLayer[y][x] = 'hill';
                } else {
                    this.terrainLayer[y][x] = 'mountain';
                }
            }
        }
    }
    
    /**
     * Place resources on the map
     */
    placeResources(settings) {
        const resourceTypes = Object.keys(this.resourceTypes);
        
        // Define valid terrain for each resource type
        const validTerrain = {
            'food': ['grass'],
            'wood': ['forest', 'grass'],
            'gold': ['hill', 'mountain'],
            'stone': ['hill', 'mountain', 'grass']
        };
        
        // Check if position is valid for resource placement
        const isValidPosition = (x, y, resourceType) => {
            // Check bounds
            if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) {
                return false;
            }
            
            // Check if tile already has a resource
            if (this.resourceLayer[y][x]) {
                return false;
            }
            
            // Check if terrain is valid for this resource
            const terrain = this.terrainLayer[y][x];
            return validTerrain[resourceType].includes(terrain);
        };
        
        // Place resources in clusters
        const placeResourceCluster = (resourceType, attempts) => {
            const resourceDef = this.resourceTypes[resourceType];
            const clusterSizeMin = resourceDef.clusterSize[0];
            const clusterSizeMax = resourceDef.clusterSize[1];
            
            for (let i = 0; i < attempts; i++) {
                // Random starting position
                const startX = Math.floor(Math.random() * this.gridWidth);
                const startY = Math.floor(Math.random() * this.gridHeight);
                
                // Skip if not valid
                if (!isValidPosition(startX, startY, resourceType)) {
                    continue;
                }
                
                // Determine cluster size
                const clusterSize = Math.floor(Math.random() * (clusterSizeMax - clusterSizeMin + 1)) + clusterSizeMin;
                
                // Place first resource
                this.resourceLayer[startY][startX] = {
                    type: resourceType,
                    amount: Math.floor(resourceDef.value * (0.8 + Math.random() * 0.4))
                };
                
                // Expand cluster
                let placed = 1;
                const attempts = clusterSize * 3; // Extra attempts to ensure we place enough
                
                for (let j = 0; j < attempts && placed < clusterSize; j++) {
                    // Pick an existing resource in the cluster
                    let x = startX;
                    let y = startY;
                    
                    // Random direction
                    const dx = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                    const dy = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                    
                    // New position
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    // Try to place
                    if (isValidPosition(newX, newY, resourceType)) {
                        this.resourceLayer[newY][newX] = {
                            type: resourceType,
                            amount: Math.floor(resourceDef.value * (0.8 + Math.random() * 0.4))
                        };
                        placed++;
                    }
                }
            }
        };
        
        // Place each resource type
        const baseDensity = Math.floor(this.gridWidth * this.gridHeight * 0.01 * settings.resourceDensity);
        
        for (const resourceType of resourceTypes) {
            let attempts = baseDensity;
            
            // Adjust by resource type
            if (resourceType === 'food' || resourceType === 'wood') {
                attempts *= 1.5; // More common
            } else if (resourceType === 'gold') {
                attempts *= 0.7; // Less common
            }
            
            placeResourceCluster(resourceType, Math.floor(attempts));
        }
    }
    
    /**
     * Create starting areas for players
     */
    createStartingAreas() {
        // For 2 players, create starting areas at opposite corners
        this.createStartingArea(Math.floor(this.gridWidth * 0.15), Math.floor(this.gridHeight * 0.15), 5);
        this.createStartingArea(Math.floor(this.gridWidth * 0.85), Math.floor(this.gridHeight * 0.85), 5);
    }
    
    /**
     * Create a starting area at the specified position
     */
    createStartingArea(centerX, centerY, radius) {
        // Clear terrain and make it all grass
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && y >= 0 && x < this.gridWidth && y < this.gridHeight) {
                    // Make terrain buildable
                    this.terrainLayer[y][x] = 'grass';
                    
                    // Remove any resources in the immediate area
                    if (Math.abs(x - centerX) <= 2 && Math.abs(y - centerY) <= 2) {
                        this.resourceLayer[y][x] = null;
                    }
                }
            }
        }
        
        // Add starting resources nearby
        const resourceTypes = ['food', 'wood', 'stone'];
        
        for (const resourceType of resourceTypes) {
            for (let i = 0; i < 2; i++) { // 2 clusters per resource type
                const angle = Math.random() * Math.PI * 2;
                const distance = radius + 1 + Math.floor(Math.random() * 3);
                
                const x = Math.floor(centerX + Math.cos(angle) * distance);
                const y = Math.floor(centerY + Math.sin(angle) * distance);
                
                if (x >= 0 && y >= 0 && x < this.gridWidth && y < this.gridHeight) {
                    // Place resource
                    this.resourceLayer[y][x] = {
                        type: resourceType,
                        amount: this.resourceTypes[resourceType].value
                    };
                    
                    // Add a few more in adjacent tiles
                    const clusterSize = Math.floor(Math.random() * 3) + 2;
                    let placed = 1;
                    
                    for (let j = 0; j < clusterSize * 3 && placed < clusterSize; j++) {
                        const dx = Math.floor(Math.random() * 3) - 1;
                        const dy = Math.floor(Math.random() * 3) - 1;
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && ny >= 0 && nx < this.gridWidth && ny < this.gridHeight && 
                            !this.resourceLayer[ny][nx]) {
                            this.resourceLayer[ny][nx] = {
                                type: resourceType,
                                amount: Math.floor(this.resourceTypes[resourceType].value * 0.8)
                            };
                            placed++;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Get the terrain type at the specified position
     */
    getTerrainAt(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
            return 'grass'; // Default to grass for out of bounds
        }
        
        return this.terrainLayer[gridY][gridX];
    }
    
    /**
     * Get the resource at the specified position
     */
    getResourceAt(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
            return null;
        }
        
        return this.resourceLayer[gridY][gridX];
    }
    
    /**
     * Check if terrain is buildable at the specified position
     */
    isTerrainBuildable(x, y, width, height) {
        const startGridX = Math.floor(x / this.tileSize);
        const startGridY = Math.floor(y / this.tileSize);
        const endGridX = Math.floor((x + width) / this.tileSize);
        const endGridY = Math.floor((y + height) / this.tileSize);
        
        // Check each grid cell
        for (let gridY = startGridY; gridY <= endGridY; gridY++) {
            for (let gridX = startGridX; gridX <= endGridX; gridX++) {
                // Check bounds
                if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
                    return false;
                }
                
                // Check terrain
                const terrain = this.terrainLayer[gridY][gridX];
                if (!this.terrainTypes[terrain].buildable) {
                    return false;
                }
                
                // Check if there's a resource here
                if (this.resourceLayer[gridY][gridX]) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Gather resource at the specified position
     */
    gatherResource(x, y, amount) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
            return 0;
        }
        
        const resource = this.resourceLayer[gridY][gridX];
        if (!resource) {
            return 0;
        }
        
        // Calculate amount to gather
        const gathered = Math.min(amount, resource.amount);
        resource.amount -= gathered;
        
        // Remove resource if depleted
        if (resource.amount <= 0) {
            this.resourceLayer[gridY][gridX] = null;
        }
        
        return gathered;
    }
    
    /**
     * Find a path from start to end position
     * Simple A* pathfinding implementation
     */
    findPath(startX, startY, endX, endY) {
        // Convert to grid coordinates
        const startGridX = Math.floor(startX / this.tileSize);
        const startGridY = Math.floor(startY / this.tileSize);
        const endGridX = Math.floor(endX / this.tileSize);
        const endGridY = Math.floor(endY / this.tileSize);
        
        // Check bounds
        if (startGridX < 0 || startGridY < 0 || startGridX >= this.gridWidth || startGridY >= this.gridHeight ||
            endGridX < 0 || endGridY < 0 || endGridX >= this.gridWidth || endGridY >= this.gridHeight) {
            return [];
        }
        
        // A* implementation
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = {};
        const gScore = {};
        const fScore = {};
        
        // Initialize scores
        gScore[`${startGridX},${startGridY}`] = 0;
        fScore[`${startGridX},${startGridY}`] = this.heuristic(startGridX, startGridY, endGridX, endGridY);
        
        // Add start node to open set
        openSet.push({ x: startGridX, y: startGridY, f: fScore[`${startGridX},${startGridY}`] });
        
        while (openSet.length > 0) {
            // Sort open set by fScore
            openSet.sort((a, b) => a.f - b.f);
            
            // Get node with lowest fScore
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            // Check if we've reached the goal
            if (current.x === endGridX && current.y === endGridY) {
                return this.reconstructPath(cameFrom, endGridX, endGridY);
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
                const tentativeGScore = gScore[currentKey] + neighbor.cost;
                
                // Check if new path is better or if neighbor is not in open set
                if (!gScore[neighborKey] || tentativeGScore < gScore[neighborKey]) {
                    // Update scores
                    cameFrom[neighborKey] = { x: current.x, y: current.y };
                    gScore[neighborKey] = tentativeGScore;
                    fScore[neighborKey] = gScore[neighborKey] + this.heuristic(neighbor.x, neighbor.y, endGridX, endGridY);
                    
                    // Add to open set if not already there
                    const existingIndex = openSet.findIndex(node => node.x === neighbor.x && node.y === neighbor.y);
                    
                    if (existingIndex === -1) {
                        openSet.push({ x: neighbor.x, y: neighbor.y, f: fScore[neighborKey] });
                    } else {
                        openSet[existingIndex].f = fScore[neighborKey];
                    }
                }
            }
        }
        
        // No path found
        return [];
    }
    
    /**
     * Get neighboring tiles for pathfinding
     */
    getNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: -1 }, // Northeast
            { dx: 1, dy: 0 },  // East
            { dx: 1, dy: 1 },  // Southeast
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 1 }, // Southwest
            { dx: -1, dy: 0 }, // West
            { dx: -1, dy: -1 } // Northwest
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            // Check bounds
            if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) {
                continue;
            }
            
            // Get terrain and movement cost
            const terrain = this.terrainLayer[ny][nx];
            const cost = this.terrainTypes[terrain].movementCost;
            
            // Skip impassable terrain
            if (cost >= 10) {
                continue;
            }
            
            // Diagonal movement costs more
            const isDiagonal = dir.dx !== 0 && dir.dy !== 0;
            const movementCost = isDiagonal ? cost * 1.414 : cost;
            
            neighbors.push({ x: nx, y: ny, cost: movementCost });
        }
        
        return neighbors;
    }
    
    /**
     * Heuristic function for A* (Manhattan distance)
     */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    /**
     * Reconstruct path from A* result
     */
    reconstructPath(cameFrom, endX, endY) {
        const path = [];
        let current = { x: endX, y: endY };
        
        while (current) {
            // Convert grid coordinates to world coordinates (center of tile)
            path.unshift({
                x: current.x * this.tileSize + this.tileSize / 2,
                y: current.y * this.tileSize + this.tileSize / 2
            });
            
            const currentKey = `${current.x},${current.y}`;
            current = cameFrom[currentKey];
        }
        
        return path;
    }
    
    /**
     * Update visibility based on player's units
     */
    updateVisibility(playerUnits, viewRange = 5) {
        // Reset visibility for all tiles
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.visibilityLayer[y][x].visible = false;
            }
        }
        
        // Update visibility for each unit
        for (const unit of playerUnits) {
            const unitX = Math.floor(unit.position.x / this.tileSize);
            const unitY = Math.floor(unit.position.y / this.tileSize);
            
            this.updateVisibilityForPosition(unitX, unitY, viewRange);
        }
    }
    
    /**
     * Update visibility around a position
     */
    updateVisibilityForPosition(centerX, centerY, viewRange) {
        for (let y = centerY - viewRange; y <= centerY + viewRange; y++) {
            for (let x = centerX - viewRange; x <= centerX + viewRange; x++) {
                // Check bounds
                if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) {
                    continue;
                }
                
                // Simple circular visibility
                const distance = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
                
                if (distance <= viewRange) {
                    // Set visible
                    this.visibilityLayer[y][x].visible = true;
                    this.visibilityLayer[y][x].explored = true;
                }
            }
        }
    }
    
    /**
     * Check if a position is visible
     */
    isVisible(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
            return false;
        }
        
        return this.visibilityLayer[gridY][gridX].visible;
    }
    
    /**
     * Check if a position has been explored
     */
    isExplored(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        if (gridX < 0 || gridY < 0 || gridX >= this.gridWidth || gridY >= this.gridHeight) {
            return false;
        }
        
        return this.visibilityLayer[gridY][gridX].explored;
    }
    
    /**
     * Render the map
     */
    render(ctx, viewport) {
        // Calculate visible range
        const startX = Math.floor(viewport.x / this.tileSize);
        const startY = Math.floor(viewport.y / this.tileSize);
        const endX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
        const endY = Math.ceil((viewport.y + viewport.height) / this.tileSize);
        
        // Render visible portion of the map
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                // Check bounds
                if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) {
                    continue;
                }
                
                // Get screen position
                const screenX = x * this.tileSize - viewport.x;
                const screenY = y * this.tileSize - viewport.y;
                
                // Check visibility
                const isVisible = this.visibilityLayer[y][x].visible;
                const isExplored = this.visibilityLayer[y][x].explored;
                
                if (!isExplored) {
                    // Unexplored tiles are black
                    ctx.fillStyle = '#000';
                    ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                    continue;
                }
                
                // Get terrain color
                const terrain = this.terrainLayer[y][x];
                const terrainColor = this.terrainTypes[terrain].color;
                
                // Draw terrain
                ctx.fillStyle = terrainColor;
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                
                // Draw resource if present
                const resource = this.resourceLayer[y][x];
                if (resource) {
                    const resourceColor = this.resourceTypes[resource.type].color;
                    const resourceSize = this.resourceTypes[resource.type].size;
                    
                    // Center resource in tile
                    const resourceX = screenX + (this.tileSize - resourceSize) / 2;
                    const resourceY = screenY + (this.tileSize - resourceSize) / 2;
                    
                    ctx.fillStyle = resourceColor;
                    
                    // Different shapes for different resources
                    if (resource.type === 'food') {
                        // Food is a circle
                        ctx.beginPath();
                        ctx.arc(
                            resourceX + resourceSize / 2,
                            resourceY + resourceSize / 2,
                            resourceSize / 2,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    } else if (resource.type === 'wood') {
                        // Wood is a triangle
                        ctx.beginPath();
                        ctx.moveTo(resourceX + resourceSize / 2, resourceY);
                        ctx.lineTo(resourceX + resourceSize, resourceY + resourceSize);
                        ctx.lineTo(resourceX, resourceY + resourceSize);
                        ctx.closePath();
                        ctx.fill();
                    } else if (resource.type === 'gold') {
                        // Gold is a diamond
                        ctx.beginPath();
                        ctx.moveTo(resourceX + resourceSize / 2, resourceY);
                        ctx.lineTo(resourceX + resourceSize, resourceY + resourceSize / 2);
                        ctx.lineTo(resourceX + resourceSize / 2, resourceY + resourceSize);
                        ctx.lineTo(resourceX, resourceY + resourceSize / 2);
                        ctx.closePath();
                        ctx.fill();
                    } else if (resource.type === 'stone') {
                        // Stone is a square
                        ctx.fillRect(resourceX, resourceY, resourceSize, resourceSize);
                    }
                }
                
                // Apply fog of war for explored but not visible tiles
                if (isExplored && !isVisible) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                }
            }
        }
    }
    
    /**
     * Update the map
     */
    update(deltaTime) {
        // Currently no dynamic updates needed
    }
    
    /**
     * Simple noise function
     */
    createSimpleNoise(seed) {
        // Simple random number generator
        const random = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        // Generate permutation table
        const perm = new Array(512);
        for (let i = 0; i < 256; i++) {
            perm[i] = perm[i + 256] = Math.floor(random(seed + i) * 256);
        }
        
        // Noise function
        return (x, y) => {
            // Find unit grid cell containing point
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            
            // Get relative xy coordinates of point within cell
            x -= Math.floor(x);
            y -= Math.floor(y);
            
            // Compute fade curves
            const u = this.fade(x);
            const v = this.fade(y);
            
            // Hash coordinates of the 4 corners
            const A = perm[X] + Y;
            const B = perm[X + 1] + Y;
            const AA = perm[A];
            const AB = perm[A + 1];
            const BA = perm[B];
            const BB = perm[B + 1];
            
            // Add blended results from 4 corners
            return this.lerp(v, this.lerp(u, this.grad(perm[AA], x, y), 
                                           this.grad(perm[BA], x - 1, y)),
                               this.lerp(u, this.grad(perm[AB], x, y - 1),
                                         this.grad(perm[BB], x - 1, y - 1)));
        };
    }
    
    /**
     * Helper function for noise generation
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    /**
     * Helper function for noise generation
     */
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    
    /**
     * Helper function for noise generation
     */
    grad(hash, x, y) {
        const h = hash & 15;
        const grad_x = 1 + (h & 7); // Gradient value is one of 1, 2, ..., 8
        const grad_y = grad_x & 1 ? grad_x : -grad_x; // Randomly pick 1 or -1
        return ((h & 1) ? x : -x) * grad_x + ((h & 2) ? y : -y) * grad_y;
    }
}

// Export the SimpleMap class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimpleMap };
} else {
    window.SimpleMap = SimpleMap;
} 