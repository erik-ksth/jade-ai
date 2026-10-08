// Records the Jade AI demo video (see the "Jade AI Demo Video Script" doc).
//
//   cd scripts/demo-video && npm install && npm run record
//
// Drives the live app in headless Chrome, captures every painted frame over the
// DevTools screencast, compresses the AI wait time, and encodes out/jade-ai-demo.mp4
// plus out/poster.png. Takes where cleaning drops too many rows are re-recorded.
//
// Env: DEMO_URL (default: production), CHROME_PATH, KEEP_FRAMES=1 to keep raw frames.

import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { installOverlay } from "./overlay.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");

const CONFIG = {
  url: process.env.DEMO_URL ?? "https://jadeaiapp.vercel.app",
  chrome: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  // 1600x900 CSS px at 1.2x = 1920x1080 frames, so UI text reads like 125% zoom
  viewport: { width: 1600, height: 900, deviceScaleFactor: 1.2 },
  maxAttempts: 5,
  // A take is kept when cleaning finishes in one pass and keeps most rows;
  // the last attempt is kept regardless
  minRowsKept: 480, // of 500 sample rows
  maxPasses: 1,
  aiWaitSeconds: 5, // each AI wait is compressed to about this long in the video
  captionCenter: "44%", // middle of the data panel, clear of the chat composer
};

class Retake extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);

// ---------------------------------------------------------------------------
// Frame capture

class Recorder {
  constructor(page, dir) {
    this.page = page;
    this.dir = dir;
    this.frames = [];
    this.waits = [];
    this.pending = Promise.resolve();
  }

  async start() {
    await fs.mkdir(this.dir, { recursive: true });
    this.cdp = await this.page.createCDPSession();
    this.cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const file = path.join(this.dir, `${String(this.frames.length).padStart(6, "0")}.jpg`);
      this.frames.push({ ts: metadata.timestamp, file });
      // Write in order without blocking the ack
      this.pending = this.pending.then(() => fs.writeFile(file, data, "base64"));
      this.cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 92,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
    });
    this.startedAt = Date.now() / 1000;
  }

  waitStart() {
    this.currentWait = Date.now() / 1000;
  }

  waitEnd() {
    this.waits.push({ start: this.currentWait, end: Date.now() / 1000 });
  }

  async stop() {
    await sleep(300);
    await this.cdp.send("Page.stopScreencast");
    this.stoppedAt = Date.now() / 1000;
    await this.pending;
  }

  // Output time of a capture timestamp, with each AI wait squeezed to ~aiWaitSeconds
  outputTime(t) {
    let out = t - this.frames[0].ts;
    for (const w of this.waits) {
      const len = w.end - w.start;
      const factor = Math.max(1, len / CONFIG.aiWaitSeconds);
      const overlap = Math.max(0, Math.min(t, w.end) - w.start);
      out -= overlap * (1 - 1 / factor);
    }
    return out;
  }

  async encode(target) {
    const lines = [];
    for (let i = 0; i < this.frames.length; i++) {
      const cur = this.frames[i];
      const nextTs = i + 1 < this.frames.length ? this.frames[i + 1].ts : this.stoppedAt;
      const duration = Math.max(0.001, this.outputTime(nextTs) - this.outputTime(cur.ts));
      lines.push(`file '${cur.file}'`, `duration ${duration.toFixed(4)}`);
    }
    // concat demuxer ignores the last duration unless the file is repeated
    lines.push(`file '${this.frames.at(-1).file}'`);
    const list = path.join(this.dir, "frames.txt");
    await fs.writeFile(list, lines.join("\n"));

    const result = spawnSync(
      "ffmpeg",
      [
        "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", list,
        "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
        "-c:v", "libx264", "-preset", "slow", "-crf", "21",
        "-movflags", "+faststart", "-an",
        target,
      ],
      { stdio: "inherit" }
    );
    if (result.status !== 0) throw new Error("ffmpeg failed");
  }
}

