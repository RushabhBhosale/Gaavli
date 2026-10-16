"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Tags,
  House,
  ChartNoAxesCombined,
  Bell,
  Settings,
  Search,
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
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Listings", href: "/listings", icon: ClipboardList },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Villages", href: "/villages", icon: House },
  { name: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminDto;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    client = useQueryClient();
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
        className={`fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-gradient-to-b from-[#004e38] to-[#003e30] text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-start justify-between px-6 py-7">
          <Brand />
          <button
            className="md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation" className="space-y-1 px-3">
          {links.map(({ name, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${path === href ? "bg-emerald-600/60 text-white shadow-sm" : "text-emerald-50/80 hover:bg-white/10"}`}
            >
              <Icon size={17} />
              {name}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-6 py-5">
          <span className="flex size-9 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-100 text-sm font-bold text-emerald-900">
            {initials}
          </span>
          <div>
            <p className="text-xs font-semibold">{admin.name}</p>
            <p className="mt-1 text-[10px] text-emerald-200">Super Admin</p>
          </div>
        </div>
      </aside>
      <div className="md:ml-56">
        <header className="flex h-20 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <div className="relative hidden w-full max-w-md sm:block">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              aria-label="Search users, listings, villages (coming soon)"
              placeholder="Search users, listings, villages..."
              style={{ paddingLeft: 36 }}
              disabled
            />
          </div>
          <div className="ml-auto flex items-center gap-5">
            <Button asChild variant="ghost" size="icon">
              <Link href="/notifications" aria-label="Notifications">
                <Bell size={19} />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-md p-1">
                  <span className="flex size-9 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-white">
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
