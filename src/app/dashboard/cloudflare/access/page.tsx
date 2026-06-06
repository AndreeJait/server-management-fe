"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { CloudflareAccessApp } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";

const DURATION_OPTIONS = [
  { label: "30 minutes", value: "30m" },
  { label: "1 hour", value: "1h" },
  { label: "6 hours", value: "6h" },
  { label: "12 hours", value: "12h" },
  { label: "24 hours", value: "24h" },
  { label: "1 week", value: "168h" },
  { label: "1 month", value: "730h" },
];

export default function AccessAppsPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("cloudflare:write");

  const [apps, setApps] = useState<CloudflareAccessApp[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CloudflareAccessApp | null>(null);

  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formSessionDuration, setFormSessionDuration] = useState("24h");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchApps = useCallback(async () => {
    try {
      const data = await api.cloudflare.listAccessApps();
      setApps(data);
    } catch { /* handled by API client */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const resetForm = () => {
    setFormName("");
    setFormDomain("");
    setFormSessionDuration("24h");
    setError("");
  };

  const handleCreate = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.cloudflare.createAccessApp({
        name: formName,
        domain: formDomain,
        session_duration: formSessionDuration,
      });
      setCreateOpen(false);
      resetForm();
      fetchApps();
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.error?.details || "Failed to create access app");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedApp) return;
    setError("");
    setSubmitting(true);
    try {
      await api.cloudflare.updateAccessApp(selectedApp.id, {
        name: formName,
        domain: formDomain,
        session_duration: formSessionDuration,
      });
      setEditOpen(false);
      resetForm();
      fetchApps();
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.error?.details || "Failed to update access app");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await api.cloudflare.deleteAccessApp(selectedApp.id);
      setDeleteOpen(false);
      setSelectedApp(null);
      fetchApps();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to delete access app");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (app: CloudflareAccessApp) => {
    setSelectedApp(app);
    setFormName(app.name);
    setFormDomain(app.domain);
    setFormSessionDuration(app.session_duration || "24h");
    setError("");
    setEditOpen(true);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Access Applications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage Zero Trust access applications
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />
            Create App
          </Button>
        )}
      </div>

      {error && !createOpen && !editOpen && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {apps.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <Lock className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No access applications found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Session Duration</th>
                {canWrite && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-900">{app.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{app.domain}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{app.session_duration || "—"}</td>
                  {canWrite && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(app)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedApp(app); setDeleteOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Access App Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Access Application</DialogTitle>
            <DialogDescription>Create a new Zero Trust access application</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
              <Input placeholder="My Application" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Domain</label>
              <Input placeholder="app.example.com" value={formDomain} onChange={(e) => setFormDomain(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Session Duration</label>
              <select
                value={formSessionDuration}
                onChange={(e) => setFormSessionDuration(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Access App Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Access Application</DialogTitle>
            <DialogDescription>Update access application settings</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Domain</label>
              <Input value={formDomain} onChange={(e) => setFormDomain(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Session Duration</label>
              <select
                value={formSessionDuration}
                onChange={(e) => setFormSessionDuration(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedApp?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}