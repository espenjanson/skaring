const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { MAIN, generate, folder, verifyPilotParity, verifyPreservation, deliverMain } = require('../simulation/main-run.cjs');
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs');
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts');
const { resolveCalculationAge } = loadTypeScript('domain/dateAge.ts');
const { Skaring } = loadTypeScript('api/skaring.ts');
const simulationRoot = path.resolve(__dirname, '../simulation');
const root = path.join(simulationRoot, 'main');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('new adapter reproduces the complete unchanged pilot with the pilot settings', () => {
  verifyPilotParity();
});

test('main settings generate 1 000 unique, new and reproducible cases without a latent shift', () => {
  assert.deepEqual(MAIN, { seed: 20261114, count: 1000, firstId: 201, groupSize: 250 });
  const rows = generate();
  assert.deepEqual(generate(), rows);
  assert.equal(rows.length, 1000);
  assert.deepEqual(rows.map(r => r.id), Array.from({ length: 1000 }, (_, i) => `S${String(i + 201).padStart(4, '0')}`));
  assert.equal(new Set(rows.map(r => hash(r.bytes))).size, 1000);
  const pilotHashes = new Set(fs.readdirSync(path.join(simulationRoot, 'registreringer')).map(name => hash(fs.readFileSync(path.join(simulationRoot, 'registreringer', name)))));
  for (const row of rows) {
    assert.equal(row.t, row.a + row.b);
    assert.ok(!pilotHashes.has(hash(row.bytes)));
  }
  const pilotStates = new Set(Array.from({ length: 200 }, (_, i) => (20261113 + Math.imul(i + 1, 0x9e3779b9)) >>> 0));
  const mainStates = rows.map((_, i) => (MAIN.seed + Math.imul(i + 1, 0x9e3779b9)) >>> 0);
  assert.equal(new Set(mainStates).size, 1000);
  assert.ok(mainStates.every(value => !pilotStates.has(value)));
});

test('four folders contain exactly 250 extensionless registrations each; disk bytes and hashes match', () => {
  const rows = generate();
  const checksums = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trimEnd().split('\n');
  assert.equal(checksums.length, 1000);
  const expectedDirectories = ['01_S0201-S0450', '02_S0451-S0700', '03_S0701-S0950', '04_S0951-S1200'];
  assert.deepEqual(Array.from({ length: 4 }, (_, i) => folder(i)), expectedDirectories);
  const actualDirectories = fs.readdirSync(root).filter(name => /^\d{2}_/.test(name)).sort();
  assert.deepEqual(actualDirectories, expectedDirectories);
  for (let index = 0; index < 4; index++) {
    const names = fs.readdirSync(path.join(root, folder(index))).sort();
    assert.equal(names.length, 250);
    assert.deepEqual(names, rows.slice(index * 250, (index + 1) * 250).map(r => r.id));
  }
  rows.forEach((row, index) => {
    const relative = `${folder(Math.floor(index / 250))}/${row.id}`;
    const actual = fs.readFileSync(path.join(root, relative));
    assert.deepEqual(actual, Buffer.from(row.bytes));
    assert.equal(checksums[index], `${hash(actual)}  ${relative}`);
    assert.equal(parseNubu100(actual).kind, 'known-format');
  });
});

test('all 1 000 files obey format, age, gender, item and ordinary calculation rules', () => {
  const engine = new Skaring();
  const lower = engine.ageToMeasure(3.5, 1.968, 0.254) - 0.1;
  const upper = engine.ageToMeasure(18, 1.968, 0.254) + 0.1;
  for (const row of generate()) {
    const decoded = new TextDecoder('windows-1252').decode(row.bytes);
    const lines = decoded.split('\r\n');
    assert.equal(lines.length, 10);
    assert.equal(lines[9], '');
    assert.equal(lines[8], 'NUBUMotor_100');
    assert.equal(decoded.replaceAll('\r\n', '').includes('\n'), false);
    assert.ok(!(row.bytes[0] === 239 && row.bytes[1] === 187 && row.bytes[2] === 191));
    const parsed = parseNubu100(row.bytes);
    assert.deepEqual(serializeNubu100(parsed.record).bytes, row.bytes);
    assert.deepEqual(parsed.record, row.record);
    assert.equal(row.record.birthDate, '');
    assert.equal(row.record.testDate, '');
    assert.ok(row.a >= lower && row.a < upper);
    assert.equal(row.record.age, engine.yearDecToMonth(Math.exp(1.968 + 0.254 * row.a)));
    assert.equal(row.calculationAge, resolveCalculationAge(row.record).years);
    const [years, months] = row.record.age.split(':').map(Number);
    assert.equal(row.calculationAge, years + months / 12 + 1 / 24);
    assert.equal(lines[1], row.record.gender === 'gutt' ? 'true false' : row.record.gender === 'jente' ? 'false true' : 'false false');
    assert.match(row.record.name, /^[A-ZÆØÅ] [A-ZÆØÅ]$/);
    assert.match(row.record.note, /^[A-ZÆØÅ]{3}\.$/);
    assert.match(row.record.note2, /^[A-ZÆØÅ]{3}\.$/);
    assert.match(row.record.items.join(''), /^[0129]{50}$/);
    const counts = Array.from({ length: 5 }, (_, area) => row.record.items.slice(area * 10, (area + 1) * 10).filter(c => '012'.includes(c)).length);
    assert.deepEqual(counts, row.counts);
    assert.ok(counts.every(count => count >= 2 && count <= 5));
    const total = counts.reduce((a, b) => a + b, 0);
    assert.ok(total >= 10 && total <= 25);
    row.orders.forEach((order, area) => {
      assert.equal(order.length, counts[area]);
      assert.equal(new Set(order).size, order.length);
      assert.ok(order.every(i => i >= 0 && i < 10 && '012'.includes(row.record.items[area * 10 + i])));
    });
    assert.equal(engine.calculateRegistration(row.record), -10000);
    assert.equal(engine.gNValid, total);
    assert.equal(engine.gMeasure, row.estimate);
    assert.equal(engine.gSE, row.standardError);
    assert.equal(engine.gIsMinEstimated, row.minEstimated);
    assert.equal(engine.gIsMaxEstimated, row.maxEstimated);
    assert.equal(row.expected, engine.ageToMeasure(row.calculationAge, 1.968, 0.254));
    assert.equal(row.latentDifference, row.t - row.expected);
    assert.equal(row.difference, row.estimate - row.expected);
    assert.equal(row.rounded, Math.round(row.difference * 20) / 20);
    assert.equal(row.percentile, engine.modelPercentile().value);
  }
});

