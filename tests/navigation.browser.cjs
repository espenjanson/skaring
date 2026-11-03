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
  await page.getByRole('heading', { name: 'Vis resultat', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Arkiv', exact: true }).count(), 0)
  assert.equal(await page.locator('.result-presentation').count(), 1)
  assert.equal(await page.getByRole('checkbox').count(), 6)
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
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
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
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

test('Arkiv and Tilbake share typography, frameless hover and visible keyboard focus', async t => {
  const page = await pageFor(t)
  const trigger = page.getByRole('button', { name: 'Arkiv', exact: true })
  async function frameless(control) {
    assert.deepEqual(await control.evaluate(node => {
      const style = getComputedStyle(node)
      return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth, style.boxShadow, style.backgroundColor]
    }), ['0px', '0px', '0px', '0px', 'none', 'rgba(0, 0, 0, 0)'])
  }
  async function focused(control) {
    assert.equal(await control.evaluate(node => node === document.activeElement && node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none'), true)
  }
  async function appearance(control) {
    assert.deepEqual(await control.evaluate(node => {
      const style = getComputedStyle(node)
      return [style.fontSize, style.fontWeight]
    }), ['15px', '600'])
    const before = await control.boundingBox()
    await control.hover()
    assert.deepEqual(await control.evaluate(node => {
      const style = getComputedStyle(node)
      return [style.backgroundColor, style.borderTopWidth, style.boxShadow]
    }), ['rgb(232, 243, 248)', '0px', 'none'])
    assert.deepEqual(await control.boundingBox(), before)
    await page.mouse.move(790, 800)
  }
  await frameless(trigger)
  await appearance(trigger)
  assert.equal(await trigger.locator('.archive-chevron[aria-hidden="true"]').count(), 1)
  await page.keyboard.press('Tab')
  await focused(trigger)
  await page.keyboard.press('Enter')
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  const back = page.getByRole('button', { name: 'Tilbake', exact: true })
  await frameless(back)
  await appearance(back)
  assert.equal(await back.locator('svg[aria-hidden="true"][focusable="false"]').count(), 1)
  await page.keyboard.press('Shift+Tab')
  await focused(back)
  await page.keyboard.press('Enter')
  await focused(trigger)
})

test('the shared menu and message row keeps the heading stable and avoids overlap at narrow widths', async t => {
  const page = await pageFor(t)
  const heading = page.getByRole('heading', { name: 'Skåring av motoriske oppgaver i NUBU 4-16', exact: true })
  const row = page.locator('.menu-message-row')
  const messages = page.getByRole('region', { name: 'Meldinger', exact: true })
  const trigger = page.getByRole('button', { name: 'Arkiv', exact: true })
  async function geometry() {
    return { heading: await heading.boundingBox(), row: await row.boundingBox(), actions: await page.locator('.form-actions').boundingBox() }
  }
  async function noOverlap() {
    const menuBox = await trigger.boundingBox(), messageBox = await messages.boundingBox()
    assert.ok(menuBox.x + menuBox.width < messageBox.x)
    assert.equal(await messages.evaluate(node => node.scrollWidth <= node.clientWidth), true)
    assert.equal(await row.evaluate(node => getComputedStyle(node).borderBottomWidth), '0px')
    assert.equal(await page.locator('.archive-bar').evaluate(node => getComputedStyle(node).borderBottomWidth), '0px')
  }
  for (const width of [1000, 641, 600, 400, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    const empty = await geometry()
    const download = page.waitForEvent('download')
    await command(page, 'Last ned…')
    await page.getByRole('dialog').getByRole('button', { name: 'Last ned', exact: true }).click()
    await download
    await page.getByRole('button', { name: 'Lukk melding', exact: true }).waitFor()
    assert.deepEqual(await geometry(), empty)
    await noOverlap()
    if (process.env.NUBU_SCREENSHOT_DIR && [641, 320].includes(width)) {
      await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, `message-${width}.png`) })
    }
    await page.getByRole('button', { name: 'Lukk melding', exact: true }).click()
    assert.deepEqual(await geometry(), empty)
    // A serialization error uses a longer message without changing the file workflow.
    await page.getByLabel('Navn:', { exact: true }).fill('Fiktiv 😀')
    await command(page, 'Last ned…')
    await page.locator('.file-feedback[role="alert"]').waitFor()
    assert.deepEqual(await geometry(), empty)
    await noOverlap()
    await page.getByRole('button', { name: 'Lukk melding', exact: true }).click()
    await page.getByLabel('Navn:', { exact: true }).fill('')
  }
  if (process.env.NUBU_SCREENSHOT_DIR) {
    await page.setViewportSize({ width: 800, height: 850 })
    await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, 'main-adjusted.png') })
    await trigger.click()
    await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, 'menu-adjusted.png') })
    await page.getByRole('menuitem', { name: 'Vis resultat', exact: true }).click()
    await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, 'result-adjusted.png') })
  }
})


