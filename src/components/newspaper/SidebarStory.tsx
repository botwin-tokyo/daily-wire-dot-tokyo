import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";

export function SidebarStory({ article }: { article: Article }) {
  return (
    <article className="py-5 border-b border-[var(--rule)] last:border-b-0">
      <p className="eyebrow">{article.category.toUpperCase()}</p>
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h3 className="mt-1 font-serif font-bold text-[var(--ink)] leading-tight" style={{ fontSize: "clamp(18px, 1.6vw, 22px)" }}>
          {article.headline}
        </h3>
      </Link>
      {article.author && (
        <p className="mt-2 font-sans text-[12px] text-[var(--ink-mid)]"><strong className="font-semibold">By {article.author}</strong></p>
      )}
      <p className="meta">
        {hoursAgo(article.publishedAt)} · <span className="italic">Source: {article.source.name}</span>
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink)]">{article.summary}</p>
    </article>
  );
}

export function hoursAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diff < 1) return `${Math.max(1, Math.round(diff * 60))}m ago`;
  if (diff < 24) return `${Math.round(diff)}h ago`;
  return `${Math.round(diff / 24)}d ago`;
}