import { expect, test } from '@playwright/test'

test('shop tabs switch without crash', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: /Dress the counter/i })).toBeVisible()
  for (const label of ['Packs', 'Ledger skins', 'Unpack FX', 'Ornaments', 'Bundles']) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${label}`) })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  }
})
