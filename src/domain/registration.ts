/** Editable data only; calculation results and file metadata are kept separately. */
export interface Registration {
  name: string
  note: string
  note2: string
  gender: "gutt" | "jente" | null
  birthDate: string
  testDate: string
  age: string
  // Editing provenance only; excluded from saved-content comparisons.
  ageSource: "manual" | "automatic"
  items: readonly string[]
}

/** File lifecycle metadata is separate from editable data and the reference copy. */
export type RegistrationFileState = { kind: "new" } | { kind: "saved" }

export type RegistrationStatus =
  | "Ingen ulagrede endringer"
  | "Ulagrede endringer"
  | "Endringer lagret"

export function registrationStatus(
  data: Registration,
  reference: Registration,
  fileState: RegistrationFileState,
): RegistrationStatus {
  if (!registrationsEqual(data, reference)) return "Ulagrede endringer"
  return fileState.kind === "saved" ? "Endringer lagret" : "Ingen ulagrede endringer"
}
export const itemLabels: readonly string[] = Array.from({ length: 50 }, (_, i) => `${"ABCDE"[Math.floor(i / 10)]}${i % 10 + 1}`)
/** Use the local calendar date rather than UTC. */
export function createRegistration(today: Date): Registration {
  return { name: "", note: "", note2: "", gender: null, birthDate: "", testDate: `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`, age: "", ageSource: "manual", items: Array(50).fill("") }
}
export function copyRegistration(data: Registration): Registration {
  if (data.items.length !== 50) throw new Error("Exactly 50 items are required.")
  return { ...data, items: [...data.items] }
}
/** Compare content, including restored edits, instead of maintaining a sticky dirty flag. */
export function registrationsEqual(a: Registration, b: Registration): boolean {
  // Age provenance controls editing, but only the displayed text is registration content.
  return a.name === b.name && a.note === b.note && a.note2 === b.note2 && a.gender === b.gender && a.birthDate === b.birthDate && a.testDate === b.testDate && a.age === b.age && a.items.length === 50 && b.items.length === 50 && a.items.every((value, i) => value === b.items[i])
}
export function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "")
}
/** Printable Windows-1252 characters, including punctuation outside Latin-1. */
export function isItemCharacter(value: string): boolean {
  return value.length === 1 && /^[\u0020-\u007e\u00a0-\u00ff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]$/.test(value)
}
