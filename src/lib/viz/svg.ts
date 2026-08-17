import type { VizProject } from "./types.js";

export const PLATE = 900;

export type Theme = {
  paper: string;
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  wash: string;
};

export const CONCRETE: Theme = {
  paper: "#f4efe4",
  ink: "#1c1914",
  muted: "#6e675c",
  rule: "#cbbfaa",
  accent: "#9a4e2a",
  wash: "#e7dfd0",
};

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapPlate(inner: string, theme: Theme = CONCRETE): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PLATE}" height="${PLATE}" viewBox="0 0 ${PLATE} ${PLATE}" role="img">
  <rect width="${PLATE}" height="${PLATE}" fill="${theme.paper}"/>
  ${inner}
</svg>`;
}

/** Kept as a no-op so older callers cannot bake titles onto a cover. */
export function titleBlock(
  _project: VizProject,
  _modeLabel: string,
  _variantLabel: string,
  _theme: Theme,
  _x = 36,
  _y = 36
): string {
  return "";
}

/** Kept as a no-op so older callers cannot bake a facts line onto a cover. */
export function footer(_project: VizProject, _extra: string, _theme: Theme): string {
  return "";
}

export function formatBars(bars: number): string {
  return Number.isInteger(bars) ? String(bars) : bars.toFixed(1);
}

/** Kept as a no-op so older callers cannot bake a caption onto a cover. */
export function emptyNotice(_message: string, _theme: Theme, _y = 430): string {
  return "";
}

export function clip(id: string, x: number, y: number, w: number, h: number, inner: string): string {
  return `<defs><clipPath id="${esc(id)}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs>
  <g clip-path="url(#${esc(id)})">${inner}</g>`;
}
