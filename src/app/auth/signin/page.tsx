"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, Sun } from "lucide-react"
import { loginSchema } from "@/lib/validations"
import type { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

type LoginForm = z.infer<typeof loginSchema>

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes("ACCOUNT_LOCKED")) {
          const minutes = result.error.split(":")[1] || "30"
          toast.error(`Account locked. Try again in ${minutes} minutes.`)
          return
        }

        if (result.error === "CredentialsSignin" || result.error.includes("EMAIL_NOT_VERIFIED")) {
          const errorResponse = await fetch("/api/auth/check-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email }),
          })

          if (errorResponse.ok) {
            const errorData = await errorResponse.json()
            if (errorData.requiresVerification) {
              toast.error("Verify your email first")
              router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`)
              return
            }
          }
        }
        toast.error("Invalid email or password")
      } else if (result?.ok) {
        toast.success("Signed in successfully")
        setIsRedirecting(true)
        setTimeout(async () => {
          try {
            const sessionResponse = await fetch("/api/auth/session")
            if (sessionResponse.ok) {
              const session = await sessionResponse.json()
              const userRole = session?.user?.role

              const email = session?.user?.email?.toLowerCase()
              if (email === "services@ubuntuafyalink.co.tz") {
                window.location.href = "/dashboard/management-panel"
                return
              }
              if (userRole === "investor") {
                window.location.href = "/dashboard/investor"
              } else if (userRole === "technician") {
                window.location.href = "/dashboard/technician"
              } else if (userRole === "admin") {
                window.location.href = "/dashboard/admin"
              } else if (userRole === "facility") {
                window.location.href = "/"
              } else {
                window.location.href = callbackUrl
              }
            } else {
              window.location.href = callbackUrl
            }
          } catch {
            window.location.href = callbackUrl
          }
        }, 100)
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/15 to-primary/10 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none" />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-primary/10 to-primary/5 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-primary/5 to-primary/10 rounded-full blur-3xl -z-10 animate-pulse motion-reduce:animate-none"
        style={{ animationDelay: "0.5s" }}
      />

      {isRedirecting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground font-medium">Opening Afya Solar…</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm relative z-10">
        <Card className="border border-border shadow-xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-5">
            <div className="relative mx-auto mb-4 w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-primary/20 bg-card shadow-lg">
              <Image
                src="/images/services/logo.png"
                alt="Afya Solar"
                fill
                className="object-contain p-2"
                priority
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-primary mb-1">
              <Sun className="w-5 h-5 text-primary" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Afya Solar</span>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground mb-1.5">Sign in</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Solar energy dashboards and monitoring for your healthcare facility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" aria-hidden />
                  Email address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    disabled={isLoading || isRedirecting}
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" aria-hidden />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    disabled={isLoading || isRedirecting}
                    className="h-11 pl-10 pr-10 border border-border bg-muted/40 focus:bg-card transition-all text-sm"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                disabled={isLoading || isRedirecting}
              >
                {isLoading || isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                    {isRedirecting ? "Redirecting…" : "Signing in…"}
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                Need an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline font-bold underline-offset-2"
                >
                  Register your facility
                </Link>
              </p>
              <p className="text-center text-[11px] text-muted-foreground">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline font-semibold underline-offset-2">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className="text-primary hover:underline font-semibold underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 p-4">
          <Card className="w-full max-w-sm border border-border shadow-xl bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-4 w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-primary/20 bg-card shadow-lg">
                <Image src="/images/services/logo.png" alt="Afya Solar" fill className="object-contain p-2" priority />
              </div>
              <CardTitle className="text-xl text-foreground">Loading…</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
