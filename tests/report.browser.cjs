const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { chromium } = require('playwright')
const references = require('./fixtures/calculationReferences.json')
let browser
before(async () => { browser = await chromium.launch({ headless: true, channel: 'msedge' }) })
after(async () => { await browser?.close() })
async function openReport(t, id, areas = [...'ABCDE'], rasch = false) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 1100 }, locale: 'nb-NO' })
  t.after(() => context.close())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.NUBU_TEST_URL || 'http://127.0.0.1:3001')
  const source = references.cases.find(row => row.id === id)?.registrationSource || `docs/reference-tests/datafiler/Test${id}.~Z4`
  const picker = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Åpne…', exact: true }).click()
  await (await picker).setFiles(path.join(__dirname, '..', source))
  await page.getByText('Endringer lagret', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Vis resultat', exact: true }).click()
  await page.getByRole('heading', { name: 'Vis resultat', exact: true }).waitFor()
  for (const area of 'ABCDE') if (!areas.includes(area)) await page.getByRole('checkbox', { name: `${area}-oppgaver`, exact: true }).uncheck()
  if (rasch) await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).check()
  await page.locator('.report-sheet').waitFor()
  assert.deepEqual(errors, [])
  return page
}

const cases = [
  ['201', [...'ABCDE'], false, '201-all'],
  ['201', [...'ABCDE'], true, '201-all-rasch'],
  ['201', ['A'], true, '201-A-rasch'],
  ['205', [...'ABCDE'], true, '205-all-rasch'],
  ['206', [...'ABCDE'], true, '206-all-rasch'],
  ['207', [...'ABCDE'], true, '207-all-rasch'],
  ['208', ['C'], false, '208-C'],
]
for (const [id, areas, rasch, name] of cases) {
  test(`A4 report ${name}: fixed geometry, visible objects and print media`, async t => {
    const page = await openReport(t, id, areas, rasch)
    const sheet = page.locator('.report-sheet')
    assert.equal(await page.locator('[data-object^="item_"]').count(), 50)
    assert.equal(await page.locator('[data-object^="measureTick"]').count(), rasch ? 13 : 0)
    assert.equal(await page.getByRole('button', { name: 'Skriv ut…', exact: true }).isEnabled(), true)
    const bounds = await sheet.boundingBox()
    assert.ok(Math.abs(bounds.width / bounds.height - 210 / 297) < 0.0001)
    const resultText = await page.locator('[data-object="output"]').textContent()
    if (rasch) {
      assert.match(resultText, /Samleskår \(Rasch-skår\)\s*:\s*-?\d+\.\d{2}/)
      for (const label of await page.locator('[data-object^="measureprompt"]').allTextContents()) assert.match(label, /^-?\d+\.\d$/)
    }
    assert.equal(await page.locator('[data-object="navn"] .report-field').evaluate(node => getComputedStyle(node).whiteSpace), 'pre')
    assert.equal(await page.locator('[data-object="output"] .report-field').evaluate(node => getComputedStyle(node).fontFamily), '"Courier New", Courier, monospace')
    const outputFits = await page.locator('[data-object="output"] .report-field').evaluate(node => ({ horizontal: node.scrollWidth <= node.clientWidth + 1, vertical: node.scrollHeight <= node.clientHeight + 1 }))
    assert.deepEqual(outputFits, { horizontal: true, vertical: true })
    const clippedLabels = await page.locator('.report-field').evaluateAll(nodes => nodes.filter(node =>
      !['navn', 'merknad', 'merknad2'].includes(node.parentElement.getAttribute('data-object')) &&
      (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
    ).map(node => node.parentElement.getAttribute('data-object')))
    assert.deepEqual(clippedLabels, [])
    assert.ok((await page.locator('[data-object="copyright"]').textContent()).includes('© 2008 Universitetsforlaget.'))
    const normalizedGeometry = () => page.locator('.report-sheet').evaluate(sheet => {
      const box = sheet.getBoundingClientRect()
      return [...sheet.querySelectorAll('[data-object]')].map(node => {
        const r = node.getBoundingClientRect()
        return [node.getAttribute('data-object'), (r.x - box.x) / box.width, (r.y - box.y) / box.height, r.width / box.width, r.height / box.height]
      })
    })
    const screenGeometry = await normalizedGeometry()
    if (process.env.NUBU_REPORT_DIR && name === '201-all') {
      for (const width of [641, 320]) {
        await page.setViewportSize({ width, height: 1100 })
        assert.equal(await page.locator('.result-view').evaluate(node => node.scrollWidth <= node.clientWidth), true)
        await page.locator('.result-view').screenshot({ path: path.join(process.env.NUBU_REPORT_DIR, `screen-${width}.png`) })
      }
      await page.setViewportSize({ width: 1000, height: 1100 })
    }
    let printed = 0
    await page.exposeFunction('recordPrint', () => { printed++ })
    await page.evaluate(() => { window.print = () => { window.recordPrint() } })
    await page.getByRole('button', { name: 'Skriv ut…', exact: true }).click()
    assert.equal(printed, 1)
    await page.emulateMedia({ media: 'print' })
    assert.equal(await page.locator('.result-controls').isVisible(), false)
    assert.equal(await sheet.isVisible(), true)
    assert.equal(await sheet.getAttribute('viewBox'), '0 0 21000 29700')
    const printGeometry = await normalizedGeometry()
    assert.equal(printGeometry.length, screenGeometry.length)
    let maxPrintDifferenceMillimeters = 0
    for (let index = 0; index < printGeometry.length; index++) {
      assert.equal(printGeometry[index][0], screenGeometry[index][0])
      for (let coordinate = 1; coordinate < 5; coordinate++) {
        // Chromium quantizes DOM boxes to 1/64 CSS px. Compare in physical units.
        const difference = Math.abs(printGeometry[index][coordinate] - screenGeometry[index][coordinate]) * (coordinate === 1 || coordinate === 3 ? 210 : 297)
        maxPrintDifferenceMillimeters = Math.max(maxPrintDifferenceMillimeters, difference)
        assert.ok(difference <= 0.01, JSON.stringify({ id: printGeometry[index][0], coordinate, difference }))
      }
    }
    if (process.env.NUBU_REPORT_DIR) {
      await fs.mkdir(process.env.NUBU_REPORT_DIR, { recursive: true })
      await sheet.screenshot({ path: path.join(process.env.NUBU_REPORT_DIR, `${name}.png`) })
      await page.pdf({ path: path.join(process.env.NUBU_REPORT_DIR, `${name}.pdf`), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false })
      const geometry = await page.locator('[data-object]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-object'), rect: node.getBoundingClientRect().toJSON(), text: node.textContent })))
      await fs.writeFile(path.join(process.env.NUBU_REPORT_DIR, `${name}.geometry.json`), JSON.stringify({ maxPrintDifferenceMillimeters, objects: geometry }))
    }
  })
}

