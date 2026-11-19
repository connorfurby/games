/** Seat colours for each kind of owner (portrait chips, chairs, the ownership ring). */
export const OWNER_COLOR: Record<string, string> = {
  you: '#f2c14e',
  public: '#7f8aa0',
  ivo: '#e8a25a',
  harlow: '#6b8f71',
  vulture: '#8a8f99',
  rosa: '#e8583c',
  pension: '#5b8fd9',
  orbital: '#9b7ad9',
  grudge: '#c2463a',
  colony: '#5aa88a',
}

export function initialsOf(name: string): string {
  const w = name.replace(/[’']/g, '').split(/\s+/).filter((x) => /^[A-Za-z]/.test(x))
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? '')).toUpperCase()
}
