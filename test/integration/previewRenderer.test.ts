// Integration tests for the markdown-it preview seam (T-113, ADR-0012).
//
// `createPreviewRenderer` (T-105, ADR-0008) is the other DOM-bound webview
// seam the unit layer could not reach. Its headline guarantee is **incremental
// patching**: an edit must mutate only the changed blocks' DOM nodes and leave
// every unchanged block's `Element` reference untouched, so VS Code's webview
// repaint cost is bounded by the size of the edit, not the document. These
// tests assert that node identity directly, plus the source-line mapping that
// scroll sync (T-2.1) depends on.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  createPreviewRenderer,
  type PreviewRenderer
} from "../../src/webview/preview/PreviewRenderer";
import type { MarkStudioConfig } from "../../src/messaging/messages";
import { createContainer, removeContainer } from "./_setup/dom";

const CONFIG: MarkStudioConfig = {
  lineNumbers: true,
  wordWrap: true,
  math: true,
  mermaid: true,
  callouts: true,
  wikiLinks: true,
  footnotes: true,
  taskLists: true,
  tables: true,
  strikethrough: true
};

// The renderer debounces updates by 40 ms; wait past that to read the result.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

describe("createPreviewRenderer — incremental DOM patching", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer;

  beforeEach(() => {
    container = createContainer();
    renderer = createPreviewRenderer(container, CONFIG);
  });

  afterEach(() => {
    renderer.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders top-level blocks into the persistent preview root", async () => {
    renderer.update("# Title\n\nA paragraph.");
    await flush();

    const children = Array.from(root().children);
    assert.equal(children.length, 2);
    assert.equal(children[0].tagName, "H1");
    assert.equal(children[0].textContent, "Title");
    assert.equal(children[1].tagName, "P");
    assert.equal(children[1].textContent, "A paragraph.");
  });

  it("preserves unchanged block nodes and replaces only the edited block", async () => {
    renderer.update("# A\n\nB\n\nC");
    await flush();

    const before = Array.from(root().children);
    assert.equal(before.length, 3);

    // Edit only the middle block.
    renderer.update("# A\n\nB changed\n\nC");
    await flush();

    const after = Array.from(root().children);
    assert.equal(after.length, 3);

    // Unchanged blocks keep their exact DOM node (identity, not just markup).
    assert.equal(after[0], before[0], "heading node should be reused");
    assert.equal(
      after[2],
      before[2],
      "trailing paragraph node should be reused"
    );
    // The edited block is a new node with the new text.
    assert.notEqual(
      after[1],
      before[1],
      "edited paragraph node should be replaced"
    );
    assert.equal(after[1].textContent, "B changed");
    // The reused heading node still carries its original text.
    assert.equal(after[0].textContent, "A");
  });

  it("maps each rendered block to its 1-based source line", async () => {
    renderer.update("# Heading\n\nFirst paragraph.\n\nSecond paragraph.");
    await flush();

    const blocks = renderer.getBlocks();
    assert.equal(blocks.length, 3);
    assert.deepEqual(
      blocks.map((b) => b.startLine),
      [1, 3, 5]
    );
    assert.equal(blocks[0].node.tagName, "H1");
  });

  it("coalesces rapid updates and renders only the latest text", async () => {
    renderer.update("first");
    renderer.update("second");
    renderer.update("third");
    await flush();

    const children = Array.from(root().children);
    assert.equal(children.length, 1);
    assert.equal(children[0].textContent, "third");
  });
});

describe("createPreviewRenderer — math rendering (T-3.1)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders inline and block math with KaTeX when math is enabled", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("Inline $a^2 + b^2 = c^2$ math.\n\n$$\\int_0^1 x\\,dx$$");
    await flush();

    assert.ok(
      root().querySelector(".katex"),
      "KaTeX output should be present when math is on"
    );
  });

  it("leaves math delimiters as text when math is disabled", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      math: false
    });
    renderer.update("Inline $a^2 + b^2 = c^2$ math.");
    await flush();

    assert.equal(
      root().querySelector(".katex"),
      null,
      "no KaTeX output should render when math is off"
    );
    assert.match(root().textContent ?? "", /\$a\^2 \+ b\^2 = c\^2\$/);
  });

  it("re-renders live when the math setting is toggled via setConfig", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, math: false });
    renderer.update("$a^2$");
    await flush();
    assert.equal(root().querySelector(".katex"), null);

    renderer.setConfig({ ...CONFIG, math: true });
    await flush();
    assert.ok(
      root().querySelector(".katex"),
      "toggling math on should render KaTeX without a new update"
    );
  });
});

