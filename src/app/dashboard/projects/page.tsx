"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { ProjectResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FolderKanban } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("projects:write");
  const canDelete = hasPermission("projects:delete");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.projects.create({ name: formName, description: formDesc });
      setCreateOpen(false);
      setFormName("");
      setFormDesc("");
      fetchProjects();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    setError("");
    try {
      await api.projects.update(selectedProject.id, { name: editName, description: editDesc });
      setEditOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    setError("");
    try {
      await api.projects.delete(selectedProject.id);
      setDeleteOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to delete project");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your projects and applications</p>
        </div>
        {canWrite && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>Add a new project to organize your apps</DialogDescription>
              </DialogHeader>
              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
                  <Input placeholder="Project name" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
                  <Input placeholder="Brief description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="group rounded-xl border border-zinc-200 bg-white p-5 hover:border-violet-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/dashboard/projects/${project.id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 truncate hover:text-violet-700 transition-colors">{project.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{project.description || "No description"}</p>
                </Link>
                {(canWrite || canDelete) && (
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canWrite && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedProject(project); setEditName(project.name); setEditDesc(project.description); setError(""); setEditOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => { setSelectedProject(project); setError(""); setDeleteOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400">Created {formatDate(project.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>This will permanently delete &ldquo;{selectedProject?.name}&rdquo; and all its apps and credentials.</DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}