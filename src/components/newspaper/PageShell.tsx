import type { ReactNode } from "react";
import { UtilityBar } from "./UtilityBar";
import { Masthead } from "./Masthead";
import { SectionNav } from "./SectionNav";
import { SiteFooter } from "./SiteFooter";

export function PageShell({ children, updatedAt = "05:30" }: { children: ReactNode; updatedAt?: string }) {
  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      <UtilityBar updatedAt={updatedAt} />
      <Masthead />
      <SectionNav />
      <main className="mx-auto max-w-[1440px] px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}