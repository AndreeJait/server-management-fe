const API_BASE = (typeof window !== "undefined" && window.__ENV?.NEXT_PUBLIC_API_URL)
  || process.env.NEXT_PUBLIC_API_URL
  || "http://localhost:8080";

type ApiError = {
  status_code: number;
  message: string;
  error?: { code: string; details: string } | null;
};

class ApiClientError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(body.message || `API error ${status}`);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new ApiClientError(401, { status_code: 401, message: "Unauthorized" });
  }

  const body = await res.json();

  if (!res.ok) {
    throw new ApiClientError(res.status, body);
  }

  return body.data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: import("@/types").UserResponse; token: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      ),
    refresh: (userId: string) =>
      request<{ token: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),
    me: () =>
      request<import("@/types").UserResponse>("/auth/me"),
  },
  users: {
    list: () =>
      request<import("@/types").UserResponse[]>("/admin/users"),
    get: (id: number) =>
      request<import("@/types").UserResponse>(`/admin/users/${id}`),
    create: (data: import("@/types").CreateUserRequest) =>
      request<import("@/types").UserResponse>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: import("@/types").UpdateUserRequest) =>
      request<import("@/types").UserResponse>(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateRoles: (id: number, data: import("@/types").UpdateRolesRequest) =>
      request<import("@/types").UserResponse>(`/admin/users/${id}/roles`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  roles: {
    list: () =>
      request<import("@/types").RoleResponse[]>("/admin/roles"),
    updatePermissions: (
      role: string,
      data: import("@/types").UpdatePermissionsRequest,
    ) =>
      request<import("@/types").RoleResponse>(
        `/admin/roles/${encodeURIComponent(role)}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
  },
  projects: {
    list: () =>
      request<import("@/types").ProjectResponse[]>("/projects"),
    get: (id: number) =>
      request<import("@/types").ProjectResponse>(`/projects/${id}`),
    create: (data: import("@/types").CreateProjectRequest) =>
      request<import("@/types").ProjectResponse>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: import("@/types").UpdateProjectRequest) =>
      request<import("@/types").ProjectResponse>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/projects/${id}`, { method: "DELETE" }),
  },
  apps: {
    list: (projectId: number) =>
      request<import("@/types").AppResponse[]>(`/projects/${projectId}/apps`),
    get: (projectId: number, appId: number) =>
      request<import("@/types").AppResponse>(`/projects/${projectId}/apps/${appId}`),
    create: (projectId: number, data: import("@/types").CreateAppRequest) =>
      request<import("@/types").CreateAppResponse>(`/projects/${projectId}/apps`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: number, appId: number, data: import("@/types").UpdateAppRequest) =>
      request<import("@/types").AppResponse>(`/projects/${projectId}/apps/${appId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (projectId: number, appId: number) =>
      request<void>(`/projects/${projectId}/apps/${appId}`, { method: "DELETE" }),
    regenerateToken: (projectId: number, appId: number) =>
      request<import("@/types").RegenerateTokenResponse>(`/projects/${projectId}/apps/${appId}/regenerate-token`, {
        method: "POST",
      }),
  },
  registry: {
    listGlobal: () =>
      request<import("@/types").RegistryCredentialResponse[]>("/admin/registry-credentials"),
    listByProject: (projectId: number) =>
      request<import("@/types").RegistryCredentialResponse[]>(`/projects/${projectId}/registry-credentials`),
    createGlobal: (data: import("@/types").CreateRegistryCredentialRequest) =>
      request<import("@/types").RegistryCredentialResponse>("/admin/registry-credentials", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createForProject: (projectId: number, data: import("@/types").CreateRegistryCredentialRequest) =>
      request<import("@/types").RegistryCredentialResponse>(`/projects/${projectId}/registry-credentials`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: number, credId: number, data: import("@/types").UpdateRegistryCredentialRequest) =>
      request<import("@/types").RegistryCredentialResponse>(`/projects/${projectId}/registry-credentials/${credId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updateGlobal: (id: number, data: import("@/types").UpdateRegistryCredentialRequest) =>
      request<import("@/types").RegistryCredentialResponse>(`/admin/registry-credentials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteProjectCred: (projectId: number, credId: number) =>
      request<void>(`/projects/${projectId}/registry-credentials/${credId}`, { method: "DELETE" }),
    deleteGlobal: (id: number) =>
      request<void>(`/admin/registry-credentials/${id}`, { method: "DELETE" }),
  },
  deployments: {
    list: (projectId: number, appId: string) =>
      request<import("@/types").DeploymentResponse[]>(
        `/projects/${projectId}/apps/${appId}/deployments`
      ),
    get: (projectId: number, appId: string, deployId: number) =>
      request<import("@/types").DeploymentResponse>(
        `/projects/${projectId}/apps/${appId}/deployments/${deployId}`
      ),
    webhook: (data: import("@/types").WebhookDeployRequest) =>
      request<import("@/types").DeploymentResponse>("/webhook/deploy", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deploy: (projectId: number, appId: number, image?: string) =>
      request<import("@/types").DeploymentResponse>(
        `/projects/${projectId}/apps/${appId}/deploy`,
        {
          method: "POST",
          body: JSON.stringify(image ? { image } : {}),
        }
      ),
    stop: (projectId: number, appId: number) =>
      request<void>(`/projects/${projectId}/apps/${appId}/stop`, {
        method: "POST",
      }),
  },
  files: {
    list: (projectId: number, appId: string) =>
      request<import("@/types").AppFileResponse[]>(
        `/projects/${projectId}/apps/${appId}/files`
      ),
    create: (projectId: number, appId: string, data: import("@/types").CreateAppFileRequest) =>
      request<import("@/types").AppFileResponse>(
        `/projects/${projectId}/apps/${appId}/files`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
    update: (projectId: number, appId: string, fileId: number, data: import("@/types").UpdateAppFileRequest) =>
      request<import("@/types").AppFileResponse>(
        `/projects/${projectId}/apps/${appId}/files/${fileId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      ),
    delete: (projectId: number, appId: string, fileId: number) =>
      request<void>(
        `/projects/${projectId}/apps/${appId}/files/${fileId}`,
        { method: "DELETE" }
      ),
    upload: async (projectId: number, appId: string, path: string, file: File): Promise<import("@/types").AppFileResponse> => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", path);
      const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${appId}/files/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new ApiClientError(401, { status_code: 401, message: "Unauthorized" });
      }
      const body = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, body);
      return body.data as import("@/types").AppFileResponse;
    },
    download: async (projectId: number, appId: string, fileId: number): Promise<Blob> => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API_BASE}/projects/${projectId}/apps/${appId}/files/${fileId}/download`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new ApiClientError(res.status, { status_code: res.status, message: "Download failed" });
      return res.blob();
    },
  },
  folders: {
    create: (projectId: number, appId: string, path: string) =>
      request<import("@/types").AppResponse>(
        `/projects/${projectId}/apps/${appId}/folders`,
        {
          method: "POST",
          body: JSON.stringify({ path }),
        }
      ),
    delete: (projectId: number, appId: string, path: string) =>
      request<void>(
        `/projects/${projectId}/apps/${appId}/folders`,
        {
          method: "DELETE",
          body: JSON.stringify({ path }),
        }
      ),
  },
  logs: {
    get: (projectId: number, appId: string, tail?: number) =>
      request<{ logs: string }>(
        `/projects/${projectId}/apps/${appId}/logs?tail=${tail || 100}`
      ),
  },
  cloudflare: {
    listAccounts: () =>
      request<import("@/types").CloudflareAccount[]>("/cloudflare/accounts"),
    listZones: () =>
      request<import("@/types").CloudflareZone[]>("/cloudflare/zones"),
    listDNSRecords: (zoneId: string) =>
      request<import("@/types").CloudflareDNSRecord[]>(`/cloudflare/zones/${zoneId}/dns`),
    createDNSRecord: (zoneId: string, data: { type: string; name: string; content: string; ttl: number; proxied: boolean }) =>
      request<import("@/types").CloudflareDNSRecord>(`/cloudflare/zones/${zoneId}/dns`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateDNSRecord: (zoneId: string, recordId: string, data: { type: string; name: string; content: string; ttl: number; proxied: boolean }) =>
      request<import("@/types").CloudflareDNSRecord>(`/cloudflare/zones/${zoneId}/dns/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteDNSRecord: (zoneId: string, recordId: string) =>
      request<void>(`/cloudflare/zones/${zoneId}/dns/${recordId}`, { method: "DELETE" }),
    listTunnels: () =>
      request<import("@/types").CloudflareTunnel[]>("/cloudflare/tunnels"),
    getTunnelConfig: (tunnelId: string) =>
      request<import("@/types").CloudflareTunnelConfig>(`/cloudflare/tunnels/${tunnelId}/config`),
    listAccessApps: () =>
      request<import("@/types").CloudflareAccessApp[]>("/cloudflare/access-apps"),
    createAccessApp: (data: { name: string; domain: string; session_duration?: string }) =>
      request<import("@/types").CloudflareAccessApp>("/cloudflare/access-apps", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateAccessApp: (appId: string, data: { name: string; domain: string; session_duration?: string }) =>
      request<import("@/types").CloudflareAccessApp>(`/cloudflare/access-apps/${appId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteAccessApp: (appId: string) =>
      request<void>(`/cloudflare/access-apps/${appId}`, { method: "DELETE" }),
  },
  bindings: {
    create: (projectId: number, appId: string, data: import("@/types").CreateBindingRequest) =>
      request<import("@/types").AppBindingResponse>(`/projects/${projectId}/apps/${appId}/bindings`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (projectId: number, appId: string) =>
      request<import("@/types").AppBindingResponse[]>(`/projects/${projectId}/apps/${appId}/bindings`),
    get: (bindingId: number) =>
      request<import("@/types").AppBindingResponse>(`/bindings/${bindingId}`),
    delete: (bindingId: number) =>
      request<void>(`/bindings/${bindingId}`, { method: "DELETE" }),
  },
  proxy: {
    listStates: () =>
      request<import("@/types").ProxyStateResponse[]>("/proxy/state"),
    getState: (appId: string) =>
      request<import("@/types").ProxyStateResponse>(`/proxy/state/${appId}`),
    setTraffic: (appId: string, percent: number) =>
      request<import("@/types").ProxyStateResponse>(`/proxy/state/${appId}/traffic`, {
        method: "PUT",
        body: JSON.stringify({ percent }),
      }),
    rollback: (appId: string) =>
      request<import("@/types").ProxyStateResponse>(`/proxy/state/${appId}/rollback`, {
        method: "POST",
      }),
  },
  config: {
    getSettings: () =>
      request<import("@/types").SettingsGroup[]>("/config/settings"),
    getSettingsBySection: (section: string) =>
      request<import("@/types").SettingsGroup>(`/config/settings/${section}`),
    updateSettings: (settings: import("@/types").UpdateSettingInput[]) =>
      request<import("@/types").UpdateSettingsResult>("/config/settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
    getAccessStats: () =>
      request<import("@/types").DomainRequestCountResponse[]>("/config/proxy/access-stats"),
  },
};