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

const addPanelSheen = (ctx, x, y, width, height, radius, color, opacity = 0.28) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, withAlpha(color, opacity));
  gradient.addColorStop(0.4, withAlpha(color, opacity * 0.45));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
};

const addPanelShadow = (ctx, x, y, width, height, radius, color, opacity = 0.32) => {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, y + height, x, y);
  gradient.addColorStop(0, withAlpha(color, opacity));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
};

const drawPanelLines = (ctx, x, y, width, height, step, color, opacity = 0.22) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.strokeStyle = withAlpha(color, opacity);
  ctx.lineWidth = 0.6;
  for (let offset = y + step; offset < y + height; offset += step) {
    ctx.beginPath();
    ctx.moveTo(x + 1.8, offset);
    ctx.lineTo(x + width - 1.8, offset + step * 0.15);
    ctx.stroke();
  }
  ctx.restore();
};

const drawStatusLights = (ctx, x, y, colors = []) => {
  colors.forEach((color, index) => {
    const lx = x + index * 7;
    ctx.fillStyle = withAlpha(color, 0.85);
    ctx.beginPath();
    ctx.arc(lx, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
    drawGlow(ctx, lx, y, 6, color, 0.32);
  });
};

const drawCable = (ctx, points, color, width = 2) => {
  if (!points.length) return;
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.75);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
};

