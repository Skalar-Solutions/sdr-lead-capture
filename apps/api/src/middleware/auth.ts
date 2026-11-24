import type { MiddlewareHandler } from "hono";

import { verifyGoogleIdToken } from "../auth/google";
import type { AppEnv } from "../types";

function unauthorized(code: string, message: string) {
  return { error: { code, message } };
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return c.json(unauthorized("unauthorized", "Token tidak ada"), 401);
  }

  // Token statis untuk development / CLI. Hanya aktif kalau secret-nya di-set.
  if (c.env.DEV_AUTH_TOKEN && token === c.env.DEV_AUTH_TOKEN) {
    c.set("user", { email: "dev@local", name: "Dev" });
    c.set("orgId", c.env.DEFAULT_ORG_ID);
    await next();
    return;
  }

  if (!c.env.GOOGLE_CLIENT_ID) {
    return c.json(
      unauthorized("unauthorized", "GOOGLE_CLIENT_ID belum diset di environment"),
      401,
    );
  }

  const claims = await verifyGoogleIdToken(token, c.env.GOOGLE_CLIENT_ID);
  if (!claims) {
    return c.json(unauthorized("unauthorized", "Token Google tidak valid"), 401);
  }

  c.set("user", { email: claims.email, name: claims.name ?? claims.email });
  c.set("orgId", c.env.DEFAULT_ORG_ID);
  await next();
};
