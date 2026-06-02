 "use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Sun, 
  Battery, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  DollarSign,
  Calendar,
  Shield,
  Wrench,
  TrendingUp,
  Eye,
  ArrowLeft
} from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { ServiceAccessPaymentDialog } from "@/components/services/service-access-payment-dialog"
import { useRouter } from "next/navigation"

export interface SolarPackage {
  id: string | number  // Support both string (legacy) and number (new) IDs
  code: string
  name: string
  ratedKw?: number  // Make optional for legacy packages
  suitableFor?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  plans?: {
    id: number
    planTypeCode: string
    currency: string
    pricing: {
      cashPrice?: number
      installmentDurationMonths?: number
      defaultUpfrontPercent?: string
      defaultMonthlyAmount?: number
      eaasMonthlyFee?: number
      eaasBillingModel?: string
      includesShipping: boolean
      includesInstallation: boolean
      includesCommissioning: boolean
      includesMaintenance: boolean
    }
  }[]
  // Additional fields for UI compatibility
  size?: string
  trueCost?: number
  cashPrice?: number
  upfrontCashPrice?: number
  whatItPowers?: string
  installmentTotal?: number
  installmentUpfront?: number
  installmentUpfrontPercent?: number
  installmentBalance?: number
  installmentMonths?: number
  installmentMonthly?: number
  paasMonthlyFee?: number
  solarPanels?: string
  totalSolarCapacity?: string
  batteryStorage?: string
  inverterType?: string
  inverterFeatures?: string
  mountingStructure?: string
  wiringProtection?: string
  cabling?: string
  installation?: string
  remoteMonitoring?: string
  trainingProvided?: string
  suitableFacilityType?: string
  averageDailyOutput?: string
  backupRuntime?: string
  warranty?: string
  includedAccessories?: string
  useCases?: string
}

interface SolarPackagesSelectionProps {
  facilityId: string
  onPackageSelected?: (packageId: string) => void
}

