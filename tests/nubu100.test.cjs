// These tests cover file structure only; age normalization belongs to a later stage.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts')
const { encodeWindows1252 } = loadTypeScript('file/windows1252.ts')

function validLines() {
  return ['Navn', 'false false', '', '22.10.2026', '', 'Merknad', 'Merknad 2', '*'.repeat(50), 'NUBUMotor_100']
}
function fileBytes(lines = validLines(), ending = '\r\n') {
  const encoded = encodeWindows1252(lines.join('\r\n') + ending)
  assert.equal(encoded.ok, true)
  return encoded.bytes
}
function record() {
  const parsed = parseNubu100(fileBytes())
  assert.equal(parsed.kind, 'known-format')
  return parsed.record
}
function expectError(bytes, code, field) {
  const snapshot = bytes.slice()
  const result = parseNubu100(bytes)
  assert.equal(result.kind, 'error')
  assert.equal(result.error.code, code)
  if (field) assert.equal(result.error.field, field)
  assert.equal('record' in result, false)
  assert.deepEqual(bytes, snapshot)
  return result.error
}

const fixturesPath = path.join(__dirname, '../docs/reference-tests/datafiler')
const fixtureNames = fs.readdirSync(fixturesPath).filter(name => name.endsWith('.~Z4')).sort()
test('reference file coverage includes all eleven files', () => assert.equal(fixtureNames.length, 11))
for (const name of fixtureNames) {
  test(`reference file is byte-identical after reading and writing: ${name}`, () => {
    const bytes = fs.readFileSync(path.join(fixturesPath, name))
    const snapshot = Buffer.from(bytes)
    const parsed = parseNubu100(bytes)
    assert.equal(parsed.kind, 'known-format')
    // Use an independent decoder to verify every stored field before serialization.
    const lines = new TextDecoder('windows-1252').decode(bytes).split('\r\n')
    assert.deepEqual(parsed.record, {
      name: lines[0], gender: lines[1] === 'true false' ? 'gutt' : lines[1] === 'false true' ? 'jente' : null,
      birthDate: lines[2], testDate: lines[3], age: lines[4], note: lines[5], note2: lines[6],
      items: Array.from(lines[7], character => character === '*' ? '' : character),
    })
    const serialized = serializeNubu100(parsed.record)
    assert.equal(serialized.ok, true)
    assert.deepEqual(Buffer.from(serialized.bytes), bytes)
    assert.deepEqual(bytes, snapshot)
  })
}

test('serialization has nine lines in the specified order, final CRLF, and no BOM', () => {
  const data = { ...record(), name: 'ÅÆØåæø ÄÖäö', birthDate: 'født', testDate: 'test', age: '004:001', note: 'ett €', note2: 'två —' }
  data.items = Array.from({ length: 50 }, (_, index) => String.fromCharCode(0x21 + index))
  const serialized = serializeNubu100(data)
  assert.equal(serialized.ok, true)
  const expected = [data.name, 'false false', 'født', 'test', '004:001', 'ett €', 'två —', data.items.join(''), 'NUBUMotor_100']
  const decoded = new TextDecoder('windows-1252').decode(serialized.bytes)
  assert.deepEqual(decoded.split('\r\n'), [...expected, ''])
  assert.equal(decoded.replace(/\r\n/g, '').includes('\n'), false)
  assert.equal(serialized.bytes[0], 0xc5)
  const parsed = parseNubu100(serialized.bytes)
  assert.equal(parsed.kind, 'known-format')
  assert.equal(parsed.record.age, '004:001')
  for (let index = 0; index < 50; index++) {
    assert.equal(parsed.record.items[index], data.items[index] === '*' ? '' : data.items[index])
  }
})

