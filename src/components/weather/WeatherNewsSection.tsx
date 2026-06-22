import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { newspaperEditionQuery } from "@/lib/api";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { RightStory } from "@/components/newspaper/RightStory";
import { adaptArticle } from "./adapt-article";
import type { Article } from "@/lib/types";

export function WeatherNewsSection({ articles: propArticles }: { articles?: Article[] } = {}) {
  const { data: edition, isLoading, error } = useQuery(newspaperEditionQuery);

  const articles =
    propArticles ??
    (edition
      ? edition.articles
          .filter((a) => a.category === "weather")
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .map(adaptArticle)
      : []);

  if (!propArticles && isLoading) {
    return (
      <div className="flex h-32 items-center justify-center border-t border-[var(--rule)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--ink-mid)]" />
      </div>
    );
  }

  if (!propArticles && error) {
    return null;
  }

  if (articles.length === 0) {
    return null;
  }

  const leftArticles = articles.filter((_, i) => i % 2 === 0);
  const rightArticles = articles.filter((_, i) => i % 2 === 1);

  return (
    <section className="!mt-0 pt-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:border-r lg:border-[var(--rule)] lg:pr-5">
          {leftArticles.map((a) => (
            <SidebarStory key={a.id} article={a} />
          ))}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:pl-5">
          {rightArticles.map((a) => (
            <RightStory key={a.id} article={a} />
          ))}
        </div>
      </div>
    </section>
  );
}
