// Utility functions for Tenant Branding and Dynamic CSS Theme Tokens

export interface DerivedPalette {
  base: string;
  hover: string;
  active: string;
  soft: string;
  border: string;
  contrast: string;
  hoverContrast: string;
  activeContrast: string;
}

export interface TenantThemeTokens {
  primary: DerivedPalette;
  secondary: DerivedPalette;
}

export const DEFAULT_PRIMARY_COLOR = '#00382B';
export const DEFAULT_SECONDARY_COLOR = '#D99B26';

/**
 * Validates a 6-character hex color string.
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Normalizes a hex string (ensures # prefix and uppercase).
 */
export function normalizeHexColor(hex: string, fallback: string): string {
  if (!hex) return fallback;
  let clean = hex.trim();
  if (!clean.startsWith('#')) clean = `#${clean}`;
  if (isValidHexColor(clean)) return clean.toUpperCase();
  return fallback;
}

/**
 * Converts a HEX string to RGB object.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#000000').replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Calculates relative sRGB luminance according to WCAG 2.2 specs.
 */
export function calculateLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG 2.2 contrast ratio between two hex colors.
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns accessible contrast text color (#FFFFFF or #111827) for a given background HEX.
 */
export function getContrastTextColor(bgHex: string): string {
  const ratioWhite = calculateContrastRatio(bgHex, '#FFFFFF');
  const ratioDark = calculateContrastRatio(bgHex, '#111827');
  return ratioWhite >= ratioDark ? '#FFFFFF' : '#111827';
}

/**
 * Adjusts color brightness (factor > 1 for lighter, < 1 for darker).
 */
export function adjustBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const newR = clamp(r * factor);
  const newG = clamp(g * factor);
  const newB = clamp(b * factor);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Generates derived palette tokens from a single base HEX color.
 */
export function generateDerivedPalette(baseHex: string, fallbackHex: string): DerivedPalette {
  const validBase = normalizeHexColor(baseHex, fallbackHex);
  const hover = adjustBrightness(validBase, 1.15);
  const active = adjustBrightness(validBase, 0.85);
  
  const { r, g, b } = hexToRgb(validBase);
  const soft = `rgba(${r}, ${g}, ${b}, 0.15)`;
  const border = `rgba(${r}, ${g}, ${b}, 0.35)`;
  const contrast = getContrastTextColor(validBase);
  const hoverContrast = getContrastTextColor(hover);
  const activeContrast = getContrastTextColor(active);

  return {
    base: validBase,
    hover,
    active,
    soft,
    border,
    contrast,
    hoverContrast,
    activeContrast,
  };
}

/**
 * Generates full brand tokens from primary and secondary colors.
 */
export function generateBrandTokens(primaryHex?: string, secondaryHex?: string): TenantThemeTokens {
  const prim = generateDerivedPalette(primaryHex || DEFAULT_PRIMARY_COLOR, DEFAULT_PRIMARY_COLOR);
  const sec = generateDerivedPalette(secondaryHex || DEFAULT_SECONDARY_COLOR, DEFAULT_SECONDARY_COLOR);
  return { primary: prim, secondary: sec };
}

/**
 * Injects CSS custom properties into document element (:root) for instant theme application.
 */
export function applyThemeToCssVariables(primaryHex?: string, secondaryHex?: string): TenantThemeTokens {
  const tokens = generateBrandTokens(primaryHex, secondaryHex);
  const root = document.documentElement;

  root.style.setProperty('--color-brand-primary', tokens.primary.base);
  root.style.setProperty('--color-brand-primary-hover', tokens.primary.hover);
  root.style.setProperty('--color-brand-primary-active', tokens.primary.active);
  root.style.setProperty('--color-brand-primary-soft', tokens.primary.soft);
  root.style.setProperty('--color-brand-primary-border', tokens.primary.border);
  root.style.setProperty('--color-brand-primary-contrast', tokens.primary.contrast);
  root.style.setProperty('--color-brand-primary-hover-contrast', tokens.primary.hoverContrast);
  root.style.setProperty('--color-brand-primary-active-contrast', tokens.primary.activeContrast);

  root.style.setProperty('--color-brand-secondary', tokens.secondary.base);
  root.style.setProperty('--color-brand-secondary-hover', tokens.secondary.hover);
  root.style.setProperty('--color-brand-secondary-active', tokens.secondary.active);
  root.style.setProperty('--color-brand-secondary-soft', tokens.secondary.soft);
  root.style.setProperty('--color-brand-secondary-border', tokens.secondary.border);
  root.style.setProperty('--color-brand-secondary-contrast', tokens.secondary.contrast);
  root.style.setProperty('--color-brand-secondary-hover-contrast', tokens.secondary.hoverContrast);
  root.style.setProperty('--color-brand-secondary-active-contrast', tokens.secondary.activeContrast);

  return tokens;
}
