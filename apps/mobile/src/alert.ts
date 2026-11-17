import { create } from "zustand";
import { messages } from "./i18n";
import { useAppStore } from "./store";

export type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export type AppAlertNotice = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  cancelable: boolean;
};

type AppAlertState = {
  notice: AppAlertNotice | null;
  show: (notice: AppAlertNotice) => void;
  dismiss: (id?: number) => void;
};

export const useAppAlertStore = create<AppAlertState>((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  dismiss: (id) =>
    set((state) =>
      id === undefined || state.notice?.id === id ? { notice: null } : state,
    ),
}));

let nextAlertId = 0;

export function showAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: { cancelable?: boolean },
) {
  const language = useAppStore.getState().language;
  useAppAlertStore.getState().show({
    id: ++nextAlertId,
    title,
    message,
    buttons:
      buttons && buttons.length > 0
        ? buttons
        : [{ text: messages(language).alertOk, style: "default" }],
    cancelable: options?.cancelable ?? false,
  });
}
