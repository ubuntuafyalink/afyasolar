"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gift, Loader2, Building2, MapPin, Phone, Mail, AlertCircle, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { AuthLogoBadge } from "@/components/auth/auth-logo-badge"

interface ReferralInviteDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function ReferralInviteDialog({ onSuccess, trigger }: ReferralInviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([])
  const [districts, setDistricts] = useState<Array<{ id: number; name: string; regionId: number }>>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string>("")
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [referralCode, setReferralCode] = useState<string>("")
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    address: "",
    phone: "+255 ",
    region: "",
    regionId: undefined as number | undefined,
    districtId: undefined as number | undefined,
  })

  // Load referral code and regions when dialog opens
  useEffect(() => {
    if (open) {
      loadReferralCode()
      loadRegions()
    }
  }, [open])

  // Load districts when region changes
  useEffect(() => {
    if (selectedRegionId) {
      loadDistricts(parseInt(selectedRegionId))
    } else {
      setDistricts([])
      setSelectedDistrictId("")
    }
  }, [selectedRegionId])

  const loadReferralCode = async () => {
    try {
      const response = await fetch('/api/facilities/referral-code')
      if (response.ok) {
        const data = await response.json()
        setReferralCode(data.referralCode || '')
      }
    } catch (error) {
      console.error('Error loading referral code:', error)
    }
  }

  const loadRegions = async () => {
    try {
      setIsLoadingRegions(true)
      const response = await fetch('/api/regions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
      
      if (response.ok) {
        const result = await response.json()
        const regionsData = result.data || []
        setRegions(regionsData)
        if (regionsData.length === 0) {
          toast.error('No regions available. Please contact support.')
        }
      } else {
        toast.error('Failed to load regions. Please refresh the page.')
      }
    } catch (error) {
      console.error('Error loading regions:', error)
      toast.error('Error loading regions. Please check your connection and try again.')
    } finally {
      setIsLoadingRegions(false)
    }
  }

  const loadDistricts = async (regionId: number) => {
    try {
      setDistricts([])
      setSelectedDistrictId("")
      const response = await fetch(`/api/districts?regionId=${regionId}`)
      if (response.ok) {
        const result = await response.json()
        const districtsData = result.data || []
        setDistricts(districtsData)
      } else {
        console.error('Failed to load districts:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading districts:', error)
    }
  }

  const handleCopyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode)
      setCopied(true)
      toast.success('Referral code copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!formData.name.trim()) {
      newErrors.name = "Facility name is required"
    }

    if (!formData.phone.trim() || formData.phone === "+255 ") {
      newErrors.phone = "Phone number is required"
    }

    if (!selectedRegionId) {
      newErrors.region = "Region is required"
    }

    if (!selectedDistrictId) {
      newErrors.district = "District is required"
    }

    if (!formData.region.trim() && !selectedRegionId) {
      newErrors.region = "Region is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/facilities/refer/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          regionId: selectedRegionId ? parseInt(selectedRegionId) : undefined,
          districtId: selectedDistrictId ? parseInt(selectedDistrictId) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send referral invitation')
      }

      toast.success('Referral invitation sent successfully!')
      setOpen(false)
      setFormData({
        email: "",
        name: "",
        address: "",
        phone: "+255 ",
        region: "",
        regionId: undefined,
        districtId: undefined,
      })
      setSelectedRegionId("")
      setSelectedDistrictId("")
      setErrors({})
      onSuccess?.()
    } catch (error: any) {
      console.error('Error sending referral invitation:', error)
      toast.error(error.message || 'Failed to send referral invitation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild suppressHydrationWarning>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Gift className="h-4 w-4" aria-hidden="true" />
            Invite Facility
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" suppressHydrationWarning>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
            Referral Program - Invite a Facility
          </DialogTitle>
          <DialogDescription>
            Invite another facility to join Ubuntu AfyaLink. They'll get special benefits when they register using your referral code!
          </DialogDescription>
        </DialogHeader>

        {/* Referral Code Display */}
        {referralCode && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Your Referral Code</p>
                <p className="text-2xl font-bold text-primary font-mono">{referralCode}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with facilities you invite. They'll get free Afya Booking for the next month upon admin approval!
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReferralCode}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="facility@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  setErrors({ ...errors, email: "" })
                }}
                className={errors.email ? "border-destructive" : ""}
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Facility Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Facility Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setErrors({ ...errors, name: "" })
                }}
                className={errors.name ? "border-destructive" : ""}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.name}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="+255 123 456 789"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value })
                setErrors({ ...errors, phone: "" })
              }}
              className={errors.phone ? "border-destructive" : ""}
              required
            />
            {errors.phone && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {errors.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region <span className="text-destructive">*</span></Label>
              {isLoadingRegions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading regions...
                </div>
              ) : (
                <Select
                  value={selectedRegionId}
                  onValueChange={(value) => {
                    setSelectedRegionId(value)
                    const selectedRegion = regions.find(r => r.id === parseInt(value))
                    if (selectedRegion) {
                      setFormData({ ...formData, region: selectedRegion.name, regionId: selectedRegion.id })
                    }
                    setErrors({ ...errors, region: "" })
                  }}
                >
                  <SelectTrigger className={errors.region ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.region && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.region}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District <span className="text-destructive">*</span></Label>
              <Select
                value={selectedDistrictId}
                onValueChange={(value) => {
                  setSelectedDistrictId(value)
                  const selectedDistrict = districts.find(d => d.id === parseInt(value))
                  if (selectedDistrict) {
                    setFormData({ ...formData, districtId: selectedDistrict.id })
                  }
                  setErrors({ ...errors, district: "" })
                }}
                disabled={!selectedRegionId || districts.length === 0}
              >
                <SelectTrigger className={errors.district ? "border-destructive" : ""}>
                  <SelectValue placeholder={!selectedRegionId ? "Select region first" : districts.length === 0 ? "No districts available" : "Select district"} />
                </SelectTrigger>
                <SelectContent>
                  {districts.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {!selectedRegionId ? "Please select a region first" : "No districts available"}
                    </div>
                  ) : (
                    districts.map((district) => (
                      <SelectItem key={district.id} value={district.id.toString()}>
                        {district.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.district}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="P.O. Box or Street Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" aria-hidden="true" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
