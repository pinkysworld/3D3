import { getRoomArtCategory } from "../data/visualAssets.js";
import { withAlpha, shiftColor } from "../utils/helpers.js";

const CARD_WIDTH = 164;
const CARD_HEIGHT = 108;

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

const drawBackground = (ctx, top, bottom) => {
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
};

const drawFloorPlate = (ctx, color, accent) => {
  ctx.save();
  drawRoundedRect(ctx, 12, 48, CARD_WIDTH - 24, 52, 18);
  const gradient = ctx.createLinearGradient(0, 48, CARD_WIDTH, CARD_HEIGHT - 12);
  gradient.addColorStop(0, withAlpha(shiftColor(color, 0.12), 0.9));
  gradient.addColorStop(1, withAlpha(shiftColor(color, -0.2), 0.95));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(accent, 0.32);
  ctx.stroke();
  ctx.restore();
};

const addOverheadGlow = (ctx, x, y, radius, color, alpha = 0.32) => {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const drawDesk = (ctx, { x, y, width, height, topColor, frontColor, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 16);
  const frontGradient = ctx.createLinearGradient(x, y, x, y + height);
  frontGradient.addColorStop(0, withAlpha(frontColor, 0.95));
  frontGradient.addColorStop(1, withAlpha(shiftColor(frontColor, -0.15), 0.98));
  ctx.fillStyle = frontGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.38);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  drawRoundedRect(ctx, x + 10, y + 12, width - 20, height / 2.2, 14);
  const topGradient = ctx.createLinearGradient(x, y, x + width, y + height / 2);
  topGradient.addColorStop(0, withAlpha(topColor, 0.94));
  topGradient.addColorStop(1, withAlpha(shiftColor(topColor, -0.18), 0.96));
  ctx.fillStyle = topGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
};

const drawScreen = (ctx, x, y, width, height, color) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 8);
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, withAlpha(color, 0.9));
  gradient.addColorStop(1, withAlpha(shiftColor(color, -0.2), 0.95));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.4), 0.6);
  ctx.stroke();
  ctx.restore();
};

const drawBed = (ctx, { x, y, width, height, blanket, pillow, frame }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 14);
  ctx.fillStyle = withAlpha(frame, 0.95);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(frame, -0.2), 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRect(ctx, x + 8, y + 10, width - 16, height - 20, 12);
  ctx.fillStyle = withAlpha(blanket, 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(blanket, -0.15), 0.6);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  drawRoundedRect(ctx, x + width - 36, y + 14, 24, height / 3, 8);
  ctx.fillStyle = withAlpha(pillow, 0.9);
  ctx.fill();
  ctx.restore();
};

const drawMonitorArm = (ctx, x, y, color) => {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 10, y - 18);
  ctx.lineTo(x + 26, y - 12);
  ctx.stroke();
  ctx.restore();
};

const drawScanner = (ctx, { x, y, radius, color, accent }) => {
  ctx.save();
  ctx.translate(x, y);
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
  gradient.addColorStop(0, withAlpha(color, 0.95));
  gradient.addColorStop(1, withAlpha(shiftColor(color, -0.2), 0.98));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(accent, 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(accent, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
};

const drawShelves = (ctx, { x, y, width, height, shelfCount, color, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 14);
  ctx.fillStyle = withAlpha(color, 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.18), 0.65);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const spacing = height / (shelfCount + 1);
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.lineWidth = 1.2;
  for (let i = 1; i <= shelfCount; i++) {
    const shelfY = y + spacing * i;
    ctx.beginPath();
    ctx.moveTo(x + 10, shelfY);
    ctx.lineTo(x + width - 10, shelfY);
    ctx.stroke();
  }
  ctx.restore();
};

const drawBottleRow = (ctx, { x, y, count, baseColor, accent }) => {
  const gap = 18;
  for (let i = 0; i < count; i++) {
    const bx = x + i * gap;
    ctx.save();
    drawRoundedRect(ctx, bx, y, 12, 22, 4);
    ctx.fillStyle = withAlpha(baseColor, 0.92);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shiftColor(baseColor, -0.2), 0.6);
    ctx.stroke();
    drawRoundedRect(ctx, bx + 2, y - 6, 8, 8, 3);
    ctx.fillStyle = withAlpha(accent, 0.85);
    ctx.fill();
    ctx.restore();
  }
};

const drawSurgeryTable = (ctx, { x, y, width, height, surface, frame, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 18);
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, withAlpha(surface, 0.94));
  gradient.addColorStop(1, withAlpha(shiftColor(surface, -0.2), 0.96));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = withAlpha(frame, 0.75);
  ctx.beginPath();
  ctx.moveTo(x + 18, y + height);
  ctx.lineTo(x + 18, y + height + 20);
  ctx.moveTo(x + width - 18, y + height);
  ctx.lineTo(x + width - 18, y + height + 20);
  ctx.stroke();
  ctx.restore();
};

