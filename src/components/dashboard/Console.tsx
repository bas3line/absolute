"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { cn } from "@/components/kit";
import { RELEASE, imageOf, locationOf, planOf, type Server } from "./data";
import { useClock, useDash, type Sample } from "./store";
import { Panel } from "./ui";

type Line = { id: number; kind: "in" | "out" | "err" | "dim"; text: string };

const HELP = [
  "a demo shell. a handful of commands, all answered from memory:",
  "  help            this list",
  "  uptime · date · hostname · whoami · id · nproc",
  "  uname -a · cat /etc/os-release",
  "  df -h · free -m · lsblk · ip a",
  '  dmesg | grep -i "memory encryption"',
  "  ls /dev/virtio-ports/",
  "  clear · exit",
];

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);
const gbOf = (s: string) => Number.parseFloat(s) || 0;
const SNP_LINE = "Memory Encryption Features active: AMD SEV SEV-ES SEV-SNP";

function respond(raw: string, box: Server, now: number, sample: Sample): { lines: string[]; err?: boolean; clear?: boolean } {
  const cmd = raw.trim().replace(/\s+/g, " ");
  const plan = planOf(box);
  const img = imageOf(box.image);
  const bb = plan.line === "blackbox";
  const bsd = img.family === "freebsd" || img.family === "openbsd";
  const up = box.startedAt ? Math.max(0, Math.floor((now - box.startedAt) / 1000)) : 0;
  const days = Math.floor(up / 86400);
  const hh = Math.floor((up % 86400) / 3600);
  const mm = String(Math.floor((up % 3600) / 60)).padStart(2, "0");
  const t = new Date(now);
  const hms = t.toTimeString().slice(0, 8);
  const load = (sample.cpu * plan.cores).toFixed(2);
  const disk = gbOf(plan.disk);
  const root = bb ? "/dev/mapper/root_crypt" : bsd ? "/dev/vtbd0p2" : "/dev/vda1";

  if (!cmd) return { lines: [] };
  if (img.family === "windows" && cmd !== "clear" && cmd !== "help")
    return { lines: [`Windows Server has no shell on this console. connect over RDP: mstsc /v:${box.ipv4}`] };
  if (cmd === "help" || cmd === "?") return { lines: HELP };
  if (cmd === "clear") return { lines: [], clear: true };
  if (cmd === "whoami") return { lines: ["root"] };
  if (cmd === "id") return { lines: ["uid=0(root) gid=0(root) groups=0(root)"] };
  if (cmd === "hostname") return { lines: [box.id] };
  if (cmd === "nproc") return { lines: [String(plan.cores)] };
  if (cmd === "pwd") return { lines: ["/root"] };
  if (cmd === "date") return { lines: [t.toUTCString().replace("GMT", "UTC")] };
  if (cmd === "uptime")
    return {
      lines: [
        ` ${hms} up ${days} day${days === 1 ? "" : "s"}, ${padL(hh, 2)}:${mm},  1 user,  load average: ${load}, ${(Number(load) * 0.92).toFixed(2)}, ${(Number(load) * 0.85).toFixed(2)}`,
      ],
    };
  if (cmd === "uname -a" || cmd === "uname")
    return {
      lines: [
        img.family === "freebsd"
          ? `FreeBSD ${box.id} ${img.version}-RELEASE amd64`
          : img.family === "openbsd"
            ? `OpenBSD ${box.id} ${img.version} GENERIC.MP#0 amd64`
            : bb
              ? `Linux ${box.id} ${RELEASE.kernel} #1 SMP PREEMPT_DYNAMIC Debian x86_64 GNU/Linux`
              : `Linux ${box.id} x86_64 GNU/Linux`,
      ],
    };
  if (cmd === "cat /etc/os-release") return { lines: [`PRETTY_NAME="${img.name} ${img.version}"`, `ID=${img.family}`] };
  if (cmd === "df -h" || cmd === "df") {
    const used = Math.round(disk * 0.18);
    return {
      lines: [
        `${pad("Filesystem", 24)}${padL("Size", 6)}${padL("Used", 6)}${padL("Avail", 7)}${padL("Use%", 5)} Mounted on`,
        `${pad(root, 24)}${padL(`${disk}G`, 6)}${padL(`${used}G`, 6)}${padL(`${disk - used}G`, 7)}${padL("18%", 5)} /`,
        ...(bb ? ["", "root_crypt is LUKS2. you typed its passphrase over SSH; the host never saw it."] : []),
      ],
    };
  }
  if (cmd === "free -m" || cmd === "free" || cmd === "free -h") {
    const total = Math.round(gbOf(plan.ram) * 1024 - 180);
    const used = Math.round(total * sample.ram);
    const cache = Math.round((total - used) * 0.3);
    return {
      lines: [
        `${pad("", 7)}${padL("total", 11)}${padL("used", 11)}${padL("free", 11)}${padL("buff/cache", 12)}`,
        `${pad("Mem:", 7)}${padL(total, 11)}${padL(used, 11)}${padL(total - used - cache, 11)}${padL(cache, 12)}`,
        ...(bb ? ["", "all of it encrypted by the CPU, under a key that never leaves the chip."] : []),
      ],
    };
  }
  if (/^dmesg( \| grep -i "?memory encryption"?)?$/i.test(cmd))
    return { lines: bb ? [SNP_LINE] : cmd === "dmesg" ? ["(a normal boot log. nothing about memory encryption: this isn't a Blackbox.)"] : [] };
  if (/^ls(\s+-\w+)?\s+\/dev\/virtio-ports\/?$/.test(cmd))
    return bb
      ? { lines: ["ls: cannot access '/dev/virtio-ports/': No such file or directory"], err: true }
      : { lines: ["org.qemu.guest_agent.0"] };
  if (cmd === "ip a" || cmd === "ip addr" || cmd === "ifconfig")
    return {
      lines: [
        "1: lo: <LOOPBACK,UP> mtu 65536",
        "    inet 127.0.0.1/8 scope host lo",
        "2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500",
        `    inet ${box.ipv4}/24 scope global eth0`,
        ...(box.ipv6 ? [`    inet6 ${box.ipv6.replace("::/64", "::1/64")} scope global`] : []),
      ],
    };
  if (cmd === "lsblk")
    return {
      lines: bb
        ? ["NAME            TYPE   SIZE  MOUNTPOINT", `sda             disk   ${disk}G`, "└─sda1          part", "  └─root_crypt  crypt         /"]
        : ["NAME    TYPE   SIZE  MOUNTPOINT", `vda     disk   ${disk}G`, "└─vda1  part          /"],
    };
  if (cmd === "exit" || cmd === "logout") return { lines: ["the console stays open. leave the page to close it."] };
  if (cmd.startsWith("sudo")) return { lines: ["you're already root."] };
  if (/^rm\s+-[a-z]*r[a-z]*f?[a-z]*\s+\/(\s|$|\*)/.test(cmd)) return { lines: ["not from here. if you mean it, use Destroy below."], err: true };
  if (cmd.startsWith("echo ")) return { lines: [cmd.slice(5).replace(/^["']|["']$/g, "")] };
  if (cmd === "whereami") {
    const l = locationOf(box.location);
    return { lines: [`${l.city}, ${l.country}. the panel knows that much.`] };
  }
  return { lines: [`${cmd.split(" ")[0]}: not in this demo. try 'help'.`], err: true };
}

export function Console({
  box,
  inputRef,
  sample,
  className,
}: {
  box: Server;
  inputRef: RefObject<HTMLInputElement | null>;
  sample: Sample;
  className?: string;
}) {
  const now = useClock();
  const { actions } = useDash();
  const online = box.status === "running";
  const locked = box.status === "locked";
  const prompt = `root@${box.id}:~#`;
  const [lines, setLines] = useState<Line[]>(() => [
    { id: 0, kind: "dim", text: `console for ${box.id}. it passes through the host: watch here, don't type secrets.` },
    { id: 1, kind: "dim", text: "transcript: off. nothing on the host records it unless you switch one on. type 'help'." },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const seq = useRef(2);
  const scroller = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cmd = value;
    setValue("");
    setCursor(null);
    if (!online) return;
    const res = respond(cmd, box, now, sample);
    if (cmd.trim()) setHistory((h) => [...h.slice(-49), cmd.trim()]);
    if (res.clear) {
      setLines([]);
      return;
    }
    const next: Line[] = [{ id: seq.current++, kind: "in", text: cmd }];
    for (const t of res.lines) next.push({ id: seq.current++, kind: res.err ? "err" : "out", text: t });
    setLines((l) => [...l, ...next].slice(-300));
    if (/virtio-ports/.test(cmd) && planOf(box).line === "blackbox") actions.note("power", `looked for a guest agent on ${box.id}. there isn't one.`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const i = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(i);
      setValue(history[i]);
    } else if (e.key === "ArrowDown" && cursor !== null) {
      e.preventDefault();
      const i = cursor + 1;
      if (i >= history.length) {
        setCursor(null);
        setValue("");
      } else {
        setCursor(i);
        setValue(history[i]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <Panel
      dark
      title={`console — ${box.id}`}
      status={online ? "connected" : locked ? "initramfs" : "offline"}
      live={online || locked}
      className={cn("flex flex-col", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <div
        ref={scroller}
        role="log"
        aria-label="Console output"
        aria-live="polite"
        className="h-0 min-h-[380px] flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-mint"
        onClick={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus();
        }}
      >
        {lines.map((l) => (
          <div
            key={l.id}
            className={cn(
              "whitespace-pre-wrap break-words",
              l.kind === "in" ? "text-white" : l.kind === "err" ? "text-[#ffb3a8]" : l.kind === "dim" ? "text-mint-pale" : "text-white/75",
            )}
          >
            {l.kind === "in" ? (
              <>
                <span className="text-mint">{prompt}</span> {l.text}
              </>
            ) : (
              l.text || " "
            )}
          </div>
        ))}
        {locked ? (
          <div className="text-lime">
            <div>{box.encrypted ? "Please unlock disk root_crypt over SSH." : "First boot: run 'encrypt' over SSH."}</div>
            <div className="text-white/75">waiting in the initramfs. verify with blackbox-verify first, then use ssh, not this console.</div>
          </div>
        ) : !online ? (
          <div className="text-[#ffb3a8]">console offline: {box.id} is {box.status}. power it on to reconnect.</div>
        ) : null}
        <form onSubmit={submit} className="flex items-center gap-2">
          <label htmlFor={inputId} className="shrink-0 text-mint">
            <span aria-hidden>{prompt}</span>
            <span className="sr-only">Command for {box.id}</span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            disabled={!online}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-white caret-marker outline-none disabled:opacity-50"
          />
        </form>
      </div>
      <p className="border-t border-night-line px-4 py-2 font-mono text-[11px] text-white/70">↑ ↓ history · ctrl-l clear · transcript off</p>
    </Panel>
  );
}
