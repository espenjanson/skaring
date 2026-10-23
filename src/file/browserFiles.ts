/** Browser IO only. Parsing, validation and document updates remain in FileWorkflow. */
import type { FileWorkflow, ReadOutcome, WorkflowOutcome } from "../domain/fileWorkflow";

export interface LocalFile {
  readonly name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type DownloadOutcome = "started" | "failed";

export interface DownloadPort {
  createUrl(bytes: Uint8Array): string;
  activateLink(url: string, fileName: string): void;
  releaseUrl(url: string): void;
  deferRelease(release: () => void): void;
}

const OBJECT_URL_LIFETIME_MS = 60000;

/** Read bytes locally; never use UTF-8 text readers or upload a selected file. */
export async function readLocalFile(file: LocalFile): Promise<ReadOutcome> {
  try {
    return { kind: "read", fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
  } catch {
    return { kind: "failed" };
  }
}

const browserDownloadPort: DownloadPort = {
  createUrl: bytes => URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" })),
  activateLink(url, fileName) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
    }
  },
  releaseUrl: url => URL.revokeObjectURL(url),
  // Revoking in the click handler can invalidate a download before the browser reads it.
  deferRelease: release => { setTimeout(release, OBJECT_URL_LIFETIME_MS); },
};

/** Must run synchronously in the user's save gesture; cannot confirm saving to disk. */
export function initiateDownload(
  bytes: Uint8Array,
  fileName: string,
  port: DownloadPort = browserDownloadPort,
): DownloadOutcome {
  let url: string | undefined;
  const release = () => {
    if (url !== undefined) {
      try { port.releaseUrl(url); } catch { /* Cleanup cannot change a download outcome. */ }
      url = undefined;
    }
  };
  try {
    url = port.createUrl(bytes);
    port.activateLink(url, fileName);
  } catch {
    release();
    return "failed";
  }
  try { port.deferRelease(release); } catch {
    // Keep the URL until document teardown rather than revoke a started download early.
  }
  return "started";
}

/** Thin adapter usable by React and tests; token checks prevent duplicate IO. */
export class BrowserFileActions {
  constructor(
    private readonly workflow: FileWorkflow,
    private readonly read = readLocalFile,
    private readonly download = initiateDownload,
  ) {}

  async readSelected(token: number, file: LocalFile): Promise<WorkflowOutcome> {
    const started = this.workflow.beginRead(token);
    if (started.kind !== "ok") return started;
    const phase = this.workflow.getSnapshot().phase;
    if (phase.kind !== "reading") return { kind: "ignored" };
    let result: ReadOutcome;
    try { result = await this.read(file); } catch { result = { kind: "failed" }; }
    return this.workflow.receiveRead(phase.token, result);
  }

  /** No effect-driven download: each confirmed file-name token is consumed once. */
  saveNamed(token: number, fileName: string): WorkflowOutcome {
    const named = this.workflow.chooseFileName(token, fileName);
    if (named.kind !== "ok") return named;
    const phase = this.workflow.getSnapshot().phase;
    if (phase.kind !== "download") return { kind: "ignored" };
    let outcome: DownloadOutcome;
    try { outcome = this.download(phase.bytes, phase.fileName); } catch { outcome = "failed"; }
    return this.workflow.receiveDownload(phase.token, outcome);
  }
}
