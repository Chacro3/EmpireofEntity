/**
 * Input System for Empire of Entity
 * Handles keyboard, mouse, and touch input events
 */

class InputSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            isDown: false,
            button: -1,
            dragStart: null,
            isDragging: false,
        };
        
        // Keyboard state - track pressed keys
        this.keys = {};
        
        // Selection state
        this.selection = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            entities: []
        };
        
        // Action state
        this.currentAction = null;
        
        // Edge scrolling settings
        this.edgeScrollSettings = {
            enabled: true,
            threshold: 20,
            speed: 10,
        };
        
        // Bind methods to maintain 'this' context
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.onWheel = this.onWheel.bind(this);
        
        console.log("Input System initialized");
    }
    
    /**
     * Initialize the input system
     */
    init() {
        // Register event listeners
        this.registerEventListeners();
        
        return this;
    }
    
    /**
     * Register all event listeners
     */
    registerEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
        this.canvas.addEventListener('wheel', this.onWheel);
        this.canvas.addEventListener('contextmenu', this.onContextMenu);
        
        // Keyboard events
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        console.log("Input event listeners registered");
    }
    
    /**
     * Update method called each frame
     */
    update(deltaTime) {
        // Handle continuous key presses
        this.handleKeyboardInput(deltaTime);
        
        // Handle edge scrolling
        this.handleEdgeScrolling(deltaTime);
        
        // Update selection box if active
        if (this.selection.active) {
            this.updateSelection();
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.game.viewPort.x,
            y: screenY + this.game.viewPort.y
        };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.game.viewPort.x,
            y: worldY - this.game.viewPort.y
        };
    }
    
    /**
     * Handle mouse movement
     */
    onMouseMove(event) {
        // Get coordinates relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
        
        // Convert to world coordinates
        const worldCoords = this.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.worldX = worldCoords.x;
        this.mouse.worldY = worldCoords.y;
        
        // Update drag if mouse is down
        if (this.mouse.isDown && this.mouse.dragStart) {
            this.mouse.isDragging = true;
            
            // Update selection end position if selecting
            if (this.selection.active) {
                this.selection.endX = this.mouse.worldX;
                this.selection.endY = this.mouse.worldY;
            }
        }
    }
    
    /**
     * Handle mouse button down
     */
    onMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Update mouse state
        this.mouse.isDown = true;
        this.mouse.button = event.button;
        this.mouse.dragStart = { x, y };
        
        // Convert to world coordinates
        const worldCoords = this.screenToWorld(x, y);
        
        // Handle based on button clicked
        if (event.button === 0) { // Left click
            // Start selection process
            this.startSelection(worldCoords.x, worldCoords.y);
            
            // Try to click on UI elements first
            if (!this.handleUIClick(x, y)) {
                // If no UI was clicked, try to select entities
                this.trySelectEntity(worldCoords.x, worldCoords.y);
            }
        } else if (event.button === 2) { // Right click
            // Right click typically issues commands to selected units
            this.issueCommand(worldCoords.x, worldCoords.y);
        }
    }
    
    /**
     * Handle mouse button up
     */
    onMouseUp(event) {
        // Update mouse state
        this.mouse.isDown = false;
        this.mouse.button = -1;
        
        // If we were dragging, process the drag end
        if (this.mouse.isDragging) {
            this.handleDragEnd();
        }
        
        // Reset drag state
        this.mouse.isDragging = false;
        this.mouse.dragStart = null;
        
        // Finalize selection if active
        if (this.selection.active) {
            this.finalizeSelection();
        }
    }
    
    /**
     * Handle mouse wheel for zooming
     */
    onWheel(event) {
        event.preventDefault();
        
        // Get current mouse world position
        const mouseWorldBefore = this.screenToWorld(this.mouse.x, this.mouse.y);
        
        // Change zoom level
        const zoomDelta = -Math.sign(event.deltaY) * 0.1;
        const newZoom = Math.max(0.5, Math.min(2.0, this.game.camera.zoom + zoomDelta));
        
        // Apply new zoom
        this.game.camera.zoom = newZoom;
        
        // Get new mouse world position
        const mouseWorldAfter = this.screenToWorld(this.mouse.x, this.mouse.y);
        
        // Adjust camera to keep mouse position the same in world coordinates
        this.game.camera.x += (mouseWorldAfter.x - mouseWorldBefore.x);
        this.game.camera.y += (mouseWorldAfter.y - mouseWorldBefore.y);
    }
    
    /**
     * Prevent default context menu
     */
    onContextMenu(event) {
        event.preventDefault();
        return false;
    }
    
    /**
     * Handle keyboard key down
     */
    onKeyDown(event) {
        // Record key as pressed
        this.keys[event.code] = true;
        
        // Handle special key presses
        switch (event.code) {
            case 'Escape':
                // Cancel current action and clear selection
                this.cancelAction();
                this.clearSelection();
                break;
                
            case 'KeyD':
                // Toggle debug mode
                if (event.altKey) {
                    this.game.debugMode = !this.game.debugMode;
                    console.log("Debug mode:", this.game.debugMode ? "ON" : "OFF");
                }
                break;
                
            case 'Space':
                // Center camera on selected entities or starting position
                this.centerCamera();
                break;
                
            case 'Delete':
                // Delete selected entities (if allowed)
                this.deleteSelected();
                break;
        }
    }
    
    /**
     * Handle keyboard key up
     */
    onKeyUp(event) {
        // Record key as released
        this.keys[event.code] = false;
    }
    
    /**
     * Handle touch start (mobile)
     */
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Convert touch to mouse down
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0 // Left click
            });
            
            this.onMouseDown(mouseEvent);
        }
    }
    
    /**
     * Handle touch move (mobile)
     */
    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Convert touch to mouse move
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            
            this.onMouseMove(mouseEvent);
        }
    }
    
    /**
     * Handle touch end (mobile)
     */
    onTouchEnd(event) {
        event.preventDefault();
        
        // Convert to mouse up
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: this.mouse.x,
            clientY: this.mouse.y,
            button: 0 // Left click
        });
        
        this.onMouseUp(mouseEvent);
    }
    
    /**
     * Handle continuous keyboard input
     */
    handleKeyboardInput(deltaTime) {
        // Camera movement speed (adjust based on zoom level)
        const speed = 500 * deltaTime / (this.game.camera ? this.game.camera.zoom : 1);
        
        // Camera movement with arrow keys or WASD
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.moveCamera(0, -speed);
        }
        
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.moveCamera(0, speed);
        }
        
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.moveCamera(-speed, 0);
        }
        
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.moveCamera(speed, 0);
        }
    }
    
    /**
     * Handle camera movement
     */
    moveCamera(deltaX, deltaY) {
        if (this.game.viewPort) {
            // Update viewport position
            this.game.viewPort.x += deltaX;
            this.game.viewPort.y += deltaY;
            
            // Apply bounds checking to keep within map
            this.constrainCameraToMap();
        }
    }
    
    /**
     * Center camera on selected entities or map center
     */
    centerCamera() {
        // If entities are selected, center on them
        if (this.selection.entities.length > 0) {
            let avgX = 0;
            let avgY = 0;
            
            // Calculate average position of selected entities
            this.selection.entities.forEach(entity => {
                avgX += entity.position.x;
                avgY += entity.position.y;
            });
            
            avgX /= this.selection.entities.length;
            avgY /= this.selection.entities.length;
            
            // Center viewport on this position
            this.game.viewPort.x = avgX - (this.game.viewPort.width / 2);
            this.game.viewPort.y = avgY - (this.game.viewPort.height / 2);
        } else {
            // Otherwise center on map
            this.game.viewPort.x = (this.game.mapSize.width / 2) - (this.game.viewPort.width / 2);
            this.game.viewPort.y = (this.game.mapSize.height / 2) - (this.game.viewPort.height / 2);
        }
        
        // Ensure camera is within map bounds
        this.constrainCameraToMap();
    }
    
    /**
     * Keep camera within map bounds
     */
    constrainCameraToMap() {
        if (!this.game.viewPort || !this.game.mapSize) return;
        
        // Don't let camera move outside map bounds
        this.game.viewPort.x = Math.max(0, Math.min(this.game.viewPort.x, this.game.mapSize.width - this.game.viewPort.width));
        this.game.viewPort.y = Math.max(0, Math.min(this.game.viewPort.y, this.game.mapSize.height - this.game.viewPort.height));
    }
    
    /**
     * Handle edge scrolling (move camera when mouse is near edge)
     */
    handleEdgeScrolling(deltaTime) {
        if (!this.edgeScrollSettings.enabled) return;
        
        const threshold = this.edgeScrollSettings.threshold;
        const speed = this.edgeScrollSettings.speed * deltaTime * 60; // Scale by deltaTime for consistent speed
        
        // Check each edge of the screen
        if (this.mouse.x < threshold) {
            this.moveCamera(-speed, 0);
        } else if (this.mouse.x > this.canvas.width - threshold) {
            this.moveCamera(speed, 0);
        }
        
        if (this.mouse.y < threshold) {
            this.moveCamera(0, -speed);
        } else if (this.mouse.y > this.canvas.height - threshold) {
            this.moveCamera(0, speed);
        }
    }
    
    /**
     * Check if a point is inside an entity's bounds
     */
    isPointInEntity(x, y, entity) {
        if (!entity.position || !entity.size) {
            return false;
        }
        
        // Different collision shapes based on entity type
        if (entity.type === 'unit') {
            // Units are circles
            const dx = x - (entity.position.x + entity.size / 2);
            const dy = y - (entity.position.y + entity.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance <= entity.size / 2;
        } else {
            // Default to rectangle
            return (
                x >= entity.position.x &&
                x <= entity.position.x + entity.size &&
                y >= entity.position.y &&
                y <= entity.position.y + entity.size
            );
        }
    }
    
    /**
     * Attempt to select an entity at the given coordinates
     */
    trySelectEntity(x, y) {
        let clickedEntity = null;
        
        // Find entity at click position (last added = top)
        for (let i = this.game.entities.length - 1; i >= 0; i--) {
            const entity = this.game.entities[i];
            if (this.isPointInEntity(x, y, entity)) {
                clickedEntity = entity;
                break;
            }
        }
        
        // If an entity was clicked
        if (clickedEntity) {
            // If shift is held, add to selection
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
                // Toggle selection for the clicked entity
                if (this.selection.entities.includes(clickedEntity)) {
                    // Remove from selection
                    this.selection.entities = this.selection.entities.filter(e => e !== clickedEntity);
                    clickedEntity.selected = false;
                } else {
                    // Add to selection
                    this.selection.entities.push(clickedEntity);
                    clickedEntity.selected = true;
                }
            } else {
                // Clear current selection and select clicked entity
                this.clearSelection();
                this.selection.entities = [clickedEntity];
                clickedEntity.selected = true;
            }
            
            // Cancel the box selection
            this.selection.active = false;
            
            // Play selection sound
            if (this.game.audioSystem) {
                this.game.audioSystem.play('select');
            }
            
            return true;
        }
        
        // If shift is not held and no entity was clicked, clear selection
        if (!this.keys['ShiftLeft'] && !this.keys['ShiftRight'] && !this.selection.active) {
            this.clearSelection();
        }
        
        return false;
    }
    
    /**
     * Clear all selected entities
     */
    clearSelection() {
        // Unselect all entities
        this.selection.entities.forEach(entity => {
            entity.selected = false;
        });
        
        // Clear selection array
        this.selection.entities = [];
    }
    
    /**
     * Start a box selection
     */
    startSelection(worldX, worldY) {
        this.selection.active = true;
        this.selection.startX = worldX;
        this.selection.startY = worldY;
        this.selection.endX = worldX;
        this.selection.endY = worldY;
    }
    
    /**
     * Update selection during drag
     */
    updateSelection() {
        // Update selection end position to current mouse position
        this.selection.endX = this.mouse.worldX;
        this.selection.endY = this.mouse.worldY;
    }
    
    /**
     * Finalize the box selection
     */
    finalizeSelection() {
        // Only process if selection is active
        if (!this.selection.active) return;
        
        // Calculate selection box coordinates
        const left = Math.min(this.selection.startX, this.selection.endX);
        const right = Math.max(this.selection.startX, this.selection.endX);
        const top = Math.min(this.selection.startY, this.selection.endY);
        const bottom = Math.max(this.selection.startY, this.selection.endY);
        
        // Minimum size check to avoid accidental tiny selections
        const minSize = 5;
        if (right - left < minSize && bottom - top < minSize) {
            this.selection.active = false;
            return;
        }
        
        // If shift is not held, clear current selection
        if (!this.keys['ShiftLeft'] && !this.keys['ShiftRight']) {
            this.clearSelection();
        }
        
        // Find all entities in the selection box
        const selectedEntities = this.game.entities.filter(entity => {
            if (!entity.position || !entity.size) return false;
            
            // Skip entities that are not selectable
            if (entity.selectable === false) return false;
            
            // Skip entities that don't belong to the player
            if (entity.owner !== this.game.activePlayer.id) return false;
            
            // Simple rectangle intersection check
            const entityRight = entity.position.x + entity.size;
            const entityBottom = entity.position.y + entity.size;
            
            return !(
                entityRight < left ||
                entity.position.x > right ||
                entityBottom < top ||
                entity.position.y > bottom
            );
        });
        
        // Add newly selected entities
        selectedEntities.forEach(entity => {
            if (!this.selection.entities.includes(entity)) {
                this.selection.entities.push(entity);
                entity.selected = true;
            }
        });
        
        // Play selection sound if entities were selected
        if (selectedEntities.length > 0 && this.game.audioSystem) {
            this.game.audioSystem.play('select');
        }
        
        // Reset selection state
        this.selection.active = false;
    }
    
    /**
     * Issue a command to selected entities
     */
    issueCommand(x, y) {
        if (this.selection.entities.length === 0) return;
        
        // Find target entity at command location
        let targetEntity = null;
        for (const entity of this.game.entities) {
            if (this.isPointInEntity(x, y, entity)) {
                targetEntity = entity;
                break;
            }
        }
        
        // Determine command type based on target
        let command = 'move';
        
        if (targetEntity) {
            if (targetEntity.owner !== this.game.activePlayer.id) {
                // Enemy entity - attack
                command = 'attack';
            } else if (targetEntity.type === 'resource') {
                // Resource - gather
                command = 'gather';
            } else if (targetEntity.type === 'building' && targetEntity.owner === this.game.activePlayer.id) {
                // Friendly building - garrison or repair
                command = this.keys['AltLeft'] || this.keys['AltRight'] ? 'repair' : 'garrison';
            }
        } else {
            // No target - move or build
            command = this.currentAction?.type === 'build' ? 'build' : 'move';
        }
        
        // Issue the determined command
        this.issueCommandToSelected(command, x, y, targetEntity);
    }
    
    /**
     * Issue specific command to selected entities
     */
    issueCommandToSelected(command, x, y, target = null) {
        // Filter entities that can perform the command
        const validEntities = this.selection.entities.filter(entity => {
            switch (command) {
                case 'move':
                    return entity.canMove;
                case 'attack':
                    return entity.canAttack;
                case 'gather':
                    return entity.canGather;
                case 'build':
                    return entity.canBuild;
                case 'repair':
                    return entity.canRepair;
                default:
                    return true;
            }
        });
        
        if (validEntities.length === 0) return;
        
        // Execute command on each entity
        validEntities.forEach(entity => {
            if (entity.executeCommand) {
                entity.executeCommand(command, { x, y, target });
            } else {
                // Fallback command execution
                switch (command) {
                    case 'move':
                        entity.destination = { x, y };
                        break;
                    case 'attack':
                        entity.attackTarget = target;
                        break;
                    case 'gather':
                        entity.gatherTarget = target;
                        break;
                    case 'build':
                        // Building would be handled by a specific build system
                        break;
                }
            }
        });
        
        // Play appropriate sound effect
        if (this.game.audioSystem) {
            const soundEffects = {
                'move': 'command_move',
                'attack': 'command_attack',
                'gather': 'command_gather',
                'build': 'command_build',
                'repair': 'command_repair'
            };
            
            const soundToPlay = soundEffects[command] || 'command_move';
            this.game.audioSystem.play(soundToPlay);
        }
        
        // Display command indicator
        this.showCommandIndicator(command, x, y);
    }
    
    /**
     * Handle clicking on UI elements
     */
    handleUIClick(x, y) {
        // Check if we have a UI manager
        if (this.game.ui && this.game.ui.handleClick) {
            return this.game.ui.handleClick(x, y);
        }
        
        // Implement fallback UI click handling
        
        // Check minimap click (bottom right)
        const minimapRect = {
            x: this.canvas.width - 210,
            y: this.canvas.height - 210,
            width: 200,
            height: 200
        };
        
        if (
            x >= minimapRect.x && 
            x <= minimapRect.x + minimapRect.width && 
            y >= minimapRect.y && 
            y <= minimapRect.y + minimapRect.height
        ) {
            // Convert minimap coordinates to world coordinates
            const minimapX = (x - minimapRect.x) / minimapRect.width;
            const minimapY = (y - minimapRect.y) / minimapRect.height;
            
            const worldX = minimapX * this.game.mapSize.width;
            const worldY = minimapY * this.game.mapSize.height;
            
            // Center the viewport on this location
            this.game.viewPort.x = worldX - (this.game.viewPort.width / 2);
            this.game.viewPort.y = worldY - (this.game.viewPort.height / 2);
            
            // Constrain to map bounds
            this.constrainCameraToMap();
            
            return true;
        }
        
        // Check command panel (bottom center)
        const commandPanelRect = {
            x: 10,
            y: this.canvas.height - 110,
            width: 300,
            height: 100
        };
        
        if (
            x >= commandPanelRect.x && 
            x <= commandPanelRect.x + commandPanelRect.width && 
            y >= commandPanelRect.y && 
            y <= commandPanelRect.y + commandPanelRect.height
        ) {
            // Handle command button clicks
            const buttonWidth = 60;
            const buttonHeight = 40;
            const buttonX = 20;
            const buttonY = this.canvas.height - 50;
            const buttonSpacing = 70;
            
            // Check which button was clicked
            for (let i = 0; i < 4; i++) {
                const buttonRect = {
                    x: buttonX + i * buttonSpacing,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
                
                if (
                    x >= buttonRect.x && 
                    x <= buttonRect.x + buttonRect.width && 
                    y >= buttonRect.y && 
                    y <= buttonRect.y + buttonRect.height
                ) {
                    // Execute the corresponding action
                    this.executeCommandButtonAction(i);
                    return true;
                }
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute action from the command button
     */
    executeCommandButtonAction(buttonIndex) {
        if (this.selection.entities.length === 0) return;
        
        // Get the first selected entity to determine available actions
        const entity = this.selection.entities[0];
        
        // Get actions for this entity
        const actions = this.getEntityActions(entity);
        
        // Execute the selected action if available
        if (buttonIndex < actions.length) {
            const action = actions[buttonIndex];
            
            // Execute different actions based on what was clicked
            switch (action.name.toLowerCase()) {
                case 'move':
                    this.setCurrentAction({ type: 'move' });
                    break;
                case 'attack':
                    this.setCurrentAction({ type: 'attack' });
                    break;
                case 'gather':
                    this.setCurrentAction({ type: 'gather' });
                    break;
                case 'build':
                    this.showBuildMenu();
                    break;
                case 'train':
                    this.showTrainMenu();
                    break;
                case 'research':
                    this.showResearchMenu();
                    break;
                case 'rally':
                    this.setCurrentAction({ type: 'rally' });
                    break;
            }
            
            // Play button click sound
            if (this.game.audioSystem) {
                this.game.audioSystem.play('ui_click');
            }
        }
    }
    
    /**
     * Get available actions for an entity
     */
    getEntityActions(entity) {
        const actions = [];
        
        if (entity.type === 'unit') {
            actions.push({ name: 'Move', icon: 'move' });
            
            if (entity.canAttack) {
                actions.push({ name: 'Attack', icon: 'attack' });
            }
            
            if (entity.canGather) {
                actions.push({ name: 'Gather', icon: 'gather' });
            }
            
            if (entity.canBuild) {
                actions.push({ name: 'Build', icon: 'build' });
            }
        } else if (entity.type === 'building') {
            if (entity.canTrain) {
                actions.push({ name: 'Train', icon: 'train' });
            }
            
            if (entity.canResearch) {
                actions.push({ name: 'Research', icon: 'research' });
            }
            
            actions.push({ name: 'Rally', icon: 'rally' });
        }
        
        return actions;
    }
    
    /**
     * Set the current action
     */
    setCurrentAction(action) {
        this.currentAction = action;
        
        // Update cursor based on action
        switch (action.type) {
            case 'move':
                this.canvas.style.cursor = 'pointer';
                break;
            case 'attack':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'gather':
                this.canvas.style.cursor = 'grab';
                break;
            case 'build':
                this.canvas.style.cursor = 'cell';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Cancel the current action
     */
    cancelAction() {
        this.currentAction = null;
        this.canvas.style.cursor = 'default';
    }
    
    /**
     * Show build menu for villagers
     */
    showBuildMenu() {
        // This would show UI for selecting a building type
        console.log("Build menu");
    }
    
    /**
     * Show train menu for buildings
     */
    showTrainMenu() {
        // This would show UI for training units
        console.log("Train menu");
    }
    
    /**
     * Show research menu for buildings
     */
    showResearchMenu() {
        // This would show UI for researching technologies
        console.log("Research menu");
    }
    
    /**
     * Handle drag end for various interactions
     */
    handleDragEnd() {
        // Handle minimap drag, building placement, etc.
    }
    
    /**
     * Show a visual indicator for commands
     */
    showCommandIndicator(command, x, y) {
        // This would show a visual feedback for commands
        // For now, just log it
        console.log(`Command ${command} at ${x},${y}`);
    }
    
    /**
     * Delete selected entities
     */
    deleteSelected() {
        // Only works in debug mode or for certain entity types
        if (!this.game.debugMode) return;
        
        // Remove each selected entity
        this.selection.entities.forEach(entity => {
            this.game.removeEntity(entity);
        });
        
        // Clear selection
        this.selection.entities = [];
    }
    
    /**
     * Generic input handler for external use
     */
    handle(event) {
        switch (event.type) {
            case 'mousedown':
                this.onMouseDown(event);
                break;
            case 'mousemove':
                this.onMouseMove(event);
                break;
            case 'mouseup':
                this.onMouseUp(event);
                break;
            case 'keydown':
                this.onKeyDown(event);
                break;
            case 'keyup':
                this.onKeyUp(event);
                break;
            case 'wheel':
                this.onWheel(event);
                break;
            case 'contextmenu':
                this.onContextMenu(event);
                break;
        }
    }
}

// Export the InputSystem class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputSystem };
} else {
    window.InputSystem = InputSystem;
}
