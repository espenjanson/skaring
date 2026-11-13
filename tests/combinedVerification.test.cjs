const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadPairs, aggregate, describeExports, buildVerification, deliverVerification } = require('../simulation/verify-all.cjs');
const root = path.resolve(__dirname, '../simulation');

test('five actual export pairs have exact expected ID sets and a disjoint union of 1250 cases', () => {
  const pairs = loadPairs(root);
  assert.equal(pairs.length, 5);
  for (const pair of pairs) {
    assert.equal(pair.result.matched.length, 250);
    assert.deepEqual(pair.result.onlyWindows, []);
    assert.deepEqual(pair.result.onlyWeb, []);
    assert.equal(pair.result.deviations.length, 0);
  }
  const combined = aggregate(pairs.map(pair => pair.result));
  assert.deepEqual(combined.matched, Array.from({ length: 1250 }, (_, i) => `S${String(i + 201).padStart(4, '0')}`));
  assert.throws(() => aggregate([pairs[0].result, pairs[0].result]), /Overlapping/);
});

test('A B C direct fields, note checks and unavailable columns are counted without duplication', () => {
  const built = buildVerification(root);
  for (const [name, count] of [['A_ordinary1000', 1000], ['B_clinical250', 250], ['C_all1250', 1250]]) {
    const result = built.groups[name];
    assert.equal(result.columns.reduce((sum, c) => sum + c.exact, 0), count * 13);
    assert.equal(result.combinedNotes.exact, count);
    assert.equal(result.columns.filter(c => c.unavailable === count).length, 5);
    assert.equal(result.deviations.length, 0);
    for (const c of result.columns) if (c.numericPairs) {
      assert.equal(c.maxAbs, 0);
      assert.equal(c.sumDelta, 0);
      assert.equal(c.positive, 0);
      assert.equal(c.negative, 0);
    }
  }
});

test('actual exported group statistics and flags agree across programs and remain separate', () => {
  const pairs = loadPairs(root);
  const ordinary = aggregate(pairs.slice(0, 4).map(p => p.result));
  const clinical = pairs[4].result;
  const a = describeExports(ordinary, 'windows');
  const b = describeExports(clinical, 'windows');
  assert.deepEqual(a, describeExports(ordinary, 'web'));
  assert.deepEqual(b, describeExports(clinical, 'web'));
  assert.equal(a.n, 1000);
  assert.equal(a.zero, 0);
  assert.equal(a.minIds.length, 3);
  assert.equal(a.maxIds.length, 17);
  assert.equal(b.n, 250);
  assert.equal(b.zero, 2);
  assert.equal(b.atMostFive, 105);
  assert.equal(b.minIds.length, 9);
  assert.equal(b.maxIds.length, 0);
  assert.equal(b.belowMinus4point2, 23);
  assert.equal(Object.values(a.percentiles).reduce((x, y) => x + y), 1000);
  assert.equal(Object.values(b.percentiles).reduce((x, y) => x + y), 250);
});

test('saved reports and grouped deviations are reproducible; all earlier files and actual exports stay unchanged', () => {
  const built = buildVerification(root);
  for (const [relative, content] of built.files) assert.equal(fs.readFileSync(path.join(root, 'verification', relative), 'utf8'), content);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'verification/preserved-files.json'), 'utf8'));
  assert.equal(manifest.filter(entry => /(?:main|clinical)\/exports\//.test(entry.file)).length, 10);
  for (const entry of manifest) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, entry.file))).digest('hex'), entry.sha256);
  const before = fs.readFileSync(path.join(root, 'verification/summary.json'));
  deliverVerification(root);
  assert.deepEqual(fs.readFileSync(path.join(root, 'verification/summary.json')), before);
  const deviations = fs.readFileSync(path.join(root, 'verification/deviations.tsv'), 'utf8');
  assert.equal(deviations.slice(1).split('\r\n').length, 2);
  assert.match(deviations, /GROUP\tPAIR\tID/);
});
