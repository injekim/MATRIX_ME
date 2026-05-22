import { useState, useRef, useCallback, useEffect } from "react";

// ── Load retro pixel fonts ──
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Share+Tech+Mono&family=Silkscreen&family=DotGothic16&family=Pixelify+Sans:wght@400;700&display=swap";
if (!document.querySelector('link[href*="Press+Start+2P"]')) document.head.appendChild(FONT_LINK);

const CHARSETS = {
  binary: "01",
  digits: "0123456789",
  hex: "0123456789ABCDEF",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  katakana: "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
  hiragana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん",
  korean: "가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허",
  chinese: "道德仁義禮智信忠孝悌節義廉恥天地人日月星水火木金土",
  greek: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
  cyrillic: "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ",
  runes: "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ",
  symbols: "◊◆●○□■△▽▲▼♠♣♥♦★☆⬟⬡⬢",
  braille: "⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟",
  math: "∑∏∫∂√∞≈≠≤≥±×÷∇∆∃∀∈∉⊂⊃∪∩",
  custom: "",
};

const FONTS = [
  { value: "VT323", label: "VT323 (CRT Terminal)" },
  { value: "Press Start 2P", label: "Press Start 2P (8-bit)" },
  { value: "Silkscreen", label: "Silkscreen (Pixel)" },
  { value: "Share Tech Mono", label: "Share Tech Mono (Tech)" },
  { value: "DotGothic16", label: "DotGothic16 (JP Pixel)" },
  { value: "Pixelify Sans", label: "Pixelify Sans (Retro)" },
  { value: "Courier New", label: "Courier New (Classic)" },
  { value: "monospace", label: "System Monospace" },
];

const PRESETS = {
  classic: { bg: "#000000", fg: "#00ff41", glow: "#00ff41", name: "Classic Green" },
  amber: { bg: "#0a0800", fg: "#ffb000", glow: "#ff8c00", name: "Amber Terminal" },
  cyan: { bg: "#000a0f", fg: "#00e5ff", glow: "#00b8d4", name: "Cyan Ice" },
  purple: { bg: "#05000a", fg: "#bf5af2", glow: "#9b30ff", name: "Purple Haze" },
  red: { bg: "#0a0000", fg: "#ff3b30", glow: "#ff1744", name: "Red Alert" },
  white: { bg: "#0a0a0a", fg: "#e0e0e0", glow: "#ffffff", name: "Monochrome" },
  gold: { bg: "#050400", fg: "#ffd700", glow: "#ffaa00", name: "Gold" },
  pink: { bg: "#0a0005", fg: "#ff6eb4", glow: "#ff1493", name: "Neon Pink" },
  lime: { bg: "#030a00", fg: "#76ff03", glow: "#64dd17", name: "Acid Lime" },
  ocean: { bg: "#000508", fg: "#18ffff", glow: "#0091ea", name: "Deep Ocean" },
};

const RESOLUTIONS = [
  { w: 1920, h: 1080, label: "1920×1080 (FHD)" },
  { w: 2560, h: 1440, label: "2560×1440 (QHD)" },
  { w: 3840, h: 2160, label: "3840×2160 (4K)" },
  { w: 1080, h: 1920, label: "1080×1920 (Phone)" },
  { w: 1284, h: 2778, label: "1284×2778 (iPhone Pro Max)" },
  { w: 2560, h: 1080, label: "2560×1080 (Ultrawide)" },
  { w: 3440, h: 1440, label: "3440×1440 (Ultrawide QHD)" },
  { w: 2048, h: 2048, label: "2048×2048 (Square)" },
  { w: 0, h: 0, label: "Custom" },
];

const EFFECTS = {
  none: "None",
  crt: "CRT Scanlines",
  vignette: "Vignette",
  noise: "Film Grain",
  crt_vignette: "CRT + Vignette",
  full: "All Effects",
};

const PATTERNS = {
  uniform: "Uniform Random",
  rain: "Matrix Rain (columns)",
  wave: "Sine Wave Fade",
  radial: "Radial Fade",
  diagonal: "Diagonal Gradient",
  spotlight: "Spotlight",
  horizontal_bands: "Horizontal Bands",
};

// ── Helpers ──

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}

// ── Render a single character layer onto an offscreen canvas ──

