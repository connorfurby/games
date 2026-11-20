/** @vitest-environment jsdom */
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PauseReminder } from './PauseReminder'

describe('PauseReminder', () => {
  let root: Root | null = null

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = null
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  function mount(paused: boolean, quiet = false) {
    vi.useFakeTimers()
    const host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const onResume = vi.fn()
    act(() => {
      root!.render(createElement(PauseReminder, { paused, quiet, onResume }))
    })
    return { host, onResume }
  }

  it('stays hidden until the pause has lasted 30 seconds', () => {
    const { host } = mount(true)
    expect(host.textContent).not.toContain('Resume')
    act(() => {
      vi.advanceTimersByTime(29_000)
    })
    expect(host.textContent).not.toContain('Resume')
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(host.textContent).toContain('0:30')
    expect(host.textContent).toContain('The store is paused.')
    expect(host.querySelector('button')?.textContent).toContain('Resume')
  })

  it('Resume calls back', () => {
    const { host, onResume } = mount(true)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    act(() => {
      host.querySelector('button')?.click()
    })
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('does not offer Resume during a story silence', () => {
    const { host } = mount(true, true)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(host.textContent).not.toContain('Resume')
  })
})
