const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { workflowMessage, fileNameMessage, DOWNLOAD_NOTICE, OPEN_DIRTY_NOTICE, updateFileMessage, registrationCaption } = loadTypeScript('file/fileMessages.ts')

test('file errors and download notice use the approved Bokmål wording', () => {
  assert.equal(workflowMessage({ kind: 'error', code: 'read-failed' }), 'Kunne ikke åpne filen.')
  assert.equal(workflowMessage({ kind: 'error', code: 'format', detail: {} }), 'Kunne ikke åpne filen.')
  assert.equal(DOWNLOAD_NOTICE, 'Nedlastingen er startet. Kontroller at filen blir lagret.')
  assert.match(OPEN_DIRTY_NOTICE, /Last ned før/)
  assert.equal(workflowMessage({ kind: 'cancelled' }), null)
  assert.match(workflowMessage({ kind: 'error', code: 'download-failed' }), /ikke lagret/)
})

test('a single persistent download notice survives editing, can be dismissed and is replaced by newer messages', () => {
  const notice = { kind: 'notice', text: DOWNLOAD_NOTICE }
  let state = updateFileMessage(null, { kind: 'show', message: notice })
  for (let edit = 0; edit < 10; edit++) state = updateFileMessage(state, { kind: 'edit' })
  assert.deepEqual(state, notice)
  const error = { kind: 'error', text: OPEN_DIRTY_NOTICE }
  state = updateFileMessage(state, { kind: 'show', message: error })
  assert.deepEqual(state, error)
  state = updateFileMessage(state, { kind: 'show', message: notice })
  assert.deepEqual(state, notice)
  assert.equal(updateFileMessage(state, { kind: 'dismiss' }), null)
  assert.equal(updateFileMessage(error, { kind: 'edit' }), null)
})

test('caption distinguishes opened-file association from successful download history', () => {
  const prefix = 'Skåring av motoriske oppgaver i NUBU 4-16 '
  assert.equal(registrationCaption({ association: null, downloadInitiated: false }), prefix + '(Ikke lagret)')
  assert.equal(registrationCaption({ association: { fileName: 'Opened.egen' }, downloadInitiated: false }), prefix + '(Opened.egen)')
  for (const association of [null, { fileName: 'Opened.egen' }]) {
    assert.equal(registrationCaption({ association, downloadInitiated: true }), prefix + '(Endringer lastet ned)')
  }
})

test('encoding failures identify the exact field and character without silently replacing it', () => {
  const message = workflowMessage({ kind: 'error', code: 'serialization', detail: { code: 'unrepresentable-character', field: 'note2', character: '😀', index: 0 } })
  assert.match(message, /Merknad 2/)
  assert.match(message, /😀/)
  assert.match(message, /U\+1F600/)
  assert.equal(message, 'Merknad 2 inneholder tegnet «😀» (U+1F600). Rett feltet og prøv igjen.')
  const control = workflowMessage({ kind: 'error', code: 'serialization', detail: { code: 'control-character', field: 'items', itemIndex: 49, character: '\n', index: 0 } })
  assert.match(control, /E10/)
  assert.match(control, /U\+000A/)
  assert.equal(control.includes('\n'), false)
  for (const code of ['empty', 'invalid-character', 'trailing-dot-or-space', 'reserved-name']) assert.ok(fileNameMessage(code))
})
