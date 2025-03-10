#!/bin/bash

# This script moves JS files from the root to the appropriate subdirectories
# and removes the original files to avoid duplication

# Core files
if [ -f "utils.js" ]; then
    mv -f utils.js js/core/
    echo "Moved utils.js to js/core/"
fi

if [ -f "game.js" ]; then
    mv -f game.js js/core/
    echo "Moved game.js to js/core/"
fi

if [ -f "input.js" ]; then
    mv -f input.js js/core/
    echo "Moved input.js to js/core/"
fi

if [ -f "renderer.js" ]; then
    mv -f renderer.js js/core/
    echo "Moved renderer.js to js/core/"
fi

if [ -f "audio.js" ]; then
    mv -f audio.js js/core/
    echo "Moved audio.js to js/core/"
fi

# Map files
if [ -f "terrain.js" ]; then
    mv -f terrain.js js/map/
    echo "Moved terrain.js to js/map/"
fi

if [ -f "fog-of-war.js" ]; then
    mv -f fog-of-war.js js/map/
    echo "Moved fog-of-war.js to js/map/"
fi

if [ -f "map.js" ]; then
    mv -f map.js js/map/
    echo "Moved map.js to js/map/"
fi

if [ -f "pathfinding.js" ]; then
    mv -f pathfinding.js js/map/
    echo "Moved pathfinding.js to js/map/"
fi

# Entity files
if [ -f "entity.js" ]; then
    mv -f entity.js js/entities/
    echo "Moved entity.js to js/entities/"
fi

if [ -f "resource.js" ]; then
    mv -f resource.js js/entities/
    echo "Moved resource.js to js/entities/"
fi

if [ -f "unit.js" ]; then
    mv -f unit.js js/entities/
    echo "Moved unit.js to js/entities/"
fi

if [ -f "building.js" ]; then
    mv -f building.js js/entities/
    echo "Moved building.js to js/entities/"
fi

if [ -f "wall.js" ]; then
    mv -f wall.js js/entities/
    echo "Moved wall.js to js/entities/"
fi

if [ -f "wonder.js" ]; then
    mv -f wonder.js js/entities/
    echo "Moved wonder.js to js/entities/"
fi

if [ -f "entity-manager.js" ]; then
    mv -f entity-manager.js js/entities/
    echo "Moved entity-manager.js to js/entities/"
fi

if [ -f "villager.js" ]; then
    mv -f villager.js js/entities/
    echo "Moved villager.js to js/entities/"
fi

if [ -f "entity-classes.js" ]; then
    mv -f entity-classes.js js/entities/
    echo "Moved entity-classes.js to js/entities/"
fi

# Mechanics files
if [ -f "resource-system.js" ]; then
    mv -f resource-system.js js/mechanics/
    echo "Moved resource-system.js to js/mechanics/"
fi

if [ -f "resources.js" ]; then
    mv -f resources.js js/mechanics/
    echo "Moved resources.js to js/mechanics/"
fi

if [ -f "combat.js" ]; then
    mv -f combat.js js/mechanics/
    echo "Moved combat.js to js/mechanics/"
fi

if [ -f "damage-types.js" ]; then
    mv -f damage-types.js js/mechanics/
    echo "Moved damage-types.js to js/mechanics/"
fi

if [ -f "tech-tree.js" ]; then
    mv -f tech-tree.js js/mechanics/
    echo "Moved tech-tree.js to js/mechanics/"
fi

if [ -f "age-advancement.js" ]; then
    mv -f age-advancement.js js/mechanics/
    echo "Moved age-advancement.js to js/mechanics/"
fi

if [ -f "formations.js" ]; then
    mv -f formations.js js/mechanics/
    echo "Moved formations.js to js/mechanics/"
fi

if [ -f "alerts.js" ]; then
    mv -f alerts.js js/mechanics/
    echo "Moved alerts.js to js/mechanics/"
fi

if [ -f "auto-assign.js" ]; then
    mv -f auto-assign.js js/mechanics/
    echo "Moved auto-assign.js to js/mechanics/"
fi

if [ -f "victory.js" ]; then
    mv -f victory.js js/mechanics/
    echo "Moved victory.js to js/mechanics/"
fi

# Civilization files
if [ -f "civilization.js" ]; then
    mv -f civilization.js js/civilizations/
    echo "Moved civilization.js to js/civilizations/"
fi

if [ -f "solari.js" ]; then
    mv -f solari.js js/civilizations/
    echo "Moved solari.js to js/civilizations/"
fi

if [ -f "lunari.js" ]; then
    mv -f lunari.js js/civilizations/
    echo "Moved lunari.js to js/civilizations/"
fi

if [ -f "civilization-manager.js" ]; then
    mv -f civilization-manager.js js/civilizations/
    echo "Moved civilization-manager.js to js/civilizations/"
fi

# UI files
if [ -f "ui-manager.js" ]; then
    mv -f ui-manager.js js/ui/
    echo "Moved ui-manager.js to js/ui/"
fi

if [ -f "minimap.js" ]; then
    mv -f minimap.js js/ui/
    echo "Moved minimap.js to js/ui/"
fi

if [ -f "resource-display.js" ]; then
    mv -f resource-display.js js/ui/
    echo "Moved resource-display.js to js/ui/"
fi

if [ -f "building-menu.js" ]; then
    mv -f building-menu.js js/ui/
    echo "Moved building-menu.js to js/ui/"
fi

if [ -f "unit-panel.js" ]; then
    mv -f unit-panel.js js/ui/
    echo "Moved unit-panel.js to js/ui/"
fi

if [ -f "tech-panel.js" ]; then
    mv -f tech-panel.js js/ui/
    echo "Moved tech-panel.js to js/ui/"
fi

if [ -f "alerts-display.js" ]; then
    mv -f alerts-display.js js/ui/
    echo "Moved alerts-display.js to js/ui/"
fi

# AI files
if [ -f "ai-behaviors.js" ]; then
    mv -f ai-behaviors.js js/ai/
    echo "Moved ai-behaviors.js to js/ai/"
fi

if [ -f "ai-player.js" ]; then
    mv -f ai-player.js js/ai/
    echo "Moved ai-player.js to js/ai/"
fi

if [ -f "difficulty.js" ]; then
    mv -f difficulty.js js/ai/
    echo "Moved difficulty.js to js/ai/"
fi

# Main engine files
if [ -f "game-engine.js" ]; then
    mv -f game-engine.js js/
    echo "Moved game-engine.js to js/"
fi

if [ -f "main.js" ]; then
    mv -f main.js js/
    echo "Moved main.js to js/"
fi

if [ -f "game-debug.js" ]; then
    mv -f game-debug.js js/
    echo "Moved game-debug.js to js/"
fi

if [ -f "config.js" ]; then
    mv -f config.js js/
    echo "Moved config.js to js/"
fi

echo "File migration complete" 