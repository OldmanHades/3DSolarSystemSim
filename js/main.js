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

const AU_KM = 149597870.7;
const BASE_DATE_UTC = Date.UTC(2026, 5, 12);
const TWO_PI = Math.PI * 2;

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

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 900);
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

const ambientLight = new THREE.AmbientLight("#8ba0bb", 0.42);
scene.add(ambientLight);

const sunLight = new THREE.PointLight("#ffe7b0", 3.5, 600, 1.35);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight("#8fb6ff", 0.28);
fillLight.position.set(-80, 60, 90);
scene.add(fillLight);

const systemRoot = new THREE.Group();
scene.add(systemRoot);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempVec = new THREE.Vector3();
let lastFrameTime = performance.now();

const records = new Map();
const labels = new Map();
const selectableObjects = [];
const textureCache = new Map();
let selectedId = "earth";
let running = true;
let trackSelected = true;
let labelsVisible = true;
let simDays = 0;
let speedDaysPerSecond = Number(els.speed.value);

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

initScene();
buildObjectList();
selectObject(selectedId, false);
animate();

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
  const min = category === "Moon" ? 0.09 : category === "Dwarf planet" ? 0.18 : 0.25;
  const max = category === "Moon" ? 0.42 : 2.55;
  return THREE.MathUtils.clamp(base, min, max);
}

function moonOrbitScale(parent, moon) {
  const parentRadius = bodyRadiusScale(parent.radiusKm, parent.category);
  const logOrbit = Math.log10(Math.max(moon.orbitKm, 1000) / 1000);
  const ringBuffer = parent.rings ? parentRadius * (parent.rings.outer + 0.42) : parentRadius + 0.55;
  return Math.max(ringBuffer, parentRadius + 1.0) + logOrbit * 0.72;
}

function createStarfield() {
  const count = 4200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorA = new THREE.Color("#ffffff");
  const colorB = new THREE.Color("#8fb6ff");
  const colorC = new THREE.Color("#ffd8a6");

  for (let i = 0; i < count; i += 1) {
    const radius = 260 + Math.random() * 220;
    const theta = Math.random() * TWO_PI;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const starColor = Math.random() > 0.82 ? colorB : Math.random() > 0.68 ? colorC : colorA;
    colors[i * 3] = starColor.r;
    colors[i * 3 + 1] = starColor.g;
    colors[i * 3 + 2] = starColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.62,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.82
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = "starfield";
  scene.add(stars);
}

function createBodySystem(data) {
  const visualRadius = bodyRadiusScale(data.radiusKm, data.category);
  const orbitLine = data.semiMajorAU ? createOrbitLine(data, data.category === "Dwarf planet" ? "#7ba4c8" : "#52698b", 0.44) : null;
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

  const record = {
    data,
    group,
    axisGroup,
    mesh,
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
  const isIrregular = data.category === "Moon" && data.radiusKm < 300;
  const geometry = isIrregular
    ? new THREE.IcosahedronGeometry(1, 2)
    : new THREE.SphereGeometry(1, 64, 32);
  const texture = getTexture(data);
  const material = data.category === "Star"
    ? new THREE.MeshBasicMaterial({ map: texture, color: "#fff1a6" })
    : new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.92,
      metalness: 0,
      emissive: new THREE.Color(data.color ?? "#ffffff"),
      emissiveIntensity: data.category === "Comet" ? 0.1 : 0.015
    });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  const stretch = data.stretch ?? [1, 1, 1];
  mesh.scale.set(visualRadius * stretch[0], visualRadius * stretch[1], visualRadius * stretch[2]);
  mesh.userData.objectId = data.id;
  mesh.userData.kind = data.category;
  return mesh;
}

function createSunGlow(parent, visualRadius) {
  const glowGeometry = new THREE.SphereGeometry(visualRadius * 1.8, 48, 24);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: "#ffb33b",
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  parent.add(glow);
}

