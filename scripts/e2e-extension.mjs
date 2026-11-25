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
  await maps.waitForSelector("text=Tersimpan", { timeout: 15000 });
  console.log("drawer: capture tersimpan");

  const stored = await popup.evaluate(async () => {
    const { sdr_captures } = await chrome.storage.local.get("sdr_captures");
    return Array.isArray(sdr_captures) ? sdr_captures.length : 0;
  });
  console.log("storage sdr_captures:", stored);

  // 2b. Bulk scrape dari daftar hasil pencarian
  const places = [
    { id: "0x1:0xa1", name: "Kopi Cipete Satu", phone: "0811-1111-111", web: "" },
    { id: "0x1:0xa2", name: "Kopi Cipete Dua", phone: "0812-2222-222", web: "https://kopidua.com/" },
    { id: "0x1:0xa3", name: "Kopi Cipete Tiga", phone: "", web: "https://www.instagram.com/kopitiga/" },
  ];
  const searchFixture = `<!doctype html><html><head><meta charset="utf-8"><title>Search fixture</title></head>
  <body style="margin:0;display:flex;font-family:sans-serif">
    <div role="main" aria-label="Hasil" style="width:360px;height:100vh;overflow:auto">
      <div role="feed">
        ${places
          .map(
            (p) => `<div class="Nv2PK"><a class="hfpxzc" aria-label="${p.name}"
              href="https://www.google.com/maps/place/${encodeURIComponent(p.name)}/data=!4m7!3m6!1s${p.id}!8m2">${p.name}</a></div>`,
          )
          .join("")}
        <span>Anda telah mencapai akhir daftar.</span>
      </div>
    </div>
    <div id="detail" style="flex:1;padding:24px"></div>
    <script>
      const PLACES = ${JSON.stringify(places)};
      document.addEventListener("click", (event) => {
        const a = event.target.closest("a.hfpxzc");
        if (!a) return;
        event.preventDefault();
        const p = PLACES.find((x) => x.name === a.getAttribute("aria-label"));
        history.pushState({}, "", a.href);
        const detail = document.getElementById("detail");
        detail.innerHTML = "";
        setTimeout(() => {
          detail.innerHTML = '<div role="main" aria-label="' + p.name + '">' +
            '<h1 class="DUwDvf">' + p.name + '</h1>' +
            '<button jsaction="pane.rating.category">Kedai kopi</button>' +
            '<div class="F7nice"><span aria-hidden="true">4,6</span><span>(321)</span></div>' +
            '<button data-item-id="address">\\ue0c8Jl. Cipete Raya</button>' +
            (p.phone ? '<button data-item-id="phone:tel:' + p.phone + '">' + p.phone + '</button>' : '') +
            (p.web ? '<a data-item-id="authority" href="' + p.web + '">web</a>' : '') +
            '</div>';
        }, 300);
      });
    </script>
  </body></html>`;

  const search = await context.newPage();
  await search.route("**/maps/search/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: searchFixture }),
  );
  await search.route("**/maps/place/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: searchFixture }),
  );
  await search.goto("https://www.google.com/maps/search/coffee+shop+cipete/", {
    waitUntil: "domcontentloaded",
  });
  await search.waitForSelector("sdr-capture-ui", { state: "attached", timeout: 15000 });
  await search.getByRole("button", { name: /Scrape Semua/ }).click();
  await search.getByRole("button", { name: "Mulai Scrape" }).click();
  await search.getByRole("button", { name: /Simpan 3 ke CSV/ }).waitFor({ timeout: 30000 });
  await search.screenshot({ path: path.join(outDir, "bulk-review.png") });
  await search.getByRole("button", { name: /Simpan 3 ke CSV/ }).click();
  await search.waitForSelector("text=3 lead tersimpan", { timeout: 10000 });
  console.log("bulk: 3 lead tersimpan");

  // Ulang -> semua harus terdeteksi duplikat
  await search.getByRole("button", { name: "Scrape lagi" }).click();
  await search.getByRole("button", { name: "Mulai Scrape" }).click();
  await search.waitForSelector("text=Pilih semua (0)", { timeout: 30000 });
  console.log("bulk: scrape ulang -> semua duplikat dilewati");

  const bulkStored = await popup.evaluate(async () => {
    const { sdr_captures } = await chrome.storage.local.get("sdr_captures");
    return sdr_captures.map((c) => `${c.companyName} | ${c.phone} | ${c.websiteStatus} | ${c.address}`);
  });
  console.log("storage setelah bulk:\n  " + bulkStored.join("\n  "));
  if (bulkStored.length !== 4) throw new Error(`Harusnya 4 baris, dapat ${bulkStored.length}`);

  // 3. Dashboard harus menampilkan hasil
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await dashboard.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });
  console.log("dashboard: baris tampil");
  await dashboard.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: true });

  // 4. Export CSV harus benar
  async function exportCsv(buttonName) {
    const [download] = await Promise.all([
      dashboard.waitForEvent("download", { timeout: 10000 }),
      dashboard.getByRole("button", { name: buttonName }).click(),
    ]);
    const text = fs.readFileSync(await download.path(), "utf8");
    console.log(`[${buttonName}] file:`, download.suggestedFilename(), "bytes:", text.length);
    return text;
  }

  const csv = await exportCsv("CSV Format CRM.ID");
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  console.log("csv header:", lines[0]);
  console.log("csv row:", lines[1]);

  if (!lines[0]?.includes("*Nama") || !csv.includes("Warung Steak Pak Joko")) {
    throw new Error("Isi CSV tidak sesuai template");
  }

  const detailed = await exportCsv("CSV Lengkap (Tag & Gap)");
  const dLines = detailed.replace(/^\uFEFF/, "").split(/\r?\n/);
  console.log("detailed header:", dLines[0]);
  console.log("detailed row:", dLines[1]);
  if (!detailed.includes("Warung Steak Pak Joko")) {
    throw new Error("CSV lengkap kosong");
  }

  fs.writeFileSync(
    path.join(outDir, "e2e.json"),
    JSON.stringify({ extensionId, stored, csvHeader: lines[0], csvRow: lines[1] }, null, 2),
  );
} finally {
  await context.close();
}
