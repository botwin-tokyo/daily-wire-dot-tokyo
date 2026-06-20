import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { SidebarStory, hoursAgo } from "@/components/newspaper/SidebarStory";
import { ArticleBody } from "@/components/newspaper/ArticleBody";
import { FitText } from "@/components/pretext";
import { getLatestEdition } from "@/lib/api";

import { CategorySchema, type Category, type Article, type Edition } from "@/lib/types";

export const editionQuery = queryOptions({
  queryKey: ["edition", "latest"],
  queryFn: () => getLatestEdition(),
});

export const CATEGORY_COPY: Record<Category, { eyebrow: string; title: string; dek: string }> = {
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
    dek: "Art, books, film, gaming, and the conversations defining the week.",
  },
  crypto: {
    eyebrow: "The Crypto Desk",
    title: "Crypto",
    dek: "Bitcoin, Ethereum, regulation, and the forces moving digital assets.",
  },
  politics: {
    eyebrow: "The Politics Desk",
    title: "Politics",
    dek: "Congress, the White House, elections, and the policies shaping the country.",
  },
};

export function getSectionCopy(
  edition: Edition | undefined,
  category: string,
): { eyebrow: string; title: string; dek: string } | undefined {
  const section = edition?.sections.find((s) => s.id === category && s.visible);
  if (!section) return undefined;
  return { eyebrow: section.eyebrow, title: section.label, dek: section.dek };
}

