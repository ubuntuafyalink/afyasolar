"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatCard } from "@/components/ui/stat-card"
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
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Plug,
  Gift,
  CalendarCheck,
  FileText,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, cn } from "@/lib/utils"
import type { ComprehensiveFacility } from "@/hooks/use-facilities"

interface FacilityDetailsDialogProps {
  facility: ComprehensiveFacility | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FacilityDetailsDialog({
  facility,
  open,
  onOpenChange,
}: FacilityDetailsDialogProps) {
  // Show map by default when coordinates exist
  const [showMap, setShowMap] = useState(true)
  
  if (!facility) return null

  const credit = Number(facility.creditBalance || 0)
  const isLowCredit = credit < 10000
  
  // Check if coordinates are available and valid
  // Coordinates must be numbers (not null, undefined, and within valid ranges)
  const hasCoordinates =
    typeof facility.latitude === "number" &&
    typeof facility.longitude === "number" &&
    !Number.isNaN(facility.latitude) &&
    !Number.isNaN(facility.longitude) &&
    facility.latitude >= -90 &&
    facility.latitude <= 90 &&
    facility.longitude >= -180 &&
    facility.longitude <= 180

  // Generate Google Maps URL with pin marker - ONLY uses coordinates, never name
  const getMapUrl = () => {
    if (!hasCoordinates) return null
    
    const lat = facility.latitude!
    const lng = facility.longitude!
    
    // Use Google Maps with marker at exact coordinates
    // Format: https://www.google.com/maps?q=lat,lng automatically shows a red pin marker at that exact location
    // This ensures the pin is always based on coordinates, never on name/address search
    return `https://www.google.com/maps?q=${lat},${lng}&z=17`
  }
  
  // Generate map embed URL with marker - ONLY uses coordinates
  const getMapEmbedUrl = () => {
    if (!hasCoordinates) return null
    
    const lat = facility.latitude!
    const lng = facility.longitude!
    
    // Use OpenStreetMap with marker - shows a red pin at exact coordinates
    // Format: bbox defines the view area, marker parameter shows the pin at exact lat,lng coordinates
    const bboxPadding = 0.01 // ~1km padding around the marker
    // The marker parameter uses coordinates: marker=lat,lng
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-bboxPadding},${lat-bboxPadding},${lng+bboxPadding},${lat+bboxPadding}&layer=mapnik&marker=${lat},${lng}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" aria-hidden />
                {facility.name}
              </DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden />
                  <span>{facility.city}, {facility.region}</span>
                </span>
                {facility.category && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{facility.category}</span>
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={facility.status === 'active' ? 'success' : 'secondary'}
                className="text-xs px-3 py-1 capitalize"
              >
                {facility.status}
              </Badge>
              {isLowCredit && (
                <Badge variant="warning" className="text-xs px-3 py-1">
                  Low Credit
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Credit Balance"
              value={
                <span className={cn(isLowCredit && "text-warning")}>{formatCurrency(credit)}</span>
              }
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

          {/* Main Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" aria-hidden />
                  Contact Information
                </h3>
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

            {/* System Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" aria-hidden />
                  System Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Payment Model</span>
                    <Badge variant="outline" className="text-xs">
                      {facility.paymentModel ? facility.paymentModel.toUpperCase() : 'N/A'}
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
                    <Badge
                      variant={facility.emailVerified ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {facility.emailVerified ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {facility.emailVerified ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Terms Accepted</span>
                    <Badge
                      variant={facility.acceptTerms ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {facility.acceptTerms ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {facility.acceptTerms ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Status */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Plug className="w-4 h-4 text-primary" aria-hidden />
                  Device Status
                </h3>
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
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" aria-hidden />
                  Payment Status
                </h3>
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

            {/* Booking System (if enabled) */}
            {facility.isBookingEnabled && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-primary" aria-hidden />
                      Booking System
                    </h3>
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
              </>
            )}

            {/* Referral Information */}
            {(facility.referralCode || facility.referredBy) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" aria-hidden />
                    Referral Information
                  </h3>
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
                      <Badge
                        variant={facility.referralBenefitApplied ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {facility.referralBenefitApplied ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" aria-hidden />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs text-muted-foreground">
                      {facility.createdAt ? new Date(facility.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last Updated</span>
                    <span className="text-xs text-muted-foreground">
                      {facility.updatedAt ? new Date(facility.updatedAt).toLocaleDateString() : 'N/A'}
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

          {/* Map Section - Only shown when coordinates are available */}
          {hasCoordinates && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" aria-hidden />
                    Location Map (Based on Coordinates)
                  </h3>
                </div>
                {showMap && getMapEmbedUrl() && (
                  <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                    <iframe
                      width="100%"
                      height="400"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={getMapEmbedUrl() || ''}
                      title={`Map showing exact location at coordinates ${facility.latitude?.toFixed(6)}, ${facility.longitude?.toFixed(6)}`}
                    />
                    <div className="p-2 bg-muted border-t border-border text-xs text-muted-foreground text-center">
                      <MapPin className="w-3 h-3 inline mr-1 text-destructive" aria-hidden />
                      <span className="font-medium">Pin marker shows exact coordinates:</span> {facility.latitude?.toFixed(6)}, {facility.longitude?.toFixed(6)}
                    </div>
                  </div>
                )}
                {!showMap && (
                  <div className="text-center py-8 bg-muted rounded-lg border border-border">
                    <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                    <p className="text-sm text-muted-foreground mb-1">Click "Show Map" to view location</p>
                    <p className="text-xs text-muted-foreground">Location based on GPS coordinates: {facility.latitude?.toFixed(6)}, {facility.longitude?.toFixed(6)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Message when coordinates are not available */}
          {!hasCoordinates && (
            <Card className="border-warning/30 bg-warning/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">GPS Coordinates Not Available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Map cannot be displayed because GPS coordinates (latitude/longitude) are not set for this facility.
                      The map pin can only be shown when exact coordinates are available.
                    </p>
                    {/* Debug info - show what values we received */}
                    <div className="mt-2 p-2 bg-warning/15 rounded text-xs font-mono text-foreground">
                      <p className="font-semibold mb-1">Debug Information:</p>
                      <p>Latitude = {facility.latitude === null ? 'NULL' : String(facility.latitude)} (type: {typeof facility.latitude})</p>
                      <p>Longitude = {facility.longitude === null ? 'NULL' : String(facility.longitude)} (type: {typeof facility.longitude})</p>
                      <p className="mt-2 text-foreground font-semibold">Note: Coordinates are NULL in the database. Please update the facility with GPS coordinates to enable map display.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {hasCoordinates && getMapUrl() ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Open Google Maps with pin marker at exact coordinates
                  // The pin is always based on coordinates, never on name/address
                  const url = getMapUrl()
                  if (url) {
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                }}
              >
                <MapPin className="w-4 h-4 mr-2" aria-hidden />
                Open in Google Maps (Pin at Coordinates)
              </Button>
            ) : null}
            <Button variant="outline" asChild className={hasCoordinates ? "flex-1" : "w-full"}>
              <Link href={`/dashboard/admin/facilities/${facility.id}`}>
                <Eye className="w-4 h-4 mr-2" aria-hidden />
                View Full Metrics
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

