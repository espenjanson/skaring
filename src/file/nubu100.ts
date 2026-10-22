/** NUBUMotor_100 structure only: no age rules, dialogs, or file lifecycle changes. */
import type { Registration } from "../domain/registration";
import { decodeWindows1252, encodeWindows1252 } from "./windows1252";

/** The file stores age text, but does not store its editing provenance. */
export type Nubu100Record = Omit<Registration, "ageSource">;
export type Nubu100Field = keyof Nubu100Record | "identifier";

/** Indices are zero-based within a field; itemIndex identifies an A1–E10 slot. */
export type Nubu100Error =
  | { code: "unsupported-bom" }
  | { code: "missing-lines"; actual: number }
  | { code: "invalid-field"; field: Nubu100Field }
  | { code: "invalid-gender"; field: "gender" }
  | { code: "missing-identifier"; field: "identifier" }
  | { code: "invalid-item-count"; field: "items"; actual: number }
  | { code: "invalid-item"; field: "items"; itemIndex: number }
  | {
      code: "unassigned-byte";
      field: Nubu100Field;
      byte: number;
      index: number;
    }
  | {
      code: "control-character" | "unrepresentable-character";
      field: Nubu100Field;
      character: string;
      index: number;
      itemIndex?: number;
    };

export type Nubu100ParseResult =
  | { kind: "known-format"; record: Nubu100Record }
  // A readable structure does not authorize opening it; the caller must ask first.
  | { kind: "unknown-identifier"; identifier: string; record: Nubu100Record }
  | { kind: "error"; error: Nubu100Error };

export type Nubu100SerializeResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: Nubu100Error };

const IDENTIFIER = "NUBUMotor_100";
const ITEM_COUNT = 50;
const LINE_FIELDS: readonly Nubu100Field[] = [
  "name",
  "gender",
  "birthDate",
  "testDate",
  "age",
  "note",
  "note2",
  "items",
  "identifier",
];
const TEXT_FIELDS = [
  "name",
  "birthDate",
  "testDate",
  "age",
  "note",
  "note2",
] as const;

/** CR/LF are accepted only as structural separators, never inside a field. */
function textError(
  text: string,
  field: Nubu100Field,
): Extract<Nubu100Error, { character: string }> | null {
  const control = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.exec(text);
  if (control) {
    return {
      code: "control-character",
      field,
      character: control[0],
      index: control.index,
    };
  }
  const encoded = encodeWindows1252(text);
  return encoded.ok ? null : { ...encoded.error, field };
}

function hasBom(bytes: Uint8Array): boolean {
  return (
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff) ||
    (bytes[0] === 0 &&
      bytes[1] === 0 &&
      bytes[2] === 0xfe &&
      bytes[3] === 0xff)
  );
}

/** Read only the nine ordinary lines; trailing content is intentionally ignored. */
export function parseNubu100(bytes: Uint8Array): Nubu100ParseResult {
  if (hasBom(bytes)) {
    return { kind: "error", error: { code: "unsupported-bom" } };
  }

  const lines: string[] = [];
  let start = 0;
  for (const field of LINE_FIELDS) {
    let end = start;
    while (
      end < bytes.length &&
      !(bytes[end] === 0x0d && bytes[end + 1] === 0x0a)
    ) {
      end++;
    }
    if (lines.length < LINE_FIELDS.length - 1 && end === bytes.length) {
      return {
        kind: "error",
        error: { code: "missing-lines", actual: lines.length + 1 },
      };
    }
    const decoded = decodeWindows1252(bytes.subarray(start, end));
    if (!decoded.ok) {
      return { kind: "error", error: { ...decoded.error, field } };
    }
    const error = textError(decoded.text, field);
    if (error) return { kind: "error", error };
    lines.push(decoded.text);
    start = end + 2;
  }

  let gender: Nubu100Record["gender"];
  switch (lines[1]) {
    case "true false":
      gender = "gutt";
      break;
    case "false true":
      gender = "jente";
      break;
    case "false false":
      gender = null;
      break;
    default:
      return {
        kind: "error",
        error: { code: "invalid-gender", field: "gender" },
      };
  }
  if (lines[7].length !== ITEM_COUNT) {
    return {
      kind: "error",
      error: {
        code: "invalid-item-count",
        field: "items",
        actual: lines[7].length,
      },
    };
  }
  if (lines[8].trim() === "") {
    return {
      kind: "error",
      error: { code: "missing-identifier", field: "identifier" },
    };
  }

  const record: Nubu100Record = {
    name: lines[0],
    gender,
    birthDate: lines[2],
    testDate: lines[3],
    age: lines[4],
    note: lines[5],
    note2: lines[6],
    items: Array.from(lines[7], (character) =>
      character === "*" ? "" : character,
    ),
  };
  return lines[8] === IDENTIFIER
    ? { kind: "known-format", record }
    : { kind: "unknown-identifier", identifier: lines[8], record };
}

/** Serialize a snapshot without changing any supplied field or calculating age. */
export function serializeNubu100(record: Nubu100Record): Nubu100SerializeResult {
  for (const field of TEXT_FIELDS) {
    if (typeof record[field] !== "string") {
      return { ok: false, error: { code: "invalid-field", field } };
    }
    const error = textError(record[field], field);
    if (error) return { ok: false, error };
  }
  if (
    record.gender !== null &&
    record.gender !== "gutt" &&
    record.gender !== "jente"
  ) {
    return { ok: false, error: { code: "invalid-gender", field: "gender" } };
  }
  if (!Array.isArray(record.items)) {
    return { ok: false, error: { code: "invalid-field", field: "items" } };
  }
  if (record.items.length !== ITEM_COUNT) {
    return {
      ok: false,
      error: {
        code: "invalid-item-count",
        field: "items",
        actual: record.items.length,
      },
    };
  }
  const items: string[] = [];
  for (let itemIndex = 0; itemIndex < ITEM_COUNT; itemIndex++) {
    const item = record.items[itemIndex];
    if (typeof item !== "string") {
      return {
        ok: false,
        error: { code: "invalid-item", field: "items", itemIndex },
      };
    }
    const error = textError(item, "items");
    if (error) return { ok: false, error: { ...error, itemIndex } };
    if (item.length > 1) {
      return {
        ok: false,
        error: { code: "invalid-item", field: "items", itemIndex },
      };
    }
    items.push(item === "" ? "*" : item);
  }

  const gender =
    record.gender === "gutt"
      ? "true false"
      : record.gender === "jente"
        ? "false true"
        : "false false";
  const lines = [
    record.name,
    gender,
    record.birthDate,
    record.testDate,
    record.age,
    record.note,
    record.note2,
    items.join(""),
    IDENTIFIER,
  ];
  // Every field was checked above; bytes are returned only for a complete file.
  const encoded = encodeWindows1252(lines.join("\r\n") + "\r\n");
  return encoded.ok
    ? encoded
    : { ok: false, error: { ...encoded.error, field: "identifier" } };
}
