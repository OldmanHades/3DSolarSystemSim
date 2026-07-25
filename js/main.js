import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";
import {
  BODIES,
  COMETS,
  FEATURED_ORDER,
  REGIONS,
  REVIEWED_AT,
  SCIENCE_SOURCES
} from "./solarData.js";
import {
  createGlowTexture,
  createRingTexture,
  createStarTexture,
  createTailTexture,
  createTextureSet,
  hashCode,
  mulberry32
} from "./textures.js";

const AU_KM = 149597870.7;
const BASE_DATE_UTC = Date.UTC(2026, 5, 12);
// J2000.0 epoch (2000-01-01 12:00 TT) that the orbital elements are given for.
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const BASE_DAYS_FROM_J2000 = (BASE_DATE_UTC - J2000_UTC) / 86400000;
const TWO_PI = Math.PI * 2;
const UP_Y = new THREE.Vector3(0, 1, 0);

const SPEED_MIN = 0.01;
const SPEED_MAX = 400;
const DEFAULT_SPEED = 1;
// Axial spin is the fastest thing on screen: Earth turns once per simulated day,
// so at even a modest clock rate an uncapped planet strobes into a grey blur.
// Below this rate spin is exact; above it, it saturates instead of aliasing.
const MAX_SPIN_RATE = 1.05;
const SPEED_PRESETS = [
  { label: "1 hr/s", value: 1 / 24 },
  { label: "6 hr/s", value: 0.25 },
  { label: "1 day/s", value: 1 },
  { label: "1 wk/s", value: 7 },
  { label: "1 yr/s", value: 365.25 }
];

const bootStatus = {
  phase: "module-start",
  error: null
};
window.__solarSystemBoot = bootStatus;

function setBootPhase(phase) {
  bootStatus.phase = phase;
}

function recordBootError(error) {
  bootStatus.error = {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ? String(error.stack) : null
  };
  console.error("Solar system startup failed", error);
}

const els = {
  viewport: document.querySelector("#viewport"),
  labels: document.querySelector("#labels"),
  objectList: document.querySelector("#object-list"),
  search: document.querySelector("#search"),
  details: document.querySelector("#details"),
  title: document.querySelector("#selected-title"),
  subtitle: document.querySelector("#selected-subtitle"),
  stats: document.querySelector("#selected-stats"),
  summary: document.querySelector("#selected-summary"),
  detailsList: document.querySelector("#selected-details"),
  sources: document.querySelector("#selected-sources"),
  play: document.querySelector("#play"),
  speed: document.querySelector("#speed"),
  speedValue: document.querySelector("#speed-value"),
  speedPresets: document.querySelector("#speed-presets"),
  date: document.querySelector("#date"),
  track: document.querySelector("#track"),
  labelsToggle: document.querySelector("#labels-toggle"),
  orbitsToggle: document.querySelector("#orbits-toggle"),
  reset: document.querySelector("#reset-view"),
  accuracy: document.querySelector("#accuracy-note")
};

const objectData = new Map();
const parentById = new Map();
const bodyIds = new Set();
const moonIds = new Set();
const regionIds = new Set(REGIONS.map((region) => region.id));
const cometIds = new Set(COMETS.map((comet) => comet.id));

for (const body of BODIES) {
  objectData.set(body.id, body);
  bodyIds.add(body.id);
  for (const moon of body.satellites ?? []) {
    objectData.set(moon.id, moon);
    parentById.set(moon.id, body.id);
    moonIds.add(moon.id);
  }
}

for (const region of REGIONS) objectData.set(region.id, region);
for (const comet of COMETS) objectData.set(comet.id, comet);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#02040a");

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 2400);
const HOME_POSITION = new THREE.Vector3(0, 68, 155);
camera.position.copy(HOME_POSITION);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
// ACES desaturates and greys out bright surfaces, which flattened Saturn's
// bands into one tan disc. The neutral curve rolls off highlights while keeping
// hue, so pale planets keep their banding.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.setAttribute("aria-label", "Interactive 3D solar system canvas");
renderer.domElement.tabIndex = 0;
els.viewport.appendChild(renderer.domElement);

// Cached each resize so the render loop never has to ask the DOM for layout.
const viewportSize = { width: 1, height: 1 };

function getViewportSize() {
  return {
    width: Math.max(1, els.viewport.clientWidth || window.innerWidth),
    height: Math.max(1, els.viewport.clientHeight || window.innerHeight)
  };
}

function getRenderPixelRatio() {
  const size = getViewportSize();
  const mobileCap = size.width < 720 ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, mobileCap);
}

