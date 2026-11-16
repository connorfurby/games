import { expect, test } from '@playwright/test'

test('library shelf and shell routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Grocery Empire').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Play|Continue|Start/i }).first()).toBeVisible()

  await page.goto('/shop')
  await expect(page.getByText(/SHOP/i).first()).toBeVisible()

  await expect(page.locator('.shell-bar__nav').getByRole('link', { name: 'Awards' })).toBeVisible()

  await page.goto('/achievements')
  await expect(page.getByText(/Achievements/i).first()).toBeVisible()

  await page.goto('/news')
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/40\.0/)
  await page.getByRole('tab', { name: 'Meta' }).click()
  await expect(page.locator('.news-list__row')).toHaveCount(1)

  await page.goto('/guide/grocery-empire')
  await expect(page.getByRole('heading', { name: /Ops Wiki/i })).toBeVisible()
  await expect(page.getByText(/articles/i)).toBeVisible()
})