const drawRivets = (ctx, x, y, width, count, color) => {
  if (count <= 0) return;
  const spacing = width / (count - 1 || 1);
  for (let i = 0; i < count; i += 1) {
    const rx = x + spacing * i;
    ctx.fillStyle = withAlpha(color, 0.7);
    ctx.beginPath();
    ctx.arc(rx, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
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
  addPanelSheen(ctx, 34, 38, 60, 26, 10, palette.glow, 0.22);
  addPanelShadow(ctx, 34, 38, 60, 26, 10, palette.shadow, 0.3);
  drawPanelLines(ctx, 36, 40, 56, 20, 4.6, palette.shadow, 0.16);
  ctx.strokeStyle = withAlpha(palette.accent, 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Support legs and casters
  ctx.fillStyle = withAlpha(palette.shadow, 0.82);
  drawRoundedRect(ctx, 40, 62, 6, 12, 2.4);
  ctx.fill();
  drawRoundedRect(ctx, 82, 62, 6, 12, 2.4);
  ctx.fill();
  addPanelSheen(ctx, 40, 62, 6, 12, 2.4, palette.highlight, 0.18);
  addPanelSheen(ctx, 82, 62, 6, 12, 2.4, palette.highlight, 0.18);
  ctx.fillStyle = withAlpha(palette.shadow, 0.92);
  ctx.beginPath();
  ctx.arc(43, 75, 2.2, 0, Math.PI * 2);
  ctx.arc(85, 75, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Monitor stand
  ctx.fillStyle = withAlpha(palette.shadow, 0.85);
  ctx.fillRect(60, 26, 8, 16);
  drawRoundedRect(ctx, 50, 18, 28, 18, 6);
  const screenGradient = ctx.createLinearGradient(50, 18, 78, 36);
  screenGradient.addColorStop(0, withAlpha(palette.glow, 0.95));
  screenGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.35), 0.85));
  ctx.fillStyle = screenGradient;
  ctx.fill();
  addPanelSheen(ctx, 50, 18, 28, 18, 6, "#f8fafc", 0.18);
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.stroke();
  drawStatusLights(ctx, 54, 22, [palette.glow, "#34d399", "#facc15"]);
  ctx.fillStyle = withAlpha("#0f172a", 0.75);
  ctx.fillRect(56, 26, 16, 2);
  ctx.fillStyle = withAlpha("#f8fafc", 0.8);
  ctx.fillRect(54, 30, 6, 1.6);
  ctx.fillRect(62, 30, 8, 1.6);
  drawCable(
    ctx,
    [
      { x: 64, y: 44 },
      { x: 60, y: 50 },
      { x: 54, y: 58 },
    ],
    palette.shadow,
    1.8
  );

  // Instrument tray
  drawRoundedRect(ctx, 40, 46, 48, 10, 5);
  ctx.fillStyle = withAlpha(palette.shadow, 0.75);
  ctx.fill();
  addPanelSheen(ctx, 40, 46, 48, 10, 5, palette.glow, 0.24);
  drawPanelLines(ctx, 42, 47, 44, 7, 3.5, palette.highlight, 0.22);
  ctx.fillStyle = withAlpha(palette.glow, 0.9);
  ctx.fillRect(46, 50, 8, 2.5);
  ctx.fillRect(58, 49, 6, 3);
  ctx.fillRect(70, 50, 10, 2);
  ctx.fillStyle = withAlpha("#f8fafc", 0.75);
  ctx.fillRect(70, 48.2, 2, 3.6);
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
  addPanelSheen(ctx, -outerRadius, -outerRadius, outerRadius * 2, outerRadius * 2, outerRadius, palette.glow, 0.2);
  addPanelShadow(ctx, -outerRadius, -outerRadius, outerRadius * 2, outerRadius * 2, outerRadius, palette.shadow, 0.22);
  drawRivets(ctx, -outerRadius + 8, -outerRadius + 6, outerRadius * 2 - 16, 7, palette.shadow);

  // Scanner lights
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const lx = Math.cos(angle) * (innerRadius + 4);
    const ly = Math.sin(angle) * (innerRadius + 4);
    drawGlow(ctx, lx, ly, 5, palette.glow, 0.45);
    ctx.fillStyle = withAlpha(palette.glow, 0.85);
    ctx.beginPath();
    ctx.arc(lx, ly, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Base struts
  ctx.fillStyle = withAlpha(palette.shadow, 0.78);
  drawRoundedRect(ctx, 32, 62, 12, 10, 4);
  ctx.fill();
  drawRoundedRect(ctx, 84, 62, 12, 10, 4);
  ctx.fill();
  addPanelSheen(ctx, 32, 62, 12, 10, 4, palette.highlight, 0.18);
  addPanelSheen(ctx, 84, 62, 12, 10, 4, palette.highlight, 0.18);
  ctx.fillStyle = withAlpha(palette.shadow, 0.92);
  ctx.beginPath();
  ctx.arc(38, 74, 2.4, 0, Math.PI * 2);
  ctx.arc(90, 74, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Patient bed
  drawRoundedRect(ctx, 40, 52, 48, 14, 8);
  const bedGradient = ctx.createLinearGradient(40, 52, 88, 66);
  bedGradient.addColorStop(0, withAlpha(palette.highlight, 0.85));
  bedGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.18), 0.9));
  ctx.fillStyle = bedGradient;
  ctx.fill();
  addPanelSheen(ctx, 40, 52, 48, 14, 8, palette.glow, 0.24);
  drawPanelLines(ctx, 42, 54, 44, 8, 4, palette.shadow, 0.18);
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  drawStatusLights(ctx, 44, 58, ["#22d3ee", "#facc15"]);
  drawCable(
    ctx,
    [
      { x: 46, y: 66 },
      { x: 36, y: 72 },
      { x: 30, y: 78 },
    ],
    palette.shadow,
    1.6
  );
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
  addPanelSheen(ctx, 56, 24, 20, 44, 10, palette.glow, 0.24);
  drawPanelLines(ctx, 58, 28, 16, 36, 5, palette.shadow, 0.18);

  // Upper halo
  drawRoundedRect(ctx, 44, 18, 44, 16, 8);
  const haloGradient = ctx.createLinearGradient(44, 18, 88, 34);
  haloGradient.addColorStop(0, withAlpha(palette.glow, 0.85));
  haloGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.2), 0.78));
  ctx.fillStyle = haloGradient;
  ctx.fill();
  addPanelSheen(ctx, 44, 18, 44, 16, 8, "#f8fafc", 0.2);
  drawStatusLights(ctx, 50, 26, [palette.glow, "#4ade80"]);

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
  drawCable(
    ctx,
    [
      { x: 92, y: 22 },
      { x: 94, y: 36 },
      { x: 100, y: 46 },
    ],
    palette.accent,
    1.4
  );
  drawCable(
    ctx,
    [
      { x: 30, y: 30 },
      { x: 28, y: 44 },
      { x: 20, y: 52 },
    ],
    palette.accent,
    1.4
  );

  // Treatment lights
  drawGlow(ctx, 102, 28, 10, palette.glow, 0.35);
  drawGlow(ctx, 24, 38, 10, palette.glow, 0.35);
  ctx.fillStyle = withAlpha(palette.glow, 0.82);
  ctx.beginPath();
  ctx.arc(102, 28, 2.6, 0, Math.PI * 2);
  ctx.arc(24, 38, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Control panel
  drawRoundedRect(ctx, 42, 54, 44, 18, 8);
  ctx.fillStyle = withAlpha("#140b07", 0.9);
  ctx.fill();
  ctx.fillStyle = withAlpha(palette.glow, 0.85);
  ctx.fillRect(50, 58, 10, 6);
  ctx.fillRect(64, 58, 14, 6);
  addPanelSheen(ctx, 42, 54, 44, 18, 8, palette.glow, 0.18);
  drawPanelLines(ctx, 46, 56, 36, 12, 4, palette.highlight, 0.22);
  drawStatusLights(ctx, 48, 66, ["#f97316", "#34d399", "#22d3ee"]);
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
  addPanelSheen(ctx, 20, 34, 84, 44, 20, palette.glow, 0.24);
  addPanelShadow(ctx, 20, 34, 84, 44, 20, palette.shadow, 0.24);
  drawPanelLines(ctx, 26, 40, 72, 30, 5.5, palette.shadow, 0.18);
  drawRivets(ctx, 26, 36, 72, 8, palette.shadow);
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = withAlpha(palette.shadow, 0.68);
  ctx.beginPath();
  ctx.ellipse(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 34, 46, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  addPanelSheen(ctx, 20, CARD_HEIGHT / 2 + 24, 84, 16, 18, palette.highlight, 0.18);

  // Pod window
  ctx.beginPath();
  ctx.ellipse(CARD_WIDTH / 2, CARD_HEIGHT / 2, 28, 18, 0, 0, Math.PI * 2);
  const windowGradient = ctx.createLinearGradient(40, 40, 88, 70);
  windowGradient.addColorStop(0, withAlpha(palette.glow, 0.82));
  windowGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.25), 0.7));
  ctx.fillStyle = windowGradient;
  ctx.fill();
  addPanelSheen(ctx, 48, 38, 32, 24, 14, "#f8fafc", 0.26);
  drawStatusLights(ctx, 46, 46, [palette.glow, "#a855f7"]);

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
  ctx.fillStyle = withAlpha("#4ade80", 0.45);
  ctx.beginPath();
  ctx.ellipse(22, 52, 4, 6, -0.5, 0, Math.PI * 2);
  ctx.ellipse(108, 50, 4, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
};

