// The adapter is simulated by supplying token-tagged outcomes; no browser IO is used.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { FileWorkflow } = loadTypeScript('domain/fileWorkflow.ts')
const { createRegistration } = loadTypeScript('domain/registration.ts')
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts')
const { encodeWindows1252 } = loadTypeScript('file/windows1252.ts')

function workflow() {
  return new FileWorkflow(() => new Date(2026, 9, 22, 12))
}

function record(changes = {}) {
  const { ageSource, ...data } = createRegistration(new Date(2026, 9, 21))
  return { ...data, name: 'Åse', note: 'første', note2: 'andre', age: '7:6', ...changes }
}

function bytes(changes = {}) {
  const result = serializeNubu100(record(changes))
  assert.equal(result.ok, true)
  return result.bytes
}

function phase(w, kind) {
  const result = w.getSnapshot().phase
  assert.equal(result.kind, kind)
  return result
}

function content(w) {
  const { phase, ...data } = w.getSnapshot()
  return data
}

function edit(w, changes) {
  return w.edit({ ...w.getSnapshot().current, ...changes })
}

function startRead(w) {
  assert.equal(w.requestOpen().kind, 'ok')
  const selected = phase(w, 'choose-file')
  assert.equal(w.beginRead(selected.token).kind, 'ok')
  return phase(w, 'reading').token
}

function open(w, data = bytes(), fileName = 'Barn.~Z4') {
  const result = w.receiveRead(startRead(w), { kind: 'read', fileName, bytes: data })
  assert.equal(result.kind, 'opened')
  return result
}

function prepareDownload(w, { fileName } = {}) {
  assert.equal(w.requestDownload().kind, 'ok')
  const name = phase(w, 'file-name')
  assert.equal(w.chooseFileName(name.token, fileName ?? name.suggestedName).kind, 'ok')
  return phase(w, 'download')
}

function finishSave(w, options) {
  const download = prepareDownload(w, options)
  assert.equal(w.receiveDownload(download.token, 'started').kind, 'saved')
  return download
}

test('initial registration, reference and association are logically separate and immutable', () => {
  const w = workflow()
  const state = w.getSnapshot()
  assert.equal(state.status, 'Ingen ulagrede endringer')
  assert.equal(state.association, null)
  assert.deepEqual(state.current, state.reference)
  assert.notEqual(state.current, state.reference)
  assert.notEqual(state.current.items, state.reference.items)
  assert.ok(Object.isFrozen(state.current))
  assert.ok(Object.isFrozen(state.current.items))
  assert.ok(Object.isFrozen(state.reference))
  assert.ok(Object.isFrozen(state.phase))
  assert.equal(state.current.testDate, '22.10.2026')
})

test('a successful open publishes current content, reference and exact chosen name together', () => {
  const w = workflow()
  const before = content(w)
  const token = startRead(w)
  assert.deepEqual(content(w), before)
  const input = bytes({ items: Array(50).fill('d'), gender: 'jente', note2: 'ø €' })
  assert.equal(w.receiveRead(token, { kind: 'read', fileName: 'Barn.egen', bytes: input }).kind, 'opened')
  const state = w.getSnapshot()
  assert.deepEqual(state.association, { fileName: 'Barn.egen' })
  assert.equal(state.status, 'Endringer lagret')
  assert.equal(state.current.name, 'Åse')
  assert.equal(state.current.note2, 'ø €')
  assert.deepEqual(state.current.items, Array(50).fill('d'))
  assert.deepEqual(state.current, state.reference)
  assert.notEqual(state.current.items, state.reference.items)
  assert.equal(w.receiveRead(token, { kind: 'read', fileName: 'Duplicate', bytes: input }).kind, 'ignored')
})

test('opening recalculates eligible age in both copies without modifying the file parser or input bytes', () => {
  for (const age of ['wrong', '', '99:11']) {
    const w = workflow()
    const input = bytes({ birthDate: '16.10.2022', testDate: '16.10.2026', age })
    const before = input.slice()
    assert.equal(parseNubu100(input).record.age, age)
    open(w, input)
    const state = w.getSnapshot()
    assert.equal(state.current.age, '4:0')
    assert.equal(state.current.ageSource, 'automatic')
    assert.equal(state.reference.age, '4:0')
    assert.equal(state.status, 'Endringer lagret')
    assert.deepEqual(input, before)
    const saved = finishSave(w)
    assert.equal(parseNubu100(saved.bytes).record.age, '4:0')
  }
})