function createRings(data, visualRadius, parent) {
  const ring = data.rings;
  const geometry = new THREE.RingGeometry(visualRadius * ring.inner, visualRadius * ring.outer, 160, 3);
  const material = new THREE.MeshStandardMaterial({
    color: ring.color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: ring.opacity,
    roughness: 0.8,
    metalness: 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.name = `${data.name} rings`;
  mesh.userData.objectId = data.id;
  parent.add(mesh);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: ring.color,
    transparent: true,
    opacity: Math.min(ring.opacity + 0.16, 0.82)
  });
  for (const scale of [ring.inner, (ring.inner + ring.outer) / 2, ring.outer]) {
    const points = circlePoints(visualRadius * scale, 180, 0);
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
    parent.add(line);
  }
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

function createComet(data) {
  const orbitLine = createOrbitLine(data, "#9bcfff", 0.55, true);
  systemRoot.add(orbitLine);

  const group = new THREE.Group();
  systemRoot.add(group);
  const visualRadius = 0.16;

  const coma = new THREE.Mesh(
    new THREE.SphereGeometry(visualRadius * 2.3, 24, 12),
    new THREE.MeshBasicMaterial({
      color: "#cdefff",
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(coma);

  const nucleus = createBodyMesh(data, visualRadius);
  group.add(nucleus);
  selectableObjects.push(nucleus);

  const tailGeometry = new THREE.ConeGeometry(visualRadius * 0.75, 3.8, 18, 1, true);
  const tailMaterial = new THREE.MeshBasicMaterial({
    color: "#d9f2ff",
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = 1.9;
  group.add(tail);

  const record = {
    data,
    group,
    mesh: nucleus,
    tail,
    visualRadius,
    orbitLine,
    type: "comet"
  };
  records.set(data.id, record);
  createLabel(data.id, data.name, data.category);
}

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

  const particleCount = region.id === "kuiper-belt" ? 1500 : 900;
  const positions = new Float32Array(particleCount * 3);
  const color = new THREE.Color(region.color);
  for (let i = 0; i < particleCount; i += 1) {
    const theta = Math.random() * TWO_PI;
    const au = region.innerAU + Math.random() * (region.outerAU - region.innerAU);
    const radius = distanceScale(au);
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * (region.id === "kuiper-belt" ? 3.4 : 1.5);
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

  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = displayRadius * (0.8 + Math.random() * 0.18);
    const theta = Math.random() * TWO_PI;
    const phi = Math.acos(2 * Math.random() - 1);
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

function keplerPosition(data, days) {
  if (!data.semiMajorAU) return new THREE.Vector3(0, 0, 0);
  const period = Math.abs(data.orbitalPeriodDays);
  const direction = data.orbitalPeriodDays < 0 ? -1 : 1;
  const meanAnomaly = normalizeAngle((data.phase ?? 0) + direction * TWO_PI * (days / period));
  const eccentricity = data.eccentricity ?? 0;
  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );
  const radius = data.semiMajorAU * (1 - eccentricity * Math.cos(eccentricAnomaly));
  return inclinedPosition(radius, trueAnomaly, data.inclinationDeg ?? 0);
}

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 8; i += 1) {
    const delta = (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-6) break;
  }
  return eccentricAnomaly;
}

function normalizeAngle(value) {
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

function getTexture(data) {
  const key = `${data.id}:${data.texture ?? "smooth"}:${data.color}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const base = new THREE.Color(data.color ?? "#cccccc");
  const seed = hashCode(data.id);
  const random = mulberry32(seed);

  paintBase(ctx, canvas, base);
  const style = data.texture ?? "smooth";

  if (style === "sun") paintSun(ctx, canvas, random);
  else if (style === "bands" || style === "bandsSoft") paintBands(ctx, canvas, base, random, style === "bandsSoft");
  else if (style === "earth") paintEarth(ctx, canvas, random);
  else if (style === "mars") paintMars(ctx, canvas, random);
  else if (style === "clouds") paintClouds(ctx, canvas, random);
  else if (style === "cratered") paintCratered(ctx, canvas, base, random);
  else if (style === "ice") paintIce(ctx, canvas, base, random);
  else if (style === "volcanic") paintVolcanic(ctx, canvas, random);
  else if (style === "haze") paintHaze(ctx, canvas, base, random);
  else if (style === "pluto") paintPluto(ctx, canvas, random);
  else if (style === "twoTone") paintTwoTone(ctx, canvas, base, random);
  else if (style === "neptune") paintNeptune(ctx, canvas, random);
  else if (style === "rocky") paintRocky(ctx, canvas, base, random);

  addFineNoise(ctx, canvas, random, style === "sun" ? 0.16 : 0.1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function paintBase(ctx, canvas, base) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, lighten(base, 0.22));
  gradient.addColorStop(0.52, `#${base.getHexString()}`);
  gradient.addColorStop(1, darken(base, 0.28));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function paintSun(ctx, canvas, random) {
  for (let i = 0; i < 70; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 18 + random() * 52;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255, 245, 150, 0.7)");
    gradient.addColorStop(1, "rgba(255, 90, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TWO_PI);
    ctx.fill();
  }
}

function paintBands(ctx, canvas, base, random, soft) {
  for (let y = 0; y < canvas.height; y += 1) {
    const band = Math.sin(y * 0.08) * 0.5 + Math.sin(y * 0.027 + 2.1) * 0.5;
    const shade = band * (soft ? 0.08 : 0.18);
    ctx.fillStyle = shade > 0 ? lighten(base, shade) : darken(base, Math.abs(shade));
    ctx.fillRect(0, y, canvas.width, 1);
  }

  if (!soft) {
    ctx.fillStyle = "rgba(150, 55, 34, 0.62)";
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.69, canvas.height * 0.58, 34, 15, -0.08, 0, TWO_PI);
    ctx.fill();
  }

  ctx.globalAlpha = 0.26;
  for (let i = 0; i < 18; i += 1) {
    const y = random() * canvas.height;
    ctx.fillStyle = random() > 0.5 ? "#fff3d2" : "#8f6a52";
    ctx.fillRect(0, y, canvas.width, 1 + random() * 3);
  }
  ctx.globalAlpha = 1;
}

function paintEarth(ctx, canvas, random) {
  ctx.fillStyle = "#2e75c7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 26; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 18 + random() * 46, "#4f8f50", random, 0.72);
  }
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.globalAlpha = 0.48;
  for (let i = 0; i < 26; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 14 + random() * 34, "#ffffff", random, 0.46);
  }
  ctx.globalAlpha = 1;
}

function paintMars(ctx, canvas, random) {
  ctx.fillStyle = "#b74f32";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 34; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 8 + random() * 36, random() > 0.5 ? "#773a2c" : "#e1905e", random, 0.58);
  }
  ctx.fillStyle = "rgba(245,230,210,0.7)";
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 11, canvas.width, 11);
}

