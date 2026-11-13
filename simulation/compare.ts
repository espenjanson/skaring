/** Read-only export comparison; no scoring, registration updates, or network access. */
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { decodeWindows1252 } from "../src/file/windows1252";

export const HEADERS = [
  "FILNAVN", "NAVN", "KJØNN", "FØDSELSDATO", "TESTDATO", "VIST ALDER",
  "LOGALDER", "MERKNAD", "MERKNAD 2", "OPPGAVESKÅRER", "RASCHSKÅR",
  "STANDARDFEIL", "MINESTIMERT", "MAKSESTIMERT", "ALDERSEKVIVALENT",
  "NEDRE GRENSE KONF.INT.", "ØVRE GRENSE KONF.INT.", "MODELLBASERT PERSENTIL",
] as const;
export const LEGACY_HEADERS = [
  "FILNAVN", "NAVN", "KJØNN", "LOGALDER", "MERKNADER", "OPPGAVESKÅRER",
  "RASCHSKÅRE", "STANDARDFEIL", "MINESTIMERT", "MAKSESTIMERT",
  "ALDERSEKVIVALENT", "NEDRE GRENSE KONF.INT.", "ØVRE GRENSE KONF.INT.",
  "MODELLBASERT PERSENTIL",
] as const;

type Encoding = "windows-1252" | "utf-8";
type Values = Partial<Record<typeof HEADERS[number], string>>;
export interface ExportRow { id: string; values: Values; combinedNote: string }
export interface ExportFile {
  name: string;
  sha256: string;
  encoding: Encoding;
  bom: boolean;
  headers: readonly string[];
  schema: "legacy-14" | "web-18";
  endings: { crlf: number; lf: number; cr: number; finalNewline: boolean };
  warnings: string[];
  rows: Map<string, ExportRow>;
}

/** TSV grammar supports escaped quotes and tabs/newlines inside quoted fields. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  let atStart = true;
  let pending = false;
  const fieldEnd = () => { row.push(field); field = ""; atStart = true; closedQuote = false; };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else field += character;
      continue;
    }
    if (character === "\t") { fieldEnd(); pending = true; continue; }
    if (character === "\r" || character === "\n") {
      if (character === "\r" && text[i + 1] === "\n") i++;
      fieldEnd(); rows.push(row); row = []; pending = false; continue;
    }
    if (closedQuote) throw new Error("Ugyldig tekst etter avsluttende anførselstegn.");
    if (character === '"') {
      if (!atStart) throw new Error("Anførselstegn inne i et usitert felt.");
      quoted = true; atStart = false; pending = true; continue;
    }
    field += character; atStart = false; pending = true;
  }
  if (quoted) throw new Error("Sitert felt mangler avsluttende anførselstegn.");
  if (pending || row.length) { fieldEnd(); rows.push(row); }
  return rows;
}

const NUMERIC = new Set(["LOGALDER", "RASCHSKÅR", "STANDARDFEIL", "MODELLBASERT PERSENTIL"]);
const CONTINUOUS = new Set(["LOGALDER", "RASCHSKÅR", "STANDARDFEIL"]);
const TOLERANCE = 0.0005;

function decimal(text: string): { integer: bigint; places: number } {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text) || text.length > 128 || !Number.isFinite(Number(text))) {
    throw new Error(`Ugyldig desimaltall: ${JSON.stringify(text)}`);
  }
  const parts = text.split(".");
  return { integer: BigInt(parts.join("")), places: parts[1]?.length ?? 0 };
}

/** Compare base-ten integers, so an exact 0.0005 difference is included without epsilon. */
export function numericDifference(windows: string, web: string, tolerance: number): { delta: number; equal: boolean; within: boolean } {
  if (tolerance !== 0 && tolerance !== TOLERANCE) throw new Error("Ustøttet toleranse.");
  const left = decimal(windows);
  const right = decimal(web);
  const places = Math.max(left.places, right.places);
  const power = (n: number) => BigInt(`1${"0".repeat(n)}`);
  const difference = right.integer * power(places - right.places) - left.integer * power(places - left.places);
  const magnitude = difference < BigInt(0) ? -difference : difference;
  return {
    delta: Number(difference) / 10 ** places,
    equal: difference === BigInt(0),
    within: tolerance === 0 ? magnitude === BigInt(0) : magnitude * BigInt(10000) <= BigInt(5) * power(places),
  };
}

