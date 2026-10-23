/** Suggest a name from the local save date, independently of registration dates. */
export function defaultFileName(today: Date): string {
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear() % 100).padStart(2, "0");
  return `Motorisk test ${day}.${month}.${year}.~Z4`;
}

export type FileNameError = "empty" | "invalid-character" | "trailing-dot-or-space" | "reserved-name";

/** Keep names portable between Windows and macOS without rewriting user input. */
export function fileNameError(name: string): FileNameError | null {
  if (name.trim() === "") return "empty";
  if (/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/.test(name)) return "invalid-character";
  if (/[. ]$/.test(name)) return "trailing-dot-or-space";
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) return "reserved-name";
  return null;
}
