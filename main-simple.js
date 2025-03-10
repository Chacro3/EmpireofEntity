/**
 * Empire of Entity - Simplified Main Entry Point
 * Initializes and starts the game
 */

// Set up game initialization when the window loads
window.addEventListener('load', function() {
    console.log("Empire of Entity - Game initialization starting");
    setupGame();
});

/**
 * Set up and initialize the game
 */
function setupGame() {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("Cannot find game canvas element");
        return;
    }
    
    // Create a game engine instance
    const gameEngine = new GameEngine();
    
    // Store the engine globally for debugging
    window.gameEngine = gameEngine;
    
    // Initialize the game engine
    gameEngine.init().then(() => {
        // Start the game loop
        gameEngine.start();
        
        console.log("Game engine initialized and started");
    }).catch(error => {
        console.error("Error initializing game engine:", error);
    });
}

/**
 * Initialize the game with the selected civilization
 * This function is called from game.html
 */
window.initGame = function(selectedCiv = "solari") {
    console.log("Initializing game with civilization:", selectedCiv);
    
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("Cannot find game canvas element");
        return null;
    }
    
    // Set canvas dimensions based on CONFIG or defaults
    canvas.width = window.CONFIG?.CANVAS?.WIDTH || 1280;
    canvas.height = window.CONFIG?.CANVAS?.HEIGHT || 720;
    
    // Create game engine
    const gameEngine = new GameEngine({
        canvas: canvas,
        civilization: selectedCiv
    });
    
    // Test draw to ensure canvas is working
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a4d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Empire of Entity', canvas.width/2, canvas.height/2 - 40);
    ctx.font = '20px Arial';
    ctx.fillText('Initializing game engine...', canvas.width/2, canvas.height/2 + 40);
    
    // Initialize game engine and start
    try {
        // Create and initialize systems using simplified versions
        
        // Create map system
        const mapSystem = new SimpleMap(2000, 2000, gameEngine);
        mapSystem.generateMap();
        gameEngine.map = mapSystem;
        
        // Create resource system
        const resourceSystem = new ResourceSystemSimple(gameEngine);
        gameEngine.resourceSystem = resourceSystem;
        
        // Create UI system
        const uiSystem = new UIManagerSimple(gameEngine);
        uiSystem.init();
        gameEngine.ui = uiSystem;
        
        // Start with some entities
        createInitialEntities(gameEngine, selectedCiv);
        
        // Start the game loop
        gameEngine.start();
        
        console.log("Game engine initialized with civilization:", selectedCiv);
        
        // Return the game engine
        return gameEngine;
    } catch (error) {
        console.error("Error initializing game:", error);
        
        // Display error on canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '24px Arial';
        ctx.fillText('Error initializing game engine', canvas.width/2, canvas.height/2 - 50);
        ctx.font = '16px Arial';
        ctx.fillText(error.message, canvas.width/2, canvas.height/2);
        ctx.fillText('Check browser console for details', canvas.width/2, canvas.height/2 + 50);
        
        return null;
    }
}

/**
 * Create initial entities for the player
 */
function createInitialEntities(gameEngine, civilization) {
    // Only create entities if the game has an entities array
    if (!gameEngine.entities) {
        gameEngine.entities = [];
    }
    
    // Parameters based on civilization
    const civilizationParams = {
        solari: {
            color: '#3498db', // Blue
            startX: 400,
            startY: 400
        },
        lunari: {
            color: '#e74c3c', // Red
            startX: 1600,
            startY: 1600
        }
    };
    
    // Use default parameters if civilization is not recognized
    const params = civilizationParams[civilization] || civilizationParams.solari;
    
    // Create a town center for the player
    const townCenter = new Building({
        name: 'Town Center',
        type: 'building',
        buildingType: 'townCenter',
        position: { x: params.startX, y: params.startY },
        size: 96,
        color: params.color,
        owner: 1, // Player 1
        team: 1,
        isBuilt: true,
        providesPopulation: 10,
        canTrain: true,
        trainableUnits: ['villager']
    });
    
    // Create some villagers
    const villagers = [];
    for (let i = 0; i < 3; i++) {
        const villager = new Unit({
            name: 'Villager',
            type: 'unit',
            unitType: 'villager',
            position: { 
                x: params.startX + 50 + Math.random() * 100, 
                y: params.startY + 50 + Math.random() * 100 
            },
            size: 32,
            color: params.color,
            owner: 1, // Player 1
            team: 1,
            canMove: true,
            speed: 100,
            canGather: true,
            canBuild: true,
            maxResourceCapacity: 20
        });
        villagers.push(villager);
    }
    
    // Create some resources near the starting position
    const resources = [
        {
            name: 'Berry Bush',
            type: 'resource',
            resourceType: 'food',
            position: { x: params.startX - 200, y: params.startY - 200 },
            size: 40,
            color: '#7cb342',
            amount: 150
        },
        {
            name: 'Tree',
            type: 'resource',
            resourceType: 'wood',
            position: { x: params.startX + 200, y: params.startY - 150 },
            size: 40,
            color: '#8d6e63',
            amount: 100
        },
        {
            name: 'Gold',
            type: 'resource',
            resourceType: 'gold',
            position: { x: params.startX - 250, y: params.startY + 200 },
            size: 40,
            color: '#fdd835',
            amount: 200
        },
        {
            name: 'Stone',
            type: 'resource',
            resourceType: 'stone',
            position: { x: params.startX + 250, y: params.startY + 150 },
            size: 40,
            color: '#90a4ae',
            amount: 150
        }
    ];
    
    // Create entities for AI player (player 2)
    const aiParams = civilization === 'solari' ? civilizationParams.lunari : civilizationParams.solari;
    
    const aiTownCenter = new Building({
        name: 'Town Center',
        type: 'building',
        buildingType: 'townCenter',
        position: { x: aiParams.startX, y: aiParams.startY },
        size: 96,
        color: aiParams.color,
        owner: 2, // Player 2 (AI)
        team: 2,
        isBuilt: true,
        providesPopulation: 10,
        canTrain: true,
        trainableUnits: ['villager']
    });
    
    // Create some AI villagers
    const aiVillagers = [];
    for (let i = 0; i < 3; i++) {
        const aiVillager = new Unit({
            name: 'Villager',
            type: 'unit',
            unitType: 'villager',
            position: { 
                x: aiParams.startX + 50 + Math.random() * 100, 
                y: aiParams.startY + 50 + Math.random() * 100 
            },
            size: 32,
            color: aiParams.color,
            owner: 2, // Player 2 (AI)
            team: 2,
            canMove: true,
            speed: 100,
            canGather: true,
            canBuild: true,
            maxResourceCapacity: 20
        });
        aiVillagers.push(aiVillager);
    }
    
    // Add all entities to the game
    gameEngine.entities.push(townCenter);
    gameEngine.entities.push(aiTownCenter);
    
    villagers.forEach(villager => gameEngine.entities.push(villager));
    aiVillagers.forEach(villager => gameEngine.entities.push(villager));
    
    resources.forEach(resource => {
        // Create the Entity object from the resource data
        const resourceEntity = new Entity(resource);
        gameEngine.entities.push(resourceEntity);
        
        // Clone resource for AI player
        const aiResourceEntity = new Entity({
            ...resource,
            position: { 
                x: aiParams.startX + (resource.position.x - params.startX), 
                y: aiParams.startY + (resource.position.y - params.startY)
            }
        });
        gameEngine.entities.push(aiResourceEntity);
    });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGame: window.initGame,
        setupGame
    };
} 