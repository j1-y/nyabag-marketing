type Rgb = {
  r: number;
  g: number;
  b: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: clamp(Number.parseInt(normalized.slice(0, 2), 16)),
    g: clamp(Number.parseInt(normalized.slice(2, 4), 16)),
    b: clamp(Number.parseInt(normalized.slice(4, 6), 16)),
  };
}

function rgbToHsl({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;

  if (max === min) return { hue: 0, saturation: 0, lightness };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;

  return { hue: hue * 60, saturation, lightness };
}

export function getDesignDnaColorName(hex: string, index = 0): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `Color ${index + 1}`;

  const { hue, saturation, lightness } = rgbToHsl(rgb);

  if (lightness >= 0.97) return "Crystal White";
  if (lightness <= 0.06) return "Ink Black";
  if (saturation <= 0.08) {
    if (lightness >= 0.9) return "Athens Gray";
    if (lightness >= 0.72) return "Soft Gray";
    if (lightness >= 0.38) return "Slate Gray";
    return "Midnight Blue";
  }

  if (hue < 15 || hue >= 345) return lightness > 0.62 ? "Coral Red" : "Rose Red";
  if (hue < 42) return "Amber Orange";
  if (hue < 68) return "Lemon Yellow";
  if (hue < 145) return lightness > 0.62 ? "Mint Green" : "Emerald Green";
  if (hue < 185) return "Maya Blue";
  if (hue < 225) return lightness > 0.62 ? "Sky Blue" : "Electric Blue";
  if (hue < 268) return lightness > 0.42 ? "Cornflower Blue" : "Midnight Blue";
  if (hue < 312) return saturation > 0.45 ? "Electric Purple" : "Royal Purple";
  return "Rose Pink";
}
