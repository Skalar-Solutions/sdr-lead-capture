/**
 * Generate aset Chrome Web Store:
 *   store/screenshot-1-dashboard.png  (1280x800)
 *   store/screenshot-2-maps.png       (1280x800)
 *   store/promo-440x280.png
 *
 * Jalankan setelah `pnpm build`:
 *   node scripts/store-assets.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extPath = path.join(root, "apps/extension/.output/chrome-mv3");
const storeDir = path.join(root, "store");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdr-store-"));
const fontPath = path.join(
  root,
  "packages/ui/src/styles/fonts/inter-latin-wght-normal.woff2",
);

fs.mkdirSync(storeDir, { recursive: true });

if (!fs.existsSync(path.join(extPath, "manifest.json"))) {
  console.error("Build extension belum ada. Jalankan `pnpm build` dulu.");
  process.exit(1);
}

const today = new Date();
const isoDaysAgo = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const samples = [
  {
    id: "sample-1",
    capturedAt: isoDaysAgo(0),
    companyName: "Warung Steak Pak Joko",
    category: "Steakhouse",
    address: "Jl. Raya No. 1, Karet Tengsin, Jakarta Pusat",
    phone: "0812-3456-7890",
    website: "",
    socialType: "Instagram",
    socialUrl: "https://www.instagram.com/warungsteak/",
    instagram: "@warungsteak",
    rating: "4,8",
    reviewsCount: "1.234",
    mapsUrl: "https://www.google.com/maps/place/Warung+Steak+Pak+Joko",
    isSocialMediaOnly: true,
  },
  {
    id: "sample-2",
    capturedAt: isoDaysAgo(0),
    companyName: "Klinik Sehat Bersama",
    category: "Klinik",
    address: "Jl. Melati No. 8, Kebayoran Baru, Jakarta Selatan",
    phone: "021-7654-3210",
    website: "https://kliniksehatbersama.id",
    socialType: null,
    socialUrl: "",
    instagram: "",
    rating: "4,6",
    reviewsCount: "328",
    mapsUrl: "https://www.google.com/maps/place/Klinik+Sehat+Bersama",
    isSocialMediaOnly: false,
  },
  {
    id: "sample-3",
    capturedAt: isoDaysAgo(2),
    companyName: "Salon Cantika",
    category: "Salon kecantikan",
    address: "Jl. Kemang Raya No. 21, Jakarta Selatan",
    phone: "0857-1122-3344",
    website: "",
    socialType: null,
    socialUrl: "",
    instagram: "",
    rating: "4,9",
    reviewsCount: "87",
    mapsUrl: "https://www.google.com/maps/place/Salon+Cantika",
    isSocialMediaOnly: false,
  },
];

const context = await chromium.launchPersistentContext(
  fs.mkdtempSync(path.join(os.tmpdir(), "sdr-store-profile-")),
  {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    viewport: { width: 1280, height: 800 },
  },
);

try {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }
  const extensionId = new URL(serviceWorker.url()).host;

  // 1. Dashboard dengan data contoh.
  const seedPage = await context.newPage();
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await seedPage.evaluate(
    async (captures) => chrome.storage.local.set({ sdr_captures: captures }),
    samples,
  );

  const dashboard = await context.newPage();
  await dashboard.setViewportSize({ width: 1280, height: 800 });
  await dashboard.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await dashboard.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });
  await dashboard.screenshot({
    path: path.join(storeDir, "screenshot-1-dashboard.png"),
    fullPage: false,
  });

  // 2. Drawer capture di Google Maps asli.
  const maps = await context.newPage();
  await maps.setViewportSize({ width: 1280, height: 800 });
  await maps.goto(
    "https://www.google.com/maps/place/Chuck's+Cattle+Benhil/@-6.2112658,106.668274,17z/data=!4m10!1m2!2m1!1ssteakhouse+jakarta!3m6!1s0x2e69f7193402b0a7:0x7277aea653cd756e!8m2!3d-6.2112658!4d106.8124696!15sChJzdGVha2hvdXNlIGpha2FydGFaFCISc3RlYWtob3VzZSBqYWthcnRhkgELc3RlYWtfaG91c2WaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnRXZW1KdVRsWlpNM0JGWVROa1MxUXhUblZTYlZsNFlVUldVMUZ1WXhBQuABAPoBBAhAEDo!16s%2Fg%2F11z8n8jyby?entry=ttu&hl=id",
    { waitUntil: "domcontentloaded", timeout: 45000 },
  );
  await maps.locator("h1.DUwDvf").first().waitFor({ state: "visible", timeout: 30000 });
  await maps.locator("sdr-capture-ui").waitFor({ state: "attached", timeout: 15000 });
  const saveButton = maps.getByRole("button", { name: /Simpan ke CSV/ });
  const capturePill = maps.getByRole("button", { name: /SDR Capture/ });
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await saveButton.isVisible().catch(() => false)) break;
    if (await capturePill.isVisible().catch(() => false)) {
      await capturePill.click();
      break;
    }
    await maps.waitForTimeout(400);
  }
  await saveButton.waitFor({ timeout: 15000 });
  await maps.evaluate(() => {
    const button = document.querySelector('button[aria-label="Ciutkan panel samping"]');
    if (button instanceof HTMLElement) {
      button.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      button.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      button.blur();
    }
  });
  await maps.mouse.move(1190, 250);
  await maps.waitForTimeout(1200);
  await maps.screenshot({
    path: path.join(storeDir, "screenshot-2-maps.png"),
    fullPage: false,
  });
} finally {
  await context.close();
}

// 3. Promo tile 440x280 (render 2x lalu downscale).
const iconSvg = fs
  .readFileSync(path.join(root, "apps/extension/public/icon.svg"), "utf8")
  .replace(/<rect[^>]*\/>\s*/g, "")
  .replace(/\s(width|height)="[^"]*"/g, "")
  .replace("<svg ", '<svg width="72" height="72" ');
