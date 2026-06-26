import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PageShell } from "@/components/newspaper/PageShell";
import { FitText } from "@/components/pretext";
import { listEditions } from "@/lib/api";

const editionsQuery = queryOptions({ queryKey: ["editions"], queryFn: () => listEditions() });

export const Route = createFileRoute("/editions")({
  head: () => ({ meta: [{ title: "Edition Archive — Botwin's Morning Wire" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(editionsQuery),
  component: EditionsPage,
});

function EditionsPage() {
  const { data: editions } = useSuspenseQuery(editionsQuery);
  return (
    <PageShell>
      <div className="py-10">
        <p className="eyebrow eyebrow-red">
          <FitText
            text="Edition Archive"
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
            text="Past Editions"
            minFontSize={32}
            maxFontSize={56}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h1>
        <p className="mt-3 meta">Browse every edition published by Botwin's Morning Wire.</p>

        <ul className="mt-8 border-t border-[var(--ink)]">
          {editions.map((e) => (
            <li key={e.id} className="border-b border-[var(--rule)]">
              <Link
                to="/editions/$date"
                params={{ date: e.editionDate }}
                className="grid grid-cols-[120px_1fr_auto] gap-6 items-baseline py-5 hover:bg-[var(--paper-tinted)] px-3 -mx-3"
              >
                <span className="font-mono text-[13px]">{e.editionDate}</span>
                <div>
                  <h2 className="font-serif font-bold leading-tight">
                    <FitText
                      text={e.leadHeadline}
                      minFontSize={16}
                      maxFontSize={22}
                      maxLines={2}
                      lineHeightRatio={1.15}
                      fontFamily='"Playfair Display", Georgia, serif'
                      fontWeight={700}
                    />
                  </h2>
                  <p className="mt-1 meta">
                    {e.storyCount} stories · {e.categories.join(" · ")}
                    {e.status === "published_with_warnings" && (
                      <span className="ml-2" style={{ color: "var(--accent-red)" }}>
                        · warnings
                      </span>
                    )}
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
