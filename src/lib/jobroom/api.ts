import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type JobDetail,
  type JobHit,
  type Lang,
  type Locality,
  type Profession,
  type SearchResult,
  keywordList,
  normalizeDetail,
  normalizeHit,
} from "./model";

const ORIGIN = "https://www.job-room.ch";
const UA =
  "Mozilla/5.0 (compatible; JobroomScraper/1.0; +https://www.job-room.ch/) AppleWebKit/537.36";

const langSchema = z.enum(["fr", "de", "it", "en"]);

const localitySchema = z.object({
  city: z.string().max(80),
  zipCode: z.string().max(12),
  cantonCode: z.string().max(4),
  lat: z.number(),
  lon: z.number(),
});

const filtersSchema = z.object({
  keywords: z.string().max(180).default(""),
  cantonCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(26).default([]),
  companyName: z.string().max(120).default(""),
  workloadMin: z.number().int().min(0).max(100).default(10),
  workloadMax: z.number().int().min(0).max(100).default(100),
  contract: z.enum(["all", "permanent", "temporary"]).default("all"),
  onlineSince: z.number().int().min(1).max(365).default(7),
  sort: z.enum(["date_desc", "date_asc", "score"]).default("date_desc"),
  language: langSchema.default("fr"),
  displayRestricted: z.boolean().default(false),
  locality: localitySchema.nullable().default(null),
  radiusKm: z.number().int().min(10).max(50).default(20),
  profession: z
    .object({
      label: z.string().max(160),
      avam: z.string().regex(/^\d{3,10}$/),
    })
    .nullable()
    .default(null),
  page: z.number().int().min(0).max(2000).default(0),
  size: z.number().int().min(1).max(50).default(20),
});

type FiltersIn = z.infer<typeof filtersSchema>;

function buildBody(input: FiltersIn): Record<string, unknown> {
  const min = Math.min(input.workloadMin, input.workloadMax);
  const max = Math.max(input.workloadMin, input.workloadMax);
  const body: Record<string, unknown> = {
    workloadPercentageMin: min,
    workloadPercentageMax: max,
    permanent:
      input.contract === "permanent" ? true : input.contract === "temporary" ? false : null,
    companyName: input.companyName.trim() || null,
    onlineSince: input.onlineSince,
    displayRestricted: input.displayRestricted,
    professionCodes: input.profession ? [{ type: "AVAM", value: input.profession.avam }] : [],
    keywords: keywordList(input.keywords),
    communalCodes: [],
    cantonCodes: input.cantonCodes,
  };
  if (input.locality) {
    body.radiusSearchRequest = {
      geoPoint: { lat: input.locality.lat, lon: input.locality.lon },
      distance: input.radiusKm,
    };
  }
  return body;
}

async function jobroomFetch(url: string, init: RequestInit, language: Lang): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Accept-Language": language,
      "User-Agent": UA,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(25_000),
  });
  return response;
}

function fail(status: number): never {
  if (status === 429) {
    throw new Error("Job-Room limite le rythme des requêtes. Patientez quelques secondes.");
  }
  if (status >= 500) {
    throw new Error("Job-Room est momentanément indisponible. Réessayez.");
  }
  throw new Error(`Job-Room a répondu ${status}. La recherche n’a pas abouti.`);
}

export const searchJobs = createServerFn({ method: "POST" })
  .validator((input: unknown) => filtersSchema.parse(input))
  .handler(async ({ data }): Promise<SearchResult> => {
    const url = `${ORIGIN}/jobadservice/api/jobAdvertisements/_search?page=${data.page}&size=${data.size}&sort=${data.sort}`;
    const response = await jobroomFetch(
      url,
      { method: "POST", body: JSON.stringify(buildBody(data)) },
      data.language,
    );
    if (!response.ok) fail(response.status);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Réponse inattendue du portail Job-Room.");
    }
    const jobs = payload
      .map((row) => normalizeHit(row, data.language))
      .filter((job): job is JobHit => job != null);
    const total = Number(response.headers.get("x-total-count") ?? jobs.length);
    return {
      total: Number.isFinite(total) ? total : jobs.length,
      page: data.page,
      size: data.size,
      jobs,
    };
  });

const idSchema = z.object({
  id: z.string().uuid(),
  language: langSchema.default("fr"),
});

export const getJob = createServerFn({ method: "POST" })
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }): Promise<JobDetail> => {
    const response = await jobroomFetch(
      `${ORIGIN}/jobadservice/api/jobAdvertisements/${data.id}`,
      { method: "GET" },
      data.language,
    );
    if (response.status === 404) throw new Error("Cette annonce n’est plus en ligne.");
    if (!response.ok) fail(response.status);
    const payload: unknown = await response.json();
    const detail = normalizeDetail(payload, data.language);
    if (!detail) throw new Error("Annonce illisible.");
    return detail;
  });

export const suggestPlaces = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ prefix: z.string().trim().min(2).max(60) }).parse(input),
  )
  .handler(async ({ data }): Promise<Locality[]> => {
    const params = new URLSearchParams({
      prefix: data.prefix,
      resultSize: "8",
      distinctByLocalityCity: "true",
    });
    const response = await jobroomFetch(
      `${ORIGIN}/referenceservice/api/_search/localities?${params}`,
      { method: "GET" },
      "fr",
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      localities?: {
        city?: string;
        zipCode?: string;
        cantonCode?: string;
        geoPoint?: { lat?: number; lon?: number };
      }[];
    };
    return (payload.localities ?? [])
      .map((row) => {
        const lat = row.geoPoint?.lat;
        const lon = row.geoPoint?.lon;
        if (!row.city || lat == null || lon == null) return null;
        return {
          city: row.city,
          zipCode: row.zipCode ?? "",
          cantonCode: row.cantonCode ?? "",
          lat,
          lon,
        } satisfies Locality;
      })
      .filter((row): row is Locality => row != null);
  });

export const suggestJobs = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        prefix: z.string().trim().min(2).max(60),
        language: langSchema.default("fr"),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<Profession[]> => {
    const params = new URLSearchParams({
      prefix: data.prefix,
      types: "AVAM,X28",
      resultSize: "8",
    });
    const response = await jobroomFetch(
      `${ORIGIN}/referenceservice/api/_search/occupations/label?${params}`,
      { method: "GET" },
      data.language,
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      occupations?: { label?: string; mappings?: { AVAM?: string }; type?: string }[];
    };
    const seen = new Set<string>();
    const out: Profession[] = [];
    for (const row of payload.occupations ?? []) {
      const avam = row.mappings?.AVAM;
      const label = row.label?.trim();
      if (!avam || !label || seen.has(avam)) continue;
      seen.add(avam);
      out.push({ label, avam });
    }
    return out;
  });