export function SolarPackagesSelection({ facilityId, onPackageSelected }: SolarPackagesSelectionProps) {
  const router = useRouter()
  const [packages, setPackages] = useState<SolarPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<"cash" | "installment" | "paas">("cash")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const recommendedPackages = useMemo(
    () =>
      packages.map((p) => ({
        id: p.id,
        name: p.name,
        ratedKw: p.ratedKw,
        size: p.size ?? p.totalSolarCapacity,
      })),
    [packages]
  )

  // Function to map rated kW to package names
  const getPackageName = (ratedKw: number, originalName: string) => {
    switch (ratedKw) {
      case 10:
        return 'Ultra'
      case 6:
        return 'Pro'
      case 4.2:
        return 'Plus'
      case 2:
        return 'Essential'
      default:
        return originalName
    }
  }

  // Fetch packages from API
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/afya-solar/packages')
        const data = await response.json()
        
        if (data.success && data.data && data.data.packages) {
          // Transform API data to match UI interface
          const transformedPackages: SolarPackage[] = data.data.packages.map((pkg: any) => {
            const plans = pkg.plans || []
            const cashPlan = plans.find((p: any) => p.planTypeCode === 'CASH')
            const installmentPlan = plans.find((p: any) => p.planTypeCode === 'INSTALLMENT')
            const eaasPlan = plans.find((p: any) => p.planTypeCode === 'EAAS')

            const cashPrice = cashPlan?.pricing?.cashPrice || 0
            const upfrontPercent = installmentPlan?.pricing?.defaultUpfrontPercent
              ? parseFloat(installmentPlan.pricing.defaultUpfrontPercent)
              : 0
            const upfrontAmount = cashPrice && upfrontPercent ? (upfrontPercent / 100) * cashPrice : 0
            const installmentMonths = installmentPlan?.pricing?.installmentDurationMonths || 0
            const installmentMonthly = installmentPlan?.pricing?.defaultMonthlyAmount || 0

            const specs = pkg.specs || null
            
            return {
              ...pkg,
              id: pkg.id.toString(),
              name: getPackageName(pkg.ratedKw, pkg.name),
              size: `${pkg.ratedKw} kW`,
              trueCost: cashPrice,
              cashPrice: cashPrice,
              upfrontCashPrice: cashPrice,
              whatItPowers: pkg.suitableFor || 'Healthcare facilities',
              installmentTotal: installmentMonths && installmentMonthly ? installmentMonths * installmentMonthly : 0,
              installmentUpfront: upfrontAmount,
              installmentUpfrontPercent: upfrontPercent || undefined,
              installmentBalance: cashPrice && upfrontAmount ? Math.max(cashPrice - upfrontAmount, 0) : 0,
              installmentMonths: installmentMonths || 0,
              installmentMonthly: installmentMonthly,
              paasMonthlyFee: eaasPlan?.pricing?.eaasMonthlyFee,
              solarPanels: specs?.solarPanelsDesc || `${Math.ceil(pkg.ratedKw / 0.55)} x 550W panels`,
              totalSolarCapacity: specs?.totalCapacityKw ? `${specs.totalCapacityKw} kW` : `${pkg.ratedKw} kW`,
              batteryStorage: specs?.batteryKwh ? `${specs.batteryKwh} kWh Lithium battery` : `${(pkg.ratedKw * 1.28).toFixed(2)} kWh Li-ion`,
              inverterType: specs?.inverterDesc || `${pkg.ratedKw >= 6 ? '48V' : '24V'} / ${pkg.ratedKw} kW hybrid`,
              inverterFeatures: 'MPPT, hybrid, overload protection',
              mountingStructure: specs?.mountingDesc || (pkg.ratedKw >= 6 ? 'Industrial-grade mounts' : 'Standard roof/ground mount'),
              wiringProtection: 'DC breaker protection, AC isolation, surge protection devices',
              cabling: specs?.cablingDesc || `${Math.ceil(pkg.ratedKw * 8)}m solar cable`,
              installation: 'Professional installation, commissioning & performance testing',
              remoteMonitoring: specs?.remoteMonitoringDesc || 'Optional',
              trainingProvided: specs?.trainingDesc || 'Staff operational training',
              suitableFacilityType: pkg.suitableFor || 'Healthcare facilities',
              averageDailyOutput: specs?.dailyOutputKwhMin || specs?.dailyOutputKwhMax
                ? `${specs?.dailyOutputKwhMin ?? ''}${specs?.dailyOutputKwhMin || specs?.dailyOutputKwhMax ? '-' : ''}${specs?.dailyOutputKwhMax ?? ''} kWh/day`.replace(/^-|-$|--/g, '')
                : `${Math.ceil(pkg.ratedKw * 3)}-${Math.ceil(pkg.ratedKw * 4)} kWh/day`,
              backupRuntime: specs?.backupHoursMin || specs?.backupHoursMax
                ? `${specs?.backupHoursMin ?? ''}${specs?.backupHoursMin || specs?.backupHoursMax ? '-' : ''}${specs?.backupHoursMax ?? ''} hrs`.replace(/^-|-$|--/g, '')
                : `${Math.ceil(pkg.ratedKw * 2)}-${Math.ceil(pkg.ratedKw * 3)} hrs`,
              warranty: specs?.warrantyMonths ? `${specs.warrantyMonths} Months Warranty & technical support` : '2 Years Warranty & technical support',
              includedAccessories: 'Mounts + cabling + breakers + protection devices',
              useCases: pkg.suitableFor || 'Healthcare facilities'
            }
          })
          setPackages(transformedPackages)
        } else {
          setError('Failed to load packages from server')
        }
      } catch (error) {
        console.error('Error fetching packages:', error)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [])

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId)
  }

  const handleProceedToPayment = () => {
    if (!selectedPackage) {
      return
    }
    setShowPaymentDialog(true)
  }

  const getSelectedPackageData = (): SolarPackage | null => {
    if (!selectedPackage) return null
    return packages.find(pkg => pkg.id.toString() === selectedPackage.toString()) || null
  }

  const getPaymentAmount = (): number => {
    const pkg = getSelectedPackageData()
    if (!pkg) return 0

    if (selectedPaymentPlan === "cash") {
      return pkg.cashPrice || 0
    } else if (selectedPaymentPlan === "installment") {
      return pkg.installmentUpfront || 0
    } else if (selectedPaymentPlan === "paas") {
      return pkg.paasMonthlyFee || 0
    }
    return 0
  }

  const pkg = getSelectedPackageData()

  // Auto-switch to cash plan if PaaS is selected but package doesn't support it
  useEffect(() => {
    if (pkg && selectedPaymentPlan === "paas" && !pkg.paasMonthlyFee) {
      setSelectedPaymentPlan("cash")
    }
  }, [pkg, selectedPaymentPlan])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Loading solar packages...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2 text-destructive">Error Loading Packages</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">

        {/* SELECTED PACKAGE VIEW - Shows details prominently when a package is selected */}
        {selectedPackage && pkg && (
          <div className="mb-8">
            {/* Back Button */}
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                className="flex items-center gap-2 text-sm"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to Packages
              </Button>
            </div>

            {/* Selected Package Header with Quick Info */}
            <Card className="border-primary/20 shadow-sm overflow-hidden">
              {/* Package Title Bar */}
              <div className="bg-primary text-primary-foreground p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-foreground/15 rounded-lg">
                      <Sun className="h-8 w-8" aria-hidden />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold">{pkg.name}</h2>
                      <p className="text-primary-foreground/90">{pkg.whatItPowers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/30 text-base px-4 py-1">
                      {pkg.size}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPackage(null)}
                      className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                    >
                      Change Package
                    </Button>
                  </div>
                </div>
              </div>

              {/* Payment Plan Selector */}
              <div className="p-4 bg-muted border-b border-border">
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant={selectedPaymentPlan === "cash" ? "default" : "outline"}
                    onClick={() => setSelectedPaymentPlan("cash")}
                    className="min-w-[150px] h-11 text-sm font-medium"
                  >
                    <DollarSign className="h-4 w-4 mr-2" aria-hidden />
                    Upfront Cash
                  </Button>
                  <Button
                    variant={selectedPaymentPlan === "installment" ? "default" : "outline"}
                    onClick={() => setSelectedPaymentPlan("installment")}
                    className="min-w-[150px] h-11 text-sm font-medium"
                  >
                    <Calendar className="h-4 w-4 mr-2" aria-hidden />
                    Installment Plan
                  </Button>
                  <Button
                    variant={selectedPaymentPlan === "paas" ? "default" : "outline"}
                    onClick={() => pkg.paasMonthlyFee && setSelectedPaymentPlan("paas")}
                    disabled={!pkg.paasMonthlyFee}
                    className="min-w-[150px] h-11 text-sm font-medium"
                  >
                    <Zap className="h-4 w-4 mr-2" aria-hidden />
                    Power-as-a-Service
                    {!pkg.paasMonthlyFee && " (N/A)"}
                  </Button>
                </div>
              </div>

              {/* Pricing Summary Based on Selected Plan */}
              <div className="p-6">
                {selectedPaymentPlan === "cash" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">System Value</span>
                      <p className="font-bold text-xl text-foreground">{formatCurrency(pkg.trueCost)}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-primary text-sm block mb-1">Cash Price</span>
                      <p className="font-bold text-2xl text-primary">{formatCurrency(pkg.cashPrice)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">Payment Type</span>
                      <p className="font-bold text-lg text-foreground">One-time Payment</p>
                    </div>
                  </div>
                )}

                {selectedPaymentPlan === "installment" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">Total Price</span>
                      <p className="font-bold text-lg text-foreground">{formatCurrency(pkg.installmentTotal)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">
                        Upfront ({pkg.installmentUpfrontPercent ?? 40}%)
                      </span>
                      <p className="font-bold text-lg text-foreground">{formatCurrency(pkg.installmentUpfront)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">Balance</span>
                      <p className="font-bold text-lg text-foreground">{formatCurrency(pkg.installmentBalance)}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-primary text-sm block mb-1">Monthly × {pkg.installmentMonths}</span>
                      <p className="font-bold text-2xl text-primary">{formatCurrency(pkg.installmentMonthly)}</p>
                    </div>
                  </div>
                )}

                {selectedPaymentPlan === "paas" && pkg.paasMonthlyFee && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-primary text-sm block mb-1">Upfront Cost</span>
                      <p className="font-bold text-2xl text-primary">TZS 0</p>
                      <p className="text-xs text-muted-foreground mt-1">No capital investment</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg border border-border">
                      <span className="text-secondary-foreground text-sm block mb-1">Monthly Service Fee</span>
                      <p className="font-bold text-2xl text-foreground">{formatCurrency(pkg.paasMonthlyFee)}</p>
                      <p className="text-xs text-muted-foreground mt-1">×1.2 Factor applied</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <span className="text-muted-foreground text-sm block mb-1">What&apos;s Included</span>
                      <p className="font-semibold text-sm text-foreground">Install, Own & Maintain</p>
                      <p className="text-xs text-muted-foreground mt-1">We handle everything</p>
                    </div>
                  </div>
                )}

                {/* Technical Specs Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Technical Specifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground pb-2 border-b border-border">
                      <Wrench className="h-5 w-5 text-primary" aria-hidden />
                      Technical Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Solar Panels</span>
                        <p className="font-semibold text-foreground">{pkg.solarPanels}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Total Capacity</span>
                        <p className="font-semibold text-foreground">{pkg.totalSolarCapacity}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Battery Storage</span>
                        <p className="font-semibold text-foreground">{pkg.batteryStorage}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Inverter</span>
                        <p className="font-semibold text-foreground">{pkg.inverterType}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg col-span-2">
                        <span className="text-muted-foreground text-xs block">Inverter Features</span>
                        <p className="font-semibold text-foreground">{pkg.inverterFeatures}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Mounting</span>
                        <p className="font-semibold text-foreground">{pkg.mountingStructure}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Cabling</span>
                        <p className="font-semibold text-foreground">{pkg.cabling}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features & Support */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground pb-2 border-b border-border">
                      <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                      Features & Support
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Daily Output</span>
                        <p className="font-semibold text-foreground">{pkg.averageDailyOutput}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Backup Runtime</span>
                        <p className="font-semibold text-foreground">{pkg.backupRuntime}</p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-primary text-xs block">Warranty</span>
                        <p className="font-semibold text-primary">{pkg.warranty}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Remote Monitoring</span>
                        <p className="font-semibold text-foreground">{pkg.remoteMonitoring}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Training</span>
                        <p className="font-semibold text-foreground">{pkg.trainingProvided}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-xs block">Best For</span>
                        <p className="font-semibold text-foreground">{pkg.suitableFacilityType}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg col-span-2">
                        <span className="text-muted-foreground text-xs block">Installation</span>
                        <p className="font-semibold text-foreground">{pkg.installation}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed to Payment Button */}
                <div className="mt-6 pt-6 border-t border-border flex justify-end">
                  <Button
                    size="lg"
                    className="text-base font-semibold"
                    onClick={handleProceedToPayment}
                  >
                    Proceed to Payment
                    <ArrowRight className="h-5 w-5 ml-2" aria-hidden />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Other Packages - Compact Horizontal Selector */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Other Available Packages:</h3>
              <div className="flex flex-wrap gap-3">
                {packages.filter(p => p.id.toString() !== selectedPackage.toString()).map((otherPkg) => (
                  <Button
                    key={otherPkg.id.toString()}
                    variant="outline"
                    onClick={() => handleSelectPackage(otherPkg.id.toString())}
                    className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                  >
                    <span className="font-semibold text-foreground">{otherPkg.size}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(otherPkg.cashPrice || 0)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PACKAGE SELECTION VIEW - Shows all packages when none selected */}
        {!selectedPackage && (
          <>
            {packages.length === 0 ? (
              <EmptyState
                icon={<Sun />}
                title="No Solar Packages Available"
                description="There are currently no solar packages configured. Please contact the administrator to set up package options."
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {packages.map((pkgItem) => (
              <Card
                key={pkgItem.id.toString()}
                className="relative cursor-pointer transition-shadow hover:shadow-md border-border"
                onClick={() => handleSelectPackage(pkgItem.id.toString())}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl font-semibold text-foreground">{pkgItem.name}</CardTitle>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {pkgItem.size}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {pkgItem.whatItPowers}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <div className="space-y-2 bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cash Price:</span>
                      <span className="font-bold text-primary text-base">{formatCurrency(pkgItem.cashPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Installment:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(pkgItem.installmentMonthly)}/mo</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">PaaS:</span>
                      <span className="font-semibold text-foreground">
                        {pkgItem.paasMonthlyFee ? `${formatCurrency(pkgItem.paasMonthlyFee)}/mo` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-2.5 pt-3 border-t border-border">
                    <div className="flex items-start gap-2.5 text-xs">
                      <Battery className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden />
                      <span className="text-muted-foreground leading-relaxed">{pkgItem.batteryStorage}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs">
                      <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden />
                      <span className="text-muted-foreground leading-relaxed">{pkgItem.totalSolarCapacity}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden />
                      <span className="text-muted-foreground leading-relaxed">{pkgItem.warranty}</span>
                    </div>
                  </div>

                  {/* Select Button */}
                  <Button
                    className="w-full mt-4 h-11 text-base font-semibold"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectPackage(pkgItem.id.toString())
                    }}
                  >
                    <Eye className="h-5 w-5 mr-2" aria-hidden />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </>
        )}

        {/* Payment Dialog */}
        {showPaymentDialog && pkg && (
          <ServiceAccessPaymentDialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            serviceName="afya-solar"
            serviceDisplayName="Afya Solar"
            amount={getPaymentAmount()}
            packageId={pkg.id.toString()}
            packageName={pkg.name}
            paymentPlan={selectedPaymentPlan}
            packageMetadata={{
              size: pkg.size,
              trueCost: pkg.trueCost,
              cashPrice: pkg.cashPrice,
              whatItPowers: pkg.whatItPowers,
              installmentTotal: pkg.installmentTotal,
              installmentMonths: pkg.installmentMonths,
              installmentMonthly: pkg.installmentMonthly,
            }}
            onPaymentComplete={() => {
              if (onPackageSelected) {
                onPackageSelected(selectedPackage!)
              }
              // Redirect to dashboard after payment
              router.push("/services/afya-solar")
            }}
          />
        )}
      </div>
    </div>
  )
}
