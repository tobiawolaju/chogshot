// js/main.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { JoyStick } from './joystick.js';

import { config } from './config.js';
import { setupScene } from './sceneSetup.js';
import { setupPhysicsWorld, applyPlanetaryGravity } from './physics.js';
import { setupEnvironment, updateEnvironment } from './environment.js';
// Make sure to import createOtherPlayer
import { createPlanet, createPlayer, createOtherPlayer, createHoop } from './gameObjects.js';
import { initPlayerControls, updatePlayerForces } from './playerController.js';

// ... (Core Components section is unchanged) ...
let scene, camera, renderer, controls;
let world;
let player, planet;
const physicsObjects = [];

async function init() {
    // Basic scene setup
    ({ scene, camera, renderer, controls } = setupScene());

    // Physics world
    world = setupPhysicsWorld();

    // Scenery and visual effects
    setupEnvironment(scene);

    // --- Create game objects with IDs ---
    planet = createPlanet(scene, world);
    
    // Pass the ID 'my_player' when creating your controllable character
    player = await createPlayer(scene, world, 'my_player');
    
    // Pass IDs for the other players
    const otherPlayer1 = await createOtherPlayer(scene, world, new THREE.Vector3(4, 8, 2), 'player2');
    const otherPlayer2 = await createOtherPlayer(scene, world, new THREE.Vector3(-3, 9, -1), 'player4alex');

     // --- Add the Hoop ---
    // Define the position and orientation for the hoop.
    // Let's place it on the opposite side of the planet from the start position.
    const hoopPosition = new THREE.Vector3(0, 0, -config.planetRadius - 3);
    
    // We want the hoop to "look at" the center of the planet so it stands upright.
    const hoopQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(hoopPosition, new THREE.Vector3(0,180,0), new THREE.Vector3(0, 1, 0));
    hoopQuaternion.setFromRotationMatrix(tempMatrix);

    const hoop = await createHoop(scene, world, hoopPosition, hoopQuaternion);

    // Add all objects to the physics array for updates
    physicsObjects.push(planet, player, otherPlayer1, otherPlayer2, hoop);

    // ... (player controls and animation loop start are unchanged) ...
    initPlayerControls(player.body);
     // NEW: Create the joystick for mobile controls
    new JoyStick();
    animate();
}


// ... (Animation loop is unchanged) ...
let lastTime;
function animate(time) {
    requestAnimationFrame(animate);

    if (lastTime !== undefined) {
        const dt = (time - lastTime) / 1000;
        updatePlayerForces(player.body, camera);
        physicsObjects.forEach(obj => {
            if (!obj.isPlanet) {
                applyPlanetaryGravity(obj.body, planet.body);
            }
        });
        world.step(config.timeStep, dt, 10);
        updateEnvironment(dt);
    }
    
    physicsObjects.forEach(obj => obj.update());
    controls.update();
    renderer.render(scene, camera);
    
    lastTime = time;
}


// --- Run Everything ---
init();