import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getQueryClient } from "@/app/providers";

type WorkspaceState = {
  workspaceId: string | null;

  setWorkspaceId: (id: string | null) => void;
  clearWorkspaceId: () => void;
};

function clearReactQueryCacheSafe() {
  if (typeof window === "undefined") return;

  const qc = getQueryClient();

  // stop in-flight requests, wipe cached server state, then refetch active queries
  void qc.cancelQueries();
  qc.clear();
  void qc.refetchQueries({ type: "active" });
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // keep aligned with ApiClient default localStorage key "fk_workspace_id"
      workspaceId:
        typeof window !== "undefined"
          ? window.localStorage.getItem("fk_workspace_id")
          : null,

      setWorkspaceId: (id) => {
        const prev = get().workspaceId;

        set({ workspaceId: id });

        // Only clear if it actually changed
        if (prev !== id) {
          clearReactQueryCacheSafe();
        }
      },

      clearWorkspaceId: () => {
        const prev = get().workspaceId;

        set({ workspaceId: null });

        if (prev !== null) {
          clearReactQueryCacheSafe();
        }
      },
    }),
    {
      // Storage key for this persisted store (keep as-is)
      name: "fk_workspace_id",
      storage: createJSONStorage(() => localStorage),

      // Persist only the ID. No server data in Zustand.
      partialize: (state: WorkspaceState) => ({ workspaceId: state.workspaceId }),
    },
  ),
);

// Non-hook helpers (optional usage)
export function getWorkspaceId(): string | null {
  return useWorkspaceStore.getState().workspaceId;
}

export function setWorkspaceId(id: string | null) {
  useWorkspaceStore.getState().setWorkspaceId(id);
}

export function clearWorkspaceId() {
  useWorkspaceStore.getState().clearWorkspaceId();
}