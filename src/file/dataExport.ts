/** Local batch export. No registration lifecycle or report settings are accessed. */
import { Skaring } from "../api/skaring";
import { validateForSave } from "../domain/saveValidation";
import { resolveCalculationAge } from "../domain/dateAge";
import { parseNubu100 } from "./nubu100";
import type { LocalFile } from "./browserFiles";

export const exportHeaders = [
  "FILNAVN", "NAVN", "KJØNN", "FØDSELSDATO", "TESTDATO", "VIST ALDER",
  "LOGALDER", "MERKNAD", "MERKNAD 2", "OPPGAVESKÅRER", "RASCHSKÅR",
  "STANDARDFEIL", "MINESTIMERT", "MAKSESTIMERT", "ALDERSEKVIVALENT",
  "NEDRE GRENSE KONF.INT.", "ØVRE GRENSE KONF.INT.", "MODELLBASERT PERSENTIL",
] as const;

export interface ExportFile extends LocalFile {
  readonly webkitRelativePath: string;
}
export type ExportOutcome =
  | { kind: "ready"; bytes: Uint8Array; count: number }
  | { kind: "empty" | "cancelled" }
  | { kind: "error"; fileName: string; reason: string };

/** Locale-independent case folding, then original spelling breaks ties deterministically. */
export function compareExportNames(a: ExportFile, b: ExportFile): number {
  const lowerA = a.name.toLowerCase();
  const lowerB = b.name.toLowerCase();
  return lowerA < lowerB ? -1 : lowerA > lowerB ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function exportErrorMessage(fileName: string, reason: string): string {
  const sentence = reason.endsWith(".") ? reason : `${reason}.`;
  return `Dataeksporten ble avbrutt. Filen «${fileName}» kunne ikke behandles: ${sentence} Rett problemet og prøv igjen. Ingen eksportfil er lastet ned.`;
}

/** Reject delimiters rather than silently altering field boundaries. */
function textField(value: string): string {
  if (/[\t\r\n\u2028\u2029]/.test(value)) throw new Error("Tekstfelt inneholder tabulator eller linjeskift");
  return value.replace(/"/g, "'");
}

/** Produce bytes only after every selected root file has passed all checks. */
export async function buildDataExport(files: readonly ExportFile[], cancelled: () => boolean = () => false): Promise<ExportOutcome> {
  const roots = files.filter(file => {
    const parts = file.webkitRelativePath.split("/");
    return parts.length === 2 && parts[0] !== "" && parts[1] === file.name;
  }).sort(compareExportNames);
  if (cancelled()) return { kind: "cancelled" };
  if (roots.length === 0) return { kind: "empty" };
  const rows: string[] = [exportHeaders.join("\t")];
  for (const file of roots) {
    if (cancelled()) return { kind: "cancelled" };
    let bytes: Uint8Array;
    try { bytes = new Uint8Array(await file.arrayBuffer()); }
    catch { return { kind: "error", fileName: file.name, reason: "Kunne ikke åpne filen." }; }
    if (cancelled()) return { kind: "cancelled" };
    try {
      const name = textField(file.name);
      const parsed = parseNubu100(bytes);
      if (parsed.kind !== "known-format") {
        const reason = parsed.kind === "unknown-identifier" ? "Ukjent filformat." : "Kunne ikke åpne filen.";
        return { kind: "error", fileName: file.name, reason };
      }
      const validated = validateForSave({ ...parsed.record, ageSource: "manual" });
      if (validated.kind !== "ready") {
        const reason = validated.kind !== "needs-decision" ? "Registreringen er ugyldig" :
          validated.problem.kind === "invalid-date" ? `${validated.problem.field === "birthDate" ? "Fødselsdato" : "Testdato"} er ugyldig` :
          validated.problem.kind === "invalid-manual-age" ? "Manuelt angitt alder er ugyldig" :
          "Datoene gir feil rekkefølge eller alder utenfor 1:6–99:11";
        return { kind: "error", fileName: file.name, reason };
      }
      const record = validated.candidate;
      const engine = new Skaring();
      const status = engine.calculateRegistration(record);
      if (status !== -10000) return {
        kind: "error", fileName: file.name,
        reason: status === -10001 || status === -10004 ? "Minst tre gyldige oppgaveskårer (0, 1 eller 2) kreves" : "Resultatet kunne ikke beregnes",
      };
      const age = resolveCalculationAge(record);
      // Opening a file preserves manual age spelling; automatic age is recalculated.
      const displayAge = record.ageSource === "automatic" ? age?.display ?? "" : parsed.record.age;
      const interval = !engine.gIsMinEstimated && !engine.gIsMaxEstimated;
      const percentile = engine.modelPercentile();
      const fields = [
        name, textField(record.name), record.gender === "gutt" ? "1" : record.gender === "jente" ? "0" : "9",
        record.birthDate, record.testDate, displayAge, age ? Math.log(age.years).toFixed(3) : "0",
        textField(record.note), textField(record.note2), `"${engine.gRawItemScoreString}"`,
        engine.gMeasure.toFixed(3), engine.gSE.toFixed(3), engine.gIsMinEstimated ? "1" : "0", engine.gIsMaxEstimated ? "1" : "0",
        engine.estimateToPresentText(engine.gMeasure),
        interval ? engine.estimateToPresentText(engine.gMeasure - 1.96 * engine.gSE) : "",
        interval ? engine.estimateToPresentText(engine.gMeasure + 1.96 * engine.gSE) : "",
        percentile.kind === "available" ? String(percentile.value) : "",
      ];
      rows.push(fields.join("\t"));
    } catch {
      return { kind: "error", fileName: file.name, reason: "Tekstfelt inneholder tabulator eller linjeskift, eller registreringen kunne ikke behandles" };
    }
  }
  return { kind: "ready", bytes: new TextEncoder().encode("\ufeff" + rows.join("\r\n") + "\r\n"), count: roots.length };
}
