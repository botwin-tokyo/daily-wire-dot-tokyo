import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/newspaper/PageShell";
import { FitText } from "@/components/pretext";
import { getSettings, updateSettings, testFeed, triggerGeneration } from "@/lib/api";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Edition Settings — Botwin's Morning Wire" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const save = useMutation({
    mutationFn: (next: Settings) => updateSettings(next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
  const generate = useMutation({ mutationFn: () => triggerGeneration() });
  const [feedMsg, setFeedMsg] = useState<Record<string, string>>({});

  if (isLoading || !data) {
    return (
      <PageShell>
        <p className="py-12 meta">Loading settings…</p>
      </PageShell>
    );
  }

  const s = data;
  return (
    <PageShell>
      <div className="py-10 max-w-4xl">
        <p className="eyebrow eyebrow-red">
          <FitText
            text="Edition Settings"
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
            text="Personalize your morning"
            minFontSize={32}
            maxFontSize={56}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Playfair Display", Georgia, serif'
            fontWeight={900}
          />
        </h1>

        <Section title="Personalization">
          <Row
            label="Preferred categories"
            value={s.personalization.preferredCategories.join(", ")}
          />
          <Row label="Muted topics" value={s.personalization.mutedTopics.join(", ") || "—"} />
          <Row label="Preferred sources" value={s.personalization.preferredSources.join(", ")} />
          <Row
            label="Geographic interests"
            value={s.personalization.geographicInterests.join(", ")}
          />
          <Row label="Keyword interests" value={s.personalization.keywordInterests.join(", ")} />
          <Row label="Viewpoint diversity" value={s.personalization.viewpointDiversity} />
          <Row
            label="Max stories per edition"
            value={String(s.personalization.maxStoriesPerEdition)}
          />
        </Section>

        <Section title="Morning Schedule">
          <Row label="Delivery time" value={s.schedule.deliveryTime + " " + s.schedule.timezone} />
          <Row label="Days" value={s.schedule.days.join(", ").toUpperCase()} />
          <Row label="Generate automatically" value={s.schedule.autoGenerate ? "Yes" : "No"} />
          <Row
            label="Regenerate on failure"
            value={s.schedule.regenerateOnFailure ? "Yes" : "No"}
          />
          <div className="pt-3">
            <button
              onClick={() => generate.mutate()}
              className="border border-[var(--ink)] px-4 py-2 font-sans text-[12px] font-semibold uppercase tracking-wider hover:bg-[var(--ink)] hover:text-[var(--paper)]"
            >
              {generate.isPending ? "Queuing…" : "Generate new edition"}
            </button>
            {generate.data && (
              <p className="mt-2 meta">
                Job queued: <span className="font-mono">{generate.data.jobId}</span>
              </p>
            )}
          </div>
        </Section>

        <Section title="AI Configuration">
          <Row
            label="Provider"
            value={`${s.ai.provider} ${s.ai.providerConfigured ? "✓ configured" : "(not configured)"}`}
          />
          <Row label="Model" value={s.ai.model} mono />
          <Row label="Summary length" value={s.ai.summaryLength} />
          <Row label="Editorial tone" value={s.ai.tone} />
          <Row label="Include 'Why it matters'" value={s.ai.includeWhyItMatters ? "Yes" : "No"} />
          <Row label="Cross-story analysis" value={s.ai.includeCrossStoryAnalysis ? "Yes" : "No"} />
          <Row label="Source balancing" value={s.ai.sourceBalancing ? "Yes" : "No"} />
          <p className="meta italic mt-2">
            API keys are stored server-side and never exposed to the browser.
          </p>
        </Section>

        <Section title="Feed Management">
          <table className="w-full text-[13px] font-sans border border-[var(--rule)]">
            <thead className="bg-[var(--paper-tinted)]">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-[var(--rule)]">Feed</th>
                <th className="px-3 py-2 border-b border-[var(--rule)]">Category</th>
                <th className="px-3 py-2 border-b border-[var(--rule)]">Health</th>
                <th className="px-3 py-2 border-b border-[var(--rule)]">Last success</th>
                <th className="px-3 py-2 border-b border-[var(--rule)]"></th>
              </tr>
            </thead>
            <tbody>
              {s.feeds.map((f) => (
                <tr key={f.id} className="border-b border-[var(--rule)] last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{f.name}</div>
                    <div className="meta">{f.url}</div>
                  </td>
                  <td className="px-3 py-2">{f.category}</td>
                  <td className="px-3 py-2">
                    <span
                      style={{
                        color:
                          f.health === "healthy"
                            ? "var(--positive)"
                            : f.health === "degraded"
                              ? "var(--accent-gold)"
                              : "var(--negative)",
                      }}
                    >
                      ● {f.health}
                    </span>
                    {f.lastError && <div className="meta italic">{f.lastError}</div>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px]">
                    {f.lastSuccessAt ? new Date(f.lastSuccessAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={async () => {
                        const r = await testFeed(f.id);
                        setFeedMsg((m) => ({ ...m, [f.id]: r.message }));
                      }}
                      className="border border-[var(--ink)] px-2 py-1 text-[11px] uppercase tracking-wider"
                    >
                      Test
                    </button>
                    {feedMsg[f.id] && <div className="meta mt-1">{feedMsg[f.id]}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="mt-10 border-t border-[var(--rule)] pt-6 flex items-center gap-4">
          <button
            onClick={() => save.mutate(s)}
            className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-5 py-2 font-sans text-[12px] font-semibold uppercase tracking-wider"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
          {save.isSuccess && <span className="meta">Settings saved.</span>}
        </div>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif border-b border-[var(--ink)] pb-2">
        <FitText
          text={title}
          minFontSize={20}
          maxFontSize={24}
          maxLines={1}
          lineHeightRatio={1}
          fontFamily='"Playfair Display", Georgia, serif'
          fontWeight={700}
        />
      </h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 border-b border-[var(--rule)] py-2">
      <dt className="font-sans text-[13px] text-[var(--ink-mid)]">{label}</dt>
      <dd className={`text-[14px] ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
