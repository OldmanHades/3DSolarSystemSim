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
  createTextureSet,
  hashCode,
  mulberry32
} from "./textures.js";

const AU_KM = 149597870.7;
const BASE_DATE_UTC = Date.UTC(2026, 5, 12);
const TWO_PI = Math.PI * 2;
const UP_Y = new THREE.Vector3(0, 1, 0);

const SPEED_MIN = 0.02;
const SPEED_MAX = 500;
const SPEED_PRESETS = [
  { label: "1 hr/s", value: 1 / 24 },
  { label: "1 day/s", value: 1 },
  { label: "1 wk/s", value: 7 },
  { label: "1 mo/s", value: 30.44 },
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

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 62, 150);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
els.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5;
controls.maxDistance = 420;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight("#8ba0bb", 0.36);
scene.add(ambientLight);

const sunLight = new THREE.PointLight("#ffe7b0", 3.6, 700, 1.32);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight("#8fb6ff", 0.24);
fillLight.position.set(-80, 60, 90);
scene.add(fillLight);

const systemRoot = new THREE.Group();
scene.add(systemRoot);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastFrameTime = performance.now();
let elapsedSeconds = 0;

const records = new Map();
const labels = new Map();
const selectableObjects = [];
const beltRockSystems = [];
const instanceDummy = new THREE.Object3D();
let sunPulse = null;
let selectedId = "earth";
let running = true;
let trackSelected = true;
let labelsVisible = true;
let simDays = 0;
let speedDaysPerSecond = 7;
let lastFrameError = null;
let frameErrorReported = false;

const selectionHalo = new THREE.Mesh(
  new THREE.SphereGeometry(1, 36, 18),
  new THREE.MeshBasicMaterial({
    color: "#fff2a8",
    transparent: true,
    opacity: 0.26,
    wireframe: true,
    depthWrite: false
  })
);
selectionHalo.visible = false;
scene.add(selectionHalo);

try {
  setBootPhase("init-scene");
  initScene();
  setBootPhase("build-object-list");
  buildObjectList();
  setBootPhase("build-speed-controls");
  buildSpeedControls();
  setBootPhase("bind-events");
  bindEvents();
  setBootPhase("expose-api");
  exposeAppApi();
  setBootPhase("select-initial-object");
  selectObject(selectedId, false);
  setBootPhase("start-animation");
  animate();
  setBootPhase("ready");
} catch (error) {
  recordBootError(error);
}

function initScene() {
  createStarfield();
  for (const region of REGIONS) createRegion(region);
  for (const body of BODIES) createBodySystem(body);
  for (const comet of COMETS) createComet(comet);
  els.accuracy.textContent = `Reviewed ${REVIEWED_AT}. Orbits use real periods, semimajor axes, eccentricity, and inclination with visual distance and body-size compression for usability.`;
}

function distanceScale(au) {
  if (!au) return 0;
  return 10 * Math.pow(Math.max(au, 0.001), 0.68);
}

function bodyRadiusScale(radiusKm, category) {
  if (category === "Star") return 3.8;
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
    { count: 3400, size: 0.45, opacity: 0.8 },
    { count: 2100, size: 0.85, opacity: 0.72 },
    { count: 420, size: 1.55, opacity: 0.9 }
  ];
  const colorA = new THREE.Color("#ffffff");
  const colorB = new THREE.Color("#8fb6ff");
  const colorC = new THREE.Color("#ffd8a6");
  const random = mulberry32(hashCode("starfield"));

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
      size: layer.size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: layer.opacity,
      depthWrite: false
    });
    scene.add(new THREE.Points(geometry, material));
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
    size: 0.5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
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
  scene.add(band);
}

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

