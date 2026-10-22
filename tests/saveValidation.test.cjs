// Run with node --test tests/*.test.cjs. These tests do not start file operations.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTypeScript } = require('./helpers/loadTypeScript.cjs')
const { validateForSave, resolveSaveValidation } = loadTypeScript('domain/saveValidation.ts')
const { createRegistration } = loadTypeScript('domain/registration.ts')
const { dateAge } = loadTypeScript('domain/dateAge.ts')
const { parseNubu100, serializeNubu100 } = loadTypeScript('file/nubu100.ts')

function registration(changes = {}) {
  return {
    ...createRegistration(new Date(2026, 9, 22)),
    name: 'Åse', note: 'første merknad', note2: 'andre merknad', gender: 'jente',
    birthDate: '', testDate: '', ...changes,
  }
}

function frozenRegistration(changes = {}) {
  const data = registration(changes)
  Object.freeze(data.items)
  return Object.freeze(data)
}

function decision(result, choice) {
  const before = structuredClone(result)
  const resolved = resolveSaveValidation(result, choice)
  assert.deepEqual(result, before)
  return resolved
}

function dateAfter(days) {
  const date = new Date(Date.UTC(2000, 0, 1) + days * 86400000)
  return `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`
}

test('empty dates and age are ready; the candidate is an independent immutable snapshot', () => {
  const original = registration()
  const before = structuredClone(original)
  const result = validateForSave(original)
  assert.equal(result.kind, 'ready')
  assert.deepEqual(result.candidate, before)
  assert.notEqual(result.candidate, original)
  assert.notEqual(result.candidate.items, original.items)
  assert.ok(Object.isFrozen(result.candidate))
  assert.ok(Object.isFrozen(result.candidate.items))
  assert.deepEqual(original, before)
  original.name = 'changed later'
  original.items[0] = '2'
  assert.deepEqual(result.candidate, before)
})

test('short dates normalize according to existing rules without changing the original', () => {
  for (const [birthDate, testDate] of [
    ['5.3.20', '5.3.26'], ['05.3.20', '5.03.2026'], ['5.03.2020', '05.03.2026'],
  ]) {
    const original = frozenRegistration({ birthDate, testDate, age: 'wrong' })
    const result = validateForSave(original)
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.birthDate, '05.03.2020')
    assert.equal(result.candidate.testDate, '05.03.2026')
    assert.equal(result.candidate.age, dateAge(birthDate, testDate).displayAge)
    assert.equal(result.candidate.ageSource, 'automatic')
    assert.equal(original.age, 'wrong')
    assert.equal(original.birthDate, birthDate)
  }
  for (const [shortYear, fullYear] of [['00', '2000'], ['03', '2003'], ['99', '2099']]) {
    const result = validateForSave(registration({ testDate: `1.1.${shortYear}` }))
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.testDate, `01.01.${fullYear}`)
  }
})

test('calendar validation accepts leap dates and rejects rollover and unsupported formats', () => {
  for (const field of ['birthDate', 'testDate']) {
    for (const value of ['29.02.2024', '29.02.2000', '1.1.0001', '1.1.0099']) {
      assert.equal(validateForSave(registration({ [field]: value })).kind, 'ready')
    }
    for (const value of ['29.02.2023', '29.02.1900', '31.04.2026', '1.13.26', '0.1.26', '1/1/26', '1.1.026', '1.1.0000', ' 1.1.26', 'not a date']) {
      const result = validateForSave(registration({ [field]: value }))
      assert.equal(result.kind, 'needs-decision')
      assert.deepEqual(result.problem, { kind: 'invalid-date', field })
      assert.equal(result.candidate[field], value)
    }
  }
})

for (const field of ['birthDate', 'testDate']) {
  test(`invalid ${field} supports correction, blanking and cancellation without changing input`, () => {
    const other = field === 'birthDate' ? 'testDate' : 'birthDate'
    const original = frozenRegistration({ [field]: '31.02.2026', [other]: '01.01.2020', age: '7:6' })
    const before = structuredClone(original)
    const pending = validateForSave(original)
    assert.equal(pending.kind, 'needs-decision')
    assert.deepEqual(pending.problem, { kind: 'invalid-date', field })

    const corrected = decision(pending, {
      kind: 'correct', value: field === 'birthDate' ? '1.1.16' : '1.1.26',
    })
    assert.equal(corrected.kind, 'ready')
    assert.equal(corrected.candidate[field], field === 'birthDate' ? '01.01.2016' : '01.01.2026')
    assert.equal(corrected.candidate.ageSource, 'automatic')
    assert.equal(corrected.candidate[other], original[other])

    const blanked = decision(pending, { kind: 'continue' })
    assert.equal(blanked.kind, 'ready')
    assert.equal(blanked.candidate[field], '')
    assert.equal(blanked.candidate[other], original[other])
    assert.equal(blanked.candidate.age, '7:6')
    assert.equal(blanked.candidate.ageSource, 'manual')

    assert.deepEqual(decision(pending, { kind: 'cancel' }), { kind: 'cancelled' })
    assert.deepEqual(original, before)
  })
}

