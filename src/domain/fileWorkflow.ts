/** Local operation coordination. Callers supply read/download outcomes; no IO occurs here. */
import type { Registration, RegistrationStatus } from "./registration";
import {
  copyRegistration,
  createRegistration,
  registrationsEqual,
  registrationStatus,
} from "./registration";
import { dateAge } from "./dateAge";
import type {
  SaveCandidate,
  SaveValidationDecision,
  SaveValidationResult,
} from "./saveValidation";
import { resolveSaveValidation, validateForSave } from "./saveValidation";
import type { Nubu100Error, Nubu100Record } from "../file/nubu100";
import { parseNubu100, serializeNubu100 } from "../file/nubu100";
import { defaultFileName, fileNameError } from "../file/fileName";

/** The most recently accepted opened file, never a requested download name or handle. */
export type FileAssociation = Readonly<{ fileName: string }> | null;
type NextAction = "open" | "new";

interface SaveContext {
  readonly revision: number;
  readonly suggestedName: string;
  readonly next: NextAction | null;
}

interface PreparedSave {
  readonly context: SaveContext;
  readonly candidate: SaveCandidate;
  readonly bytes: Uint8Array;
}

export type FileWorkflowPhase =
  | { readonly kind: "idle" }
  | { readonly kind: "clear-confirmation"; readonly token: number }
  | {
      readonly kind: "unsaved-changes";
      readonly token: number;
      readonly next: NextAction;
    }
  | {
      readonly kind: "choose-file";
      readonly token: number;
      readonly requiresUserClick: boolean;
    }
  | { readonly kind: "reading"; readonly token: number }
  | {
      readonly kind: "unknown-format";
      readonly token: number;
      readonly identifier: string;
      readonly fileName: string;
      readonly record: Readonly<Nubu100Record>;
    }
  | {
      readonly kind: "validation";
      readonly token: number;
      readonly context: SaveContext;
      readonly validation: Extract<
        SaveValidationResult,
        { kind: "needs-decision" }
      >;
    }
  | (PreparedSave & {
      readonly kind: "file-name";
      readonly token: number;
      readonly suggestedName: string;
    })
  | (PreparedSave & {
      readonly kind: "download";
      readonly token: number;
      readonly fileName: string;
    });

export interface FileWorkflowSnapshot {
  readonly current: SaveCandidate;
  readonly reference: SaveCandidate;
  readonly association: FileAssociation;
  // Reset by accepted Open/New, preserved by ordinary edits and clear-form.
  readonly downloadInitiated: boolean;
  readonly status: RegistrationStatus;
  readonly phase: FileWorkflowPhase;
}

export type ReadOutcome =
  | { kind: "read"; fileName: string; bytes: Uint8Array }
  | { kind: "failed" }
  | { kind: "cancelled" };

export type WorkflowOutcome =
  | { kind: "ok" | "busy" | "ignored" | "cancelled" | "opened" | "new" | "cleared" }
  | { kind: "saved"; continuation: NextAction | null }
  | { kind: "error"; code: "read-failed" | "invalid-file-name" }
  | { kind: "error"; code: "format" | "serialization"; detail: Nubu100Error }
  | {
      kind: "error";
      code: "validation";
      detail: Extract<SaveValidationResult, { kind: "error" }>;
    }
  | { kind: "error"; code: "download-failed" };

const IDLE = Object.freeze({ kind: "idle" } as const);

function snapshot(data: Registration): SaveCandidate {
  const copied = copyRegistration(data);
  Object.freeze(copied.items);
  return Object.freeze(copied);
}

function documentState(
  current: Registration,
  reference: Registration,
  association: FileAssociation,
  downloadInitiated = false,
) {
  return Object.freeze({
    current: snapshot(current),
    reference: snapshot(reference),
    association,
    downloadInitiated,
  });
}

/**
 * Owns registration content and file metadata, but never calculation/session settings.
 * Every awaited step gets a fresh token. Adapters must return that token with a
 * result, so cancelled, duplicated, or superseded callbacks cannot update content.
 */
export class FileWorkflow {
  private document: ReturnType<typeof documentState>;
  private phase: FileWorkflowPhase = IDLE;
  private revision = 0;
  private nextToken = 1;

  constructor(private readonly now: () => Date = () => new Date()) {
    const initial = createRegistration(this.now());
    this.document = documentState(initial, initial, null);
  }

  /** Returned data is frozen; byte buffers are copies, never the stored save payload. */
  getSnapshot(): FileWorkflowSnapshot {
    const { current, reference, association, downloadInitiated } = this.document;
    const phase =
      this.phase.kind === "file-name" || this.phase.kind === "download"
        ? Object.freeze({ ...this.phase, bytes: this.phase.bytes.slice() })
        : this.phase;
    return Object.freeze({
      current,
      reference,
      association,
      downloadInitiated,
      status: registrationStatus(current, reference, {
        kind: association || downloadInitiated ? "saved" : "new",
      }),
      phase,
    });
  }

