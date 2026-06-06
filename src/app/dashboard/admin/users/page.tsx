"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { UserResponse, RoleResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Users } from "lucide-react";

export default function UsersPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("users:write");
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        api.users.list(),
        api.roles.list(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch {
      // handled by API client (401 redirect)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.users.create({
        email: formEmail,
        password: formPassword,
        name: formName,
        roles: formRoles.length > 0 ? formRoles : ["viewer"],
      });
      setCreateOpen(false);
      setFormEmail("");
      setFormPassword("");
      setFormName("");
      setFormRoles([]);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.users.update(selectedUser.id, { name: editName });
      setEditNameOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.users.updateRoles(selectedUser.id, {
        roles: editRoles.length > 0 ? editRoles : ["viewer"],
      });
      setEditRolesOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to update roles");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (role: string, list: string[], setList: (v: string[]) => void) => {
    setList(
      list.includes(role) ? list.filter((r) => r !== role) : [...list, role],
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage user accounts and roles
          </p>
        </div>
        {canWrite && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>
                Add a new user account to the platform
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Name
                </label>
                <Input
                  placeholder="Full name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Initial password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Roles
                </label>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <label
                      key={r.role}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={formRoles.includes(r.role)}
                        onCheckedChange={() =>
                          toggleRole(r.role, formRoles, setFormRoles)
                        }
                      />
                      <span className="text-sm text-zinc-700">{r.role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {error && !createOpen && !editRolesOpen && !editNameOpen && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={role === "admin" ? "default" : "secondary"}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  {canWrite && (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditName(user.name);
                        setError("");
                        setEditNameOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit name</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditRoles(user.roles);
                        setError("");
                        setEditRolesOpen(true);
                      }}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit roles</span>
                    </Button>
                  </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <p className="text-sm text-zinc-500">No users found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>
              Update display name for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditNameOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateName} disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Roles Dialog */}
      <Dialog open={editRolesOpen} onOpenChange={setEditRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roles</DialogTitle>
            <DialogDescription>
              Assign roles for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              {roles.map((r) => (
                <label
                  key={r.role}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={editRoles.includes(r.role)}
                    onCheckedChange={() =>
                      toggleRole(r.role, editRoles, setEditRoles)
                    }
                  />
                  <span className="text-sm text-zinc-700">{r.role}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditRolesOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRoles} disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}