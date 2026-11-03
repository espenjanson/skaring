const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const references = require('./fixtures/calculationReferences.json')
const { dateAge } = require('./helpers/loadTypeScript.cjs').loadTypeScript('domain/dateAge.ts')

// The calculation class now loads through the shared loader without Node built-ins.
const { Skaring } = require('./helpers/loadTypeScript.cjs').loadTypeScript('api/skaring.ts')
const allAreas = [...'ABCDE']
const registration = text => ({ items: [...text.padEnd(50, '*')] })
const calculate = (engine, data, areas = allAreas) => engine.calculateRegistration({ ...data, age: data.age ?? data.displayAge, items: [...data.items] }, areas)
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
  assert.equal(engine.gAlder, -9999)
  assert.equal(engine.alder_value, '')
  assert.deepEqual(engine.modelPercentile(), { kind: 'missing' })
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
    assert.deepEqual(engine.modelPercentile(), fixture.export.modelPercentile.status === 'available'
      ? { kind: 'available', value: fixture.export.modelPercentile.value }
      : { kind: 'not-computable' })
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
      assert.deepEqual(engine.modelPercentile(), report.modelPercentile.status === 'available'
        ? { kind: 'available', value: report.modelPercentile.value }
        : { kind: 'not-computable' })
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


function categoriesAt(engine, measure) {
  return engine.aldersgruppepersentilerFraEstimat(measure).split('\n')
    .filter(line => /^\d/.test(line))
    .map(line => Math.floor((line.indexOf('X') - 17) / 12) + 1)
}
function fullState(engine) {
  return [...state(engine), engine.gAlder, engine.alder_value, engine.modelPercentile()]
}

test('302-304 distinguish exact date ages from manual half-month age', () => {
  const engine = new Skaring()
  const years = { '302': 1461 / 365.25, '303': 1491 / 365.25, '304': 4 + 1 / 24 }
  const percentiles = { '302': 35, '303': 31, '304': 34 }
  for (const id of ['302', '303', '304']) {
    const fixture = references.cases.find(row => row.id === id)
    calculate(engine, fixture.registration)
    assert.equal(engine.gAlder, years[id])
    assert.equal(engine.alder_value, '4:0')
    assert.deepEqual(engine.modelPercentile(), { kind: 'available', value: percentiles[id] })
  }
})

test('valid dates override display age and provenance without invoking legacy parsers', () => {
  const engine = new Skaring()
  engine.validDateSecondsFromNorwegian = () => { throw new Error('Legacy date parser used') }
  engine.yearMonthToDec = () => { throw new Error('Legacy age parser used') }
  const data = { ...registration('012'), birthDate: '16.09.2022', testDate: '16.10.2026', age: '99:11', ageSource: 'manual' }
  const before = JSON.stringify(data)
  engine.prepareInputForOutput(data)
  assert.equal(engine.gAlder, dateAge(data.birthDate, data.testDate).exactYears)
  assert.equal(engine.gAlder, 1491 / 365.25)
  assert.equal(engine.alder_value, '4:0')
  assert.equal(JSON.stringify(data), before)
})

test('usable manual ages receive one half-month only, including allowed limits', () => {
  const engine = new Skaring()
  for (const [age, expected] of [['1:6', 1 + 6 / 12 + 1 / 24], ['4:0', 4 + 1 / 24], ['04:00', 4 + 1 / 24], ['99:11', 99 + 11 / 12 + 1 / 24]]) {
    for (const dates of [{}, { birthDate: '31.02.2020', testDate: '16.10.2026' }, { birthDate: '16.10.2026', testDate: '16.10.2022' }]) {
      engine.calculateRegistration({ ...registration('012'), ...dates, age, ageSource: 'manual' })
      assert.equal(engine.gAlder, expected)
      assert.equal(engine.modelPercentile().kind, 'available')
    }
  }
})

test('missing, invalid and stale automatic ages leave age-independent results intact', () => {
  const engine = new Skaring()
  for (const age of ['', 'x', '4:12', '4:-1', '0:0', '1:5', '100:0', '4:', ':0', '4:0 ', 'Infinity:0']) {
    assert.equal(engine.calculateRegistration({ ...registration('012'), age }), -10000)
    assert.equal(engine.gNValid, 3)
    assert.ok(Number.isFinite(engine.gMeasure) && Number.isFinite(engine.gSE))
    assert.deepEqual(engine.modelPercentile(), { kind: 'not-computable' })
    assert.equal(engine.gAlder, -9999)
    assert.equal(engine.alder_value, '')
  }
  for (const dates of [
    {},
    { birthDate: '31.02.2020', testDate: '16.10.2026' },
    { birthDate: '16.10.2026', testDate: '16.10.2022' },
    { birthDate: '16.10.2026', testDate: '16.10.2026' },
    { birthDate: '16.10.1900', testDate: '16.10.2026' },
  ]) {
    engine.calculateRegistration({ ...registration('012'), ...dates, age: '4:0', ageSource: 'automatic' })
    assert.deepEqual(engine.modelPercentile(), { kind: 'not-computable' })
  }
})

