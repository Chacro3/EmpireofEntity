/**
 * Empire of Entity - Simple Resource System
 * Manages player resources and resource-related mechanics
 */

class ResourceSystemSimple {
    constructor(game) {
        this.game = game;
        
        // Resource types
        this.resourceTypes = [
            'food',
            'wood',
            'gold',
            'stone',
            'population'
        ];
        
        // Resources for each player
        this.playerResources = {};
        
        // Resource generation rates
        this.resourceRates = {};
        
        // Resource gathering modifiers
        this.gatheringModifiers = {};
        
        // Population modifiers
        this.populationModifiers = {};
        
        // Storage limits
        this.storageLimits = {};
        
        // Initialize default values
        this.initializeResources();
    }
    
    /**
     * Initialize resource system with default values
     */
    initializeResources() {
        // Get players from game
        const players = this.game?.players || [];
        
        for (const player of players) {
            const playerId = player.id;
            
            // Base resources
            this.playerResources[playerId] = {
                food: 200,
                wood: 200,
                gold: 100,
                stone: 100,
                population: 0,
                populationCap: 10
            };
            
            // Resource generation rates (per second)
            this.resourceRates[playerId] = {
                food: 0,
                wood: 0,
                gold: 0,
                stone: 0
            };
            
            // Gathering modifiers (multipliers)
            this.gatheringModifiers[playerId] = {
                food: 1.0,
                wood: 1.0,
                gold: 1.0,
                stone: 1.0
            };
            
            // Storage limits
            this.storageLimits[playerId] = {
                food: 1000,
                wood: 1000,
                gold: 1000,
                stone: 1000
            };
        }
    }
    
    /**
     * Get all resources for a player
     */
    getResources(playerId) {
        if (!this.playerResources[playerId]) {
            console.error(`Resources for player ${playerId} not found`);
            return null;
        }
        
        return this.playerResources[playerId];
    }
    
    /**
     * Get a specific resource for a player
     */
    getResource(playerId, resourceType) {
        if (!this.playerResources[playerId]) {
            console.error(`Resources for player ${playerId} not found`);
            return 0;
        }
        
        return this.playerResources[playerId][resourceType] || 0;
    }
    
    /**
     * Modify a resource value for a player
     * @param {number} playerId - ID of the player
     * @param {string} resourceType - Type of resource
     * @param {number} amount - Amount to add (positive) or subtract (negative)
     * @returns {boolean} - True if the operation was successful
     */
    modifyResource(playerId, resourceType, amount) {
        if (!this.playerResources[playerId]) {
            console.error(`Resources for player ${playerId} not found`);
            return false;
        }
        
        // Check if resource exists
        if (this.playerResources[playerId][resourceType] === undefined) {
            console.error(`Resource type ${resourceType} not found`);
            return false;
        }
        
        // Check if we have enough for negative amounts
        if (amount < 0 && this.playerResources[playerId][resourceType] + amount < 0) {
            return false;
        }
        
        // Update resource
        this.playerResources[playerId][resourceType] += amount;
        
        // Cap to storage limit
        if (this.storageLimits[playerId][resourceType]) {
            this.playerResources[playerId][resourceType] = Math.min(
                this.playerResources[playerId][resourceType],
                this.storageLimits[playerId][resourceType]
            );
        }
        
        return true;
    }
    
    /**
     * Add multiple resources at once
     */
    addResources(playerId, resources) {
        if (!resources) return false;
        
        let allSuccessful = true;
        
        for (const resourceType in resources) {
            const amount = resources[resourceType];
            if (!this.modifyResource(playerId, resourceType, amount)) {
                allSuccessful = false;
            }
        }
        
        return allSuccessful;
    }
    
