const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { defaultFileName } = loadTypeScript('file/fileName.ts')

test('default file name uses the supplied local day and a two-digit year', () => {
  for (const [date, expected] of [
    [new Date(2026, 9, 22, 0, 1), 'Motorisk test 22.10.26.~Z4'],
    [new Date(2026, 0, 2, 23, 59), 'Motorisk test 02.01.26.~Z4'],
    [new Date(2000, 1, 29), 'Motorisk test 29.02.00.~Z4'],
    [new Date(2099, 11, 31), 'Motorisk test 31.12.99.~Z4'],
    [new Date(2100, 0, 1), 'Motorisk test 01.01.00.~Z4'],
  ]) assert.equal(defaultFileName(date), expected)
})
