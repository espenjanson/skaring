"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Registration } from "../domain/registration";
import { FileWorkflow } from "../domain/fileWorkflow";
import type { FileWorkflowSnapshot, WorkflowOutcome } from "../domain/fileWorkflow";
import type { SaveValidationDecision } from "../domain/saveValidation";
import { BrowserFileActions } from "../file/browserFiles";
import { DOWNLOAD_NOTICE, workflowMessage, updateFileMessage } from "../file/fileMessages";
import type { FileMessage } from "../file/fileMessages";

/** React publishes workflow snapshots; it never maintains a second reference or dirty flag. */
export function useRegistrationFiles(onAccepted: () => void) {
  const workflow = useRef<FileWorkflow | null>(null);
  const actions = useRef<BrowserFileActions | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pickerToken = useRef<number | null>(null);
  const [state, setState] = useState<FileWorkflowSnapshot | null>(null);
  const [message, setMessage] = useState<FileMessage>(null);
  const initialized = state !== null;

  useEffect(() => {
    const current = new FileWorkflow();
    workflow.current = current;
    actions.current = new BrowserFileActions(current);
    setState(current.getSnapshot());
    return () => {
      const phase = current.getSnapshot().phase;
      if (phase.kind !== "idle") current.cancel(phase.token);
      workflow.current = null;
      actions.current = null;
    };
  }, []);

  useEffect(() => {
    const element = input.current;
    if (!element) return;
    // React 18's input props do not expose the native file-picker cancel event.
    const cancelled = () => {
      const token = pickerToken.current;
      const current = workflow.current;
      pickerToken.current = null;
      if (current && token !== null) {
        current.cancel(token);
        setState(current.getSnapshot());
      }
    };
    element.addEventListener("cancel", cancelled);
    return () => element.removeEventListener("cancel", cancelled);
  }, [initialized]);

  function showMessage(kind: "error" | "notice", text: string) {
    setMessage(current => updateFileMessage(current, { kind: "show", message: { kind, text } }));
  }

  function publish(current: FileWorkflow, outcome: WorkflowOutcome) {
    // An unmounted/StrictMode-replaced instance must not publish a late read.
    if (workflow.current !== current || outcome.kind === "ignored") return;
    setState(current.getSnapshot());
    const message = workflowMessage(outcome);
    if (message) showMessage("error", message);
    if (outcome.kind === "saved") showMessage("notice", DOWNLOAD_NOTICE);
    if (outcome.kind === "new") setMessage(null);
    if (outcome.kind === "cleared") setMessage(previous => updateFileMessage(previous, { kind: "edit" }));
    if (["opened", "saved", "new", "cleared"].includes(outcome.kind)) onAccepted();
  }

  function edit(update: (data: Registration) => Registration) {
    const current = workflow.current;
    if (current) {
      setMessage(previous => updateFileMessage(previous, { kind: "edit" }));
      publish(current, current.edit(update(current.getSnapshot().current)));
    }
  }

  function cancel(token: number) {
    const current = workflow.current;
    if (current) publish(current, current.cancel(token));
    if (pickerToken.current === token) pickerToken.current = null;
  }

  function chooseFile() {
    const current = workflow.current;
    if (!current) return;
    const phase = current.getSnapshot().phase;
    if (phase.kind !== "choose-file") return;
    pickerToken.current = phase.token;
    try {
      if (!input.current) throw new Error("File input is not mounted.");
      input.current.value = "";
      // Keep the picker call in the original user gesture, with no await/effect.
      input.current.click();
    } catch {
      cancel(phase.token);
      showMessage("error", "Kunne ikke åpne filen.");
    }
  }

  function open() {
    const current = workflow.current;
    if (!current || current.getSnapshot().phase.kind !== "idle") return;
    setMessage(null);
    publish(current, current.requestOpen());
    chooseFile();
  }

  function newRegistration() {
    const current = workflow.current;
    if (current) publish(current, current.requestNew());
  }

  function clearForm() {
    const current = workflow.current;
    if (current) publish(current, current.requestClearForm());
  }

  function clearChosen(token: number, confirmed: boolean) {
    const current = workflow.current;
    if (current) publish(current, current.chooseClearForm(token, confirmed));
  }

  function unsavedChosen(token: number, choice: "save" | "discard" | "cancel") {
    const current = workflow.current;
    if (!current) return;
    const outcome = current.chooseUnsaved(token, choice);
    publish(current, outcome);
    if (outcome.kind === "ok") chooseFile();
  }

  async function selected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const token = pickerToken.current;
    pickerToken.current = null;
    // Reset even after selection so choosing the same file fires change again.
    event.currentTarget.value = "";
    const current = workflow.current;
    const adapter = actions.current;
    if (!current || !adapter || token === null) return;
    if (!file) { cancel(token); return; }
    const reading = adapter.readSelected(token, file);
    setState(current.getSnapshot());
    publish(current, await reading);
  }

  function download() {
    const current = workflow.current;
    if (!current || current.getSnapshot().phase.kind !== "idle") return;
    publish(current, current.requestDownload());
  }

  function nameChosen(token: number, fileName: string) {
    const current = workflow.current;
    const adapter = actions.current;
    if (!current || !adapter) return;
    // Synchronous adapter call preserves the save-button user activation.
    const outcome = adapter.saveNamed(token, fileName);
    publish(current, outcome);
    // Try continuation in this same user gesture. Velg fil remains available if
    // the browser consumes activation for the download and silently blocks it.
    if (outcome.kind === "saved" && outcome.continuation === "open") chooseFile();
  }

  function validationChosen(token: number, decision: SaveValidationDecision) {
    const current = workflow.current;
    if (current) publish(current, current.chooseValidation(token, decision));
  }

  function formatChosen(token: number, choice: "continue" | "cancel") {
    const current = workflow.current;
    if (current) publish(current, current.chooseUnknownFormat(token, choice));
  }

  return {
    state, input, message, edit, open, selected, download, cancel, chooseFile,
    newRegistration, clearForm, clearChosen, unsavedChosen,
    nameChosen, validationChosen, formatChosen, dismissMessage: () => setMessage(null),
  };
}
