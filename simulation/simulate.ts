/** Standalone synthetic experiment; production calculations and file bytes are reused unchanged. */
import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Skaring } from "../src/api/skaring";
import { resolveCalculationAge } from "../src/domain/dateAge";
import { parseNubu100, serializeNubu100, Nubu100Record } from "../src/file/nubu100";

const SEED = 20261113;
const COUNT = 200;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
const model = new Skaring();
const lower = model.ageToMeasure(3.5, 1.968, 0.254) - 0.1;
const upper = model.ageToMeasure(18, 1.968, 0.254) + 0.1;

/** Mulberry32: unsigned 32-bit state, period 2^32; output is in [0, 1). */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Separate person streams and preallocated draws keep trials paired across sigma values. */
function draws(person: number) { return random((SEED + Math.imul(person + 1, 0x9e3779b9)) >>> 0); }

export interface Row {
  id: string; a: number; b: number; t: number; record: Nubu100Record;
  estimate: number; difference: number; rounded: number; percentile: number;
  counts: number[]; orders: number[][]; bytes: Uint8Array;
}

/** Closed directions are never reopened except to satisfy the two-item minimum. */
export function selectArea(difficulties: readonly number[], t: number, uniforms: readonly number[], ties: readonly number[]): { scores: string[]; order: number[] } {
  const ranked = difficulties.map((g, index) => ({ g, index })).sort((a, b) => a.g - b.g || a.index - b.index);
  let current = 0;
  for (let i = 1; i < 10; i++) if (Math.abs(ranked[i].g - t) < Math.abs(ranked[current].g - t)) current = i;
  const start = current;
  const scores = Array<string>(10).fill("9");
  const order: number[] = [];
  let closedLow = false;
  let closedHigh = false;
  let direction = 0;
  while (order.length < 5) {
    const item = ranked[current];
    assert.equal(scores[item.index], "9");
    const d = t - item.g;
    const weights = [1, Math.exp(d + 0.39), Math.exp(2 * d)];
    const u = uniforms[item.index] * weights.reduce((a, b) => a + b, 0);
    const score = u < weights[0] ? 0 : u < weights[0] + weights[1] ? 1 : 2;
    scores[item.index] = String(score);
    order.push(item.index);
    // The start belongs to both searches. Later stops apply to the arrival direction.
    if ((current === start || direction < 0) && score === 2) closedLow = true;
    if ((current === start || direction > 0) && score === 0) closedHigh = true;
    const remaining = ranked.map((_, rank) => rank).filter(rank => scores[ranked[rank].index] === "9");
    if (!remaining.some(rank => rank < current)) closedLow = true;
    if (!remaining.some(rank => rank > current)) closedHigh = true;
    if (order.length === 5 || (order.length >= 2 && closedLow && closedHigh)) break;
    const allowed = remaining.filter(rank => order.length < 2 || (rank < current ? !closedLow : !closedHigh));
    if (allowed.length === 0) break;
    const preferred = score === 0 ? -1 : score === 2 ? 1 : 0;
    const inDirection = allowed.filter(rank => Math.sign(rank - current) === preferred);
    const candidates = preferred !== 0 && inDirection.length ? inDirection : allowed;
    const distance = Math.min(...candidates.map(rank => Math.abs(rank - current)));
    const nearest = candidates.filter(rank => Math.abs(rank - current) === distance);
    const next = nearest.length === 1 ? nearest[0] : nearest[ties[order.length - 1] < 0.5 ? 0 : nearest.length - 1];
    direction = Math.sign(next - current);
    current = next;
  }
  assert.ok(order.length >= 2 && order.length <= 5);
  return { scores, order };
}

export interface Shape {
  quadratic: number;
  cubic: number;
}

/** Selected after the owner's correction to negative reference skewness. */
export const FINAL_PARAMETERS = {
  sigma: 0.85,
  shape: { quadratic: -0.02, cubic: 0.005 },
} as const;

