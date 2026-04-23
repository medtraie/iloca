export const BRAND_COLOR_STORAGE_KEY = "appBrandColor";
export const DEFAULT_BRAND_COLOR = "#FACC15";

type HslColor = {
  h: number;
  s: number;
  l: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (hex: string) => {
  const cleaned = (hex || "").trim().replace("#", "");
  if (cleaned.length === 3) {
    return `#${cleaned.split("").map((c) => c + c).join("")}`.toUpperCase();
  }
  if (cleaned.length === 6) {
    return `#${cleaned}`.toUpperCase();
  }
  return DEFAULT_BRAND_COLOR;
};

const hexToRgb = (hex: string) => {
  const safeHex = normalizeHex(hex).replace("#", "");
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);
  return { r, g, b };
};

const rgbToHsl = (r: number, g: number, b: number): HslColor => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const toHslString = ({ h, s, l }: HslColor) => `${h} ${s}% ${l}%`;

const withLightness = (color: HslColor, lightness: number): HslColor => ({
  ...color,
  l: clamp(Math.round(lightness), 5, 95),
});

const foregroundFor = (color: HslColor) => (color.l >= 60 ? "0 0% 5%" : "0 0% 100%");

export const applyBrandColor = (hexColor: string) => {
  if (typeof document === "undefined") return;

  const safeHex = normalizeHex(hexColor);
  const { r, g, b } = hexToRgb(safeHex);
  const base = rgbToHsl(r, g, b);
  const accent = base;
  const primary = withLightness(base, base.l - 18);
  const accentForeground = foregroundFor(accent);
  const primaryForeground = foregroundFor(primary);

  const root = document.documentElement;
  root.style.setProperty("--accent", toHslString(accent));
  root.style.setProperty("--accent-foreground", accentForeground);
  root.style.setProperty("--primary", toHslString(primary));
  root.style.setProperty("--primary-foreground", primaryForeground);
  root.style.setProperty("--ring", toHslString(accent));
  root.style.setProperty("--sidebar-ring", toHslString(accent));
  root.style.setProperty("--sidebar-accent-foreground", toHslString(accent));
  root.style.setProperty("--card-accent", toHslString(accent));
  root.style.setProperty("--card-green", toHslString(accent));
  root.style.setProperty("--card-green-bg", `${toHslString(accent)} / 0.1`);
};

export const applyBrandColorFromStorage = () => {
  if (typeof window === "undefined") return;
  const value = window.localStorage.getItem(BRAND_COLOR_STORAGE_KEY);
  let parsed = DEFAULT_BRAND_COLOR;
  if (value) {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }
  applyBrandColor(parsed || DEFAULT_BRAND_COLOR);
};
