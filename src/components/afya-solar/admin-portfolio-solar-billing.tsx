"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { m } from "framer-motion"
import { toast } from "sonner"
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Copy,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import { useFacility, useFacilities } from "@/hooks/use-facilities"
import { useAfyaSolarSubscribers as useAfyaSolarSubscriberByFacility } from "@/hooks/use-afyasolar-subscribers"
import { useBills } from "@/hooks/use-bills"
import { useServiceAccessPayments } from "@/hooks/use-service-access-payments"
import {
  useAdminPortfolioBilling,
  useAfyaSolarBillingEligibleFacilities,
} from "@/hooks/use-admin-portfolio-billing"
import { formatCurrency, cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { BillsSubscriptionView } from "@/components/dashboard/bills-subscription-view"

type FacilityOption = {
  id: string
  name: string
  city?: string | null
  region?: string | null
  hasAfyaSolar?: boolean
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export function AdminPortfolioSolarBilling() {
  const queryClient = useQueryClient()
  const [selectedFacilityId, setSelectedFacilityId] = useState("")
  const [facilitySearch, setFacilitySearch] = useState("")

  // Facility directory (all active facilities from the `facilities` table).
  const {
    data: allFacilities = [],
    isLoading: allFacilitiesLoading,
    isFetching: allFacilitiesFetching,
    refetch: refetchAllFacilities,
  } = useFacilities()

  // Admin solar billing eligibility (used purely to flag Afya Solar subscribers).
  const {
    data: eligibleFacilities = [],
    isLoading: eligibleLoading,
    isFetching: eligibleFetching,
    refetch: refetchEligible,
  } = useAfyaSolarBillingEligibleFacilities()

  // Admin portfolio billing used for the summary metrics and per-facility invoice list.
  const { summary, invoiceRequests } = useAdminPortfolioBilling("30d")
  const {
    data: summaryJson,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = summary
  const {
    data: invoiceRows = [],
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = invoiceRequests

  // Per-facility data (only fetched when a facility is selected).
  const { data: facilityRecord, isFetching: facilityFetching, refetch: refetchFacility } =
    useFacility(selectedFacilityId || undefined)
  const { data: bills, isFetching: billsFetching, refetch: refetchBills } =
    useBills(selectedFacilityId || undefined)
  const {
    data: servicePayments = [],
    isFetching: sapFetching,
    refetch: refetchSap,
  } = useServiceAccessPayments(selectedFacilityId || undefined, "afya-solar")
  const {
    data: afyaSolarSubscriber,
    isFetching: subscriberFetching,
    refetch: refetchSubscriber,
  } = useAfyaSolarSubscriberByFacility(selectedFacilityId || undefined)

  const eligibleSet = useMemo(
    () => new Set(eligibleFacilities.map((f) => f.facilityId)),
    [eligibleFacilities],
  )

  const facilityOptions: FacilityOption[] = useMemo(() => {
    return (allFacilities ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      city: f.city ?? null,
      region: f.region ?? null,
      hasAfyaSolar: eligibleSet.has(f.id),
    }))
  }, [allFacilities, eligibleSet])

  const filteredFacilities = useMemo(() => {
    const q = facilitySearch.trim().toLowerCase()
    let list = [...facilityOptions]
    if (q) {
      list = list.filter((f) =>
        [f.name, f.city, f.region, f.id].some((v) => String(v || "").toLowerCase().includes(q)),
      )
    }
    // Surface Afya Solar subscribers first, then sort by name.
    return list.sort((a, b) => {
      if (a.hasAfyaSolar !== b.hasAfyaSolar) return a.hasAfyaSolar ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [facilityOptions, facilitySearch])

  useEffect(() => {
    if (!selectedFacilityId) return
    if (facilityOptions.some((f) => f.id === selectedFacilityId)) return
    // The selected facility disappeared (deleted/inactive) — clear on the next
    // frame rather than synchronously inside the effect body.
    const id = requestAnimationFrame(() => setSelectedFacilityId(""))
    return () => cancelAnimationFrame(id)
  }, [facilityOptions, selectedFacilityId])

  const selectedFacility = useMemo(
    () => facilityOptions.find((f) => f.id === selectedFacilityId) ?? null,
    [facilityOptions, selectedFacilityId],
  )

  const facilityInvoices = useMemo(
    () =>
      !selectedFacilityId
        ? invoiceRows
        : invoiceRows.filter((r) => r.facilityId === selectedFacilityId),
    [invoiceRows, selectedFacilityId],
  )

  // ------ Few admin metrics summary ------
  const pendingInvoiceTotal = useMemo(
    () =>
      invoiceRows
        .filter((r) => r.status === "pending")
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [invoiceRows],
  )

  const portfolioMetrics = useMemo(() => {
    return {
      totalFacilities: facilityOptions.length,
      solarSubscribers: eligibleFacilities.length,
      activeSubscriptions: summaryJson?.activeSubscriptions ?? 0,
      recognizedRevenue: summaryJson?.totalRevenue ?? 0,
      pendingPayments:
        (summaryJson?.pendingPayments ?? 0) + (summaryJson?.overduePayments ?? 0),
      pendingInvoiceTotal,
    }
  }, [
    facilityOptions.length,
    eligibleFacilities.length,
    summaryJson?.activeSubscriptions,
    summaryJson?.totalRevenue,
    summaryJson?.pendingPayments,
    summaryJson?.overduePayments,
    pendingInvoiceTotal,
  ])

  const refreshAll = () => {
    void queryClient.invalidateQueries({
      queryKey: ["afya-solar-billing-eligible-facilities"],
    })
    void refetchAllFacilities()
    void refetchEligible()
    void refetchSummary()
    void refetchInvoices()
    if (selectedFacilityId) {
      void refetchFacility()
      void refetchBills()
      void refetchSap()
      void refetchSubscriber()
    }
  }

  const busy =
    allFacilitiesFetching ||
    eligibleFetching ||
    summaryFetching ||
    invoicesFetching ||
    (!!selectedFacilityId &&
      (facilityFetching || billsFetching || sapFetching || subscriberFetching))

  const handleCopyId = async () => {
    if (!selectedFacilityId) return
    await navigator.clipboard?.writeText?.(selectedFacilityId)
    toast.success("Facility id copied.")
  }

  const metricSkeleton = <Skeleton className="h-7 w-24" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills &amp; Payment</h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Select a facility from the directory to inspect the same Bills
            &amp; Subscription and PAYG &amp; Financing view that facility users
            see.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {busy ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={busy}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", busy && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin metrics summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active facilities"
          subtitle={`${portfolioMetrics.solarSubscribers} on Afya Solar`}
          value={String(portfolioMetrics.totalFacilities || "")}
          icon={Building2}
          loading={allFacilitiesLoading || eligibleLoading}
        />
        <MetricCard
          title="Recognized revenue"
          subtitle="Portfolio · last 30 days"
          value={formatCurrency(portfolioMetrics.recognizedRevenue)}
          icon={TrendingUp}
          loading={summaryLoading}
        />
        <MetricCard
          title="Pending / at risk"
          subtitle="Pending + overdue (30d)"
          value={formatCurrency(portfolioMetrics.pendingPayments)}
          icon={AlertCircle}
          loading={summaryLoading}
        />
        <MetricCard
          title="Active subscriptions"
          subtitle="Solar customers"
          value={String(portfolioMetrics.activeSubscriptions || "")}
          icon={CheckCircle}
          loading={summaryLoading}
        />
      </div>

      {/* Facility selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Facility selection</CardTitle>
          <CardDescription>
            All active facilities from the facilities table. Afya Solar
            subscribers are listed first.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Name, city, region, or id…"
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Select facility (dropdown)
              </Label>
              <Select
                value={selectedFacilityId || "__portfolio__"}
                onValueChange={(v) =>
                  setSelectedFacilityId(v === "__portfolio__" ? "" : v)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__portfolio__">
                    No facility selected
                  </SelectItem>
                  {filteredFacilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                      {f.hasAfyaSolar ? "" : " (no Afya Solar)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Matches: {filteredFacilities.length}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {busy ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={refreshAll} disabled={busy}>
              <RefreshCw className={cn("mr-1 h-4 w-4", busy && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Admin metrics summary */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <m.div variants={scaleIn}>
            <StatCard
              title="Active facilities"
              meta={`${portfolioMetrics.solarSubscribers} on Afya Solar`}
              icon={<Building2 />}
              accent="primary"
              value={
                allFacilitiesLoading || eligibleLoading ? (
                  metricSkeleton
                ) : (
                  <AnimatedNumber value={portfolioMetrics.totalFacilities} />
                )
              }
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="Recognized revenue"
              meta="Portfolio · last 30 days"
              icon={<TrendingUp />}
              accent="success"
              value={
                summaryLoading ? (
                  metricSkeleton
                ) : (
                  <AnimatedNumber value={portfolioMetrics.recognizedRevenue} prefix="TSh " />
                )
              }
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="Pending / at risk"
              meta="Pending + overdue (30d)"
              icon={<AlertCircle />}
              accent={portfolioMetrics.pendingPayments > 0 ? "warning" : "muted"}
              value={
                summaryLoading ? (
                  metricSkeleton
                ) : (
                  <AnimatedNumber value={portfolioMetrics.pendingPayments} prefix="TSh " />
                )
              }
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="Active subscriptions"
              meta="Solar customers"
              icon={<CheckCircle />}
              accent="primary"
              value={
                summaryLoading ? (
                  metricSkeleton
                ) : (
                  <AnimatedNumber value={portfolioMetrics.activeSubscriptions} />
                )
              }
            />
          </m.div>
        </m.div>

        {/* Facility directory */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Facility directory</CardTitle>
              <CardDescription>
                All active facilities. Afya Solar subscribers are listed first — pick one to drill into its billing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, city, region, or id…"
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  aria-label="Search facilities"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Showing <span className="font-medium text-foreground">{filteredFacilities.length}</span> of{" "}
                  {facilityOptions.length} · {portfolioMetrics.solarSubscribers} on Afya Solar
                </span>
                {selectedFacilityId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setSelectedFacilityId("")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear selection
                  </Button>
                ) : null}
              </div>

              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border">
                {allFacilitiesLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredFacilities.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No facilities match the search.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredFacilities.map((f) => {
                      const active = selectedFacilityId === f.id
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedFacilityId(active ? "" : f.id)}
                            aria-pressed={active}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                              FOCUS_RING,
                              active ? "bg-primary/10" : "hover:bg-muted/60",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                f.hasAfyaSolar ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {initials(f.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[f.city, f.region].filter(Boolean).join(", ") || "No location"}
                              </p>
                            </div>
                            {f.hasAfyaSolar ? (
                              <Badge className="shrink-0 bg-primary/15 text-primary">Afya Solar</Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                                No solar
                              </Badge>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Selected facility context strip */}
        {selectedFacilityId ? (
          <m.div
            key={selectedFacilityId}
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {initials(selectedFacility?.name ?? facilityRecord?.name ?? "?")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedFacility?.name ?? facilityRecord?.name ?? "Facility"}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">{selectedFacilityId}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={selectedFacility?.hasAfyaSolar ? "default" : "outline"}>
                      {selectedFacility?.hasAfyaSolar ? "Afya Solar subscriber" : "No active Afya Solar"}
                    </Badge>
                    {facilityRecord?.paymentModel ? (
                      <Badge variant="secondary" className="font-normal">
                        {String(facilityRecord.paymentModel)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopyId}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy id
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFacilityId("")}>
                  Clear
                </Button>
              </div>
            </div>
          </m.div>
        ) : null}

        {/* Bills & Subscription */}
        <m.div
          key={selectedFacilityId || "portfolio-bills"}
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {selectedFacilityId ? (
            <BillsSubscriptionView
              afyaSolarSubscriber={afyaSolarSubscriber ?? null}
              bills={bills}
              serviceAccessPayments={servicePayments}
              invoiceRequests={facilityInvoices}
              facility={facilityRecord ?? null}
              canShowPayNow={false}
            />
          ) : (
            <SelectFacilityEmptyState
              icon={Wallet}
              title="Select a facility to view bills & subscription"
              description="Pick a facility from the directory above. The admin sees the same Bills & Subscription view facility users have — package, payment history, invoice requests, and bills."
            />
          )}
        </m.div>
      </div>
    </LazyMotionProvider>
  )
}

function SelectFacilityEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof TrendingUp
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <Icon className="size-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
