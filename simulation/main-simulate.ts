/** Main study generation only. Pilot artifacts and all production modules remain read-only. */
import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FINAL_PARAMETERS, moments, random, selectArea, shapedNormal, simulate } from "./simulate";
import type { Row } from "./simulate";
import { Skaring } from "../src/api/skaring";
import { resolveCalculationAge } from "../src/domain/dateAge";
import { parseNubu100, serializeNubu100 } from "../src/file/nubu100";

export const MAIN = { seed: 20261114, count: 1000, firstId: 201, groupSize: 250 } as const;
const PILOT = { seed: 20261113, count: 200, firstId: 1 } as const;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
const model = new Skaring();
const lower = model.ageToMeasure(3.5, 1.968, 0.254) - 0.1;
const upper = model.ageToMeasure(18, 1.968, 0.254) + 0.1;

export interface MainRow extends Row {
  calculationAge: number;
  expected: number;
  latentDifference: number;
  standardError: number;
  minEstimated: boolean;
  maxEstimated: boolean;
}

/** Keep the pilot draw order unchanged; explicit settings replace only seed, count, and ID range. */
export function generate(settings: { seed: number; count: number; firstId: number } = MAIN): MainRow[] {
  assert.ok(Number.isInteger(settings.seed) && settings.seed >= 0 && settings.seed <= 0xffffffff);
  assert.ok(Number.isInteger(settings.count) && settings.count > 0);
  assert.ok(Number.isInteger(settings.firstId) && settings.firstId > 0);
  return Array.from({ length: settings.count }, (_, person) => {
    const rng = random((settings.seed + Math.imul(person + 1, 0x9e3779b9)) >>> 0);
    const a = lower + (upper - lower) * rng();
    const z = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const b = FINAL_PARAMETERS.sigma * shapedNormal(z, FINAL_PARAMETERS.shape);
    const t = a + b;
    const letters = (count: number) => Array.from({ length: count }, () => ALPHABET[Math.floor(rng() * 29)]).join("");
    const name = `${letters(1)} ${letters(1)}`;
    const genderDraw = rng();
    const note = `${letters(3)}.`;
    const note2 = `${letters(3)}.`;
    const items: string[] = [];
    const counts: number[] = [];
    const orders: number[][] = [];
    for (let area = 0; area < 5; area++) {
      const uniforms = Array.from({ length: 10 }, () => rng());
      const ties = Array.from({ length: 5 }, () => rng());
      const selection = selectArea(model.aItemDifficulties.slice(area * 10, area * 10 + 10), t, uniforms, ties);
      items.push(...selection.scores);
      counts.push(selection.order.length);
      orders.push(selection.order);
    }
    const record = {
      name, gender: genderDraw < 0.5 ? "gutt" as const : genderDraw < 0.98 ? "jente" as const : null,
      birthDate: "", testDate: "", age: model.yearDecToMonth(Math.exp(1.968 + 0.254 * a)), note, note2, items,
    };
    const serialized = serializeNubu100(record);
    assert.ok(serialized.ok);
    const parsed = parseNubu100(serialized.bytes);
    assert.equal(parsed.kind, "known-format");
    if (parsed.kind !== "known-format") throw new Error("Main registration did not round-trip");
    assert.deepEqual(parsed.record, record);
    const engine = new Skaring();
    assert.equal(engine.calculateRegistration(parsed.record), -10000);
    const age = resolveCalculationAge(record);
    assert.ok(age);
    assert.equal(engine.gAlder, age.years);
    const expected = engine.ageToMeasure(age.years, 1.968, 0.254);
    const difference = engine.gMeasure - expected;
    const percentile = engine.modelPercentile();
    assert.equal(percentile.kind, "available");
    if (percentile.kind !== "available") throw new Error("Main percentile unavailable");
    return {
      id: `S${String(settings.firstId + person).padStart(4, "0")}`, a, b, t, record,
      estimate: engine.gMeasure, difference, rounded: Math.round(difference * 20) / 20,
      percentile: percentile.value, counts, orders, bytes: serialized.bytes,
      calculationAge: age.years, expected, latentDifference: t - expected,
      standardError: engine.gSE, minEstimated: engine.gIsMinEstimated, maxEstimated: engine.gIsMaxEstimated,
    };
  });
}

