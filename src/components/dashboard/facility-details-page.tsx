"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  CreditCard,
  Zap,
  Users,
  Stethoscope,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Plug,
  Gift,
  CalendarCheck,
  FileText,
  Eye,
  ArrowLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatCard } from "@/components/ui/stat-card"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { useComprehensiveFacilities, type ComprehensiveFacility } from "@/hooks/use-facilities"

interface FacilityDetailsPageProps {
  facilityId: string
}

export function FacilityDetailsPage({ facilityId }: FacilityDetailsPageProps) {
  const { data: facilities, isLoading } = useComprehensiveFacilities()

  const facility: ComprehensiveFacility | undefined = useMemo(
    () => facilities?.find((f) => f.id === facilityId),
    [facilities, facilityId]
  )

  if (isLoading || !facilities) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">Facility not found</p>
              <p className="text-xs text-muted-foreground mt-1">
                The facility you are looking for does not exist or has been removed.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/admin">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
                Back to Management Panel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const credit = Number(facility.creditBalance || 0)
  const isLowCredit = credit < 10000

  const hasCoordinates =
    typeof facility.latitude === "number" &&
    typeof facility.longitude === "number" &&
    !Number.isNaN(facility.latitude) &&
    !Number.isNaN(facility.longitude) &&
    facility.latitude >= -90 &&
    facility.latitude <= 90 &&
    facility.longitude >= -180 &&
    facility.longitude <= 180

  const getMapUrl = () => {
    if (!hasCoordinates) return null
    const lat = facility.latitude!
    const lng = facility.longitude!
    return `https://www.google.com/maps?q=${lat},${lng}&z=17`
  }

  const getMapEmbedUrl = () => {
    if (!hasCoordinates) return null
    const lat = facility.latitude!
    const lng = facility.longitude!
    const bboxPadding = 0.01
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bboxPadding},${lat - bboxPadding},${lng + bboxPadding},${
      lat + bboxPadding
    }&layer=mapnik&marker=${lat},${lng}`
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="sm" className="mt-1">
              <Link href="/dashboard/admin">
                <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="w-6 h-6 text-primary" aria-hidden />
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{facility.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden />
                  <span>
                    {facility.city}, {facility.region}
                  </span>
                </div>
                {facility.category && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{facility.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant={facility.status === "active" ? "success" : "secondary"}
              className="text-xs px-3 py-1 capitalize"
            >
              {facility.status}
            </Badge>
            {isLowCredit && (
              <Badge variant="warning" className="text-xs px-3 py-1">Low Credit</Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Credit Balance"
            value={<span className={cn(isLowCredit && "text-warning")}>{formatCurrency(credit)}</span>}
            icon={<DollarSign />}
            accent={isLowCredit ? "warning" : "primary"}
          />
          <StatCard
            title="Devices"
            value={`${facility.activeDevices || 0}/${facility.deviceCount || 0}`}
            icon={<Plug />}
            meta="Active"
            accent="primary"
          />
          <StatCard
            title="Users"
            value={facility.userCount || 0}
            icon={<Users />}
            accent="muted"
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(facility.totalPaidAmount || 0)}
            icon={<TrendingUp />}
            accent="success"
          />
        </div>

        <Separator />

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" aria-hidden />
                Contact Information
              </h2>
              <div className="space-y-3">
                {facility.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm text-foreground mt-0.5">{facility.address}</p>
                    </div>
                  </div>
                )}
                {facility.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground mt-0.5">{facility.phone}</p>
                    </div>
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground mt-0.5">{facility.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" aria-hidden />
                System Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Payment Model</span>
                  <Badge variant="outline" className="text-xs">
                    {facility.paymentModel ? facility.paymentModel.toUpperCase() : "N/A"}
                  </Badge>
                </div>
                {facility.systemSize && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">System Size</span>
                    <span className="text-sm font-medium text-foreground">{facility.systemSize}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Monthly Consumption</span>
                  <span className="text-sm font-medium text-foreground">
                    {Number(facility.monthlyConsumption || 0).toFixed(2)} kWh
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Email Verified</span>
                  <Badge variant={facility.emailVerified ? "default" : "secondary"} className="text-xs">
                    {facility.emailVerified ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {facility.emailVerified ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Terms Accepted</span>
                  <Badge variant={facility.acceptTerms ? "default" : "secondary"} className="text-xs">
                    {facility.acceptTerms ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {facility.acceptTerms ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Status */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plug className="w-4 h-4 text-primary" aria-hidden />
                Device Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Devices</span>
                  <span className="text-sm font-semibold text-foreground">{facility.deviceCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Badge variant="success" className="text-xs">
                    {facility.activeDevices || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Inactive</span>
                  <Badge variant="secondary" className="text-xs">
                    {facility.inactiveDevices || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" aria-hidden />
                Payment Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Payments</span>
                  <span className="text-sm font-semibold text-foreground">{facility.totalPayments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <Badge variant="success" className="text-xs">
                    {facility.completedPayments || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pending</span>
                  <Badge variant="warning" className="text-xs">
                    {facility.pendingPayments || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Failed</span>
                  <Badge variant="destructive" className="text-xs">
                    {facility.failedPayments || 0}
                  </Badge>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Total Amount Paid</span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(facility.totalPaidAmount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking System */}
          {facility.isBookingEnabled && (
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardContent className="pt-6 pb-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-primary" aria-hidden />
                  Booking System
                </h2>
                <div className="space-y-3">
                  {facility.bookingSlug && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Booking Slug</span>
                      <span className="text-xs font-mono font-medium text-foreground">{facility.bookingSlug}</span>
                    </div>
                  )}
                  {facility.bookingTimezone && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Timezone</span>
                      <span className="text-sm font-medium text-foreground">{facility.bookingTimezone}</span>
                    </div>
                  )}
                  {facility.bookingWhatsappNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">WhatsApp</span>
                      <span className="text-sm font-medium text-foreground">{facility.bookingWhatsappNumber}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Departments</span>
                    <div className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-primary" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">{facility.departmentCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Doctors</span>
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-primary" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">{facility.doctorCount || 0}</span>
                    </div>
                  </div>
                  {facility.totalAppointments > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total Appointments</span>
                        <span className="text-sm font-semibold text-foreground">{facility.totalAppointments}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pending</span>
                        <Badge variant="warning" className="text-xs">
                          {facility.pendingAppointments}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Confirmed</span>
                        <Badge variant="secondary" className="text-xs">
                          {facility.confirmedAppointments}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Completed</span>
                        <Badge variant="success" className="text-xs">
                          {facility.completedAppointments}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Info */}
          {(facility.referralCode || facility.referredBy) && (
            <Card className="lg:col-span-1 border-border shadow-sm">
              <CardContent className="pt-6 pb-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" aria-hidden />
                  Referral Information
                </h2>
                <div className="space-y-3">
                  {facility.referralCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Referral Code</span>
                      <span className="text-xs font-mono font-medium text-foreground">{facility.referralCode}</span>
                    </div>
                  )}
                  {facility.referredBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Referred By</span>
                      <span className="text-xs text-muted-foreground">Facility ID</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Benefit Applied</span>
                    <Badge variant={facility.referralBenefitApplied ? "default" : "secondary"} className="text-xs">
                      {facility.referralBenefitApplied ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Info */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" aria-hidden />
                Account Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs text-muted-foreground">
                    {facility.createdAt ? new Date(facility.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last Updated</span>
                  <span className="text-xs text-muted-foreground">
                    {facility.updatedAt ? new Date(facility.updatedAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                {facility.lastLoginAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last Login</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(facility.lastLoginAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        {hasCoordinates && (
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden />
                  Location Map (Based on Coordinates)
                </h2>
              </div>
              {getMapEmbedUrl() && (
                <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                  <iframe
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={getMapEmbedUrl() || ""}
                    title={`Map showing exact location at coordinates ${facility.latitude?.toFixed(6)}, ${facility.longitude?.toFixed(6)}`}
                  />
                  <div className="p-2 bg-muted border-t border-border text-xs text-muted-foreground text-center">
                    <MapPin className="w-3 h-3 inline mr-1 text-destructive" aria-hidden />
                    <span className="font-medium">Pin marker shows exact coordinates:</span>{" "}
                    {facility.latitude?.toFixed(6)}, {facility.longitude?.toFixed(6)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No coordinates message */}
        {!hasCoordinates && (
          <Card className="border-warning/30 bg-warning/10 shadow-sm">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">GPS Coordinates Not Available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Map cannot be displayed because GPS coordinates (latitude/longitude) are not set for this facility.
                    The map pin can only be shown when exact coordinates are available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t mt-4">
          {hasCoordinates && getMapUrl() && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const url = getMapUrl()
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-2" aria-hidden />
              Open in Google Maps (Pin at Coordinates)
            </Button>
          )}
          <Button variant="outline" asChild className={hasCoordinates ? "flex-1" : "w-full"}>
            <Link href={`/dashboard/admin/facilities/${facility.id}`}>
              <Eye className="w-4 h-4 mr-2" aria-hidden />
              View Energy & Device Metrics
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


