import type { ScrapedPlace } from "@/entrypoints/content/scraper";

export type WebsiteStatus = "none" | "outdated" | "bad-ux" | "decent";

export interface Capture {
  id: string;
  capturedAt: string;
  companyName: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  socialType: string | null;
  socialUrl: string;
  instagram: string;
  rating: string;
  reviewsCount: string;
  mapsUrl: string;
  isSocialMediaOnly: boolean;

  // SDR Evaluation & Tagging
  websiteStatus: WebsiteStatus;
  digitalGaps: string[];
  services: string[];
  priority: number;
  picName?: string;
  picRole?: string;
  notes?: string;
  whatsapp?: string;
}

export function toCapture(place: ScrapedPlace): Capture {
  const hasWebsite = place.isRealWebsite && place.website.trim() !== "";
  const websiteStatus: WebsiteStatus = hasWebsite ? "decent" : "none";
  
  const initialGaps: string[] = [];
  if (!hasWebsite) initialGaps.push("no_website");
  if (place.isSocialMediaOnly) initialGaps.push("social_media_only");

  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    companyName: place.companyName.trim(),
    category: place.category,
    address: place.address,
    phone: place.phone,
    website: place.website,
    socialType: place.socialType,
    socialUrl: place.socialUrl,
    instagram: place.instagramHandle,
    rating: place.rating,
    reviewsCount: place.reviewsCount,
    mapsUrl: place.mapsUrl,
    isSocialMediaOnly: place.isSocialMediaOnly,

    // SDR Evaluation defaults
    websiteStatus,
    digitalGaps: initialGaps,
    services: ["website_dev"],
    priority: hasWebsite ? 3 : 5,
    picName: "",
    picRole: "",
    notes: place.isSocialMediaOnly
      ? `Hanya ada link ${place.socialType}: ${place.socialUrl}`
      : "",
    whatsapp: place.phone,
  };
}

export function hasRealWebsite(capture: Capture): boolean {
  return (
    capture.website.trim() !== "" &&
    !capture.isSocialMediaOnly &&
    capture.websiteStatus !== "none"
  );
}
