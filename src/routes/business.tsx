import { createFileRoute } from "@tanstack/react-router";
import { SectionPageContent, CATEGORY_COPY, editionQuery } from "./section.$category";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: `${CATEGORY_COPY.business.title} — The Morning Wire` },
      { name: "description", content: CATEGORY_COPY.business.dek },
      { property: "og:title", content: `${CATEGORY_COPY.business.title} — The Morning Wire` },
      { property: "og:description", content: CATEGORY_COPY.business.dek },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="business" />,
});