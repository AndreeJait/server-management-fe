"use client";

import { useAuthStore } from "@/stores/auth";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your server management platform
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm font-medium text-zinc-500">Welcome back</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {user?.name ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user?.roles?.map((role) => (
              <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>
                {role}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm font-medium text-zinc-500">Platform</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            Phase 1
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Auth & RBAC foundation
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm font-medium text-zinc-500">Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-sm font-medium text-zinc-700">Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}