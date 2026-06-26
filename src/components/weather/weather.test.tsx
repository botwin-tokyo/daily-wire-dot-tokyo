import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WeatherDashboard } from "./WeatherDashboard";
import { useLocalWeather } from "@/hooks/use-local-weather";

vi.mock("@/hooks/use-local-weather", () => ({
  useLocalWeather: vi.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("WeatherDashboard", () => {
  beforeEach(() => {
    vi.mocked(useLocalWeather).mockReturnValue({
      data: null,
      loading: false,
      error: "Location permission denied.",
      permission: "denied",
    });
  });

  it("shows location search when location is unavailable", () => {
    render(
      <Wrapper>
        <WeatherDashboard />
      </Wrapper>,
    );
    expect(screen.getByText("Location needed")).toBeInTheDocument();
  });
});
