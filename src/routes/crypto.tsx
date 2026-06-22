import { createFileRoute } from "@tanstack/react-router";
import {
  SectionPageContent,
  CATEGORY_COPY,
  editionQuery,
  getSectionCopy,
} from "./section.$category";
import { CryptoTicker } from "@/components/crypto/CryptoTicker";

export const Route = createFileRoute("/crypto")({
  head: ({ loaderData }) => {
    const copy = getSectionCopy(loaderData, "crypto") ?? CATEGORY_COPY.crypto;
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
  component: () => <SectionPageContent category="crypto" headerSlot={<CryptoTicker />} />,
});
