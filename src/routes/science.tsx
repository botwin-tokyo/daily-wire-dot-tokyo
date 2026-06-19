import { createFileRoute } from "@tanstack/react-router";
import { SectionPageContent, CATEGORY_COPY, editionQuery } from "./section.$category";

export const Route = createFileRoute("/science")({
  head: () => ({
    meta: [
      { title: `${CATEGORY_COPY.science.title} — The Morning Wire` },
      { name: "description", content: CATEGORY_COPY.science.dek },
      { property: "og:title", content: `${CATEGORY_COPY.science.title} — The Morning Wire` },
      { property: "og:description", content: CATEGORY_COPY.science.dek },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="science" />,
});