/** Report five real export pairs using the approved comparator without changing its rules. */
import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readExport, compareExports, renderReports, writeTsv } from "./compare";
import type { ExportFile, Comparison } from "./compare";
import { moments } from "./simulate";
import { resolveCalculationAge } from "../src/domain/dateAge";
import { Skaring } from "../src/api/skaring";

const pairs = Array.from({ length: 5 }, (_, i) => ({
  key: i < 4 ? `ordinary-0${i + 1}` : "clinical",
  group: i < 4 ? "ordinary" : "clinical",
  windows: i < 4 ? `main/exports/261113 Win 0${i + 1}.dat` : "clinical/exports/clinical_windows.dat",
  web: i < 4 ? `main/exports/261113 Web 0${i + 1}.dat` : "clinical/exports/clinical_webb.txt",
  first: 201 + i * 250,
}));
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");

/** Exact expected ID sets are required before aggregation, so absent cases cannot disappear in totals. */
export function loadPairs(root: string) {
  return pairs.map(pair => {
    const windows = readExport(fs.readFileSync(path.join(root, pair.windows)), pair.windows, "windows-1252");
    const web = readExport(fs.readFileSync(path.join(root, pair.web)), pair.web, "utf-8");
    assert.equal(windows.schema, "legacy-14");
    assert.equal(windows.encoding, "windows-1252");
    assert.equal(windows.bom, false);
    assert.equal(web.schema, "web-18");
    assert.equal(web.encoding, "utf-8");
    assert.equal(web.bom, true);
    const expected = Array.from({ length: 250 }, (_, index) => `S${String(pair.first + index).padStart(4, "0")}`);
    for (const file of [windows, web]) {
      assert.deepEqual([...file.rows.keys()].sort(), expected, `Wrong ID set: ${file.name}`);
      assert.deepEqual(file.endings, { crlf: 251, lf: 0, cr: 0, finalNewline: true });
      assert.deepEqual(file.warnings, []);
    }
    return { ...pair, result: compareExports(windows, web) };
  });
}

/** Unions exist only in memory for aggregation; no synthetic program exports are written. */
export function aggregate(results: Comparison[]): Comparison {
  assert.ok(results.length > 0);
  const union = (side: "windows" | "web"): ExportFile => {
    const first = results[0][side];
    const rows = new Map(first.rows);
    rows.clear();
    for (const result of results) for (const [id, row] of result[side].rows) {
      assert.ok(!rows.has(id), `Overlapping ID: ${id}`);
      assert.equal(result[side].schema, first.schema);
      rows.set(id, row);
    }
    return { ...first, name: "In-memory aggregate only", sha256: "", rows };
  };
  return compareExports(union("windows"), union("web"));
}

function stats(values: number[]) {
  return { min: Math.min(...values), max: Math.max(...values), ...moments(values) };
}

/** Report exported results, not rerun scores. Difference reconstruction uses paired web age fields. */
export function describeExports(result: Comparison, side: "windows" | "web") {
  const engine = new Skaring();
  const values = result.matched.map(id => result[side].rows.get(id)!.values);
  const percentiles = values.map(v => Number(v["MODELLBASERT PERSENTIL"]));
  const differences = result.matched.map(id => {
    const ageFields = result.web.rows.get(id)!.values;
    const age = resolveCalculationAge({ age: ageFields["VIST ALDER"], birthDate: ageFields.FØDSELSDATO, testDate: ageFields.TESTDATO });
    assert.ok(age);
    return Number(result[side].rows.get(id)!.values["RASCHSKÅR"]) - engine.ageToMeasure(age.years, 1.968, 0.254);
  });
  assert.ok(values.every(v => v["RASCHSKÅR"] !== "" && v.STANDARDFEIL !== "" && v["MODELLBASERT PERSENTIL"] !== ""));
  return {
    n: values.length,
    rasch: stats(values.map(v => Number(v["RASCHSKÅR"]))),
    standardError: stats(values.map(v => Number(v.STANDARDFEIL))),
    reconstructedDifference: stats(differences),
    negativeDifference: differences.filter(value => value < 0).length,
    percentiles: Object.fromEntries([...new Set(percentiles)].sort((a, b) => a - b).map(p => [p, percentiles.filter(value => value === p).length])),
    zero: percentiles.filter(p => p === 0).length,
    atMostTwo: percentiles.filter(p => p <= 2).length,
    atMostFive: percentiles.filter(p => p <= 5).length,
    atMostFifteen: percentiles.filter(p => p <= 15).length,
    middle: percentiles.filter(p => p >= 30 && p <= 70).length,
    hundred: percentiles.filter(p => p === 100).length,
    minIds: result.matched.filter(id => result[side].rows.get(id)!.values.MINESTIMERT === "1"),
    maxIds: result.matched.filter(id => result[side].rows.get(id)!.values.MAKSESTIMERT === "1"),
    belowMinus4point2: values.filter(v => Number(v["RASCHSKÅR"]) < -4.2).length,
    belowMinus5: values.filter(v => Number(v["RASCHSKÅR"]) < -5).length,
  };
}

