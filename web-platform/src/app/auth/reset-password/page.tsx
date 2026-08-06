"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { PasswordStrengthIndicator } from "@/components/ui/password-strength"
import { validatePassword } from "@/lib/password-validation"
import { AuthLogoBadge } from "@/components/auth/auth-logo-badge"

const resetPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch('password')

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false)
        setIsValid(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const result = await response.json()
        setIsValid(result.valid === true)
      } catch (error) {
        setIsValid(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error('Invalid reset token')
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(data.password, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
      minStrength: 2,
    })

    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.errors[0] || 'Password does not meet requirements')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        toast.success('Password reset successfully!')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        toast.error(result.error || 'An error occurred. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4">
        <Card className="w-full max-w-sm border border-border shadow-xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <AuthLogoBadge className="mb-4" priority size={90} />
            <CardTitle className="text-xl text-foreground">Validating token...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/15 to-primary/10 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none" />

        <div className="w-full max-w-sm relative z-10">
          <Card className="border border-destructive/30 shadow-xl bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-5">
              <AuthLogoBadge className="mb-4" size={90} />
              <CardTitle className="text-2xl font-semibold text-foreground mb-1.5 flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" aria-hidden />
                Invalid or Expired Link
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Password reset links expire after 1 hour. Please request a new one.
                </p>
                <Button
                  onClick={() => router.push('/auth/forgot-password')}
                  className="w-full h-11 text-sm font-semibold"
                >
                  Request New Reset Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/signin')}
                  className="w-full h-11 text-sm"
                >
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/15 to-primary/10 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none" />

        <div className="w-full max-w-sm relative z-10">
          <Card className="border border-border shadow-xl bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-5">
              <AuthLogoBadge className="mb-4" size={90} />
              <CardTitle className="text-2xl font-semibold text-foreground mb-1.5 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden />
                Password Reset Successful!
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Your password has been reset successfully
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Redirecting to sign in page...
              </p>
              <Button
                onClick={() => router.push('/auth/signin')}
                className="w-full h-11 text-sm font-semibold"
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/15 to-primary/10 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-primary/10 to-primary/5 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-sm relative z-10">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" aria-hidden />
          <span>Back to sign in</span>
        </Link>

        <Card className="border border-border shadow-xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-5">
            <AuthLogoBadge className="mb-4" size={90} />
            <CardTitle className="text-2xl font-semibold text-foreground mb-1.5">
              Reset Password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" aria-hidden />
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    {...register("password")}
                    disabled={isLoading}
                    className="h-11 pl-10 pr-10 border border-border bg-muted/40 focus:bg-card transition-all text-sm"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                </div>
                {password && <PasswordStrengthIndicator password={password} />}
                {errors.password && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" aria-hidden />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    {...register("confirmPassword")}
                    disabled={isLoading}
                    className="h-11 pl-10 pr-10 border border-border bg-muted/40 focus:bg-card transition-all text-sm"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-center text-xs text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary hover:underline font-bold transition-colors underline-offset-2"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4">
        <Card className="w-full max-w-sm border border-border shadow-xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <AuthLogoBadge className="mb-4" size={90} />
            <CardTitle className="text-xl text-foreground">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

