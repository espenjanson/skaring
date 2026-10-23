// Exercise the real React adapter with deterministic hook slots and simulated browser IO.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { BrowserFileActions } = loadTypeScript('file/browserFiles.ts')
const { createRegistration } = loadTypeScript('domain/registration.ts')
const { serializeNubu100 } = loadTypeScript('file/nubu100.ts')
const { DOWNLOAD_NOTICE } = loadTypeScript('file/fileMessages.ts')

function harness({ downloadResult = 'started', clickError = false } = {}) {
  const slots = [], pending = [], listeners = new Map()
  let index = 0, dirty = false, files, downloads = 0, accepted = 0, clicks = 0
  const input = { value: '', files: [], click() { clicks++; if (clickError) throw Error('Picker failed') }, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  const hooks = {
    useRef(initial) { const i = index++; slots[i] ??= { current: initial }; return slots[i] },
    useState(initial) {
      const i = index++
      slots[i] ??= { value: initial }
      return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true }]
    },
    useEffect(effect, deps) {
      const i = index++, old = slots[i]
      if (!old || deps.some((value, j) => !Object.is(value, old.deps[j]))) {
        pending.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: effect() } })
      }
    },
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/app/useRegistrationFiles.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  class SimulatedActions extends BrowserFileActions {
    constructor(w) { super(w, undefined, () => { downloads++; return downloadResult }) }
  }
  const loaded = { exports: {} }
  const localRequire = name => name === 'react' ? hooks
    : name === '../file/browserFiles' ? { BrowserFileActions: SimulatedActions }
      : loadTypeScript(path.posix.normalize('app/' + name + '.ts'))
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire)
  function render() {
    do {
      dirty = false; index = 0
      files = loaded.exports.useRegistrationFiles(() => { accepted++ })
      files.input.current = input
      while (pending.length) pending.shift()()
    } while (dirty)
    return files
  }
  render()
  return {
    render, input, listeners,
    get downloads() { return downloads }, get accepted() { return accepted }, get clicks() { return clicks },
    close() { for (const slot of slots) slot?.cleanup?.() },
  }
}

function edit(h, changes) {
  h.render().edit(data => ({ ...data, ...changes }))
  return h.render()
}
function choose(h, choice) {
  const f = h.render()
  assert.equal(f.state.phase.kind, 'unsaved-changes')
  f.unsavedChosen(f.state.phase.token, choice)
  return h.render()
}
function document(f) { const { phase, ...data } = f.state; return data }
function download(h) {
  const f = h.render()
  assert.equal(f.state.phase.kind, 'file-name')
  f.nameChosen(f.state.phase.token, 'Downloaded.egen')
  return h.render()
}

test('clean Open launches the picker directly and clean New resets to today without a warning', () => {
  const h = harness()
  h.render().open()
  assert.equal(h.clicks, 1)
  assert.equal(h.render().state.phase.kind, 'choose-file')
  h.listeners.get('cancel')()
  assert.equal(h.render().state.phase.kind, 'idle')
  h.render().newRegistration()
  const state = h.render().state
  assert.equal(state.phase.kind, 'idle')
  assert.deepEqual(state.current, createRegistration(new Date()))
  assert.equal(state.association, null)
  assert.equal(state.downloadInitiated, false)
  h.close()
})

for (const action of ['open', 'newRegistration']) {
  test(`React ${action} supports cancel, discard and the shared download continuation`, () => {
    for (const choice of ['cancel', 'discard', 'save']) {
      const h = harness()
      const before = document(edit(h, { name: 'Keep this' }))
      h.render()[action]()
      assert.equal(h.clicks, 0)
      let f = choose(h, choice)
      if (choice === 'save') {
        assert.deepEqual(document(f), before)
        f = download(h)
        assert.equal(h.downloads, 1)
        assert.equal(f.message.text, DOWNLOAD_NOTICE)
      } else assert.equal(h.downloads, 0)
      if (choice === 'cancel') assert.deepEqual(document(f), before)
      else if (action === 'open') {
        assert.equal(f.state.phase.kind, 'choose-file')
        assert.equal(h.clicks, 1)
        const afterDownload = document(f)
        h.listeners.get('cancel')()
        assert.deepEqual(document(h.render()), afterDownload)
        assert.equal(h.render().state.downloadInitiated, choice === 'save')
        assert.equal(h.render().state.status, choice === 'save' ? 'Endringer lagret' : 'Ulagrede endringer')
      } else {
        assert.equal(f.state.current.name, '')
        assert.equal(f.state.status, 'Ingen ulagrede endringer')
        assert.equal(f.state.downloadInitiated, false)
      }
      h.close()
    }
  })
}