test('percentiles distinguish missing calculation, unavailable age, and valid 0/100', () => {
  const engine = new Skaring()
  assert.deepEqual(engine.modelPercentile(), { kind: 'missing' })
  for (const [scores, value] of [['0', 0], ['2', 100]]) {
    engine.calculateRegistration({ items: Array(50).fill(scores), age: scores === '0' ? '99:11' : '1:6' })
    assert.deepEqual(engine.modelPercentile(), { kind: 'available', value })
  }
  engine.calculateRegistration(registration('012'))
  assert.deepEqual(engine.modelPercentile(), { kind: 'not-computable' })
  engine.calculateRegistration(registration('01'))
  assertCleared(engine, -10004)
})

test('age transform, percentile rounding and lookup use the established chain', () => {
  const engine = new Skaring()
  close(engine.ageToMeasure(Math.exp(1.968), 1.968, 0.254), 0, 1e-14)
  close(engine.ageToMeasure(4, 1.968, 0.254), (Math.log(4) - 1.968) / 0.254, 1e-14)
  const cases = [
    [-100, 0], [-4.2, 0], [-4.174999, 1],
    [-1.375000001, 1], [-1.375, 2], [-1.374999999, 2],
    [-0.075000001, 44], [-0.075, 48], [-0.074999999, 48],
    [0.024999999, 52], [0.025, 54], [0.025000001, 54],
    [0.224999999, 63], [0.225, 66], [0.225000001, 66],
    [1.175000001, 95], [3, 100], [100, 100],
  ]
  for (const [measure, expected] of cases) assert.equal(engine.modellpersentilFraEstimat(measure), expected, String(measure))
})

test('each actual percentile threshold belongs to the lower category at equality', () => {
  const engine = new Skaring()
  for (let group = 0; group < 10; group++) {
    for (let threshold = 0; threshold < 3; threshold++) {
      const value = engine.gAgeGroupThresholds[group][threshold]
      assert.equal(categoriesAt(engine, value - 1e-8)[group], threshold + 1)
      assert.equal(categoriesAt(engine, value)[group], threshold + 1)
      assert.equal(categoriesAt(engine, value + 1e-8)[group], threshold + 2)
    }
  }
})

for (let mask = 1; mask < 32; mask++) {
  const areas = allAreas.filter((_, index) => mask & (1 << index))
  test(`area combination ${areas.join('')}: masking, empty areas, edits and reuse`, () => {
    const engine = new Skaring()
    const data = { ...registration('012*******'.repeat(5)), age: '8:0' }
    const before = JSON.stringify(data)
    assert.equal(engine.calculateRegistration(data, areas), -10000)
    assert.equal(engine.gNValid, areas.length * 3)
    const expected = fullState(engine)
    const masked = data.items.map((value, index) => areas.includes(allAreas[Math.floor(index / 10)]) ? value : '*')
    const fresh = new Skaring()
    fresh.calculateRegistration({ ...data, items: masked })
    assert.deepEqual(fullState(fresh), expected)
    // Change every excluded score; neither estimate nor age-dependent result may change.
    const changed = data.items.map((value, index) => areas.includes(allAreas[Math.floor(index / 10)]) ? value : '2')
    engine.calculateRegistration({ ...data, items: changed }, areas.slice().reverse())
    assert.deepEqual(fullState(engine), expected)
    assert.equal(JSON.stringify(data), before)
    for (const activeArea of areas) {
      const sparse = data.items.map((value, index) => allAreas[Math.floor(index / 10)] === activeArea ? value : '*')
      assert.equal(engine.calculateRegistration({ ...data, items: sparse }, areas), -10000)
      const single = new Skaring()
      single.calculateRegistration({ ...data, items: sparse }, [activeArea])
      assert.deepEqual(fullState(engine), fullState(single))
    }
    for (const count of [0, 1, 2, 3]) {
      const items = Array(50).fill('*')
      const offset = allAreas.indexOf(areas[0]) * 10
      for (let index = 0; index < count; index++) items[offset + index] = String(index)
      assert.equal(engine.calculateRegistration({ ...data, items }, areas), count === 0 ? -10001 : count < 3 ? -10004 : -10000)
      if (count < 3) assertCleared(engine, count === 0 ? -10001 : -10004)
    }
    for (const score of ['0', '2']) {
      const items = data.items.map((_, index) => areas.includes(allAreas[Math.floor(index / 10)]) ? score : '*')
      assert.equal(engine.calculateRegistration({ ...data, items }, areas), -10000)
      assert.equal(engine.gIsMinEstimated, score === '0')
      assert.equal(engine.gIsMaxEstimated, score === '2')
    }
    assert.equal(engine.calculateRegistration(data, []), -10005)
    assertCleared(engine, -10005)
    engine.calculateRegistration(data, areas)
    assert.deepEqual(fullState(engine), expected)
  })
}

