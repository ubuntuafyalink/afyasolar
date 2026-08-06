"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { m } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock } from "lucide-react"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import {
  BrandLogo,
  SolarBackground,
  AuthBrandPanel,
  AuthMobileBrand,
  useAuthBackground,
} from "@/components/auth/auth-visuals"
import { loginSchema } from "@/lib/validations"
import type { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"

type LoginForm = z.infer<typeof loginSchema>

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const { bgIndex, setBgIndex, reduce } = useAuthBackground()

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

  const busy = isLoading || isRedirecting

  return (
    <LazyMotionProvider>
      <SolarBackground index={bgIndex} animated={!reduce} />

      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-white" aria-hidden />
            <p className="text-sm font-medium text-white/90">Opening Afya Solar…</p>
          </div>
        </div>
      )}

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-2">
        {/* Brand panel (desktop) — over the photo */}
        <AuthBrandPanel
          headline="Climate-resilient solar power for health facilities."
          bgIndex={bgIndex}
          onSelectBg={setBgIndex}
        />

        {/* Form panel */}
        <main className="flex min-h-screen items-center justify-center p-6">
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="w-full max-w-md">
            {/* Mobile brand header (brand panel hidden < lg) */}
            <AuthMobileBrand />

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-card/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-solar" />
              <div className="p-7 sm:p-9">
                <div className="mb-7 text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Sign in to your Afya Solar dashboard.</p>
                </div>

                <m.form variants={staggerContainer} initial="hidden" animate="show" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <m.div variants={scaleIn} className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...register("email")}
                        disabled={busy}
                        className="h-12 border border-border bg-muted/40 pl-11 text-[15px] transition-all focus:bg-card"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" aria-hidden />
                        {errors.email.message}
                      </p>
                    )}
                  </m.div>

                  <m.div variants={scaleIn} className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...register("password")}
                        disabled={busy}
                        className="h-12 border border-border bg-muted/40 pl-11 pr-11 text-[15px] transition-all focus:bg-card"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" aria-hidden />
                        {errors.password.message}
                      </p>
                    )}
                  </m.div>

                  <m.div variants={scaleIn} className="flex items-center justify-end text-sm">
                    <Link href="/auth/forgot-password" className="font-medium text-primary transition-colors hover:underline">
                      Forgot password?
                    </Link>
                  </m.div>

                  <m.div variants={scaleIn}>
                    <Button type="submit" className="h-12 w-full text-[15px] font-semibold" disabled={busy}>
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                          {isRedirecting ? "Redirecting…" : "Signing in…"}
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </m.div>
                </m.form>

                <div className="mt-6 space-y-2 border-t border-border pt-6">
                  <p className="text-center text-sm text-muted-foreground">
                    Need an account?{" "}
                    <Link href="/auth/signup" className="font-bold text-primary underline-offset-2 hover:underline">
                      Register your facility
                    </Link>
                  </p>
                  <p className="text-center text-[11px] text-muted-foreground">
                    By signing in, you agree to our{" "}
                    <Link href="/terms" className="font-semibold text-primary underline-offset-2 hover:underline">
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy-policy" className="font-semibold text-primary underline-offset-2 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        </main>
      </div>
    </LazyMotionProvider>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center p-4">
          <SolarBackground />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <BrandLogo size={64} glass />
            <Loader2 className="size-5 animate-spin text-white" aria-hidden />
            <p className="text-sm text-white/80">Loading…</p>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
