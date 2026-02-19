// ============================================================
//  3D Interactive Parallax App
//  Inputs: Mouse | Device Gyroscope | Face Detection (Webcam)
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── State ──────────────────────────────────────────────────
const state = {
  mouse: { x: 0, y: 0 },
  target: { x: 0, y: 0 },
  current: { x: 0, y: 0 },
  mode: 'mouse', // 'mouse' | 'gyro' | 'face'
  faceDetectorReady: false,
  faceLoading: false,
  gyroAvailable: false,
  clock: new THREE.Clock(),
};

// ─── Three.js Setup ─────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── Post Processing (Bloom) ──────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength
  0.4,   // radius
  0.6    // threshold
);
composer.addPass(bloomPass);

// ─── Lighting ──────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.6);
scene.add(ambientLight);

const lightsConfig = [
  { color: 0x7c5cfc, pos: [10, 10, 15], intensity: 2 },
  { color: 0x00e5ff, pos: [-12, -8, 10], intensity: 1.8 },
  { color: 0xff6b9d, pos: [5, -12, 12], intensity: 1.5 },
  { color: 0xffd93d, pos: [-8, 8, 8], intensity: 1 },
];

const pointLights = lightsConfig.map(l => {
  const light = new THREE.PointLight(l.color, l.intensity, 60);
  light.position.set(...l.pos);
  scene.add(light);
  return light;
});

// ─── Materials ──────────────────────────────────────────────
function glassMaterial(color, opacity = 0.35) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.15,
    transmission: 0.6,
    thickness: 1.5,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}

function wireframeMaterial(color) {
  return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.3 });
}

function glowMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
  });
}

// ─── Parallax Layers ────────────────────────────────────────
const layers = [
  { depth: -20, speed: 0.15, objects: [] },
  { depth: -10, speed: 0.3,  objects: [] },
  { depth: 0,   speed: 0.5,  objects: [] },
  { depth: 8,   speed: 0.75, objects: [] },
  { depth: 15,  speed: 1.0,  objects: [] },
];

function addObj(layerIdx, geo, mat, pos, rotSpeed) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], layers[layerIdx].depth + (pos[2] || 0));
  scene.add(mesh);
  layers[layerIdx].objects.push({ mesh, rotSpeed, basePos: mesh.position.clone() });
}

// Layer 0 — Far background: large wireframe shapes
addObj(0, new THREE.IcosahedronGeometry(4, 1), wireframeMaterial(0x7c5cfc),
  [-8, 5, 0], { x: 0.002, y: 0.003, z: 0.001 });
addObj(0, new THREE.OctahedronGeometry(3.5, 0), wireframeMaterial(0x00e5ff),
  [10, -4, -5], { x: 0.003, y: 0.002, z: 0.002 });
addObj(0, new THREE.TorusGeometry(5, 0.3, 8, 40), wireframeMaterial(0xff6b9d),
  [0, -8, -3], { x: 0.001, y: 0.004, z: 0 });

// Layer 1 — Mid background: glowing shapes
addObj(1, new THREE.TorusKnotGeometry(2, 0.5, 80, 12, 2, 3), glowMaterial(0x7c5cfc),
  [7, 6, 0], { x: 0.004, y: 0.005, z: 0.002 });
addObj(1, new THREE.DodecahedronGeometry(2.2, 0), glassMaterial(0x00e5ff, 0.4),
  [-9, -3, 0], { x: 0.003, y: 0.004, z: 0.001 });

// Layer 2 — Mid ground: hero objects
addObj(2, new THREE.IcosahedronGeometry(2.8, 0), glassMaterial(0x9d7cfc, 0.5),
  [0, 0, 0], { x: 0.005, y: 0.006, z: 0.003 });
addObj(2, new THREE.TetrahedronGeometry(1.8, 0), glassMaterial(0xff6b9d, 0.45),
  [-5, 4, 2], { x: 0.006, y: 0.003, z: 0.004 });
addObj(2, new THREE.OctahedronGeometry(1.5, 0), glowMaterial(0x00e5ff),
  [6, -3, 1], { x: 0.004, y: 0.007, z: 0.002 });

// Layer 3 — Near: accent shapes
addObj(3, new THREE.ConeGeometry(1, 2.5, 4), glassMaterial(0xffd93d, 0.5),
  [-4, -5, 0], { x: 0.007, y: 0.005, z: 0.003 });
