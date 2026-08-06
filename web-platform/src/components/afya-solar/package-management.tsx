'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { m } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { AnimatedNumber } from '@/components/ui/animated-number'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  CheckCircle,
  PauseCircle,
  Gauge,
  Save,
  Loader2,
  Search,
  RefreshCw,
  X,
} from 'lucide-react'
import { LazyMotionProvider } from '@/components/motion/lazy-motion-provider'
import { fadeInUp, scaleIn, staggerContainer } from '@/components/motion/variants'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/lib/dashboard/facility-ui'

interface SolarPackage {
  id: number
  code: string
  name: string
  ratedKw: number
  suitableFor: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  plans: {
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
    }
  }[]
}

interface PackageFormData {
  code: string
  name: string
  ratedKw: number
  suitableFor: string
  isActive: boolean
}

const PLAN_BADGE: Record<string, string> = {
  CASH: 'border-success/40 bg-success/15 text-success-foreground',
  INSTALLMENT: 'border-primary/40 bg-primary/10 text-primary',
  EAAS: 'border-warning/40 bg-warning/15 text-warning-foreground',
}

function planPrice(planTypeCode: string, pricing: SolarPackage['plans'][number]['pricing']): string {
  if (planTypeCode === 'CASH' && pricing.cashPrice) return `TZS ${pricing.cashPrice.toLocaleString()}`
  if (planTypeCode === 'INSTALLMENT' && pricing.defaultMonthlyAmount) return `TZS ${pricing.defaultMonthlyAmount.toLocaleString()}/mo`
  if (planTypeCode === 'EAAS' && pricing.eaasMonthlyFee) return `TZS ${pricing.eaasMonthlyFee.toLocaleString()}/mo`
  return '—'
}

const EMPTY_FORM: PackageFormData = { code: '', name: '', ratedKw: 0, suitableFor: '', isActive: true }