test('report controls reflow, invalid print is disabled, and oversized text is clipped', async t => {
  const page = await openReport(t, '201')
  const fieldset = await page.locator('.result-area-controls').boundingBox()
  // At enough width the Rasch control shares the row with the area frame.
  const rasch = await page.locator('.result-rasch-control').boundingBox()
  assert.ok(rasch.x >= fieldset.x + fieldset.width)
  assert.ok(Math.abs(rasch.y + rasch.height / 2 - fieldset.y - fieldset.height / 2) < 1)
  await page.setViewportSize({ width: 320, height: 1000 })
  assert.equal(await page.locator('.result-view').evaluate(node => node.scrollWidth <= node.clientWidth), true)
  for (const area of 'ABCDE') await page.getByRole('checkbox', { name: `${area}-oppgaver`, exact: true }).uncheck()
  assert.equal(await page.getByRole('button', { name: 'Skriv ut…', exact: true }).isDisabled(), true)
  assert.equal(await page.locator('.report-sheet').count(), 0)
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.result-view').isVisible(), false)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('checkbox', { name: 'A-oppgaver', exact: true }).check()
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  for (const label of ['Navn:', 'Merknad:', 'Merknad 2:']) await page.getByRole('textbox', { name: label, exact: true }).fill('Lang tekst '.repeat(100))
  await page.getByRole('button', { name: 'Vis resultat', exact: true }).click()
  for (const id of ['navn', 'merknad', 'merknad2']) {
    const field = page.locator(`[data-object="${id}"] .report-field`)
    assert.equal(await field.evaluate(node => getComputedStyle(node).overflow), 'hidden')
    assert.ok(await field.evaluate(node => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight))
  }
  const noteHeights = await page.locator('[data-object="merknad"], [data-object="merknad2"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))
  assert.equal(noteHeights[0], noteHeights[1])
})


test('new long-text reference 401 uses fixed name and note fields without font shrinking', async t => {
  const page = await openReport(t, '401')
  const rectangles = await page.locator('[data-object="navn"], [data-object="merknad"], [data-object="merknad2"]').evaluateAll(nodes => nodes.map(node => {
    const field = node.firstElementChild
    const style = getComputedStyle(field)
    return { id: node.getAttribute('data-object'), height: Number(node.getAttribute('height')), fontSize: style.fontSize, overflow: style.overflow, whiteSpace: style.whiteSpace }
  }))
  assert.equal(rectangles.length, 3)
  assert.equal(rectangles[0].whiteSpace, 'pre')
  assert.equal(rectangles[1].height, rectangles[2].height)
  assert.equal(new Set(rectangles.map(value => value.fontSize)).size, 1)
  assert.ok(rectangles.every(value => value.overflow === 'hidden'))
  if (process.env.NUBU_REPORT_DIR) await page.locator('.report-sheet').screenshot({ path: path.join(process.env.NUBU_REPORT_DIR, '401-long-text.png') })
})
