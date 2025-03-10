/**
 * Empire of Entity - Simplified UI Manager
 * Handles the game's user interface elements and interactions
 */

class UIManagerSimple {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // UI state
        this.selectedEntities = [];
        this.hoverEntity = null;
        this.activeAction = null;
        this.buildingPlacement = null;
        this.menuOpen = false;
        
        // UI components and layout
        this.components = {
            topBar: {
                height: 40,
                padding: 10
            },
            minimap: {
                size: 200,
                padding: 5
            },
            selectionPanel: {
                height: 100,
                padding: 10
            },
            tooltip: {
                visible: false,
                text: '',
                x: 0,
                y: 0
            }
        };
        
        // Colors and styles
        this.colors = {
            panelBackground: 'rgba(0, 0, 0, 0.7)',
            buttonBackground: '#555',
            buttonHighlight: '#777',
            textPrimary: '#fff',
            textSecondary: '#ccc',
            healthGood: '#4caf50',
            healthMedium: '#ff9800',
            healthBad: '#f44336',
            resource: {
                food: '#7cb342',
                wood: '#8d6e63',
                gold: '#fdd835',
                stone: '#90a4ae',
                population: '#2196f3'
            }
        };
        
        // Buttons
        this.buttons = [];
        
        // Alert messages
        this.alerts = [];
        this.nextAlertId = 1;
        
        // Message log
        this.messageLog = [];
        this.maxLogEntries = 5;
        
