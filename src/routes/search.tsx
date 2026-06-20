import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/components/newspaper/PageShell";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { FitText } from "@/components/pretext";
import { searchArticles } from "@/lib/api";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — The Morning Wire" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchArticles(q),
    enabled: q.length > 0,
  });
  return (
    <PageShell>
      <div className="py-10">
        <p className="eyebrow eyebrow-red">
          <FitText
            text="Search"
            minFontSize={9}
            maxFontSize={11}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
            fontWeight={700}
          />
        </p>
        <h1 className="mt-2 font-serif font-black leading-none">
          <FitText
            text="Search the archive"
            minFontSize={32}
            maxFontSize={56}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h1>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 flex items-center gap-3 border-b border-[var(--ink)] py-2"
        >
          <Search className="h-4 w-4 text-[var(--ink-mid)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Headlines, summaries, sources, tags…"
            className="w-full bg-transparent font-serif text-xl outline-none placeholder:text-[var(--ink-faint)]"
          />
        </form>
        <div className="mt-6">
          {!q && <p className="meta italic">Type a query to begin.</p>}
          {q && isFetching && <p className="meta">Searching…</p>}
          {q && !isFetching && data && data.length === 0 && (
            <p className="meta italic">No results for "{q}".</p>
          )}
          {data && data.length > 0 && (
            <ul className="border-t border-[var(--rule)]">
              {data.map((a) => (
                <li key={a.id}>
                  <SidebarStory article={a} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
