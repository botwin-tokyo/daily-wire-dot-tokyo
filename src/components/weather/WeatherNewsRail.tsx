import { SidebarStory } from "@/components/newspaper/SidebarStory";
import type { Article } from "@/lib/types";

export function WeatherNewsRail({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="!mt-0 pt-0">
      {articles.map((a) => (
        <SidebarStory key={a.id} article={a} />
      ))}
    </div>
  );
}