const fontBase64 = fs.readFileSync(fontPath).toString("base64");

const promoHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: "Inter Variable";
    src: url(data:font/woff2;base64,${fontBase64}) format("woff2-variations");
    font-weight: 100 900;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 440px; height: 280px; background: #090909; color: #fafafa;
    font-family: "Inter Variable", Inter, system-ui, sans-serif;
  }
  .wrap { height: 100%; padding: 28px 30px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .icon { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
  .name { font-size: 26px; font-weight: 600; letter-spacing: -0.03em; }
  .sub { margin-top: 3px; font-size: 13px; color: #a3a3a3; }
  .foot { margin-top: auto; display: flex; align-items: center; gap: 10px; }
  .tag { background: #d4f95c; color: #090909; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; }
  .note { font-size: 12px; color: #a3a3a3; }
</style></head>
<body><div class="wrap">
  <div class="brand"><div class="icon">${iconSvg}</div><div>
    <div class="name">SDR Lead Capture</div>
    <div class="sub">Google Maps → CSV</div>
  </div></div>
  <div class="foot"><span class="tag">OFFLINE</span><span class="note">Local-only · no account</span></div>
</div></body></html>`;

const promoPage = await context.newPage().catch(() => null);
// Context sudah ditutup; buka browser baru khusus promo.
const promoBrowser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const page = await promoBrowser.newPage({
    viewport: { width: 440, height: 280 },
    deviceScaleFactor: 2,
  });
  await page.setContent(promoHtml, { waitUntil: "load" });
  await page.screenshot({ path: path.join(tmpDir, "promo-2x.png") });
  execFileSync("sips", [
    "-z",
    "280",
    "440",
    path.join(tmpDir, "promo-2x.png"),
    "--out",
    path.join(storeDir, "promo-440x280.png"),
  ]);
} finally {
  await promoBrowser.close();
}

console.log("Store assets dibuat:");
for (const file of fs.readdirSync(storeDir).sort()) {
  console.log(" -", path.join("store", file));
}
