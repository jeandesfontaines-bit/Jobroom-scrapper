import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cantonName,
  contractLabel,
  formatCount,
  formatDay,
  workloadLabel,
  type JobHit,
} from "@/lib/jobroom/model";

type Props = {
  jobs: JobHit[];
  total: number;
  page: number;
  pageSize: number;
  selectedId: string | null;
  favoriteIds: Set<string>;
  onSelect: (job: JobHit) => void;
  onToggleFavorite: (job: JobHit) => void;
  onPage: (page: number) => void;
};

export function JobList({
  jobs,
  total,
  page,
  pageSize,
  selectedId,
  favoriteIds,
  onSelect,
  onToggleFavorite,
  onPage,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, page * pageSize + jobs.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="font-display text-2xl tracking-tight">
          <span className="tabular-nums">{formatCount(total)}</span>{" "}
          <span className="text-lg font-medium text-muted">{total > 1 ? "offres" : "offre"}</span>
        </p>
        <p className="text-sm text-muted tabular-nums">
          {from}–{to}
        </p>
      </div>
      <ul className="space-y-2">
        {jobs.map((job) => {
          const selected = job.id === selectedId;
          return (
            <li key={job.id}>
              <article
                className={`rounded-2xl border bg-surface p-3 transition-colors ${
                  selected ? "border-ink" : "border-line hover:border-ink/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(job)}>
                    <h2 className="text-base font-semibold leading-snug">{job.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {job.viaAgency ? `via ${job.company}` : job.company}
                      {job.city ? ` · ${job.city}` : ""}
                      {job.cantonCode ? ` (${cantonName(job.cantonCode)})` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/80">{job.snippet}</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-faint">
                      <span>{workloadLabel(job.workloadMin, job.workloadMax)}</span>
                      <span>{contractLabel(job.permanent)}</span>
                      <span>{formatDay(job.publicationStart)}</span>
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={favoriteIds.has(job.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-pressed={favoriteIds.has(job.id)}
                    onClick={() => onToggleFavorite(job)}
                    className={`grid size-11 shrink-0 place-items-center rounded-lg ${
                      favoriteIds.has(job.id) ? "bg-ink text-surface" : "text-muted hover:bg-chip"
                    }`}
                  >
                    <Bookmark className="size-4" fill={favoriteIds.has(job.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold disabled:opacity-40"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </button>
        <span className="text-sm tabular-nums text-muted">
          {page + 1} / {formatCount(pages)}
        </span>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold disabled:opacity-40"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
