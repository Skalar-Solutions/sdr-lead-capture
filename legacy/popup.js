/**
 * SDR Lead Capture - Popup Logic (Updated with Smart Social Media / Linktree Filter)
 */

const DAILY_TARGET = 25;
const RATING_LABELS = ["", "Low Priority", "Low-Med", "Medium", "High Priority", "🔥 Hot Lead!"];

let currentTab = null;
let currentScrapedData = null;
let currentPriority = 4;
let currentWebsiteStatus = "none";

// DOM Elements
const sourceLabel = document.getElementById("sourceLabel");
const duplicateBanner = document.getElementById("duplicateBanner");
const duplicateText = document.getElementById("duplicateText");
const hotLeadBanner = document.getElementById("hotLeadBanner");
const hotLeadText = document.getElementById("hotLeadText");
const digitalScoreBadge = document.getElementById("digitalScoreBadge");
const priorityLabel = document.getElementById("priorityLabel");

// Form inputs
const companyNameInput = document.getElementById("companyName");
const industryInput = document.getElementById("industry");
const branchesInput = document.getElementById("branches");
const ratingReviewsInput = document.getElementById("ratingReviews");
const mapsCategoryInput = document.getElementById("mapsCategory");
const addressInput = document.getElementById("address");
const websiteUrlInput = document.getElementById("websiteUrl");
const phoneInput = document.getElementById("phone");
const whatsappInput = document.getElementById("whatsapp");
const emailInput = document.getElementById("email");
const instagramInput = document.getElementById("instagram");
const picNameInput = document.getElementById("picName");
const picRoleInput = document.getElementById("picRole");
const dealSizeInput = document.getElementById("dealSize");
const notesInput = document.getElementById("notes");

// Gaps
const gapNoWeb = document.getElementById("gapNoWeb");
const gapMobile = document.getElementById("gapMobile");
const gapOrdering = document.getElementById("gapOrdering");
const gapInstagramOnly = document.getElementById("gapInstagramOnly");
const gapNoSeo = document.getElementById("gapNoSeo");
const gapNoPayment = document.getElementById("gapNoPayment");

// Buttons
const btnRescrape = document.getElementById("btnRescrape");
const btnSubmit = document.getElementById("btnSubmit");
const btnDraft = document.getElementById("btnDraft");
const btnSkip = document.getElementById("btnSkip");
const btnViewLeads = document.getElementById("btnViewLeads");

// Stats elements
const statSubmitted = document.getElementById("statSubmitted");
const statDrafts = document.getElementById("statDrafts");
const statHotLeads = document.getElementById("statHotLeads");
const targetProgressBar = document.getElementById("targetProgressBar");
const targetText = document.getElementById("targetText");

// Initialize on Load
document.addEventListener("DOMContentLoaded", async () => {
  await loadStats();
  setupEventListeners();
  initTabAndScrape();
});

// Setup click and change events
function setupEventListeners() {
  btnRescrape.addEventListener("click", () => scrapeFromCurrentTab());
  btnSubmit.addEventListener("click", () => handleSaveLead("APPROVED_STAGING"));
  btnDraft.addEventListener("click", () => handleSaveLead("DRAFT"));
  btnSkip.addEventListener("click", () => handleSkipLead());
  btnViewLeads.addEventListener("click", () => {
    chrome.tabs.create({ url: "leads.html" });
  });

  // Website status cards
  document.querySelectorAll(".status-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".status-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      currentWebsiteStatus = card.dataset.status;

      if (currentWebsiteStatus === "none") {
        gapNoWeb.checked = true;
        websiteUrlInput.value = "";
      } else {
        gapNoWeb.checked = false;
      }
      updateDigitalScoreAndBanner();
    });
  });

  // Gaps checkboxes change
  [gapNoWeb, gapMobile, gapOrdering, gapInstagramOnly, gapNoSeo, gapNoPayment].forEach(cb => {
    cb.addEventListener("change", () => updateDigitalScoreAndBanner());
  });

  // Service chips toggle
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
    });
  });

  // Priority stars
  document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", () => {
      const r = parseInt(star.dataset.rating);
      setPriority(r);
    });
  });

  // Auto-detect phone / whatsapp sync
  phoneInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val.startsWith("08") || val.startsWith("+628") || val.startsWith("628")) {
      if (!whatsappInput.value) {
        whatsappInput.value = val;
      }
    }
  });

  // Check duplicate when name changes
  companyNameInput.addEventListener("blur", () => {
    checkDuplicate(companyNameInput.value, phoneInput.value);
  });
}

