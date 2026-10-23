// Run against the local dev server with Playwright supplied by the workspace runtime.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { chromium } = require('playwright')
let browser
before(async () => { browser = await chromium.launch({ headless: true, channel: process.env.NUBU_BROWSER_CHANNEL || 'msedge' }) })
after(async () => { await browser?.close() })

async function pageFor(t) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 850 }, acceptDownloads: true })
  t.after(() => context.close())
  const page = await context.newPage()
  await page.goto(process.env.NUBU_TEST_URL || 'http://127.0.0.1:3000')
  await page.getByRole('button', { name: 'Arkiv', exact: true }).waitFor()
  return page
}
async function command(page, name) {
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
async function openReference(page) {
  const picker = page.waitForEvent('filechooser')
  await command(page, 'Åpne…')
  await (await picker).setFiles(path.join(__dirname, '../docs/reference-tests/datafiler/Test301 Som i programbeskrivning v02.~Z4'))
  await page.getByText('Endringer lagret', { exact: true }).waitFor()
}
async function snapshot(page) {
  return page.locator('.registration-window > div').first().evaluate(element => ({
    fields: Array.from(element.querySelectorAll('input:not([type=file])')).map(input => ({ value: input.value, checked: input.checked, readOnly: input.readOnly })),
    caption: element.querySelector('.window-caption').textContent,
    status: element.querySelector('.change-status').textContent,
    messages: Array.from(element.querySelectorAll('.file-feedback')).map(node => node.textContent),
    errors: Array.from(element.querySelectorAll('.field-error')).map(node => node.textContent),
  }))
}
async function roundTrip(page, viaMenu = false) {
  if (viaMenu) await command(page, 'Vis resultat')
  else await page.getByRole('button', { name: 'Vis resultat', exact: true }).click()
  await page.getByRole('heading', { name: 'Resultat av motoriske oppgaver i NUBU 4-16', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Arkiv', exact: true }).count(), 0)
  assert.equal(await page.getByText('Resultatvisning kommer i neste etappe.', { exact: true }).count(), 1)
  await page.getByRole('button', { name: '← Tilbake', exact: true }).click()
  await page.getByRole('heading', { name: 'Skåring av motoriske oppgaver i NUBU 4-16', exact: true }).waitFor()
}

test('Arkiv has ordered command groups, two separators and disabled export; old top buttons are absent', async t => {
  const page = await pageFor(t)
  assert.deepEqual(await page.locator('.archive-bar button').allTextContents(), ['Arkiv'])
  assert.equal(await page.locator('.file-commands').count(), 0)
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  assert.deepEqual(await page.getByRole('menuitem').allTextContents(), ['Ny', 'Åpne…', 'Last ned…', 'Vis resultat', 'Eksporter data…'])
  const menu = page.getByRole('menu')
  assert.equal(await menu.getByRole('separator').count(), 2)
  assert.deepEqual(await menu.getByRole('group').evaluateAll(nodes => nodes.map(n => [n.getAttribute('aria-label'), n.textContent])), [
    ['Registrering', 'NyÅpne…Last ned…'], ['Resultat', 'Vis resultat'], ['Dataexport', 'Eksporter data…'],
  ])
  assert.equal(await page.getByRole('menuitem', { name: 'Eksporter data…' }).isDisabled(), true)
  await page.getByRole('heading').click()
  assert.equal(await menu.count(), 0)
})

test('mouse and keyboard open, traverse, activate and close the menu with usable focus', async t => {
  const page = await pageFor(t)
  const trigger = page.getByRole('button', { name: 'Arkiv', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.getByRole('menuitem', { name: 'Ny', exact: true }).evaluate(n => n === document.activeElement), true)
  await page.keyboard.press('ArrowDown')
  assert.equal(await page.getByRole('menuitem', { name: 'Åpne…' }).evaluate(n => n === document.activeElement), true)
  await page.keyboard.press('End')
  assert.equal(await page.getByRole('menuitem', { name: 'Vis resultat' }).evaluate(n => n === document.activeElement), true)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Escape')
  assert.equal(await trigger.evaluate(n => n === document.activeElement), true)
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  assert.equal(await page.getByRole('menu').count(), 0)
  assert.equal(await page.getByLabel('Navn:', { exact: true }).evaluate(n => n === document.activeElement), true)
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '← Tilbake' }).click()
  assert.equal(await trigger.evaluate(n => n === document.activeElement), true)
})

test('both result commands preserve new, opened, downloaded and dirty registrations over repeated transitions', async t => {
  const page = await pageFor(t)
  let reloads = 0, popups = 0
  page.on('load', () => reloads++)
  page.on('popup', () => popups++)
  const input = await page.locator('input[type=file]').elementHandle()
  async function unchanged() {
    const before = await snapshot(page)
    for (let i = 0; i < 4; i++) {
      await roundTrip(page, i % 2 === 0)
      assert.deepEqual(await snapshot(page), before)
      assert.equal(await input.evaluate(n => n === document.querySelector('input[type=file]')), true)
    }
  }
  await unchanged()
  await openReference(page)
  await unchanged()
  await page.getByLabel('Merknad 2:', { exact: true }).fill('Fiktiv navigasjonstest')
  await page.getByLabel('E10', { exact: true }).fill('2')
  const downloaded = page.waitForEvent('download')
  await command(page, 'Last ned…')
  await page.getByRole('dialog').getByLabel('Filnavn:').fill('Navigasjonstest.~Z4')
  await page.getByRole('dialog').getByRole('button', { name: 'Last ned', exact: true }).click()
  const download = await downloaded
  assert.equal(download.suggestedFilename(), 'Navigasjonstest.~Z4')
  const downloadedBytes = await fs.readFile(await download.path())
  assert.ok(downloadedBytes.includes(Buffer.from('NUBUMotor_100')))
  await unchanged()
  const originalNote = await page.getByLabel('Merknad:', { exact: true }).inputValue()
  await page.getByLabel('Merknad:', { exact: true }).fill('Ulagret fiktiv merknad')
  await unchanged()
  await command(page, 'Ny')
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt', exact: true }).click()
  assert.equal(await page.getByText('Ulagrede endringer', { exact: true }).count(), 1)
  // Restoring the field checks that the download reference survived the transitions.
  await page.getByLabel('Merknad:', { exact: true }).fill(originalNote)
  await page.getByText('Endringer lagret', { exact: true }).waitFor()
  await command(page, 'Last ned…')
  assert.equal(await page.getByRole('dialog').getByLabel('Filnavn:').inputValue(), 'Test301 Som i programbeskrivning v02.~Z4')
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt', exact: true }).click()
  assert.equal(reloads, 0)
  assert.equal(popups, 0)
  assert.equal(page.context().pages().filter(p => p.url().startsWith(new URL(page.url()).origin)).length, 1)
})

test('Ny and Tøm formular retain their approved dialogs and effects after navigation', async t => {
  const page = await pageFor(t)
  await page.getByLabel('Navn:', { exact: true }).fill('Fiktiv')
  await roundTrip(page)
  await page.getByRole('button', { name: 'Tøm formular', exact: true }).click()
  await page.getByText('Tømme alle feltene? Ulagrede endringer går tapt.', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByLabel('Navn:', { exact: true }).inputValue(), 'Fiktiv')
  await page.getByRole('button', { name: 'Tøm formular', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click()
  assert.equal(await page.getByLabel('Navn:', { exact: true }).inputValue(), '')
  await page.getByLabel('Navn:', { exact: true }).fill('Ny test')
  await command(page, 'Ny')
  await page.getByRole('dialog').getByRole('button', { name: 'Fortsett uten nedlasting', exact: true }).click()
  assert.equal(await page.getByLabel('Navn:', { exact: true }).inputValue(), '')
  await page.getByText('Ingen ulagrede endringer', { exact: true }).waitFor()
})

test('field validation feedback and an error message survive navigation until explicitly dismissed', async t => {
  const page = await pageFor(t)
  const picker = page.waitForEvent('filechooser')
  await command(page, 'Åpne…')
  await (await picker).setFiles({ name: 'Invalid.~Z4', mimeType: 'application/octet-stream', buffer: Buffer.from('invalid') })
  await page.locator('.file-feedback[role="alert"]').waitFor()
  const errorBefore = await snapshot(page)
  await roundTrip(page, true)
  await roundTrip(page)
  assert.deepEqual(await snapshot(page), errorBefore)
  await page.getByRole('button', { name: 'Lukk melding', exact: true }).click()
  await page.getByLabel('Født dato:', { exact: true }).fill('ugyldig')
  await page.getByLabel('Navn:', { exact: true }).focus()
  await page.getByText('Ugyldig dato. Bruk dag.måned.år.', { exact: true }).waitFor()
  const before = await snapshot(page)
  await roundTrip(page, true)
  await roundTrip(page)
  assert.deepEqual(await snapshot(page), before)
  await roundTrip(page)
  assert.equal(await page.locator('.file-feedback[role="alert"]').count(), 0)
})

test('action buttons align with the task frame and person fields at desktop and narrow widths', async t => {
  const page = await pageFor(t)
  for (const width of [1000, 641, 600, 400]) {
    await page.setViewportSize({ width, height: 900 })
    const frame = await page.locator('.tasks').boundingBox()
    const result = await page.getByRole('button', { name: 'Vis resultat', exact: true }).boundingBox()
    const clear = await page.getByRole('button', { name: 'Tøm formular', exact: true }).boundingBox()
    const name = await page.getByLabel('Navn:', { exact: true }).boundingBox()
    assert.ok(Math.abs(frame.x + frame.width - result.x - result.width) < 1)
    // The pre-existing frame and input edges differ by one CSS pixel on desktop.
    assert.ok(Math.abs(name.x + name.width - result.x - result.width) <= 1)
    assert.equal(clear.y, result.y)
    assert.ok(clear.x + clear.width < result.x)
  }
})
