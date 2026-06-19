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
import { getEditionByDate } from "@/lib/api";

const editionQuery = (date: string) =>
  queryOptions({ queryKey: ["edition", date], queryFn: () => getEditionByDate(date) });

export const Route = createFileRoute("/editions/$date")({
  head: ({ params }) => ({ meta: [{ title: `Edition ${params.date} — The Morning Wire` }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(editionQuery(params.date)),
  component: EditionByDate,
});

function EditionByDate() {
  const { date } = Route.useParams();
  const { data: edition } = useSuspenseQuery(editionQuery(date));
  const lead = edition.articles.find((a) => a.id === edition.leadArticleId)!;
  const left = edition.articles.filter((a) => ["a2", "a3"].includes(a.id));
  const right = edition.articles.filter((a) => ["a4", "a5"].includes(a.id));

  return (
    <PageShell updatedAt={new Date(edition.updatedByAiAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}>
      <div className="py-4">
        <Link to="/editions" className="meta hover:text-[var(--ink)]">← All editions</Link>
        <p className="mt-2 eyebrow">Edition · {edition.editionDate}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[22fr_44fr_34fr] gap-0">
        <div className="lg:border-r lg:border-[var(--rule)] lg:pr-5">
          {left.map((a) => <SidebarStory key={a.id} article={a} />)}
          <MarketTable edition={edition} />
        </div>
        <div className="lg:border-r lg:border-[var(--rule)] lg:px-5 py-5">
          <LeadStory article={lead} />
        </div>
        <div className="lg:pl-5">
          {right.map((a) => <RightStory key={a.id} article={a} />)}
          <div className="mt-4 grid gap-4">
            <MorningBriefing edition={edition} />
            <AIEditorsNote edition={edition} />
          </div>
        </div>
      </div>
      <WeatherStrip edition={edition} />
    </PageShell>
  );
}