/** Suggest a name from the local save date, independently of registration dates. */
export function defaultFileName(today: Date): string {
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear() % 100).padStart(2, "0");
  return `Motorisk test ${day}.${month}.${year}.~Z4`;
}