/** The unchanged pilot implementation is the oracle for the adapter's complete output. */
export function verifyPilotParity(): void {
  const original = simulate(FINAL_PARAMETERS.sigma);
  const adapted = generate(PILOT).map(({ calculationAge, expected, latentDifference, standardError, minEstimated, maxEstimated, ...row }) => row);
  assert.deepEqual(adapted, original);
}

export function folder(index: number): string {
  const start = MAIN.firstId + index * MAIN.groupSize;
  return `${String(index + 1).padStart(2, "0")}_S${String(start).padStart(4, "0")}-S${String(start + MAIN.groupSize - 1).padStart(4, "0")}`;
}

const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
type Preservation = { file: string; sha256: string }[];

/** Snapshot all preexisting simulation artifacts, including the complete pilot and comparator. */
function capturePilot(simulationRoot: string): Preservation {
  const entries: Preservation = [];
  const visit = (relative: string) => {
    const absolute = path.join(simulationRoot, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(relative ? `${relative}/${name}` : name);
    } else entries.push({ file: relative, sha256: hash(fs.readFileSync(absolute)) });
  };
  for (const name of fs.readdirSync(simulationRoot).sort()) {
    if (!["main", "main-simulate.ts", "main-run.cjs"].includes(name)) visit(name);
  }
  return entries;
}

export function verifyPreservation(simulationRoot: string, entries: Preservation): void {
  for (const entry of entries) assert.equal(hash(fs.readFileSync(path.join(simulationRoot, entry.file))), entry.sha256, `Protected artifact changed: ${entry.file}`);
}

function stats(values: number[]) {
  const result = moments(values);
  return { n: values.length, min: Math.min(...values), max: Math.max(...values), ...result };
}

/** Descriptive summaries use sample SD and ordinary central-moment kurtosis, as in the pilot. */
export function describe(rows: MainRow[]) {
  const percentage = (count: number) => ({ count, percent: count / rows.length * 100 });
  const ageMonths = rows.map(row => {
    const [years, months] = row.record.age.split(":").map(Number);
    return years * 12 + months;
  });
  const totals = rows.map(row => row.counts.reduce((a, b) => a + b, 0));
  const histogram = (values: number[]) => Object.fromEntries([...new Set(values)].sort((a, b) => a - b).map(value => [value, values.filter(x => x === value).length]));
  return {
    count: rows.length,
    ageMonths: stats(ageMonths),
    ageYears: histogram(ageMonths.map(months => Math.floor(months / 12))),
    gender: { gutt: percentage(rows.filter(r => r.record.gender === "gutt").length), jente: percentage(rows.filter(r => r.record.gender === "jente").length), undefined: percentage(rows.filter(r => r.record.gender === null).length) },
    a: stats(rows.map(r => r.a)), b: stats(rows.map(r => r.b)), t: stats(rows.map(r => r.t)),
    latentDifference: stats(rows.map(r => r.latentDifference)),
    estimatedDifference: stats(rows.map(r => r.difference)),
    roundedDifference: stats(rows.map(r => r.rounded)),
    rasch: stats(rows.map(r => r.estimate)), standardError: stats(rows.map(r => r.standardError)),
    taskTotals: { ...stats(totals), histogram: histogram(totals) },
    areaCounts: "ABCDE".split("").map((area, index) => ({ area, histogram: histogram(rows.map(row => row.counts[index])) })),
    scores: Object.fromEntries(["0", "1", "2", "9"].map(score => [score, rows.reduce((sum, row) => sum + row.record.items.filter(value => value === score).length, 0)])),
    percentiles: { histogram: histogram(rows.map(r => r.percentile)), zero: percentage(rows.filter(r => r.percentile === 0).length), middle30to70: percentage(rows.filter(r => r.percentile >= 30 && r.percentile <= 70).length), hundred: percentage(rows.filter(r => r.percentile === 100).length) },
    extremes: { min: rows.filter(r => r.minEstimated).length, max: rows.filter(r => r.maxEstimated).length },
  };
}

