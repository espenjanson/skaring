"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface ArchiveMenuProps {
  busy: boolean;
  newRegistration: () => void;
  open: () => void;
  download: () => void;
  showResult: () => void;
}

/** Presents the existing registration actions without owning file workflow state. */
export function ArchiveMenu(props: ArchiveMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);

  useEffect(() => {
    if (expanded) menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [expanded]);

  function close() {
    setExpanded(false);
    trigger.current?.focus();
  }

  function run(action: () => void) {
    close();
    // File picking must remain synchronous within the original user gesture.
    action();
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      // Return to the trigger before the browser performs normal Tab navigation.
      close();
      return;
    }
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % items.length; break;
      case "ArrowUp": next = (index - 1 + items.length) % items.length; break;
      case "Home": next = 0; break;
      case "End": next = items.length - 1; break;
      default: return;
    }
    event.preventDefault();
    items[next]?.focus();
  }

  return <div className="archive-bar" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
  }}>
    <button ref={trigger} type="button" className="archive-trigger" disabled={props.busy}
      aria-haspopup="menu" aria-expanded={expanded} aria-controls="archive-menu"
      onClick={() => setExpanded(value => !value)} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setExpanded(true);
        }
      }}>Arkiv</button>
    {expanded && <div ref={menu} id="archive-menu" className="archive-menu" role="menu" aria-label="Arkiv" onKeyDown={navigate}>
      <div role="group" aria-label="Registrering">
        <button type="button" role="menuitem" tabIndex={-1} onClick={() => run(props.newRegistration)}>Ny</button>
        <button type="button" role="menuitem" tabIndex={-1} onClick={() => run(props.open)}>Åpne…</button>
        <button type="button" role="menuitem" tabIndex={-1} onClick={() => run(props.download)}>Last ned…</button>
      </div>
      <div role="separator" />
      <div role="group" aria-label="Resultat">
        <button type="button" role="menuitem" tabIndex={-1} onClick={() => run(props.showResult)}>Vis resultat</button>
      </div>
      <div role="separator" />
      <div role="group" aria-label="Dataexport">
        <button type="button" role="menuitem" tabIndex={-1} disabled>Eksporter data…</button>
      </div>
    </div>}
  </div>;
}
