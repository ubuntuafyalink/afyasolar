import { db } from "@/lib/db"
import { afyaSolarSystemLogs } from "@/lib/db/afya-solar-schema"
import { generateId } from "@/lib/utils"

export interface AdminLogInput {
  level?: "info" | "warning" | "error" | "debug"
  category: string
  message: string
  userId?: string | null
  ipAddress?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Append a real entry to the afyasolar_system_logs table so the admin System > Logs
 * panel reflects genuine admin activity (user created, config updated, ticket opened, etc).
 * Best-effort: any failure is swallowed so logging never breaks the primary action.
 * Callers should ensure the table exists (ensureAdminTables) before invoking.
 */
export async function logAdminAction(input: AdminLogInput): Promise<void> {
  try {
    await db.insert(afyaSolarSystemLogs).values({
      id: generateId(),
      level: input.level || "info",
      category: input.category,
      message: input.message,
      userId: input.userId ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: (input.metadata ?? null) as unknown,
    })
  } catch (error) {
    console.error("[logAdminAction]", error)
  }
}