function resizeRenderer() {
  const { width, height } = getViewportSize();
  viewportSize.width = width;
  viewportSize.height = height;
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

resizeRenderer();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.58;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.72;
controls.minDistance = 0.2;
controls.maxDistance = 560;
controls.target.set(0, 0, 0);

// A little ambient keeps night sides readable instead of pure black, but it is
// kept low so the terminator actually reads as a terminator.
const ambientLight = new THREE.AmbientLight("#5d7290", 0.11);
scene.add(ambientLight);

// Sunlight barely falls off across the compressed scene distances: a physical
// inverse-square drop leaves everything past Jupiter unlit. A gentle decay keeps
// the inner system brighter than the outer system while staying legible.
const sunLight = new THREE.PointLight("#fff3dc", 7, 0, 0.3);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight("#7ba0e0", 0.07);
fillLight.position.set(-80, 60, 90);
scene.add(fillLight);

const systemRoot = new THREE.Group();
scene.add(systemRoot);

// Stars ride with the camera so they always read as an infinitely distant sky.
const skyRoot = new THREE.Group();
skyRoot.renderOrder = -1;
scene.add(skyRoot);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastFrameTime = performance.now();
let elapsedSeconds = 0;

const records = new Map();
const labels = new Map();
const labelMetrics = new Map();
const labelCandidates = [];
const panelRects = [];
let labelsRendered = true;
const selectableObjects = [];
const beltRockSystems = [];
const instanceDummy = new THREE.Object3D();
let sunPulse = null;
let selectedId = "earth";
let running = true;
let trackSelected = true;
let labelsVisible = true;
let orbitLinesVisible = true;
let simDays = 0;
let spinClock = 0;
let speedDaysPerSecond = DEFAULT_SPEED;
let lastFrameError = null;
let frameErrorReported = false;
let pointerDown = null;
const trackingDelta = new THREE.Vector3();

// Reused scratch objects: the animation loop touches every body every frame and
// allocating vectors in there is the fastest way to invite garbage-collector jank.
const scratchPosition = new THREE.Vector3();
const scratchVector = new THREE.Vector3();
const scratchTangent = new THREE.Vector3();
const scratchSunDir = new THREE.Vector3();
const scratchProjected = new THREE.Vector3();
const scratchBasis = new THREE.Matrix4();
const keplerResult = { position: new THREE.Vector3(), rAU: 0, trueAnomaly: 0 };
const keplerAlt = { position: new THREE.Vector3(), rAU: 0, trueAnomaly: 0 };

// A camera-facing reticle rather than a glowing shell around the body. A shell
// reads as an atmosphere or a bubble and fights with the thing it is marking.
const selectionHalo = new THREE.Mesh(
  new THREE.RingGeometry(0.955, 1, 96, 1),
  new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#ffd98a") },
      uStrength: { value: 0.85 }
    },
    vertexShader: `
      varying vec2 vLocal;
      void main() {
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec2 vLocal;
      void main() {
        float radius = length(vLocal);
        // Soft-edged hairline across the annulus rather than a filled donut.
        float band = sin(clamp((radius - 0.955) / 0.045, 0.0, 1.0) * 3.14159265);
        // Four gaps on the diagonals keep it reading as an interface marker.
        float angle = atan(vLocal.y, vLocal.x);
        float dash = mix(0.18, 1.0, smoothstep(0.1, 0.45, abs(sin(angle * 2.0))));
        gl_FragColor = vec4(uColor, band * dash * uStrength);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  })
);
selectionHalo.visible = false;
selectionHalo.renderOrder = 5;
scene.add(selectionHalo);

function initScene() {
  createStarfield();
  for (const region of REGIONS) createRegion(region);
  for (const body of BODIES) createBodySystem(body);
  for (const comet of COMETS) createComet(comet);
  els.accuracy.textContent = `Reviewed ${REVIEWED_AT}. Orbits use real periods, semimajor axes, eccentricity, inclination, and approximate J2000 orientations, with visual distance and body-size compression for usability. Axial spin is capped at high clock speeds so planets do not strobe.`;
}

// Orbits are compressed so Neptune and Mercury can share a screen. The flatter
// exponent (vs. the old 0.68) buys room in the inner system without pushing the
// outer planets past the camera's reach.
function distanceScale(au) {
  if (!au) return 0;
  return 12 * Math.pow(Math.max(au, 0.001), 0.62);
}

function bodyRadiusScale(radiusKm, category) {
  if (category === "Star") return 2.8;
  const earthRatio = radiusKm / 6371;
  const base = Math.pow(Math.max(earthRatio, 0.00001), 0.45) * 0.72;
  const min = category === "Moon"
    ? 0.09
    : category === "Asteroid"
      ? 0.13
      : category === "Dwarf planet"
        ? 0.18
        : 0.25;
  const max = category === "Moon" ? 0.42 : 2.55;
  return THREE.MathUtils.clamp(base, min, max);
}

function moonOrbitScale(parent, moon) {
  const parentRadius = bodyRadiusScale(parent.radiusKm, parent.category);
  const logOrbit = Math.log10(Math.max(moon.orbitKm, 1000) / 1000);
  const ringBuffer = parent.rings ? parentRadius * (parent.rings.outer + 0.42) : parentRadius + 0.55;
  return Math.max(ringBuffer, parentRadius + 1.0) + logOrbit * 0.72;
}

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

function createStarfield() {
  const layers = [
    { count: 3400, size: 1.1, opacity: 0.7 },
    { count: 2100, size: 1.9, opacity: 0.66 },
    { count: 420, size: 3.4, opacity: 0.85 }
  ];
  const colorA = new THREE.Color("#ffffff");
  const colorB = new THREE.Color("#8fb6ff");
  const colorC = new THREE.Color("#ffd8a6");
  const random = mulberry32(hashCode("starfield"));
  const starTexture = createStarTexture();

  for (const layer of layers) {
    const positions = new Float32Array(layer.count * 3);
    const colors = new Float32Array(layer.count * 3);
    for (let i = 0; i < layer.count; i += 1) {
      const radius = 300 + random() * 190;
      const theta = random() * TWO_PI;
      const phi = Math.acos(2 * random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const starColor = random() > 0.82 ? colorB : random() > 0.68 ? colorC : colorA;
      const brightness = 0.7 + random() * 0.3;
      colors[i * 3] = starColor.r * brightness;
      colors[i * 3 + 1] = starColor.g * brightness;
      colors[i * 3 + 2] = starColor.b * brightness;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      map: starTexture,
      alphaMap: starTexture,
      size: layer.size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: layer.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    skyRoot.add(new THREE.Points(geometry, material));
  }

  // Milky Way: a dense, tilted band of faint stars plus soft nebula glows
  const band = new THREE.Group();
  band.rotation.set(1.08, 0.2, 0.42);
  const bandCount = 3600;
  const positions = new Float32Array(bandCount * 3);
  const colors = new Float32Array(bandCount * 3);
  const warm = new THREE.Color("#f5e8d0");
  const cool = new THREE.Color("#c8d8f5");
  for (let i = 0; i < bandCount; i += 1) {
    const theta = random() * TWO_PI;
    const radius = 330 + random() * 150;
    // Approximate gaussian thickness via averaged uniforms
    const spread = ((random() + random() + random()) / 3 - 0.5) * 90;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = spread * 0.55;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
    const c = random() > 0.5 ? warm : cool;
    const brightness = 0.35 + random() * 0.5;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }
  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  bandGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  band.add(new THREE.Points(bandGeometry, new THREE.PointsMaterial({
    map: starTexture,
    alphaMap: starTexture,
    size: 1.3,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })));

  const nebulaTexture = createGlowTexture([
    [0, "rgba(214,224,246,0.28)"],
    [0.5, "rgba(190,204,238,0.1)"],
    [1, "rgba(180,196,232,0)"]
  ]);
  for (let i = 0; i < 9; i += 1) {
    const theta = random() * TWO_PI;
    const radius = 350 + random() * 110;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTexture,
      transparent: true,
      opacity: 0.16 + random() * 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    sprite.position.set(Math.cos(theta) * radius, (random() - 0.5) * 40, Math.sin(theta) * radius);
    sprite.scale.setScalar(60 + random() * 110);
    band.add(sprite);
  }
  skyRoot.add(band);
}

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

function createBodySystem(data) {
  const visualRadius = bodyRadiusScale(data.radiusKm, data.category);
  const orbitOpacity = data.category === "Planet" ? 0.34 : 0.24;
  const orbitLine = data.semiMajorAU
    ? createOrbitLine(data, orbitTint(data), orbitOpacity)
    : null;
  if (orbitLine) systemRoot.add(orbitLine);

  const group = new THREE.Group();
  group.name = `${data.name} system`;
  systemRoot.add(group);

  const axisGroup = new THREE.Group();
  axisGroup.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg ?? 0);
  group.add(axisGroup);

  const mesh = createBodyMesh(data, visualRadius);
  axisGroup.add(mesh);
  selectableObjects.push(mesh);

  if (data.category === "Star") createSunGlow(axisGroup, visualRadius);
  const rings = data.rings ? createRings(data, visualRadius, axisGroup) : null;
  if (data.atmosphere) axisGroup.add(createAtmosphereShell(visualRadius, data.atmosphere, data.stretch));

  let clouds = null;
  if (data.id === "earth") {
    const textures = createTextureSet(data);
    if (textures.cloudsMap) {
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(visualRadius * 1.018, 64, 32),
        new THREE.MeshStandardMaterial({
          map: textures.cloudsMap,
          transparent: true,
          opacity: 0.92,
          roughness: 1,
          metalness: 0,
          depthWrite: false
        })
      );
      axisGroup.add(clouds);
    }
  }

  const record = {
    data,
    group,
    axisGroup,
    mesh,
    clouds,
    rings,
    visualRadius,
    orbitLine,
    spin: 0,
    type: "body",
    satellites: []
  };
  records.set(data.id, record);
  createLabel(data.id, data.name, data.category);

  for (const moon of data.satellites ?? []) {
    const moonRecord = createMoonSystem(data, moon, axisGroup);
    record.satellites.push(moonRecord);
  }
}

// Orbit paths pick up their body's colour so a crowded chart stays readable,
// pulled toward a cool blue so nothing competes with the bodies themselves.
function orbitTint(data) {
  return new THREE.Color(data.color ?? "#9fb4d0").lerp(new THREE.Color("#6f90c4"), 0.45);
}

function createBodyMesh(data, visualRadius) {
  const lumpAmplitude = data.category === "Comet"
    ? 0.42
    : data.category === "Moon" && data.radiusKm < 300
      ? 0.26
      : data.category === "Asteroid" && data.radiusKm < 280
        ? 0.12
        : 0;
  const detailed = data.category === "Planet" || data.category === "Star";
  const geometry = lumpAmplitude > 0
    ? createLumpyGeometry(data.id, lumpAmplitude)
    : new THREE.SphereGeometry(1, detailed ? 96 : 48, detailed ? 48 : 32);

  const textures = createTextureSet(data);
  let material;
  if (data.category === "Star") {
    material = new THREE.MeshBasicMaterial({ map: textures.map, color: "#fff3b8" });
  } else {
    material = new THREE.MeshStandardMaterial({
      map: textures.map,
      roughness: textures.roughnessMap ? 1 : 0.9,
      metalness: 0,
      // Just enough self-light that a night side reads as a silhouette rather
      // than a hole in the starfield.
      emissive: new THREE.Color(data.color ?? "#ffffff"),
      emissiveIntensity: data.category === "Comet" ? 0.02 : 0.035
    });
    if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
    if (textures.bumpMap) {
      material.bumpMap = textures.bumpMap;
      material.bumpScale = data.category === "Planet" ? 0.06 : 0.1;
    }
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  const stretch = data.stretch ?? [1, 1, 1];
  mesh.scale.set(visualRadius * stretch[0], visualRadius * stretch[1], visualRadius * stretch[2]);
  mesh.userData.objectId = data.id;
  mesh.userData.kind = data.category;
  return mesh;
}

function createLumpyGeometry(id, amplitude) {
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const random = mulberry32(hashCode(`${id}:shape`));
  const lumps = [];
  for (let i = 0; i < 7; i += 1) {
    lumps.push({
      dir: new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize(),
      amp: (random() - 0.35) * amplitude,
      sharp: 1.5 + random() * 3.5
    });
  }
  const freq = [6 + random() * 6, 6 + random() * 6, 6 + random() * 6];
  const phase = [random() * TWO_PI, random() * TWO_PI, random() * TWO_PI];
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.set(position.getX(i), position.getY(i), position.getZ(i)).normalize();
    let displacement = 0;
    for (const lump of lumps) {
      displacement += lump.amp * Math.pow(Math.max(v.dot(lump.dir), 0), lump.sharp);
    }
    displacement += amplitude * 0.14 *
      Math.sin(v.x * freq[0] + phase[0]) *
      Math.sin(v.y * freq[1] + phase[1]) *
      Math.sin(v.z * freq[2] + phase[2]);
    const r = 1 + displacement;
    position.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// The Sun sits at the world origin, so every shader here can recover the light
// direction from the fragment's own world position without extra uniforms.
function createAtmosphereShell(visualRadius, atmosphere, stretch) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(visualRadius * 1.13, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(atmosphere.color) },
        uIntensity: { value: atmosphere.intensity },
        uPower: { value: 2.7 }
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDir;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDir;
        void main() {
          vec3 normal = normalize(vWorldNormal);
          vec3 view = normalize(vViewDir);
          vec3 sunDir = normalize(-vWorldPosition);
          float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), uPower);
          // Air only glows where sunlight reaches it, with a soft terminator and
          // a forward-scattered flare when the body is backlit.
          float day = smoothstep(-0.3, 0.4, dot(normal, sunDir));
          float forward = pow(clamp(dot(view, -sunDir), 0.0, 1.0), 4.0);
          float alpha = rim * uIntensity * (0.12 + day * 1.05 + forward * 0.45);
          gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  if (stretch) mesh.scale.set(stretch[0], stretch[1], stretch[2]);
  return mesh;
}

function createSunGlow(parent, visualRadius) {
  // Chromosphere: a thin lit rim hugging the photosphere instead of a fat
  // translucent ball. The old glow reached past Mars and washed out every inner
  // planet, so everything here stays close to the surface.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(visualRadius * 1.045, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color("#ff9d3c") } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 2.4);
          gl_FragColor = vec4(uColor, rim * 0.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  parent.add(shell);

  const innerScale = visualRadius * 2.5;
  const coronaScale = visualRadius * 4.6;

  const innerTexture = createGlowTexture([
    [0, "rgba(255,246,214,0.85)"],
    [0.2, "rgba(255,206,110,0.42)"],
    [0.45, "rgba(255,150,50,0.1)"],
    [1, "rgba(255,120,30,0)"]
  ]);
  const inner = new THREE.Sprite(new THREE.SpriteMaterial({
    map: innerTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  inner.scale.setScalar(innerScale);
  parent.add(inner);

  const coronaTexture = createGlowTexture([
    [0, "rgba(255,224,170,0.3)"],
    [0.22, "rgba(255,180,90,0.09)"],
    [0.5, "rgba(255,140,50,0.02)"],
    [1, "rgba(255,120,30,0)"]
  ]);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: coronaTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  corona.scale.setScalar(coronaScale);
  parent.add(corona);

  sunPulse = { inner, corona, innerBase: innerScale, coronaBase: coronaScale };
}

function createRings(data, visualRadius, parent) {
  const ring = data.rings;
  const inner = visualRadius * ring.inner;
  const outer = visualRadius * ring.outer;
  const geometry = new THREE.RingGeometry(inner, outer, 256, 4);
  // Remap UVs so the texture strip runs radially across the annulus
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    const radius = Math.hypot(position.getX(i), position.getY(i));
    uv.setXY(i, (radius - inner) / (outer - inner), 0.5);
  }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: createRingTexture(ring.style ?? "jupiter") },
      uOpacity: { value: Math.min(ring.opacity + 0.42, 1) },
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uPlanetRadius: { value: visualRadius }
    },
    vertexShader: `
      uniform vec3 uSunDirection;
      varying vec2 vUv;
      varying vec3 vOffset;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        // The ring is centred on its planet, so rotating the local position
        // gives the world-space offset from the planet without a centre uniform.
        vOffset = mat3(modelMatrix) * position;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uSunDirection;
      uniform float uPlanetRadius;
      varying vec2 vUv;
      varying vec3 vOffset;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 texel = texture2D(uMap, vUv);
        if (texel.a < 0.004) discard;
        vec3 normal = normalize(vWorldNormal);
        // Grazing sunlight dims the whole system, exactly as it does on Saturn
        // around its equinoxes.
        float incidence = abs(dot(normal, uSunDirection));
        float lit = 0.3 + 0.7 * incidence;

        // Cylindrical shadow cast by the planet onto the ring plane.
        float along = dot(vOffset, uSunDirection);
        float perpendicular = length(vOffset - along * uSunDirection);
        float shadow = along < 0.0
          ? smoothstep(uPlanetRadius * 0.88, uPlanetRadius * 1.16, perpendicular)
          : 1.0;

        // Looking at the unlit face, we only see light filtering through.
        float sameSide = step(0.0, dot(normal, normalize(vViewDir)) * dot(normal, uSunDirection));
        float transmission = mix(0.42, 1.0, sameSide);

        gl_FragColor = vec4(texel.rgb * lit * shadow * transmission, texel.a * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.name = `${data.name} rings`;
  mesh.userData.objectId = data.id;
  parent.add(mesh);
  return mesh;
}

function createMoonSystem(parentData, moon, parentAxisGroup) {
  const orbitDistance = moonOrbitScale(parentData, moon);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: "#7d8ca8",
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });
  const orbitLine = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(circlePoints(orbitDistance, 140, 0)),
    orbitMaterial
  );
  parentAxisGroup.add(orbitLine);

  const group = new THREE.Group();
  parentAxisGroup.add(group);

  const visualRadius = bodyRadiusScale(moon.radiusKm, moon.category);
  const mesh = createBodyMesh(moon, visualRadius);
  group.add(mesh);
  selectableObjects.push(mesh);
  if (moon.atmosphere) group.add(createAtmosphereShell(visualRadius, moon.atmosphere));

  // Most major moons are tidally locked; detect it from the data rather than
  // hard-coding a list, so they keep one face toward their planet.
  const synchronousHours = Math.abs(moon.orbitalPeriodDays) * 24;
  const tidallyLocked = Boolean(moon.rotationHours) &&
    Math.abs(Math.abs(moon.rotationHours) - synchronousHours) < synchronousHours * 0.02;

  const record = {
    data: moon,
    parentId: parentData.id,
    group,
    mesh,
    visualRadius,
    orbitDistance,
    orbitLine,
    spin: 0,
    tidallyLocked,
    type: "moon"
  };
  records.set(moon.id, record);
  createLabel(moon.id, moon.name, moon.category);
  return record;
}

