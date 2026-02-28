"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FkToaster } from "@/components/fk-toaster";
import { createFkQueryClient } from "@/lib/react-query/client";

let queryClient: ReturnType<typeof createFkQueryClient> | null = null;

function getQueryClient() {
  if (!queryClient) {
    queryClient = createFkQueryClient();
  }
  return queryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => getQueryClient());

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={120}>{children}</TooltipProvider>

      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}

      <FkToaster />
    </QueryClientProvider>
  );
}
