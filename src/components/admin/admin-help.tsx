"use client"

import * as React from "react"
import { m } from "framer-motion"
import {
  LifeBuoy,
  BookOpen,
  Search,
  Mail,
  ChevronRight,
  ChevronDown,
  Baby,
  BarChart3,
  Satellite,
  PlugZap,
  Gauge,
  ClipboardList,
  Bell,
  Bot,
  MessageCircle,
  Receipt,
  Leaf,
  CreditCard,
  Package,
  Thermometer,
  Zap,
  ShieldCheck,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer, accordionVariants } from "@/components/motion/variants"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"

const SUPPORT_EMAIL = "services@ubuntuafyalink.co.tz"

type Section = { id: string; label: string; icon: React.ElementType; blurb: string }

const SECTION_GUIDE: Section[] = [
  { id: "maternal-newborn", label: "Maternal & Newborn", icon: Baby, blurb: "Portfolio view of child-health service resilience across all facilities." },
  { id: "resilience-score", label: "Resilience Score", icon: BarChart3, blurb: "Every facility's RCS, tier and the five CRiPHC dimensions, filterable and drillable." },
  { id: "climate-outlook", label: "Climate Outlook", icon: Satellite, blurb: "NASA POWER hazard exposure (heat/flood/drought/storm), CVI and 2030/2050 projections." },
  { id: "solar-live-monitoring", label: "Power", icon: PlugZap, blurb: "Per-facility solar sizing, daily load, power need and modelled savings." },
  { id: "afya-solar-portfolio-assessments", label: "Energy Efficiency", icon: Gauge, blurb: "Efficiency (BMI) distribution and the full per-facility energy report + meter monitoring." },
  { id: "reports", label: "Reports", icon: ClipboardList, blurb: "Build climate / resilience / energy reports and download as PDF, Excel, CSV or Word." },
  { id: "notifications", label: "Notifications", icon: Bell, blurb: "Real alerts from climate, resilience, energy, support, financing and system sources." },
  { id: "assistant", label: "Assistant", icon: Bot, blurb: "AI assistant grounded in your live portfolio data, with saved chats and voice input." },
  { id: "channels", label: "Channels", icon: MessageCircle, blurb: "Send bulk SMS to facilities, with a live preview and per-message cost estimate." },
  { id: "afya-solar-portfolio-billing", label: "Bills & Payment", icon: Receipt, blurb: "Inspect any facility's bills and subscription exactly as the facility sees them." },
  { id: "solar-carbon-credits", label: "Carbon Credits", icon: Leaf, blurb: "Review and Verify / Certify / Reject carbon credits across the portfolio." },
  { id: "afya-solar-subscribers", label: "Subscription", icon: CreditCard, blurb: "All Afya Solar subscribers, their status, credit balance and dashboards." },
  { id: "afya-solar-packages", label: "Packages", icon: Package, blurb: "Create, edit and manage solar package offerings and pricing plans." },
]

const RCS_DIMENSIONS = [
  { code: "HES", label: "Hazard Exposure", detail: "Climate hazards the site faces, derived from NASA POWER." },
  { code: "CSF", label: "Critical Service Fragility", detail: "How exposed essential clinical services are to disruption." },
  { code: "ECPQ", label: "Energy Continuity & Power Quality", detail: "Reliability and quality of the facility's power." },
  { code: "EDC", label: "Efficiency & Demand Control", detail: "How well energy is used and demand is managed." },
  { code: "RRC", label: "Readiness & Response Capacity", detail: "Ability to cope with and recover from stress." },
]

const TIERS = [
  { tier: "Resilient", range: "RCS 75 and above" },
  { tier: "Developing", range: "RCS 55 to 74" },
  { tier: "At risk", range: "RCS 35 to 54" },
  { tier: "Critical", range: "RCS below 35" },
]

