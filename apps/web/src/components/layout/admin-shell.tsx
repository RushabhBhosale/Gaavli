"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Tags,
  Store,
  Package,
  House,
  ChartNoAxesCombined,
  Bell,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { AdminDto } from "@/lib/contracts";
import { api } from "@/lib/api";
import { Brand } from "../shared/brand";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
const links = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Product Catalogue", href: "/product-catalogue", icon: Package },
  { name: "Villages", href: "/villages", icon: House },
  { name: "Listings", href: "/listings", icon: ClipboardList },
  { name: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];
// The page title lives in the top bar instead of repeating an <h1> inside every
// screen. Add an entry here when a screen is migrated.
const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "A clear view of Gaavli's village network.",
  },
  "/users": {
    title: "Users Management",
    subtitle: "Buyer, seller and coordinator accounts across every village.",
  },
  "/villages": {
    title: "Village Management",
    subtitle: "View villages, coordinators and nearby village mappings.",
  },
  "/categories": {
    title: "Categories & notify rules",
  },
  "/product-catalogue": {
    title: "Product Catalogue",
    subtitle: "Products sellers can pick when they add a listing.",
  },
  "/provider-masters": {
    title: "Master Management",
    subtitle: "Service Providers",
  },
  "/provider-types": {
    title: "Provider Type Management",
    subtitle: "Manage provider type dropdown options in Admin",
  },
  "/provider-profiles": {
    title: "Provider Profiles",
    subtitle: "Service Providers",
  },
};
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminDto;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    client = useQueryClient();
  const page = pageMeta[path];
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const initials = admin.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="min-h-dvh">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-56 flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#35546E] to-[#1E3A52] text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative flex items-start justify-between px-6 py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-12 size-44 rounded-full bg-[#B9520A]/20 blur-3xl"
          />
          <Brand />
          <button
            className="text-white hover:text-[#FCEBDD] md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav
          aria-label="Main navigation"
          className="admin-sidebar-nav min-h-0 space-y-1 overflow-y-auto px-3"
        >
          {links.map(({ name, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${path === href ? "bg-[#FEF3EA] text-[#A84E0D]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={17} />
              {name}
            </Link>
          ))}
          <p className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-[#D6E2EC]">
            Service Providers
          </p>
          <Link
            href="/provider-types"
            onClick={() => setOpen(false)}
            aria-current={path === "/provider-types" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${path === "/provider-types" ? "bg-[#FEF3EA] text-[#A84E0D]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
          >
            <Store size={17} />
            Provider Type Management
          </Link>
          <Link
            href="/provider-masters"
            onClick={() => setOpen(false)}
            aria-current={path === "/provider-masters" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${path === "/provider-masters" ? "bg-[#FEF3EA] text-[#A84E0D]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
          >
            <Tags size={17} />
            Master Management
          </Link>
          <Link
            href="/provider-profiles"
            onClick={() => setOpen(false)}
            aria-current={path === "/provider-profiles" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${path === "/provider-profiles" ? "bg-[#FEF3EA] text-[#A84E0D]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
          >
            <Store size={17} />
            Provider Profiles
          </Link>
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/20 px-6 py-5">
          <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#F3D2B8] bg-[#FEF3EA] text-sm font-bold text-[#A84E0D]">
            {initials}
          </span>
          <div>
            <p className="text-xs font-semibold text-white">{admin.name}</p>
            <p className="mt-1 text-[10px] text-[#D6E2EC]">Super Admin</p>
          </div>
        </div>
      </aside>
      <div className="md:ml-56">
        <header className="sticky top-0 z-10 flex h-20 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </Button>
          {page && (
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {page.title}
              </h1>
              {page.subtitle && (
                <p className="truncate text-xs text-slate-500">
                  {page.subtitle}
                </p>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-5">
            <Link
              href="/"
              className="hidden text-xs font-semibold text-slate-600 hover:text-[#A84E0D] sm:block"
            >
              Public site
            </Link>
            <Button asChild variant="ghost" size="icon">
              <Link href="/notifications" aria-label="Notifications">
                <Bell size={19} />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-md p-1">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#35546E] text-xs font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-bold">
                      {admin.name}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Super Admin
                    </span>
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    setError("");
                    void api("/auth/logout", { method: "POST" })
                      .then(() => {
                        client.clear();
                        window.location.assign("/login");
                      })
                      .catch((e) => setError(e.message));
                  }}
                >
                  <span className="flex items-center gap-2">
                    <LogOut size={15} />
                    Logout
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {error && (
          <p role="alert" className="bg-red-50 px-8 py-3 text-red-700">
            {error}
          </p>
        )}
        <main className="mx-auto max-w-[1600px] p-4 sm:p-8">{children}</main>
        <footer className="px-8 pb-6 text-xs text-slate-400">
          Gaavli · Growing stronger communities
        </footer>
      </div>
    </div>
  );
}
