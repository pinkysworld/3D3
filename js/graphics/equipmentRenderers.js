import { shiftColor, withAlpha } from "../utils/helpers.js";

const CARD_WIDTH = 128;
const CARD_HEIGHT = 96;

const dataUrlCache = new Map();

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const createBackdrop = (ctx, palette) => {
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, withAlpha(shiftColor(palette.base, 0.35), 0.88));
  gradient.addColorStop(1, withAlpha("#050b16", 0.98));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
};

const drawPlatform = (ctx, palette) => {
  const x = 16;
  const y = CARD_HEIGHT - 26;
  const width = CARD_WIDTH - 32;
  const height = 20;
  drawRoundedRect(ctx, x, y, width, height, 14);
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, withAlpha(shiftColor(palette.shadow, 0.12), 0.95));
  gradient.addColorStop(1, withAlpha(palette.shadow, 0.98));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const insetHeight = 8;
  drawRoundedRect(ctx, x + 12, y + 4, width - 24, insetHeight, 10);
  const insetGradient = ctx.createLinearGradient(x, y, x + width, y + insetHeight);
  insetGradient.addColorStop(0, withAlpha(palette.highlight, 0.6));
  insetGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.18), 0.4));
  ctx.fillStyle = insetGradient;
  ctx.fill();
};

const drawGlow = (ctx, x, y, radius, color, opacity = 0.28) => {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
  gradient.addColorStop(0, withAlpha(color, opacity));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const renderStandardKit = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 46, palette.accent, 0.18);
  drawPlatform(ctx, palette);

  // Table body
  drawRoundedRect(ctx, 34, 38, 60, 26, 10);
  const tableGradient = ctx.createLinearGradient(34, 38, 94, 64);
  tableGradient.addColorStop(0, withAlpha(palette.highlight, 0.92));
  tableGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.2), 0.94));
  ctx.fillStyle = tableGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Monitor stand
  ctx.fillStyle = withAlpha(palette.shadow, 0.85);
  ctx.fillRect(60, 26, 8, 16);
  drawRoundedRect(ctx, 50, 18, 28, 18, 6);
  const screenGradient = ctx.createLinearGradient(50, 18, 78, 36);
  screenGradient.addColorStop(0, withAlpha(palette.glow, 0.95));
  screenGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.35), 0.85));
  ctx.fillStyle = screenGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.stroke();

  // Instrument tray
  drawRoundedRect(ctx, 40, 46, 48, 10, 5);
  ctx.fillStyle = withAlpha(palette.shadow, 0.75);
  ctx.fill();
  ctx.fillStyle = withAlpha(palette.glow, 0.9);
  ctx.fillRect(46, 50, 8, 2.5);
  ctx.fillRect(58, 49, 6, 3);
  ctx.fillRect(70, 50, 10, 2);
};

const renderDiagnosticsRig = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 48, palette.glow, 0.32);
  drawPlatform(ctx, palette);

  // Scanner ring
  ctx.save();
  ctx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 4);
  const outerRadius = 34;
  const innerRadius = 20;
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(palette.highlight, 0.9);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha("#070f1f", 0.95);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(palette.accent, 0.5);
  ctx.stroke();

  // Scanner lights
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const lx = Math.cos(angle) * (innerRadius + 4);
    const ly = Math.sin(angle) * (innerRadius + 4);
    drawGlow(ctx, lx, ly, 5, palette.glow, 0.45);
  }
  ctx.restore();

  // Patient bed
  drawRoundedRect(ctx, 40, 52, 48, 14, 8);
  const bedGradient = ctx.createLinearGradient(40, 52, 88, 66);
  bedGradient.addColorStop(0, withAlpha(palette.highlight, 0.85));
  bedGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.18), 0.9));
  ctx.fillStyle = bedGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
};

