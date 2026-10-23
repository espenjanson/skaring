/** Bokmål presentation of typed errors, with no logging of registration content. */
import type { WorkflowOutcome } from "../domain/fileWorkflow";
import type { Nubu100Field } from "./nubu100";
import type { FileNameError } from "./fileName";
import type { FileWorkflowSnapshot } from "../domain/fileWorkflow";

export const DOWNLOAD_NOTICE = "Nedlastingen er startet. Kontroller at filen blir lagret.";

export type FileMessage = Readonly<{ kind: "error" | "notice"; text: string }> | null;
export type FileMessageEvent =
  | { kind: "show"; message: NonNullable<FileMessage> }
  | { kind: "dismiss" }
  | { kind: "edit" };

/** One message slot; editing may clear an error but never a download notice. */
export function updateFileMessage(current: FileMessage, event: FileMessageEvent): FileMessage {
  if (event.kind === "show") return event.message;
  if (event.kind === "dismiss" || current?.kind === "error") return null;
  return current;
}

/** Download history affects the caption, never the original opened-file association. */
export function registrationCaption(state: Pick<FileWorkflowSnapshot, "association" | "downloadInitiated">): string {
  const suffix = state.downloadInitiated ? "Endringer lastet ned" : state.association?.fileName ?? "Ikke lagret";
  return `Skåring av motoriske oppgaver i NUBU 4-16 (${suffix})`;
}

const fields: Record<Nubu100Field, string> = {
  name: "Navn", note: "Merknad", note2: "Merknad 2", gender: "Kjønn",
  birthDate: "Født dato", testDate: "Testdato", age: "Alder",
  items: "Oppgaver", identifier: "Formatidentifikator",
};

export function fileNameMessage(error: FileNameError): string {
  switch (error) {
    case "empty": return "Skriv et filnavn.";
    case "invalid-character": return 'Filnavnet kan ikke inneholde kontrolltegn eller tegnene < > : " / \\ | ? *.';
    case "trailing-dot-or-space": return "Filnavnet kan ikke slutte med punktum eller mellomrom.";
    case "reserved-name": return "Dette filnavnet er reservert i Windows. Velg et annet navn.";
  }
}

export function workflowMessage(outcome: WorkflowOutcome): string | null {
  if (outcome.kind !== "error") return null;
  switch (outcome.code) {
    case "read-failed": case "format": return "Kunne ikke åpne filen.";
    case "download-failed": return "Kunne ikke starte nedlastingen. Registreringen er ikke lagret.";
    case "invalid-file-name": return "Ugyldig filnavn. Rett filnavnet og prøv igjen.";
    case "validation": return "Kunne ikke fullføre datakontrollen. Registreringen er ikke endret.";
    case "serialization": {
      const error = outcome.detail;
      if (error.code === "unrepresentable-character" || error.code === "control-character") {
        const field = error.field === "items" && error.itemIndex !== undefined
          ? `Oppgave ${"ABCDE"[Math.floor(error.itemIndex / 10)]}${error.itemIndex % 10 + 1}`
          : fields[error.field];
        const code = `U+${error.character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
        return error.code === "unrepresentable-character"
          ? `${field} inneholder tegnet «${error.character}» (${code}). Rett feltet og prøv igjen.`
          : `${field} inneholder et kontrolltegn (${code}) som ikke kan lagres. Rett feltet og prøv igjen.`;
      }
      return "Kunne ikke lage filinnholdet. Kontroller registreringen og prøv igjen.";
    }
  }
}
