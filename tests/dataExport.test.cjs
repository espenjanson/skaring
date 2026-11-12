const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { buildDataExport, exportHeaders, exportErrorMessage } = loadTypeScript('file/dataExport.ts')
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts')
const { decodeWindows1252 } = loadTypeScript('file/windows1252.ts')
const directory = path.join(__dirname, '../docs/reference-tests/datafiler')
const negativeFixture = path.join(directory, 'Undantagna/Test399.~Z4')
const windowsRows = decodeWindows1252(fs.readFileSync(path.join(__dirname, '../docs/reference-tests/rapporter/261111 Dataexport.txt'))).text.split('\r\n').filter(Boolean).slice(1).map(row => row.split('\t'))
function file(name, bytes = fs.readFileSync(name === 'Test399.~Z4' ? negativeFixture : path.join(directory, name)), relative = `Kilde/${name}`) {
  return { name, webkitRelativePath: relative, arrayBuffer: async () => Uint8Array.from(bytes).buffer }
}
const validFiles = () => windowsRows.map(row => file(row[0]))
function rows(result) {
  assert.equal(result.kind, 'ready')
  assert.deepEqual([...result.bytes.slice(0, 3)], [239, 187, 191])
  const text = new TextDecoder().decode(result.bytes)
  assert.ok(text.endsWith('\r\n'))
  assert.equal(text.replaceAll('\r\n', '').includes('\n'), false)
  return text.slice(0, -2).split('\r\n').map(row => row.split('\t'))
}
function altered(patch, name = 'Endret.~Z4') {
  const original = parseNubu100(fs.readFileSync(path.join(directory, 'Test201_100.~Z4'))).record
  const encoded = serializeNubu100({ ...original, ...patch })
  assert.equal(encoded.ok, true)
  return file(name, encoded.bytes)
}