/* ------------------------------------------------------------------ */
/* Comets                                                              */
/* ------------------------------------------------------------------ */

function createComet(data) {
  const orbitLine = createOrbitLine(data, "#7fb6e8", 0.3, true);
  systemRoot.add(orbitLine);

  const group = new THREE.Group();
  systemRoot.add(group);
  const visualRadius = 0.14;

  const nucleus = createBodyMesh(data, visualRadius);
  group.add(nucleus);
  selectableObjects.push(nucleus);

  // Coma in two parts: a tight bright core over a wide, faint envelope. Real
  // comas are teal-green from CN and C2 emission rather than plain white.
  const coreTexture = createGlowTexture([
    [0, "rgba(236,255,250,0.95)"],
    [0.22, "rgba(178,238,226,0.5)"],
    [0.6, "rgba(140,210,220,0.12)"],
    [1, "rgba(130,196,220,0)"]
  ]);
  const comaCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: coreTexture,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  group.add(comaCore);

  const haloTexture = createGlowTexture([
    [0, "rgba(190,235,240,0.34)"],
    [0.35, "rgba(150,205,235,0.12)"],
    [1, "rgba(130,185,235,0)"]
  ]);
  const comaHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  group.add(comaHalo);

  // Ion tail: narrow, straight, and locked to the anti-solar direction because
  // the solar wind carries it there regardless of where the comet is heading.
  const ionTail = createIonTail(5.6, 0.3);
  group.add(ionTail);

  // Dust tail: heavier grains keep their orbital momentum, so the tail sweeps
  // back along the comet's track instead of pointing straight away from the Sun.
  const dustTail = createDustTail(3.6, 0.42);
  group.add(dustTail);

  const record = {
    data,
    group,
    mesh: nucleus,
    comaCore,
    comaHalo,
    ionTail,
    dustTail,
    visualRadius,
    orbitLine,
    spin: 0,
    type: "comet"
  };
  records.set(data.id, record);
  createLabel(data.id, data.name, data.category);
}