test('an unsuccessful date correction reports the new problem without losing candidate content', () => {
  const original = frozenRegistration({ birthDate: 'wrong', testDate: '01.01.2026', age: '4:0' })
  const pending = validateForSave(original)
  const retry = decision(pending, { kind: 'correct', value: '29.02.2023' })
  assert.equal(retry.kind, 'needs-decision')
  assert.deepEqual(retry.problem, pending.problem)
  assert.equal(retry.candidate.birthDate, '29.02.2023')
  assert.equal(retry.candidate.testDate, original.testDate)
  assert.equal(retry.candidate.age, original.age)
  assert.deepEqual(decision(retry, { kind: 'cancel' }), { kind: 'cancelled' })
  assert.equal(original.birthDate, 'wrong')
})

test('valid manual ages use existing normalization and include both display boundaries', () => {
  for (const [text, expected] of [['1:6', '1:6'], ['99:11', '99:11'], ['004:001', '4:1'], ['018:000', '18:0']]) {
    const original = frozenRegistration({ age: text })
    const result = validateForSave(original)
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.age, expected)
    assert.equal(result.candidate.ageSource, 'manual')
    assert.equal(original.age, text)
  }
})

test('invalid manual ages support correction, blanking and cancellation', () => {
  for (const text of ['d', '4:', '4:12', '4:-1', '1:5', '100:0', ' 4:0']) {
    const original = frozenRegistration({ age: text, testDate: '22.10.2026' })
    const pending = validateForSave(original)
    assert.equal(pending.kind, 'needs-decision')
    assert.deepEqual(pending.problem, { kind: 'invalid-manual-age', field: 'age' })
    const corrected = decision(pending, { kind: 'correct', value: '004:001' })
    assert.equal(corrected.kind, 'ready')
    assert.equal(corrected.candidate.age, '4:1')
    const blanked = decision(pending, { kind: 'continue' })
    assert.equal(blanked.kind, 'ready')
    assert.equal(blanked.candidate.age, '')
    assert.equal(blanked.candidate.testDate, original.testDate)
    assert.deepEqual(decision(pending, { kind: 'cancel' }), { kind: 'cancelled' })
    assert.equal(original.age, text)
  }
  const retry = decision(validateForSave(registration({ age: 'wrong' })), { kind: 'correct', value: '1:5' })
  assert.equal(retry.kind, 'needs-decision')
  assert.equal(retry.candidate.age, '1:5')
})

test('an eligible date pair replaces any stored age using the established calculation', () => {
  for (const age of ['', 'wrong', '100:0', '99:11', '004:001']) {
    for (const ageSource of ['manual', 'automatic']) {
      const original = frozenRegistration({ birthDate: '16.10.2022', testDate: '16.10.2026', age, ageSource })
      const result = validateForSave(original)
      assert.equal(result.kind, 'ready')
      assert.equal(result.candidate.age, '4:0')
      assert.equal(result.candidate.ageSource, 'automatic')
      assert.equal(original.age, age)
    }
  }
})

test('automatic age limits use display age, including the days immediately outside the limits', () => {
  for (const [days, age] of [[548, '1:6'], [36524, '99:11']]) {
    const result = validateForSave(registration({ birthDate: '01.01.2000', testDate: dateAfter(days), age: 'wrong' }))
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.age, age)
  }
  for (const days of [547, 36525]) {
    const result = validateForSave(registration({ birthDate: '01.01.2000', testDate: dateAfter(days) }))
    assert.equal(result.kind, 'needs-decision')
    assert.equal(result.problem.kind, 'date-pair-out-of-range')
  }
})

test('all out-of-range date pairs, including negative ages, preserve both dates and any age on continue', () => {
  const pairs = [
    ['01.01.2000', dateAfter(547)], ['01.01.2000', dateAfter(36525)],
    ['22.10.2026', '21.10.2026'], ['22.10.2026', '22.10.2026'],
    ['1.1.26', '1.1.20'],
  ]
  for (const [birthDate, testDate] of pairs) {
    for (const age of ['', 'wrong', '4:12', '100:0', '7:6', '004:001']) {
      for (const ageSource of ['manual', 'automatic']) {
        const original = frozenRegistration({ birthDate, testDate, age, ageSource })
        const pending = validateForSave(original)
        assert.equal(pending.kind, 'needs-decision')
        assert.deepEqual(pending.problem, { kind: 'date-pair-out-of-range', fields: ['birthDate', 'testDate'] })
        const accepted = decision(pending, { kind: 'continue' })
        assert.equal(accepted.kind, 'ready')
        assert.deepEqual(accepted.candidate, original)
        assert.equal(original.birthDate, birthDate)
        assert.equal(original.testDate, testDate)
        assert.equal(original.age, age)
      }
    }
  }
})