    /**
     * Check if a player can afford a cost
     */
    canAfford(playerId, cost) {
        if (!cost) return true;
        if (!this.playerResources[playerId]) return false;
        
        for (const resourceType in cost) {
            const amount = cost[resourceType];
            if (this.playerResources[playerId][resourceType] < amount) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Deduct resources from a player if they can afford it
     */
    deductResources(playerId, cost) {
        if (!this.canAfford(playerId, cost)) {
            return false;
        }
        
        for (const resourceType in cost) {
            const amount = cost[resourceType];
            this.modifyResource(playerId, resourceType, -amount);
        }
        
        return true;
    }
    
    /**
     * Set a resource gathering modifier
     */
    setGatheringModifier(playerId, resourceType, modifier) {
        if (!this.gatheringModifiers[playerId]) {
            this.gatheringModifiers[playerId] = {};
        }
        
        this.gatheringModifiers[playerId][resourceType] = modifier;
    }
    
    /**
     * Get a resource gathering modifier
     */
    getGatheringModifier(playerId, resourceType) {
        if (!this.gatheringModifiers[playerId]) {
            return 1.0;
        }
        
        return this.gatheringModifiers[playerId][resourceType] || 1.0;
    }
    
    /**
     * Gather a resource, applying any modifiers
     */
    gatherResource(playerId, resourceType, baseAmount) {
        const modifier = this.getGatheringModifier(playerId, resourceType);
        const amount = baseAmount * modifier;
        
        return this.modifyResource(playerId, resourceType, amount) ? amount : 0;
    }
    
    /**
     * Update resource generation
     */
    updateResourceGeneration(deltaTime) {
        for (const playerId in this.resourceRates) {
            for (const resourceType in this.resourceRates[playerId]) {
                const rate = this.resourceRates[playerId][resourceType];
                if (rate > 0) {
                    const amount = rate * deltaTime;
                    this.modifyResource(playerId, resourceType, amount);
                }
            }
        }
    }
    
    /**
     * Set resource generation rate
     */
    setResourceRate(playerId, resourceType, rate) {
        if (!this.resourceRates[playerId]) {
            this.resourceRates[playerId] = {};
        }
        
        this.resourceRates[playerId][resourceType] = rate;
    }
    
    /**
     * Update population based on units and buildings
     */
    updatePopulation(player) {
        if (!player || !this.playerResources[player.id]) {
            return;
        }
        
        // Start with 0 current population
        let currentPopulation = 0;
        let populationCap = 5; // Base population cap
        
        // Get all units and buildings for this player
        const entities = this.game.entities || [];
        
        for (const entity of entities) {
            if (entity.owner !== player.id) {
                continue;
            }
            
            // Units contribute to current population
            if (entity.type === 'unit') {
                currentPopulation++;
            }
            
            // Buildings might increase population cap
            if (entity.type === 'building' && entity.isBuilt) {
                if (entity.providesPopulation) {
                    populationCap += entity.providesPopulation;
                }
            }
        }
        
        // Update population values
        this.playerResources[player.id].population = currentPopulation;
        this.playerResources[player.id].populationCap = populationCap;
    }
    
    /**
     * Increase storage capacity
     */
    increaseStorageCapacity(playerId, resourceType, amount) {
        if (!this.storageLimits[playerId]) {
            this.storageLimits[playerId] = {};
        }
        
        if (!this.storageLimits[playerId][resourceType]) {
            this.storageLimits[playerId][resourceType] = 1000; // Default limit
        }
        
        this.storageLimits[playerId][resourceType] += amount;
    }
    
    /**
     * Apply a civilization bonus
     */
    applyCivilizationBonus(playerId, bonusType, resourceType, value) {
        switch (bonusType) {
            case 'gatheringRate':
                this.setGatheringModifier(playerId, resourceType, value);
                break;
                
            case 'startingResources':
                this.modifyResource(playerId, resourceType, value);
                break;
                
            case 'storageCapacity':
                this.increaseStorageCapacity(playerId, resourceType, value);
                break;
                
            default:
                console.error(`Unknown bonus type: ${bonusType}`);
        }
    }
    
    /**
     * Update for each game tick
     */
    update(deltaTime) {
        // Update resource generation rates
        this.updateResourceGeneration(deltaTime);
        
        // Update population for each player
        if (this.game.players) {
            for (const player of this.game.players) {
                this.updatePopulation(player);
            }
        }
    }
}

// Export the ResourceSystem class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResourceSystemSimple };
} else {
    window.ResourceSystemSimple = ResourceSystemSimple;
} 