import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";
import { FitText } from "@/components/pretext";
import { hoursAgo } from "./SidebarStory";
import { ArticleBody } from "./ArticleBody";

export function LeadStory({ article }: { article: Article }) {
  return (
    <article className="flow-root">
      {article.image && (
        <Link
          to="/article/$slug"
          params={{ slug: article.slug }}
          className="float-right ml-5 mb-5 w-[260px]"
        >
          <figure>
            <img
              src={article.image.url}
              alt={article.image.caption ?? article.headline}
              width={260}
              height={180}
              className="w-full h-[180px] object-cover border border-[var(--rule)]"
            />
            {article.image.caption && (
              <figcaption className="mt-2 flex justify-between gap-4 font-sans text-[11px] text-[var(--ink-faint)]">
                <span>{article.image.caption}</span>
                {article.image.attribution && (
                  <span className="italic">Source: {article.image.attribution}</span>
                )}
              </figcaption>
            )}
          </figure>
        </Link>
      )}

      <p className="eyebrow eyebrow-red">
        <FitText
          text="TOP STORY"
          minFontSize={9}
          maxFontSize={11}
          maxLines={1}
          lineHeightRatio={1}
          fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
          fontWeight={700}
        />
      </p>
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h2
          className="mt-2 font-serif font-black text-[var(--ink)]"
          style={{
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          <FitText
            text={article.headline}
            minFontSize={20}
            maxFontSize={46}
            maxLines={3}
            lineHeightRatio={1.05}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h2>
      </Link>
      {article.deck && (
        <p className="mt-4 font-body-serif text-[18px] leading-snug text-[var(--ink-mid)]">
          {article.deck}
        </p>
      )}
      <p className="mt-5 font-sans text-[13px] text-[var(--ink-mid)]">
        <strong className="font-semibold text-[var(--ink)]">By {article.author}</strong>
        <span className="text-[var(--ink-faint)]">
          {" "}
          · {hoursAgo(article.publishedAt)} · <em>Source: {article.source.name}</em>
        </span>
      </p>
      <ArticleBody
        content={article.content ?? article.summary}
        className="mt-4"
        maxParagraphs={5}
      />
    </article>
  );
}