/** Orthogonal Hermite terms preserve zero population mean; the denominator gives unit variance. */
export function shapedNormal(z: number, shape: Shape): number {
  const { quadratic: c, cubic: k } = shape;
  return (z + c * (z * z - 1) + k * (z * z * z - 3 * z)) / Math.sqrt(1 + 2 * c * c + 6 * k * k);
}

export function simulate(sigma: number, shape: Shape = FINAL_PARAMETERS.shape): Row[] {
  assert.ok(Number.isFinite(sigma) && sigma >= 0);
  assert.ok(Number.isFinite(shape.quadratic) && Number.isFinite(shape.cubic));
  return Array.from({ length: COUNT }, (_, person) => {
    const rng = draws(person);
    const a = lower + (upper - lower) * rng();
    // Box-Muller uses open-interval logarithm input and consumes two draws per person.
    const z = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const b = sigma === 0 ? 0 : sigma * shapedNormal(z, shape);
    const t = a + b;
    const letters = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(rng() * 29)]).join("");
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
      const selected = selectArea(model.aItemDifficulties.slice(area * 10, area * 10 + 10), t, uniforms, ties);
      items.push(...selected.scores);
      counts.push(selected.order.length);
      orders.push(selected.order);
    }
    const record: Nubu100Record = { name, gender: genderDraw < 0.5 ? "gutt" : genderDraw < 0.98 ? "jente" : null,
      birthDate: "", testDate: "", age: model.yearDecToMonth(Math.exp(1.968 + 0.254 * a)), note, note2, items };
    const serialized = serializeNubu100(record);
    assert.ok(serialized.ok);
    const parsed = parseNubu100(serialized.bytes);
    assert.equal(parsed.kind, "known-format");
    if (parsed.kind !== "known-format") throw new Error("Round trip failed");
    assert.deepEqual(parsed.record, record);
    const engine = new Skaring();
    assert.equal(engine.calculateRegistration(parsed.record), -10000);
    const age = resolveCalculationAge(record);
    assert.ok(age);
    assert.equal(engine.gAlder, age.years);
    const difference = engine.gMeasure - engine.ageToMeasure(age.years, 1.968, 0.254);
    const percentile = engine.modelPercentile();
    assert.equal(percentile.kind, "available");
    if (percentile.kind !== "available") throw new Error("Missing percentile");
    return { id: `S${String(person + 1).padStart(4, "0")}`, a, b, t, record, estimate: engine.gMeasure,
      difference, rounded: Math.round(difference * 20) / 20, percentile: percentile.value, counts, orders, bytes: serialized.bytes };
  });
}