const insufficient = 'Resultat kan bare vises når minst tre oppgaver er gjennomført innenfor de valgte områdene.'
async function showResults(page) {
  await page.getByRole('button', { name: 'Vis resultat', exact: true }).click()
  await page.getByRole('heading', { name: 'Vis resultat', exact: true }).waitFor()
}
async function expectOnlyMessage(page, message) {
  const report = page.locator('.result-presentation')
  await report.getByText(message, { exact: true }).waitFor()
  assert.deepEqual(await report.evaluate(node => ({ count: node.children.length, text: node.textContent })), { count: 1, text: message })
  assert.equal(await page.locator('.result-view').getAttribute('data-printable'), 'false')
  assert.equal(await page.getByRole('checkbox', { name: 'A-oppgaver', exact: true }).isEnabled(), true)
}
async function expectValue(page, label, value) {
  await page.waitForFunction(({ label, value }) => {
    const sheet = document.querySelector('.report-sheet')
    if (!sheet) return false
    const scores = [...sheet.querySelectorAll('[data-object^="item_"]')]
      .map(node => /\(([012])\)/.exec(node.textContent))
      .filter(Boolean).map(match => Number(match[1]))
    if (label === 'Gjennomførte oppgaver') return scores.length === Number(value)
    if (label === 'Poengsum') return scores.reduce((sum, score) => sum + score, 0) === Number(value)
    if (label === 'Valgte områder') {
      return [...document.querySelectorAll('.result-area-controls input:checked')]
        .map(node => node.closest('label').textContent.trim()[0]).join(', ') === value
    }
    const text = sheet.querySelector('[data-object="output"]').textContent
    return text.split('\n').some(line => line.includes(label.includes('Rasch') ? '(Rasch-skår)' : '(Aldersekvivalent)') && line.trim().endsWith(value))
  }, { label, value: String(value) })
}

