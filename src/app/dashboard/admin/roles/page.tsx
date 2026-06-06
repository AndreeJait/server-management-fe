"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { RoleResponse, Permission } from "@/types";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export default function RolesPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("users:write");
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await api.roles.list();
      setRoles(data);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    setError("");
    try {
      await api.roles.updatePermissions(selectedRole.role, {
        permissions: editPermissions,
      });
      setEditOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to update permissions");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (perm: string) => {
    setEditPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm],
    );
  };

  const toggleGroup = (group: string) => {
    const groupPerms = PERMISSION_GROUPS[group];
    const allChecked = groupPerms.every((p) => editPermissions.includes(p));
    if (allChecked) {
      setEditPermissions((prev) =>
        prev.filter((p) => !groupPerms.includes(p as Permission)),
      );
    } else {
      setEditPermissions((prev) => [
        ...new Set([...prev, ...groupPerms]),
      ]);
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
          Roles
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage role-based permissions
        </p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.role}
            className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                  <Shield className="h-4 w-4 text-violet-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 capitalize">
                    {role.role}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {role.permissions.length} permission
                    {role.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRole(role);
                  setEditPermissions([...role.permissions]);
                  setError("");
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              )}
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                  const groupPerms = perms as string[];
                  const matching = groupPerms.filter((p) =>
                    role.permissions.includes(p),
                  );
                  if (matching.length === 0) return null;
                  return (
                    <div key={group} className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-400">
                        {group}:
                      </span>
                      {matching.map((perm) => (
                        <Badge key={perm} variant="secondary">
                          {perm.split(":")[1]}
                        </Badge>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Permissions Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for{" "}
              <span className="capitalize">{selectedRole?.role}</span> role
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
              const groupPerms = perms as string[];
              const allChecked = groupPerms.every((p) =>
                editPermissions.includes(p),
              );
              return (
                <div key={group}>
                  <label className="flex items-center gap-3 mb-2">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={() => toggleGroup(group)}
                    />
                    <span className="text-sm font-semibold text-zinc-900">
                      {group}
                    </span>
                  </label>
                  <div className="ml-7 space-y-2">
                    {groupPerms.map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Checkbox
                          checked={editPermissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <span className="text-sm text-zinc-600">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={submitting}>
              {submitting ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}