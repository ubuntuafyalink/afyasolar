import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Gift,
  Plug,
  Zap,
  Gauge,
  Receipt,
  Bell,
  Leaf,
  CreditCard,
  PlugZap,
  ClipboardList,
  Bot,
  MessageCircle,
  Baby,
  BarChart3,
  Satellite,
  LifeBuoy,
  Wrench,
} from "lucide-react"
import { FACILITY_V2_ENABLED } from "@/lib/dashboard/facility-features"

/** Sections available in the facility Afya Solar dashboard shell */
export type NavSection =
  | "overview"
  | "package-selection"
  | "devices"
  | "energy"
  | "energy-efficiency"
  | "bills-payment"
  | "notifications"
  | "carbon-credits"
  | "subscription"
  | "settings"
  // Additive "v2" facility sections (CEO spec Parts 715), flag-gated.
  | "today"
  | "child-services"
  | "rcs"
  | "climate-outlook"
  | "fridge"
  | "power"
  | "maintenance"
  | "reports"
  | "assistant"
  | "channels"
  | "help"

export const FACILITY_NAV_ITEMS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "package-selection", label: "Package Selection", icon: Gift },
  { id: "devices", label: "Devices", icon: Plug },
  { id: "energy", label: "Energy", icon: Zap },
  { id: "energy-efficiency", label: "Energy Efficiency", icon: Gauge },
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
  { id: "child-services", label: "Maternal & Newborn", icon: Baby },
  { id: "rcs", label: "Resilience Score", icon: BarChart3 },
  { id: "climate-outlook", label: "Climate Outlook", icon: Satellite },
  { id: "power", label: "Power", icon: PlugZap },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "reports", label: "Reports", icon: ClipboardList },
  { id: "assistant", label: "Assistant", icon: Bot },
  { id: "channels", label: "Channels", icon: MessageCircle },
  { id: "help", label: "Help", icon: LifeBuoy },
]

const ADMIN_HIDDEN_SECTIONS: NavSection[] = ["energy-efficiency"]

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

export type NavItem = { id: NavSection; label: string; icon: LucideIcon }

/** Sidebar groups: related sections clustered under a labelled heading. */
export type NavGroupId = "home" | "resilience" | "energy" | "updates" | "billing" | "support"

const GROUP_ORDER: NavGroupId[] = ["home", "resilience", "energy", "updates", "billing", "support"]

/**
 * Which sections belong to each group, in display order. Covers every visible
 * section exactly once. `devices`, `energy` (hidden) and `settings` (footer) are
 * intentionally omitted.
 */
const GROUP_MEMBERS: Record<NavGroupId, NavSection[]> = {
  home: ["overview"],
  resilience: ["child-services", "rcs", "climate-outlook"],
  energy: ["power", "maintenance", "energy-efficiency"],
  updates: ["reports", "notifications", "assistant", "channels"],
  billing: ["bills-payment", "carbon-credits", "subscription", "package-selection"],
  support: ["help"],
}

export type NavGroup = { id: NavGroupId; items: NavItem[] }

/**
 * The sidebar nav as ordered, labelled groups. Reuses getFacilityNavItems for
 * the flag/admin visibility + ordering logic, then regroups it. Hidden sections
 * (devices/energy) are skipped and empty groups are dropped, so it degrades
 * cleanly with the v2 flag off and in admin mode.
 */
export function getFacilityNavGroups(options: { adminMode: boolean }): NavGroup[] {
  const available = getFacilityNavItems(options)
  const byId = new Map<NavSection, NavItem>(available.map((item) => [item.id, item]))
  return GROUP_ORDER.map((id) => ({
    id,
    items: GROUP_MEMBERS[id]
      .map((sectionId) => byId.get(sectionId))
      .filter((item): item is NavItem => Boolean(item)),
  })).filter((group) => group.items.length > 0)
}

/** The five tabs of the optional mobile bottom navigation (spec 8.2). */
export const FACILITY_BOTTOM_NAV_ITEMS: { id: NavSection; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "power", label: "Power", icon: PlugZap },
  { id: "reports", label: "Reports", icon: ClipboardList },
]

/** AfyaLink assessment tool (facilities perform assessments there; admins view snapshots in portfolio). */
export function getAfyaLinkAssessmentUrl() {
  const url = process.env.NEXT_PUBLIC_AFYALINK_ASSESSMENT_URL?.trim()
  return url && url.length > 0 ? url : null
}
