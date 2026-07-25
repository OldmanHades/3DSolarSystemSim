import * as THREE from "three";

const TWO_PI = Math.PI * 2;

export function hashCode(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

function lighten(color, amount) {
  return `#${color.clone().lerp(new THREE.Color("#ffffff"), amount).getHexString()}`;
}

function darken(color, amount) {
  return `#${color.clone().lerp(new THREE.Color("#000000"), amount).getHexString()}`;
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const { canvas, ctx } = makeCanvas(256, 256);
  const random = mulberry32(0x5eed);
  const imageData = ctx.createImageData(256, 256);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 96 + random() * 64;
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  noiseTile = canvas;
  return noiseTile;
}

function applyNoise(ctx, width, height, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), "repeat");
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function paintBase(ctx, w, h, base) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, lighten(base, 0.18));
  gradient.addColorStop(0.5, `#${base.getHexString()}`);
  gradient.addColorStop(1, darken(base, 0.24));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function paintBlob(ctx, cx, cy, radius, color, random, alpha, squash = 0.55) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= 20; i += 1) {
    const angle = (i / 20) * TWO_PI;
    const r = radius * (0.62 + random() * 0.55);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * (squash + random() * 0.3);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draws a crater on the color layer and, when provided, matching relief on the height layer.
function paintCrater(ctx, hctx, x, y, radius, base, random, options = {}) {
  const depth = options.depth ?? 0.3;
  const rim = options.rim ?? true;

  const floor = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
  floor.addColorStop(0, darken(base, depth + 0.1));
  floor.addColorStop(0.75, darken(base, depth * 0.6));
  floor.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();

  if (rim) {
    ctx.strokeStyle = lighten(base, 0.22);
    ctx.lineWidth = Math.max(1, radius * 0.14);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.92, Math.PI * 0.85, Math.PI * 1.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (hctx) {
    const pit = hctx.createRadialGradient(x, y, 0, x, y, radius);
    pit.addColorStop(0, "rgba(40,40,40,0.85)");
    pit.addColorStop(0.72, "rgba(70,70,70,0.5)");
    pit.addColorStop(0.85, "rgba(215,215,215,0.75)");
    pit.addColorStop(1, "rgba(128,128,128,0)");
    hctx.fillStyle = pit;
    hctx.beginPath();
    hctx.arc(x, y, radius, 0, TWO_PI);
    hctx.fill();
  }
}

function paintRayCrater(ctx, hctx, x, y, radius, base, random, w) {
  paintCrater(ctx, hctx, x, y, radius, base, random, { depth: 0.34 });
  ctx.save();
  ctx.strokeStyle = lighten(base, 0.4);
  for (let i = 0; i < 12; i += 1) {
    const angle = random() * TWO_PI;
    const length = radius * (2.5 + random() * 5);
    ctx.globalAlpha = 0.1 + random() * 0.14;
    ctx.lineWidth = 1 + random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.6);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// Per-pixel latitude-banded shading with turbulence, for the giant planets.
function paintBandedGiant(ctx, w, h, stops, random, turbulence = 0.018, harmonics = 3) {
  const colors = stops.map(([t, hex]) => [t, new THREE.Color(hex)]);
  const phases = [];
  for (let i = 0; i < harmonics; i += 1) {
    phases.push({
      fx: 2 + random() * 6,
      fy: 14 + random() * 30,
      p: random() * TWO_PI,
      amp: turbulence * (0.4 + random() * 0.8)
    });
  }
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const sample = new THREE.Color();
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let t = y / h;
      const u = x / w;
      for (const hm of phases) {
        t += hm.amp * Math.sin(u * TWO_PI * hm.fx + t * hm.fy + hm.p);
      }
      t = Math.min(0.999, Math.max(0, t));
      let i = 1;
      while (i < colors.length - 1 && colors[i][0] < t) i += 1;
      const [t0, c0] = colors[i - 1];
      const [t1, c1] = colors[i];
      const mix = Math.min(1, Math.max(0, (t - t0) / Math.max(t1 - t0, 1e-6)));
      sample.copy(c0).lerp(c1, mix);
      const idx = (y * w + x) * 4;
      data[idx] = sample.r * 255;
      data[idx + 1] = sample.g * 255;
      data[idx + 2] = sample.b * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function paintStorm(ctx, x, y, rx, ry, coreColor, edgeColor, rotation = -0.12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  for (let i = 5; i >= 0; i -= 1) {
    const f = i / 5;
    ctx.globalAlpha = 0.28 + (1 - f) * 0.5;
    ctx.fillStyle = i % 2 === 0 ? coreColor : edgeColor;
    ctx.beginPath();
    ctx.ellipse(f * rx * 0.06, f * ry * 0.05, rx * (0.35 + f * 0.65), ry * (0.35 + f * 0.65), 0, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Per-body painters. Each receives (ctx, hctx, w, h, base, random).  */
/* hctx may be null for bodies without bump relief.                    */
/* ------------------------------------------------------------------ */

const PAINTERS = {
  sun(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#ffdf8a");
    gradient.addColorStop(0.5, "#ffca55");
    gradient.addColorStop(1, "#ff9f3d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Granulation cells
    for (let i = 0; i < 900; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const r = 2 + random() * 7;
      ctx.fillStyle = random() > 0.5 ? "rgba(255,240,170,0.16)" : "rgba(214,105,20,0.14)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }
    // Bright plage regions
    for (let i = 0; i < 26; i += 1) {
      const x = random() * w;
      const y = h * (0.2 + random() * 0.6);
      const r = 14 + random() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,250,190,0.5)");
      g.addColorStop(1, "rgba(255,120,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }
    // Sunspot groups near the activity belts
    for (let i = 0; i < 7; i += 1) {
      const x = random() * w;
      const y = h * (random() > 0.5 ? 0.3 : 0.7) + (random() - 0.5) * h * 0.12;
      const r = 3 + random() * 9;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, "rgba(60,18,4,0.92)");
      g.addColorStop(0.45, "rgba(140,60,10,0.55)");
      g.addColorStop(1, "rgba(255,140,30,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, TWO_PI);
      ctx.fill();
      if (random() > 0.4) {
        const x2 = x + r * (2 + random() * 3);
        const g2 = ctx.createRadialGradient(x2, y, 0, x2, y, r * 1.4);
        g2.addColorStop(0, "rgba(70,22,5,0.85)");
        g2.addColorStop(1, "rgba(255,140,30,0)");
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x2, y, r * 1.4, 0, TWO_PI);
        ctx.fill();
      }
    }
  },

  mercury(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    // Intercrater plains
    for (let i = 0; i < 20; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 30 + random() * 70, random() > 0.5 ? darken(base, 0.1) : lighten(base, 0.08), random, 0.4);
    }
    // Dense cratering with a few ray systems (Kuiper/Debussy style)
    for (let i = 0; i < 110; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 2 + random() * 11, base, random, { depth: 0.26 + random() * 0.18 });
    }
    for (let i = 0; i < 4; i += 1) {
      paintRayCrater(ctx, hctx, random() * w, h * (0.25 + random() * 0.5), 6 + random() * 8, base, random, w);
    }
    // Caloris-like large basin
    const bx = w * 0.28;
    const by = h * 0.38;
    paintCrater(ctx, hctx, bx, by, 52, base, random, { depth: 0.16 });
    ctx.strokeStyle = lighten(base, 0.16);
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 58, 0, TWO_PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  venus(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#e9d9a8"],
      [0.2, "#dcbf7f"],
      [0.38, "#e8cf90"],
      [0.5, "#d2ab66"],
      [0.62, "#e6cd8f"],
      [0.8, "#dcc07f"],
      [1, "#ecdcae"]
    ], random, 0.05, 4);
    // Global Y-shaped cloud feature: dark chevron arms opening westward
    ctx.save();
    ctx.strokeStyle = "rgba(150,110,45,0.32)";
    ctx.lineCap = "round";
    for (let arm = -1; arm <= 1; arm += 2) {
      for (let i = 0; i < 5; i += 1) {
        ctx.lineWidth = 8 + random() * 10;
        ctx.globalAlpha = 0.2 + random() * 0.18;
        ctx.beginPath();
        const y0 = h * 0.5 + arm * (4 + i * 6);
        ctx.moveTo(w * 0.15, y0);
        ctx.bezierCurveTo(w * 0.4, y0 + arm * h * 0.08, w * 0.62, y0 + arm * h * 0.22, w * 0.95, y0 + arm * h * 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Polar collars
    ctx.fillStyle = "rgba(255,244,214,0.4)";
    ctx.fillRect(0, 0, w, h * 0.05);
    ctx.fillRect(0, h * 0.95, w, h * 0.05);
  },

  earth(ctx, hctx, w, h, base, random, layers) {
    // Ocean with depth variation
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, "#1c3f6e");
    ocean.addColorStop(0.5, "#1e5b9e");
    ocean.addColorStop(1, "#173a68");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 22 + random() * 60, random() > 0.5 ? "#255f9c" : "#14487f", random, 0.34);
    }

    // Rough continent shapes on the equirectangular grid (lon 0 at left edge = 180W)
    const landPatches = [
      // North America
      { pts: [[0.08, 0.22], [0.2, 0.16], [0.26, 0.24], [0.24, 0.34], [0.18, 0.42], [0.14, 0.38], [0.1, 0.3]], color: "#5d7f43" },
      // South America
      { pts: [[0.21, 0.48], [0.26, 0.46], [0.29, 0.56], [0.26, 0.72], [0.22, 0.66], [0.21, 0.56]], color: "#4c7a3d" },
      // Greenland
      { pts: [[0.28, 0.12], [0.33, 0.1], [0.34, 0.18], [0.3, 0.2]], color: "#dfe8ec" },
      // Europe
      { pts: [[0.46, 0.2], [0.53, 0.17], [0.56, 0.24], [0.5, 0.28], [0.46, 0.26]], color: "#617e45" },
      // Africa
      { pts: [[0.46, 0.32], [0.54, 0.3], [0.58, 0.4], [0.55, 0.56], [0.5, 0.62], [0.47, 0.5], [0.45, 0.4]], color: "#8c7a42" },
      // Asia
      { pts: [[0.56, 0.14], [0.74, 0.12], [0.84, 0.2], [0.8, 0.32], [0.7, 0.38], [0.62, 0.32], [0.56, 0.24]], color: "#6d7c44" },
      // India + SE Asia
      { pts: [[0.65, 0.38], [0.7, 0.36], [0.72, 0.46], [0.68, 0.48]], color: "#5f7a40" },
      // Australia
      { pts: [[0.78, 0.58], [0.86, 0.56], [0.88, 0.64], [0.82, 0.68], [0.77, 0.64]], color: "#a3833f" }
    ];
    for (const patch of landPatches) {
      ctx.save();
      ctx.fillStyle = patch.color;
      ctx.beginPath();
      patch.pts.forEach(([px, py], i) => {
        const x = px * w + (random() - 0.5) * 8;
        const y = py * h + (random() - 0.5) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      // Interior shading and coastline
      ctx.clip();
      for (let i = 0; i < 8; i += 1) {
        const [px, py] = patch.pts[Math.floor(random() * patch.pts.length)];
        paintBlob(ctx, px * w, py * h, 10 + random() * 22, random() > 0.5 ? "rgba(70,90,40,0.5)" : "rgba(150,130,70,0.4)", random, 0.5);
      }
      ctx.restore();

      if (hctx) {
        hctx.save();
        hctx.fillStyle = "rgba(176,176,176,0.85)";
        hctx.beginPath();
        patch.pts.forEach(([px, py], i) => {
          if (i === 0) hctx.moveTo(px * w, py * h);
          else hctx.lineTo(px * w, py * h);
        });
        hctx.closePath();
        hctx.fill();
        hctx.restore();
      }
      if (layers?.rough) {
        // Land is rough; ocean stays glossy
        const rctx = layers.rough;
        rctx.fillStyle = "rgba(235,235,235,0.95)";
        rctx.beginPath();
        patch.pts.forEach(([px, py], i) => {
          if (i === 0) rctx.moveTo(px * w, py * h);
          else rctx.lineTo(px * w, py * h);
        });
        rctx.closePath();
        rctx.fill();
      }
    }

    // Ice caps
    ctx.fillStyle = "rgba(240,248,255,0.92)";
    ctx.fillRect(0, 0, w, h * 0.045);
    ctx.fillRect(0, h * 0.955, w, h * 0.045);
    for (let i = 0; i < 16; i += 1) {
      paintBlob(ctx, random() * w, random() > 0.5 ? h * 0.05 : h * 0.95, 8 + random() * 18, "rgba(240,248,255,0.8)", random, 0.8, 0.3);
    }

    // Separate cloud layer texture (transparent background)
    if (layers?.clouds) {
      const cctx = layers.clouds;
      cctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 60; i += 1) {
        const y = random() * h;
        const x = random() * w;
        const bandBias = Math.sin((y / h) * Math.PI * 3);
        cctx.globalAlpha = 0.16 + random() * 0.3 + Math.abs(bandBias) * 0.08;
        paintBlob(cctx, x, y, 12 + random() * 42, "#ffffff", random, 0.85, 0.28);
      }
      // Swirling storm systems
      for (let i = 0; i < 6; i += 1) {
        const x = random() * w;
        const y = h * (0.25 + random() * 0.5);
        cctx.strokeStyle = "rgba(255,255,255,0.5)";
        cctx.lineWidth = 3 + random() * 4;
        cctx.beginPath();
        for (let a = 0; a < TWO_PI * 1.8; a += 0.3) {
          const r = 2 + a * (2.4 + random());
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r * 0.55;
          if (a === 0) cctx.moveTo(px, py);
          else cctx.lineTo(px, py);
        }
        cctx.stroke();
      }
      cctx.globalAlpha = 1;
    }
  },

  moon(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    // Maria concentrated on one hemisphere
    const maria = ["#6f6a62", "#65615a", "#75706a"];
    for (let i = 0; i < 9; i += 1) {
      paintBlob(ctx, w * (0.15 + random() * 0.45), h * (0.2 + random() * 0.45), 26 + random() * 52, maria[i % 3], random, 0.75);
    }
    // Bright highlands
    for (let i = 0; i < 14; i += 1) {
      paintBlob(ctx, w * (0.55 + random() * 0.45), random() * h, 18 + random() * 40, lighten(base, 0.12), random, 0.4);
    }
    for (let i = 0; i < 130; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 9, base, random, { depth: 0.24 + random() * 0.2 });
    }
    // Tycho-style ray crater in the southern highlands
    paintRayCrater(ctx, hctx, w * 0.62, h * 0.78, 9, base, random, w);
    paintRayCrater(ctx, hctx, w * 0.3, h * 0.3, 7, base, random, w);
  },

  mars(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#c97a50");
    gradient.addColorStop(0.5, "#c26a42");
    gradient.addColorStop(1, "#a5502f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Dark albedo features (Syrtis Major, Acidalia...)
    for (let i = 0; i < 10; i += 1) {
      paintBlob(ctx, random() * w, h * (0.25 + random() * 0.4), 24 + random() * 56, i % 2 ? "#6e3b28" : "#7d4530", random, 0.55);
    }
    // Bright dusty plains
    for (let i = 0; i < 12; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 18 + random() * 44, "#dd9a64", random, 0.35);
    }
    // Tharsis volcanoes + Olympus Mons
    const volcanoes = [[0.18, 0.4, 9], [0.23, 0.46, 7], [0.26, 0.4, 7], [0.13, 0.36, 13]];
    for (const [vx, vy, vr] of volcanoes) {
      const x = vx * w;
      const y = vy * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, vr * 2.4);
      g.addColorStop(0, "rgba(150,70,45,0.9)");
      g.addColorStop(0.4, "rgba(190,110,70,0.65)");
      g.addColorStop(1, "rgba(190,110,70,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, vr * 2.4, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = "rgba(90,40,28,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, vr * 0.28, 0, TWO_PI);
      ctx.fill();
      if (hctx) {
        const hg = hctx.createRadialGradient(x, y, 0, x, y, vr * 2.4);
        hg.addColorStop(0, "rgba(255,255,255,0.95)");
        hg.addColorStop(0.35, "rgba(200,200,200,0.6)");
        hg.addColorStop(1, "rgba(128,128,128,0)");
        hctx.fillStyle = hg;
        hctx.beginPath();
        hctx.arc(x, y, vr * 2.4, 0, TWO_PI);
        hctx.fill();
      }
    }
    // Valles Marineris canyon system
    ctx.save();
    ctx.strokeStyle = "rgba(70,30,20,0.75)";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.52);
    ctx.bezierCurveTo(w * 0.34, h * 0.5, w * 0.4, h * 0.54, w * 0.46, h * 0.52);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(50,22,15,0.8)";
    ctx.beginPath();
    ctx.moveTo(w * 0.29, h * 0.53);
    ctx.bezierCurveTo(w * 0.35, h * 0.51, w * 0.4, h * 0.55, w * 0.45, h * 0.53);
    ctx.stroke();
    ctx.restore();
    if (hctx) {
      hctx.strokeStyle = "rgba(30,30,30,0.85)";
      hctx.lineWidth = 5;
      hctx.lineCap = "round";
      hctx.beginPath();
      hctx.moveTo(w * 0.28, h * 0.52);
      hctx.bezierCurveTo(w * 0.34, h * 0.5, w * 0.4, h * 0.54, w * 0.46, h * 0.52);
      hctx.stroke();
    }
    // Craters in the southern highlands
    for (let i = 0; i < 46; i += 1) {
      paintCrater(ctx, hctx, random() * w, h * (0.55 + random() * 0.42), 2 + random() * 6, new THREE.Color("#b05c38"), random, { depth: 0.22 });
    }
    // Polar caps (offset seasonal look)
    ctx.fillStyle = "rgba(245,238,226,0.95)";
    ctx.fillRect(0, 0, w, h * 0.05);
    ctx.fillStyle = "rgba(250,245,238,0.9)";
    ctx.fillRect(0, h * 0.94, w, h * 0.06);
    for (let i = 0; i < 10; i += 1) {
      paintBlob(ctx, random() * w, random() > 0.5 ? h * 0.06 : h * 0.93, 6 + random() * 14, "rgba(245,238,226,0.75)", random, 0.7, 0.25);
    }
  },

  jupiter(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#a8907c"],
      [0.09, "#c8b49a"],
      [0.16, "#a4785c"],
      [0.24, "#e3d6bd"],
      [0.32, "#b9835f"],
      [0.4, "#ecdfc8"],
      [0.48, "#c9a179"],
      [0.55, "#eee3cf"],
      [0.63, "#ad7a58"],
      [0.72, "#dcc9ae"],
      [0.8, "#a9866c"],
      [0.9, "#c3b096"],
      [1, "#9c8672"]
    ], random, 0.014, 4);
    // Great Red Spot in the South Equatorial Belt
    paintStorm(ctx, w * 0.68, h * 0.62, 40, 17, "#c14e30", "#e08a5f");
    // White ovals
    for (let i = 0; i < 5; i += 1) {
      paintStorm(ctx, random() * w, h * (0.68 + random() * 0.12), 7 + random() * 6, 3.5 + random() * 2.5, "#f3ead6", "#d9c8a8", 0);
    }
    // Festoons dipping from the North Equatorial Belt
    ctx.save();
    ctx.strokeStyle = "rgba(96,110,140,0.4)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i += 1) {
      const x = random() * w;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.42);
      ctx.bezierCurveTo(x + 14, h * 0.47, x + 4, h * 0.5, x + 20, h * 0.52);
      ctx.stroke();
    }
    ctx.restore();
  },

  saturn(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#b9a071"],
      [0.1, "#cdb684"],
      [0.22, "#dcc794"],
      [0.34, "#e7d6a7"],
      [0.45, "#efe2b8"],
      [0.55, "#eddca9"],
      [0.68, "#dfc994"],
      [0.82, "#cdb17c"],
      [1, "#a98f63"]
    ], random, 0.008, 3);
    // Subtle storm lanes
    for (let i = 0; i < 4; i += 1) {
      paintStorm(ctx, random() * w, h * (0.3 + random() * 0.4), 8 + random() * 8, 2.5 + random() * 2, "#f6ecd0", "#dcc9a0", 0);
    }
    // North polar hexagon hint
    ctx.save();
    ctx.strokeStyle = "rgba(122,105,72,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const cy = h * 0.045;
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * TWO_PI;
      const x = w * 0.5 + Math.cos(a) * w * 0.16;
      const y = cy + Math.sin(a) * h * 0.03;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  },

  uranus(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#bfeff0"],
      [0.2, "#9fdfe1"],
      [0.42, "#8ed6d8"],
      [0.6, "#97dcdd"],
      [0.78, "#a8e4e5"],
      [1, "#c4f2f2"]
    ], random, 0.004, 2);
    // Bright polar hood
    const hood = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    hood.addColorStop(0, "rgba(235,255,252,0.5)");
    hood.addColorStop(1, "rgba(235,255,252,0)");
    ctx.fillStyle = hood;
    ctx.fillRect(0, 0, w, h * 0.3);
    // Faint methane cloud streaks
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 6; i += 1) {
      const y = random() * h;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(random() * w * 0.6, y, w * (0.1 + random() * 0.25), 1.6);
    }
    ctx.globalAlpha = 1;
  },

  neptune(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#5d8ce0"],
      [0.18, "#3f6fd2"],
      [0.36, "#3562c4"],
      [0.5, "#4571d2"],
      [0.66, "#2f57b4"],
      [0.85, "#3d67c8"],
      [1, "#5580d8"]
    ], random, 0.01, 3);
    // Great Dark Spot with bright companion clouds
    paintStorm(ctx, w * 0.6, h * 0.6, 30, 13, "#16307e", "#2b4ba6");
    ctx.fillStyle = "rgba(240,248,255,0.75)";
    for (let i = 0; i < 9; i += 1) {
      const x = random() * w;
      const y = random() * h;
      ctx.globalAlpha = 0.35 + random() * 0.4;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + random() * 26, 1.4 + random() * 2.2, 0, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  io(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#d9c470");
    gradient.addColorStop(0.5, "#e8d27a");
    gradient.addColorStop(1, "#c9ae5e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Sulfur frost patches
    for (let i = 0; i < 26; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 10 + random() * 34, random() > 0.5 ? "#f2e9a8" : "#cfd98e", random, 0.42);
    }
    // Pele-style volcanic ring deposits
    for (let i = 0; i < 6; i += 1) {
      const x = random() * w;
      const y = h * (0.2 + random() * 0.6);
      const r = 10 + random() * 20;
      const ring = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
      ring.addColorStop(0, "rgba(200,60,30,0.0)");
      ring.addColorStop(0.7, "rgba(196,70,40,0.55)");
      ring.addColorStop(1, "rgba(196,70,40,0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
      // Dark caldera at the center
      ctx.fillStyle = "rgba(40,26,16,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + random() * 2.6, 0, TWO_PI);
      ctx.fill();
    }
    // Scattered dark calderas
    for (let i = 0; i < 22; i += 1) {
      ctx.fillStyle = "rgba(50,32,18,0.7)";
      ctx.beginPath();
      ctx.arc(random() * w, random() * h, 1 + random() * 3, 0, TWO_PI);
      ctx.fill();
    }
  },

  europa(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#e8e4d8");
    gradient.addColorStop(0.5, "#ded9ca");
    gradient.addColorStop(1, "#d3cec0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Lineae: long reddish-brown fracture arcs
    for (let i = 0; i < 34; i += 1) {
      ctx.strokeStyle = `rgba(${150 + Math.floor(random() * 40)},${90 + Math.floor(random() * 30)},60,${0.3 + random() * 0.3})`;
      ctx.lineWidth = 0.8 + random() * 2;
      ctx.beginPath();
      let x = random() * w;
      let y = random() * h;
      ctx.moveTo(x, y);
      const drift = (random() - 0.5) * 30;
      for (let s = 0; s < 7; s += 1) {
        x += 30 + random() * 50;
        y += drift + (random() - 0.5) * 26;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Chaos terrain patches
    for (let i = 0; i < 8; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 8 + random() * 20, "rgba(180,130,90,0.3)", random, 0.6);
    }
  },

  ganymede(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    // Dark ancient terrain (Galileo Regio style)
    for (let i = 0; i < 8; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 32 + random() * 64, "#6d655c", random, 0.6);
    }
    // Bright grooved terrain lanes
    ctx.save();
    for (let i = 0; i < 20; i += 1) {
      ctx.strokeStyle = `rgba(220,215,205,${0.25 + random() * 0.3})`;
      ctx.lineWidth = 2 + random() * 5;
      ctx.beginPath();
      let x = random() * w;
      let y = random() * h;
      ctx.moveTo(x, y);
      const angle = random() * TWO_PI;
      for (let s = 0; s < 5; s += 1) {
        x += Math.cos(angle) * (24 + random() * 30);
        y += Math.sin(angle) * (14 + random() * 18);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 60; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 6, base, random, { depth: 0.2 });
    }
    // Bright polar frost caps
    ctx.fillStyle = "rgba(235,240,245,0.5)";
    ctx.fillRect(0, 0, w, h * 0.07);
    ctx.fillRect(0, h * 0.93, w, h * 0.07);
  },

  callisto(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    for (let i = 0; i < 170; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 8, base, random, { depth: 0.26 + random() * 0.18 });
    }
    // Valhalla multi-ring impact basin
    const vx = w * 0.34;
    const vy = h * 0.42;
    paintBlob(ctx, vx, vy, 16, lighten(base, 0.3), random, 0.9);
    ctx.save();
    for (let ring = 1; ring <= 5; ring += 1) {
      ctx.strokeStyle = lighten(base, 0.18);
      ctx.globalAlpha = 0.4 - ring * 0.06;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(vx, vy, ring * 13, ring * 9, 0, 0, TWO_PI);
      ctx.stroke();
    }
    ctx.restore();
  },

  titan(ctx, hctx, w, h, base, random) {
    paintBandedGiant(ctx, w, h, [
      [0, "#e0a45c"],
      [0.25, "#d69a50"],
      [0.5, "#cc8f47"],
      [0.75, "#d59a51"],
      [1, "#dfa65f"]
    ], random, 0.01, 2);
    // North polar hood
    const hood = ctx.createLinearGradient(0, 0, 0, h * 0.2);
    hood.addColorStop(0, "rgba(150,100,60,0.5)");
    hood.addColorStop(1, "rgba(150,100,60,0)");
    ctx.fillStyle = hood;
    ctx.fillRect(0, 0, w, h * 0.2);
    // Faint dark dune fields near equator (visible through haze)
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 8; i += 1) {
      paintBlob(ctx, random() * w, h * (0.42 + random() * 0.16), 16 + random() * 36, "#7a5730", random, 0.7);
    }
    ctx.globalAlpha = 1;
  },

  enceladus(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#f4f9ff");
    gradient.addColorStop(0.55, "#e9f2fc");
    gradient.addColorStop(1, "#dcebf8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Old cratered plains in the north
    for (let i = 0; i < 24; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h * 0.4, 1.5 + random() * 4.5, new THREE.Color("#dbe7f2"), random, { depth: 0.12 });
    }
    // Wrinkled ridges
    for (let i = 0; i < 12; i += 1) {
      ctx.strokeStyle = "rgba(170,195,220,0.4)";
      ctx.lineWidth = 1 + random() * 1.6;
      ctx.beginPath();
      let x = random() * w;
      let y = h * (0.3 + random() * 0.4);
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s += 1) {
        x += 20 + random() * 30;
        y += (random() - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Tiger stripes near the south pole
    ctx.save();
    ctx.strokeStyle = "rgba(90,170,190,0.75)";
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const x0 = w * (0.2 + i * 0.16);
      ctx.moveTo(x0, h * 0.9);
      ctx.bezierCurveTo(x0 + 30, h * 0.84, x0 + 50, h * 0.95, x0 + 90, h * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  },

  iapetus(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#d9d2c4"));
    // Dark Cassini Regio covering the leading hemisphere
    ctx.fillStyle = "#3a2c20";
    ctx.beginPath();
    ctx.moveTo(w * 0.05, 0);
    ctx.lineTo(w * 0.52, 0);
    for (let y = 0; y <= h; y += h / 14) {
      ctx.lineTo(w * (0.52 + Math.sin(y * 0.06) * 0.03 + (random() - 0.5) * 0.02), y);
    }
    ctx.lineTo(w * 0.05, h);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 40; i += 1) {
      const dark = random() > 0.45;
      paintCrater(ctx, hctx, w * (dark ? random() * 0.5 : 0.5 + random() * 0.5), random() * h, 1.5 + random() * 5, new THREE.Color(dark ? "#463628" : "#cfc7b8"), random, { depth: 0.2 });
    }
    // Equatorial ridge
    ctx.strokeStyle = "rgba(60,45,30,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    if (hctx) {
      hctx.strokeStyle = "rgba(230,230,230,0.9)";
      hctx.lineWidth = 3.4;
      hctx.beginPath();
      hctx.moveTo(0, h * 0.5);
      hctx.lineTo(w, h * 0.5);
      hctx.stroke();
    }
  },

  triton(ctx, hctx, w, h, base, random) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#cfc7b6");
    gradient.addColorStop(0.55, "#d8d2c2");
    gradient.addColorStop(1, "#e6d9c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Cantaloupe terrain dimples
    for (let i = 0; i < 220; i += 1) {
      const x = random() * w;
      const y = random() * h * 0.6;
      const r = 2 + random() * 4;
      ctx.strokeStyle = "rgba(150,140,120,0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.stroke();
    }
    // Pink nitrogen-ice south polar cap with dark geyser streaks
    const cap = ctx.createLinearGradient(0, h * 0.62, 0, h);
    cap.addColorStop(0, "rgba(240,215,200,0)");
    cap.addColorStop(0.35, "rgba(243,219,203,0.85)");
    cap.addColorStop(1, "rgba(248,228,212,0.95)");
    ctx.fillStyle = cap;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < 14; i += 1) {
      const x = random() * w;
      const y = h * (0.72 + random() * 0.22);
      ctx.strokeStyle = "rgba(70,60,55,0.6)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + random() * 18, y - 2 - random() * 4);
      ctx.stroke();
    }
  },

  pluto(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#b08a68"));
    // Mottled tholin terrain
    for (let i = 0; i < 26; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 12 + random() * 34, random() > 0.5 ? "#8a6247" : "#c9a983", random, 0.4);
    }
    // Cthulhu Macula: dark whale along the equator
    ctx.fillStyle = "rgba(70,42,30,0.85)";
    ctx.beginPath();
    ctx.ellipse(w * 0.3, h * 0.52, w * 0.2, h * 0.13, -0.05, 0, TWO_PI);
    ctx.fill();
    // Sputnik Planitia: bright nitrogen-ice heart
    ctx.save();
    ctx.translate(w * 0.58, h * 0.5);
    ctx.fillStyle = "#efe3d2";
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(20, -52, 46, -36, 40, -8);
    ctx.bezierCurveTo(36, 20, 14, 40, 0, 52);
    ctx.bezierCurveTo(-14, 40, -36, 20, -40, -8);
    ctx.bezierCurveTo(-46, -36, -20, -52, 0, -34);
    ctx.closePath();
    ctx.fill();
    // Cellular convection polygons in the ice
    ctx.strokeStyle = "rgba(200,185,165,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.arc((random() - 0.5) * 60, (random() - 0.5) * 70, 5 + random() * 9, 0, TWO_PI);
      ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 20; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 4, new THREE.Color("#a07a58"), random, { depth: 0.18 });
    }
  },

  charon(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#9a938c"));
    for (let i = 0; i < 40; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 6, base, random, { depth: 0.22 });
    }
    // Mordor Macula: reddish north polar stain
    const cap = ctx.createLinearGradient(0, 0, 0, h * 0.24);
    cap.addColorStop(0, "rgba(140,70,50,0.85)");
    cap.addColorStop(1, "rgba(140,70,50,0)");
    ctx.fillStyle = cap;
    ctx.fillRect(0, 0, w, h * 0.24);
    // Serenity Chasma belt
    ctx.strokeStyle = "rgba(60,55,52,0.65)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.46);
    for (let x = 0; x <= w; x += w / 10) {
      ctx.lineTo(x, h * (0.46 + Math.sin(x * 0.03) * 0.02));
    }
    ctx.stroke();
  },

  ceres(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    for (let i = 0; i < 90; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 7, base, random, { depth: 0.24 });
    }
    // Occator bright spots
    for (const [fx, fy] of [[0.42, 0.38], [0.43, 0.4]]) {
      const x = fx * w;
      const y = fy * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
      g.addColorStop(0, "rgba(255,255,250,0.95)");
      g.addColorStop(1, "rgba(255,255,250,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TWO_PI);
      ctx.fill();
    }
    // Ahuna Mons
    if (hctx) {
      const x = w * 0.7;
      const y = h * 0.6;
      const hg = hctx.createRadialGradient(x, y, 0, x, y, 6);
      hg.addColorStop(0, "rgba(250,250,250,0.9)");
      hg.addColorStop(1, "rgba(128,128,128,0)");
      hctx.fillStyle = hg;
      hctx.beginPath();
      hctx.arc(x, y, 6, 0, TWO_PI);
      hctx.fill();
    }
  },

  haumea(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#dfe3e8"));
    for (let i = 0; i < 14; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 10 + random() * 30, "rgba(255,255,255,0.5)", random, 0.5);
    }
    // Dark Red Spot region
    paintBlob(ctx, w * 0.6, h * 0.45, 26, "rgba(170,90,70,0.4)", random, 0.8);
  },

  makemake(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#b7734f"));
    for (let i = 0; i < 24; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 10 + random() * 30, random() > 0.5 ? "#9c5a3c" : "#cf9268", random, 0.45);
    }
    // Bright methane frost patches
    for (let i = 0; i < 10; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 6 + random() * 14, "rgba(240,225,210,0.4)", random, 0.6);
    }
  },

  eris(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#e8e4da"));
    for (let i = 0; i < 12; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 12 + random() * 28, "rgba(200,192,180,0.35)", random, 0.5);
    }
    for (let i = 0; i < 18; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 4, new THREE.Color("#d8d4ca"), random, { depth: 0.1 });
    }
  },

  cratered(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    for (let i = 0; i < 100; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 8, base, random, { depth: 0.22 + random() * 0.16 });
    }
  },

  rocky(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    for (let i = 0; i < 50; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 4 + random() * 20, random() > 0.5 ? darken(base, 0.22) : lighten(base, 0.18), random, 0.42);
    }
    for (let i = 0; i < 60; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1 + random() * 6, base, random, { depth: 0.26 });
    }
  },

  ice(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 40; i += 1) {
      ctx.strokeStyle = random() > 0.5 ? "#ffffff" : darken(base, 0.18);
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      let x = random() * w;
      let y = random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j += 1) {
        x += (random() - 0.5) * 60;
        y += (random() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 24; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 1.5 + random() * 5, base, random, { depth: 0.14 });
    }
  },

  // Comet nuclei are among the darkest objects in the solar system (albedo ~0.04),
  // so the surface is near-black charcoal with a little exposed ice.
  comet(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, new THREE.Color("#2b2823"));
    for (let i = 0; i < 40; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 8 + random() * 30, random() > 0.5 ? "#211e1a" : "#3a352c", random, 0.5);
    }
    // Pitted, collapsed terrain
    for (let i = 0; i < 70; i += 1) {
      paintCrater(ctx, hctx, random() * w, random() * h, 2 + random() * 9, new THREE.Color("#332f29"), random, { depth: 0.4 });
    }
    // Exposed ice patches and active vent scars
    for (let i = 0; i < 12; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const r = 3 + random() * 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(206,214,220,0.75)");
      g.addColorStop(0.6, "rgba(150,158,166,0.28)");
      g.addColorStop(1, "rgba(120,128,136,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }
    // Dust-mantled ridges
    ctx.save();
    ctx.strokeStyle = "rgba(90,82,70,0.5)";
    for (let i = 0; i < 16; i += 1) {
      ctx.lineWidth = 1 + random() * 2.4;
      ctx.beginPath();
      let x = random() * w;
      let y = random() * h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s += 1) {
        x += (random() - 0.4) * 40;
        y += (random() - 0.5) * 24;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  smooth(ctx, hctx, w, h, base, random) {
    paintBase(ctx, w, h, base);
    for (let i = 0; i < 14; i += 1) {
      paintBlob(ctx, random() * w, random() * h, 14 + random() * 36, random() > 0.5 ? lighten(base, 0.08) : darken(base, 0.08), random, 0.3);
    }
  }
};

// Styles that get a bump/height layer
const BUMPED = new Set([
  "mercury", "moon", "mars", "ganymede", "callisto", "iapetus", "pluto",
  "charon", "ceres", "cratered", "rocky", "ice", "eris", "enceladus", "triton",
  "earth", "comet"
]);

const cache = new Map();

export function createTextureSet(data) {
  const style = data.texture ?? "smooth";
  const key = `${data.id}:${style}:${data.color ?? ""}`;
  if (cache.has(key)) return cache.get(key);

  const large = data.category === "Star" || data.category === "Planet" || (data.radiusKm ?? 0) > 400;
  const w = large ? 1024 : 512;
  const h = w / 2;
  const base = new THREE.Color(data.color ?? "#cccccc");
  const random = mulberry32(hashCode(data.id));

  const color = makeCanvas(w, h);
  let height = null;
  if (BUMPED.has(style)) {
    height = makeCanvas(w, h);
    height.ctx.fillStyle = "#808080";
    height.ctx.fillRect(0, 0, w, h);
  }

  const layers = {};
  if (style === "earth") {
    layers.rough = makeCanvas(w, h).ctx;
    // Ocean base: fairly glossy
    layers.rough.fillStyle = "#5a5a5a";
    layers.rough.fillRect(0, 0, w, h);
    layers.clouds = makeCanvas(w, h).ctx;
  }

  const painter = PAINTERS[style] ?? PAINTERS.smooth;
  painter(color.ctx, height?.ctx ?? null, w, h, base, random, layers);
  applyNoise(color.ctx, w, h, style === "sun" ? 0.26 : 0.18);

  const set = {};
  set.map = new THREE.CanvasTexture(color.canvas);
  set.map.colorSpace = THREE.SRGBColorSpace;
  set.map.anisotropy = 8;
  // Longitude wraps all the way around, so let the last texel blend into the
  // first one instead of hard-clamping into a visible seam.
  set.map.wrapS = THREE.RepeatWrapping;
  if (height) {
    applyNoise(height.ctx, w, h, 0.3);
    set.bumpMap = new THREE.CanvasTexture(height.canvas);
    set.bumpMap.anisotropy = 4;
    set.bumpMap.wrapS = THREE.RepeatWrapping;
  }
  if (layers.rough) {
    set.roughnessMap = new THREE.CanvasTexture(layers.rough.canvas);
    set.roughnessMap.wrapS = THREE.RepeatWrapping;
  }
  if (layers.clouds) {
    set.cloudsMap = new THREE.CanvasTexture(layers.clouds.canvas);
    set.cloudsMap.colorSpace = THREE.SRGBColorSpace;
    set.cloudsMap.wrapS = THREE.RepeatWrapping;
  }
  cache.set(key, set);
  return set;
}

/* ------------------------------------------------------------------ */
/* Sprite and billboard textures.                                      */
/* ------------------------------------------------------------------ */

let starTexture = null;

// Soft round star point. Without this, THREE.Points renders hard squares.
export function createStarTexture() {
  if (starTexture) return starTexture;
  const size = 64;
  const { canvas, ctx } = makeCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  starTexture = new THREE.CanvasTexture(canvas);
  starTexture.colorSpace = THREE.SRGBColorSpace;
  return starTexture;
}

// Comet tail sheet. v = 1 sits at the nucleus and v = 0 at the far tip, so the
// alpha runs from a dense root to nothing. Density also falls off away from the
// axis, which keeps the tail from ending in a hard-edged silhouette.
export function createTailTexture(kind) {
  const w = 128;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const random = mulberry32(hashCode(`tail:${kind}`));
  const ion = kind === "ion";
  const tint = ion ? [190, 226, 255] : [255, 240, 214];
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  // Long-wavelength streamers: ion tails show crisp rays, dust tails show
  // broad bands from outburst to outburst.
  const streaks = [];
  for (let i = 0; i < (ion ? 9 : 5); i += 1) {
    streaks.push({
      centre: random(),
      width: ion ? 0.02 + random() * 0.05 : 0.1 + random() * 0.2,
      strength: ion ? 0.4 + random() * 0.6 : 0.25 + random() * 0.35
    });
  }

  for (let y = 0; y < h; y += 1) {
    // Canvas y = 0 becomes v = 1 after the default vertical flip, so y measures
    // distance from the nucleus.
    const t = y / (h - 1);
    const lengthFade = Math.pow(1 - t, ion ? 1.25 : 1.6);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      let streak = 0.55;
      for (const s of streaks) {
        const d = Math.abs(u - s.centre) / s.width;
        if (d < 1) streak += s.strength * Math.pow(1 - d, 2);
      }
      const index = (y * w + x) * 4;
      const alpha = Math.min(1, lengthFade * streak) * (ion ? 0.9 : 0.75);
      data[index] = tint[0];
      data[index + 1] = tint[1];
      data[index + 2] = tint[2];
      data[index + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Ring textures: radial strip mapped across the annulus.              */
/* ------------------------------------------------------------------ */

export function createRingTexture(style) {
  const w = 1024;
  const h = 32;
  const { canvas, ctx } = makeCanvas(w, h);
  const random = mulberry32(hashCode(`ring:${style}`));
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  const put = (x, r, g, b, a) => {
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  };

  for (let x = 0; x < w; x += 1) {
    const t = x / w;
    let r = 210, g = 190, b = 150, a = 0;
    const grain = 0.82 + random() * 0.36;

    if (style === "saturn") {
      if (t < 0.14) { // D + C rings: dusty, translucent
        a = 26 + 30 * (t / 0.14) * grain;
        r = 168; g = 150; b = 128;
      } else if (t < 0.47) { // B ring: bright, densely striated
        const s = Math.sin(t * 700) * 0.5 + Math.sin(t * 231 + 1.7) * 0.5;
        a = (188 + s * 34) * grain;
        r = 224 + s * 14; g = 202 + s * 12; b = 162 + s * 8;
      } else if (t < 0.53) { // Cassini Division
        a = 14 * grain;
        r = 150; g = 138; b = 120;
      } else if (t < 0.88) { // A ring with Encke gap
        const s = Math.sin(t * 520 + 0.9) * 0.5;
        a = (132 + s * 26) * grain;
        r = 212 + s * 10; g = 190; b = 150;
        if (t > 0.82 && t < 0.834) a = 10; // Encke gap
      } else if (t < 0.93) {
        a = 0; // gap before F ring
      } else if (t < 0.95) { // F ring: narrow and bright
        a = 130 * grain;
        r = 232; g = 216; b = 184;
      } else {
        a = 0;
      }
    } else if (style === "uranus") {
      a = 0;
      const narrow = [[0.12, 26], [0.24, 22], [0.35, 24], [0.47, 28], [0.6, 30], [0.74, 34], [0.94, 88]];
      for (const [center, alpha] of narrow) {
        if (Math.abs(t - center) < 0.008) {
          a = alpha * grain;
          r = 175; g = 195; b = 205;
        }
      }
    } else if (style === "neptune") {
      a = 0;
      const arcs = [[0.3, 20], [0.55, 24], [0.92, 46]];
      for (const [center, alpha] of arcs) {
        if (Math.abs(t - center) < 0.01) {
          a = alpha * grain;
          r = 150; g = 170; b = 210;
        }
      }
    } else if (style === "haumea") {
      a = Math.abs(t - 0.5) < 0.12 ? 46 * grain : 0;
      r = 200; g = 205; b = 212;
    } else { // jupiter: faint dusty sheet
      a = 20 * Math.pow(1 - t, 1.4) * grain + (t < 0.2 ? 10 : 0);
      r = 190; g = 168; b = 132;
    }

    put(x, Math.round(r), Math.round(g), Math.round(b), Math.round(Math.min(a, 255)));
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Radial gradient sprite textures for glows, comas, and nebulae.      */
/* ------------------------------------------------------------------ */

export function createGlowTexture(stops, size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