test('filename cancellation, validation cancellation and initiation failure abort the whole replacement', () => {
  for (const action of ['open', 'newRegistration']) {
    for (const problem of ['filename', 'validation', 'encoding', 'download']) {
      const h = harness({ downloadResult: 'failed' })
      const before = document(edit(h, { name: problem === 'encoding' ? '😀' : 'Original', birthDate: problem === 'validation' ? 'bad' : '' }))
      h.render()[action]()
      let f = choose(h, 'save')
      if (problem === 'download') f = download(h)
      else if (problem !== 'encoding') { f.cancel(f.state.phase.token); f = h.render() }
      assert.equal(f.state.phase.kind, 'idle')
      assert.deepEqual(document(f), before)
      assert.equal(h.clicks, 0)
      assert.equal(h.downloads, problem === 'download' ? 1 : 0)
      h.close()
    }
  }
})

test('a failed selected file after discard leaves the unsaved registration intact', async () => {
  const h = harness()
  const before = document(edit(h, { name: 'Unsaved' }))
  h.render().open(); choose(h, 'discard')
  h.input.files = [{ name: 'Bad', async arrayBuffer() { return Uint8Array.of(1).buffer } }]
  await h.render().selected({ currentTarget: h.input })
  const f = h.render()
  assert.deepEqual(document(f), before)
  assert.equal(f.message.text, 'Kunne ikke åpne filen.')
  assert.equal(f.state.phase.kind, 'idle')
  h.close()
})

test('duplicate unsaved decisions cannot launch a second picker or a second download', () => {
  for (const choice of ['save', 'discard']) {
    const h = harness()
    edit(h, { name: 'Unsaved' })
    h.render().open()
    const f = h.render(), token = f.state.phase.token
    f.unsavedChosen(token, choice)
    f.unsavedChosen(token, choice)
    assert.equal(h.clicks, choice === 'discard' ? 1 : 0)
    if (choice === 'save') {
      download(h)
      f.unsavedChosen(token, choice)
      assert.equal(h.downloads, 1)
      assert.equal(h.clicks, 1)
    }
    h.close()
  }
})

test('clear-form confirmation preserves the opened association and download reference in the React adapter', async () => {
  const h = harness()
  h.render().open()
  const bytes = serializeNubu100({ ...createRegistration(new Date()), name: 'Opened' }).bytes
  h.input.files = [{ name: 'Original.~Z4', async arrayBuffer() { return bytes.buffer } }]
  await h.render().selected({ currentTarget: h.input })
  edit(h, { name: 'Changed' })
  h.render().download(); download(h)
  const before = document(edit(h, { note: 'Unsaved note' }))
  h.render().clearForm()
  let f = h.render()
  assert.equal(f.state.phase.kind, 'clear-confirmation')
  f.clearChosen(f.state.phase.token, false)
  assert.deepEqual(document(h.render()), before)
  h.render().clearForm(); f = h.render()
  f.clearChosen(f.state.phase.token, true)
  f = h.render()
  assert.equal(f.state.current.name, '')
  assert.equal(f.state.association.fileName, 'Original.~Z4')
  assert.deepEqual(f.state.reference, before.reference)
  assert.equal(f.state.downloadInitiated, true)
  h.close()
})

test('picker errors preserve completed download state and a blocked automatic picker can be retried by Velg fil', () => {
  const h = harness({ clickError: true })
  edit(h, { name: 'Downloaded first' })
  h.render().open(); choose(h, 'save')
  const f = download(h)
  assert.equal(f.state.phase.kind, 'idle')
  assert.equal(f.state.status, 'Endringer lagret')
  assert.equal(f.state.reference.name, 'Downloaded first')
  assert.equal(f.state.downloadInitiated, true)
  h.close()
  const another = harness()
  edit(another, { name: 'Continue' })
  another.render().open(); choose(another, 'save'); download(another)
  assert.equal(another.render().state.phase.kind, 'choose-file')
  another.render().chooseFile()
  assert.equal(another.clicks, 2)
  assert.equal(another.downloads, 1)
  another.close()
})
