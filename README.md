# Flawless Planet Gravity - Refactored Code

This project has been restructured from a single HTML file into multiple JavaScript modules to improve organization, readability, and maintainability.

## File Structure

-   **`index.html`**: The main entry point for the application. It contains the canvas and the `importmap`, but all game logic has been moved to external JS files.

-   **`js/main.js`**: The heart of the application. It imports all other modules, initializes the game, and runs the main `animate` loop.

-   **`js/config.js`**: Contains a single configuration object. All magic numbers and settings (like gravity, player speed, and sizes) are stored here for easy tweaking.

-   **`js/sceneSetup.js`**: Handles the boilerplate setup for Three.js. It creates the `scene`, `camera`, `renderer`, and `OrbitControls`.

-   **`js/physics.js`**: Manages the `cannon-es` physics world. It includes a generic `PhysicsObject` class that links a Three.js mesh to a Cannon-es body, and it handles the custom gravity calculation.

-   **`js/gameObjects.js`**: A "factory" for creating all the objects in our world. It contains functions like `createPlanet`, `createPlayer`, and `createDebris` which define how objects look (their mesh, material, shaders) and their physical properties.

-   **`js/playerController.js`**: This module is dedicated entirely to player input. It listens for keyboard events and calculates the forces to apply to the player's physics body.

-   **`js/environment.js`**: Responsible for creating the "set dressing." This includes the lighting, the starfield background, the background gradient, and the procedural clouds. It also handles animating the clouds.