function paintClouds(ctx, canvas, random) {
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 42; i += 1) {
    const y = random() * canvas.height;
    ctx.strokeStyle = random() > 0.5 ? "#f0d9a2" : "#b98854";
    ctx.lineWidth = 5 + random() * 9;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    for (let x = 0; x < canvas.width + 40; x += 38) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + random() * 4) * 14);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintCratered(ctx, canvas, base, random) {
  for (let i = 0; i < 70; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 2 + random() * 13;
    ctx.strokeStyle = darken(base, 0.25 + random() * 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TWO_PI);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.04 + random() * 0.07})`;
    ctx.beginPath();
    ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.45, 0, TWO_PI);
    ctx.fill();
  }
}

function paintIce(ctx, canvas, base, random) {
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 36; i += 1) {
    ctx.strokeStyle = random() > 0.5 ? "#ffffff" : darken(base, 0.18);
    ctx.lineWidth = 1 + random() * 2;
    ctx.beginPath();
    let x = random() * canvas.width;
    let y = random() * canvas.height;
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j += 1) {
      x += (random() - 0.5) * 46;
      y += (random() - 0.5) * 24;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintVolcanic(ctx, canvas, random) {
  ctx.fillStyle = "#d7b34e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 42; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 6 + random() * 24, random() > 0.5 ? "#5c3e2b" : "#f5e48b", random, 0.58);
  }
  for (let i = 0; i < 12; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 4 + random() * 11, "#b2442c", random, 0.72);
  }
}

function paintHaze(ctx, canvas, base, random) {
  paintClouds(ctx, canvas, random);
  ctx.fillStyle = "rgba(230, 145, 52, 0.34)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 20; y < canvas.height; y += 26) {
    ctx.fillStyle = "rgba(255, 219, 142, 0.16)";
    ctx.fillRect(0, y, canvas.width, 6);
  }
}

function paintPluto(ctx, canvas, random) {
  ctx.fillStyle = "#a06f52";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paintBlob(ctx, canvas.width * 0.62, canvas.height * 0.48, 70, "#e8d7bf", random, 0.9);
  for (let i = 0; i < 28; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 8 + random() * 26, random() > 0.5 ? "#7c5545" : "#d8b89a", random, 0.4);
  }
}

function paintTwoTone(ctx, canvas, base, random) {
  ctx.fillStyle = darken(base, 0.32);
  ctx.fillRect(0, 0, canvas.width / 2, canvas.height);
  ctx.fillStyle = lighten(base, 0.24);
  ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
  paintCratered(ctx, canvas, base, random);
}

function paintNeptune(ctx, canvas, random) {
  ctx.fillStyle = "#2f61ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const shade = Math.sin(y * 0.055) * 0.14;
    ctx.fillStyle = shade > 0 ? `rgba(120,170,255,${shade})` : `rgba(0,20,80,${Math.abs(shade)})`;
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.fillStyle = "rgba(12,24,78,0.58)";
  ctx.beginPath();
  ctx.ellipse(canvas.width * 0.63, canvas.height * 0.55, 24, 11, 0.1, 0, TWO_PI);
  ctx.fill();
}

function paintRocky(ctx, canvas, base, random) {
  for (let i = 0; i < 45; i += 1) {
    paintBlob(ctx, random() * canvas.width, random() * canvas.height, 4 + random() * 22, random() > 0.5 ? darken(base, 0.24) : lighten(base, 0.2), random, 0.42);
  }
}

function paintBlob(ctx, cx, cy, radius, color, random, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= 18; i += 1) {
    const angle = (i / 18) * TWO_PI;
    const r = radius * (0.65 + random() * 0.55);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * (0.45 + random() * 0.35);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function addFineNoise(ctx, canvas, random, amount) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (random() - 0.5) * 255 * amount;
    imageData.data[i] = clampByte(imageData.data[i] + noise);
    imageData.data[i + 1] = clampByte(imageData.data[i + 1] + noise);
    imageData.data[i + 2] = clampByte(imageData.data[i + 2] + noise);
  }
  ctx.putImageData(imageData, 0, 0);
}

function lighten(color, amount) {
  return `#${color.clone().lerp(new THREE.Color("#ffffff"), amount).getHexString()}`;
}

