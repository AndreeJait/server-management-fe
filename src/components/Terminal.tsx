"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const API_BASE = (typeof window !== "undefined" && window.__ENV?.NEXT_PUBLIC_API_URL)
  || process.env.NEXT_PUBLIC_API_URL
  || "http://localhost:8080";

const SHELL_OPTIONS = [
  { value: "/bin/sh", label: "sh" },
  { value: "/bin/bash", label: "bash" },
  { value: "/bin/ash", label: "ash" },
  { value: "/bin/zsh", label: "zsh" },
];

export default function Terminal({ projectId, appId }: { projectId: number; appId: string }) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [shell, setShell] = useState("/bin/sh");
  const [connected, setConnected] = useState(false);

  const connect = useCallback((shellPath: string) => {
    if (!termRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const wsBase = API_BASE.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/projects/${projectId}/apps/${appId}/terminal?appId=${appId}&token=${token}&shell=${encodeURIComponent(shellPath)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setConnected(false);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        term.write(event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      term.writeln("\r\n\x1b[31mConnection closed.\x1b[0m");
    };

    ws.onerror = () => {
      setConnected(false);
      term.writeln("\r\n\x1b[31mConnection error.\x1b[0m");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [projectId, appId]);

  useEffect(() => {
    const cleanup = connect(shell);
    return () => {
      cleanup?.();
      wsRef.current?.close();
      xtermRef.current?.dispose();
    };
  }, [connect, shell]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-[#1e1e2e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">Terminal — {appId.slice(0, 8)}</span>
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={shell}
            onChange={(e) => setShell(e.target.value)}
            className="h-6 rounded border border-zinc-600 bg-zinc-800 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {SHELL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => connect(shell)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            Reconnect
          </button>
        </div>
      </div>
      <div ref={termRef} className="p-2" style={{ minHeight: "400px" }} />
    </div>
  );
}