import type { AfyaSolarSubscriber } from '@/lib/db/afyasolar-subscribers-schema'

// Contract shape consumed by the admin Contract Management UI. Kept identical to the
// previous mock response so the existing component renders unchanged.
export interface Contract {
  id: string
  contractNumber: string
  facilityId: string
  facilityName: string
  packageName: string
  planType: 'cash' | 'installment' | 'paas'
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'suspended'
  startDate: string
  endDate?: string
  billingCycle: 'monthly' | 'quarterly' | 'annually'
  totalValue: number
  currency: string
  autoRenew: boolean
  terms: {
    duration: number
    durationUnit: 'months' | 'years'
    maintenanceIncluded: boolean
    supportLevel: 'basic' | 'standard' | 'premium'
    warrantyPeriod: number
  }
  documents: Array<{
    id: string
    name: string
    type: 'contract' | 'invoice' | 'receipt' | 'amendment'
    url: string
    uploadedAt: string
  }>
  createdAt: string
  updatedAt: string
  signedAt?: string
}

export function mapPlanType(planType: string | null | undefined): Contract['planType'] {
  switch ((planType || '').toUpperCase()) {
    case 'INSTALLMENT':
      return 'installment'
    case 'PAAS':
      return 'paas'
    case 'CASH':
    default:
      return 'cash'
  }
}

// Map a subscriber's subscription/contract status to the UI contract status vocabulary.
export function mapContractStatus(
  subscriptionStatus: string | null | undefined,
  contractStatus: string | null | undefined,
): Contract['status'] {
  const s = (subscriptionStatus || contractStatus || '').toLowerCase()
  switch (s) {
    case 'active':
      return 'active'
    case 'expired':
    case 'completed':
      return 'expired'
    case 'suspended':
      return 'suspended'
    case 'cancelled':
    case 'terminated':
      return 'terminated'
    case 'pending':
    case 'draft':
      return 'draft'
    default:
      return 'active'
  }
}

// Reverse map: a UI contract status -> persisted subscriber subscription/contract status.
export function reverseContractStatus(status: string): {
  subscriptionStatus: string
  contractStatus: string
} {
  switch (status) {
    case 'active':
      return { subscriptionStatus: 'active', contractStatus: 'active' }
    case 'expired':
      return { subscriptionStatus: 'expired', contractStatus: 'completed' }
    case 'suspended':
      return { subscriptionStatus: 'suspended', contractStatus: 'active' }
    case 'terminated':
      return { subscriptionStatus: 'cancelled', contractStatus: 'terminated' }
    case 'draft':
      return { subscriptionStatus: 'pending', contractStatus: 'active' }
    default:
      return { subscriptionStatus: status, contractStatus: status }
  }
}

function mapBillingCycle(cycle: string | null | undefined): Contract['billingCycle'] {
  switch ((cycle || '').toLowerCase()) {
    case 'yearly':
    case 'annually':
      return 'annually'
    case 'quarterly':
      return 'quarterly'
    case 'monthly':
    default:
      return 'monthly'
  }
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/**
 * Build the UI Contract object from a real afyasolar_subscribers row.
 * Fields with no dedicated DB column (terms.supportLevel/warrantyPeriod, documents)
 * use deterministic defaults derived from the plan; they are not fabricated metrics.
 */
export function mapSubscriberToContract(row: AfyaSolarSubscriber): Contract {
  const planType = mapPlanType(row.planType)
  const startIso = toIso(row.subscriptionStartDate) || new Date().toISOString()
  const createdIso = toIso(row.createdAt) || startIso
  const updatedIso = toIso(row.updatedAt) || createdIso
  const duration = Number(row.contractDurationMonths ?? row.minimumTermMonths ?? 12)

  return {
    id: String(row.id),
    contractNumber: row.transactionId || `SOL-${String(row.id).padStart(4, '0')}`,
    facilityId: row.facilityId,
    facilityName: row.facilityName,
    packageName: row.packageName,
    planType,
    status: mapContractStatus(row.subscriptionStatus, row.contractStatus),
    startDate: startIso,
    endDate: toIso(row.subscriptionEndDate),
    billingCycle: mapBillingCycle(row.billingCycle),
    totalValue: Number(row.totalPackagePrice ?? 0),
    currency: 'TZS',
    autoRenew: Boolean(row.autoRenew),
    terms: {
      duration: Number.isNaN(duration) ? 12 : duration,
      durationUnit: 'months',
      maintenanceIncluded: planType !== 'cash',
      supportLevel: 'standard',
      warrantyPeriod: 24,
    },
    documents: [],
    createdAt: createdIso,
    updatedAt: updatedIso,
    signedAt: toIso(row.paymentCompletedAt) || (row.isPaymentCompleted ? startIso : undefined),
  }
}
