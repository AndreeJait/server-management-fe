"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const API_BASE = (typeof window !== "undefined" && window.__ENV?.NEXT_PUBLIC_API_URL)
  || process.env.NEXT_PUBLIC_API_URL
  || "http://localhost:8080";

export default function SSHTerminal({ hostId, hostName }: { hostId: number; hostName: string }) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!termRef.current) return;

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
    const wsUrl = `${wsBase}/ssh/hosts/${hostId}/terminal?hostId=${hostId}&token=${token}`;

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
      if (ws.readyState === WebSocket.OPEN) {
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          ws.send(JSON.stringify({ rows: dims.rows, cols: dims.cols }));
        }
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [hostId]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      wsRef.current?.close();
      xtermRef.current?.dispose();
    };
  }, [connect]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-[#1e1e2e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">SSH — {hostName}</span>
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
        <button
          onClick={() => connect()}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          Reconnect
        </button>
      </div>
      <div ref={termRef} className="p-2" style={{ minHeight: "400px" }} />
    </div>
  );
}