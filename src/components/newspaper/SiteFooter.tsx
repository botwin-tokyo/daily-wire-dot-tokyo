import { Link } from "@tanstack/react-router";
import type { NewspaperFooter } from "@/lib/types";

export function SiteFooter({ data }: { data: NewspaperFooter }) {
  return (
    <footer className="mt-12 border-t border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 text-[12px] text-[var(--ink-mid)] font-sans">
        <span>{data.copyright}</span>
        <div className="flex items-center gap-3">
          {data.links.map((link, index) => (
            <span key={link.path} className="inline-flex items-center gap-3">
              {index > 0 && <span className="text-[var(--rule)]">|</span>}
              <Link to={link.path} className="hover:text-[var(--ink)]">
                {link.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
