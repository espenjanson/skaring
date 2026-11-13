const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { random, selectArea, simulate, shapedNormal, moments, FINAL_PARAMETERS } = require('../simulation/run.cjs');
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs');
const { Skaring } = loadTypeScript('api/skaring.ts');
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts');
const { resolveCalculationAge } = loadTypeScript('domain/dateAge.ts');

const difficulties = Array.from({ length: 10 }, (_, i) => i);
const constant = value => Array(10).fill(value);

test('selection obeys minimum at either extreme and never repeats an item', () => {
  const low = selectArea(difficulties, -100, constant(0), constant(0));
  assert.deepEqual(low.order, [0, 1]);
  const high = selectArea(difficulties, 100, constant(0.999999), constant(0));
  assert.deepEqual(high.order, [9, 8]);
  for (const t of [-5, 0, 4.5, 9, 15]) {
    for (const u of [0, 0.2, 0.5, 0.8, 0.999999]) {
      const result = selectArea(difficulties, t, constant(u), constant(0));
      assert.ok(result.order.length >= 2 && result.order.length <= 5);
      assert.equal(new Set(result.order).size, result.order.length);
    }
  }
});

test('equal start distances favor easier items, equal calibrations favor lower item numbers', () => {
  assert.equal(selectArea(difficulties, 4.5, constant(0.5), constant(0)).order[0], 4);
  assert.equal(selectArea([5, 4, 3, 2, 1, 0, 0, 7, 8, 9], 0, constant(0.5), constant(0)).order[0], 5);
});

test('score one uses rank distance and the random draw resolves direction ties', () => {
  const uneven = [-100, -80, -60, -40, -20, 0, 0.01, 50, 100, 200];
  assert.deepEqual(selectArea(uneven, 0, constant(0.5), constant(0)).order.slice(0, 2), [5, 4]);
  assert.deepEqual(selectArea(uneven, 0, constant(0.5), constant(0.9)).order.slice(0, 2), [5, 6]);
});

test('both directions close at observed boundaries after the two-item minimum', () => {
  const uniforms = constant(0.5);
  uniforms[5] = 0;
  uniforms[4] = 0.999999;
  assert.deepEqual(selectArea(difficulties, 5, uniforms, constant(0)).order, [5, 4]);
  uniforms[5] = 0.999999;
  uniforms[6] = 0;
  assert.deepEqual(selectArea(difficulties, 5, uniforms, constant(0)).order, [5, 6]);
});

test('a live search reaches the five-item maximum', () => {
  assert.equal(selectArea(difficulties, 4.5, constant(0), constant(0)).order.length, 5);
});

test('fixed seed and sigma reproduce all 200 records and their bytes', () => {
  assert.deepEqual(simulate(0.85), simulate(0.85));
  const rng = random(20261113);
  const repeated = random(20261113);
  for (let i = 0; i < 1000; i++) {
    const draw = rng();
    assert.equal(draw, repeated());
    assert.ok(draw >= 0 && draw < 1);
  }
});

test('all synthetic records preserve model age, encoding, ordinary parser and calculation', () => {
  const rows = simulate(0.85);
  const engine = new Skaring();
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';
  for (const [index, row] of rows.entries()) {
    assert.equal(row.id, `S${String(index + 1).padStart(4, '0')}`);
    assert.match(row.record.items.join(''), /^[0129]{50}$/);
    assert.ok(row.counts.every(n => n >= 2 && n <= 5));
    const total = row.counts.reduce((a, b) => a + b, 0);
    assert.ok(total >= 10 && total <= 25);
    for (const order of row.orders) assert.equal(new Set(order).size, order.length);
    assert.equal(row.record.birthDate, '');
    assert.equal(row.record.testDate, '');
    assert.equal(row.record.age, engine.yearDecToMonth(Math.exp(1.968 + 0.254 * row.a)));
    const [years, months] = row.record.age.split(':').map(Number);
    assert.equal(resolveCalculationAge(row.record).years, years + months / 12 + 1 / 24);
    const parsed = parseNubu100(row.bytes);
    assert.equal(parsed.kind, 'known-format');
    assert.deepEqual(parsed.record, row.record);
    assert.deepEqual(serializeNubu100(parsed.record).bytes, row.bytes);
    const text = new TextDecoder('windows-1252').decode(row.bytes);
    const lines = text.split('\r\n');
    assert.equal(lines.length, 10);
    assert.equal(lines[9], '');
    assert.equal(lines[8], 'NUBUMotor_100');
    assert.equal(lines[1], row.record.gender === 'gutt' ? 'true false' : row.record.gender === 'jente' ? 'false true' : 'false false');
    assert.ok([...row.record.name.replace(' ', '')].every(c => letters.includes(c)));
    for (const note of [row.record.note, row.record.note2]) {
      assert.equal(note.length, 4);
      assert.equal(note[3], '.');
      assert.ok([...note.slice(0, 3)].every(c => letters.includes(c)));
    }
    assert.equal(engine.calculateRegistration(parsed.record), -10000);
    assert.equal(engine.gNValid, total);
    assert.equal(engine.gMeasure, row.estimate);
    assert.equal(engine.modelPercentile().value, row.percentile);
  }
  // Non-ASCII Norwegian letters must be encoded as single CP1252 bytes, not UTF-8.
  assert.ok(rows.some(row => [...row.bytes].some(byte => [0xc6, 0xd8, 0xc5].includes(byte))));
});