test('an out-of-range pair supports correcting dates and cancelling while preserving previous snapshots', () => {
  const original = frozenRegistration({ birthDate: '22.10.2026', testDate: '21.10.2026', age: 'wrong' })
  const pending = validateForSave(original)
  assert.deepEqual(decision(pending, { kind: 'cancel' }), { kind: 'cancelled' })
  const retry = decision(pending, { kind: 'correct-dates', birthDate: '22.10.2026', testDate: '22.10.2026' })
  assert.equal(retry.kind, 'needs-decision')
  assert.equal(retry.problem.kind, 'date-pair-out-of-range')
  const corrected = decision(retry, { kind: 'correct-dates', birthDate: '22.10.22', testDate: '22.10.26' })
  assert.equal(corrected.kind, 'ready')
  assert.equal(corrected.candidate.birthDate, '22.10.2022')
  assert.equal(corrected.candidate.testDate, '22.10.2026')
  assert.equal(corrected.candidate.age, '4:0')
  assert.equal(original.age, 'wrong')
  assert.equal(original.testDate, '21.10.2026')
})

test('date-pair corrections can lead to an invalid individual date or a manual-age decision', () => {
  const pending = validateForSave(registration({ birthDate: '22.10.2026', testDate: '21.10.2026', age: 'wrong' }))
  let result = decision(pending, { kind: 'correct-dates', birthDate: 'wrong date', testDate: '22.10.2026' })
  assert.deepEqual(result.problem, { kind: 'invalid-date', field: 'birthDate' })
  result = decision(result, { kind: 'continue' })
  assert.deepEqual(result.problem, { kind: 'invalid-manual-age', field: 'age' })
  result = decision(result, { kind: 'correct', value: '4:0' })
  assert.equal(result.kind, 'ready')
  assert.equal(result.candidate.birthDate, '')
  assert.equal(result.candidate.testDate, '22.10.2026')
  assert.equal(result.candidate.age, '4:0')
})

test('multiple invalid fields can be resolved in sequence without losing accepted edits', () => {
  const original = frozenRegistration({ birthDate: 'bad birth', testDate: 'bad test', age: 'bad age' })
  const before = structuredClone(original)
  let result = validateForSave(original)
  assert.deepEqual(result.problem, { kind: 'invalid-date', field: 'birthDate' })
  result = decision(result, { kind: 'continue' })
  assert.deepEqual(result.problem, { kind: 'invalid-date', field: 'testDate' })
  assert.equal(result.candidate.birthDate, '')
  result = decision(result, { kind: 'correct', value: '1.1.26' })
  assert.deepEqual(result.problem, { kind: 'invalid-manual-age', field: 'age' })
  assert.equal(result.candidate.birthDate, '')
  assert.equal(result.candidate.testDate, '01.01.2026')
  const cancelled = decision(result, { kind: 'cancel' })
  assert.deepEqual(cancelled, { kind: 'cancelled' })
  const ready = decision(result, { kind: 'continue' })
  assert.equal(ready.kind, 'ready')
  assert.deepEqual(ready.candidate, { ...original, birthDate: '', testDate: '01.01.2026', age: '' })
  assert.deepEqual(original, before)
})

test('two date corrections can lead to a pair decision without losing either correction', () => {
  const original = frozenRegistration({ birthDate: 'bad birth', testDate: 'bad test', age: 'preserve me' })
  let result = validateForSave(original)
  result = decision(result, { kind: 'correct', value: '1.1.26' })
  result = decision(result, { kind: 'correct', value: '1.1.20' })
  assert.equal(result.problem.kind, 'date-pair-out-of-range')
  result = decision(result, { kind: 'continue' })
  assert.equal(result.kind, 'ready')
  assert.equal(result.candidate.birthDate, '1.1.26')
  assert.equal(result.candidate.testDate, '1.1.20')
  assert.equal(result.candidate.age, 'preserve me')
  assert.equal(original.birthDate, 'bad birth')
  assert.equal(original.testDate, 'bad test')
})

