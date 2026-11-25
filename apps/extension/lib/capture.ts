import type { ScrapedPlace } from "@/entrypoints/content/scraper";

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
}

export function toCapture(place: ScrapedPlace): Capture {
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
  };
}

export function hasRealWebsite(capture: Capture): boolean {
  return capture.website.trim() !== "";
}