test('age, score and selection changes always recompute without stale percentiles', () => {
  const engine = new Skaring()
  const fixture = references.cases.find(row => row.id === '302').registration
  const initial = { ...fixture, items: [...fixture.items], age: fixture.displayAge }
  const changes = [
    initial,
    { ...initial, birthDate: '16.09.2022' },
    { ...initial, birthDate: '', testDate: '', age: '4:0' },
    { ...initial, birthDate: '', testDate: '', age: '8:0' },
    { ...initial, birthDate: '', testDate: '', age: 'invalid' },
    { ...initial, items: initial.items.map(c => c === '0' ? '2' : c) },
    { ...initial, items: Array(50).fill('*') },
    initial,
  ]
  for (const data of changes) {
    for (const areas of [allAreas, ['C'], ['A', 'B']]) {
      const fresh = new Skaring()
      fresh.calculateRegistration(data, areas)
      engine.calculateRegistration(data, areas)
      assert.deepEqual(fullState(engine), fullState(fresh))
    }
  }
})

test('age-equivalent limits and CI endpoints retain established truncation away from floating-point ties', () => {
  const engine = new Skaring()
  const toMeasure = age => (Math.log(age) - engine.gConvertParameter1) / engine.gConvertParameter2
  const lower = toMeasure(3.5)
  const upper = toMeasure(18)
  assert.equal(engine.estimateToPresentText(lower - 1e-8), 'Lavere enn 3:6')
  assert.equal(engine.estimateToPresentText(lower), '3:6')
  assert.equal(engine.estimateToPresentText(lower + 1e-8), '3:6')
  assert.equal(engine.estimateToPresentText(upper - 1e-8), '17:11')
  assert.equal(engine.estimateToPresentText(upper + 1e-8), 'Høyere enn 18:0')
  // Exercise the exact same endpoint expressions used by the legacy report.
  for (const target of [lower - 1e-8, lower, lower + 1e-8, upper - 1e-8, upper + 1e-8]) {
    const se = 0.5
    assert.equal(engine.estimateToPresentText((target + 1.96 * se) - 1.96 * se), engine.estimateToPresentText(target))
    assert.equal(engine.estimateToPresentText((target - 1.96 * se) + 1.96 * se), engine.estimateToPresentText(target))
  }
})

test('known exact-18 floating-point behavior is retained pending Windows evidence', () => {
  const engine = new Skaring()
  const exact18Measure = (Math.log(18) - 1.968) / 0.254
  assert.equal(Math.exp(1.968 + 0.254 * exact18Measure), 17.999999999999996)
  assert.equal(engine.estimateToPresentText(exact18Measure), '17:11')
  // Equivalent algebra can land on the other side of the same mathematical limit.
  const inverse18 = engine.ageToMeasure(18, 1.968, 0.254)
  assert.equal(engine.estimateToPresentText(inverse18), 'Høyere enn 18:0')
})


test('all percentile rounding cells approach the expected lookup from either side', () => {
  const engine = new Skaring()
  const expectedAtGridPoint = grid => {
    const row = engine.gModelPercentiles.find(([limit]) => limit >= grid)
    return (row ?? engine.gModelPercentiles.at(-1))[1]
  }
  for (let grid = -86; grid <= 62; grid++) {
    const midpoint = (grid + 0.5) / 20
    assert.equal(engine.modellpersentilFraEstimat(midpoint - 1e-8), expectedAtGridPoint(grid / 20))
    assert.equal(engine.modellpersentilFraEstimat(midpoint + 1e-8), expectedAtGridPoint((grid + 1) / 20))
  }
})

test('legacy result text consumes the same age-dependent result without graphics or React', () => {
  const engine = new Skaring()
  const fields = new Map()
  engine.setFieldText = (name, text) => fields.set(name, text)
  for (const id of ['302', '303', '304', '209', '206', '207']) {
    const fixture = references.cases.find(row => row.id === id)
    calculate(engine, fixture.registration)
    engine.setGraph(0)
    assert.equal(fields.get('alder'), engine.alder_value)
    const output = fields.get('output')
    if (fixture.export.modelPercentile.status === 'available') {
      assert.ok(output.includes(`Skåren tilsvarer ${fixture.export.modelPercentile.value}. persentilen`))
    } else {
      assert.ok(output.includes('Persentil basert på statistisk modell kan ikke beregnes.'))
      assert.ok(!output.includes('Skåren tilsvarer'))
    }
    assert.ok(!output.includes('NaN'))
    if (engine.gIsMinEstimated || engine.gIsMaxEstimated) {
      assert.ok(output.includes('Konfidensintervall kan ikke beregnes.'))
      assert.ok(!output.includes('95% konfidensintervall fra:'))
    }
  }
})