/** An explicit encoding default avoids heuristic substitution of incorrectly decoded text. */
export function readExport(bytes: Uint8Array, name: string, fallback: Encoding): ExportFile {
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff) ||
      (bytes[0] === 0 && bytes[1] === 0)) throw new Error("UTF-16/32 støttes ikke.");
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const encoding = bom ? "utf-8" : fallback;
  let text: string;
  if (encoding === "utf-8") text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bom ? bytes.subarray(3) : bytes);
  else {
    const decoded = decodeWindows1252(bytes);
    if (!decoded.ok) throw new Error(`Udefinert Windows-1252-byte ved ${decoded.error.index}.`);
    text = decoded.text;
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufeff]/.test(text)) throw new Error("Uventet kontrolltegn eller intern BOM.");
  const endings = {
    crlf: (text.match(/\r\n/g) ?? []).length,
    lf: (text.replace(/\r\n/g, "").match(/\n/g) ?? []).length,
    cr: (text.replace(/\r\n/g, "").match(/\r/g) ?? []).length,
    finalNewline: /[\r\n]$/.test(text),
  };
  const records = parseTsv(text);
  const headers = records.shift() ?? [];
  const same = (expected: readonly string[]) => JSON.stringify(expected) === JSON.stringify(headers);
  const schema = same(LEGACY_HEADERS) ? "legacy-14" : same(HEADERS) ? "web-18" : null;
  if (!schema) throw new Error("Ukjent kolonneoppsett eller feil kolonnerekkefølge. Kontroller tegnkoding og rubrikker.");
  if (records.length === 0) throw new Error("Eksporten mangler registreringer.");
  const rows = new Map<string, ExportRow>();
  const warnings: string[] = [];
  if (endings.lf || endings.cr) warnings.push("Andre radslutt enn CRLF er lest uten å endre feltinnhold.");
  if (!endings.finalNewline) warnings.push("Avsluttende radslutt mangler.");
  const precisionCounts = new Map<string, number>();
  records.forEach((fields, index) => {
    if (fields.length !== headers.length) throw new Error(`Post ${index + 2}: forventet ${headers.length} kolonner, fant ${fields.length}.`);
    const id = fields[0];
    if (!id || /^\s|\s$/.test(id)) throw new Error(`Post ${index + 2}: tom ID eller ytre mellomrom i ID.`);
    if (rows.has(id)) throw new Error(`Duplisert ID: ${JSON.stringify(id)}.`);
    const values: Values = {};
    headers.forEach((header, i) => {
      if (header !== "MERKNADER") values[(header === "RASCHSKÅRE" ? "RASCHSKÅR" : header) as keyof Values] = fields[i];
    });
    for (const header of NUMERIC) {
      const value = values[header as keyof Values];
      if (value !== undefined && value !== "") {
        decimal(value);
        if (CONTINUOUS.has(header) && !/^[+-]?\d+\.\d{3}$/.test(value) && !(header === "LOGALDER" && value === "0")) {
          precisionCounts.set(header, (precisionCounts.get(header) ?? 0) + 1);
        }
        if (header === "MODELLBASERT PERSENTIL" && (!/^\d+$/.test(value) || Number(value) > 100)) throw new Error(`Ugyldig persentil for ${id}.`);
        if (header === "STANDARDFEIL" && Number(value) < 0) throw new Error(`Negativ standardfeil for ${id}.`);
      }
    }
    if (!["0", "1", "9"].includes(values["KJØNN"] ?? "")) throw new Error(`Ugyldig kjønnskode for ${id}.`);
    for (const header of ["MINESTIMERT", "MAKSESTIMERT"] as const) {
      if (!["0", "1"].includes(values[header] ?? "")) throw new Error(`Ugyldig flagg for ${id}.`);
    }
    if ((values["OPPGAVESKÅRER"] ?? "").length !== 50) throw new Error(`Feil antall oppgavetegn for ${id}.`);
    rows.set(id, { id, values, combinedNote: schema === "legacy-14" ? fields[4] : `${values.MERKNAD} ${values["MERKNAD 2"]}` });
  });
  precisionCounts.forEach((count, header) => warnings.push(`${header}: ${count} verdier har annet format enn tre desimaler.`));
  return { name, sha256: createHash("sha256").update(bytes).digest("hex"), encoding, bom, headers, schema, endings, warnings, rows };
}