function renderCharLayer(w, h, opts, layerSeed, sizeMultiplier, alphaMultiplier, embedMap) {
  const {
    charset, fgColor, fontSize, pattern, charOpacityMin, charOpacityMax,
    fontFamily, depthVariation, brightnessVariation,
  } = opts;

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  const rand = seededRandom(layerSeed);
  const fgRgb = hexToRgb(fgColor);
  const effectiveSize = fontSize * sizeMultiplier;
  const cols = Math.ceil(w / (effectiveSize * 0.65));
  const rows = Math.ceil(h / effectiveSize);
  const cellW = w / cols;
  const cellH = h / rows;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  function getPatternAlpha(col, row) {
    const nx = col / cols, ny = row / rows;
    switch (pattern) {
      case "rain": { const p = rand() * 1000; return 0.3 + ((Math.sin(p + ny * 6) + 1) / 2) * 0.7; }
      case "wave": return 0.2 + ((Math.sin(nx * 4 * Math.PI + ny * 2) + 1) / 2) * 0.8;
      case "radial": { const dx = nx - 0.5, dy = ny - 0.5; return Math.max(0.1, 1 - Math.sqrt(dx * dx + dy * dy) * 2); }
      case "diagonal": return 0.15 + ((nx + ny) / 2) * 0.85;
      case "spotlight": { const sx = 0.3 + rand() * 0.4, sy = 0.3 + rand() * 0.4; return Math.max(0.05, 1 - Math.sqrt((nx - sx) ** 2 + (ny - sy) ** 2) * 2.5); }
      case "horizontal_bands": return 0.15 + ((Math.sin(ny * Math.PI * 8) + 1) / 2) * 0.85;
      default: return 1;
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const embedKey = `${col},${row}`;
      const isEmbed = embedMap && embedMap.has(embedKey);
      // Always consume random values to keep seed-based layout stable regardless of embed
      const randChar = rand();
      const randDepth = rand();
      const randAlpha = rand();
      const randBright = rand();
      
      const ch = isEmbed ? embedMap.get(embedKey) : charset[Math.floor(randChar * charset.length)];
      const pAlpha = getPatternAlpha(col, row);
      const depthFactor = depthVariation > 0 ? (0.5 + randDepth * 0.5) : 1;
      const size = isEmbed ? effectiveSize : effectiveSize * (depthVariation > 0 ? (0.6 + depthFactor * 0.4 * depthVariation + (1 - depthVariation)) : 1);
      const baseAlpha = charOpacityMin + randAlpha * (charOpacityMax - charOpacityMin);
      const alpha = isEmbed ? Math.max(0.85, charOpacityMax) * alphaMultiplier : baseAlpha * pAlpha * depthFactor * alphaMultiplier;
      if (alpha < 0.02) continue;
      const bright = isEmbed ? 1.0 : (brightnessVariation > 0 ? (0.4 + randBright * 0.6) : 1);
      ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(size)}px "${fontFamily}"`;
      ctx.fillStyle = `rgb(${Math.round(fgRgb.r * bright)},${Math.round(fgRgb.g * bright)},${Math.round(fgRgb.b * bright)})`;
      ctx.fillText(ch, col * cellW + cellW / 2, row * cellH + cellH / 2);
    }
  }
  ctx.globalAlpha = 1;
  return { canvas: offscreen, cols, rows };
}

// ── Build embed map: place text words/phrases at grid positions ──

function buildEmbedMap(cols, rows, text, seed, embedMode) {
  if (!text || !text.trim() || cols < 1 || rows < 1) return null;
  const map = new Map();
  const rand = seededRandom(seed + 7777);
  const words = text.trim().split(/\s+/);

  if (embedMode === "scatter") {
    // Scatter each word at a random position in the grid
    const placements = Math.min(words.length * 5, Math.floor(rows * 0.6)); // repeat words across the grid
    for (let i = 0; i < placements; i++) {
      const word = words[i % words.length];
      const maxCol = cols - word.length;
      if (maxCol < 1) continue;
      const col = Math.floor(rand() * maxCol);
      const row = Math.floor(rand() * rows);
      for (let c = 0; c < word.length; c++) {
        map.set(`${col + c},${row}`, word[c]);
      }
    }
  } else if (embedMode === "columns") {
    // Write text vertically down random columns
    const phrase = words.join(" ");
    const placements = Math.min(8, Math.floor(cols * 0.05) + 1);
    for (let p = 0; p < placements; p++) {
      const col = Math.floor(rand() * cols);
      const startRow = Math.floor(rand() * Math.max(1, rows - phrase.length));
      for (let i = 0; i < phrase.length && startRow + i < rows; i++) {
        map.set(`${col},${startRow + i}`, phrase[i]);
      }
    }
  } else if (embedMode === "diagonal") {
    // Write text diagonally across the grid
    const phrase = words.join(" ");
    const placements = Math.min(6, Math.floor(Math.min(cols, rows) * 0.04) + 1);
    for (let p = 0; p < placements; p++) {
      const startCol = Math.floor(rand() * (cols - 5));
      const startRow = Math.floor(rand() * (rows - 5));
      const dir = rand() > 0.5 ? 1 : -1; // down-right or down-left
      for (let i = 0; i < phrase.length; i++) {
        const c = startCol + i * dir;
        const r = startRow + i;
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          map.set(`${c},${r}`, phrase[i]);
        }
      }
    }
  } else if (embedMode === "repeat_rows") {
    // Fill entire rows with the phrase repeated, spaced out
    const phrase = words.join("  ");
    const rowCount = Math.min(8, Math.floor(rows * 0.08) + 2);
    for (let r = 0; r < rowCount; r++) {
      const row = Math.floor(rand() * rows);
      let ci = Math.floor(rand() * 5); // slight offset
      for (let i = 0; ci < cols; i++, ci++) {
        map.set(`${ci},${row}`, phrase[i % phrase.length]);
      }
    }
  }

  return map.size > 0 ? map : null;
}

// ── Bokeh blur via downscale/upscale ──

function applyBokeh(canvas, radius) {
  if (radius <= 0) return;
  const w = canvas.width, h = canvas.height;
  const scale = Math.max(0.05, 1 - radius * 0.15);
  const sw = Math.floor(w * scale), sh = Math.floor(h * scale);
  const tmp = document.createElement("canvas");
  tmp.width = sw; tmp.height = sh;
  const tCtx = tmp.getContext("2d");
  tCtx.drawImage(canvas, 0, 0, sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, w, h);
}

// ── Chromatic Aberration ──

function applyChromaticAberration(canvas, intensity) {
  if (intensity <= 0) return;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;
  const offset = Math.round(intensity * (w / 400));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Red channel shifted left
      const rx = Math.min(w - 1, Math.max(0, x - offset));
      const ri = (y * w + rx) * 4;
      // Blue channel shifted right
      const bx = Math.min(w - 1, Math.max(0, x + offset));
      const bi = (y * w + bx) * 4;

      dst[i]     = src[ri];     // R from left
      dst[i + 1] = src[i + 1];  // G stays
      dst[i + 2] = src[bi + 2]; // B from right
      dst[i + 3] = src[i + 3];  // A stays
    }
  }
  ctx.putImageData(imgData, 0, 0);
}


// ── CRT Phosphor Pixel Effect ──
// Simulates CRT subpixel structure: each logical pixel becomes a cluster of
// R/G/B phosphor dots with dark gaps between them, plus optional bloom.

function applyCrtPixel(canvas, pixelSize, bloom) {
  if (pixelSize < 2) return;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d");

  // If bloom > 0, create a blurred copy to blend back later
  let bloomCanvas = null;
  if (bloom > 0) {
    bloomCanvas = document.createElement("canvas");
    bloomCanvas.width = w; bloomCanvas.height = h;
    const bCtx = bloomCanvas.getContext("2d");
    bCtx.filter = `blur(${Math.round(pixelSize * bloom * 0.8)}px)`;
    bCtx.drawImage(canvas, 0, 0);
    bCtx.filter = "none";
  }

  // Read the original image
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;

  // Clear and redraw with phosphor dots
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const ps = Math.round(pixelSize);
  // Each phosphor cell is ps×ps pixels
  // Inside that cell: 3 vertical sub-strips (R, G, B) with a dark gap row at bottom
  const subW = Math.max(1, Math.floor(ps / 3));
  const gap = Math.max(1, Math.floor(ps * 0.15)); // dark gap between rows

  for (let by = 0; by < h; by += ps) {
    for (let bx = 0; bx < w; bx += ps) {
      // Sample the center pixel of this block
      const sx = Math.min(w - 1, bx + Math.floor(ps / 2));
      const sy = Math.min(h - 1, by + Math.floor(ps / 2));
      const si = (sy * w + sx) * 4;
      const r = src[si], g = src[si + 1], b = src[si + 2];

      // Skip near-black pixels for performance
      if (r < 3 && g < 3 && b < 3) continue;

      const cellH = Math.min(ps, h - by);
      const cellW = Math.min(ps, w - bx);
      const dotH = Math.max(1, cellH - gap);

      // R subpixel strip
      ctx.fillStyle = `rgb(${r},0,0)`;
      ctx.fillRect(bx, by, Math.min(subW, cellW), dotH);

      // G subpixel strip
      ctx.fillStyle = `rgb(0,${g},0)`;
      ctx.fillRect(bx + subW, by, Math.min(subW, Math.max(0, cellW - subW)), dotH);

      // B subpixel strip
      ctx.fillStyle = `rgb(0,0,${b})`;
      ctx.fillRect(bx + subW * 2, by, Math.min(subW, Math.max(0, cellW - subW * 2)), dotH);
    }
  }

  // Blend bloom layer on top for soft phosphor glow
  if (bloomCanvas && bloom > 0) {
    ctx.globalAlpha = bloom * 0.45;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(bloomCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
}


// ── Main Generation ──

function generateWallpaper(canvas, opts) {
  const {
    width, height, charset, bgColor, fgColor, glowColor,
    fontSize, effect, pattern, glowIntensity, glowRadius,
    charOpacityMin, charOpacityMax, seed, fontFamily,
    depthVariation, brightnessVariation,
    layers, bokehBack, chromaticAberration, embedText, embedMode,
    crtPixelSize, crtPixelBloom,
  } = opts;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const fgRgb = hexToRgb(fgColor);

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  const bgRgb = hexToRgb(bgColor);
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
  grad.addColorStop(0, `rgba(${fgRgb.r},${fgRgb.g},${fgRgb.b},0.03)`);
  grad.addColorStop(1, `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (!charset || charset.length === 0) return;

  const layerOpts = { charset, fgColor, fontSize, pattern, charOpacityMin, charOpacityMax, fontFamily, depthVariation, brightnessVariation };

  // Pre-calculate grid size for embed map (based on front layer)
  const frontSize = fontSize;
  const embedCols = Math.ceil(width / (frontSize * 0.65));
  const embedRows = Math.ceil(height / frontSize);
  const embedMap = (embedText && embedText.trim()) ? buildEmbedMap(embedCols, embedRows, embedText.trim(), seed, embedMode) : null;

  // Multi-layer rendering
  const numLayers = layers || 1;
  const layerConfigs = [];
  if (numLayers === 1) {
    layerConfigs.push({ sizeM: 1, alphaM: 1, bokeh: 0, seedOffset: 0, isfront: true });
  } else if (numLayers === 2) {
    layerConfigs.push({ sizeM: 1.6, alphaM: 0.25, bokeh: bokehBack, seedOffset: 1000, isfront: false });
    layerConfigs.push({ sizeM: 1, alphaM: 1, bokeh: 0, seedOffset: 0, isfront: true });
  } else {
    layerConfigs.push({ sizeM: 2.2, alphaM: 0.15, bokeh: Math.min(bokehBack * 1.5, 6), seedOffset: 2000, isfront: false });
    layerConfigs.push({ sizeM: 1.5, alphaM: 0.3, bokeh: bokehBack, seedOffset: 1000, isfront: false });
    layerConfigs.push({ sizeM: 1, alphaM: 1, bokeh: 0, seedOffset: 0, isfront: true });
  }

  for (const lc of layerConfigs) {
    // Only embed text into the front layer
    const thisEmbedMap = lc.isfront ? embedMap : null;
    const result = renderCharLayer(width, height, layerOpts, seed + lc.seedOffset, lc.sizeM, lc.alphaM, thisEmbedMap);
    const layerCanvas = result.canvas;
    if (lc.bokeh > 0) applyBokeh(layerCanvas, lc.bokeh);

    // Glow pass for this layer
    if (glowIntensity > 0) {
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = width; glowCanvas.height = height;
      const gCtx = glowCanvas.getContext("2d");
      gCtx.filter = `blur(${glowRadius}px)`;
      gCtx.globalAlpha = glowIntensity * 0.5 * lc.alphaM;
      gCtx.drawImage(layerCanvas, 0, 0);
      gCtx.filter = "none";
      ctx.drawImage(glowCanvas, 0, 0);
    }

    ctx.drawImage(layerCanvas, 0, 0);
  }

  // ── Chromatic aberration (before post-effects) ──
  if (chromaticAberration > 0) {
    applyChromaticAberration(canvas, chromaticAberration);
  }

  // ── CRT phosphor pixel effect ──
  if (crtPixelSize >= 2) {
    applyCrtPixel(canvas, crtPixelSize, crtPixelBloom || 0);
  }

  // ── Post effects ──
  const doScanlines = ["crt", "crt_vignette", "full"].includes(effect);
  const doVignette = ["vignette", "crt_vignette", "full"].includes(effect);
  const doNoise = ["noise", "full"].includes(effect);

  if (doScanlines) {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
    const scanGrad = ctx.createLinearGradient(0, 0, 0, height);
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      scanGrad.addColorStop(t, `rgba(${fgRgb.r},${fgRgb.g},${fgRgb.b},${(Math.sin(t * Math.PI * 2) * 0.02 + 0.02).toFixed(3)})`);
    }
    scanGrad.addColorStop(1, `rgba(${fgRgb.r},${fgRgb.g},${fgRgb.b},0.02)`);
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, 0, width, height);
  }

  if (doVignette) {
    const vg = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.6, "rgba(0,0,0,0.15)");
    vg.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
  }

  if (doNoise) {
    const nc = document.createElement("canvas");
    nc.width = Math.min(width, 512); nc.height = Math.min(height, 512);
    const nCtx = nc.getContext("2d");
    const nData = nCtx.createImageData(nc.width, nc.height);
    const nd = nData.data;
    for (let i = 0; i < nd.length; i += 4) {
      const v = Math.random() * 255;
      nd[i] = nd[i + 1] = nd[i + 2] = v; nd[i + 3] = 18;
    }
    nCtx.putImageData(nData, 0, 0);
    ctx.drawImage(nc, 0, 0, width, height);
  }
}