describe("createPreviewRenderer — mermaid rendering (T-3.2)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  // The Mermaid library is lazy-loaded by injecting a <script> that is not
  // available under jsdom, so these tests assert the markdown-it seam only:
  // the placeholder container the async pass later fills, and graceful
  // degradation to a plain code block when the feature is off.

  it("emits a mermaid placeholder container carrying the diagram source", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("```mermaid\ngraph TD; A-->B;\n```");
    await flush();

    const block = root().querySelector(".markstudio-mermaid");
    assert.ok(
      block,
      "a mermaid container should be emitted when mermaid is on"
    );
    assert.match(block?.textContent ?? "", /graph TD; A-->B;/);
    assert.equal(
      root().querySelector("pre"),
      null,
      "a mermaid block should not render as a plain code block when on"
    );
  });

  it("renders a plain code block when mermaid is disabled", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, mermaid: false });
    renderer.update("```mermaid\ngraph TD; A-->B;\n```");
    await flush();

    assert.equal(
      root().querySelector(".markstudio-mermaid"),
      null,
      "no mermaid container should render when mermaid is off"
    );
    const pre = root().querySelector("pre");
    assert.ok(pre, "a mermaid block should fall back to a code block when off");
    assert.match(pre?.textContent ?? "", /graph TD; A-->B;/);
  });

  it("leaves non-mermaid code fences untouched when mermaid is enabled", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("```js\nconst a = 1;\n```");
    await flush();

    assert.equal(
      root().querySelector(".markstudio-mermaid"),
      null,
      "a non-mermaid fence should not become a mermaid container"
    );
    assert.ok(
      root().querySelector("pre"),
      "a non-mermaid fence should render as a normal code block"
    );
  });

  it("toggles a mermaid block to a placeholder live via setConfig", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, mermaid: false });
    renderer.update("```mermaid\ngraph TD; A-->B;\n```");
    await flush();
    assert.ok(root().querySelector("pre"));
    assert.equal(root().querySelector(".markstudio-mermaid"), null);

    renderer.setConfig({ ...CONFIG, mermaid: true });
    await flush();
    assert.ok(
      root().querySelector(".markstudio-mermaid"),
      "toggling mermaid on should swap the code block for a diagram container"
    );
  });
});

describe("createPreviewRenderer — callout rendering (T-3.3)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders a styled callout box with an icon + title when callouts are on", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("> [!NOTE]\n> Body text.");
    await flush();

    const callout = root().querySelector(".markstudio-callout");
    assert.ok(callout, "a callout container should be emitted when on");
    assert.equal(
      callout?.tagName,
      "DIV",
      "the callout should be a div, not a blockquote"
    );
    assert.ok(
      callout?.classList.contains("markstudio-callout-note"),
      "the per-type modifier class should be applied"
    );
    assert.ok(
      callout?.querySelector(".markstudio-callout-title .codicon"),
      "the title should carry a codicon icon"
    );
    assert.match(
      callout?.querySelector(".markstudio-callout-title-text")?.textContent ??
        "",
      /Note/
    );
    assert.match(callout?.textContent ?? "", /Body text\./);
    assert.equal(
      root().querySelector("blockquote"),
      null,
      "a callout should not also render as a blockquote"
    );
  });

  it("uses a custom title when one follows the marker", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("> [!WARNING] Heads up\n> Careful now.");
    await flush();

    const title = root().querySelector(".markstudio-callout-title-text");
    assert.match(title?.textContent ?? "", /Heads up/);
    assert.ok(
      root()
        .querySelector(".markstudio-callout")
        ?.classList.contains("markstudio-callout-warning")
    );
  });

  it("falls back to a plain blockquote when callouts are disabled", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, callouts: false });
    renderer.update("> [!NOTE]\n> Body text.");
    await flush();

    assert.equal(
      root().querySelector(".markstudio-callout"),
      null,
      "no callout container should render when callouts are off"
    );
    const quote = root().querySelector("blockquote");
    assert.ok(quote, "a callout block should fall back to a blockquote");
    assert.match(quote?.textContent ?? "", /\[!NOTE\]/);
  });

  it("leaves an ordinary blockquote untouched when callouts are enabled", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("> Just a quote.");
    await flush();

    assert.equal(
      root().querySelector(".markstudio-callout"),
      null,
      "a normal blockquote should not become a callout"
    );
    const quote = root().querySelector("blockquote");
    assert.ok(quote, "an ordinary blockquote should still render");
    assert.match(quote?.textContent ?? "", /Just a quote\./);
  });

  it("toggles a blockquote to a callout live via setConfig", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, callouts: false });
    renderer.update("> [!TIP]\n> Useful hint.");
    await flush();
    assert.ok(root().querySelector("blockquote"));
    assert.equal(root().querySelector(".markstudio-callout"), null);

    renderer.setConfig({ ...CONFIG, callouts: true });
    await flush();
    assert.ok(
      root().querySelector(".markstudio-callout-tip"),
      "toggling callouts on should swap the blockquote for a callout box"
    );
  });
});

