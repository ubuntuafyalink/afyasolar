import { ManagementPanelPaymentHistory } from '@/components/management-panel/management-panel-payment-history'

export default function PaymentHistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Payment History</h1>
      <p className="text-muted-foreground mb-6">Recent payments and billing activity across installation sites.</p>
      <ManagementPanelPaymentHistory />
    </div>
  )
}
