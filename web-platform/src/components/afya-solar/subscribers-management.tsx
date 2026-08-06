'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { m } from 'framer-motion'
import {
  Users,
  Search,
  Eye,
  Zap,
  DollarSign,
  FileText,
  Bell,
  BarChart3,
  LayoutDashboard,
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wallet,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { AnimatedNumber } from '@/components/ui/animated-number'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { LazyMotionProvider } from '@/components/motion/lazy-motion-provider'
import { fadeInUp, scaleIn, staggerContainer } from '@/components/motion/variants'
import { useAfyaSolarSubscribers } from '@/hooks/use-afya-solar-subscribers'
import { formatCurrency, cn } from '@/lib/utils'
import { FOCUS_RING } from '@/lib/dashboard/facility-ui'

type SortField = 'name' | 'city' | 'status' | 'creditBalance'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive' | 'low_credit' | 'suspended' | 'completed-payment'

const PAGE_SIZE = 10
const LOW_CREDIT = 10000

const STATUS_BADGE: Record<string, string> = {
  active: 'border-success/40 bg-success/15 text-success-foreground',
  inactive: 'border-border bg-muted text-muted-foreground',
  low_credit: 'border-warning/40 bg-warning/15 text-warning-foreground',
  suspended: 'border-destructive/40 bg-destructive/10 text-destructive',
}
const SUB_BADGE: Record<string, string> = {
  active: 'border-success/40 bg-success/15 text-success-foreground',
  trial: 'border-primary/40 bg-primary/10 text-primary',
  expired: 'border-destructive/40 bg-destructive/10 text-destructive',
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', className)}>
      {children}
    </span>
  )
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Plug },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'bills-payment', label: 'Bills & Payment', icon: DollarSign },
  { id: 'subscription', label: 'Subscription', icon: FileText },
  { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
] as const

