import { describe, it, expect } from "vitest";
import { validateNewspaperEdition, validateBusinessRules, CURRENT_SCHEMA_VERSION } from "./schema";
import { minimalValidEdition } from "@/test/fixtures";

describe("schema validation", () => {
  it("accepts a valid edition", () => {
    const result = validateNewspaperEdition(minimalValidEdition);
    expect(result.success).toBe(true);
  });

  it("rejects a missing schemaVersion", () => {
    const { schemaVersion: _, ...rest } = minimalValidEdition;
    const result = validateNewspaperEdition(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
    }
  });

  it("rejects an incorrect schemaVersion", () => {
    const result = validateNewspaperEdition({
      ...minimalValidEdition,
      schemaVersion: "0.0.0",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
    }
  });

  it("rejects HTML in headline", () => {
    const edition = {
      ...minimalValidEdition,
      articles: [
        {
          ...minimalValidEdition.articles[0],
          headline: "<script>alert(1)</script>Bad headline",
        },
        ...minimalValidEdition.articles.slice(1),
      ],
    };
    const result = validateNewspaperEdition(edition);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("headline") && e.includes("HTML"))).toBe(true);
    }
  });

  it("rejects javascript: URLs", () => {
    const edition = {
      ...minimalValidEdition,
      articles: [
        {
          ...minimalValidEdition.articles[0],
          originalUrl: "javascript:alert(1)",
        },
        ...minimalValidEdition.articles.slice(1),
      ],
    };
    const result = validateNewspaperEdition(edition);
    expect(result.success).toBe(false);
  });

  it("rejects missing image.alt", () => {
    const edition = {
      ...minimalValidEdition,
      articles: [
        {
          ...minimalValidEdition.articles[2],
          image: { url: "/images/feature.jpg" },
        },
        ...minimalValidEdition.articles.slice(0, 2),
      ],
    };
    const result = validateNewspaperEdition(edition);
    expect(result.success).toBe(false);
  });
});

describe("business-rule validation", () => {
  it("accepts a valid edition", () => {
    const result = validateBusinessRules(minimalValidEdition);
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate article ids", () => {
    const edition = {
      ...minimalValidEdition,
      articles: [
        minimalValidEdition.articles[0],
        { ...minimalValidEdition.articles[1], id: minimalValidEdition.articles[0].id },
        minimalValidEdition.articles[2],
      ],
    };
    const result = validateBusinessRules(edition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("Duplicate article id"))).toBe(true);
    }
  });

  it("rejects a leadStoryId that does not exist", () => {
    const result = validateBusinessRules({
      ...minimalValidEdition,
      leadStoryId: "missing",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("leadStoryId"))).toBe(true);
    }
  });

  it("rejects a section that references a missing article", () => {
    const edition = {
      ...minimalValidEdition,
      sections: [
        {
          ...minimalValidEdition.sections[0],
          articleIds: ["missing"],
        },
      ],
    };
    const result = validateBusinessRules(edition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("missing article id"))).toBe(true);
    }
  });

  it("rejects a relatedArticleIds entry that does not exist", () => {
    const edition = {
      ...minimalValidEdition,
      articles: [
        {
          ...minimalValidEdition.articles[2],
          relatedArticleIds: ["missing"],
        },
        ...minimalValidEdition.articles.slice(0, 2),
      ],
    };
    const result = validateBusinessRules(edition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("missing related article id"))).toBe(true);
    }
  });

  it("rejects a morningBriefing articleId that does not exist", () => {
    const edition = {
      ...minimalValidEdition,
      morningBriefing: [
        {
          ...minimalValidEdition.morningBriefing[0],
          articleId: "missing",
        },
      ],
    };
    const result = validateBusinessRules(edition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.includes("Morning briefing") && e.includes("missing")),
      ).toBe(true);
    }
  });

  it("rejects generatedAt later than updatedAt", () => {
    const result = validateBusinessRules({
      ...minimalValidEdition,
      generatedAt: "2025-05-20T06:00:00Z",
      updatedAt: "2025-05-20T05:00:00Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("generatedAt"))).toBe(true);
    }
  });
});

describe("schema version constant", () => {
  it("matches the documented contract", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("1.0.0");
  });
});