addObj(3, new THREE.TorusGeometry(1.2, 0.35, 16, 40), glowMaterial(0x7c5cfc),
  [5, 5, 0], { x: 0.005, y: 0.008, z: 0.004 });

// Layer 4 — Closest: tiny floating gems
[
  { geo: new THREE.OctahedronGeometry(0.6, 0), pos: [-3, 3, 0], color: 0x00e5ff },
  { geo: new THREE.TetrahedronGeometry(0.5, 0), pos: [4, -2, 2], color: 0xff6b9d },
  { geo: new THREE.IcosahedronGeometry(0.4, 0), pos: [-6, -1, 1], color: 0xffd93d },
  { geo: new THREE.OctahedronGeometry(0.5, 0), pos: [2, 6, 0], color: 0x7c5cfc },
].forEach(s => {
  addObj(4, s.geo, glowMaterial(s.color), s.pos, {
    x: 0.008 + Math.random() * 0.005,
    y: 0.01 + Math.random() * 0.005,
    z: 0.006,
  });
});

// ─── Particle Field ─────────────────────────────────────────
const PARTICLE_COUNT = 600;
const particlesGeo = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 80;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10;
  sizes[i] = Math.random() * 2 + 0.5;
}

particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.PointsMaterial({
  color: 0xaaaaff,
  size: 0.12,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});

const particles = new THREE.Points(particlesGeo, particleMat);
scene.add(particles);

// ─── Floating ring decorations ──────────────────────────────
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8 + i * 5, 0.04, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0x7c5cfc, transparent: true, opacity: 0.06 })
  );
  ring.position.z = -25 + i * 5;
  ring.rotation.x = Math.PI * 0.3 * i;
  scene.add(ring);
  layers[0].objects.push({ mesh: ring, rotSpeed: { x: 0, y: 0, z: 0.001 + i * 0.0005 }, basePos: ring.position.clone() });
}

// ─── Mouse Tracking ─────────────────────────────────────────
window.addEventListener('mousemove', (e) => {
  if (state.mode !== 'mouse') return;
  state.target.x = (e.clientX / window.innerWidth - 0.5) * 2;
  state.target.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// ─── Device Orientation (Gyroscope) ─────────────────────────
function initGyro() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
        state.gyroAvailable = true;
      }
    }).catch(() => {});
  } else if ('DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', handleOrientation);
    state.gyroAvailable = true;
  }
}

function handleOrientation(e) {
  if (state.mode !== 'gyro') return;
  const gamma = e.gamma || 0;
  const beta  = e.beta || 0;
  state.target.x = THREE.MathUtils.clamp(gamma / 45, -1, 1);
  state.target.y = THREE.MathUtils.clamp((beta - 45) / 45, -1, 1);
}

// ─── Face Detection (Lazy-loaded) ───────────────────────────
let faceModel = null;
let videoEl = null;
let faceAnimId = null;

async function loadFaceDetection() {
  if (state.faceDetectorReady || state.faceLoading) return state.faceDetectorReady;
  state.faceLoading = true;

  const hintEl = document.getElementById('hint-text');
  if (hintEl) hintEl.textContent = 'Loading face detection model...';

  try {
    const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.17.0/+esm');
    await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.17.0/+esm');
    await tf.ready();

    const faceLandmarks = await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.5/+esm');
    faceModel = await faceLandmarks.createDetector(
      faceLandmarks.SupportedModels.MediaPipeFaceMesh,
      { runtime: 'tfjs', refineLandmarks: false, maxFaces: 1 }
    );
    state.faceDetectorReady = true;
    state.faceLoading = false;
    return true;
  } catch (err) {
    console.warn('Face detection init failed:', err);
    state.faceLoading = false;
    if (hintEl) hintEl.textContent = 'Face detection unavailable';
    return false;
  }
}

async function startFaceTracking() {
  if (!state.faceDetectorReady || !faceModel) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' }
    });
    videoEl = document.getElementById('webcam-video');
    videoEl.srcObject = stream;
    await videoEl.play();

    document.getElementById('webcam-preview').classList.add('visible');

    async function detectLoop() {
      if (state.mode !== 'face') return;
      try {
        const faces = await faceModel.estimateFaces(videoEl);
        if (faces.length > 0) {
          const noseTip = faces[0].keypoints.find(k => k.name === 'noseTip') || faces[0].keypoints[1];
          if (noseTip) {
            const nx = -(noseTip.x / 320 - 0.5) * 2;
            const ny = -(noseTip.y / 240 - 0.5) * 2;
            state.target.x = THREE.MathUtils.clamp(nx * 1.5, -1, 1);
            state.target.y = THREE.MathUtils.clamp(ny * 1.5, -1, 1);
          }
        }
      } catch (e) { /* skip frame */ }
      faceAnimId = requestAnimationFrame(detectLoop);
    }
    detectLoop();
    return true;
  } catch (err) {
    console.warn('Webcam access denied:', err);
    return false;
  }
}