test('descriptive summaries and information table cover every generated case', () => {
  const rows = generate();
  const summary = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
  assert.equal(summary.settings.seed, MAIN.seed);
  assert.equal(summary.settings.shift, 0);
  assert.equal(summary.main.count, 1000);
  assert.equal(summary.pilot.count, 200);
  const sum = values => Object.values(values).reduce((a, b) => a + b, 0);
  assert.equal(sum(summary.main.ageYears), 1000);
  assert.equal(sum(summary.main.taskTotals.histogram), 1000);
  assert.equal(sum(summary.main.percentiles.histogram), 1000);
  assert.equal(sum(summary.main.scores), 50000);
  for (const area of summary.main.areaCounts) assert.equal(sum(area.histogram), 1000);
  for (const [key, gender] of [['gutt', 'gutt'], ['jente', 'jente'], ['undefined', null]]) {
    assert.equal(summary.main.gender[key].count, rows.filter(r => r.record.gender === gender).length);
  }
  const latentMean = rows.reduce((sum, r) => sum + r.t, 0) / rows.length;
  assert.equal(summary.main.t.mean, latentMean);
  const text = fs.readFileSync(path.join(root, 'generation.tsv'), 'utf8');
  assert.equal(text[0], '\ufeff');
  const lines = text.slice(1).trimEnd().split('\r\n');
  assert.equal(lines.length, 1001);
  assert.equal(lines[0].split('\t').length, 23);
  rows.forEach((row, index) => {
    const fields = lines[index + 1].split('\t');
    assert.equal(fields.length, 23);
    assert.equal(fields[0], row.id);
    assert.equal(fields[1], folder(Math.floor(index / 250)));
    assert.equal(Number(fields[2]), row.a);
    assert.equal(Number(fields[3]), row.b);
    assert.equal(Number(fields[4]), row.t);
    assert.equal(fields[5], row.record.age);
    assert.equal(fields[8], row.record.items.join(''));
    assert.equal(Number(fields[9]), row.estimate);
  });
});

test('protected pilot and comparator remain unchanged; repeated delivery preserves all existing main files', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pilot-preservation.json'), 'utf8'));
  verifyPreservation(simulationRoot, manifest);
  for (const file of ['simulate.ts', 'run.cjs', 'compare.ts', 'compare.cjs', 'pilot-report.md', 'pilot-deviations.tsv', 'pilot-summary.json', '261113 1128 Dataexport registreringer.dat', '261113 1135 webb Dataeksport.txt']) {
    assert.ok(manifest.some(entry => entry.file === file));
  }
  assert.equal(manifest.filter(entry => entry.file.startsWith('registreringer/')).length, 200);
  const snapshot = directory => {
    const entries = [];
    const visit = dir => {
      for (const name of fs.readdirSync(dir).sort()) {
        const absolute = path.join(dir, name);
        if (fs.statSync(absolute).isDirectory()) visit(absolute);
        else entries.push([path.relative(directory, absolute), hash(fs.readFileSync(absolute))]);
      }
    };
    visit(directory);
    return entries;
  };
  const before = snapshot(root);
  deliverMain(simulationRoot);
  assert.deepEqual(snapshot(root), before);
  verifyPreservation(simulationRoot, manifest);
});

test('invalid generation settings are rejected rather than silently changing the experiment', () => {
  for (const patch of [{ seed: -1 }, { seed: 1.5 }, { count: 0 }, { firstId: 0 }]) {
    assert.throws(() => generate({ ...MAIN, ...patch }));
  }
});
