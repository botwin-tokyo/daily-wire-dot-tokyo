import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";
import { FitText } from "@/components/pretext";
import { hoursAgo } from "./SidebarStory";
import { ArticleBody } from "./ArticleBody";

export function RightStory({ article }: { article: Article }) {
  return (
    <article className="py-5 border-b border-[var(--rule)] last:border-b-0 flow-root">
      {article.image && (
        <Link
          to="/article/$slug"
          params={{ slug: article.slug }}
          className="float-right ml-3 mb-3 w-[140px]"
        >
          <figure>
            <img
              src={article.image.url}
              alt={article.image.caption ?? article.headline}
              width={140}
              height={120}
              loading="lazy"
              className="w-full h-[120px] object-cover border border-[var(--rule)]"
            />
            {article.image.caption && (
              <figcaption className="mt-1 font-sans text-[10px] text-[var(--ink-faint)] leading-tight">
                {article.image.caption}
              </figcaption>
            )}
          </figure>
        </Link>
      )}

      <p className="eyebrow">
        <FitText
          text={article.category.toUpperCase()}
          minFontSize={9}
          maxFontSize={11}
          maxLines={1}
          lineHeightRatio={1}
          fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
          fontWeight={700}
        />
      </p>
      <Link to="/article/$slug" params={{ slug: article.slug }}>
        <h3 className="mt-1 font-serif font-bold text-[var(--ink)] leading-tight">
          <FitText
            text={article.headline}
            minFontSize={16}
            maxFontSize={22}
            maxLines={3}
            lineHeightRatio={1.15}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={700}
          />
        </h3>
      </Link>
      {article.author && (
        <p className="mt-2 font-sans text-[12px] text-[var(--ink-mid)]">
          <strong className="font-semibold">By {article.author}</strong>
        </p>
      )}
      <p className="meta">
        {hoursAgo(article.publishedAt)} ·{" "}
        <span className="italic">Source: {article.source.name}</span>
      </p>
      <ArticleBody
        content={article.content ?? article.summary}
        className="mt-2"
        maxParagraphs={2}
      />
    </article>
  );
}
