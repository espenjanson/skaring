const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const references = require('./fixtures/calculationReferences.json')

// The legacy class imports fs for unrelated file methods. No file methods run here.
const source = fs.readFileSync(path.join(__dirname, '../src/api/skaring.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText
const loaded = { exports: {} }
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, name => {
  assert.equal(name, 'fs')
  return { readFileSync() { throw new Error('Unexpected legacy file access') }, writeFileSync() { throw new Error('Unexpected legacy file access') } }
})
const { Skaring } = loaded.exports
const allAreas = [...'ABCDE']
const registration = text => ({ items: [...text.padEnd(50, '*')] })
const calculate = (engine, data, areas = allAreas) => engine.calculateRegistration({ items: [...data.items] }, areas)
function close(actual, expected, tolerance) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance + 1e-12,
    `${actual} differs from ${expected} by more than ${tolerance}`)
}
function state(engine) {
  return [engine.gResult, engine.gMeasure, engine.gSE, engine.gNValid, engine.gIsMinEstimated, engine.gIsMaxEstimated]
}
function assertCleared(engine, code) {
  assert.equal(engine.gResult, code)
  assert.equal(engine.gMeasure, -9999)
  assert.equal(engine.gSE, -9999)
  assert.equal(engine.gIsMinEstimated, false)
  assert.equal(engine.gIsMaxEstimated, false)
}

// Keep the first four cases in the project owner's requested verification order.
const order = ['201', '202', '206', '207', '205', '208', '209', '301', '302', '303', '304']
for (const id of order) {
  const fixture = references.cases.find(row => row.id === id)
  test(`Windows export ${id}: Rasch, SE and flags`, () => {
    const engine = new Skaring()
    const before = JSON.stringify(fixture.registration)
    assert.equal(calculate(engine, fixture.registration), -10000)
    assert.equal(engine.gNValid, fixture.export.validCount)
    assert.equal([...engine.gRawItemScoreString].filter(c => '012'.includes(c)).reduce((sum, c) => sum + Number(c), 0), fixture.export.rawScore)
    assert.equal(engine.gRawItemScoreString, [...fixture.export.scoreString].map(c => '012'.includes(c) ? c : '9').join(''))
    close(engine.gMeasure, fixture.export.rasch, 0.0005)
    close(engine.gSE, fixture.export.standardError, 0.0005)
    assert.equal(engine.gIsMinEstimated, fixture.export.minEstimated)
    assert.equal(engine.gIsMaxEstimated, fixture.export.maxEstimated)
    assert.equal(engine.estimateToPresentText(engine.gMeasure), fixture.export.ageEquivalent)
    assert.equal(JSON.stringify(fixture.registration), before)
  })
  for (const report of fixture.reports) {
    test(`Windows PDF ${report.source}: selection and presentation`, () => {
      const engine = new Skaring()
      assert.equal(calculate(engine, fixture.registration, report.areas), -10000)
      assert.equal(engine.gNValid, report.validCount)
      assert.equal([...engine.gRawItemScoreString].filter(c => '012'.includes(c)).reduce((sum, c) => sum + Number(c), 0), report.rawScore)
      if (report.rasch.status === 'available') close(engine.gMeasure, report.rasch.value, 0.005)
      if (report.standardError.status === 'available') close(engine.gSE, report.standardError.value, 0.005)
      assert.equal(engine.estimateToPresentText(engine.gMeasure), report.ageEquivalent)
      const extreme = engine.gIsMinEstimated || engine.gIsMaxEstimated
      assert.equal(extreme, report.confidenceInterval.status === 'not-computable')
      if (!extreme) {
        assert.equal(engine.estimateToPresentText(engine.gMeasure - 1.96 * engine.gSE), report.confidenceInterval.lower)
        assert.equal(engine.estimateToPresentText(engine.gMeasure + 1.96 * engine.gSE), report.confidenceInterval.upper)
      }
      assert.equal(report.actualPercentileCategories.length, 10)
      const lines = engine.aldersgruppepersentilerFraEstimat(engine.gMeasure).split('\n').filter(line => /^\d/.test(line))
      const categories = lines.map(line => Math.floor((line.indexOf('X') - 17) / 12) + 1)
      assert.deepEqual(categories, report.actualPercentileCategories)
    })
  }
}