test('opening outside the age range or with invalid/missing dates preserves stored age text', () => {
  for (const dates of [
    { birthDate: '', testDate: '' },
    { birthDate: 'wrong', testDate: '22.10.2026' },
    { birthDate: '22.10.2026', testDate: '21.10.2026' },
    { birthDate: '22.10.2026', testDate: '22.10.2026' },
    { birthDate: '01.01.1900', testDate: '22.10.2026' },
  ]) {
    const w = workflow()
    open(w, bytes({ ...dates, age: 'stored text' }))
    const state = w.getSnapshot()
    assert.equal(state.current.age, 'stored text')
    assert.equal(state.reference.age, 'stored text')
    assert.equal(state.current.ageSource, 'manual')
    assert.equal(state.current.birthDate, dates.birthDate)
    assert.equal(state.current.testDate, dates.testDate)
    assert.equal(state.status, 'Endringer lagret')
  }
})

for (const id of [302, 303, 304]) {
  test(`reference ${id} opens and saves with established age and exact original bytes`, () => {
    const w = workflow()
    const input = fs.readFileSync(path.join(__dirname, `../docs/reference-tests/datafiler/Test${id}.~Z4`))
    open(w, input, `Test${id}.~Z4`)
    assert.equal(w.getSnapshot().current.age, '4:0')
    assert.equal(w.getSnapshot().reference.age, '4:0')
    assert.equal(w.getSnapshot().current.ageSource, id === 304 ? 'manual' : 'automatic')
    const saved = finishSave(w)
    assert.deepEqual(Buffer.from(saved.bytes), input)
  })
}

test('read failures, malformed files and cancellations preserve all document state', () => {
  const w = workflow()
  open(w)
  const before = content(w)
  for (const outcome of [
    { kind: 'failed' }, { kind: 'cancelled' },
    { kind: 'read', fileName: 'Broken.~Z4', bytes: Uint8Array.of(1, 2, 3) },
    { kind: 'read', fileName: '', bytes: bytes() },
  ]) {
    const token = startRead(w)
    const result = w.receiveRead(token, outcome)
    assert.ok(['error', 'cancelled'].includes(result.kind))
    assert.deepEqual(content(w), before)
    phase(w, 'idle')
  }
  w.requestOpen()
  assert.equal(w.cancel(phase(w, 'choose-file').token).kind, 'cancelled')
  assert.deepEqual(content(w), before)
})

test('unknown identifiers including _101 require a decision and cannot publish content early', () => {
  for (const identifier of ['NUBUMotor_101', 'OtherFormat']) {
    for (const choice of ['continue', 'cancel']) {
      const w = workflow()
      open(w)
      const before = content(w)
      const text = new TextDecoder('windows-1252').decode(bytes({ name: 'Another', birthDate: '16.10.2022', testDate: '16.10.2026', age: 'wrong' }))
      const input = encodeWindows1252(text.replace('NUBUMotor_100', identifier)).bytes
      assert.equal(w.receiveRead(startRead(w), { kind: 'read', fileName: 'Unknown.ext', bytes: input }).kind, 'ok')
      const pending = phase(w, 'unknown-format')
      assert.equal(pending.identifier, identifier)
      assert.equal(pending.record.age, 'wrong')
      assert.deepEqual(content(w), before)
      input.fill(0)
      const result = w.chooseUnknownFormat(pending.token, choice)
      if (choice === 'cancel') {
        assert.equal(result.kind, 'cancelled')
        assert.deepEqual(content(w), before)
      } else {
        assert.equal(result.kind, 'opened')
        assert.equal(w.getSnapshot().current.name, 'Another')
        assert.equal(w.getSnapshot().current.age, '4:0')
        assert.equal(w.getSnapshot().reference.age, '4:0')
        assert.equal(w.getSnapshot().association.fileName, 'Unknown.ext')
      }
      assert.equal(w.chooseUnknownFormat(pending.token, choice).kind, 'ignored')
    }
  }
})

test('the same file and name can be opened repeatedly', () => {
  const w = workflow()
  const input = bytes()
  open(w, input, 'Same.~Z4')
  const before = content(w)
  open(w, input, 'Same.~Z4')
  assert.deepEqual(content(w), before)
})

test('restoring registration content restores new or saved status, ignoring age provenance', () => {
  for (const saved of [false, true]) {
    const w = workflow()
    if (saved) open(w)
    const original = w.getSnapshot().current
    const expected = saved ? 'Endringer lagret' : 'Ingen ulagrede endringer'
    edit(w, { name: 'changed' })
    assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
    w.edit({ ...original, ageSource: 'automatic' })
    assert.equal(w.getSnapshot().status, expected)
    w.requestOpen()
    phase(w, 'choose-file')
  }
})

test('New creates a fresh local-date registration/reference and removes the association', () => {
  let today = new Date(2026, 9, 22)
  const w = new FileWorkflow(() => today)
  open(w)
  today = new Date(2026, 9, 23)
  assert.equal(w.requestNew().kind, 'new')
  const state = w.getSnapshot()
  assert.deepEqual(state.current, createRegistration(today))
  assert.deepEqual(state.reference, state.current)
  assert.notEqual(state.reference, state.current)
  assert.equal(state.association, null)
  assert.equal(state.status, 'Ingen ulagrede endringer')
})

