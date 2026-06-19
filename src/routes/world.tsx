import { createFileRoute } from "@tanstack/react-router";
import { SectionPageContent, CATEGORY_COPY, editionQuery } from "./section.$category";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: `${CATEGORY_COPY.world.title} — The Morning Wire` },
      { name: "description", content: CATEGORY_COPY.world.dek },
      { property: "og:title", content: `${CATEGORY_COPY.world.title} — The Morning Wire` },
      { property: "og:description", content: CATEGORY_COPY.world.dek },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="world" />,
});