  /**
   * Edits invalidate pending reads and decisions, even if later edits restore content.
   * A prepared download may still finish; its reference must describe its own bytes.
   */
  edit(data: Registration): WorkflowOutcome {
    const { current, reference, association } = this.document;
    if (
      registrationsEqual(data, current) &&
      data.ageSource === current.ageSource
    ) {
      return { kind: "ok" };
    }
    const updated = documentState(data, reference, association, this.document.downloadInitiated);
    this.document = updated;
    this.revision++;
    if (this.phase.kind !== "download") this.phase = IDLE;
    return { kind: "ok" };
  }

  /** Call only after the existing clear-form confirmation has been accepted. */
  clearForm(confirmed: boolean): WorkflowOutcome {
    return confirmed
      ? this.edit(createRegistration(this.now()))
      : { kind: "cancelled" };
  }

  /** Keep the existing clear confirmation policy separate from replacement decisions. */
  requestClearForm(): WorkflowOutcome {
    if (this.phase.kind !== "idle") return { kind: "busy" };
    if (!registrationsEqual(this.document.current, this.document.reference)) {
      this.phase = Object.freeze({ kind: "clear-confirmation", token: this.nextToken++ });
      return { kind: "ok" };
    }
    this.clearForm(true);
    return { kind: "cleared" };
  }

  chooseClearForm(token: number, confirmed: boolean): WorkflowOutcome {
    if (this.phase.kind !== "clear-confirmation" || this.phase.token !== token) {
      return { kind: "ignored" };
    }
    if (!confirmed) return this.cancel(token);
    this.phase = IDLE;
    this.clearForm(true);
    return { kind: "cleared" };
  }

  requestOpen(): WorkflowOutcome {
    return this.requestReplacement("open");
  }

  requestNew(): WorkflowOutcome {
    return this.requestReplacement("new");
  }

  requestDownload(): WorkflowOutcome {
    if (this.phase.kind !== "idle") return { kind: "busy" };
    return this.startSave(null);
  }

