import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/newspaper/PageShell";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { newspaperEditionQuery } from "@/lib/api";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "Weather — Botwin's Morning Wire" },
      { name: "description", content: "Local weather forecast, conditions, and outlook." },
      { property: "og:title", content: "Weather — Botwin's Morning Wire" },
      { property: "og:description", content: "Local weather forecast, conditions, and outlook." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newspaperEditionQuery),
  component: WeatherPage,
});

function WeatherPage() {
  return (
    <PageShell>
      <WeatherDashboard />
    </PageShell>
  );
}
