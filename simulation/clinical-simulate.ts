/** Clinical stress material only; program-export comparisons remain a separate, manual-input stage. */
import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FINAL_PARAMETERS, moments, random, selectArea, shapedNormal } from "./simulate";
import { MAIN, describe, generate as generateMain } from "./main-simulate";
import type { MainRow } from "./main-simulate";
import { Skaring } from "../src/api/skaring";
import { resolveCalculationAge } from "../src/domain/dateAge";
import { parseNubu100, serializeNubu100 } from "../src/file/nubu100";

const model = new Skaring();
const lower = model.ageToMeasure(3.5, 1.968, 0.254) - 0.1;
export const CLINICAL = { seed: 20261115, count: 250, firstId: 1201, lower, upper: 0, shift: -1 } as const;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
type Settings = { seed: number; count: number; firstId: number; lower: number; upper: number; shift: number };
type Preservation = { file: string; sha256: string }[];
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

/** Preserve the approved draw order and shared algorithms; only the requested settings differ. */
export function generateClinical(settings: Settings = CLINICAL): MainRow[] {
  assert.ok(Number.isInteger(settings.seed) && settings.seed >= 0 && settings.seed <= 0xffffffff);
  assert.ok(Number.isInteger(settings.count) && settings.count > 0);
  assert.ok(Number.isInteger(settings.firstId) && settings.firstId > 0);
  assert.ok(Number.isFinite(settings.lower) && Number.isFinite(settings.upper) && settings.lower < settings.upper);
  assert.ok(Number.isFinite(settings.shift));
  return Array.from({ length: settings.count }, (_, person) => {
    const rng = random((settings.seed + Math.imul(person + 1, 0x9e3779b9)) >>> 0);
    const a = settings.lower + (settings.upper - settings.lower) * rng();
    const z = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const b = FINAL_PARAMETERS.sigma * shapedNormal(z, FINAL_PARAMETERS.shape);
    const t = a + b + settings.shift;
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
    if (parsed.kind !== "known-format") throw new Error("Clinical registration did not round-trip");
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
    if (percentile.kind !== "available") throw new Error("Clinical percentile unavailable");
    return {
      id: `S${String(settings.firstId + person).padStart(4, "0")}`, a, b, t, record,
      estimate: engine.gMeasure, difference, rounded: Math.round(difference * 20) / 20,
      percentile: percentile.value, counts, orders, bytes: serialized.bytes,
      calculationAge: age.years, expected, latentDifference: t - expected,
      standardError: engine.gSE, minEstimated: engine.gIsMinEstimated, maxEstimated: engine.gIsMaxEstimated,
    };
  });
}

/** Full-field parity against the approved 1 000-case generator guards the adapter's duplicated wiring. */
export function verifyClinicalParity(): void {
  assert.deepEqual(generateClinical({ ...MAIN, lower, upper: model.ageToMeasure(18, 1.968, 0.254) + 0.1, shift: 0 }), generateMain());
}

function stats(values: number[]) {
  return { n: values.length, min: Math.min(...values), max: Math.max(...values), ...moments(values) };
}

/** These absolute thresholds are descriptive Rasch cutoffs, not clinical diagnostic criteria. */
export function clinicalSummary(rows: MainRow[]) {
  const count = (test: (row: MainRow) => boolean) => {
    const n = rows.filter(test).length;
    return { count: n, percent: n / rows.length * 100 };
  };
  return {
    ...describe(rows),
    tMinusA: stats(rows.map(row => row.t - row.a)),
    negativeLatentDifference: count(row => row.t - row.a < 0),
    preliminaryNegativeEstimatedDifference: count(row => row.difference < 0),
    preliminaryLowPercentiles: {
      zero: count(row => row.percentile === 0),
      oneToTwo: count(row => row.percentile >= 1 && row.percentile <= 2),
      threeToFive: count(row => row.percentile >= 3 && row.percentile <= 5),
      sixToFifteen: count(row => row.percentile >= 6 && row.percentile <= 15),
      aboveFifteen: count(row => row.percentile > 15),
      atMostTwo: count(row => row.percentile <= 2),
      atMostFive: count(row => row.percentile <= 5),
      atMostFifteen: count(row => row.percentile <= 15),
    },
    preliminaryLowRasch: [model.ageToMeasure(3.5, 1.968, 0.254), -4.2, -5].map(threshold => ({ threshold, ...count(row => row.estimate < threshold) })),
    preliminaryExtremeIds: {
      min: rows.filter(row => row.minEstimated).map(row => row.id),
      max: rows.filter(row => row.maxEstimated).map(row => row.id),
    },
  };
}

