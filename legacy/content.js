/**
 * Content Script for Google Maps
 * High-Reliability Auto-Detection & In-Page Drawer
 */

function cleanText(text) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

const SOCIAL_MEDIA_DOMAINS = [
  { domain: "instagram.com", type: "Instagram" },
  { domain: "facebook.com", type: "Facebook" },
  { domain: "fb.com", type: "Facebook" },
  { domain: "tiktok.com", type: "TikTok" },
  { domain: "twitter.com", type: "Twitter" },
  { domain: "x.com", type: "Twitter/X" },
  { domain: "linktr.ee", type: "Linktree" },
  { domain: "campsite.bio", type: "Bio Link" },
  { domain: "bio.link", type: "Bio Link" },
  { domain: "desty.page", type: "Desty Page" },
  { domain: "beacons.ai", type: "Beacons" },
  { domain: "wa.me", type: "WhatsApp Link" },
  { domain: "whatsapp.com", type: "WhatsApp Link" },
  { domain: "gofood.co.id", type: "GoFood" },
  { domain: "gofood.link", type: "GoFood" },
  { domain: "grab.com", type: "GrabFood" },
  { domain: "shopee.co.id", type: "Shopee" },
  { domain: "tokopedia.com", type: "Tokopedia" }
];

function analyzeWebsiteUrl(url) {
  if (!url) return { isRealWebsite: false, isSocialMedia: false, socialType: null, instagramHandle: "" };
  const lower = url.toLowerCase();
  
  for (const item of SOCIAL_MEDIA_DOMAINS) {
    if (lower.includes(item.domain)) {
      let handle = "";
      if (item.type === "Instagram") {
        const match = url.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/i);
        if (match && match[1] && !["p", "explore", "stories", "reels"].includes(match[1].toLowerCase())) {
          handle = "@" + match[1];
        }
      }
      return {
        isRealWebsite: false,
        isSocialMedia: true,
        socialType: item.type,
        socialUrl: url,
        instagramHandle: handle
      };
    }
  }

  return { isRealWebsite: true, isSocialMedia: false, socialType: null, instagramHandle: "" };
}

// Extract business name from URL (High Reliability Fallback)
function getNameFromUrl() {
  try {
    const url = window.location.href;
    if (url.includes("/maps/place/")) {
      const part = url.split("/maps/place/")[1].split("/")[0].split("?")[0];
      const decoded = decodeURIComponent(part).replace(/\+/g, " ").trim();
      if (decoded && !decoded.startsWith("@")) {
        return decoded;
      }
    }
  } catch (e) {}
  return "";
}

