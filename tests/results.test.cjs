const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { calculateResult, initialResultSettings, insufficientResultMessage } = loadTypeScript('domain/results.ts')
const { createRegistration, registrationsEqual } = loadTypeScript('domain/registration.ts')
const { FileWorkflow } = loadTypeScript('domain/fileWorkflow.ts')
const references = require('./fixtures/calculationReferences.json')
function dataFor(fixture) {
  return { ...createRegistration(new Date(2026, 10, 3)), ...fixture.registration, age: fixture.registration.displayAge, items: [...fixture.registration.items] }
}

for (const fixture of references.cases) {
  test(`result adapter ${fixture.id}: local typed output matches verified references`, () => {
    const data = dataFor(fixture)
    const before = JSON.stringify(data)
    const result = calculateResult(data, { ...initialResultSettings(), showRasch: true })
    assert.equal(result.kind, 'available')
    assert.equal(result.canPrint, true)
    assert.equal(result.validCount, fixture.export.validCount)
    assert.equal(result.rawScore, fixture.export.rawScore)
    assert.equal(result.ageEquivalent, fixture.export.ageEquivalent)
    assert.equal(result.modelPercentile.kind, fixture.export.modelPercentile.status === 'available' ? 'available' : 'not-computable')
    if (result.modelPercentile.kind === 'available') assert.equal(result.modelPercentile.value, fixture.export.modelPercentile.value)
    assert.equal(result.confidenceInterval.kind, fixture.export.confidenceInterval.status)
    if (result.confidenceInterval.kind === 'available') {
      assert.equal(result.confidenceInterval.lower, fixture.export.confidenceInterval.lower)
      assert.equal(result.confidenceInterval.upper, fixture.export.confidenceInterval.upper)
    }
    assert.ok(Math.abs(Number(result.rasch.estimate) - fixture.export.rasch) <= 0.0055)
    if (fixture.export.minEstimated || fixture.export.maxEstimated) assert.equal(result.rasch.standardError, null)
    else assert.ok(Math.abs(Number(result.rasch.standardError) - fixture.export.standardError) <= 0.0055)
    const hidden = calculateResult(data, initialResultSettings())
    assert.equal(hidden.rasch, null)
    assert.deepEqual({ ...hidden, rasch: result.rasch, report: result.report }, result)
    assert.equal(JSON.stringify(data), before)
  })
}

test('invalid calculations expose only a message and never retain printable values', () => {
  const data = dataFor(references.cases[0])
  assert.equal(calculateResult(data, initialResultSettings()).kind, 'available')
  for (const count of [0, 1, 2]) {
    const items = Array(50).fill('')
    for (let index = 0; index < count; index++) items[index] = String(index)
    assert.deepEqual(calculateResult({ ...data, items }, initialResultSettings()), {
      kind: 'unavailable', canPrint: false, message: insufficientResultMessage,
    })
  }
  const empty = calculateResult(data, { areas: [], showRasch: true })
  assert.deepEqual(empty, { kind: 'unavailable', canPrint: false, message: 'Velg minst ett område for å vise resultat.' })
  const malformed = calculateResult({ ...data, items: [] }, initialResultSettings())
  assert.equal(malformed.kind, 'unavailable')
  assert.equal(malformed.canPrint, false)
  assert.notEqual(malformed.message, insufficientResultMessage)
  assert.equal(calculateResult(data, initialResultSettings()).kind, 'available')
})

test('settings are independent of registration and file workflow status', () => {
  const workflow = new FileWorkflow()
  const data = dataFor(references.cases.find(row => row.id === '208'))
  workflow.edit(data)
  const before = workflow.getSnapshot()
  for (const settings of [initialResultSettings(), { areas: ['A'], showRasch: false }, { areas: ['C', 'D'], showRasch: true }, { areas: [], showRasch: true }]) {
    const result = calculateResult(before.current, settings)
    if (settings.areas.includes('C')) {
      assert.equal(result.kind, 'available')
      assert.equal(result.validCount, 7)
    } else assert.equal(result.kind, 'unavailable')
    const after = workflow.getSnapshot()
    assert.ok(registrationsEqual(before.current, after.current))
    assert.deepEqual(after, before)
  }
})

test('default settings are independent values and never shared mutable state', () => {
  const first = initialResultSettings()
  const second = initialResultSettings()
  first.areas.pop()
  first.showRasch = true
  assert.deepEqual(second, { areas: [...'ABCDE'], showRasch: false })
})
