// Builds the bench page against a frimousse `src` and measures it in Chromium.
//
//   node bench/run.mjs [--variant label=<path to src> ...] [--runs 5] [--cpu 4] [--out dir]
//
// Variants run interleaved (A, B, A, B, ...) so machine noise hits each side alike.
// Emojibase requests are served from node_modules with a simulated CDN latency.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { build } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    variant: {
      type: "string",
      multiple: true,
      default: [`current=${resolve(root, "../src")}`],
    },
    runs: { type: "string", default: "5" },
    cpu: { type: "string", default: "4" },
    out: { type: "string", default: join(root, "results") },
    latency: { type: "string", default: "120" },
  },
});
const runs = Number(values.runs);
const latency = Number(values.latency);
const variants = values.variant.map((variant) => {
  const [label, src] = variant.split("=");

  return { label, src: resolve(src), outDir: join(root, "dist", label) };
});

for (const { src, outDir } of variants) {
  await build({
    root,
    base: "./",
    logLevel: "warn",
    resolve: { alias: [{ find: /^\.\.\/src/, replacement: src }] },
    esbuild: { jsx: "automatic" },
    build: {
      outDir,
      emptyOutDir: true,
      minify: process.env.BENCH_MINIFY !== "0",
    },
  });
}

const emojibase = join(root, "../node_modules/emojibase-data");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  const [, label, ...rest] = request.url.split("?")[0].split("/");

  if (label === "emojibase") {
    const [locale, file] = rest;
    await sleep(latency);
    response.writeHead(200, {
      "content-type": "application/json",
      etag: `"${locale}-${file}"`,
    });
    response.end(
      request.method === "HEAD"
        ? ""
        : await readFile(join(emojibase, locale, file)),
    );

    return;
  }

  const path = rest.join("/") || "index.html";
  const variant = variants.find((variant) => variant.label === label);

  try {
    const body = await readFile(join(variant.outDir, path));
    response.writeHead(200, {
      "content-type": types[extname(path)] ?? "text/plain",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, done));
const origin = `http://localhost:${server.address().port}`;

async function newPage(context, url) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", {
    rate: Number(values.cpu),
  });
  await cdp.send("Performance.enable");
  await page.goto(url);
  await page.waitForFunction(() => "bench" in window);
  page.cdp = cdp;

  return page;
}

const CPU_METRICS = [
  "ScriptDuration",
  "TaskDuration",
  "LayoutDuration",
  "RecalcStyleDuration",
];

async function cpuMetrics(page) {
  const { metrics } = await page.cdp.send("Performance.getMetrics");

  return Object.fromEntries(
    metrics
      .filter(({ name }) => CPU_METRICS.includes(name))
      .map(({ name, value }) => [name, value]),
  );
}

// Main-thread milliseconds spent by the scenario, already scaled by the CPU throttle.
async function scenario(page, run) {
  const before = await cpuMetrics(page);
  const result = await run();
  const after = await cpuMetrics(page);

  for (const name of CPU_METRICS) {
    result[`${name.replace("Duration", "").toLowerCase()}Ms`] = Math.round(
      (after[name] - before[name]) * 1000,
    );
  }

  return result;
}

async function hover(page) {
  const box = await page.locator("[frimousse-viewport]").boundingBox();
  const from = await page.evaluate(() => window.bench.now());

  for (let step = 0; step < 60; step++) {
    await page.mouse.move(
      box.x + 20 + (step % 9) * 32,
      box.y + 60 + Math.floor(step / 9) * 32,
    );
  }

  await sleep(100);

  return page.evaluate(
    ([from]) => window.bench.stats(from, window.bench.now()),
    [from],
  );
}

const results = Object.fromEntries(variants.map(({ label }) => [label, []]));
const browser = await chromium.launch({
  args: ["--enable-features=LongAnimationFrameTiming"],
});

for (let run = 0; run < runs; run++) {
  for (const { label } of variants) {
    const url = `${origin}/${label}/`;

    const context = await browser.newContext({
      viewport: { width: 800, height: 600 },
    });
    const first = await newPage(context, url);
    const coldNetwork = await scenario(first, () =>
      first.evaluate(() => window.bench.open()),
    );
    await first.evaluate(() => window.bench.close());
    const reopen = await scenario(first, () =>
      first.evaluate(() => window.bench.open()),
    );
    await first.close();

    // localStorage persists across pages in a context, sessionStorage does not.
    const page = await newPage(context, url);
    const newSession = await scenario(page, () =>
      page.evaluate(() => window.bench.open()),
    );
    await page.evaluate(() => window.bench.close());
    const reopenSession = await scenario(page, () =>
      page.evaluate(() => window.bench.open()),
    );
    const scrollSlow = await scenario(page, () =>
      page.evaluate(() => window.bench.scroll(30, 90)),
    );
    const scrollFling = await scenario(page, () =>
      page.evaluate(() => window.bench.scroll(120, 60)),
    );
    const scrollJump = await scenario(page, () =>
      page.evaluate(() => window.bench.scroll(600, 20)),
    );
    await page.evaluate(() => window.bench.scroll(0, 1));
    const hoverSweep = await scenario(page, () => hover(page));
    results[label].push({
      coldNetwork,
      reopen,
      newSession,
      reopenSession,
      scrollSlow,
      scrollFling,
      scrollJump,
      hoverSweep,
    });
    await context.close();
  }
}

await browser.close();
server.close();

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)];
};
await mkdir(values.out, { recursive: true });

for (const { label } of variants) {
  const summary = {};

  for (const [scenario, first] of Object.entries(results[label][0])) {
    summary[scenario] = {};

    for (const metric of Object.keys(first)) {
      const samples = results[label].map((result) => result[scenario][metric]);
      summary[scenario][metric] = median(samples);
      summary[scenario][`${metric}Range`] = [
        Math.min(...samples),
        Math.max(...samples),
      ];
    }
  }

  const report = {
    label,
    cpu: Number(values.cpu),
    latency,
    runs,
    summary,
    raw: results[label],
  };
  await writeFile(
    join(values.out, `${label}.json`),
    JSON.stringify(report, null, 2),
  );
}

console.log(
  `Wrote ${variants.map(({ label }) => `${label}.json`).join(", ")} to ${values.out}`,
);
