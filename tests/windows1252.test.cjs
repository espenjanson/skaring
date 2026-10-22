// Run with node --test tests/*.test.cjs; no new packages are required.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { decodeWindows1252, encodeWindows1252 } = loadTypeScript('file/windows1252.ts')

test('Windows-1252 maps Scandinavian letters and every assigned special byte', () => {
  const text = 'ÅÆØåæøÄÖäö€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
  const bytes = Uint8Array.from([
    0xc5, 0xc6, 0xd8, 0xe5, 0xe6, 0xf8, 0xc4, 0xd6, 0xe4, 0xf6,
    0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b,
    0x8c, 0x8e, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99,
    0x9a, 0x9b, 0x9c, 0x9e, 0x9f,
  ])
  assert.deepEqual(decodeWindows1252(bytes), { ok: true, text })
  assert.deepEqual(encodeWindows1252(text), { ok: true, bytes })
})

test('all 256 byte values either round-trip exactly or identify an unassigned byte', () => {
  const unassigned = new Set([0x81, 0x8d, 0x8f, 0x90, 0x9d])
  const independentDecoder = new TextDecoder('windows-1252')
  for (let byte = 0; byte <= 0xff; byte++) {
    const bytes = Uint8Array.of(byte)
    const decoded = decodeWindows1252(bytes)
    if (unassigned.has(byte)) {
      assert.deepEqual(decoded, { ok: false, error: { code: 'unassigned-byte', byte, index: 0 } })
      assert.equal('text' in decoded, false)
    } else {
      assert.deepEqual(decoded, { ok: true, text: independentDecoder.decode(bytes) })
      assert.deepEqual(encodeWindows1252(decoded.text), { ok: true, bytes })
    }
  }
})

test('unrepresentable characters and surrogate errors are reported without replacement', () => {
  for (const character of ['😀', '漢', '\u030a', '\u0080', '\u0085', '\ud800', '\udfff', '\ufeff']) {
    const result = encodeWindows1252('før' + character + 'etter')
    assert.deepEqual(result, {
      ok: false, error: { code: 'unrepresentable-character', character, index: 3 },
    })
    assert.equal('bytes' in result, false)
  }
  assert.equal(encodeWindows1252('A\u030a').ok, false)
  assert.equal(encodeWindows1252('Å').ok, true)
})

test('codec handles empty input and never changes bytes supplied by the caller', () => {
  assert.deepEqual(decodeWindows1252(new Uint8Array()), { ok: true, text: '' })
  assert.deepEqual(encodeWindows1252(''), { ok: true, bytes: new Uint8Array() })
  const bytes = Uint8Array.of(0xf8, 0x81, 0xe5)
  const snapshot = bytes.slice()
  assert.deepEqual(decodeWindows1252(bytes), {
    ok: false, error: { code: 'unassigned-byte', byte: 0x81, index: 1 },
  })
  assert.deepEqual(bytes, snapshot)
})