function renderReport(rows: MainRow[], pilot: MainRow[]): string {
  const main = describe(rows);
  const reference = describe(pilot);
  const f = (value: number) => value.toFixed(3).replace(".", ",");
  const summaryLine = (label: string, current: ReturnType<typeof stats>, old: ReturnType<typeof stats>) =>
    `| ${label} | ${f(current.mean)} | ${f(current.sd)} | ${f(current.min)}–${f(current.max)} | ${f(old.mean)} | ${f(old.sd)} | ${f(old.min)}–${f(old.max)} |`;
  const countLine = (label: string, current: { count: number; percent: number }, old: { count: number; percent: number }) =>
    `| ${label} | ${current.count} (${f(current.percent)} %) | ${old.count} (${f(old.percent)} %) |`;
  return `# Hovedsimulering – 1 000 registreringer

## Status og metode

1 000 nye syntetiske registreringer, S0201–S1200, i fire mapper med 250 filer hver. Fast frø: ${MAIN.seed}; pilotfrø: ${PILOT.seed}. Dette er generering og lokal kontroll, ikke en sammenligning mellom Windows- og webbprogrammet. Ingen Windows- eller webbeksporter er opprettet. Ingen kliniske tilleggsfall er generert.

Pilotens godkjente metode og parametere beholdes: Mulberry32, separate personstrømmer, Box–Muller, sigma_b = 0,85, c = −0,02 og k = 0,005. For Z fra standard normalfordeling:

b = 0,85 × [Z − 0,02(Z²−1) + 0,005(Z³−3Z)] / sqrt(1 + 2×0,02² + 6×0,005²).

t = a + b, uten ekstra forskyvning. a er uniform mellom ${lower} og ${upper}, som i piloten. Beredskapen til å endre spredning brukes ikke her: frøet og fordelingen er fastlagt før genereringen, og ingen barn erstattes eller håndplukkes.

Visningsalder fås med exp(1,968 + 0,254a) og pilotens trunkering til Å:M. Fødselsdato og testdato er tomme. Den registrerte manuelle alderen brukes med programmets halvmånedstillegg når det aldersforventede Rasch-verdiet beregnes. Teoretisk funksjonsnivå t, registrert alder og beregnet Rasch-estimat holdes atskilt.

Alle oppgaver starter som 9. Pilotens adaptive utvalg og stoppregler brukes uendret, med 2–5 skårede oppgaver per område. Tre kategoriers vekter er 1, exp(t−g+0,39), exp(2(t−g)). Navn, merknader og kjønn trekkes med samme regler og sannsynligheter som i piloten (50/48/2 prosent).

## Beskrivende sammenligning med piloten

Tallene er observasjoner i syntetiske utvalg, ikke en ny normtilpasning. SD bruker n−1. Skjevhet og kurtose bruker sentrale momenter med n i nevneren; normal kurtose er 3.

| Variabel | Hoved: gj.snitt | SD | Min–maks | Pilot: gj.snitt | SD | Min–maks |
|---|---:|---:|---|---:|---:|---|
${summaryLine("Registrert alder, måneder", main.ageMonths, reference.ageMonths)}
${summaryLine("a", main.a, reference.a)}
${summaryLine("b", main.b, reference.b)}
${summaryLine("t", main.t, reference.t)}
${summaryLine("t − aldersforventet Rasch", main.latentDifference, reference.latentDifference)}
${summaryLine("Rasch-estimat", main.rasch, reference.rasch)}
${summaryLine("Estimat − aldersforventet Rasch", main.estimatedDifference, reference.estimatedDifference)}
${summaryLine("Avrundet differanse (0,05)", main.roundedDifference, reference.roundedDifference)}
${summaryLine("Standardfeil", main.standardError, reference.standardError)}
${summaryLine("Antall skårede oppgaver", main.taskTotals, reference.taskTotals)}

Skjevhet/kurtose for estimert differanse: hoved ${f(main.estimatedDifference.skewness)}/${f(main.estimatedDifference.kurtosis)}, pilot ${f(reference.estimatedDifference.skewness)}/${f(reference.estimatedDifference.kurtosis)}. Variasjon mellom disse utvalgene forventes; ingen justering er gjort for å oppnå en bestemt normfordeling.

| Gruppe | Hoved (n = 1 000) | Pilot (n = 200) |
|---|---:|---:|
${countLine("Gutt", main.gender.gutt, reference.gender.gutt)}
${countLine("Jente", main.gender.jente, reference.gender.jente)}
${countLine("Udefinert kjønn", main.gender.undefined, reference.gender.undefined)}
${countLine("Modellpersentil 0", main.percentiles.zero, reference.percentiles.zero)}
${countLine("Modellpersentil 30–70", main.percentiles.middle30to70, reference.percentiles.middle30to70)}
${countLine("Modellpersentil 100", main.percentiles.hundred, reference.percentiles.hundred)}

Min-/maksestimerte tilfeller: hoved ${main.extremes.min}/${main.extremes.max}, pilot ${reference.extremes.min}/${reference.extremes.max}. Slike tilfeller beholdes. Eventuelle tomme konfidensgrenser i senere eksport skal behandles med de godkjente sammenligningsreglene.

### Alder og antall oppgaver

| Hele år i registrert alder | Hoved | Pilot |
|---|---:|---:|
${[...new Set([...Object.keys(main.ageYears), ...Object.keys(reference.ageYears)])].map(Number).sort((a, b) => a - b).map(year => `| ${year} | ${main.ageYears[year] ?? 0} | ${reference.ageYears[year] ?? 0} |`).join("\n")}

| Skårede oppgaver per barn | Hoved | Pilot |
|---|---:|---:|
${[...new Set([...Object.keys(main.taskTotals.histogram), ...Object.keys(reference.taskTotals.histogram)])].map(Number).sort((a, b) => a - b).map(count => `| ${count} | ${main.taskTotals.histogram[count] ?? 0} | ${reference.taskTotals.histogram[count] ?? 0} |`).join("\n")}

| Område | 2 oppgaver | 3 oppgaver | 4 oppgaver | 5 oppgaver |
|---|---:|---:|---:|---:|
${main.areaCounts.map(area => `| ${area.area} | ${area.histogram[2] ?? 0} | ${area.histogram[3] ?? 0} | ${area.histogram[4] ?? 0} | ${area.histogram[5] ?? 0} |`).join("\n")}

Samtlige 50 000 oppgavetegn i hovedmaterialet: 0 = ${main.scores["0"]}, 1 = ${main.scores["1"]}, 2 = ${main.scores["2"]}, 9 = ${main.scores["9"]}. Fullstendige fordelinger, inkludert hver modellpersentil, finnes i summary.json.

## Filer og automatiske kontroller

${Array.from({ length: 4 }, (_, index) => `- ${folder(index)}/: 250 filer uten filendelse.`).join("\n")}

Filene er ordinære NUBUMotor_100, Windows-1252 uten BOM med CRLF, produsert med uendret serializer og lest tilbake med ordinær parser. Kjønn er de faktiske boolske kombinasjonene. Beregningen lykkes for alle 1 000 med ordinær modell. Alle har 50 tegn fra 0/1/2/9, 2–5 gyldige skårer per område og 10–25 totalt. Ingen oppgave velges to ganger innen et område.

Den nye adapteren gir byte-identisk pilotmateriale med pilotinnstillingene, men skriver aldri til piloten. Hovedmaterialet er generert to ganger og sammenlignet inklusive alle felter og filbytes. De 1 000 nye ID-ene er unike, og ingen registreringsfil har samme bytes som en pilotfil eller en annen hovedfil. Personstrømmenes starttilstander overlapper ikke med pilotens.

generation.tsv inneholder ID, mappe, a, b, t, registrert og statistisk alder, aldersforventet Rasch, estimat, latent og estimert differanse, persentil, skårer, standardfeil, ekstremflagg, antall og utvalgsrekkefølge. Dette er simuleringsinformasjon, ikke en programdataeksport. SHA256SUMS.txt beskytter de 1 000 registreringene. pilot-preservation.json dokumenterer kontrollsummene til de uendrede pilotfilene og sammenligningsverktøyet.

## Neste steg: manuelle eksporter

Se README.md for de åtte planlagte eksportnavnene og de fire sammenligningskommandoene. Eksporter én registreringsmappe om gangen med begge programmene. Lagre eksportene i exports/, utenfor registreringsmappene. Ikke legg rapporter eller andre filer blant de 250 registreringene.

Sammenligningen gjennomføres først når ekte manuelle eksporter finnes. Uendret compare.cjs brukes med de godkjente reglene: 13 felles kolonner, egen sammensetningskontroll for merknader, fem individuelt ikke-sammenlignbare webbkolonner mot 14-kolonners Windows-format; toleranse 0,0005 for LOGALDER, Rasch og standardfeil, ellers fastsatte eksakte regler. Ingen sammenligningsresultater for hovedmaterialet foreligger ennå.

## Planlagt separat klinisk tillegg – ikke generert

250 nye kliniske syntetiske tilfeller planlegges med samme algoritme, men t = a + b − 1. a skal trekkes fra et nedre Rasch-punkt tilsvarende noe under 3:6, opp til 0,000. Rasch 0 tilsvarer exp(1,968) år, omtrent ${f(Math.exp(1.968))} år. Formålet er lavere prestasjon relativt kronologisk alder og bedre dekning av lave modellpersentiler og ekstremverdier.

Eksakt nedre grense, et nytt frø og en egen ID-serie må fastsettes før dette tillegget gjennomføres. Den nåværende hovedgeneratoren har ingen klinisk forskyvning og brukes ikke til å generere disse 250 tilfellene i dette oppdraget.

**Bevares:** pilotmaterialet, produksjonskode, pilotparametere og sammenligningsregler. **Forbedres:** en separat, parameterstyrt adapter og dokumentasjon for hovedmaterialet. **Verifiseres:** generering, filformat, lokale beregninger og reproduksjon. **Diskuteres senere:** nøyaktige grenser for det kliniske tillegget og de kommende manuelle eksportresultatene.
`;
}

