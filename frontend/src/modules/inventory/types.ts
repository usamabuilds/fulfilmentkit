import type { z } from "zod";
import type { InventoryPlaceholderSchema } from "@/modules/inventory/schemas";

export type InventoryPlaceholder = z.infer<typeof InventoryPlaceholderSchema>;