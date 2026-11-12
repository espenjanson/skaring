// Uses the bundled Playwright runtime and a local server; fixtures never leave the browser.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { chromium } = require('playwright')
let browser
before(async () => { browser = await chromium.launch({ headless: true, channel: process.env.NUBU_BROWSER_CHANNEL || 'msedge' }) })
after(async () => { await browser?.close() })

async function setup(t, include399 = false) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nubu-export-'))
  t.after(() => fs.rm(dir, {recursive: true, force: true}))
  const source = path.join(__dirname, '../docs/reference-tests/datafiler')
  for (const entry of await fs.readdir(source, {withFileTypes: true})) if (entry.isFile()) await fs.copyFile(path.join(source, entry.name), path.join(dir, entry.name))
  if (include399) await fs.copyFile(path.join(source, 'Undantagna/Test399.~Z4'), path.join(dir, 'Test399.~Z4'))
  await fs.mkdir(path.join(dir, 'Under'))
  await fs.writeFile(path.join(dir, 'Under', 'Ignored.txt'), 'unrelated')
  const context = await browser.newContext({ acceptDownloads: true, viewport: {width: 1000, height: 900} })
  t.after(() => context.close())
  const page = await context.newPage()
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  t.after(() => assert.deepEqual(errors, []))
  await page.goto(process.env.NUBU_TEST_URL || 'http://127.0.0.1:3000')
  await page.getByRole('button', {name: 'Arkiv', exact: true}).waitFor()
  return {page, dir}
}
async function command(page, name) {
  await page.getByRole('button', {name: 'Arkiv', exact: true}).click()
  await page.getByRole('menuitem', {name, exact: true}).click()
}
async function selectDirectory(page, dir) {
  const chooser = page.waitForEvent('filechooser')
  await command(page, 'Eksporter data…')
  await (await chooser).setFiles(dir)
}
async function formSnapshot(page) {
  return page.locator('.registration-content').evaluate(node => ({
    fields: [...node.querySelectorAll('input')].map(n => [n.value, n.checked, n.readOnly]),
    status: node.querySelector('.change-status').textContent,
    caption: document.querySelector('.window-caption').textContent,
  }))
}

test('14-file download, nested files ignored, repeated directory selection and untouched registration/settings', async t => {
  const {page, dir} = await setup(t)
  const chooser = page.waitForEvent('filechooser')
  await command(page, 'Åpne…')
  await (await chooser).setFiles(path.join(__dirname, '../docs/reference-tests/datafiler/Test201_100.~Z4'))
  await page.getByText('Endringer lagret', {exact: true}).waitFor()
  await page.getByLabel('Navn:', {exact: true}).fill('Ulagret "navn"')
  await page.getByLabel('Navn:', {exact: true}).blur()
  await command(page, 'Vis resultat')
  await page.getByRole('checkbox', {name: 'B-oppgaver', exact: true}).uncheck()
  await page.getByRole('checkbox', {name: 'Vis Rasch-skår', exact: true}).check()
  await page.getByRole('button', {name: 'Tilbake', exact: true}).click()
  const before = await formSnapshot(page)
  let firstBytes
  for (let repeat = 0; repeat < 2; repeat++) {
    await selectDirectory(page, dir)
    const dialog = page.getByRole('dialog', {name: 'Last ned dataeksport', exact: true})
    await dialog.waitFor()
    assert.equal(await dialog.getByLabel('Filnavn:').inputValue(), 'Data.txt')
    const downloaded = page.waitForEvent('download')
    await dialog.getByRole('button', {name: 'Last ned', exact: true}).click()
    const download = await downloaded
    assert.equal(download.suggestedFilename(), 'Data.txt')
    const bytes = await fs.readFile(await download.path())
    assert.deepEqual([...bytes.slice(0,3)], [239,187,191])
    const rows = bytes.toString('utf8').replace(/^\ufeff/, '').split('\r\n')
    assert.equal(rows.pop(), '')
    assert.equal(rows.length, 15)
    for (const row of rows) assert.equal(row.split('\t').length, 18)
    assert.ok(rows.find(r => r.startsWith('Test209.')).endsWith('\t'))
    if (firstBytes) assert.deepEqual(bytes, firstBytes)
    firstBytes = bytes
    await page.getByRole('dialog').getByRole('button', {name: 'Lukk', exact: true}).click()
    assert.deepEqual(await formSnapshot(page), before)
    assert.equal(await page.getByLabel('Velg mappe for dataeksport').inputValue(), '')
  }
  await command(page, 'Vis resultat')
  assert.equal(await page.getByRole('checkbox', {name: 'B-oppgaver', exact: true}).isChecked(), false)
  assert.equal(await page.getByRole('checkbox', {name: 'Vis Rasch-skår', exact: true}).isChecked(), true)
})