test('result controls recover from insufficient data and no selected areas without stale values', async t => {
  const page = await pageFor(t)
  await showResults(page)
  await expectOnlyMessage(page, insufficient)
  if (process.env.NUBU_SCREENSHOT_DIR) await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, '7C1-insufficient.png') })
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.result-view').isVisible(), false)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  for (const [item, score] of [['A1', '0'], ['A2', '1'], ['A3', '2']]) await page.getByRole('textbox', { name: item, exact: true }).fill(score)
  const before = await snapshot(page)
  await showResults(page)
  await expectValue(page, 'Gjennomførte oppgaver', 3)
  await expectValue(page, 'Poengsum', 3)
  assert.equal(await page.locator('[data-object="output"]').filter({ hasText: 'Samleskår (Rasch-skår)' }).count(), 0)
  await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).check()
  await page.locator('[data-object="output"]').filter({ hasText: 'Samleskår (Rasch-skår)' }).waitFor()
  await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).uncheck()
  assert.equal(await page.locator('[data-object="output"]').filter({ hasText: 'Samleskår (Rasch-skår)' }).count(), 0)
  await page.getByRole('checkbox', { name: 'A-oppgaver', exact: true }).uncheck()
  await expectOnlyMessage(page, insufficient)
  for (const area of 'BCDE') await page.getByRole('checkbox', { name: `${area}-oppgaver`, exact: true }).uncheck()
  await expectOnlyMessage(page, 'Velg minst ett område for å vise resultat.')
  await page.getByRole('checkbox', { name: 'A-oppgaver', exact: true }).check()
  await expectValue(page, 'Gjennomførte oppgaver', 3)
  // Empty B remains a permissible part of the selected combination.
  await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).check()
  await expectValue(page, 'Valgte områder', 'A, B')
  await expectValue(page, 'Gjennomførte oppgaver', 3)
  if (process.env.NUBU_SCREENSHOT_DIR) {
    await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).check()
    for (const width of [641, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.equal(await page.locator('.result-view').evaluate(node => node.scrollWidth <= node.clientWidth), true)
      await page.locator('.registration-window').screenshot({ path: path.join(process.env.NUBU_SCREENSHOT_DIR, `7C1-valid-${width}.png`) })
    }
  }
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.result-controls').isVisible(), false)
  assert.equal(await page.locator('.result-presentation').isVisible(), true)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  assert.deepEqual(await snapshot(page), before)
  await page.getByRole('textbox', { name: 'A3', exact: true }).fill('')
  await command(page, 'Vis resultat')
  await expectOnlyMessage(page, insufficient)
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), true)
})

test('Rasch persists while Ny, Åpne and Tøm formular reset only the area selection', async t => {
  const page = await pageFor(t)
  await openReference(page)
  const before = await snapshot(page)
  await showResults(page)
  await expectValue(page, 'Gjennomførte oppgaver', 12)
  await expectValue(page, 'Samleskår (aldersekvivalent)', '6:10')
  await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).check()
  await expectValue(page, 'Samleskår (Rasch-skår)', '-0.15')
  for (const area of 'BCDE') await page.getByRole('checkbox', { name: `${area}-oppgaver`, exact: true }).uncheck()
  await expectValue(page, 'Gjennomførte oppgaver', 3)
  await expectValue(page, 'Samleskår (Rasch-skår)', '-0.40')
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  assert.deepEqual(await snapshot(page), before)
  await command(page, 'Vis resultat')
  await expectValue(page, 'Samleskår (Rasch-skår)', '-0.40')
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  const download = page.waitForEvent('download')
  await command(page, 'Last ned…')
  await page.getByRole('dialog').getByRole('button', { name: 'Last ned', exact: true }).click()
  await download
  await showResults(page)
  await expectValue(page, 'Samleskår (Rasch-skår)', '-0.40')
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), false)
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await command(page, 'Ny')
  await page.getByText('Ingen ulagrede endringer', { exact: true }).waitFor()
  await showResults(page)
  await expectOnlyMessage(page, insufficient)
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), true)
  assert.equal(await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).isChecked(), true)
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await openReference(page)
  await showResults(page)
  await expectValue(page, 'Samleskår (Rasch-skår)', '-0.15')
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), true)
  await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await page.getByRole('textbox', { name: 'Navn:', exact: true }).fill('Fiktiv endring')
  await page.getByRole('button', { name: 'Tøm formular', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt', exact: true }).click()
  await showResults(page)
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), false)
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await page.getByRole('button', { name: 'Tøm formular', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click()
  await showResults(page)
  await expectOnlyMessage(page, insufficient)
  assert.equal(await page.getByRole('checkbox', { name: 'B-oppgaver', exact: true }).isChecked(), true)
  assert.equal(await page.getByRole('checkbox', { name: 'Vis Rasch-skår', exact: true }).isChecked(), true)
})
