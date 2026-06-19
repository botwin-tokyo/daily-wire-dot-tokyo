import { Calendar, Cloud, Globe, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function UtilityBar({ updatedAt }: { updatedAt: string }) {
  return (
    <div className="border-b border-[var(--rule)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-2 text-[12px] text-[var(--ink-mid)] font-sans">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
            May 20, 2025
          </span>
          <span className="text-[var(--rule)]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Cloud className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span><strong className="font-semibold text-[var(--ink)]">18°C</strong> Partly Cloudy</span>
          </span>
          <span className="text-[var(--rule)]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            Edition: Global ▾
          </span>
        </div>
        <div className="hidden md:block font-mono text-[12px]">
          Updated by AI at {updatedAt}
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "var(--live-dot)" }} aria-hidden />
            <span>Next edition scheduled</span>
          </span>
          <span className="text-[var(--rule)]">|</span>
          <Link to="/settings" className="inline-flex items-center gap-1.5 hover:text-[var(--ink)]">
            <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
            Edition Settings ▾
          </Link>
        </div>
      </div>
    </div>
  );
}