export const Route = createFileRoute("/section/$category")({
  head: ({ params, loaderData }) => {
    const cat = CategorySchema.safeParse(params.category);
    const sectionCopy = getSectionCopy(loaderData, params.category);
    const fallback = cat.success ? CATEGORY_COPY[cat.data] : undefined;
    const copy = sectionCopy ?? fallback ?? null;
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
  return <SectionPageContent category={category} />;
}

export function SectionPageContent({ category }: { category: string }) {
  const { data: edition } = useSuspenseQuery(editionQuery);
  const cat = CategorySchema.safeParse(category);
  if (!cat.success) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <h1 className="font-serif">
            <FitText
              text="Unknown section"
              minFontSize={24}
              maxFontSize={36}
              maxLines={1}
              lineHeightRatio={1}
              fontFamily='"Playfair Display", Georgia, serif'
              fontWeight={900}
            />
          </h1>
          <Link to="/" className="mt-4 inline-block read-more">
            ← Today's edition
          </Link>
        </div>
      </PageShell>
    );
  }
  const copy = getSectionCopy(edition, cat.data) ?? CATEGORY_COPY[cat.data];
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
        <p className="eyebrow eyebrow-red">
          <FitText
            text={copy.eyebrow}
            minFontSize={9}
            maxFontSize={11}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
            fontWeight={700}
          />
        </p>
        <h1 className="mt-3 font-serif font-black tracking-tight leading-[0.95]">
          <FitText
            text={copy.title}
            minFontSize={48}
            maxFontSize={120}
            maxLines={1}
            lineHeightRatio={0.95}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h1>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
          <p
            className="max-w-2xl font-serif italic text-[var(--ink-mid)]"
            style={{ fontSize: "clamp(16px, 1.4vw, 19px)" }}
          >
            {copy.dek}
          </p>
          <p className="meta">
            {articles.length} {articles.length === 1 ? "story" : "stories"} · Edition of{" "}
            {edition.editionDate} · Curated by AI at{" "}
            {new Date(edition.updatedByAiAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="py-20 text-center meta italic">
          No stories filed for this section today. The next edition is scheduled for{" "}
          {new Date(edition.nextScheduledAt).toLocaleString()}.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 items-start">
          {/* Main column */}
          <div className="lg:border-r lg:border-[var(--rule)] lg:pr-8">
            {/* Lead */}
            <SectionLead article={lead} />

            {/* Grid of the rest */}
            {rest.length > 0 && (
              <div className="mt-2 grid gap-x-8 md:grid-cols-2 border-t border-[var(--ink)] items-start">
                <div className="flex flex-col">
                  {rest.filter((_, i) => i % 2 === 0).map((a) => (
                    <SidebarStory key={a.id} article={a} />
                  ))}
                </div>
                <div className="flex flex-col lg:border-l lg:border-[var(--rule)] lg:pl-8">
                  {rest.filter((_, i) => i % 2 === 1).map((a) => (
                    <SidebarStory key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar rail */}
          <aside className="lg:pl-8 py-5 space-y-8">
            <div>
              <h3 className="eyebrow">
                <FitText
                  text="In this section"
                  minFontSize={10}
                  maxFontSize={12}
                  maxLines={1}
                  lineHeightRatio={1}
                  fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
                  fontWeight={700}
                />
              </h3>
              <ul className="mt-3 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
                {articles.map((a) => (
                  <li key={a.id} className="py-2">
                    <Link
                      to="/article/$slug"
                      params={{ slug: a.slug }}
                      className="font-serif text-[15px] leading-snug hover:underline"
                    >
                      {a.headline}
                    </Link>
                    <p className="meta">
                      {hoursAgo(a.publishedAt)} · {a.source.name}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {topTags.length > 0 && (
              <div>
                <h3 className="eyebrow">
                  <FitText
                    text="Topics"
                    minFontSize={10}
                    maxFontSize={12}
                    maxLines={1}
                    lineHeightRatio={1}
                    fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
                    fontWeight={700}
                  />
                </h3>
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
              <h3 className="eyebrow">
                <FitText
                  text="Sources used"
                  minFontSize={10}
                  maxFontSize={12}
                  maxLines={1}
                  lineHeightRatio={1}
                  fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
                  fontWeight={700}
                />
              </h3>
              <ul className="mt-3 space-y-1 font-sans text-[13px] text-[var(--ink-mid)]">
                {sources.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[var(--ink)] pt-4">
              <h3 className="eyebrow">
                <FitText
                  text="Other sections"
                  minFontSize={10}
                  maxFontSize={12}
                  maxLines={1}
                  lineHeightRatio={1}
                  fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
                  fontWeight={700}
                />
              </h3>
              <ul className="mt-3 space-y-1">
                {edition.sections
                  .filter((s) => s.id !== cat.data && s.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/section/$category"
                        params={{ category: s.id }}
                        className="font-serif text-[15px] hover:underline"
                      >
                        {s.label}
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
    <article className="py-6 flow-root">
      {article.image && (
        <Link
          to="/article/$slug"
          params={{ slug: article.slug }}
          className="float-right ml-5 mb-5 w-[300px]"
        >
          <figure>
            <img
              src={article.image.url}
              alt={article.image.caption ?? article.headline}
              width={300}
              height={190}
              className="w-full h-[190px] object-cover border border-[var(--rule)]"
            />
            {article.image.caption && (
              <figcaption className="mt-2 meta italic">{article.image.caption}</figcaption>
            )}
          </figure>
        </Link>
      )}

      {article.eyebrow && (
        <p className="eyebrow eyebrow-red">
          <FitText
            text={article.eyebrow}
            minFontSize={9}
            maxFontSize={11}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
            fontWeight={700}
          />
        </p>
      )}
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h2 className="mt-2 font-serif font-black leading-[1.02]">
          <FitText
            text={article.headline}
            minFontSize={24}
            maxFontSize={64}
            maxLines={3}
            lineHeightRatio={1.02}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h2>
      </Link>
      {article.deck && (
        <p
          className="mt-3 font-serif italic text-[var(--ink-mid)]"
          style={{ fontSize: "clamp(17px, 1.6vw, 22px)" }}
        >
          {article.deck}
        </p>
      )}
      <p className="mt-3 meta">
        {article.author ? (
          <>
            <strong className="font-semibold not-italic">By {article.author}</strong> ·{" "}
          </>
        ) : null}
        {hoursAgo(article.publishedAt)} ·{" "}
        <span className="italic">Source: {article.source.name}</span> · {article.readingTimeMin} min
        read
      </p>
      <ArticleBody content={article.content ?? article.summary} className="mt-5" />

      {article.keyPoints.length > 0 && (
        <div className="mt-5 border-l-2 border-[var(--ink)] pl-4">
          <h3 className="eyebrow">
            <FitText
              text="Key points"
              minFontSize={10}
              maxFontSize={12}
              maxLines={1}
              lineHeightRatio={1}
              fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
              fontWeight={700}
            />
          </h3>
          <ul className="mt-2 space-y-1 font-serif text-[15px] leading-snug">
            {article.keyPoints.map((k, i) => (
              <li key={i}>— {k}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
