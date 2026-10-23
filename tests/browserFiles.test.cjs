// Browser ports are simulated with built-in Node tests; no new test tools are needed.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { readLocalFile, initiateDownload, BrowserFileActions } = loadTypeScript('file/browserFiles.ts')
const { FileWorkflow } = loadTypeScript('domain/fileWorkflow.ts')
const { createRegistration } = loadTypeScript('domain/registration.ts')
const { serializeNubu100, parseNubu100 } = loadTypeScript('file/nubu100.ts')
const { encodeWindows1252 } = loadTypeScript('file/windows1252.ts')

function workflow() { return new FileWorkflow(() => new Date(2026, 9, 22)) }
function content(w) { const { phase, ...data } = w.getSnapshot(); return data }
function bytes(changes = {}) {
  return serializeNubu100({ ...createRegistration(new Date(2026, 9, 22)), name: 'Åse', note: 'ø €', ...changes }).bytes
}
function localFile(data, name = 'Barn.egen') {
  return { name, async arrayBuffer() { return data.slice().buffer } }
}
function requestOpen(w) {
  w.requestOpen()
  const p = w.getSnapshot().phase
  assert.equal(p.kind, 'choose-file')
  return p.token
}
function fileName(w) {
  const p = w.getSnapshot().phase
  assert.equal(p.kind, 'file-name')
  return p
}

test('local file reading returns exact bytes for any extension and handles read errors', async () => {
  const data = Uint8Array.of(0xc5, 0xf8, 0x80, 13, 10)
  const result = await readLocalFile(localFile(data, 'Uten endelse'))
  assert.deepEqual(result, { kind: 'read', fileName: 'Uten endelse', bytes: data })
  assert.deepEqual(await readLocalFile({ name: 'Unreadable', async arrayBuffer() { throw Error('read failed') } }), { kind: 'failed' })
})

test('download activates one link with exact bytes/name and defers URL cleanup', () => {
  const calls = []
  let release
  const data = bytes()
  const port = {
    createUrl(input) { assert.deepEqual(input, data); calls.push('create'); return 'blob:test' },
    activateLink(url, name) { assert.equal(url, 'blob:test'); assert.equal(name, 'Changed.ext'); calls.push('click') },
    releaseUrl(url) { assert.equal(url, 'blob:test'); calls.push('release') },
    deferRelease(fn) { release = fn; calls.push('defer') },
  }
  assert.equal(initiateDownload(data, 'Changed.ext', port), 'started')
  assert.deepEqual(calls, ['create', 'click', 'defer'])
  release()
  release()
  assert.deepEqual(calls, ['create', 'click', 'defer', 'release'])
})

test('default browser download creates a binary Blob, attaches/removes a link and retains its URL', async t => {
  const previousDocument = globalThis.document
  const calls = []
  let blob, release
  const link = { href: '', download: '', hidden: false, click() { calls.push('click') }, remove() { calls.push('remove') } }
  globalThis.document = {
    createElement(tag) { assert.equal(tag, 'a'); return link },
    body: { appendChild(value) { assert.equal(value, link); calls.push('append') } },
  }
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument })
  t.mock.method(URL, 'createObjectURL', value => { blob = value; return 'blob:test' })
  t.mock.method(URL, 'revokeObjectURL', value => { assert.equal(value, 'blob:test'); calls.push('revoke') })
  t.mock.method(globalThis, 'setTimeout', (fn, delay) => { assert.equal(delay, 60000); release = fn; return 1 })
  const data = bytes()
  assert.equal(initiateDownload(data, 'Barn.egen'), 'started')
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), data)
  assert.equal(blob.type, 'application/octet-stream')
  assert.equal(link.href, 'blob:test')
  assert.equal(link.download, 'Barn.egen')
  assert.deepEqual(calls, ['append', 'click', 'remove'])
  release()
  assert.equal(calls.at(-1), 'revoke')
})

