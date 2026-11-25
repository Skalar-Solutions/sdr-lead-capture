import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extPath = path.join(root, "apps/extension/.output/chrome-mv3");
const outDir = path.join(root, "artifacts");
fs.mkdirSync(outDir, { recursive: true });

const context = await chromium.launchPersistentContext(
  fs.mkdtempSync(path.join(os.tmpdir(), "sdr-e2e-")),
  {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  },
);

try {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }
  const extensionId = new URL(serviceWorker.url()).host;
  console.log("extension id:", extensionId);

  // 1. Popup harus render (mode manual, bukan di Maps)
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("text=Buka Google Maps", { timeout: 15000 });
  console.log("popup: render OK");
  await popup.screenshot({ path: path.join(outDir, "popup.png"), fullPage: true });

  // 2. Drawer scrape + simpan
  const fixture = `<!doctype html><html><head><meta charset="utf-8"><title>Maps fixture</title></head>
  <body style="margin:0">
    <div role="main" style="padding:24px;font-family:sans-serif">
      <h1 class="DUwDvf">Warung Steak Pak Joko</h1>
      <button jsaction="pane.rating.category">Steakhouse</button>
      <div class="F7nice"><span aria-hidden="true">4,8</span><span>(1.234)</span></div>
      <button data-item-id="address" aria-label="Alamat: Jl. Raya No. 1">Jl. Raya No. 1</button>
      <button data-item-id="phone:tel:+6281234567890" aria-label="Telepon: 0812-3456-7890">0812-3456-7890</button>
      <a data-item-id="authority" href="https://www.instagram.com/warungsteak/">Instagram</a>
    </div>
  </body></html>`;

  const maps = await context.newPage();
  await maps.route("**/maps/place/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture }),
  );
  await maps.goto("https://www.google.com/maps/place/Warung+Steak/@-6.2,106.8,17z", {
    waitUntil: "domcontentloaded",
  });
  await maps.waitForSelector("sdr-capture-ui", { state: "attached", timeout: 15000 });

  await maps.getByRole("button", { name: /SDR Capture/ }).click();
  await maps.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });
  await maps.screenshot({ path: path.join(outDir, "maps-drawer.png") });

  await maps.getByRole("button", { name: "Simpan ke CSV" }).click();
  await maps.waitForSelector("text=Tersimpan ke CSV", { timeout: 15000 });
  console.log("drawer: capture tersimpan");

  const stored = await popup.evaluate(async () => {
    const { sdr_captures } = await chrome.storage.local.get("sdr_captures");
    return Array.isArray(sdr_captures) ? sdr_captures.length : 0;
  });
  console.log("storage sdr_captures:", stored);

  // 3. Dashboard harus menampilkan hasil
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await dashboard.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });
  console.log("dashboard: baris tampil");
  await dashboard.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: true });

  // 4. Export CSV harus benar
  const [download] = await Promise.all([
    dashboard.waitForEvent("download"),
    dashboard.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  const csvPath = await download.path();
  const csv = fs.readFileSync(csvPath, "utf8");
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  console.log("csv header:", lines[0]);
  console.log("csv row:", lines[1]);

  if (!lines[0]?.includes("*Nama") || !csv.includes("Warung Steak Pak Joko")) {
    throw new Error("Isi CSV tidak sesuai template");
  }

  fs.writeFileSync(
    path.join(outDir, "e2e.json"),
    JSON.stringify({ extensionId, stored, csvHeader: lines[0], csvRow: lines[1] }, null, 2),
  );
} finally {
  await context.close();
}
