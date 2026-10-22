/** Date and age validation of isolated save candidates; never updates the form. */
import type { Registration } from "./registration";
import { copyRegistration } from "./registration";
import {
  dateAge,
  finishManualAge,
  manualAgeError,
  parseDate,
} from "./dateAge";
import type { DateField } from "./dateAge";

export type SaveCandidate = Readonly<Registration>;

export type SaveValidationProblem =
  | { readonly kind: "invalid-date"; readonly field: DateField }
  | { readonly kind: "invalid-manual-age"; readonly field: "age" }
  | {
      readonly kind: "date-pair-out-of-range";
      readonly fields: readonly ["birthDate", "testDate"];
    };

export type SaveValidationResult =
  // Ready means date/age checks are complete, not that encoding or download succeeded.
  | { readonly kind: "ready"; readonly candidate: SaveCandidate }
  | {
      readonly kind: "needs-decision";
      readonly candidate: SaveCandidate;
      readonly problem: SaveValidationProblem;
    }
  | { readonly kind: "cancelled" }
  | {
      readonly kind: "error";
      readonly code: "invalid-items" | "invalid-decision" | "not-awaiting-decision";
    };

export type SaveValidationDecision =
  | { kind: "cancel" }
  // Continue blanks an invalid single field, but preserves an out-of-range pair.
  | { kind: "continue" }
  | { kind: "correct"; value: string }
  | { kind: "correct-dates"; birthDate: string; testDate: string };

/** Copy and freeze both levels so neither the caller nor later edits alter a snapshot. */
function snapshot(data: Registration): SaveCandidate {
  const candidate = copyRegistration(data);
  Object.freeze(candidate.items);
  return Object.freeze(candidate);
}

function needsDecision(
  data: Registration,
  problem: SaveValidationProblem,
): SaveValidationResult {
  return Object.freeze({
    kind: "needs-decision",
    candidate: snapshot(data),
    problem: Object.freeze(problem),
  });
}

function ready(data: Registration): SaveValidationResult {
  return Object.freeze({ kind: "ready", candidate: snapshot(data) });
}

/**
 * Start from current registration content, without retaining a live reference to it.
 * Valid short dates/manual ages use the established normalization rules. Issues
 * are handled one at a time, in birth date, test date, then age order.
 */
export function validateForSave(data: Registration): SaveValidationResult {
  if (!Array.isArray(data.items) || data.items.length !== 50) {
    return { kind: "error", code: "invalid-items" };
  }
  const candidate = snapshot(data);
  const birth = parseDate(candidate.birthDate);
  const test = parseDate(candidate.testDate);
  if (birth.kind === "invalid") {
    return needsDecision(candidate, { kind: "invalid-date", field: "birthDate" });
  }
  if (test.kind === "invalid") {
    return needsDecision(candidate, { kind: "invalid-date", field: "testDate" });
  }

  const pair = dateAge(candidate.birthDate, candidate.testDate);
  if (pair.kind === "out-of-range" || pair.kind === "reversed") {
    // V03 preserves the date and age texts even if the age is not valid manually.
    // Do not run blur handlers: they can erase previously automatic age text.
    return needsDecision(candidate, {
      kind: "date-pair-out-of-range",
      fields: Object.freeze(["birthDate", "testDate"] as const),
    });
  }

  const normalized = {
    ...candidate,
    birthDate: birth.kind === "valid" ? birth.normalized : candidate.birthDate,
    testDate: test.kind === "valid" ? test.normalized : candidate.testDate,
  };
  if (pair.kind === "valid") {
    return ready({ ...normalized, age: pair.displayAge, ageSource: "automatic" });
  }

  // Without an eligible pair, any retained age text is editable/manual, regardless
  // of the snapshot's editing provenance. Preserve it for a decision if invalid.
  const manual: Registration = { ...normalized, ageSource: "manual" };
  if (manualAgeError(manual.age)) {
    return needsDecision(manual, { kind: "invalid-manual-age", field: "age" });
  }
  return ready(finishManualAge(manual));
}

/**
 * Resolve only the reported problem, preserving earlier accepted edits in the
 * candidate. Rejected corrections produce another problem; cancel/error expose
 * no candidate for saving. Applying a ready candidate to the form is deliberately
 * left to a later operation, after download initiation without a detected error.
 */
export function resolveSaveValidation(
  result: SaveValidationResult,
  decision: SaveValidationDecision,
): SaveValidationResult {
  if (result.kind !== "needs-decision") {
    return { kind: "error", code: "not-awaiting-decision" };
  }
  if (decision.kind === "cancel") return { kind: "cancelled" };

  const { candidate, problem } = result;
  if (decision.kind === "continue") {
    if (problem.kind === "date-pair-out-of-range") {
      // Acceptance completes this check; a manual-age check must not follow it.
      return ready(candidate);
    }
    return validateForSave({ ...candidate, [problem.field]: "" });
  }
  if (decision.kind === "correct") {
    if (problem.kind === "date-pair-out-of-range") {
      return { kind: "error", code: "invalid-decision" };
    }
    return validateForSave({ ...candidate, [problem.field]: decision.value });
  }
  if (decision.kind === "correct-dates") {
    if (problem.kind !== "date-pair-out-of-range") {
      return { kind: "error", code: "invalid-decision" };
    }
    return validateForSave({
      ...candidate,
      birthDate: decision.birthDate,
      testDate: decision.testDate,
    });
  }
  return { kind: "error", code: "invalid-decision" };
}