function extractBusinessData() {
  const data = {
    companyName: "",
    category: "",
    address: "",
    phone: "",
    website: "",
    isRealWebsite: false,
    isSocialMediaOnly: false,
    socialType: null,
    socialUrl: "",
    instagramHandle: "",
    rating: "",
    reviewsCount: "",
    googleMapsUrl: window.location.href,
    scrapedAt: new Date().toISOString()
  };

  // 1. Company Name (Multi-Strategy)
  const nameSelectors = [
    "h1.DUwDvf",
    "h1[class*='fontHeadlineLarge']",
    "div[role='main'] h1",
    "div[role='heading'][aria-level='1']",
    "h1.header-title",
    "div.m6QErb h1",
    "h1"
  ];
  for (const sel of nameSelectors) {
    const el = document.querySelector(sel);
    if (el && cleanText(el.innerText)) {
      data.companyName = cleanText(el.innerText);
      break;
    }
  }
  // Fallback to URL name
  if (!data.companyName) {
    data.companyName = getNameFromUrl();
  }

  // 2. Category
  const categorySelectors = [
    "button[jsaction*='pane.rating.category']",
    "button.DkEaL",
    "span[class*='fontBodyMedium'] button[class*='fontBodyMedium']",
    "button[aria-label*='Kategori']",
    "button[jsaction*='category']"
  ];
  for (const sel of categorySelectors) {
    const el = document.querySelector(sel);
    if (el && cleanText(el.innerText)) {
      data.category = cleanText(el.innerText);
      break;
    }
  }

  // 3. Rating & Reviews
  const ratingBlock = document.querySelector("div.F7nice, div[aria-label*='bintang'], div[aria-label*='stars']");
  if (ratingBlock) {
    const ratingEl = ratingBlock.querySelector("span[aria-hidden='true']");
    if (ratingEl) {
      data.rating = cleanText(ratingEl.innerText);
    } else {
      const match = ratingBlock.getAttribute("aria-label")?.match(/([\d,\.]+)\s*(bintang|stars)/i);
      if (match) data.rating = match[1];
    }

    const reviewSpans = ratingBlock.querySelectorAll("span");
    for (const span of reviewSpans) {
      const txt = cleanText(span.innerText);
      if (txt.startsWith("(") && txt.endsWith(")")) {
        data.reviewsCount = txt.replace(/[\(\)]/g, "");
        break;
      }
    }
  }

  // 4. Address
  const addressSelectors = [
    "button[data-item-id*='address']",
    "[data-tooltip*='Salin alamat']",
    "[aria-label*='Alamat:']",
    "[aria-label*='Address:']",
    "button[aria-label*='Alamat']",
    "[data-item-id='address']"
  ];
  for (const sel of addressSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const textDiv = el.querySelector("div[class*='fontBodyMedium']") || el;
      data.address = cleanText(textDiv.innerText).replace(/^(Alamat|Address)[:\s]*/i, "");
      if (data.address) break;
    }
  }

  // 5. Phone
  const phoneSelectors = [
    "button[data-item-id*='phone:tel:']",
    "[data-tooltip*='Salin nomor telepon']",
    "[aria-label*='Telepon:']",
    "[aria-label*='Phone:']",
    "button[aria-label*='Telepon']"
  ];
  for (const sel of phoneSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const textDiv = el.querySelector("div[class*='fontBodyMedium']") || el;
      data.phone = cleanText(textDiv.innerText).replace(/^(Telepon|Phone)[:\s]*/i, "");
      if (data.phone) break;
    }
  }

  // Fallback Phone: scan for phone numbers in detail pane buttons
  if (!data.phone) {
    const allButtons = document.querySelectorAll("div[role='main'] button");
    for (const btn of allButtons) {
      const txt = cleanText(btn.innerText);
      if (/^(0\d{2,4}[-\s]?\d{4,8}|\+62[-\s]?\d{8,13})$/.test(txt.replace(/\s+/g, ""))) {
        data.phone = txt;
        break;
      }
    }
  }

  // 6. Website
  let rawWebsiteUrl = "";
  const websiteSelectors = [
    "a[data-item-id='authority']",
    "[data-tooltip*='Buka situs web']",
    "[aria-label*='Situs Web:']",
    "[aria-label*='Website:']",
    "a[aria-label*='situs web' i]",
    "a[aria-label*='website' i]"
  ];
  for (const sel of websiteSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const href = el.getAttribute("href") || "";
      const textDiv = el.querySelector("div[class*='fontBodyMedium']") || el;
      const textVal = cleanText(textDiv.innerText);
      if (href && !href.includes("google.com/search") && !href.startsWith("javascript:")) {
        rawWebsiteUrl = href;
      } else if (textVal && !textVal.toLowerCase().includes("situs web") && !textVal.toLowerCase().includes("website")) {
        rawWebsiteUrl = textVal.startsWith("http") ? textVal : "https://" + textVal;
      }
      if (rawWebsiteUrl) break;
    }
  }

  if (rawWebsiteUrl) {
    const analysis = analyzeWebsiteUrl(rawWebsiteUrl);
    if (analysis.isRealWebsite) {
      data.website = rawWebsiteUrl;
      data.isRealWebsite = true;
    } else {
      data.isRealWebsite = false;
      data.isSocialMediaOnly = true;
      data.socialType = analysis.socialType;
      data.socialUrl = rawWebsiteUrl;
      data.instagramHandle = analysis.instagramHandle;
      data.website = "";
    }
  }

  return data;
}

// -------------------------------------------------------------
// IN-PAGE FLOATING DRAWER (Shadow DOM Injected into Google Maps)
// -------------------------------------------------------------

let shadowRoot = null;
let drawerContainer = null;
let floatingPill = null;
let lastCapturedPlaceName = "";
let isDrawerOpen = false;
let autoOpenEnabled = true;

