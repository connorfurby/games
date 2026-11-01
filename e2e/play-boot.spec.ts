import { expect, test } from '@playwright/test'

test('grocery empire play boot', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (err) => pageErrors.push(err))

  await page.goto('/play/grocery-empire')
  await expect(page.getByText(/Floor|Unpack|Baskets/i).first()).toBeVisible({ timeout: 30_000 })
  expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toEqual([])
})
