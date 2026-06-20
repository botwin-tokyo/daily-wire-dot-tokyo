import { Globe, BarChart3, HeartPulse, Cpu, Sparkles, Coins, Landmark } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FitText } from "@/components/pretext";
import type { Edition } from "@/lib/types";

const iconMap = {
  globe: Globe,
  chart: BarChart3,
  health: HeartPulse,
  tech: Cpu,
  culture: Sparkles,
  crypto: Coins,
  politics: Landmark,
};

export function MorningBriefing({ edition }: { edition: Edition }) {
  return (
    <section className="panel-tinted" aria-labelledby="morning-briefing">
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2">
        <h3
          id="morning-briefing"
          className="eyebrow eyebrow-red"
          style={{ color: "var(--live-dot)" }}
        >
          <FitText
            text="◆ Morning Briefing"
            minFontSize={10}
            maxFontSize={12}
            maxLines={1}
            lineHeightRatio={1}
            fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
            fontWeight={700}
          />
        </h3>
        <span className="meta">
          {edition.readingTimeMin} min · {edition.storiesAnalyzed} stories analyzed
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {edition.morningBriefing.map((b) => {
          const Icon = iconMap[b.icon];
          return (
            <li key={b.topic} className="flex gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-mid)]" strokeWidth={1.4} />
              <p className="text-[14px] leading-snug">
                <strong className="font-sans font-semibold">{b.topic}:</strong> {b.text}{" "}
                <span className="meta italic">Source: {b.sourceName}</span>
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--rule)] pt-3">
        <Link to="/editions" className="read-more">
          See full briefing →
        </Link>
        <button
          type="button"
          className="meta hover:text-[var(--ink)]"
          aria-label="Listen to briefing (coming soon)"
        >
          ▶ Listen to briefing
        </button>
      </div>
    </section>
  );
}
