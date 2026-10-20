// Profiles one bench scenario and prints the hottest functions by self time.
//
//   node bench/profile.mjs --dist bench/dist/<label> --scenario newSession|reopen|fling

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values } = parseArgs({
  options: {
    dist: { type: "string" },
    scenario: { type: "string" },
    cpu: { type: "string", default: "4" },
  },
});
const dist = resolve(values.dist);
const server = createServer(async (request, response) => {
  const path = request.url === "/" ? "/index.html" : request.url;
  try {
    response.writeHead(200, {
      "content-type": extname(path) === ".js" ? "text/javascript" : "text/html",
    });
    response.end(await readFile(join(dist, path)));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, done));
const emojibase = resolve("node_modules/emojibase-data");
const browser = await chromium.launch();
const context = await browser.newContext();
async function open() {
  const page = await context.newPage();
  await page.route(
    /emojibase-data@[^/]+\/(\w+)\/(\w+\.json)$/,
    async (route) => {
      const [, locale, file] = route
        .request()
        .url()
        .match(/\/(\w+)\/(\w+\.json)$/);
      await new Promise((d) => setTimeout(d, 120));
      const headers = {
        etag: `"${locale}-${file}"`,
        "access-control-allow-origin": "*",
        "access-control-expose-headers": "*",
      };
      return route.fulfill({
        status: 200,
        headers,
        body:
          route.request().method() === "HEAD"
            ? ""
            : await readFile(join(emojibase, locale, file)),
      });
    },
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", {
    rate: Number(values.cpu),
  });
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForFunction(() => "bench" in window);
  return { page, cdp };
}
const warm = await open();
await warm.page.evaluate(() => window.bench.open());
await warm.page.close();
const { page, cdp } = await open();
if (values.scenario !== "newSession") {
  await page.evaluate(() => window.bench.open());
  await page.evaluate(() => window.bench.close());
}
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
const result = await page.evaluate(
  (scenario) =>
    scenario === "fling"
      ? window.bench.open().then(() => window.bench.scroll(120, 60))
      : window.bench.open(),
  values.scenario,
);
const { profile } = await cdp.send("Profiler.stop");
console.log(JSON.stringify(result));
const self = new Map();
const dt = profile.timeDeltas;
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const f = n.callFrame;
  const key = `${f.functionName || "(anon)"} ${f.url.split("/").pop()}:${f.lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
});
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(v.toFixed(1).padStart(8), k);
await browser.close();
server.close();