// ── Collapsible Section component ──

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", padding: "7px 0", cursor: "pointer", fontFamily: "inherit",
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#666",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 14, color: "#444", transform: open ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && <div style={{ paddingBottom: 6 }}>{children}</div>}
    </div>
  );
}

// ── Mobile detection hook ──

function useIsMobile(breakpoint = 700) {
  const [mobile, setMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return mobile;
}

// ── Styles ──

const S = {
  root: { display: "flex", height: "100vh", fontFamily: "'Share Tech Mono', 'VT323', monospace", background: "#0c0c0c", color: "#c8c8c8", overflow: "hidden" },
  sidebar: { width: 330, minWidth: 330, background: "#111", borderRight: "1px solid #1e1e1e", overflowY: "auto", overflowX: "hidden", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 0 },
  preview: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", overflow: "hidden", position: "relative" },
  select: { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ddd", padding: "6px 8px", borderRadius: 4, fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  input: { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ddd", padding: "6px 8px", borderRadius: 4, fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  range: { width: "100%", accentColor: "#18ffff", height: 4, cursor: "pointer" },
  row: { display: "flex", gap: 6, alignItems: "center" },
  label: { fontSize: 11, color: "#999", marginBottom: 3, display: "block" },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, width: "100%" },
  presetBtn: (active) => ({ width: "100%", aspectRatio: "1.2", borderRadius: 4, border: active ? "2px solid #fff" : "1px solid #333", cursor: "pointer", padding: 0, transition: "border 0.15s", overflow: "hidden", minWidth: 0 }),
  btn: { width: "100%", padding: "10px", background: "#00ff41", color: "#000", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" },
  btnSec: { width: "100%", padding: "8px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  sub: { fontSize: 10, color: "#555", marginBottom: 12 },
  rangeLabel: { fontSize: 11, color: "#777", marginBottom: 2 },
  tagline: { fontSize: 10, color: "#444", fontStyle: "italic", marginTop: 2 },
};

// ── Main Component ──

export default function MatrixWallpaperGenerator() {
  const canvasRef = useRef(null);
  const isMobile = useIsMobile();
  const [showPanel, setShowPanel] = useState(false);
  const [charsetKey, setCharsetKey] = useState("digits");
  const [customChars, setCustomChars] = useState("");
  const [preset, setPreset] = useState("ocean");
  const [bgColor, setBgColor] = useState(PRESETS.ocean.bg);
  const [fgColor, setFgColor] = useState(PRESETS.ocean.fg);
  const [glowColor, setGlowColor] = useState(PRESETS.ocean.glow);
  const [resIdx, setResIdx] = useState(2);
  const [customW, setCustomW] = useState(1920);
  const [customH, setCustomH] = useState(1080);
  const [fontSize, setFontSize] = useState(55);
  const [effect, setEffect] = useState("crt_vignette");
  const [pattern, setPattern] = useState("uniform");
  const [glowIntensity, setGlowIntensity] = useState(0.6);
  const [glowRadius, setGlowRadius] = useState(10);
  const [opacityMin, setOpacityMin] = useState(0.15);
  const [opacityMax, setOpacityMax] = useState(0.95);
  const [seed, setSeed] = useState(42);
  const [fontFamily, setFontFamily] = useState("VT323");
  const [depthVariation, setDepthVariation] = useState(0.55);
  const [brightnessVariation, setBrightnessVariation] = useState(0.5);
  const [generating, setGenerating] = useState(false);
  // New features
  const [layers, setLayers] = useState(1);
  const [bokehBack, setBokehBack] = useState(3);
  const [chromaticAberration, setChromaticAberration] = useState(0.5);
  const [embedText, setEmbedText] = useState("WAKE UP NEO");
  const [embedMode, setEmbedMode] = useState("columns");
  const [crtPixelSize, setCrtPixelSize] = useState(6);
  const [crtPixelBloom, setCrtPixelBloom] = useState(0.9);

  const isCustomRes = RESOLUTIONS[resIdx].label === "Custom";
  const res = isCustomRes ? { w: customW || 1920, h: customH || 1080 } : RESOLUTIONS[resIdx];
  const activeChars = charsetKey === "custom" ? customChars : CHARSETS[charsetKey];

  const applyPreset = (key) => { setPreset(key); setBgColor(PRESETS[key].bg); setFgColor(PRESETS[key].fg); setGlowColor(PRESETS[key].glow); };

  const generate = useCallback(() => {
    if (!canvasRef.current) return;
    setGenerating(true);
    // Use setTimeout to let the UI update before heavy render
    setTimeout(() => {
      generateWallpaper(canvasRef.current, {
        width: res.w, height: res.h, charset: activeChars,
        bgColor, fgColor, glowColor, fontSize, effect, pattern,
        glowIntensity, glowRadius, charOpacityMin: opacityMin,
        charOpacityMax: opacityMax, seed, fontFamily,
        depthVariation, brightnessVariation,
        layers, bokehBack, chromaticAberration, embedText, embedMode,
        crtPixelSize, crtPixelBloom,
      });
      setGenerating(false);
    }, 50);
  }, [res, activeChars, bgColor, fgColor, glowColor, fontSize, effect, pattern, glowIntensity, glowRadius, opacityMin, opacityMax, seed, fontFamily, depthVariation, brightnessVariation, layers, bokehBack, chromaticAberration, embedText, embedMode, crtPixelSize, crtPixelBloom, customW, customH]);

  useEffect(() => { generate(); }, [generate]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `matrix_${res.w}x${res.h}_${charsetKey}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const controls = (
    <>
      {/* ── CHARACTERS ── */}
      <Section title="Character Set">
        <select style={S.select} value={charsetKey} onChange={e => setCharsetKey(e.target.value)}>
          {Object.keys(CHARSETS).map(k => (
            <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}{k !== "custom" ? ` — ${CHARSETS[k].slice(0, 10)}…` : ""}</option>
          ))}
        </select>
        {charsetKey === "custom" && (
          <input style={{ ...S.input, marginTop: 4 }} placeholder="Enter custom characters…" value={customChars} onChange={e => setCustomChars(e.target.value)} />
        )}
      </Section>

      {/* ── FONT ── */}
      <Section title="Font">
        <select style={S.select} value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div style={S.tagline}>Retro pixel fonts for authentic CRT feel</div>
      </Section>

      {/* ── COLOR THEME ── */}
      <Section title="Color Theme">
        <div style={S.presetGrid}>
          {Object.entries(PRESETS).map(([k, v]) => (
            <button key={k} title={v.name} style={S.presetBtn(preset === k)} onClick={() => applyPreset(k)}>
              <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${v.bg} 40%, ${v.fg})`, borderRadius: 3 }} />
            </button>
          ))}
        </div>
        <div style={{ ...S.row, gap: 10, justifyContent: "space-between", marginTop: 8 }}>
          {[["BG", bgColor, setBgColor], ["Text", fgColor, setFgColor], ["Glow", glowColor, setGlowColor]].map(([lbl, val, fn]) => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <label style={{ ...S.label, textAlign: "center" }}>{lbl}</label>
              <input type="color" value={val} onChange={e => { fn(e.target.value); setPreset(""); }} style={{ width: 44, height: 30, border: "1px solid #333", borderRadius: 4, cursor: "pointer", background: "transparent", padding: 0 }} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── RESOLUTION ── */}
      <Section title="Resolution">
        <select style={S.select} value={resIdx} onChange={e => setResIdx(+e.target.value)}>
          {RESOLUTIONS.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
        </select>
        {isCustomRes && (
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginBottom: 2 }}>Width</label>
              <input
                type="number" min={100} max={7680} value={customW}
                onChange={e => setCustomW(Math.max(100, Math.min(7680, +e.target.value || 100)))}
                style={S.input}
              />
            </div>
            <span style={{ color: "#444", fontSize: 14, marginTop: 14 }}>×</span>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginBottom: 2 }}>Height</label>
              <input
                type="number" min={100} max={7680} value={customH}
                onChange={e => setCustomH(Math.max(100, Math.min(7680, +e.target.value || 100)))}
                style={S.input}
              />
            </div>
          </div>
        )}
      </Section>

      {/* ── SIZE & DENSITY ── */}
      <Section title={`Character Size: ${fontSize}px`}>
        <input type="range" min={3} max={100} step={1} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={S.range} />
      </Section>

      {/* ── PATTERN ── */}
      <Section title="Distribution Pattern">
        <select style={S.select} value={pattern} onChange={e => setPattern(e.target.value)}>
          {Object.entries(PATTERNS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Section>

      {/* ── POST EFFECTS ── */}
      <Section title="Post Effects">
        <select style={S.select} value={effect} onChange={e => setEffect(e.target.value)}>
          {Object.entries(EFFECTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Section>

      {/* ── MULTI-LAYER PARALLAX ── */}
      <Section title={`Parallax Layers: ${layers}`} defaultOpen={true}>
        <div style={S.row}>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setLayers(n)} style={{
              flex: 1, padding: "6px", border: layers === n ? `1px solid ${fgColor}` : "1px solid #2a2a2a",
              background: layers === n ? `${fgColor}18` : "#1a1a1a", color: layers === n ? fgColor : "#888",
              borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>
              {n === 1 ? "Single" : n === 2 ? "Dual" : "Triple"}
            </button>
          ))}
        </div>
        {layers > 1 && (
          <>
            <div style={{ ...S.rangeLabel, marginTop: 6 }}>Background Bokeh: {bokehBack}</div>
            <input type="range" min={0} max={6} step={0.5} value={bokehBack} onChange={e => setBokehBack(+e.target.value)} style={S.range} />
            <div style={S.tagline}>Blurs back layers for depth-of-field effect</div>
          </>
        )}
      </Section>

      {/* ── CHROMATIC ABERRATION ── */}
      <Section title={`Chromatic Aberration: ${chromaticAberration}`}>
        <input type="range" min={0} max={8} step={0.5} value={chromaticAberration} onChange={e => setChromaticAberration(+e.target.value)} style={S.range} />
        <div style={S.tagline}>RGB channel offset for glitchy CRT look</div>
      </Section>

      {/* ── CRT PHOSPHOR PIXELS ── */}
      <Section title={`CRT Phosphor Pixels: ${crtPixelSize < 2 ? "Off" : crtPixelSize + "px"}`}>
        <div style={S.rangeLabel}>Pixel Size: {crtPixelSize < 2 ? "Off" : crtPixelSize + "px"}</div>
        <input type="range" min={0} max={12} step={1} value={crtPixelSize} onChange={e => setCrtPixelSize(+e.target.value)} style={S.range} />
        {crtPixelSize >= 2 && (
          <>
            <div style={{ ...S.rangeLabel, marginTop: 6 }}>Phosphor Bloom: {Math.round(crtPixelBloom * 100)}%</div>
            <input type="range" min={0} max={1} step={0.05} value={crtPixelBloom} onChange={e => setCrtPixelBloom(+e.target.value)} style={S.range} />
          </>
        )}
        <div style={S.tagline}>RGB subpixel triads with dark gaps — like a real CRT</div>
      </Section>

      {/* ── EMBEDDED TEXT ── */}
      <Section title="Embedded Text">
        <input style={S.input} placeholder="e.g. WAKE UP NEO" value={embedText} onChange={e => setEmbedText(e.target.value)} />
        {embedText.trim() && (
          <div style={{ marginTop: 6 }}>
            <div style={S.rangeLabel}>Placement Mode</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {[
                ["scatter", "Scatter"],
                ["columns", "Columns ↓"],
                ["diagonal", "Diagonal ↘"],
                ["repeat_rows", "Row Fill →"],
              ].map(([k, lbl]) => (
                <button key={k} onClick={() => setEmbedMode(k)} style={{
                  padding: "5px 4px", border: embedMode === k ? `1px solid ${fgColor}` : "1px solid #2a2a2a",
                  background: embedMode === k ? `${fgColor}18` : "#1a1a1a", color: embedMode === k ? fgColor : "#888",
                  borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={S.tagline}>Words hidden within the character grid at full brightness</div>
      </Section>

      {/* ── GLOW ── */}
      <Section title="Glow" defaultOpen={false}>
        <div style={S.rangeLabel}>Intensity: {Math.round(glowIntensity * 100)}%</div>
        <input type="range" min={0} max={1} step={0.05} value={glowIntensity} onChange={e => setGlowIntensity(+e.target.value)} style={S.range} />
        <div style={{ ...S.rangeLabel, marginTop: 6 }}>Radius: {glowRadius}px</div>
        <input type="range" min={0} max={30} step={1} value={glowRadius} onChange={e => setGlowRadius(+e.target.value)} style={S.range} />
      </Section>

      {/* ── OPACITY ── */}
      <Section title={`Opacity: ${Math.round(opacityMin * 100)}–${Math.round(opacityMax * 100)}%`} defaultOpen={false}>
        <div style={S.row}>
          <span style={{ fontSize: 10, color: "#555", width: 28 }}>Min</span>
          <input type="range" min={0} max={1} step={0.05} value={opacityMin} onChange={e => setOpacityMin(Math.min(+e.target.value, opacityMax))} style={{ ...S.range, flex: 1 }} />
        </div>
        <div style={{ ...S.row, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#555", width: 28 }}>Max</span>
          <input type="range" min={0} max={1} step={0.05} value={opacityMax} onChange={e => setOpacityMax(Math.max(+e.target.value, opacityMin))} style={{ ...S.range, flex: 1 }} />
        </div>
      </Section>

      {/* ── DEPTH & BRIGHTNESS ── */}
      <Section title="Depth & Brightness" defaultOpen={false}>
        <div style={S.rangeLabel}>Depth Variation: {Math.round(depthVariation * 100)}%</div>
        <input type="range" min={0} max={1} step={0.05} value={depthVariation} onChange={e => setDepthVariation(+e.target.value)} style={S.range} />
        <div style={{ ...S.rangeLabel, marginTop: 6 }}>Brightness Variation: {Math.round(brightnessVariation * 100)}%</div>
        <input type="range" min={0} max={1} step={0.05} value={brightnessVariation} onChange={e => setBrightnessVariation(+e.target.value)} style={S.range} />
      </Section>

      {/* ── SEED ── */}
      <Section title={`Seed: ${seed}`} defaultOpen={false}>
        <button style={S.btnSec} onClick={() => setSeed(Math.floor(Math.random() * 999999))}>Randomize Seed</button>
      </Section>
    </>
  );

  // ── DESKTOP LAYOUT ──
  if (!isMobile) {
    return (
      <div style={S.root}>
        <div style={S.sidebar}>
          <div style={{ fontSize: 15, fontWeight: 800, color: fgColor, marginBottom: 1, letterSpacing: "0.08em", fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>MATRIX ME</div>
          <div style={S.sub}>Impulsively made by Inje</div>
          {controls}
          <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <button style={{ ...S.btn, background: fgColor, opacity: generating ? 0.5 : 1 }} onClick={generate} disabled={generating}>
              {generating ? "⏳ RENDERING…" : "▶ REGENERATE"}
            </button>
            <button style={{ ...S.btn, background: "#fff", color: "#000" }} onClick={download}>
              ↓ DOWNLOAD PNG
            </button>
          </div>
        </div>
        <div style={S.preview}>
          <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 2, boxShadow: `0 0 80px ${glowColor}15` }} />
          {generating && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
              <div style={{ color: fgColor, fontSize: 14, fontFamily: "'Press Start 2P', monospace", animation: "pulse 1s infinite" }}>RENDERING...</div>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 10, color: "#333", fontFamily: "inherit" }}>
            {res.w}×{res.h} · {charsetKey} · {fontFamily} · {layers > 1 ? `${layers} layers` : "single layer"}
          </div>
        </div>
      </div>
    );
  }

  // ── MOBILE LAYOUT ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", fontFamily: "'Share Tech Mono', 'VT323', monospace", background: "#0c0c0c", color: "#c8c8c8", overflow: "hidden" }}>
      {/* Mobile header */}
      <div style={{
        background: "#111", borderBottom: "1px solid #1e1e1e",
        padding: "10px 14px", paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
        display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: fgColor, letterSpacing: "0.08em", fontFamily: "'Press Start 2P', monospace" }}>MATRIX ME</div>
        <div style={{ fontSize: 10, color: "#555" }}>Impulsively made by Inje</div>
      </div>

      {/* Preview area — tapping here dismisses settings */}
      <div
        onClick={() => { if (showPanel) setShowPanel(false); }}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", position: "relative", minHeight: 0 }}
      >
        <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        {generating && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
            <div style={{ color: fgColor, fontSize: 10, fontFamily: "'Press Start 2P', monospace" }}>RENDERING...</div>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: "#333" }}>
          {res.w}×{res.h} · {charsetKey}
        </div>
      </div>

      {/* Dimmed backdrop when settings open — tap to dismiss */}
      {showPanel && (
        <div
          onClick={() => setShowPanel(false)}
          style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.4)" }}
        />
      )}

      {/* Slide-up settings panel */}
      {showPanel && (
        <div style={{
          position: "absolute", bottom: "calc(56px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0, zIndex: 15,
          maxHeight: "55vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
          background: "#111", borderTop: "1px solid #1e1e1e", borderRadius: "12px 12px 0 0",
          padding: "12px 14px 20px", boxShadow: "0 -8px 30px rgba(0,0,0,0.7)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: fgColor, marginBottom: 8, letterSpacing: "0.08em", fontFamily: "'Press Start 2P', monospace" }}>SETTINGS</div>
          {controls}
        </div>
      )}

      {/* Sticky bottom bar with toggle + actions */}
      <div style={{
        background: "#111", borderTop: "1px solid #1e1e1e",
        padding: "8px 12px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        display: "flex", gap: 6, flexShrink: 0, zIndex: 20,
      }}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            flex: 1, padding: "10px", border: `1px solid ${fgColor}44`, borderRadius: 6,
            background: showPanel ? `${fgColor}18` : "transparent",
            color: fgColor, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {showPanel ? "✕ CLOSE" : "⚙ SETTINGS"}
        </button>
        <button style={{ ...S.btn, flex: 1, background: fgColor, opacity: generating ? 0.5 : 1 }} onClick={generate} disabled={generating}>
          {generating ? "⏳" : "▶ RENDER"}
        </button>
        <button style={{ ...S.btn, flex: 0.8, background: "#fff", color: "#000", fontSize: 12 }} onClick={download}>
          ↓
        </button>
      </div>
    </div>
  );
}
