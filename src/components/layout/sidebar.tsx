"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import {
  LayoutDashboard,
  Users,
  Shield,
  LogOut,
  Server,
  FolderKanban,
  Cloud,
  Globe,
  Network,
  Lock,
  ArrowLeftRight,
  Settings,
} from "lucide-react";

type NavChild = { href: string; label: string; icon: typeof LayoutDashboard };
type NavItem = { href?: string; label: string; icon: typeof LayoutDashboard; children?: NavChild[]; permission?: string };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, permission: "projects:read" },
  {
    label: "Cloudflare",
    icon: Cloud,
    permission: "cloudflare:read",
    children: [
      { href: "/dashboard/cloudflare/zones", label: "Zones & DNS", icon: Globe },
      { href: "/dashboard/cloudflare/tunnels", label: "Tunnels", icon: Network },
      { href: "/dashboard/cloudflare/access", label: "Access Apps", icon: Lock },
    ],
  },
  {
    label: "Proxy",
    icon: ArrowLeftRight,
    permission: "proxy:read",
    children: [
      { href: "/dashboard/proxy", label: "Status", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Admin",
    icon: Shield,
    permission: "users:read",
    children: [
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
      { href: "/dashboard/admin/roles", label: "Roles", icon: Shield },
      { href: "/dashboard/admin/configuration", label: "Configuration", icon: Settings },
    ],
  },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-zinc-950 text-zinc-300">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Server className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-tight">
            Server Mgmt
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;
          return item.children ? (
            <div key={item.label} className="mb-2">
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
              {item.children.map((child) => {
                const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                      isActive
                        ? "bg-zinc-800/80 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                    )}
                  >
                    <child.icon className="h-4 w-4" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 mb-1",
                pathname === item.href || (item.href && pathname.startsWith(item.href + "/"))
                  ? "bg-zinc-800/80 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-violet-400 text-xs font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-zinc-200">
              {user?.name ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export { Sidebar };