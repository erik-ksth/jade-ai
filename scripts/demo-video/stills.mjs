// Captures clean product screenshots (no cursor or captions) for the landing page.
//
//   npm run stills   ->  out/stills/{1-messy,2-cleaning,3-dashboard}.png
//
// Same flow as record.mjs, but at 2x pixel density and without the overlay.

import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out", "stills");
const URL = process.env.DEMO_URL ?? "https://jadeaiapp.vercel.app";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, selector, text) {
  await page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].some((e) => e.textContent.includes(t)),
    { timeout: 20000 },
    selector,
    text
  );
  await page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t));
      el.scrollIntoView({ block: "nearest" });
      el.click();
    },
    selector,
    text
  );
}

async function waitForAssistant(page) {
  const btn = 'button[aria-label="Start a new conversation"]';
  await page.waitForSelector(`${btn}[disabled]`, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(
    (b) => {
      const el = document.querySelector(b);
      return el && !el.disabled && !document.querySelector('[role="status"]');
    },
    { timeout: 150000, polling: 250 },
    btn
  );
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ["--hide-scrollbars", "--force-color-profile=srgb"],
  });

  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
      await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "dark"));
      await page.goto(URL, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);

      await clickText(page, "button", "Try sample data");
      await page.waitForSelector(".cell-invalid");
      await sleep(800);
      await page.screenshot({ path: path.join(OUT, "1-messy.png") });

      await clickText(page, "button", "Clean up missing and invalid values");
      await waitForAssistant(page);
      const passes = await page.evaluate(
        () => [...document.querySelectorAll("strong")].filter((s) => /^Pass \d/.test(s.textContent)).length
      );
      const rows = await page.evaluate(
        () => Number(document.querySelector('li > button[aria-current="true"]')?.innerText.match(/([\d,]+) rows/)?.[1].replace(/,/g, "") ?? 0)
      );
      console.log(`Take ${attempt}: ${rows} rows kept in ${passes} pass(es)`);
      if ((passes > 1 || rows < 480) && attempt < 4) {
        await page.close();
        continue;
      }

      // Open the generated code so the screenshot shows what Jade ran
      await clickText(page, 'button[aria-expanded="false"]', "Python");
      await sleep(500);
      await page.evaluate(() => {
        const list = document.querySelector('[aria-label="Message Jade"]')?.closest(".flex.h-full")?.querySelector(".overflow-y-auto");
        if (list) list.scrollTop = 0;
      });
      await sleep(400);
      await page.screenshot({ path: path.join(OUT, "2-cleaning.png") });

      await page.focus('textarea[aria-label="Message Jade"]');
      await page.keyboard.type("Chart total sales by item");
      await page.keyboard.press("Enter");
      await waitForAssistant(page);
      await clickText(page, "button", "View dashboard");
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, "3-dashboard.png") });
      console.log(`Saved stills to ${OUT}`);
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
