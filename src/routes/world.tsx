import { createFileRoute } from "@tanstack/react-router";
import {
  SectionPageContent,
  CATEGORY_COPY,
  editionQuery,
  getSectionCopy,
} from "./section.$category";
import { WorldMarketsTicker } from "@/components/world/WorldMarketsTicker";

export const Route = createFileRoute("/world")({
  head: ({ loaderData }) => {
    const copy = getSectionCopy(loaderData, "world") ?? CATEGORY_COPY.world;
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
  component: () => <SectionPageContent category="world" headerSlot={<WorldMarketsTicker />} />,
});