test('sigma zero sets t=a; paired draws preserve ages and demographic fields', () => {
  const zero = simulate(0);
  const spread = simulate(1.85);
  for (let i = 0; i < 200; i++) {
    assert.equal(zero[i].b, 0);
    assert.equal(zero[i].t, zero[i].a);
    assert.equal(spread[i].t, spread[i].a + spread[i].b);
    for (const key of ['name', 'gender', 'age', 'note', 'note2']) {
      assert.equal(zero[i].record[key], spread[i].record[key]);
    }
    assert.equal(zero[i].a, spread[i].a);
  }
});

test('normal shape is unchanged; selected shape is a monotone zero-mean unit-variance transform', () => {
  for (const z of [-4, -1, 0, 1, 4]) assert.equal(shapedNormal(z, { quadratic: 0, cubic: 0 }), z);
  const { quadratic: c, cubic: k } = FINAL_PARAMETERS.shape;
  const scale = Math.sqrt(1 + 2 * c * c + 6 * k * k);
  // Gaussian raw moments E[Z^0..Z^6]; integrate the actual polynomial exactly.
  const gaussianMoments = [1, 0, 1, 0, 3, 0, 15];
  const coefficients = [-c / scale, (1 - 3 * k) / scale, c / scale, k / scale];
  const mean = coefficients.reduce((sum, value, power) => sum + value * gaussianMoments[power], 0);
  let secondMoment = 0;
  coefficients.forEach((left, i) => coefficients.forEach((right, j) => {
    secondMoment += left * right * gaussianMoments[i + j];
  }));
  assert.ok(Math.abs(mean) < 1e-14);
  assert.ok(Math.abs(secondMoment - 1) < 1e-14);
  assert.ok(k > 0 && 1 - 3 * k - c * c / (3 * k) > 0);
});

test('moment conventions use sample SD and ordinary kurtosis rather than excess', () => {
  const result = moments([-2, -1, 0, 1, 2]);
  assert.equal(result.mean, 0);
  assert.equal(result.sd, Math.sqrt(2.5));
  assert.equal(result.skewness, 0);
  assert.equal(result.kurtosis, 1.7);
});

test('delivered disk files, information table and hashes reproduce the selected final experiment', () => {
  const root = path.resolve(__dirname, '../simulation');
  const rows = simulate(FINAL_PARAMETERS.sigma);
  assert.deepEqual(fs.readdirSync(path.join(root, 'registreringer')).sort(), rows.map(row => row.id));
  for (const row of rows) {
    const actual = fs.readFileSync(path.join(root, 'registreringer', row.id));
    assert.deepEqual(actual, Buffer.from(row.bytes));
    assert.equal(parseNubu100(actual).kind, 'known-format');
  }
  const expectedHashes = rows.map(row => `${createHash('sha256').update(row.bytes).digest('hex')}  registreringer/${row.id}`).join('\n') + '\n';
  assert.equal(fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8'), expectedHashes);
  const table = fs.readFileSync(path.join(root, 'simuleringsinformasjon.tsv'), 'utf8');
  assert.ok(table.startsWith('\ufeff'));
  const lines = table.slice(1).trimEnd().split('\r\n');
  assert.equal(lines.length, 201);
  assert.equal(lines[0].split('\t').length, 16);
  rows.forEach((row, index) => {
    const fields = lines[index + 1].split('\t');
    assert.equal(fields.length, 16);
    assert.equal(fields[0], row.id);
    assert.equal(Number(fields[1]), row.a);
    assert.equal(Number(fields[2]), row.b);
    assert.equal(Number(fields[3]), row.t);
    assert.equal(fields[4], row.record.age);
    assert.equal(fields[5], row.record.items.join(''));
    assert.equal(Number(fields[6]), row.estimate);
  });
});
