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
} from "lucide-react"
// Resilience Intelligence (additive, simulated data) — consolidated into hubs
import { FacilityPreferencesProvider } from "@/components/dashboard/facility/facility-preferences-provider"
import { FacilityToolbar } from "@/components/dashboard/facility/facility-toolbar"
// Facility-mirror section components (portfolio-level)
import { AdminChildServicesRollup } from "@/components/admin/intelligence/admin-child-services-rollup"
import { AdminFacilitiesRcsTable } from "@/components/admin/intelligence/admin-facilities-rcs-table"
import { AdminClimateOutlook } from "@/components/admin/intelligence/admin-climate-outlook"
import { AdminNotificationsCenter } from "@/components/admin/notifications/admin-notifications-center"
import { AdminReportCenter } from "@/components/admin/reports/admin-report-center"
import { AdminAssistant } from "@/components/admin/admin-assistant"
import { AdminChannels } from "@/components/admin/admin-channels"
import { AdminHelp } from "@/components/admin/admin-help"
import { useDeviceRequests, useUpdateDeviceRequest } from "@/hooks/use-device-requests"
import { LogoutButton } from "@/components/logout-button"
import { UserManagement } from "@/components/dashboard/user-management"
import { TechnicianManagement } from "@/components/dashboard/technician-management"
import { AdminPower } from "@/components/admin/intelligence/admin-power"
import AdminSolarCarbonCredits from "@/components/solar/admin-solar-carbon-credits"
import { FacilityCarbonCredits } from "@/components/dashboard/facility-carbon-credits"
import { InternalSystemTools } from "@/components/admin/internal-system-tools"
import { AdminEnergyEfficiency } from "@/components/admin/intelligence/admin-energy-efficiency"
import { AdminPortfolioSolarBilling } from "@/components/afya-solar/admin-portfolio-solar-billing"
import { useComprehensiveFacilities, type ComprehensiveFacility } from "@/hooks/use-facilities"
import { useFacilities } from "@/hooks/use-facilities"
import type { Facility } from "@/types"
import { InviteFacilityDialog } from "@/components/dashboard/invite-facility-dialog"
import { BulkInviteFacilitiesDialog } from "@/components/dashboard/bulk-invite-facilities-dialog"
import { DeleteFacilityDialog } from "@/components/dashboard/delete-facility-dialog"
import { AdminTransactions } from "@/components/dashboard/admin-transactions"
import { useAdminWithdrawals, useUpdateWithdrawal } from "@/hooks/use-admin-withdrawals"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  | 'transactions' // "Withdrawals"
  | 'internal-tools' // "Settings"

type AdminDashboardProps = {
  initialSection?: SectionId
}

// Grouped navigation structure (mirrors facility-nav.ts groups)
type NavGroup = 'home' | 'resilience' | 'energy' | 'updates' | 'billing' | 'support' | 'manage'

// Display order of the groups in the sidebar (all shown at once, like facility).
const NAV_GROUP_ORDER: NavGroup[] = ['home', 'resilience', 'energy', 'updates', 'billing', 'support', 'manage']

const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: 'Home',
  resilience: 'Resilience',
  energy: 'Energy',
  updates: 'Updates',
  billing: 'Billing',
  support: 'Support',
  manage: 'Manage',
}

