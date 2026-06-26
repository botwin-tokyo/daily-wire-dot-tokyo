import { Star } from "lucide-react";
import { useState } from "react";
import { FitText } from "@/components/pretext";
import type { Edition } from "@/lib/types";

export function AIEditorsNote({ edition }: { edition: Edition }) {
  const [open, setOpen] = useState(false);
  const n = edition.editorsNote;
  return (
    <section className="panel-tinted" aria-labelledby="ai-editors-note">
      <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-2">
        <Star
          className="h-4 w-4"
          strokeWidth={1.6}
          style={{ color: "var(--accent-gold)" }}
          aria-hidden
        />
        <h3 id="ai-editors-note" className="eyebrow" style={{ color: "var(--accent-gold)" }}>
          <FitText
            text="AI Editor's Note"
            minFontSize={10}
            maxFontSize={12}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
            fontWeight={700}
          />
        </h3>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed">{n.text}</p>
      <p className="mt-3 text-[14px] leading-relaxed">
        <strong className="font-sans font-semibold">Why it matters:</strong> {n.whyItMatters}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 read-more"
        aria-expanded={open}
      >
        {open ? "Hide" : "Learn how we curate"} →
      </button>
      {open && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--rule)] pt-3 text-[12px] font-sans text-[var(--ink-mid)]">
          <dt>Model</dt>
          <dd className="font-mono">{n.model}</dd>
          <dt>Generated</dt>
          <dd className="font-mono">{new Date(n.generatedAt).toLocaleString()}</dd>
          <dt>Sources considered</dt>
          <dd className="font-mono">{n.sourcesConsidered}</dd>
          <dt className="col-span-2 italic text-[var(--ink-faint)] mt-1">
            Always consult original reporting for full context.
          </dt>
        </dl>
      )}
    </section>
  );
}
