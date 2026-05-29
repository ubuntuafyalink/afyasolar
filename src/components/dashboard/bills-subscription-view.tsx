"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, cn } from "@/lib/utils"

const DEFAULT_PANEL_CARD_CLASS = "shadow-sm border-border bg-card"
const DEFAULT_SECTION_TITLE_CLASS = "text-base font-semibold text-foreground"
const DEFAULT_META_TEXT_CLASS = "text-xs text-muted-foreground"

export interface BillsSubscriptionViewProps {
  /** Afya Solar subscriber record for the facility. */
  afyaSolarSubscriber: any | null
  /** Facility energy bills (utility bills). */
  bills?: any[] | null
  /** Service access payment rows for "afya-solar". */
  serviceAccessPayments?: any[] | null
  /** Afya Solar invoice requests (admin-approved billing). */
  invoiceRequests?: any[] | null
  /** Facility record (creditBalance, monthlyConsumption, paymentModel). */
  facility?: any | null
  /** Show "Pay Now" CTA buttons (facility user only). */
  canShowPayNow?: boolean
  /** Called when a "Pay Now" button is clicked. */
  onPayClick?: () => void
  /** Render the "Refresh" CTA in the empty-state card. */
  onReload?: () => void
  /** Render the "Go to Afya Solar" CTA in the empty-state card. */
  onNavigateToAfyaSolar?: () => void
  /** Style overrides so the view inherits the parent dashboard look. */
  panelCardClass?: string
  sectionTitleClass?: string
  metaTextClass?: string
}