test('clear-form confirmation preserves metadata and reference and uses ordinary comparison', () => {
  const w = workflow()
  const initial = content(w)
  assert.equal(w.clearForm(true).kind, 'ok')
  assert.deepEqual(content(w), initial)
  open(w)
  const before = content(w)
  assert.equal(w.clearForm(false).kind, 'cancelled')
  assert.deepEqual(content(w), before)
  w.clearForm(true)
  assert.deepEqual(w.getSnapshot().reference, before.reference)
  assert.deepEqual(w.getSnapshot().association, before.association)
  assert.deepEqual(w.getSnapshot().current, createRegistration(new Date(2026, 9, 22)))
  assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
  w.edit(before.current)
  assert.equal(w.getSnapshot().status, 'Endringer lagret')
})

test('repeated downloads without an opened file always propose the current local date', () => {
  let today = new Date(2026, 9, 22)
  const w = new FileWorkflow(() => today)
  edit(w, { testDate: '01.01.2000' })
  w.requestDownload()
  assert.equal(phase(w, 'file-name').suggestedName, 'Motorisk test 22.10.26.~Z4')
  w.chooseFileName(phase(w, 'file-name').token, 'Min fil.egen')
  assert.equal(w.getSnapshot().association, null)
  w.receiveDownload(phase(w, 'download').token, 'started')
  assert.equal(w.getSnapshot().association, null)
  assert.equal(w.getSnapshot().downloadInitiated, true)
  today = new Date(2026, 9, 23)
  w.requestDownload()
  assert.equal(phase(w, 'file-name').suggestedName, 'Motorisk test 23.10.26.~Z4')
  w.cancel(phase(w, 'file-name').token)
  w.requestDownload()
  assert.equal(phase(w, 'file-name').suggestedName, 'Motorisk test 23.10.26.~Z4')
  w.chooseFileName(phase(w, 'file-name').token, 'Åse uten endelse')
  w.receiveDownload(phase(w, 'download').token, 'started')
  assert.equal(w.getSnapshot().association, null)
  assert.equal(w.getSnapshot().status, 'Endringer lagret')
})

test('repeated downloads retain the last opened name regardless of the downloaded name or extension', () => {
  const w = workflow()
  open(w, bytes(), 'Original.ANNET')
  w.requestDownload()
  assert.equal(phase(w, 'file-name').suggestedName, 'Original.ANNET')
  w.chooseFileName(phase(w, 'file-name').token, 'Downloaded without extension')
  assert.equal(phase(w, 'download').fileName, 'Downloaded without extension')
  w.receiveDownload(phase(w, 'download').token, 'started')
  w.requestDownload()
  assert.equal(phase(w, 'file-name').suggestedName, 'Original.ANNET')
  assert.equal(w.getSnapshot().association.fileName, 'Original.ANNET')
})

test('the proposed save date is captured at flow start even if validation crosses midnight', () => {
  let today = new Date(2026, 9, 22, 23, 59)
  const w = new FileWorkflow(() => today)
  edit(w, { birthDate: 'wrong' })
  w.requestDownload()
  today = new Date(2026, 9, 23, 0, 1)
  w.chooseValidation(phase(w, 'validation').token, { kind: 'continue' })
  assert.equal(phase(w, 'file-name').suggestedName, 'Motorisk test 22.10.26.~Z4')
})

test('only successful download initiation updates reference and history, never the opened association', () => {
  for (const opened of [false, true]) {
    for (const outcome of ['started', 'failed', 'cancelled']) {
      const w = workflow()
      if (opened) open(w)
      edit(w, { note2: 'edited' })
      const before = content(w)
      const download = prepareDownload(w, { fileName: 'Chosen.new' })
      assert.deepEqual(content(w), before)
      const result = w.receiveDownload(download.token, outcome)
      if (outcome === 'started') {
        assert.equal(result.kind, 'saved')
        assert.deepEqual(w.getSnapshot().reference, w.getSnapshot().current)
        assert.equal(w.getSnapshot().reference.note2, 'edited')
        assert.deepEqual(w.getSnapshot().association, before.association)
        assert.equal(w.getSnapshot().downloadInitiated, true)
        assert.equal(w.getSnapshot().status, 'Endringer lagret')
      } else {
        assert.equal(result.kind, outcome === 'failed' ? 'error' : 'cancelled')
        assert.deepEqual(content(w), before)
      }
    }
  }
})