const drawPendantLight = (ctx, { x, y, radius, color, accent }) => {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - radius * 1.8);
  ctx.lineTo(x, y - radius * 0.4);
  ctx.stroke();

  drawRoundedRect(ctx, x - radius, y - radius * 0.4, radius * 2, radius * 0.5, radius * 0.2);
  ctx.fillStyle = withAlpha(color, 0.8);
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  addOverheadGlow(ctx, x, y + radius * 0.2, radius * 1.8, accent, 0.38);
  ctx.restore();
};

const drawResearchBench = (ctx, { x, y, width, height, topColor, frame, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 14);
  ctx.fillStyle = withAlpha(frame, 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(frame, -0.2), 0.6);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  drawRoundedRect(ctx, x + 6, y + 8, width - 12, height / 2, 10);
  ctx.fillStyle = withAlpha(topColor, 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.38);
  ctx.stroke();
  ctx.restore();
};

const drawBeaker = (ctx, { x, y, width, height, color, glow }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, width * 0.4);
  ctx.fillStyle = withAlpha(color, 0.85);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.15), 0.6);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  addOverheadGlow(ctx, x + width / 2, y + height * 0.6, Math.max(width, height) * 0.6, glow, 0.25);
  ctx.restore();
};

const drawCoffeeSteam = (ctx, { x, y, color }) => {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.65);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 6, y - 18, x + 6, y - 24, x, y - 34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 4);
  ctx.bezierCurveTo(x + 2, y - 18, x + 14, y - 26, x + 6, y - 38);
  ctx.stroke();
  ctx.restore();
};

const drawMug = (ctx, { x, y, width, height, color, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, width * 0.4);
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, withAlpha(color, 0.92));
  gradient.addColorStop(1, withAlpha(shiftColor(color, -0.2), 0.96));
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + width + 6, y + height / 2, height / 3, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(color, 0.6);
  ctx.stroke();
  ctx.restore();
};

const drawGiftBag = (ctx, { x, y, width, height, color, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 10);
  ctx.fillStyle = withAlpha(color, 0.9);
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width * 0.2, y + height * 0.2);
  ctx.lineTo(x + width * 0.8, y + height * 0.2);
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.2), 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width * 0.2, y + height * 0.2);
  ctx.quadraticCurveTo(x + width / 2, y - height * 0.2, x + width * 0.8, y + height * 0.2);
  ctx.stroke();
  ctx.restore();
};

const drawClipboard = (ctx, { x, y, width, height, color, accent }) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 10);
  ctx.fillStyle = withAlpha(color, 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const lineSpacing = height / 6;
  ctx.strokeStyle = withAlpha(accent, 0.28);
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + i * lineSpacing);
    ctx.lineTo(x + width - 8, y + i * lineSpacing);
    ctx.stroke();
  }
  ctx.restore();
};

