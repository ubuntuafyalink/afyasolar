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
            {activeSection === 'overview' && <AdminOverview />}

            {/* Facilities Section */}
            {activeSection === 'facilities' && <AdminFacilities />}

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

          </div>
        </main>
      </div>
    </div>
    </FacilityPreferencesProvider>
  )
}
