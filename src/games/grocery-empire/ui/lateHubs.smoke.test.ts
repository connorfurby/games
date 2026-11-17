/** @vitest-environment node */
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/state'
import type { GameState } from '../sim/state'
import { fileStandardPlanogram, launchProbe } from '../sim/systems/horizon'
import { GameProvider, type GameCtxValue } from './GameContext'
import { FleetHarbor } from './fleet/FleetHarbor'
import { BooksPanel } from './panels/BooksPanel'
import { InvestPanel } from './panels/InvestPanel'
import { LandPanel } from './panels/LandPanel'
import { PoliticsPanel } from './panels/PoliticsPanel'

function prep(era = 9): GameState {
  const s = createInitialState(1, 1)
  s.era = era
  s.cash = 1e24
  s.stats.playSec = 9999
  s.horizon.survey = 80
  s.menus.invest = true
  s.menus.politics = true
  s.menus.land = true
  s.invest.unlocked = true
  s.politics.acquisitions = 3
  launchProbe(s)
  fileStandardPlanogram(s, s.horizon.planets[0]?.id ?? 'pantry')
  return s
}

function html(node: ReactNode, state: GameState) {
  const value: GameCtxValue = {
    state,
    tick: 1,
    dispatch: () => {},
    reducedMotion: true,
    numberFormat: 'named',
    activeMenu: 'books',
    setActiveMenu: () => {},
    suggestions: [],
    focusSuggestion: () => {},
    focusNonce: 0,
    focusTarget: null,
    photoMode: false,
    setPhotoMode: () => {},
  }
  return renderToStaticMarkup(createElement(GameProvider, { value, children: node }))
}

describe('late hub panels (money, empire)', () => {
  it('Books draws the Worlds waterfall and the currency flow table from Era 7', () => {
    const late = html(createElement(BooksPanel), prep(9))
    expect(late).toContain('Income waterfall')
    expect(late).toContain('Currency flow')
    expect(late).toContain('Greenhouses')
    expect(late).toContain('Network total')
    const early = html(createElement(BooksPanel), prep(5))
    expect(early).not.toContain('Income waterfall')
  })

  it('Invest lists the four instruments and the trading floor', () => {
    const out = html(createElement(InvestPanel), prep(10))
    for (const name of ['Planet Bonds', 'Freight Futures', 'Seed Index', 'Signal Options']) {
      expect(out).toContain(name)
    }
    expect(out).toContain('Trading floor')
    expect(html(createElement(InvestPanel), prep(5))).not.toContain('Planet Bonds')
  })

  it('Politics becomes the Council from Era 7 with petitions and scrutiny', () => {
    const out = html(createElement(PoliticsPanel), prep(9))
    expect(out).toContain('Seat a delegate')
    expect(out).toContain('Petitions')
    expect(out).toContain('Scrutiny')
    expect(out).toContain('Council chamber')
    const early = html(createElement(PoliticsPanel), prep(3))
    expect(early).toContain('Acquire a neighbor')
    expect(early).not.toContain('Petitions')
  })

  it('Land shows an outpost row per stocked world', () => {
    const out = html(createElement(LandPanel), prep(8))
    expect(out).toContain('Outposts')
    expect(out).toContain('Charter an outpost')
  })

  it('Fleet harbor counts keel convoys from Era 8', () => {
    const s = prep(8)
    s.horizon.keel = { convoys: 3, frozenUntil: 0, bought: true }
    const out = html(createElement(FleetHarbor, { state: s, motion: false }), s)
    expect(out).toContain('3 keel convoys')
  })
})
