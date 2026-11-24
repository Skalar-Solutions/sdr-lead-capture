export interface GoogleClaims {
  sub: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

interface JwksResponse {
  keys: Jwk[];
}

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function decodeJson<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as T;
}

interface TokenHeader {
  alg?: string;
  kid?: string;
}

interface TokenPayload extends GoogleClaims {
  aud?: string;
  iss?: string;
  exp?: number;
}

/**
 * Verifikasi Google ID token (RS256) tanpa SDK.
 * JWKS di-cache di edge selama 1 jam.
 */
export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
): Promise<GoogleClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  let header: TokenHeader;
  let payload: TokenPayload;
  try {
    header = decodeJson<TokenHeader>(headerPart);
    payload = decodeJson<TokenPayload>(payloadPart);
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;

  const response = await fetch(JWKS_URL, { cf: { cacheTtl: 3600 } });
  if (!response.ok) return null;

  const jwks = (await response.json()) as JwksResponse;
  const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    toArrayBuffer(base64UrlToBytes(signaturePart)),
    toArrayBuffer(data),
  );
  if (!valid) return null;

  if (payload.aud !== clientId) return null;
  if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) return null;
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
  if (!payload.email || payload.email_verified === false) return null;

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    email_verified: payload.email_verified,
  };
}
