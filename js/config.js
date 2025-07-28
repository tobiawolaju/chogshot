// js/config.js
import * as THREE from 'three';

export const config = {
    // Physics
    gravityConstant: 6.674e-2,
    planetMass: 50000,
    
    // Planet
    planetRadius: 5,
    
    // Camera
    cameraStartPos: new THREE.Vector3(0, 15, 25),
    
    // Player
    playerMoveForce: 35,
    playerJumpForce: 25,
    playerMass: 1,
    playerSize: 0.4,
    
    // Simulation
    timeStep: 1 / 60,
};