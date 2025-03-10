/**
 * Empires of Eternity - Debug Utilities
 * Contains debugging tools and functions for development
 */

(function () {
  // Create debug container
  const debugContainer = document.createElement("div");
  debugContainer.id = "debug-container";
  debugContainer.style.position = "absolute";
  debugContainer.style.right = "10px";
  debugContainer.style.top = "10px";
  debugContainer.style.zIndex = "1000";

  // Create debug toggle button
  const debugButton = document.createElement("button");
  debugButton.id = "debug-toggle";
  debugButton.textContent = "Show Debug";
  debugButton.style.backgroundColor = "#ff3333";
  debugButton.style.color = "white";
  debugButton.style.border = "none";
  debugButton.style.padding = "8px 16px";
  debugButton.style.borderRadius = "4px";
  debugButton.style.cursor = "pointer";

  // Create test map render button
  const testMapButton = document.createElement("button");
  testMapButton.id = "test-map";
  testMapButton.textContent = "Test Map Render";
  testMapButton.style.backgroundColor = "#33aa33";
  testMapButton.style.color = "white";
  testMapButton.style.border = "none";
  testMapButton.style.padding = "8px 16px";
  testMapButton.style.borderRadius = "4px";
  testMapButton.style.cursor = "pointer";
  testMapButton.style.marginTop = "10px";
  testMapButton.style.display = "block";

  // Add buttons to container
  debugContainer.appendChild(debugButton);
  debugContainer.appendChild(testMapButton);

  // Add container to document
  document.body.appendChild(debugContainer);

  // Button event listeners
  debugButton.addEventListener("click", function () {
    if (!window.gameInstance) return;

    const renderer = window.gameInstance.getSystem
      ? window.gameInstance.getSystem("renderer")
      : window.gameInstance.systems?.renderer;

    if (renderer && typeof renderer.toggleDebug === "function") {
      const isDebug = renderer.toggleDebug();
      debugButton.textContent = isDebug ? "Hide Debug" : "Show Debug";
      debugButton.style.backgroundColor = isDebug ? "#33aa33" : "#ff3333";
    }
  });

  testMapButton.addEventListener("click", function () {
    if (!window.gameInstance) return;

    console.log("Running map render test");

    const map = window.gameInstance.getSystem
      ? window.gameInstance.getSystem("map")
      : window.gameInstance.systems?.map;

    const renderer = window.gameInstance.getSystem
      ? window.gameInstance.getSystem("renderer")
      : window.gameInstance.systems?.renderer;

    if (map && renderer) {
      console.log("Map dimensions:", map.width, "x", map.height);
      console.log("Camera position:", renderer.camera.x, renderer.camera.y);
      console.log("Camera zoom:", renderer.camera.zoom);

      // Center camera and force render
      renderer.centerCamera();
      renderer.render();

      console.log("Map render test complete");
    } else {
      console.error("Map or renderer not available");
    }
  });

  // Console commands
  window.gameDebug = {
    // Show entity count
    showEntities: function () {
      if (!window.gameInstance) return "Game not initialized";

      const entityManager = window.gameInstance.getSystem
        ? window.gameInstance.getSystem("entityManager")
        : window.gameInstance.systems?.entityManager;

      if (!entityManager) return "Entity manager not available";

      const entities = entityManager.entities || [];
      console.log("Total entities:", entities.length);

      // Group by type
      const byType = {};
      for (const entity of entities) {
        if (!byType[entity.type]) byType[entity.type] = [];
        byType[entity.type].push(entity);
      }

      console.table(
        Object.entries(byType).map(([type, list]) => ({
          type,
          count: list.length,
        }))
      );

      return `Found ${entities.length} entities`;
    },

    // Show resources
    showResources: function () {
      if (!window.gameInstance) return "Game not initialized";

      const resourceManager = window.gameInstance.getSystem
        ? window.gameInstance.getSystem("resourceManager")
        : window.gameInstance.systems?.resourceManager;

      if (!resourceManager) return "Resource manager not available";

      console.log("Player resources:", resourceManager.playerResources);

      return "Resources displayed in console";
    },

    // Toggle grid
    toggleDebug: function () {
      if (!window.gameInstance) return "Game not initialized";

      const renderer = window.gameInstance.getSystem
        ? window.gameInstance.getSystem("renderer")
        : window.gameInstance.systems?.renderer;

      if (!renderer) return "Renderer not available";

      const isDebug = renderer.toggleDebug();
      debugButton.textContent = isDebug ? "Hide Debug" : "Show Debug";
      debugButton.style.backgroundColor = isDebug ? "#33aa33" : "#ff3333";

      return `Debug mode: ${isDebug ? "ON" : "OFF"}`;
    },

    // Reset game
    resetGame: function () {
      if (!window.gameInstance) return "Game not initialized";

      // Check if we have initGame function
      if (typeof window.initGame === "function") {
        window.initGame();
        return "Game reset through initGame()";
      }

      // Otherwise try reloading the page
      window.location.reload();
      return "Reloading page...";
    },
  };

  console.log(
    "Debug utilities loaded. Use gameDebug.commands() to see available commands"
  );

  // Add commands helper
  window.gameDebug.commands = function () {
    console.log("Available debug commands:");
    console.log("gameDebug.showEntities() - Show entity counts");
    console.log("gameDebug.showResources() - Show player resources");
    console.log("gameDebug.toggleDebug() - Toggle debug mode");
    console.log("gameDebug.resetGame() - Reset the game");
    return "Type any command to execute";
  };
})();
