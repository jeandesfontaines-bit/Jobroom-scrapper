import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { suggestJobs, suggestPlaces } from "@/lib/jobroom/api";
import {
  CANTONS,
  ONLINE_SINCE,
  RADIUS_OPTIONS,
  cantonName,
  type Filters,
  type Locality,
  type Profession,
} from "@/lib/jobroom/model";
import { Button, Field, controlClass } from "./ui";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  onSearch: () => void;
  searching: boolean;
};

export function SearchPanel({ filters, onChange, onSearch, searching }: Props) {
  const patch = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });
  return (
    <form
      className="space-y-4 rounded-3xl border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <Field label="Mots-clés" hint="Plusieurs termes séparés par une virgule.">
        <input
          className={controlClass}
          value={filters.keywords}
          placeholder="développeur, infirmier, logistique"
          onChange={(event) => patch({ keywords: event.target.value })}
        />
      </Field>

      <PlaceField
        locality={filters.locality}
        radiusKm={filters.radiusKm}
        onPick={(locality) => patch({ locality })}
        onRadius={(radiusKm) => patch({ radiusKm })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Cantons</legend>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto pr-1">
          {CANTONS.map((canton) => {
            const on = filters.cantonCodes.includes(canton.code);
            return (
              <button
                key={canton.code}
                type="button"
                aria-pressed={on}
                title={canton.name}
                onClick={() =>
                  patch({
                    cantonCodes: on
                      ? filters.cantonCodes.filter((code) => code !== canton.code)
                      : [...filters.cantonCodes, canton.code],
                  })
                }
                className={`h-8 rounded-full px-2.5 text-xs font-semibold tracking-wide ${
                  on ? "bg-ink text-surface" : "bg-chip text-ink hover:bg-line"
                }`}
              >
                {canton.code}
              </button>
            );
          })}
        </div>
        {filters.cantonCodes.length > 0 ? (
          <p className="text-xs text-muted">
            {filters.cantonCodes.map((code) => cantonName(code)).join(", ")}
          </p>
        ) : null}
      </fieldset>

      <ProfessionField
        language={filters.language}
        profession={filters.profession}
        onPick={(profession) => patch({ profession })}
      />

      <Field label="Entreprise">
        <input
          className={controlClass}
          value={filters.companyName}
          placeholder="Nom affiché sur l’annonce"
          onChange={(event) => patch({ companyName: event.target.value })}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Taux d’occupation {filters.workloadMin}–{filters.workloadMax} %
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">
            Min
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={filters.workloadMin}
              onChange={(event) => patch({ workloadMin: Number(event.target.value) })}
              className="mt-1 w-full accent-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Max
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={filters.workloadMax}
              onChange={(event) => patch({ workloadMax: Number(event.target.value) })}
              className="mt-1 w-full accent-accent"
            />
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Contrat">
          <select
            className={controlClass}
            value={filters.contract}
            onChange={(event) =>
              patch({ contract: event.target.value as Filters["contract"] })
            }
          >
            <option value="all">Tous</option>
            <option value="permanent">Durée indéterminée</option>
            <option value="temporary">Temporaire</option>
          </select>
        </Field>
        <Field label="En ligne depuis">
          <select
            className={controlClass}
            value={filters.onlineSince}
            onChange={(event) => patch({ onlineSince: Number(event.target.value) })}
          >
            {ONLINE_SINCE.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tri">
          <select
            className={controlClass}
            value={filters.sort}
            onChange={(event) => patch({ sort: event.target.value as Filters["sort"] })}
          >
            <option value="date_desc">Plus récentes</option>
            <option value="date_asc">Plus anciennes</option>
            <option value="score">Pertinence</option>
          </select>
        </Field>
        <Field label="Langue du titre">
          <select
            className={controlClass}
            value={filters.language}
            onChange={(event) => patch({ language: event.target.value as Filters["language"] })}
          >
            <option value="fr">Français</option>
            <option value="de">Allemand</option>
            <option value="it">Italien</option>
            <option value="en">Anglais</option>
          </select>
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-accent"
          checked={filters.displayRestricted}
          onChange={(event) => patch({ displayRestricted: event.target.checked })}
        />
        <span>
          Inclure les annonces à diffusion restreinte
          <span className="mt-0.5 block text-xs text-faint">
            Obligation d’annonce aux ORP, pas seulement le marché public.
          </span>
        </span>
      </label>

      <div className="flex gap-2">
        <Button variant="primary" type="submit" className="flex-1" disabled={searching}>
          <Search className="size-4" aria-hidden />
          {searching ? "Recherche…" : "Rechercher"}
        </Button>
        <Button
          type="button"
          aria-label="Réinitialiser les filtres"
          onClick={() => onChange({ ...filters, keywords: "", cantonCodes: [], companyName: "", locality: null, profession: null, contract: "all", displayRestricted: false, workloadMin: 10, workloadMax: 100 })}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}

function PlaceField({
  locality,
  radiusKm,
  onPick,
  onRadius,
}: {
  locality: Locality | null;
  radiusKm: number;
  onPick: (place: Locality | null) => void;
  onRadius: (km: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Locality[]>([]);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void suggestPlaces({ data: { prefix: query.trim() } })
        .then((rows) => {
          setOptions(rows);
          setOpen(true);
        })
        .catch(() => setOptions([]));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div className="space-y-2">
      <Field label="Lieu" hint="Rayon autour d’une commune suisse.">
        {locality ? (
          <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-line bg-chip px-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {locality.zipCode} {locality.city}
                {locality.cantonCode ? ` · ${locality.cantonCode}` : ""}
              </span>
            </span>
            <button type="button" className="text-muted" onClick={() => onPick(null)} aria-label="Retirer le lieu">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              className={controlClass}
              value={query}
              placeholder="Genève, Lausanne, Lugano…"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => options.length && setOpen(true)}
            />
            {open && options.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-sm"
              >
                {options.map((place) => (
                  <li key={`${place.zipCode}-${place.city}-${place.lat}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-chip"
                      onClick={() => {
                        onPick(place);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <span>
                        {place.zipCode} {place.city}
                      </span>
                      <span className="text-xs text-muted">{place.cantonCode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Field>
      {locality ? (
        <Field label="Rayon">
          <select
            className={controlClass}
            value={radiusKm}
            onChange={(event) => onRadius(Number(event.target.value))}
          >
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </Field>
      ) : null}
    </div>
  );
}

function ProfessionField({
  profession,
  language,
  onPick,
}: {
  profession: Profession | null;
  language: Filters["language"];
  onPick: (job: Profession | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Profession[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void suggestJobs({ data: { prefix: query.trim(), language } })
        .then((rows) => {
          setOptions(rows);
          setOpen(true);
        })
        .catch(() => setOptions([]));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, language]);

  return (
    <Field label="Métier" hint="Code AVAM officiel, comme sur Job-Room.">
      {profession ? (
        <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-line bg-chip px-3 text-sm">
          <span className="truncate">{profession.label}</span>
          <button type="button" onClick={() => onPick(null)} aria-label="Retirer le métier">
            <X className="size-4 text-muted" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className={controlClass}
            value={query}
            placeholder="Infirmier, menuisier, comptable…"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => options.length && setOpen(true)}
          />
          {open && options.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-sm">
              {options.map((job) => (
                <li key={job.avam}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-chip"
                    onClick={() => {
                      onPick(job);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {job.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
