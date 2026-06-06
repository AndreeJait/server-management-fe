"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { ProxyStateResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeftRight, RefreshCw, AlertTriangle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "idle":
      return "bg-zinc-100 text-zinc-600";
    case "deploying":
    case "shifting":
      return "bg-amber-100 text-amber-800";
    case "rolling_back":
      return "bg-orange-100 text-orange-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    case "idle":
      return <div className="h-3.5 w-3.5 rounded-full bg-zinc-400" />;
    case "deploying":
    case "shifting":
      return <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin" />;
    case "rolling_back":
      return <RotateCcw className="h-3.5 w-3.5 text-orange-600" />;
    case "failed":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />;
    default:
      return null;
  }
}

function slotBadge(slot: string) {
  return slot === "blue"
    ? "bg-blue-100 text-blue-800"
    : "bg-green-100 text-green-800";
}

export default function ProxyPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("proxy:write");

  const [states, setStates] = useState<ProxyStateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Traffic override dialog
  const [trafficDialogApp, setTrafficDialogApp] = useState<ProxyStateResponse | null>(null);
  const [trafficPercent, setTrafficPercent] = useState(0);
  const [trafficSubmitting, setTrafficSubmitting] = useState(false);

  // Rollback dialog
  const [rollbackApp, setRollbackApp] = useState<ProxyStateResponse | null>(null);
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false);

  const fetchStates = useCallback(async () => {
    try {
      const data = await api.proxy.listStates();
      setStates(data || []);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load proxy states");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  const handleSetTraffic = async () => {
    if (!trafficDialogApp) return;
    setTrafficSubmitting(true);
    try {
      await api.proxy.setTraffic(trafficDialogApp.app_id, trafficPercent);
      setTrafficDialogApp(null);
      fetchStates();
    } catch (e: any) {
      setError(e.message || "Failed to set traffic");
    } finally {
      setTrafficSubmitting(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackApp) return;
    setRollbackSubmitting(true);
    try {
      await api.proxy.rollback(rollbackApp.app_id);
      setRollbackApp(null);
      fetchStates();
    } catch (e: any) {
      setError(e.message || "Failed to rollback");
    } finally {
      setRollbackSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Proxy Status</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Blue/green deployment routing and traffic management
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStates}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {states.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-4 text-sm text-zinc-500">
            No proxy states found. Create a binding for an app to enable blue/green routing.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {states.map((ps) => (
            <div key={ps.app_id} className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(ps.status)}
                    <h3 className="text-base font-medium text-zinc-900">
                      {ps.app_id}
                    </h3>
                    <Badge className={statusColor(ps.status)}>
                      {ps.status}
                    </Badge>
                    <Badge className={slotBadge(ps.active_slot)}>
                      active: {ps.active_slot}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {canWrite && (ps.status === "shifting" || ps.status === "deploying") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-700 border-orange-200 hover:bg-orange-50"
                        onClick={() => setRollbackApp(ps)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Rollback
                      </Button>
                    )}
                    {canWrite && ps.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTrafficPercent(ps.traffic_percent);
                          setTrafficDialogApp(ps);
                        }}
                      >
                        <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                        Set Traffic
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Blue Slot */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-blue-900">Blue Slot</span>
                      {ps.active_slot === "blue" && (
                        <Badge className="bg-blue-200 text-blue-800 text-[10px]">ACTIVE</Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Container</span>
                        <span className="font-mono text-xs text-zinc-700 truncate max-w-[200px]">
                          {ps.blue_container_id ? ps.blue_container_id.substring(0, 12) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Target</span>
                        <span className="font-mono text-xs text-zinc-700">
                          {ps.blue_target || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Green Slot */}
                  <div className="rounded-lg border border-green-100 bg-green-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-900">Green Slot</span>
                      {ps.active_slot === "green" && (
                        <Badge className="bg-green-200 text-green-800 text-[10px]">ACTIVE</Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Container</span>
                        <span className="font-mono text-xs text-zinc-700 truncate max-w-[200px]">
                          {ps.green_container_id ? ps.green_container_id.substring(0, 12) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Target</span>
                        <span className="font-mono text-xs text-zinc-700">
                          {ps.green_target || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traffic bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-zinc-600">Traffic Distribution</span>
                    <span className="text-sm font-medium text-zinc-900">
                      {ps.traffic_percent}% → {ps.active_slot === "blue" ? "green" : "blue"} (new)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-zinc-100 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${100 - ps.traffic_percent}%` }}
                    />
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${ps.traffic_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-zinc-400">
                    <span>{ps.active_slot === "blue" ? "Blue (old)" : "Green (old)"}: {100 - ps.traffic_percent}%</span>
                    <span>{ps.active_slot === "blue" ? "Green (new)" : "Blue (new)"}: {ps.traffic_percent}%</span>
                  </div>
                </div>

                {/* Health check info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                  <span>Health: {ps.health_check_path}</span>
                  <span>Interval: {ps.health_check_interval}s</span>
                  <span>Created: {new Date(ps.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Traffic Override Dialog */}
      <Dialog
        open={!!trafficDialogApp}
        onOpenChange={(open) => !open && setTrafficDialogApp(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Traffic Override</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Manually set the traffic percentage for <span className="font-mono font-medium">{trafficDialogApp?.app_id}</span>.
            This controls what percentage of traffic goes to the <strong>new</strong> slot.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Traffic to new slot (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={trafficPercent}
                onChange={(e) => setTrafficPercent(Number(e.target.value))}
                className="w-full h-2 rounded-full bg-zinc-200 appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>0% (all old)</span>
                <span className="font-medium text-violet-700 text-sm">{trafficPercent}%</span>
                <span>100% (all new)</span>
              </div>
            </div>
            <div className="flex h-3 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-zinc-400 transition-all" style={{ width: `${100 - trafficPercent}%` }} />
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${trafficPercent}%` }} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTrafficDialogApp(null)}>
              Cancel
            </Button>
            <Button onClick={handleSetTraffic} disabled={trafficSubmitting}>
              {trafficSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog
        open={!!rollbackApp}
        onOpenChange={(open) => !open && setRollbackApp(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Roll back all traffic to the <strong>{rollbackApp?.active_slot}</strong> slot for{" "}
            <span className="font-mono font-medium">{rollbackApp?.app_id}</span>? This will stop the new container
            and revert to the previous deployment.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRollbackApp(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={rollbackSubmitting}
            >
              {rollbackSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rollback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}