const navGroups: Record<NavGroup, { items: { id: SectionId; label: string; icon: React.ElementType }[] }> = {
  home: {
    items: [{ id: 'overview', label: 'Overview', icon: BarChart3 }],
  },
  resilience: {
    items: [
      { id: 'maternal-newborn', label: 'Maternal & Newborn', icon: Baby },
      { id: 'resilience-score', label: 'Resilience Score', icon: BarChart3 },
      { id: 'climate-outlook', label: 'Climate Outlook', icon: Satellite },
    ],
  },
  energy: {
    items: [
      { id: 'solar-live-monitoring', label: 'Power', icon: PlugZap },
      { id: 'afya-solar-portfolio-assessments', label: 'Energy Efficiency', icon: Gauge },
    ],
  },
  updates: {
    items: [
      { id: 'reports', label: 'Reports', icon: ClipboardList },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'assistant', label: 'Assistant', icon: Bot },
      { id: 'channels', label: 'Channels', icon: MessageCircle },
    ],
  },
  billing: {
    items: [
      { id: 'afya-solar-portfolio-billing', label: 'Bills & Payment', icon: Receipt },
      { id: 'solar-carbon-credits', label: 'Carbon Credits', icon: Leaf },
      { id: 'afya-solar-subscribers', label: 'Subscription', icon: CreditCard },
      { id: 'afya-solar-packages', label: 'Packages', icon: Package },
    ],
  },
  support: {
    items: [{ id: 'help', label: 'Help', icon: LifeBuoy }],
  },
  manage: {
    items: [
      { id: 'facilities', label: 'Facilities', icon: Building2 },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'technicians', label: 'Technicians', icon: Wrench },
      { id: 'transactions', label: 'Withdrawals', icon: DollarSign },
      { id: 'internal-tools', label: 'Settings', icon: Settings },
    ],
  },
}

