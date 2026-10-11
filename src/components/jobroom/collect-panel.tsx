import { useRef, useState } from "react";
import { Download, Square } from "lucide-react";
import { getJob, searchJobs } from "@/lib/jobroom/api";
import { downloadText, jobsToCsv, stamp } from "@/lib/jobroom/export";
import {
  SCRAPE_MAX,
  SCRAPE_PAGE_SIZE,
  cantonName,
  formatCount,
  type Filters,
  type JobHit,
} from "@/lib/jobroom/model";
import { Button } from "./ui";

type Props = {
  filters: Filters;
};

export function CollectPanel({ filters }: Props) {
  const [limit, setLimit] = useState(100);
  const [withText, setWithText] = useState(false);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<JobHit[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState("Prêt à collecter les annonces correspondant aux filtres.");
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  async function run() {
    stopRef.current = false;
    setRunning(true);
    setError(null);
    setJobs([]);
    setTotal(null);
    const cap = Math.min(SCRAPE_MAX, Math.max(SCRAPE_PAGE_SIZE, limit));
    const collected: JobHit[] = [];
    const seen = new Set<string>();
    try {
      let page = 0;
      let reported = Infinity;
      while (collected.length < cap && page * SCRAPE_PAGE_SIZE < reported) {
        if (stopRef.current) break;
        setStatus(`Page ${page + 1} · ${formatCount(collected.length)} offres`);
        const result = await searchJobs({
          data: { ...filters, page, size: SCRAPE_PAGE_SIZE },
        });
        reported = result.total;
        setTotal(result.total);
        if (result.jobs.length === 0) break;
        for (const job of result.jobs) {
          if (seen.has(job.id)) continue;
          seen.add(job.id);
          collected.push(job);
          if (collected.length >= cap) break;
        }
        setJobs([...collected]);
        page += 1;
        if (result.jobs.length < SCRAPE_PAGE_SIZE) break;
      }

      if (withText && !stopRef.current) {
        const enrichCap = Math.min(collected.length, 80);
        setStatus(`Textes intégraux ${formatCount(0)}/${formatCount(enrichCap)}`);
        let cursor = 0;
        const worker = async () => {
          while (cursor < enrichCap && !stopRef.current) {
            const index = cursor;
            cursor += 1;
            const current = collected[index];
            if (!current) return;
            try {
              const detail = await getJob({ data: { id: current.id, language: filters.language } });
              const full = detail.descriptions.find((d) => d.lang === filters.language) ?? detail.descriptions[0];
              collected[index] = {
                ...current,
                title: full?.title || current.title,
                snippet: (full?.description || current.snippet).replace(/\s+/g, " ").trim().slice(0, 4000),
                externalUrl: detail.applyUrl || current.externalUrl,
              };
            } catch {
              // keep the search snippet if one detail fails
            }
            if (index % 4 === 0) {
              setJobs([...collected]);
              setStatus(`Textes intégraux ${formatCount(Math.min(cursor, enrichCap))}/${formatCount(enrichCap)}`);
            }
          }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
        setJobs([...collected]);
      }

      setStatus(
        stopRef.current
          ? `Interrompu · ${formatCount(collected.length)} offres conservées`
          : `Terminé · ${formatCount(collected.length)} offres sur ${formatCount(reported === Infinity ? collected.length : reported)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "La collecte a échoué.");
      setStatus("Collecte interrompue par une erreur.");
      setJobs([...collected]);
    } finally {
      setRunning(false);
    }
  }

  const byCanton = new Map<string, number>();
  for (const job of jobs) {
    const key = job.cantonCode || "—";
    byCanton.set(key, (byCanton.get(key) ?? 0) + 1);
  }
  const bars = [...byCanton.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxBar = bars[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl tracking-tight">Collecte</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
          Parcourt les pages de Job-Room avec les filtres actuels, sans doublon, puis exporte un CSV ou un JSON.
          Les textes intégraux sont limités aux 80 premières annonces pour rester fiables.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            Maximum
            <select
              className="mt-1 block h-11 rounded-lg border border-line bg-surface px-3"
              value={limit}
              disabled={running}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n} offres
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={withText}
              disabled={running}
              onChange={(event) => setWithText(event.target.checked)}
            />
            Textes intégraux
          </label>
          {running ? (
            <Button
              variant="line"
              onClick={() => {
                stopRef.current = true;
              }}
            >
              <Square className="size-4" />
              Stop
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void run()}>
              Lancer la collecte
            </Button>
          )}
        </div>
        <p className="mt-3 text-sm tabular-nums">{status}</p>
        {total != null ? (
          <p className="text-xs text-faint tabular-nums">{formatCount(total)} correspondances sur le portail</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
        {running ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chip">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, (jobs.length / Math.min(limit, SCRAPE_MAX)) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {jobs.length > 0 ? (
        <div className="space-y-3 rounded-3xl border border-line bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => downloadText(`jobroom-${stamp()}.csv`, jobsToCsv(jobs), "text/csv;charset=utf-8")}
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button
              onClick={() =>
                downloadText(
                  `jobroom-${stamp()}.json`,
                  JSON.stringify(jobs, null, 2),
                  "application/json",
                )
              }
            >
              <Download className="size-4" />
              JSON
            </Button>
          </div>
          {bars.length > 0 ? (
            <ul className="space-y-1.5">
              {bars.map(([code, count]) => (
                <li key={code} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-sm">
                  <span className="truncate">{code === "—" ? "Non précisé" : cantonName(code)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-chip">
                    <span
                      className="block h-full bg-ink"
                      style={{ width: `${(count / maxBar) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-muted">{count}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="divide-y divide-line text-sm">
            {jobs.slice(0, 12).map((job) => (
              <li key={job.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-medium">{job.title}</span>
                <span className="shrink-0 text-muted">{job.cantonCode || job.city}</span>
              </li>
            ))}
          </ul>
          {jobs.length > 12 ? (
            <p className="text-xs text-faint">+ {formatCount(jobs.length - 12)} autres dans l’export</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