function setPriority(rating) {
  currentPriority = rating;
  document.querySelectorAll(".star").forEach((s, idx) => {
    s.classList.toggle("active", idx < rating);
  });
  priorityLabel.textContent = RATING_LABELS[rating] || "Medium";
  if (rating === 5) {
    priorityLabel.style.color = "var(--danger)";
  } else if (rating >= 4) {
    priorityLabel.style.color = "var(--warning)";
  } else {
    priorityLabel.style.color = "var(--text-muted)";
  }
}

// Check active tab and trigger scraping
async function initTabAndScrape() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab || !tab.url) {
      sourceLabel.textContent = "Tab tidak terdeteksi";
      return;
    }

    if (tab.url.includes("google.com/maps") || tab.url.includes("google.co.id/maps")) {
      sourceLabel.textContent = "Google Maps terdeteksi";
      scrapeFromCurrentTab();
    } else {
      sourceLabel.textContent = "Bukan Google Maps (Mode Input Manual)";
      btnRescrape.style.display = "none";
    }
  } catch (err) {
    console.error("Tab query error:", err);
    sourceLabel.textContent = "Mode input manual";
  }
}

function scrapeFromCurrentTab() {
  if (!currentTab || !currentTab.id) return;
  sourceLabel.textContent = "Mengekstrak data Maps...";

  chrome.tabs.sendMessage(currentTab.id, { action: "SCRAPE_MAPS" }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(currentTab.id, { action: "SCRAPE_MAPS" }, (res2) => {
          if (res2 && res2.success) {
            populateFormWithData(res2.data);
          } else {
            sourceLabel.textContent = "Silakan klik salah satu tempat di Maps";
          }
        });
      });
      return;
    }

    populateFormWithData(response.data);
  });
}

function populateFormWithData(data) {
  currentScrapedData = data;
  sourceLabel.textContent = data.companyName ? `Terekstrak: ${data.companyName.substring(0, 24)}...` : "Data berhasil diekstrak";

  if (data.companyName) companyNameInput.value = data.companyName;
  if (data.address) addressInput.value = data.address;
  if (data.phone) phoneInput.value = data.phone;

  if (data.category) {
    mapsCategoryInput.value = data.category;
    mapCategoryToDropdown(data.category);
  }

  const ratingStr = [data.rating ? `⭐ ${data.rating}` : "", data.reviewsCount ? `(${data.reviewsCount} reviews)` : ""].filter(Boolean).join(" ");
  if (ratingStr) {
    ratingReviewsInput.value = ratingStr;
  }

  // Handle Social Media / Linktree disguised as website
  if (data.isSocialMediaOnly) {
    currentWebsiteStatus = "none";
    selectStatusCard("none");
    gapNoWeb.checked = true;
    gapInstagramOnly.checked = true;
    websiteUrlInput.value = ""; // No real website

    if (data.instagramHandle) {
      instagramInput.value = data.instagramHandle;
    } else if (data.socialType === "Instagram") {
      instagramInput.value = data.socialUrl;
    }

    notesInput.value = `Link di Maps cuma ${data.socialType}: ${data.socialUrl}. Belum punya website resmi.`;

    hotLeadBanner.classList.remove("hidden");
    hotLeadText.textContent = `🔥 HOT LEAD — 'Website' di Maps cuma link ${data.socialType}! Tidak ada website resmi.`;
    setPriority(5); // Hot lead!
  } else if (!data.isRealWebsite || !data.website) {
    // Absolutely no link at all
    currentWebsiteStatus = "none";
    selectStatusCard("none");
    gapNoWeb.checked = true;
    websiteUrlInput.value = "";
    hotLeadBanner.classList.remove("hidden");
    hotLeadText.textContent = "🔥 HOT LEAD — Bisnis ini TIDAK punya website!";
    setPriority(5);
  } else {
    // Real website exists
    currentWebsiteStatus = "decent";
    selectStatusCard("decent");
    gapNoWeb.checked = false;
    websiteUrlInput.value = data.website;
    hotLeadBanner.classList.add("hidden");
    setPriority(3);
  }

  updateDigitalScoreAndBanner();
  checkDuplicate(data.companyName, data.phone);
}

