import type { JobHit } from "./model";

const COLUMNS: { key: keyof JobHit | "workload"; header: string }[] = [
  { key: "id", header: "id" },
  { key: "title", header: "titre" },
  { key: "company", header: "entreprise" },
  { key: "city", header: "ville" },
  { key: "postalCode", header: "npa" },
  { key: "cantonCode", header: "canton" },
  { key: "workload", header: "taux" },
  { key: "permanent", header: "permanent" },
  { key: "publicationStart", header: "publication" },
  { key: "publicationEnd", header: "echeance" },
  { key: "externalUrl", header: "url_externe" },
  { key: "jobroomUrl", header: "url_jobroom" },
  { key: "snippet", header: "extrait" },
];

function cell(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function jobsToCsv(jobs: JobHit[]): string {
  const lines = [COLUMNS.map((c) => c.header).join(";")];
  for (const job of jobs) {
    const row = COLUMNS.map((column) => {
      if (column.key === "workload") {
        const min = job.workloadMin ?? "";
        const max = job.workloadMax ?? "";
        return cell(min === max ? String(min) : `${min}-${max}`);
      }
      const value = job[column.key];
      if (value == null) return "";
      if (typeof value === "boolean") return value ? "oui" : "non";
      if (Array.isArray(value)) return cell(value.join("|"));
      return cell(String(value));
    });
    lines.push(row.join(";"));
  }
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}