const totals = (result: Comparison) => ({
  n: result.matched.length,
  exact: result.columns.reduce((sum, c) => sum + c.exact, 0),
  formatting: result.columns.reduce((sum, c) => sum + c.formatting, 0),
  within: result.columns.reduce((sum, c) => sum + c.within, 0),
  outside: result.columns.reduce((sum, c) => sum + c.outside, 0),
  missing: result.columns.reduce((sum, c) => sum + c.missingMismatch, 0),
  noteExact: result.combinedNotes.exact,
  noteDifferences: result.combinedNotes.compared - result.combinedNotes.exact,
});

/** All source bytes are fingerprinted before and after report creation. */
function snapshot(root: string): { file: string; sha256: string }[] {
  const entries: { file: string; sha256: string }[] = [];
  const visit = (relative: string) => {
    if (["verification", "verify-all.ts", "verify-all.cjs"].includes(relative)) return;
    const absolute = path.join(root, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(relative ? `${relative}/${name}` : name);
    } else entries.push({ file: relative, sha256: hash(fs.readFileSync(absolute)) });
  };
  visit("");
  return entries;
}

export function buildVerification(root: string) {
  const loaded = loadPairs(root);
  const groups = {
    A_ordinary1000: aggregate(loaded.slice(0, 4).map(p => p.result)),
    B_clinical250: loaded[4].result,
    C_all1250: aggregate(loaded.map(p => p.result)),
  };
  assert.equal(groups.C_all1250.matched.length, 1250);
  const files = new Map<string, string>();
  for (const pair of loaded) {
    const rendered = renderReports(pair.result);
    files.set(`pairs/${pair.key}-report.md`, rendered.report);
    files.set(`pairs/${pair.key}-deviations.tsv`, rendered.deviations);
    files.set(`pairs/${pair.key}-summary.json`, rendered.summary);
  }
  const sections = Object.entries(groups).map(([name, result]) => ({
    name, totals: totals(result), columns: result.columns, combinedNotes: result.combinedNotes,
    patterns: result.groups, windows: describeExports(result, "windows"), web: describeExports(result, "web"),
  }));
  const deviations = loaded.flatMap(pair => pair.result.deviations.map(d => ({ group: pair.group, pair: pair.key, ...d })));
  files.set("deviations.tsv", writeTsv([["GROUP", "PAIR", "ID", "COLUMN", "STATUS", "WINDOWS", "WEB", "DELTA", "TOLERANCE"], ...deviations.map(d => [d.group, d.pair, d.id, d.column, d.status, d.windows, d.web, d.delta === null ? "" : String(d.delta), d.tolerance === null ? "" : String(d.tolerance)])]));
  files.set("summary.json", JSON.stringify({
    sources: loaded.map(p => ({ pair: p.key, group: p.group, windows: { file: p.windows, sha256: p.result.windows.sha256 }, web: { file: p.web, sha256: p.result.web.sha256 } })),
    sections, deviations,
  }, null, 2) + "\n");
  const f = (value: number) => value.toFixed(3).replace(".", ",");
  const statsTable = (s: typeof sections[number]) => `| Eksportmål | Windows | Webb |\n|---|---:|---:|\n` + [
    ["Rasch, gjennomsnitt (SD)", `${f(s.windows.rasch.mean)} (${f(s.windows.rasch.sd)})`, `${f(s.web.rasch.mean)} (${f(s.web.rasch.sd)})`],
    ["Rasch, min–maks", `${f(s.windows.rasch.min)}–${f(s.windows.rasch.max)}`, `${f(s.web.rasch.min)}–${f(s.web.rasch.max)}`],
    ["Standardfeil, gjennomsnitt", f(s.windows.standardError.mean), f(s.web.standardError.mean)],
    ["Rekonstruert differanse, gjennomsnitt (SD)", `${f(s.windows.reconstructedDifference.mean)} (${f(s.windows.reconstructedDifference.sd)})`, `${f(s.web.reconstructedDifference.mean)} (${f(s.web.reconstructedDifference.sd)})`],
    ["Negativ rekonstruert differanse", s.windows.negativeDifference, s.web.negativeDifference],
    ["Modellpersentil 0", s.windows.zero, s.web.zero], ["Modellpersentil ≤2", s.windows.atMostTwo, s.web.atMostTwo],
    ["Modellpersentil ≤5", s.windows.atMostFive, s.web.atMostFive], ["Modellpersentil ≤15", s.windows.atMostFifteen, s.web.atMostFifteen],
    ["Modellpersentil 30–70", s.windows.middle, s.web.middle], ["Modellpersentil 100", s.windows.hundred, s.web.hundred],
    ["Minestimert", s.windows.minIds.length, s.web.minIds.length], ["Maksestimert", s.windows.maxIds.length, s.web.maxIds.length],
    ["Rasch < −4,20", s.windows.belowMinus4point2, s.web.belowMinus4point2], ["Rasch < −5", s.windows.belowMinus5, s.web.belowMinus5],
  ].map(row => `| ${row.join(" | ")} |`).join("\n");
  const all = groups.C_all1250;
  files.set("report.md", `# Slutrapport – fem manuelle eksportpar, 1 250 tilfeller

## Kontroll av kildene

Alle ti faktiske eksportfiler er lest med det godkjente sammenligningsverktøyet. Hvert par har nøyaktig de forventede 250 unike ID-ene. Samlet ID-mengde er S0201–S1450 uten hull eller overlapp. Pilotens S0001–S0200 inngår ikke i denne totalsummen.

Alle fem Windows-filer har Windows-1252 uten BOM, 14 kolonner og CRLF. Alle fem webbfiler har UTF-8 med BOM, 18 kolonner og CRLF. Samtlige har 251 poster inklusive rubrikk og avsluttende CRLF. Dette er dokumenterte formatforskjeller, ikke resultatavvik. Se pairs/ for kildefiler, kontrollsummer og individuelle rapporter.

## A. Ordinær hovedsimulering – 1 000 tilfeller

S0201–S1200. ${sections[0].totals.exact} direkte feltkontroller er eksakt like. ${sections[0].totals.noteExact} sammensetningskontroller av merknader er eksakt like.

${statsTable(sections[0])}

## B. Klinisk komplettering – 250 tilfeller

S1201–S1450. ${sections[1].totals.exact} direkte feltkontroller er eksakt like. ${sections[1].totals.noteExact} sammensetningskontroller av merknader er eksakt like.

${statsTable(sections[1])}

Kliniske minestimerte ID (Windows): ${sections[1].windows.minIds.join(", ") || "ingen"}. Maksestimerte: ${sections[1].windows.maxIds.join(", ") || "ingen"}. Fullt persentilhistogram og ID-er for begge programmene finnes i summary.json.

## C. Samtlige 1 250 – programoverensstemmelse

| Gruppe | ID | Eksakte direkte felt | Format | Numerisk innenfor | Utenfor | Ensidig tom | Eksakte sammensatte merknader |
|---|---:|---:|---:|---:|---:|---:|---:|
${sections.map(s => `| ${s.name} | ${s.totals.n} | ${s.totals.exact} | ${s.totals.formatting} | ${s.totals.within} | ${s.totals.outside} | ${s.totals.missing} | ${s.totals.noteExact} |`).join("\n")}

${deviations.length === 0 ? "Ingen innholdsavvik, numeriske avvik eller formateringsforskjeller i avkodede sammenlignbare felt er observert i noen av de fem parene. Toleransene behøvde ikke å tas i bruk." : `Antall avvik: ${deviations.length}. Alle er identifisert med gruppe, par, ID, kolonne og begge verdier i deviations.tsv og parrapportene.`}

### Alle 18 kolonner

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor | Ensidig tom | Ikke sammenlignbar | Maks abs. numerisk Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${all.columns.map(c => `| ${c.column} | ${c.compared} | ${c.exact} | ${c.formatting} | ${c.within} | ${c.outside} | ${c.missingMismatch} | ${c.unavailable} | ${c.maxAbs === null ? "—" : c.maxAbs} |`).join("\n")}

De fem webbkolonnene uten individuell Windows-motpart er ikke erklært verifisert: FØDSELSDATO, TESTDATO, VIST ALDER, MERKNAD og MERKNAD 2. Den separate sammenstillingen MERKNAD + ett mellomrom + MERKNAD 2 kontrollerer samlet tekst, ikke feltgrensen. Kjønn, flagg, oppgavetegn, Å:M-tekster og intervalluttrykk sammenlignes eksakt. Toleransene er uendret: 0,0005 for LOGALDER/Rasch/standardfeil og 0 for numerisk modellpersentil. Strukturell TSV-citering avkodes uten trimming eller innholdsnormalisering.

## Mønstre og begrensninger

${deviations.length === 0 ? "Ingen observerte avvik varierer med alder, Rasch, standardfeil, ekstremflagg eller antall oppgaver, fordi ingen avvik finnes. Korrelasjoner med avvik kan derfor ikke beregnes meningsfullt." : "Se de separate parrapportenes grupperinger etter alder, Rasch, standardfeil, ekstremflagg og antall oppgaver. Avvikene må vurderes før en konklusjon om overensstemmelse trekkes."} Retningen webb minus Windows, gjennomsnittlig numerisk forskjell og tegnfordeling finnes i parrapportene og summary.json.

Statistikken i A og B bygger på faktiske eksportverdier fra hvert program og holdes atskilt. SD bruker n−1. «Rekonstruert differanse» beregnes fra eksportert Rasch (tre desimaler) minus forventet Rasch fra det parede webbfeltets registrerte alder, med eksisterende dato-/aldersregler inklusive manuelt halvmånedstillegg. Dette er en avledet beskrivende størrelse, ikke et eksportert uavrundet internt resultat eller en selvstendig Windows-aldersverifisering. Modellpersentiler og ekstremflagg er derimot lest direkte fra eksportene.

Overensstemmelse ved eksportens presisjon er sterk verifikasjon for dette materialet, men beviser ikke identiske interne uavrundede verdier eller alle mulige registreringer. Eksakte datoer og de fem manglende individuelle Windows-kolonnene kan ikke verifiseres av denne sammenligningen.

Alle tidligere filer og de ti manuelle eksportene bevares. Produksjonskode og godkjente sammenligningsregler er uendret. Ingen nye registreringer, commit eller push inngår. Reproduserbar kjøring og tester er dokumentert i README.md.
`);
  files.set("README.md", `# Gemensam verifiering – körinstruktioner

Från projektroten:

\`\`\`powershell
node simulation/verify-all.cjs
node --test tests/combinedVerification.test.cjs
\`\`\`

Källorna är de fyra faktiska Win/Web-paren i main/exports och clinical/exports/clinical_windows.dat samt clinical_webb.txt. Först krävs exakt rätt ID-mängd i varje fil och totalt 1 250 utan överlapp. Den godkända compare.cjs används oförändrad. Sammanställaren skapar inga exportfiler och räknar inte om uppgiftsskårer.

report.md har separata avsnitt A (1 000), B (250) och C (1 250). pairs/ har fem fullständiga rapportuppsättningar. summary.json har källornas SHA-256, statistik separat för båda programmen och kolumnsammanställningar. deviations.tsv innehåller alla avvikelser med grupp, par och ID; endast rubrik betyder inga avvikelser. preserved-files.json skyddar tidigare material och alla manuella exporter.

Befintliga identiska resultat accepteras; avvikande tidigare rapporter skrivs inte över. Allt sker lokalt utan nätverk eller nya paket. Ingen produktionskod eller jämförelseregel ändras.
`);
  return { files, groups, loaded, deviations };
}

export function deliverVerification(root: string): void {
  const before = snapshot(root);
  const built = buildVerification(root);
  const repeated = buildVerification(root);
  assert.deepEqual(built.files, repeated.files);
  const manifestPath = path.join(root, "verification/preserved-files.json");
  const preserved: typeof before = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : before;
  for (const entry of preserved) assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.sha256);
  built.files.set("preserved-files.json", JSON.stringify(preserved, null, 2) + "\n");
  for (const [relative, content] of built.files) {
    const target = path.join(root, "verification", relative);
    if (fs.existsSync(target)) assert.equal(fs.readFileSync(target, "utf8"), content, `Existing report differs: ${relative}`);
  }
  for (const [relative, content] of built.files) {
    const target = path.join(root, "verification", relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, content, { flag: "wx" });
  }
  assert.deepEqual(snapshot(root), before);
  console.log(`Five real export pairs, 1250 IDs; ${built.deviations.length} differences. See simulation/verification/report.md.`);
}
