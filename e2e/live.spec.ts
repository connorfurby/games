import { expect, test } from '@playwright/test'

test('play route reloads in place and the till keeps ticking', async ({ page }) => {
  await page.goto('/play/grocery-empire')
  await expect(page.getByText("This page doesn't exist")).toHaveCount(0)

  const cash = page.locator('.g2-stat--cash .g2-stat__value')
  await expect(cash).toBeVisible()

  // A fresh run opens on the intro, which holds the clock. Skip it, then make one sale by hand.
  const skip = page.getByRole('button', { name: 'Skip intro' })
  if (await skip.count()) await skip.click()
  const text1 = await cash.textContent()
  await expect
    .poll(
      async () => {
        const verb = page.locator('.pf__primary button').first()
        if (await verb.isEnabled().catch(() => false)) await verb.click().catch(() => {})
        return cash.textContent()
      },
      { timeout: 8000 },
    )
    .not.toBe(text1)

  await page.reload()
  await expect(page).toHaveURL(/\/play\/grocery-empire/)
  await expect(page.locator('.g2-stat--cash')).toBeVisible()
  await expect(page.locator('.g2-stat--cash .g2-stat__label')).toHaveText(/Cash/i)
})
