/** Percent change from the first to the last point. */
export function changePct(data: number[]): number {
  if (data.length < 2 || !data[0]) return 0
  return (data[data.length - 1]! / data[0]! - 1) * 100
}

export function pctLabel(p: number): string {
  const r = Math.abs(p) < 10 ? p.toFixed(1) : Math.round(p).toString()
  return `${p >= 0 ? '+' : ''}${r}%`
}
