"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { SSHHostResponse, CreateSSHHostRequest, UpdateSSHHostRequest } from "@/types";
import SSHTerminal from "@/components/SSHTerminal";
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
import {
  Plus,
  Trash2,
  Pencil,
  Terminal,
  Key,
  Lock,
  Server,
  Loader2,
  XCircle,
} from "lucide-react";

export default function SSHPage() {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission("ssh:read");
  const canWrite = hasPermission("ssh:write");
  const canConnect = hasPermission("ssh:connect");

  const [hosts, setHosts] = useState<SSHHostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<SSHHostResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "private_key">("password");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SSHHostResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Terminal state
  const [activeTerminal, setActiveTerminal] = useState<SSHHostResponse | null>(null);

  const fetchHosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.ssh.listHosts();
      setHosts(data || []);
    } catch {
      setError("Failed to load SSH hosts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) fetchHosts();
  }, [canRead, fetchHosts]);

  const openCreateDialog = () => {
    setEditingHost(null);
    setName("");
    setHost("");
    setPort("22");
    setUsername("");
    setAuthMethod("password");
    setPassword("");
    setPrivateKey("");
    setDialogError("");
    setDialogOpen(true);
  };

  const openEditDialog = (h: SSHHostResponse) => {
    setEditingHost(h);
    setName(h.name);
    setHost(h.host);
    setPort(String(h.port));
    setUsername(h.username);
    setAuthMethod(h.auth_method as "password" | "private_key");
    setPassword("");
    setPrivateKey("");
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !host.trim() || !username.trim()) {
      setDialogError("Name, host, and username are required");
      return;
    }
    if (authMethod === "password" && !editingHost && !password.trim()) {
      setDialogError("Password is required for password authentication");
      return;
    }
    if (authMethod === "private_key" && !editingHost && !privateKey.trim()) {
      setDialogError("Private key is required for key authentication");
      return;
    }

    setSaving(true);
    setDialogError("");
    try {
      const portNum = parseInt(port) || 22;
      if (editingHost) {
        const data: UpdateSSHHostRequest = {
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          auth_method: authMethod,
        };
        if (password) data.password = password;
        if (privateKey) data.private_key = privateKey;
        await api.ssh.updateHost(editingHost.id, data);
      } else {
        const data: CreateSSHHostRequest = {
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          auth_method: authMethod,
        };
        if (authMethod === "password") data.password = password;
        if (authMethod === "private_key") data.private_key = privateKey;
        await api.ssh.createHost(data);
      }
      setDialogOpen(false);
      fetchHosts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save host";
      setDialogError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.ssh.deleteHost(deleteTarget.id);
      setDeleteTarget(null);
      if (activeTerminal?.id === deleteTarget.id) setActiveTerminal(null);
      fetchHosts();
    } catch {
      // handled by API client
    } finally {
      setDeleting(false);
    }
  };

  const handleConnect = (h: SSHHostResponse) => {
    setActiveTerminal(h);
  };

  if (!canRead) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <XCircle className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">You don&apos;t have permission to view SSH hosts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">SSH Hosts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage remote server connections and open terminal sessions.</p>
        </div>
        {canWrite && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add Host
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Active Terminal */}
      {activeTerminal && canConnect && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-zinc-700">{activeTerminal.name}</span>
              <span className="text-xs text-zinc-400 font-mono">{activeTerminal.username}@{activeTerminal.host}:{activeTerminal.port}</span>
            </div>
            <button
              onClick={() => setActiveTerminal(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Close terminal
            </button>
          </div>
          <SSHTerminal hostId={activeTerminal.id} hostName={activeTerminal.name} />
        </div>
      )}

      {/* Host List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : hosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <Server className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No SSH hosts configured yet.</p>
          {canWrite && (
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-3.5 w-3.5" />Add your first host
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Host</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Address</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Auth</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {hosts.map((h) => (
                <tr key={h.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Server className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{h.name}</p>
                        <p className="text-xs text-zinc-400 font-mono">{h.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-xs font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">{h.host}:{h.port}</code>
                  </td>
                  <td className="px-5 py-3.5">
                    {h.auth_method === "password" ? (
                      <Badge variant="outline" className="text-xs font-normal gap-1">
                        <Lock className="h-3 w-3" />Password
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-normal gap-1">
                        <Key className="h-3 w-3" />Private Key
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {canConnect && (
                        <button
                          onClick={() => handleConnect(h)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                        >
                          <Terminal className="h-3.5 w-3.5" />Connect
                        </button>
                      )}
                      {canWrite && (
                        <>
                          <button onClick={() => openEditDialog(h)} className="text-zinc-400 hover:text-zinc-600 transition-colors p-1.5 rounded-md hover:bg-zinc-100" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(h)} className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingHost ? "Edit SSH Host" : "Add SSH Host"}</DialogTitle>
            <DialogDescription>
              {editingHost ? "Update the connection details for this host." : "Add a new remote server you can connect to via SSH."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Name</label>
                <Input
                  placeholder="Production Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Username</label>
                <Input
                  placeholder="root"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Host</label>
                <Input
                  placeholder="192.168.1.1 or server.example.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Port</label>
                <Input
                  type="number"
                  placeholder="22"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>

            {/* Auth Method */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-2">Authentication Method</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMethod("password")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    authMethod === "password"
                      ? "border-violet-300 bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("private_key")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    authMethod === "private_key"
                      ? "border-violet-300 bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <Key className="h-4 w-4" />
                  Private Key
                </button>
              </div>
            </div>

            {/* Conditional fields */}
            {authMethod === "password" && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Password {editingHost && <span className="text-zinc-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <Input
                  type="password"
                  placeholder={editingHost ? "••••••••" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {authMethod === "private_key" && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Private Key (PEM) {editingHost && <span className="text-zinc-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <textarea
                  className="w-full h-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder={editingHost ? "-----BEGIN OPENSSH PRIVATE KEY-----\n(leave blank to keep current)" : "-----BEGIN OPENSSH PRIVATE KEY-----\n..."}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
              </div>
            )}

            {dialogError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{dialogError}</div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : editingHost ? "Save Changes" : "Add Host"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SSH Host</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}