// ---------------------------------------------------------------------------
// Page helpers

function demo(page) {
  const call = (fn, ...args) => page.evaluate(fn, ...args);

  const rectOf = (selector, text) =>
    call(
      (selector, text) => {
        const els = [...document.querySelectorAll(selector)].filter((e) => !text || e.textContent.includes(text));
        const el = els.find((e) => e.getBoundingClientRect().width > 0);
        if (!el) return null;
        // Targets can sit below the fold of a scroll area (e.g. the latest chat message)
        el.scrollIntoView({ block: "nearest" });
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      },
      selector,
      text
    );

  const need = async (selector, text, timeout = 20000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const r = await rectOf(selector, text);
      if (r) return r;
      await sleep(150);
    }
    throw new Error(`Not found: ${selector}${text ? ` "${text}"` : ""}`);
  };

  const moveTo = async (x, y) => {
    const { x: cx, y: cy } = await call(() => ({ x: window.__demo.x, y: window.__demo.y }));
    const distance = Math.hypot(x - cx, y - cy);
    const ms = Math.round(Math.min(1100, Math.max(450, distance * 0.9)));
    await call((x, y, ms) => window.__demo.moveTo(x, y, ms), x, y, ms);
    await page.mouse.move(x, y);
  };

  const center = (r, dx = 0.5, dy = 0.5) => ({ x: r.x + r.width * dx, y: r.y + r.height * dy });

  return {
    call,
    rectOf,
    need,
    moveTo,
    async click(selector, text, { dx = 0.5, dy = 0.5 } = {}) {
      const p = center(await need(selector, text), dx, dy);
      await moveTo(p.x, p.y);
      await sleep(140);
      await call(() => window.__demo.press(true));
      await call((x, y) => window.__demo.ripple(x, y), p.x, p.y);
      await page.mouse.click(p.x, p.y);
      await sleep(90);
      await call(() => window.__demo.press(false));
    },
    async hover(selector, text) {
      const p = center(await need(selector, text));
      await moveTo(p.x, p.y);
    },
    async drag(from, to, ms = 900) {
      await moveTo(from.x, from.y);
      await sleep(120);
      await call(() => window.__demo.press(true));
      await page.mouse.down();
      const steps = Math.round(ms / 30);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const x = from.x + (to.x - from.x) * k;
        const y = from.y + (to.y - from.y) * k;
        await page.mouse.move(x, y);
        await call((x, y) => window.__demo.setPos(x, y), x, y);
        await sleep(30);
      }
      await page.mouse.up();
      await call(() => window.__demo.press(false));
    },
    caption: (text) => call((text) => window.__demo.caption(text), text),
    hideCaption: () => call(() => window.__demo.hideCaption()),
    badge: (on) => call((on) => window.__demo.badge(on), on),
    zoom: (rect, scale, ms = 800) => call((r, s, ms) => window.__demo.zoom(r, s, ms), rect, scale, ms),
    unzoom: (ms = 700) => call((ms) => window.__demo.unzoom(ms), ms),
  };
}

// Text of the data table's summary bar, e.g. "500 rows 8 columns — 329 empty 174 invalid"
async function readStats(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('[role="tabpanel"] > div > div:first-child');
    const text = bar?.innerText.replace(/\s+/g, " ") ?? "";
    const num = (re) => Number((text.match(re)?.[1] ?? "0").replace(/,/g, ""));
    const r = bar?.getBoundingClientRect();
    // The counts sit at the left of a full-width bar; zoom on that part only
    const spans = bar ? [...bar.children] : [];
    const right = spans.length ? Math.max(...spans.map((s) => s.getBoundingClientRect().right)) : 0;
    return {
      rows: num(/([\d,]+) rows/),
      empty: num(/([\d,]+) empty/),
      invalid: num(/([\d,]+) invalid/),
      rect: r ? { x: r.x, y: r.y, width: right - r.x + 12, height: r.height } : null,
    };
  });
}

