import { useEffect, useRef, useState } from "react";
import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

export interface TextObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  label?: string;
}

interface PretextCanvasTextProps {
  text: string;
  width: number;
  height: number;
  font?: string;
  lineHeight?: number;
  padding?: number;
  obstacles?: TextObstacle[];
  className?: string;
  onObstaclesChange?: (obstacles: TextObstacle[]) => void;
}

interface DragState {
  obstacleId: string;
  offsetX: number;
  offsetY: number;
}

function getLineWidth(
  y: number,
  lineHeight: number,
  containerWidth: number,
  padding: number,
  obstacles: TextObstacle[],
): { x: number; width: number } {
  const lineTop = y;
  const lineBottom = y + lineHeight;
  let left = padding;
  let right = containerWidth - padding;

  for (const ob of obstacles) {
    const overlaps = ob.y < lineBottom && ob.y + ob.height > lineTop;
    if (!overlaps) continue;

    if (ob.x + ob.width <= left || ob.x >= right) continue;

    // Shrink from the side the obstacle is on. For simplicity, keep the
    // larger of the two free lanes (left or right of the obstacle).
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

function fontSizeFromFont(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)\s*(?:px|pt|em|rem)/i);
  return match ? parseFloat(match[1]) : 16;
}

export function PretextCanvasText({
  text,
  width,
  height,
  font = '18px Georgia, "Times New Roman", serif',
  lineHeight = 26,
  padding = 16,
  obstacles = [],
  className,
  onObstaclesChange,
}: PretextCanvasTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [internalObstacles, setInternalObstacles] = useState<TextObstacle[]>(obstacles);

  const activeObstacles = onObstaclesChange ? obstacles : internalObstacles;

  useEffect(() => {
    if (typeof window === "undefined") return;
    preparedRef.current = prepareWithSegments(text, font, {
      whiteSpace: "normal",
    });
  }, [text, font]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas || !preparedRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.clearRect(0, 0, width, height);

    // Text
    ctx.font = font;
    ctx.fillStyle = "currentColor";
    ctx.textBaseline = "top";

    const prepared = preparedRef.current;
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = padding;
    const fontSize = fontSizeFromFont(font);

    while (y + lineHeight <= height - padding) {
      const { x, width: lineWidth } = getLineWidth(y, lineHeight, width, padding, activeObstacles);

      if (lineWidth <= 0) {
        y += lineHeight;
        continue;
      }

      const range = layoutNextLineRange(prepared, cursor, lineWidth);
      if (!range) break;

      const line = materializeLineRange(prepared, range);
      ctx.fillText(line.text, x, y + (lineHeight - fontSize) * 0.15);

      const prev = cursor;
      cursor = range.end;
      y += lineHeight;

      // Safety: if the line consumed nothing, advance to avoid infinite loop.
      if (
        range.end.segmentIndex === prev.segmentIndex &&
        range.end.graphemeIndex === prev.graphemeIndex
      ) {
        break;
      }
    }

    // Obstacles
    for (const ob of activeObstacles) {
      if (ob.src) {
        // We draw a placeholder rect; images would need async loading.
        ctx.fillStyle = "rgba(120, 113, 108, 0.2)";
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.strokeStyle = "rgba(120, 113, 108, 0.5)";
        ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);
        ctx.fillStyle = "currentColor";
        ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ob.label ?? "Drag me", ob.x + ob.width / 2, ob.y + ob.height / 2 + 4);
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = "rgba(120, 113, 108, 0.2)";
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
      }
    }
  }, [width, height, font, lineHeight, padding, activeObstacles]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const ob of activeObstacles) {
      if (x >= ob.x && x <= ob.x + ob.width && y >= ob.y && y <= ob.y + ob.height) {
        dragRef.current = {
          obstacleId: ob.id,
          offsetX: x - ob.x,
          offsetY: y - ob.y,
        };
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const next = activeObstacles.map((ob) => {
      if (ob.id !== dragRef.current?.obstacleId) return ob;
      return {
        ...ob,
        x: Math.max(0, Math.min(width - ob.width, x - dragRef.current.offsetX)),
        y: Math.max(0, Math.min(height - ob.height, y - dragRef.current.offsetY)),
      };
    });

    if (onObstaclesChange) {
      onObstaclesChange(next);
    } else {
      setInternalObstacles(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  };

  if (typeof window === "undefined") {
    return <div className={className} style={{ width, height }} aria-label={text} role="img" />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      aria-label={text}
      role="img"
    />
  );
}
