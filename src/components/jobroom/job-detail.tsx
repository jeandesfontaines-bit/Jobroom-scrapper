import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, X } from "lucide-react";
import { getJob } from "@/lib/jobroom/api";
import {
  LANG_LABEL,
  cantonName,
  contractLabel,
  formatDay,
  levelLabel,
  workloadLabel,
  workFormLabel,
  type JobDetail,
  type JobHit,
  type Lang,
} from "@/lib/jobroom/model";
import { JobDescription } from "./description";
import { Button } from "./ui";

type Props = {
  job: JobHit;
  language: Lang;
  favorite: boolean;
  onClose: () => void;
  onToggleFavorite: (job: JobHit) => void;
};

export function JobDetail({ job, language, favorite, onClose, onToggleFavorite }: Props) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<string>(language);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getJob({ data: { id: job.id, language } })
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
        const preferred = next.descriptions.find((d) => d.lang === language) ?? next.descriptions[0];
        setLang(preferred?.lang ?? language);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger l’annonce.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id, language]);

  const text =
    detail?.descriptions.find((d) => d.lang === lang) ??
    detail?.descriptions[0] ??
    null;

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Annonce</p>
          <h2 className="font-display text-2xl leading-tight tracking-tight">{text?.title || job.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-chip"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-faint">Entreprise</dt>
            <dd className="font-medium">{job.viaAgency ? `via ${job.company}` : job.company}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Lieu</dt>
            <dd className="font-medium">
              {[job.postalCode, job.city].filter(Boolean).join(" ") || "—"}
              {job.cantonCode ? ` · ${cantonName(job.cantonCode)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Taux</dt>
            <dd className="font-medium">{workloadLabel(job.workloadMin, job.workloadMax)}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Contrat</dt>
            <dd className="font-medium">
              {contractLabel(job.permanent)}
              {job.immediately ? " · dès que possible" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Publication</dt>
            <dd className="font-medium">{formatDay(job.publicationStart)}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Échéance</dt>
            <dd className="font-medium">{formatDay(job.publicationEnd)}</dd>
          </div>
        </dl>

        {job.workForms.length > 0 ? (
          <p className="text-sm text-muted">{job.workForms.map(workFormLabel).join(" · ")}</p>
        ) : null}

        {loading ? <p className="text-sm text-muted">Chargement du texte intégral…</p> : null}
        {error ? <p className="text-sm text-accent">{error}</p> : null}

        {detail && detail.descriptions.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {detail.descriptions.map((item) => (
              <button
                key={item.lang}
                type="button"
                onClick={() => setLang(item.lang)}
                className={`h-8 rounded-full px-3 text-xs font-semibold ${
                  lang === item.lang ? "bg-ink text-surface" : "bg-chip"
                }`}
              >
                {LANG_LABEL[item.lang] ?? item.lang}
              </button>
            ))}
          </div>
        ) : null}

        {text ? <JobDescription text={text.description} /> : null}

        {detail && detail.languageSkills.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold">Langues demandées</h3>
            <ul className="mt-1 space-y-1 text-sm text-muted">
              {detail.languageSkills.map((skill, index) => (
                <li key={`${skill.lang}-${index}`}>
                  {LANG_LABEL[skill.lang] ?? skill.lang}
                  {levelLabel(skill.spoken) ? ` · oral ${levelLabel(skill.spoken)}` : ""}
                  {levelLabel(skill.written) ? ` · écrit ${levelLabel(skill.written)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-1 text-sm">
            <h3 className="font-semibold">Candidature</h3>
            {detail.contactName ? <p>Contact : {detail.contactName}</p> : null}
            {detail.applyEmail ? (
              <p>
                <a className="underline decoration-line underline-offset-2" href={`mailto:${detail.applyEmail}`}>
                  {detail.applyEmail}
                </a>
              </p>
            ) : null}
            {detail.applyPhone ? <p>{detail.applyPhone}</p> : null}
            {detail.applyAddress ? <p>{detail.applyAddress}</p> : null}
            {!detail.applyEmail && !detail.applyPhone && !detail.applyUrl && !detail.applyAddress ? (
              <p className="text-muted">Aucun canal direct dans l’annonce. Ouvrez la fiche Job-Room.</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-4">
        <Button variant={favorite ? "primary" : "line"} onClick={() => onToggleFavorite(detail ?? job)}>
          <Bookmark className="size-4" fill={favorite ? "currentColor" : "none"} />
          {favorite ? "Dans les favoris" : "Favori"}
        </Button>
        <a
          href={job.jobroomUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold"
        >
          Job-Room
          <ExternalLink className="size-4" />
        </a>
        {(detail?.applyUrl || job.externalUrl) && (detail?.applyUrl || job.externalUrl) !== job.jobroomUrl ? (
          <a
            href={detail?.applyUrl || job.externalUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-surface"
          >
            Postuler
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>
    </aside>
  );
}
