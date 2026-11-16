import { expect, test } from '@playwright/test'

test('ops wiki: home, spoilers, article, lessons, atlas, glossary', async ({ page }) => {
  await page.goto('/guide/grocery-empire')
  await expect(page.getByRole('heading', { name: /night supervisor/i })).toBeVisible()

  const spoilers = page.getByRole('checkbox', { name: /Show spoilers/i })
  await expect(spoilers).not.toBeChecked()
  const before = await page.getByText(/articles open at your era/i).textContent()
  await spoilers.check()
  await expect(spoilers).toBeChecked()
  await expect(page.getByText(/articles open at your era/i)).not.toHaveText(before ?? '')
  await spoilers.uncheck()

  // Start here → structured article with the loop diagram.
  await page.locator('.wk-start__card').first().click()
  await expect(page).toHaveURL(/\/guide\/grocery-empire\/a\/start-what/)
  await expect(page.getByRole('heading', { level: 1, name: /What is Grocery Empire/i })).toBeVisible()
  await expect(page.locator('.wk-loop')).toBeVisible()

  // Glossary word links jump to the glossary.
  await page.locator('.wk-term').first().click()
  await expect(page).toHaveURL(/\/glossary\//)
  await expect(page.locator('.wk-gl.is-hit')).toHaveCount(1)

  await page.locator('.wk-tabs .sd-tab', { hasText: 'Lessons' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Lessons' })).toBeVisible()
  await page.locator('.wk-lesson__head').first().click()
  const play = page.locator('.wk-lesson__acts a')
  await expect(play).toHaveAttribute('href', /\/play\/grocery-empire\?.*tour=/)

  await page.locator('.wk-tabs .sd-tab', { hasText: 'Era atlas' }).click()
  await expect(page.locator('.wk-era')).toHaveCount(13)

  await page.goto('/guide/grocery-empire/search?q=attention')
  await expect(page.locator('.wk-alist li').first()).toBeVisible()
})

test('lesson deep link queues the Coach lesson in play', async ({ page }) => {
  await page.goto('/play/grocery-empire?tour=price')
  await expect(page).not.toHaveURL(/tour=/)
  // A fresh run opens with the intro, so the lesson waits its turn: it must be active or queued.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!
            if (!/grocery-empire$/.test(k)) continue
            const raw = localStorage.getItem(k) ?? ''
            if (raw.includes('"price"') && /"queue":\[[^\]]*"price"|"tutorialId":"price"|"id":"price"/.test(raw)) return true
          }
          return false
        }),
      { timeout: 20_000 },
    )
    .toBe(true)
})
