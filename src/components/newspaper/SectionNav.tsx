import { Link, useLocation } from "@tanstack/react-router";
import type { NewspaperNavigation } from "@/lib/types";

export function SectionNav({ data }: { data: NewspaperNavigation }) {
  const { pathname } = useLocation();

  const items = data.items ?? [];
  const moreLinks = data.moreLinks ?? [];

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 h-[42px]">
        <ul className="flex items-center gap-0 overflow-x-auto">
          {items.map((s, i) => {
            const active = s.path === "/" ? pathname === "/" : pathname.startsWith(s.path);
            return (
              <li key={s.id} className="flex items-center">
                {i > 0 && (
                  <span className="px-3 text-[var(--rule)]" aria-hidden>
                    |
                  </span>
                )}
                <Link to={s.path} className={`nav-link ${active ? "active" : ""}`}>
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4">
          {moreLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className="hidden md:inline-flex nav-link items-center gap-1.5"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