// Tails are drawn as thin shells, but they should read as filled volumes. The
// chord through a convex volume is longest where you look straight at the
// surface and vanishes at the silhouette, so scaling alpha by |N.V| turns a
// hard-edged cone into something soft and gaseous.
function createTailMaterial(kind, color, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: createTailTexture(kind) },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 texel = texture2D(uMap, vUv);
        float chord = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
        gl_FragColor = vec4(uColor * texel.rgb, texel.a * uOpacity * chord);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function createIonTail(length, baseRadius) {
  const geometry = new THREE.ConeGeometry(baseRadius, length, 28, 10, true);
  geometry.rotateX(Math.PI);
  geometry.translate(0, length / 2, 0);
  const mesh = new THREE.Mesh(geometry, createTailMaterial("ion", "#a7d8ff", 0.5));
  mesh.renderOrder = 2;
  return mesh;
}

function createDustTail(length, baseRadius) {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length * 0.34, 0),
    new THREE.Vector3(length * 0.16, length * 0.7, 0),
    new THREE.Vector3(length * 0.52, length, 0)
  );
  const tubular = 28;
  const radial = 14;
  const geometry = new THREE.TubeGeometry(curve, tubular, baseRadius, radial, false);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const centre = new THREE.Vector3();
  const offset = new THREE.Vector3();
  for (let i = 0; i <= tubular; i += 1) {
    const t = i / tubular;
    // TubeGeometry lays its rings out by arc length, so the ring centre has to
    // be sampled the same way or the taper shears the tube off its own axis.
    curve.getPointAt(t, centre);
    // Flare the tube from a narrow root to a broad fan, and re-map the UVs so
    // the shared tail texture runs from the nucleus (v = 1) to the tip (v = 0).
    const taper = 0.16 + Math.pow(t, 0.7) * 1.5;
    for (let j = 0; j <= radial; j += 1) {
      const index = i * (radial + 1) + j;
      offset.set(
        position.getX(index) - centre.x,
        position.getY(index) - centre.y,
        position.getZ(index) - centre.z
      ).multiplyScalar(taper);
      position.setXYZ(index, centre.x + offset.x, centre.y + offset.y, centre.z + offset.z);
      uv.setXY(index, j / radial, 1 - t);
    }
  }
  position.needsUpdate = true;
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, createTailMaterial("dust", "#f4e6c8", 0.42));
  mesh.renderOrder = 2;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Regions                                                             */
/* ------------------------------------------------------------------ */

function createRegion(region) {
  if (region.id === "oort-cloud") {
    createOortCloud(region);
    return;
  }

  const inner = distanceScale(region.innerAU);
  const outer = distanceScale(region.outerAU);
  const ringGeometry = new THREE.RingGeometry(inner, outer, 192, 1);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: region.color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: region.id === "kuiper-belt" ? 0.08 : 0.06,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.userData.objectId = region.id;
  ring.userData.kind = "Region";
  ring.userData.baseOpacity = ringMaterial.opacity;
  ring.userData.selectedOpacity = 0.16;
  systemRoot.add(ring);
  selectableObjects.push(ring);

  const random = mulberry32(hashCode(region.id));
  const particleCount = region.id === "kuiper-belt" ? 2600 : 1400;
  const positions = new Float32Array(particleCount * 3);
  const color = new THREE.Color(region.color);
  for (let i = 0; i < particleCount; i += 1) {
    const theta = random() * TWO_PI;
    const au = region.innerAU + random() * (region.outerAU - region.innerAU);
    const radius = distanceScale(au);
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = (random() - 0.5) * (region.id === "kuiper-belt" ? 3.4 : 1.5);
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color,
      size: region.id === "kuiper-belt" ? 0.17 : 0.11,
      transparent: true,
      opacity: region.id === "kuiper-belt" ? 0.5 : 0.44,
      sizeAttenuation: true
    })
  );
  systemRoot.add(particles);

  createBeltRocks(region, random);

  const labelPosition = new THREE.Vector3(outer * 0.92, 1.8, 0);
  records.set(region.id, {
    data: region,
    mesh: ring,
    group: ring,
    labelPosition,
    visualRadius: outer,
    particles,
    type: "region"
  });
  createLabel(region.id, region.name, region.category);
}

// Slowly orbiting, tumbling instanced rocks so belts read as 3D debris fields
function createBeltRocks(region, random) {
  const isKuiper = region.id === "kuiper-belt";
  const count = isKuiper ? 380 : 720;
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Real belts are a mix of carbonaceous, stony, and icy bodies, so tint each
  // rock instead of stamping out one flat colour.
  const tintA = new THREE.Color(isKuiper ? "#b6cbe4" : "#9c8a72");
  const tintB = new THREE.Color(isKuiper ? "#6f8299" : "#5d4f40");
  const tint = new THREE.Color();

  const rocks = [];
  for (let i = 0; i < count; i += 1) {
    const au = region.innerAU + random() * (region.outerAU - region.innerAU);
    rocks.push({
      radius: distanceScale(au),
      angle: random() * TWO_PI,
      speed: TWO_PI / (365.25 * Math.pow(au, 1.5)),
      y: (random() - 0.5) * (isKuiper ? 3.6 : 1.4),
      scale: (isKuiper ? 0.05 : 0.024) + random() * (isKuiper ? 0.08 : 0.05),
      // Irregular bodies, not spheres: give each rock its own proportions.
      stretch: new THREE.Vector3(0.7 + random() * 0.7, 0.6 + random() * 0.8, 0.7 + random() * 0.7),
      spinAxis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      spinPhase: random() * TWO_PI,
      spinRate: 0.2 + random() * 1.4
    });
    mesh.setColorAt(i, tint.copy(tintA).lerp(tintB, random()));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  systemRoot.add(mesh);
  beltRockSystems.push({ mesh, rocks });
}

function createOortCloud(region) {
  const displayRadius = 220;
  // A coarse, nearly invisible cage: at full strength this wireframe threw long
  // diagonals across every wide shot. It brightens only while it is selected.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(displayRadius, 22, 12),
    new THREE.MeshBasicMaterial({
      color: region.color,
      transparent: true,
      opacity: 0.014,
      wireframe: true,
      depthWrite: false
    })
  );
  shell.userData.objectId = region.id;
  shell.userData.kind = "Region";
  shell.userData.baseOpacity = 0.014;
  shell.userData.selectedOpacity = 0.09;
  systemRoot.add(shell);
  selectableObjects.push(shell);

  const random = mulberry32(hashCode(region.id));
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = displayRadius * (0.8 + random() * 0.18);
    const theta = random() * TWO_PI;
    const phi = Math.acos(2 * random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color: region.color,
      size: 0.7,
      transparent: true,
      opacity: 0.26,
      sizeAttenuation: true
    })
  );
  systemRoot.add(particles);

  records.set(region.id, {
    data: region,
    mesh: shell,
    group: shell,
    labelPosition: new THREE.Vector3(0, displayRadius * 0.72, displayRadius * 0.62),
    visualRadius: displayRadius,
    particles,
    type: "region"
  });
  createLabel(region.id, region.name, region.category);
}

