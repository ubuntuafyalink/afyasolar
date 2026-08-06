"use client"

import { useEffect, useState } from "react"
import { m, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { Sun, Satellite, ShieldCheck, Leaf, Zap } from "lucide-react"
import { fadeInUp, staggerContainer } from "@/components/motion/variants"
import { cn } from "@/lib/utils"

// Background photos: solar panels / farms — Unsplash (free license, attribution
// not required). photo ids: 1509391366360-2e959784a276, 1508514177221-188b1cf16e9d,
// 1497435334941-8c899ee9e8e9, 1521618755572-156ae0cdd74d.
export const IMAGES = [
  "/images/auth/solar-1.jpg",
  "/images/auth/solar-2.jpg",
  "/images/auth/solar-3.jpg",
  "/images/auth/solar-4.jpg",
] as const

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

export const VALUE_PROPS = [
  { icon: Satellite, title: "NASA climate intelligence", body: "Hazard exposure & outlook from NASA POWER satellite data." },
  { icon: Zap, title: "Solar energy monitoring", body: "Real-time power, savings and efficiency for every facility." },
  { icon: ShieldCheck, title: "Resilience scoring", body: "Track each facility's Resilience Capacity Score and tier." },
  { icon: Leaf, title: "Carbon credits & reports", body: "Verify carbon credits and export portfolio reports." },
] as const

/**
 * Shared background-slideshow state for the auth pages: cross-fade through the
 * solar images on a 7s timer, honouring `prefers-reduced-motion`.
 */
export function useAuthBackground() {
  const reduce = useReducedMotion()
  const [bgIndex, setBgIndex] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setBgIndex((i) => (i + 1) % IMAGES.length), 7000)
    return () => clearInterval(id)
  }, [reduce])
  return { bgIndex, setBgIndex, reduce }
}

export function MovingObjects() {
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

export function BrandLogo({ size = 56, glass = false }: { size?: number; glass?: boolean }) {
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

export function SolarBackground({ index = 0, animated = false }: { index?: number; animated?: boolean }) {
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

export function SlideDots({ index, count, onSelect }: { index: number; count: number; onSelect: (i: number) => void }) {
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

/**
 * Desktop brand panel (hidden < lg): logo + wordmark, a parameterized headline,
 * the value-prop list, slide dots and footer line — over the solar photo.
 */
export function AuthBrandPanel({
  headline,
  bgIndex,
  onSelectBg,
}: {
  headline: string
  bgIndex: number
  onSelectBg: (i: number) => void
}) {
  return (
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
          {headline}
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
        <SlideDots index={bgIndex} count={IMAGES.length} onSelect={onSelectBg} />
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="flex items-center gap-1.5">
            <Sun className="size-3.5" aria-hidden />
            Powering resilient primary health care across Tanzania.
          </span>
        </div>
      </m.div>
    </aside>
  )
}

/** Mobile brand header (lg:hidden) shown above the form card. */
export function AuthMobileBrand() {
  return (
    <div className="mb-6 flex flex-col items-center text-center lg:hidden">
      <BrandLogo size={64} glass />
      <div className="mt-2 flex items-center gap-2 text-white">
        <Sun className="size-4" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide">Afya Solar Intelligence</span>
      </div>
    </div>
  )
}
