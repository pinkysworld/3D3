import { createRoomCardArt } from "./roomArtRenderers.js";
import { createMachineCardArt } from "./equipmentRenderers.js";
import {
  createInteriorPreviewDataUrl,
  renderInteriorTexturePolygon,
} from "./interiorTextures.js";
import { withAlpha, shiftColor } from "../utils/helpers.js";

const createOffscreenCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const createRenderEngine = ({ tileSize = 64 } = {}) => {
  const tileCache = new Map();

  const renderInteriorPolygon = (ctx, corners, theme = {}) => {
    renderInteriorTexturePolygon(ctx, corners, theme);
  };

  const getRoomTileSprite = (theme, visualKey = "default", visual = {}) => {
    const palette = theme?.palette ?? {};
    const cacheKey = [
      theme?.id ?? "default",
      visualKey,
      palette.base ?? "",
      palette.mid ?? "",
      palette.accent ?? "",
      visual.color ?? "",
    ].join("|");

    if (!tileCache.has(cacheKey)) {
      const canvas = createOffscreenCanvas(tileSize, tileSize);
      const ctx = canvas.getContext("2d");
      const inset = Math.round(tileSize * 0.12);
      const corners = [
        { x: inset, y: inset },
        { x: tileSize - inset, y: inset },
        { x: tileSize - inset, y: tileSize - inset },
        { x: inset, y: tileSize - inset },
      ];

      renderInteriorPolygon(ctx, corners, theme);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const accent = palette.accent ?? palette.mid ?? visual.color ?? "#38bdf8";
      const glow = ctx.createRadialGradient(
        tileSize / 2,
        tileSize / 2 + inset * 0.6,
        tileSize * 0.12,
        tileSize / 2,
        tileSize / 2 + inset * 0.6,
        tileSize * 0.85
      );
      glow.addColorStop(0, withAlpha(shiftColor(accent, 0.25), 0.32));
      glow.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(inset, inset, tileSize - inset * 2, tileSize - inset * 2);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = withAlpha(shiftColor(palette.base ?? visual.color ?? "#1f2937", -0.35), 0.4);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(
        inset + 0.6,
        inset + 0.6,
        tileSize - inset * 2 - 1.2,
        tileSize - inset * 2 - 1.2
      );
      ctx.restore();

      if (typeof visual?.furniture === "function") {
        ctx.save();
        visual.furniture(ctx, 0, 0);
        ctx.restore();
      }

      ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);

      tileCache.set(cacheKey, canvas);
    }

    return tileCache.get(cacheKey);
  };

  const invalidate = () => {
    tileCache.clear();
  };

  return {
    createRoomCardArt,
    createMachineCardArt,
    createInteriorPreviewDataUrl,
    renderInteriorPolygon,
    getRoomTileSprite,
    invalidate,
  };
};
