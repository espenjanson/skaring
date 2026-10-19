import type { Registration } from "./registration"

const SECONDS_PER_DAY = 86400
const MILLISECONDS_PER_DAY = SECONDS_PER_DAY * 1000
const DAYS_PER_YEAR = 365.25
const MIN_AGE_MONTHS = 18
const MAX_AGE_MONTHS = 1199

export type DateField = "birthDate" | "testDate"
export type ParsedDate =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "valid"; normalized: string; utcMilliseconds: number }

export type DateAge =
  | { kind: "missing" | "invalid-date" | "reversed" }
  | { kind: "out-of-range" | "valid"; exactYears: number; displayAge: string }

/** Parse explicitly; native string parsing depends on locale and accepts rollover dates. */
export function parseDate(text: string): ParsedDate {
  if (text === "") return { kind: "empty" }
  const parts = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(text)
  if (!parts) return { kind: "invalid" }
  const day = Number(parts[1])
  const month = Number(parts[2])
  const year = Number(parts[3]) + (parts[3].length === 2 ? 2000 : 0)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { kind: "invalid" }
  }

  // setUTCFullYear avoids Date.UTC's special interpretation of years 0 through 99.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { kind: "invalid" }
  }
  return {
    kind: "valid",
    normalized: `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${String(year).padStart(4, "0")}`,
    utcMilliseconds: date.getTime(),
  }
}

/** Calendar days use UTC midnights, so daylight-saving transitions cannot change age. */
export function dateAge(birthText: string, testText: string): DateAge {
  const birth = parseDate(birthText)
  const test = parseDate(testText)
  if (birth.kind === "invalid" || test.kind === "invalid") return { kind: "invalid-date" }
  if (birth.kind !== "valid" || test.kind !== "valid") return { kind: "missing" }
  const elapsedDays = (test.utcMilliseconds - birth.utcMilliseconds) / MILLISECONDS_PER_DAY
  if (elapsedDays < 0) return { kind: "reversed" }
  const elapsedSeconds = elapsedDays * SECONDS_PER_DAY
  const exactYears = elapsedSeconds / (SECONDS_PER_DAY * DAYS_PER_YEAR)

  // 12 / 365.25 = 48 / 1461. Integer arithmetic avoids rounding at month boundaries.
  const months = Math.floor(elapsedDays * 48 / 1461)
  const displayAge = `${Math.floor(months / 12)}:${months % 12}`
  return {
    kind: months < MIN_AGE_MONTHS || months > MAX_AGE_MONTHS ? "out-of-range" : "valid",
    exactYears,
    displayAge,
  }
}

/** Check manual display text only. The later calculation adapter must apply any half-month addition. */
export function manualAgeError(text: string): string | null {
  if (text === "") return null
  const parts = /^(\d+):(\d+)$/.exec(text)
  if (!parts || Number(parts[2]) > 11) return "Bruk alder som Å:M, med måneder fra 0 til 11."
  const months = Number(parts[1]) * 12 + Number(parts[2])
  return months < MIN_AGE_MONTHS || months > MAX_AGE_MONTHS
    ? "Alder må være mellom 1:6 og 99:11."
    : null
}

/** Normalize only accepted manual ages on blur; preserve rejected input for correction. */
export function finishManualAge(data: Registration): Registration {
  if (data.ageSource === "automatic" || data.age === "" || manualAgeError(data.age)) return data
  const [years, months] = data.age.split(":")
  return { ...data, age: `${Number(years)}:${Number(months)}` }
}

/** Invalidate an old automatic age immediately, while preserving manually entered text. */
export function editRegistrationDate(data: Registration, field: DateField, text: string): Registration {
  if (data[field] === text) return data
  return {
    ...data,
    [field]: text,
    age: data.ageSource === "automatic" ? "" : data.age,
    ageSource: "manual",
  }
}

/** Normalize only the field being left; invalid text remains available for correction. */
export function finishRegistrationDate(data: Registration, field: DateField): Registration {
  const parsed = parseDate(data[field])
  const next = { ...data, [field]: parsed.kind === "valid" ? parsed.normalized : data[field] }
  const calculated = dateAge(next.birthDate, next.testDate)
  if (calculated.kind === "valid") {
    return { ...next, age: calculated.displayAge, ageSource: "automatic" }
  }
  return {
    ...next,
    age: data.ageSource === "automatic" ? "" : data.age,
    ageSource: "manual",
  }
}
