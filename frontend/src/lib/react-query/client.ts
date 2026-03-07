import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client factory.
 * FulfilmentKit V1 defaults locked.
 */
export function createFkQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 30, // 30 seconds fresh
        gcTime: 1000 * 60 * 5, // 5 minutes cache
      },
      mutations: {
        retry: 0,
      },
    },
  });
}