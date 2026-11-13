const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { CLINICAL, generateClinical, verifyClinicalParity, verifyPrevious, deliverClinical } = require('../simulation/clinical-run.cjs');
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs');
const { Skaring } = loadTypeScript('api/skaring.ts');
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts');
const { resolveCalculationAge } = loadTypeScript('domain/dateAge.ts');
const simulationRoot = path.resolve(__dirname, '../simulation');
const root = path.join(simulationRoot, 'clinical');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('clinical adapter matches all approved main cases when using main settings', () => {
  verifyClinicalParity();
});

test('clinical settings use the approved age model and alter only t by minus one for paired draws', () => {
  const model = new Skaring();
  assert.equal(CLINICAL.seed, 20261115);
  assert.equal(CLINICAL.count, 250);
  assert.equal(CLINICAL.firstId, 1201);
  assert.equal(CLINICAL.lower, model.ageToMeasure(3.5, 1.968, 0.254) - 0.1);
  assert.equal(CLINICAL.upper, 0);
  const shifted = generateClinical();
  const unshifted = generateClinical({ ...CLINICAL, shift: 0 });
  shifted.forEach((row, index) => {
    assert.ok(row.a >= CLINICAL.lower && row.a < CLINICAL.upper);
    assert.equal(row.t, row.a + row.b - 1);
    assert.equal(row.a, unshifted[index].a);
    assert.equal(row.b, unshifted[index].b);
    assert.equal(row.t, unshifted[index].t - 1);
    for (const field of ['age', 'name', 'gender', 'note', 'note2']) assert.equal(row.record[field], unshifted[index].record[field]);
  });
});

test('exactly 250 new extensionless IDs have unique bytes and nonoverlapping stream starts', () => {
  const rows = generateClinical();
  assert.equal(rows.length, 250);
  const ids = Array.from({ length: 250 }, (_, i) => `S${String(1201 + i).padStart(4, '0')}`);
  assert.deepEqual(rows.map(row => row.id), ids);
  assert.deepEqual(fs.readdirSync(path.join(root, 'registreringer')).sort(), ids);
  assert.equal(new Set(rows.map(row => hash(row.bytes))).size, 250);
  const previous = JSON.parse(fs.readFileSync(path.join(root, 'previous-preservation.json'), 'utf8'));
  const previousHashes = new Set(previous.map(entry => entry.sha256));
  assert.ok(rows.every(row => !previousHashes.has(hash(row.bytes))));
  const earlierStates = new Set([
    ...Array.from({ length: 200 }, (_, i) => (20261113 + Math.imul(i + 1, 0x9e3779b9)) >>> 0),
    ...Array.from({ length: 1000 }, (_, i) => (20261114 + Math.imul(i + 1, 0x9e3779b9)) >>> 0),
  ]);
  const states = rows.map((_, i) => (CLINICAL.seed + Math.imul(i + 1, 0x9e3779b9)) >>> 0);
  assert.equal(new Set(states).size, 250);
  assert.ok(states.every(state => !earlierStates.has(state)));
});