test('accepted validation blankings stay isolated until a successful initiation', () => {
  for (const outcome of ['started', 'failed', 'cancelled']) {
    const w = workflow()
    edit(w, { birthDate: 'bad birth', testDate: 'bad test', age: 'bad age' })
    const before = content(w)
    w.requestDownload()
    for (const field of ['birthDate', 'testDate', 'age']) {
      const pending = phase(w, 'validation')
      assert.equal(pending.validation.problem.field, field)
      w.chooseValidation(pending.token, { kind: 'continue' })
      assert.deepEqual(content(w), before)
    }
    const named = phase(w, 'file-name')
    assert.equal(parseNubu100(named.bytes).record.birthDate, '')
    assert.equal(parseNubu100(named.bytes).record.testDate, '')
    assert.equal(parseNubu100(named.bytes).record.age, '')
    w.chooseFileName(named.token, 'Validated.~Z4')
    const download = phase(w, 'download')
    w.receiveDownload(download.token, outcome)
    if (outcome === 'started') {
      assert.equal(w.getSnapshot().current.birthDate, '')
      assert.equal(w.getSnapshot().current.testDate, '')
      assert.equal(w.getSnapshot().current.age, '')
      assert.deepEqual(w.getSnapshot().current, w.getSnapshot().reference)
    } else assert.deepEqual(content(w), before)
  }
})

test('validation correction reaches serialized bytes and reference only on success', () => {
  const w = workflow()
  edit(w, { birthDate: 'wrong', testDate: '16.10.2026', age: 'wrong' })
  w.requestDownload()
  w.chooseValidation(phase(w, 'validation').token, { kind: 'correct', value: '16.10.22' })
  const name = phase(w, 'file-name')
  assert.equal(w.getSnapshot().current.birthDate, 'wrong')
  const serialized = parseNubu100(name.bytes).record
  assert.equal(serialized.birthDate, '16.10.2022')
  assert.equal(serialized.age, '4:0')
  w.chooseFileName(name.token, 'Corrected')
  w.receiveDownload(phase(w, 'download').token, 'started')
  assert.equal(w.getSnapshot().current.birthDate, serialized.birthDate)
  assert.equal(w.getSnapshot().reference.age, serialized.age)
  assert.equal(w.getSnapshot().current.ageSource, 'automatic')
})

test('out-of-range continuation preserves dates and age in serialized content and reference', () => {
  const w = workflow()
  edit(w, { birthDate: '22.10.2026', testDate: '21.10.2026', age: 'not an age' })
  const original = w.getSnapshot().current
  w.requestDownload()
  assert.equal(phase(w, 'validation').validation.problem.kind, 'date-pair-out-of-range')
  w.chooseValidation(phase(w, 'validation').token, { kind: 'continue' })
  const name = phase(w, 'file-name')
  assert.equal(parseNubu100(name.bytes).record.age, original.age)
  w.chooseFileName(name.token, 'Preserved')
  w.receiveDownload(phase(w, 'download').token, 'started')
  assert.deepEqual(w.getSnapshot().current, original)
  assert.deepEqual(w.getSnapshot().reference, original)
})

test('validation cancellation, invalid decisions and serialization errors leave content unchanged', () => {
  for (const choice of [{ kind: 'cancel' }, { kind: 'correct-dates', birthDate: '', testDate: '' }]) {
    const w = workflow()
    edit(w, { birthDate: 'wrong' })
    const before = content(w)
    w.requestDownload()
    const result = w.chooseValidation(phase(w, 'validation').token, choice)
    assert.ok(['cancelled', 'error'].includes(result.kind))
    assert.deepEqual(content(w), before)
    phase(w, 'idle')
  }
  const w = workflow()
  edit(w, { name: '😀' })
  const before = content(w)
  const result = w.requestDownload()
  assert.equal(result.kind, 'error')
  assert.equal(result.code, 'serialization')
  assert.equal(result.detail.field, 'name')
  assert.deepEqual(content(w), before)
  phase(w, 'idle')
})

test('invalid file names do not update metadata and the name step can be corrected or cancelled', () => {
  const w = workflow()
  const before = content(w)
  w.requestDownload()
  const name = phase(w, 'file-name')
  for (const fileName of ['', ' ', 'a/b', 'a\\b', 'a\nb']) {
    assert.equal(w.chooseFileName(name.token, fileName).kind, 'error')
    phase(w, 'file-name')
    assert.deepEqual(content(w), before)
  }
  assert.equal(w.cancel(name.token).kind, 'cancelled')
  assert.deepEqual(content(w), before)
})

