import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Gift,
  Plug,
  Zap,
  Gauge,
  CloudSun,
  Receipt,
  Bell,
  Leaf,
  CreditCard,
  Sunrise,
  Snowflake,
  PlugZap,
  ClipboardList,
  Bot,
  MessageCircle,
} from "lucide-react"
import { FACILITY_V2_ENABLED } from "@/lib/dashboard/facility-features"

/** Sections available in the facility Afya Solar dashboard shell */
export type NavSection =
  | "overview"
  | "package-selection"
  | "devices"
  | "energy"
  | "energy-efficiency"
  | "climate-resilience"
  | "bills-payment"
  | "notifications"
  | "carbon-credits"
  | "subscription"
  | "settings"
  // Additive "v2" facility sections (CEO spec Parts 7–15), flag-gated.
  | "today"
  | "fridge"
  | "power"
  | "reports"
  | "assistant"
  | "channels"

export const FACILITY_NAV_ITEMS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "package-selection", label: "Package Selection", icon: Gift },
  { id: "devices", label: "Devices", icon: Plug },
  { id: "energy", label: "Energy", icon: Zap },
  { id: "energy-efficiency", label: "Energy Efficiency", icon: Gauge },
  { id: "climate-resilience", label: "Climate Resilience", icon: CloudSun },
  { id: "bills-payment", label: "Bills & Payment", icon: Receipt },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "carbon-credits", label: "Carbon Credits", icon: Leaf },
  { id: "subscription", label: "Subscription", icon: CreditCard },
]

/**
 * New facility-facing operational sections from the CEO spec. Appended to the
 * nav only when FACILITY_V2_ENABLED so the live experience is unaffected until
 * the backlog is ready. Surfaced near the top (Today is the spec home page),
 * but the dashboard still defaults to "overview" to preserve current behavior.
 */
export const FACILITY_V2_NAV_ITEMS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: Sunrise },
  { id: "fridge", label: "Fridge", icon: Snowflake },
  { id: "power", label: "Power", icon: PlugZap },
  { id: "reports", label: "Reports", icon: ClipboardList },
  { id: "assistant", label: "Assistant", icon: Bot },
  { id: "channels", label: "Channels", icon: MessageCircle },
]

const ADMIN_HIDDEN_SECTIONS: NavSection[] = ["energy-efficiency", "climate-resilience"]

export function getFacilityNavItems(options: { adminMode: boolean }) {
  if (options.adminMode) {
    return FACILITY_NAV_ITEMS.filter((item) => !ADMIN_HIDDEN_SECTIONS.includes(item.id))
  }
  // Facility users see the new v2 sections first (Today home) when enabled.
  if (FACILITY_V2_ENABLED) {
    return [...FACILITY_V2_NAV_ITEMS, ...FACILITY_NAV_ITEMS]
  }
  return FACILITY_NAV_ITEMS
}

/** The five tabs of the optional mobile bottom navigation (spec 8.2). */
export const FACILITY_BOTTOM_NAV_ITEMS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: Sunrise },
  { id: "fridge", label: "Fridge", icon: Snowflake },
  { id: "power", label: "Power", icon: PlugZap },
  { id: "reports", label: "Reports", icon: ClipboardList },
]

/** AfyaLink assessment tool (facilities perform assessments there; admins view snapshots in portfolio). */
export function getAfyaLinkAssessmentUrl() {
  const url = process.env.NEXT_PUBLIC_AFYALINK_ASSESSMENT_URL?.trim()
  return url && url.length > 0 ? url : null
}
