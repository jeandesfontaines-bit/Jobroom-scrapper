export const CANTONS = [
  { code: "AG", name: "Argovie" },
  { code: "AI", name: "Appenzell Rh.-Int." },
  { code: "AR", name: "Appenzell Rh.-Ext." },
  { code: "BE", name: "Berne" },
  { code: "BL", name: "Bâle-Campagne" },
  { code: "BS", name: "Bâle-Ville" },
  { code: "FR", name: "Fribourg" },
  { code: "GE", name: "Genève" },
  { code: "GL", name: "Glaris" },
  { code: "GR", name: "Grisons" },
  { code: "JU", name: "Jura" },
  { code: "LU", name: "Lucerne" },
  { code: "NE", name: "Neuchâtel" },
  { code: "NW", name: "Nidwald" },
  { code: "OW", name: "Obwald" },
  { code: "SG", name: "Saint-Gall" },
  { code: "SH", name: "Schaffhouse" },
  { code: "SO", name: "Soleure" },
  { code: "SZ", name: "Schwyz" },
  { code: "TG", name: "Thurgovie" },
  { code: "TI", name: "Tessin" },
  { code: "UR", name: "Uri" },
  { code: "VD", name: "Vaud" },
  { code: "VS", name: "Valais" },
  { code: "ZG", name: "Zoug" },
  { code: "ZH", name: "Zurich" },
] as const;

export const ONLINE_SINCE = [
  { days: 1, label: "24 heures" },
  { days: 7, label: "7 jours" },
  { days: 14, label: "14 jours" },
  { days: 30, label: "30 jours" },
  { days: 60, label: "60 jours" },
] as const;

export const RADIUS_OPTIONS = [10, 15, 20, 30, 50] as const;

export const PAGE_SIZE = 20;
export const SCRAPE_PAGE_SIZE = 50;
export const SCRAPE_MAX = 500;

export type Lang = "fr" | "de" | "it" | "en";
export type SortKey = "date_desc" | "date_asc" | "score";
export type ContractFilter = "all" | "permanent" | "temporary";

export type Locality = {
  city: string;
  zipCode: string;
  cantonCode: string;
  lat: number;
  lon: number;
};

export type Profession = {
  label: string;
  avam: string;
};

export type Filters = {
  keywords: string;
  cantonCodes: string[];
  companyName: string;
  workloadMin: number;
  workloadMax: number;
  contract: ContractFilter;
  onlineSince: number;
  sort: SortKey;
  language: Lang;
  displayRestricted: boolean;
  locality: Locality | null;
  radiusKm: number;
  profession: Profession | null;
};

export const defaultFilters = (): Filters => ({
  keywords: "",
  cantonCodes: [],
  companyName: "",
  workloadMin: 10,
  workloadMax: 100,
  contract: "all",
  onlineSince: 7,
  sort: "date_desc",
  language: "fr",
  displayRestricted: false,
  locality: null,
  radiusKm: 20,
  profession: null,
});

export type JobHit = {
  id: string;
  title: string;
  snippet: string;
  descriptionLangs: string[];
  company: string;
  viaAgency: boolean;
  city: string;
  postalCode: string;
  cantonCode: string;
  workloadMin: number | null;
  workloadMax: number | null;
  permanent: boolean | null;
  immediately: boolean;
  workForms: string[];
  publicationStart: string | null;
  publicationEnd: string | null;
  externalUrl: string | null;
  jobroomUrl: string;
  sourceSystem: string | null;
  reportingObligation: boolean;
};

export type JobText = { lang: string; title: string; description: string };

export type JobDetail = JobHit & {
  descriptions: JobText[];
  applyEmail: string | null;
  applyPhone: string | null;
  applyUrl: string | null;
  applyAddress: string | null;
  contactName: string | null;
  languageSkills: { lang: string; spoken: string | null; written: string | null }[];
  website: string | null;
};

