import { createFileRoute } from "@tanstack/react-router";
import { SectionPageContent, CATEGORY_COPY, editionQuery } from "./section.$category";

export const Route = createFileRoute("/culture")({
  head: () => ({
    meta: [
      { title: `${CATEGORY_COPY.culture.title} — The Morning Wire` },
      { name: "description", content: CATEGORY_COPY.culture.dek },
      { property: "og:title", content: `${CATEGORY_COPY.culture.title} — The Morning Wire` },
      { property: "og:description", content: CATEGORY_COPY.culture.dek },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="culture" />,
});