import { useEffect, useRef, useState } from "react";
import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

export interface TextObstacle {
  id: string;
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  width: number;
  height: number;
}

interface PretextWrappedTextProps {
  text: string;
  fontSize: number;
  lineHeight: number;
  fontFamily?: string;
  fontWeight?: number | string;
  padding?: number;
  obstacles?: TextObstacle[];
  className?: string;
  style?: React.CSSProperties;
}

interface ResolvedObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Line {
  key: string;
  text: string;
  x: number;
  y: number;
  width: number;
}

function resolveObstacles(obstacles: TextObstacle[], containerWidth: number): ResolvedObstacle[] {
  return obstacles.map((ob) => {
    let x = 0;
    let y = 0;
    if (ob.x !== undefined) x = ob.x;
    else if (ob.right !== undefined) x = Math.max(0, containerWidth - ob.right - ob.width);
    if (ob.y !== undefined) y = ob.y;
    else if (ob.bottom !== undefined) y = Math.max(0, ob.y ?? 0);
    return { id: ob.id, x, y, width: ob.width, height: ob.height };
  });
}

function getLineWidth(
  y: number,
  lineHeight: number,
  containerWidth: number,
  padding: number,
  obstacles: ResolvedObstacle[],
): { x: number; width: number } {
  const lineTop = y;
  const lineBottom = y + lineHeight;
  let left = padding;
  let right = containerWidth - padding;

  for (const ob of obstacles) {
    const overlaps = ob.y < lineBottom && ob.y + ob.height > lineTop;
    if (!overlaps) continue;
    if (ob.x + ob.width <= left || ob.x >= right) continue;

    const leftLane = ob.x - padding;
    const rightLane = containerWidth - padding - (ob.x + ob.width);

    if (leftLane >= rightLane) {
      right = Math.min(right, ob.x);
    } else {
      left = Math.max(left, ob.x + ob.width);
    }
  }

  return { x: left, width: Math.max(0, right - left) };
}

export function PretextWrappedText({
  text,
  fontSize,
  lineHeight,
  fontFamily = 'Georgia, "Times New Roman", serif',
  fontWeight = 400,
  padding = 0,
  obstacles = [],
  className,
  style,
}: PretextWrappedTextProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  useEffect(() => {
    if (typeof window === "undefined" || !container) return;

    const measure = () => {
      const width = container.clientWidth;
      if (!width) return;

      preparedRef.current = prepareWithSegments(text, font, {
        whiteSpace: "normal",
      });

      const resolved = resolveObstacles(obstacles, width);
      const result: Line[] = [];
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = padding;
      const maxHeight = 100000;

      while (y + lineHeight <= maxHeight) {
        const { x, width: lineWidth } = getLineWidth(y, lineHeight, width, padding, resolved);
        if (lineWidth <= 0) {
          y += lineHeight;
          continue;
        }

        const range = layoutNextLineRange(preparedRef.current, cursor, lineWidth);
        if (!range) break;

        const line = materializeLineRange(preparedRef.current, range);
        result.push({
          key: `${y}-${cursor.segmentIndex}-${cursor.graphemeIndex}`,
          text: line.text,
          x,
          y,
          width: lineWidth,
        });

        const prev = cursor;
        cursor = range.end;
        y += lineHeight;

        if (
          cursor.segmentIndex === prev.segmentIndex &&
          cursor.graphemeIndex === prev.graphemeIndex
        ) {
          break;
        }
      }

      setLines(result);
      setReady(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container, text, font, fontSize, lineHeight, padding, obstacles, fontWeight, fontFamily]);

  const containerHeight = lines.length ? lines[lines.length - 1].y + lineHeight + padding : 0;

  return (
    <div
      ref={setContainer}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: ready ? containerHeight : undefined,
        ...style,
      }}
    >
      <span className="sr-only">{text}</span>
      {!ready && (
        <p
          style={{
            margin: 0,
            font,
            lineHeight: `${lineHeight}px`,
          }}
        >
          {text}
        </p>
      )}
      {ready &&
        lines.map((line) => (
          <span
            key={line.key}
            style={{
              position: "absolute",
              left: line.x,
              top: line.y,
              width: line.width,
              whiteSpace: "nowrap",
              font,
              lineHeight: `${lineHeight}px`,
              color: "currentColor",
            }}
          >
            {line.text}
          </span>
        ))}
    </div>
  );
}
