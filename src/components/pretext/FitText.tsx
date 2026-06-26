import { useEffect, useRef, useState } from "react";
import { layout, prepare, type PreparedText } from "@chenglou/pretext";

interface FitTextProps {
  text: string;
  minFontSize?: number;
  maxFontSize?: number;
  maxLines?: number;
  lineHeightRatio?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

function buildFont(fontSize: number, fontWeight: number | string, fontFamily: string): string {
  return `${fontWeight} ${fontSize}px ${fontFamily}`;
}

export function FitText({
  text,
  minFontSize = 12,
  maxFontSize = 120,
  maxLines = 1,
  lineHeightRatio = 1.15,
  fontFamily = "Georgia, serif",
  fontWeight = 400,
  className,
  style,
}: FitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const preparedRef = useRef<PreparedText | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const hasExplicitHeight = container.clientHeight > 0;
      const height = hasExplicitHeight ? container.clientHeight : Infinity;
      const lineHeight = (size: number) => Math.ceil(size * lineHeightRatio);

      let low = minFontSize;
      let high = maxFontSize;
      let best = minFontSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const font = buildFont(mid, fontWeight, fontFamily);
        preparedRef.current = prepare(text, font, { whiteSpace: "normal" });
        const { lineCount } = layout(preparedRef.current, width, lineHeight(mid));
        const fitsLines = lineCount <= maxLines;
        const fitsHeight = lineCount * lineHeight(mid) <= height;

        if (fitsLines && fitsHeight) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFontSize(best);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text, minFontSize, maxFontSize, maxLines, lineHeightRatio, fontFamily, fontWeight]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        ...style,
        display: "block",
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeightRatio}em`,
        overflow: "hidden",
      }}
    >
      {text}
    </span>
  );
}
