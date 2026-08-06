import { NextResponse } from "next/server"
import { computePortfolioClimate } from "@/lib/climate/portfolio-climate-server"
import { buildOpenResilienceFeed } from "@/lib/climate/open-resilience-feed"

/**
 * GET /api/open/resilience
 *
 * PUBLIC, unauthenticated, de-identified real-time resilience feed — the
 * digital-public-good data surface required by the UNICEF Venture Fund
 * (spec §8.8). Returns only region-level aggregates derived from NASA POWER
 * climate reanalysis: no facility identifiers, names, or precise coordinates
 * (see src/lib/climate/open-resilience-feed.ts and §10 privacy).
 *
 * Cached aggressively at the edge; the underlying climate data changes slowly.
 */
export const runtime = "nodejs"

export async function GET() {
  try {
    const result = await computePortfolioClimate()
    const feed = buildOpenResilienceFeed(result, new Date().toISOString())

    return NextResponse.json(feed, {
      status: 200,
      headers: {
        // Public feed: cache at the CDN for 30 min, serve stale while revalidating.
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("open/resilience feed error:", error)
    return NextResponse.json(
      { error: "Resilience feed temporarily unavailable" },
      { status: 503 },
    )
  }
}
