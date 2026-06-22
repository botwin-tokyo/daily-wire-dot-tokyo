import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageShell } from "@/components/newspaper/PageShell";
import { LeadStory } from "@/components/newspaper/LeadStory";
import { TopStoryListItem } from "@/components/newspaper/TopStoryListItem";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { RightStory } from "@/components/newspaper/RightStory";
import { MarketTable } from "@/components/newspaper/MarketTable";
import { MorningBriefing } from "@/components/newspaper/MorningBriefing";
import { AIEditorsNote } from "@/components/newspaper/AIEditorsNote";
import { WeatherStrip } from "@/components/newspaper/WeatherStrip";
import { getLatestNewspaperEdition } from "@/lib/api";
import { newspaperEditionToEdition } from "@/lib/edition-loader";
import { deriveFrontPageLayout } from "@/lib/layout";

const newspaperEditionQuery = queryOptions({
  queryKey: ["edition", "newspaper", "latest"],
  queryFn: () => getLatestNewspaperEdition(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Morning Wire — Today's Edition" },
      {
        name: "description",
        content:
          "A personal AI-curated newspaper. Today's lead stories, morning briefing, and editor's note — refreshed before sunrise.",
      },
      { property: "og:title", content: "The Morning Wire — Today's Edition" },
      {
        property: "og:description",
        content: "Your personal daily intelligence, delivered before sunrise.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newspaperEditionQuery),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Suspense fallback={<div className="py-20 text-center meta">Loading today's edition…</div>}>
        <EditionView />
      </Suspense>
    </PageShell>
  );
}

function EditionView() {
  const { data: newspaper } = useSuspenseQuery(newspaperEditionQuery);
  const layout = deriveFrontPageLayout(newspaper);
  const edition = newspaperEditionToEdition(newspaper);

  const lead = edition.articles.find((a) => a.id === layout.lead.id)!;
  const leftCompact = layout.leftCompact
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);
  const leftFull = layout.leftFull
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);
  const centerFull = layout.centerFull
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);
  const rightFull = layout.rightFull
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);

  return (
    <>
      {/* Editorial grid: full articles spread across all three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[30fr_44fr_26fr] gap-0 items-start">
        {/* LEFT COL — compact list + full articles */}
        <div className="lg:border-r lg:border-[var(--rule)] lg:pr-5">
          <h2 className="py-4 border-b border-[var(--ink)] font-sans text-[11px] font-bold uppercase tracking-wider text-[var(--ink-mid)]">
            More Top Stories
          </h2>
          {leftCompact.map((a) => (
            <TopStoryListItem key={a.id} article={a} />
          ))}
          {leftFull.map((a) => (
            <SidebarStory key={a.id} article={a} />
          ))}
          <MarketTable marketSnapshot={newspaper.marketSnapshot} />
        </div>

        {/* CENTER COL — lead + full articles */}
        <div className="lg:border-r lg:border-[var(--rule)] lg:px-5 py-5">
          <LeadStory article={lead} />
          {centerFull.map((a) => (
            <SidebarStory key={a.id} article={a} />
          ))}
        </div>

        {/* RIGHT COL — full articles + briefing/editor note */}
        <div className="lg:pl-5">
          {rightFull.map((a) => (
            <RightStory key={a.id} article={a} />
          ))}
          <div className="mt-4 grid gap-4">
            <MorningBriefing edition={edition} />
            <AIEditorsNote edition={edition} />
          </div>
        </div>
      </div>

      <WeatherStrip
        weather={newspaper.weather}
        commodities={newspaper.marketSnapshot.commodities}
      />
    </>
  );
}
