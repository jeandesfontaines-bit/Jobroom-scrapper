import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CollectPanel } from "@/components/jobroom/collect-panel";
import { JobDetail } from "@/components/jobroom/job-detail";
import { JobList } from "@/components/jobroom/job-list";
import { SearchPanel } from "@/components/jobroom/search-panel";
import { searchJobs } from "@/lib/jobroom/api";
import {
  PAGE_SIZE,
  defaultFilters,
  formatCount,
  type Filters,
  type JobHit,
  type SearchResult,
} from "@/lib/jobroom/model";

export const Route = createFileRoute("/")({ component: Home });

type Mode = "search" | "collect" | "favorites";
type Saved = { id: string; label: string; filters: Filters };
type Store = { favorites: JobHit[]; saved: Saved[] };

const STORAGE_KEY = "jobroom.v1";

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { favorites: [], saved: [] };
    const parsed = JSON.parse(raw) as Store;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    };
  } catch {
    return { favorites: [], saved: [] };
  }
}

function filterLabel(filters: Filters): string {
  const bits = [
    filters.keywords.trim(),
    filters.profession?.label,
    filters.locality ? `${filters.locality.city}` : "",
    filters.cantonCodes.join(" "),
  ].filter(Boolean);
  return bits.slice(0, 2).join(" · ") || "Toute la Suisse";
}

function Home() {
  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [active, setActive] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [mode, setMode] = useState<Mode>("search");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobHit | null>(null);
  const [store, setStore] = useState<Store>({ favorites: [], saved: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store, ready]);

  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    setError(null);
    void searchJobs({ data: { ...active, page, size: PAGE_SIZE } })
      .then((next) => {
        if (cancelled) return;
        setResult(next);
        setSelected((current) => {
          if (!current) return current;
          return next.jobs.some((job) => job.id === current.id) ? current : null;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Recherche impossible.");
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, page, nonce]);

  const favoriteIds = useMemo(() => new Set(store.favorites.map((job) => job.id)), [store.favorites]);

  function toggleFavorite(job: JobHit) {
    setStore((current) => {
      const exists = current.favorites.some((item) => item.id === job.id);
      return {
        ...current,
        favorites: exists
          ? current.favorites.filter((item) => item.id !== job.id)
          : [job, ...current.favorites].slice(0, 200),
      };
    });
  }

  function remember() {
    const entry: Saved = {
      id: crypto.randomUUID(),
      label: filterLabel(draft),
      filters: draft,
    };
    setStore((current) => ({
      ...current,
      saved: [entry, ...current.saved.filter((item) => item.label !== entry.label)].slice(0, 8),
    }));
  }

  const jobs = mode === "favorites" ? store.favorites : (result?.jobs ?? []);
  const total = mode === "favorites" ? store.favorites.length : (result?.total ?? 0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Portail public suisse</p>
            <h1 className="font-display text-4xl leading-none tracking-tight">Jobroom</h1>
            <p className="mt-1 max-w-md text-sm text-muted">
              Recherche en direct sur job-room.ch, fiches complètes et export.
            </p>
          </div>
          <div className="flex rounded-full bg-chip p-1" role="tablist" aria-label="Vues">
            {(
              [
                ["search", "Recherche"],
                ["collect", "Collecte"],
                ["favorites", `Favoris${store.favorites.length ? ` ${store.favorites.length}` : ""}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id);
                  setSelected(null);
                }}
                className={`h-10 rounded-full px-4 text-sm font-semibold ${
                  mode === id ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="order-2 space-y-3 lg:order-1">
          <SearchPanel
            filters={draft}
            searching={searching}
            onChange={setDraft}
            onSearch={() => {
              setActive(draft);
              setPage(0);
              setMode("search");
              setSelected(null);
              setNonce((n) => n + 1);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={remember}
              className="h-10 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-chip"
            >
              Mémoriser ces filtres
            </button>
            {store.saved.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDraft(item.filters);
                  setActive(item.filters);
                  setPage(0);
                  setMode("search");
                }}
                className="h-10 max-w-44 truncate rounded-full bg-chip px-3 text-sm"
                title={item.label}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <section className="order-1 min-w-0 lg:order-2">
          {error ? (
            <p className="mb-3 rounded-2xl border border-accent/30 bg-surface px-4 py-3 text-sm text-accent">
              {error}
            </p>
          ) : null}

          {mode === "collect" ? <CollectPanel filters={draft} /> : null}

          {mode !== "collect" ? (
            <div className={selected ? "lg:grid lg:grid-cols-2 lg:items-start lg:gap-3" : ""}>
              <div className={selected ? "hidden lg:block" : ""}>
                {searching && !result && mode === "search" ? (
                  <p className="rounded-2xl border border-line bg-surface px-4 py-8 text-sm text-muted">
                    Interrogation de Job-Room…
                  </p>
                ) : null}
                {!searching && jobs.length === 0 && !error ? (
                  <div className="rounded-3xl border border-dashed border-line bg-surface px-5 py-10">
                    <h2 className="font-display text-2xl tracking-tight">Aucune offre</h2>
                    <p className="mt-2 max-w-prose text-sm text-muted">
                      {mode === "favorites"
                        ? "Les annonces marquées restent dans ce navigateur."
                        : "Élargissez le rayon, retirez un canton ou allongez la période."}
                    </p>
                  </div>
                ) : null}
                {jobs.length > 0 ? (
                  <JobList
                    jobs={jobs}
                    total={total}
                    page={mode === "favorites" ? 0 : page}
                    pageSize={mode === "favorites" ? Math.max(jobs.length, 1) : PAGE_SIZE}
                    selectedId={selected?.id ?? null}
                    favoriteIds={favoriteIds}
                    onSelect={(job) => setSelected(job)}
                    onToggleFavorite={toggleFavorite}
                    onPage={(next) => {
                      setPage(next);
                      setSelected(null);
                    }}
                  />
                ) : null}
                {mode === "search" && result ? (
                  <p className="mt-3 text-xs text-faint">
                    {formatCount(result.total)} annonces correspondent. Source : job-room.ch, données publiques du
                    service de l’emploi.
                  </p>
                ) : null}
              </div>
              {selected ? (
                <div className="fixed inset-0 z-30 overflow-hidden bg-bg p-3 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0">
                  <div className="h-full lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
                    <JobDetail
                      job={selected}
                      language={draft.language}
                      favorite={favoriteIds.has(selected.id)}
                      onClose={() => setSelected(null)}
                      onToggleFavorite={toggleFavorite}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
