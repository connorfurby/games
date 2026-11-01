# Games — Grocery Empire

A Vite + React + TypeScript game library with an animated shelf, cosmetics shop, achievements, and **Grocery Empire**: a long-form idle empire inspired by the structure of Universal Paperclips (not a clone).

## Run

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Structure

- `src/shell` — library shelf, shop, achievements, settings
- `src/shared` — big numbers, saves, types
- `src/cosmetics` — texture packs
- `src/achievements` — achievement registry
- `src/games/grocery-empire` — sim + content + UI
- `src/games/_template` — copy to add a new game, then register in `src/games/registry.ts`

## Design rules

- Bad choices slow you down; recovery rails prevent softlocks
- Every unlock has a Coach tutorial
- Simulation is command-driven; React only paints snapshots
