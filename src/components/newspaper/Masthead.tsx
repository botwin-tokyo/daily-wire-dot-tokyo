import { Link } from "@tanstack/react-router";

export function Masthead() {
  return (
    <header className="border-b border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto max-w-[1440px] px-6 pt-8 pb-5 text-center">
        <Link to="/" className="inline-block">
          <h1
            className="font-serif font-black text-[var(--ink)]"
            style={{
              fontSize: "clamp(52px, 8vw, 96px)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            The Morning Wire
          </h1>
        </Link>
        <div className="mt-3 flex items-center justify-center gap-4">
          <span className="h-px flex-1 max-w-[120px] bg-[var(--ink)]" aria-hidden />
          <span className="font-serif italic text-[var(--ink-mid)]" style={{ fontSize: "clamp(14px,1.5vw,18px)" }}>
            Your Personal Daily Intelligence
          </span>
          <span className="h-px flex-1 max-w-[120px] bg-[var(--ink)]" aria-hidden />
        </div>
      </div>
    </header>
  );
}