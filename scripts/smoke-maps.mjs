/**
 * Smoke test ke Google Maps ASLI (bukan fixture).
 *
 * Jalankan manual sebelum rilis:
 *   pnpm build
 *   pnpm smoke:maps
 *
 * Yang diverifikasi:
 *   1. Scraper membaca tempat nyata dari Maps.
 *   2. Nama bukan heading umum ("Hasil").
 *   3. Alamat/telepon bersih dari glyph ikon.
 *   4. Simpan pertama menambah 1 baris.
 *   5. Simpan ulang tempat yang sama TIDAK menambah baris (dedupe).
 *
 * Butuh koneksi internet. Tidak dijalankan di `pnpm test` karena bergantung
 * pada markup Google Maps dan jaringan.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extPath = path.join(root, "apps/extension/.output/chrome-mv3");
const outDir = path.join(root, "artifacts");
const searchUrl =
  process.env.SMOKE_SEARCH_URL ?? "https://www.google.com/maps/search/steakhouse+jakarta";

if (!fs.existsSync(path.join(extPath, "manifest.json"))) {
  console.error("Build extension belum ada. Jalankan `pnpm build` dulu.");
  process.exit(1);
}

const ICON_GLYPH_RE = /[\uE000-\uF8FF]/;
const context = await chromium.launchPersistentContext(
  fs.mkdtempSync(path.join(os.tmpdir(), "sdr-smoke-")),
  {
    channel: process.env.SMOKE_CHANNEL ?? "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    viewport: { width: 1280, height: 900 },
  },
);

async function dismissConsent(page) {
  const button = page.getByRole("button", { name: /terima semua|accept all|setuju/i }).first();
  if (await button.count().catch(() => 0)) {
    await button.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
}

async function readStoredCaptures(page) {
  return page.evaluate(async () => {
    const stored = await chrome.storage.local.get("sdr_captures");
    return Array.isArray(stored.sdr_captures) ? stored.sdr_captures : [];
  });
}

try {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }
  const extensionId = new URL(serviceWorker.url()).host;

  const maps = await context.newPage();
  await maps.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await dismissConsent(maps);

  const placeLink = maps.locator('a[href*="/maps/place/"]').first();
  await placeLink.waitFor({ state: "visible", timeout: 30000 });
  await placeLink.click();

  const nameHeading = maps.locator("h1.DUwDvf").first();
  await nameHeading.waitFor({ state: "visible", timeout: 30000 });
  const expectedName = (await nameHeading.innerText()).trim();

  if (!expectedName || /^(hasil|results?|search results)$/i.test(expectedName)) {
    throw new Error(`Nama tempat tidak valid: "${expectedName}"`);
  }

  await maps.locator("sdr-capture-ui").waitFor({ state: "attached", timeout: 15000 });

  // Auto-detect biasanya membuka drawer sendiri. Kalau belum, klik pill.
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

  const leaves = await maps
    .locator("sdr-capture-ui *")
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.children.length === 0)
        .map((element) => element.innerText)
        .filter(Boolean),
    );
  const uiText = leaves.filter((text) => text.length < 300).join("\n");
  if (/Terekstrak:\s*(hasil|results?)\b/i.test(uiText)) {
    throw new Error('UI masih menangkap heading "Hasil" sebagai nama bisnis');
  }

  await maps.screenshot({ path: path.join(outDir, "smoke-maps.png") });

  // Simpan pertama.
  await maps.getByRole("button", { name: /Simpan ke CSV/ }).click();
  await maps.getByText(/Tersimpan ke CSV/).first().waitFor({ timeout: 15000 });

  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/popup.html`);
  const afterFirstSave = await readStoredCaptures(extensionPage);
  if (afterFirstSave.length !== 1) {
    throw new Error(`Harusnya 1 baris tersimpan, dapat ${afterFirstSave.length}`);
  }

  const record = afterFirstSave[0];
  if (!record.companyName?.trim()) throw new Error("companyName kosong");
  if (ICON_GLYPH_RE.test(record.address ?? "") || ICON_GLYPH_RE.test(record.phone ?? "")) {
    throw new Error("Alamat/telepon masih mengandung glyph ikon");
  }
  if (!record.category && !record.address && !record.phone) {
    throw new Error("Data tempat tidak lengkap (kategori/alamat/telepon kosong)");
  }

  // Simpan ulang tempat yang sama harus ditolak oleh dedupe.
  await maps.bringToFront();
  await maps.locator('sdr-capture-ui button[title="Scrape ulang"]').click();
  const saveAgain = maps.getByRole("button", { name: /Simpan ke CSV/ });
  await saveAgain.waitFor({ state: "visible", timeout: 15000 });
  await maps.waitForTimeout(500);
  await saveAgain.click();
  await maps.getByText(/Sudah ada di CSV/).first().waitFor({ timeout: 15000 });

  const afterSecondSave = await readStoredCaptures(extensionPage);
  if (afterSecondSave.length !== 1) {
    throw new Error(`Dedupe gagal: baris bertambah menjadi ${afterSecondSave.length}`);
  }

  const result = {
    name: record.companyName,
    category: record.category,
    address: record.address,
    phone: record.phone,
    storedRows: afterSecondSave.length,
    dedupe: "ok",
  };
  fs.writeFileSync(path.join(outDir, "smoke-maps.json"), JSON.stringify(result, null, 2));
  console.log("SMOKE PASS", JSON.stringify(result, null, 1));
} finally {
  await context.close();
}
