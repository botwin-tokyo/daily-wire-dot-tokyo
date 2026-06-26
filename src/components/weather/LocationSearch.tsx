import { useState } from "react";
import { MapPin, Search, RefreshCw } from "lucide-react";
import { geocodeCity } from "@/lib/weather-api";

export interface LocationSearchProps {
  onSelect: (location: { latitude: number; longitude: number; city: string }) => void;
  onRetryGeolocation?: () => void;
  error?: string | null;
  loading?: boolean;
}

export function LocationSearch({
  onSelect,
  onRetryGeolocation,
  error,
  loading,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await geocodeCity(query.trim());
      if (!result) {
        setSearchError("City not found. Try a different name.");
        return;
      }
      onSelect({
        latitude: result.latitude,
        longitude: result.longitude,
        city: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--rule)]/30">
        <MapPin className="h-6 w-6 text-[var(--ink-mid)]" />
      </div>
      <h3 className="mb-2 font-serif text-xl text-[var(--ink)]">Location needed</h3>
      <p className="mb-4 text-sm text-[var(--ink-mid)]">
        Allow location access or search for a city to see your personalized weather dashboard.
      </p>
      {(error || searchError) && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || searchError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city..."
          className="flex-1 rounded border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-mid)]"
        />
        <button
          type="submit"
          disabled={searching || loading}
          className="inline-flex items-center gap-1.5 rounded bg-[var(--ink)] px-3 py-2 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
        >
          {searching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </button>
      </form>
      {onRetryGeolocation && (
        <button
          onClick={onRetryGeolocation}
          disabled={loading}
          className="text-sm text-[var(--ink-mid)] underline hover:text-[var(--ink)]"
        >
          Retry device location
        </button>
      )}
    </div>
  );
}
