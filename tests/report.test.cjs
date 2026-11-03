const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { ReportGraphics, reportFooter } = loadTypeScript('report/graphics.ts')
const { createRegistration } = loadTypeScript('domain/registration.ts')
const refs = require('./fixtures/calculationReferences.json')
function dataFor(fixture = refs.cases[0]) {
  return { ...createRegistration(new Date(2026, 10, 3)), ...fixture.registration,
    age: fixture.registration.displayAge, items: [...fixture.registration.items] }
}
function build(data = dataFor(), areas = [...'ABCDE'], rasch = true) {
  const engine = new ReportGraphics()
  assert.equal(engine.calculateRegistration(data, areas), -10000)
  engine.svShowRasch = rasch
  return { engine, report: engine.buildReport(data) }
}
function object(report, id) { return report.objects.find(value => value.id === id) }
function calculationState(engine) {
  return JSON.stringify(Object.fromEntries(Object.entries(engine).filter(([key]) => key.startsWith('g') || key === 'aItemDifficulties' || key === 'alder_value')))
}
const expectedIds = [
  'Graph1', 'headingfield', 'led_navn', 'led_merknad_NOT_USED', 'led_merknad2_NOT_USED', 'led_alder',
  ...Array.from({ length: 14 }, (_, i) => `ageline${i + 1}`),
  ...Array.from({ length: 13 }, (_, i) => `measureTick${i + 4}`),
  'AgeEquivPrompt', ...Array.from({ length: 14 }, (_, i) => `ageprompt${i + 1}`),
  'MeasurePromptR', ...Array.from({ length: 13 }, (_, i) => `measureprompt${i + 4}`),
  ...[...'ABCDE'].map(area => `AreaPrompt_${area}`),
  ...Array.from({ length: 50 }, (_, i) => `item_${i + 1}`),
  'copyright', 'navn', 'alder', 'led_kjonn', 'output', 'EstimateLine', 'CI',
  'led_fodtdato', 'fodtdato', 'led_testdato', 'testdato', 'merknad', 'merknad2',
]

test('complete inventory retains 130 unique identities and no visible placeholders', () => {
  const { report } = build()
  assert.equal(report.objects.length, 130)
  assert.deepEqual(report.objects.map(value => value.id).sort(), [...expectedIds].sort())
  assert.equal(new Set(report.objects.map(value => value.id.toLowerCase())).size, 130)
  for (const field of report.objects.filter(value => value.visible && value.kind === 'field')) {
    assert.equal(typeof field.text, 'string')
    assert.doesNotMatch(field.text, /undefined|_TO_BE_FILLED|_NOT_USED/)
  }
})

test('static object geometry is reused directly from TypeScript definitions', () => {
  const source = ts.createSourceFile('skaring.ts', fs.readFileSync('src/api/skaring.ts', 'utf8'), ts.ScriptTarget.Latest, true)
  const definitions = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      ['createField', 'createLine'].includes(node.expression.name.text) &&
      node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
      const bounds = Object.fromEntries(node.arguments[1].properties.map(property => [property.name.text, Number(property.initializer.getText(source))]))
      definitions.push({ id: node.arguments[0].text, bounds })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  const { report } = build()
  const supplemented = ['led_kjonn', 'led_alder', 'alder', 'output', 'copyright', 'EstimateLine']
  assert.equal(definitions.length, 122)
  for (const definition of definitions.filter(value => !supplemented.includes(value.id))) {
    assert.deepEqual(object(report, definition.id).sourceBounds, definition.bounds, definition.id)
  }
})

test('coordinate conversion maps both legacy corners to the 20 mm A4 margins', () => {
  const engine = new ReportGraphics()
  assert.equal(engine.legacyRectangle.x1, 15)
  // The A4 Windows reference places the output at approximately 36.24 mm.
  assert.ok(Math.abs(engine.convertVertices({ x1: 924, y1: 2175, x2: 9180, y2: 8424 }).x1 / 100 - 36.24) < 0.1)
  assert.deepEqual(engine.convertVertices(engine.legacyRectangle), { x1: 2000, y1: 2000, x2: 19000, y2: 27700 })
  const mid = engine.convertVertices({ x1: (15 + 9570) / 2, y1: (132 + 14790) / 2, x2: 9570, y2: 14790 })
  assert.deepEqual(mid, { x1: 10500, y1: 14850, x2: 19000, y2: 27700 })
  const { report } = build()
  for (const graphic of report.objects) assert.deepEqual(graphic.bounds, engine.convertVertices(graphic.sourceBounds))
  assert.deepEqual(report.outsideMargins, [])
})

test('drawing API preserves case-insensitive identity, visibility, colors and last-word style', () => {
  const engine = new ReportGraphics()
  const bounds = { x1: 1000, y1: 2000, x2: 3000, y2: 4000 }
  engine.createField('Field', bounds, 'A1 (2)', true, 'Sans', 'small', 'regular', 'black', 'left')
  engine.setFieldText('FIELD', 'A2 (1)')
  engine.setFieldVisibility('field', false)
  engine.setFieldStrokeColor('field', 'lightGray')
  engine.setLastWordBold('field', true)
  engine.createLine('Line', bounds, true, 'black', false, 'thin')
  engine.setLineVertices('line', { ...bounds, y2: 2000 })
  engine.setLineVisibility('LINE', false)
  engine.createCIRectangle(bounds, true)
  engine.setRectangleVertices('ci', { ...bounds, x2: 4000 })
  engine.setRectangleVisibility('CI', false)
  assert.throws(() => engine.setFieldText('missing', 'x'), /Missing report object/)
  assert.throws(() => engine.createLine('LINE', bounds, true, 'black', false, 'thin'), /Duplicate report object/)
})