export default function AfyaSolarPackageManagement() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<SolarPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingPackage, setEditingPackage] = useState<SolarPackage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SolarPackage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState<PackageFormData>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const getPackageName = (ratedKw: number, originalName: string) => {
    switch (ratedKw) {
      case 10: return 'Ultra'
      case 6: return 'Pro'
      case 4.2: return 'Plus'
      case 2: return 'Essential'
      default: return originalName
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/afya-solar/packages')
      const data = await response.json()
      const payload = data?.data
      const list: SolarPackage[] = Array.isArray(payload?.packages)
        ? payload.packages
        : Array.isArray(payload)
          ? payload
          : Array.isArray(data)
            ? data
            : []
      setPackages(list)
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreatePackage = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/afya-solar/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: formData,
          specs: { panelType: 'MONO', panelCapacity: formData.ratedKw, inverterType: 'STRING', mountingType: 'ROOFTOP', warrantyYears: 10 },
          plans: [
            { planTypeCode: 'CASH', currency: 'TZS', pricing: { cashPrice: 1000000, includesShipping: true, includesInstallation: true, includesCommissioning: true, includesMaintenance: false } },
            { planTypeCode: 'INSTALLMENT', currency: 'TZS', pricing: { installmentDurationMonths: 12, defaultUpfrontPercent: '20.00', defaultMonthlyAmount: 100000, includesShipping: true, includesInstallation: true, includesCommissioning: true, includesMaintenance: false } },
            { planTypeCode: 'EAAS', currency: 'TZS', pricing: { eaasMonthlyFee: 50000, eaasBillingModel: 'FIXED_MONTHLY', includesShipping: true, includesInstallation: true, includesCommissioning: true, includesMaintenance: true } },
          ],
        }),
      })
      if (response.ok) {
        setIsCreateDialogOpen(false)
        setFormData(EMPTY_FORM)
        fetchPackages()
        toast({ title: 'Package created', description: `${formData.name} has been created successfully.`, duration: 3000 })
      } else {
        const errorData = await response.json()
        toast({ title: 'Creation failed', description: errorData.error || 'Failed to create package. Please try again.', variant: 'destructive', duration: 5000 })
      }
    } catch (error) {
      console.error('Error creating package:', error)
      toast({ title: 'Creation failed', description: 'Network error. Please try again.', variant: 'destructive', duration: 5000 })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleActive = async (packageId: number, isActive: boolean) => {
    // Optimistic UI; reconcile from the server afterwards.
    setPackages((prev) => prev.map((p) => (p.id === packageId ? { ...p, isActive: !isActive } : p)))
    try {
      await fetch(`/api/afya-solar/packages/${packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchPackages()
    } catch (error) {
      console.error('Error toggling package:', error)
      fetchPackages()
    }
  }

  const performDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/afya-solar/packages/${deleteTarget.id}`, { method: 'DELETE' })
      if (response.ok) {
        setDeleteTarget(null)
        fetchPackages()
        toast({ title: 'Package deleted', description: 'Package has been deleted successfully.', duration: 3000 })
      } else {
        const errorData = await response.json()
        toast({ title: 'Deletion failed', description: errorData.error || 'Failed to delete package. Please try again.', variant: 'destructive', duration: 5000 })
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      toast({ title: 'Deletion failed', description: 'Network error. Please try again.', variant: 'destructive', duration: 5000 })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditPackage = (pkg: SolarPackage) => {
    setEditingPackage(pkg)
    setFormData({ code: pkg.code, name: pkg.name, ratedKw: pkg.ratedKw, suitableFor: pkg.suitableFor, isActive: pkg.isActive })
    setIsEditDialogOpen(true)
  }

  const handleUpdatePackage = async () => {
    if (!editingPackage) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/afya-solar/packages/${editingPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.code, name: formData.name, ratedKw: formData.ratedKw, suitableFor: formData.suitableFor, isActive: formData.isActive }),
      })
      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingPackage(null)
        setFormData(EMPTY_FORM)
        fetchPackages()
        toast({ title: 'Package updated', description: `${formData.name} has been updated successfully.`, duration: 3000 })
      } else {
        const errorData = await response.json()
        toast({ title: 'Update failed', description: errorData.error || 'Failed to update package. Please try again.', variant: 'destructive', duration: 5000 })
      }
    } catch (error) {
      console.error('Error updating package:', error)
      toast({ title: 'Update failed', description: 'Network error. Please try again.', variant: 'destructive', duration: 5000 })
    } finally {
      setIsUpdating(false)
    }
  }

  const metrics = useMemo(() => {
    const active = packages.filter((p) => p.isActive).length
    return {
      total: packages.length,
      active,
      inactive: packages.length - active,
      capacity: packages.reduce((s, p) => s + (Number(p.ratedKw) || 0), 0),
    }
  }, [packages])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return packages.filter((p) => {
      if (activeFilter === 'active' && !p.isActive) return false
      if (activeFilter === 'inactive' && p.isActive) return false
      if (q && ![p.name, p.code, p.suitableFor].some((v) => String(v || '').toLowerCase().includes(q))) return false
      return true
    })
  }, [packages, search, activeFilter])

  const hasFilters = search !== '' || activeFilter !== 'all'

  // Shared form fields for the create/edit dialogs.
  const formFields = (idPrefix: string) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-code`}>Package code</Label>
          <Input id={`${idPrefix}-code`} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. SOLAR-6KW" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`}>Package name</Label>
          <Input id={`${idPrefix}-name`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Pro" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-ratedKw`}>Rated power (kW)</Label>
          <Input id={`${idPrefix}-ratedKw`} type="number" value={formData.ratedKw} onChange={(e) => setFormData({ ...formData, ratedKw: Number(e.target.value) })} placeholder="6" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-suitableFor`}>Suitable for</Label>
          <Input id={`${idPrefix}-suitableFor`} value={formData.suitableFor} onChange={(e) => setFormData({ ...formData, suitableFor: e.target.value })} placeholder="e.g. Health centre" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id={`${idPrefix}-active`} checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} />
        <Label htmlFor={`${idPrefix}-active`}>Active package</Label>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="space-y-2 p-5"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="space-y-3 p-5"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-44" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Package className="size-6 text-primary" aria-hidden />
              Package Management
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage solar package offerings and pricing plans.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchPackages} disabled={refreshing}>
              <RefreshCw className={cn('mr-1 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) setFormData(EMPTY_FORM) }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New package</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create new package</DialogTitle>
                  <DialogDescription>Add a new solar package with specifications and default pricing plans.</DialogDescription>
                </DialogHeader>
                {formFields('create')}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>Cancel</Button>
                  <Button onClick={handleCreatePackage} disabled={isCreating || !formData.name.trim()}>
                    {isCreating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Create package
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary */}
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <m.div variants={scaleIn}><StatCard title="Total packages" meta="Offerings" icon={<Package />} accent="primary" value={<AnimatedNumber value={metrics.total} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Active" meta="Available to facilities" icon={<CheckCircle />} accent="success" value={<AnimatedNumber value={metrics.active} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Inactive" meta="Hidden / retired" icon={<PauseCircle />} accent={metrics.inactive > 0 ? 'warning' : 'muted'} value={<AnimatedNumber value={metrics.inactive} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Total capacity" meta="Sum of rated power" icon={<Gauge />} accent="solar" value={<AnimatedNumber value={metrics.capacity} decimals={1} suffix=" kW" />} /></m.div>
        </m.div>

        {/* Toolbar */}
        <m.div variants={fadeInUp} initial="hidden" animate="show" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-56 pl-9" placeholder="Search name, code, suitable for…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search packages" />
          </div>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')} aria-label="Filter by status" className={cn('h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground', FOCUS_RING)}>
            <option value="all">All packages</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(''); setActiveFilter('all') }}>
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {packages.length}</span>
        </m.div>

        {/* Packages grid */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Package className="size-10 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{packages.length === 0 ? 'No packages yet.' : 'No packages match your filters.'}</p>
              {packages.length === 0 && <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create first package</Button>}
            </CardContent>
          </Card>
        ) : (
          <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pkg) => (
              <m.div key={pkg.id} variants={scaleIn}>
                <Card className={cn('h-full transition-shadow hover:shadow-md', !pkg.isActive && 'opacity-70')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="size-5" aria-hidden />
                        </span>
                        <CardTitle className="text-lg">{getPackageName(pkg.ratedKw, pkg.name)}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={pkg.isActive ? 'border-success/40 bg-success/15 text-success-foreground' : 'border-border bg-muted text-muted-foreground'}>
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={pkg.isActive} onCheckedChange={() => handleToggleActive(pkg.id, pkg.isActive)} aria-label={`Toggle ${pkg.name} active`} />
                      </div>
                    </div>
                    <CardDescription>{pkg.code} · {pkg.ratedKw} kW · {pkg.suitableFor}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Available plans</h4>
                      <div className="space-y-2">
                        {(pkg.plans ?? []).map((plan) => (
                          <div key={plan.id} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 p-2">
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', PLAN_BADGE[plan.planTypeCode] ?? 'border-border bg-muted text-muted-foreground')}>
                              {plan.planTypeCode}
                            </span>
                            <span className="flex items-center gap-1 text-sm tabular-nums text-foreground">
                              <DollarSign className="size-3.5 text-muted-foreground" aria-hidden />
                              {planPrice(plan.planTypeCode, plan.pricing)}
                            </span>
                          </div>
                        ))}
                        {(pkg.plans ?? []).length === 0 && <p className="text-xs text-muted-foreground">No pricing plans.</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleEditPackage(pkg)}>
                        <Edit className="size-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pkg)}>
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </m.div>
            ))}
          </m.div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { setEditingPackage(null); setFormData(EMPTY_FORM) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit package</DialogTitle>
            <DialogDescription>Update the solar package details and configuration.</DialogDescription>
          </DialogHeader>
          {formFields('edit')}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdatePackage} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Update package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete package?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `"${getPackageName(deleteTarget.ratedKw, deleteTarget.name)}" (${deleteTarget.code}) will be permanently removed. This cannot be undone.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={performDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LazyMotionProvider>
  )
}
