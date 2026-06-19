import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Link2, ExternalLink, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/newspaper/PageShell";
import { getArticle, toggleSaved, isSaved, markRead } from "@/lib/api";
import { hoursAgo } from "@/components/newspaper/SidebarStory";

const articleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: async () => {
      const a = await getArticle(slug);
      if (!a) throw notFound();
      return a;
    },
  });

export const Route = createFileRoute("/article/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(articleQuery(params.slug)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.headline ?? "Article"} — The Morning Wire` },
      { name: "description", content: loaderData?.summary?.slice(0, 160) ?? "" },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <PageShell>
      <div className="py-24 text-center">
        <p className="eyebrow eyebrow-red">404</p>
        <h1 className="mt-2 font-serif text-3xl">Article not found</h1>
        <Link to="/" className="mt-6 inline-block read-more">← Return to today's edition</Link>
      </div>
    </PageShell>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article } = useSuspenseQuery(articleQuery(slug));
  const qc = useQueryClient();
  const [saved, setSaved] = useState(isSaved(article.id));
  const [read, setRead] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl py-10">
        <Link to="/" className="meta inline-flex items-center gap-1 hover:text-[var(--ink)]">
          <ArrowLeft className="h-3 w-3" /> Today's edition
        </Link>
        <p className="eyebrow eyebrow-red mt-6">{article.category.toUpperCase()}</p>
        <h1 className="mt-2 font-serif font-black" style={{ fontSize: "clamp(32px,4vw,52px)", lineHeight: 1.05 }}>
          {article.headline}
        </h1>
        {article.deck && <p className="mt-4 font-serif italic text-[20px] text-[var(--ink-mid)]">{article.deck}</p>}
        <p className="meta mt-4">
          <strong className="meta-strong">By {article.author ?? article.source.name}</strong> · {hoursAgo(article.publishedAt)} · <em>Source: {article.source.name}</em>
        </p>
        {article.image && (
          <figure className="mt-6">
            <img src={article.image.url} alt={article.image.caption ?? article.headline} className="w-full aspect-[16/9] object-cover border border-[var(--rule)]" />
            {article.image.caption && (
              <figcaption className="mt-2 meta">{article.image.caption} · <em>{article.image.attribution}</em></figcaption>
            )}
          </figure>
        )}

        <section className="mt-8">
          <h2 className="eyebrow">AI-generated summary</h2>
          <p className="mt-2 text-[17px] leading-relaxed">{article.summary}</p>
        </section>

        {article.keyPoints.length > 0 && (
          <section className="mt-8 panel-tinted">
            <h2 className="eyebrow eyebrow-red">Key points</h2>
            <ul className="mt-3 space-y-2 text-[15px]">
              {article.keyPoints.map((p) => (
                <li key={p} className="flex gap-2"><span className="text-[var(--ink-mid)]">◆</span><span>{p}</span></li>
              ))}
            </ul>
          </section>
        )}

        {article.whyItMatters && (
          <section className="mt-8">
            <h2 className="eyebrow">Why this matters</h2>
            <p className="mt-2 text-[16px] leading-relaxed">{article.whyItMatters}</p>
          </section>
        )}

        <section className="mt-10 border-t border-[var(--rule)] pt-6">
          <h2 className="eyebrow">Source transparency</h2>
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1 font-sans text-[13px]">
            <dt className="text-[var(--ink-mid)]">Publisher</dt><dd>{article.source.name}</dd>
            <dt className="text-[var(--ink-mid)]">Reliability</dt><dd>{article.source.reliability}</dd>
            <dt className="text-[var(--ink-mid)]">Published</dt><dd className="font-mono">{new Date(article.publishedAt).toLocaleString()}</dd>
            <dt className="text-[var(--ink-mid)]">Retrieved</dt><dd className="font-mono">{new Date(article.retrievedAt).toLocaleString()}</dd>
            <dt className="text-[var(--ink-mid)]">Relevance</dt><dd className="font-mono">{Math.round(article.relevanceScore * 100)}%</dd>
            <dt className="text-[var(--ink-mid)]">Confidence</dt><dd className="font-mono">{Math.round(article.confidenceScore * 100)}%</dd>
          </dl>
          <a href={article.originalUrl} target="_blank" rel="noreferrer noopener" className="mt-5 inline-flex items-center gap-2 border border-[var(--ink)] px-4 py-2 font-sans text-[13px] font-semibold uppercase tracking-wider hover:bg-[var(--ink)] hover:text-[var(--paper)]">
            <ExternalLink className="h-4 w-4" /> Read original at {article.source.name}
          </a>
        </section>

        <section className="mt-8 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-5">
          <button
            onClick={async () => { setSaved(await toggleSaved(article.id)); qc.invalidateQueries({ queryKey: ["saved"] }); }}
            className="inline-flex items-center gap-2 border border-[var(--ink)] px-3 py-1.5 font-sans text-[12px]"
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-[var(--ink)]" : ""}`} />
            {saved ? "Saved" : "Save article"}
          </button>
          <button
            onClick={async () => { await markRead(article.id); setRead(true); }}
            className="inline-flex items-center gap-2 border border-[var(--ink)] px-3 py-1.5 font-sans text-[12px]"
          >
            <Check className="h-3.5 w-3.5" /> {read ? "Marked as read" : "Mark as read"}
          </button>
          <button
            onClick={async () => { await navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-2 border border-[var(--ink)] px-3 py-1.5 font-sans text-[12px]"
          >
            <Link2 className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy link"}
          </button>
        </section>

        <p className="meta mt-8 italic">
          The Morning Wire shows AI-generated summaries and metadata. We do not reproduce original article text. Please visit the publisher for full reporting.
        </p>
      </article>
    </PageShell>
  );
}