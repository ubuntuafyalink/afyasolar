"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Building2,
  Users,
  Zap,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Search,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  Eye,
  Edit,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  Package,
  RefreshCcw,
  Plus,
  Wrench,
  Stethoscope,
  ClipboardCheck,
  CalendarCheck,
  Home,
  ChevronDown,
  ChevronUp,
  Sun,
  Sparkles,
  Gift,
  MapPin,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  AlertCircle,
  Bell,
  Battery,
  Wifi,
  WifiOff,
  Thermometer,
  Leaf,
  FileText,
  Receipt,
  Monitor,
  TrendingDown,
  Settings,
  Clock as ClockIcon,
  Trash2,
  SlidersHorizontal,
  Baby,
  Bot,
  MessageCircle,
  LifeBuoy,
  Gauge,
  ClipboardList,
  Satellite,
  PlugZap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
// Resilience Intelligence (additive, simulated data) — consolidated into hubs
import { FacilityPreferencesProvider } from "@/components/dashboard/facility/facility-preferences-provider"
import { FacilityToolbar } from "@/components/dashboard/facility/facility-toolbar"
import { MotionSection } from "@/components/motion/primitives"
// Facility-mirror section components (portfolio-level)
import { AdminChildServicesRollup } from "@/components/admin/intelligence/admin-child-services-rollup"
import { AdminFacilitiesRcsTable } from "@/components/admin/intelligence/admin-facilities-rcs-table"
import { AdminClimateOutlook } from "@/components/admin/intelligence/admin-climate-outlook"
import { AdminNotificationsCenter } from "@/components/admin/notifications/admin-notifications-center"
import { AdminReportCenter } from "@/components/admin/reports/admin-report-center"
import { AdminAssistant } from "@/components/admin/admin-assistant"
import { AdminChannels } from "@/components/admin/admin-channels"
import { AdminHelp } from "@/components/admin/admin-help"
import { AdminFacilities } from "@/components/admin/admin-facilities"
import { AdminOverview } from "@/components/admin/admin-overview"
import { useDeviceRequests, useUpdateDeviceRequest } from "@/hooks/use-device-requests"
import { LogoutButton } from "@/components/logout-button"
import { UserManagement } from "@/components/dashboard/user-management"
import { TechnicianManagement } from "@/components/dashboard/technician-management"
import { AdminPower } from "@/components/admin/intelligence/admin-power"
import AdminSolarCarbonCredits from "@/components/solar/admin-solar-carbon-credits"
import { AdminCarbonCredits } from "@/components/afya-solar/admin-carbon-credits"
import { InternalSystemTools } from "@/components/admin/internal-system-tools"
import { AdminEnergyEfficiency } from "@/components/admin/intelligence/admin-energy-efficiency"
import { AdminPortfolioSolarBilling } from "@/components/afya-solar/admin-portfolio-solar-billing"
import { useFacilities } from "@/hooks/use-facilities"
import type { Facility } from "@/types"
import { InviteFacilityDialog } from "@/components/dashboard/invite-facility-dialog"
import { BulkInviteFacilitiesDialog } from "@/components/dashboard/bulk-invite-facilities-dialog"
import { DeleteFacilityDialog } from "@/components/dashboard/delete-facility-dialog"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import AfyaSolarPackageManagement from '@/components/afya-solar/package-management'
import AfyaSolarSubscribersManagement from '@/components/afya-solar/subscribers-management'
import { useNotificationCount } from "@/hooks/use-notification-count"
import { FacilityDetailsDialog } from "@/components/dashboard/facility-details-dialog"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatCardSkeleton, DashboardSkeleton, CardListSkeleton } from "@/components/ui/skeleton"

type AdminTransactionStats = {
  total: number
  completed: number
  failed: number
  pending: number
  totalAmount: number
}

