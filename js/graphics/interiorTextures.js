import { getInteriorTextureDefinition } from "../data/visualAssets.js";
import { withAlpha, shiftColor } from "../utils/helpers.js";

const previewCache = new Map();

const resolveColor = (palette, token) => {
  if (!token) return "#38bdf8";
  if (typeof token === "string" && token.startsWith("#")) return token;
  if (typeof token === "string" && token.startsWith("rgb")) return token;
  return palette?.[token] ?? palette?.accent ?? palette?.decor ?? "#38bdf8";
};

const computeBounds = (corners) => {
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

const fillBaseGradient = (ctx, bounds, palette, texture) => {
  const base = palette?.base ?? "#1f2937";
  const mid = palette?.mid ?? shiftColor(base, 0.12);
  const gradient = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
  gradient.addColorStop(
    0,
    withAlpha(shiftColor(base, texture.baseShift ?? 0.2), texture.baseAlpha ?? 0.94)
  );
  gradient.addColorStop(
    1,
    withAlpha(shiftColor(mid, texture.midShift ?? -0.1), texture.midAlpha ?? 0.88)
  );
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.minX - 12, bounds.minY - 12, bounds.width + 24, bounds.height + 24);
};

const drawStripeLayer = (ctx, bounds, palette, layer) => {
  const color = resolveColor(palette, layer.color);
  const opacity = layer.opacity ?? 0.18;
  const spacing = layer.spacing ?? 18;
  const width = layer.width ?? 2;
  const angle = ((layer.angle ?? 45) * Math.PI) / 180;
  ctx.save();
  ctx.translate(bounds.centerX, bounds.centerY);
  ctx.rotate(angle);
  ctx.lineWidth = width;
  ctx.strokeStyle = withAlpha(color, opacity);
  const span = Math.max(bounds.width, bounds.height) * 1.8;
  for (let offset = -span; offset <= span; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(-span, offset);
    ctx.lineTo(span, offset);
    ctx.stroke();
  }
  ctx.restore();
};

