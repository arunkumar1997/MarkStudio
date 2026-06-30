// Pure graph model for the M4.4 graph view. Takes the workspace's note paths,
// the resolved (from→to) wiki-link edges, and the currently active note's
// path; returns a deterministic `{ nodes, edges }` snapshot the webview can
// render and re-merge by `path` on live updates.
//
// This module imports nothing from `vscode` or the DOM so it is unit-testable
// without booting VS Code; the `LinkIndexService` does the I/O upstream.
//
// Identity is the same stable POSIX-style path string used by `linkIndex.ts`:
// `getNotePaths()` provides the universe (so isolated notes appear as nodes);
// `getEdges()` provides every edge already deduped per ordered (from, to) pair
// with a `weight`. `buildGraph` defensively drops any edge whose endpoints are
// not in the path universe (an edge a not-yet-observed file produced should
// not appear in the visible graph), and excludes self-edges (the index also
// does this; defence-in-depth here).

// A node in the rendered graph.
export interface GraphNode {
  // Stable workspace-relative POSIX path; same identity the link index uses.
  readonly path: string;
  // Display label — the basename with a trailing `.md` / `.markdown` stripped.
  readonly label: string;
  // Whether this is the currently active MarkStudio editor's note. The webview
  // draws this node larger and in `--vscode-textLink-foreground`.
  readonly isCurrent: boolean;
}

// A directed edge in the rendered graph. `from` and `to` are `GraphNode.path`s
// known to be present in `nodes`. `weight` is ≥ 1; multi-links are collapsed,
// so `A → B` appears at most once per direction.
export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

export interface Graph {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
}

// Inputs are kept structural so callers don't need to import service types.
export interface BuildGraphEdgeInput {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

const MD_EXTENSION = /\.(md|markdown)$/i;

// Build a `Graph` from the workspace's note paths and the link index's edges.
// Output ordering is deterministic:
//   * `nodes` is sorted ascending by path so snapshot tests are stable.
//   * `edges` preserves the input order, then a final sort by
//     `(from, to)` so equal inputs produce equal outputs (the link index
//     already yields a stable order, but a fresh sort costs nothing and
//     guards against future caller-side reordering).
//
// Defensive drops:
//   * An edge whose `from` or `to` is not in `paths` is dropped — the visible
//     graph should not reference a node it cannot show.
//   * A self-edge (`from === to`, case-insensitively) is dropped.
//   * A non-positive `weight` is treated as 1 so a future caller cannot send
//     a degenerate edge through.
export function buildGraph(
  paths: ReadonlyArray<string>,
  edges: ReadonlyArray<BuildGraphEdgeInput>,
  currentPath: string | null
): Graph {
  const sortedPaths = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const knownByLower = new Set<string>();
  for (const path of sortedPaths) {
    knownByLower.add(path.toLowerCase());
  }

  const currentLower = currentPath === null ? null : currentPath.toLowerCase();

  const nodes: GraphNode[] = sortedPaths.map((path) => ({
    path,
    label: labelOf(path),
    isCurrent: currentLower !== null && path.toLowerCase() === currentLower
  }));

  const seenEdges = new Set<string>();
  const validEdges: GraphEdge[] = [];
  for (const edge of edges) {
    const fromLower = edge.from.toLowerCase();
    const toLower = edge.to.toLowerCase();
    if (fromLower === toLower) {
      continue;
    }
    if (!knownByLower.has(fromLower) || !knownByLower.has(toLower)) {
      continue;
    }
    const key = `${fromLower}\u0000${toLower}`;
    if (seenEdges.has(key)) {
      continue;
    }
    seenEdges.add(key);
    validEdges.push({
      from: edge.from,
      to: edge.to,
      weight: edge.weight > 0 ? edge.weight : 1
    });
  }
  validEdges.sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return 0;
  });

  return { nodes, edges: validEdges };
}

// Display label for a node: basename minus a `.md` / `.markdown` extension.
// `Guide.md` → `Guide`, `docs/Guide.markdown` → `Guide`. An empty path keeps
// itself as the label so a degenerate input still renders something.
function labelOf(path: string): string {
  if (path.length === 0) {
    return path;
  }
  const slash = path.lastIndexOf("/");
  const segment = slash === -1 ? path : path.slice(slash + 1);
  return segment.replace(MD_EXTENSION, "");
}
