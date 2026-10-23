const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { defaultFileName, fileNameError } = loadTypeScript('file/fileName.ts')

test('default file name uses the supplied local day and a two-digit year', () => {
  for (const [date, expected] of [
    [new Date(2026, 9, 22, 0, 1), 'Motorisk test 22.10.26.~Z4'],
    [new Date(2026, 0, 2, 23, 59), 'Motorisk test 02.01.26.~Z4'],
    [new Date(2000, 1, 29), 'Motorisk test 29.02.00.~Z4'],
    [new Date(2099, 11, 31), 'Motorisk test 31.12.99.~Z4'],
    [new Date(2100, 0, 1), 'Motorisk test 01.01.00.~Z4'],
  ]) assert.equal(defaultFileName(date), expected)
})

test('file names and extensions can be changed without adding a default extension', () => {
  for (const name of ['Barn.~Z4', 'Åse.egen', 'Uten endelse', 'Barn 22.10.26', 'CONTEXT', 'com10.txt']) {
    assert.equal(fileNameError(name), null)
  }
  for (const name of ['', ' ']) assert.equal(fileNameError(name), 'empty')
  for (const name of ['a/b', 'a\\b', 'a\nb', 'a:b', 'a?b', 'a*b', 'a|b', 'a"b', 'a<b', 'a>b']) {
    assert.equal(fileNameError(name), 'invalid-character')
  }
  for (const name of ['Barn.', 'Barn ']) assert.equal(fileNameError(name), 'trailing-dot-or-space')
  for (const name of ['CON', 'nul.txt', 'AUX.~Z4', 'com1', 'LPT9.txt']) assert.equal(fileNameError(name), 'reserved-name')
})
