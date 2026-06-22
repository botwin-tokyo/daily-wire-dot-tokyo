import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { LeadStory } from "@/components/newspaper/LeadStory";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { RightStory } from "@/components/newspaper/RightStory";
import { MorningBriefing } from "@/components/newspaper/MorningBriefing";
import { AIEditorsNote } from "@/components/newspaper/AIEditorsNote";
import { MarketTable } from "@/components/newspaper/MarketTable";
import { WeatherStrip } from "@/components/newspaper/WeatherStrip";
import { getEditionByDateNewspaper } from "@/lib/api";
import { newspaperEditionToEdition } from "@/lib/edition-loader";
import { deriveFrontPageLayout } from "@/lib/layout";

const editionQuery = (date: string) =>
  queryOptions({
    queryKey: ["edition", "newspaper", date],
    queryFn: () => getEditionByDateNewspaper(date),
  });

export const Route = createFileRoute("/editions/$date")({
  head: ({ params }) => ({ meta: [{ title: `Edition ${params.date} — Botwin's Morning Wire` }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(editionQuery(params.date)),
  component: EditionByDate,
});

function EditionByDate() {
  const { date } = Route.useParams();
  const { data: newspaper } = useSuspenseQuery(editionQuery(date));
  const layout = deriveFrontPageLayout(newspaper);
  const edition = newspaperEditionToEdition(newspaper);

  const lead = edition.articles.find((a) => a.id === layout.lead.id)!;
  const left = layout.left
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);
  const right = layout.right
    .map((a) => edition.articles.find((ea) => ea.id === a.id))
    .filter((a): a is NonNullable<typeof a> => a != null);

  return (
    <PageShell
      updatedAt={new Date(edition.updatedByAiAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    >
      <div className="py-4">
        <Link to="/editions" className="meta hover:text-[var(--ink)]">
          ← All editions
        </Link>
        <p className="mt-2 eyebrow">Edition · {edition.editionDate}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[22fr_44fr_34fr] gap-0">
        <div className="lg:border-r lg:border-[var(--rule)] lg:pr-5">
          {left.map((a) => (
            <SidebarStory key={a.id} article={a} />
          ))}
          <MarketTable marketSnapshot={newspaper.marketSnapshot} />
        </div>
        <div className="lg:border-r lg:border-[var(--rule)] lg:px-5 py-5">
          <LeadStory article={lead} />
        </div>
        <div className="lg:pl-5">
          {right.map((a) => (
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
    </PageShell>
  );
}
