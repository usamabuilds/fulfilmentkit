import type { z } from "zod";
import type { SettingsPlaceholderSchema } from "@/modules/settings/schemas";

export type SettingsPlaceholder = z.infer<typeof SettingsPlaceholderSchema>;