test('all three permitted gender combinations have exact spellings', () => {
  for (const [text, gender] of [['true false', 'gutt'], ['false true', 'jente'], ['false false', null]]) {
    const lines = validLines()
    lines[1] = text
    const parsed = parseNubu100(fileBytes(lines))
    assert.equal(parsed.kind, 'known-format')
    assert.equal(parsed.record.gender, gender)
    assert.deepEqual(serializeNubu100(parsed.record).bytes, fileBytes(lines))
  }
  for (const text of ['', 'true true', 'falsefalse', 'True False', 'true  false', 'true false ']) {
    const lines = validLines()
    lines[1] = text
    expectError(fileBytes(lines), 'invalid-gender', 'gender')
  }
})

test('empty items, literal asterisks, spaces and non-score markers retain their positions', () => {
  const data = record()
  const symbols = ['', '*', ' ', '0', '1', '2', 'd', '9', 'ø', '€']
  data.items = Array.from({ length: 50 }, (_, index) => symbols[index % symbols.length])
  const serialized = serializeNubu100(data)
  assert.equal(serialized.ok, true)
  assert.equal(new TextDecoder('windows-1252').decode(serialized.bytes).split('\r\n')[7], symbols.map(s => s || '*').join('').repeat(5))
  const parsed = parseNubu100(serialized.bytes)
  assert.deepEqual(parsed.record.items, data.items.map(s => s === '*' ? '' : s))
})

test('format parsing preserves empty text, whitespace, invalid dates and stored ages without validation', () => {
  const lines = validLines()
  lines[0] = '  Navn  '
  lines[2] = '31.02.2026'
  lines[3] = '1.1.20'
  lines[4] = '999:99'
  lines[5] = ''
  lines[6] = ' '
  const parsed = parseNubu100(fileBytes(lines))
  assert.equal(parsed.kind, 'known-format')
  assert.equal(parsed.record.name, lines[0])
  assert.equal(parsed.record.birthDate, lines[2])
  assert.equal(parsed.record.testDate, lines[3])
  assert.equal(parsed.record.age, lines[4])
  assert.equal(parsed.record.note, '')
  assert.equal(parsed.record.note2, ' ')
  assert.deepEqual(serializeNubu100(parsed.record).bytes, fileBytes(lines))
  lines[2] = '16.10.2022'
  lines[3] = '16.10.2026'
  lines[4] = '7:6'
  assert.equal(parseNubu100(fileBytes(lines)).record.age, '7:6')
})

test('missing ordinary rows, missing identifiers and incorrect item lengths are errors', () => {
  expectError(new Uint8Array(), 'missing-lines')
  for (let count = 1; count < 9; count++) {
    const lines = validLines().slice(0, count)
    const result = parseNubu100(fileBytes(lines))
    assert.equal(result.kind, 'error')
    assert.equal('record' in result, false)
  }
  for (const identifier of ['', ' ']) {
    const lines = validLines()
    lines[8] = identifier
    expectError(fileBytes(lines), 'missing-identifier', 'identifier')
  }
  for (const length of [0, 49, 51]) {
    const lines = validLines()
    lines[7] = '*'.repeat(length)
    assert.equal(expectError(fileBytes(lines), 'invalid-item-count', 'items').actual, length)
  }
})

test('unknown identifiers including _101 return a candidate without authorizing opening', () => {
  for (const identifier of ['NUBUMotor_101', 'OtherFormat', 'NUBUMotor_100 ']) {
    const lines = validLines()
    lines[8] = identifier
    const parsed = parseNubu100(fileBytes(lines))
    assert.equal(parsed.kind, 'unknown-identifier')
    assert.equal(parsed.identifier, identifier)
    assert.deepEqual(parsed.record, record())
    assert.deepEqual(serializeNubu100(parsed.record).bytes, fileBytes())
    lines[7] = '*'.repeat(49)
    expectError(fileBytes(lines), 'invalid-item-count', 'items')
  }
})

test('missing final CRLF and arbitrary content after row nine are tolerated and canonicalized', () => {
  const canonical = fileBytes()
  const cases = [fileBytes(validLines(), ''), fileBytes([...validLines(), '', '', 'extra']),
    Uint8Array.from([...canonical, 0x81, 0, 0x0a, 0xff])]
  for (const bytes of cases) {
    const parsed = parseNubu100(bytes)
    assert.equal(parsed.kind, 'known-format')
    assert.deepEqual(parsed.record, record())
    assert.deepEqual(serializeNubu100(parsed.record).bytes, canonical)
  }
})