export default function AfyaSolarSubscribersManagement() {
  const router = useRouter()
  const { data: subscribers, isLoading, isFetching, error, refetch } = useAfyaSolarSubscribers()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('completed-payment')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [page, setPage] = useState(1)

  const metrics = useMemo(() => {
    const list = subscribers ?? []
    return {
      total: list.length,
      active: list.filter((s) => s.status === 'active').length,
      inactive: list.filter((s) => s.status === 'inactive').length,
      suspended: list.filter((s) => s.status === 'suspended').length,
      lowCredit: list.filter((s) => s.status === 'low_credit').length,
      completedPayment: list.filter((s) => s.paymentStatus === 'completed').length,
      totalCreditBalance: list.reduce((sum, s) => sum + (s.creditBalance || 0), 0),
    }
  }, [subscribers])

  const filtered = useMemo(() => {
    let list = subscribers ?? []
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((s) =>
        [s.name, s.city, s.region, s.contactEmail, s.smartmeterSerial].some((v) =>
          String(v || '').toLowerCase().includes(q),
        ),
      )
    }
    if (statusFilter === 'completed-payment') {
      list = list.filter((s) => s.paymentStatus === 'completed')
    } else if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter)
    }
    const sorted = [...list].sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (sortField === 'creditBalance') {
        av = Number(a.creditBalance) || 0
        bv = Number(b.creditBalance) || 0
      } else {
        av = String(a[sortField] || '').toLowerCase()
        bv = String(b[sortField] || '').toLowerCase()
      }
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [subscribers, searchQuery, statusFilter, sortField, sortOrder])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const go = (facilityId: string, section = 'overview') =>
    router.push(`/dashboard/admin/facility/${facilityId}?section=${section}`)

  const hasFilters = searchQuery !== '' || statusFilter !== 'completed-payment'
  const sortArrow = (field: SortField) => (sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <AlertTriangle className="size-8 text-destructive" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-foreground">Failed to load subscribers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-1 size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Users className="size-6 text-primary" aria-hidden />
              Afya Solar Subscribers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Facilities subscribed to Afya Solar — open any facility&apos;s dashboard to inspect or control it.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-1 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <m.div variants={scaleIn}>
            <StatCard title="Total subscribers" meta="All facilities" icon={<Users />} accent="primary" value={<AnimatedNumber value={metrics.total} />} />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard title="Active" meta="Operational" icon={<CheckCircle />} accent="success" value={<AnimatedNumber value={metrics.active} />} />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard title="Completed payments" meta="Paid subscribers" icon={<DollarSign />} accent="primary" value={<AnimatedNumber value={metrics.completedPayment} />} />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard title="Low credit" meta="Need attention" icon={<AlertTriangle />} accent={metrics.lowCredit > 0 ? 'warning' : 'muted'} value={<AnimatedNumber value={metrics.lowCredit} />} />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard title="Suspended" meta="Service suspended" icon={<XCircle />} accent={metrics.suspended > 0 ? 'destructive' : 'muted'} value={<AnimatedNumber value={metrics.suspended} />} />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard title="Credit balance" meta="Across all subscribers" icon={<Wallet />} accent="solar" value={<AnimatedNumber value={metrics.totalCreditBalance} prefix="TSh " />} />
          </m.div>
        </m.div>

        {/* Filters + table */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Subscriber facilities</CardTitle>
                  <CardDescription>Click a facility to view and control its dashboard.</CardDescription>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {total} {total === 1 ? 'facility' : 'facilities'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="w-56 pl-9"
                    placeholder="Search name, city, email, meter…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                    aria-label="Search subscribers"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1) }}
                  aria-label="Filter by status"
                  className={cn('h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground', FOCUS_RING)}
                >
                  <option value="all">All status</option>
                  <option value="completed-payment">Completed payment</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="low_credit">Low credit</option>
                  <option value="suspended">Suspended</option>
                </select>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('completed-payment')
                      setPage(1)
                    }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs">
                    <tr>
                      {([
                        ['name', 'Facility'],
                        ['city', 'Location'],
                        ['status', 'Status'],
                      ] as [SortField, string][]).map(([field, label]) => (
                        <th key={field} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                          <button type="button" onClick={() => handleSort(field)} className={cn('font-medium hover:text-foreground', FOCUS_RING)}>
                            {label}
                            {sortArrow(field)}
                          </button>
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Subscription</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                        <button type="button" onClick={() => handleSort('creditBalance')} className={cn('font-medium hover:text-foreground', FOCUS_RING)}>
                          Credit balance{sortArrow('creditBalance')}
                        </button>
                      </th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Smart meter</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((s) => {
                      const low = (s.creditBalance || 0) < LOW_CREDIT
                      return (
                        <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                          <td className="px-3 py-2">
                            <span className="font-medium text-foreground">{s.name}</span>
                            <span className="block text-xs text-muted-foreground">{s.region || '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden />
                              {s.city || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={STATUS_BADGE[s.status] ?? STATUS_BADGE.inactive}>{s.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={SUB_BADGE[s.subscriptionStatus] ?? STATUS_BADGE.inactive}>{s.subscriptionStatus}</Badge>
                            {s.packageName ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.packageName}</span> : null}
                          </td>
                          <td className={cn('px-3 py-2 text-right tabular-nums', low ? 'font-medium text-destructive' : 'text-foreground')}>
                            {formatCurrency(s.creditBalance || 0)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Zap className="h-3 w-3" aria-hidden />
                              {s.smartmeterSerial || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => go(s.id, 'overview')}>
                                <Eye className="h-3.5 w-3.5" />
                                View dashboard
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" aria-label={`Open a section for ${s.name}`}>
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel className="truncate">{s.name}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {SECTIONS.map((sec) => (
                                    <DropdownMenuItem key={sec.id} onClick={() => go(s.id, sec.id)} className="gap-2">
                                      <sec.icon className="h-3.5 w-3.5" />
                                      {sec.label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => go(s.id, 'overview')} className="gap-2">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Overview report
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center">
                          <Users className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
                          <p className="text-sm text-muted-foreground">No subscribers match your criteria.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                      <ChevronLeft className="mr-1 size-3.5" />
                      Prev
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (safePage <= 3) pageNum = i + 1
                      else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = safePage - 2 + i
                      return (
                        <Button key={pageNum} variant={safePage === pageNum ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(pageNum)} aria-current={safePage === pageNum ? 'page' : undefined}>
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                      Next
                      <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>
      </div>
    </LazyMotionProvider>
  )
}
