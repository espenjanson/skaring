"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { buildDataExport, exportErrorMessage } from "../file/dataExport";
import { initiateDownload } from "../file/browserFiles";
import { DOWNLOAD_NOTICE } from "../file/fileMessages";

type ExportState =
  | { kind: "idle" }
  | { kind: "choosing" | "reading" }
  | { kind: "ready"; bytes: Uint8Array; count: number }
  | { kind: "message"; error: boolean; text: string };

/** Owns only temporary export resources; never receives the current registration. */
export function useDataExport() {
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const busy = state.kind === "choosing" || state.kind === "reading" || state.kind === "ready";

  function cancel() {
    generation.current++;
    active.current = false;
    if (input.current) input.current.value = "";
    setState({ kind: "idle" });
  }

  // Native cancel is not exposed by React 18. Refs also discard late reads after unmount.
  useEffect(() => () => { generation.current++; active.current = false; }, []);
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.setAttribute("webkitdirectory", "");
    element.addEventListener("cancel", cancel);
    return () => element.removeEventListener("cancel", cancel);
  });

  function start() {
    const element = input.current;
    if (!element || active.current) return;
    if (!("webkitdirectory" in element)) {
      setState({ kind: "message", error: true, text: "Nettleseren støtter ikke mappevalg. Bruk en oppdatert nettleser." });
      return;
    }
    element.setAttribute("webkitdirectory", "");
    element.value = "";
    active.current = true;
    generation.current++;
    setState({ kind: "choosing" });
    try { element.click(); } catch {
      active.current = false;
      setState({ kind: "message", error: true, text: "Kunne ikke åpne mappevelgeren." });
    }
  }

  async function selected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!active.current) return;
    const token = generation.current;
    setState({ kind: "reading" });
    const result = await buildDataExport(files, () => generation.current !== token);
    if (generation.current !== token) return;
    active.current = false;
    if (result.kind === "ready") setState(result);
    else if (result.kind === "error") setState({ kind: "message", error: true, text: exportErrorMessage(result.fileName, result.reason) });
    else if (result.kind === "empty") setState({ kind: "message", error: false, text: "Ingen filer direkte i den valgte mappen. Ingen eksportfil er lastet ned." });
    else setState({ kind: "idle" });
  }

  function download(name: string) {
    if (state.kind !== "ready") return;
    const outcome = initiateDownload(state.bytes, name);
    setState({ kind: "message", error: outcome === "failed", text: outcome === "started" ? DOWNLOAD_NOTICE : "Kunne ikke starte nedlastingen av eksportfilen. Prøv igjen." });
  }
  return { input, state, busy, start, selected, cancel, download };
}
