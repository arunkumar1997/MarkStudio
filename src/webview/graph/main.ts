// Entry point for the M4.4 Graph View webview (`dist/graph.js`, ADR-0023).
//
// Boot sequence:
//   1. Acquire the VS Code webview API.
//   2. Build the DOM scaffold (canvas + label layer + empty-state).
//   3. Post `ready` so the host's `GraphService` knows to send `graphData`.
//   4. On `graphData`, merge by path (keep positions for known nodes,
//      seed new ones, drop removed ones), re-warm the simulation, kick
//      the RAF loop.
//   5. RAF loop steps the simulation, renders, places labels, and stops
//      itself once kinetic energy falls below ε.
//
// All host-bound payloads are typed against `WebviewToHostMessage` so the
// editor/host contract stays single-sourced in `src/messaging/messages.ts`.

import type {
  GraphDataMessage,
  HostToWebviewMessage,
  WebviewToHostMessage
} from "../../messaging/messages";
import {
  DEFAULT_OPTIONS,
  seedPosition,
  step,
  type SimEdge,
  type SimNode
} from "./forceSimulation";
import {
  draw,
  fitCanvasToDevicePixels,
  pickNode,
  placeLabels,
  readThemeTokens,
  type RenderInput,
  type ViewTransform
} from "./render";