test('kernel enforces zero, one, two and three valid scores without presentation', () => {
  const engine = new Skaring()
  for (let count = 0; count <= 3; count++) {
    assert.equal(engine.raschMeasureFromItems('012'.slice(0, count).padEnd(50, '*')),
      count === 0 ? -10001 : count < 3 ? -10004 : -10000)
    assert.equal(engine.gNValid, count)
    if (count < 3) assertCleared(engine, count === 0 ? -10001 : -10004)
  }
})

test('every area uses its own ten positions and zero-based eligibility', () => {
  const engine = new Skaring()
  const items = [...'012*******'.repeat(5)]
  for (let area = 0; area < 5; area++) {
    assert.equal(engine.calculateRegistration({ items }, [allAreas[area]]), -10000)
    assert.equal(engine.gRawItemScoreString, '9'.repeat(area * 10) + '0129999999' + '9'.repeat((4 - area) * 10))
    assert.deepEqual(engine.gIsValidAE, [true, true, true, true, true])
  }
})

test('combined selections count scores across areas, allowing empty selected areas', () => {
  const engine = new Skaring()
  const items = Array(50).fill('*')
  items[0] = '0'; items[10] = '1'; items[20] = '2'
  assert.equal(engine.calculateRegistration({ items }, ['A', 'B']), -10004)
  assert.equal(engine.calculateRegistration({ items }, ['A', 'B', 'C']), -10000)
  assert.deepEqual(engine.gIsValidAE, [false, false, false, false, false])
  const expected = state(engine)
  assert.equal(engine.calculateRegistration({ items }, ['A', 'B', 'C', 'D', 'E']), -10000)
  assert.deepEqual(state(engine), expected)
  assert.equal(engine.calculateRegistration({ items }, []), -10005)
  assertCleared(engine, -10005)
})

test('excluded scores cannot affect estimates; changing selection revalidates', () => {
  const engine = new Skaring()
  const items = [...'012*******'.padEnd(50, '2')]
  assert.equal(engine.calculateRegistration({ items }, ['A']), -10000)
  const expected = state(engine)
  items.fill('0', 10)
  assert.equal(engine.calculateRegistration({ items }, ['A', 'A']), -10000)
  assert.deepEqual(state(engine), expected)
  items.fill('*', 10)
  assert.equal(engine.calculateRegistration({ items }, ['B']), -10001)
  assertCleared(engine, -10001)
  assert.equal(engine.calculateRegistration({ items }, ['A', 'B']), -10000)
  assert.deepEqual(state(engine), expected)
})

test('success, extreme, rejection and success do not leak previous state', () => {
  const engine = new Skaring()
  const data = references.cases.find(row => row.id === '201').registration
  calculate(engine, data)
  const expected = state(engine)
  for (const input of ['0'.repeat(50), '2'.repeat(50), '*'.repeat(50), '01'.padEnd(50, '*')]) {
    engine.raschMeasureFromItems(input)
    calculate(engine, data)
    assert.deepEqual(state(engine), expected)
  }
  engine.raschMeasureFromItems('012')
  assertCleared(engine, -10003)
  assert.equal(calculate(engine, data, ['Z']), -10005)
  assertCleared(engine, -10005)
  assert.equal(engine.calculateRegistration({ items: [] }), -10003)
  assertCleared(engine, -10003)
})

test('nonconvergence clears results and flags', () => {
  const engine = new Skaring()
  calculate(engine, references.cases[0].registration)
  engine.aItemDifficulties.fill(NaN)
  assert.equal(engine.raschMeasureFromItems('0'.repeat(50)), -10002)
  assertCleared(engine, -10002)
})

test('prepareInputForOutput reads actual registration without altering it', () => {
  const engine = new Skaring()
  const data = registration('d120')
  const before = [...data.items]
  engine.prepareInputForOutput(data, ['A', 'E'])
  assert.equal(engine.gResult, -10000)
  assert.equal(engine.gRawItemScoreString, '9120'.padEnd(50, '9'))
  assert.deepEqual(data.items, before)
  engine.hj_error = message => { throw new Error(message) }
  assert.throws(() => engine.prepareInputForOutput(data, []), /Velg minst ett/)
  assertCleared(engine, -10005)
})

// Hashes bind the curated values to unchanged original reference files.
test('reference table retains its original sources', () => {
  const { createHash } = require('node:crypto')
  for (const [source, expected] of Object.entries(references.sourceSha256)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', source))).digest('hex'), expected, source)
  }
})