function createBodySystem(data) {
  const visualRadius = bodyRadiusScale(data.radiusKm, data.category);
  const orbitColor = data.category === "Dwarf planet"
    ? "#7ba4c8"
    : data.category === "Asteroid"
      ? "#8a7f6d"
      : "#52698b";
  const orbitLine = data.semiMajorAU ? createOrbitLine(data, orbitColor, 0.44) : null;
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
  if (data.rings) createRings(data, visualRadius, axisGroup);
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
    visualRadius,
    orbitLine,
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
    material = new THREE.MeshBasicMaterial({ map: textures.map, color: "#fff1a6" });
  } else {
    material = new THREE.MeshStandardMaterial({
      map: textures.map,
      roughness: textures.roughnessMap ? 1 : 0.92,
      metalness: 0,
      emissive: new THREE.Color(data.color ?? "#ffffff"),
      emissiveIntensity: data.category === "Comet" ? 0.1 : 0.015
    });
    if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
    if (textures.bumpMap) {
      material.bumpMap = textures.bumpMap;
      material.bumpScale = 0.045;
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

function createAtmosphereShell(visualRadius, atmosphere, stretch) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(visualRadius * 1.14, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(atmosphere.color) },
        uIntensity: { value: atmosphere.intensity },
        uPower: { value: 3.1 }
      },
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
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), uPower);
          gl_FragColor = vec4(uColor, rim * uIntensity);
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
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(visualRadius * 1.35, 48, 24),
    new THREE.MeshBasicMaterial({
      color: "#ffb33b",
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  parent.add(shell);

  const innerTexture = createGlowTexture([
    [0, "rgba(255,244,200,0.95)"],
    [0.3, "rgba(255,196,90,0.45)"],
    [0.7, "rgba(255,140,40,0.1)"],
    [1, "rgba(255,120,30,0)"]
  ]);
  const inner = new THREE.Sprite(new THREE.SpriteMaterial({
    map: innerTexture,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  inner.scale.setScalar(visualRadius * 3.6);
  parent.add(inner);

  const coronaTexture = createGlowTexture([
    [0, "rgba(255,214,140,0.5)"],
    [0.3, "rgba(255,170,70,0.16)"],
    [0.65, "rgba(255,130,40,0.05)"],
    [1, "rgba(255,110,30,0)"]
  ]);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: coronaTexture,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  corona.scale.setScalar(visualRadius * 7.2);
  parent.add(corona);

  sunPulse = { inner, corona, innerBase: visualRadius * 3.6, coronaBase: visualRadius * 7.2 };
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
  const material = new THREE.MeshBasicMaterial({
    map: createRingTexture(ring.style ?? "jupiter"),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: Math.min(ring.opacity + 0.42, 1),
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.name = `${data.name} rings`;
  mesh.userData.objectId = data.id;
  parent.add(mesh);
}

function createMoonSystem(parentData, moon, parentAxisGroup) {
  const orbitDistance = moonOrbitScale(parentData, moon);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: "#7d8ca8",
    transparent: true,
    opacity: 0.42
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

  const record = {
    data: moon,
    parentId: parentData.id,
    group,
    mesh,
    visualRadius,
    orbitDistance,
    orbitLine,
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
  const orbitLine = createOrbitLine(data, "#9bcfff", 0.5, true);
  systemRoot.add(orbitLine);

  const group = new THREE.Group();
  systemRoot.add(group);
  const visualRadius = 0.16;

  const nucleus = createBodyMesh(data, visualRadius);
  group.add(nucleus);
  selectableObjects.push(nucleus);

  const comaTexture = createGlowTexture([
    [0, "rgba(214,240,255,0.9)"],
    [0.4, "rgba(160,212,255,0.32)"],
    [1, "rgba(140,190,255,0)"]
  ]);
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({
    map: comaTexture,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  coma.scale.setScalar(1.2);
  group.add(coma);

  const tailGroup = new THREE.Group();
  group.add(tailGroup);
  // Ion tail: straight, bluish, narrow, points directly away from the Sun
  const ionTail = createTailMesh(5.2, 0.2, "#9fd4ff", 0.3);
  tailGroup.add(ionTail);
  // Dust tail: broader, warmer, lagging slightly behind the orbital motion
  const dustTail = createTailMesh(3.2, 0.42, "#e9dfc9", 0.2);
  dustTail.rotation.z = 0.24;
  tailGroup.add(dustTail);

  const record = {
    data,
    group,
    mesh: nucleus,
    coma,
    tailGroup,
    visualRadius,
    orbitLine,
    type: "comet"
  };
  records.set(data.id, record);
  createLabel(data.id, data.name, data.category);
}

function createTailMesh(length, baseRadius, color, opacity) {
  const geometry = new THREE.ConeGeometry(baseRadius, length, 20, 1, true);
  geometry.rotateX(Math.PI);
  geometry.translate(0, length / 2, 0);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geometry, material);
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
    color: isKuiper ? "#9ab4d4" : "#8a7a66",
    roughness: 0.95,
    metalness: 0
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const rocks = [];
  for (let i = 0; i < count; i += 1) {
    const au = region.innerAU + random() * (region.outerAU - region.innerAU);
    rocks.push({
      radius: distanceScale(au),
      angle: random() * TWO_PI,
      speed: TWO_PI / (365.25 * Math.pow(au, 1.5)),
      y: (random() - 0.5) * (isKuiper ? 3.6 : 1.4),
      scale: (isKuiper ? 0.05 : 0.024) + random() * (isKuiper ? 0.08 : 0.05),
      spinAxis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      spinPhase: random() * TWO_PI,
      spinRate: 0.2 + random() * 1.4
    });
  }
  systemRoot.add(mesh);
  beltRockSystems.push({ mesh, rocks });
}

function createOortCloud(region) {
  const displayRadius = 220;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(displayRadius, 48, 24),
    new THREE.MeshBasicMaterial({
      color: region.color,
      transparent: true,
      opacity: 0.035,
      wireframe: true,
      depthWrite: false
    })
  );
  shell.userData.objectId = region.id;
  shell.userData.kind = "Region";
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

function createOrbitLine(data, color, opacity = 0.45, comet = false) {
  const points = [];
  const segments = comet ? 480 : 280;
  const eccentricity = data.eccentricity ?? 0;
  const semiMajor = data.semiMajorAU;
  for (let i = 0; i <= segments; i += 1) {
    const trueAnomaly = (i / segments) * TWO_PI;
    const r = semiMajor * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
    points.push(inclinedPosition(r, trueAnomaly, data.inclinationDeg ?? 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity
  });
  const line = new THREE.Line(geometry, material);
  line.name = `${data.name} orbit`;
  return line;
}

function circlePoints(radius, segments, y) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * TWO_PI;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  return points;
}

function inclinedPosition(au, trueAnomaly, inclinationDeg) {
  const scaled = distanceScale(au);
  const x = Math.cos(trueAnomaly) * scaled;
  const z = Math.sin(trueAnomaly) * scaled;
  const inc = THREE.MathUtils.degToRad(inclinationDeg);
  return new THREE.Vector3(x, -z * Math.sin(inc), z * Math.cos(inc));
}

function keplerState(data, days) {
  if (!data.semiMajorAU) return { position: new THREE.Vector3(), rAU: 0 };
  const period = Math.abs(data.orbitalPeriodDays);
  const direction = data.orbitalPeriodDays < 0 ? -1 : 1;
  const meanAnomaly = normalizeAngle((data.phase ?? 0) + direction * TWO_PI * (days / period));
  const eccentricity = data.eccentricity ?? 0;
  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );
  const rAU = data.semiMajorAU * (1 - eccentricity * Math.cos(eccentricAnomaly));
  return { position: inclinedPosition(rAU, trueAnomaly, data.inclinationDeg ?? 0), rAU };
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
    const h = document.createElement("h3");
    h.textContent = heading;
    section.appendChild(h);
    for (const id of ids) {
      const data = objectData.get(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "object-button";
      button.dataset.target = id;
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
  setSpeed(speedFromSlider(Number(els.speed.value)), false);
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
  });
  labels.forEach((label, labelId) => label.classList.toggle("active", labelId === id));

  els.title.textContent = data.name;
  els.subtitle.textContent = `${data.category} - ${data.className}`;
  els.summary.textContent = data.summary;
  renderStats(data);
  renderDetails(data);
  renderSources(data);

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

function focusSelected() {
  const position = getObjectPosition(selectedId);
  const record = records.get(selectedId);
  const radius = record?.visualRadius ?? 1;
  const distance = THREE.MathUtils.clamp(radius * 11 + 8, 8, selectedId === "oort-cloud" ? 320 : 86);
  const offset = new THREE.Vector3(distance * 0.9, distance * 0.52, distance);
  camera.position.copy(position.clone().add(offset));
  controls.target.copy(position);
  controls.update();
}

function getObjectPosition(id) {
  const record = records.get(id);
  if (!record) return new THREE.Vector3();
  if (record.labelPosition) return record.labelPosition.clone();
  const position = new THREE.Vector3();
  (record.group ?? record.mesh).getWorldPosition(position);
  return position;
}

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

function animate() {
  requestAnimationFrame(animate);
  try {
    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    elapsedSeconds += delta;
    if (running) simDays += delta * speedDaysPerSecond;

    updateBodies(delta);
    updateBeltRocks();
    updateSunPulse();
    updateLabels();
    updateSelectionHalo();
    updateDate();

    if (trackSelected) {
      const target = getObjectPosition(selectedId);
      controls.target.lerp(target, 0.08);
    }
    controls.update();
    renderer.render(scene, camera);
  } catch (error) {
    lastFrameError = error;
    if (!frameErrorReported) {
      console.error("Solar system animation frame failed", error);
      frameErrorReported = true;
    }
  }
}

function updateBodies(delta) {
  for (const record of records.values()) {
    const data = record.data;
    if (record.type === "body") {
      if (data.semiMajorAU) record.group.position.copy(keplerState(data, simDays).position);
      const rotationHours = data.rotationHours || 24;
      record.mesh.rotation.y += (delta * TWO_PI * 24 / Math.abs(rotationHours)) * Math.sign(rotationHours);
      if (record.clouds) record.clouds.rotation.y += delta * TWO_PI * 24 / Math.abs(rotationHours) * 1.18;

      for (const moonRecord of record.satellites) updateMoon(moonRecord, delta);
    } else if (record.type === "comet") {
      const state = keplerState(data, simDays);
      record.group.position.copy(state.position);
      record.mesh.rotation.y += delta * 0.9;

      // Tails always point away from the Sun; activity scales with distance
      const away = record.group.position.clone().normalize();
      record.tailGroup.quaternion.setFromUnitVectors(UP_Y, away);
      const activity = THREE.MathUtils.clamp(1.6 / Math.max(state.rAU, 0.05) - 0.18, 0, 1);
      record.tailGroup.visible = activity > 0.02;
      record.tailGroup.scale.set(0.5 + activity * 0.6, Math.max(activity, 0.001), 0.5 + activity * 0.6);
      record.coma.material.opacity = 0.1 + activity * 0.55;
      record.coma.scale.setScalar(0.6 + activity * 1.4);
    }
  }
}

function updateMoon(record, delta) {
  const data = record.data;
  const period = Math.abs(data.orbitalPeriodDays);
  const direction = data.orbitalPeriodDays < 0 ? -1 : 1;
  const angle = (data.phase ?? 0) + direction * TWO_PI * (simDays / period);
  record.group.position.set(Math.cos(angle) * record.orbitDistance, 0, Math.sin(angle) * record.orbitDistance);
  if (data.rotationHours) {
    record.mesh.rotation.y += (delta * TWO_PI * 24 / Math.abs(data.rotationHours)) * Math.sign(data.rotationHours);
  }
}

function updateBeltRocks() {
  for (const system of beltRockSystems) {
    const { mesh, rocks } = system;
    for (let i = 0; i < rocks.length; i += 1) {
      const rock = rocks[i];
      const angle = rock.angle + rock.speed * simDays;
      instanceDummy.position.set(Math.cos(angle) * rock.radius, rock.y, Math.sin(angle) * rock.radius);
      instanceDummy.quaternion.setFromAxisAngle(rock.spinAxis, rock.spinPhase + elapsedSeconds * rock.spinRate * 0.2);
      instanceDummy.scale.setScalar(rock.scale);
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

function updateLabels() {
  const candidates = [];
  labels.forEach((label, id) => {
    if (!labelsVisible) {
      label.hidden = true;
      return;
    }
    const position = getObjectPosition(id);
    const projected = position.clone().project(camera);
    const visible = projected.z > -1 && projected.z < 1;
    label.hidden = !visible;
    if (!visible) return;

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    label.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    label.hidden = false;

    const data = objectData.get(id);
    const priority = id === selectedId
      ? 0
      : data.category === "Star" || data.category === "Planet"
        ? 1
        : data.category === "Dwarf planet" || data.category === "Region"
          ? 2
          : 3;
    const width = label.offsetWidth;
    const height = label.offsetHeight;
    candidates.push({
      id,
      label,
      priority,
      rect: {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2
      }
    });
  });

  candidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const placed = [];
  for (const candidate of candidates) {
    const crowded = candidate.priority !== 0 && placed.some((placedCandidate) => rectsOverlap(candidate.rect, placedCandidate.rect, 5));
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
  } else {
    const position = getObjectPosition(selectedId);
    selectionHalo.visible = true;
    selectionHalo.position.copy(position);
    selectionHalo.scale.setScalar(Math.max(record.visualRadius * 1.55, 0.34));
  }

  for (const object of selectableObjects) {
    const isSelected = object.userData.objectId === selectedId;
    const material = object.material;
    if (!material) continue;
    if (material.emissive) material.emissiveIntensity = isSelected ? 0.25 : object.userData.kind === "Comet" ? 0.1 : 0.015;
    if (regionIds.has(object.userData.objectId)) material.opacity = isSelected ? 0.16 : object.userData.objectId === "kuiper-belt" ? 0.08 : 0.055;
  }
}

function updateDate() {
  const date = new Date(BASE_DATE_UTC + simDays * 86400000);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  };
  if (speedDaysPerSecond < 3) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = false;
  }
  els.date.textContent = date.toLocaleString("en-US", options);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function onPointerDown(event) {
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

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function bindEvents() {
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
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

  els.reset.addEventListener("click", () => {
    controls.target.set(0, 0, 0);
    camera.position.set(0, 62, 150);
    simDays = 0;
    lastFrameTime = performance.now();
  });

  els.search.addEventListener("input", () => {
    const term = els.search.value.trim().toLowerCase();
    document.querySelectorAll(".object-button").forEach((button) => {
      const id = button.dataset.target;
      const data = objectData.get(id);
      const text = `${data.name} ${data.category} ${data.className}`.toLowerCase();
      button.hidden = Boolean(term) && !text.includes(term);
    });
  });
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
    get lastFrameError() {
      return lastFrameError;
    }
  };
}
