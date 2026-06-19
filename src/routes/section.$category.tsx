import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { SidebarStory } from "@/components/newspaper/SidebarStory";
import { getLatestEdition } from "@/lib/api";
import { CategorySchema } from "@/lib/types";

const editionQuery = queryOptions({ queryKey: ["edition", "latest"], queryFn: () => getLatestEdition() });

export const Route = createFileRoute("/section/$category")({
  head: ({ params }) => ({ meta: [{ title: `${params.category.toUpperCase()} — The Morning Wire` }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  component: SectionPage,
});

function SectionPage() {
  const { category } = Route.useParams();
  const { data: edition } = useSuspenseQuery(editionQuery);
  const cat = CategorySchema.safeParse(category);
  if (!cat.success) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <h1 className="font-serif text-3xl">Unknown section</h1>
          <Link to="/" className="mt-4 inline-block read-more">← Today's edition</Link>
        </div>
      </PageShell>
    );
  }
  const articles = edition.articles.filter((a) => a.category === cat.data);
  return (
    <PageShell>
      <div className="py-8">
        <p className="eyebrow eyebrow-red">Section</p>
        <h1 className="mt-2 font-serif font-black text-[48px] leading-none">{cat.data.toUpperCase()}</h1>
        <p className="mt-2 meta">{articles.length} stories in today's edition</p>
      </div>
      <div className="grid gap-0 md:grid-cols-2 md:gap-x-8 border-t border-[var(--ink)]">
        {articles.length === 0 ? (
          <p className="py-12 meta italic">No stories found for this section today.</p>
        ) : articles.map((a) => <SidebarStory key={a.id} article={a} />)}
      </div>
    </PageShell>
  );
}