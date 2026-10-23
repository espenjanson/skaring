// Render the real components using existing React/TypeScript dependencies, without browser IO.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { FileWorkflow } = loadTypeScript('domain/fileWorkflow.ts')
const { DOWNLOAD_NOTICE } = loadTypeScript('file/fileMessages.ts')

function component(relative, overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const loaded = { exports: {} }
  const localRequire = name => {
    if (overrides[name]) return overrides[name]
    if (name.endsWith('.css')) return {}
    if (!name.startsWith('.')) return require(name)
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(relative), name))
    return fs.existsSync(path.join(__dirname, '../src', target + '.tsx'))
      ? component(target + '.tsx', overrides) : loadTypeScript(target + '.ts')
  }
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire)
  return loaded.exports
}

test('the page renders one Last ned command and one dismissible notice, including after editing', () => {
  const w = new FileWorkflow()
  const files = { state: w.getSnapshot(), message: { kind: 'notice', text: DOWNLOAD_NOTICE }, input: { current: null } }
  const { default: Page } = component('app/page.tsx', { './useRegistrationFiles': { useRegistrationFiles: () => files } })
  for (const edited of [false, true]) {
    if (edited) { w.edit({ ...w.getSnapshot().current, name: 'Edited' }); files.state = w.getSnapshot() }
    const html = renderToStaticMarkup(React.createElement(Page))
    assert.equal((html.match(/>Last ned…<\/button>/g) || []).length, 1)
    assert.doesNotMatch(html, />Lagre(?: som)?…<\/button>/)
    assert.equal((html.match(/Nedlastingen er startet/g) || []).length, 1)
    assert.match(html, />Lukk melding<\/button>/)
  }
})

test('filename and validation dialogs use approved wording without the removed information rows', () => {
  const { FileDialogs } = component('components/FileDialogs.tsx')
  const w = new FileWorkflow()
  w.requestDownload()
  const render = phase => renderToStaticMarkup(React.createElement(FileDialogs, { phase }))
  const nameHtml = render(w.getSnapshot().phase)
  assert.match(nameHtml, /Last ned registrering/)
  assert.match(nameHtml, /Filnavn:/)
  assert.match(nameHtml, />Last ned<\/button>/)
  assert.match(nameHtml, />Avbryt<\/button>/)
  assert.match(nameHtml, /Avbryt og lukk dialogen/)
  const unknownHtml = render({ kind: 'unknown-format', token: 10, identifier: 'SECRET_IDENTIFIER' })
  assert.match(unknownHtml, /Ukjent filformat\. Vil du fortsette\?/)
  assert.match(unknownHtml, />Fortsett<\/button>/)
  assert.doesNotMatch(unknownHtml, /Formatidentifikator|SECRET_IDENTIFIER/)
  const pairHtml = render({ kind: 'validation', token: 11, validation: { problem: { kind: 'date-pair-out-of-range' }, candidate: { birthDate: '23.10.2026', testDate: '22.10.2026', age: '4:0' } } })
  assert.match(pairHtml, /Født dato:/)
  assert.match(pairHtml, /Testdato:/)
  assert.match(pairHtml, /Fortsett og behold verdiene/)
  assert.doesNotMatch(pairHtml, /Vist alder:|4:0|\(tomt\)/)
})

test('reversed date warning uses the approved non-prohibitive wording', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8')
  assert.match(source, /Testdato er tidligere enn født dato\./)
  assert.doesNotMatch(source, /Testdato kan ikke være før født dato\./)
})

test('unsaved changes and clear-form dialogs render their distinct approved messages and choices', () => {
  const { FileDialogs } = component('components/FileDialogs.tsx')
  const render = kind => renderToStaticMarkup(React.createElement(FileDialogs, { phase: { kind, token: 1, next: 'open' } }))
  const unsaved = render('unsaved-changes')
  assert.match(unsaved, /Det er ulagrede endringer\./)
  assert.match(unsaved, /Vil du laste ned endringene før du fortsetter\?/)
  for (const label of ['Last ned', 'Fortsett uten nedlasting', 'Avbryt']) assert.ok(unsaved.includes(`>${label}</button>`))
  const clear = render('clear-confirmation')
  assert.match(clear, /Tømme alle feltene\? Ulagrede endringer går tapt\./)
  assert.match(clear, />OK<\/button>/)
  assert.match(clear, />Avbryt<\/button>/)
  assert.doesNotMatch(clear, /Fortsett uten nedlasting|Vil du laste ned/)
})

test('all unsaved choices, Escape and close buttons delegate to the correct token without mutating content', () => {
  const cancelled = [], choices = []
  const fakeReact = { ...React, useRef: () => ({ current: null }), useId: () => 'test-id', useEffect() {} }
  const { FileDialogs } = component('components/FileDialogs.tsx', { react: fakeReact })
  const props = { phase: { kind: 'unsaved-changes', token: 17, next: 'open' }, cancel: token => cancelled.push(token), unsavedChosen: (...args) => choices.push(args) }
  const dialog = FileDialogs(props)
  const actions = dialog.props.children[1].props.children
  actions[0].props.onClick()
  actions[1].props.onClick()
  actions[2].props.onClick()
  assert.deepEqual(choices, [[17, 'save'], [17, 'discard']])
  const modal = dialog.type(dialog.props)
  let prevented = false
  modal.props.onCancel({ preventDefault() { prevented = true } })
  modal.props.children[0].props.children[1].props.onClick()
  assert.equal(prevented, true)
  assert.deepEqual(cancelled, [17, 17, 17])
})

test('the page registers and cleans up only the standard beforeunload warning when dirty', t => {
  const previousWindow = globalThis.window
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow })
  for (const dirty of [false, true]) {
    const effects = [], registrations = [], removals = []
    const w = new FileWorkflow()
    if (dirty) w.edit({ ...w.getSnapshot().current, name: 'Unsaved' })
    const files = { state: w.getSnapshot(), input: { current: null } }
    const { default: Page } = component('app/page.tsx', {
      react: { ...React, useEffect: effect => effects.push(effect) },
      './useRegistrationFiles': { useRegistrationFiles: () => files },
    })
    globalThis.window = {
      addEventListener: (...args) => registrations.push(args),
      removeEventListener: (...args) => removals.push(args),
    }
    renderToStaticMarkup(React.createElement(Page))
    const cleanup = effects[0]()
    assert.equal(registrations.length, dirty ? 1 : 0)
    if (dirty) {
      assert.equal(registrations[0][0], 'beforeunload')
      let prevented = false
      const event = { preventDefault() { prevented = true }, returnValue: undefined }
      registrations[0][1](event)
      assert.equal(prevented, true)
      assert.equal(event.returnValue, '')
      cleanup()
      assert.deepEqual(removals, registrations)
    }
  }
})
