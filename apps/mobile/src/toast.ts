import { create } from "zustand";

type Notice = {
  id: number;
  message: string;
  tone: "success" | "error";
  position: "top" | "bottom";
};
let nextId = 0;
export const useToastStore = create<{
  notice: Notice | null;
  show: (
    message: string,
    tone: Notice["tone"],
    position: Notice["position"],
  ) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  notice: null,
  show: (message, tone, position) =>
    set({ notice: { id: ++nextId, message, tone, position } }),
  dismiss: (id) =>
    set((state) => (state.notice?.id === id ? { notice: null } : state)),
}));
export function showToast(
  message: string,
  tone: Notice["tone"],
  position: Notice["position"] = "bottom",
) {
  useToastStore.getState().show(message, tone, position);
}
