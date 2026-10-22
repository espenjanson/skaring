/** Lossless Windows-1252 conversion, independent of browser and Node APIs. */

// Null entries are unassigned bytes, not replacement characters or C1 controls.
const SPECIAL_CHARACTERS: readonly (string | null)[] = [
  "€",
  null,
  "‚",
  "ƒ",
  "„",
  "…",
  "†",
  "‡",
  "ˆ",
  "‰",
  "Š",
  "‹",
  "Œ",
  null,
  "Ž",
  null,
  null,
  "‘",
  "’",
  "“",
  "”",
  "•",
  "–",
  "—",
  "˜",
  "™",
  "š",
  "›",
  "œ",
  null,
  "ž",
  "Ÿ",
];

const SPECIAL_BYTES = new Map<string, number>();
SPECIAL_CHARACTERS.forEach((character, index) => {
  if (character !== null) SPECIAL_BYTES.set(character, 0x80 + index);
});

export type Windows1252DecodeResult =
  | { ok: true; text: string }
  | {
      ok: false;
      error: { code: "unassigned-byte"; byte: number; index: number };
    };

export type Windows1252EncodeResult =
  | { ok: true; bytes: Uint8Array }
  | {
      ok: false;
      error: {
        code: "unrepresentable-character";
        character: string;
        index: number;
      };
    };

/** Decode without substitution. Error indices are zero-based byte offsets. */
export function decodeWindows1252(bytes: Uint8Array): Windows1252DecodeResult {
  const characters: string[] = [];
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    const character =
      byte >= 0x80 && byte <= 0x9f
        ? SPECIAL_CHARACTERS[byte - 0x80]
        : String.fromCharCode(byte);
    if (character === null) {
      return { ok: false, error: { code: "unassigned-byte", byte, index } };
    }
    characters.push(character);
  }
  return { ok: true, text: characters.join("") };
}

/** Encode without normalization. Error indices are zero-based UTF-16 offsets. */
export function encodeWindows1252(text: string): Windows1252EncodeResult {
  const bytes: number[] = [];
  let index = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const byte =
      codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)
        ? codePoint
        : SPECIAL_BYTES.get(character);
    if (byte === undefined) {
      return {
        ok: false,
        error: { code: "unrepresentable-character", character, index },
      };
    }
    bytes.push(byte);
    index += character.length;
  }
  return { ok: true, bytes: Uint8Array.from(bytes) };
}
