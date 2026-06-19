import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 text-[12px] text-[var(--ink-mid)] font-sans">
        <span>© 2025 The Morning Wire. All rights reserved.</span>
        <div className="flex items-center gap-3">
          <Link to="/settings" className="hover:text-[var(--ink)]">Privacy Policy</Link>
          <span className="text-[var(--rule)]">|</span>
          <Link to="/settings" className="hover:text-[var(--ink)]">Terms of Service</Link>
          <span className="text-[var(--rule)]">|</span>
          <Link to="/settings" className="hover:text-[var(--ink)]">Contact</Link>
        </div>
      </div>
    </footer>
  );
}