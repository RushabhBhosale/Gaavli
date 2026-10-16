"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Menu.Portal>
      <Menu.Content
        align="end"
        sideOffset={6}
        className="z-50 min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}
export function DropdownMenuItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className="cursor-pointer rounded px-3 py-2 text-sm text-slate-700 outline-none focus:bg-emerald-50"
    >
      {children}
    </Menu.Item>
  );
}