test('detected URL/link failures stop initiation, releasing any created URL', () => {
  for (const failAt of ['create', 'click']) {
    const calls = []
    const port = {
      createUrl() { calls.push('create'); if (failAt === 'create') throw Error(); return 'blob:test' },
      activateLink() { calls.push('click'); throw Error() },
      releaseUrl() { calls.push('release') },
      deferRelease() { calls.push('defer') },
    }
    assert.equal(initiateDownload(bytes(), 'Barn', port), 'failed')
    assert.deepEqual(calls, failAt === 'create' ? ['create'] : ['create', 'click', 'release'])
  }
})

test('cleanup failures cannot turn an already initiated download into a failed save', () => {
  const port = { createUrl() { return 'blob:test' }, activateLink() {}, releaseUrl() { throw Error() }, deferRelease() { throw Error() } }
  assert.equal(initiateDownload(bytes(), 'Barn', port), 'started')
})

test('adapter opens a byte-read file with age normalization and permits selecting it again', async () => {
  const w = workflow()
  const adapter = new BrowserFileActions(w)
  const file = localFile(bytes({ birthDate: '16.10.2022', testDate: '16.10.2026', age: 'wrong' }))
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await adapter.readSelected(requestOpen(w), file)).kind, 'opened')
    assert.equal(w.getSnapshot().current.age, '4:0')
    assert.equal(w.getSnapshot().reference.age, '4:0')
    assert.equal(w.getSnapshot().association.fileName, 'Barn.egen')
    assert.equal(w.getSnapshot().status, 'Endringer lagret')
  }
})

test('file content resembling executable markup remains ordinary registration text', async () => {
  const w = workflow()
  const adapter = new BrowserFileActions(w)
  const name = '<script>throw new Error("file content executed")</script>'
  const result = await adapter.readSelected(requestOpen(w), localFile(bytes({ name })))
  assert.equal(result.kind, 'opened')
  assert.equal(w.getSnapshot().current.name, name)
  assert.equal(w.getSnapshot().reference.name, name)
})

test('unknown identifier decisions and read/format errors preserve content until accepted', async () => {
  for (const choice of ['continue', 'cancel']) {
    const w = workflow()
    const adapter = new BrowserFileActions(w)
    const before = content(w)
    const text = new TextDecoder('windows-1252').decode(bytes()).replace('NUBUMotor_100', 'NUBUMotor_101')
    await adapter.readSelected(requestOpen(w), localFile(encodeWindows1252(text).bytes))
    const unknown = w.getSnapshot().phase
    assert.equal(unknown.kind, 'unknown-format')
    assert.deepEqual(content(w), before)
    w.chooseUnknownFormat(unknown.token, choice)
    if (choice === 'cancel') assert.deepEqual(content(w), before)
    else assert.equal(w.getSnapshot().association.fileName, 'Barn.egen')
  }
  for (const file of [localFile(Uint8Array.of(1)), { name: 'Unreadable', async arrayBuffer() { throw Error() } }]) {
    const w = workflow()
    const before = content(w)
    const adapter = new BrowserFileActions(w)
    assert.equal((await adapter.readSelected(requestOpen(w), file)).kind, 'error')
    assert.deepEqual(content(w), before)
  }
})

test('cancelled and duplicate file selections cannot publish stale data or start duplicate reads', async () => {
  const w = workflow()
  let complete, reads = 0
  const adapter = new BrowserFileActions(w, () => { reads++; return new Promise(resolve => { complete = resolve }) })
  const token = requestOpen(w)
  const first = adapter.readSelected(token, localFile(bytes()))
  assert.equal((await adapter.readSelected(token, localFile(bytes()))).kind, 'ignored')
  assert.equal(reads, 1)
  const pending = w.getSnapshot().phase
  w.cancel(pending.token)
  const before = content(w)
  complete({ kind: 'read', fileName: 'Late', bytes: bytes() })
  assert.equal((await first).kind, 'ignored')
  assert.deepEqual(content(w), before)
})