test('saving an older snapshot preserves newer edits while referencing exactly the serialized version', () => {
  const w = workflow()
  edit(w, { name: 'Snapshot', birthDate: 'wrong', age: '4:0' })
  w.requestDownload()
  w.chooseValidation(phase(w, 'validation').token, { kind: 'continue' })
  w.chooseFileName(phase(w, 'file-name').token, 'Snapshot.~Z4')
  const download = phase(w, 'download')
  const stored = parseNubu100(download.bytes).record
  assert.equal(stored.birthDate, '')
  edit(w, { name: 'Later edit' })
  const later = w.getSnapshot().current
  w.receiveDownload(download.token, 'started')
  assert.deepEqual(w.getSnapshot().current, later)
  assert.equal(w.getSnapshot().reference.name, 'Snapshot')
  assert.equal(w.getSnapshot().reference.birthDate, '')
  assert.equal(w.getSnapshot().current.birthDate, 'wrong')
  const { ageSource, ...referenceContent } = w.getSnapshot().reference
  assert.deepEqual(referenceContent, stored)
  assert.equal(w.getSnapshot().association, null)
  assert.equal(w.getSnapshot().downloadInitiated, true)
  assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
})

test('byte buffers exposed by snapshots cannot corrupt the internal save payload', () => {
  const w = workflow()
  w.requestDownload()
  const name = phase(w, 'file-name')
  const before = name.bytes.slice()
  name.bytes.fill(0)
  assert.deepEqual(phase(w, 'file-name').bytes, before)
  w.chooseFileName(name.token, 'Safe')
  const download = phase(w, 'download')
  download.bytes.fill(0)
  assert.deepEqual(phase(w, 'download').bytes, before)
})

for (const target of ['open', 'new']) {
  for (const choice of ['save', 'discard', 'cancel']) {
    test(`unsaved ${target} supports ${choice} without premature replacement`, () => {
      const w = workflow()
      open(w)
      edit(w, { name: 'Edited' })
      const before = content(w)
      assert.equal((target === 'open' ? w.requestOpen() : w.requestNew()).kind, 'ok')
      const prompt = phase(w, 'unsaved-changes')
      assert.equal(prompt.next, target)
      assert.deepEqual(content(w), before)
      const result = w.chooseUnsaved(prompt.token, choice)
      if (choice === 'cancel') {
        assert.equal(result.kind, 'cancelled')
        assert.deepEqual(content(w), before)
      } else if (choice === 'discard') {
        if (target === 'new') {
          assert.equal(result.kind, 'new')
          assert.equal(w.getSnapshot().status, 'Ingen ulagrede endringer')
          assert.equal(w.getSnapshot().association, null)
        } else {
          phase(w, 'choose-file')
          assert.deepEqual(content(w), before)
        }
      } else {
        const name = phase(w, 'file-name')
        assert.deepEqual(content(w), before)
        w.chooseFileName(name.token, 'Saved edits')
        assert.deepEqual(content(w), before)
        const saved = w.receiveDownload(phase(w, 'download').token, 'started')
        assert.equal(saved.continuation, target)
        if (target === 'new') {
          assert.equal(w.getSnapshot().association, null)
          assert.equal(w.getSnapshot().current.name, '')
          assert.equal(w.getSnapshot().status, 'Ingen ulagrede endringer')
        } else {
          assert.equal(phase(w, 'choose-file').requiresUserClick, true)
          assert.equal(w.getSnapshot().association.fileName, 'Barn.~Z4')
          assert.equal(w.getSnapshot().downloadInitiated, true)
          assert.equal(w.getSnapshot().reference.name, 'Edited')
          assert.equal(w.getSnapshot().status, 'Endringer lagret')
        }
      }
    })
  }
}

test('a completed save survives subsequent cancelled, failed or malformed opening', () => {
  for (const outcome of [
    { kind: 'cancelled' }, { kind: 'failed' },
    { kind: 'read', fileName: 'Broken', bytes: Uint8Array.of(0) },
  ]) {
    const w = workflow()
    edit(w, { name: 'Saved first' })
    w.requestOpen()
    w.chooseUnsaved(phase(w, 'unsaved-changes').token, 'save')
    w.chooseFileName(phase(w, 'file-name').token, 'First saved')
    w.receiveDownload(phase(w, 'download').token, 'started')
    const saved = content(w)
    const choose = phase(w, 'choose-file')
    assert.equal(choose.requiresUserClick, true)
    w.beginRead(choose.token)
    w.receiveRead(phase(w, 'reading').token, outcome)
    assert.deepEqual(content(w), saved)
    assert.equal(w.getSnapshot().reference.name, 'Saved first')
    assert.equal(w.getSnapshot().association, null)
    assert.equal(w.getSnapshot().downloadInitiated, true)
  }
})