test('14 references: exact schema, encoding, precision and explicit Windows improvements', async () => {
  const before = validFiles().map(f => fs.readFileSync(path.join(directory, f.name)))
  const result = await buildDataExport(validFiles().reverse())
  assert.equal(result.kind, 'ready', JSON.stringify(result))
  assert.equal(result.count, 14)
  const output = rows(result)
  assert.equal(output.length, 15)
  assert.deepEqual(output[0], [ 'FILNAVN', 'NAVN', 'KJØNN', 'FØDSELSDATO', 'TESTDATO', 'VIST ALDER', 'LOGALDER', 'MERKNAD', 'MERKNAD 2', 'OPPGAVESKÅRER', 'RASCHSKÅRE', 'STANDARDFEIL', 'MINESTIMERT', 'MAKSESTIMERT', 'ALDERSEKVIVALENT', 'NEDRE GRENSE KONF.INT.', 'ØVRE GRENSE KONF.INT.', 'MODELLBASERT PERSENTIL' ])
  assert.equal(exportHeaders.length, 18)
  const newLogs = { Test201_100: '2.325', Test302: '1.386', Test303: '1.407', Test304: '1.397', Test401: '1.386', Test402: '2.890', Test403: '2.888' }
  for (const row of output.slice(1)) {
    assert.equal(row.length, 18)
    const old = windowsRows.find(r => r[0] === row[0])
    const original = parseNubu100(fs.readFileSync(path.join(directory, row[0]))).record
    assert.deepEqual(row.slice(0, 3), old.slice(0, 3))
    assert.deepEqual(row.slice(3, 6), [original.birthDate, original.testDate, original.age])
    assert.equal(row[6], newLogs[row[0].split('.')[0]] ?? old[3])
    assert.deepEqual(row.slice(7, 9), [original.note, original.note2].map(text => text.replace(/"/g, "'")))
    assert.match(row[9], /^"[0129]{50}"$/)
    assert.equal(row[9], '"' + old[5].slice(1, -1).replace(/[^012]/g, '9') + '"')
    assert.deepEqual(row.slice(10), old.slice(6))
  }
  assert.equal(output.find(r => r[0] === 'Test209.~Z4')[17], '')
  assert.equal(output.find(r => r[0] === 'Test403.~Z4')[2], '9')
  for (const [i, f] of validFiles().entries()) assert.deepEqual(fs.readFileSync(path.join(directory, f.name)), before[i])
})

test('Test399 is readable but aborts export at its filename before later files are read', async () => {
  const bytes = fs.readFileSync(negativeFixture)
  assert.equal(parseNubu100(bytes).kind, 'known-format')
  let laterRead = false
  const result = await buildDataExport([...validFiles(), file('Test399.~Z4'), { name: 'ZZZ', webkitRelativePath: 'Kilde/ZZZ', arrayBuffer: async () => { laterRead = true; throw Error() } }])
  assert.equal(result.kind, 'error')
  assert.equal(result.fileName, 'Test399.~Z4')
  assert.match(result.reason, /tre gyldige oppgaveskårer/)
  assert.equal('bytes' in result, false)
  assert.equal(laterRead, false)
  assert.equal(exportErrorMessage(result.fileName, result.reason), `Dataeksporten ble avbrutt. Filen «Test399.~Z4» kunne ikke behandles: ${result.reason}. Rett problemet og prøv igjen. Ingen eksportfil er lastet ned.`)
})

test('quotes are replaced only in export, whitespace and original characters survive in registration', async () => {
  const f = altered({ name: '  "Navn"  ', note: '"En" ', note2: ' "To"' }, '"Fil".~Z4')
  const originalBytes = new Uint8Array(await f.arrayBuffer())
  const out = rows(await buildDataExport([f]))[1]
  assert.equal(out[0], "'Fil'.~Z4")
  assert.equal(out[1], "  'Navn'  ")
  assert.deepEqual(out.slice(7, 9), ["'En' ", " 'To'"])
  assert.equal(out[9][1], '9')
  assert.deepEqual(new Uint8Array(await f.arrayBuffer()), originalBytes)
  assert.equal(parseNubu100(originalBytes).record.items[0], 'd')
})

test('manual spelling matches opening the file; valid dates override stale stored age', async () => {
  const manual = rows(await buildDataExport([altered({birthDate: '', age: '04:00'})]))[1]
  assert.equal(manual[5], '04:00')
  assert.equal(manual[6], '1.397')
  const automatic = rows(await buildDataExport([altered({age: '17:11'})]))[1]
  assert.equal(automatic[5], '10:2')
  assert.equal(automatic[6], '2.325')
})

test('only root files, any extension, deterministic case-insensitive sort and sequential reads', async () => {
  const data = await validFiles()[0].arrayBuffer()
  const seen = []; let active = 0
  const files = ['b', 'a', 'B', 'A'].map(name => ({ name, webkitRelativePath: `Mappe/${name}`, arrayBuffer: async () => {
    active++; assert.equal(active, 1); seen.push(name); await Promise.resolve(); active--; return data
  } }))
  files.push({ name: 'bad', webkitRelativePath: 'Mappe/Under/bad', arrayBuffer: async () => { throw Error('Must ignore subdirectories') } })
  const out = rows(await buildDataExport(files))
  assert.deepEqual(seen, ['A', 'a', 'B', 'b'])
  assert.deepEqual(out.slice(1).map(r => r[0]), seen)
})

test('empty, nested-only and cancellation return no export bytes; repeat is identical', async () => {
  assert.deepEqual(await buildDataExport([]), { kind: 'empty' })
  assert.deepEqual(await buildDataExport([file('Test399.~Z4', undefined, 'Mappe/Under/Test399.~Z4')]), { kind: 'empty' })
  let stop = false
  const f = validFiles()[0]
  const cancelled = { ...f, arrayBuffer: async () => { stop = true; return f.arrayBuffer() } }
  assert.deepEqual(await buildDataExport([cancelled], () => stop), { kind: 'cancelled' })
  assert.deepEqual(await buildDataExport(validFiles()), await buildDataExport(validFiles()))
})

for (const [label, patch] of [
  ['bad birth date', {birthDate: '31.02.2020'}], ['bad test date', {testDate: 'feil'}],
  ['reversed dates', {birthDate: '12.10.2027'}], ['out of range', {birthDate: '12.10.2026'}],
  ['bad manual age', {birthDate: '', age: '4:12'}],
]) test(label + ' stops export', async () => {
  const result = await buildDataExport([altered(patch)])
  assert.equal(result.kind, 'error'); assert.equal('bytes' in result, false)
})

for (const [label, bytes] of [
  ['unrelated file', Buffer.from('not a registration')],
  ['unknown identifier', fs.readFileSync(path.join(directory, 'Test403.~Z4')).toString('latin1').replace('NUBUMotor_100', 'NUBUMotor_101')],
  ['tab in name', fs.readFileSync(path.join(directory, 'Test403.~Z4')).toString('latin1').replace('Neutrum', 'Neu\ttrum')],
  ['newline in note', fs.readFileSync(path.join(directory, 'Test403.~Z4')).toString('latin1').split('\r\n').map((line, index) => index === 5 ? line + '\n' : line).join('\r\n')],
  ['UTF8 BOM', Buffer.concat([Buffer.from([239,187,191]), fs.readFileSync(path.join(directory, 'Test403.~Z4'))])],
]) test(label + ' stops export', async () => {
  const result = await buildDataExport([file('Problem', typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : bytes)])
  assert.equal(result.kind, 'error'); assert.equal(result.fileName, 'Problem'); assert.equal('bytes' in result, false)
})

test('read errors and delimiters in filenames identify the failing file', async () => {
  for (const name of ['Bad\tname', 'Bad\nname']) assert.equal((await buildDataExport([altered({}, name)])).kind, 'error')
  const f = { name: 'Unreadable', webkitRelativePath: 'Mappe/Unreadable', arrayBuffer: async () => { throw Error('private error') } }
  assert.deepEqual(await buildDataExport([f]), {kind: 'error', fileName: 'Unreadable', reason: 'Filen kunne ikke leses'})
})