const renderSpectraImager = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 52, palette.glow, 0.32);
  drawPlatform(ctx, palette);

  ctx.save();
  ctx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 2);
  const outerRadius = 34;
  const middleRadius = 26;
  const innerRadius = 16;

  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  const outerGradient = ctx.createLinearGradient(-outerRadius, -outerRadius, outerRadius, outerRadius);
  outerGradient.addColorStop(0, withAlpha(palette.highlight, 0.95));
  outerGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.2), 0.9));
  ctx.fillStyle = outerGradient;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.stroke();
  addPanelSheen(ctx, -outerRadius, -outerRadius, outerRadius * 2, outerRadius * 2, outerRadius, palette.glow, 0.24);
  drawPanelLines(ctx, -outerRadius + 4, -outerRadius + 6, outerRadius * 2 - 8, outerRadius * 2 - 12, 6, palette.shadow, 0.16);
  drawRivets(ctx, -outerRadius + 6, -outerRadius + 4, outerRadius * 2 - 12, 6, palette.shadow);

  ctx.beginPath();
  ctx.arc(0, 0, middleRadius, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(palette.glow, 0.4);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  drawStatusLights(ctx, -middleRadius + 4, -middleRadius + 2, [palette.glow, "#facc15"]);

  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha("#040911", 0.94);
  ctx.fill();
  addPanelSheen(ctx, -innerRadius, -innerRadius, innerRadius * 2, innerRadius * 2, innerRadius, "#f8fafc", 0.16);

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const lx = Math.cos(angle) * (middleRadius + 2);
    const ly = Math.sin(angle) * (middleRadius + 2);
    drawGlow(ctx, lx, ly, 6, palette.glow, 0.4);
    ctx.fillStyle = withAlpha(palette.glow, 0.78);
    ctx.beginPath();
    ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawRoundedRect(ctx, 42, 50, 52, 16, 8);
  const bedGradient = ctx.createLinearGradient(42, 50, 94, 66);
  bedGradient.addColorStop(0, withAlpha(palette.highlight, 0.86));
  bedGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.18), 0.9));
  ctx.fillStyle = bedGradient;
  ctx.fill();
  addPanelSheen(ctx, 42, 50, 52, 16, 8, palette.glow, 0.2);
  drawPanelLines(ctx, 44, 52, 48, 12, 4, palette.shadow, 0.18);
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  drawStatusLights(ctx, 46, 60, ["#34d399", "#22d3ee", "#f97316"]);
};

