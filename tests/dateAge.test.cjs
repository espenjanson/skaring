// Run with node --test tests/*.test.cjs. TypeScript is already a project dependency.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadDomain(name) {
  const source = fs.readFileSync(path.join(__dirname, `../src/domain/${name}.ts`), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  const loaded = { exports: {} }
  new Function('exports', 'module', compiled)(loaded.exports, loaded)
  return loaded.exports
}
const { parseDate, dateAge, manualAgeError, finishManualAge, editRegistrationDate, finishRegistrationDate } = loadDomain('dateAge')
const { createRegistration, copyRegistration, registrationsEqual } = loadDomain('registration')

test('accepted manual ages normalize without leading zeros only when finished', () => {
  for (const [input, expected] of [['04:00', '4:0'], ['004:001', '4:1'], ['010:010', '10:10'], ['020:02', '20:2'], ['09:09', '9:9'], ['18:00', '18:0'], ['001:006', '1:6'], ['099:011', '99:11']]) {
    const data = { ...createRegistration(new Date()), age: input }
    const reference = copyRegistration(data)
    assert.equal(manualAgeError(input), null)
    const normalized = finishManualAge(data)
    assert.equal(normalized.age, expected)
    assert.equal(normalized.ageSource, 'manual')
    assert.equal(reference.age, input)
    assert.equal(registrationsEqual(normalized, reference), false)
    assert.equal(registrationsEqual({ ...normalized, age: input }, reference), true)
  }
})

test('manual age errors preserve the original text, including out-of-range values', () => {
  for (const input of ['01:05', '100:00', '4:12', '4:0012', '4:-1', '4:1.5', '4.0:1', '4:', ':0', ' 4:0', '4:0 ', 'd']) {
    const data = { ...createRegistration(new Date()), age: input }
    assert.ok(manualAgeError(input), input)
    assert.equal(finishManualAge(data), data)
  }
  assert.match(manualAgeError('01:05'), /mellom/)
  assert.match(manualAgeError('4:0012'), /måneder/)
  const empty = createRegistration(new Date())
  assert.equal(finishManualAge(empty), empty)
})

test('manual normalization respects the established age-source transitions', () => {
  const data = { ...createRegistration(new Date(2026, 9, 16)), age: '004:001' }
  const manual = finishManualAge(data)
  assert.equal(manual.age, '4:1')
  const automatic = finishRegistrationDate(editRegistrationDate(manual, 'birthDate', '16.10.22'), 'birthDate')
  assert.equal(automatic.age, '4:0')
  assert.equal(finishManualAge(automatic), automatic)
  const broken = editRegistrationDate(automatic, 'birthDate', 'd')
  assert.equal(broken.age, '')
  assert.equal(finishManualAge({ ...broken, age: '018:000' }).age, '18:0')
})

// Snapshot of the highlighted, commented rows; no Excel or Python dependency is needed to run these tests.
const autoAgeReference = require('./fixtures/autoAge.json')
for (const row of autoAgeReference.cases) {
  test(`automatic age reference ${autoAgeReference.sheet} row ${row.row}: ${row.birthDate}–${row.testDate}`, () => {
    const result = dateAge(row.birthDate, row.testDate)
    assert.equal(result.displayAge, row.displayAge)
    assert.equal(result.exactYears, row.elapsedDays / 365.25)
    assert.equal(result.kind, row.allowed ? 'valid' : 'out-of-range')
  })
}

test('short inputs normalize and two-digit years always mean 2000-2099', () => {
  for (const text of ['5.3.26', '05.3.26', '5.03.2026', '05.03.2026']) {
    assert.equal(parseDate(text).normalized, '05.03.2026')
  }
  for (const [short, full] of [['03', '2003'], ['26', '2026'], ['99', '2099'], ['00', '2000']]) {
    assert.equal(parseDate(`1.1.${short}`).normalized, `01.01.${full}`)
  }
})

test('calendar validation rejects rollover, invalid formats and non-dates', () => {
  assert.equal(parseDate('').kind, 'empty')
  for (const text of ['d', '99.33.2026', '31.04.2026', '29.02.2023', '29.02.1900', '0.1.26', '1.0.26', '1.13.26', '1.1.0000', '1/1/26', '1.1.2', '1.1.026']) {
    assert.equal(parseDate(text).kind, 'invalid', text)
  }
  for (const text of ['29.02.2024', '29.02.2000', '1.1.0001', '1.1.0099']) {
    assert.equal(parseDate(text).kind, 'valid', text)
  }
  assert.equal(parseDate('1.1.0099').normalized, '01.01.0099')
})

test('calendar day differences ignore DST and support the specified exact year formula', () => {
  for (const [birth, testDate] of [['30.03.2024', '31.03.2024'], ['26.10.2024', '27.10.2024']]) {
    assert.equal(dateAge(birth, testDate).exactYears, 1 / 365.25)
  }
  assert.equal(dateAge('28.02.2024', '01.03.2024').exactYears, 2 / 365.25)
  assert.equal(dateAge('d', '19.10.2026').kind, 'invalid-date')
  assert.equal(dateAge('', '19.10.2026').kind, 'missing')
  assert.equal(dateAge('20.10.2026', '19.10.2026').kind, 'reversed')
  assert.equal(dateAge('19.10.2026', '19.10.2026').kind, 'out-of-range')
})

