"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { AppResponse, DeploymentResponse, PipelineStepResponse, DeploymentStatus, StepStatus, VolumeMount, AppFileResponse, AppBindingResponse, CloudflareZone, CloudflareTunnel, ProxyStateResponse } from "@/types";
import Terminal from "@/components/Terminal";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
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
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Box,
  Key,
  History,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  SkipForward,
  Settings,
  Plus,
  Trash2,
  Save,
  FileText,
  Pencil,
  X,
  ScrollText,
  FolderOpen,
  Link2,
  ArrowLeftRight,
  RotateCcw,
  Rocket,
  Square,
  Trash2 as Trash2Icon,
} from "lucide-react";

const DEPLOYMENT_STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-600", icon: Clock },
  pulling: { label: "Pulling Image", color: "bg-blue-50 text-blue-700", icon: Loader2 },
  creating: { label: "Creating Container", color: "bg-blue-50 text-blue-700", icon: Loader2 },
  starting: { label: "Starting", color: "bg-amber-50 text-amber-700", icon: Loader2 },
  executing: { label: "Executing", color: "bg-amber-50 text-amber-700", icon: Loader2 },
  running: { label: "Running", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-50 text-red-700", icon: XCircle },
  stopped: { label: "Stopped", color: "bg-zinc-100 text-zinc-500", icon: AlertCircle },
};

const STEP_STATUS_CONFIG: Record<StepStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "text-zinc-400", icon: Clock },
  running: { label: "Running", color: "text-blue-600", icon: Loader2 },
  executing: { label: "Executing", color: "text-amber-600", icon: Loader2 },
  done: { label: "Done", color: "text-emerald-600", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-600", icon: XCircle },
  skipped: { label: "Skipped", color: "text-zinc-400", icon: SkipForward },
};

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const config = DEPLOYMENT_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
      <Icon className={`h-3 w-3 ${status === "pulling" || status === "creating" || status === "starting" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

function StepIndicator({ step }: { step: PipelineStepResponse }) {
  const config = STEP_STATUS_CONFIG[step.status];
  const Icon = config.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Icon className={`h-4 w-4 ${config.color} ${step.status === "running" ? "animate-spin" : ""}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-900">
            {step.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        {step.error && (
          <p className="mt-1 text-xs text-red-600 break-all">{step.error}</p>
        )}
        {step.output && (
          <pre className="mt-2 rounded-lg bg-zinc-950 text-zinc-300 p-3 text-xs overflow-x-auto overflow-y-auto max-h-40 font-mono">{step.output}</pre>
        )}
        {step.started_at && (
          <p className="mt-1 text-xs text-zinc-400">
            {new Date(step.started_at).toLocaleTimeString()}
            {step.finished_at && ` → ${new Date(step.finished_at).toLocaleTimeString()}`}
          </p>
        )}
      </div>
    </div>
  );
}