function darken(color, amount) {
  return `#${color.clone().lerp(new THREE.Color("#000000"), amount).getHexString()}`;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value));
}

function hashCode(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildObjectList() {
  const order = FEATURED_ORDER.filter((id) => objectData.has(id));
  const groups = [
    ["Core", ["sun"]],
    ["Planets", order.filter((id) => objectData.get(id)?.category === "Planet")],
    ["Moons", order.filter((id) => objectData.get(id)?.category === "Moon")],
    ["Dwarf Planets", order.filter((id) => objectData.get(id)?.category === "Dwarf planet")],
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

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  if (running) simDays += delta * speedDaysPerSecond;

  updateBodies(delta);
  updateLabels();
  updateSelectionHalo();
  updateDate();

  if (trackSelected) {
    const target = getObjectPosition(selectedId);
    controls.target.lerp(target, 0.08);
  }
  controls.update();
  renderer.render(scene, camera);
}

function updateBodies(delta) {
  for (const record of records.values()) {
    const data = record.data;
    if (record.type === "body") {
      if (data.semiMajorAU) record.group.position.copy(keplerPosition(data, simDays));
      const rotationHours = data.rotationHours || 24;
      record.mesh.rotation.y += (delta * TWO_PI * 24 / Math.abs(rotationHours)) * Math.sign(rotationHours);

      for (const moonRecord of record.satellites) updateMoon(moonRecord, delta);
    } else if (record.type === "comet") {
      record.group.position.copy(keplerPosition(data, simDays));
      record.mesh.rotation.y += delta * 0.9;
      const away = record.group.position.clone().normalize();
      const angle = Math.atan2(away.z, away.x);
      record.tail.rotation.set(0, -angle, Math.PI / 2);
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
  els.date.textContent = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

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

renderer.domElement.addEventListener("pointerdown", onPointerDown);
window.addEventListener("resize", onResize);

els.play.addEventListener("click", () => {
  running = !running;
  els.play.textContent = running ? "Pause" : "Play";
  els.play.setAttribute("aria-pressed", String(running));
});

els.speed.addEventListener("input", () => {
  speedDaysPerSecond = Number(els.speed.value);
  els.speedValue.textContent = `${formatNumber(speedDaysPerSecond, 0)} d/s`;
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

window.solarSystemApp = {
  select: selectObject,
  records,
  objectData,
  get selectedId() {
    return selectedId;
  },
  get simDays() {
    return simDays;
  }
};