test('Test399 aborts with concrete reason and no download, then permits retry', async t => {
  const {page, dir} = await setup(t, true)
  const before = await formSnapshot(page)
  let downloads = 0; page.on('download', () => downloads++)
  await selectDirectory(page, dir)
  await page.getByRole('alert').filter({hasText: 'Test399.~Z4'}).waitFor()
  assert.match(await page.getByRole('dialog').getByRole('alert').textContent(), /Minst tre gyldige oppgaveskårer/)
  assert.equal(downloads, 0)
  assert.deepEqual(await formSnapshot(page), before)
  assert.equal(await page.getByLabel('Velg mappe for dataeksport').inputValue(), '')
  await page.getByRole('dialog').getByRole('button', {name: 'Lukk', exact: true}).click()
  await selectDirectory(page, dir)
  await page.getByRole('alert').filter({hasText: 'Test399.~Z4'}).waitFor()
  assert.equal(downloads, 0)
})

test('cancel event, empty selection and download cancellation leave the form unchanged', async t => {
  const {page, dir} = await setup(t)
  const before = await formSnapshot(page)
  let downloads = 0; page.on('download', () => downloads++)
  // Suppress only native picker opening so its browser cancel event can be exercised.
  await page.getByLabel('Velg mappe for dataeksport').evaluate(n => { n.click = () => {} })
  await command(page, 'Eksporter data…')
  await page.getByRole('dialog', {name: 'Dataeksport', exact: true}).waitFor()
  await page.getByLabel('Velg mappe for dataeksport').dispatchEvent('cancel')
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.deepEqual(await formSnapshot(page), before)
  await command(page, 'Eksporter data…')
  await page.getByLabel('Velg mappe for dataeksport').dispatchEvent('change')
  await page.getByRole('status').filter({hasText: 'Ingen filer direkte'}).waitFor()
  await page.getByRole('dialog').getByRole('button', {name: 'Lukk', exact: true}).click()
  await page.getByLabel('Velg mappe for dataeksport').evaluate(n => { delete n.click })
  await selectDirectory(page, dir)
  await page.getByRole('dialog', {name: 'Last ned dataeksport', exact: true}).getByRole('button', {name: 'Avbryt', exact: true}).click()
  assert.equal(downloads, 0)
  assert.deepEqual(await formSnapshot(page), before)
})

test('cancelling a pending read discards its late result and releases the UI', async t => {
  const {page, dir} = await setup(t, true)
  const before = await formSnapshot(page)
  let downloads = 0; page.on('download', () => downloads++)
  await page.evaluate(() => {
    const read = File.prototype.arrayBuffer
    File.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => {
        window.finishExportRead = () => read.call(this).then(resolve, reject)
      })
    }
  })
  await selectDirectory(page, dir)
  await page.getByRole('status').filter({hasText: 'Leser og beregner'}).waitFor()
  await page.getByRole('dialog').getByRole('button', {name: 'Avbryt', exact: true}).click()
  await page.evaluate(async () => { await window.finishExportRead() })
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.equal(await page.getByRole('button', {name: 'Arkiv', exact: true}).isEnabled(), true)
  assert.equal(downloads, 0)
  assert.deepEqual(await formSnapshot(page), before)
})