const CATEGORY_RENDERERS = {
  frontdesk: (ctx) => {
    drawBackground(ctx, "#111c3c", "#0b1329");
    addOverheadGlow(ctx, 46, 36, 38, "#38bdf8", 0.22);
    drawFloorPlate(ctx, "#111827", "#38bdf8");
    drawDesk(ctx, {
      x: 26,
      y: 46,
      width: 112,
      height: 46,
      topColor: "#1f2937",
      frontColor: "#1e40af",
      accent: "#38bdf8",
    });
    drawScreen(ctx, 40, 38, 32, 20, "#38bdf8");
    drawScreen(ctx, 84, 42, 28, 18, "#38bdf8");
    drawMonitorArm(ctx, 56, 58, "#94a3b8");
  },
  clinic: (ctx) => {
    drawBackground(ctx, "#0b1f3f", "#081226");
    drawFloorPlate(ctx, "#102a43", "#38bdf8");
    drawBed(ctx, {
      x: 30,
      y: 48,
      width: 104,
      height: 44,
      blanket: "#38bdf8",
      pillow: "#f8fafc",
      frame: "#1e293b",
    });
    drawScreen(ctx, 38, 26, 28, 18, "#34d399");
    drawMonitorArm(ctx, 60, 48, "#94a3b8");
  },
  ward: (ctx) => {
    drawBackground(ctx, "#10243a", "#0b1828");
    drawFloorPlate(ctx, "#0f2134", "#34d399");
    drawBed(ctx, {
      x: 18,
      y: 46,
      width: 64,
      height: 42,
      blanket: "#34d399",
      pillow: "#f1f5f9",
      frame: "#1e293b",
    });
    drawBed(ctx, {
      x: 86,
      y: 50,
      width: 60,
      height: 38,
      blanket: "#60a5fa",
      pillow: "#f8fafc",
      frame: "#1e293b",
    });
    addOverheadGlow(ctx, 60, 34, 40, "#34d399", 0.2);
  },
  diagnostics: (ctx) => {
    drawBackground(ctx, "#0b1b36", "#050b18");
    drawFloorPlate(ctx, "#13213a", "#38bdf8");
    drawScanner(ctx, {
      x: 84,
      y: 64,
      radius: 34,
      color: "#1e40af",
      accent: "#38bdf8",
    });
    drawBed(ctx, {
      x: 18,
      y: 62,
      width: 70,
      height: 36,
      blanket: "#38bdf8",
      pillow: "#f8fafc",
      frame: "#111827",
    });
    addOverheadGlow(ctx, 84, 48, 32, "#38bdf8", 0.25);
  },
  pharmacy: (ctx) => {
    drawBackground(ctx, "#10253d", "#0b1726");
    drawFloorPlate(ctx, "#122944", "#60a5fa");
    drawShelves(ctx, { x: 26, y: 34, width: 112, height: 52, shelfCount: 3, color: "#1e293b", accent: "#38bdf8" });
    drawBottleRow(ctx, { x: 40, y: 38, count: 5, baseColor: "#60a5fa", accent: "#38bdf8" });
    drawBottleRow(ctx, { x: 36, y: 52, count: 6, baseColor: "#34d399", accent: "#22c55e" });
    drawBottleRow(ctx, { x: 42, y: 66, count: 4, baseColor: "#f97316", accent: "#fbbf24" });
  },
  surgery: (ctx) => {
    drawBackground(ctx, "#0a162d", "#050912");
    drawFloorPlate(ctx, "#0f1f33", "#38bdf8");
    drawSurgeryTable(ctx, {
      x: 38,
      y: 48,
      width: 90,
      height: 38,
      surface: "#38bdf8",
      frame: "#0f172a",
      accent: "#22d3ee",
    });
    drawPendantLight(ctx, { x: 84, y: 30, radius: 22, color: "#94a3b8", accent: "#38bdf8" });
    addOverheadGlow(ctx, 84, 40, 48, "#38bdf8", 0.28);
  },
  research: (ctx) => {
    drawBackground(ctx, "#0b1b33", "#050a16");
    drawFloorPlate(ctx, "#102541", "#38bdf8");
    drawResearchBench(ctx, {
      x: 28,
      y: 48,
      width: 108,
      height: 40,
      topColor: "#1d4ed8",
      frame: "#0f172a",
      accent: "#38bdf8",
    });
    drawBeaker(ctx, { x: 40, y: 38, width: 18, height: 26, color: "#22d3ee", glow: "#22d3ee" });
    drawBeaker(ctx, { x: 64, y: 36, width: 14, height: 28, color: "#34d399", glow: "#34d399" });
    drawScreen(ctx, 94, 32, 28, 18, "#38bdf8");
  },
  leisure: (ctx) => {
    drawBackground(ctx, "#32163f", "#15091e");
    drawFloorPlate(ctx, "#2c1436", "#f97316");
    drawMug(ctx, { x: 32, y: 58, width: 26, height: 26, color: "#f97316", accent: "#fde68a" });
    drawCoffeeSteam(ctx, { x: 42, y: 58, color: "#fde68a" });
    drawGiftBag(ctx, { x: 78, y: 46, width: 36, height: 42, color: "#a855f7", accent: "#facc15" });
    addOverheadGlow(ctx, 96, 34, 32, "#f472b6", 0.24);
  },
  support: (ctx) => {
    drawBackground(ctx, "#1f1535", "#0c0a1b");
    drawFloorPlate(ctx, "#1a1730", "#38bdf8");
    drawClipboard(ctx, { x: 34, y: 44, width: 44, height: 48, color: "#1e293b", accent: "#38bdf8" });
    drawScreen(ctx, 88, 38, 32, 20, "#34d399");
    drawScreen(ctx, 94, 64, 26, 16, "#38bdf8");
  },
};

export const createRoomCardArt = (roomId) => {
  if (!dataUrlCache.has(roomId)) {
    const canvas = document.createElement("canvas");
    const scale = window.devicePixelRatio ?? 1;
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    const category = getRoomArtCategory(roomId);
    const renderer = CATEGORY_RENDERERS[category] ?? CATEGORY_RENDERERS.clinic;
    renderer(ctx);
    dataUrlCache.set(roomId, canvas.toDataURL("image/png"));
  }
  const img = new Image();
  img.src = dataUrlCache.get(roomId);
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";
  img.width = CARD_WIDTH;
  img.height = CARD_HEIGHT;
  img.setAttribute("aria-hidden", "true");
  const wrapper = document.createElement("span");
  wrapper.className = "build-card__art";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.appendChild(img);
  return wrapper;
};
