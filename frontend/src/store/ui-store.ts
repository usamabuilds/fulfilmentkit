import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UiTheme = "light" | "dark" | "system";

type UiState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;

  theme: UiTheme;
  setTheme: (value: UiTheme) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleSidebarCollapsed: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),

      theme: "system",
      setTheme: (value) => set({ theme: value }),
    }),
    {
      name: "fk_ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state: UiState) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    },
  ),
);

export function getUiState() {
  return useUiStore.getState();
}

export function setTheme(value: UiTheme) {
  useUiStore.getState().setTheme(value);
}

export function setSidebarCollapsed(value: boolean) {
  useUiStore.getState().setSidebarCollapsed(value);
}

export function toggleSidebarCollapsed() {
  useUiStore.getState().toggleSidebarCollapsed();
}