function sd(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

/** Descriptive central-moment coefficients: normal kurtosis is 3, not excess kurtosis 0. */
export function moments(values: readonly number[]): { mean: number; sd: number; skewness: number; kurtosis: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const central = (power: number) => values.reduce((sum, value) => sum + (value - mean) ** power, 0) / n;
  const variance = central(2);
  return { mean, sd: Math.sqrt(variance * n / (n - 1)), skewness: central(3) / variance ** 1.5, kurtosis: central(4) / variance ** 2 };
}

/** Write only the selected trial; existing differing output is rejected rather than overwritten. */
export function deliver(directory: string, sigma: number): void {
  assert.ok(Number.isFinite(sigma) && sigma >= 0);
  const rows = simulate(sigma);
  assert.deepEqual(simulate(sigma), rows);
  const files = new Map<string, Uint8Array | string>();
  for (const row of rows) files.set(`registreringer/${row.id}`, row.bytes);
  const header = ["FILNAVN", "a", "b", "t", "ALDER", "OPPGAVESKÅRER", "RASCHSKÅR", "DIFFERANSE", "AVRUNDET DIFFERANSE", "MODELLPERSENTIL", "ANTALL A", "ANTALL B", "ANTALL C", "ANTALL D", "ANTALL E", "REKKEFØLGE PER OMRÅDE"];
  files.set("simuleringsinformasjon.tsv", "\ufeff" + [header.join("\t"), ...rows.map(r => [r.id, r.a, r.b, r.t, r.record.age, r.record.items.join(""), r.estimate, r.difference, r.rounded, r.percentile, ...r.counts, r.orders.map(order => order.map(i => i + 1).join(",")).join(";")].join("\t"))].join("\r\n") + "\r\n");
  const pct = (predicate: (r: Row) => boolean) => `${rows.filter(predicate).length} (${rows.filter(predicate).length / 2} %)`;
  const totals = rows.map(r => r.counts.reduce((a, b) => a + b, 0));
  const summary = moments(rows.map(r => r.difference));
  const roundedSummary = moments(rows.map(r => r.rounded));
  const bSummary = moments(rows.map(r => r.b));
  const cdf = model.gModelPercentiles.map(([boundary, percent]) => `| ${boundary} | ${percent} | ${rows.filter(r => r.rounded <= boundary).length / 2} |`).join("\n");
  const hashes = rows.map(r => `${createHash("sha256").update(r.bytes).digest("hex")}  registreringer/${r.id}`).join("\n");
  files.set("SHA256SUMS.txt", hashes + "\n");
  files.set("rapport.md", `# Simuleringsrapport – etappe 9A

200 syntetiske registreringer, frø ${SEED}. Valgt sigma_b: **${sigma}**. Ingen sammenligning mellom programmene er utført.

## Generering

Mulberry32 og Box–Muller; separate deterministiske personstrømmer og faste trekk per oppgave gir samme grunnleggende tilfeldige tall i alle forsøk. a er uniform mellom ${lower} og ${upper}: aldersmodellens verdier ved 3,5 og 18 år, utvidet 0,10 på hver side. Invers alder er exp(1,968 + 0,254a), trunkert med programmets yearDecToMonth. Registrert alder behandles deretter som manuell med halvmånedstillegg, uten datoer. Ingen avkorting til rapportens aldersgrenser.

Etter prosjektets eiers nye opplysninger om referansegruppens momenter ble normalfordelt b utvidet til en svakt venstreskjev fordeling med noe tyngre haler. For Z fra standard normalfordeling brukes:

b = sigma_b × [Z + c(Z² − 1) + k(Z³ − 3Z)] / sqrt(1 + 2c² + 6k²)

c = ${FINAL_PARAMETERS.shape.quadratic}, k = ${FINAL_PARAMETERS.shape.cubic}. De ortogonale polynomleddene gir teoretisk E[b] = 0 og SD[b] = sigma_b. De 200 trukne b-verdiene har gjennomsnitt ${bSummary.mean} og utvalgsstandardavvik ${bSummary.sd}. Ingen sentrering eller standardisering av det realiserte utvalget gjøres.

Oppgavene sorteres etter vanskelighetsgrad og deretter oppgavenummer. Nærmeste startoppgave velges; ved lik avstand den første i sorteringen. Vektene er 1, exp(t−g+0,39), exp(2(t−g)). Stopp følger ankomstretting; startoppgaven tilhører begge retninger. Skår 1 bruker rangavstand fra sist skårede oppgave. Avsluttede retninger utelukkes, med unntak for minimum to oppgaver. Maksimum er fem. Navn og merknader bruker uavhengige store bokstaver fra det norske alfabetet. Kjønn trekkes med sannsynlighetene 50/48/2 prosent.

Forsøkene startet med sigma_b = 0. Etter undersøkelse av spredning og enkle formjusteringer i minnet ble denne varianten valgt som en praktisk avveining mellom referansemomentene, midtgruppen og de øvre persentilene. Det er ingen presis statistisk tilpasning, og ingen barn byttes ut eller håndplukkes. Bare den endelige registreringsgruppen leveres.

## Resultat

Antall skårede oppgaver per barn: ${Math.min(...totals)}–${Math.max(...totals)}, gjennomsnitt ${totals.reduce((a,b)=>a+b,0)/COUNT}. Alle områder har 2–5. Differansenes utvalgsstandardavvik (n−1), før avrunding: ${sd(rows.map(r=>r.difference))}; etter avrunding: ${sd(rows.map(r=>r.rounded))}.

Referansemomentene nedenfor er oppgitt av prosjektets eier fra manualen. Den oppgitte skevheten er korrigert til −0,28. Manualens nøyaktige estimatorer for skevhet og kurtose er ikke kontrollert; sammenligningen er derfor veiledende. Her brukes sentrale momenter m_j = sum((x − gjennomsnitt)^j)/n, skevhet m_3/m_2^(3/2), kurtose m_4/m_2² (normalfordeling = 3), og SD med n−1 i nevneren.

| Mål | Referansegruppen | Simulert, uavrundet | Simulert, avrundet 0,05 |
|---|---:|---:|---:|
| Gjennomsnitt | 0,003 | ${summary.mean} | ${roundedSummary.mean} |
| Standardavvik | 0,78 | ${summary.sd} | ${roundedSummary.sd} |
| Skevhet | −0,28 | ${summary.skewness} | ${roundedSummary.skewness} |
| Kurtose | 3,60 | ${summary.kurtosis} | ${roundedSummary.kurtosis} |

Avrundede differanser: ${Math.min(...rows.map(r=>r.rounded))} til ${Math.max(...rows.map(r=>r.rounded))}.

- Modellpersentil 0: ${pct(r=>r.percentile===0)}
- Modellpersentil 30–70: ${pct(r=>r.percentile>=30 && r.percentile<=70)}
- Modellpersentil 100: ${pct(r=>r.percentile===100)}
- Differanse over 1,70: ${pct(r=>r.rounded>1.7)}; referanse ca. 2 %.
- Differanse under −1,35: ${pct(r=>r.rounded< -1.35)}; referanse ca. 1 %.
- Differanse til og med −1,35: ${pct(r=>r.rounded<= -1.35)}; referanse ca. 2 %.
- −0,35 til 0,20, begge inkludert: ${pct(r=>r.rounded>= -.35 && r.rounded<=.2)}; referanse ca. 35 %.

Referanseprosentene er avrundede tall fra 272 barn. Den valgte fordelingen har negativ skevhet og tyngre haler, men gjennomsnitt og standardavvik ligger høyere enn i referansegruppen. Ingen registrering får modellpersentil 0 i denne leveransen; den nedre yttergrensen under −4,20 dekkes ikke. Hele referansefordelingen gjenskapes derfor ikke. Utvalget er et syntetisk verifiseringsmateriale, ikke en representativ klinisk populasjon.

## Kontroller

Alle 200 filer er serialisert og lest tilbake med ordinær serializer/parser; feltene er identiske. Beregningen lykkes for alle med registrert alder. Gjentatt simulering er identisk inklusive filbytes. Windows-1252, CRLF og NUBUMotor_100 følger ordinær serializer. Separate tester kontrollerer oppgavegrenser, unike valg, aldersregler og bytes. SHA256SUMS.txt identifiserer filene. Faktisk åpning i Windows-programmet og senere dataeksport gjenstår.

## Kumulativ fordeling

Avrunding: Math.round(differanse × 20) / 20, som programmet.

| Grense (≤) | Tabell 12.3 (%) | Simulert (%) |
|---|---:|---:|
${cdf}
`);
  for (const [relative, content] of files) {
    const target = path.join(directory, relative);
    if (fs.existsSync(target)) assert.deepEqual(fs.readFileSync(target), Buffer.from(content), `Existing output differs: ${target}`);
  }
  for (const [relative, content] of files) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, content);
  }
  console.log(`200 registrations verified; sigma_b=${sigma}. See simulation/rapport.md.`);
}
