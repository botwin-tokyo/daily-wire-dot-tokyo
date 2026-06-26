import { Moon } from "lucide-react";
import { getMoonPhase } from "@/lib/weather-utils";

export function MoonPhaseWidget() {
  const phase = getMoonPhase();

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h3 className="mb-3 font-serif text-lg text-[var(--ink)]">Moon Phase</h3>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--rule)]/10">
          <Moon className="h-8 w-8 text-[var(--ink-mid)]" strokeWidth={1.4} />
        </div>
        <div>
          <div className="font-serif text-xl text-[var(--ink)]">{phase.name}</div>
          <div className="text-sm text-[var(--ink-mid)]">{phase.illumination}% illuminated</div>
          <div className="text-xs text-[var(--ink-faint)]">
            Rise and set times shown are approximate
          </div>
        </div>
      </div>
    </div>
  );
}
