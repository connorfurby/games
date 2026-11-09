import { expect, test } from '@playwright/test'

test('grocery empire guide shows title and spoiler toggle', async ({ page }) => {
  await page.goto('/guide/grocery-empire')

  await expect(page.getByRole('heading', { name: /Ops Wiki/i })).toBeVisible()
  await expect(page.getByText(/articles/i)).toBeVisible()

  const spoilers = page.getByRole('checkbox', { name: /Show spoilers/i })
  await expect(spoilers).toBeVisible()
  await expect(spoilers).not.toBeChecked()

  const before = await page.getByText(/articles/i).textContent()
  await spoilers.check()
  await expect(spoilers).toBeChecked()

  const after = await page.getByText(/articles/i).textContent()
  expect(after).not.toEqual(before)
  await expect(page.getByText(/SPOILER|Era 2|Cold|Charter/i).first()).toBeVisible()
})