export type SearchResult = {
  total: number;
  page: number;
  size: number;
  jobs: JobHit[];
};

const LANG_ORDER: Lang[] = ["fr", "de", "it", "en"];

type RawDesc = {
  languageIsoCode?: string;
  title?: string;
  description?: string;
};

type RawAd = {
  id?: string;
  sourceSystem?: string;
  reportingObligation?: boolean;
  fingerprint?: string;
  jobContent?: {
    externalUrl?: string | null;
    jobDescriptions?: RawDesc[];
    company?: {
      name?: string | null;
      city?: string | null;
      website?: string | null;
      surrogate?: boolean;
    };
    employment?: {
      immediately?: boolean;
      permanent?: boolean;
      workloadPercentageMin?: string | number | null;
      workloadPercentageMax?: string | number | null;
      workForms?: string[];
    };
    location?: {
      city?: string | null;
      postalCode?: string | null;
      cantonCode?: string | null;
    };
    applyChannel?: {
      emailAddress?: string | null;
      phoneNumber?: string | null;
      formUrl?: string | null;
      postAddress?: {
        name?: string | null;
        street?: string | null;
        houseNumber?: string | null;
        postalCode?: string | null;
        city?: string | null;
      } | null;
    } | null;
    publicContact?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
    languageSkills?: {
      languageIsoCode?: string;
      spokenLevel?: string | null;
      writtenLevel?: string | null;
    }[];
  };
  publication?: {
    startDate?: string | null;
    endDate?: string | null;
    companyAnonymous?: boolean;
  };
};

function num(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function preferredDescription(descs: RawDesc[] | undefined, pref: Lang): RawDesc | null {
  const list = descs ?? [];
  const order = [pref, ...LANG_ORDER.filter((l) => l !== pref)];
  for (const lang of order) {
    const hit = list.find((d) => d.languageIsoCode === lang && (d.title || d.description));
    if (hit) return hit;
  }
  return list.find((d) => d.title || d.description) ?? null;
}

export function cleanJobText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(ul|ol|h\d|div)>/gi, "\n")
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;|'/g, "'")
    .replace(/---[\s\S]*?---/g, " ")
    .replace(/meta-(keywords|viewport|description|robots)\s*:[^\n]*/gi, " ")
    .replace(/={3,}/g, " ")
    .replace(/\u200b/g, "");
}

