/** @vitest-environment node */
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/state'
import type { GameState } from '../sim/state'
import { tickRivals } from '../sim/systems/rivals'
import { GameProvider, type GameCtxValue } from './GameContext'
import { ConfirmProvider } from './kit'
import { MarketingPanel } from './panels/MarketingPanel'
import { RivalsPanel } from './panels/RivalsPanel'
import { StaffPanel } from './panels/StaffPanel'
import { VenturesPanel } from './panels/VenturesPanel'
import { VenturesStreet } from './ventures/VenturesStreet'

function prep(): GameState {
  const s = createInitialState(1, 1)
  s.era = 12
  s.cash = 1e30
  s.menus.staff = true
  s.menus.marketing = true
  s.ads = 6
  s.horizon.survey = 40
  s.horizon.signal = 40
  s.horizon.keel.convoys = 3
  s.horizon.planets = [
    { id: 'pantry', revealed: true, stocked: true, slots: ['can', '', '', '', '', ''], score: 0.9, localPrice: null, banTag: null, lockedSku: null },
  ]
  s.offworld = { bay: ['can'], sold: 0 }
  s.staff.push(
    { id: 1, role: 'surveyor', name: 'Ada Vale', level: 3, xp: 0, hiredAt: 0, deputy: true },
    { id: 2, role: 'diplomat', name: 'Bo Reed', level: 2, xp: 0, hiredAt: 0 },
    { id: 3, role: 'taster', name: 'Chi Park', level: 1, xp: 0, hiredAt: 0 },
    { id: 4, role: 'handler', name: 'Dev Moss', level: 1, xp: 0, hiredAt: 0 },
  )
  s.horizon.deputy[1] = true
  s.horizon.deputyAt[1] = s.time + 20
  tickRivals(s)
  return s
}

function html(node: ReactNode, state: GameState) {
  const value: GameCtxValue = {
    state,
    tick: 1,
    dispatch: () => {},
    reducedMotion: true,
    numberFormat: 'named',
    activeMenu: 'staff',
    setActiveMenu: () => {},
    suggestions: [],
    focusSuggestion: () => {},
    focusNonce: 0,
    focusTarget: null,
    photoMode: false,
    setPhotoMode: () => {},
  }
  return renderToStaticMarkup(
    createElement(GameProvider, {
      value,
      children: createElement(ConfirmProvider, { children: node }),
    }),
  )
}

describe('team hub panels', () => {
  const state = prep()

  it('staff: annex room with a desk per role and a lit desk', () => {
    const out = html(createElement(StaffPanel), state)
    for (const label of ['Probe', 'Route', 'Beds', 'Taste', 'Wire', 'Agent', 'Treaty']) {
      expect(out).toContain(label)
    }
    expect(out).toContain('sf-desk is-lit')
    expect(out).toContain('Annex')
  })

  it('marketing: billboard, broadcast and wire ad', () => {
    const out = html(createElement(MarketingPanel), state)
    expect(out).toContain('Billboard')
    expect(out).toContain('Broadcast')
    expect(out).toContain('Wire ad')
  })

  it('rivals: Keel card, the street, and all four horizon chains', () => {
    const out = html(createElement(RivalsPanel), state)
    expect(out).toContain('Keel &amp; Sons')
    expect(out).toContain('Maris Keel')
    expect(out).toContain('Rival street')
    for (const name of ['Verdant Commons', 'Static FM Foods', 'Concord Provisioning', 'The Ration Board']) {
      expect(out).toContain(name)
    }
  })

  it('ventures: renders VenturesStreet composition', () => {
    const out = html(createElement(VenturesPanel), state)
    expect(out).toContain('Ventures')
    const street = html(createElement(VenturesStreet), state)
    expect(street.length).toBeGreaterThan(400)
    expect(street).toContain('Ventures street')
  })
})