type Faq = { q: string; a: string }
const FAQS: Faq[] = [
  { q: "Why does a facility show “Not assessed”?", a: "It has no saved climate or energy assessment yet. Run an assessment to obtain its RCS, hazard profile or efficiency score. Portfolio averages skip not-assessed facilities rather than inventing a number." },
  { q: "Where does the climate data come from?", a: "Real NASA POWER satellite reanalysis (free, no API key). Daily/monthly temperature, precipitation and wind are normalised to 0–100 hazard indices for heat, flood, drought and storm." },
  { q: "What does the Climate Vulnerability Index (CVI) mean, and the 2050 figure?", a: "CVI is the average of the four hazard indices (higher = more exposed). The 2030/2050 numbers are a simple linear projection for planning, not a weather forecast." },
  { q: "How do I send a message to facilities?", a: "Open Channels → Bulk SMS. Pick recipients (facilities, CSV or manual), type a message, and the preview shows the exact SMS plus a segment/units estimate. A confirm dialog guards the send." },
  { q: "How do carbon credits get certified?", a: "In Carbon Credits, a pending credit is Verified, then Certified (which stamps a CC-YYYY-… certificate id). Pending or verified credits can be Rejected with a note. Every action is audited." },
  { q: "Can I download reports?", a: "Yes — the Reports center builds climate, resilience, energy or full reports scoped to the portfolio, a region or a single facility, and downloads them as PDF, Excel, CSV or Word." },
  { q: "Are notifications clickable?", a: "Yes. Climate, resilience and energy notifications open that facility's detail page; financing opens Bills & Payment. Support and system items are informational." },
  { q: "Why does Recognized revenue show TSh 0?", a: "That metric reflects revenue recognised in the selected window (last 30 days). TSh 0 simply means none was recognised in that period — it is not an error." },
]

const GLOSSARY = [
  { term: "RCS", def: "Resilience Capacity Score (0–100) — a weighted sum of the five CRiPHC dimensions." },
  { term: "CRiPHC", def: "The Climate-Resilient Primary Health Care framework behind the RCS." },
  { term: "CVI", def: "Climate Vulnerability Index — the average of the four hazard indices (0–100)." },
  { term: "HES", def: "Hazard Exposure dimension (100 − CVI is the capacity form used in scoring)." },
  { term: "CSF", def: "Critical Service Fragility dimension." },
  { term: "ECPQ", def: "Energy Continuity & Power Quality dimension." },
  { term: "EDC", def: "Efficiency & Demand Control dimension." },
  { term: "RRC", def: "Readiness & Response Capacity dimension." },
  { term: "BMI", def: "Building Management Index — the operational energy-efficiency score (0–100%)." },
  { term: "PAYG", def: "Pay-as-you-go financing for solar systems." },
  { term: "EaaS", def: "Energy-as-a-Service — a fixed monthly fee plan including maintenance." },
  { term: "NASA POWER", def: "NASA's free satellite climate dataset powering the hazard indices." },
  { term: "Tier", def: "Resilient / Developing / At risk / Critical — the band an RCS falls into." },
  { term: "Carbon credit", def: "One tonne of CO₂ avoided; calculated from generation × grid emission factor." },
]

function matches(q: string, ...fields: string[]): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return fields.some((f) => f.toLowerCase().includes(needle))
}

