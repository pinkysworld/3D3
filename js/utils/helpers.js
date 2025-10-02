export const deepClone = (input) => JSON.parse(JSON.stringify(input));

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const hashString = (value) => {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeHex = (hex) => {
  if (!hex) return "#000000";
  let value = hex.trim();
  if (value.startsWith("rgb")) {
    const parts = value
      .replace(/rgba?\(/, "")
      .replace(/\)/, "")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((part, index) => index < 3 && Number.isFinite(part));
    if (parts.length === 3) {
      const [r, g, b] = parts.map((channel) => clamp(Math.round(channel), 0, 255));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return "#000000";
  }
  if (!value.startsWith("#")) {
    value = `#${value}`;
  }
  if (value.length === 4) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (value.length < 7) {
    value = `${value}${"0".repeat(7 - value.length)}`;
  }
  return value.slice(0, 7).toLowerCase();
};

export const shiftColor = (hex, percent = 0) => {
  const value = normalizeHex(hex);
  const amount = clamp(percent, -1, 1);
  const num = parseInt(value.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const factor = 1 + amount;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  }
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const hexToRgb = (hex) => {
  const value = normalizeHex(hex);
  const num = parseInt(value.slice(1), 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
};

export const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