test('LF-only files, Unicode BOMs and bare line controls are rejected', () => {
  expectError(encodeWindows1252(validLines().join('\n')).bytes, 'missing-lines')
  for (const prefix of [[0xef, 0xbb, 0xbf], [0xff, 0xfe], [0xfe, 0xff], [0xff, 0xfe, 0, 0], [0, 0, 0xfe, 0xff]]) {
    expectError(Uint8Array.from([...prefix, ...fileBytes()]), 'unsupported-bom')
  }
  for (const control of [...Array.from({ length: 32 }, (_, i) => i), 0x7f]) {
    for (let fieldIndex = 0; fieldIndex < 9; fieldIndex++) {
      const lines = validLines()
      lines[fieldIndex] += String.fromCharCode(control)
      const error = expectError(fileBytes(lines), 'control-character')
      assert.equal(error.character, String.fromCharCode(control))
    }
  }
})

test('unassigned Windows-1252 bytes in any ordinary field reject the entire record', () => {
  for (const byte of [0x81, 0x8d, 0x8f, 0x90, 0x9d]) {
    for (let fieldIndex = 0; fieldIndex < 9; fieldIndex++) {
      const lines = validLines()
      lines[fieldIndex] = '#' + lines[fieldIndex]
      const bytes = fileBytes(lines)
      const offset = lines.slice(0, fieldIndex).reduce((sum, line) => sum + line.length + 2, 0)
      bytes[offset] = byte
      const error = expectError(bytes, 'unassigned-byte')
      assert.equal(error.byte, byte)
      assert.equal(error.index, 0)
    }
  }
})

test('serialization reports the field and unrepresentable character without modifying the record', () => {
  for (const field of ['name', 'birthDate', 'testDate', 'age', 'note', 'note2']) {
    for (const character of ['😀', '漢', '\u030a']) {
      const data = { ...record(), [field]: 'x' + character }
      Object.freeze(data.items)
      Object.freeze(data)
      const snapshot = JSON.stringify(data)
      const result = serializeNubu100(data)
      assert.deepEqual(result, { ok: false, error: { code: 'unrepresentable-character', field, character, index: 1 } })
      assert.equal('bytes' in result, false)
      assert.equal(JSON.stringify(data), snapshot)
    }
  }
  const data = record()
  data.items[49] = '😀'
  assert.deepEqual(serializeNubu100(data), {
    ok: false, error: { code: 'unrepresentable-character', field: 'items', character: '😀', index: 0, itemIndex: 49 },
  })
})

test('serialization rejects controls, malformed fields and malformed item arrays without partial output', () => {
  const cases = [
    [{ ...record(), gender: 'both' }, 'invalid-gender'],
    [{ ...record(), name: undefined }, 'invalid-field'],
    [{ ...record(), items: undefined }, 'invalid-field'],
    [{ ...record(), items: Array(49).fill('') }, 'invalid-item-count'],
    [{ ...record(), items: Array(51).fill('') }, 'invalid-item-count'],
    [{ ...record(), items: Array(50) }, 'invalid-item'],
    [{ ...record(), items: [...Array(49).fill(''), 'ab'] }, 'invalid-item'],
  ]
  for (const field of ['name', 'birthDate', 'testDate', 'age', 'note', 'note2']) {
    for (const character of ['\r', '\n', '\t', '\0', '\x7f', '\u2028', '\u2029']) {
      cases.push([{ ...record(), [field]: character }, 'control-character'])
    }
  }
  cases.push([{ ...record(), items: [...Array(49).fill(''), '\n'] }, 'control-character'])
  for (const [data, code] of cases) {
    const snapshot = structuredClone(data)
    const result = serializeNubu100(data)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, code)
    assert.equal('bytes' in result, false)
    assert.deepEqual(data, snapshot)
  }
  const data = record()
  Object.freeze(data.items)
  Object.freeze(data)
  assert.equal(serializeNubu100(data).ok, true)
})
