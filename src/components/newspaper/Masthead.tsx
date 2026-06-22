import { Link } from "@tanstack/react-router";
import type { NewspaperMasthead } from "@/lib/types";
import { FitText } from "@/components/pretext";

export function Masthead({ data }: { data: NewspaperMasthead }) {
  return (
    <header className="border-b border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto max-w-[1440px] px-6 pt-8 pb-5 text-center">
        <Link to="/" className="inline-block">
          <h1 className="font-serif font-black text-[var(--ink)]" style={{ lineHeight: 1 }}>
            <FitText
              text={data.title}
              minFontSize={32}
              maxFontSize={96}
              maxLines={1}
              lineHeightRatio={1}
              fontFamily='"Playfair Display", Georgia, serif'
              fontWeight={900}
            />
          </h1>
        </Link>
        <div className="mt-3 flex items-center justify-center gap-4">
          <span className="h-px flex-1 max-w-[120px] bg-[var(--ink)]" aria-hidden />
          <span className="font-serif italic text-[var(--ink-mid)]">
            <FitText
              text={data.tagline}
              minFontSize={12}
              maxFontSize={18}
              maxLines={1}
              lineHeightRatio={1}
              fontFamily='"Playfair Display", Georgia, serif'
              fontWeight={400}
            />
          </span>
          <span className="h-px flex-1 max-w-[120px] bg-[var(--ink)]" aria-hidden />
        </div>
      </div>
    </header>
  );
}
