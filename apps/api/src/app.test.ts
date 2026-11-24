import { describe, expect, it } from "vitest";

import { verifyGoogleIdToken } from "./auth/google";
import { isUniqueViolation } from "./db/leads";

describe("isUniqueViolation", () => {
  it("mengenali error UNIQUE dari D1", () => {
    expect(isUniqueViolation(new Error("D1_ERROR: UNIQUE constraint failed: leads.id"))).toBe(true);
  });

  it("mengabaikan error lain", () => {
    expect(isUniqueViolation(new Error("no such table"))).toBe(false);
    expect(isUniqueViolation("boom")).toBe(false);
  });
});

describe("verifyGoogleIdToken", () => {
  it("menolak token yang bentuknya salah tanpa memanggil jaringan", async () => {
    expect(await verifyGoogleIdToken("bukan-token", "client-id")).toBeNull();
    expect(await verifyGoogleIdToken("a.b", "client-id")).toBeNull();
  });

  it("menolak token dengan payload rusak", async () => {
    expect(await verifyGoogleIdToken("aaa.bbb.ccc", "client-id")).toBeNull();
  });
});