const renderPrecisionSuite = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2 - 6, 50, palette.glow, 0.24);
  drawPlatform(ctx, palette);

  // Central column
  drawRoundedRect(ctx, 56, 24, 20, 44, 10);
  const columnGradient = ctx.createLinearGradient(56, 24, 76, 68);
  columnGradient.addColorStop(0, withAlpha(palette.highlight, 0.92));
  columnGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.25), 0.88));
  ctx.fillStyle = columnGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.shadow, 0.5);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Upper halo
  drawRoundedRect(ctx, 44, 18, 44, 16, 8);
  const haloGradient = ctx.createLinearGradient(44, 18, 88, 34);
  haloGradient.addColorStop(0, withAlpha(palette.glow, 0.85));
  haloGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.2), 0.78));
  ctx.fillStyle = haloGradient;
  ctx.fill();

  // Articulated arms
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(66, 32);
  ctx.lineTo(92, 22);
  ctx.lineTo(104, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(66, 40);
  ctx.lineTo(30, 30);
  ctx.lineTo(24, 40);
  ctx.stroke();

  // Treatment lights
  drawGlow(ctx, 102, 28, 10, palette.glow, 0.35);
  drawGlow(ctx, 24, 38, 10, palette.glow, 0.35);

  // Control panel
  drawRoundedRect(ctx, 42, 54, 44, 18, 8);
  ctx.fillStyle = withAlpha("#140b07", 0.9);
  ctx.fill();
  ctx.fillStyle = withAlpha(palette.glow, 0.85);
  ctx.fillRect(50, 58, 10, 6);
  ctx.fillRect(64, 58, 14, 6);
};

const renderHolisticCapsule = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 52, palette.glow, 0.26);
  drawPlatform(ctx, palette);

  // Pod body
  ctx.beginPath();
  ctx.ellipse(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 6, 42, 28, 0, 0, Math.PI * 2);
  const podGradient = ctx.createLinearGradient(20, 28, 108, 80);
  podGradient.addColorStop(0, withAlpha(palette.highlight, 0.92));
  podGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.22), 0.88));
  ctx.fillStyle = podGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pod window
  ctx.beginPath();
  ctx.ellipse(CARD_WIDTH / 2, CARD_HEIGHT / 2, 28, 18, 0, 0, Math.PI * 2);
  const windowGradient = ctx.createLinearGradient(40, 40, 88, 70);
  windowGradient.addColorStop(0, withAlpha(palette.glow, 0.82));
  windowGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.25), 0.7));
  ctx.fillStyle = windowGradient;
  ctx.fill();

  // Ambient sprouts
  ctx.strokeStyle = withAlpha(palette.accent, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(28, 74);
  ctx.quadraticCurveTo(24, 64, 20, 50);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(100, 74);
  ctx.quadraticCurveTo(108, 60, 112, 48);
  ctx.stroke();
  drawGlow(ctx, 20, 48, 10, palette.glow, 0.3);
  drawGlow(ctx, 112, 48, 10, palette.glow, 0.3);
};

const MACHINE_RENDERERS = {
  "standard-kit": renderStandardKit,
  "advanced-diagnostics": renderDiagnosticsRig,
  "precision-suite": renderPrecisionSuite,
  "holistic-support": renderHolisticCapsule,
};

const createPalette = (machine) => {
  const base = machine?.color ?? "#38bdf8";
  return {
    base,
    accent: shiftColor(base, 0.18),
    highlight: shiftColor(base, 0.32),
    shadow: shiftColor(base, -0.4),
    glow: shiftColor(base, 0.45),
  };
};

export const createMachineCardArt = (machine) => {
  const id = machine?.id ?? "standard-kit";
  if (!dataUrlCache.has(id)) {
    const canvas = document.createElement("canvas");
    const scale = window.devicePixelRatio ?? 1;
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    const renderer = MACHINE_RENDERERS[id] ?? renderStandardKit;
    renderer(ctx, createPalette(machine));
    dataUrlCache.set(id, canvas.toDataURL("image/png"));
  }
  const img = new Image();
  img.src = dataUrlCache.get(id);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.width = CARD_WIDTH;
  img.height = CARD_HEIGHT;
  img.setAttribute("aria-hidden", "true");

  const wrapper = document.createElement("span");
  wrapper.className = "designer-equipment-option__art";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.appendChild(img);
  return wrapper;
};
