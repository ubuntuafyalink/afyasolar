"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Gift } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { LocationPicker } from "@/components/ui/location-picker"

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const referralCode = searchParams.get("ref") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCodeInput, setReferralCodeInput] = useState(referralCode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [facilityInfo, setFacilityInfo] = useState<{
    name: string
    email: string
  } | null>(null)
  const [errors, setErrors] = useState<{
    password?: string
    confirmPassword?: string
    referralCode?: string
    location?: string
  }>({})
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link")
      router.push("/auth/signin")
      return
    }

    // Validate token and get facility info
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-invitation?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Invalid invitation")
        }

        setFacilityInfo({
          name: data.facility.name,
          email: data.facility.email,
        })
      } catch (error: any) {
        toast.error(error.message || "Invalid or expired invitation")
        router.push("/auth/signin")
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, router])

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter")
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number")
    }
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate passwords
    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setErrors({ password: passwordErrors[0] })
      return
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" })
      return
    }

    if (latitude === null || longitude === null) {
      setErrors({ location: "Please select your facility's real location" })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          referralCode: referralCodeInput.trim() || undefined,
          latitude,
          longitude,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete registration")
      }

      toast.success("Registration completed successfully! You can now sign in.")
      router.push("/auth/signin")
    } catch (error: any) {
      toast.error(error.message || "Failed to complete registration")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!facilityInfo) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <Image
                src="/images/services/logo.png"
                alt="Ubuntu Afya Link"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
            <CardDescription className="mt-2">
              Set your password to complete the registration for <strong>{facilityInfo.name}</strong>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={facilityInfo.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors({ ...errors, password: undefined })
                  }}
                  required
                  placeholder="Enter your password"
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="w-4 h-4" aria-hidden />
                  {errors.password}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors({ ...errors, confirmPassword: undefined })
                  }}
                  required
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="w-4 h-4" aria-hidden />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Facility Location *</Label>
              <LocationPicker
                onLocationChange={(lat, lng) => {
                  setLatitude(lat)
                  setLongitude(lng)
                  setErrors((prev) => ({ ...prev, location: undefined }))
                }}
                disabled={isLoading}
              />
              {errors.location && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="w-4 h-4" aria-hidden />
                  {errors.location}
                </p>
              )}
            </div>
            {referralCode && (
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => {
                    setReferralCodeInput(e.target.value.toUpperCase())
                    setErrors({ ...errors, referralCode: undefined })
                  }}
                  placeholder="Enter referral code if you have one"
                  className={errors.referralCode ? "border-destructive" : ""}
                  disabled={!!referralCode} // Disable if already in URL
                />
                {errors.referralCode && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" aria-hidden />
                    {errors.referralCode}
                  </p>
                )}
                {referralCode && (
                  <p className="text-xs text-primary">
                    Referral code detected from invitation link
                  </p>
                )}
              </div>
            )}
            {!referralCode && (
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => {
                    setReferralCodeInput(e.target.value.toUpperCase())
                    setErrors({ ...errors, referralCode: undefined })
                  }}
                  placeholder="Enter referral code if you have one"
                  className={errors.referralCode ? "border-destructive" : ""}
                  maxLength={11}
                />
                {errors.referralCode && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" aria-hidden />
                    {errors.referralCode}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  If you were referred by another facility, enter their referral code here
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                  Completing Registration...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden />
                  Complete Registration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}

