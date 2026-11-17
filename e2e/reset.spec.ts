import { expect, test, type Page } from '@playwright/test'

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'App menu' }).first().click()
  await page.locator('.waffle__cell', { hasText: /settings/i }).first().click()
}

/** Reset can clear the run, museum, shop tokens and achievements, each on its own. */
test('scoped reset clears what is ticked and keeps the rest', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('games.v1.meta') ?? '{}')
    meta.shelfTokens = 77
    meta.achievements = { 'test-ach': { unlockedAt: 1 } }
    localStorage.setItem('games.v1.meta', JSON.stringify(meta))
    localStorage.setItem('games.v1.grocery-museum', JSON.stringify({ v: 2, relics: { 'fake-relic': 1 } }))
  })
  await page.reload()

  const read = () =>
    page.evaluate(() => ({
      meta: JSON.parse(localStorage.getItem('games.v1.meta') ?? '{}'),
      museum: localStorage.getItem('games.v1.grocery-museum') ?? '',
    }))
  expect((await read()).meta.shelfTokens).toBe(77)

  await openSettings(page)
  const reset = page.getByRole('group', { name: 'What to reset' })
  await expect(reset).toBeVisible()

  // Museum + shop only: achievements stay.
  await reset.getByLabel(/Current run/).uncheck()
  await reset.getByLabel(/Museum/).check()
  await reset.getByLabel(/Shop and tokens/).check()
  await page.getByPlaceholder('RESET').fill('RESET')
  await page.getByRole('button', { name: 'Reset museum and shop and tokens' }).click()
  await page.waitForURL('**/')
  await expect.poll(async () => (await read()).meta.shelfTokens).toBe(0)
  const after = await read()
  expect(after.meta.achievements['test-ach']).toBeTruthy()
  expect(after.museum).not.toContain('fake-relic')

  // Achievements drag the shop with them.
  await openSettings(page)
  const again = page.getByRole('group', { name: 'What to reset' })
  await again.getByLabel(/Current run/).uncheck()
  await again.getByLabel(/Achievements/).check()
  await expect(again.getByLabel(/Shop and tokens/)).toBeChecked()
  await expect(again.getByLabel(/Shop and tokens/)).toBeDisabled()
  await page.getByPlaceholder('RESET').fill('RESET')
  await page.getByRole('button', { name: 'Reset shop and tokens and achievements' }).click()
  await expect.poll(async () => Object.keys((await read()).meta.achievements ?? {}).length).toBe(0)
})