function stopFaceTracking() {
  if (faceAnimId) cancelAnimationFrame(faceAnimId);
  if (videoEl && videoEl.srcObject) {
    videoEl.srcObject.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  }
  document.getElementById('webcam-preview')?.classList.remove('visible');
}

// ─── Mode Switching ─────────────────────────────────────────
async function setMode(mode) {
  if (mode === state.mode) return;

  // Clean up previous mode
  if (state.mode === 'face') stopFaceTracking();

  state.mode = mode;
  state.target.x = 0;
  state.target.y = 0;

  // Update badges
  document.querySelectorAll('.mode-badge').forEach(b => b.classList.remove('active'));
  const activeBadge = document.getElementById(`mode-${mode}`);
  if (activeBadge) activeBadge.classList.add('active');

  // Update hint text
  const hints = {
    mouse: 'Move your cursor to explore the scene',
    gyro: 'Tilt your device to explore',
    face: 'Move your head to shift perspective',
  };
  const hintEl = document.getElementById('hint-text');
  if (hintEl) hintEl.textContent = hints[mode] || '';

  // Activate new mode
  if (mode === 'face') {
    const loaded = await loadFaceDetection();
    if (loaded) {
      await startFaceTracking();
      if (hintEl) hintEl.textContent = hints.face;
    } else {
      // Fallback to mouse if face detection fails
      setMode('mouse');
    }
  } else if (mode === 'gyro') {
    initGyro();
  }
}

// ─── Event Listeners for Mode Badges ────────────────────────
document.getElementById('mode-mouse')?.addEventListener('click', () => setMode('mouse'));
document.getElementById('mode-gyro')?.addEventListener('click', () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response === 'granted') setMode('gyro');
    });
  } else {
    setMode('gyro');
  }
});
document.getElementById('mode-face')?.addEventListener('click', () => setMode('face'));

// Set initial active badge
document.getElementById('mode-mouse')?.classList.add('active');

// ─── Animation Loop ─────────────────────────────────────────
const PARALLAX_STRENGTH = 6;
const LERP_SPEED = 0.04;

function animate() {
  requestAnimationFrame(animate);
  const elapsed = state.clock.getElapsedTime();

  // Smooth interpolation toward target
  state.current.x += (state.target.x - state.current.x) * LERP_SPEED;
  state.current.y += (state.target.y - state.current.y) * LERP_SPEED;

  // Camera subtle sway
  camera.position.x = state.current.x * 2;
  camera.position.y = state.current.y * 1.5;
  camera.lookAt(0, 0, 0);

  // Move layers with parallax
  layers.forEach(layer => {
    layer.objects.forEach(obj => {
      obj.mesh.position.x = obj.basePos.x + state.current.x * PARALLAX_STRENGTH * layer.speed;
      obj.mesh.position.y = obj.basePos.y + state.current.y * PARALLAX_STRENGTH * layer.speed;
      obj.mesh.rotation.x += obj.rotSpeed.x;
      obj.mesh.rotation.y += obj.rotSpeed.y;
      obj.mesh.rotation.z += obj.rotSpeed.z;
      obj.mesh.position.y += Math.sin(elapsed * 0.5 + obj.basePos.x) * 0.004;
    });
  });

  // Particle drift
  particles.rotation.y += 0.0002;
  particles.rotation.x += 0.0001;
  particles.position.x = state.current.x * 1.5;
  particles.position.y = state.current.y * 1;

  // Lights gentle orbit
  pointLights.forEach((light, i) => {
    const angle = elapsed * 0.2 + i * Math.PI * 0.5;
    const r = 12 + i * 2;
    light.position.x = Math.cos(angle) * r + state.current.x * 3;
    light.position.y = Math.sin(angle * 0.7) * r * 0.5 + state.current.y * 3;
  });

  composer.render();
}

// ─── Start ──────────────────────────────────────────────────
// Hide loading screen after a short delay
setTimeout(() => {
  document.getElementById('loading-screen')?.classList.add('hidden');
}, 1200);

// Start animation loop immediately
animate();

// ─── Resize ─────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