describe("createPreviewRenderer — wiki-link rendering (T-3.4)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders a [[note]] as a styled wiki link carrying its target", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("See [[My Note]] for details.");
    await flush();

    const link = root().querySelector("a.markstudio-wikilink");
    assert.ok(link, "a wiki-link anchor should be emitted when on");
    assert.equal(link?.textContent, "My Note");
    assert.equal(link?.getAttribute("data-wikilink-target"), "My Note");
    assert.equal(
      link?.getAttribute("data-wikilink-heading"),
      null,
      "no heading attribute when none is given"
    );
  });

  it("uses the alias for the display text in [[target|alias]]", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("Jump to [[home|the home page]].");
    await flush();

    const link = root().querySelector("a.markstudio-wikilink");
    assert.equal(link?.textContent, "the home page");
    assert.equal(link?.getAttribute("data-wikilink-target"), "home");
  });

  it("captures the heading anchor in [[note#heading]]", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("See [[Guide#Setup]].");
    await flush();

    const link = root().querySelector("a.markstudio-wikilink");
    assert.equal(link?.getAttribute("data-wikilink-target"), "Guide");
    assert.equal(link?.getAttribute("data-wikilink-heading"), "Setup");
    assert.equal(link?.textContent, "Guide#Setup");
  });

  it("leaves [[note]] as literal text when wiki links are disabled", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      wikiLinks: false
    });
    renderer.update("See [[My Note]].");
    await flush();

    assert.equal(
      root().querySelector("a.markstudio-wikilink"),
      null,
      "no wiki-link anchor should render when wiki links are off"
    );
    assert.match(root().textContent ?? "", /\[\[My Note\]\]/);
  });

  it("toggles a [[note]] to a wiki link live via setConfig", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      wikiLinks: false
    });
    renderer.update("See [[My Note]].");
    await flush();
    assert.equal(root().querySelector("a.markstudio-wikilink"), null);

    renderer.setConfig({ ...CONFIG, wikiLinks: true });
    await flush();
    assert.ok(
      root().querySelector("a.markstudio-wikilink"),
      "toggling wiki links on should render the [[…]] as a link"
    );
  });

  it("does not treat an ordinary [link](url) as a wiki link", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("An [ordinary](https://example.com) link.");
    await flush();

    assert.equal(
      root().querySelector("a.markstudio-wikilink"),
      null,
      "a normal markdown link should not become a wiki link"
    );
    const link = root().querySelector("a");
    assert.equal(link?.getAttribute("href"), "https://example.com");
  });
});

describe("createPreviewRenderer — footnote rendering (T-3.5)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders a footnote reference and definition when footnotes are on", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("Here is a note.[^1]\n\n[^1]: The footnote text.");
    await flush();

    const ref = root().querySelector(".footnote-ref");
    assert.ok(
      ref,
      "a footnote reference superscript should be emitted when on"
    );
    const section = root().querySelector("section.footnotes");
    assert.ok(section, "a footnotes section should be emitted when on");
    assert.match(section?.textContent ?? "", /The footnote text\./);
    assert.ok(
      root().querySelector(".footnote-backref"),
      "a back-reference link should be emitted in the footnotes section"
    );
  });

  it("leaves [^1] as literal text when footnotes are disabled", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      footnotes: false
    });
    renderer.update("Here is a note.[^1]\n\n[^1]: The footnote text.");
    await flush();

    assert.equal(
      root().querySelector(".footnote-ref"),
      null,
      "no footnote reference should render when footnotes are off"
    );
    assert.equal(
      root().querySelector("section.footnotes"),
      null,
      "no footnotes section should render when footnotes are off"
    );
    assert.match(root().textContent ?? "", /\[\^1\]/);
  });

  it("re-renders live when the footnotes setting is toggled via setConfig", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      footnotes: false
    });
    renderer.update("A note.[^1]\n\n[^1]: Text.");
    await flush();
    assert.equal(root().querySelector(".footnote-ref"), null);

    renderer.setConfig({ ...CONFIG, footnotes: true });
    await flush();
    assert.ok(
      root().querySelector(".footnote-ref"),
      "toggling footnotes on should render the reference without a new update"
    );
  });
});

