"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { AuthLogoBadge } from "@/components/auth/auth-logo-badge"

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        toast.success(result.message || 'Password reset link sent!')
      } else {
        toast.error(result.error || 'An error occurred. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
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
              <AuthLogoBadge className="mb-4" priority size={90} />
              <CardTitle className="text-2xl font-semibold text-foreground mb-1.5 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden />
                Check Your Email
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                We've sent a password reset link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  If an account with that email exists, you will receive a password reset link shortly.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  The link will expire in 1 hour. Please check your spam folder if you don't see it.
                </p>
                <Button
                  onClick={() => router.push('/auth/signin')}
                  className="w-full h-11 text-sm font-semibold"
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
            <AuthLogoBadge className="mb-4" priority size={90} />
            <CardTitle className="text-2xl font-semibold text-foreground mb-1.5">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" aria-hidden />
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    disabled={isLoading}
                    className="h-11 pl-10 border border-border bg-muted/40 focus:bg-card transition-all text-sm"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {errors.email.message}
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
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4">
        <Card className="w-full max-w-sm border border-border shadow-xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <AuthLogoBadge className="mb-4" priority size={90} />
            <CardTitle className="text-xl text-foreground">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}