test('all clinical disk files preserve ordinary format, encoding, gender, ages, scores and calculation', () => {
  const engine = new Skaring();
  const checksums = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trimEnd().split('\n');
  assert.equal(checksums.length, 250);
  generateClinical().forEach((row, index) => {
    const actual = fs.readFileSync(path.join(root, 'registreringer', row.id));
    assert.deepEqual(actual, Buffer.from(row.bytes));
    assert.equal(checksums[index], `${hash(actual)}  registreringer/${row.id}`);
    const parsed = parseNubu100(actual);
    assert.equal(parsed.kind, 'known-format');
    assert.deepEqual(parsed.record, row.record);
    assert.deepEqual(serializeNubu100(parsed.record).bytes, row.bytes);
    const text = new TextDecoder('windows-1252').decode(actual);
    const lines = text.split('\r\n');
    assert.equal(lines.length, 10);
    assert.equal(lines[9], '');
    assert.equal(lines[8], 'NUBUMotor_100');
    assert.equal(text.replaceAll('\r\n', '').includes('\n'), false);
    assert.ok(!(actual[0] === 239 && actual[1] === 187 && actual[2] === 191));
    assert.equal(lines[1], row.record.gender === 'gutt' ? 'true false' : row.record.gender === 'jente' ? 'false true' : 'false false');
    assert.equal(row.record.birthDate, '');
    assert.equal(row.record.testDate, '');
    assert.match(row.record.name, /^[A-ZÆØÅ] [A-ZÆØÅ]$/);
    assert.match(row.record.note, /^[A-ZÆØÅ]{3}\.$/);
    assert.match(row.record.note2, /^[A-ZÆØÅ]{3}\.$/);
    assert.equal(row.record.age, engine.yearDecToMonth(Math.exp(1.968 + 0.254 * row.a)));
    const [years, months] = row.record.age.split(':').map(Number);
    assert.ok(years * 12 + months >= 40 && years * 12 + months <= 85);
    assert.equal(row.calculationAge, years + months / 12 + 1 / 24);
    assert.equal(row.calculationAge, resolveCalculationAge(parsed.record).years);
    assert.match(row.record.items.join(''), /^[0129]{50}$/);
    const counts = Array.from({ length: 5 }, (_, area) => row.record.items.slice(area * 10, area * 10 + 10).filter(c => '012'.includes(c)).length);
    assert.deepEqual(counts, row.counts);
    assert.ok(counts.every(count => count >= 2 && count <= 5));
    const total = counts.reduce((a, b) => a + b, 0);
    assert.ok(total >= 10 && total <= 25);
    row.orders.forEach((order, area) => {
      assert.equal(order.length, counts[area]);
      assert.equal(new Set(order).size, order.length);
      assert.ok(order.every(i => i >= 0 && i < 10 && '012'.includes(row.record.items[area * 10 + i])));
    });
    assert.equal(engine.calculateRegistration(parsed.record), -10000);
    assert.equal(engine.gNValid, total);
    assert.equal(row.expected, engine.ageToMeasure(row.calculationAge, 1.968, 0.254));
    assert.equal(row.estimate, engine.gMeasure);
    assert.equal(row.standardError, engine.gSE);
    assert.equal(row.minEstimated, engine.gIsMinEstimated);
    assert.equal(row.maxEstimated, engine.gIsMaxEstimated);
    assert.equal(row.difference, row.estimate - row.expected);
    assert.equal(row.latentDifference, row.t - row.expected);
    assert.equal(row.rounded, Math.round(row.difference * 20) / 20);
    assert.equal(row.percentile, engine.modelPercentile().value);
  });
});

