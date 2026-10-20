import { type CSSProperties, useState } from "react";
import { createRoot } from "react-dom/client";
import { EmojiPicker } from "../src";
import type {
  EmojiPickerListCategoryHeaderProps,
  EmojiPickerListEmojiProps,
  EmojiPickerListRowProps,
} from "../src/types";

type Sample = {
  t: number;
  scrollTop: number;
  rows: number;
  blankPx: number;
};

type LongFrame = { start: number; duration: number; blocking: number };

const samples: Sample[] = [];
const longFrames: LongFrame[] = [];
const sentinel = document.createElement("div");
sentinel.style.cssText = "position:fixed;top:0;right:0;height:1px;width:1px";
document.body.append(sentinel);

// ResizeObserver callbacks run after layout and right before paint, so a
// sample taken there is what the frame shows.
let flip = false;
new ResizeObserver(() => {
  samples.push({ t: performance.now(), ...measure() });
}).observe(sentinel);

function tick() {
  flip = !flip;
  sentinel.style.width = flip ? "2px" : "1px";
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as (PerformanceEntry & {
    blockingDuration: number;
  })[]) {
    longFrames.push({
      start: entry.startTime,
      duration: entry.duration,
      blocking: entry.blockingDuration,
    });
  }
}).observe({ type: "long-animation-frame", buffered: false });

function measure(): Omit<Sample, "t"> {
  const viewport = document.querySelector<HTMLElement>("[frimousse-viewport]");
  const rows = viewport?.querySelectorAll<HTMLElement>(
    "[frimousse-row][aria-rowindex]",
  );

  if (!viewport || !rows || rows.length === 0) {
    return { scrollTop: viewport?.scrollTop ?? 0, rows: 0, blankPx: 400 };
  }

  const viewportRect = viewport.getBoundingClientRect();
  const sizer = viewport.querySelector<HTMLElement>("[frimousse-list-sizer]");
  const listBottom = sizer?.getBoundingClientRect().bottom ?? Infinity;
  const headerHeight =
    viewport
      .querySelector<HTMLElement>("[frimousse-category-header]")
      ?.getBoundingClientRect().height ?? 0;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }

  // A category header (sticky or its spacer) may legitimately sit above the first row.
  const blankTop = Math.max(0, top - (viewportRect.top + headerHeight) - 1);
  const blankBottom = Math.max(
    0,
    Math.min(viewportRect.bottom, listBottom) - bottom - 1,
  );

  return {
    scrollTop: viewport.scrollTop,
    rows: rows.length,
    blankPx: Math.round(Math.min(viewportRect.height, blankTop + blankBottom)),
  };
}

function nextFrame() {
  return new Promise<number>((resolve) => requestAnimationFrame(resolve));
}

async function waitFor(predicate: () => boolean, timeout = 10_000) {
  const start = performance.now();

  while (!predicate()) {
    if (performance.now() - start > timeout) {
      throw new Error("Timed out");
    }

    await nextFrame();
  }
}

function frameStats(from: number, to: number) {
  const window = samples.filter((sample) => sample.t >= from && sample.t <= to);
  const deltas = window
    .slice(1)
    .map((sample, index) => sample.t - window[index]!.t)
    .sort((a, b) => a - b);
  const long = longFrames.filter(
    (frame) => frame.start >= from && frame.start <= to,
  );

  return {
    frames: window.length,
    blankFrames: window.filter((sample) => sample.blankPx > 0).length,
    maxBlankPx: Math.max(0, ...window.map((sample) => sample.blankPx)),
    p95FrameMs: Math.round(deltas[Math.floor(deltas.length * 0.95)] ?? 0),
    maxFrameMs: Math.round(deltas.at(-1) ?? 0),
    longFrames: long.length,
    blockingMs: Math.round(
      long.reduce((sum, frame) => sum + frame.blocking, 0),
    ),
  };
}

function Emoji({ emoji, ...props }: EmojiPickerListEmojiProps) {
  const glyph = (emoji as { emoji?: string }).emoji ?? "";

  return (
    <button
      type="button"
      {...props}
      className="emoji"
      style={{ ...props.style, "--emoji": `'${glyph}'` } as CSSProperties}
    >
      {glyph}
    </button>
  );
}

function Row({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="row">
      {children}
    </div>
  );
}

function CategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div {...props} className="header">
      {category.label}
    </div>
  );
}

const components = { Emoji, Row, CategoryHeader };

function App() {
  const [isOpen, setOpen] = useState(false);

  bench.setOpen = setOpen;

  if (!isOpen) {
    return null;
  }

  return (
    <EmojiPicker.Root
      className="picker"
      columns={9}
      emojibaseUrl={`${location.origin}/emojibase`}
    >
      <EmojiPicker.Search />
      <EmojiPicker.Viewport className="viewport">
        <EmojiPicker.Loading className="loading">Loading…</EmojiPicker.Loading>
        <EmojiPicker.List components={components} />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}

const bench = {
  setOpen: (_: boolean) => {},

  async open() {
    await nextFrame();
    const start = performance.now();
    document.getElementById("open")!.click();
    await waitFor(() => {
      const last = samples.at(-1);

      return Boolean(
        last && last.t > start && last.rows > 0 && last.blankPx === 0,
      );
    });
    const ready = samples.findLast((sample) => sample.t > start)!;
    const frames = samples.filter(
      (sample) => sample.t > start && sample.t <= ready.t,
    );

    return {
      readyMs: Math.round(ready.t - start),
      framesToReady: frames.length,
      ...frameStats(start, ready.t),
    };
  },

  async close() {
    bench.setOpen(false);
    await nextFrame();
    await nextFrame();
  },

  async scroll(pxPerFrame: number, frameCount: number) {
    const viewport = document.querySelector<HTMLElement>(
      "[frimousse-viewport]",
    )!;
    viewport.scrollTop = 0;
    await nextFrame();
    await nextFrame();
    const start = performance.now();

    for (let index = 0; index < frameCount; index++) {
      viewport.scrollTop += pxPerFrame;
      await nextFrame();
    }

    await nextFrame();

    return frameStats(start, performance.now());
  },

  stats(from: number, to: number) {
    return frameStats(from, to);
  },

  now() {
    return performance.now();
  },
};

document.getElementById("open")!.addEventListener("click", () => {
  bench.setOpen(true);
});

Object.assign(window, { bench });

createRoot(document.getElementById("root")!).render(<App />);
