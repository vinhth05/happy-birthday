import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const CONFIG = {
  heroSignature: "[Your Name]",
  heroStars: createHeartLayout()
};

const refs = {
  canvas: document.getElementById("scene"),
  introPanel: document.getElementById("intro-panel"),
  memoryCard: document.getElementById("memory-card"),
  progressCount: document.getElementById("progress-count"),
  signatureName: document.getElementById("signature-name"),
  resetBtn: document.getElementById("reset-btn"),
  musicToggle: document.getElementById("music-toggle"),
  musicLabel: document.getElementById("music-label"),
  hintStrip: document.getElementById("hint-strip")
};

refs.signatureName.textContent = CONFIG.heroSignature;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000812, 0.035);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0.18, 0.02, 7.4);

const renderer = new THREE.WebGLRenderer({
  canvas: refs.canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.55, 0.38, 0.16);
composer.addPass(bloomPass);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const pointerTarget = new THREE.Vector2(0, 0);
const cameraOrbit = new THREE.Vector2(0, 0);
const cameraOrbitTarget = new THREE.Vector2(0, 0);

const state = {
  selected: [],
  hoveredStar: null,
  isComplete: false,
  started: false,
  cameraRadius: 7.4,
  targetRadius: 7.4,
  baseAngle: 0.22,
  explosionActive: false,
  explosionTime: 0,
  audioContext: null,
  audioOn: false,
  audioNodes: null
};

function createHeartLayout() {
  const points = [];
  const samples = [-2.45, -2.0, -1.42, -0.45, 0.32, 1.1, 2.38];

  samples.forEach((t, index) => {
    const x = 0.042 * 16 * Math.pow(Math.sin(t), 3);
    const y = 0.042 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const z = [0.22, 0.08, -0.08, -0.18, -0.06, 0.1, 0.26][index];
    points.push(new THREE.Vector3(x * 1.52, y * 1.36, z));
  });

  points[0].x -= 0.1;
  points[1].x -= 0.16;
  points[2].x -= 0.08;
  points[3].y -= 0.06;
  points[4].y -= 0.04;
  points[5].x += 0.12;
  points[6].x += 0.08;

  return points;
}

const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

const ambientLight = new THREE.AmbientLight(0x9db8d6, 0.8);
scene.add(ambientLight);
const keyLight = new THREE.PointLight(0xffe6b8, 1.8, 28, 2);
keyLight.position.set(0, 0.8, 4.8);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xb7d8ff, 0.95, 30, 2);
rimLight.position.set(-2.6, -1.2, 5.8);
scene.add(rimLight);

const starField = createStarField(6200);
scene.add(starField.points);

const heroCluster = new THREE.Group();
scene.add(heroCluster);

const heroStarMeshes = createHeroStars();
heroStarMeshes.forEach((mesh) => heroCluster.add(mesh.group));

let connectionLine = null;
let sparkleBurst = null;
let sparklePool = null;
let sparkleMaterial = null;

const introTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
introTimeline
  .from(refs.introPanel, { autoAlpha: 0, y: 20, duration: 1.05 })
  .from(refs.hintStrip, { autoAlpha: 0, y: 10, duration: 0.8 }, "-=0.5")
  .from(refs.musicToggle, { autoAlpha: 0, x: 24, duration: 0.8 }, "-=0.55")
  .from(refs.resetBtn, { autoAlpha: 0, x: -24, duration: 0.8 }, "-=0.7");

refs.progressCount.textContent = `0 / ${CONFIG.heroStars.length}`;
refs.memoryCard.classList.remove("is-visible");