test('confirmed names trigger one download and publish its exact validated snapshot', () => {
  const w = workflow()
  let downloads = 0, downloaded
  const adapter = new BrowserFileActions(w, readLocalFile, (data, name) => { downloads++; downloaded = { data, name }; return 'started' })
  w.edit({ ...w.getSnapshot().current, birthDate: 'wrong', age: '004:001' })
  const original = w.getSnapshot().current
  w.requestDownload()
  w.chooseValidation(w.getSnapshot().phase.token, { kind: 'continue' })
  const named = fileName(w)
  assert.deepEqual(w.getSnapshot().current, original)
  assert.equal(adapter.saveNamed(named.token, 'Chosen.egen').kind, 'saved')
  assert.equal(downloads, 1)
  assert.equal(downloaded.name, 'Chosen.egen')
  const stored = parseNubu100(downloaded.data).record
  assert.equal(stored.birthDate, '')
  assert.equal(stored.age, '4:1')
  assert.equal(w.getSnapshot().current.birthDate, '')
  assert.equal(w.getSnapshot().reference.age, '4:1')
  assert.equal(w.getSnapshot().status, 'Endringer lagret')
  assert.equal(adapter.saveNamed(named.token, 'Duplicate').kind, 'ignored')
  assert.equal(downloads, 1)
})

test('invalid names, cancellations and failed initiation never update reference or association', () => {
  for (const failed of ['return', 'throw']) {
    const w = workflow()
    const adapter = new BrowserFileActions(w, readLocalFile, () => { if (failed === 'throw') throw Error(); return 'failed' })
    w.requestDownload()
    const named = fileName(w)
    const before = content(w)
    assert.equal(adapter.saveNamed(named.token, 'a/b').code, 'invalid-file-name')
    assert.deepEqual(content(w), before)
    assert.equal(adapter.saveNamed(named.token, 'Valid').code, 'download-failed')
    assert.deepEqual(content(w), before)
    w.requestDownload()
    const cancelToken = fileName(w).token
    w.cancel(cancelToken)
    assert.equal(adapter.saveNamed(cancelToken, 'Cancelled').kind, 'ignored')
    assert.deepEqual(content(w), before)
  }
})

test('adapter downloads use the dated proposal repeatedly until a file has actually been opened', () => {
  const w = workflow()
  const adapter = new BrowserFileActions(w, readLocalFile, () => 'started')
  w.requestDownload()
  assert.equal(fileName(w).suggestedName, 'Motorisk test 22.10.26.~Z4')
  adapter.saveNamed(fileName(w).token, 'Without extension')
  w.requestDownload()
  assert.equal(fileName(w).suggestedName, 'Motorisk test 22.10.26.~Z4')
  w.cancel(fileName(w).token)
  w.requestDownload()
  assert.equal(fileName(w).suggestedName, 'Motorisk test 22.10.26.~Z4')
  adapter.saveNamed(fileName(w).token, 'Other.ext')
  assert.equal(w.getSnapshot().association, null)
  assert.equal(w.getSnapshot().downloadInitiated, true)
})

const referenceDirectory = path.join(__dirname, '../docs/reference-tests/datafiler')
for (const name of fs.readdirSync(referenceDirectory).filter(name => name.endsWith('.~Z4'))) {
  test(`reference file ${name} opens and downloads with identical bytes and unchanged opened association`, async () => {
    const w = workflow()
    const original = fs.readFileSync(path.join(referenceDirectory, name))
    let downloaded
    const adapter = new BrowserFileActions(w, readLocalFile, data => { downloaded = data; return 'started' })
    assert.equal((await adapter.readSelected(requestOpen(w), localFile(new Uint8Array(original), name))).kind, 'opened')
    w.requestDownload()
    assert.equal(fileName(w).suggestedName, name)
    assert.equal(adapter.saveNamed(fileName(w).token, 'Different download name').kind, 'saved')
    assert.deepEqual(Buffer.from(downloaded), original)
    assert.equal(w.getSnapshot().association.fileName, name)
    assert.equal(w.getSnapshot().downloadInitiated, true)
    assert.equal(w.getSnapshot().status, 'Endringer lagret')
  })
}
