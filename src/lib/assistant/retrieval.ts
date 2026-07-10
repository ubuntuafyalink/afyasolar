/**
 * Deterministic, dependency-free retrieval (BM25-lite) for the LLM assistant
 * context. Instead of a fixed digest that truncates the tail for large portfolios,
 * this packs the records MOST RELEVANT to the user's question into the char budget.
 *
 * No embeddings, no DB, offline-capable, unit-testable. A record marked `always`
 * (e.g. the portfolio summary preamble) is emitted first; the rest are BM25-scored
 * against the question (+ a structural `boost`), then greedily packed. Truncation
 * is made explicit ("showing top N of M …") rather than silent.
 */

export type ContextRecord = {
  id: string
  /** Dense text that gets packed into the prompt context. */
  body: string
  /** Extra match terms (names, region, hazard synonyms) not necessarily in body. */
  keywords?: string[]
  /** Structural prior added to the relevance score (e.g. Critical facilities). */
  boost?: number
  /** Always include, before any scored records (summary/instructions). */
  always?: boolean
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are", "be", "with",
  "at", "by", "it", "this", "that", "which", "what", "how", "why", "who", "should", "we",
  "i", "me", "my", "our", "do", "does", "can", "about", "most", "more", "than", "as", "from",
])

/** Lowercase, strip punctuation, split, drop stopwords + very short tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

const K1 = 1.5
const B = 0.75

function docTokens(r: ContextRecord): string[] {
  return tokenize(`${r.body} ${(r.keywords ?? []).join(" ")}`)
}

/**
 * Rank `records` against `question` (BM25 + boost) and pack the highest-scoring
 * bodies into `budget` chars. Always-records are emitted first and don't compete.
 * Returns the assembled context string.
 */
export function retrieveContext(
  question: string,
  records: ContextRecord[],
  opts: { budget?: number } = {},
): string {
  const budget = opts.budget ?? 3400
  const always = records.filter((r) => r.always)
  const scored = records.filter((r) => !r.always)

  const out: string[] = []
  let used = 0
  for (const r of always) {
    out.push(r.body)
    used += r.body.length + 1
  }

  // Precompute corpus stats for BM25 over the scored records.
  const docs = scored.map((r) => ({ r, tokens: docTokens(r) }))
  const N = docs.length
  const avgdl = N ? docs.reduce((s, d) => s + d.tokens.length, 0) / N : 0
  const df = new Map<string, number>()
  for (const d of docs) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const qTokens = [...new Set(tokenize(question))]

  const ranked = docs
    .map((d, i) => {
      let score = d.r.boost ?? 0
      if (qTokens.length && d.tokens.length) {
        const dl = d.tokens.length
        for (const t of qTokens) {
          const tf = d.tokens.filter((x) => x === t).length
          if (!tf) continue
          const n = df.get(t) ?? 0
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
          score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / (avgdl || 1))))
        }
      }
      return { r: d.r, score, i }
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.i - b.i))

  let included = 0
  for (const { r } of ranked) {
    const cost = r.body.length + 1
    if (used + cost > budget) continue // skip; a shorter later record may still fit
    out.push(r.body)
    used += cost
    included += 1
  }

  if (included < ranked.length) {
    out.push(`(Showing the ${included} most relevant of ${ranked.length} records — ask about a specific facility or region for more detail.)`)
  }

  return out.join("\n")
}