test('any save failure or cancellation prevents a requested New or Open', () => {
  for (const target of ['open', 'new']) {
    for (const where of ['validation', 'file-name', 'failed-download', 'cancelled-download', 'serialization']) {
      const w = workflow()
      edit(w, where === 'validation' ? { birthDate: 'wrong' } : { name: where === 'serialization' ? '😀' : 'Edited' })
      const before = content(w)
      target === 'open' ? w.requestOpen() : w.requestNew()
      const result = w.chooseUnsaved(phase(w, 'unsaved-changes').token, 'save')
      if (where === 'validation') w.chooseValidation(phase(w, 'validation').token, { kind: 'cancel' })
      else if (where === 'file-name') w.cancel(phase(w, 'file-name').token)
      else if (where === 'serialization') assert.equal(result.code, 'serialization')
      else {
        w.chooseFileName(phase(w, 'file-name').token, 'Requested')
        w.receiveDownload(phase(w, 'download').token, where === 'failed-download' ? 'failed' : 'cancelled')
      }
      phase(w, 'idle')
      assert.deepEqual(content(w), before)
    }
  }
})

test('later edits during a pre-replacement save stop automatic Open/New but retain the completed save', () => {
  for (const target of ['open', 'new']) {
    const w = workflow()
    edit(w, { name: 'Before' })
    target === 'open' ? w.requestOpen() : w.requestNew()
    w.chooseUnsaved(phase(w, 'unsaved-changes').token, 'save')
    w.chooseFileName(phase(w, 'file-name').token, 'Before')
    const download = phase(w, 'download')
    edit(w, { name: 'After' })
    assert.deepEqual(w.receiveDownload(download.token, 'started'), { kind: 'saved', continuation: null })
    phase(w, 'idle')
    assert.equal(w.getSnapshot().current.name, 'After')
    assert.equal(w.getSnapshot().reference.name, 'Before')
    assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
  }
})

test('duplicate commands cannot replace a pending operation or change its document', () => {
  const w = workflow()
  w.requestOpen()
  const before = w.getSnapshot()
  assert.equal(w.requestOpen().kind, 'busy')
  assert.equal(w.requestNew().kind, 'busy')
  assert.equal(w.requestDownload().kind, 'busy')
  assert.equal(w.requestDownload().kind, 'busy')
  assert.deepEqual(w.getSnapshot(), before)
  const originalChoose = phase(w, 'choose-file')
  w.beginRead(originalChoose.token)
  assert.equal(w.beginRead(originalChoose.token).kind, 'ignored')
})

test('late reads cannot overwrite an edited registration even when the edit is later restored', async () => {
  const w = workflow()
  const original = w.getSnapshot().current
  const token = startRead(w)
  let release
  const read = new Promise(resolve => { release = resolve })
  edit(w, { name: 'Later edit' })
  w.edit(original)
  const afterEdit = content(w)
  release({ kind: 'read', fileName: 'Late', bytes: bytes() })
  assert.equal(w.receiveRead(token, await read).kind, 'ignored')
  assert.deepEqual(content(w), afterEdit)
  phase(w, 'idle')
})

test('cancellation and replacement prevent old reads and downloads affecting newer operations', () => {
  const w = workflow()
  const oldRead = startRead(w)
  w.cancel(oldRead)
  open(w, bytes({ name: 'Newer' }), 'Newer')
  const afterOpen = content(w)
  assert.equal(w.receiveRead(oldRead, { kind: 'read', fileName: 'Old', bytes: bytes() }).kind, 'ignored')
  assert.deepEqual(content(w), afterOpen)
  const oldDownload = prepareDownload(w)
  w.cancel(oldDownload.token)
  w.requestNew()
  const afterNew = content(w)
  assert.equal(w.receiveDownload(oldDownload.token, 'started').kind, 'ignored')
  assert.deepEqual(content(w), afterNew)
})

test('a completed download cannot update metadata again after a later operation', () => {
  const w = workflow()
  const oldDownload = finishSave(w, { fileName: 'Old' })
  open(w, bytes({ name: 'New file' }), 'New')
  const after = content(w)
  assert.equal(w.receiveDownload(oldDownload.token, 'started').kind, 'ignored')
  assert.deepEqual(content(w), after)
})

test('each validation decision uses a fresh token, preventing duplicated continue from blanking the next field', () => {
  const w = workflow()
  edit(w, { birthDate: 'bad birth', testDate: 'bad test' })
  w.requestDownload()
  const first = phase(w, 'validation')
  w.chooseValidation(first.token, { kind: 'continue' })
  const second = phase(w, 'validation')
  assert.notEqual(first.token, second.token)
  assert.equal(second.validation.candidate.birthDate, '')
  assert.equal(second.validation.candidate.testDate, 'bad test')
  assert.equal(w.chooseValidation(first.token, { kind: 'continue' }).kind, 'ignored')
  assert.deepEqual(phase(w, 'validation'), second)
})