test('display bounds use truncated average months, with no half-month addition', () => {
  function dateAfter(days) {
    const date = new Date(Date.UTC(2000, 0, 1) + days * 86400000)
    return `${date.getUTCDate()}.${date.getUTCMonth() + 1}.${date.getUTCFullYear()}`
  }
  for (const [days, displayAge, kind] of [[547, '1:5', 'out-of-range'], [548, '1:6', 'valid'], [36524, '99:11', 'valid'], [36525, '100:0', 'out-of-range']]) {
    const result = dateAge('01.01.2000', dateAfter(days))
    assert.equal(result.displayAge, displayAge)
    assert.equal(result.kind, kind)
    assert.equal(result.exactYears, days / 365.25)
  }
  assert.equal(dateAge('01.01.2000', '01.01.2004').displayAge, '4:0')
})

test('reference files 302-304 retain their display ages and distinguish exact and manual age', () => {
  for (const id of [302, 303, 304]) {
    const lines = fs.readFileSync(path.join(__dirname, `../docs/reference-tests/datafiler/Test${id}.~Z4`), 'latin1').split(/\r?\n/)
    const data = { ...createRegistration(new Date(2026, 9, 19)), birthDate: lines[2], testDate: lines[3], age: lines[4] }
    const result = finishRegistrationDate(data, 'testDate')
    assert.equal(result.age, '4:0')
    assert.equal(result.ageSource, id === 304 ? 'manual' : 'automatic')
    const calculated = dateAge(data.birthDate, data.testDate)
    if (id === 302) assert.equal(calculated.exactYears, 4)
    if (id === 303) assert.equal(calculated.exactYears, 1491 / 365.25)
    if (id === 304) assert.equal(calculated.kind, 'missing')
  }
})

test('manual ages allow empty text, require whole years and months, and remain unchanged', () => {
  for (const text of ['', '1:6', '4:0', '99:11']) assert.equal(manualAgeError(text), null)
  for (const text of ['d', '4', '4:', '4:12', '4:-1', '-1:6', '1:5', '100:0', '4.5:0']) assert.ok(manualAgeError(text), text)
  const data = { ...createRegistration(new Date()), age: '4:0' }
  assert.equal(finishRegistrationDate(data, 'birthDate').age, '4:0')
})

test('manual-to-automatic transitions replace rather than restore manual text', () => {
  const original = { ...createRegistration(new Date(2026, 9, 16)), age: '7:6' }
  const reference = copyRegistration(original)
  let data = editRegistrationDate(original, 'birthDate', '16.10.22')
  assert.equal(data.age, '7:6')
  data = finishRegistrationDate(data, 'birthDate')
  assert.equal(data.birthDate, '16.10.2022')
  assert.equal(data.age, '4:0')
  assert.equal(data.ageSource, 'automatic')
  assert.equal(editRegistrationDate(data, 'birthDate', data.birthDate), data)
  data = editRegistrationDate(data, 'birthDate', 'd')
  assert.equal(data.age, '')
  assert.equal(data.ageSource, 'manual')
  data = finishRegistrationDate(data, 'birthDate')
  assert.equal(data.birthDate, 'd')
  assert.equal(data.age, '')
  assert.equal(reference.age, '7:6')
  assert.equal(reference.birthDate, '')
  assert.equal(registrationsEqual(original, reference), true)
  assert.equal(registrationsEqual(data, reference), false)
})

test('invalid, reversed and out-of-range dates preserve manual text and never activate automatic mode', () => {
  for (const birthDate of ['d', '99.33.2026', '17.10.2026', '16.10.2026', '16.10.1900', '']) {
    const data = { ...createRegistration(new Date(2026, 9, 16)), birthDate, age: '7:6' }
    const result = finishRegistrationDate(data, 'birthDate')
    assert.equal(result.ageSource, 'manual', birthDate)
    assert.equal(result.age, '7:6', birthDate)
  }
})

test('restoring dates restores content comparison, and clearing does not mutate a reference', () => {
  const initial = createRegistration(new Date(2026, 9, 16))
  const reference = copyRegistration(initial)
  let data = finishRegistrationDate(editRegistrationDate(initial, 'birthDate', '16.10.22'), 'birthDate')
  data = finishRegistrationDate(editRegistrationDate(data, 'birthDate', ''), 'birthDate')
  assert.equal(registrationsEqual(data, reference), true)
  assert.equal(registrationsEqual({ ...reference, ageSource: 'automatic' }, reference), true)
  const cleared = createRegistration(new Date(2026, 9, 17))
  assert.equal(reference.testDate, '16.10.2026')
  assert.equal(cleared.testDate, '17.10.2026')
  assert.equal(cleared.ageSource, 'manual')
})
