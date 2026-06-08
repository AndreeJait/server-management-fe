export type UserResponse = {
  id: number;
  email: string;
  name: string;
  roles: string[];
  created_at: string;
};

export type RoleResponse = {
  role: string;
  permissions: string[];
};

export type LoginResponse = {
  status_code: number;
  message: string;
  data: {
    user: UserResponse;
    token: string;
  };
};

export type RefreshResponse = {
  status_code: number;
  message: string;
  data: {
    token: string;
  };
};

export type BaseResponse<T = unknown> = {
  status_code: number;
  message: string;
  data: T;
  error?: { code: string; details: string } | null;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  name: string;
  roles: string[];
};

export type UpdateUserRequest = {
  name: string;
};

export type UpdateRolesRequest = {
  roles: string[];
};

export type UpdatePermissionsRequest = {
  permissions: string[];
};

export const PERMISSIONS = [
  "users:read",
  "users:write",
  "users:delete",
  "projects:read",
  "projects:write",
  "projects:delete",
  "apps:read",
  "apps:write",
  "apps:delete",
  "apps:deploy",
  "configs:read",
  "configs:write",
  "cloudflare:read",
  "cloudflare:write",
  "proxy:read",
  "proxy:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  Users: ["users:read", "users:write", "users:delete"],
  Projects: ["projects:read", "projects:write", "projects:delete"],
  Apps: ["apps:read", "apps:write", "apps:delete", "apps:deploy"],
  Configs: ["configs:read", "configs:write"],
  Cloudflare: ["cloudflare:read", "cloudflare:write"],
  Proxy: ["proxy:read", "proxy:write"],
};

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [...PERMISSIONS],
  operator: [
    "users:read",
    "projects:read", "projects:write",
    "apps:read", "apps:write", "apps:deploy",
    "configs:read", "configs:write",
    "cloudflare:read", "cloudflare:write",
    "proxy:read",
  ],
  viewer: [
    "users:read",
    "projects:read",
    "apps:read",
    "configs:read",
    "cloudflare:read",
    "proxy:read",
  ],
};

// Phase 2 types

export type ProjectResponse = {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
};

export type VolumeMount = {
  host_path: string;
  container_path: string;
  mode: string;
};

export type AppResponse = {
  id: number;
  project_id: number;
  name: string;
  framework_preset: string;
  container_port?: string;
  publish_port?: string;
  container_name?: string;
  container_count: number;
  app_id: string;
  env_vars?: Record<string, string>;
  volume_mounts?: VolumeMount[];
  post_deploy_commands?: string[];
  base_path?: string;
  default_image?: string;
  docker_host_base?: string;
  files_mount_path?: string;
  created_at: string;
};

export type UpdateAppRequest = {
  name?: string;
  framework_preset?: string;
  env_vars?: Record<string, string>;
  volume_mounts?: VolumeMount[];
  post_deploy_commands?: string[];
  base_path?: string;
  default_image?: string;
  container_port?: string;
  publish_port?: string;
  container_name?: string;
  files_mount_path?: string;
};

export type RegistryCredentialResponse = {
  id: number;
  project_id?: number | null;
  scope: string;
  registry_url: string;
  username: string;
  created_at: string;
};

export type CreateProjectRequest = {
  name: string;
  description: string;
};

export type UpdateProjectRequest = {
  name: string;
  description: string;
};

export type CreateAppRequest = {
  name: string;
  framework_preset: string;
};

export type CreateAppResponse = {
  app: AppResponse;
  deploy_token: string;
};

export type RegenerateTokenResponse = {
  app: AppResponse;
  deploy_token: string;
};

export type CreateRegistryCredentialRequest = {
  registry_url: string;
  username: string;
  password: string;
};

export type UpdateRegistryCredentialRequest = {
  registry_url: string;
  username: string;
  password: string;
};

export const FRAMEWORK_PRESETS = [
  "nextjs", "nuxt", "vue", "react", "svelte", "astro", "remix",
  "go", "python", "java", "nodejs", "rust", "dotnet",
  "laravel", "rails", "custom",
] as const;

export type FrameworkPreset = (typeof FRAMEWORK_PRESETS)[number];

// Phase 3 types

export type DeploymentStatus =
  | "pending"
  | "pulling"
  | "creating"
  | "starting"
  | "executing"
  | "running"
  | "failed"
  | "stopped";

export type DeploymentResponse = {
  id: number;
  app_id: string;
  image: string;
  status: DeploymentStatus;
  container_id?: string;
  container_name?: string;
  error?: string;
  created_at: string;
  steps?: PipelineStepResponse[];
};

export type StepStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped"
  | "executing";

export type PipelineStepResponse = {
  id: number;
  deployment_id: number;
  name: string;
  step_order: number;
  status: StepStatus;
  config?: string;
  output?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
};

export type WebhookDeployRequest = {
  app_id: string;
  deploy_token: string;
  image?: string;
};

// Phase 4b types

export type AppFileResponse = {
  id: number;
  app_id: string;
  path: string;
  content: string;
  file_type: "text" | "binary";
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
};

export type CreateAppFileRequest = {
  path: string;
  content: string;
};

export type UpdateAppFileRequest = {
  path: string;
  content: string;
};

// Phase 5 — Cloudflare

export type CloudflareAccount = {
  id: string;
  name: string;
  type?: string;
};

export type CloudflareZone = {
  id: string;
  name: string;
  status?: string;
};

export type CloudflareDNSRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
};

export type CloudflareTunnel = {
  id: string;
  name: string;
  status: string;
  type?: string;
  conns_count?: number;
};

export type TunnelIngressRule = {
  hostname?: string;
  service: string;
  path?: string;
  originRequest?: {
    noTLSVerify?: boolean;
    connectTimeout?: number;
    http2Origin?: boolean;
  };
};

export type CloudflareTunnelConfig = {
  ingress: TunnelIngressRule[];
};

export type CloudflareAccessApp = {
  id: string;
  name: string;
  domain: string;
  session_duration?: string;
};

export type AppBindingResponse = {
  id: number;
  app_id: string;
  zone_id: string;
  dns_record_id: string;
  domain: string;
  tunnel_id: string;
  created_at: string;
};

export type CreateBindingRequest = {
  app_id: string;
  zone_id: string;
  domain: string;
  tunnel_id: string;
  service: string;
};

// Phase 6 — Proxy

export type ProxyStateResponse = {
  id: number;
  app_id: string;
  active_slot: string;
  blue_container_id?: string;
  green_container_id?: string;
  blue_target?: string;
  green_target?: string;
  traffic_percent: number;
  health_check_path: string;
  health_check_interval: number;
  status: string;
  created_at: string;
};

// Phase 7 — Configuration

export type SettingResponse = {
  section: string;
  key: string;
  value: string;
  type: string;
};

export type SettingsGroup = {
  section: string;
  settings: SettingResponse[];
};

export type UpdateSettingInput = {
  section: string;
  key: string;
  value: string;
};

export type SettingApplied = {
  section: string;
  key: string;
  value: string;
  hot_reloaded: boolean;
};

export type UpdateSettingsResult = {
  applied: SettingApplied[];
  restart_required: string[];
};

export type DomainRequestCountResponse = {
  domain: string;
  count: number;
  last_request_at: string;
};