test('edits invalidate pending unsaved/format/name decisions while preserving the newer registration', () => {
  const w = workflow()
  edit(w, { name: 'First' })
  w.requestNew()
  const unsaved = phase(w, 'unsaved-changes')
  edit(w, { name: 'Second' })
  assert.equal(w.chooseUnsaved(unsaved.token, 'discard').kind, 'ignored')
  w.requestDownload()
  const named = phase(w, 'file-name')
  edit(w, { name: 'Third' })
  assert.equal(w.chooseFileName(named.token, 'Old snapshot').kind, 'ignored')
  assert.equal(w.getSnapshot().current.name, 'Third')
  assert.equal(w.getSnapshot().association, null)

  const another = workflow()
  const unknownBytes = encodeWindows1252(new TextDecoder('windows-1252').decode(bytes()).replace('NUBUMotor_100', 'Unknown')).bytes
  another.receiveRead(startRead(another), { kind: 'read', fileName: 'Unknown', bytes: unknownBytes })
  const unknown = phase(another, 'unknown-format')
  edit(another, { note: 'Newer edit' })
  const afterEdit = content(another)
  assert.equal(another.chooseUnknownFormat(unknown.token, 'continue').kind, 'ignored')
  assert.deepEqual(content(another), afterEdit)
})

test('the owned state excludes calculation/session settings and preserves unrelated registration fields', () => {
  const w = workflow()
  const input = record({ name: 'Person', gender: 'gutt', note: 'First note', note2: 'Second note', items: Array(50).fill('9') })
  const encoded = serializeNubu100(input).bytes
  open(w, encoded)
  finishSave(w)
  const { ageSource, ...stored } = w.getSnapshot().current
  assert.deepEqual(stored, input)
  assert.deepEqual(Object.keys(w.getSnapshot()).sort(), ['association', 'current', 'downloadInitiated', 'phase', 'reference', 'status'])
})

test('discard before an unsuccessful open does not erase the old unsaved registration', () => {
  const w = workflow()
  open(w)
  edit(w, { name: 'Still needed' })
  const before = content(w)
  w.requestOpen()
  w.chooseUnsaved(phase(w, 'unsaved-changes').token, 'discard')
  w.beginRead(phase(w, 'choose-file').token)
  w.receiveRead(phase(w, 'reading').token, { kind: 'failed' })
  assert.deepEqual(content(w), before)
  assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
})

test('malformed unknown files cannot prompt for format acceptance or change the document', () => {
  const w = workflow()
  const before = content(w)
  const text = new TextDecoder('windows-1252').decode(bytes()).replace('NUBUMotor_100', 'NUBUMotor_101')
  const lines = text.split('\r\n')
  lines[7] = '*'.repeat(49)
  const input = encodeWindows1252(lines.join('\r\n')).bytes
  const result = w.receiveRead(startRead(w), { kind: 'read', fileName: 'Unknown', bytes: input })
  assert.equal(result.code, 'format')
  assert.equal(result.detail.code, 'invalid-item-count')
  phase(w, 'idle')
  assert.deepEqual(content(w), before)
})

test('blocking encoding errors precede blanking decisions, and filename cancellation never applies blankings', () => {
  for (const name of ['😀', 'Encodable']) {
    const w = workflow()
    edit(w, { name, birthDate: 'wrong' })
    const before = content(w)
    const result = w.requestDownload()
    if (name === '😀') {
      assert.equal(result.code, 'serialization')
      phase(w, 'idle')
    } else {
      w.chooseValidation(phase(w, 'validation').token, { kind: 'continue' })
      w.cancel(phase(w, 'file-name').token)
    }
    assert.deepEqual(content(w), before)
  }
})

test('blocking name error precedes the age-pair dialog, then Bruk retting reaches bytes and committed content', () => {
  const w = workflow()
  edit(w, { name: '😀', birthDate: '23.10.2025', testDate: '23.10.2026', age: '1:0' })
  const before = content(w)
  const blocked = w.requestDownload()
  assert.equal(blocked.code, 'serialization')
  assert.equal(blocked.detail.code, 'unrepresentable-character')
  assert.equal(blocked.detail.field, 'name')
  phase(w, 'idle')
  assert.deepEqual(content(w), before)
  edit(w, { name: 'Corrected name' })
  const original = w.getSnapshot().current
  w.requestDownload()
  const decision = phase(w, 'validation')
  assert.equal(decision.validation.problem.kind, 'date-pair-out-of-range')
  w.chooseValidation(decision.token, { kind: 'correct-dates', birthDate: '23.10.2022', testDate: '23.10.2026' })
  const named = phase(w, 'file-name')
  const candidate = parseNubu100(named.bytes).record
  assert.equal(candidate.birthDate, '23.10.2022')
  assert.equal(candidate.age, '4:0')
  assert.deepEqual(w.getSnapshot().current, original)
  w.chooseFileName(named.token, 'Corrected.~Z4')
  w.receiveDownload(phase(w, 'download').token, 'started')
  assert.equal(w.getSnapshot().current.birthDate, candidate.birthDate)
  assert.equal(w.getSnapshot().current.age, candidate.age)
  assert.deepEqual(w.getSnapshot().current, w.getSnapshot().reference)
})