type Status = "formatting" | "within-tolerance" | "outside-tolerance" | "missing-value" | "missing-id";
export interface Deviation {
  id: string; column: string; status: Status; windows: string; web: string;
  delta: number | null; tolerance: number | null;
}
export interface ColumnSummary {
  column: string; tolerance: number | null; compared: number; exact: number;
  formatting: number; within: number; outside: number; missingMismatch: number;
  bothMissing: number; unavailable: number; maxAbs: number | null;
  positive: number; negative: number; sumDelta: number; numericPairs: number;
}
export interface Comparison {
  windows: ExportFile; web: ExportFile; matched: string[];
  onlyWindows: string[]; onlyWeb: string[];
  columns: ColumnSummary[]; combinedNotes: ColumnSummary;
  deviations: Deviation[]; groups: Group[];
}

function summary(column: string): ColumnSummary {
  return { column, tolerance: CONTINUOUS.has(column) ? TOLERANCE : NUMERIC.has(column) ? 0 : null,
    compared: 0, exact: 0, formatting: 0, within: 0, outside: 0, missingMismatch: 0,
    bothMissing: 0, unavailable: 0, maxAbs: null, positive: 0, negative: 0, sumDelta: 0, numericPairs: 0 };
}

function compareValue(id: string, column: ColumnSummary, left: string | undefined, right: string | undefined, deviations: Deviation[]): void {
  if (left === undefined || right === undefined) { column.unavailable++; return; }
  column.compared++;
  if (left === "" && right === "") column.bothMissing++;
  let numeric: ReturnType<typeof numericDifference> | undefined;
  if (column.tolerance !== null && left !== "" && right !== "") {
    numeric = numericDifference(left, right, column.tolerance);
    column.numericPairs++;
    column.maxAbs = Math.max(column.maxAbs ?? 0, Math.abs(numeric.delta));
    column.sumDelta += numeric.delta;
    if (numeric.delta > 0) column.positive++;
    if (numeric.delta < 0) column.negative++;
  }
  if (left === right) { column.exact++; return; }
  let status: Status;
  if (left === "" || right === "") { column.missingMismatch++; status = "missing-value"; }
  else if (numeric?.equal) { column.formatting++; status = "formatting"; }
  else if (numeric?.within) { column.within++; status = "within-tolerance"; }
  else { column.outside++; status = "outside-tolerance"; }
  deviations.push({ id, column: column.column, status, windows: left, web: right,
    delta: numeric?.delta ?? null, tolerance: column.tolerance });
}

export interface Group { variable: string; group: string; count: number; anyDifference: number; outside: number }

