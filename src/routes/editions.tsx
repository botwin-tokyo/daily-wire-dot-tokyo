import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { listEditions } from "@/lib/api";

const editionsQuery = queryOptions({ queryKey: ["editions"], queryFn: () => listEditions() });

export const Route = createFileRoute("/editions")({
  head: () => ({ meta: [{ title: "Edition Archive — The Morning Wire" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionsQuery),
  component: EditionsPage,
});

function EditionsPage() {
  const { data: editions } = useSuspenseQuery(editionsQuery);
  return (
    <PageShell>
      <div className="py-10">
        <p className="eyebrow eyebrow-red">Edition Archive</p>
        <h1 className="mt-2 font-serif font-black text-[40px] leading-none">Past Editions</h1>
        <p className="mt-3 meta">Browse every edition published by The Morning Wire.</p>

        <ul className="mt-8 border-t border-[var(--ink)]">
          {editions.map((e) => (
            <li key={e.id} className="border-b border-[var(--rule)]">
              <Link to="/editions/$date" params={{ date: e.editionDate }} className="grid grid-cols-[120px_1fr_auto] gap-6 items-baseline py-5 hover:bg-[var(--paper-tinted)] px-3 -mx-3">
                <span className="font-mono text-[13px]">{e.editionDate}</span>
                <div>
                  <h2 className="font-serif font-bold text-[22px] leading-tight">{e.leadHeadline}</h2>
                  <p className="mt-1 meta">
                    {e.storyCount} stories · {e.categories.join(" · ")}
                    {e.status === "published_with_warnings" && <span className="ml-2" style={{ color: "var(--accent-red)" }}>· warnings</span>}
                  </p>
                </div>
                <span className="read-more">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}