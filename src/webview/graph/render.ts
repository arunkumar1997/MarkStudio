// Canvas2D + DOM-label renderer for the M4.4 Graph View (ADR-0023).
//
// Two surfaces:
//   • `<canvas>` for nodes (circles), edges (lines), and the hover highlight.
//     One layer, no per-frame allocations beyond the path/fill commands the
//     Canvas API already buffers.
//   • An absolutely-positioned `<div>` per node for the label. DOM labels
//     beat canvas text for accessibility (screen readers), VS Code font
//     stack inheritance, sub-pixel anti-aliasing, and zoom-aware hiding
//     without re-measuring.
//
// Theme tokens are read once at construction and cached, then refreshed on
// any `themeData` push from the host (today implicitly via a reload — the
// `--vscode-*` CSS custom properties change reactively, so we re-sample on
// each draw; the cost is a single `getComputedStyle` call per frame).

import type { SimNode } from "./forceSimulation";

export interface ViewTransform {
  // Pan offset in CSS pixels (canvas-space origin).
  tx: number;
  ty: number;
  // Zoom factor. 1 = identity. Clamped by the caller.
  scale: number;
}

export interface RenderEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

export interface ThemeTokens {
  background: string;
  nodeFill: string;
  nodeFillCurrent: string;
  nodeFillHover: string;
  nodeStroke: string;
  edge: string;
  edgeHighlight: string;
  label: string;
}

// Read the live `--vscode-*` tokens off `document.documentElement`. Called
// once per draw — cheap, and reactive to theme changes without any explicit
// host wiring.
export function readThemeTokens(): ThemeTokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string): string => {
    const raw = cs.getPropertyValue(name).trim();
    return raw.length > 0 ? raw : fallback;
  };
  return {
    background: v("--vscode-editor-background", "#1e1e1e"),
    nodeFill: v("--vscode-charts-foreground", "#cccccc"),
    nodeFillCurrent: v("--vscode-charts-blue", "#3794ff"),
    nodeFillHover: v("--vscode-charts-orange", "#d18616"),
    nodeStroke: v("--vscode-contrastBorder", "transparent"),
    edge: v("--vscode-editorIndentGuide-background", "#404040"),
    edgeHighlight: v("--vscode-charts-blue", "#3794ff"),
    label: v("--vscode-foreground", "#cccccc")
  };
}

// Below this scale the labels collide; the design doc (§7) sets ~6 px node
// radius as the cutoff.
const LABEL_HIDE_SCALE = 0.6;

const NODE_RADIUS = 5;
const CURRENT_RADIUS = 8;
const HOVER_RADIUS = 7;

export interface RenderInput {
  readonly nodes: ReadonlyArray<SimNode>;
  readonly edges: ReadonlyArray<RenderEdge>;
  readonly transform: ViewTransform;
  readonly hoverPath: string | null;
  readonly currentPath: string | null;
  readonly nodeMeta: ReadonlyMap<
    string,
    { readonly label: string; readonly isCurrent: boolean }
  >;
  // 1-hop neighbour set of the hovered node. Pre-computed by the caller so
  // the render path stays O(N + E).
  readonly hoverNeighbours: ReadonlySet<string>;
}

// Draw one frame onto `ctx`. Pure-by-input: every value the renderer needs
// is in `input`; the caller owns transform/hover state.
export function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: RenderInput,
  tokens: ThemeTokens
): void {
  const { transform, nodes, edges, hoverPath, hoverNeighbours, nodeMeta } =
    input;

  // Clear in device pixels, then apply the world transform. The caller is
  // responsible for matching the canvas size to the devicePixelRatio.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = tokens.background;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(width / 2 + transform.tx, height / 2 + transform.ty);
  ctx.scale(transform.scale, transform.scale);

  // Edges first (so nodes sit on top).
  const nodePositions = new Map<string, SimNode>();
  for (const n of nodes) {
    nodePositions.set(n.path, n);
  }

  ctx.lineWidth = 1 / transform.scale;
  for (const e of edges) {
    const a = nodePositions.get(e.from);
    const b = nodePositions.get(e.to);
    if (!a || !b) {
      continue;
    }
    const highlight =
      hoverPath !== null && (e.from === hoverPath || e.to === hoverPath);
    ctx.strokeStyle = highlight ? tokens.edgeHighlight : tokens.edge;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Nodes.
  for (const n of nodes) {
    const meta = nodeMeta.get(n.path);
    const isCurrent = meta?.isCurrent === true;
    const isHover = hoverPath === n.path;
    const isNeighbour = hoverNeighbours.has(n.path);
    let fill = tokens.nodeFill;
    let radius = NODE_RADIUS;
    if (isCurrent) {
      fill = tokens.nodeFillCurrent;
      radius = CURRENT_RADIUS;
    }
    if (isHover) {
      fill = tokens.nodeFillHover;
      radius = HOVER_RADIUS;
    } else if (isNeighbour) {
      fill = tokens.nodeFillHover;
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (tokens.nodeStroke !== "transparent") {
      ctx.strokeStyle = tokens.nodeStroke;
      ctx.stroke();
    }
  }
}

// Position the (already-allocated) label elements over their nodes. The
// caller owns the label `<div>` map (one per node path) so element identity
// is stable across frames and the browser can keep its layout/paint caches.
export function placeLabels(
  labels: ReadonlyMap<string, HTMLDivElement>,
  input: RenderInput,
  width: number,
  height: number,
  tokens: ThemeTokens
): void {
  const show = input.transform.scale >= LABEL_HIDE_SCALE;
  for (const [path, el] of labels) {
    const n = input.nodes.find((node) => node.path === path);
    if (!n || !show) {
      el.style.display = "none";
      continue;
    }
    const sx = width / 2 + input.transform.tx + n.x * input.transform.scale;
    const sy = height / 2 + input.transform.ty + n.y * input.transform.scale;
    el.style.display = "block";
    el.style.left = `${Math.round(sx)}px`;
    el.style.top = `${Math.round(sy + NODE_RADIUS + 2)}px`;
    el.style.color = tokens.label;
  }
}

// Resize a backing canvas to match its CSS size scaled by devicePixelRatio.
// Returns the logical width/height the renderer should use. Idempotent.
export function fitCanvasToDevicePixels(canvas: HTMLCanvasElement): {
  readonly width: number;
  readonly height: number;
} {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const targetW = Math.round(cssWidth * dpr);
  const targetH = Math.round(cssHeight * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { width: cssWidth, height: cssHeight };
}

// Find the node under the cursor in screen-space. Returns the path, or null
// when the cursor is over empty canvas. Used for hover + click.
export function pickNode(
  input: RenderInput,
  width: number,
  height: number,
  screenX: number,
  screenY: number
): string | null {
  // Inverse of the draw transform.
  const wx = (screenX - width / 2 - input.transform.tx) / input.transform.scale;
  const wy =
    (screenY - height / 2 - input.transform.ty) / input.transform.scale;
  // 8 px hit radius in world space — generous, but not enough to overlap on
  // typical layouts.
  const hit = (8 / input.transform.scale) ** 2;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const n of input.nodes) {
    const dx = n.x - wx;
    const dy = n.y - wy;
    const dsq = dx * dx + dy * dy;
    if (dsq <= hit && dsq < bestDist) {
      best = n.path;
      bestDist = dsq;
    }
  }
  return best;
}
