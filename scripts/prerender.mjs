#!/usr/bin/env node
/**
 * Hybrid Prerender — Playwright runner.
 *
 * 1. Serves `dist/` on http://127.0.0.1:4173 via a tiny static server.
 * 2. Walks PUBLIC_ROUTES in headless Chromium with UA="phonara-prerender".
 * 3. Captures `document.documentElement.outerHTML` after `networkidle`
 *    and writes it to `dist/<route>/index.html` (root → dist/index.html).
 * 4. Fails the build if ANY console.error / console.warning / pageerror
 *    occurs for a route (after retries) or if any route exhausts retries.
 * 5. Emits reports/prerender-report.json.
 *
 * Absolute invariants:
 *   - Does NOT modify money-flow paths, operator chunks, realtime
 *     wrappers, sound system, size budgets, or supabase generated files.
 *   - Only public routes are visited. Protected routes stay CSR.
 */

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const REPORTS = path.join(ROOT, "reports");

const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const PAGE_TIMEOUT_MS = 18_000;
const MAX_RETRIES = 3;

/** Public routes — keep in sync with `.lovable/plan.md`. */
const PUBLIC_ROUTES = [
  "/",
  "/trust",
  "/legal/terms",
  "/legal/privacy",
  "/status",
  "/vip",
  "/empire",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".mp3":  "audio/mpeg",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".txt":  "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", ORIGIN);
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const full = path.join(DIST, rel);
      try {
        const data = await fs.readFile(full);
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
        res.end(data);
        return;
      } catch {
        // SPA fallback
        const html = await fs.readFile(path.join(DIST, "index.html"));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
      }
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function routeOutPath(route) {
  if (route === "/") return path.join(DIST, "index.html");
  const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
  return path.join(DIST, clean, "index.html");
}

async function prerenderRoute(browser, route) {
  const started = Date.now();
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Phonara) phonara-prerender/1.0 PlaywrightChromium",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    const consoleProblems = [];
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        consoleProblems.push({ type, text: msg.text() });
      }
    });
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err)));

    try {
      await page.addInitScript(() => {
        // Flag for isPrerenderBuild(); guards must skip money-flow/realtime.
        window.__PHONARA_PRERENDER__ = true;
      });
      await page.goto(`${ORIGIN}${route}`, {
        waitUntil: "networkidle",
        timeout: PAGE_TIMEOUT_MS,
      });
      // Small settle for Helmet head mutations.
      await page.waitForTimeout(300);

      if (pageErrors.length || consoleProblems.length) {
        lastError = {
          message: `console/page errors on ${route}`,
          pageErrors,
          consoleProblems,
        };
        await context.close();
        continue;
      }

      const html = "<!doctype html>\n" + (await page.content());
      const outFile = routeOutPath(route);
      await fs.mkdir(path.dirname(outFile), { recursive: true });
      await fs.writeFile(outFile, html, "utf8");

      await context.close();
      return {
        route,
        status: "ok",
        attempts: attempt,
        ms: Date.now() - started,
        bytes: Buffer.byteLength(html, "utf8"),
        outFile: path.relative(ROOT, outFile),
      };
    } catch (err) {
      lastError = { message: String(err?.message || err), stack: String(err?.stack || "") };
      await context.close();
    }
  }

  return {
    route,
    status: "fail",
    attempts: MAX_RETRIES,
    ms: Date.now() - started,
    error: lastError,
  };
}

async function main() {
  // sanity: dist must exist
  try {
    await fs.access(path.join(DIST, "index.html"));
  } catch {
    console.error("[prerender] dist/index.html not found — run `vite build` first.");
    process.exit(1);
  }
  await fs.mkdir(REPORTS, { recursive: true });

  console.log(`[prerender] serving dist on ${ORIGIN}`);
  const server = await startServer();

  console.log("[prerender] launching chromium…");
  const browser = await chromium.launch({ headless: true });

  const routes = [];
  let hardFail = false;
  for (const route of PUBLIC_ROUTES) {
    const t0 = Date.now();
    process.stdout.write(`[prerender] ${route} … `);
    const result = await prerenderRoute(browser, route);
    routes.push(result);
    if (result.status === "ok") {
      console.log(`ok (${result.ms}ms, ${result.bytes}B, try ${result.attempts})`);
    } else {
      hardFail = true;
      console.log(`FAIL after ${result.attempts} attempts (${Date.now() - t0}ms)`);
      console.log(JSON.stringify(result.error, null, 2));
    }
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const report = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    publicRoutes: PUBLIC_ROUTES,
    routes,
    summary: {
      total: routes.length,
      ok: routes.filter((r) => r.status === "ok").length,
      fail: routes.filter((r) => r.status === "fail").length,
    },
  };
  await fs.writeFile(
    path.join(REPORTS, "prerender-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(`[prerender] report → reports/prerender-report.json`);

  if (hardFail) {
    console.error("[prerender] FAILED — one or more public routes did not render cleanly.");
    process.exit(1);
  }
  console.log("[prerender] DONE.");
}

main().catch((err) => {
  console.error("[prerender] fatal:", err);
  process.exit(1);
});
