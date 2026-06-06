"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Server } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user, token } = await api.auth.login(email, password);
      setAuth(token, user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.body?.message || err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-800/10 via-transparent to-transparent" />
        <div className="relative flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Server className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">
              Server Mgmt
            </span>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage your servers
              <br />
              <span className="text-violet-400">with confidence.</span>
            </h2>
            <p className="mt-4 text-zinc-400 text-base max-w-md">
              Deploy, monitor, and control your infrastructure from a single
              dashboard. Automated deployments, Cloudflare tunnels, and
              zero-downtime releases.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>Blue/Green Deploys</span>
            <span className="text-zinc-800">|</span>
            <span>Cloudflare Tunnels</span>
            <span className="text-zinc-800">|</span>
            <span>RBAC</span>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Server className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-zinc-900">
              Server Mgmt
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@server-management.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}