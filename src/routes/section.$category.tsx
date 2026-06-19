import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { SidebarStory, hoursAgo } from "@/components/newspaper/SidebarStory";
import { getLatestEdition } from "@/lib/api";
import { CategorySchema, type Category, type Article } from "@/lib/types";

const editionQuery = queryOptions({ queryKey: ["edition", "latest"], queryFn: () => getLatestEdition() });

const CATEGORY_COPY: Record<Category, { eyebrow: string; title: string; dek: string }> = {
  world: {
    eyebrow: "The World Desk",
    title: "World",
    dek: "Geopolitics, diplomacy, and the stories shaping nations before sunrise.",
  },
  technology: {
    eyebrow: "The Technology Desk",
    title: "Technology",
    dek: "Models, chips, platforms, and the policy lines being drawn around them.",
  },
  business: {
    eyebrow: "Markets & Business",
    title: "Business",
    dek: "Macro signals, central banks, earnings, and the deals moving capital today.",
  },
  science: {
    eyebrow: "Science & Research",
    title: "Science",
    dek: "Breakthroughs from labs, observatories, and clinical trials worth your attention.",
  },
  culture: {
    eyebrow: "Culture & Ideas",
    title: "Culture",
    dek: "Art, books, film, and the conversations defining the week.",
  },
};

export const Route = createFileRoute("/section/$category")({
  head: ({ params }) => {
    const cat = CategorySchema.safeParse(params.category);
    const copy = cat.success ? CATEGORY_COPY[cat.data] : null;
    return {
      meta: [
        { title: `${copy?.title ?? params.category} — The Morning Wire` },
        { name: "description", content: copy?.dek ?? "Section of The Morning Wire." },
      ],
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: SectionPage,
});

function SectionPage() {
  const { category } = Route.useParams();
  const { data: edition } = useSuspenseQuery(editionQuery);
  const cat = CategorySchema.safeParse(category);
  if (!cat.success) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <h1 className="font-serif text-3xl">Unknown section</h1>
          <Link to="/" className="mt-4 inline-block read-more">← Today's edition</Link>
        </div>
      </PageShell>
    );
  }
  const copy = CATEGORY_COPY[cat.data];
  const articles = edition.articles
    .filter((a) => a.category === cat.data)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  const [lead, ...rest] = articles;
  const tagCounts = new Map<string, number>();
  articles.forEach((a) => a.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sources = [...new Set(articles.map((a) => a.source.name))];

  return (
    <PageShell>
      {/* Section masthead */}
      <header className="border-b border-[var(--ink)] py-10">
        <p className="eyebrow eyebrow-red">{copy.eyebrow}</p>
        <h1 className="mt-3 font-serif font-black tracking-tight leading-[0.95]" style={{ fontSize: "clamp(56px, 9vw, 120px)" }}>
          {copy.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
          <p className="max-w-2xl font-serif italic text-[var(--ink-mid)]" style={{ fontSize: "clamp(16px, 1.4vw, 19px)" }}>
            {copy.dek}
          </p>
          <p className="meta">
            {articles.length} {articles.length === 1 ? "story" : "stories"} · Edition of {edition.editionDate} · Curated by AI at {new Date(edition.updatedByAiAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="py-20 text-center meta italic">No stories filed for this section today. The next edition is scheduled for {new Date(edition.nextScheduledAt).toLocaleString()}.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
          {/* Main column */}
          <div className="lg:border-r lg:border-[var(--rule)] lg:pr-8">
            {/* Lead */}
            <SectionLead article={lead} />

            {/* Grid of the rest */}
            {rest.length > 0 && (
              <div className="mt-2 grid gap-x-8 md:grid-cols-2 border-t border-[var(--ink)]">
                {rest.map((a) => <SidebarStory key={a.id} article={a} />)}
              </div>
            )}
          </div>

          {/* Sidebar rail */}
          <aside className="lg:pl-8 py-5 space-y-8">
            <div>
              <p className="eyebrow">In this section</p>
              <ul className="mt-3 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
                {articles.map((a) => (
                  <li key={a.id} className="py-2">
                    <Link to="/article/$slug" params={{ slug: a.slug }} className="font-serif text-[15px] leading-snug hover:underline">
                      {a.headline}
                    </Link>
                    <p className="meta">{hoursAgo(a.publishedAt)} · {a.source.name}</p>
                  </li>
                ))}
              </ul>
            </div>

            {topTags.length > 0 && (
              <div>
                <p className="eyebrow">Topics</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topTags.map(([tag, n]) => (
                    <Link
                      key={tag}
                      to="/search"
                      search={{ q: tag } as never}
                      className="border border-[var(--rule)] px-2 py-0.5 font-sans text-[11px] uppercase tracking-wider text-[var(--ink-mid)] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                    >
                      {tag} <span className="text-[var(--ink-faint)]">{n}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="eyebrow">Sources used</p>
              <ul className="mt-3 space-y-1 font-sans text-[13px] text-[var(--ink-mid)]">
                {sources.map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>

            <div className="border-t border-[var(--ink)] pt-4">
              <p className="eyebrow">Other sections</p>
              <ul className="mt-3 space-y-1">
                {(Object.keys(CATEGORY_COPY) as Category[]).filter((c) => c !== cat.data).map((c) => (
                  <li key={c}>
                    <Link to="/section/$category" params={{ category: c }} className="font-serif text-[15px] hover:underline">
                      {CATEGORY_COPY[c].title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function SectionLead({ article }: { article: Article }) {
  return (
    <article className="py-6">
      {article.eyebrow && <p className="eyebrow eyebrow-red">{article.eyebrow}</p>}
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h2 className="mt-2 font-serif font-black leading-[1.02]" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>
          {article.headline}
        </h2>
      </Link>
      {article.deck && (
        <p className="mt-3 font-serif italic text-[var(--ink-mid)]" style={{ fontSize: "clamp(17px, 1.6vw, 22px)" }}>
          {article.deck}
        </p>
      )}
      <p className="mt-3 meta">
        {article.author ? <><strong className="font-semibold not-italic">By {article.author}</strong> · </> : null}
        {hoursAgo(article.publishedAt)} · <span className="italic">Source: {article.source.name}</span> · {article.readingTimeMin} min read
      </p>
      {article.image && (
        <figure className="mt-5">
          <img src={article.image.url} alt={article.image.caption ?? article.headline} className="w-full aspect-[16/9] object-cover" />
          {article.image.caption && <figcaption className="mt-2 meta italic">{article.image.caption}</figcaption>}
        </figure>
      )}
      <p className="mt-5 font-serif text-[17px] leading-relaxed first-letter:font-black first-letter:text-[54px] first-letter:float-left first-letter:mr-2 first-letter:leading-[0.9]">
        {article.summary}
      </p>
      {article.keyPoints.length > 0 && (
        <div className="mt-5 border-l-2 border-[var(--ink)] pl-4">
          <p className="eyebrow">Key points</p>
          <ul className="mt-2 space-y-1 font-serif text-[15px] leading-snug">
            {article.keyPoints.map((k, i) => <li key={i}>— {k}</li>)}
          </ul>
        </div>
      )}
      <Link to="/article/$slug" params={{ slug: article.slug }} className="read-more mt-5 inline-block">
        Continue reading →
      </Link>
    </article>
  );
}