// Admin sections mirror the facility manager dashboard 1:1 (portfolio-level),
// plus a small "Manage" group for admin-only essentials. Existing section ids are
// reused where a render block already exists; new ids cover the new mirrors.
type SectionId =
  // Home
  | 'overview'
  // Resilience
  | 'maternal-newborn'
  | 'resilience-score'
  | 'climate-outlook'
  // Energy
  | 'solar-live-monitoring' // "Power"
  | 'afya-solar-portfolio-assessments' // "Energy Efficiency"
  // Updates
  | 'reports'
  | 'notifications'
  | 'assistant'
  | 'channels'
  // Billing
  | 'afya-solar-portfolio-billing' // "Bills & Payment"
  | 'solar-carbon-credits' // "Carbon Credits"
  | 'afya-solar-subscribers' // "Subscription"
  | 'afya-solar-packages' // "Packages"
  // Support
  | 'help'
  // Manage (admin-only essentials)
  | 'facilities'
  | 'users'
  | 'technicians'
  | 'payments'
  | 'devices'
  | 'device-requests'
  | 'afya-solar-dashboard'
  | 'afya-solar-services'
  | 'afya-solar-packages'
  | 'afya-solar-subscribers'
  | 'afya-solar-invoice-requests'
  | 'afya-solar-meters'
  | 'afya-solar-reports'
  | 'solar-live-monitoring'
  | 'solar-analytics'
  | 'solar-alerts'
  | 'solar-maintenance'
  | 'solar-performance'
  | 'solar-energy-reports'
  | 'solar-carbon-credits'
  | 'afya-solar-portfolio-assessments'
  | 'afya-solar-portfolio-billing'
  | 'transactions'
  | 'payment-transactions'
  | 'feature-requests'
  | 'referrals'
  | 'bulk-sms'
  | 'internal-tools'
  | 'notifications'
  // Resilience Intelligence (additive, simulated data) — consolidated hubs
  | 'intel-portfolio'
  | 'intel-risk'
  | 'intel-adaptation'
  | 'intel-methodology'

type AdminDashboardProps = {
  initialSection?: SectionId
}

// Grouped navigation structure
type NavGroup = 'general' | 'afya-solar' | 'intelligence'

const navGroups: Record<
  NavGroup,
  {
    label: string
    icon: React.ElementType
    items: { id: SectionId; label: string; icon: React.ElementType }[]
  }
> = {
  'general': {
    label: 'General',
    icon: Home,
    items: [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'facilities', label: 'Facilities', icon: Building2 },
      { id: 'service-visibility', label: 'Service Visibility', icon: Eye },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'technicians', label: 'Technicians', icon: Wrench },
      { id: 'internal-tools', label: 'System tools', icon: SlidersHorizontal },
      { id: 'payment-transactions', label: 'Payment Transactions', icon: CreditCard },
      { id: 'transactions', label: 'Withdrawals', icon: DollarSign },
      { id: 'feature-requests', label: 'Feature Requests', icon: Sparkles },
      { id: 'referrals', label: 'Referrals', icon: Gift },
      { id: 'bulk-sms', label: 'Bulk SMS', icon: Phone },
      { id: 'afya-solar-invoice-requests', label: 'Invoice Requests', icon: Receipt },
      { id: 'notifications', label: 'Notification Center', icon: Bell },
    ],
  },
  'afya-solar': {
    label: 'Afya Solar',
    icon: Sun,
    items: [
      { id: 'afya-solar-dashboard', label: 'Dashboard Overview', icon: BarChart3 },
      { id: 'afya-solar-packages', label: 'Package Management', icon: Package },
      { id: 'afya-solar-subscribers', label: 'Subscribers', icon: UserCheck },
      { id: 'afya-solar-portfolio-assessments', label: 'Assessment snapshots', icon: BarChart3 },
      { id: 'afya-solar-portfolio-billing', label: 'Bills & Payment', icon: Receipt },
      { id: 'solar-alerts', label: 'Alerts & Notifications', icon: Bell },
      { id: 'solar-carbon-credits', label: 'Carbon Credits', icon: Leaf },
    ],
  },
  'intelligence': {
    label: 'Resilience Intelligence',
    icon: BarChart3,
    items: [
      { id: 'intel-portfolio', label: 'Portfolio', icon: BarChart3 },
      { id: 'intel-risk', label: 'Risk & Readiness', icon: AlertTriangle },
      { id: 'intel-adaptation', label: 'Adaptation & Impact', icon: TrendingUp },
      { id: 'intel-methodology', label: 'Funding & Methodology', icon: FileText },
    ],
  },
}

