const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const tool = require('../simulation/compare.cjs');
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs');
const { encodeWindows1252 } = loadTypeScript('file/windows1252.ts');
const { exportHeaders } = loadTypeScript('file/dataExport.ts');
const root = path.resolve(__dirname, '../simulation');
const windowsName = '261113 1128 Dataexport registreringer.dat';
const webName = '261113 1135 webb Dataeksport.txt';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function row(id = 'S0001', patch = {}) {
  const values = ['S0001', 'Ø Å', '1', '', '', '6:0', '1.798', 'ÆØÅ.', 'ABC.', '0129999999'.repeat(5), '0.500', '0.300', '0', '0', '8:1', '7:0', '9:6', '52'];
  values[0] = id;
  for (const [header, value] of Object.entries(patch)) values[tool.HEADERS.indexOf(header)] = value;
  return values;
}
function bytes(rows, legacy = false) {
  const header = legacy ? tool.LEGACY_HEADERS : tool.HEADERS;
  const mapped = legacy ? rows.map(values => header.map(key => key === 'MERKNADER'
    ? `${values[7]} ${values[8]}` : values[tool.HEADERS.indexOf(key === 'RASCHSKÅRE' ? 'RASCHSKÅR' : key)])) : rows;
  const text = tool.writeTsv([header, ...mapped]);
  if (!legacy) return Buffer.from(text, 'utf8');
  const encoded = encodeWindows1252(text.slice(1));
  assert.equal(encoded.ok, true);
  return encoded.bytes;
}
function read(rows, legacy = false) { return tool.readExport(bytes(rows, legacy), legacy ? 'Windows.dat' : 'Webb.txt', legacy ? 'windows-1252' : 'utf-8'); }
function compare(left, right) { return tool.compareExports(read(left), read(right)); }

test('canonical schema follows the production export and compares all 18 columns for two new exports', () => {
  assert.deepEqual(tool.HEADERS, [...exportHeaders]);
  const result = compare([row()], [row()]);
  assert.equal(result.columns.length, 18);
  assert.ok(result.columns.every(column => column.compared === 1 && column.exact === 1));
  assert.equal(result.deviations.length, 0);
});

test('legacy mapping has 13 common columns, five unavailable fields and a separate note check', () => {
  const result = tool.compareExports(read([row()], true), read([row()]));
  assert.equal(result.columns.filter(c => c.exact === 1).length, 13);
  assert.deepEqual(result.columns.filter(c => c.unavailable === 1).map(c => c.column), ['FØDSELSDATO', 'TESTDATO', 'VIST ALDER', 'MERKNAD', 'MERKNAD 2']);
  assert.equal(result.combinedNotes.exact, 1);
  // Equal combined text cannot establish which individual field contained a word.
  const original = row('S0001', { MERKNAD: 'A B', 'MERKNAD 2': 'C' });
  const moved = row('S0001', { MERKNAD: 'A', 'MERKNAD 2': 'B C' });
  const ambiguous = tool.compareExports(read([original], true), read([moved]));
  assert.equal(ambiguous.combinedNotes.exact, 1);
  assert.equal(ambiguous.columns[7].compared, 0);
});

test('matching uses exact IDs independently of input row order and NAVN', () => {
  const first = row('S0001');
  const second = row('S0002');
  const result = compare([second, first], [first, second]);
  assert.deepEqual(result.matched, ['S0001', 'S0002']);
  assert.equal(result.deviations.length, 0);
  assert.deepEqual(result.columns, compare([first, second], [second, first]).columns);
  assert.deepEqual(result.groups, compare([first, second], [second, first]).groups);
});

test('missing IDs are listed separately and never matched by position or case folding', () => {
  const result = compare([row('S0001'), row('S0002')], [row('S0002'), row('s0001')]);
  assert.deepEqual(result.matched, ['S0002']);
  assert.deepEqual(result.onlyWindows, ['S0001']);
  assert.deepEqual(result.onlyWeb, ['s0001']);
  assert.equal(result.deviations.filter(d => d.status === 'missing-id').length, 2);
});

test('duplicate, blank and padded IDs are rejected before comparison', () => {
  assert.throws(() => read([row(), row()]), /Duplisert ID/);
  assert.throws(() => read([row('')]), /tom ID/);
  assert.throws(() => read([row(' S0001')]), /mellomrom/);
});

test('quoted TSV round-trips embedded tabs, escaped quotes, newlines and trailing empty fields', () => {
  const fields = [[' ID ', 'a\tb', 'a"b', 'a\r\nb', 'a\nb', '']];
  assert.deepEqual(tool.parseTsv(tool.writeTsv(fields).slice(1)), fields);
  assert.deepEqual(tool.parseTsv('a\tb\t'), [['a', 'b', '']]);
  assert.deepEqual(tool.parseTsv('a\tb\t\r\n'), [['a', 'b', '']]);
  const note = '  tekst\t"sitert"\r\nlinje  ';
  const result = compare([row('S0001', { MERKNAD: note })], [row('S0001', { MERKNAD: note })]);
  assert.equal(result.columns[7].exact, 1);
  const changed = compare([row('S0001', { MERKNAD: note })], [row('S0001', { MERKNAD: note.trim() })]);
  assert.equal(changed.columns[7].outside, 1);
  const deviationFields = tool.parseTsv(tool.renderReports(changed).deviations.slice(1));
  assert.equal(deviationFields[1][3], note);
});

