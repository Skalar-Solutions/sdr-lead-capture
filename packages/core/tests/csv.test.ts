import { describe, expect, it } from "vitest";

import { escapeCsvCell, leadsToCsv } from "../src/csv";
import { createLead } from "../src/lead";

describe("escapeCsvCell", () => {
  it("menetralkan formula injection", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+62 812")).toBe("'+62 812");
    expect(escapeCsvCell("@user")).toBe("'@user");
    expect(escapeCsvCell("-5")).toBe("'-5");
  });

  it("meng-escape kutip dan newline", () => {
    expect(escapeCsvCell('Dia bilang "halo"')).toBe('"Dia bilang ""halo"""');
    expect(escapeCsvCell("baris1\nbaris2")).toBe('"baris1\nbaris2"');
  });

  it("null/undefined jadi string kosong", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("leadsToCsv", () => {
  it("menulis header dan baris dengan label yang terbaca", () => {
    const lead = createLead(
      {
        companyName: "Warung Steak",
        phone: "0812-3456-7890",
        digitalGaps: ["no_website", "no_online_ordering"],
        services: ["website_dev"],
      },
      { orgId: "org_test" },
    );

    const csv = leadsToCsv([lead]);
    expect(csv.startsWith("\uFEFFID,")).toBe(true);
    expect(csv).toContain("Warung Steak");
    expect(csv).toContain("Tidak punya website; Tidak ada order/booking online");
    expect(csv).toContain("Website Development");
    expect(csv).toContain("YA");
  });

  it("tidak menduplikasi prefix telepon", () => {
    const lead = createLead({ companyName: "A", phone: "0812-3456-7890" }, { orgId: "org_test" });
    const csv = leadsToCsv([lead], { bom: false });
    expect(csv).toContain("'0812-3456-7890");
    expect(csv).not.toContain("''0812");
  });
});
