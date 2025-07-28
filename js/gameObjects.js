// js/gameObjects.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { config } from './config.js';
import { PhysicsObject } from './physics.js';

const loader = new GLTFLoader();

/**
 * Creates a THREE.Sprite that acts as a billboard text label.
 * @param {string} text The text to display on the tag.
 * @returns {THREE.Sprite}
 */
function createNameTag(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 48;
    const fontFamily = 'monospace';
    
    context.font = `${fontSize}px ${fontFamily}`;
    
    // Set canvas size based on text
    const textMetrics = context.measureText(text);
    canvas.width = textMetrics.width;
    canvas.height = fontSize * 1.2; // A little extra height for padding

    // Re-apply font settings after canvas resize
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    context.lineWidth = 4;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw text with a black outline
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    context.strokeText(text, x, y);
    context.fillText(text, x, y);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale the sprite to an appropriate size in the 3D world
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(aspect * 1.5, 1.5, 1.0); // Adjust scaling as needed

    return sprite;
}

// ... createPlanet function remains unchanged ...
export function createPlanet(scene, world) {
    const planetGeo = new THREE.SphereGeometry(config.planetRadius, 128, 128);
    const planetMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal; varying vec2 vUv;
            void main() {
                vNormal = normalize(normalMatrix * normal); vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            varying vec3 vNormal; varying vec2 vUv;
            float line(float val, float target, float t) { return smoothstep(target-t, target, val) - smoothstep(target, target+t, val); }
            float drawCourt(vec2 uv) {
                float t = 0.0025, result = 0.0;
                result += smoothstep(0.06+t,0.06,distance(uv,vec2(0.5))) - smoothstep(0.06,0.06-t,distance(uv,vec2(0.5)));
                result += line(uv.x,0.5,t); result += line(uv.y,0.2,t); result += line(uv.y,0.8,t);
                result += line(uv.x,0.3,t); result += line(uv.x,0.7,t); result += line(uv.y,0.35,t);
                result += line(uv.y,0.65,t);
                return clamp(result,0.0,1.0);
            }
            void main() {
                vec3 courtColor = vec3(1.0, 0.8, 1.0), lineColor = vec3(0.5, 0.5, 1.0);
                float lines = drawCourt(vUv);
                vec3 color = mix(courtColor, lineColor, lines);
                vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0)); 
                float diffuse = max(dot(vNormal, lightDir), 0.0);
                color *= diffuse + 0.2;
                gl_FragColor = vec4(color, 1.0);
            }`,
        side: THREE.DoubleSide
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.receiveShadow = true;
    scene.add(planetMesh);

    const planetShape = new CANNON.Sphere(config.planetRadius);
    const planetBody = new CANNON.Body({ mass: 0, shape: planetShape }); // Mass 0 makes it static
    world.addBody(planetBody);

    return new PhysicsObject(planetMesh, planetBody, true);
}



/**
 * Asynchronously loads the GLB model and creates the player object with a name tag.
 * @param {THREE.Scene} scene
 * @param {CANNON.World} world
 * @param {string} id The unique identifier and name for the player.
 * @returns {Promise<PhysicsObject>}
 */
export async function createPlayer(scene, world, id) {
    const gltf = await loader.loadAsync('assets/basketball.glb');
    const playerMesh = gltf.scene;

    playerMesh.traverse(child => { /* ... unchanged ... */ });
    playerMesh.scale.set(config.playerSize, config.playerSize, config.playerSize);
    scene.add(playerMesh);

    const nameTag = createNameTag(id);
    nameTag.position.y = config.playerSize + 0.7; 
    playerMesh.add(nameTag);

    const playerShape = new CANNON.Sphere(config.playerSize);
    const playerBody = new CANNON.Body({
        mass: config.playerMass,
        shape: playerShape,
        position: new CANNON.Vec3(0, config.planetRadius + 3, 0),
        linearDamping: 0.5,
        angularDamping: 0.5,
        allowSleep: false,
    });
    
    // NEW: Attach the ID directly to the physics body for easy identification.
    playerBody.customId = id;

    world.addBody(playerBody);
    return new PhysicsObject(playerMesh, playerBody);
}

/**
 * Asynchronously loads the GLB model for a non-player character with a name tag.
 * @param {THREE.Scene} scene
 * @param {CANNON.World} world
 * @param {THREE.Vector3} position
 * @param {string} id The unique identifier and name for the other player.
 * @returns {Promise<PhysicsObject>}
 */
export async function createOtherPlayer(scene, world, position, id) {
    const gltf = await loader.loadAsync('assets/basketball2.glb');
    const otherPlayerMesh = gltf.scene;
    const size = 0.25;

    otherPlayerMesh.traverse(child => { /* ... unchanged ... */ });
    otherPlayerMesh.scale.set(size, size, size);
    scene.add(otherPlayerMesh);
    
    const nameTag = createNameTag(id);
    nameTag.position.y = size + 0.7;
    otherPlayerMesh.add(nameTag);

    const otherPlayerShape = new CANNON.Sphere(size);
    const otherPlayerBody = new CANNON.Body({
        mass: 1,
        shape: otherPlayerShape,
        position: new CANNON.Vec3().copy(position),
        linearDamping: 0.1,
        angularDamping: 0.5,
    });

    // NEW: Also tag the "other players" with their ID.
    otherPlayerBody.customId = id;

    world.addBody(otherPlayerBody);
    return new PhysicsObject(otherPlayerMesh, otherPlayerBody);
}

/**
 * Asynchronously loads the hoop model and creates a static SENSOR body for it.
 * @param {THREE.Scene} scene
 * @param {CANNON.World} world
 * @param {THREE.Vector3} position Where to place the hoop.
 * @param {THREE.Quaternion} quaternion The orientation of the hoop.
 * @returns {Promise<PhysicsObject>}
 */
export async function createHoop(scene, world, position, quaternion) {
    const gltf = await loader.loadAsync('assets/hoop.glb');
    const hoopMesh = gltf.scene;

    hoopMesh.traverse(child => { /* ... unchanged ... */ });
    hoopMesh.scale.set(1.5, 1.5, 1.5);
    scene.add(hoopMesh);

    const hoopShape = new CANNON.Box(new CANNON.Vec3(0.9, 1.8, 0.6));
    const hoopBody = new CANNON.Body({
        mass: 0,
        shape: hoopShape,
        position: new CANNON.Vec3().copy(position),
        quaternion: new CANNON.Quaternion().copy(quaternion),
    });

    // MODIFIED: Make the hoop a "sensor" or "trigger".
    // It will detect collisions but will not produce a physical response.
    // Objects will pass right through it.
    hoopBody.collisionResponse = false;

    // NEW: Add an event listener to the hoop's body.
    hoopBody.addEventListener('collide', (event) => {
        // 'event.body' is the *other* body involved in the collision.
        const otherBody = event.body;

        // Check if the other body is a player (by checking for our custom property).
        if (otherBody.customId) {
            console.log(`Hoop collision detected with: ${otherBody.customId}`);
        }
    });

    world.addBody(hoopBody);
    return new PhysicsObject(hoopMesh, hoopBody);
}