function instructions(): string {
  const commands = Array.from({ length: 4 }, (_, index) => {
    const batch = folder(index);
    return `node simulation/compare.cjs "simulation/main/exports/${batch}_windows.dat" "simulation/main/exports/${batch}_webb.txt" --out "simulation/main/comparisons/${batch}"`;
  }).join("\n");
  return `# Huvudsimulering – körning och nästa steg

Kör från projektroten för att återskapa och kontrollera de 1 000 filerna:

\`\`\`powershell
node simulation/main-run.cjs
node --test tests/mainSimulation.test.cjs
\`\`\`

Frö 20261114, S0201–S1200, sigma_b 0,85, c −0,02 och k 0,005. t = a + b utan förskjutning. Algoritmen och dragordningen är desamma som i piloten. Endast antal, frö och ID-serie skiljer. Pilotgeneratorn och jämförelseverktyget läses utan att ändras. Alla beräkningar sker lokalt; inga paket installeras och inga nätverksanrop görs.

Befintliga identiska filer accepteras. Befintliga avvikande filer skrivs aldrig över. Hela pilotmaterialet och dess exporter/rapporter verifieras mot pilot-preservation.json före och efter körning. Se report.md för statistik och summary.json för exakta tal. generation.tsv är simuleringsinformation, inte en Windows- eller webbexport.

## Åtta manuella exporter

För varje rad: exportera endast den angivna mappens 250 registreringar, först med Windows-programmet och sedan med webbprogrammet. Spara i exports/ med nedanstående namn. Byt inte namn på registreringarna och placera inte exporterna i registreringsmapparna.

| Registreringsmapp | Windows-export | Webbexport |
|---|---|---|
${Array.from({ length: 4 }, (_, index) => { const batch = folder(index); return `| ${batch} | ${batch}_windows.dat | ${batch}_webb.txt |`; }).join("\n")}

exports/ skapas som tom mottagningsmapp. Inga exportfiler eller jämförelser skapas av generatorn. De planerade namnen är en namnkonvention för manuellt skapade filer.

## Jämförelse först efter manuell export

När samtliga åtta filer faktiskt finns kan följande fyra kommandon användas:

\`\`\`powershell
${commands}
\`\`\`

Kommandona ovan är instruktioner och har inte körts för huvudmaterialet. De använder det godkända jämförelseverktyget och dess oförändrade regler. Se ../COMPARISON.md för kodning, 14/18-kolumnsmappning, toleranser och exitkoder. Verktyget accepterar 250 fall per par utan ändring.

## Kontroller

\`\`\`powershell
node --test tests/*.test.cjs
npx --no-install tsc --noEmit --incremental false
npm run lint
npx --no-install eslint simulation/main-simulate.ts simulation/main-run.cjs tests/mainSimulation.test.cjs
\`\`\`

Separat klinisk komplettering med 250 fall är endast planerad i report.md. Den är inte genererad och kräver beslut om exakta gränser före körning. Ingen commit eller push ingår.
`;
}