/** Protect every existing simulation file, including manually produced main exports, without parsing them. */
function capturePrevious(simulationRoot: string): Preservation {
  const entries: Preservation = [];
  const visit = (relative: string) => {
    const absolute = path.join(simulationRoot, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(`${relative}/${name}`);
    } else entries.push({ file: relative, sha256: hash(fs.readFileSync(absolute)) });
  };
  for (const name of fs.readdirSync(simulationRoot).sort()) {
    if (!["clinical", "clinical-simulate.ts", "clinical-run.cjs"].includes(name)) visit(name);
  }
  return entries;
}

export function verifyPrevious(simulationRoot: string, entries: Preservation): void {
  for (const entry of entries) assert.equal(hash(fs.readFileSync(path.join(simulationRoot, entry.file))), entry.sha256, `Previous file changed: ${entry.file}`);
}

function report(rows: MainRow[], ordinary: MainRow[]): string {
  const current = clinicalSummary(rows);
  const reference = clinicalSummary(ordinary);
  const f = (value: number) => value.toFixed(3).replace(".", ",");
  const row = (label: string, stat: ReturnType<typeof stats>) => `| ${label} | ${f(stat.mean)} | ${f(stat.sd)} | ${f(stat.min)} | ${f(stat.max)} |`;
  const pct = (value: { count: number; percent: number }) => `${value.count} (${f(value.percent)} %)`;
  return `# Klinisk kompletteringssimulering – 250 tilfeller

## Status og avgrensning

250 nye syntetiske registreringer, S1201–S1450, er generert med frø ${CLINICAL.seed}. Dette er et stressmateriale for lave aldersrelaterte resultater, ikke en representativ klinisk populasjon.

**Alle Rasch-estimater, differanser fra estimatet, modellpersentiler, standardfeil og ekstremflagg nedenfor er foreløpige simuleringsresultater**, beregnet lokalt med eksisterende modell. De er ikke en Windows- eller webbdataeksport og dokumenterer ikke overensstemmelse mellom programmene. Ingen programsammenligning av hoved- eller klinisk materiale er gjennomført her.

## Eksakte grenser og metode

Programmets aldersmodell er R(y) = −1,968/0,254 + ln(y)/0,254. Ved 3,5 år gir den ${model.ageToMeasure(3.5, 1.968, 0.254)}. Som i pilot og hovedsimulering trekkes nedre grense 0,10 Rasch-enheter ned:

- Nedre a-grense: **${CLINICAL.lower}**.
- Øvre a-grense: **${CLINICAL.upper.toFixed(3)}**.
- Inversen y = exp(1,968 + 0,254a) gir **${Math.exp(1.968 + 0.254 * lower)}** til **${Math.exp(1.968)}** år, før visningstrunkering.

a trekkes uniformt fra [nedre, øvre), med samme generatorprinsipp som tidligere. Visningsalderen er basert på a, ikke på t. Invers alder trunkeres med eksisterende yearDecToMonth til Å:M. Registrert manuell alder får deretter halvmånedstillegget 1/24 år når aldersforventet Rasch beregnes. De mulige visningsaldrene er 3:4–7:1. Fødselsdato og testdato er tomme. Det lille skillet mellom a og Rasch-verdien av den registrerte alderen beholdes.

b har nøyaktig hovedsimuleringens fordeling: sigma_b = 0,85, c = −0,02, k = 0,005; b = 0,85 × [Z − 0,02(Z²−1) + 0,005(Z³−3Z)] / sqrt(1 + 2×0,02² + 6×0,005²), der Z genereres med Box–Muller fra Mulberry32. Teoretisk E[b] = 0 og SD[b] = 0,85. t = a + b − 1. Ingen ekstra sentrering, tilpasning av frø, utskifting av barn eller endring for å fremtvinge persentiler er gjort.

Oppgaveparametere, de tre vektene 1, exp(t−g+0,39) og exp(2(t−g)), adaptivt utvalg, avsluttede retninger, rangbaserte valg og 2–5-oppgaveregler gjenbrukes uendret. Kjønn trekkes med sannsynlighetene 50/48/2 prosent; navn og merknader bruker samme norske bokstavregler. Personstrømmene starter på (frø + imul(personnummer, 0x9e3779b9)) >>> 0. ID er uavhengig av trekkerekkefølgen.

## Klinisk materiale – beskrivende statistikk

SD er utvalgsstandardavvik med n−1. Skjevhet og kurtose bruker sentrale momenter med n i nevneren; normal kurtose er 3.

| Variabel | Gjennomsnitt | SD | Minimum | Maksimum |
|---|---:|---:|---:|---:|
${row("a", current.a)}
${row("b", current.b)}
${row("t", current.t)}
${row("t − a", current.tMinusA)}
${row("t − forventet Rasch fra registrert alder", current.latentDifference)}
${row("Foreløpig Rasch-estimat", current.rasch)}
${row("Foreløpig estimert differanse", current.estimatedDifference)}
${row("Foreløpig differanse avrundet til 0,05", current.roundedDifference)}

t − a er negativ for ${pct(current.negativeLatentDifference)}. Foreløpig estimert differanse er negativ for ${pct(current.preliminaryNegativeEstimatedDifference)}. Disse to differansene må ikke forveksles med hverandre eller med t minus forventet verdi fra registrert Å:M.

Kjønn: ${pct(current.gender.gutt)} gutt, ${pct(current.gender.jente)} jente, ${pct(current.gender.undefined)} udefinert. Registrert alder i måneder: ${f(current.ageMonths.min)}–${f(current.ageMonths.max)}, gjennomsnitt ${f(current.ageMonths.mean)}. Antall gyldige oppgaver per barn: ${current.taskTotals.min}–${current.taskTotals.max}, gjennomsnitt ${f(current.taskTotals.mean)}. Hvert område har 2–5.

| Hele år i registrert alder | Antall |
|---|---:|
${Object.entries(current.ageYears).map(([year, count]) => `| ${year} | ${count} |`).join("\n")}

| Område | 2 oppgaver | 3 oppgaver | 4 oppgaver | 5 oppgaver |
|---|---:|---:|---:|---:|
${current.areaCounts.map(area => `| ${area.area} | ${area.histogram[2] ?? 0} | ${area.histogram[3] ?? 0} | ${area.histogram[4] ?? 0} | ${area.histogram[5] ?? 0} |`).join("\n")}

Av totalt 12 500 oppgavetegn er 0 = ${current.scores["0"]}, 1 = ${current.scores["1"]}, 2 = ${current.scores["2"]}, 9 = ${current.scores["9"]}. Detaljert oppgaveantallshistogram finnes i summary.json.

## Foreløpige lave persentiler og ekstreme resultater

| Modellpersentil (foreløpig) | Kliniske 250 | Ordinære 1 000, separat referanse |
|---|---:|---:|
| 0 | ${pct(current.preliminaryLowPercentiles.zero)} | ${pct(reference.preliminaryLowPercentiles.zero)} |
| 1–2 | ${pct(current.preliminaryLowPercentiles.oneToTwo)} | ${pct(reference.preliminaryLowPercentiles.oneToTwo)} |
| 3–5 | ${pct(current.preliminaryLowPercentiles.threeToFive)} | ${pct(reference.preliminaryLowPercentiles.threeToFive)} |
| 6–15 | ${pct(current.preliminaryLowPercentiles.sixToFifteen)} | ${pct(reference.preliminaryLowPercentiles.sixToFifteen)} |
| >15 | ${pct(current.preliminaryLowPercentiles.aboveFifteen)} | ${pct(reference.preliminaryLowPercentiles.aboveFifteen)} |

Kumulative lave andeler i klinisk materiale: ≤2 = ${pct(current.preliminaryLowPercentiles.atMostTwo)}, ≤5 = ${pct(current.preliminaryLowPercentiles.atMostFive)}, ≤15 = ${pct(current.preliminaryLowPercentiles.atMostFifteen)}. Hele persentilhistogrammet, også 100, finnes i summary.json.

Foreløpige ekstremflagg: **minestimert ${current.extremes.min}, maksestimert ${current.extremes.max}**. Minestimert-ID: ${current.preliminaryExtremeIds.min.join(", ") || "ingen"}. Maksestimert-ID: ${current.preliminaryExtremeIds.max.join(", ") || "ingen"}. Flaggene beholdes som modellresultater; de er ikke bare terskler for lave/høye Rasch-verdier.

«Særlig lave Rasch-verdier» beskrives med tre eksplisitte, absolutte rapportgrenser. De er ikke diagnostiske kriterier. −4,20 her gjelder selve Rasch-estimatet, ikke differansegrensen i Tabell 12.3.

| Foreløpig Rasch-estimat strengt under | Klinisk antall | Ordinært antall |
|---|---:|---:|
${current.preliminaryLowRasch.map((entry, index) => `| ${entry.threshold} | ${entry.count} | ${reference.preliminaryLowRasch[index].count} |`).join("\n")}

### Gruppene holdes atskilt

| Foreløpig beregnet mål | Kliniske 250 | Ordinære 1 000 |
|---|---:|---:|
| Estimert differanse, gjennomsnitt | ${f(current.estimatedDifference.mean)} | ${f(reference.estimatedDifference.mean)} |
| Estimert differanse, SD | ${f(current.estimatedDifference.sd)} | ${f(reference.estimatedDifference.sd)} |
| Min-/maksflagg | ${current.extremes.min}/${current.extremes.max} | ${reference.extremes.min}/${reference.extremes.max} |

Forskjellene beskriver modellen og de to separate utvalgene. De dokumenterer ikke programavvik eller en representativ klinisk fordeling. Ingen samlet 1 250-falls programstatistikk foreligger ennå.

## Filer, kontroll og neste steg

registreringer/ inneholder nøyaktig 250 filer uten filendelse. Ordinær serializer gir NUBUMotor_100, Windows-1252 uten BOM og CRLF. Alle er lest tilbake med ordinær parser og kan beregnes med ordinær modell. Alle har 50 tegn i 0/1/2/9, 2–5 gyldige skårer per område og 10–25 totalt. Utvalgsrekkefølgen har ingen gjentatte oppgaver.

Adapteren gir eksakt samme 1 000 tilfeller som hovedgeneratoren når hovedinnstillingene brukes. Kliniske tilfeller er generert to ganger og sammenlignet inklusive filbytes. ID, bytes og starttilstander er skilt fra tidligere tilfeller. SHA256SUMS.txt beskytter de nye registreringene. previous-preservation.json beskytter alle tidligere simuleringsfiler, inkludert de åtte manuelt produserte hovedeksportene, uten å sammenligne dem.

generation.tsv og summary.json merker beregnede resultater som foreløpige. De er simuleringsinformasjon, ikke erstatninger for ekte programdataeksporter. README.md beskriver de to manuelle eksportene og den planlagte A/B/C-rapporten etter fem ekte eksportpar og brukerens godkjenning.

**Bevares:** alle tidligere filer, produksjonskode og sammenligningsregler. **Verifiseres:** generering og reproduksjon. **Forbedres:** separat dekning av lavere latent funksjonsnivå. **Diskuteres ved neste etappe:** den faktiske programoverensstemmelsen, etter manuell eksport og godkjenning.
`;
}

