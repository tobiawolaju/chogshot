// js/environment.js
import * as THREE from 'three';
import { config } from './config.js';

let cloudClusters = [];
// This will hold a reference to our background material so we can update it later.
let backgroundMaterial;

/**
 * Initializes all environmental elements like lighting, stars, and clouds.
 * @param {THREE.Scene} scene The scene to add elements to.
 */
export function setupEnvironment(scene) {
    setupLighting(scene);
    setupBackground(scene);
    setupStars(scene);
    setupClouds(scene);
}

/**
 * Called in the main animation loop to update animated environment elements.
 * @param {number} delta Time since last frame.
 */
export function updateEnvironment(delta) {
    // Animate clouds
    cloudClusters.forEach(cluster => {
        if (cluster.tick) {
            cluster.tick(delta);
        }
    });
}

/**
 * Updates any environment elements that depend on screen size.
 * This function should be called from the main 'resize' event listener.
 */
export function updateEnvironmentOnResize() {
    if (backgroundMaterial) {
        // Update the shader uniform with the new window height
        backgroundMaterial.uniforms.vh.value = window.innerHeight;
    }
}


// --- Internal Helper Functions ---

function setupLighting(scene) {
    const lightIntensity = 1;
    const lightDistance = 1;
    const lights = [
        new THREE.DirectionalLight(0xffffff, lightIntensity / 2),
        new THREE.DirectionalLight(0x00bcd4, lightIntensity),
        new THREE.DirectionalLight(0xffed3f, lightIntensity),
        new THREE.DirectionalLight(0xffffff, lightIntensity)
    ];
    lights[0].position.set(lightDistance, 10, 0);
    lights[1].position.set(-lightDistance, 100, 0);
    lights[2].position.set(0, lightDistance, 20);
    lights[3].position.set(200, -lightDistance, 0);
    lights.forEach(light => scene.add(light));
    scene.add(new THREE.AmbientLight(0x444444));
}

function setupBackground(scene) {
    // Assign the material to our module-level variable so it can be accessed later.
    backgroundMaterial = new THREE.ShaderMaterial({
        vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            uniform vec3 topColor, middleColor, bottomColor; uniform float vh;
            void main() {
                float g = gl_FragCoord.y / vh;
                vec3 c = g < 0.5 ? mix(bottomColor, middleColor, g*2.0) : mix(middleColor, topColor, (g-0.5)*2.0);
                gl_FragColor = vec4(c, 1.0);
            }
        `,
        uniforms: {
            topColor: { value: new THREE.Color(0xE4EFFF) },
            middleColor: { value: new THREE.Color(0xFFFFFF) },
            bottomColor: { value: new THREE.Color(0xF7DDFF) },
            vh: { value: window.innerHeight } // Initial value
        },
        depthWrite: false, depthTest: false, side: THREE.DoubleSide
    });
    // Use the material for the background mesh.
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backgroundMaterial));
}

function setupStars(scene) {
    const starGeo = new THREE.TetrahedronGeometry(2, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stars = new THREE.Group();
    for (let i = 0; i < 500; i++) {
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        star.position.multiplyScalar(90 + Math.random() * 700);
        star.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        stars.add(star);
    }
    scene.add(stars);
}

function setupClouds(scene) {
    const positions = [
        new THREE.Vector3(2, 5, 1), new THREE.Vector3(-3, -2, 4),
        new THREE.Vector3(4, -3, -5), new THREE.Vector3(-5, 2, -2),
        new THREE.Vector3(0, -4, 5)
    ];
    cloudClusters = positions.map(pos => addCloudCluster(scene, pos));
}

function addCloudCluster(scene, pos) {
    const cloudGroup = new THREE.Group();
    const up = pos.clone().normalize();
    const cloudDistance = config.planetRadius + 5;
    const center = up.multiplyScalar(cloudDistance);
    const spiralTightness = 0.3, spiralGrowth = 0.2, totalPuffs = 60, spiralTurns = 4;

    for (let i = 0; i < totalPuffs; i++) {
        const angle = (i / totalPuffs) * spiralTurns * Math.PI * 2;
        const r = spiralTightness * Math.exp(spiralGrowth * angle);
        const x = r * Math.cos(angle);
        const y = (i / totalPuffs) * 4 - 2;
        const z = r * Math.sin(angle);
        const puffPosition = new THREE.Vector3(x, y, z).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.8
        ));
        const puff = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.2, 1),
            createCloudShaderMaterial()
        );
        puff.position.copy(center.clone().add(puffPosition));
        puff.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const scale = 0.8 + Math.random() * 0.5;
        puff.scale.set(scale, scale * 0.8, scale);
        cloudGroup.add(puff);
    }
    cloudGroup.tick = delta => cloudGroup.rotation.y += 0.05 * delta;
    scene.add(cloudGroup);
    return cloudGroup;
}


function createCloudShaderMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }, cloudsSpeed: { value: 0.2 }, cloudsDirection: { value: 0.2 },
            cloudsScale: { value: 1.0 }, cloudsCutoff: { value: 0.3 }, cloudsFuzziness: { value: 0.5 },
            cloudsColor: { value: new THREE.Color(1.0, 1.0, 1.0) }, edgeFade: { value: 0.25 }
        },
        vertexShader: `
            varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float time, cloudsSpeed, cloudsDirection, cloudsScale, cloudsCutoff, cloudsFuzziness, edgeFade;
            uniform vec3 cloudsColor;
            float hash(vec2 p) { return fract(sin(dot(p ,vec2(127.1,311.7))) * 43758.5453); }
            float noise(vec2 p){
                vec2 i = floor(p), f = fract(p);
                float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
                vec2 u = f*f*(3.0-2.0*f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            float edge(vec2 uv) {
                vec2 f = smoothstep(vec2(0.0), vec2(edgeFade), uv);
                f *= smoothstep(vec2(0.0), vec2(edgeFade), 1.0 - uv);
                return f.x * f.y;
            }
            void main() {
                vec2 uv = vUv * cloudsScale;
                vec2 dir = vec2(sin(cloudsDirection * 6.2831), cos(cloudsDirection * 6.2831));
                vec2 moved = uv + dir * time * cloudsSpeed * 0.01;
                float n = (noise(moved * 1.0) + noise(moved * 2.0) + noise(moved * 4.0)) / 3.0;
                float alpha = smoothstep(cloudsCutoff, cloudsCutoff + cloudsFuzziness, n);
                gl_FragColor = vec4(cloudsColor, alpha * edge(vUv));
            }
        `,
        transparent: true, depthWrite: false
    });
}