const renderGenomicSequencer = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2 - 6, 48, palette.glow, 0.28);
  drawPlatform(ctx, palette);

  drawRoundedRect(ctx, 30, 32, 68, 42, 12);
  const bodyGradient = ctx.createLinearGradient(30, 32, 98, 74);
  bodyGradient.addColorStop(0, withAlpha(palette.highlight, 0.92));
  bodyGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.22), 0.86));
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  addPanelSheen(ctx, 30, 32, 68, 42, 12, palette.glow, 0.22);
  drawPanelLines(ctx, 34, 36, 60, 34, 5, palette.shadow, 0.18);
  drawRivets(ctx, 36, 34, 56, 6, palette.shadow);

  drawRoundedRect(ctx, 40, 40, 48, 18, 8);
  ctx.fillStyle = withAlpha("#12091f", 0.92);
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.35);
  ctx.stroke();
  ctx.fillStyle = withAlpha(palette.glow, 0.85);
  ctx.fillRect(48, 44, 8, 6);
  ctx.fillRect(60, 44, 12, 6);
  addPanelSheen(ctx, 40, 40, 48, 18, 8, "#f8fafc", 0.2);
  drawPanelLines(ctx, 44, 44, 40, 10, 3.6, palette.glow, 0.2);
  drawStatusLights(ctx, 44, 52, [palette.glow, "#f97316", "#34d399"]);

  drawRoundedRect(ctx, 36, 58, 56, 12, 6);
  const trayGradient = ctx.createLinearGradient(36, 58, 92, 70);
  trayGradient.addColorStop(0, withAlpha(palette.glow, 0.6));
  trayGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.18), 0.5));
  ctx.fillStyle = trayGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.3);
  ctx.stroke();
  addPanelSheen(ctx, 36, 58, 56, 12, 6, palette.glow, 0.18);
  drawPanelLines(ctx, 38, 60, 52, 8, 3.4, palette.shadow, 0.18);

  for (let i = 0; i < 4; i += 1) {
    const bx = 44 + i * 10;
    drawGlow(ctx, bx, 62, 6, palette.glow, 0.38);
    ctx.fillStyle = withAlpha(palette.glow, 0.8);
    ctx.beginPath();
    ctx.arc(bx, 62, 2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const renderHyperbaricChamber = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 54, palette.glow, 0.28);
  drawPlatform(ctx, palette);

  drawRoundedRect(ctx, 28, 40, 72, 32, 20);
  const shellGradient = ctx.createLinearGradient(28, 40, 100, 72);
  shellGradient.addColorStop(0, withAlpha(palette.highlight, 0.94));
  shellGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.2), 0.88));
  ctx.fillStyle = shellGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();
  addPanelSheen(ctx, 28, 40, 72, 32, 20, palette.glow, 0.24);
  addPanelShadow(ctx, 28, 40, 72, 32, 20, palette.shadow, 0.24);
  drawPanelLines(ctx, 32, 44, 64, 24, 5, palette.shadow, 0.18);
  drawRivets(ctx, 34, 42, 60, 7, palette.shadow);

  drawRoundedRect(ctx, 44, 48, 40, 18, 10);
  const windowGradient = ctx.createLinearGradient(44, 48, 84, 66);
  windowGradient.addColorStop(0, withAlpha(palette.glow, 0.82));
  windowGradient.addColorStop(1, withAlpha(shiftColor(palette.glow, -0.24), 0.7));
  ctx.fillStyle = windowGradient;
  ctx.fill();
  addPanelSheen(ctx, 46, 46, 36, 20, 10, "#f8fafc", 0.26);
  drawStatusLights(ctx, 46, 54, [palette.glow, "#f97316"]);

  ctx.strokeStyle = withAlpha(palette.accent, 0.4);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(38, 52);
  ctx.lineTo(32, 34);
  ctx.moveTo(90, 52);
  ctx.lineTo(96, 30);
  ctx.stroke();

  drawGlow(ctx, 32, 34, 10, palette.glow, 0.35);
  drawGlow(ctx, 96, 30, 10, palette.glow, 0.35);
  ctx.fillStyle = withAlpha(palette.glow, 0.75);
  ctx.beginPath();
  ctx.arc(32, 34, 2.4, 0, Math.PI * 2);
  ctx.arc(96, 30, 2.4, 0, Math.PI * 2);
  ctx.fill();
};