/* ------------------------------------------------------------------ */
/* Orbits and Kepler solving                                           */
/* ------------------------------------------------------------------ */

const ORBIT_VERTEX_SHADER = `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

// The path brightens just behind the body and fades ahead of it, so a glance at
// the orbit tells you which way around the body is travelling.
const ORBIT_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uHead;
  uniform float uBase;
  uniform float uPeak;
  varying float vT;
  void main() {
    float behind = fract(uHead - vT);
    float trail = pow(1.0 - behind, 7.0);
    gl_FragColor = vec4(uColor, uBase + (uPeak - uBase) * trail);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function createOrbitLine(data, color, opacity = 0.3, comet = false) {
  const segments = comet ? 512 : 320;
  const eccentricity = data.eccentricity ?? 0;
  const semiMajor = data.semiMajorAU;
  const positions = new Float32Array((segments + 1) * 3);
  const params = new Float32Array(segments + 1);
  const point = new THREE.Vector3();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const trueAnomaly = t * TWO_PI;
    const r = semiMajor * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
    orbitalPosition(data, trueAnomaly, r, point);
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
    params[i] = t;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aT", new THREE.BufferAttribute(params, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uHead: { value: 0 },
      uBase: { value: opacity * 0.34 },
      uPeak: { value: opacity }
    },
    vertexShader: ORBIT_VERTEX_SHADER,
    fragmentShader: ORBIT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false
  });
  material.userData.baseOpacity = opacity;
  const line = new THREE.Line(geometry, material);
  line.name = `${data.name} orbit`;
  return line;
}

function setOrbitHighlight(record, highlighted) {
  const material = record?.orbitLine?.material;
  if (!material?.uniforms?.uPeak) return;
  const base = material.userData.baseOpacity ?? 0.3;
  material.uniforms.uPeak.value = highlighted ? Math.min(base * 2.4, 0.95) : base;
  material.uniforms.uBase.value = highlighted ? base * 0.9 : base * 0.34;
}

function circlePoints(radius, segments, y) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * TWO_PI;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  return points;
}

// Standard perifocal-to-ecliptic rotation (node, inclination, argument of
// perihelion), then mapped onto the scene axes: ecliptic plane on XZ, north +Y.
function orbitalPosition(data, trueAnomaly, rAU, target) {
  const radius = distanceScale(rAU);
  const argument = THREE.MathUtils.degToRad(data.argPeriDeg ?? 0) + trueAnomaly;
  const node = THREE.MathUtils.degToRad(data.nodeDeg ?? 0);
  const inclination = THREE.MathUtils.degToRad(data.inclinationDeg ?? 0);
  const cosArg = Math.cos(argument);
  const sinArg = Math.sin(argument);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInc = Math.cos(inclination);
  const sinInc = Math.sin(inclination);
  const x = radius * (cosNode * cosArg - sinNode * sinArg * cosInc);
  const y = radius * (sinNode * cosArg + cosNode * sinArg * cosInc);
  const z = radius * sinArg * sinInc;
  return target.set(x, z, -y);
}

function meanAnomalyAt(data, days) {
  const period = Math.abs(data.orbitalPeriodDays);
  const direction = data.orbitalPeriodDays < 0 ? -1 : 1;
  if (Number.isFinite(data.meanAnomalyDeg)) {
    return normalizeAngle(
      THREE.MathUtils.degToRad(data.meanAnomalyDeg) +
      direction * TWO_PI * ((days + BASE_DAYS_FROM_J2000) / period)
    );
  }
  return normalizeAngle((data.phase ?? 0) + direction * TWO_PI * (days / period));
}

function keplerState(data, days, target = keplerResult) {
  if (!data.semiMajorAU) {
    target.position.set(0, 0, 0);
    target.rAU = 0;
    target.trueAnomaly = 0;
    return target;
  }
  const meanAnomaly = meanAnomalyAt(data, days);
  const eccentricity = data.eccentricity ?? 0;
  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );
  target.rAU = data.semiMajorAU * (1 - eccentricity * Math.cos(eccentricAnomaly));
  target.trueAnomaly = normalizeAngle(trueAnomaly);
  orbitalPosition(data, trueAnomaly, target.rAU, target.position);
  return target;
}

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 10; i += 1) {
    const delta = (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return eccentricAnomaly;
}

function normalizeAngle(value) {
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

function buildObjectList() {
  const order = FEATURED_ORDER.filter((id) => objectData.has(id));
  const groups = [
    ["Core", ["sun"]],
    ["Planets", order.filter((id) => objectData.get(id)?.category === "Planet")],
    ["Moons", order.filter((id) => objectData.get(id)?.category === "Moon")],
    ["Dwarf Planets", order.filter((id) => objectData.get(id)?.category === "Dwarf planet")],
    ["Asteroids", order.filter((id) => objectData.get(id)?.category === "Asteroid")],
    ["Regions and Comets", order.filter((id) => regionIds.has(id) || cometIds.has(id))]
  ];

  els.objectList.innerHTML = "";
  for (const [heading, ids] of groups) {
    if (!ids.length) continue;
    const section = document.createElement("section");
    section.dataset.listSection = heading;
    const h = document.createElement("h3");
    h.textContent = heading;
    section.appendChild(h);
    for (const id of ids) {
      const data = objectData.get(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "object-button";
      button.dataset.target = id;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `<span class="dot" style="background:${data.color ?? "#b7c4d8"}"></span><span>${data.name}</span><small>${data.category}</small>`;
      button.addEventListener("click", () => selectObject(id, true));
      section.appendChild(button);
    }
    els.objectList.appendChild(section);
  }
}

function speedFromSlider(value) {
  return SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, value / 100);
}

function sliderFromSpeed(speed) {
  return 100 * Math.log(speed / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN);
}

function formatSpeed(value) {
  if (value < 0.95) return `${(value * 24).toFixed(1)} hr/s`;
  if (value < 90) return `${value < 10 ? value.toFixed(1) : Math.round(value)} d/s`;
  return `${(value / 365.25).toFixed(2)} yr/s`;
}

function setSpeed(value, syncSlider = true) {
  speedDaysPerSecond = THREE.MathUtils.clamp(value, SPEED_MIN, SPEED_MAX);
  if (syncSlider) els.speed.value = String(sliderFromSpeed(speedDaysPerSecond));
  els.speedValue.textContent = formatSpeed(speedDaysPerSecond);
  if (els.speedPresets) {
    for (const button of els.speedPresets.querySelectorAll("button")) {
      const presetValue = Number(button.dataset.speed);
      button.classList.toggle("active", Math.abs(presetValue - speedDaysPerSecond) / presetValue < 0.02);
    }
  }
}

function buildSpeedControls() {
  if (els.speedPresets) {
    for (const preset of SPEED_PRESETS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = preset.label;
      button.dataset.speed = String(preset.value);
      button.addEventListener("click", () => setSpeed(preset.value));
      els.speedPresets.appendChild(button);
    }
  }
  // Drive the initial speed from the constant, not from the markup, so the two
  // cannot drift apart.
  setSpeed(DEFAULT_SPEED);
}

function setOrbitLinesVisible(visible) {
  orbitLinesVisible = visible;
  for (const record of records.values()) {
    if (record.orbitLine) record.orbitLine.visible = visible;
  }
  els.orbitsToggle?.classList.toggle("active", visible);
  els.orbitsToggle?.setAttribute("aria-pressed", String(visible));
}

function createLabel(id, name, category) {
  const label = document.createElement("button");
  label.type = "button";
  label.className = `label label-${category.toLowerCase().replaceAll(" ", "-")}`;
  label.textContent = name;
  label.addEventListener("click", () => selectObject(id, true));
  els.labels.appendChild(label);
  labels.set(id, label);
}