interface VsCodeApi {
  postMessage(message: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// Below this kinetic energy the eye cannot see motion; the RAF loop stops.
const SIM_EPSILON = 0.05;

// Number of "warm-up" steps to take in a tight loop right after a graphData
// merge, so newly-spawned nodes find a basin before the RAF loop starts.
const WARMUP_STEPS = 60;

// Zoom clamps. The design doc (§7) leaves these open; chosen here as a
// reasonable default that fits 1k-node graphs and a single-node close-up.
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

interface NodeMeta {
  readonly label: string;
  isCurrent: boolean;
}

class GraphView {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly labelLayer: HTMLDivElement;
  private readonly emptyState: HTMLDivElement;

  // Sim state.
  private nodes: SimNode[] = [];
  private edges: SimEdge[] = [];
  private nodeMeta = new Map<string, NodeMeta>();
  private currentPath: string | null = null;
  private readonly labelElements = new Map<string, HTMLDivElement>();

  // View state.
  private transform: ViewTransform = { tx: 0, ty: 0, scale: 1 };

  // Interaction state.
  private hoverPath: string | null = null;
  private hoverNeighbours: ReadonlySet<string> = new Set();
  private dragPath: string | null = null;
  private panning = false;
  private lastPointer: { x: number; y: number } | null = null;

  // RAF state. We don't store the handle: the loop self-stops when the
  // simulation settles or no interaction is in flight, and a new `kick()`
  // simply re-enters when `running` flips back to true.
  private running = false;

  public constructor(root: HTMLElement) {
    this.root = root;
    this.root.setAttribute("aria-busy", "false");

    this.canvas = document.createElement("canvas");
    this.canvas.className = "graph-canvas";
    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "graph-label-layer";
    this.emptyState = document.createElement("div");
    this.emptyState.className = "graph-empty-state";
    this.emptyState.textContent = "No notes to graph yet.";
    this.emptyState.hidden = true;

    this.root.append(this.canvas, this.labelLayer, this.emptyState);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }
    this.ctx = ctx;

    this.installStyles();
    this.installPointerHandlers();
    this.installResizeHandler();

    window.addEventListener("message", (ev) =>
      this.onHostMessage(ev.data as unknown)
    );
    this.post({ type: "ready" });
  }

  // ─── DOM scaffold ──────────────────────────────────────────────────────

  private installStyles(): void {
    const css = `
      html, body, #markstudio-graph-root {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: var(--vscode-editor-background);
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }
      #markstudio-graph-root { position: relative; }
      .graph-canvas {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        display: block;
        cursor: grab;
      }
      .graph-canvas.is-dragging { cursor: grabbing; }
      .graph-canvas.is-hover-node { cursor: pointer; }
      .graph-label-layer {
        position: absolute; inset: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .graph-label {
        position: absolute;
        transform: translate(-50%, 0);
        white-space: nowrap;
        padding: 0 2px;
        background: transparent;
        font-size: calc(var(--vscode-font-size) - 1px);
        line-height: 1.2;
        user-select: none;
      }
      .graph-empty-state {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--vscode-descriptionForeground);
        pointer-events: none;
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
  }

  // ─── Host messages ─────────────────────────────────────────────────────

  private onHostMessage(raw: unknown): void {
    if (!raw || typeof raw !== "object") {
      return;
    }
    const msg = raw as HostToWebviewMessage;
    if (msg.type === "graphData") {
      this.applyGraphData(msg);
    }
    // Other host→webview messages (init, layout, etc.) are addressed to the
    // editor webview and do not arrive at the graph panel; ignored if any do.
  }

  private applyGraphData(msg: GraphDataMessage): void {
    const known = new Map<string, SimNode>();
    for (const n of this.nodes) {
      known.set(n.path, n);
    }
    const next: SimNode[] = [];
    const nextMeta = new Map<string, NodeMeta>();
    for (const incoming of msg.nodes) {
      nextMeta.set(incoming.path, {
        label: incoming.label,
        isCurrent: incoming.isCurrent
      });
      const existing = known.get(incoming.path);
      if (existing) {
        next.push(existing);
      } else {
        const seed = seedPosition(incoming.path, 120);
        next.push({
          path: incoming.path,
          x: seed.x,
          y: seed.y,
          vx: 0,
          vy: 0,
          fixed: false
        });
      }
    }
    this.nodes = next;
    this.nodeMeta = nextMeta;
    this.edges = msg.edges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: Math.max(1, e.weight)
    }));
    this.currentPath = msg.currentPath;

    // Reconcile label elements with the new node set.
    for (const [path, el] of this.labelElements) {
      if (!nextMeta.has(path)) {
        el.remove();
        this.labelElements.delete(path);
      }
    }
    for (const n of this.nodes) {
      let el = this.labelElements.get(n.path);
      if (!el) {
        el = document.createElement("div");
        el.className = "graph-label";
        this.labelLayer.append(el);
        this.labelElements.set(n.path, el);
      }
      const meta = nextMeta.get(n.path);
      el.textContent = meta?.label ?? n.path;
    }

    // Empty-state vs canvas.
    this.emptyState.hidden = this.nodes.length > 0;

    // Warm up so the new layout settles before the first paint.
    this.warmUp();
    this.start();
  }

  // ─── Simulation + render loop ──────────────────────────────────────────

  private warmUp(): void {
    for (let i = 0; i < WARMUP_STEPS; i++) {
      step(this.nodes, this.edges, DEFAULT_OPTIONS);
    }
  }

  private start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    const tick = (): void => {
      if (!this.running) {
        return;
      }
      const ke = step(this.nodes, this.edges, DEFAULT_OPTIONS);
      this.render();
      if (ke < SIM_EPSILON && this.dragPath === null) {
        this.running = false;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private kick(): void {
    if (!this.running) {
      this.start();
    }
  }

  private render(): void {
    const size = fitCanvasToDevicePixels(this.canvas);
    const tokens = readThemeTokens();
    const input: RenderInput = {
      nodes: this.nodes,
      edges: this.edges,
      transform: this.transform,
      hoverPath: this.hoverPath,
      currentPath: this.currentPath,
      nodeMeta: this.nodeMeta,
      hoverNeighbours: this.hoverNeighbours
    };
    draw(this.ctx, size.width, size.height, input, tokens);
    placeLabels(this.labelElements, input, size.width, size.height, tokens);
  }

  // ─── Pointer + keyboard ────────────────────────────────────────────────

  private installPointerHandlers(): void {
    const canvas = this.canvas;

    canvas.addEventListener("pointerdown", (ev) => {
      canvas.setPointerCapture(ev.pointerId);
      const size = { width: canvas.clientWidth, height: canvas.clientHeight };
      const path = pickNode(
        this.snapshotInput(),
        size.width,
        size.height,
        ev.offsetX,
        ev.offsetY
      );
      this.lastPointer = { x: ev.clientX, y: ev.clientY };
      if (path !== null) {
        this.dragPath = path;
        const n = this.nodes.find((node) => node.path === path);
        if (n) {
          n.fixed = true;
        }
        canvas.classList.add("is-dragging");
      } else {
        this.panning = true;
        canvas.classList.add("is-dragging");
      }
    });

    canvas.addEventListener("pointermove", (ev) => {
      const size = { width: canvas.clientWidth, height: canvas.clientHeight };
      if (this.dragPath !== null) {
        const n = this.nodes.find((node) => node.path === this.dragPath);
        if (n) {
          // Move the pinned node directly under the cursor in world space.
          n.x =
            (ev.offsetX - size.width / 2 - this.transform.tx) /
            this.transform.scale;
          n.y =
            (ev.offsetY - size.height / 2 - this.transform.ty) /
            this.transform.scale;
          n.vx = 0;
          n.vy = 0;
        }
        this.kick();
        return;
      }
      if (this.panning && this.lastPointer) {
        this.transform.tx += ev.clientX - this.lastPointer.x;
        this.transform.ty += ev.clientY - this.lastPointer.y;
        this.lastPointer = { x: ev.clientX, y: ev.clientY };
        this.render();
        return;
      }
      // Hover.
      const path = pickNode(
        this.snapshotInput(),
        size.width,
        size.height,
        ev.offsetX,
        ev.offsetY
      );
      if (path !== this.hoverPath) {
        this.hoverPath = path;
        this.hoverNeighbours = this.computeNeighbours(path);
        canvas.classList.toggle("is-hover-node", path !== null);
        this.render();
      }
    });

    canvas.addEventListener("pointerup", (ev) => {
      const size = { width: canvas.clientWidth, height: canvas.clientHeight };
      const wasDragging = this.dragPath;
      // Click vs drag: if we never really moved, treat as click-to-open.
      if (
        wasDragging !== null &&
        this.lastPointer &&
        Math.abs(ev.clientX - this.lastPointer.x) < 4 &&
        Math.abs(ev.clientY - this.lastPointer.y) < 4
      ) {
        this.post({ type: "openGraphNode", path: wasDragging });
      }
      if (wasDragging) {
        const n = this.nodes.find((node) => node.path === wasDragging);
        if (n) {
          n.fixed = false;
        }
        this.kick();
      }
      this.dragPath = null;
      this.panning = false;
      this.lastPointer = null;
      canvas.classList.remove("is-dragging");
      // Silence unused-var lint for `size` in this branch.
      void size;
    });

    canvas.addEventListener("pointercancel", () => {
      if (this.dragPath) {
        const n = this.nodes.find((node) => node.path === this.dragPath);
        if (n) {
          n.fixed = false;
        }
      }
      this.dragPath = null;
      this.panning = false;
      this.lastPointer = null;
      canvas.classList.remove("is-dragging");
    });

    canvas.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        const size = { width: canvas.clientWidth, height: canvas.clientHeight };
        // Zoom around the cursor.
        const factor = Math.exp(-ev.deltaY * 0.001);
        const newScale = clamp(
          this.transform.scale * factor,
          MIN_SCALE,
          MAX_SCALE
        );
        const realFactor = newScale / this.transform.scale;
        const cx = ev.offsetX - size.width / 2;
        const cy = ev.offsetY - size.height / 2;
        this.transform.tx = cx - (cx - this.transform.tx) * realFactor;
        this.transform.ty = cy - (cy - this.transform.ty) * realFactor;
        this.transform.scale = newScale;
        this.render();
      },
      { passive: false }
    );

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        this.transform = { tx: 0, ty: 0, scale: 1 };
        this.render();
      }
    });
  }

  private computeNeighbours(path: string | null): ReadonlySet<string> {
    if (path === null) {
      return new Set();
    }
    const set = new Set<string>();
    for (const e of this.edges) {
      if (e.from === path) set.add(e.to);
      else if (e.to === path) set.add(e.from);
    }
    return set;
  }

  private snapshotInput(): RenderInput {
    return {
      nodes: this.nodes,
      edges: this.edges,
      transform: this.transform,
      hoverPath: this.hoverPath,
      currentPath: this.currentPath,
      nodeMeta: this.nodeMeta,
      hoverNeighbours: this.hoverNeighbours
    };
  }

  private installResizeHandler(): void {
    const ro = new ResizeObserver(() => this.render());
    ro.observe(this.canvas);
  }

  private post(message: WebviewToHostMessage): void {
    vscode.postMessage(message);
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

const root = document.getElementById("markstudio-graph-root");
if (root) {
  new GraphView(root);
}
