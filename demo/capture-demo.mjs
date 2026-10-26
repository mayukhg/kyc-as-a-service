import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screensDir = path.join(__dirname, "slides", "screens");
const videoDir = path.join(__dirname, "video");
fs.mkdirSync(screensDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const BASE = process.env.DEMO_BASE || "http://127.0.0.1:8080";

async function shot(page, name) {
  const file = path.join(screensDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("shot", name);
}

async function main() {
  // --- Screenshots (no video) ---
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "01-case-study");

  await page.goto(`${BASE}/playground`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, "02-playground-idle");
  await page.getByRole("button", { name: /Run KYC Risk Check/i }).click();
  await page.waitForTimeout(2200);
  await shot(page, "03-playground-result");

  await page.goto(`${BASE}/console`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "04-console");

  await page.goto(`${BASE}/console/customers/hash_abc123`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "05-customer-detail");

  // switch to analyst via localStorage + reload
  await page.evaluate(() => localStorage.setItem("kyc-demo-role", "analyst"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator("textarea").fill("Demo approve: strong GBM score and verified ledger attestation.");
  await page.getByRole("button", { name: /Submit decision/i }).click();
  await page.waitForTimeout(1000);
  await shot(page, "06-decision-submitted");

  await page.goto(`${BASE}/federated`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, "07-federated");
  await page.getByRole("button", { name: /Run FL round/i }).click();
  await page.waitForTimeout(1500);
  await shot(page, "08-federated-round");

  await page.goto(`${BASE}/audit`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "09-audit");

  await browser.close();

  // --- E2E video recording ---
  const videoBrowser = await chromium.launch({ headless: true });
  const context = await videoBrowser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  });
  const vpage = await context.newPage();

  const pause = (ms) => vpage.waitForTimeout(ms);

  await vpage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pause(2500);
  await vpage.getByRole("link", { name: /Open API Playground/i }).click();
  await pause(1500);
  await vpage.getByRole("button", { name: /Run KYC Risk Check/i }).click();
  await pause(3000);
  await vpage.getByRole("link", { name: /Open this customer in Console/i }).click();
  await pause(2000);
  await vpage.evaluate(() => localStorage.setItem("kyc-demo-role", "analyst"));
  await vpage.reload({ waitUntil: "networkidle" });
  await pause(1000);
  await vpage.locator("textarea").fill("Interview demo: approve after verifying ledger attestation.");
  await pause(800);
  await vpage.getByRole("button", { name: /Submit decision/i }).click();
  await pause(2000);
  await vpage.getByRole("link", { name: "Federated", exact: true }).click();
  await pause(1500);
  await vpage.getByRole("button", { name: /Run FL round/i }).click();
  await pause(2500);
  await vpage.getByRole("link", { name: "Audit", exact: true }).click();
  await pause(2500);
  await vpage.getByRole("link", { name: "Case Study", exact: true }).click();
  await pause(2000);

  const video = vpage.video();
  await context.close();
  await videoBrowser.close();
  const rawPath = await video.path();
  const outWebm = path.join(videoDir, "e2e-workflow.webm");
  fs.renameSync(rawPath, outWebm);
  console.log("video", outWebm);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
