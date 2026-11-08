import { expect, test } from '@playwright/test'

/** 2.0 shell: HUD, Next-goal tag, hubs, store scene, inbox drawer, phone layout. */
test('2.0 shell boots into the store with a next goal', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/play/grocery-empire/dev')
  await page.getByTitle('Saves, settings and tools').click()
  await page.locator('.ge-dev-stage', { hasText: 'Era 2' }).first().click()
  await expect(page.locator('.g2-goal')).toBeVisible()
  await expect(page.locator('.g2-hub', { hasText: 'Store' })).toBeVisible()
  await page.locator('.g2-hub', { hasText: 'Store' }).click()
  await expect(page.locator('.sc-scene svg')).toBeVisible()
  await page.keyboard.press('m')
  await expect(page.locator('.g2-inbox')).toBeVisible()
  await page.keyboard.press('m')
  await expect(page.locator('.g2-inbox')).toHaveCount(0)
  await page.locator('.g2-hub', { hasText: 'Empire' }).click()
  await page.locator('.g2-main .g2-subtab', { hasText: 'Upgrades' }).click()
  await expect(page.locator('.u2-node').first()).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('Unpack is reachable and hubs sit at the bottom', async ({ page }) => {
    await page.goto('/play/grocery-empire/dev')
    await page.getByTitle('Saves, settings and tools').click()
    await page.locator('.ge-dev-stage', { hasText: 'Era 1' }).first().click()
    await page.locator('.g2-hub', { hasText: 'Store' }).click()
    const unpack = page.locator('.ge-unpack').first()
    await unpack.scrollIntoViewIfNeeded()
    await expect(unpack).toBeVisible()
    await unpack.click()
    const hubs = await page.locator('.g2-hubs').boundingBox()
    expect(hubs!.y).toBeGreaterThan(700)
  })
})
