import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { FitText } from "@/components/pretext";
import { getSavedArticles } from "@/lib/api";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Saved — The Morning Wire" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { data, isLoading } = useQuery({ queryKey: ["saved"], queryFn: () => getSavedArticles() });
  return (
    <PageShell>
      <div className="py-10">
        <p className="eyebrow eyebrow-red">
          <FitText
            text="Saved"
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
            text="Your Reading List"
            minFontSize={32}
            maxFontSize={56}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h1>
        <p className="mt-3 meta">Articles you've bookmarked for later.</p>
        <div className="mt-8 border-t border-[var(--ink)]">
          {isLoading && <p className="py-8 meta">Loading…</p>}
          {!isLoading && (!data || data.length === 0) && (
            <div className="py-16 text-center">
              <p className="font-serif text-xl italic text-[var(--ink-mid)]">
                Your reading list is empty.
              </p>
              <Link to="/" className="mt-4 inline-block read-more">
                ← Today's edition
              </Link>
            </div>
          )}
          {data && data.map((a) => <SidebarStory key={a.id} article={a} />)}
        </div>
      </div>
    </PageShell>
  );
}
