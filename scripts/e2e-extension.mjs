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

  // 2. Drawer scrape + edit tagging + simpan
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
  const mapsErrors = [];
  maps.on("pageerror", (error) => mapsErrors.push(error.message));
  await maps.route("**/maps/place/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: fixture }),
  );
  await maps.goto("https://www.google.com/maps/place/Warung+Steak/@-6.2,106.8,17z", {
    waitUntil: "domcontentloaded",
  });
  await maps.waitForSelector("sdr-capture-ui", { state: "attached", timeout: 15000 });

  await maps.getByRole("button", { name: /SDR Capture/ }).click();
  await maps.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });

  // Edit tagging sebelum simpan: toggle gap, service, prioritas, PIC, dan catatan.
  await maps.getByRole("button", { name: "No Online Order" }).click();
  await maps.getByRole("button", { name: "SEO", exact: true }).click();
  await maps.getByRole("button", { name: "Prioritas 4" }).click();
  await maps.getByPlaceholder("Nama PIC").fill("Pak Joko");
  await maps.getByPlaceholder("Jabatan PIC").fill("Owner");
  await maps.getByPlaceholder("Catatan sales...").fill("Follow up besok pagi");
  await maps.screenshot({ path: path.join(outDir, "maps-drawer.png") });

  await maps.getByRole("button", { name: "Simpan ke CSV" }).click();
  await maps.waitForSelector("text=Tersimpan ke CSV", { timeout: 15000 });
  console.log("drawer: capture + edit tagging tersimpan");

  const storedAfterSingle = await popup.evaluate(async () => {
    const { sdr_captures } = await chrome.storage.local.get("sdr_captures");
    return Array.isArray(sdr_captures) ? sdr_captures : [];
  });
  if (storedAfterSingle.length !== 1) {
    throw new Error(`Harusnya 1 baris tersimpan, dapat ${storedAfterSingle.length}`);
  }
  const first = storedAfterSingle[0];
  if (
    first.phone !== "081234567890" ||
    first.picName !== "Pak Joko" ||
    first.picRole !== "Owner" ||
    first.notes !== "Follow up besok pagi" ||
    first.priority !== 4 ||
    !first.digitalGaps.includes("no_online_ordering") ||
    !first.services.includes("seo")
  ) {
    throw new Error(`Data tagging tidak tersimpan sesuai edit: ${JSON.stringify(first)}`);
  }

  // 2b. Bulk scrape dari daftar hasil pencarian (3 punya telepon + 1 tanpa telepon)
  const places = [
    { id: "0x1:0xa1", name: "Kopi Cipete Satu", phone: "0811-1111-111", web: "" },
    {
      id: "0x1:0xa2",
      name: "Kopi Cipete Dua",
      phone: "0812-2222-222",
      web: "https://kopidua.com/",
    },
    {
      id: "0x1:0xa3",
      name: "Kopi Cipete Tiga",
      phone: "0813-3333-333",
      web: "https://www.instagram.com/kopitiga/",
    },
    {
      id: "0x1:0xa4",
      name: "Kopi Tanpa Telp",
      phone: "",
      web: "",
    },
  ];
  const searchFixture = `<!doctype html><html><head><meta charset="utf-8"><title>Search fixture</title></head>
  <body style="margin:0;display:flex;font-family:sans-serif">
    <div role="main" aria-label="Hasil" style="width:360px;height:100vh;overflow:auto">
      <div role="feed">
        ${places
          .map(
            (place) => `<div class="Nv2PK"><a class="hfpxzc" aria-label="${place.name}"
              href="https://www.google.com/maps/place/${encodeURIComponent(place.name)}/data=!4m7!3m6!1s${place.id}!8m2">${place.name}</a></div>`,
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
        const place = PLACES.find((item) => item.name === a.getAttribute("aria-label"));
        history.pushState({}, "", a.href);
        const detail = document.getElementById("detail");
        detail.innerHTML = "";
        setTimeout(() => {
          detail.innerHTML = '<div role="main">' +
            '<h1 class="DUwDvf">' + place.name + '</h1>' +
            '<button jsaction="pane.rating.category">Kedai kopi</button>' +
            '<div class="F7nice"><span aria-hidden="true">4,6</span><span>(321)</span></div>' +
            '<button data-item-id="address">\\ue0c8Jl. Cipete Raya</button>' +
            (place.phone ? '<button data-item-id="phone:tel:' + place.phone + '">' + place.phone + '</button>' : '') +
            (place.web ? '<a data-item-id="authority" href="' + place.web + '">web</a>' : '') +
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
  await search.getByRole("button", { name: /Ambil Semua/ }).waitFor({ timeout: 15000 });

  // Auto-detect: klik hasil pencarian -> drawer terbuka otomatis.
  await search.locator("a.hfpxzc").first().click();
  await search.getByRole("button", { name: "Simpan ke CSV" }).waitFor({ timeout: 15000 });
  await search.getByText("Terbaca: Kopi Cipete Satu").first().waitFor({ timeout: 10000 });
  console.log("auto-detect: klik tempat membuka drawer");
  await search.getByTitle("Tutup").click();

  await search.getByRole("button", { name: /Ambil Semua/ }).click();
  await search.getByRole("button", { name: "Mulai Ambil" }).click();
  await search.getByRole("button", { name: /Simpan 3 ke CSV/ }).waitFor({ timeout: 30000 });
  await search.getByText("Tanpa telepon").first().waitFor({ timeout: 5000 });
  await search.screenshot({ path: path.join(outDir, "bulk-review.png") });
  await search.getByRole("button", { name: /Simpan 3 ke CSV/ }).click();
  await search.waitForSelector("text=3 lead tersimpan", { timeout: 10000 });
  console.log("bulk: 3 lead tersimpan (1 tanpa telepon dilewati)");

  // Scrape ulang -> semua harus terdeteksi duplikat / tanpa telepon.
  await search.getByRole("button", { name: "Ambil Lagi" }).click();
  await search.getByRole("button", { name: "Mulai Ambil" }).click();
  await search.waitForSelector("text=Pilih semua (0)", { timeout: 30000 });
  console.log("bulk: scrape ulang -> semua duplikat dilewati");

  const bulkStored = await popup.evaluate(async () => {
    const { sdr_captures } = await chrome.storage.local.get("sdr_captures");
    return Array.isArray(sdr_captures) ? sdr_captures : [];
  });
  console.log(
    "storage setelah bulk:",
    bulkStored.map((item) => item.companyName),
  );
  if (bulkStored.length !== 4) {
    throw new Error(`Harusnya 4 baris, dapat ${bulkStored.length}`);
  }
  const bulkWithWeb = bulkStored.find((item) => item.companyName === "Kopi Cipete Dua");
  if (!bulkWithWeb || bulkWithWeb.websiteStatus !== "decent" || bulkWithWeb.priority !== 3) {
    throw new Error(`Bulk tagging tidak sesuai: ${JSON.stringify(bulkWithWeb)}`);
  }

  // 3. Tombol "Data" di drawer harus membuka dashboard dari content script
  await maps.bringToFront();
  const [dashboard] = await Promise.all([
    context.waitForEvent("page"),
    maps.getByTitle("Buka data & download CSV").click(),
  ]);
  await dashboard.waitForLoadState("domcontentloaded");
  if (!dashboard.url().endsWith("/dashboard.html")) {
    throw new Error(`Drawer membuka halaman yang salah: ${dashboard.url()}`);
  }
  await dashboard.waitForSelector("text=Warung Steak Pak Joko", { timeout: 15000 });
  await dashboard.waitForSelector("text=Pak Joko (Owner)", { timeout: 10000 });
  await dashboard.waitForSelector("text=Follow up besok pagi", { timeout: 10000 });
  if (mapsErrors.length > 0) {
    throw new Error(`Content script error: ${mapsErrors.join(" | ")}`);
  }
  console.log("drawer: tombol Data membuka dashboard");
  console.log("dashboard: baris + tagging tampil");
  await dashboard.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: true });

  // 4. Export kedua format CSV harus benar
  async function exportCsv(buttonName) {
    const [download] = await Promise.all([
      dashboard.waitForEvent("download"),
      dashboard.getByRole("button", { name: buttonName }).click(),
    ]);
    const csvPath = await download.path();
    return {
      filename: download.suggestedFilename(),
      text: fs.readFileSync(csvPath, "utf8"),
    };
  }

  const crmExport = await exportCsv("CSV CRM");
  const crmLines = crmExport.text.replace(/^\uFEFF/, "").split(/\r?\n/);
  console.log("crm csv:", crmExport.filename, "header:", crmLines[0]);
  if (
    !crmExport.filename.startsWith("crm-contact-") ||
    crmLines[0]?.split(",").length !== 13 ||
    !crmExport.text.includes("Warung Steak Pak Joko") ||
    !crmExport.text.includes("081234567890")
  ) {
    throw new Error("Isi CSV CRM tidak sesuai template 13 kolom");
  }

  const detailedExport = await exportCsv("CSV SDR Lengkap");
  const detailedLines = detailedExport.text.replace(/^\uFEFF/, "").split(/\r?\n/);
  console.log("detailed csv:", detailedExport.filename, "header:", detailedLines[0]);
  if (
    !detailedExport.filename.startsWith("sdr-leads-lengkap-") ||
    detailedLines[0]?.split(",").length !== 21 ||
    !detailedExport.text.includes("Pak Joko") ||
    !detailedExport.text.includes("Follow up besok pagi")
  ) {
    throw new Error("Isi CSV SDR lengkap tidak sesuai template 21 kolom");
  }

  fs.writeFileSync(
    path.join(outDir, "e2e.json"),
    JSON.stringify(
      {
        extensionId,
        stored: bulkStored.length,
        crmHeader: crmLines[0],
        detailedHeader: detailedLines[0],
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}
