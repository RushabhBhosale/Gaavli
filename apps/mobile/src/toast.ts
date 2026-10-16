import { create } from "zustand";

type Notice = { id: number; message: string; tone: "success" | "error" };
let nextId = 0;
export const useToastStore = create<{
  notice: Notice | null;
  show: (message: string, tone: Notice["tone"]) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  notice: null,
  show: (message, tone) => set({ notice: { id: ++nextId, message, tone } }),
  dismiss: (id) =>
    set((state) => (state.notice?.id === id ? { notice: null } : state)),
}));
export function showToast(message: string, tone: Notice["tone"]) {
  useToastStore.getState().show(message, tone);
}
