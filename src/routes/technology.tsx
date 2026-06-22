import { createFileRoute } from "@tanstack/react-router";
import {
  SectionPageContent,
  CATEGORY_COPY,
  editionQuery,
  getSectionCopy,
} from "./section.$category";
import { StockTicker } from "@/components/business/StockTicker";

export const Route = createFileRoute("/technology")({
  head: ({ loaderData }) => {
    const copy = getSectionCopy(loaderData, "technology") ?? CATEGORY_COPY.technology;
    return {
      meta: [
        { title: `${copy.title} — The Morning Wire` },
        { name: "description", content: copy.dek },
        { property: "og:title", content: `${copy.title} — The Morning Wire` },
        { property: "og:description", content: copy.dek },
      ],
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="technology" headerSlot={<StockTicker />} />,
});