const renderNeurocalmArray = (ctx, palette) => {
  createBackdrop(ctx, palette);
  drawGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 46, palette.glow, 0.3);
  drawPlatform(ctx, palette);

  drawRoundedRect(ctx, 36, 32, 56, 30, 14);
  const chairGradient = ctx.createLinearGradient(36, 32, 92, 62);
  chairGradient.addColorStop(0, withAlpha(palette.highlight, 0.9));
  chairGradient.addColorStop(1, withAlpha(shiftColor(palette.highlight, -0.22), 0.84));
  ctx.fillStyle = chairGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.45);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  addPanelSheen(ctx, 36, 32, 56, 30, 14, palette.glow, 0.22);
  drawPanelLines(ctx, 40, 36, 48, 20, 4.6, palette.shadow, 0.18);

  ctx.fillStyle = withAlpha(palette.shadow, 0.75);
  ctx.fillRect(42, 58, 44, 6);
  ctx.beginPath();
  ctx.moveTo(42, 64);
  ctx.lineTo(38, 76);
  ctx.moveTo(86, 64);
  ctx.lineTo(90, 76);
  ctx.strokeStyle = withAlpha(palette.shadow, 0.65);
  ctx.lineWidth = 3;
  ctx.stroke();
  addPanelSheen(ctx, 42, 58, 44, 6, 2, palette.highlight, 0.16);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    const rx = CARD_WIDTH / 2 + Math.cos(angle) * 30;
    const ry = CARD_HEIGHT / 2 - 10 + Math.sin(angle) * 20;
    drawGlow(ctx, rx, ry, 10, palette.glow, 0.35);
    ctx.fillStyle = withAlpha(palette.glow, 0.78);
    ctx.beginPath();
    ctx.arc(rx, ry, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRoundedRect(ctx, 48, 40, 32, 12, 6);
  ctx.fillStyle = withAlpha("#160b04", 0.92);
  ctx.fill();
  ctx.fillStyle = withAlpha(palette.glow, 0.85);
  ctx.fillRect(52, 44, 8, 4);
  ctx.fillRect(64, 44, 10, 4);
  addPanelSheen(ctx, 48, 40, 32, 12, 6, "#f8fafc", 0.2);
  drawPanelLines(ctx, 52, 42, 24, 7, 3, palette.glow, 0.18);
  drawStatusLights(ctx, 50, 50, [palette.glow, "#a855f7"]);
};

const MACHINE_RENDERERS = {
  "standard-kit": renderStandardKit,
  "advanced-diagnostics": renderDiagnosticsRig,
  "precision-suite": renderPrecisionSuite,
  "holistic-support": renderHolisticCapsule,
  "spectra-imager": renderSpectraImager,
  "genomic-sequencer": renderGenomicSequencer,
  "hyperbaric-chamber": renderHyperbaricChamber,
  "neurocalm-array": renderNeurocalmArray,
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
