import { describe, expect, it } from "vitest";
import { orderedSubjects, SUBJECT_HEADING_KEYS } from "./subjects";
import type { SubjectLock, SubjectKind } from "./api/types";

const mk = (kind: SubjectKind): SubjectLock => ({
  kind,
  image_url: `https://x/${kind}.jpg`,
  asset_id: null,
  label: kind,
  locked: true,
  source: "test",
});

describe("orderedSubjects", () => {
  it("returns [] when subjects are absent or empty (strip omitted)", () => {
    expect(orderedSubjects(undefined)).toEqual([]);
    expect(orderedSubjects([])).toEqual([]);
  });

  it("orders Product → Host → Scene regardless of input order", () => {
    const out = orderedSubjects([mk("scene"), mk("product"), mk("person")]);
    expect(out.map((s) => s.kind)).toEqual(["product", "person", "scene"]);
    expect(out.map((s) => SUBJECT_HEADING_KEYS[s.kind])).toEqual([
      "product",
      "host",
      "scene",
    ]);
  });
});