/** Group observed differences only; no claim of causality or extrapolation to untested cases. */
function analyzeGroups(result: Comparison): Group[] {
  const groups = new Map<string, Group>();
  const changed = new Set(result.deviations.map(d => d.id));
  const outside = new Set(result.deviations.filter(d => ["outside-tolerance", "missing-value"].includes(d.status)).map(d => d.id));
  for (const id of result.matched) {
    const v = result.web.rows.get(id)!.values;
    const w = result.windows.rows.get(id)!.values;
    const number = (key: keyof Values) => v[key] === "" || v[key] === undefined ? null : Number(v[key]);
    const age = v["VIST ALDER"];
    const parts = age?.match(/^(\d+):(\d+)$/);
    const years = parts ? Number(parts[1]) + Number(parts[2]) / 12 : null;
    const rasch = number("RASCHSKÅR");
    const se = number("STANDARDFEIL");
    const count = [...(v["OPPGAVESKÅRER"] ?? "")].filter(c => "012".includes(c)).length;
    const extreme = (x: Values) => x.MINESTIMERT === "1" || x.MAKSESTIMERT === "1";
    const categories = [
      ["Vist alder (webb)", years === null ? "Mangler/ukjent" : years < 4 ? "<4" : years < 8 ? "4–<8" : years < 12 ? "8–<12" : years < 17 ? "12–<17" : "≥17"],
      ["Rasch (webb)", rasch === null ? "Mangler" : rasch < -1 ? "<−1" : rasch < 1 ? "−1–<1" : "≥1"],
      ["Standardfeil (webb)", se === null ? "Mangler" : se < 0.4 ? "<0,4" : se < 0.6 ? "0,4–<0,6" : "≥0,6"],
      ["Ekstremflagg (min/maks)", extreme(v) || extreme(w) ? "Minst ett program" : "Ingen"],
      ["Gyldige oppgaver (webb)", count < 15 ? "0–14" : count < 20 ? "15–19" : "20–50"],
    ];
    for (const [variable, category] of categories) {
      const key = `${variable}:${category}`;
      const group = groups.get(key) ?? { variable, group: category, count: 0, anyDifference: 0, outside: 0 };
      group.count++;
      if (changed.has(id)) group.anyDifference++;
      if (outside.has(id)) group.outside++;
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.variable < b.variable ? -1 : a.variable > b.variable ? 1 : a.group < b.group ? -1 : a.group > b.group ? 1 : 0);
}

/** Match exact IDs, independently of input row order; duplicates are rejected while reading. */
export function compareExports(windows: ExportFile, web: ExportFile): Comparison {
  const matched = [...windows.rows.keys()].filter(id => web.rows.has(id)).sort();
  const onlyWindows = [...windows.rows.keys()].filter(id => !web.rows.has(id)).sort();
  const onlyWeb = [...web.rows.keys()].filter(id => !windows.rows.has(id)).sort();
  const columns = HEADERS.map(summary);
  const combinedNotes = summary("MERKNADER (sammensetningskontroll)");
  const deviations: Deviation[] = [];
  for (const id of onlyWindows) deviations.push({ id, column: "FILNAVN", status: "missing-id", windows: id, web: "", delta: null, tolerance: null });
  for (const id of onlyWeb) deviations.push({ id, column: "FILNAVN", status: "missing-id", windows: "", web: id, delta: null, tolerance: null });
  for (const id of matched) {
    const left = windows.rows.get(id)!;
    const right = web.rows.get(id)!;
    for (const column of columns) compareValue(id, column, left.values[column.column as keyof Values], right.values[column.column as keyof Values], deviations);
    compareValue(id, combinedNotes, left.combinedNote, right.combinedNote, deviations);
  }
  const result: Comparison = { windows, web, matched, onlyWindows, onlyWeb, columns, combinedNotes, deviations, groups: [] };
  result.groups = analyzeGroups(result);
  return result;
}

/** Preserve tabs, quotes, line breaks, spaces, and empty fields in machine-readable output. */
export function writeTsv(rows: readonly (readonly string[])[]): string {
  return "\ufeff" + rows.map(row => row.map(value => /[\t\r\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join("\t")).join("\r\n") + "\r\n";
}

function markdown(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "&#124;").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

/** Deterministic reports contain no timestamps, input row positions, or absolute paths. */
export function renderReports(result: Comparison): { report: string; deviations: string; summary: string } {
  const failures = result.deviations.filter(d => ["outside-tolerance", "missing-value", "missing-id"].includes(d.status));
  const metadata = (f: ExportFile) => ({ name: f.name, sha256: f.sha256, encoding: f.encoding, bom: f.bom,
    schema: f.schema, count: f.rows.size, headers: f.headers, endings: f.endings, warnings: f.warnings });
  const numberText = (value: number | null) => value === null ? "—" : String(value);
  const tableRow = (c: ColumnSummary) => `| ${markdown(c.column)} | ${c.compared} | ${c.exact} | ${c.formatting} | ${c.within} | ${c.outside} |`;
  const missingRow = (c: ColumnSummary) => `| ${markdown(c.column)} | ${c.missingMismatch} | ${c.bothMissing} | ${c.unavailable} |`;
  const numericRow = (c: ColumnSummary) => `| ${markdown(c.column)} | ${numberText(c.tolerance)} | ${c.numericPairs} | ${numberText(c.maxAbs)} | ${c.negative} | ${c.positive} | ${c.numericPairs ? c.sumDelta / c.numericPairs : "—"} |`;
  const format = [result.windows, result.web].map(f => `- ${markdown(f.name)}: ${f.encoding}, ${f.bom ? "UTF-8-BOM" : "uten BOM"}, ${f.rows.size} poster, ${f.headers.length} kolonner; radslutt CRLF/LF/CR = ${f.endings.crlf}/${f.endings.lf}/${f.endings.cr}; avsluttende radslutt: ${f.endings.finalNewline ? "ja" : "nei"}. SHA-256: ${f.sha256}.${f.warnings.map(w => ` ${markdown(w)}`).join("")}`).join("\n");
  const allExact = result.columns.every(c => c.exact === c.compared) && result.combinedNotes.exact === result.combinedNotes.compared;
  const report = `# Pilotrapport – sammenligning av eksportfiler

## Observasjoner

Windows: ${result.windows.rows.size} unike ID. Webb: ${result.web.rows.size} unike ID. Sammenfallende ID: ${result.matched.length}. Bare Windows: ${result.onlyWindows.length}. Bare webb: ${result.onlyWeb.length}. Dupliserte og tomme ID avvises av verktøyet. Matching bruker eksakt FILNAVN, ikke radposisjon eller initialene i NAVN.

${allExact ? "Alle individuelt sammenlignbare felt og sammensetningskontrollen er eksakt like etter formatavkoding." : "Forskjeller er funnet; se kolonneoversikt og avvikslisten."} Antall avvik utenfor toleranse, ensidig manglende verdi eller manglende ID: ${failures.length}.

## Format og kolonnemapping

${format}

Windows-formatet med 14 kolonner har 13 direkte motstykker i webbformatets 18 kolonner. Rubrikkaliaset RASCHSKÅRE → RASCHSKÅR er kjent skjema, ikke en endring av data. De tre webbkolonnene FØDSELSDATO, TESTDATO og VIST ALDER mangler Windows-motstykke. MERKNAD og MERKNAD 2 kan heller ikke sammenlignes individuelt; de kontrolleres separat som MERKNAD + ett mellomrom + MERKNAD 2 mot MERKNADER. Denne kontrollen verifiserer ikke feltgrensen. Ingen manglende kolonne fylles med tom tekst eller antatte verdier. Dersom begge filer har 18 kolonner, sammenlignes alle 18 direkte.

TSV-avkoding fjerner bare strukturelle anførselstegn og avkoder doble anførselstegn. Ingen trimming, omkoding av oppgavetegn, endring av ID, avrunding av verdier eller annen innholdsnormalisering utføres. Avvikende BOM, tegnkoding, rubrikker og radslutt beskrives her separat fra resultatavvik.

## Regler og toleranser

LOGALDER, RASCHSKÅR og STANDARDFEIL: absolutt toleranse 0,0005, inkludert grensen. Rasch/standardfeil følger tidligere verifisering i docs/Etapp_7A_berakningsverifiering.md. LOGALDER følger prosjektets eiers uttrykkelige godkjenning i pilotoppdraget. Toleransen for eksportens tre desimaler utvides ikke til 0,001 mellom to avrundede eksporter. Sammenligningen kan ikke avgjøre uavrundede underliggende forskjeller.

MODELLBASERT PERSENTIL: numerisk toleranse 0. FILNAVN, NAVN, KJØNN, FØDSELSDATO, TESTDATO, VIST ALDER, MERKNAD, MERKNAD 2, OPPGAVESKÅRER, MINESTIMERT, MAKSESTIMERT, ALDERSEKVIVALENT og begge konfidensgrensene: eksakt tekst, ingen toleranse. Å:M og grenseuttrykk som «Lavere enn 3:6» omregnes ikke til tall.

«Eksakt» gjelder avkodet felttekst. «Format» betyr ulik tekst med samme tallverdi. «Innenfor» er en reell tallforskjell større enn 0 og høyst toleransen. «Utenfor» gjelder andre innholdsforskjeller. Ensidig manglende verdi vises separat; to tomme verdier regnes som eksakte og telles også i «Begge tomme». «Ingen kolonne» betyr ikke sammenlignbart. Δ = webb − Windows. Negativ/positiv og middel-Δ gjelder numeriske par, også eksakte; en tom verdi er aldri null.

## Alle 18 kolonner

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
${result.columns.map(tableRow).join("\n")}

Sammensetningskontroll (kommer i tillegg til de 18 kolonnene):

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
${tableRow(result.combinedNotes)}

### Manglende verdier og kolonner

Ensidig tomme verdier kommer i tillegg til Eksakt/Format/Innenfor/Utenfor i oversikten ovenfor. Begge tomme er en delmengde av Eksakt. Sammenlignet + Ingen kolonne = antall matchende ID.

| Kolonne | Ensidig tom | Begge tomme | Ingen kolonne |
|---|---:|---:|---:|
${[...result.columns, result.combinedNotes].map(missingRow).join("\n")}

### Numerisk størrelse og retning

Alle øvrige kolonner har eksakt tekstregel uten numerisk toleranse. Negativ Δ betyr lavere webbverdi; positiv Δ betyr høyere webbverdi.

| Kolonne | Abs.tol. | Numeriske par | Maks abs. Δ | Negativ Δ | Positiv Δ | Middel-Δ |
|---|---:|---:|---:|---:|---:|---:|
${result.columns.filter(c => c.tolerance !== null).map(numericRow).join("\n")}

## Alle avvik utenfor toleranse og mangler

${failures.length ? "| ID | Kolonne | Type | Windows | Webb | Δ |\n|---|---|---|---|---|---:|\n" + failures.map(d => `| ${markdown(d.id)} | ${markdown(d.column)} | ${d.status} | ${markdown(d.windows)} | ${markdown(d.web)} | ${numberText(d.delta)} |`).join("\n") : "Ingen. Den maskinlesbare avvikslisten inneholder derfor bare rubrikkraden hvis også øvrige forskjeller mangler."}

Bare Windows: ${result.onlyWindows.map(markdown).join(", ") || "ingen"}. Bare webb: ${result.onlyWeb.map(markdown).join(", ") || "ingen"}.

## Undersøkelse av mønstre

Gruppene bruker webbverdier for alder, Rasch, standardfeil og antall gyldige oppgaver (kun 0/1/2). Ekstremflagg registreres hvis minst ett program setter min- eller maksflagget. «Med forskjell» inkluderer format og tolererte forskjeller; «Med alvorlig avvik» gjelder utenfor toleranse eller ensidig tom verdi. ID som mangler i én fil vises ovenfor og inngår ikke i disse gruppene.

| Variabel | Gruppe | Antall | Med forskjell | Med alvorlig avvik |
|---|---|---:|---:|---:|
${result.groups.map(g => `| ${g.variable} | ${g.group} | ${g.count} | ${g.anyDifference} | ${g.outside} |`).join("\n")}

## Vurdering og avgrensning

${result.deviations.length === 0 ? "Ingen observerte forskjeller varierer med alder, Rasch, standardfeil, ekstremflagg eller antall oppgaver: alle sammenlignbare felt er like i dette materialet. Det finnes dermed ikke et avviksmønster å beregne korrelasjoner for. Dette er god overensstemmelse ved eksportens presisjon, men beviser ikke identiske interne beregninger eller riktighet utenfor pilotmaterialet." : "Gruppeoversikten beskriver observerte forskjeller og deres retning; den dokumenterer ikke årsak. Vurder avvikene enkeltvis før hovedsimuleringen. Eksportens presisjon begrenser hva som kan konkluderes om interne beregninger."}

Datoer, vist alder og de individuelle merknadsfeltene kan ikke verifiseres mot en 14-kolonners Windows-eksport. Pilotens syntetiske alders- og oppgaveutvalg erstatter heller ikke egne dato- og grensefall. Ekstremflagg finnes for ${result.groups.find(g => g.variable === "Ekstremflagg (min/maks)" && g.group === "Minst ett program")?.count ?? 0} av de matchende ID-ene; dekningen av slike tilfeller må tas med i vurderingen. Ingen endring av skåringsprogrammet eller generering av 1 000 nye registreringer inngår. Hovedsimuleringen krever prosjektets eiers godkjenning.
`;
  const deviationRows = [["ID", "KOLONNE", "TYPE", "WINDOWS", "WEBB", "DELTA_WEBB_MINUS_WINDOWS", "ABS_TOLERANSE"],
    ...result.deviations.map(d => [d.id, d.column, d.status, d.windows, d.web, d.delta === null ? "" : String(d.delta), d.tolerance === null ? "" : String(d.tolerance)])];
  return { report, deviations: writeTsv(deviationRows), summary: JSON.stringify({
    windows: metadata(result.windows), web: metadata(result.web), matched: result.matched,
    onlyWindows: result.onlyWindows, onlyWeb: result.onlyWeb, columns: result.columns,
    combinedNotes: result.combinedNotes, deviations: result.deviations, groups: result.groups,
  }, null, 2) + "\n" };
}

/** CLI failures never write a partial comparison; report files cannot overwrite either input. */
export function main(args: string[]): number {
  if (args.length < 4 || args[2] !== "--out") throw new Error("Bruk: node simulation/compare.cjs WINDOWS WEBB --out RAPPORTPREFIKS [--windows-encoding windows-1252|utf-8] [--web-encoding utf-8|windows-1252]");
  let windowsEncoding: Encoding = "windows-1252";
  let webEncoding: Encoding = "utf-8";
  for (let i = 4; i < args.length; i += 2) {
    const value = args[i + 1];
    if (value !== "utf-8" && value !== "windows-1252") throw new Error("Ugyldig tegnkoding.");
    if (args[i] === "--windows-encoding") windowsEncoding = value;
    else if (args[i] === "--web-encoding") webEncoding = value;
    else throw new Error("Ukjent argument.");
  }
  const windows = readExport(fs.readFileSync(args[0]), path.basename(args[0]), windowsEncoding);
  const web = readExport(fs.readFileSync(args[1]), path.basename(args[1]), webEncoding);
  const comparison = compareExports(windows, web);
  const reports = renderReports(comparison);
  const outputs = [[`${args[3]}-report.md`, reports.report], [`${args[3]}-deviations.tsv`, reports.deviations], [`${args[3]}-summary.json`, reports.summary]];
  for (const [filename, content] of outputs) {
    if ([args[0], args[1]].some(input => path.resolve(filename) === path.resolve(input))) throw new Error("Utdata kan ikke overskrive inndata.");
    if (fs.existsSync(filename) && fs.readFileSync(filename, "utf8") !== content) throw new Error("Rapportprefikset finnes med annet innhold. Velg et nytt prefiks.");
  }
  for (const [filename, content] of outputs) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    if (!fs.existsSync(filename)) fs.writeFileSync(filename, content, { flag: "wx" });
  }
  console.log(`${comparison.matched.length} ID sammenlignet; ${comparison.deviations.length} forskjeller. Rapporter: ${args[3]}-*`);
  return comparison.deviations.some(d => ["outside-tolerance", "missing-value", "missing-id"].includes(d.status)) ? 2 : 0;
}
