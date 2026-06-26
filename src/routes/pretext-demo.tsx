import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FitText, PretextCanvasText, type TextObstacle } from "@/components/pretext";
import { PageShell } from "@/components/newspaper/PageShell";

export const Route = createFileRoute("/pretext-demo")({
  component: PretextDemoPage,
});

const SAMPLE_HEADLINE =
  "Pretext brings newspaper layouts to life: text that wraps around whatever you throw at it";

const SAMPLE_BODY = `For decades, web designers have been trapped inside rectangles. Headlines sit in boxes. Body copy flows in straight columns. Images float with clumsy margins. But a browser page is just pixels, and pixels don't have to be rectangular.

Pretext, by Cheng Lou, treats text layout as a measurement problem rather than a layout-engine problem. It prepares the text once, measures every segment with the browser's own font engine, and then lets you place each line wherever you want.

That means a newspaper can wrap a story around a portrait, a chart, or a breaking-news callout. It means a headline can shrink or grow to fill the exact space available. And because the hot path is pure arithmetic, it can stay smooth while the reader drags, resizes, or scrolls.

Drag the floating box on the canvas below to see the paragraph reflow around it in real time. This is the same technique used for dynamic editorial spreads, chat bubbles that shrink-wrap to their text, and data visualizations where labels never overlap.`;

function PretextDemoPage() {
  const [obstacles, setObstacles] = useState<TextObstacle[]>([
    {
      id: "float",
      x: 360,
      y: 120,
      width: 140,
      height: 140,
      src: "#",
      label: "Drag me",
    },
  ]);

  return (
    <PageShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 border-b pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Interactive Typography Demo
          </p>
          <FitText
            text={SAMPLE_HEADLINE}
            maxFontSize={72}
            minFontSize={24}
            maxLines={3}
            className="font-serif font-bold leading-tight text-foreground"
          />
        </div>

        <section className="mb-8 rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Drag the obstacle</h2>
              <p className="text-sm text-muted-foreground">
                The paragraph reflows around the box in real time using Pretext.
              </p>
            </div>
          </div>

          <PretextCanvasText
            text={SAMPLE_BODY}
            width={800}
            height={520}
            font='18px Georgia, "Times New Roman", serif'
            lineHeight={28}
            padding={20}
            obstacles={obstacles}
            onObstaclesChange={setObstacles}
            className="mx-auto w-full max-w-[800px] cursor-grab rounded border bg-background text-foreground active:cursor-grabbing"
          />
        </section>

        <section className="prose prose-stone max-w-none dark:prose-invert">
          <h3 className="font-serif text-xl font-semibold">How it works</h3>
          <ul>
            <li>
              <strong>Prepare:</strong> Pretext segments and measures the text once using an
              off-screen canvas.
            </li>
            <li>
              <strong>Layout:</strong> For each line, we ask Pretext for the next line that fits the
              available width at that vertical position.
            </li>
            <li>
              <strong>Render:</strong> Each materialized line is drawn to the canvas at the computed
              x/y.
            </li>
            <li>
              <strong>Interact:</strong> On drag, the obstacle position changes, the available
              widths change, and the text reflows without touching the DOM layout engine.
            </li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Because the text lives on a canvas, this demo trades native text selection for layout
            freedom. In production you'd pair the canvas with a visually-hidden plain-text copy for
            screen readers and search engines.
          </p>
        </section>
      </main>
    </PageShell>
  );
}
