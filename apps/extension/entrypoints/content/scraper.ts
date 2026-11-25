/**
 * Scraper Google Maps.
 *
 * Semua fungsi menerima `root` supaya bisa dites dengan fixture HTML
 * (tanpa harus buka Google Maps beneran).
 */

export interface ScrapedPlace {
  companyName: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  isRealWebsite: boolean;
  isSocialMediaOnly: boolean;
  socialType: string | null;
  socialUrl: string;
  instagramHandle: string;
  rating: string;
  reviewsCount: string;
  mapsUrl: string;
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
  { domain: "tokopedia.com", type: "Tokopedia" },
] as const;

const PHONE_FALLBACK_RE = /^(0\d{2,4}[-\s]?\d{4,8}|\+62[-\s]?\d{8,13})$/;

export interface WebsiteAnalysis {
  isRealWebsite: boolean;
  isSocialMedia: boolean;
  socialType: string | null;
  instagramHandle: string;
}

export function cleanText(text: string | null | undefined): string {
  // Google Maps menyisipkan ikon font (Unicode Private Use Area, mis. U+E0C8)
  // di depan alamat/telepon. Buang supaya tidak ikut ke tampilan & CSV.
  return (text ?? "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeWebsiteUrl(url: string): WebsiteAnalysis {
  if (!url) {
    return { isRealWebsite: false, isSocialMedia: false, socialType: null, instagramHandle: "" };
  }

  const lower = url.toLowerCase();
  for (const entry of SOCIAL_MEDIA_DOMAINS) {
    if (!lower.includes(entry.domain)) continue;

    let instagramHandle = "";
    if (entry.type === "Instagram") {
      const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
      const handle = match?.[1];
      if (handle && !["p", "explore", "stories", "reels"].includes(handle.toLowerCase())) {
        instagramHandle = `@${handle}`;
      }
    }

    return { isRealWebsite: false, isSocialMedia: true, socialType: entry.type, instagramHandle };
  }

  return { isRealWebsite: true, isSocialMedia: false, socialType: null, instagramHandle: "" };
}

export function getNameFromUrl(url: string): string {
  try {
    if (!url.includes("/maps/place/")) return "";
    const part = url.split("/maps/place/")[1]?.split("/")[0]?.split("?")[0] ?? "";
    const decoded = decodeURIComponent(part).replace(/\+/g, " ").trim();
    return decoded.startsWith("@") ? "" : decoded;
  } catch {
    return "";
  }
}

function pickText(root: ParentNode, selectors: string[]): string {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    const text = cleanText(el?.textContent ?? el?.getAttribute("aria-label") ?? "");
    if (text) return text;
  }
  return "";
}

function pickRating(root: ParentNode): { rating: string; reviewsCount: string } {
  const block = root.querySelector("div.F7nice, div[aria-label*='bintang'], div[aria-label*='stars']");
  if (!block) return { rating: "", reviewsCount: "" };

  let rating = cleanText(block.querySelector("span[aria-hidden='true']")?.textContent);
  if (!rating) {
    const label = block.getAttribute("aria-label") ?? "";
    const match = label.match(/([\d,.]+)\s*(bintang|stars)/i);
    rating = match?.[1] ?? "";
  }

  let reviewsCount = "";
  for (const span of Array.from(block.querySelectorAll("span"))) {
    const text = cleanText(span.textContent);
    if (text.startsWith("(") && text.endsWith(")")) {
      reviewsCount = text.replace(/[()]/g, "").trim();
      break;
    }
  }

  return { rating, reviewsCount };
}

export function extractBusinessData(root: ParentNode, url: string): ScrapedPlace {
  const { rating, reviewsCount } = pickRating(root);

  const data: ScrapedPlace = {
    companyName: pickText(root, [
      "h1.DUwDvf",
      "h1[class*='fontHeadlineLarge']",
      "div[role='main'] h1",
      "div[role='heading'][aria-level='1']",
      "h1",
    ]),
    category: pickText(root, [
      "button[jsaction*='pane.rating.category']",
      "button.DkEaL",
      "button[aria-label*='Kategori']",
      "button[jsaction*='category']",
    ]),
    address: pickText(root, [
      "button[data-item-id*='address']",
      "[data-tooltip*='Salin alamat']",
      "[aria-label*='Alamat:']",
      "[aria-label*='Address:']",
      "button[aria-label*='Alamat']",
    ]).replace(/^(Alamat|Address)[:\s]*/i, ""),
    phone: pickText(root, [
      "button[data-item-id*='phone:tel:']",
      "[data-tooltip*='Salin nomor telepon']",
      "[aria-label*='Telepon:']",
      "[aria-label*='Phone:']",
      "button[aria-label*='Telepon']",
    ]).replace(/^(Telepon|Phone)[:\s]*/i, ""),
    website: "",
    isRealWebsite: false,
    isSocialMediaOnly: false,
    socialType: null,
    socialUrl: "",
    instagramHandle: "",
    rating,
    reviewsCount,
    mapsUrl: url,
  };

  if (!data.companyName) data.companyName = getNameFromUrl(url);

  // Fallback telepon: scan tombol di panel detail.
  if (!data.phone) {
    for (const button of Array.from(root.querySelectorAll("div[role='main'] button"))) {
      const text = cleanText(button.textContent).replace(/\s+/g, "");
      if (PHONE_FALLBACK_RE.test(text)) {
        data.phone = text;
        break;
      }
    }
  }

  // Website / link sosial.
  let rawWebsiteUrl = "";
  const websiteSelectors = [
    "a[data-item-id='authority']",
    "[data-tooltip*='Buka situs web']",
    "[aria-label*='Situs Web:']",
    "[aria-label*='Website:']",
    "a[aria-label*='situs web' i]",
    "a[aria-label*='website' i]",
  ];

  for (const selector of websiteSelectors) {
    const el = root.querySelector<HTMLAnchorElement>(selector);
    if (!el) continue;

    const href = el.getAttribute("href") ?? "";
    const text = cleanText(el.textContent);
    const isGoogleLink = href.includes("google.com/search") || href.startsWith("javascript:");

    if (href && !isGoogleLink) {
      rawWebsiteUrl = href;
    } else if (text && !/situs web|website/i.test(text)) {
      rawWebsiteUrl = text.startsWith("http") ? text : `https://${text}`;
    }

    if (rawWebsiteUrl) break;
  }

  if (rawWebsiteUrl) {
    const analysis = analyzeWebsiteUrl(rawWebsiteUrl);
    if (analysis.isRealWebsite) {
      data.website = rawWebsiteUrl;
      data.isRealWebsite = true;
    } else {
      data.isSocialMediaOnly = true;
      data.socialType = analysis.socialType;
      data.socialUrl = rawWebsiteUrl;
      data.instagramHandle = analysis.instagramHandle;
    }
  }

  return data;
}