function createStarField(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);

  const palette = [
    new THREE.Color(0xf6fbff),
    new THREE.Color(0xaed7ff),
    new THREE.Color(0xffc0dd)
  ];

  for (let i = 0; i < count; i += 1) {
    const radius = 24 + Math.pow(Math.random(), 0.34) * 92;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi) - 10;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const tint = palette[Math.floor(Math.random() * palette.length)].clone();
    tint.offsetHSL(THREE.MathUtils.randFloatSpread(0.03), THREE.MathUtils.randFloat(-0.08, 0.05), THREE.MathUtils.randFloat(-0.05, 0.04));

    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;

    sizes[i] = THREE.MathUtils.randFloat(0.65, 2.1);
    twinkles[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkles, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aTwinkle;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      uniform float uPixelRatio;
      void main() {
        vColor = aColor;
        vTwinkle = aTwinkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float pulse = 0.72 + 0.28 * sin(uTime * 1.18 + aTwinkle * 6.28318);
        gl_PointSize = aSize * pulse * uPixelRatio * (280.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float core = smoothstep(0.5, 0.0, dist);
        float pulse = 0.78 + 0.22 * sin(uTime * 1.52 + vTwinkle * 8.0);
        vec3 color = vColor;
        gl_FragColor = vec4(color, core * pulse);
        if (gl_FragColor.a < 0.015) discard;
      }
    `
  });

  return {
    points: new THREE.Points(geometry, material),
    material,
    geometry
  };
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,241,184,0.95)");
  gradient.addColorStop(0.45, "rgba(255,210,120,0.5)");
  gradient.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHeroStars() {
  const glowTexture = createGlowTexture();
  const stars = [];
  const geometry = new THREE.IcosahedronGeometry(0.12, 1);

  CONFIG.heroStars.forEach((position, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5d780,
      emissive: 0xffd36a,
      emissiveIntensity: 2.2,
      roughness: 0.22,
      metalness: 0.06,
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { index, baseScale: 1, active: false };

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffefbb,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    sprite.scale.set(1.55, 1.55, 1.55);
    sprite.position.copy(position);

    const light = new THREE.PointLight(0xffe082, 1.2, 6, 2);
    light.position.copy(position);

    const group = new THREE.Group();
    group.add(sprite);
    group.add(mesh);
    group.add(light);

    stars.push({ mesh, sprite, light, group, position });
  });

  return stars;
}

function updateHeroStarVisual(star, hovered = false, active = false) {
  const targetScale = active ? 1.5 : hovered ? 1.28 : 1;
  const targetSpriteScale = active ? 2.25 : hovered ? 1.9 : 1.55;
  const emissive = active ? 3.4 : hovered ? 3.1 : 2.2;
  const spriteOpacity = active ? 1 : hovered ? 0.98 : 0.88;

  gsap.to(star.mesh.scale, {
    x: targetScale,
    y: targetScale,
    z: targetScale,
    duration: 0.22,
    ease: "power2.out"
  });

  gsap.to(star.sprite.scale, {
    x: targetSpriteScale,
    y: targetSpriteScale,
    z: targetSpriteScale,
    duration: 0.22,
    ease: "power2.out"
  });

  gsap.to(star.mesh.material, {
    emissiveIntensity: emissive,
    opacity: active ? 1 : 0.98,
    duration: 0.22,
    ease: "power2.out"
  });

  gsap.to(star.sprite.material, {
    opacity: spriteOpacity,
    duration: 0.22,
    ease: "power2.out"
  });
}

function rebuildConnectionLine() {
  if (connectionLine) {
    scene.remove(connectionLine);
    connectionLine.geometry.dispose();
    connectionLine.material.dispose();
    connectionLine = null;
  }

  if (state.selected.length < 2) return;

  const points = state.selected.map((star) => star.position.clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x95ecff,
    dashSize: 0.34,
    gapSize: 0.18,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  connectionLine = new THREE.Line(geometry, material);
  connectionLine.computeLineDistances();
  scene.add(connectionLine);

  gsap.fromTo(material, { opacity: 0 }, { opacity: 0.96, duration: 0.45, ease: "power2.out" });
}

function animateCameraTo(target, duration = 0.9, onUpdate) {
  return gsap.to(camera.position, {
    ...target,
    duration,
    ease: "power3.inOut",
    onUpdate
  });
}

function updateProgress() {
  refs.progressCount.textContent = `${state.selected.length} / ${CONFIG.heroStars.length}`;
}

function getIntersections(event) {
  const rect = refs.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(heroStarMeshes.map((star) => star.mesh), false);
}

function pickStar(event) {
  const intersections = getIntersections(event);
  if (!intersections.length) return null;
  return heroStarMeshes.find((star) => star.mesh === intersections[0].object) || null;
}

function onPointerMove(event) {
  const rect = refs.canvas.getBoundingClientRect();
  pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerTarget.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  const hovered = pickStar(event);
  if (hovered !== state.hoveredStar) {
    if (state.hoveredStar && !state.hoveredStar.mesh.userData.active) {
      updateHeroStarVisual(state.hoveredStar, false, false);
    }

    state.hoveredStar = hovered;

    if (state.hoveredStar && !state.hoveredStar.mesh.userData.active) {
      updateHeroStarVisual(state.hoveredStar, true, false);
    }
  }
}

function onPointerDown(event) {
  const star = pickStar(event);
  if (!star) return;
  if (star.mesh.userData.active) return;

  state.started = true;
  star.mesh.userData.active = true;
  state.selected.push(star);
  updateHeroStarVisual(star, false, true);
  rebuildConnectionLine();
  updateProgress();
  flashHint(`Connected ${state.selected.length} of ${CONFIG.heroStars.length} stars.`);

  if (state.selected.length === CONFIG.heroStars.length) {
    completeConstellation();
  }
}

function flashHint(message) {
  refs.hintStrip.textContent = message;
  gsap.killTweensOf(refs.hintStrip);
  gsap.fromTo(refs.hintStrip, { y: 0 }, { y: -2, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" });
}

function createSparkleBurst() {
  const count = 1800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    const tint = new THREE.Color().setHSL(0.11 + Math.random() * 0.08, 0.88, 0.66 + Math.random() * 0.2);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;

    sizes[i] = THREE.MathUtils.randFloat(0.07, 0.22);
    velocities[i * 3] = THREE.MathUtils.randFloatSpread(10.5);
    velocities[i * 3 + 1] = THREE.MathUtils.randFloat(2.5, 11.5);
    velocities[i * 3 + 2] = THREE.MathUtils.randFloatSpread(10.5);
    lifetimes[i] = THREE.MathUtils.randFloat(1.2, 2.4);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOpacity: { value: 0 }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 420.0 * (1.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float dist = length(p);
        float alpha = smoothstep(0.5, 0.0, dist);
        float sparkle = 0.76 + 0.24 * sin((p.x + p.y) * 24.0);
        gl_FragColor = vec4(vColor, alpha * sparkle * uOpacity);
        if (gl_FragColor.a < 0.02) discard;
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  scene.add(points);

  return {
    points,
    geometry,
    material,
    positions,
    velocities,
    lifetimes,
    count,
    active: false,
    reset() {
      const pos = this.geometry.attributes.position.array;
      for (let i = 0; i < this.count; i += 1) {
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = 0;
        this.lifetimes[i] = THREE.MathUtils.randFloat(1.2, 2.4);
        this.velocities[i * 3] = THREE.MathUtils.randFloatSpread(10.5);
        this.velocities[i * 3 + 1] = THREE.MathUtils.randFloat(2.5, 11.5);
        this.velocities[i * 3 + 2] = THREE.MathUtils.randFloatSpread(10.5);
      }
      this.geometry.attributes.position.needsUpdate = true;
      this.material.uniforms.uOpacity.value = 0;
      this.points.visible = false;
      this.active = false;
      this.time = 0;
    },
    burst() {
      this.points.visible = true;
      this.active = true;
      this.time = 0;
      this.material.uniforms.uOpacity.value = 1;
      const pos = this.geometry.attributes.position.array;
      for (let i = 0; i < this.count; i += 1) {
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = 0;
      }
      this.geometry.attributes.position.needsUpdate = true;
    },
    update(delta) {
      if (!this.active) return;
      this.time += delta;
      const pos = this.geometry.attributes.position.array;
      for (let i = 0; i < this.count; i += 1) {
        const life = this.lifetimes[i];
        if (life <= 0) continue;

        pos[i * 3] += this.velocities[i * 3] * delta;
        pos[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
        pos[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
        this.velocities[i * 3 + 1] -= 4.2 * delta;
        this.lifetimes[i] -= delta;
      }
      this.geometry.attributes.position.needsUpdate = true;
      this.material.uniforms.uOpacity.value = Math.max(0, 1 - this.time / 2.4);
      if (this.time > 2.6) {
        this.active = false;
        this.points.visible = false;
      }
    }
  };
}

sparklePool = createSparkleBurst();

function completeConstellation() {
  if (state.isComplete) return;
  state.isComplete = true;
  refs.hintStrip.textContent = "Chòm tim đã hoàn thành.";
  gsap.to(refs.introPanel, { autoAlpha: 0.18, duration: 0.6, ease: "power2.out" });

  const fly = gsap.timeline({ defaults: { ease: "power3.inOut" } });
  fly
    .to(state, { targetRadius: 3.4, duration: 1.25, ease: "power3.inOut" }, 0)
    .to(camera.position, { x: 0.08, y: 0.02, z: 2.15, duration: 1.25, ease: "power3.inOut", onUpdate: () => camera.lookAt(0, 0, 0) }, 0)
    .to(bloomPass, { strength: 2.9, radius: 0.5, duration: 1.1 }, 0)
    .to(connectionLine.material, { opacity: 1, duration: 0.5 }, 0)
    .to(refs.hintStrip, { autoAlpha: 0, duration: 0.45 }, 0.5);

  setTimeout(() => {
    sparklePool.burst();
    bloomPass.strength = 3.15;
    gsap.to(camera.position, {
      z: -0.95,
      x: 0,
      y: 0,
      duration: 1.05,
      ease: "power3.inOut",
      onUpdate: () => camera.lookAt(0, 0, 0)
    });
    gsap.fromTo(
      refs.memoryCard,
      { autoAlpha: 0, y: 24, scale: 0.96 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1.2,
        ease: "power3.out",
        onStart: () => refs.memoryCard.classList.add("is-visible")
      }
    );
  }, 700);
}

function initAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    refs.musicToggle.disabled = true;
    refs.musicLabel.textContent = "Không có nhạc";
    return;
  }

  state.audioContext = new AudioContextClass();

  const master = state.audioContext.createGain();
  master.gain.value = 0;

  const wet = state.audioContext.createGain();
  wet.gain.value = 0.24;

  const dry = state.audioContext.createGain();
  dry.gain.value = 0.78;

  const shimmerFilter = state.audioContext.createBiquadFilter();
  shimmerFilter.type = "lowpass";
  shimmerFilter.frequency.value = 1500;
  shimmerFilter.Q.value = 0.75;

  const chorusDelay = state.audioContext.createDelay();
  chorusDelay.delayTime.value = 0.028;
  const chorusFeedback = state.audioContext.createGain();
  chorusFeedback.gain.value = 0.18;
  chorusDelay.connect(chorusFeedback).connect(chorusDelay);

  const convolver = state.audioContext.createConvolver();
  convolver.buffer = createReverbImpulse(state.audioContext, 2.8, 2.3);

  wet.connect(convolver);
  convolver.connect(master);
  dry.connect(master);
  master.connect(state.audioContext.destination);

  const chordFrequencies = [110, 138.59, 164.81, 220.0];
  const oscillators = chordFrequencies.map((frequency, index) => {
    const oscillator = state.audioContext.createOscillator();
    oscillator.type = index === 0 ? "sine" : index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index % 2 === 0 ? -6 : 7;

    const gain = state.audioContext.createGain();
    gain.gain.value = index === 0 ? 0.22 : index === 1 ? 0.12 : 0.08;

    oscillator.connect(gain);
    gain.connect(shimmerFilter);
    shimmerFilter.connect(index === 0 ? dry : wet);
    oscillator.start();

    return { oscillator, gain };
  });

  const lfo = state.audioContext.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.14;

  const lfoGain = state.audioContext.createGain();
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  let plumeTimer = null;

  state.audioNodes = {
    master,
    wet,
    dry,
    shimmerFilter,
    chorusDelay,
    chorusFeedback,
    convolver,
    oscillators,
    lfo,
    lfoGain,
    plumeTimer
  };
}

async function toggleMusic() {
  if (!state.audioContext) initAudio();
  if (!state.audioContext || !state.audioNodes) return;

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  const target = state.audioOn ? 0 : 0.12;
  fadeGain(state.audioNodes.master.gain, target, 1.1);
  state.audioOn = !state.audioOn;
  refs.musicToggle.classList.toggle("is-on", state.audioOn);
  refs.musicToggle.setAttribute("aria-pressed", String(state.audioOn));
  refs.musicLabel.textContent = state.audioOn ? "Nhạc bật" : "Nhạc tắt";

  if (state.audioOn) {
    scheduleRomanticPlucks();
  } else if (state.audioNodes?.plumeTimer) {
    clearInterval(state.audioNodes.plumeTimer);
    state.audioNodes.plumeTimer = null;
  }
}

function createReverbImpulse(context, duration, decay) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const buffer = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const n = (length - i) / length;
      buffer[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
    }
  }

  return impulse;
}

function scheduleRomanticPlucks() {
  if (!state.audioNodes || state.audioNodes.plumeTimer) return;

  const noteSet = [220, 277.18, 329.63, 392.0, 440.0];
  const triggerPluck = () => {
    if (!state.audioContext || !state.audioOn) return;

    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    const pan = state.audioContext.createStereoPanner();

    oscillator.type = "triangle";
    oscillator.frequency.value = noteSet[Math.floor(Math.random() * noteSet.length)];
    gain.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, state.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + 1.9);

    pan.pan.value = THREE.MathUtils.randFloatSpread(0.4);
    oscillator.connect(gain).connect(pan).connect(state.audioNodes.wet);
    oscillator.start();
    oscillator.stop(state.audioContext.currentTime + 2.0);
  };

  triggerPluck();
  state.audioNodes.plumeTimer = setInterval(triggerPluck, 2800);
}

function fadeGain(param, target, duration) {
  const start = param.value;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startTime) / (duration * 1000));
    const eased = progress * (2 - progress);
    param.value = start + (target - start) * eased;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function resetExperience() {
  state.selected.length = 0;
  state.hoveredStar = null;
  state.isComplete = false;
  state.started = false;
  state.cameraRadius = 7.4;
  state.targetRadius = 7.4;
  state.baseAngle = 0.22;
  camera.position.set(0.18, 0.02, 7.4);
  camera.lookAt(0, 0, 0);
  cameraOrbit.set(0, 0);
  cameraOrbitTarget.set(0, 0);
  pointer.set(0, 0);
  pointerTarget.set(0, 0);

  heroStarMeshes.forEach((star) => {
    star.mesh.userData.active = false;
    star.mesh.material.emissiveIntensity = 2.2;
    star.mesh.scale.set(1, 1, 1);
    star.sprite.scale.set(1.55, 1.55, 1.55);
    star.sprite.material.opacity = 0.88;
  });

  if (connectionLine) {
    scene.remove(connectionLine);
    connectionLine.geometry.dispose();
    connectionLine.material.dispose();
    connectionLine = null;
  }

  sparklePool.reset();
  bloomPass.strength = 1.55;
  bloomPass.radius = 0.38;
  refs.progressCount.textContent = `0 / ${CONFIG.heroStars.length}`;
  refs.introPanel.style.opacity = "1";
  refs.memoryCard.classList.remove("is-visible");
  gsap.set(refs.memoryCard, { autoAlpha: 0, y: 24, scale: 0.96 });
  gsap.set(refs.hintStrip, { autoAlpha: 1, y: 0 });
  refs.hintStrip.textContent = "Chạm hoặc nhấp vào những ngôi sao vàng để nối thành trái tim.";

  if (state.audioOn) {
    state.audioOn = false;
    refs.musicToggle.classList.remove("is-on");
    refs.musicToggle.setAttribute("aria-pressed", "false");
    refs.musicLabel.textContent = "Nhạc tắt";
    if (state.audioNodes) {
      fadeGain(state.audioNodes.master.gain, 0, 0.6);
      if (state.audioNodes.plumeTimer) {
        clearInterval(state.audioNodes.plumeTimer);
        state.audioNodes.plumeTimer = null;
      }
    }
  }
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const delta = clock.getDelta();

  starField.material.uniforms.uTime.value = elapsed;
  starField.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();

  cameraOrbitTarget.x = pointerTarget.x * 0.28;
  cameraOrbitTarget.y = pointerTarget.y * 0.18;
  cameraOrbit.x += (cameraOrbitTarget.x - cameraOrbit.x) * 0.045;
  cameraOrbit.y += (cameraOrbitTarget.y - cameraOrbit.y) * 0.045;

  if (!state.isComplete) {
    state.baseAngle += delta * 0.012;
    const radius = state.cameraRadius;
    camera.position.x = Math.sin(state.baseAngle + cameraOrbit.x) * radius + pointerTarget.x * 0.14;
    camera.position.z = Math.cos(state.baseAngle + cameraOrbit.x) * radius;
    camera.position.y = cameraOrbit.y * 1.25;
  }

  camera.lookAt(0, 0, 0);

  heroStarMeshes.forEach((star, index) => {
    const active = star.mesh.userData.active;
    const shimmer = 1 + Math.sin(elapsed * 1.35 + index * 0.82) * 0.03;
    if (!active) {
      star.group.rotation.z = Math.sin(elapsed * 0.35 + index) * 0.03;
      star.group.position.z = Math.sin(elapsed * 0.5 + index * 0.4) * 0.06;
      star.mesh.scale.setScalar(shimmer);
      star.sprite.position.z = star.group.position.z;
    } else {
      star.group.rotation.z = Math.sin(elapsed * 0.15 + index) * 0.02;
    }
  });

  if (connectionLine) {
    connectionLine.material.dashOffset -= delta * 0.65;
  }

  sparklePool.update(delta);

  if (state.audioNodes && state.audioOn) {
    const breath = 380 + Math.sin(elapsed * 1.3) * 120;
    state.audioNodes.filter.frequency.value = breath;
  }

  composer.render();
  requestAnimationFrame(animate);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
  starField.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  sparklePool.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

refs.canvas.addEventListener("pointermove", onPointerMove);
refs.canvas.addEventListener("pointerdown", onPointerDown);
refs.canvas.addEventListener("pointerleave", () => {
  if (state.hoveredStar && !state.hoveredStar.mesh.userData.active) {
    updateHeroStarVisual(state.hoveredStar, false, false);
  }
  state.hoveredStar = null;
});

refs.musicToggle.addEventListener("click", () => {
  toggleMusic();
});

refs.resetBtn.addEventListener("click", () => {
  resetExperience();
});

window.addEventListener("resize", onResize);

resetExperience();
requestAnimationFrame(animate);
