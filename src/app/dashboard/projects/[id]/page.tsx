"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { ProjectResponse, AppResponse, RegistryCredentialResponse } from "@/types";
import { FRAMEWORK_PRESETS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, RefreshCw, ArrowLeft, Key, Box, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("projects:write");
  const canDelete = hasPermission("projects:delete");

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [apps, setApps] = useState<AppResponse[]>([]);
  const [creds, setCreds] = useState<RegistryCredentialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"apps" | "credentials">("apps");

  // App dialog state
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [editAppOpen, setEditAppOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppResponse | null>(null);
  const [appName, setAppName] = useState("");
  const [appPreset, setAppPreset] = useState("custom");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Token dialog state
  const [newToken, setNewToken] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Credential dialog state
  const [createCredOpen, setCreateCredOpen] = useState(false);
  const [credUrl, setCredUrl] = useState("");
  const [credUser, setCredUser] = useState("");
  const [credPass, setCredPass] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [p, a, c] = await Promise.all([
        api.projects.get(projectId),
        api.apps.list(projectId),
        api.registry.listByProject(projectId),
      ]);
      setProject(p);
      setApps(a);
      setCreds(c);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateApp = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await api.apps.create(projectId, { name: appName, framework_preset: appPreset });
      setCreateAppOpen(false);
      setAppName("");
      setAppPreset("custom");
      setNewToken(result.deploy_token);
      setTokenDialogOpen(true);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to create app");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateApp = async () => {
    if (!selectedApp) return;
    setSubmitting(true);
    setError("");
    try {
      await api.apps.update(projectId, selectedApp.id, { name: appName, framework_preset: appPreset });
      setEditAppOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to update app");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteApp = async (appId: number) => {
    try {
      await api.apps.delete(projectId, appId);
      fetchData();
    } catch {}
  };

  const handleRegenerateToken = async (appId: number) => {
    try {
      await api.apps.regenerateToken(projectId, appId);
      fetchData();
    } catch {}
  };

  const handleCreateCred = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.registry.createForProject(projectId, { registry_url: credUrl, username: credUser, password: credPass });
      setCreateCredOpen(false);
      setCredUrl("");
      setCredUser("");
      setCredPass("");
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to create credential");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCred = async (credId: number) => {
    try {
      await api.registry.deleteProjectCred(projectId, credId);
      fetchData();
    } catch {}
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!project) return <p className="text-sm text-zinc-500">Project not found</p>;

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard/projects")} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />Back to Projects
        </button>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">{project.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{project.description || "No description"}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        <button onClick={() => setTab("apps")} className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "apps" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}>
          <Box className="inline h-4 w-4 mr-1.5 -mt-0.5" />Apps
        </button>
        <button onClick={() => setTab("credentials")} className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "credentials" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}>
          <Key className="inline h-4 w-4 mr-1.5 -mt-0.5" />Registry Credentials
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Apps Tab */}
      {tab === "apps" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">{apps.length} app{apps.length !== 1 ? "s" : ""}</p>
            {canWrite && (
              <Button size="sm" onClick={() => { setAppName(""); setAppPreset("custom"); setError(""); setCreateAppOpen(true); }}>
                <Plus className="h-4 w-4" />Add App
              </Button>
            )}
          </div>

          {apps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <Box className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-500">No apps yet. Add one to this project.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">App</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Framework</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">App ID</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {apps.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/projects/${projectId}/apps/${a.id}`} className="text-sm font-medium text-zinc-900 hover:text-violet-700 transition-colors">{a.name}</Link>
                      </td>
                      <td className="px-6 py-4"><Badge variant="secondary">{a.framework_preset}</Badge></td>
                      <td className="px-6 py-4"><code className="text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{a.app_id.slice(0, 8)}...</code></td>
                      <td className="px-6 py-4 text-right">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedApp(a); setAppName(a.name); setAppPreset(a.framework_preset); setError(""); setEditAppOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRegenerateToken(a.id)} title="Regenerate deploy token">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteApp(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create App Dialog */}
          <Dialog open={createAppOpen} onOpenChange={setCreateAppOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add App</DialogTitle>
                <DialogDescription>Add a new application to this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
                  <Input placeholder="App name" value={appName} onChange={(e) => setAppName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Framework Preset</label>
                  <select className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" value={appPreset} onChange={(e) => setAppPreset(e.target.value)}>
                    {FRAMEWORK_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setCreateAppOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateApp} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit App Dialog */}
          <Dialog open={editAppOpen} onOpenChange={setEditAppOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit App</DialogTitle>
                <DialogDescription>Update app details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
                  <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Framework Preset</label>
                  <select className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" value={appPreset} onChange={(e) => setAppPreset(e.target.value)}>
                    {FRAMEWORK_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditAppOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateApp} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Deploy Token Dialog */}
          <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deploy Token Created</DialogTitle>
                <DialogDescription>Copy this token now. It will not be shown again.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <code className="block break-all text-sm text-zinc-800 font-mono">{newToken}</code>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(newToken)}
                >
                  {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Token"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Credentials Tab */}
      {tab === "credentials" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">{creds.length} credential{creds.length !== 1 ? "s" : ""}</p>
            {canWrite && (
              <Button size="sm" onClick={() => { setCredUrl(""); setCredUser(""); setCredPass(""); setError(""); setCreateCredOpen(true); }}>
                <Plus className="h-4 w-4" />Add Credential
              </Button>
            )}
          </div>

          {creds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <Key className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-500">No registry credentials configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {creds.map((c) => (
                <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{c.registry_url}</p>
                    <p className="text-xs text-zinc-500">Username: {c.username}</p>
                  </div>
                  {canDelete && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteCred(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create Credential Dialog */}
          <Dialog open={createCredOpen} onOpenChange={setCreateCredOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Registry Credential</DialogTitle>
                <DialogDescription>Add credentials for a container registry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Registry URL</label>
                  <Input placeholder="ghcr.io" value={credUrl} onChange={(e) => setCredUrl(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Username</label>
                  <Input placeholder="Username" value={credUser} onChange={(e) => setCredUser(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password / Token</label>
                  <Input type="password" placeholder="Access token or password" value={credPass} onChange={(e) => setCredPass(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setCreateCredOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCred} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}