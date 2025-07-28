// js/playerController.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { config } from './config.js';

const keysPressed = {};
let playerCanJump = false;

/**
 * Sets up all event listeners for player controls.
 * @param {CANNON.Body} playerBody - The player's physics body.
 */
export function initPlayerControls(playerBody) {
    window.addEventListener('keydown', (event) => { keysPressed[event.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false; });
    
    playerBody.addEventListener('collide', (event) => {
        playerCanJump = true;
    });
}

/**
 * Applies forces to the player based on current key presses.
 * Called every frame in the animation loop.
 * @param {CANNON.Body} playerBody - The player's physics body.
 * @param {THREE.Camera} camera - The main camera to determine movement direction.
 */
export function updatePlayerForces(playerBody, camera) {
    // --- JUMP LOGIC ---
    if (keysPressed[' '] && playerCanJump) {
        // FIX #1: Correctly get the normalized 'up' vector for the jump.
        // We clone the position so we don't modify the original.
        // .normalize() modifies the vector in-place.
        const playerUp_CANNON = playerBody.position.clone();
        playerUp_CANNON.normalize();
        
        // .scale() returns a *new* scaled vector in cannon-es.
        const jumpImpulse = playerUp_CANNON.scale(config.playerJumpForce);
        playerBody.applyImpulse(jumpImpulse);
        playerCanJump = false;
    }

    // --- MOVEMENT LOGIC ---
    
    // FIX #2: Be explicit about vector types for calculations.
    // Start with the player's 'up' direction from the physics body (CANNON.Vec3).
    const playerUp_CANNON = playerBody.position.clone();
    playerUp_CANNON.normalize();
    
    // Convert it to a THREE.Vector3 to use with the camera's vectors.
    const playerUp_THREE = new THREE.Vector3(playerUp_CANNON.x, playerUp_CANNON.y, playerUp_CANNON.z);

    // Get the camera's forward direction (already a THREE.Vector3).
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    
    // Calculate right and forward directions on the tangent plane of the sphere.
    // All of this math is now correctly done using only THREE.Vector3.
    const right = new THREE.Vector3().crossVectors(playerUp_THREE, cameraForward).normalize();
    const forward = new THREE.Vector3().crossVectors(right, playerUp_THREE).normalize();

    // Determine the final movement direction based on key presses.
    const moveDirection = new THREE.Vector3(0, 0, 0); // This is a THREE.Vector3
    if (keysPressed['w']) moveDirection.add(forward);
    if (keysPressed['s']) moveDirection.sub(forward);
    if (keysPressed['a']) moveDirection.sub(right);
    if (keysPressed['d']) moveDirection.add(right);

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        
        // Calculate the force vector (still a THREE.Vector3).
        const force_THREE = moveDirection.multiplyScalar(config.playerMoveForce);

        // FIX #3: Convert the final force vector back to a CANNON.Vec3 before applying it.
        const force_CANNON = new CANNON.Vec3(force_THREE.x, force_THREE.y, force_THREE.z);
        playerBody.applyForce(force_CANNON);
    }
}