export function BillsSubscriptionView({
  afyaSolarSubscriber,
  bills,
  serviceAccessPayments,
  invoiceRequests,
  facility,
  canShowPayNow = false,
  onPayClick,
  onReload,
  onNavigateToAfyaSolar,
  panelCardClass = DEFAULT_PANEL_CARD_CLASS,
  sectionTitleClass = DEFAULT_SECTION_TITLE_CLASS,
  metaTextClass = DEFAULT_META_TEXT_CLASS,
}: BillsSubscriptionViewProps) {
  const safeBills = bills ?? []
  const safeServiceAccessPayments = serviceAccessPayments ?? []
  const safeInvoiceRequests = invoiceRequests ?? []

  const completedServiceAccessPayments = useMemo(
    () =>
      safeServiceAccessPayments.filter((p: any) => p?.status === "completed"),
    [safeServiceAccessPayments],
  )

  const pendingServiceAccessPayments = useMemo(
    () =>
      safeServiceAccessPayments.filter(
        (p: any) => p?.status && p.status !== "completed",
      ),
    [safeServiceAccessPayments],
  )

  const renderPayButton = (key: string) =>
    canShowPayNow && onPayClick ? (
      <Button
        key={key}
        size="sm"
        onClick={onPayClick}
      >
        <DollarSign className="w-4 h-4 mr-2" aria-hidden />
        Pay Now
      </Button>
    ) : null

  return (
    <div className="space-y-6">
      {/* Bills Section */}
      <Card className={panelCardClass}>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", sectionTitleClass)}>
            <Receipt className="w-5 h-5 text-primary" aria-hidden />
            Bills
          </CardTitle>
          <CardDescription className={metaTextClass}>
            View bills and manage payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Package Information */}
          {afyaSolarSubscriber ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Solar Package
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Package</p>
                      <p className="font-medium text-foreground">
                        {afyaSolarSubscriber.packageName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">System Size</p>
                      <p className="font-medium text-foreground">
                        {afyaSolarSubscriber.packageRatedKw} kW
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plan Type</p>
                      <p className="font-medium text-foreground">
                        {afyaSolarSubscriber.planType === "CASH"
                          ? "One-Time Payment"
                          : afyaSolarSubscriber.planType === "INSTALLMENT"
                            ? "Installment Plan"
                            : afyaSolarSubscriber.planType === "PAAS"
                              ? "Pay-As-You-Go"
                              : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          afyaSolarSubscriber.subscriptionStatus === "active"
                            ? "bg-success/15 text-success"
                            : afyaSolarSubscriber.subscriptionStatus ===
                                "expired"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {afyaSolarSubscriber.subscriptionStatus
                          ? afyaSolarSubscriber.subscriptionStatus
                              .charAt(0)
                              .toUpperCase() +
                            afyaSolarSubscriber.subscriptionStatus.slice(1)
                          : "Unknown"}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Package Health</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            afyaSolarSubscriber.systemStatus === "active"
                              ? "bg-success"
                              : "bg-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium text-foreground">
                          {afyaSolarSubscriber.systemHealth === "optimal"
                            ? "Optimal"
                            : afyaSolarSubscriber.systemHealth === "warning"
                              ? "Warning"
                              : "Critical"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {afyaSolarSubscriber.systemHealth === "optimal"
                          ? "System performing well"
                          : afyaSolarSubscriber.systemHealth === "warning"
                            ? "System needs attention"
                            : "System requires immediate attention"}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Installation Date</p>
                      <p className="font-medium text-foreground">
                        {afyaSolarSubscriber.installationDate
                          ? new Date(
                              afyaSolarSubscriber.installationDate,
                            ).toLocaleDateString()
                          : "Not installed"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">
                      Next Service Due
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {afyaSolarSubscriber.nextBillingDate
                        ? new Date(
                            afyaSolarSubscriber.nextBillingDate,
                          ).toLocaleDateString()
                        : "Calculate based on plan"}
                    </p>
                  </div>
                  {canShowPayNow && onPayClick ? (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={onPayClick}
                    >
                      <DollarSign className="w-4 h-4 mr-2" aria-hidden />
                      Pay Now
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-warning-foreground" aria-hidden />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  No Solar Package Found
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Subscription details are not available yet. If a payment was
                  made recently, wait a moment and refresh.
                </p>
                <div className="flex items-center justify-center gap-2">
                  {onReload ? (
                    <Button size="sm" variant="outline" onClick={onReload}>
                      Refresh
                    </Button>
                  ) : null}
                  {onNavigateToAfyaSolar ? (
                    <Button
                      size="sm"
                      onClick={onNavigateToAfyaSolar}
                    >
                      Go to Afya Solar
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Next Month's Payment */}
          {afyaSolarSubscriber && (
            <div className="bg-secondary border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Next Payment Information
              </h4>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {afyaSolarSubscriber.planType === "CASH" &&
                    afyaSolarSubscriber.totalPackagePrice
                      ? formatCurrency(afyaSolarSubscriber.totalPackagePrice)
                      : afyaSolarSubscriber.planType === "INSTALLMENT" &&
                          afyaSolarSubscriber.monthlyPaymentAmount
                        ? formatCurrency(
                            afyaSolarSubscriber.monthlyPaymentAmount,
                          )
                        : afyaSolarSubscriber.planType === "PAAS" &&
                            afyaSolarSubscriber.monthlyPaymentAmount
                          ? formatCurrency(
                              afyaSolarSubscriber.monthlyPaymentAmount,
                            )
                          : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {afyaSolarSubscriber.planType === "CASH"
                      ? "One-time payment"
                      : afyaSolarSubscriber.planType === "INSTALLMENT"
                        ? "Monthly installment"
                        : afyaSolarSubscriber.planType === "PAAS"
                          ? "Monthly service fee"
                          : "Payment amount"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-foreground">
                    {afyaSolarSubscriber.paymentMethod || "Not set"}
                  </p>
                </div>
              </div>

              {afyaSolarSubscriber.nextBillingDate && (
                <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Days Until Payment
                      </p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const now = new Date()
                          const nextBilling = new Date(
                            afyaSolarSubscriber.nextBillingDate,
                          )
                          const daysUntil = Math.ceil(
                            (nextBilling.getTime() - now.getTime()) /
                              (1000 * 60 * 60 * 24),
                          )
                          return (
                            <>
                              <span
                                className={`text-2xl font-bold ${
                                  daysUntil > 7
                                    ? "text-success"
                                    : daysUntil > 0
                                      ? "text-warning-foreground"
                                      : "text-destructive"
                                }`}
                              >
                                {daysUntil > 0 ? daysUntil : 0}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {daysUntil === 1 ? "day" : "days"}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(() => {
                          const now = new Date()
                          const nextBilling = new Date(
                            afyaSolarSubscriber.nextBillingDate,
                          )
                          const daysUntil = Math.ceil(
                            (nextBilling.getTime() - now.getTime()) /
                              (1000 * 60 * 60 * 24),
                          )
                          if (daysUntil <= 0) return "bg-destructive/10 text-destructive"
                          if (daysUntil <= 7)
                            return "bg-warning/15 text-warning-foreground"
                          return "bg-success/15 text-success"
                        })()}`}
                      >
                        {(() => {
                          const now = new Date()
                          const nextBilling = new Date(
                            afyaSolarSubscriber.nextBillingDate,
                          )
                          const daysUntil = Math.ceil(
                            (nextBilling.getTime() - now.getTime()) /
                              (1000 * 60 * 60 * 24),
                          )
                          if (daysUntil <= 0) return "Payment overdue"
                          if (daysUntil <= 7) return "Payment due soon"
                          return "Payment on schedule"
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Due date:{" "}
                    {new Date(
                      afyaSolarSubscriber.nextBillingDate,
                    ).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing Summary (subscriber view) */}
          {afyaSolarSubscriber && (
            <div className="bg-muted border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Billing Summary
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Credit Balance</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.remainingBalance !== undefined
                      ? formatCurrency(afyaSolarSubscriber.remainingBalance)
                      : formatCurrency(0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Consumption</p>
                  <p className="font-medium text-foreground">
                    {facility?.monthlyConsumption
                      ? formatCurrency(Number(facility.monthlyConsumption))
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Model</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.planType || "Not Set"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Installment Schedule */}
          {afyaSolarSubscriber &&
            afyaSolarSubscriber.planType === "INSTALLMENT" && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Installment Schedule
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Contract</p>
                    <p className="font-medium text-foreground">
                      {afyaSolarSubscriber.totalPackagePrice
                        ? formatCurrency(afyaSolarSubscriber.totalPackagePrice)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining Balance</p>
                    <p className="font-medium text-foreground">
                      {afyaSolarSubscriber.remainingBalance !== undefined
                        ? formatCurrency(afyaSolarSubscriber.remainingBalance)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-warning h-2 rounded-full transition-all duration-300"
                        style={{
                          width:
                            afyaSolarSubscriber.totalPackagePrice &&
                            afyaSolarSubscriber.remainingBalance !== undefined
                              ? `${
                                  ((afyaSolarSubscriber.totalPackagePrice -
                                    afyaSolarSubscriber.remainingBalance) /
                                    afyaSolarSubscriber.totalPackagePrice) *
                                  100
                                }%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* PAAS Service Details */}
          {afyaSolarSubscriber && afyaSolarSubscriber.planType === "PAAS" && (
            <div className="bg-muted border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Service Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contract Status</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.contractStatus || "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing Model</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.billingModel || "Fixed Monthly"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minimum Term</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.minimumTermMonths || 12} months
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auto-renew</p>
                  <p className="font-medium text-foreground">
                    {afyaSolarSubscriber.autoRenew ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Facility Billing Summary */}
          <div className="bg-muted border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Billing Summary
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Credit Balance</p>
                <p className="font-medium text-foreground">
                  {facility?.creditBalance
                    ? formatCurrency(facility.creditBalance)
                    : "TZS 0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Consumption</p>
                <p className="font-medium text-foreground">
                  {facility?.monthlyConsumption
                    ? `${facility.monthlyConsumption} kWh`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Model</p>
                <p className="font-medium text-foreground">
                  {facility?.paymentModel || "Not Set"}
                </p>
              </div>
            </div>
          </div>

          {/* Bills list */}
          {safeBills.length > 0 && (
            <div className="space-y-4">
              {safeBills.slice(0, 5).map((bill: any) => (
                <div
                  key={bill.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {new Date(bill.periodStart).toLocaleDateString()} -{" "}
                        {new Date(bill.periodEnd).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Period:{" "}
                        {Math.ceil(
                          (new Date(bill.periodEnd).getTime() -
                            new Date(bill.periodStart).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(bill.totalCost)}
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          bill.status === "paid"
                            ? "bg-success/15 text-success"
                            : bill.status === "overdue"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/15 text-warning-foreground"
                        }`}
                      >
                        {bill.status.charAt(0).toUpperCase() +
                          bill.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Consumption</p>
                      <p className="font-medium text-foreground">{bill.totalConsumption} kWh</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rate</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(
                          Number(bill.totalCost) /
                            Number(bill.totalConsumption),
                        )}
                        /kWh
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p
                        className={`font-medium ${
                          new Date(bill.dueDate) < new Date()
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {new Date(bill.dueDate).toLocaleDateString()}
                        {new Date(bill.dueDate) < new Date() && " (Overdue)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-2" aria-hidden />
                        View Details
                      </Button>
                      {bill.status !== "paid" ? renderPayButton(`pay-${bill.id}`) : null}
                      <Button size="sm" variant="outline" disabled>
                        <Download className="w-4 h-4 mr-2" aria-hidden />
                        Download
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bill ID: {bill.id}
                    </div>
                  </div>
                </div>
              ))}
              {safeBills.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View All Bills ({safeBills.length - 5} more)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className={panelCardClass}>
        <CardHeader>
          <CardTitle className={sectionTitleClass}>Payment History</CardTitle>
          <CardDescription className={metaTextClass}>
            Afya Solar subscription payments and invoice requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {safeServiceAccessPayments.length > 0 ||
          safeInvoiceRequests.length > 0 ? (
            <div className="space-y-6">
              {completedServiceAccessPayments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-foreground flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-primary" aria-hidden />
                      Completed Payments
                    </h4>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {completedServiceAccessPayments.length} transaction
                      {completedServiceAccessPayments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {completedServiceAccessPayments
                      .slice(0, 5)
                      .map((payment: any) => (
                        <div
                          key={payment.id}
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  payment.status === "completed"
                                    ? "bg-success"
                                    : payment.status === "failed"
                                      ? "bg-destructive"
                                      : "bg-warning"
                                }`}
                              />
                              <div>
                                <p className="text-lg font-semibold text-foreground">
                                  {formatCurrency(payment.amount)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payment.paymentMethod
                                    ? payment.paymentMethod
                                        .charAt(0)
                                        .toUpperCase() +
                                      payment.paymentMethod.slice(1)
                                    : "Unknown"}{" "}
                                  •{" "}
                                  {new Date(
                                    payment.createdAt,
                                  ).toLocaleDateString()}
                                  {payment.paidAt &&
                                    ` • Paid: ${new Date(
                                      payment.paidAt,
                                    ).toLocaleDateString()}`}
                                </p>
                                {payment.packageName && (
                                  <p className="text-sm text-muted-foreground">
                                    Package: {payment.packageName}{" "}
                                    {payment.paymentPlan &&
                                      `(${payment.paymentPlan})`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  payment.status === "completed"
                                    ? "bg-success/15 text-success"
                                    : payment.status === "failed"
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-warning/15 text-warning-foreground"
                                }`}
                              >
                                {payment.status.charAt(0).toUpperCase() +
                                  payment.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-border">
                            <div className="text-xs text-muted-foreground">
                              Transaction ID: {payment.transactionId || "N/A"}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" disabled>
                                <Receipt className="w-4 h-4 mr-2" aria-hidden />
                                Receipt
                              </Button>
                              <Button size="sm" variant="outline" disabled>
                                <Download className="w-4 h-4 mr-2" aria-hidden />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {pendingServiceAccessPayments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-foreground flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-warning-foreground" aria-hidden />
                      Pending / Failed
                    </h4>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {pendingServiceAccessPayments.length} transaction
                      {pendingServiceAccessPayments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingServiceAccessPayments
                      .slice(0, 5)
                      .map((payment: any) => (
                        <div
                          key={payment.id}
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  payment.status === "failed"
                                    ? "bg-destructive"
                                    : "bg-warning"
                                }`}
                              />
                              <div>
                                <p className="text-lg font-semibold text-foreground">
                                  {formatCurrency(payment.amount)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payment.paymentMethod
                                    ? payment.paymentMethod
                                        .charAt(0)
                                        .toUpperCase() +
                                      payment.paymentMethod.slice(1)
                                    : "Unknown"}{" "}
                                  •{" "}
                                  {new Date(
                                    payment.createdAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  payment.status === "failed"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/15 text-warning-foreground"
                                }`}
                              >
                                {String(payment.status || "pending")
                                  .charAt(0)
                                  .toUpperCase() +
                                  String(payment.status || "pending").slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-border">
                            <div className="text-xs text-muted-foreground">
                              Transaction ID: {payment.transactionId || "N/A"}
                            </div>
                            <div className="flex gap-2">
                              {renderPayButton(`pay-pending-${payment.id}`)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {safeInvoiceRequests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-foreground flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-primary" aria-hidden />
                      Invoice Requests
                    </h4>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {safeInvoiceRequests.length} request
                      {safeInvoiceRequests.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {safeInvoiceRequests.slice(0, 5).map((invoice: any) => (
                      <div
                        key={invoice.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                invoice.status === "approved"
                                  ? "bg-success"
                                  : invoice.status === "rejected"
                                    ? "bg-destructive"
                                    : "bg-warning"
                              }`}
                            />
                            <div>
                              <p className="text-lg font-semibold text-foreground">
                                {formatCurrency(invoice.amount)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Invoice •{" "}
                                {new Date(
                                  invoice.createdAt,
                                ).toLocaleDateString()}
                              </p>
                              {invoice.packageName && (
                                <p className="text-sm text-muted-foreground">
                                  Package: {invoice.packageName}{" "}
                                  {invoice.paymentPlan &&
                                    `(${invoice.paymentPlan})`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                invoice.status === "approved"
                                  ? "bg-success/15 text-success"
                                  : invoice.status === "rejected"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/15 text-warning-foreground"
                              }`}
                            >
                              {invoice.status.charAt(0).toUpperCase() +
                                invoice.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-border">
                          <div className="text-xs text-muted-foreground">
                            Request ID: {invoice.id}
                          </div>
                          <div className="flex gap-2">
                            {invoice.status === "pending" && (
                              <Button size="sm" variant="outline" disabled>
                                Awaiting invoice processing
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <FileText className="w-4 h-4 mr-2" aria-hidden />
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-2" aria-hidden />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(safeServiceAccessPayments.length > 5 ||
                safeInvoiceRequests.length > 5) && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Transactions
                    {safeServiceAccessPayments.length +
                      safeInvoiceRequests.length >
                    5
                      ? ` (${
                          safeServiceAccessPayments.length +
                          safeInvoiceRequests.length -
                          5
                        } more)`
                      : ""}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <CreditCard className="w-8 h-8" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Payment History Found
              </h3>
              <p className="text-muted-foreground mb-4">
                Afya Solar subscription payments and invoice requests will
                appear here
              </p>

              <div className="bg-secondary rounded-lg p-4 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Payment Information:
                </h4>
                <div className="text-xs text-muted-foreground space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>
                      <strong>Mobile Money:</strong> M-Pesa, Airtel, Mixx
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>
                      <strong>Bank Transfer:</strong> Direct bank deposits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>
                      <strong>Invoice:</strong> Pay by invoice (admin approval)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>
                      <strong>Installments:</strong> Pay in installments for
                      packages
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-warning/10 rounded text-xs text-muted-foreground max-w-md mx-auto">
                <p className="font-semibold text-foreground">Current Status:</p>
                <p>
                  • Service Access Payments:{" "}
                  {safeServiceAccessPayments.length || 0}
                </p>
                <p>• Invoice Requests: {safeInvoiceRequests.length || 0}</p>
                <p>
                  • Afya Solar Subscriber:{" "}
                  {afyaSolarSubscriber ? "Found" : "Not found"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
