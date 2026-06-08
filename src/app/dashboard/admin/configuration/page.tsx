"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { SettingsGroup, UpdateSettingInput, DomainRequestCountResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Activity, Save, AlertTriangle } from "lucide-react";

// Keys that support hot-reload (no restart needed)
const HOT_RELOADABLE = new Set([
  "proxy.health_check_path",
  "proxy.shift_interval_sec",
  "proxy.rate_limit_rps",
]);

export default function ConfigurationPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("configs:write");

  const [groups, setGroups] = useState<SettingsGroup[]>([]);
  const [accessStats, setAccessStats] = useState<DomainRequestCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [restartRequired, setRestartRequired] = useState<string[]>([]);

  // Local edit state: keyed by "section.key"
  const [edits, setEdits] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const [settingsData, statsData] = await Promise.all([
        api.config.getSettings(),
        api.config.getAccessStats(),
      ]);
      setGroups(settingsData);
      setAccessStats(statsData);

      // Initialize edits from fetched values
      const initial: Record<string, string> = {};
      for (const g of settingsData) {
        for (const s of g.settings) {
          initial[`${g.section}.${s.key}`] = s.value;
        }
      }
      setEdits(initial);
    } catch {
      setError("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setError("");
    setSuccessMsg("");
    setRestartRequired([]);

    // Build updates: only send changed values
    const updates: UpdateSettingInput[] = [];
    for (const g of groups) {
      for (const s of g.settings) {
        const key = `${g.section}.${s.key}`;
        const currentVal = edits[key];
        if (currentVal !== undefined && currentVal !== s.value) {
          updates.push({ section: g.section, key: s.key, value: currentVal });
        }
      }
    }

    if (updates.length === 0) {
      setSuccessMsg("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const result = await api.config.updateSettings(updates);
      setSuccessMsg("Settings saved successfully");
      setRestartRequired(result.restart_required);
      // Refresh to get latest values
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section: string, key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [`${section}.${key}`]: value }));
    setSuccessMsg("");
    setRestartRequired([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Configuration</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage proxy and Docker settings</p>
        </div>
        {canWrite && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Restart required banner */}
      {restartRequired.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Restart required</p>
            <p className="text-sm text-amber-700 mt-1">
              The following settings require a server restart to take effect:{" "}
              <span className="font-medium">{restartRequired.join(", ")}</span>
            </p>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMsg && !restartRequired.length && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Settings groups */}
      {groups.map((group) => (
        <div key={group.section} className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-6 py-4 flex items-center gap-3">
            <Settings className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900 capitalize">
              {group.section} Settings
            </h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {group.settings.map((setting) => {
              const key = `${group.section}.${setting.key}`;
              const isHotReload = HOT_RELOADABLE.has(key);
              const currentValue = edits[key] ?? setting.value;

              return (
                <div key={setting.key} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-zinc-700">
                        {setting.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </label>
                      {isHotReload ? (
                        <Badge variant="default">Hot-reload</Badge>
                      ) : (
                        <Badge variant="secondary">Restart required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Type: {setting.type} &middot; Section: {group.section}
                    </p>
                  </div>

                  <div className="w-64">
                    {setting.type === "bool" ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={currentValue === "true"}
                          disabled={!canWrite}
                          onClick={() =>
                            handleChange(
                              group.section,
                              setting.key,
                              currentValue === "true" ? "false" : "true"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                            currentValue === "true" ? "bg-violet-600" : "bg-zinc-200"
                          } ${!canWrite ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                              currentValue === "true" ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-sm text-zinc-600">
                          {currentValue === "true" ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ) : setting.type === "int" ? (
                      <Input
                        type="number"
                        value={currentValue}
                        disabled={!canWrite}
                        onChange={(e) =>
                          handleChange(group.section, setting.key, e.target.value)
                        }
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={currentValue}
                        disabled={!canWrite}
                        onChange={(e) =>
                          handleChange(group.section, setting.key, e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Domain Access Stats */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4 flex items-center gap-3">
          <Activity className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Domain Access Stats</h2>
        </div>
        {accessStats.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-400">
            No proxy traffic recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-6 py-3 font-medium text-zinc-500">Domain</th>
                  <th className="px-6 py-3 font-medium text-zinc-500 text-right">Requests</th>
                  <th className="px-6 py-3 font-medium text-zinc-500">Last Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {accessStats.map((stat) => (
                  <tr key={stat.domain} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-3 font-medium text-zinc-900">{stat.domain}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-zinc-700">
                      {stat.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-zinc-500">
                      {stat.last_request_at
                        ? new Date(stat.last_request_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}