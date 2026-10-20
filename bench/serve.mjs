// Builds the bench page once per variant and serves each at /<label>/ for a browser to drive.
//
//   node bench/serve.mjs --port 17890 --variant main=<src> --variant perf=src

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { build } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    variant: {
      type: "string",
      multiple: true,
      default: [`current=${resolve(root, "../src")}`],
    },
    port: { type: "string", default: "17890" },
  },
});
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
    build: { outDir, emptyOutDir: true, minify: true },
  });
}

const emojibase = join(root, "../node_modules/emojibase-data");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
};

createServer(async (request, response) => {
  const [, label, ...rest] = request.url.split("?")[0].split("/");

  try {
    if (label === "emojibase") {
      const [locale, file] = rest;
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

    const variant = variants.find((variant) => variant.label === label);
    const path = rest.join("/") || "index.html";
    response.writeHead(200, {
      "content-type": types[extname(path)] ?? "text/plain",
    });
    response.end(await readFile(join(variant.outDir, path)));
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(values.port), () => {
  console.log(
    variants
      .map(({ label }) => `http://localhost:${values.port}/${label}/`)
      .join("\n"),
  );
});