const drawDotLayer = (ctx, bounds, palette, layer) => {
  const color = resolveColor(palette, layer.color);
  const opacity = layer.opacity ?? 0.22;
  const radius = layer.radius ?? 2;
  const spacingX = layer.spacingX ?? 26;
  const spacingY = layer.spacingY ?? 20;
  const offsetX = layer.offsetX ?? 0;
  const offsetY = layer.offsetY ?? 0;
  const alternate = layer.alternateOffset ?? 0;
  ctx.save();
  ctx.fillStyle = withAlpha(color, opacity);
  let rowIndex = 0;
  for (let y = bounds.minY - spacingY; y <= bounds.maxY + spacingY; y += spacingY) {
    const rowOffset = rowIndex % 2 === 0 ? 0 : alternate;
    for (let x = bounds.minX - spacingX; x <= bounds.maxX + spacingX; x += spacingX) {
      ctx.beginPath();
      ctx.arc(x + offsetX + rowOffset, y + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    rowIndex += 1;
  }
  ctx.restore();
};

const drawSparkleLayer = (ctx, bounds, palette, layer) => {
  const color = resolveColor(palette, layer.color);
  const opacity = layer.opacity ?? 0.25;
  const radius = layer.radius ?? 2;
  const spacingX = layer.spacingX ?? 28;
  const spacingY = layer.spacingY ?? 24;
  const rotation = ((layer.rotation ?? 45) * Math.PI) / 180;
  ctx.save();
  ctx.translate(bounds.centerX, bounds.centerY);
  ctx.rotate(rotation);
  ctx.fillStyle = withAlpha(color, opacity);
  for (let y = -bounds.height; y <= bounds.height; y += spacingY) {
    for (let x = -bounds.width; x <= bounds.width; x += spacingX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
  }
  ctx.restore();
};

const drawHighlight = (ctx, bounds, palette, highlight) => {
  if (!highlight) return;
  const color = resolveColor(palette, highlight.color);
  const opacity = highlight.opacity ?? 0.22;
  const radius = Math.max(bounds.width, bounds.height) * (highlight.radius ?? 0.5);
  const centerX = bounds.minX + bounds.width * (highlight.x ?? 0.5);
  const centerY = bounds.minY + bounds.height * (highlight.y ?? 0.3);
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius);
  gradient.addColorStop(0, withAlpha(color, opacity));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
};

const drawSheen = (ctx, bounds, palette, sheen) => {
  if (!sheen) return;
  const color = resolveColor(palette, sheen.color);
  const opacity = sheen.opacity ?? 0.2;
  const angle = ((sheen.angle ?? 45) * Math.PI) / 180;
  const gradient = ctx.createLinearGradient(
    bounds.centerX - bounds.width * Math.cos(angle),
    bounds.centerY - bounds.height * Math.sin(angle),
    bounds.centerX + bounds.width * Math.cos(angle),
    bounds.centerY + bounds.height * Math.sin(angle)
  );
  gradient.addColorStop(0, withAlpha(color, 0));
  gradient.addColorStop(0.5, withAlpha(color, opacity));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.minX - 20, bounds.minY - 20, bounds.width + 40, bounds.height + 40);
};

const drawVeins = (ctx, bounds, palette, veins) => {
  if (!veins) return;
  const color = resolveColor(palette, veins.color);
  const opacity = veins.opacity ?? 0.18;
  const spacingX = veins.spacingX ?? 28;
  const spacingY = veins.spacingY ?? 26;
  const control = veins.control ?? 12;
  ctx.save();
  ctx.strokeStyle = withAlpha(color, opacity);
  ctx.lineWidth = 1.4;
  for (let y = bounds.minY - spacingY; y <= bounds.maxY + spacingY; y += spacingY) {
    ctx.beginPath();
    let first = true;
    for (let x = bounds.minX - spacingX; x <= bounds.maxX + spacingX; x += spacingX) {
      const cx = x + Math.sin((y + x) * 0.02) * control;
      const cy = y + Math.cos((x - y) * 0.02) * control * 0.6;
      if (first) {
        ctx.moveTo(cx, cy);
        first = false;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
};

const drawWaves = (ctx, bounds, palette, waves) => {
  if (!waves) return;
  const count = waves.count ?? 3;
  const amplitude = waves.amplitude ?? 16;
  const color = resolveColor(palette, waves.color);
  const opacity = waves.opacity ?? 0.22;
  ctx.save();
  ctx.strokeStyle = withAlpha(color, opacity);
  ctx.lineWidth = 2.4;
  const stepY = bounds.height / (count + 1);
  for (let i = 1; i <= count; i++) {
    const y = bounds.minY + stepY * i;
    ctx.beginPath();
    for (let x = bounds.minX - 20; x <= bounds.maxX + 20; x += 8) {
      const waveY = y + Math.sin((x / bounds.width) * Math.PI * 2 + i) * amplitude * 0.2;
      if (x === bounds.minX - 20) {
        ctx.moveTo(x, waveY);
      } else {
        ctx.lineTo(x, waveY);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
};

const renderTextureLayers = (ctx, bounds, palette, texture) => {
  fillBaseGradient(ctx, bounds, palette, texture);
  texture.stripes?.forEach((layer) => drawStripeLayer(ctx, bounds, palette, layer));
  if (texture.veins) drawVeins(ctx, bounds, palette, texture.veins);
  if (texture.waves) drawWaves(ctx, bounds, palette, texture.waves);
  if (texture.dots) drawDotLayer(ctx, bounds, palette, texture.dots);
  if (texture.sparkles) drawSparkleLayer(ctx, bounds, palette, texture.sparkles);
  drawHighlight(ctx, bounds, palette, texture.highlight);
  drawSheen(ctx, bounds, palette, texture.sheen);
};

export const renderInteriorTexturePolygon = (ctx, corners, theme) => {
  const texture = getInteriorTextureDefinition(theme?.id);
  const palette = theme?.palette ?? {};
  const bounds = computeBounds(corners);
  ctx.save();
  ctx.beginPath();
  corners.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.clip();
  renderTextureLayers(ctx, bounds, palette, texture);
  ctx.restore();
};

export const createInteriorPreviewDataUrl = (theme, { width = 120, height = 80 } = {}) => {
  if (!theme?.id) return "";
  const scale = window.devicePixelRatio ?? 1;
  const cacheKey = `${theme.id}@${width}x${height}@${Math.round(scale * 100)}`;
  if (!previewCache.has(cacheKey)) {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const bounds = { minX: 0, minY: 0, maxX: width, maxY: height, width, height, centerX: width / 2, centerY: height / 2 };
    const texture = getInteriorTextureDefinition(theme.id);
    const palette = theme.palette ?? {};
    renderTextureLayers(ctx, bounds, palette, texture);
    previewCache.set(cacheKey, canvas.toDataURL("image/png"));
  }
  return previewCache.get(cacheKey);
};