export function AdminDashboard({ initialSection = "overview" }: AdminDashboardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: facilities, isLoading } = useFacilities()
  const { data: deviceRequests } = useDeviceRequests()
  const updateDeviceRequest = useUpdateDeviceRequest()
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection)
  const [focusFacilityId, setFocusFacilityId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedDeviceRequest, setSelectedDeviceRequest] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [facilityToDelete, setFacilityToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteFacilityDialogOpen, setDeleteFacilityDialogOpen] = useState(false)
  const [overviewProductFilter, setOverviewProductFilter] = useState<'afya-solar'>('afya-solar')
  const [overviewFacilityFilter, setOverviewFacilityFilter] = useState<string>('all')
  const [overviewPaymentFilter, setOverviewPaymentFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [expandedFacilities, setExpandedFacilities] = useState<Set<string>>(new Set())
  const [facilityQuickViewOpen, setFacilityQuickViewOpen] = useState(false)
  const [facilityQuickView, setFacilityQuickView] = useState<ComprehensiveFacility | null>(null)
  
  const [carbonCreditsFacility, setCarbonCreditsFacility] = useState<string>('')
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
  const { data: withdrawalsData } = useAdminWithdrawals('pending')
  const pendingWithdrawalsCount = withdrawalsData?.counts?.pending || 0
  const { data: notificationCountData } = useNotificationCount()
  const unreadNotificationCount = notificationCountData || 0
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)

  const [activityRange, setActivityRange] = useState<"weekly" | "monthly" | "all" | "all-time">("monthly")

  const { data: userActivityData, isFetching: userActivityFetching } = useQuery({
    queryKey: ["admin-activity", "users", activityRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?scope=users&range=${activityRange}`)
      if (!res.ok) throw new Error("Failed to load user activity")
      return res.json() as Promise<{ rows: any[]; from: string | null; to: string | null }>
    },
    refetchInterval: 15000,
  })

  const { data: facilityActivityData, isFetching: facilityActivityFetching } = useQuery({
    queryKey: ["admin-activity", "facilities", activityRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?scope=facilities&range=${activityRange}`)
      if (!res.ok) throw new Error("Failed to load facility activity")
      return res.json() as Promise<{ rows: any[]; from: string | null; to: string | null }>
    },
    refetchInterval: 15000,
  })

  const { data: activeFinanceSubs, isFetching: subsFetching } = useQuery({
    queryKey: ["admin-active-subs", "afya-solar"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/subscriptions/active?service=afya-solar`)
      if (!res.ok) throw new Error("Failed to load active subscriptions")
      return res.json() as Promise<{ success: boolean; data: any[] }>
    },
    refetchInterval: 30000,
  })

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  const {
    data: overviewData,
    isFetching: overviewFetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load overview")
      }
      return res.json() as Promise<{
        asOf: string
        kpis: {
          facilitiesTotal: number
          facilitiesActive: number
          usersTotal: number
          usersFacility: number
          usersAdmin: number
          devicesTotal: number
          devicesOnline: number
          activeAlerts: number
          criticalAlerts: number
          revenueTotalCompleted: number
          revenue30dCompleted: number
          transactions30d: { total: number; completed: number; failed: number; pending: number }
        }
      }>
    },
    refetchInterval: 15000,
  })

  // Use comprehensive facilities data for the facilities tab
  const { data: comprehensiveFacilities, isLoading: comprehensiveFacilitiesLoading } = useComprehensiveFacilities(
    activeSection === 'facilities' ? searchQuery : undefined,
    activeSection === 'facilities' ? statusFilter : undefined
  )

  // Set sidebar initial state based on screen size
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024
    setSidebarOpen(isDesktop)
  }, [])

  // Navigate to a section, honouring the route-based special cases.
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
    setActiveSection(id)
    setMobileMenuOpen(false)
  }

  const handleToggleBookingFacility = (facilityId: string, enabled: boolean) => {
    adminUpdateBooking.mutateAsync({ facilityId, isBookingEnabled: enabled })
  }

  // Toggle facility card expansion
  const toggleFacilityExpansion = (facilityId: string) => {
    setExpandedFacilities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(facilityId)) {
        newSet.delete(facilityId)
      } else {
        newSet.add(facilityId)
      }
      return newSet
    })
  }

  const openFacilityQuickView = (facility: ComprehensiveFacility) => {
    setFacilityQuickView(facility)
    setFacilityQuickViewOpen(true)
  }

  // Filter facilities based on search and status
  const filteredFacilities = useMemo(() => {
    if (!comprehensiveFacilities) return []
    
    return comprehensiveFacilities.filter((facility: ComprehensiveFacility) => {
      const matchesSearch = !searchQuery || 
        facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.phone.includes(searchQuery) ||
        (facility.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      
      const matchesStatus = statusFilter === 'all' || facility.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [comprehensiveFacilities, searchQuery, statusFilter])

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
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-8 w-8 p-0 lg:hidden"
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
                          "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          !sidebarOpen && "justify-center",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <ItemIcon className="w-4 h-4 flex-shrink-0" aria-hidden />
                        {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
                        {item.id === 'transactions' && pendingWithdrawalsCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {pendingWithdrawalsCount}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border mt-auto">
            <LogoutButton
              variant="ghost"
              className={cn("w-full justify-center text-xs", sidebarOpen && "justify-start")}
              showIcon={false}
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
        {/* Top Header */}
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
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
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide sr-only">
                      Admin Dashboard
                    </p>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                      Management Panel
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                      Monitor Afya Solar facilities and operations
                    </p>
                  </div>
                </div>
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
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
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
            {activeSection === 'help' && <AdminHelp />}

            {/* User Management */}
            {activeSection === 'users' && (
              <UserManagement />
            )}

            {/* Technician Management */}
            {activeSection === 'technicians' && (
              <TechnicianManagement />
            )}

            {activeSection === 'internal-tools' && <InternalSystemTools />}

            {/* Manage: Withdrawals */}
            {activeSection === 'transactions' && (
              <AdminTransactions />
            )}

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


            {activeSection === 'solar-carbon-credits' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf aria-hidden className="w-5 h-5 text-primary" />
                      Carbon Credits Assessment
                    </CardTitle>
                    <CardDescription>
                      Calculate and manage carbon credits for any facility in the system.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Facility Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Facility</Label>
                      <Select value={carbonCreditsFacility} onValueChange={setCarbonCreditsFacility}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a facility for carbon credits assessment...">
                            {isLoading && (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span>Loading facilities...</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {facilities?.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{facility.name}</span>
                                <span className="text-xs text-muted-foreground">{facility.city}, {facility.region}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {facilities?.length === 0 && !isLoading && (
                        <p className="text-sm text-muted-foreground">No facilities found. Please ensure facilities are registered in the system.</p>
                      )}
                    </div>

                    {/* Assessment Content */}
                    {carbonCreditsFacility && (
                      <div className="border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          Performing carbon credits assessment for:
                          <strong> {facilities?.find(f => f.id === carbonCreditsFacility)?.name}</strong>
                        </p>
                        <FacilityCarbonCredits facilityId={carbonCreditsFacility} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
    </FacilityPreferencesProvider>
  )
}
