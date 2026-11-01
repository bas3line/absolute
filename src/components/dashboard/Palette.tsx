"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/kit";
import { locationOf, planOf } from "./data";
import type { IconName } from "./glyphs";
import { NAV, serverHref } from "./nav";
import { useDash, useLock } from "./store";
import { Icon, MUTED, STATUS_LABEL, useNativeModal } from "./ui";

type Command = { id: string; group: string; label: string; hint: string; icon: IconName; run: () => void };

/** ⌘K. A combobox over every page, every box and a few actions. Arrow keys, Enter, Escape. */
export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ref, close, onBackdrop] = useNativeModal(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-label="Search and commands"
      onClose={close}
      onClick={onBackdrop}
      className="mx-auto mb-auto mt-[10vh] w-[min(600px,calc(100vw-24px))] border border-ink bg-paper p-0 text-ink backdrop:bg-night/45"
    >
      {open ? <Body onDone={close} /> : null}
    </dialog>
  );
}

function Body({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { state, actions } = useDash();
  const lock = useLock();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV.map((n) => ({
        id: `go:${n.href}`,
        group: "Go to",
        label: n.label,
        hint: n.hint,
        icon: n.icon,
        run: () => router.push(n.href),
      })),
      ...state.servers.map((s) => ({
        id: `box:${s.id}`,
        group: "Servers",
        label: s.id,
        hint: `${planOf(s).name} · ${locationOf(s.location).code} · ${STATUS_LABEL[s.status]}`,
        icon: "servers" as const,
        run: () => router.push(serverHref(s.id)),
      })),
      {
        id: "act:deploy",
        group: "Actions",
        label: "Deploy a new box",
        hint: "location, plan, system, pay",
        icon: "plus",
        run: () => router.push("/dashboard/deploy"),
      },
      {
        id: "act:net",
        group: "Actions",
        label: state.net === "onion" ? "Switch to clearnet" : "Switch to the onion mirror",
        hint: "same panel either way",
        icon: state.net === "onion" ? "globe" : "onion",
        run: () => actions.setNet(state.net === "onion" ? "clearnet" : "onion"),
      },
      {
        id: "act:forget",
        group: "Actions",
        label: "Forget this tab's activity",
        hint: "clears the in-memory list",
        icon: "activity",
        run: () => actions.forget(),
      },
      { id: "act:lock", group: "Actions", label: "Lock the panel", hint: "drops everything in memory", icon: "lock", run: lock },
    ],
    [router, state.servers, state.net, actions, lock],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(needle));
  }, [commands, q]);
  const current = Math.min(active, Math.max(0, shown.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current, shown.length]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onDone();
    c.run();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = shown.length;
    if (!n) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(shown[current]);
    }
  };

  const optId = (i: number) => `${listId}-o${i}`;
  let lastGroup = "";

  return (
    <div>
      <div className="flex h-12 items-center gap-3 border-b border-line px-4">
        <Icon name="search" className="text-ink-2" />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={shown.length ? optId(current) : undefined}
          aria-autocomplete="list"
          aria-label="Search pages, boxes and actions"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          placeholder="Jump to a page, a box, or do something…"
          spellCheck={false}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
        />
        <kbd className="border border-line-2 bg-bg-2 px-1.5 font-mono text-[11px] leading-[18px] text-ink-2">esc</kbd>
      </div>
      <ul ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(420px,60vh)] overflow-y-auto py-2">
        {shown.length === 0 ? (
          <li role="presentation" className={cn("px-4 py-6 text-center font-mono text-[12px]", MUTED)}>
            Nothing matches. Nothing is logged either, so try again freely.
          </li>
        ) : null}
        {shown.flatMap((c, i) => {
          const head =
            c.group !== lastGroup ? (
              <li key={`h:${c.group}`} role="presentation" className={cn("px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.14em]", MUTED)}>
                {c.group}
              </li>
            ) : null;
          lastGroup = c.group;
          const on = i === current;
          return [
            head,
            <li
              key={c.id}
              id={optId(i)}
              role="option"
              aria-selected={on}
              onMouseMove={() => setActive(i)}
              onClick={() => run(c)}
              className={cn(
                "relative mx-2 flex cursor-pointer items-center gap-3 px-3 py-2.5",
                on ? "bg-accent-soft text-accent" : "text-ink",
              )}
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[2px]", on ? "bg-accent" : "bg-transparent")} />
              <Icon name={c.icon} />
              <span className="min-w-0 flex-1 truncate text-[15px]">{c.label}</span>
              <span className={cn("hidden truncate font-mono text-[11px] sm:block", on ? "text-accent" : MUTED)}>{c.hint}</span>
            </li>,
          ];
        })}
      </ul>
      <p className={cn("flex gap-4 border-t border-line px-4 py-2.5 font-mono text-[11px]", MUTED)}>
        <span>↑↓ move</span>
        <span>↵ run</span>
        <span>esc close</span>
        <span className="ml-auto hidden sm:inline">searches stay in this tab</span>
      </p>
    </div>
  );
}
