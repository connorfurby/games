import { expect, test } from '@playwright/test'

const seed = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('games.v1.meta') ?? '{}')
    meta.shelfTokens = 9
    meta.achievements = { 'test-ach': { unlockedAt: 1 } }
    localStorage.setItem('games.v1.meta', JSON.stringify(meta))
    localStorage.setItem('games.v1.grocery-museum', JSON.stringify({ v: 2, relics: { 'fake-relic': 1 } }))
  })
  // A run has to exist for Home to offer New game.
  await page.goto('/play/grocery-empire')
  await page.waitForTimeout(1500)
  await page.goto('/')
}
const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    meta: JSON.parse(localStorage.getItem('games.v1.meta') ?? '{}'),
    museum: localStorage.getItem('games.v1.grocery-museum') ?? '',
  }))

/** New game asks what happens to the collection, and does exactly that. */
test('new game: keep my collection keeps relics, awards and tokens', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'New game' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Start a new game' })
  await expect(dialog).toBeVisible()
  // Nothing is pre-selected: starting over is never an accident.
  await expect(dialog.getByRole('button', { name: 'Start new game' })).toBeDisabled()
  await dialog.getByRole('radio', { name: /Keep my collection/ }).click()
  await dialog.getByRole('button', { name: 'Start new game' }).click()
  await page.waitForURL('**/play/grocery-empire')
  const after = await read(page)
  expect(after.meta.shelfTokens).toBe(9)
  expect(after.meta.achievements['test-ach']).toBeTruthy()
  expect(after.museum).toContain('fake-relic')
})

test('new game: start completely fresh clears the collection too', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'New game' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Start a new game' })
  await dialog.getByRole('radio', { name: /Start completely fresh/ }).click()
  await dialog.getByRole('button', { name: 'Erase everything and start' }).click()
  await page.waitForURL('**/play/grocery-empire')
  await expect.poll(async () => (await read(page)).meta.shelfTokens).toBe(0)
  const after = await read(page)
  expect(Object.keys(after.meta.achievements ?? {})).toHaveLength(0)
  expect(after.museum).not.toContain('fake-relic')
})
