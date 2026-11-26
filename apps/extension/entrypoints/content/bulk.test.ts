import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

import { collectResultLinks, findFeed, isEndOfList } from "./bulk";

function parse(html: string): HTMLElement {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document.body as unknown as HTMLElement;
}

const SEARCH_HTML = `
  <div role="main">
    <div role="feed">
      <div class="Nv2PK">
        <a class="hfpxzc" aria-label="Kopi Cipete Satu"
          href="https://www.google.com/maps/place/Kopi+Cipete+Satu/data=!4m7!3m6!1s0x1:0xa1!8m2">Kopi Satu</a>
      </div>
      <div class="Nv2PK">
        <a class="hfpxzc" aria-label="Kopi Cipete Dua"
          href="https://www.google.com/maps/place/Kopi+Cipete+Dua/data=!4m7!3m6!1s0x1:0xa2!8m2">Kopi Dua</a>
      </div>
      <div class="Nv2PK">
        <a class="hfpxzc" aria-label="Kopi Cipete Satu (duplikat)"
          href="https://www.google.com/maps/place/Kopi+Cipete+Satu/data=!4m7!3m6!1s0x1:0xa1!8m2">Duplikat</a>
      </div>
      <span>Anda telah mencapai akhir daftar.</span>
    </div>
  </div>
  <a class="hfpxzc" aria-label="Di luar feed"
    href="https://www.google.com/maps/place/Di+Luar/data=!4m7!3m6!1s0x1:0xa9">Luar</a>
`;

describe("bulk helpers", () => {
  it("menemukan feed hasil pencarian", () => {
    const doc = parse(SEARCH_HTML);
    expect(findFeed(doc)).not.toBeNull();
    expect(findFeed(parse("<div></div>"))).toBeNull();
  });

  it("mengumpulkan link hasil, hanya dari feed, tanpa duplikat", () => {
    const links = collectResultLinks(parse(SEARCH_HTML));
    expect(links.map((link) => link.name)).toEqual(["Kopi Cipete Satu", "Kopi Cipete Dua"]);
    expect(links.map((link) => link.placeId)).toEqual(["0x1:0xa1", "0x1:0xa2"]);
  });

  it("mengenali akhir daftar", () => {
    expect(isEndOfList(parse('<div role="feed">Anda telah mencapai akhir daftar.</div>'))).toBe(
      true,
    );
    expect(isEndOfList(parse('<div role="feed">You have reached the end of the list.</div>'))).toBe(
      true,
    );
    expect(isEndOfList(parse('<div role="feed">Kopi Cipete Satu</div>'))).toBe(false);
  });
});