test('stale editing provenance does not skip validation or erase valid retained age text', () => {
  for (const birthDate of ['', 'wrong']) {
    const original = frozenRegistration({ birthDate, age: '7:6', ageSource: 'automatic' })
    let result = validateForSave(original)
    if (result.kind === 'needs-decision') result = decision(result, { kind: 'continue' })
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.age, '7:6')
    assert.equal(result.candidate.ageSource, 'manual')
    assert.equal(original.ageSource, 'automatic')
  }
  const result = validateForSave(registration({ age: 'wrong', ageSource: 'automatic' }))
  assert.deepEqual(result.problem, { kind: 'invalid-manual-age', field: 'age' })
})

test('zero, one and two scored items do not block saving or normalize non-score markers', () => {
  for (const scores of [0, 1, 2]) {
    const items = Array(50).fill('')
    items[20] = 'd'
    items[30] = '*'
    items[40] = ' '
    for (let index = 0; index < scores; index++) items[index] = String(index)
    const original = frozenRegistration({ items })
    const result = validateForSave(original)
    assert.equal(result.kind, 'ready')
    assert.deepEqual(result.candidate.items, items)
  }
})

test('ready candidates serialize exactly the accepted fields while other registration content is preserved', () => {
  const original = frozenRegistration({ birthDate: 'bad birth', testDate: '5.3.26', age: '004:001', items: Array(50).fill('d') })
  const before = structuredClone(original)
  const result = decision(validateForSave(original), { kind: 'continue' })
  assert.equal(result.kind, 'ready')
  const expected = { ...before, birthDate: '', testDate: '05.03.2026', age: '4:1' }
  assert.deepEqual(result.candidate, expected)
  const serialized = serializeNubu100(result.candidate)
  assert.equal(serialized.ok, true)
  const parsed = parseNubu100(serialized.bytes)
  assert.equal(parsed.kind, 'known-format')
  const { ageSource, ...stored } = expected
  assert.deepEqual(parsed.record, stored)
  assert.deepEqual(original, before)
})

test('errors and downstream serialization failures cannot change the original registration', () => {
  const original = frozenRegistration({ birthDate: 'wrong', age: '4:0' })
  const before = structuredClone(original)
  const pending = validateForSave(original)
  assert.deepEqual(decision(pending, { kind: 'correct-dates', birthDate: '', testDate: '' }), { kind: 'error', code: 'invalid-decision' })
  const pair = validateForSave(frozenRegistration({ birthDate: '22.10.2026', testDate: '21.10.2026' }))
  assert.deepEqual(decision(pair, { kind: 'correct', value: 'wrong target' }), { kind: 'error', code: 'invalid-decision' })
  const accepted = decision(pending, { kind: 'continue' })
  assert.deepEqual(decision(accepted, { kind: 'continue' }), { kind: 'error', code: 'not-awaiting-decision' })
  assert.deepEqual(decision({ kind: 'cancelled' }, { kind: 'continue' }), { kind: 'error', code: 'not-awaiting-decision' })
  assert.deepEqual(original, before)

  const invalidItems = frozenRegistration({ items: Array(49).fill('') })
  assert.deepEqual(validateForSave(invalidItems), { kind: 'error', code: 'invalid-items' })
  assert.equal(invalidItems.items.length, 49)

  const unencodable = frozenRegistration({ name: '😀', birthDate: 'wrong' })
  const snapshot = structuredClone(unencodable)
  const candidate = decision(validateForSave(unencodable), { kind: 'continue' })
  assert.equal(candidate.kind, 'ready')
  const failure = serializeNubu100(candidate.candidate)
  assert.equal(failure.ok, false)
  assert.equal(failure.error.code, 'unrepresentable-character')
  assert.deepEqual(unencodable, snapshot)
})

for (const id of [302, 303, 304]) {
  test(`reference ${id}: stored age, save candidate and established exact-age expectations remain separate`, () => {
    const bytes = fs.readFileSync(path.join(__dirname, `../docs/reference-tests/datafiler/Test${id}.~Z4`))
    const parsed = parseNubu100(bytes)
    assert.equal(parsed.kind, 'known-format')
    assert.equal(parsed.record.age, '4:0')
    const original = Object.freeze({ ...parsed.record, ageSource: 'manual', items: Object.freeze(parsed.record.items) })
    const before = structuredClone(original)
    const result = validateForSave(original)
    assert.equal(result.kind, 'ready')
    assert.equal(result.candidate.age, '4:0')
    assert.equal(result.candidate.ageSource, id === 304 ? 'manual' : 'automatic')
    const exact = dateAge(original.birthDate, original.testDate)
    if (id === 302) assert.equal(exact.exactYears, 4)
    if (id === 303) assert.equal(exact.exactYears, 1491 / 365.25)
    if (id === 304) assert.equal(exact.kind, 'missing')
    const serialized = serializeNubu100(result.candidate)
    assert.equal(serialized.ok, true)
    assert.deepEqual(Buffer.from(serialized.bytes), bytes)
    assert.deepEqual(original, before)
  })
}
