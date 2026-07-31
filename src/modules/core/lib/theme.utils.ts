export interface BrandColorTokens {
  primary: string;
  foreground: string;
}

export function getBrandColorTokens(hex: string): BrandColorTokens | null {
  const value = hex.replace(/^#/, '');
  if (!/^[0-9A-F]{6}$/i.test(value)) return null;

  const [r, g, b] = [0, 2, 4].map((offset) =>
    parseInt(value.substring(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const linear = [r, g, b].map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;

  return {
    primary: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
    foreground: whiteContrast >= blackContrast ? '0 0% 100%' : '0 0% 0%',
  };
}
