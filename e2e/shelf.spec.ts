import { expect, test } from '@playwright/test'

test('library shelf and shell routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Grocery Empire').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Play|Continue|New game/i }).first()).toBeVisible()

  await page.goto('/shop')
  await expect(page.getByText(/SHOP/i).first()).toBeVisible()

  await page.goto('/achievements')
  await expect(page.getByText(/Achievements/i).first()).toBeVisible()

  await page.goto('/guide/grocery-empire')
  await expect(page.getByRole('heading', { name: /Guide/i })).toBeVisible()
  await expect(page.getByText(/sections visible/i)).toBeVisible()
})
