"use client"

import { Suspense, useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { m, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, Sun, Satellite, ShieldCheck, Leaf, Zap } from "lucide-react"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import { loginSchema } from "@/lib/validations"
import type { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

type LoginForm = z.infer<typeof loginSchema>

// Background photos: solar panels / farms — Unsplash (free license, attribution
// not required). photo ids: 1509391366360-2e959784a276, 1508514177221-188b1cf16e9d,
// 1497435334941-8c899ee9e8e9, 1521618755572-156ae0cdd74d.
const IMAGES = ["/images/auth/solar-1.jpg", "/images/auth/solar-2.jpg", "/images/auth/solar-3.jpg", "/images/auth/solar-4.jpg"] as const

// Deterministic decorative motion specs (no random → no hydration mismatch).
const ORBS = [
  { className: "left-[8%] top-[18%] size-40 bg-white/10", x: [0, 24, 0], y: [0, -28, 0], duration: 13 },
  { className: "right-[12%] top-[24%] size-52 bg-primary/20", x: [0, -30, 0], y: [0, 22, 0], duration: 16 },
  { className: "left-[22%] bottom-[16%] size-44 bg-solar/15", x: [0, 26, 0], y: [0, 20, 0], duration: 14 },
  { className: "right-[18%] bottom-[22%] size-36 bg-white/10", x: [0, -20, 0], y: [0, -24, 0], duration: 11 },
  { className: "left-[46%] top-[40%] size-60 bg-primary/10", x: [0, 18, 0], y: [0, 26, 0], duration: 18 },
]

const MOTES = [
  { left: "12%", size: 4, duration: 9, delay: 0 },
  { left: "26%", size: 3, duration: 11, delay: 1.5 },
  { left: "40%", size: 5, duration: 8, delay: 3 },
  { left: "55%", size: 3, duration: 10, delay: 0.8 },
  { left: "68%", size: 4, duration: 12, delay: 2.2 },
  { left: "80%", size: 3, duration: 9, delay: 4 },
  { left: "90%", size: 5, duration: 11, delay: 1 },
]

function MovingObjects() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sun glow */}
      <m.div
        className="absolute -right-20 -top-24 size-[34rem] rounded-full bg-solar/30 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating orbs */}
      {ORBS.map((o, i) => (
        <m.div
          key={i}
          className={cn("absolute rounded-full blur-2xl", o.className)}
          animate={{ x: o.x, y: o.y, opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: o.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
        />
      ))}
      {/* Rising light motes */}
      {MOTES.map((p, i) => (
        <m.div
          key={i}
          className="absolute bottom-0 rounded-full bg-white/70 blur-[1px]"
          style={{ left: p.left, width: p.size, height: p.size }}
          animate={{ y: [0, -180], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeOut", delay: p.delay }}
        />
      ))}
    </div>
  )
}

const VALUE_PROPS = [
  { icon: Satellite, title: "NASA climate intelligence", body: "Hazard exposure & outlook from NASA POWER satellite data." },
  { icon: Zap, title: "Solar energy monitoring", body: "Real-time power, savings and efficiency for every facility." },
  { icon: ShieldCheck, title: "Resilience scoring", body: "Track each facility's Resilience Capacity Score and tier." },
  { icon: Leaf, title: "Carbon credits & reports", body: "Verify carbon credits and export portfolio reports." },
] as const

function BrandLogo({ size = 56, glass = false }: { size?: number; glass?: boolean }) {
  return (
    <span
      className={
        glass
          ? "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg backdrop-blur"
          : "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-lg"
      }
      style={{ width: size, height: size }}
    >
      <Image src="/images/services/logo.png" alt="Afya Solar" fill className="object-contain p-1.5" priority />
    </span>
  )
}

function SolarBackground({ index = 0, animated = false }: { index?: number; animated?: boolean }) {
  return (
    <div className="fixed inset-0 -z-10 bg-primary" aria-hidden>
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1600ms] ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn("object-cover", animated && "animate-kenburns")}
            style={animated ? { animationDelay: `${i * -5}s` } : undefined}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-slate-950/70 to-slate-950/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
      {animated && <MovingObjects />}
    </div>
  )
}

function SlideDots({ index, count, onSelect }: { index: number; count: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Show background image ${i + 1}`}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
          )}
        />
      ))}
    </div>
  )
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const reduce = useReducedMotion()
  const [bgIndex, setBgIndex] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setBgIndex((i) => (i + 1) % IMAGES.length), 7000)
    return () => clearInterval(id)
  }, [reduce])

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
        <aside className="relative hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="flex items-center gap-3">
            <BrandLogo glass />
            <div>
              <p className="text-xl font-bold leading-tight">Afya Solar Intelligence</p>
              <p className="text-xs text-white/70">by Ubuntu Afya Link</p>
            </div>
          </m.div>

          <m.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-lg space-y-10">
            <m.h1 variants={fadeInUp} className="text-balance text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
              Climate-resilient solar power for health facilities.
            </m.h1>
            <ul className="space-y-6">
              {VALUE_PROPS.map((p) => (
                <m.li key={p.title} variants={fadeInUp} className="flex items-start gap-4">
                  <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-base font-semibold">{p.title}</p>
                    <p className="text-sm leading-relaxed text-white/75">{p.body}</p>
                  </div>
                </m.li>
              ))}
            </ul>
          </m.div>

          <m.div variants={fadeInUp} initial="hidden" animate="show" className="space-y-4">
            <SlideDots index={bgIndex} count={IMAGES.length} onSelect={setBgIndex} />
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Sun className="size-3.5" aria-hidden />
                Powering resilient primary health care across Tanzania.
              </span>
              <span className="text-white/40">Photo: Unsplash</span>
            </div>
          </m.div>
        </aside>

        {/* Form panel */}
        <main className="flex min-h-screen items-center justify-center p-6">
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="w-full max-w-md">
            {/* Mobile brand header (brand panel hidden < lg) */}
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <BrandLogo size={64} glass />
              <div className="mt-2 flex items-center gap-2 text-white">
                <Sun className="size-4" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide">Afya Solar Intelligence</span>
              </div>
            </div>

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