test('malformed quoting, wrong columns, unknown headers, blank rows and empty exports fail', () => {
  for (const text of ['"abc', 'a"b', '"a"x', '"a" "b"']) assert.throws(() => tool.parseTsv(text));
  assert.throws(() => tool.readExport(Buffer.from(''), 'empty', 'utf-8'), /kolonne/);
  assert.throws(() => tool.readExport(Buffer.from(tool.writeTsv([tool.HEADERS])), 'headers', 'utf-8'), /mangler registreringer/);
  const short = row().slice(0, -1);
  assert.throws(() => tool.readExport(Buffer.from(tool.writeTsv([tool.HEADERS, short])), 'short', 'utf-8'), /kolonner/);
  assert.throws(() => tool.readExport(Buffer.from(tool.writeTsv([[...tool.HEADERS].reverse(), row()])), 'schema', 'utf-8'), /kolonneoppsett/);
  assert.throws(() => tool.readExport(Buffer.concat([bytes([row()]), Buffer.from('\r\n')]), 'blank', 'utf-8'), /kolonner/);
});

test('encoding and line-ending metadata are explicit; invalid bytes never become replacement text', () => {
  const old = read([row()], true);
  assert.equal(old.encoding, 'windows-1252');
  assert.equal(old.bom, false);
  const modern = read([row()]);
  assert.equal(modern.encoding, 'utf-8');
  assert.equal(modern.bom, true);
  assert.equal(old.rows.get('S0001').values.NAVN, 'Ø Å');
  const lf = Buffer.from(bytes([row()]).toString('utf8').replaceAll('\r\n', '\n').replace(/\n$/, ''));
  const parsed = tool.readExport(lf, 'lf', 'utf-8');
  assert.equal(parsed.endings.lf, 1);
  assert.equal(parsed.endings.finalNewline, false);
  assert.equal(parsed.warnings.length, 2);
  assert.throws(() => tool.readExport(Uint8Array.from([0xff, 0xfe, 0, 0]), 'utf16', 'utf-8'), /UTF-16/);
  assert.throws(() => tool.readExport(Uint8Array.from([0xc3, 0x28]), 'badutf8', 'utf-8'));
  assert.throws(() => tool.readExport(Uint8Array.from([0x81]), 'undefined', 'windows-1252'), /Udefinert/);
  assert.throws(() => tool.readExport(Buffer.concat([Buffer.from([239, 187, 191]), bytes([row()])]), 'two-boms', 'utf-8'), /BOM/);
});

test('numeric tolerance is inclusive and exact in decimal arithmetic, with signed differences', () => {
  assert.equal(tool.numericDifference('1.0000', '1.0005', 0.0005).within, true);
  assert.equal(tool.numericDifference('1.0000', '1.0005000000000001', 0.0005).within, false);
  assert.equal(tool.numericDifference('1.0000', '0.9995', 0.0005).within, true);
  assert.equal(tool.numericDifference('1.0000', '0.9994999999999999', 0.0005).within, false);
  assert.equal(tool.numericDifference('-1.0000', '-1.0005', 0.0005).delta, -0.0005);
  assert.equal(tool.numericDifference('-0.000', '0', 0).equal, true);
  const base = row('S0001', { LOGALDER: '1.0000', RASCHSKÅR: '1.0000', STANDARDFEIL: '1.0000' });
  const changed = row('S0001', { LOGALDER: '1.0005', RASCHSKÅR: '0.9995', STANDARDFEIL: '1.0006' });
  const result = compare([base], [changed]);
  assert.equal(result.columns[6].within, 1);
  assert.equal(result.columns[10].within, 1);
  assert.equal(result.columns[10].negative, 1);
  assert.equal(result.columns[11].outside, 1);
  assert.equal(result.columns[11].maxAbs, 0.0006);
});

test('formatting, categorical changes, numeric differences, missing cells and missing columns remain distinct', () => {
  const left = row('S0001', { LOGALDER: '1.000', STANDARDFEIL: '', 'NEDRE GRENSE KONF.INT.': '' });
  const right = row('S0001', { LOGALDER: '1', KJØNN: '0', RASCHSKÅR: '0.501', 'MODELLBASERT PERSENTIL': '53', STANDARDFEIL: '', 'NEDRE GRENSE KONF.INT.': '7:0' });
  const result = compare([left], [right]);
  assert.equal(result.columns[6].formatting, 1);
  assert.equal(result.columns[6].maxAbs, 0);
  assert.equal(result.columns[2].outside, 1);
  assert.equal(result.columns[10].outside, 1);
  assert.equal(result.columns[17].outside, 1);
  assert.equal(result.columns[11].bothMissing, 1);
  assert.equal(result.columns[11].maxAbs, null);
  assert.equal(result.columns[15].missingMismatch, 1);
  assert.equal(result.columns[15].unavailable, 0);
  assert.equal(result.groups.find(g => g.variable === 'Vist alder (webb)').anyDifference, 1);
  assert.equal(result.groups.find(g => g.variable === 'Vist alder (webb)').outside, 1);
});

