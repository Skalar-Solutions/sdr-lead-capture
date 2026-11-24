import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "ID";

/**
 * Normalisasi nomor ke format E.164 (+62812...).
 * Mengembalikan null kalau nomor tidak masuk akal / kosong.
 */
export function normalizePhoneE164(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed) return null;
  if (!parsed.isPossible()) return null;

  return parsed.number;
}

export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Kunci pembanding nomor. Utamakan E.164; kalau gagal, pakai 9 digit terakhir
 * supaya "0812...", "62812...", dan "+62812..." tetap dianggap sama.
 */
export function phoneMatchKey(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const e164 = normalizePhoneE164(raw, defaultCountry);
  if (e164) return e164;

  const digits = digitsOnly(raw);
  if (digits.length < 7) return null;
  return digits.slice(-9);
}

export function formatPhoneDisplay(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  const input = (raw ?? "").trim();
  if (!input) return "";
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isPossible()) return input;
  return parsed.formatNational();
}

/** Link WhatsApp dari nomor apa pun. Null kalau nomor tidak valid. */
export function whatsappUrl(raw: string | null | undefined): string | null {
  const e164 = normalizePhoneE164(raw);
  if (!e164) return null;
  return `https://wa.me/${e164.replace(/^\+/, "")}`;
}