// Helper to determine which group a section belongs to
const getSectionGroup = (section: SectionId): NavGroup => {
  if (section.startsWith('intel-')) {
    return 'intelligence'
  }
  if (
    [
      'afya-solar-dashboard',
      'afya-solar-packages',
      'afya-solar-subscribers',
      'afya-solar-portfolio-assessments',
      'afya-solar-portfolio-billing',
      'solar-alerts',
      'solar-carbon-credits',
    ].includes(section)
  ) {
    return 'afya-solar'
  }
  if (['notifications'].includes(section)) {
    return 'general'
  }
  return 'general'
}

export function AdminDashboard({ initialSection = "overview" }: AdminDashboardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const sidebarUser = session?.user
  const sidebarDisplayName = sidebarUser?.name || sidebarUser?.email || "Admin"
  const sidebarInitial = (sidebarUser?.name || sidebarUser?.email || "A").charAt(0).toUpperCase()
  const sidebarRole = sidebarUser?.role ? `${sidebarUser.role.charAt(0).toUpperCase()}${sidebarUser.role.slice(1)}` : "Administrator"
  const { data: facilities, isLoading } = useFacilities()
  const { data: deviceRequests } = useDeviceRequests()
  const updateDeviceRequest = useUpdateDeviceRequest()
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedDeviceRequest, setSelectedDeviceRequest] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [overviewProductFilter, setOverviewProductFilter] = useState<'afya-solar'>('afya-solar')
  const [overviewFacilityFilter, setOverviewFacilityFilter] = useState<string>('all')
  const [overviewPaymentFilter, setOverviewPaymentFilter] = useState<'all' | 'pending' | 'completed'>('all')
  
  const bookingFacilities: any[] = []
  const bookingFacilitiesLoading = false
  const refetchBookingFacilities = async () => {}

  // Service visibility state
  type ServiceName = "afya-solar"
  const [selectedVisibilityFacilityId, setSelectedVisibilityFacilityId] = useState<string>("")
  const [loadingVisibility, setLoadingVisibility] = useState(false)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [visibleServices, setVisibleServices] = useState<ServiceName[]>([])
  const adminUpdateBooking = { mutateAsync: async () => {} } as any
  const { data: notificationCountData } = useNotificationCount()
  const unreadNotificationCount = notificationCountData || 0
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  // Set sidebar initial state based on screen size
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024
    setSidebarOpen(isDesktop)
  }, [])

  // The active workspace is derived from the active section.
  const activeWorkspace = getSectionGroup(activeSection)

  // Navigate to a section, honouring the route-based + popup special cases.
  const goToSection = (id: SectionId) => {
    if (id === 'overview') {
      router.push('/dashboard/admin/overview')
      return
    }
    if (id === 'facilities') {
      router.push('/dashboard/admin/facilities')
      return
    }
    if (id === 'users') {
      router.push('/dashboard/admin/users')
      return
    }
    if (id === 'notifications') {
      setShowNotificationPopup(true)
      setMobileMenuOpen(false)
      return
    }
    setActiveSection(id)
    setMobileMenuOpen(false)
  }

  const handleToggleBookingFacility = (facilityId: string, enabled: boolean) => {
    adminUpdateBooking.mutateAsync({ facilityId, isBookingEnabled: enabled })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/40 p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <FacilityPreferencesProvider>
    <div className="h-screen bg-muted/40 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border shadow-sm transition-all duration-300 fixed lg:static inset-y-0 left-0 z-50 flex flex-col",
          sidebarOpen ? "w-72" : "w-16",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 flex-shrink-0 rounded-full overflow-hidden border border-primary/20 bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">AL</span>
                </div>
                <span className="text-base font-semibold text-foreground">Afya Link</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 p-0 hidden lg:flex"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-8 w-8 p-0 lg:hidden"
              aria-label="Close menu"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
            {/* All groups shown at once, mirroring the facility dashboard sidebar. */}
            {NAV_GROUP_ORDER.map((groupKey, groupIndex) => {
              const group = navGroups[groupKey]
              return (
                <div key={groupKey} role="group" aria-label={NAV_GROUP_LABELS[groupKey]} className="space-y-1">
                  {sidebarOpen ? (
                    <p
                      className={cn(
                        "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                        groupIndex === 0 ? "pt-1" : "pt-4",
                      )}
                    >
                      {NAV_GROUP_LABELS[groupKey]}
                    </p>
                  ) : (
                    groupIndex > 0 && <div className="mx-2 my-2 border-t border-border/60" aria-hidden />
                  )}
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const isActive = activeSection === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => goToSection(item.id)}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200",
                          !sidebarOpen && "justify-center",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground motion-safe:hover:translate-x-0.5",
                        )}
                      >
                        <ItemIcon
                          className={cn(
                            "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                            !isActive && "motion-safe:group-hover:scale-110",
                          )}
                          aria-hidden
                        />
                        {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>

          {/* Sidebar Footer — current user + logout */}
          <div className="p-3 border-t border-border mt-auto space-y-1">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2",
                !sidebarOpen && "justify-center px-0",
              )}
              title={sidebarOpen ? undefined : `${sidebarDisplayName} · ${sidebarRole}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <span className="text-sm font-semibold text-primary">{sidebarInitial}</span>
              </div>
              {sidebarOpen && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{sidebarDisplayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{sidebarRole}</p>
                </div>
              )}
            </div>
            <LogoutButton
              variant="ghost"
              className={cn(
                "w-full",
                sidebarOpen ? "justify-start text-xs" : "justify-center [&>span]:hidden [&>svg]:!mr-0",
              )}
              showIcon={true}
              showTextOnMobile={true}
            />
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* In-page controls (relocated from the former top bar). On the
                overview these actions live inside the section header instead, so
                the strip only carries the mobile menu button there. */}
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                activeSection === 'overview' && "lg:hidden",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSidebarOpen(true)
                    setMobileMenuOpen(true)
                  }}
                  className="lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
              {activeSection !== 'overview' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FacilityToolbar />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      window.location.href = "/services/afya-solar"
                    }}
                    aria-label="Go to Afya Solar"
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <MotionSection key={activeSection} className="space-y-4">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">System Overview</CardTitle>
                        <CardDescription>
                          Live operational metrics for administrators (auto-refreshes every 15 seconds)
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchOverview()}
                          className="text-xs"
                          disabled={overviewFetching}
                        >
                          <RefreshCcw className={cn("w-3.5 h-3.5 mr-1.5", overviewFetching && "animate-spin")} />
                          Refresh
                        </Button>
                        {overviewData?.asOf && (
                          <Badge variant="secondary" className="text-xs">
                            Updated {format(new Date(overviewData.asOf), "HH:mm:ss")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>Facilities, users, devices, alerts, and payments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overviewFetching && !overviewData ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard
                        title="Facilities"
                        value={overviewData?.kpis.facilitiesTotal ?? facilities?.length ?? 0}
                        icon={<Building2 />}
                        accent="primary"
                        meta={`${overviewData?.kpis.facilitiesActive ?? 0} active`}
                      />
                      <StatCard
                        title="Users"
                        value={overviewData?.kpis.usersTotal ?? 0}
                        icon={<Users />}
                        accent="success"
                        meta={`${overviewData?.kpis.usersFacility ?? 0} facility · ${overviewData?.kpis.usersAdmin ?? 0} admin`}
                      />
                      <StatCard
                        title="Devices"
                        value={overviewData?.kpis.devicesTotal ?? 0}
                        icon={<Zap />}
                        accent="muted"
                        meta={`${overviewData?.kpis.devicesOnline ?? 0} online`}
                      />
                      <StatCard
                        title="Revenue (completed)"
                        value={formatCurrency(overviewData?.kpis.revenueTotalCompleted ?? 0)}
                        icon={<DollarSign />}
                        accent="solar"
                        meta={`${formatCurrency(overviewData?.kpis.revenue30dCompleted ?? 0)} last 30d`}
                      />
                    </div>
                    )}

                    <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Activity & usage</h3>
                        <p className="text-xs text-muted-foreground">
                          Showing login activity for:{" "}
                          {activityRange === "weekly"
                            ? "last 7 days"
                            : activityRange === "monthly"
                              ? "last 30 days"
                              : activityRange === "all"
                                ? "last 12 months"
                                : "all time"}
                        </p>
                      </div>
                      <Select value={activityRange} onValueChange={(v: any) => setActivityRange(v)}>
                        <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="all">All (12m)</SelectItem>
                          <SelectItem value="all-time">All time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Facilities (usage)</CardTitle>
                          <CardDescription className="text-xs">
                            Sorted by login count in selected range
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="secondary" className="text-xs">
                              Total facilities: {overviewData?.kpis.facilitiesTotal ?? facilities?.length ?? 0}
                            </Badge>
                            {facilityActivityFetching && <span className="text-[11px] text-muted-foreground">Updating…</span>}
                          </div>
                          <div className="space-y-2">
                            {(facilityActivityData?.rows || []).slice(0, 12).map((row: any) => (
                              <div key={row.facilityId || row.facilityName} className="flex items-center justify-between border border-border rounded-md p-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{row.facilityName}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    {row.city ? `${row.city}, ` : ""}{row.region || ""} · Last login:{" "}
                                    {row.lastLoginAt ? format(new Date(row.lastLoginAt), "PPp") : ""}
                                  </div>
                                </div>
                                <Badge variant="secondary">
                                  {row.loginCount} logins
                                </Badge>
                              </div>
                            ))}
                            {(!facilityActivityData?.rows || facilityActivityData.rows.length === 0) && (
                              <p className="text-xs text-muted-foreground">No login events yet. Users will start appearing after they sign in.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Users (usage)</CardTitle>
                          <CardDescription className="text-xs">
                            Sorted by login count in selected range
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {(userActivityData?.rows || []).slice(0, 12).map((row: any) => (
                              <div key={row.userId || row.email} className="flex items-center justify-between border border-border rounded-md p-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{row.name || row.email}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    {row.email} · {row.role} · Last login: {row.lastLoginAt ? format(new Date(row.lastLoginAt), "PPp") : ""}
                                  </div>
                                </div>
                                <Badge variant="success">
                                  {row.loginCount} logins
                                </Badge>
                              </div>
                            ))}
                            {userActivityFetching && <p className="text-[11px] text-muted-foreground">Updating…</p>}
                            {(!userActivityData?.rows || userActivityData.rows.length === 0) && (
                              <p className="text-xs text-muted-foreground">No login events yet. Users will start appearing after they sign in.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="mt-6">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Afya Solar active subscriptions</CardTitle>
                        <CardDescription className="text-xs">
                          Facilities with an active (non-expired) subscription
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary" className="text-xs">
                            Active: {activeFinanceSubs?.data?.length ?? 0}
                          </Badge>
                          {subsFetching && <span className="text-[11px] text-muted-foreground">Updating…</span>}
                        </div>
                        <div className="space-y-2">
                          {(activeFinanceSubs?.data || []).slice(0, 20).map((row: any) => (
                            <div key={row.facilityId} className="flex items-center justify-between border border-border rounded-md p-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{row.facilityName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {row.city ? `${row.city}, ` : ""}{row.region || ""} · Plan: {row.planType || ""} · Billing: {row.billingCycle || ""} · Expires:{" "}
                                  {row.expiryDate ? format(new Date(row.expiryDate), "PP") : ""}
                                </div>
                              </div>
                              <Badge variant="success">Active</Badge>
                            </div>
                          ))}
                          {(!activeFinanceSubs?.data || activeFinanceSubs.data.length === 0) && (
                            <p className="text-xs text-muted-foreground">No active subscriptions found.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Facilities Section */}
            {activeSection === 'facilities' && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">Facilities</CardTitle>
                        <CardDescription className="text-xs">Manage all healthcare facilities</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-3"
                          asChild
                        >
                          <Link href="/dashboard/admin/service-visibility">
                            <Eye className="w-3 h-3 mr-1.5" />
                            Service visibility
                          </Link>
                        </Button>
                        <InviteFacilityDialog
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['facilities'] })
                            queryClient.invalidateQueries({ queryKey: ['comprehensive-facilities'] })
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {comprehensiveFacilitiesLoading ? (
                      <CardListSkeleton rows={5} className="py-2" />
                    ) : filteredFacilities && filteredFacilities.length > 0 ? (
                      <div className="space-y-2">
                        {filteredFacilities.map((facility) => {
                          const credit = Number(facility.creditBalance || 0)
                          const isLowCredit = credit < 10000
                          
                          return (
                            <div
                              key={facility.id}
                              className="border border-border rounded-lg bg-card hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between p-4 bg-muted/40 border-b border-border">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                                    <Building2 aria-hidden className="w-5 h-5 text-primary-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg text-foreground truncate">{facility.name}</h3>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                      <Badge
                                        variant={facility.status === 'active' ? 'success' : 'secondary'}
                                        className="gap-1"
                                      >
                                        {facility.status === 'active' && <CheckCircle2 aria-hidden className="w-3 h-3" />}
                                        {facility.status === 'active' ? 'Active' : facility.status}
                                      </Badge>
                                      {isLowCredit && (
                                        <Badge variant="warning" className="gap-1">
                                          <AlertTriangle aria-hidden className="w-3 h-3" />
                                          Low Credit
                                        </Badge>
                                      )}
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin aria-hidden className="w-4 h-4" />
                                        <span>{facility.city}, {facility.region}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleFacilityExpansion(facility.id)}
                                    className="text-xs h-9 px-4 transition-shadow"
                                  >
                                    {expandedFacilities.has(facility.id) ? (
                                      <>
                                        <ChevronUp className="w-4 h-4 mr-2" />
                                        Hide Details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Show Details
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                                    onClick={() => {
                                      setFacilityToDelete({ id: facility.id, name: facility.name })
                                      setDeleteFacilityDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              {expandedFacilities.has(facility.id) && (
                                <div className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="border border-border rounded-md p-3 bg-card">
                                      <div className="text-[11px] text-muted-foreground">Credit balance</div>
                                      <div className="text-sm font-semibold text-foreground">
                                        {formatCurrency(Number(facility.creditBalance || 0))}
                                      </div>
                                    </div>
                                    <div className="border border-border rounded-md p-3 bg-card">
                                      <div className="text-[11px] text-muted-foreground">Devices</div>
                                      <div className="text-sm font-semibold text-foreground">
                                        {facility.activeDevices || 0}/{facility.deviceCount || 0} active
                                      </div>
                                    </div>
                                    <div className="border border-border rounded-md p-3 bg-card">
                                      <div className="text-[11px] text-muted-foreground">Users</div>
                                      <div className="text-sm font-semibold text-foreground">{facility.userCount || 0}</div>
                                    </div>
                                    <div className="border border-border rounded-md p-3 bg-card">
                                      <div className="text-[11px] text-muted-foreground">Payments</div>
                                      <div className="text-sm font-semibold text-foreground">{facility.totalPayments || 0}</div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                    <Button asChild size="sm" className="text-xs">
                                      <Link href={`/dashboard/admin/facility/${facility.id}`}>
                                        <Monitor className="w-4 h-4 mr-2" />
                                        Open facility dashboard
                                      </Link>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => openFacilityQuickView(facility)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View details
                                    </Button>
                                    <Button asChild size="sm" variant="outline" className="text-xs">
                                      <Link href={`/dashboard/admin/facilities/${facility.id}`}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Open full details page
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Building2 />}
                        title={
                          searchQuery || statusFilter !== 'all'
                            ? 'No facilities match your filters'
                            : 'No facilities yet'
                        }
                      />
                    )}
                  </CardContent>
                </Card>

                {facilityToDelete && (
                  <DeleteFacilityDialog
                    facilityId={facilityToDelete.id}
                    facilityName={facilityToDelete.name}
                    open={deleteFacilityDialogOpen}
                    onOpenChange={(open) => setDeleteFacilityDialogOpen(open)}
                    onSuccess={() => {
                      setDeleteFacilityDialogOpen(false)
                      setFacilityToDelete(null)
                      queryClient.invalidateQueries({ queryKey: ['facilities'] })
                      toast.success('Facility deleted successfully')
                    }}
                  />
                )}

                <FacilityDetailsDialog
                  facility={facilityQuickView}
                  open={facilityQuickViewOpen}
                  onOpenChange={(open) => {
                    setFacilityQuickViewOpen(open)
                    if (!open) setFacilityQuickView(null)
                  }}
                />
              </>
            )}

            {/* Service Visibility Panel */}
            {/* Resilience */}
            {activeSection === 'maternal-newborn' && <AdminChildServicesRollup />}

            {activeSection === 'resilience-score' && (
              <AdminFacilitiesRcsTable focusFacilityId={focusFacilityId} onFocusHandled={() => setFocusFacilityId(null)} />
            )}

            {activeSection === 'climate-outlook' && (
              <AdminClimateOutlook focusFacilityId={focusFacilityId} onFocusHandled={() => setFocusFacilityId(null)} />
            )}


            {/* Updates */}
            {activeSection === 'reports' && <AdminReportCenter />}

            {activeSection === 'notifications' && (
              <AdminNotificationsCenter
                onOpen={({ section, facilityId }) => {
                  setActiveSection(section as SectionId)
                  setFocusFacilityId(facilityId ?? null)
                }}
              />
            )}

            {activeSection === 'assistant' && <AdminAssistant />}

            {activeSection === 'channels' && <AdminChannels />}

            {/* Support */}
            {activeSection === 'help' && <AdminHelp onNavigate={(id) => goToSection(id as SectionId)} />}

            {/* User Management */}
            {activeSection === 'users' && (
              <UserManagement />
            )}

            {/* Technician Management */}
            {activeSection === 'technicians' && (
              <TechnicianManagement />
            )}

            {activeSection === 'internal-tools' && <InternalSystemTools />}

            {activeSection === 'afya-solar-packages' && (
              <AfyaSolarPackageManagement />
            )}

            {activeSection === 'afya-solar-subscribers' && (
              <AfyaSolarSubscribersManagement />
            )}

            {activeSection === 'afya-solar-portfolio-assessments' && (
              <AdminEnergyEfficiency focusFacilityId={focusFacilityId} onFocusHandled={() => setFocusFacilityId(null)} />
            )}

            {activeSection === 'afya-solar-portfolio-billing' && <AdminPortfolioSolarBilling />}

            {activeSection === 'solar-live-monitoring' && <AdminPower />}


            {activeSection === 'solar-carbon-credits' && <AdminCarbonCredits />}
            </MotionSection>

          </div>
        </main>
      </div>
    </div>
    </FacilityPreferencesProvider>
  )
}