describe("createPreviewRenderer — task-list rendering (T-3.5)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders disabled checkboxes for task-list items when task lists are on", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("- [ ] Todo\n- [x] Done");
    await flush();

    const checkboxes = root().querySelectorAll(
      "input.markstudio-task-list-checkbox"
    );
    assert.equal(checkboxes.length, 2, "both items should get a checkbox");
    const [first, second] = Array.from(checkboxes) as HTMLInputElement[];
    assert.equal(first.disabled, true, "checkboxes should be read-only");
    assert.equal(first.checked, false, "[ ] should be unchecked");
    assert.equal(second.checked, true, "[x] should be checked");
    assert.ok(
      root().querySelector("li.markstudio-task-list-item"),
      "the list item should carry the task-list-item class"
    );
    assert.match(root().textContent ?? "", /Todo/);
  });

  it("leaves [ ] as literal text when task lists are disabled", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      taskLists: false
    });
    renderer.update("- [ ] Todo\n- [x] Done");
    await flush();

    assert.equal(
      root().querySelector("input.markstudio-task-list-checkbox"),
      null,
      "no checkbox should render when task lists are off"
    );
    assert.match(root().textContent ?? "", /\[ \] Todo/);
  });

  it("toggles task-list checkboxes live via setConfig", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      taskLists: false
    });
    renderer.update("- [ ] Todo");
    await flush();
    assert.equal(
      root().querySelector("input.markstudio-task-list-checkbox"),
      null
    );

    renderer.setConfig({ ...CONFIG, taskLists: true });
    await flush();
    assert.ok(
      root().querySelector("input.markstudio-task-list-checkbox"),
      "toggling task lists on should render a checkbox"
    );
  });

  it("leaves ordinary list items untouched when task lists are enabled", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("- A plain item\n- Another item");
    await flush();

    assert.equal(
      root().querySelector("input.markstudio-task-list-checkbox"),
      null,
      "a plain bullet should not get a checkbox"
    );
    assert.equal(
      root().querySelector("li.markstudio-task-list-item"),
      null,
      "a plain list item should not be flagged as a task item"
    );
  });
});

describe("createPreviewRenderer — table rendering (T-3.5)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  const TABLE = "| A | B |\n| - | - |\n| 1 | 2 |";

  it("renders a GFM pipe table when tables are on", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update(TABLE);
    await flush();

    const table = root().querySelector("table");
    assert.ok(table, "a table element should be emitted when on");
    assert.equal(table?.querySelectorAll("th").length, 2);
    assert.equal(table?.querySelectorAll("td").length, 2);
  });

  it("renders table source as plain text when tables are disabled", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, tables: false });
    renderer.update(TABLE);
    await flush();

    assert.equal(
      root().querySelector("table"),
      null,
      "no table element should render when tables are off"
    );
    assert.match(root().textContent ?? "", /\| A \| B \|/);
  });

  it("toggles a table live via setConfig", async () => {
    renderer = createPreviewRenderer(container, { ...CONFIG, tables: false });
    renderer.update(TABLE);
    await flush();
    assert.equal(root().querySelector("table"), null);

    renderer.setConfig({ ...CONFIG, tables: true });
    await flush();
    assert.ok(
      root().querySelector("table"),
      "toggling tables on should render the table"
    );
  });
});

describe("createPreviewRenderer — strikethrough rendering (T-3.5)", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
  });

  afterEach(() => {
    renderer?.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders ~~text~~ as struck-through text when strikethrough is on", async () => {
    renderer = createPreviewRenderer(container, CONFIG);
    renderer.update("This is ~~gone~~ now.");
    await flush();

    const struck = root().querySelector("s, del");
    assert.ok(struck, "a strikethrough element should be emitted when on");
    assert.equal(struck?.textContent, "gone");
  });

  it("leaves ~~ markers as literal text when strikethrough is disabled", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      strikethrough: false
    });
    renderer.update("This is ~~gone~~ now.");
    await flush();

    assert.equal(
      root().querySelector("s, del"),
      null,
      "no strikethrough element should render when off"
    );
    assert.match(root().textContent ?? "", /~~gone~~/);
  });

  it("toggles strikethrough live via setConfig", async () => {
    renderer = createPreviewRenderer(container, {
      ...CONFIG,
      strikethrough: false
    });
    renderer.update("~~gone~~");
    await flush();
    assert.equal(root().querySelector("s, del"), null);

    renderer.setConfig({ ...CONFIG, strikethrough: true });
    await flush();
    assert.ok(
      root().querySelector("s, del"),
      "toggling strikethrough on should render struck-through text"
    );
  });
});
