// Run with node --test tests/registration.test.cjs; no additional packages are needed.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../src/domain/registration.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText
const loaded = { exports: {} }
new Function('exports', 'module', compiled)(loaded.exports, loaded)
const { createRegistration, copyRegistration, registrationsEqual, registrationStatus, itemLabels, singleLine, isItemCharacter } = loaded.exports

test('status uses content comparison and file lifecycle independently', () => {
  const data = createRegistration(new Date(2026, 9, 19))
  const reference = copyRegistration(data)
  assert.equal(registrationStatus(data, reference, { kind: 'new' }), 'Ingen ulagrede endringer')
  assert.equal(registrationStatus(data, reference, { kind: 'saved' }), 'Endringer lagret')
  const changed = { ...data, note: 'changed' }
  for (const kind of ['new', 'saved']) {
    assert.equal(registrationStatus(changed, reference, { kind }), 'Ulagrede endringer')
  }
  assert.equal(registrationStatus({ ...changed, note: '' }, reference, { kind: 'new' }), 'Ingen ulagrede endringer')
})

test('new registration has local date, no gender and exactly 50 empty items', () => {
  const data = createRegistration(new Date(2026, 9, 19, 0, 15))
  assert.equal(data.testDate, '19.10.2026')
  assert.equal(data.gender, null)
  assert.equal(data.items.length, 50)
  assert.ok(data.items.every(value => value === ''))
  assert.equal(new Set(itemLabels).size, 50)
  assert.deepEqual([itemLabels[0], itemLabels[9], itemLabels[10], itemLabels[49]], ['A1', 'A10', 'B1', 'E10'])
})
test('reference stays unchanged and restored edits clear dirty status', () => {
  const data = createRegistration(new Date(2026, 9, 19))
  const reference = copyRegistration(data)
  assert.notEqual(data.items, reference.items)
  for (const field of ['name', 'note', 'note2', 'birthDate', 'testDate', 'age', 'gender']) {
    assert.equal(registrationsEqual({ ...data, [field]: field === 'gender' ? 'gutt' : 'changed' }, reference), false)
  }
  for (let index = 0; index < 50; index++) {
    data.items[index] = 'd'
    assert.equal(reference.items[index], '')
    assert.equal(registrationsEqual(data, reference), false)
    data.items[index] = ''
    assert.equal(registrationsEqual(data, reference), true)
  }
  assert.throws(() => copyRegistration({ ...data, items: [] }))
})
test('single-line fields remove controls; item characters preserve non-score markers', () => {
  assert.equal(singleLine('Navn\r\nMerknad\t\u2028'), 'NavnMerknad')
  for (const value of ['0', '1', '2', 'd', '9', '*', 'ø', '€', ' ']) assert.equal(isItemCharacter(value), true)
  for (const value of ['\n', '\t', '😀', 'ab', '漢']) assert.equal(isItemCharacter(value), false)
})