function selectObject(id, focus) {
  if (!objectData.has(id)) return;
  selectedId = id;
  const data = objectData.get(id);

  document.querySelectorAll(".object-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === id);
    button.setAttribute("aria-pressed", String(button.dataset.target === id));
  });
  labels.forEach((label, labelId) => label.classList.toggle("active", labelId === id));

  els.title.textContent = data.name;
  els.subtitle.textContent = `${data.category} - ${data.className}`;
  els.summary.textContent = data.summary;
  renderStats(data);
  renderDetails(data);
  renderSources(data);

  applyZoomLimits(records.get(id));
  applySelectionStyles();
  if (focus) focusSelected();
  updateSelectionHalo();
}

function renderStats(data) {
  const rows = [];
  if (data.radiusKm) rows.push(["Radius", `${formatNumber(data.radiusKm)} km`]);
  if (data.semiMajorAU) rows.push(["Mean distance", `${formatNumber(data.semiMajorAU, 3)} AU`]);
  if (data.perihelionAU) rows.push(["Perihelion", `${formatNumber(data.perihelionAU, 3)} AU`]);
  if (data.aphelionAU) rows.push(["Aphelion", `${formatNumber(data.aphelionAU, 2)} AU`]);
  if (data.innerAU) rows.push(["Span", `${formatNumber(data.innerAU, 2)}-${formatNumber(data.outerAU, 0)} AU`]);
  if (data.orbitKm) rows.push(["Parent orbit", `${formatNumber(data.orbitKm)} km`]);
  if (data.orbitalPeriodDays) rows.push(["Orbital period", formatPeriod(data.orbitalPeriodDays)]);
  if (data.rotationHours) rows.push(["Rotation", formatRotation(data.rotationHours)]);
  if (Number.isFinite(data.eccentricity)) rows.push(["Eccentricity", formatNumber(data.eccentricity, 4)]);
  if (Number.isFinite(data.inclinationDeg)) rows.push(["Inclination", `${formatNumber(data.inclinationDeg, 2)} deg`]);
  if (data.axialTiltDeg !== undefined) rows.push(["Axial tilt", data.axialTiltDeg === null ? "Not well constrained" : `${formatNumber(data.axialTiltDeg, 2)} deg`]);
  if (Number.isFinite(data.moons)) rows.push(["Known moons", formatNumber(data.moons, 0)]);
  if (Number.isFinite(data.meanTempC)) rows.push(["Mean temp.", `${formatNumber(data.meanTempC, 0)} C`]);
  if (data.rings) rows.push(["Rings", "Yes"]);
  if (parentById.has(data.id)) rows.push(["Parent", objectData.get(parentById.get(data.id)).name]);

  els.stats.innerHTML = rows.map(([label, value]) => `
    <div class="stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderDetails(data) {
  els.detailsList.innerHTML = "";
  for (const detail of data.details ?? []) {
    const item = document.createElement("li");
    item.textContent = detail;
    els.detailsList.appendChild(item);
  }
}

function renderSources(data) {
  els.sources.innerHTML = "";
  for (const sourceId of data.sourceIds ?? []) {
    const source = SCIENCE_SOURCES[sourceId];
    if (!source) continue;
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    els.sources.appendChild(link);
  }
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 && Math.abs(value) < 10 ? Math.min(digits, 3) : 0
  }).format(value);
}

function formatPeriod(days) {
  const direction = days < 0 ? " retrograde" : "";
  const abs = Math.abs(days);
  if (abs >= 365.25) return `${formatNumber(abs / 365.25, 2)} Earth years${direction}`;
  if (abs >= 2) return `${formatNumber(abs, 2)} Earth days${direction}`;
  return `${formatNumber(abs * 24, 2)} hours${direction}`;
}

function formatRotation(hours) {
  const direction = hours < 0 ? " retrograde" : "";
  const abs = Math.abs(hours);
  if (abs >= 48) return `${formatNumber(abs / 24, 2)} Earth days${direction}`;
  return `${formatNumber(abs, 2)} hours${direction}`;
}

// How much space the object actually occupies on screen, rings included.
function visualExtent(record) {
  if (!record) return 1;
  const rings = record.data?.rings;
  return rings ? record.visualRadius * (rings.outer + 0.2) : record.visualRadius;
}

// Approach from the sunlit side, offset far enough round that the terminator is
// in frame. A fixed world-space offset used to drop the camera on the night
// side of roughly half the objects in the system.
const FOCUS_AZIMUTH = THREE.MathUtils.degToRad(42);

function focusSelected() {
  const position = getObjectPosition(selectedId, scratchVector);
  const record = records.get(selectedId);
  // Frame the body itself. The old framing sat eleven radii out plus a fixed
  // eight units, which reduced every planet to a speck.
  const distance = record?.type === "region"
    ? THREE.MathUtils.clamp(record.visualRadius * 1.7, 12, 360)
    : THREE.MathUtils.clamp(visualExtent(record) * 4.6 + 0.8, 0.6, 120);

  const toSun = new THREE.Vector3().copy(position).negate();
  if (toSun.lengthSq() < 1e-8) toSun.set(0, 0, 1);
  toSun.normalize();

  // Rise above the ring plane for ringed planets so the rings open up, and
  // above the ecliptic for everything else.
  const up = record?.rings
    ? new THREE.Vector3(0, 1, 0).applyQuaternion(record.axisGroup.getWorldQuaternion(new THREE.Quaternion()))
    : new THREE.Vector3(0, 1, 0);
  const elevation = THREE.MathUtils.degToRad(record?.rings ? 34 : 20);

  const sunInPlane = toSun.clone().addScaledVector(up, -toSun.dot(up));
  if (sunInPlane.lengthSq() < 1e-8) sunInPlane.set(1, 0, 0).addScaledVector(up, -up.x);
  sunInPlane.normalize();
  const side = new THREE.Vector3().crossVectors(up, sunInPlane).normalize();

  const offset = sunInPlane.multiplyScalar(Math.cos(FOCUS_AZIMUTH))
    .addScaledVector(side, Math.sin(FOCUS_AZIMUTH))
    .multiplyScalar(Math.cos(elevation))
    .addScaledVector(up, Math.sin(elevation))
    .normalize();

  camera.position.copy(position).addScaledVector(offset, distance);
  controls.target.copy(position);
  controls.update();
}

// Zoom limits follow the selection so you can actually get close to Phobos
// without being able to fly through Jupiter.
function applyZoomLimits(record) {
  const radius = record?.visualRadius ?? 1;
  controls.minDistance = record?.type === "region"
    ? 2
    : Math.max(radius * 1.35, 0.12);
  controls.maxDistance = 560;
}

function getObjectPosition(id, target = new THREE.Vector3()) {
  const record = records.get(id);
  if (!record) return target.set(0, 0, 0);
  if (record.labelPosition) return target.copy(record.labelPosition);
  return (record.group ?? record.mesh).getWorldPosition(target);
}

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

function updateTrackedCamera(delta) {
  if (!trackSelected) return;
  const target = getObjectPosition(selectedId, scratchVector);
  const follow = 1 - Math.exp(-8 * delta);
  trackingDelta.copy(target).sub(controls.target).multiplyScalar(follow);
  // Translate the camera by the same amount as the target. This keeps a
  // moving planet centered instead of letting it drift out of frame.
  controls.target.add(trackingDelta);
  camera.position.add(trackingDelta);
}

function animate() {
  requestAnimationFrame(animate);
  try {
    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    elapsedSeconds += delta;
    // Everything driven by the simulation clock stops dead when paused; only
    // ambience like the solar shimmer keeps running on real time.
    const simDelta = running ? delta : 0;
    if (running) {
      simDays += delta * speedDaysPerSecond;
      spinClock += delta;
    }

    updateBodies(simDelta);
    updateBeltRocks();
    updateSunPulse();

    // Move the camera before projecting labels, otherwise every label trails a
    // frame behind the body it belongs to.
    updateTrackedCamera(delta);
    controls.update();
    skyRoot.position.copy(camera.position);

    updateLabels();
    updateSelectionHalo();
    updateDate();

    renderer.render(scene, camera);
  } catch (error) {
    lastFrameError = error;
    if (!frameErrorReported) {
      console.error("Solar system animation frame failed", error);
      frameErrorReported = true;
    }
  }
}

// Spin is integrated rather than derived from the clock so the cap can bite
// without the angle ever jumping. Below the cap this is the true rotation rate.
function advanceSpin(current, rotationHours, delta) {
  if (!delta) return current;
  const hours = Math.abs(rotationHours) || 24;
  const rate = (TWO_PI * 24 / hours) * speedDaysPerSecond;
  const direction = rotationHours < 0 ? -1 : 1;
  return current + Math.min(rate, MAX_SPIN_RATE) * delta * direction;
}

function updateBodies(delta) {
  for (const record of records.values()) {
    const data = record.data;
    if (record.type === "body") {
      if (data.semiMajorAU) {
        const state = keplerState(data, simDays);
        record.group.position.copy(state.position);
        if (record.orbitLine) {
          record.orbitLine.material.uniforms.uHead.value = state.trueAnomaly / TWO_PI;
        }
      }
      record.spin = advanceSpin(record.spin, data.rotationHours, delta);
      record.mesh.rotation.y = record.spin;
      if (record.clouds) record.clouds.rotation.y = record.spin * 1.18;
      if (record.rings) updateRingLighting(record);

      for (const moonRecord of record.satellites) updateMoon(moonRecord, delta);
    } else if (record.type === "comet") {
      updateComet(record, delta);
    }
  }
}

function updateRingLighting(record) {
  record.group.getWorldPosition(scratchSunDir);
  record.rings.material.uniforms.uSunDirection.value.copy(scratchSunDir).negate().normalize();
}

function updateMoon(record, delta) {
  const data = record.data;
  const period = Math.abs(data.orbitalPeriodDays);
  const direction = data.orbitalPeriodDays < 0 ? -1 : 1;
  const angle = (data.phase ?? 0) + direction * TWO_PI * (simDays / period);
  record.group.position.set(Math.cos(angle) * record.orbitDistance, 0, Math.sin(angle) * record.orbitDistance);
  if (record.tidallyLocked) {
    // Keep the same hemisphere facing the planet, the way our Moon does.
    record.mesh.rotation.y = -angle;
  } else if (data.rotationHours) {
    record.spin = advanceSpin(record.spin, data.rotationHours, delta);
    record.mesh.rotation.y = record.spin;
  }
}

function updateComet(record, delta) {
  const data = record.data;
  const state = keplerState(data, simDays);
  record.group.position.copy(state.position);
  if (record.orbitLine) {
    record.orbitLine.material.uniforms.uHead.value = state.trueAnomaly / TWO_PI;
  }
  record.spin = advanceSpin(record.spin, data.rotationHours, delta);
  record.mesh.rotation.y = record.spin;

  // Water ice starts sublimating in earnest inside roughly 3 AU, so activity
  // climbs steeply toward perihelion and all but stops in the outer system.
  const activity = THREE.MathUtils.clamp(2.4 / Math.max(state.rAU, 0.1) - 0.55, 0, 1.25);
  // Brightness saturates well before the tail stops growing.
  const glow = Math.min(activity, 1);
  const active = activity > 0.02;
  record.ionTail.visible = active;
  record.dustTail.visible = active;

  // Out past the frost line the comet is a bare nucleus, so the coma has to go
  // all the way to nothing rather than sitting on a floor.
  record.comaCore.visible = active;
  record.comaHalo.visible = active;
  if (!active) return;
  record.comaCore.scale.setScalar(0.22 + activity * 0.95);
  record.comaCore.material.opacity = glow * 0.62;
  record.comaHalo.scale.setScalar(0.45 + activity * 3);
  record.comaHalo.material.opacity = glow * 0.3;

  const away = scratchSunDir.copy(record.group.position);
  if (away.lengthSq() < 1e-9) away.set(0, 1, 0);
  away.normalize();

  record.ionTail.quaternion.setFromUnitVectors(UP_Y, away);
  record.ionTail.scale.set(0.45 + activity * 0.55, Math.max(activity, 0.001), 0.45 + activity * 0.55);
  record.ionTail.material.uniforms.uOpacity.value = glow * 0.95;

  // Dust lags along the orbit, so bend the tail toward where the comet has been.
  const step = Math.max(Math.abs(data.orbitalPeriodDays) * 0.002, 0.05);
  keplerState(data, simDays + step, keplerAlt);
  scratchTangent.copy(keplerAlt.position).sub(record.group.position);
  scratchVector.copy(scratchTangent).negate();
  scratchVector.addScaledVector(away, -scratchVector.dot(away));
  if (scratchVector.lengthSq() < 1e-9) {
    record.dustTail.quaternion.copy(record.ionTail.quaternion);
  } else {
    scratchVector.normalize();
    scratchTangent.crossVectors(scratchVector, away);
    scratchBasis.makeBasis(scratchVector, away, scratchTangent);
    record.dustTail.quaternion.setFromRotationMatrix(scratchBasis);
  }
  record.dustTail.scale.set(0.4 + activity * 0.7, Math.max(activity, 0.001), 0.4 + activity * 0.7);
  record.dustTail.material.uniforms.uOpacity.value = glow * 0.8;
}

function updateBeltRocks() {
  for (const system of beltRockSystems) {
    const { mesh, rocks } = system;
    for (let i = 0; i < rocks.length; i += 1) {
      const rock = rocks[i];
      const angle = rock.angle + rock.speed * simDays;
      instanceDummy.position.set(Math.cos(angle) * rock.radius, rock.y, Math.sin(angle) * rock.radius);
      instanceDummy.quaternion.setFromAxisAngle(rock.spinAxis, rock.spinPhase + spinClock * rock.spinRate * 0.2);
      instanceDummy.scale.copy(rock.stretch).multiplyScalar(rock.scale);
      instanceDummy.updateMatrix();
      mesh.setMatrixAt(i, instanceDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function updateSunPulse() {
  if (!sunPulse) return;
  const pulse = 1 + Math.sin(elapsedSeconds * 1.4) * 0.025 + Math.sin(elapsedSeconds * 3.7) * 0.012;
  sunPulse.inner.scale.setScalar(sunPulse.innerBase * pulse);
  sunPulse.corona.scale.setScalar(sunPulse.coronaBase * (2 - pulse));
}

// Label boxes are measured in one batched pass. Reading offsetWidth per label
// per frame forced a synchronous layout ~54 times every frame, which was the
// single most expensive thing the render loop did.
// Labels drawn underneath the side panels are invisible but still win the
// overlap contest, pushing visible labels off screen. Track the panel boxes so
// they can be skipped outright.
function updatePanelRects() {
  panelRects.length = 0;
  document.querySelectorAll(".panel, .control-bar").forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      panelRects.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    }
  });
}

function measureLabels() {
  updatePanelRects();
  const wasHidden = new Map();
  labels.forEach((label, id) => {
    wasHidden.set(id, label.hidden);
    label.hidden = false;
  });
  labels.forEach((label, id) => {
    labelMetrics.set(id, { width: label.offsetWidth, height: label.offsetHeight });
  });
  labels.forEach((label, id) => {
    label.hidden = wasHidden.get(id) ?? false;
  });
}

function updateLabels() {
  if (!labelsVisible) {
    if (labelsRendered) {
      labels.forEach((label) => { label.hidden = true; });
      labelsRendered = false;
    }
    return;
  }
  labelsRendered = true;

  const { width, height } = viewportSize;
  // Pixels per world unit at one unit of depth, used to lift each label clear
  // of the body it names instead of stamping it across the surface.
  const projectionScale = (height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  labelCandidates.length = 0;

  labels.forEach((label, id) => {
    const record = records.get(id);
    getObjectPosition(id, scratchPosition);
    const distance = camera.position.distanceTo(scratchPosition);
    scratchProjected.copy(scratchPosition).project(camera);
    if (
      scratchProjected.z <= -1 || scratchProjected.z >= 1 ||
      Math.abs(scratchProjected.x) > 1.3 || Math.abs(scratchProjected.y) > 1.3
    ) {
      label.hidden = true;
      return;
    }

    const bodyRadius = record && record.type !== "region" ? record.visualRadius : 0;
    const lift = Math.min(
      bodyRadius / Math.max(distance, 1e-3) * projectionScale * 1.15,
      height * 0.42
    ) + 12;
    const x = (scratchProjected.x * 0.5 + 0.5) * width;
    const y = (-scratchProjected.y * 0.5 + 0.5) * height - lift;
    label.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const data = objectData.get(id);
    const priority = id === selectedId
      ? 0
      : data.category === "Star" || data.category === "Planet"
        ? 1
        : data.category === "Dwarf planet" || data.category === "Region"
          ? 2
          : 3;
    const metrics = labelMetrics.get(id) ?? { width: 60, height: 18 };
    const rect = {
      left: x - metrics.width / 2,
      right: x + metrics.width / 2,
      top: y - metrics.height / 2,
      bottom: y + metrics.height / 2
    };
    if (panelRects.some((panel) => rectsOverlap(rect, panel, 0))) {
      label.hidden = true;
      return;
    }
    labelCandidates.push({ id, label, priority, rect });
  });

  labelCandidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const placed = [];
  for (const candidate of labelCandidates) {
    const crowded = candidate.priority !== 0 &&
      placed.some((placedCandidate) => rectsOverlap(candidate.rect, placedCandidate.rect, 5));
    candidate.label.hidden = crowded;
    if (!crowded) placed.push(candidate);
  }
}

function rectsOverlap(a, b, padding) {
  return !(
    a.right + padding < b.left ||
    b.right + padding < a.left ||
    a.bottom + padding < b.top ||
    b.bottom + padding < a.top
  );
}

function updateSelectionHalo() {
  const record = records.get(selectedId);
  if (!record || record.type === "region") {
    selectionHalo.visible = false;
    return;
  }
  getObjectPosition(selectedId, scratchVector);
  selectionHalo.visible = true;
  selectionHalo.position.copy(scratchVector);
  selectionHalo.quaternion.copy(camera.quaternion);
  const pulse = 1 + Math.sin(elapsedSeconds * 2.1) * 0.025;
  selectionHalo.scale.setScalar(selectionRadius(record) * pulse);
}

function selectionRadius(record) {
  return Math.max(visualExtent(record) * (record.data.rings ? 1.15 : 1.6), 0.26);
}

// Selection styling only changes when the selection changes, so it does not
// belong in the render loop rewriting material uniforms 60 times a second.
function applySelectionStyles() {
  for (const object of selectableObjects) {
    const isSelected = object.userData.objectId === selectedId;
    const material = object.material;
    if (!material) continue;
    if (material.emissive) {
      material.emissiveIntensity = isSelected ? 0.22 : object.userData.kind === "Comet" ? 0.02 : 0.035;
    }
    if (regionIds.has(object.userData.objectId)) {
      material.opacity = isSelected
        ? object.userData.selectedOpacity ?? 0.16
        : object.userData.baseOpacity ?? 0.06;
    }
  }
  for (const record of records.values()) {
    setOrbitHighlight(record, record.data.id === selectedId);
  }
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC"
});

let lastDateText = "";

function updateDate() {
  const date = new Date(BASE_DATE_UTC + simDays * 86400000);
  const formatter = speedDaysPerSecond < 3 ? DATE_TIME_FORMAT : DATE_FORMAT;
  const text = formatter.format(date);
  if (text === lastDateText) return;
  lastDateText = text;
  els.date.textContent = text;
  els.date.dateTime = date.toISOString();
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function onPointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY };
  renderer.domElement.classList.add("is-dragging");
}

function onPointerUp(event) {
  if (!pointerDown) return;
  const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  renderer.domElement.classList.remove("is-dragging");
  if (moved > 7) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(selectableObjects, true);
  if (!intersections.length) return;
  const hit = intersections.find((item) => item.object.userData.objectId);
  if (!hit) return;
  selectObject(hit.object.userData.objectId, false);
}

function onPointerCancel() {
  pointerDown = null;
  renderer.domElement.classList.remove("is-dragging");
}

function onResize() {
  resizeRenderer();
  // Breakpoints change the label font size, so the cached boxes have to go.
  measureLabels();
}

function bindEvents() {
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
  renderer.domElement.addEventListener("pointerleave", onPointerCancel);
  window.addEventListener("resize", onResize);

  els.play.addEventListener("click", () => {
    running = !running;
    els.play.textContent = running ? "Pause" : "Play";
    els.play.classList.toggle("active", running);
    els.play.setAttribute("aria-pressed", String(running));
  });

  els.speed.addEventListener("input", () => {
    setSpeed(speedFromSlider(Number(els.speed.value)), false);
  });

  els.track.addEventListener("click", () => {
    trackSelected = !trackSelected;
    els.track.classList.toggle("active", trackSelected);
    els.track.setAttribute("aria-pressed", String(trackSelected));
  });

  els.labelsToggle.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    els.labelsToggle.classList.toggle("active", labelsVisible);
    els.labelsToggle.setAttribute("aria-pressed", String(labelsVisible));
  });

  els.orbitsToggle.addEventListener("click", () => {
    setOrbitLinesVisible(!orbitLinesVisible);
  });

  els.reset.addEventListener("click", () => {
    controls.target.set(0, 0, 0);
    camera.position.copy(HOME_POSITION);
    controls.minDistance = 0.2;
    simDays = 0;
    spinClock = 0;
    for (const record of records.values()) record.spin = 0;
    lastFrameTime = performance.now();
  });

  els.search.addEventListener("input", () => {
    const term = els.search.value.trim().toLowerCase();
    document.querySelectorAll(".object-list section").forEach((section) => {
      let visibleButtons = 0;
      section.querySelectorAll(".object-button").forEach((button) => {
        const id = button.dataset.target;
        const data = objectData.get(id);
        const text = `${data.name} ${data.category} ${data.className}`.toLowerCase();
        button.hidden = Boolean(term) && !text.includes(term);
        if (!button.hidden) visibleButtons += 1;
      });
      section.hidden = visibleButtons === 0;
    });
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      els.play.click();
    } else if (event.key.toLowerCase() === "l") {
      els.labelsToggle.click();
    } else if (event.key.toLowerCase() === "o") {
      els.orbitsToggle.click();
    } else if (event.key.toLowerCase() === "t") {
      els.track.click();
    } else if (event.key.toLowerCase() === "r") {
      els.reset.click();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

// Runs last so every module-level constant above is initialised before the
// scene is built. Anything thrown here is reported through window.__solarSystemBoot.
function boot() {
  try {
    setBootPhase("init-scene");
    initScene();
    setBootPhase("build-object-list");
    buildObjectList();
    setBootPhase("build-speed-controls");
    buildSpeedControls();
    setBootPhase("measure-labels");
    measureLabels();
    setBootPhase("bind-events");
    bindEvents();
    setBootPhase("expose-api");
    exposeAppApi();
    setBootPhase("select-initial-object");
    selectObject(selectedId, false);
    setBootPhase("start-animation");
    lastFrameTime = performance.now();
    animate();
    setBootPhase("ready");
  } catch (error) {
    recordBootError(error);
  }
}

function exposeAppApi() {
  window.solarSystemApp = {
    select: selectObject,
    records,
    objectData,
    renderer,
    scene,
    camera,
    get selectedId() {
      return selectedId;
    },
    get simDays() {
      return simDays;
    },
    // Writable so automated checks can jump the clock to, say, a comet's
    // perihelion without waiting decades of simulated time. Positions are
    // recomputed immediately so the scene is consistent before the next frame.
    set simDays(value) {
      simDays = Number.isFinite(Number(value)) ? Number(value) : 0;
      updateBodies(0);
    },
    get lastFrameError() {
      return lastFrameError;
    }
  };
}

boot();