for (const fixture of refs.cases) {
  test(`report ${fixture.id}: data, score labels, CI, margins and immutable calculation`, () => {
    const data = dataFor(fixture)
    const before = JSON.stringify(data)
    const { engine, report } = build(data)
    const state = calculationState(engine)
    const again = engine.buildReport(data)
    assert.equal(calculationState(engine), state)
    assert.deepEqual(again, report)
    assert.equal(JSON.stringify(data), before)
    assert.deepEqual(report.outsideMargins, [])
    assert.equal(object(report, 'navn').text, data.name)
    assert.equal(object(report, 'fodtdato').text, data.birthDate)
    assert.equal(object(report, 'testdato').text, data.testDate)
    assert.equal(object(report, 'merknad').text, data.note)
    assert.equal(object(report, 'merknad2').text, data.note2)
    assert.equal(object(report, 'navn').singleLine, true)
    assert.equal(object(report, 'CI').visible, !fixture.export.minEstimated && !fixture.export.maxEstimated)
    for (let index = 0; index < 50; index++) {
      const field = object(report, `item_${index + 1}`)
      const label = `${'ABCDE'[Math.floor(index / 10)]}${index % 10 + 1}`
      const scored = '012'.includes(data.items[index]) && data.items[index].length === 1
      assert.equal(field.text, scored ? `${label} (${data.items[index]})` : label)
      assert.equal(field.color, scored ? 'black' : 'lightGray')
      assert.equal(field.lastWordBold, scored)
    }
    assert.equal(object(report, 'EstimateLine').sourceBounds.x2, 8460)
    assert.ok(object(report, 'EstimateLine').sourceBounds.y1 >= 8262)
    assert.ok(object(report, 'EstimateLine').sourceBounds.y1 <= 13977)
  })
}

test('Rasch controls exactly the thirteen prompts and ticks plus the heading and result text', () => {
  const { report: shown } = build()
  const { report: hidden } = build(dataFor(), [...'ABCDE'], false)
  for (const id of ['MeasurePromptR', ...Array.from({ length: 13 }, (_, i) => `measureprompt${i + 4}`), ...Array.from({ length: 13 }, (_, i) => `measureTick${i + 4}`)]) {
    assert.equal(object(shown, id).visible, true)
    assert.equal(object(hidden, id).visible, false)
  }
  assert.match(object(shown, 'output').text, /Rasch-skår/)
  assert.doesNotMatch(object(hidden, 'output').text, /Rasch-skår/)
  for (const prompt of shown.objects.filter(value => /^measureprompt\d+$/.test(value.id))) assert.match(prompt.text, /^-?\d+\.\d$/)
})

test('all 31 area descriptions retain a 65-character first line and ordered Norwegian grammar', () => {
  const data = { ...dataFor(), items: [...'012*******'.repeat(5)] }
  for (let mask = 1; mask < 32; mask++) {
    const areas = [...'ABCDE'].filter((_, i) => mask & (1 << i))
    const { report } = build(data, areas.slice().reverse())
    const line = object(report, 'output').text.split('\n')[0]
    assert.equal(line.length, 65)
    if (areas.length === 5) assert.equal(line, '='.repeat(65))
    else {
      assert.match(line, /Beregnet ut fra/)
      assert.match(line, new RegExp(areas.at(-1) + '-oppgaver'))
    }
    for (let index = 0; index < 50; index++) {
      const active = areas.includes('ABCDE'[Math.floor(index / 10)]) && index % 10 < 3
      assert.equal(object(report, `item_${index + 1}`).lastWordBold, active)
    }
  }
  for (const [areas, expected] of [
    [['A'], 'Beregnet ut fra A-oppgaver'],
    [['B', 'A'], 'Beregnet ut fra A- og B-oppgaver'],
    [['C', 'A', 'B'], 'Beregnet ut fra A-, B- og C-oppgaver'],
    [['E', 'B', 'D'], 'Beregnet ut fra B-, D- og E-oppgaver'],
  ]) assert.ok(object(build(data, areas).report, 'output').text.includes(expected))
})

test('fixed text rectangles and footer are contained and do not collide with graph objects', () => {
  const { report } = build()
  const note = object(report, 'merknad').bounds
  const note2 = object(report, 'merknad2').bounds
  assert.equal(note.y2 - note.y1, note2.y2 - note2.y1)
  assert.ok(note.y2 <= object(report, 'output').bounds.y1)
  assert.ok(note.x2 < note2.x1)
  const footer = object(report, 'copyright')
  assert.equal(footer.text, reportFooter.join('\n'))
  const graphBottom = Math.max(...report.objects.filter(value => /^item_|^ageprompt/.test(value.id)).map(value => value.bounds.y2))
  assert.ok(footer.bounds.y1 > graphBottom)
  assert.ok(footer.bounds.y2 <= 27700)
})


test('Windows text separators retain column spaces and avoid an extra blank table row', () => {
  const { report } = build()
  const text = object(report, 'output').text
  assert.ok(text.includes('================= =========== =========== =========== ==========='))
  assert.ok(text.includes('='.repeat(65) + '\n' + ' '.repeat(17) + '- - -'))
  assert.ok(!text.includes('='.repeat(65) + '\n\n' + ' '.repeat(17) + '- - -'))
})
