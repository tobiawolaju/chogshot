// js/physics.js
import * as CANNON from 'cannon-es';
import { config } from './config.js';

/**
 * Creates and configures a Cannon-es physics world.
 * @returns {CANNON.World}
 */
export function setupPhysicsWorld() {
    // 1. Create the world object first without the broadphase property
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, 0, 0), // Gravity is applied manually per-object
        allowSleep: true,
    });
    
    // 2. NOW that 'world' exists, we can set its broadphase property
    world.broadphase = new CANNON.SAPBroadphase(world);

    // Continue with the rest of the setup
    world.solver.iterations = 30;

    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
        friction: 0.4,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
    });
    world.addContactMaterial(contactMaterial);
    world.defaultContactMaterial = contactMaterial;

    return world;
}

/**
 * A class to link a Three.js mesh with a Cannon-es physics body.
 */
export class PhysicsObject {
    /**
     * @param {THREE.Mesh} mesh - The visual representation.
     * @param {CANNON.Body} body - The physical representation.
     * @param {boolean} isPlanet - Flag to exclude from gravity calculations.
     */
    constructor(mesh, body, isPlanet = false) {
        this.mesh = mesh;
        this.body = body;
        this.isPlanet = isPlanet;
    }

    /**
     * Updates the mesh's position and rotation to match the physics body.
     */
    update() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }
}

/**
 * Applies a gravitational force to a body towards the planet.
 * @param {CANNON.Body} body - The body to apply force to.
 * @param {CANNON.Body} planetBody - The planet's body to attract towards.
 */
export function applyPlanetaryGravity(body, planetBody) {
    const bodyPos = body.position;
    const planetPos = planetBody.position;

    const distVec = new CANNON.Vec3();
    planetPos.vsub(bodyPos, distVec);
    const distanceSq = distVec.lengthSquared();

    // Avoid gravity singularity and issues inside the planet
    if (distanceSq < (config.planetRadius * config.planetRadius)) {
        return;
    }

    const forceMagnitude = config.gravityConstant * (body.mass * config.planetMass) / distanceSq;
    
    distVec.normalize();
    distVec.scale(forceMagnitude, distVec);
    
    body.applyForce(distVec, bodyPos);
}