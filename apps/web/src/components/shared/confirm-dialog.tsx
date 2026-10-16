"use client";
import * as Alert from "@radix-ui/react-alert-dialog";
import { Button } from "../ui/button";
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  busy: boolean;
  error?: string;
}) {
  return (
    <Alert.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <Alert.Portal>
        <Alert.Overlay className="fixed inset-0 z-40 bg-slate-950/40" />
        <Alert.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <Alert.Title className="text-lg font-bold">{title}</Alert.Title>
          <Alert.Description className="mt-2 text-sm text-slate-500">
            This changes the user’s access to Gaavli. Their history will be
            retained.
          </Alert.Description>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Alert.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                Cancel
              </Button>
            </Alert.Cancel>
            <Button variant="destructive" disabled={busy} onClick={onConfirm}>
              {busy ? "Updating…" : "Confirm"}
            </Button>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