function instructions(): string {
  return `# Klinisk komplettering – körning och manuella exporter

Återskapa och kontrollera materialet från projektroten:

\`\`\`powershell
node simulation/clinical-run.cjs
node --test tests/clinicalSimulation.test.cjs
\`\`\`

Frö 20261115, 250 fall S1201–S1450. Parametrar för b är oförändrade. a är uniformt mellan −2,9158938248213855 och 0 (övre gränsen exkluderas), t = a + b − 1. Ingen fördelningsanpassning görs. Se report.md för exakt åldersmodell, statistik och begränsningar.

Registreringarna finns i registreringer/. generation.tsv är informationstabellen och summary.json innehåller fullständig statistik med grupperna åtskilda. Alla beräknade modellpercentiler, Rasch-estimat och extremflaggor är **preliminära simuleringsresultat**. De ersätter inte programmens faktiska exporter.

Inga befintliga avvikande filer skrivs över. Kontrollsummor för tidigare material kontrolleras före och efter leverans med previous-preservation.json. Vid upprepad körning jämförs alla nya leveransfiler byte för byte. De befintliga källfilerna läses utan ändringar. All behandling sker lokalt utan nätverksanrop eller nya paket.

## Två manuella exporter

1. Exportera endast de 250 registreringarna i simulation/clinical/registreringer med Windows-programmet. Spara som **simulation/clinical/exports/clinical_windows.dat**.
2. Exportera samma mapp med webbprogrammet. Spara som **simulation/clinical/exports/clinical_webb.txt**.

exports/ är en tom mottagningsmapp vid leverans. Inga exporter har skapats av generatorn. Lägg inte exporterna bland registreringarna. Filnamnen ovan är planerade namn; det är innehållet och dess ID som senare kontrolleras.

## Nästa etapp – först efter båda exporter och användarens godkännande

De åtta manuella huvudexporterna finns redan i simulation/main/exports och har endast kontrollsummerats för bevarande här:

| Grupp | Windows | Webb |
|---|---|---|
| S0201–S0450 | 261113 Win 01.dat | 261113 Web 01.dat |
| S0451–S0700 | 261113 Win 02.dat | 261113 Web 02.dat |
| S0701–S0950 | 261113 Win 03.dat | 261113 Web 03.dat |
| S0951–S1200 | 261113 Win 04.dat | 261113 Web 04.dat |
| S1201–S1450 | clinical/exports/clinical_windows.dat | clinical/exports/clinical_webb.txt |

Inga huvudexporter har namnändrats. Gruppkopplingen ovan är planerad utifrån filnamn och ska verifieras mot faktiska ID vid jämförelsen. Kör inte jämförelsen innan alla tio exporter finns och användaren har godkänt nästa steg.

Planerad slutrapport:

- **A – ordinarie 1 000:** faktiska exportfördelningar, percentiler, extremflaggor och överensstämmelse.
- **B – kliniska 250:** samma uppgifter, med särskilt fokus på låga percentiler och negativa differenser.
- **C – samtliga 1 250:** summerad programöverensstämmelse; inga blandade gruppfördelningar ska ersätta A och B.

Varje exportpar läses med det redan godkända compare.cjs och reglerna i ../COMPARISON.md. Oförändrad tolerans 0,0005 för LOGALDER/Rasch/standardfel, exakta övriga regler, 14/18-kolumnsmappning och separat sammansättningskontroll av anmärkningar. Varje avvikelse ska märkas med ID och grupp i den gemensamma redovisningen. Kontrollera exakt 250 ID per par och totalt S0201–S1450 utan överlapp eller luckor innan sammanställning. Pilotens 200 fall ingår inte i den nya totalsumman.

## Automatiska kontroller

\`\`\`powershell
node --test tests/*.test.cjs
npx --no-install tsc --noEmit --incremental false
npm run lint
npx --no-install eslint simulation/clinical-simulate.ts simulation/clinical-run.cjs tests/clinicalSimulation.test.cjs
\`\`\`

Ingen produktionskod, tidigare simulering eller jämförelseregel ändras. Ingen commit eller push ingår. Manuell öppning/export i programmen och deras jämförelse återstår.
`;
}

