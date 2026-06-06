"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { CloudflareZone, CloudflareDNSRecord } from "@/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Globe, ChevronRight } from "lucide-react";

const DNS_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "SRV", "NS", "CAA"];

const statusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
};

const recordTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    A: "bg-blue-50 text-blue-700",
    AAAA: "bg-blue-50 text-blue-700",
    CNAME: "bg-violet-50 text-violet-700",
    TXT: "bg-amber-50 text-amber-700",
    MX: "bg-emerald-50 text-emerald-700",
    SRV: "bg-pink-50 text-pink-700",
    NS: "bg-zinc-100 text-zinc-700",
    CAA: "bg-orange-50 text-orange-700",
  };
  return colors[type] || "bg-zinc-100 text-zinc-700";
};

export default function ZonesPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("cloudflare:write");

  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [records, setRecords] = useState<CloudflareDNSRecord[]>([]);
  const [selectedZone, setSelectedZone] = useState<CloudflareZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CloudflareDNSRecord | null>(null);

  const [formType, setFormType] = useState("A");
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTTL, setFormTTL] = useState(1);
  const [formProxied, setFormProxied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchZones = useCallback(async () => {
    try {
      const data = await api.cloudflare.listZones();
      setZones(data);
    } catch { /* handled by API client */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const fetchRecords = useCallback(async (zoneId: string) => {
    setRecordsLoading(true);
    try {
      const data = await api.cloudflare.listDNSRecords(zoneId);
      setRecords(data);
    } catch {
      setError("Failed to load DNS records");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const handleSelectZone = (zone: CloudflareZone) => {
    setSelectedZone(zone);
    setError("");
    fetchRecords(zone.id);
  };

  const resetForm = () => {
    setFormType("A");
    setFormName("");
    setFormContent("");
    setFormTTL(1);
    setFormProxied(false);
    setError("");
  };

  const handleCreate = async () => {
    if (!selectedZone) return;
    setError("");
    setSubmitting(true);
    try {
      await api.cloudflare.createDNSRecord(selectedZone.id, {
        type: formType,
        name: formName,
        content: formContent,
        ttl: formTTL,
        proxied: formProxied,
      });
      setCreateOpen(false);
      resetForm();
      fetchRecords(selectedZone.id);
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.error?.details || "Failed to create DNS record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedZone || !selectedRecord) return;
    setError("");
    setSubmitting(true);
    try {
      await api.cloudflare.updateDNSRecord(selectedZone.id, selectedRecord.id, {
        type: formType,
        name: formName,
        content: formContent,
        ttl: formTTL,
        proxied: formProxied,
      });
      setEditOpen(false);
      resetForm();
      fetchRecords(selectedZone.id);
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.error?.details || "Failed to update DNS record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedZone || !selectedRecord) return;
    setSubmitting(true);
    try {
      await api.cloudflare.deleteDNSRecord(selectedZone.id, selectedRecord.id);
      setDeleteOpen(false);
      setSelectedRecord(null);
      fetchRecords(selectedZone.id);
    } catch (err: any) {
      setError(err?.body?.message || "Failed to delete DNS record");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (record: CloudflareDNSRecord) => {
    setSelectedRecord(record);
    setFormType(record.type);
    setFormName(record.name);
    setFormContent(record.content);
    setFormTTL(record.ttl);
    setFormProxied(record.proxied);
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          Zones & DNS
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage Cloudflare DNS zones and records
        </p>
      </div>

      {error && !createOpen && !editOpen && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Zones list */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Zones</h2>
        {zones.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <Globe className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No zones found</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => handleSelectZone(zone)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors cursor-pointer ${
                  selectedZone?.id === zone.id
                    ? "border-violet-300 bg-violet-50"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900">{zone.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {zone.status && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(zone.status)}`}>
                      {zone.status}
                    </span>
                  )}
                  <ChevronRight className={`h-4 w-4 transition-colors ${selectedZone?.id === zone.id ? "text-violet-600" : "text-zinc-400"}`} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DNS Records */}
      {selectedZone && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              DNS Records — {selectedZone.name}
            </h2>
            {canWrite && (
              <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            )}
          </div>

          {recordsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">No DNS records found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">TTL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Proxied</th>
                    {canWrite && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${recordTypeBadge(record.type)}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-900 font-mono">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600 font-mono max-w-xs truncate">{record.content}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{record.ttl === 1 ? "Auto" : record.ttl}</td>
                      <td className="px-4 py-3">
                        {record.proxied ? (
                          <Badge>Proxied</Badge>
                        ) : (
                          <Badge variant="secondary">DNS only</Badge>
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedRecord(record); setDeleteOpen(true); }}>
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
        </div>
      )}

      {!selectedZone && zones.length > 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <Globe className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Select a zone above to view its DNS records</p>
        </div>
      )}

      {/* Create DNS Record Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DNS Record</DialogTitle>
            <DialogDescription>Add a new DNS record to {selectedZone?.name}</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
              <Input placeholder="subdomain.example.com" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Content</label>
              <Input placeholder="1.2.3.4 or example.com" value={formContent} onChange={(e) => setFormContent(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">TTL</label>
              <Input type="number" value={formTTL} onChange={(e) => setFormTTL(Number(e.target.value))} />
              <p className="mt-1 text-xs text-zinc-500">1 = Auto</p>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={formProxied} onCheckedChange={(v) => setFormProxied(v === true)} />
              <label className="text-sm text-zinc-700">Proxied through Cloudflare</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit DNS Record Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit DNS Record</DialogTitle>
            <DialogDescription>Update DNS record in {selectedZone?.name}</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Content</label>
              <Input value={formContent} onChange={(e) => setFormContent(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">TTL</label>
              <Input type="number" value={formTTL} onChange={(e) => setFormTTL(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={formProxied} onCheckedChange={(v) => setFormProxied(v === true)} />
              <label className="text-sm text-zinc-700">Proxied through Cloudflare</label>
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
            <DialogTitle>Delete DNS Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the {selectedRecord?.type} record for {selectedRecord?.name}? This action cannot be undone.
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