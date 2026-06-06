"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { CloudflareTunnel, CloudflareTunnelConfig, TunnelIngressRule } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Network, ChevronDown, ChevronRight } from "lucide-react";

const tunnelStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "inactive": return "bg-zinc-50 text-zinc-700 border-zinc-200";
    case "degraded": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
};

export default function TunnelsPage() {
  const [tunnels, setTunnels] = useState<CloudflareTunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTunnel, setExpandedTunnel] = useState<string | null>(null);
  const [tunnelConfigs, setTunnelConfigs] = useState<Record<string, CloudflareTunnelConfig>>({});
  const [configsLoading, setConfigsLoading] = useState(false);

  const fetchTunnels = useCallback(async () => {
    try {
      const data = await api.cloudflare.listTunnels();
      setTunnels(data);
    } catch { /* handled by API client */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTunnels(); }, [fetchTunnels]);

  const handleExpand = async (tunnelId: string) => {
    if (expandedTunnel === tunnelId) {
      setExpandedTunnel(null);
      return;
    }
    setExpandedTunnel(tunnelId);

    if (!tunnelConfigs[tunnelId]) {
      setConfigsLoading(true);
      try {
        const config = await api.cloudflare.getTunnelConfig(tunnelId);
        setTunnelConfigs((prev) => ({ ...prev, [tunnelId]: config }));
      } catch { /* silently fail */ }
      finally { setConfigsLoading(false); }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          Tunnels
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          View Cloudflare tunnels and their ingress configurations
        </p>
      </div>

      {tunnels.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <Network className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No tunnels found</p>
          <p className="text-xs text-zinc-400 mt-1">Tunnels are managed through the Cloudflare dashboard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tunnels.map((tunnel) => (
            <div key={tunnel.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <button
                onClick={() => handleExpand(tunnel.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Network className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-900">{tunnel.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{tunnel.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {tunnel.conns_count !== undefined && (
                    <span className="text-xs text-zinc-500">{tunnel.conns_count} connection{tunnel.conns_count !== 1 ? "s" : ""}</span>
                  )}
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tunnelStatusColor(tunnel.status)}`}>
                    {tunnel.status}
                  </span>
                  {expandedTunnel === tunnel.id ? (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {expandedTunnel === tunnel.id && (
                <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
                  {configsLoading && !tunnelConfigs[tunnel.id] ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                    </div>
                  ) : tunnelConfigs[tunnel.id] ? (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Ingress Rules</h3>
                      {tunnelConfigs[tunnel.id].ingress.length === 0 ? (
                        <p className="text-sm text-zinc-500">No ingress rules configured</p>
                      ) : (
                        <div className="space-y-2">
                          {tunnelConfigs[tunnel.id].ingress.map((rule: TunnelIngressRule, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg bg-white border border-zinc-200 px-4 py-2.5">
                              {rule.hostname ? (
                                <>
                                  <Badge variant="secondary" className="font-mono text-xs">{rule.hostname}</Badge>
                                  <span className="text-zinc-400">→</span>
                                  <span className="text-sm font-mono text-zinc-700">{rule.service}</span>
                                </>
                              ) : (
                                <>
                                  <Badge className="font-mono text-xs">catch-all</Badge>
                                  <span className="text-zinc-400">→</span>
                                  <span className="text-sm font-mono text-zinc-700">{rule.service}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Failed to load tunnel configuration</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}