function selectStatusCard(status) {
  document.querySelectorAll(".status-card").forEach(c => {
    c.classList.toggle("selected", c.dataset.status === status);
  });
}

function mapCategoryToDropdown(cat) {
  const c = cat.toLowerCase();
  const select = industryInput;
  if (c.includes("restoran") || c.includes("restaurant") || c.includes("cafe") || c.includes("kopi") || c.includes("warung") || c.includes("bakso") || c.includes("sate")) {
    select.value = "F&B / Restaurant";
  } else if (c.includes("toko") || c.includes("store") || c.includes("retail") || c.includes("supermarket")) {
    select.value = "Retail / Toko";
  } else if (c.includes("klinik") || c.includes("dental") || c.includes("apotek") || c.includes("dokter") || c.includes("health")) {
    select.value = "Klinik / Healthcare";
  } else if (c.includes("salon") || c.includes("barbershop") || c.includes("beauty") || c.includes("spa")) {
    select.value = "Salon / Beauty";
  } else if (c.includes("gym") || c.includes("fitness")) {
    select.value = "Gym / Fitness";
  } else if (c.includes("property") || c.includes("real estate") || c.includes("agen")) {
    select.value = "Property / Real Estate";
  }
}

function updateDigitalScoreAndBanner() {
  const gaps = [gapNoWeb, gapMobile, gapOrdering, gapInstagramOnly, gapNoSeo, gapNoPayment];
  const checkedGaps = gaps.filter(g => g.checked).length;

  let score = Math.max(1, 10 - (checkedGaps * 1.5));
  if (currentWebsiteStatus === "none") score = Math.min(score, 2);
  else if (currentWebsiteStatus === "outdated") score = Math.min(score, 4);
  else if (currentWebsiteStatus === "bad-ux") score = Math.min(score, 3);

  score = Math.round(score);

  digitalScoreBadge.textContent = `Score: ${score}/10 ${score <= 3 ? "🔥" : ""}`;
  digitalScoreBadge.className = "score-badge " + (score <= 3 ? "hot" : score <= 6 ? "warn" : "good");

  if (currentWebsiteStatus === "none" || gapNoWeb.checked) {
    hotLeadBanner.classList.remove("hidden");
    if (!hotLeadText.textContent.includes("Link")) {
      hotLeadText.textContent = "🔥 HOT LEAD — Bisnis ini TIDAK punya website!";
    }
  } else if (currentWebsiteStatus === "outdated" || currentWebsiteStatus === "bad-ux") {
    hotLeadBanner.classList.remove("hidden");
    hotLeadText.textContent = "⚠️ Potensi Redesign / Modernisasi Web & App!";
  } else {
    hotLeadBanner.classList.add("hidden");
  }
}

// Check duplicate from local storage
async function checkDuplicate(name, phone) {
  if (!name && !phone) {
    duplicateBanner.classList.add("hidden");
    return;
  }

  const { sdr_staging_leads = [] } = await chrome.storage.local.get("sdr_staging_leads");
  const cleanName = (name || "").toLowerCase().trim();
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");

  const duplicate = sdr_staging_leads.find(l => {
    const lName = (l.companyName || "").toLowerCase().trim();
    const lPhone = (l.phone || "").replace(/[^\d]/g, "");
    return (cleanName && lName && (lName.includes(cleanName) || cleanName.includes(lName))) ||
           (cleanPhone && lPhone && cleanPhone.length > 6 && lPhone === cleanPhone);
  });

  if (duplicate) {
    duplicateBanner.classList.remove("hidden");
    duplicateText.textContent = `⚠️ Lead serupa sudah ada: "${duplicate.companyName}" (${duplicate.status})`;
  } else {
    duplicateBanner.classList.add("hidden");
  }
}

