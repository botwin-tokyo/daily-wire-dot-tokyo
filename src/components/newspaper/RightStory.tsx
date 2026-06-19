import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";
import { hoursAgo } from "./SidebarStory";

export function RightStory({ article }: { article: Article }) {
  return (
    <article className="grid grid-cols-[1fr_140px] gap-4 py-5 border-b border-[var(--rule)] last:border-b-0">
      <div>
        <p className="eyebrow">{article.category.toUpperCase()}</p>
        <Link to="/article/$slug" params={{ slug: article.slug }}>
          <h3 className="mt-1 font-serif font-bold text-[var(--ink)] leading-tight" style={{ fontSize: "clamp(18px, 1.5vw, 22px)" }}>
            {article.headline}
          </h3>
        </Link>
        {article.author && (
          <p className="mt-2 font-sans text-[12px] text-[var(--ink-mid)]"><strong className="font-semibold">By {article.author}</strong></p>
        )}
        <p className="meta">{hoursAgo(article.publishedAt)} · <span className="italic">Source: {article.source.name}</span></p>
        <p className="mt-2 text-[14px] leading-relaxed">{article.summary}</p>
      </div>
      {article.image && (
        <Link to="/article/$slug" params={{ slug: article.slug }} className="block">
          <img
            src={article.image.url}
            alt={article.image.caption ?? article.headline}
            width={280}
            height={200}
            loading="lazy"
            className="w-full h-[120px] object-cover border border-[var(--rule)]"
          />
        </Link>
      )}
    </article>
  );
}