        // Initialize event handlers
        this.initEventHandlers();
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
        console.log("UI Manager initialized");
        return this;
    }
    
    /**
     * Initialize event handlers for UI interactions
     */
    initEventHandlers() {
        // This will be called by the input system
    }
    
    /**
     * Handle UI clicks
     */
    handleClick(x, y, button) {
        // Check if click is on the minimap
        if (this.isMinimapClick(x, y)) {
            return this.handleMinimapClick(x, y);
        }
        
        // Check if click is on a button
        const button = this.getButtonAt(x, y);
        if (button) {
            return this.handleButtonClick(button);
        }
        
        // Check if click is on resource bar or other UI elements
        if (y < this.components.topBar.height) {
            return true; // Clicked on top bar, don't do game actions
        }
        
        // Check if click is on bottom panel when units selected
        if (this.selectedEntities.length > 0) {
            const panelY = this.canvas.height - this.components.selectionPanel.height;
            if (y > panelY) {
                return true; // Clicked on selection panel, don't do game actions
            }
        }
        
        return false; // Not a UI click, let game handle it
    }
    
    /**
     * Check if a click is on the minimap
     */
    isMinimapClick(x, y) {
        const minimapX = this.canvas.width - this.components.minimap.size - this.components.minimap.padding;
        const minimapY = this.canvas.height - this.components.minimap.size - this.components.minimap.padding;
        
        return (
            x >= minimapX &&
            x <= minimapX + this.components.minimap.size &&
            y >= minimapY &&
            y <= minimapY + this.components.minimap.size
        );
    }
    
    /**
     * Handle clicks on the minimap
     */
    handleMinimapClick(x, y) {
        const minimapX = this.canvas.width - this.components.minimap.size - this.components.minimap.padding;
        const minimapY = this.canvas.height - this.components.minimap.size - this.components.minimap.padding;
        
        // Calculate relative position within minimap
        const relX = (x - minimapX) / this.components.minimap.size;
        const relY = (y - minimapY) / this.components.minimap.size;
        
        // Convert to world coordinates
        const worldX = relX * this.game.mapSize.width;
        const worldY = relY * this.game.mapSize.height;
        
        // Center view on this position
        this.game.viewPort.x = worldX - (this.game.viewPort.width / 2);
        this.game.viewPort.y = worldY - (this.game.viewPort.height / 2);
        
        // Make sure viewport stays within map bounds
        this.constrainViewport();
        
        return true; // Click handled
    }
    
    /**
     * Constrain viewport to map boundaries
     */
    constrainViewport() {
        this.game.viewPort.x = Math.max(0, Math.min(this.game.viewPort.x, 
            this.game.mapSize.width - this.game.viewPort.width));
        this.game.viewPort.y = Math.max(0, Math.min(this.game.viewPort.y, 
            this.game.mapSize.height - this.game.viewPort.height));
    }
    
    /**
     * Find a button at given coordinates
     */
    getButtonAt(x, y) {
        return this.buttons.find(button => 
            x >= button.x && 
            x <= button.x + button.width &&
            y >= button.y && 
            y <= button.y + button.height
        );
    }
    
    /**
     * Handle button clicks
     */
    handleButtonClick(button) {
        if (!button || !button.action) return false;
        
        // Execute button action
        button.action();
        
        // Play click sound if available
        if (this.game.audioSystem) {
            this.game.audioSystem.play('ui_click');
        }
        
        return true; // Click handled
    }
    
    /**
     * Update UI state
     */
    update(deltaTime) {
        // Update alerts (fade out old ones)
        this.updateAlerts(deltaTime);
        
        // Update animations if any
        
        // Update tooltip position if visible
        
        // Update building placement preview if active
    }
    
    /**
     * Update alert messages
     */
    updateAlerts(deltaTime) {
        for (let i = this.alerts.length - 1; i >= 0; i--) {
            const alert = this.alerts[i];
            
            // Update display time
            alert.timeLeft -= deltaTime;
            
            // Remove expired alerts
            if (alert.timeLeft <= 0) {
                this.alerts.splice(i, 1);
            }
        }
    }
    
    /**
     * Add a new alert message
     */
    addAlert(message, type = 'info', duration = 5) {
        this.alerts.push({
            id: this.nextAlertId++,
            message,
            type,
            timeLeft: duration,
            opacity: 1.0
        });
        
        // Also add to message log
        this.addLogMessage(message, type);
        
        // Limit the number of visible alerts
        if (this.alerts.length > 5) {
            this.alerts.shift();
        }
    }
    
    /**
     * Add a message to the log
     */
    addLogMessage(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        
        this.messageLog.push({
            message,
            type,
            timestamp
        });
        
        // Limit log size
        if (this.messageLog.length > this.maxLogEntries) {
            this.messageLog.shift();
        }
    }
    
    /**
     * Show a tooltip
     */
    showTooltip(text, x, y) {
        this.components.tooltip.visible = true;
        this.components.tooltip.text = text;
        this.components.tooltip.x = x;
        this.components.tooltip.y = y;
    }
    
    /**
     * Hide the current tooltip
     */
    hideTooltip() {
        this.components.tooltip.visible = false;
    }
    
    /**
     * Update the selected entities
     */
    updateSelection(selectedEntities) {
        this.selectedEntities = selectedEntities || [];
        
        // Update selection-dependent buttons
        this.updateActionButtons();
    }
    
    /**
     * Update action buttons based on selection
     */
    updateActionButtons() {
        this.buttons = [];
        
        if (this.selectedEntities.length === 0) {
            return;
        }
        
        // Group similar entities
        const groups = this.groupEntities(this.selectedEntities);
        
        // Determine available actions based on entity types
        const actions = this.getAvailableActions(groups);
        
        // Create buttons for each action
        const buttonSize = 60;
        const buttonMargin = 10;
        const startX = 20;
        const startY = this.canvas.height - this.components.selectionPanel.height + this.components.selectionPanel.padding;
        
        actions.forEach((action, index) => {
            this.buttons.push({
                x: startX + index * (buttonSize + buttonMargin),
                y: startY,
                width: buttonSize,
                height: buttonSize,
                text: action.name,
                icon: action.icon,
                action: () => this.executeAction(action, this.selectedEntities),
                tooltip: action.tooltip
            });
        });
    }
    
    /**
     * Group similar entities together
     */
    groupEntities(entities) {
        const groups = {};
        
        entities.forEach(entity => {
            const key = entity.type + (entity.unitType || entity.buildingType || '');
            
            if (!groups[key]) {
                groups[key] = {
                    type: entity.type,
                    subtype: entity.unitType || entity.buildingType,
                    entities: []
                };
            }
            
            groups[key].entities.push(entity);
        });
        
        return Object.values(groups);
    }
    
    /**
     * Get available actions for selected entities
     */
    getAvailableActions(groups) {
        // Start with move which is common to all units
        const actions = [];
        
        // If we have only one group, get specific actions
        if (groups.length === 1) {
            const group = groups[0];
            
            if (group.type === 'unit') {
                // Basic unit actions
                actions.push({ name: 'Move', icon: 'move', tooltip: 'Move units to location' });
                
                // Check for unit capabilities
                const entity = group.entities[0];
                
                if (entity.canAttack) {
                    actions.push({ name: 'Attack', icon: 'attack', tooltip: 'Attack enemy units or buildings' });
                }
                
                if (entity.canGather) {
                    actions.push({ name: 'Gather', icon: 'gather', tooltip: 'Gather resources' });
                }
                
                if (entity.canBuild) {
                    actions.push({ name: 'Build', icon: 'build', tooltip: 'Construct buildings' });
                }
                
                if (entity.canRepair) {
                    actions.push({ name: 'Repair', icon: 'repair', tooltip: 'Repair damaged buildings' });
                }
                
                // Always add stop command
                actions.push({ name: 'Stop', icon: 'stop', tooltip: 'Stop current action' });
            }
            else if (group.type === 'building') {
                // Building actions
                const entity = group.entities[0];
                
                if (entity.canTrain) {
                    actions.push({ name: 'Train', icon: 'train', tooltip: 'Train new units' });
                }
                
                if (entity.canResearch) {
                    actions.push({ name: 'Research', icon: 'research', tooltip: 'Research technologies' });
                }
                
                if (entity.rallyPoint) {
                    actions.push({ name: 'Rally', icon: 'rally', tooltip: 'Set rally point' });
                }
                
                if (entity.isGate) {
                    const action = entity.isOpen ? 'Close' : 'Open';
                    actions.push({ name: action, icon: 'gate', tooltip: `${action} gate` });
                }
            }
        }
        else {
            // Mixed selection, use common actions
            actions.push({ name: 'Move', icon: 'move', tooltip: 'Move units to location' });
            actions.push({ name: 'Attack', icon: 'attack', tooltip: 'Attack enemy units or buildings' });
            actions.push({ name: 'Stop', icon: 'stop', tooltip: 'Stop current action' });
        }
        
        return actions;
    }
    
    /**
     * Execute an action for selected entities
     */
    executeAction(action, entities) {
        // Handle different actions
        switch (action.name) {
            case 'Move':
                this.activeAction = { type: 'move', entities };
                this.game.canvas.style.cursor = 'pointer';
                break;
                
            case 'Attack':
                this.activeAction = { type: 'attack', entities };
                this.game.canvas.style.cursor = 'crosshair';
                break;
                
            case 'Gather':
                this.activeAction = { type: 'gather', entities };
                this.game.canvas.style.cursor = 'grab';
                break;
                
            case 'Build':
                this.showBuildMenu(entities);
                break;
                
            case 'Repair':
                this.activeAction = { type: 'repair', entities };
                this.game.canvas.style.cursor = 'cell';
                break;
                
            case 'Stop':
                // Immediately stop all entities
                entities.forEach(entity => {
                    if (entity.stopAllActions) {
                        entity.stopAllActions();
                    }
                });
                break;
                
            case 'Train':
                // Show unit training menu for the building
                if (entities.length > 0 && entities[0].type === 'building') {
                    this.showTrainMenu(entities[0]);
                }
                break;
                
            case 'Research':
                // Show research menu for the building
                if (entities.length > 0 && entities[0].type === 'building') {
                    this.showResearchMenu(entities[0]);
                }
                break;
                
            case 'Rally':
                this.activeAction = { type: 'rally', entities };
                this.game.canvas.style.cursor = 'pointer';
                break;
                
            case 'Open':
            case 'Close':
                // Toggle gate state
                if (entities.length > 0 && entities[0].isGate) {
                    entities[0].toggleGate();
                }
                break;
        }
    }
    
    /**
     * Show building menu for constructing buildings
     */
    showBuildMenu(entities) {
        // Simple placeholder for building menu logic
        this.menuOpen = true;
        this.addAlert("Building menu would open here", "info");
    }
    
    /**
     * Show training menu for producing units
     */
    showTrainMenu(building) {
        // Simple placeholder for unit training menu logic
        this.menuOpen = true;
        this.addAlert(`Training menu for ${building.name} would open here`, "info");
    }
    
    /**
     * Show research menu for technologies
     */
    showResearchMenu(building) {
        // Simple placeholder for research menu logic
        this.menuOpen = true;
        this.addAlert(`Research menu for ${building.name} would open here`, "info");
    }
    
    /**
     * Cancel the current action
     */
    cancelAction() {
        this.activeAction = null;
        this.buildingPlacement = null;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Render the UI elements
     */
    render(ctx) {
        // Render top resource bar
        this.renderResourceBar(ctx);
        
        // Render minimap
        this.renderMinimap(ctx);
        
        // Render selection panel if units are selected
        if (this.selectedEntities.length > 0) {
            this.renderSelectionPanel(ctx);
        }
        
        // Render action buttons
        this.renderButtons(ctx);
        
        // Render alerts
        this.renderAlerts(ctx);
        
        // Render tooltip if visible
        if (this.components.tooltip.visible) {
            this.renderTooltip(ctx);
        }
        
        // Render building placement preview if active
        if (this.buildingPlacement) {
            this.renderBuildingPreview(ctx);
        }
        
        // Render message log
        this.renderMessageLog(ctx);
    }
    
    /**
     * Render the resource bar at the top of the screen
     */
    renderResourceBar(ctx) {
        const { width } = this.canvas;
        const height = this.components.topBar.height;
        const padding = this.components.topBar.padding;
        
        // Background
        ctx.fillStyle = this.colors.panelBackground;
        ctx.fillRect(0, 0, width, height);
        
        // Resources
        ctx.font = '16px Arial';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.colors.textPrimary;
        
        // Only render if player resources exist
        if (this.game.activePlayer && this.game.activePlayer.resources) {
            const resources = this.game.activePlayer.resources;
            
            // Food
            ctx.fillStyle = this.colors.resource.food;
            ctx.fillText('Food:', padding, height / 2);
            ctx.fillStyle = this.colors.textPrimary;
            ctx.fillText(Math.floor(resources.food || 0), padding + 50, height / 2);
            
            // Wood
            ctx.fillStyle = this.colors.resource.wood;
            ctx.fillText('Wood:', padding + 150, height / 2);
            ctx.fillStyle = this.colors.textPrimary;
            ctx.fillText(Math.floor(resources.wood || 0), padding + 200, height / 2);
            
            // Gold
            ctx.fillStyle = this.colors.resource.gold;
            ctx.fillText('Gold:', padding + 300, height / 2);
            ctx.fillStyle = this.colors.textPrimary;
            ctx.fillText(Math.floor(resources.gold || 0), padding + 350, height / 2);
            
            // Stone
            ctx.fillStyle = this.colors.resource.stone;
            ctx.fillText('Stone:', padding + 450, height / 2);
            ctx.fillStyle = this.colors.textPrimary;
            ctx.fillText(Math.floor(resources.stone || 0), padding + 500, height / 2);
            
            // Population
            ctx.fillStyle = this.colors.resource.population;
            ctx.fillText('Population:', padding + 600, height / 2);
            ctx.fillStyle = this.colors.textPrimary;
            ctx.fillText(`${resources.population || 0}/${resources.populationCap || 0}`, padding + 680, height / 2);
        }
    }
    
    /**
     * Render minimap in the corner
     */
    renderMinimap(ctx) {
        const size = this.components.minimap.size;
        const padding = this.components.minimap.padding;
        const x = this.canvas.width - size - padding;
        const y = this.canvas.height - size - padding;
        
        // Background
        ctx.fillStyle = this.colors.panelBackground;
        ctx.fillRect(x, y, size, size);
        
        // Map background
        ctx.fillStyle = '#1a4d1a'; // Green terrain
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        
        // Draw entities if we have them
        if (this.game.entities) {
            // Scale factors to convert world to minimap coordinates
            const scaleX = (size - 4) / this.game.mapSize.width;
            const scaleY = (size - 4) / this.game.mapSize.height;
            
            // Draw each entity as a dot
            this.game.entities.forEach(entity => {
                // Skip non-visible entities
                if (!entity.visible) return;
                
                // Determine color based on owner
                if (entity.owner !== undefined) {
                    const player = this.game.players.find(p => p.id === entity.owner);
                    ctx.fillStyle = player ? player.color : '#fff';
                } else {
                    // Resources or neutral entities
                    ctx.fillStyle = entity.type === 'resource' ? '#ffc107' : '#aaa';
                }
                
                // Calculate minimap position
                const minimapX = x + 2 + entity.position.x * scaleX;
                const minimapY = y + 2 + entity.position.y * scaleY;
                
                // Draw larger dots for buildings, smaller for units
                const dotSize = entity.type === 'building' ? 4 : 2;
                
                ctx.fillRect(minimapX, minimapY, dotSize, dotSize);
            });
            
            // Draw viewport rectangle
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                x + 2 + this.game.viewPort.x * scaleX,
                y + 2 + this.game.viewPort.y * scaleY,
                this.game.viewPort.width * scaleX,
                this.game.viewPort.height * scaleY
            );
        }
    }
    
    /**
     * Render selection panel at the bottom
     */
    renderSelectionPanel(ctx) {
        const { width, height } = this.canvas;
        const panelHeight = this.components.selectionPanel.height;
        const padding = this.components.selectionPanel.padding;
        const panelY = height - panelHeight;
        
        // Background
        ctx.fillStyle = this.colors.panelBackground;
        ctx.fillRect(0, panelY, width, panelHeight);
        
        // If there's only one type of entity selected
        if (this.selectedEntities.length > 0) {
            const firstEntity = this.selectedEntities[0];
            
            // Entity name and count
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = this.colors.textPrimary;
            ctx.textBaseline = 'top';
            
            let titleText = firstEntity.name || firstEntity.type;
            if (this.selectedEntities.length > 1) {
                titleText += ` (${this.selectedEntities.length})`;
            }
            
            ctx.fillText(titleText, padding, panelY + padding);
            
            // Health info if available
            if (firstEntity.health !== undefined && firstEntity.maxHealth !== undefined) {
                ctx.font = '14px Arial';
                const healthText = `Health: ${Math.floor(firstEntity.health)}/${firstEntity.maxHealth}`;
                ctx.fillText(healthText, padding, panelY + padding + 25);
                
                // Health bar
                const healthBarWidth = 150;
                const healthBarHeight = 8;
                const healthBarX = padding + 100;
                const healthBarY = panelY + padding + 30;
                
                // Background
                ctx.fillStyle = '#333';
                ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                
                // Health fill
                const healthPercent = firstEntity.health / firstEntity.maxHealth;
                let healthColor;
                
                if (healthPercent > 0.6) {
                    healthColor = this.colors.healthGood;
                } else if (healthPercent > 0.3) {
                    healthColor = this.colors.healthMedium;
                } else {
                    healthColor = this.colors.healthBad;
                }
                
                ctx.fillStyle = healthColor;
                ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
            }
            
            // Additional info based on entity type
            if (firstEntity.type === 'unit') {
                // Show carried resources if any
                if (firstEntity.carriedResource && firstEntity.carriedResource.amount > 0) {
                    ctx.font = '14px Arial';
                    const resourceText = `Carrying: ${firstEntity.carriedResource.amount} ${firstEntity.carriedResource.type}`;
                    ctx.fillText(resourceText, padding + 300, panelY + padding + 25);
                }
                
                // Show attack and armor
                if (firstEntity.attackDamage) {
                    ctx.fillText(`Attack: ${firstEntity.attackDamage}`, padding + 300, panelY + padding);
                }
                
                if (firstEntity.armor) {
                    ctx.fillText(`Armor: ${firstEntity.armor}`, padding + 400, panelY + padding);
                }
            }
            else if (firstEntity.type === 'building') {
                // Show production queue if any
                if (firstEntity.trainingQueue && firstEntity.trainingQueue.length > 0) {
                    ctx.fillText(`Training: ${firstEntity.trainingQueue[0].type}`, padding + 300, panelY + padding);
                    
                    // Progress bar
                    const progressBarWidth = 150;
                    const progressBarHeight = 8;
                    const progressBarX = padding + 400;
                    const progressBarY = panelY + padding + 5;
                    
                    // Background
                    ctx.fillStyle = '#333';
                    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
                    
                    // Progress fill
                    if (firstEntity.productionProgress && firstEntity.trainingQueue[0].time) {
                        const progressPercent = firstEntity.productionProgress / firstEntity.trainingQueue[0].time;
                        ctx.fillStyle = this.colors.resource.food;
                        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progressPercent, progressBarHeight);
                    }
                }
                
                // Show research if active
                if (firstEntity.currentResearch) {
                    ctx.fillText(`Researching: ${firstEntity.currentResearch.name}`, padding + 300, panelY + padding + 25);
                    
                    // Progress bar
                    const progressBarWidth = 150;
                    const progressBarHeight = 8;
                    const progressBarX = padding + 400;
                    const progressBarY = panelY + padding + 30;
                    
                    // Background
                    ctx.fillStyle = '#333';
                    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
                    
                    // Progress fill
                    if (firstEntity.researchProgress && firstEntity.currentResearch.time) {
                        const progressPercent = firstEntity.researchProgress / firstEntity.currentResearch.time;
                        ctx.fillStyle = this.colors.resource.gold;
                        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progressPercent, progressBarHeight);
                    }
                }
            }
        }
    }
    
    /**
     * Render action buttons
     */
    renderButtons(ctx) {
        this.buttons.forEach(button => {
            // Button background
            ctx.fillStyle = this.colors.buttonBackground;
            ctx.fillRect(button.x, button.y, button.width, button.height);
            
            // Button text
            ctx.font = '12px Arial';
            ctx.fillStyle = this.colors.textPrimary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Center text
            const textX = button.x + button.width / 2;
            const textY = button.y + button.height / 2 + 10;
            
            ctx.fillText(button.text, textX, textY);
            
            // Reset alignment
            ctx.textAlign = 'left';
        });
    }
    
    /**
     * Render alert messages
     */
    renderAlerts(ctx) {
        const alertWidth = 300;
        const alertHeight = 30;
        const alertX = 10;
        let alertY = 50; // Start below resource bar
        
        ctx.font = '14px Arial';
        ctx.textBaseline = 'middle';
        
        this.alerts.forEach(alert => {
            // Set opacity based on time left
            const opacity = Math.min(1, alert.timeLeft / 2);
            
            // Alert background
            let bgColor;
            switch (alert.type) {
                case 'error':
                    bgColor = `rgba(244, 67, 54, ${opacity * 0.7})`; // Red
                    break;
                case 'warning':
                    bgColor = `rgba(255, 152, 0, ${opacity * 0.7})`; // Orange
                    break;
                case 'success':
                    bgColor = `rgba(76, 175, 80, ${opacity * 0.7})`; // Green
                    break;
                default:
                    bgColor = `rgba(0, 0, 0, ${opacity * 0.7})`; // Black
            }
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(alertX, alertY, alertWidth, alertHeight);
            
            // Alert text
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillText(alert.message, alertX + 10, alertY + alertHeight / 2);
            
            // Move to next alert position
            alertY += alertHeight + 5;
        });
    }
    
    /**
     * Render tooltip
     */
    renderTooltip(ctx) {
        const tooltip = this.components.tooltip;
        const padding = 5;
        
        // Measure text
        ctx.font = '14px Arial';
        const textWidth = ctx.measureText(tooltip.text).width;
        const textHeight = 20;
        
        // Tooltip background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
            tooltip.x,
            tooltip.y,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        
        // Tooltip text
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            tooltip.text,
            tooltip.x + padding,
            tooltip.y + padding + textHeight / 2
        );
    }
    
    /**
     * Render building placement preview
     */
    renderBuildingPreview(ctx) {
        if (!this.buildingPlacement) return;
        
        const { x, y, type, size, canPlace } = this.buildingPlacement;
        
        // Get screen coordinates
        const screenX = x - this.game.viewPort.x;
        const screenY = y - this.game.viewPort.y;
        
        // Draw building outline
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = canPlace ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(screenX, screenY, size, size);
        
        // Draw building border
        ctx.strokeStyle = canPlace ? '#0f0' : '#f00';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, size, size);
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
        
        // Show building name
        ctx.font = '14px Arial';
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'bottom';
        ctx.fillText(type, screenX, screenY - 5);
    }
    
    /**
     * Render message log
     */
    renderMessageLog(ctx) {
        if (this.messageLog.length === 0) return;
        
        const logWidth = 300;
        const entryHeight = 20;
        const logHeight = this.messageLog.length * entryHeight;
        const logX = 10;
        const logY = this.canvas.height - this.components.selectionPanel.height - logHeight - 10;
        
        // Log background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(logX, logY, logWidth, logHeight);
        
        // Log entries
        ctx.font = '12px Arial';
        ctx.textBaseline = 'middle';
        
        this.messageLog.forEach((entry, index) => {
            const entryY = logY + index * entryHeight;
            
            // Entry text
            let textColor;
            switch (entry.type) {
                case 'error':
                    textColor = '#f44336';
                    break;
                case 'warning':
                    textColor = '#ff9800';
                    break;
                case 'success':
                    textColor = '#4caf50';
                    break;
                default:
                    textColor = '#fff';
            }
            
            ctx.fillStyle = textColor;
            ctx.fillText(`${entry.timestamp}: ${entry.message}`, logX + 5, entryY + entryHeight / 2);
        });
    }
}

// Export the UIManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManagerSimple };
} else {
    window.UIManagerSimple = UIManagerSimple;
} 