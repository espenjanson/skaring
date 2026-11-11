const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { createReportPrinter } = loadTypeScript('report/printing.ts')

test('print titles use only the known file stem and restore after completion or cancellation', () => {
  const document = { title: 'NUBU' }
  const events = new EventTarget()
  const seen = []
  const browser = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    print: () => seen.push(document.title),
  }
  const printer = createReportPrinter(browser, document)
  for (const [file, expected] of [['Test201_100.~Z4', 'Resultat Test201_100'], ['test.case.~Z4', 'Resultat test.case'], ['Test201_100', 'Resultat Test201_100'], [undefined, 'Resultat']]) {
    printer.print(file)
    assert.equal(document.title, expected)
    events.dispatchEvent(new Event('afterprint'))
    assert.equal(document.title, 'NUBU')
  }
  assert.equal(seen.length, 4)
  // Back/unmount must restore even if the browser has not sent afterprint.
  printer.print('Test201.~Z4')
  printer.restore()
  document.title = 'Later title'
  events.dispatchEvent(new Event('afterprint'))
  assert.equal(document.title, 'Later title')
})

test('repeated print attempts and print-start failures clean up titles and listeners', () => {
  const document = { title: 'NUBU' }
  const listeners = new Set()
  let fail = false
  const browser = {
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    print: () => { if (fail) throw new Error('Print unavailable') },
  }
  const printer = createReportPrinter(browser, document)
  printer.print('first.~Z4')
  printer.print('second.~Z4')
  assert.equal(listeners.size, 1)
  fail = true
  assert.throws(() => printer.print(), /Print unavailable/)
  assert.equal(listeners.size, 0)
  assert.equal(document.title, 'NUBU')
})