// Save lead to local staging database
async function handleSaveLead(status) {
  const companyName = companyNameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!companyName) {
    alert("Harap isi Nama Bisnis / Perusahaan!");
    companyNameInput.focus();
    return;
  }

  if (status === "APPROVED_STAGING" && !phone) {
    const confirmNoPhone = confirm("Nomor telepon kosong. Tetap submit lead ini ke staging?");
    if (!confirmNoPhone) {
      phoneInput.focus();
      return;
    }
  }

  const activeServices = Array.from(document.querySelectorAll("#serviceChips .chip.active"))
    .map(c => c.dataset.service);

  const selectedGaps = [];
  if (gapNoWeb.checked) selectedGaps.push("No Website");
  if (gapMobile.checked) selectedGaps.push("Not Mobile Friendly");
  if (gapOrdering.checked) selectedGaps.push("No Online Ordering");
  if (gapInstagramOnly.checked) selectedGaps.push("Instagram/Medsos Only");
  if (gapNoSeo.checked) selectedGaps.push("No SEO/Analytics");
  if (gapNoPayment.checked) selectedGaps.push("No Online Payment");

  const lead = {
    id: "lead_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    companyName,
    industry: industryInput.value,
    branches: branchesInput.value,
    address: addressInput.value.trim(),
    phone,
    whatsapp: whatsappInput.value.trim(),
    email: emailInput.value.trim(),
    website: websiteUrlInput.value.trim(),
    instagram: instagramInput.value.trim(),
    picName: picNameInput.value.trim(),
    picRole: picRoleInput.value,
    ratingReviews: ratingReviewsInput.value,
    mapsCategory: mapsCategoryInput.value,
    websiteStatus: currentWebsiteStatus,
    digitalGaps: selectedGaps,
    servicesOffered: activeServices,
    dealSize: dealSizeInput.value,
    priority: currentPriority,
    notes: notesInput.value.trim(),
    sourceUrl: currentTab?.url || "",
    isHotLead: currentWebsiteStatus === "none" || currentPriority === 5,
    status: status,
    createdAt: new Date().toISOString()
  };

  const { sdr_staging_leads = [] } = await chrome.storage.local.get("sdr_staging_leads");
  sdr_staging_leads.unshift(lead);
  await chrome.storage.local.set({ sdr_staging_leads });

  await incrementDailyStats(status, lead.isHotLead);

  btnSubmit.textContent = status === "DRAFT" ? "💾 Tersimpan Draft!" : "✅ Berhasil Masuk Staging!";
  btnSubmit.style.backgroundColor = "var(--success)";

  setTimeout(() => {
    window.close();
  }, 900);
}

async function handleSkipLead() {
  await incrementDailyStats("SKIPPED", false);
  btnSkip.textContent = "⏭️ Dilewati";
  setTimeout(() => {
    window.close();
  }, 400);
}

function getTodayKey() {
  const d = new Date();
  return `sdr_stats_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

async function loadStats() {
  const key = getTodayKey();
  const data = await chrome.storage.local.get([key]);
  const stats = data[key] || { submitted: 0, drafts: 0, skipped: 0, hotLeads: 0 };

  statSubmitted.textContent = stats.submitted || 0;
  statDrafts.textContent = stats.drafts || 0;
  statHotLeads.textContent = `${stats.hotLeads || 0} 🔥`;

  const totalDone = (stats.submitted || 0);
  const pct = Math.min(100, Math.round((totalDone / DAILY_TARGET) * 100));
  targetProgressBar.style.width = pct + "%";
  targetText.textContent = `${totalDone} / ${DAILY_TARGET} leads`;
}

async function incrementDailyStats(action, isHot) {
  const key = getTodayKey();
  const data = await chrome.storage.local.get([key]);
  const stats = data[key] || { submitted: 0, drafts: 0, skipped: 0, hotLeads: 0 };

  if (action === "APPROVED_STAGING") {
    stats.submitted = (stats.submitted || 0) + 1;
    if (isHot) stats.hotLeads = (stats.hotLeads || 0) + 1;
  } else if (action === "DRAFT") {
    stats.drafts = (stats.drafts || 0) + 1;
  } else if (action === "SKIPPED") {
    stats.skipped = (stats.skipped || 0) + 1;
  }

  await chrome.storage.local.set({ [key]: stats });
  await loadStats();
}