test('all unconditional format checks precede each kind of interactive date or age decision', () => {
  for (const dates of [
    { birthDate: 'bad', testDate: '', age: '' },
    { birthDate: '', testDate: 'bad', age: '' },
    { birthDate: '', testDate: '', age: 'bad' },
    { birthDate: '23.10.2025', testDate: '23.10.2026', age: '' },
  ]) {
    for (const bad of [
      { name: '😀' }, { note: '😀' }, { note2: 'bad\ntext' },
      { gender: 'invalid' }, { items: Array(50).fill('too long') },
      { items: Array(50).fill('😀') },
    ]) {
      const w = workflow()
      edit(w, { ...dates, ...bad })
      const original = content(w)
      assert.equal(w.requestDownload().code, 'serialization')
      phase(w, 'idle')
      assert.deepEqual(content(w), original)
    }
  }
})

test('date and age text that can be corrected or blanked retains its existing decision rules', () => {
  for (const field of ['birthDate', 'testDate', 'age']) {
    const w = workflow()
    edit(w, { birthDate: '', testDate: '', age: '', [field]: '😀' })
    const original = content(w)
    w.requestDownload()
    const pending = phase(w, 'validation')
    assert.equal(pending.validation.problem.field, field)
    w.chooseValidation(pending.token, { kind: 'continue' })
    assert.equal(parseNubu100(phase(w, 'file-name').bytes).record[field], '')
    w.cancel(phase(w, 'file-name').token)
    assert.deepEqual(content(w), original)
  }
})

test('the final serialization check still rejects unencodable age preserved by an explicit pair decision', () => {
  const w = workflow()
  edit(w, { birthDate: '23.10.2026', testDate: '22.10.2026', age: '😀' })
  const original = content(w)
  w.requestDownload()
  const result = w.chooseValidation(phase(w, 'validation').token, { kind: 'continue' })
  assert.equal(result.code, 'serialization')
  assert.equal(result.detail.field, 'age')
  phase(w, 'idle')
  assert.deepEqual(content(w), original)
})

test('Escape/dialog-close cancellation can safely terminate every awaited stage', () => {
  const setups = [
    w => { edit(w, { name: 'Dirty' }); w.requestNew() },
    w => w.requestOpen(),
    w => startRead(w),
    w => {
      const input = encodeWindows1252(new TextDecoder('windows-1252').decode(bytes()).replace('NUBUMotor_100', 'Other')).bytes
      w.receiveRead(startRead(w), { kind: 'read', fileName: 'Other', bytes: input })
    },
    w => { edit(w, { birthDate: 'wrong' }); w.requestDownload() },
    w => w.requestDownload(),
    w => prepareDownload(w),
  ]
  for (const setup of setups) {
    const w = workflow()
    setup(w)
    const before = content(w)
    const pending = w.getSnapshot().phase
    assert.notEqual(pending.kind, 'idle')
    for (const command of [() => w.requestOpen(), () => w.requestNew(), () => w.requestDownload()]) {
      assert.equal(command().kind, 'busy')
      assert.deepEqual(w.getSnapshot().phase, pending)
    }
    assert.equal(w.cancel(pending.token).kind, 'cancelled')
    assert.deepEqual(content(w), before)
    assert.equal(w.cancel(pending.token).kind, 'ignored')
    phase(w, 'idle')
  }
})

test('download history survives edits and clear-form but resets on accepted open or New', () => {
  for (const opened of [false, true]) {
    const w = workflow()
    if (opened) open(w)
    const association = w.getSnapshot().association
    finishSave(w, { fileName: 'Different.ext' })
    const downloaded = w.getSnapshot()
    assert.equal(downloaded.downloadInitiated, true)
    assert.deepEqual(downloaded.association, association)
    edit(w, { name: 'Edit after download' })
    assert.equal(w.getSnapshot().downloadInitiated, true)
    assert.equal(w.getSnapshot().status, 'Ulagrede endringer')
    w.edit(downloaded.current)
    assert.equal(w.getSnapshot().status, 'Endringer lagret')
    w.clearForm(true)
    assert.equal(w.getSnapshot().downloadInitiated, true)
    assert.deepEqual(w.getSnapshot().association, association)
    w.edit(w.getSnapshot().reference)
    open(w, bytes(), 'Next file.egen')
    assert.equal(w.getSnapshot().downloadInitiated, false)
    assert.equal(w.getSnapshot().association.fileName, 'Next file.egen')
    finishSave(w)
    w.requestNew()
    assert.equal(w.getSnapshot().downloadInitiated, false)
    assert.equal(w.getSnapshot().association, null)
    assert.equal(w.getSnapshot().status, 'Ingen ulagrede endringer')
  }
})
