/**
 * Theme token names for reference and optional JS usage (e.g. tooling, docs).
 *
 * To change colors or fonts globally: edit src/styles/theme.css.
 * Tailwind maps these tokens in tailwind.config.ts; use classes like bg-primary, text-foreground, font-sans.
 */

export const colorTokens = [
  "background",
  "surface",
  "surface-muted",
  "foreground",
  "muted-foreground",
  "border",
  "primary",
  "primary-hover",
  "primary-muted",
  "primary-foreground",
  "success",
  "success-muted",
  "warning",
  "warning-muted",
  "danger",
  "danger-muted",
  "ring-offset",
] as const;

export const fontTokens = ["sans", "mono"] as const;

export type ColorToken = (typeof colorTokens)[number];
export type FontToken = (typeof fontTokens)[number];
