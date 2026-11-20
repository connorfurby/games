import { expect, test } from '@playwright/test'

/** First visit asks for a name; Social greets you by it and every room opens. */
test('social: pick a name, then every room opens', async ({ page }) => {
  await page.goto('/social?onboard')
  const dialog = page.getByRole('dialog', { name: 'Welcome to the shelf' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Your name', { exact: true }).fill('Connor')
  await dialog.getByRole('button', { name: 'Let’s go' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Hi, Connor')).toBeVisible()

  const rooms = page.getByRole('navigation', { name: 'Social rooms' })
  await rooms.getByRole('link', { name: /Compete/ }).click()
  await expect(page.getByText('Weekly cup', { exact: true })).toBeVisible()
  await rooms.getByRole('link', { name: /Leaderboards|Ranks/ }).click()
  await expect(page.getByRole('list', { name: 'Top three' })).toBeVisible()
  await rooms.getByRole('link', { name: /Friends/ }).click()
  await page.getByLabel('Search players').fill('ava')
  await expect(page.getByRole('link', { name: /Ava Haddad/ }).first()).toBeVisible()
  await page
    .getByRole('link', { name: /Ava Haddad/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Ava Haddad' })).toBeVisible()
})

test('play HUD has no separate Shelf pill; the store name goes home', async ({ page }) => {
  await page.goto('/play/grocery-empire')
  await expect(page.locator('.g2-hud__home')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.g2-hud__shelf')).toHaveCount(0)
})