// Waits for the assistant to finish, marking the stretch for compression
async function waitForAssistant(page, rec, d) {
  rec.waitStart();
  await d.badge(true);
  const btn = 'button[aria-label="Start a new conversation"]';
  await page.waitForSelector(`${btn}[disabled]`, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(
    (btn) => {
      const b = document.querySelector(btn);
      return b && !b.disabled && !document.querySelector('[role="status"]');
    },
    { timeout: 150000, polling: 250 },
    btn
  );
  await d.badge(false);
  rec.waitEnd();
}

// ---------------------------------------------------------------------------
// The demo, shot by shot

async function runDemo(page, rec, { allowRetake }) {
  const d = demo(page);
  const vw = CONFIG.viewport.width;
  const vh = CONFIG.viewport.height;

  await page.goto(CONFIG.url, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await d.need("button", "Try sample data");
  await d.call((c) => {
    window.__demo.init();
    window.__demo.setCaptionCenter(c);
    window.__demo.setPos(innerWidth * 0.62, innerHeight * 0.72);
  }, CONFIG.captionCenter);
  await sleep(400);
  await rec.start();

  // 1 · Hook
  log("Shot 1: hook");
  await sleep(300);
  await d.caption("Messy spreadsheet in. Clean data out.");
  await sleep(900);

  // 2 · Load the messy sample and show what's wrong with it
  log("Shot 2: sample data");
  await d.click("button", "Try sample data");
  await d.need(".ag-row");
  await sleep(900);
  const before = await readStats(page);
  await d.caption(`${before.rows} sales rows: ${before.empty} empty cells, ${before.invalid} invalid values`);
  await d.zoom(before.rect, 1.75);
  await sleep(2300);
  await d.unzoom();
  await d.hover(".cell-invalid");
  await sleep(1100);

  // 3 · One plain-English request
  log("Shot 3: request");
  await d.caption("Ask in plain English");
  await sleep(500);
  await d.click("button", "Clean up missing and invalid values");

  // 4 · Jade works through it (compressed), then a peek at the generated code
  log("Shot 4: cleaning (waiting for AI)");
  await d.caption("Jade writes and runs pandas code, step by step");
  await d.moveTo(vw * 0.86, vh * 0.55);
  await waitForAssistant(page, rec, d);

  const after = await readStats(page);
  const passes = await page.evaluate(
    () => [...document.querySelectorAll("strong")].filter((s) => /^Pass \d/.test(s.textContent)).length
  );
  log(`  kept ${after.rows}/${before.rows} rows in ${passes} pass(es); ${after.empty} empty, ${after.invalid} invalid`);
  if (allowRetake && (after.rows < CONFIG.minRowsKept || passes > CONFIG.maxPasses || after.invalid > 0)) {
    throw new Retake(`kept ${after.rows} rows in ${passes} passes`);
  }

  await sleep(700);
  await d.call(() => {
    const btn = [...document.querySelectorAll('button[aria-expanded="false"]')].find((b) => b.textContent.includes("Python"));
    btn?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  await sleep(800);
  await d.click('button[aria-expanded="false"]', "Python");
  await sleep(300);
  const codeRect = await d.call(() => {
    const btn = [...document.querySelectorAll('button[aria-expanded="true"]')].find((b) => b.textContent.includes("Python"));
    const r = btn?.closest(".rounded-lg")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 420) } : null;
  });
  if (codeRect) {
    await d.zoom(codeRect, 1.6);
    await sleep(2800);
    await d.unzoom();
  }
  await d.click('button[aria-expanded="true"]', "Python");
  await d.call(() => {
    const list = document.querySelector('[aria-label="Message Jade"]')?.closest(".flex.h-full")?.querySelector(".overflow-y-auto");
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  });
  await sleep(700);

  // 5 · The result
  log("Shot 5: result");
  await d.caption(`${after.empty} empty, ${after.invalid} invalid · ${after.rows} of ${before.rows} rows kept`);
  await d.zoom((await readStats(page)).rect, 1.75);
  await sleep(2600);
  await d.unzoom();

  // 6 · Ask for a chart
  log("Shot 6: chart (waiting for AI)");
  await d.caption("Then ask for a chart");
  await d.click('textarea[aria-label="Message Jade"]');
  await page.keyboard.type("Chart total sales by item", { delay: 55 });
  await sleep(350);
  await page.keyboard.press("Enter");
  await waitForAssistant(page, rec, d);
  await sleep(600);
  await d.click("button", "View dashboard");
  await page.waitForSelector(".chart-drag-handle canvas, .chart-drag-handle ~ div canvas", { timeout: 10000 }).catch(() => {});
  await sleep(1200);

  // 7 · Arrange the dashboard, light and dark
  log("Shot 7: dashboard");
  await d.caption("Arrange it on a dashboard, in light or dark");
  const handle = await d.need(".chart-drag-handle");
  const grab = { x: handle.x + handle.width * 0.3, y: handle.y + handle.height / 2 };
  await d.drag(grab, { x: grab.x + 70, y: grab.y + 50 });
  await sleep(300);
  const card = await d.call(() => {
    const r = document.querySelector(".chart-drag-handle").parentElement.getBoundingClientRect();
    return { x: r.right - 3, y: r.bottom - 3 };
  });
  await d.drag(card, { x: card.x + 110, y: card.y + 70 });
  await sleep(500);
  await d.click('button[aria-label="Switch to light theme"]');
  await sleep(1600);
  await d.click('button[aria-label="Switch to dark theme"]');
  await sleep(900);

  // Poster frame: the finished dashboard without overlays
  await d.moveTo(vw * 0.5, vh * 0.92);
  await d.hideCaption();
  await d.call(() => window.__demo.hideCursor(true));
  await page.screenshot({ path: path.join(OUT, "poster.png") });

  // 8 · End card
  log("Shot 8: end card");
  await d.call(() =>
    window.__demo.endCard({
      icon: "/jade_ai_icon.png",
      title: "Jade AI",
      tagline: "Your conversational data analyst",
      stack: "Next.js · FastAPI · LangGraph · Groq",
      url: "jadeaiapp.vercel.app",
    })
  );
  await sleep(3200);
  await rec.stop();
}

// ---------------------------------------------------------------------------

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CONFIG.chrome,
    headless: true,
    defaultViewport: CONFIG.viewport,
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=Translate"],
  });

  try {
    for (let attempt = 1; attempt <= CONFIG.maxAttempts; attempt++) {
      log(`Take ${attempt}/${CONFIG.maxAttempts}`);
      const page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
      await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "dark"));
      await page.evaluateOnNewDocument(installOverlay);

      const frameDir = path.join(OUT, `frames-take${attempt}`);
      await fs.rm(frameDir, { recursive: true, force: true });
      const rec = new Recorder(page, frameDir);

      try {
        await runDemo(page, rec, { allowRetake: attempt < CONFIG.maxAttempts });
      } catch (err) {
        if (!(err instanceof Retake)) {
          await page.screenshot({ path: path.join(OUT, "error.png") }).catch(() => {});
        }
        await rec.cdp?.send("Page.stopScreencast").catch(() => {});
        await page.close();
        await fs.rm(frameDir, { recursive: true, force: true });
        if (err instanceof Retake) {
          log(`  Retake: ${err.message}`);
          continue;
        }
        throw err;
      }

      log(`Encoding ${rec.frames.length} frames…`);
      const target = path.join(OUT, "jade-ai-demo.mp4");
      await rec.encode(target);
      if (!process.env.KEEP_FRAMES) await fs.rm(frameDir, { recursive: true, force: true });
      await page.close();

      const { size } = await fs.stat(target);
      const duration = rec.outputTime(rec.stoppedAt).toFixed(1);
      log(`Done: ${target} (${duration}s, ${(size / 1e6).toFixed(1)} MB) + out/poster.png`);
      return;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