function WebhookPanel({ app, projectId, appId }: { app: AppResponse; projectId: number; appId: number }) {
  const { hasPermission } = useAuthStore();
  const canDeploy = hasPermission("apps:deploy");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = `curl -X POST ${window.location.protocol === "https:" ? "https" : "http"}://${window.location.hostname}:8080/webhook/deploy \\
  -H "Content-Type: application/json" \\
  -d '{
    "app_id": "${app.app_id}",
    "deploy_token": "YOUR_DEPLOY_TOKEN",
    "image": "ghcr.io/org/${app.name}:latest"
  }'`;

  const githubAction = `name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via webhook
        run: |
          curl -X POST \${WEBHOOK_URL} \\
            -H "Content-Type: application/json" \\
            -d '{"app_id":"${app.app_id}","deploy_token":"\${DEPLOY_TOKEN}","image":"ghcr.io/org/${app.name}:\${GITHUB_SHA}"}'
        env:
          WEBHOOK_URL: \${{ secrets.WEBHOOK_URL }}
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Webhook Configuration</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Use the following details to configure your CI/CD pipeline to trigger deployments.
        </p>
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium text-zinc-500 uppercase mb-1">Endpoint</dt>
            <dd className="flex items-center gap-2">
              <code className="text-sm text-zinc-900 bg-zinc-100 px-2 py-1 rounded font-mono">
                POST /webhook/deploy
              </code>
              <button onClick={() => copy("/webhook/deploy", "endpoint")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                {copied === "endpoint" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 uppercase mb-1">App ID</dt>
            <dd className="flex items-center gap-2">
              <code className="text-sm text-zinc-900 bg-zinc-100 px-2 py-1 rounded font-mono break-all">
                {app.app_id}
              </code>
              <button onClick={() => copy(app.app_id, "appid")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                {copied === "appid" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 uppercase mb-1">Deploy Token</dt>
            <dd>
              {canDeploy ? (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  The deploy token is only shown once when created or regenerated. Store it securely in your CI secrets.
                </p>
              ) : (
                <p className="text-xs text-zinc-400">You need apps:deploy permission to manage deploy tokens.</p>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">cURL Example</h2>
          <button onClick={() => copy(curlExample, "curl")} className="text-zinc-400 hover:text-zinc-600 transition-colors text-xs flex items-center gap-1">
            {copied === "curl" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied === "curl" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-zinc-950 text-zinc-300 p-4 text-xs overflow-x-auto font-mono leading-relaxed">
          {curlExample}
        </pre>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">GitHub Actions Example</h2>
          <button onClick={() => copy(githubAction, "gha")} className="text-zinc-400 hover:text-zinc-600 transition-colors text-xs flex items-center gap-1">
            {copied === "gha" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied === "gha" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-zinc-950 text-zinc-300 p-4 text-xs overflow-x-auto font-mono leading-relaxed">
          {githubAction}
        </pre>
      </div>
    </div>
  );
}

function DeploymentsPanel({ app, projectId, appId }: { app: AppResponse; projectId: number; appId: number }) {
  const [deployments, setDeployments] = useState<DeploymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const data = await api.deployments.list(projectId, String(appId));
      setDeployments(data || []);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, [projectId, appId]);

  useEffect(() => {
    fetchDeployments();
    pollRef.current = setInterval(fetchDeployments, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchDeployments]);

  const hasActive = deployments.some(
    (d) => d.status === "pending" || d.status === "pulling" || d.status === "creating" || d.status === "starting" || d.status === "executing"
  );

  useEffect(() => {
    if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    } else if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchDeployments, 5000);
    }
  }, [hasActive, fetchDeployments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <History className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-500">No deployments yet. Trigger one via the webhook endpoint.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deployments.map((d) => (
        <div key={d.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <StatusBadge status={d.status} />
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-900 font-mono">{d.image}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Deploy #{d.id} &middot; {new Date(d.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-zinc-400 transition-transform ${expanded === d.id ? "rotate-90" : ""}`} />
          </button>

          {expanded === d.id && (
            <div className="border-t border-zinc-100 px-5 py-4">
              {d.error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 break-all">
                  {d.error}
                </div>
              )}

              {d.container_name && (
                <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span>Container: <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono">{d.container_name}</code></span>
                  {d.container_id && (
                    <span>ID: <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono">{d.container_id.slice(0, 12)}</code></span>
                  )}
                </div>
              )}

              {d.steps && d.steps.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-3">Pipeline Steps</h3>
                  <div className="space-y-3">
                    {d.steps
                      .sort((a, b) => a.step_order - b.step_order)
                      .map((step) => (
                        <StepIndicator key={step.id} step={step} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsPanel({ app, projectId, appId, onSaved }: { app: AppResponse; projectId: number; appId: number; onSaved: () => void }) {
  const [envVars, setEnvVars] = useState<Record<string, string>>(app.env_vars || {});
  const [volumeMounts, setVolumeMounts] = useState<VolumeMount[]>(app.volume_mounts || []);
  const [commands, setCommands] = useState<string[]>(app.post_deploy_commands || []);
  const [defaultImage, setDefaultImage] = useState(app.default_image || "");
  const [containerPort, setContainerPort] = useState(app.container_port || "");
  const [publishPort, setPublishPort] = useState(app.publish_port || "");
  const [containerName, setContainerName] = useState(app.container_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.apps.update(projectId, appId, {
        name: app.name,
        framework_preset: app.framework_preset,
        env_vars: envVars,
        volume_mounts: volumeMounts,
        post_deploy_commands: commands,
        default_image: defaultImage,
        container_port: containerPort,
        publish_port: publishPort,
        container_name: containerName,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Env vars handlers
  const addEnvVar = () => setEnvVars((prev) => ({ ...prev, "": "" }));
  const removeEnvVar = (key: string) => {
    const next = { ...envVars };
    delete next[key];
    setEnvVars(next);
  };
  const updateEnvVarKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(envVars)) {
      next[k === oldKey ? newKey : k] = v;
    }
    setEnvVars(next);
  };
  const updateEnvVarValue = (key: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [key]: value }));
  };

  // Volume mount handlers
  const addMount = () => setVolumeMounts((prev) => [...prev, { host_path: "", container_path: "", mode: "rw" }]);
  const removeMount = (index: number) => setVolumeMounts((prev) => prev.filter((_, i) => i !== index));
  const updateMount = (index: number, field: keyof VolumeMount, value: string) => {
    setVolumeMounts((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  // Command handlers
  const addCommand = () => setCommands((prev) => [...prev, ""]);
  const removeCommand = (index: number) => setCommands((prev) => prev.filter((_, i) => i !== index));
  const updateCommand = (index: number, value: string) => {
    setCommands((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Default Image */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Default Image</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Set a default container image for this app. When deploying via webhook or the Deploy button, this image will be used if none is specified.
        </p>
        <input
          className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="e.g., ghcr.io/org/app:latest"
          value={defaultImage}
          onChange={(e) => setDefaultImage(e.target.value)}
        />
      </div>

      {/* Port & Container Name */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Port & Container Name</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Configure the container port and whether it's published to the host. Leave publish port empty to not expose it on the host (recommended when using tunnel bindings).
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Container Port</label>
            <input
              className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., 3000"
              value={containerPort}
              onChange={(e) => setContainerPort(e.target.value)}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Port inside the container. Empty = framework default.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Publish Port</label>
            <input
              className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., 8080"
              value={publishPort}
              onChange={(e) => setPublishPort(e.target.value)}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Host port to map. Empty = not published.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Container Name</label>
            <input
              className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., cafe-fe"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Docker container name. Used for proxy routing and networking.</p>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Environment Variables</h2>
          <Button variant="outline" size="sm" onClick={addEnvVar}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        {Object.keys(envVars).length === 0 ? (
          <p className="text-sm text-zinc-400">No environment variables configured.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="KEY"
                  value={key}
                  onChange={(e) => updateEnvVarKey(key, e.target.value)}
                />
                <span className="text-zinc-400">=</span>
                <input
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="value"
                  value={value}
                  onChange={(e) => updateEnvVarValue(key, e.target.value)}
                />
                <button onClick={() => removeEnvVar(key)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume Mounts */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Volume Mounts</h2>
          <Button variant="outline" size="sm" onClick={addMount}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        {volumeMounts.length === 0 ? (
          <p className="text-sm text-zinc-400">No volume mounts configured.</p>
        ) : (
          <div className="space-y-2">
            {volumeMounts.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="/host/path"
                  value={m.host_path}
                  onChange={(e) => updateMount(i, "host_path", e.target.value)}
                />
                <span className="text-zinc-400">:</span>
                <input
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="/container/path"
                  value={m.container_path}
                  onChange={(e) => updateMount(i, "container_path", e.target.value)}
                />
                <select
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={m.mode}
                  onChange={(e) => updateMount(i, "mode", e.target.value)}
                >
                  <option value="rw">rw</option>
                  <option value="ro">ro</option>
                </select>
                <button onClick={() => removeMount(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post-Deploy Commands */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Post-Deploy Commands</h2>
          <Button variant="outline" size="sm" onClick={addCommand}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Commands run inside the container after it starts and passes health checks. For Laravel apps, the default commands (migrate, config:cache, etc.) are already included.</p>
        {commands.length === 0 ? (
          <p className="text-sm text-zinc-400">No custom post-deploy commands.</p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., php artisan db:seed --force"
                  value={cmd}
                  onChange={(e) => updateCommand(i, e.target.value)}
                />
                <button onClick={() => removeCommand(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

const FILE_LANGUAGES: { label: string; value: string }[] = [
  { label: "Plain Text", value: "plaintext" },
  { label: "YAML", value: "yaml" },
  { label: "JSON", value: "json" },
  { label: "Nginx", value: "nginx" },
  { label: "Shell", value: "shell" },
  { label: "Dockerfile", value: "dockerfile" },
  { label: "XML", value: "xml" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Go", value: "go" },
  { label: "INI", value: "ini" },
  { label: "SQL", value: "sql" },
  { label: "Markdown", value: "markdown" },
];

function guessLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    yml: "yaml", yaml: "yaml",
    json: "json", jsonc: "json",
    conf: "nginx", nginx: "nginx",
    sh: "shell", bash: "shell",
    dockerfile: "dockerfile",
    xml: "xml", svg: "xml",
    html: "html", htm: "html",
    css: "css",
    js: "javascript", mjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python",
    go: "go",
    ini: "ini", cfg: "ini", env: "ini",
    sql: "sql",
    md: "markdown",
    toml: "ini",
    txt: "plaintext",
  };
  // Also check filename patterns
  if (path.includes("nginx") || path.includes("Nginx")) return "nginx";
  if (path.endsWith("Dockerfile")) return "dockerfile";
  if (path.endsWith(".env") || path.endsWith(".env.local")) return "ini";
  return map[ext] || "plaintext";
}

function FilesPanel({ app, projectId, appId, onAppUpdated }: { app: AppResponse; projectId: number; appId: number; onAppUpdated: () => void }) {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("apps:write");
  const [files, setFiles] = useState<AppFileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AppFileResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AppFileResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Folder state
  const [newFolderPath, setNewFolderPath] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteFolderPath, setDeleteFolderPath] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Derive folders from volume mounts that match the base_path pattern
  const basePath = app.base_path || "/home/user/docker";
  const appBasePrefix = `${basePath}/${app.app_id}/`;
  const folders = (app.volume_mounts || []).filter(
    (m) => m.host_path.startsWith(appBasePrefix)
  );

  const fetchFiles = useCallback(async () => {
    try {
      const data = await api.files.list(projectId, String(appId));
      setFiles(data || []);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, [projectId, appId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleCreate = () => {
    setCreating(true);
    setEditing(null);
    setPath("");
    setContent("");
    setLanguage("plaintext");
    setError("");
  };

  const handleEdit = (file: AppFileResponse) => {
    setEditing(file);
    setCreating(false);
    setPath(file.path);
    setContent(file.content);
    setLanguage(guessLanguage(file.path));
    setError("");
  };

  const handleCancel = () => {
    setCreating(false);
    setEditing(null);
    setPath("");
    setContent("");
    setLanguage("plaintext");
    setError("");
  };

  const handlePathChange = (newPath: string) => {
    setPath(newPath);
    setLanguage(guessLanguage(newPath));
  };

  const handleSave = async () => {
    if (!path.trim()) {
      setError("Path is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.files.update(projectId, String(appId), editing.id, { path: path.trim(), content });
      } else {
        await api.files.create(projectId, String(appId), { path: path.trim(), content });
      }
      setCreating(false);
      setEditing(null);
      setPath("");
      setContent("");
      setLanguage("plaintext");
      fetchFiles();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.files.delete(projectId, String(appId), deleteTarget.id);
      setDeleteTarget(null);
      fetchFiles();
    } catch {
      // handled by API client
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderPath.trim()) return;
    setCreatingFolder(true);
    setError("");
    try {
      await api.folders.create(projectId, String(appId), newFolderPath.trim());
      setNewFolderPath("");
      onAppUpdated();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderPath) return;
    setDeletingFolder(true);
    setError("");
    try {
      await api.folders.delete(projectId, String(appId), deleteFolderPath);
      setDeleteFolderPath(null);
      onAppUpdated();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to delete folder");
    } finally {
      setDeletingFolder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  const isEditing = creating || editing !== null;
  const hostBase = `${basePath}/${app.app_id}/files`;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Folders Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Folders</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Create directories on the host that are automatically mounted into your container. Folders are persisted at <code className="text-zinc-700 bg-zinc-100 px-1 rounded">{basePath}/{app.app_id}/</code>.
        </p>
        {canWrite && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex">
              <span className="inline-flex items-center h-9 px-3 rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-50 text-xs text-zinc-500 font-mono whitespace-nowrap">
                {basePath}/{app.app_id}/
              </span>
              <input
                className="flex-1 h-9 rounded-r-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="data/uploads"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleCreateFolder} disabled={creatingFolder || !newFolderPath.trim()}>
              <Plus className="h-3.5 w-3.5" />
              {creatingFolder ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        )}
        {folders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 py-6 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">No folders mounted yet. Create a folder to persist data.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((m, i) => {
              const relativePath = m.host_path.replace(appBasePrefix, "");
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3 hover:bg-zinc-50/50 transition-colors">
                  <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-zinc-900 truncate">{relativePath}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Host: {m.host_path} &rarr; Container: {m.container_path} ({m.mode})
                    </p>
                  </div>
                  {canWrite && (
                    <button onClick={() => setDeleteFolderPath(relativePath)} className="text-zinc-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Files Section */}
      {isEditing ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">{editing ? "Edit File" : "Add File"}</h2>
            <button onClick={handleCancel} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase mb-1.5">Container Path</label>
              <input
                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="/etc/nginx/nginx.conf"
                value={path}
                onChange={(e) => handlePathChange(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-400">
                The path where this file will appear inside the container.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-500 uppercase">Content</label>
                <select
                  className="h-7 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {FILE_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <MonacoEditor
                  height="400px"
                  language={language}
                  theme="vs-dark"
                  value={content}
                  onChange={(value) => setContent(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 8 },
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
            {path.trim() && (
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-500 space-y-1">
                <p><span className="font-medium text-zinc-700">Host path:</span> {hostBase}{path.startsWith("/") ? path : "/" + path}</p>
                <p><span className="font-medium text-zinc-700">Container path:</span> {path.startsWith("/") ? path : "/" + path}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !path.trim()}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save File"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Files</h2>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5" />Add File
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Manage configuration files that will be written to the host and mounted into your container during deployment.
          </p>
          {files.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">No files yet. Add a file to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3 hover:bg-zinc-50/50 transition-colors">
                  <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-zinc-900 truncate">{f.path}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Host: {hostBase}{f.path.startsWith("/") ? f.path : "/" + f.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canWrite && (
                      <>
                        <button onClick={() => handleEdit(f)} className="text-zinc-400 hover:text-zinc-600 transition-colors p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(f)} className="text-zinc-400 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete File Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <code className="text-zinc-700 font-mono">{deleteTarget?.path}</code>? This file will be removed from the next deployment.
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

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={deleteFolderPath !== null} onOpenChange={() => setDeleteFolderPath(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the folder <code className="text-zinc-700 font-mono">{deleteFolderPath}</code>? The directory and its volume mount will be removed. This will affect the next deployment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteFolderPath(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFolder} disabled={deletingFolder}>
              {deletingFolder ? "Deleting..." : "Delete Folder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProxyPanel({ appId }: { appId: string }) {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("proxy:write");

  const [state, setState] = useState<ProxyStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trafficPercent, setTrafficPercent] = useState(0);
  const [trafficSubmitting, setTrafficSubmitting] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const data = await api.proxy.getState(appId);
      setState(data);
      setTrafficPercent(data.traffic_percent);
      setError("");
    } catch (e: any) {
      if (e.status === 404) {
        setState(null);
        setError("");
      } else {
        setError(e.message || "Failed to load proxy state");
      }
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleSetTraffic = async () => {
    setTrafficSubmitting(true);
    try {
      await api.proxy.setTraffic(appId, trafficPercent);
      fetchState();
    } catch (e: any) {
      setError(e.message || "Failed to set traffic");
    } finally {
      setTrafficSubmitting(false);
    }
  };

  const handleRollback = async () => {
    setRollbackSubmitting(true);
    try {
      await api.proxy.rollback(appId);
      setRollbackOpen(false);
      fetchState();
    } catch (e: any) {
      setError(e.message || "Failed to rollback");
    } finally {
      setRollbackSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center">
        <ArrowLeftRight className="mx-auto h-10 w-10 text-zinc-300" />
        <p className="mt-4 text-sm text-zinc-500">
          No proxy state for this app. Create a binding to enable blue/green routing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Status header */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={state.status === "active" ? "bg-emerald-100 text-emerald-800" : state.status === "idle" ? "bg-zinc-100 text-zinc-600" : state.status === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
              {state.status}
            </Badge>
            <Badge className={state.active_slot === "blue" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
              active: {state.active_slot}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (state.status === "shifting" || state.status === "deploying") && (
              <Button variant="outline" size="sm" className="text-orange-700 border-orange-200 hover:bg-orange-50" onClick={() => setRollbackOpen(true)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Rollback
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Blue/Green slots */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-blue-900">Blue Slot</span>
            {state.active_slot === "blue" && <Badge className="bg-blue-200 text-blue-800 text-[10px]">ACTIVE</Badge>}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Container</span>
              <span className="font-mono text-xs text-zinc-700">{state.blue_container_id ? state.blue_container_id.substring(0, 12) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Target</span>
              <span className="font-mono text-xs text-zinc-700">{state.blue_target || "—"}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-900">Green Slot</span>
            {state.active_slot === "green" && <Badge className="bg-green-200 text-green-800 text-[10px]">ACTIVE</Badge>}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Container</span>
              <span className="font-mono text-xs text-zinc-700">{state.green_container_id ? state.green_container_id.substring(0, 12) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Target</span>
              <span className="font-mono text-xs text-zinc-700">{state.green_target || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic distribution */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-900">Traffic Distribution</h3>
          <span className="text-sm text-zinc-600">
            {state.traffic_percent}% → {state.active_slot === "blue" ? "green" : "blue"} (new)
          </span>
        </div>
        <div className="h-3 rounded-full bg-zinc-100 overflow-hidden flex">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${100 - state.traffic_percent}%` }} />
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${state.traffic_percent}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-zinc-400">
          <span>{state.active_slot === "blue" ? "Blue (old)" : "Green (old)"}: {100 - state.traffic_percent}%</span>
          <span>{state.active_slot === "blue" ? "Green (new)" : "Blue (new)"}: {state.traffic_percent}%</span>
        </div>

        {canWrite && state.status === "active" && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <label className="block text-sm font-medium text-zinc-700 mb-2">Manual Traffic Override</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={trafficPercent}
                onChange={(e) => setTrafficPercent(Number(e.target.value))}
                className="flex-1 h-2 rounded-full bg-zinc-200 appearance-none cursor-pointer accent-violet-600"
              />
              <span className="text-sm font-medium text-violet-700 w-12 text-right">{trafficPercent}%</span>
              <Button size="sm" onClick={handleSetTraffic} disabled={trafficSubmitting}>
                {trafficSubmitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Health check info */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-400 flex items-center gap-4">
        <span>Health: {state.health_check_path}</span>
        <span>Interval: {state.health_check_interval}s</span>
        <span>Created: {new Date(state.created_at).toLocaleString()}</span>
      </div>

      {/* Rollback Dialog */}
      <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Roll back all traffic to the {state.active_slot} slot? This will stop the new container and revert to the previous deployment.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRollbackOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRollback} disabled={rollbackSubmitting}>
              {rollbackSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rollback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BindingsPanel({ app, projectId, appId, onAppUpdated }: { app: AppResponse; projectId: number; appId: string; onAppUpdated: () => void }) {
  const { hasPermission } = useAuthStore();
  const canWrite = hasPermission("apps:write");

  const [bindings, setBindings] = useState<AppBindingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [tunnels, setTunnels] = useState<CloudflareTunnel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedBinding, setSelectedBinding] = useState<AppBindingResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formZoneId, setFormZoneId] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formTunnelId, setFormTunnelId] = useState("");
  const [formService, setFormService] = useState("");

  const fetchBindings = useCallback(async () => {
    try {
      const data = await api.bindings.list(projectId, appId);
      setBindings(data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [projectId, appId]);

  useEffect(() => { fetchBindings(); }, [fetchBindings]);

  const fetchCloudflareData = useCallback(async () => {
    try {
      const [zonesData, tunnelsData] = await Promise.all([
        api.cloudflare.listZones(),
        api.cloudflare.listTunnels(),
      ]);
      setZones(zonesData);
      setTunnels(tunnelsData);
    } catch { /* silently fail */ }
  }, []);

  const resetForm = () => {
    setFormZoneId("");
    setFormDomain("");
    setFormTunnelId("");
    setFormService("");
    setError("");
  };

  const handleCreate = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.bindings.create(projectId, appId, {
        app_id: appId,
        zone_id: formZoneId,
        domain: formDomain,
        tunnel_id: formTunnelId,
        service: formService,
      });
      setCreateOpen(false);
      resetForm();
      fetchBindings();
    } catch (err: any) {
      setError(err?.body?.message || err?.body?.error?.details || "Failed to create binding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBinding) return;
    setSubmitting(true);
    try {
      await api.bindings.delete(selectedBinding.id);
      setDeleteOpen(false);
      setSelectedBinding(null);
      fetchBindings();
    } catch (err: any) {
      setError(err?.body?.message || "Failed to delete binding");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Domain Bindings</h2>
          <p className="text-xs text-zinc-500 mt-1">Link this app to Cloudflare DNS records and tunnel ingress rules</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => { resetForm(); fetchCloudflareData(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Binding
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {bindings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <Link2 className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No domain bindings yet</p>
          <p className="text-xs text-zinc-400 mt-1">Bind a subdomain to this app via a Cloudflare tunnel</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tunnel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Created</th>
                {canWrite && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bindings.map((binding) => (
                <tr key={binding.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-zinc-900">{binding.domain}</td>
                  <td className="px-6 py-4 text-sm font-mono text-zinc-600">{binding.tunnel_id}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{binding.zone_id}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{new Date(binding.created_at).toLocaleDateString()}</td>
                  {canWrite && (
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedBinding(binding); setError(""); setDeleteOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Binding Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Domain Binding</DialogTitle>
            <DialogDescription>Bind a subdomain to this app via a Cloudflare tunnel</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Zone</label>
              <select
                value={formZoneId}
                onChange={(e) => setFormZoneId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select a zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Domain</label>
              <Input placeholder="app.example.com" value={formDomain} onChange={(e) => setFormDomain(e.target.value)} />
              <p className="mt-1 text-xs text-zinc-500">The subdomain that will route to this app</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Tunnel</label>
              <select
                value={formTunnelId}
                onChange={(e) => setFormTunnelId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select a tunnel</option>
                {tunnels.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.id.slice(0, 8)}...)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Service URL</label>
              <Input placeholder="http://localhost:8080" value={formService} onChange={(e) => setFormService(e.target.value)} />
              <p className="mt-1 text-xs text-zinc-500">
                The tunnel routes to the server management backend by default, which proxies to containers. Override only for custom targets.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting || !formZoneId || !formDomain || !formTunnelId}>
                {submitting ? "Creating..." : "Create Binding"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Binding</DialogTitle>
            <DialogDescription>
              This will remove the DNS record and tunnel ingress rule for &quot;{selectedBinding?.domain}&quot;. This action cannot be undone.
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

function LogsPanel({ app, projectId, appId }: { app: AppResponse; projectId: number; appId: number }) {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tail, setTail] = useState(100);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.logs.get(projectId, String(appId), tail);
      setLogs(data?.logs || "");
    } catch {
      setError("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [projectId, appId, tail]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Container Logs</h2>
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
            >
              <option value={50}>Last 50 lines</option>
              <option value={100}>Last 100 lines</option>
              <option value={500}>Last 500 lines</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
        {!logs ? (
          <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">No running container found. Deploy first to see logs.</p>
          </div>
        ) : (
          <pre className="rounded-lg bg-zinc-950 text-zinc-300 p-4 text-xs font-mono overflow-auto max-h-[600px] leading-relaxed">
            {logs}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const appId = Number(params.appId);
  const { hasPermission } = useAuthStore();
  const canDeploy = hasPermission("apps:deploy");

  const [app, setApp] = useState<AppResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "webhook" | "deployments" | "settings" | "files" | "logs" | "terminal" | "bindings" | "proxy">("overview");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");

  // Stop container dialog state
  const [stopOpen, setStopOpen] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Delete app dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Regenerate token dialog state
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const fetchApp = useCallback(async () => {
    try {
      const data = await api.apps.get(projectId, appId);
      setApp(data);
    } catch {
      // handled by API client
    } finally {
      setLoading(false);
    }
  }, [projectId, appId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleRegenerateToken = async () => {
    setRegenerating(true);
    try {
      const result = await api.apps.regenerateToken(projectId, appId);
      setNewToken(result.deploy_token);
      fetchApp();
    } catch {
      // handled by API client
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key || "default");
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDeploy = async () => {
    if (!app) return;
    setDeploying(true);
    setDeployError("");
    try {
      await api.deployments.deploy(projectId, appId, app.default_image || undefined);
      setTab("deployments");
    } catch (err: any) {
      setDeployError(err?.body?.message || "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  };

  const handleStop = async () => {
    if (!app) return;
    setStopping(true);
    try {
      await api.deployments.stop(projectId, appId);
      setStopOpen(false);
      fetchApp();
    } catch (err: any) {
      alert(err?.body?.message || "Failed to stop container");
    } finally {
      setStopping(false);
    }
  };

  const handleDelete = async () => {
    if (!app) return;
    setDeleting(true);
    try {
      await api.apps.delete(projectId, appId);
      router.push(`/dashboard/projects/${projectId}`);
    } catch (err: any) {
      alert(err?.body?.message || "Failed to delete app");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!app) return <p className="text-sm text-zinc-500">App not found</p>;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/projects/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">{app.name}</h1>
            <Badge variant="secondary">{app.framework_preset}</Badge>
          </div>
          {canDeploy && (
            <Button onClick={handleDeploy} disabled={deploying || !app.default_image}>
              <Rocket className="h-4 w-4" />
              {deploying ? "Deploying..." : "Deploy"}
            </Button>
          )}
          {canDeploy && app.container_count > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStopOpen(true)} className="text-amber-700 border-amber-200 hover:bg-amber-50">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          {hasPermission("apps:write") && (
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
        {deployError && (
          <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{deployError}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "overview" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <Box className="inline h-4 w-4 mr-1.5 -mt-0.5" />Overview
        </button>
        <button
          onClick={() => setTab("webhook")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "webhook" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <Key className="inline h-4 w-4 mr-1.5 -mt-0.5" />Webhook
        </button>
        <button
          onClick={() => setTab("deployments")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "deployments" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <History className="inline h-4 w-4 mr-1.5 -mt-0.5" />Deployments
        </button>
        {hasPermission("apps:write") && (
          <button
            onClick={() => setTab("settings")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "settings" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            <Settings className="inline h-4 w-4 mr-1.5 -mt-0.5" />Settings
          </button>
        )}
        <button
          onClick={() => setTab("files")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "files" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <FileText className="inline h-4 w-4 mr-1.5 -mt-0.5" />Files
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "logs" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <ScrollText className="inline h-4 w-4 mr-1.5 -mt-0.5" />Logs
        </button>
        <button
          onClick={() => setTab("bindings")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "bindings" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <Link2 className="inline h-4 w-4 mr-1.5 -mt-0.5" />Bindings
        </button>
        <button
          onClick={() => setTab("proxy")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "proxy" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          <ArrowLeftRight className="inline h-4 w-4 mr-1.5 -mt-0.5" />Proxy
        </button>
        {canDeploy && (
          <button
            onClick={() => setTab("terminal")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === "terminal" ? "text-violet-700 border-b-2 border-violet-600" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            <svg className="inline h-4 w-4 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            Terminal
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">App Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-zinc-500 uppercase">App ID</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="text-sm text-zinc-900 bg-zinc-100 px-2 py-1 rounded font-mono">{app.app_id}</code>
                  <button onClick={() => copyToClipboard(app.app_id, "appid")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    {copied === "appid" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 uppercase">Framework</dt>
                <dd className="mt-1"><Badge variant="secondary">{app.framework_preset}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500 uppercase">Container Count</dt>
                <dd className="mt-1 text-sm text-zinc-900">{app.container_count}</dd>
              </div>
              {app.default_image && (
                <div>
                  <dt className="text-xs font-medium text-zinc-500 uppercase">Default Image</dt>
                  <dd className="mt-1 text-sm text-zinc-900 font-mono bg-zinc-100 px-2 py-1 rounded inline-block">{app.default_image}</dd>
                </div>
              )}
              {app.container_port && (
                <div>
                  <dt className="text-xs font-medium text-zinc-500 uppercase">Container Port</dt>
                  <dd className="mt-1 text-sm text-zinc-900 font-mono bg-zinc-100 px-2 py-1 rounded inline-block">{app.container_port}</dd>
                </div>
              )}
              {app.publish_port && (
                <div>
                  <dt className="text-xs font-medium text-zinc-500 uppercase">Publish Port</dt>
                  <dd className="mt-1 text-sm text-zinc-900 font-mono bg-zinc-100 px-2 py-1 rounded inline-block">{app.publish_port}</dd>
                </div>
              )}
              {app.container_name && (
                <div>
                  <dt className="text-xs font-medium text-zinc-500 uppercase">Container Name</dt>
                  <dd className="mt-1 text-sm text-zinc-900 font-mono bg-zinc-100 px-2 py-1 rounded inline-block">{app.container_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-zinc-500 uppercase">Created</dt>
                <dd className="mt-1 text-sm text-zinc-900">{formatDate(app.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900">Deploy Token</h2>
              {canDeploy && (
                <Button variant="outline" size="sm" onClick={() => { setNewToken(null); setRegenerateOpen(true); }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Use this token to authenticate deployment webhooks. Keep it secret.
            </p>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
              <p className="text-xs text-zinc-600">
                The deploy token is only shown once when regenerated. Click Regenerate to create a new token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Tab */}
      {tab === "webhook" && <WebhookPanel app={app} projectId={projectId} appId={appId} />}

      {/* Deployments Tab */}
      {tab === "deployments" && <DeploymentsPanel app={app} projectId={projectId} appId={appId} />}

      {/* Settings Tab */}
      {tab === "settings" && hasPermission("apps:write") && (
        <SettingsPanel app={app} projectId={projectId} appId={appId} onSaved={fetchApp} />
      )}

      {/* Files Tab */}
      {tab === "files" && (
        <FilesPanel app={app} projectId={projectId} appId={appId} onAppUpdated={fetchApp} />
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <LogsPanel app={app} projectId={projectId} appId={appId} />
      )}

      {/* Terminal Tab */}
      {tab === "terminal" && canDeploy && (
        <Terminal projectId={projectId} appId={app.app_id} />
      )}

      {tab === "bindings" && (
        <BindingsPanel app={app} projectId={projectId} appId={app.app_id} onAppUpdated={fetchApp} />
      )}

      {tab === "proxy" && (
        <ProxyPanel appId={app.app_id} />
      )}

      {/* Regenerate Token Confirmation Dialog */}
      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newToken ? "Deploy Token Regenerated" : "Regenerate Deploy Token"}</DialogTitle>
            <DialogDescription>
              {newToken
                ? "Copy the new token now. You won't be able to see it again."
                : "This will invalidate the current deploy token. Any CI/CD pipelines using the old token will need to be updated."}
            </DialogDescription>
          </DialogHeader>
          {newToken ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm text-emerald-400 font-mono break-all">{newToken}</code>
                  <button
                    onClick={() => copyToClipboard(newToken, "token")}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    {copied === "token" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "token" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Make sure to copy the token now. It will not be shown again.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setRegenerateOpen(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRegenerateOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRegenerateToken} disabled={regenerating}>
                {regenerating ? "Regenerating..." : "Regenerate Token"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stop Container Confirmation Dialog */}
      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Container</DialogTitle>
            <DialogDescription>
              This will stop and remove the running container for <strong>{app?.name}</strong>. Any in-flight requests will be dropped. You can redeploy afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setStopOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleStop} disabled={stopping}>
              {stopping ? "Stopping..." : "Stop Container"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete App Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{app?.name}</strong> and all associated resources: containers, deployments, files, bindings, and proxy state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete App"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}