/** Validate the complete main study in memory, then write only its own output tree. */
export function deliverMain(simulationRoot: string): void {
  const targetRoot = path.join(simulationRoot, "main");
  const preservationPath = path.join(targetRoot, "pilot-preservation.json");
  const preservation: Preservation = fs.existsSync(preservationPath)
    ? JSON.parse(fs.readFileSync(preservationPath, "utf8")) : capturePilot(simulationRoot);
  verifyPreservation(simulationRoot, preservation);
  verifyPilotParity();
  const rows = generate();
  assert.deepEqual(generate(), rows);
  const pilot = generate(PILOT);
  const pilotHashes = new Set(pilot.map(row => hash(row.bytes)));
  assert.equal(new Set(rows.map(row => row.id)).size, MAIN.count);
  assert.equal(new Set(rows.map(row => hash(row.bytes))).size, MAIN.count);
  const pilotStates = new Set(Array.from({ length: PILOT.count }, (_, i) => (PILOT.seed + Math.imul(i + 1, 0x9e3779b9)) >>> 0));
  for (let index = 0; index < MAIN.count; index++) {
    const row = rows[index];
    assert.ok(!pilotHashes.has(hash(row.bytes)));
    assert.ok(!pilotStates.has((MAIN.seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0));
    assert.ok(row.counts.every(count => count >= 2 && count <= 5));
    assert.ok(/^[0129]{50}$/.test(row.record.items.join("")));
    assert.equal(row.t, row.a + row.b);
    for (const order of row.orders) assert.equal(new Set(order).size, order.length);
  }
  const files = new Map<string, Uint8Array | string>();
  const checksumRows: string[] = [];
  rows.forEach((row, index) => {
    const relative = `${folder(Math.floor(index / MAIN.groupSize))}/${row.id}`;
    files.set(relative, row.bytes);
    checksumRows.push(`${hash(row.bytes)}  ${relative}`);
  });
  const header = ["ID", "MAPPE", "a", "b", "t", "REGISTRERT ALDER", "BEREGNINGSALDER", "ALDERSFORVENTET RASCH", "OPPGAVESKÅRER", "RASCH-ESTIMAT", "LATENT DIFFERANSE", "ESTIMERT DIFFERANSE", "AVRUNDET DIFFERANSE", "MODELLPERSENTIL", "STANDARDFEIL", "MINESTIMERT", "MAKSESTIMERT", "ANTALL A", "ANTALL B", "ANTALL C", "ANTALL D", "ANTALL E", "REKKEFØLGE PER OMRÅDE"];
  files.set("generation.tsv", "\ufeff" + [header.join("\t"), ...rows.map((row, index) => [row.id, folder(Math.floor(index / MAIN.groupSize)), row.a, row.b, row.t, row.record.age, row.calculationAge, row.expected, row.record.items.join(""), row.estimate, row.latentDifference, row.difference, row.rounded, row.percentile, row.standardError, Number(row.minEstimated), Number(row.maxEstimated), ...row.counts, row.orders.map(order => order.map(i => i + 1).join(",")).join(";")].join("\t"))].join("\r\n") + "\r\n");
  files.set("SHA256SUMS.txt", checksumRows.join("\n") + "\n");
  files.set("summary.json", JSON.stringify({ settings: { ...MAIN, ...FINAL_PARAMETERS, lower, upper, shift: 0 }, main: describe(rows), pilot: describe(pilot) }, null, 2) + "\n");
  files.set("pilot-preservation.json", JSON.stringify(preservation, null, 2) + "\n");
  files.set("report.md", renderReport(rows, pilot));
  files.set("README.md", instructions());
  for (const [relative, content] of files) {
    const target = path.join(targetRoot, relative);
    if (fs.existsSync(target)) assert.deepEqual(fs.readFileSync(target), Buffer.from(content), `Existing main output differs: ${relative}`);
  }
  for (const [relative, content] of files) {
    const target = path.join(targetRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, content, { flag: "wx" });
  }
  fs.mkdirSync(path.join(targetRoot, "exports"), { recursive: true });
  verifyPreservation(simulationRoot, preservation);
  console.log("1 000 main registrations generated and verified; no exports or program comparisons created.");
}
