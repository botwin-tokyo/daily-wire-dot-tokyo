import { createFileRoute } from "@tanstack/react-router";
import {
  SectionPageContent,
  CATEGORY_COPY,
  editionQuery,
  getSectionCopy,
} from "./section.$category";

export const Route = createFileRoute("/culture")({
  head: ({ loaderData }) => {
    const copy = getSectionCopy(loaderData, "culture") ?? CATEGORY_COPY.culture;
    return {
      meta: [
        { title: `${copy.title} — Botwin's Morning Wire` },
        { name: "description", content: copy.dek },
        { property: "og:title", content: `${copy.title} — Botwin's Morning Wire` },
        { property: "og:description", content: copy.dek },
      ],
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: () => <SectionPageContent category="culture" />,
});
