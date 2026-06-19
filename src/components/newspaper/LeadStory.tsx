import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";
import { hoursAgo } from "./SidebarStory";

export function LeadStory({ article }: { article: Article }) {
  return (
    <article>
      <p className="eyebrow eyebrow-red">TOP STORY</p>
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h2
          className="mt-2 font-serif font-black text-[var(--ink)]"
          style={{ fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
        >
          {article.headline}
        </h2>
      </Link>
      {article.deck && (
        <p className="mt-4 font-body-serif text-[18px] leading-snug text-[var(--ink-mid)]">{article.deck}</p>
      )}
      {article.image && (
        <figure className="mt-5">
          <img
            src={article.image.url}
            alt={article.image.caption ?? article.headline}
            width={1280}
            height={720}
            className="w-full aspect-[16/9] object-cover border border-[var(--rule)]"
          />
          <figcaption className="mt-2 flex justify-between gap-4 font-sans text-[11px] text-[var(--ink-faint)]">
            <span>{article.image.caption}</span>
            {article.image.attribution && <span className="italic">Source: {article.image.attribution}</span>}
          </figcaption>
        </figure>
      )}
      <p className="mt-5 font-sans text-[13px] text-[var(--ink-mid)]">
        <strong className="font-semibold text-[var(--ink)]">By {article.author}</strong>
        <span className="text-[var(--ink-faint)]"> · {hoursAgo(article.publishedAt)} · <em>Source: {article.source.name}</em></span>
      </p>
      <p className="mt-4 text-[16px] leading-relaxed">{article.summary}</p>
      <Link to="/article/$slug" params={{ slug: article.slug }} className="mt-4 inline-block read-more">
        Read full story →
      </Link>
    </article>
  );
}