  chooseUnsaved(
    token: number,
    choice: "save" | "discard" | "cancel",
  ): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "unsaved-changes" || phase.token !== token) {
      return { kind: "ignored" };
    }
    if (choice === "cancel") return this.cancel(token);
    return choice === "save"
      ? this.startSave(phase.next)
      : this.advance(phase.next, false);
  }

  /** The later UI calls this on file selection/user activation, including Velg fil. */
  beginRead(token: number): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "choose-file" || phase.token !== token) {
      return { kind: "ignored" };
    }
    this.phase = Object.freeze({ kind: "reading", token: this.nextToken++ });
    return { kind: "ok" };
  }

  receiveRead(token: number, outcome: ReadOutcome): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "reading" || phase.token !== token) {
      return { kind: "ignored" };
    }
    if (outcome.kind === "cancelled") return this.cancel(token);
    if (outcome.kind === "failed") {
      this.phase = IDLE;
      return { kind: "error", code: "read-failed" };
    }
    const parsed = parseNubu100(outcome.bytes);
    if (parsed.kind === "error") {
      this.phase = IDLE;
      return { kind: "error", code: "format", detail: parsed.error };
    }
    if (outcome.fileName === "") {
      this.phase = IDLE;
      return { kind: "error", code: "invalid-file-name" };
    }
    if (parsed.kind === "unknown-identifier") {
      this.phase = Object.freeze({
        kind: "unknown-format",
        token: this.nextToken++,
        identifier: parsed.identifier,
        fileName: outcome.fileName,
        record: snapshot({ ...parsed.record, ageSource: "manual" }),
      });
      return { kind: "ok" };
    }
    return this.commitOpen(parsed.record, outcome.fileName);
  }

  chooseUnknownFormat(
    token: number,
    choice: "continue" | "cancel",
  ): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "unknown-format" || phase.token !== token) {
      return { kind: "ignored" };
    }
    return choice === "cancel"
      ? this.cancel(token)
      : this.commitOpen(phase.record, phase.fileName);
  }

  chooseValidation(
    token: number,
    decision: SaveValidationDecision,
  ): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "validation" || phase.token !== token) {
      return { kind: "ignored" };
    }
    return this.prepareSave(
      resolveSaveValidation(phase.validation, decision),
      phase.context,
    );
  }

  chooseFileName(token: number, fileName: string): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "file-name" || phase.token !== token) {
      return { kind: "ignored" };
    }
    if (fileNameError(fileName)) {
      return { kind: "error", code: "invalid-file-name" };
    }
    this.phase = Object.freeze({
      kind: "download",
      token: this.nextToken++,
      context: phase.context,
      candidate: phase.candidate,
      bytes: phase.bytes,
      fileName,
    });
    return { kind: "ok" };
  }

  /** A success acknowledges initiation only, never actual completion on disk. */
  receiveDownload(
    token: number,
    outcome: "started" | "failed" | "cancelled",
  ): WorkflowOutcome {
    const phase = this.phase;
    if (phase.kind !== "download" || phase.token !== token) {
      return { kind: "ignored" };
    }
    if (outcome === "cancelled") return this.cancel(token);
    if (outcome === "failed") {
      this.phase = IDLE;
      return { kind: "error", code: "download-failed" };
    }
    const unchanged = this.revision === phase.context.revision;
    // Do not apply old validation corrections over edits made after serialization.
    // The downloaded snapshot remains the reference, so newer content stays visibly dirty.
    // Download history is independent of the name of the last opened file.
    this.document = documentState(
      unchanged ? phase.candidate : this.document.current,
      phase.candidate,
      this.document.association,
      true,
    );
    this.phase = IDLE;
    const continuation = unchanged ? phase.context.next : null;
    if (continuation) this.advance(continuation, true);
    return { kind: "saved", continuation };
  }

  /** Escape, dialog close, and an explicit cancel all use this same operation. */
  cancel(token: number): WorkflowOutcome {
    if (this.phase.kind === "idle" || this.phase.token !== token) {
      return { kind: "ignored" };
    }
    this.phase = IDLE;
    return { kind: "cancelled" };
  }

  private requestReplacement(next: NextAction): WorkflowOutcome {
    if (this.phase.kind !== "idle") return { kind: "busy" };
    if (!registrationsEqual(this.document.current, this.document.reference)) {
      this.phase = Object.freeze({
        kind: "unsaved-changes",
        token: this.nextToken++,
        next,
      });
      return { kind: "ok" };
    }
    return this.advance(next, false);
  }

  private advance(next: NextAction, afterSave: boolean): WorkflowOutcome {
    if (next === "open") {
      this.phase = Object.freeze({
        kind: "choose-file",
        token: this.nextToken++,
        requiresUserClick: afterSave,
      });
      return { kind: "ok" };
    }
    const initial = createRegistration(this.now());
    this.document = documentState(initial, initial, null);
    this.revision++;
    this.phase = IDLE;
    return { kind: "new" };
  }

  private commitOpen(
    record: Nubu100Record,
    fileName: string,
  ): WorkflowOutcome {
    const pair = dateAge(record.birthDate, record.testDate);
    const normalized: Registration =
      pair.kind === "valid"
        ? { ...record, age: pair.displayAge, ageSource: "automatic" }
        : { ...record, ageSource: "manual" };
    // Build the complete replacement before publishing it as one document update.
    this.document = documentState(
      normalized,
      normalized,
      Object.freeze({ fileName }),
    );
    this.revision++;
    this.phase = IDLE;
    return { kind: "opened" };
  }

  private startSave(next: NextAction | null): WorkflowOutcome {
    // Check fields that date/age decisions cannot change before asking for corrections.
    // Date and age text may still be corrected, blanked, or calculated, so only the
    // final candidate can determine whether those fields can be serialized.
    const preflight = serializeNubu100({
      ...this.document.current,
      birthDate: "",
      testDate: "",
      age: "",
    });
    if (!preflight.ok) {
      this.phase = IDLE;
      return { kind: "error", code: "serialization", detail: preflight.error };
    }
    const suggestedName = this.document.association
      ? this.document.association.fileName
      : defaultFileName(this.now());
    const context = Object.freeze({ suggestedName, next, revision: this.revision });
    return this.prepareSave(validateForSave(this.document.current), context);
  }

  private prepareSave(
    validation: SaveValidationResult,
    context: SaveContext,
  ): WorkflowOutcome {
    if (validation.kind === "cancelled") {
      this.phase = IDLE;
      return { kind: "cancelled" };
    }
    if (validation.kind === "error") {
      this.phase = IDLE;
      return { kind: "error", code: "validation", detail: validation };
    }
    if (validation.kind === "needs-decision") {
      this.phase = Object.freeze({
        kind: "validation",
        token: this.nextToken++,
        context,
        validation,
      });
      return { kind: "ok" };
    }
    const serialized = serializeNubu100(validation.candidate);
    if (!serialized.ok) {
      this.phase = IDLE;
      return { kind: "error", code: "serialization", detail: serialized.error };
    }
    this.phase = Object.freeze({
      kind: "file-name",
      token: this.nextToken++,
      context,
      candidate: validation.candidate,
      bytes: serialized.bytes,
      suggestedName: context.suggestedName,
    });
    return { kind: "ok" };
  }
}