/** Polished, animated admin help center: section guide, methodology, FAQ, glossary, support. */
export function AdminHelp({ onNavigate }: { onNavigate?: (section: string) => void } = {}) {
  const [search, setSearch] = React.useState("")
  const [openFaq, setOpenFaq] = React.useState<Set<number>>(new Set())
  const searching = search.trim().length > 0

  const guide = SECTION_GUIDE.filter((s) => matches(search, s.label, s.blurb))
  const faqs = FAQS.map((f, i) => ({ ...f, i })).filter((f) => matches(search, f.q, f.a))
  const glossary = GLOSSARY.filter((g) => matches(search, g.term, g.def))
  const noMatches = searching && guide.length === 0 && faqs.length === 0 && glossary.length === 0

  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        {/* Hero */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LifeBuoy className="size-6" aria-hidden />
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Help &amp; guidance</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    How the admin panel works, what each section does, and the methodology behind the scores. This
                    portfolio view mirrors what a facility manager sees for their own site.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 gap-1.5">
                <a href={`mailto:${SUPPORT_EMAIL}`}>
                  <Mail className="size-4" aria-hidden />
                  Contact support
                </a>
              </Button>
            </CardContent>
          </Card>
        </m.div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search help, FAQs and terms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search help"
          />
        </div>

        {noMatches && (
          <p className="py-8 text-center text-sm text-muted-foreground">No help topics match &ldquo;{search}&rdquo;.</p>
        )}

        {/* Section guide */}
        {guide.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="size-4 text-primary" aria-hidden /> Section guide
            </h3>
            <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guide.map((s) => (
                <m.div key={s.id} variants={scaleIn}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-2 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <s.icon className="size-4" aria-hidden />
                        </span>
                        <span className="font-medium text-foreground">{s.label}</span>
                      </div>
                      <p className="flex-1 text-xs text-muted-foreground">{s.blurb}</p>
                      {onNavigate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-7 w-fit gap-1 px-2 text-xs text-primary", FOCUS_RING)}
                          onClick={() => onNavigate(s.id)}
                        >
                          Open
                          <ChevronRight className="size-3.5" aria-hidden />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              ))}
            </m.div>
          </section>
        )}

        {/* Methodology (hidden while searching) */}
        {!searching && (
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden /> Methodology
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {/* RCS */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="size-5 text-primary" aria-hidden /> Resilience Capacity Score (RCS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The RCS (0&ndash;100) summarises a facility&apos;s ability to keep essential child-health services
                    running through climate and power stress &mdash; a transparent, weighted sum of five dimensions.
                  </p>
                  <ul className="space-y-2">
                    {RCS_DIMENSIONS.map((d) => (
                      <li key={d.code} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                        <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">{d.code}</Badge>
                        <span>
                          <span className="font-medium text-foreground">{d.label}</span>
                          <span className="block text-xs">{d.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TIERS.map((t) => (
                      <div key={t.tier} className="rounded-lg border border-border p-2 text-center">
                        <p className="text-sm font-medium text-foreground">{t.tier}</p>
                        <p className="text-[11px]">{t.range}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Climate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Thermometer className="size-5 text-primary" aria-hidden /> Climate &amp; NASA data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Climate Outlook uses real <span className="font-medium text-foreground">NASA POWER</span> satellite
                    data, normalised to 0&ndash;100 hazard indices: heat (max temperature), flood (peak precipitation),
                    storm (peak wind) and drought (longest dry spell).
                  </p>
                  <p>
                    The Climate Vulnerability Index (CVI) averages the four. The 2030/2050 figures are a simple linear
                    projection for planning &mdash; not a weather forecast. Facilities without a reachable coordinate
                    are shown as degraded rather than guessed.
                  </p>
                </CardContent>
              </Card>

              {/* Energy */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="size-5 text-primary" aria-hidden /> Energy efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    The efficiency score (BMI %) comes from each facility&apos;s operational assessment. The energy
                    report also models solar array size, daily load, required power and annual savings from the saved
                    sizing assessment.
                  </p>
                </CardContent>
              </Card>

              {/* Carbon */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Leaf className="size-5 text-primary" aria-hidden /> Carbon credits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Credits are calculated from solar generation &times; the grid emission factor (CO&#8322; avoided),
                    valued per tonne. Admins review each credit through a verification lifecycle:
                    <span className="font-medium text-foreground"> pending &rarr; verified &rarr; certified</span>
                    {" "}(pending/verified can be rejected). Certifying stamps a CC-YYYY-&hellip; certificate id.
                  </p>
                </CardContent>
              </Card>
            </div>
          </m.div>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Frequently asked questions</h3>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {faqs.map((f) => {
                  const open = openFaq.has(f.i)
                  return (
                    <div key={f.i}>
                      <button
                        type="button"
                        onClick={() => toggleFaq(f.i)}
                        aria-expanded={open}
                        className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left", FOCUS_RING)}
                      >
                        <span className="text-sm font-medium text-foreground">{f.q}</span>
                        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
                      </button>
                      <m.div initial={false} animate={open ? "open" : "collapsed"} variants={accordionVariants} className="overflow-hidden">
                        <p className="px-4 pb-3 text-sm text-muted-foreground">{f.a}</p>
                      </m.div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Glossary */}
        {glossary.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Glossary</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {glossary.map((g) => (
                <div key={g.term} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{g.term}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{g.def}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Support */}
        {!searching && (
          <m.div variants={fadeInUp} initial="hidden" animate="show">
            <Card>
              <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Need a hand?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reach the AfyaSolar team for help with the platform, data or methodology. Climate indices are sourced
                    from NASA POWER (a free, open dataset) for full transparency.
                  </p>
                </div>
                <Button asChild className="shrink-0 gap-1.5">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    <Mail className="size-4" aria-hidden />
                    {SUPPORT_EMAIL}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </m.div>
        )}
      </div>
    </LazyMotionProvider>
  )
}