test('invalid numbers, categorical codes, flags and task lengths fail without coercion', () => {
  for (const value of ['NaN', 'Infinity', ' 1.0', '1,000', '1e-3', '']) {
    if (value) assert.throws(() => read([row('S0001', { RASCHSKÅR: value })]), /desimaltall/);
  }
  assert.throws(() => read([row('S0001', { KJØNN: '2' })]), /kjønn/);
  assert.throws(() => read([row('S0001', { MINESTIMERT: 'true' })]), /flagg/);
  assert.throws(() => read([row('S0001', { 'MODELLBASERT PERSENTIL': '101' })]), /persentil/);
  assert.throws(() => read([row('S0001', { STANDARDFEIL: '-0.1' })]), /standardfeil/);
  assert.throws(() => read([row('S0001', { 'OPPGAVESKÅRER': '012' })]), /oppgavetegn/);
});

test('known task marker differences are visible and never normalized away', () => {
  const legacy = row('S0001', { 'OPPGAVESKÅRER': 'd' + '9'.repeat(49) });
  const web = row('S0001', { 'OPPGAVESKÅRER': '9'.repeat(50) });
  const result = tool.compareExports(read([legacy], true), read([web]));
  assert.equal(result.columns[9].outside, 1);
  assert.equal(result.deviations[0].windows[0], 'd');
});

test('pilot has exactly the same 200 IDs and all 13 common fields plus combined notes are exact', () => {
  const windowsBytes = fs.readFileSync(path.join(root, windowsName));
  const webBytes = fs.readFileSync(path.join(root, webName));
  assert.equal(hash(windowsBytes), 'a6c42a05ce55dc79eef19048a20f3670a31f2407756cf6c68844209b4c631d13');
  assert.equal(hash(webBytes), 'fa6975aa48e30687815ece52a962aa5fa89aa69f04e750b4aac65c2604d7e75c');
  const result = tool.compareExports(tool.readExport(windowsBytes, windowsName, 'windows-1252'), tool.readExport(webBytes, webName, 'utf-8'));
  const expected = Array.from({ length: 200 }, (_, i) => `S${String(i + 1).padStart(4, '0')}`);
  assert.deepEqual(result.matched, expected);
  assert.equal(result.windows.rows.size, 200);
  assert.equal(result.web.rows.size, 200);
  assert.deepEqual(result.onlyWindows, []);
  assert.deepEqual(result.onlyWeb, []);
  assert.equal(result.deviations.length, 0);
  assert.equal(result.columns.filter(c => c.compared === 200 && c.exact === 200).length, 13);
  assert.equal(result.combinedNotes.exact, 200);
  const reports = tool.renderReports(result);
  assert.equal(fs.readFileSync(path.join(root, 'pilot-report.md'), 'utf8'), reports.report);
  assert.equal(fs.readFileSync(path.join(root, 'pilot-deviations.tsv'), 'utf8'), reports.deviations);
  assert.equal(fs.readFileSync(path.join(root, 'pilot-summary.json'), 'utf8'), reports.summary);
  // The approved registrations are independently protected by their delivered hashes.
  for (const line of fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trimEnd().split('\n')) {
    const [expectedHash, relative] = line.split('  ');
    assert.equal(hash(fs.readFileSync(path.join(root, relative))), expectedHash);
  }
});

test('CLI writes reproducible reports, refuses invalid inputs, and never overwrites different reports', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nubu-compare-'));
  try {
    const left = path.join(temp, 'left.dat');
    const right = path.join(temp, 'right.txt');
    const prefix = path.join(temp, 'check');
    fs.writeFileSync(left, bytes([row()], true));
    fs.writeFileSync(right, bytes([row()]));
    const cli = path.join(root, 'compare.cjs');
    const run = p => spawnSync(process.execPath, [cli, left, right, '--out', p], { encoding: 'utf8' });
    assert.equal(run(prefix).status, 0);
    const before = fs.readFileSync(`${prefix}-report.md`);
    assert.equal(run(prefix).status, 0);
    assert.deepEqual(fs.readFileSync(`${prefix}-report.md`), before);
    fs.writeFileSync(right, bytes([row('S0001', { RASCHSKÅR: '0.501' })]));
    assert.equal(run(prefix).status, 1);
    assert.deepEqual(fs.readFileSync(`${prefix}-report.md`), before);
    assert.equal(run(path.join(temp, 'different')).status, 2);
    fs.writeFileSync(right, bytes([row(), row()]));
    assert.equal(run(path.join(temp, 'invalid')).status, 1);
    assert.equal(fs.existsSync(path.join(temp, 'invalid-report.md')), false);
  } finally {
    // The freshly created flat test directory contains only disposable test files.
    for (const filename of fs.readdirSync(temp)) fs.unlinkSync(path.join(temp, filename));
    fs.rmdirSync(temp);
  }
});
