import { describe, it, expect } from "vitest";
import { deriveFrontPageLayout } from "./layout";
import { minimalValidEdition } from "@/test/fixtures";
import type { NewspaperEdition } from "./schema";

describe("deriveFrontPageLayout", () => {
  it("uses leadStoryId as the lead article", () => {
    const layout = deriveFrontPageLayout(minimalValidEdition);
    expect(layout.lead.id).toBe("lead-1");
  });

  it("places sidebar and brief articles in the left full column", () => {
    const layout = deriveFrontPageLayout(minimalValidEdition);
    expect(layout.leftFull.map((a) => a.id)).toContain("sidebar-1");
  });

  it("places imageFeature and major articles in the right column", () => {
    const layout = deriveFrontPageLayout(minimalValidEdition);
    expect(layout.right.map((a) => a.id)).toContain("feature-1");
  });

  it("excludes the lead article from all front-page columns", () => {
    const layout = deriveFrontPageLayout(minimalValidEdition);
    const all = [...layout.leftCompact, ...layout.leftFull, ...layout.right];
    expect(all.some((a) => a.id === layout.lead.id)).toBe(false);
  });

  it("falls back to the first article when leadStoryId is missing", () => {
    const edition: NewspaperEdition = {
      ...minimalValidEdition,
      leadStoryId: "missing",
      articles: minimalValidEdition.articles.map((a) =>
        a.id === "lead-1" ? { ...a, displayPosition: "standard" as const } : a,
      ),
    };
    const layout = deriveFrontPageLayout(edition);
    expect(layout.lead.id).toBe("lead-1");
  });

  it("falls back to displayPosition lead when leadStoryId is missing", () => {
    const edition: NewspaperEdition = {
      ...minimalValidEdition,
      leadStoryId: "missing",
    };
    const layout = deriveFrontPageLayout(edition);
    expect(layout.lead.displayPosition).toBe("lead");
  });
});