function injectInPageDrawer() {
  if (document.getElementById("sdr-drawer-host")) return;

  const host = document.createElement("div");
  host.id = "sdr-drawer-host";
  host.style.cssText = "position: fixed; z-index: 9999999; top: 0; right: 0; pointer-events: none;";
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    .floating-pill {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #4f46e5;
      color: #fff;
      padding: 10px 16px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: 2px solid #fff;
      user-select: none;
      z-index: 1000;
    }
    .floating-pill:hover { transform: scale(1.05); background: #4338ca; }
    .floating-pill.has-hot { background: #dc2626; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); }

    .drawer-panel {
      position: fixed;
      top: 14px;
      right: 14px;
      width: 385px;
      max-height: calc(100vh - 28px);
      background: #ffffff;
      color: #0f172a;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      overflow: hidden;
      transform: translateX(420px);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1001;
      font-size: 12px;
    }
    .drawer-panel.open { transform: translateX(0); }

    .drawer-header {
      background: #f8fafc;
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; }
    .badge-soft { background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .header-controls { display: flex; align-items: center; gap: 6px; }
    .btn-header {
      background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: 600;
    }
    .btn-header:hover { background: #f1f5f9; }
    .btn-close { font-size: 14px; font-weight: bold; color: #64748b; padding: 2px 6px; border: none; background: none; cursor: pointer; }
    .btn-close:hover { color: #dc2626; }

    .alert-banner {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .alert-hot { background: #fee2e2; color: #dc2626; border-bottom: 1px solid #fecaca; }
    .alert-warn { background: #fef3c7; color: #d97706; border-bottom: 1px solid #fde68a; }
    .hidden { display: none !important; }

    .drawer-body {
      padding: 12px 14px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .drawer-body::-webkit-scrollbar { width: 4px; }
    .drawer-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

    .form-group { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    input[type="text"], input[type="tel"], input[type="url"], select, textarea {
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
      width: 100%;
    }
    input:focus, select:focus, textarea:focus { border-color: #4f46e5; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .status-card {
      border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 2px; text-align: center; cursor: pointer; user-select: none;
    }
    .status-card.selected { border-color: #4f46e5; background: #e0e7ff; color: #3730a3; font-weight: 700; }
    .card-icon { font-size: 13px; margin-bottom: 2px; }
    .card-title { font-size: 10px; }

    .chips-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .chip {
      padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; cursor: pointer; user-select: none;
    }
    .chip.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }

    .gaps-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
    .gap-item { display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; }
    .gap-item input { accent-color: #4f46e5; }

    .drawer-footer {
      background: #f8fafc;
      padding: 10px 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .action-row { display: flex; gap: 6px; }
    .btn-submit {
      flex: 2; background: #4f46e5; color: #fff; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;
    }
    .btn-submit:hover { background: #4338ca; }
    .btn-skip {
      flex: 1; background: #fff; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; color: #64748b;
    }
    .btn-skip:hover { background: #f1f5f9; }

    .toggle-auto { display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; }
  `;
  shadowRoot.appendChild(style);

  // Floating Pill
  floatingPill = document.createElement("div");
  floatingPill.className = "floating-pill";
  floatingPill.innerHTML = `<span>🎯 SDR Capture</span> <span id="pillBadge" class="badge-soft">Ready</span>`;
  floatingPill.onclick = () => {
    forceSyncCurrentPlace();
    toggleDrawer(true);
  };
  shadowRoot.appendChild(floatingPill);

  // Drawer Panel
  drawerContainer = document.createElement("div");
  drawerContainer.className = "drawer-panel";
  drawerContainer.innerHTML = `
    <div class="drawer-header">
      <div class="header-title">
        <span>🎯 SDR Lead Capture</span>
        <span class="badge-soft">Software Sales</span>
      </div>
      <div class="header-controls">
        <button id="btnSyncNow" class="btn-header" title="Ambil Ulang Data Tempat Ini">🔄 Sync</button>
        <button id="btnStagingQueue" class="btn-header" title="Buka Staging Queue">📋 Queue</button>
        <button id="btnMin" class="btn-header" title="Minimize">—</button>
        <button id="btnClose" class="btn-close" title="Close">✕</button>
      </div>
    </div>

    <div id="hotAlert" class="alert-banner alert-hot hidden">
      <span>🔥</span> <span id="hotAlertText">HOT LEAD — Tidak punya website!</span>
    </div>

    <div class="drawer-body">
      <div class="form-group">
        <label>Nama Bisnis *</label>
        <input type="text" id="dwName" placeholder="Nama Bisnis">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label>Industri *</label>
          <select id="dwIndustry">
            <option value="F&B / Restaurant">F&B / Restaurant</option>
            <option value="Retail / Toko">Retail / Toko</option>
            <option value="Klinik / Healthcare">Klinik / Healthcare</option>
            <option value="Salon / Beauty">Salon / Beauty</option>
            <option value="Gym / Fitness">Gym / Fitness</option>
            <option value="Jasa / Services">Jasa / Services</option>
            <option value="Property / Real Estate">Property / Real Estate</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div class="form-group">
          <label>Google Rating</label>
          <input type="text" id="dwRating" placeholder="4.5 (1.2K reviews)" readonly style="background:#f1f5f9;">
        </div>
      </div>

      <div class="form-group">
        <label>Alamat</label>
        <input type="text" id="dwAddress" placeholder="Alamat lengkap">
      </div>

      <!-- Digital Presence Assessment -->
      <div class="form-group">
        <label>Status Website Calon Klien *</label>
        <div class="status-grid" id="dwStatusGrid">
          <div class="status-card selected" data-status="none">
            <div class="card-icon">🚫</div>
            <div class="card-title">No Web</div>
          </div>
          <div class="status-card" data-status="outdated">
            <div class="card-icon">👴</div>
            <div class="card-title">Outdated</div>
          </div>
          <div class="status-card" data-status="bad-ux">
            <div class="card-icon">😵</div>
            <div class="card-title">Bad UX</div>
          </div>
          <div class="status-card" data-status="decent">
            <div class="card-icon">🤷</div>
            <div class="card-title">Lumayan</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>URL Website (kalau ada)</label>
        <input type="url" id="dwWebUrl" placeholder="Kosongkan jika tidak ada website">
      </div>

      <!-- Digital Gaps -->
      <div class="form-group">
        <label>Digital Gaps:</label>
        <div class="gaps-box">
          <label class="gap-item"><input type="checkbox" id="dwGapNoWeb" checked> 🚫 Tidak punya website</label>
          <label class="gap-item"><input type="checkbox" id="dwGapMobile" checked> 📱 Tidak mobile friendly</label>
          <label class="gap-item"><input type="checkbox" id="dwGapOrdering" checked> 🛒 Tidak ada order/booking online</label>
          <label class="gap-item"><input type="checkbox" id="dwGapSocialOnly" checked> 📲 Cuma pakai Instagram/Medsos</label>
        </div>
      </div>

      <!-- Service Opportunities -->
      <div class="form-group">
        <label>Peluang Jasa Software Kita:</label>
        <div class="chips-wrap" id="dwChips">
          <span class="chip active" data-s="Website Development">🌐 Website Dev</span>
          <span class="chip active" data-s="E-Commerce / Ordering">🛒 E-Commerce</span>
          <span class="chip" data-s="UI/UX Redesign">🎨 Redesign</span>
          <span class="chip" data-s="Mobile App">📱 Mobile App</span>
          <span class="chip" data-s="Custom Software">⚙️ Custom SW</span>
          <span class="chip" data-s="SEO Optimization">📈 SEO</span>
        </div>
      </div>

      <!-- Contacts -->
      <div class="grid-2">
        <div class="form-group">
          <label>Telepon *</label>
          <input type="tel" id="dwPhone" placeholder="021-xxx / 08xx">
        </div>
        <div class="form-group">
          <label>WhatsApp</label>
          <input type="tel" id="dwWA" placeholder="08xxxxxxxx">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label>Instagram</label>
          <input type="text" id="dwIG" placeholder="@username">
        </div>
        <div class="form-group">
          <label>Nama PIC</label>
          <input type="text" id="dwPIC" placeholder="Owner / Mgr">
        </div>
      </div>

      <div class="form-group">
        <label>Catatan untuk Kepala Sales</label>
        <textarea id="dwNotes" rows="2" placeholder="Catatan analisa lead..."></textarea>
      </div>
    </div>

    <div class="drawer-footer">
      <div class="action-row">
        <button id="dwBtnSkip" class="btn-skip">🚫 Skip</button>
        <button id="dwBtnSubmit" class="btn-submit">✅ Submit ke Staging</button>
      </div>
      <div class="toggle-auto">
        <label style="cursor:pointer; text-transform:none;"><input type="checkbox" id="chkAutoOpen" checked> Auto-muncul saat klik tempat di Maps</label>
        <span id="syncStatus" style="font-size:10px; color:#4f46e5;"></span>
      </div>
    </div>
  `;
  shadowRoot.appendChild(drawerContainer);

  bindDrawerEvents();
}

function bindDrawerEvents() {
  const btnClose = shadowRoot.getElementById("btnClose");
  const btnMin = shadowRoot.getElementById("btnMin");
  const btnStaging = shadowRoot.getElementById("btnStagingQueue");
  const btnSync = shadowRoot.getElementById("btnSyncNow");
  const btnSubmit = shadowRoot.getElementById("dwBtnSubmit");
  const btnSkip = shadowRoot.getElementById("dwBtnSkip");
  const chkAuto = shadowRoot.getElementById("chkAutoOpen");

  btnClose.onclick = () => toggleDrawer(false);
  btnMin.onclick = () => toggleDrawer(false);
  btnSync.onclick = () => forceSyncCurrentPlace();
  btnStaging.onclick = () => window.open(chrome.runtime.getURL("leads.html"), "_blank");

  chkAuto.onchange = (e) => { autoOpenEnabled = e.target.checked; };

  // Status grid
  shadowRoot.querySelectorAll(".status-card").forEach(c => {
    c.onclick = () => {
      shadowRoot.querySelectorAll(".status-card").forEach(sc => sc.classList.remove("selected"));
      c.classList.add("selected");
      const st = c.dataset.status;
      const gapNoWeb = shadowRoot.getElementById("dwGapNoWeb");
      const webUrl = shadowRoot.getElementById("dwWebUrl");
      if (st === "none") {
        gapNoWeb.checked = true;
        webUrl.value = "";
      } else {
        gapNoWeb.checked = false;
      }
      updateDrawerAlert(st);
    };
  });

  // Chips
  shadowRoot.querySelectorAll(".chip").forEach(cp => {
    cp.onclick = () => cp.classList.toggle("active");
  });

  // Phone -> WA
  shadowRoot.getElementById("dwPhone").oninput = (e) => {
    const val = e.target.value.trim();
    if (val.startsWith("08") || val.startsWith("+628") || val.startsWith("628")) {
      const wa = shadowRoot.getElementById("dwWA");
      if (!wa.value) wa.value = val;
    }
  };

  btnSubmit.onclick = () => saveInPageLead();
  btnSkip.onclick = () => toggleDrawer(false);
}

function toggleDrawer(open) {
  isDrawerOpen = open;
  if (open) {
    drawerContainer.classList.add("open");
    floatingPill.style.display = "none";
  } else {
    drawerContainer.classList.remove("open");
    floatingPill.style.display = "flex";
  }
}

function updateDrawerAlert(status) {
  const alert = shadowRoot.getElementById("hotAlert");
  const text = shadowRoot.getElementById("hotAlertText");
  const pillBadge = shadowRoot.getElementById("pillBadge");

  if (status === "none") {
    alert.className = "alert-banner alert-hot";
    alert.classList.remove("hidden");
    text.textContent = "🔥 HOT LEAD — Tidak punya website!";
    pillBadge.textContent = "🔥 HOT LEAD";
    pillBadge.style.background = "#dc2626";
    pillBadge.style.color = "#fff";
    floatingPill.classList.add("has-hot");
  } else if (status === "outdated" || status === "bad-ux") {
    alert.className = "alert-banner alert-warn";
    alert.classList.remove("hidden");
    text.textContent = "⚠️ Potensi Redesign / Modernisasi Web!";
    pillBadge.textContent = "Potential";
    pillBadge.style.background = "#d97706";
    pillBadge.style.color = "#fff";
    floatingPill.classList.remove("has-hot");
  } else {
    alert.classList.add("hidden");
    pillBadge.textContent = "Ready";
    pillBadge.style.background = "#e0e7ff";
    pillBadge.style.color = "#3730a3";
    floatingPill.classList.remove("has-hot");
  }
}

function populateDrawer(data) {
  if (!shadowRoot) injectInPageDrawer();

  // If company name not found, don't overwrite if existing has value
  if (data.companyName) {
    shadowRoot.getElementById("dwName").value = data.companyName;
  }
  if (data.address) {
    shadowRoot.getElementById("dwAddress").value = data.address;
  }
  if (data.phone) {
    shadowRoot.getElementById("dwPhone").value = data.phone;
    if (data.phone.startsWith("08") || data.phone.startsWith("+628")) {
      shadowRoot.getElementById("dwWA").value = data.phone;
    }
  }

  const ratingStr = [data.rating ? `⭐ ${data.rating}` : "", data.reviewsCount ? `(${data.reviewsCount})` : ""].filter(Boolean).join(" ");
  if (ratingStr) {
    shadowRoot.getElementById("dwRating").value = ratingStr;
  }

  // Category mapping
  if (data.category) {
    const c = data.category.toLowerCase();
    const indSelect = shadowRoot.getElementById("dwIndustry");
    if (c.includes("restoran") || c.includes("restaurant") || c.includes("cafe") || c.includes("kopi") || c.includes("warung") || c.includes("bakso") || c.includes("sate")) {
      indSelect.value = "F&B / Restaurant";
    } else if (c.includes("toko") || c.includes("store") || c.includes("retail") || c.includes("supermarket")) {
      indSelect.value = "Retail / Toko";
    } else if (c.includes("klinik") || c.includes("dental") || c.includes("apotek") || c.includes("dokter") || c.includes("health")) {
      indSelect.value = "Klinik / Healthcare";
    } else if (c.includes("salon") || c.includes("barbershop") || c.includes("beauty") || c.includes("spa")) {
      indSelect.value = "Salon / Beauty";
    }
  }

  const statusCards = shadowRoot.querySelectorAll(".status-card");
  statusCards.forEach(c => c.classList.remove("selected"));

  const gapNoWeb = shadowRoot.getElementById("dwGapNoWeb");
  const gapSocialOnly = shadowRoot.getElementById("dwGapSocialOnly");
  const webInput = shadowRoot.getElementById("dwWebUrl");
  const igInput = shadowRoot.getElementById("dwIG");
  const notesInput = shadowRoot.getElementById("dwNotes");

  if (data.isSocialMediaOnly) {
    shadowRoot.querySelector(".status-card[data-status='none']").classList.add("selected");
    gapNoWeb.checked = true;
    gapSocialOnly.checked = true;
    webInput.value = "";
    if (data.instagramHandle) igInput.value = data.instagramHandle;
    notesInput.value = `Hanya ada link ${data.socialType}: ${data.socialUrl}. Belum ada website resmi.`;
    updateDrawerAlert("none");
  } else if (!data.isRealWebsite || !data.website) {
    shadowRoot.querySelector(".status-card[data-status='none']").classList.add("selected");
    gapNoWeb.checked = true;
    webInput.value = "";
    updateDrawerAlert("none");
  } else {
    shadowRoot.querySelector(".status-card[data-status='decent']").classList.add("selected");
    gapNoWeb.checked = false;
    webInput.value = data.website;
    updateDrawerAlert("decent");
  }

  const syncStatus = shadowRoot.getElementById("syncStatus");
  if (syncStatus) {
    syncStatus.textContent = "Synced ✓";
    setTimeout(() => { syncStatus.textContent = ""; }, 1500);
  }
}

function forceSyncCurrentPlace() {
  const data = extractBusinessData();
  populateDrawer(data);
}

async function saveInPageLead() {
  const name = shadowRoot.getElementById("dwName").value.trim();
  const phone = shadowRoot.getElementById("dwPhone").value.trim();

  if (!name) {
    alert("Nama bisnis wajib diisi!");
    return;
  }

  const selectedStatusCard = shadowRoot.querySelector(".status-card.selected");
  const status = selectedStatusCard ? selectedStatusCard.dataset.status : "none";

  const services = Array.from(shadowRoot.querySelectorAll("#dwChips .chip.active")).map(c => c.dataset.s);
  const gaps = [];
  if (shadowRoot.getElementById("dwGapNoWeb").checked) gaps.push("No Website");
  if (shadowRoot.getElementById("dwGapMobile").checked) gaps.push("Not Mobile Friendly");
  if (shadowRoot.getElementById("dwGapOrdering").checked) gaps.push("No Online Ordering");
  if (shadowRoot.getElementById("dwGapSocialOnly").checked) gaps.push("Instagram/Medsos Only");

  const lead = {
    id: "lead_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    companyName: name,
    industry: shadowRoot.getElementById("dwIndustry").value,
    address: shadowRoot.getElementById("dwAddress").value.trim(),
    phone,
    whatsapp: shadowRoot.getElementById("dwWA").value.trim(),
    website: shadowRoot.getElementById("dwWebUrl").value.trim(),
    instagram: shadowRoot.getElementById("dwIG").value.trim(),
    picName: shadowRoot.getElementById("dwPIC").value.trim(),
    ratingReviews: shadowRoot.getElementById("dwRating").value,
    websiteStatus: status,
    digitalGaps: gaps,
    servicesOffered: services,
    dealSize: "Medium (10-50 jt)",
    priority: status === "none" ? 5 : 3,
    notes: shadowRoot.getElementById("dwNotes").value.trim(),
    sourceUrl: window.location.href,
    isHotLead: status === "none",
    status: "APPROVED_STAGING",
    createdAt: new Date().toISOString()
  };

  const { sdr_staging_leads = [] } = await chrome.storage.local.get("sdr_staging_leads");
  sdr_staging_leads.unshift(lead);
  await chrome.storage.local.set({ sdr_staging_leads });

  // Update daily stats
  const d = new Date();
  const key = `sdr_stats_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  const data = await chrome.storage.local.get([key]);
  const stats = data[key] || { submitted: 0, hotLeads: 0 };
  stats.submitted = (stats.submitted || 0) + 1;
  if (lead.isHotLead) stats.hotLeads = (stats.hotLeads || 0) + 1;
  await chrome.storage.local.set({ [key]: stats });

  const btnSubmit = shadowRoot.getElementById("dwBtnSubmit");
  btnSubmit.textContent = "✅ Berhasil Masuk Staging!";
  btnSubmit.style.background = "#16a34a";

  setTimeout(() => {
    btnSubmit.textContent = "✅ Submit ke Staging";
    btnSubmit.style.background = "#4f46e5";
    toggleDrawer(false);
  }, 900);
}

// -------------------------------------------------------------
// RELIABLE DETECTION ENGINE: Click Interception + URL Poller
// -------------------------------------------------------------

function handlePlaceChange(triggerSource) {
  // Staged extraction: Maps DOM renders asynchronously in waves
  [100, 450, 1000].forEach(delay => {
    setTimeout(() => {
      const data = extractBusinessData();
      if (data.companyName && data.companyName !== lastCapturedPlaceName) {
        lastCapturedPlaceName = data.companyName;
        populateDrawer(data);
        if (autoOpenEnabled) {
          toggleDrawer(true);
        }
      } else if (data.companyName) {
        // Same place, but newer fields (phone/website) might have finished loading
        populateDrawer(data);
      }
    }, delay);
  });
}

function initDetectionEngine() {
  injectInPageDrawer();

  // 1. Click Event Listener (Instant response when user clicks any search result)
  document.addEventListener("click", (e) => {
    const target = e.target.closest("a[href*='/maps/place/'], div.Nv2PK, div.hfpxzc, [jsaction*='pane.wfvdle']");
    if (target) {
      // User clicked a place in the search list!
      setTimeout(() => {
        handlePlaceChange("click");
      }, 150);
    }
  }, true);

  // 2. URL Poller (Catches navigation, back/forward, direct clicks)
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (currentUrl.includes("/maps/place/")) {
        handlePlaceChange("url_change");
      }
    }
  }, 300);

  // 3. Initial check if page opens directly on a place
  if (window.location.href.includes("/maps/place/")) {
    handlePlaceChange("initial_load");
  }
}

// Start
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetectionEngine);
} else {
  initDetectionEngine();
}

// Fallback message listener for top toolbar extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_MAPS") {
    try {
      const scraped = extractBusinessData();
      sendResponse({ success: true, data: scraped });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});
