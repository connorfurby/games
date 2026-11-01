import { expect, test } from '@playwright/test'

test('shop tabs switch without crash', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByText(/SHOP/i).first()).toBeVisible()
  for (const label of ['Packs', 'Ledger skins', 'Unpack FX', 'Ornaments', 'Bundles']) {
    await page.getByRole('tab', { name: label }).click()
    await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true')
  }
})