test('information table and separated statistics cover every case and clearly mark estimates preliminary', () => {
  const rows = generateClinical();
  const summary = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
  assert.match(summary.calculationStatus, /Preliminary/);
  assert.equal(summary.clinical250.count, 250);
  assert.equal(summary.ordinary1000.count, 1000);
  assert.equal(summary.settings.shift, -1);
  const stats = summary.clinical250;
  const sum = values => Object.values(values).reduce((a, b) => a + b, 0);
  assert.equal(sum(stats.ageYears), 250);
  assert.equal(sum(stats.taskTotals.histogram), 250);
  assert.equal(sum(stats.percentiles.histogram), 250);
  assert.equal(sum(stats.scores), 12500);
  for (const area of stats.areaCounts) assert.equal(sum(area.histogram), 250);
  for (const [key, gender] of [['gutt', 'gutt'], ['jente', 'jente'], ['undefined', null]]) assert.equal(stats.gender[key].count, rows.filter(row => row.record.gender === gender).length);
  assert.equal(stats.preliminaryLowPercentiles.zero.count, rows.filter(r => r.percentile === 0).length);
  const bins = stats.preliminaryLowPercentiles;
  assert.equal(bins.zero.count + bins.oneToTwo.count + bins.threeToFive.count + bins.sixToFifteen.count + bins.aboveFifteen.count, 250);
  assert.equal(bins.atMostTwo.count, bins.zero.count + bins.oneToTwo.count);
  assert.equal(bins.atMostFive.count, bins.atMostTwo.count + bins.threeToFive.count);
  assert.equal(stats.extremes.min, rows.filter(r => r.minEstimated).length);
  assert.equal(stats.extremes.max, rows.filter(r => r.maxEstimated).length);
  assert.deepEqual(stats.preliminaryExtremeIds.min, rows.filter(r => r.minEstimated).map(r => r.id));
  for (const cutoff of stats.preliminaryLowRasch) assert.equal(cutoff.count, rows.filter(r => r.estimate < cutoff.threshold).length);
  assert.ok(Math.abs(stats.tMinusA.mean - (stats.b.mean - 1)) < 1e-12);
  assert.ok(Math.abs(stats.tMinusA.sd - stats.b.sd) < 1e-12);
  const table = fs.readFileSync(path.join(root, 'generation.tsv'), 'utf8');
  assert.equal(table[0], '\ufeff');
  const lines = table.slice(1).trimEnd().split('\r\n');
  assert.equal(lines.length, 251);
  assert.equal(lines[0].split('\t').length, 24);
  assert.match(lines[0], /FORELØPIG MODELLPERSENTIL/);
  assert.match(lines[0], /FORELØPIG MINFLAGG/);
  rows.forEach((row, i) => {
    const fields = lines[i + 1].split('\t');
    assert.equal(fields.length, 24);
    assert.equal(fields[0], row.id);
    assert.equal(fields[1], 'clinical');
    assert.equal(Number(fields[2]), row.a);
    assert.equal(Number(fields[3]), row.b);
    assert.equal(Number(fields[4]), row.t);
    assert.equal(Number(fields[5]), row.t - row.a);
    assert.equal(fields[6], row.record.age);
    assert.equal(fields[9], row.record.items.join(''));
    assert.equal(Number(fields[10]), row.estimate);
    assert.equal(Number(fields[14]), row.percentile);
  });
});

test('previous material, including all eight manual main exports, is preserved across identical regeneration', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'previous-preservation.json'), 'utf8'));
  verifyPrevious(simulationRoot, manifest);
  for (let i = 1; i <= 4; i++) for (const program of ['Win', 'Web']) {
    assert.ok(manifest.some(entry => entry.file === `main/exports/261113 ${program} 0${i}.dat`));
  }
  for (const file of ['main-simulate.ts', 'main-run.cjs', 'simulate.ts', 'run.cjs', 'compare.ts', 'compare.cjs', 'pilot-report.md', 'main/report.md']) assert.ok(manifest.some(entry => entry.file === file));
  const snapshot = () => {
    const entries = [];
    const visit = directory => {
      for (const name of fs.readdirSync(directory).sort()) {
        const file = path.join(directory, name);
        if (fs.statSync(file).isDirectory()) visit(file);
        else entries.push([path.relative(root, file), hash(fs.readFileSync(file))]);
      }
    };
    visit(root);
    return entries;
  };
  const before = snapshot();
  assert.deepEqual(generateClinical(), generateClinical());
  deliverClinical(simulationRoot);
  assert.deepEqual(snapshot(), before);
  verifyPrevious(simulationRoot, manifest);
});

test('invalid clinical settings are rejected rather than normalized', () => {
  for (const patch of [{ seed: -1 }, { seed: 1.1 }, { count: 0 }, { firstId: 0 }, { lower: 0 }, { upper: NaN }, { shift: Infinity }]) assert.throws(() => generateClinical({ ...CLINICAL, ...patch }));
});
