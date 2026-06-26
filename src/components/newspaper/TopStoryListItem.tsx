import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/types";
import { FitText } from "@/components/pretext";
import { hoursAgo } from "./SidebarStory";

export function TopStoryListItem({ article }: { article: Article }) {
  return (
    <article className="py-4 border-b border-[var(--rule)] last:border-b-0">
      <div className="flex gap-3">
        {article.image && (
          <Link to="/article/$slug" params={{ slug: article.slug }} className="shrink-0 w-[80px]">
            <img
              src={article.image.url}
              alt={article.image.caption ?? article.headline}
              width={80}
              height={60}
              loading="lazy"
              className="w-full h-[60px] object-cover border border-[var(--rule)]"
            />
          </Link>
        )}
        <div className="min-w-0">
          <p className="eyebrow">
            <FitText
              text={article.category.toUpperCase()}
              minFontSize={8}
              maxFontSize={10}
              maxLines={1}
              lineHeightRatio={1}
              fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
              fontWeight={700}
            />
          </p>
          <Link to="/article/$slug" params={{ slug: article.slug }}>
            <h4 className="mt-0.5 font-serif font-bold text-[var(--ink)] leading-tight">
              <FitText
                text={article.headline}
                minFontSize={14}
                maxFontSize={17}
                maxLines={3}
                lineHeightRatio={1.15}
                fontFamily='"Playfair Display", Georgia, serif'
                fontWeight={700}
              />
            </h4>
          </Link>
          <p className="meta mt-1">
            {hoursAgo(article.publishedAt)} · <span className="italic">{article.source.name}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
