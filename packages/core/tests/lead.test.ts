import { describe, expect, it } from "vitest";

import { applyLeadPatch, createLead } from "../src/lead";

const base = { orgId: "org_test" };

describe("createLead", () => {
  it("mengisi semua turunan dari input minimal", () => {
    const lead = createLead({ companyName: "Warung Steak Pak Joko" }, base);

    expect(lead.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(lead.orgId).toBe("org_test");
    expect(lead.nameNorm).toBe("warung steak pak joko");
    expect(lead.websiteStatus).toBe("none");
    expect(lead.isHotLead).toBe(true);
    expect(lead.priority).toBe(5);
    expect(lead.digitalGaps).toContain("no_website");
    expect(lead.gapScore).toBe(7);
    expect(lead.createdAt).toBe(lead.updatedAt);
  });

  it("menormalisasi telepon dan memakai fallback WhatsApp", () => {
    const lead = createLead({ companyName: "Toko A", phone: "0812-3456-7890" }, base);
    expect(lead.phoneE164).toBe("+6281234567890");
    expect(lead.whatsappE164).toBe("+6281234567890");
  });

  it("website nyata tidak dianggap hot lead", () => {
    const lead = createLead(
      {
        companyName: "Klinik Sehat",
        website: "https://kliniksehat.id",
        websiteStatus: "decent",
      },
      base,
    );
    expect(lead.isHotLead).toBe(false);
    expect(lead.priority).toBe(2);
    expect(lead.digitalGaps).toEqual([]);
    expect(lead.gapScore).toBe(0);
  });

  it("menghormati gap & prioritas yang dikirim user", () => {
    const lead = createLead(
      {
        companyName: "Salon Cantik",
        websiteStatus: "decent",
        digitalGaps: ["no_seo"],
        priority: 5,
      },
      base,
    );
    expect(lead.digitalGaps).toEqual(["no_seo"]);
    expect(lead.gapScore).toBe(1);
    expect(lead.priority).toBe(5);
  });

  it("menolak email dan URL yang tidak valid", () => {
    expect(() => createLead({ companyName: "A", email: "bukan-email" }, base)).toThrow();
    expect(() => createLead({ companyName: "A", website: "javascript:alert(1)" }, base)).toThrow();
    expect(() => createLead({ companyName: "" }, base)).toThrow();
  });

  it("menerima id dari client untuk idempotency", () => {
    const lead = createLead({ companyName: "A" }, { ...base, id: "01JTESTULID00000000000000" });
    expect(lead.id).toBe("01JTESTULID00000000000000");
  });
});

describe("applyLeadPatch", () => {
  it("menghitung ulang gap & priority setelah status berubah", () => {
    const lead = createLead({ companyName: "Warung A" }, base);
    expect(lead.isHotLead).toBe(true);

    const updated = applyLeadPatch(lead, {
      website: "https://warunga.id",
      websiteStatus: "decent",
      phone: "0813-1111-2222",
    });

    expect(updated.isHotLead).toBe(false);
    expect(updated.priority).toBe(2);
    expect(updated.phoneE164).toBe("+6281311112222");
    expect(updated.digitalGaps).toEqual([]);
    expect(updated.updatedAt >= lead.updatedAt).toBe(true);
    expect(updated.createdAt).toBe(lead.createdAt);
  });
});
