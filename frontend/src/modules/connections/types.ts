import type { z } from "zod";
import type { ConnectionsPlaceholderSchema } from "@/modules/connections/schemas";

export type ConnectionsPlaceholder = z.infer<typeof ConnectionsPlaceholderSchema>;