/** Write only the clinical tree after complete in-memory validation and preservation checks. */
export function deliverClinical(simulationRoot: string): void {
  const root = path.join(simulationRoot, "clinical");
  const preservedPath = path.join(root, "previous-preservation.json");
  const preserved: Preservation = fs.existsSync(preservedPath)
    ? JSON.parse(fs.readFileSync(preservedPath, "utf8")) : capturePrevious(simulationRoot);
  verifyPrevious(simulationRoot, preserved);
  verifyClinicalParity();
  const rows = generateClinical();
  assert.deepEqual(generateClinical(), rows);
  const ordinary = generateMain();
  const priorHashes = new Set(preserved.filter(entry => /(?:registreringer\/S\d{4}$|main\/\d{2}_S\d{4}-S\d{4}\/S\d{4}$)/.test(entry.file)).map(entry => entry.sha256));
  assert.equal(priorHashes.size, 1200);
  assert.equal(new Set(rows.map(row => row.id)).size, 250);
  assert.equal(new Set(rows.map(row => hash(row.bytes))).size, 250);
  const priorStates = new Set([
    ...Array.from({ length: 200 }, (_, i) => (20261113 + Math.imul(i + 1, 0x9e3779b9)) >>> 0),
    ...Array.from({ length: 1000 }, (_, i) => (20261114 + Math.imul(i + 1, 0x9e3779b9)) >>> 0),
  ]);
  rows.forEach((row, i) => {
    assert.ok(!priorHashes.has(hash(row.bytes)));
    assert.ok(!priorStates.has((CLINICAL.seed + Math.imul(i + 1, 0x9e3779b9)) >>> 0));
    assert.equal(row.t, row.a + row.b - 1);
    assert.ok(row.counts.every(count => count >= 2 && count <= 5));
    assert.ok(/^[0129]{50}$/.test(row.record.items.join("")));
    for (const order of row.orders) assert.equal(new Set(order).size, order.length);
  });
  const files = new Map<string, Uint8Array | string>();
  for (const row of rows) files.set(`registreringer/${row.id}`, row.bytes);
  const headers = ["ID", "GRUPPE", "a", "b", "t", "t_MINUS_a", "REGISTRERT ALDER", "BEREGNINGSALDER", "ALDERSFORVENTET RASCH", "OPPGAVESKÅRER", "FORELØPIG RASCH", "LATENT DIFF FRA REGISTRERT ALDER", "FORELØPIG ESTIMERT DIFF", "FORELØPIG AVRUNDING 0.05", "FORELØPIG MODELLPERSENTIL", "FORELØPIG STANDARDFEIL", "FORELØPIG MINFLAGG", "FORELØPIG MAKSFLAGG", "ANTALL A", "ANTALL B", "ANTALL C", "ANTALL D", "ANTALL E", "REKKEFØLGE PER OMRÅDE"];
  files.set("generation.tsv", "\ufeff" + [headers.join("\t"), ...rows.map(row => [row.id, "clinical", row.a, row.b, row.t, row.t - row.a, row.record.age, row.calculationAge, row.expected, row.record.items.join(""), row.estimate, row.latentDifference, row.difference, row.rounded, row.percentile, row.standardError, Number(row.minEstimated), Number(row.maxEstimated), ...row.counts, row.orders.map(order => order.map(i => i + 1).join(",")).join(";")].join("\t"))].join("\r\n") + "\r\n");
  files.set("SHA256SUMS.txt", rows.map(row => `${hash(row.bytes)}  registreringer/${row.id}`).join("\n") + "\n");
  files.set("summary.json", JSON.stringify({
    settings: { ...CLINICAL, ...FINAL_PARAMETERS, lowerAge: Math.exp(1.968 + 0.254 * lower), upperAge: Math.exp(1.968) },
    calculationStatus: "Preliminary simulation results only; no program-export comparison",
    clinical250: clinicalSummary(rows), ordinary1000: clinicalSummary(ordinary),
  }, null, 2) + "\n");
  files.set("report.md", report(rows, ordinary));
  files.set("README.md", instructions());
  files.set("previous-preservation.json", JSON.stringify(preserved, null, 2) + "\n");
  for (const [relative, content] of files) {
    const target = path.join(root, relative);
    if (fs.existsSync(target)) assert.deepEqual(fs.readFileSync(target), Buffer.from(content), `Existing clinical output differs: ${relative}`);
  }
  for (const [relative, content] of files) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, content, { flag: "wx" });
  }
  fs.mkdirSync(path.join(root, "exports"), { recursive: true });
  verifyPrevious(simulationRoot, preserved);
  console.log("250 clinical registrations verified; all derived results are preliminary. No exports compared.");
}