export function plainSnippet(raw: string | undefined, max = 220): string {
  if (!raw) return "";
  const text = cleanJobText(raw)
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function jobroomUrl(id: string): string {
  return `https://www.job-room.ch/job-search/${id}`;
}

export function normalizeHit(raw: unknown, pref: Lang): JobHit | null {
  const wrapped = raw as { jobAdvertisement?: RawAd };
  const ad: RawAd | undefined = wrapped?.jobAdvertisement ?? (raw as RawAd);
  if (!ad?.id) return null;
  const content = ad.jobContent ?? {};
  const picked = preferredDescription(content.jobDescriptions, pref);
  const anonymous = Boolean(ad.publication?.companyAnonymous);
  const companyName = content.company?.name?.trim() || "";
  const loc = content.location ?? {};
  return {
    id: ad.id,
    title: (picked?.title || "Offre sans titre").trim(),
    snippet: plainSnippet(picked?.description),
    descriptionLangs: (content.jobDescriptions ?? [])
      .map((d) => d.languageIsoCode)
      .filter((l): l is string => Boolean(l)),
    company: anonymous || !companyName ? "Entreprise confidentielle" : companyName,
    viaAgency: Boolean(content.company?.surrogate) && !anonymous,
    city: loc.city?.trim() || "",
    postalCode: loc.postalCode?.trim() || "",
    cantonCode: loc.cantonCode?.trim() || "",
    workloadMin: num(content.employment?.workloadPercentageMin),
    workloadMax: num(content.employment?.workloadPercentageMax),
    permanent: content.employment?.permanent ?? null,
    immediately: Boolean(content.employment?.immediately),
    workForms: content.employment?.workForms ?? [],
    publicationStart: ad.publication?.startDate ?? null,
    publicationEnd: ad.publication?.endDate ?? null,
    externalUrl: content.externalUrl || null,
    jobroomUrl: jobroomUrl(ad.id),
    sourceSystem: ad.sourceSystem ?? null,
    reportingObligation: Boolean(ad.reportingObligation),
  };
}

function addressLine(
  post:
    | {
        name?: string | null;
        street?: string | null;
        houseNumber?: string | null;
        postalCode?: string | null;
        city?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!post) return null;
  const street = [post.street, post.houseNumber].filter(Boolean).join(" ");
  const city = [post.postalCode, post.city].filter(Boolean).join(" ");
  const line = [post.name, street, city].filter(Boolean).join(", ");
  return line || null;
}

export function normalizeDetail(raw: unknown, pref: Lang): JobDetail | null {
  const hit = normalizeHit(raw, pref);
  if (!hit) return null;
  const ad = raw as RawAd;
  const content = ad.jobContent ?? {};
  const contact = content.publicContact;
  const contactName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  const descriptions: JobText[] = (content.jobDescriptions ?? [])
    .filter((d) => d.languageIsoCode && (d.title || d.description))
    .map((d) => ({
      lang: d.languageIsoCode as string,
      title: (d.title || hit.title).trim(),
      description: d.description || "",
    }));
  return {
    ...hit,
    snippet: plainSnippet(preferredDescription(content.jobDescriptions, pref)?.description, 280),
    descriptions,
    applyEmail: content.applyChannel?.emailAddress || null,
    applyPhone: content.applyChannel?.phoneNumber || null,
    applyUrl: content.applyChannel?.formUrl || content.externalUrl || null,
    applyAddress: addressLine(content.applyChannel?.postAddress),
    contactName: contactName || null,
    website: content.company?.website || null,
    languageSkills: (content.languageSkills ?? [])
      .filter((s) => s.languageIsoCode)
      .map((s) => ({
        lang: s.languageIsoCode as string,
        spoken: s.spokenLevel ?? null,
        written: s.writtenLevel ?? null,
      })),
  };
}

export function keywordList(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function workloadLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Taux non indiqué";
  if (min != null && max != null && min !== max) return `${min}–${max} %`;
  return `${min ?? max} %`;
}

export function contractLabel(permanent: boolean | null): string {
  if (permanent == null) return "Contrat non précisé";
  return permanent ? "Durée indéterminée" : "Temporaire";
}

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const month = MONTHS[Number(m) - 1];
  if (!y || !month || !d) return iso;
  return `${Number(d)} ${month} ${y}`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("fr-CH").format(n);
}

export function cantonName(code: string): string {
  return CANTONS.find((c) => c.code === code)?.name ?? code;
}

const WORK_FORMS: Record<string, string> = {
  NIGHT_WORK: "Travail de nuit",
  SHIFT_WORK: "Travail posté",
  SUNDAY_AND_PUBLIC_HOLIDAY: "Dimanche et jours fériés",
  HOME_WORK: "Télétravail",
  ON_CALL: "Service de piquet",
};

export function workFormLabel(code: string): string {
  return WORK_FORMS[code] ?? code.replaceAll("_", " ").toLowerCase();
}

const LEVELS: Record<string, string> = {
  NONE: "aucun",
  BASIC_KNOWLEDGE: "notions",
  BASIC: "élémentaire",
  INTERMEDIATE: "intermédiaire",
  PROFICIENT: "avancé",
  NATIVE: "maternel",
};

export function levelLabel(code: string | null): string | null {
  if (!code) return null;
  return LEVELS[code] ?? code.toLowerCase();
}

export const LANG_LABEL: Record<string, string> = {
  fr: "Français",
  de: "Allemand",
  it: "Italien",
  en: "Anglais",
  rm: "Romanche",
};
