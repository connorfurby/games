/** In-order subsequence match; tighter / earlier matches score higher. -1 = no match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const t = text.toLowerCase()
  let ti = 0
  let score = 0
  let last = -2
  for (const ch of q) {
    const at = t.indexOf(ch, ti)
    if (at < 0) return -1
    score += at === last + 1 ? 3 : 1
    if (at === 0 || t[at - 1] === ' ') score += 2
    last = at
    ti = at + 1
  }
  return score - t.length * 0.01
}
