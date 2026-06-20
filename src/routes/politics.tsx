import { createFileRoute } from "@tanstack/react-router";
import {
  SectionPageContent,
  CATEGORY_COPY,
  editionQuery,
  getSectionCopy,
} from "./section.$category";

export const Route = createFileRoute("/politics")({
  head: ({ loaderData }) => {
    const copy = getSectionCopy(loaderData, "politics") ?? CATEGORY_COPY.politics;
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
  component: () => <SectionPageContent category="politics" />,
});
