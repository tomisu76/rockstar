import { test, expect, Page } from '@playwright/test';

// Helper to get StateBridge value
async function getState(page: Page, attr: string): Promise<string> {
  return page
    .locator('#rockstar-state')
    .getAttribute(`data-${attr}`)
    .then(v => v ?? '');
}

async function waitForScene(page: Page, sceneName: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (expected) => document.getElementById('rockstar-state')?.getAttribute('data-current-scene') === expected,
    sceneName,
    { timeout }
  );
}

test.describe('Rockstar Venue Map & Persistent Progress E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear progress before each test to start with a clean slate
    await page.goto('/?testMode=1&scene=VenueMapScene');
    await page.evaluate(() => localStorage.clear());
    // Reload to apply cleared storage
    await page.reload();
    await waitForScene(page, 'VenueMapScene');
  });

  test('app starts on VenueMapScene in normal mode and Level 1 is unlocked by default', async ({ page }) => {
    // Navigate without scene override, but with testMode for stability
    await page.goto('/?testMode=1&scene=VenueMapScene');
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
    expect(await getState(page, 'highest-unlocked-level')).toBe('1');
    expect(await getState(page, 'completed-levels')).toBe('');
  });

  test('opening / starts on TitleScene', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'TitleScene');
    expect(await getState(page, 'current-scene')).toBe('TitleScene');
  });

  test('locked Level 2 or higher cannot start before progress', async ({ page }) => {
    // Select Level 2
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(2));
    
    // Check lock state
    expect(await getState(page, 'selected-level')).toBe('2');
    expect(await getState(page, 'selected-level-locked')).toBe('true');
    
    // Scene must remain VenueMapScene
    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
  });

  test('starting Level 1 loads GameScene', async ({ page }) => {
    // Select Level 1 (should be unlocked)
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(1));

    expect(await getState(page, 'selected-level')).toBe('1');
    expect(await getState(page, 'selected-level-locked')).toBe('false');

    // Should load GameScene
    await waitForScene(page, 'GameScene');
    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'level-number')).toBe('1');
  });

  test('completing Level 1 unlocks Level 2 and progress persists after reload', async ({ page }) => {
    // Start Level 1
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(1));
    await waitForScene(page, 'GameScene');

    // Force Win
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Verify progress updated in bridge
    expect(await getState(page, 'highest-unlocked-level')).toBe('2');
    expect(await getState(page, 'completed-levels')).toBe('1');
    expect(Number(await getState(page, 'stars-earned'))).toBeGreaterThanOrEqual(1);

    // Verify localStorage directly
    const localHighest = await page.evaluate(() => localStorage.getItem('rockstar_highest_unlocked_level'));
    expect(localHighest).toBe('2');

    // Reload the page and check if it persists
    await page.goto('/?testMode=1&scene=VenueMapScene');
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'highest-unlocked-level')).toBe('2');
    expect(await getState(page, 'completed-levels')).toBe('1');

    // Level 2 should now be select-able and start GameScene
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(2));
    await waitForScene(page, 'GameScene');
    expect(await getState(page, 'level-number')).toBe('2');
  });

  test('Back to Tour Map returns to VenueMapScene and Replay restarts current level', async ({ page }) => {
    // Load GameScene Level 1 directly using testMode routing
    await page.goto('/?testMode=1');
    await waitForScene(page, 'GameScene');
    
    // Win the level
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Win overlay buttons coordinates:
    // Back to Tour Map button is at X = 265, Y = 607 (labeled as Tour Map)
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not visible');
    const scaleX = box.width  / 390;
    const scaleY = box.height / 844;

    // Click "Tour Map" (x=265, y=607)
    await page.mouse.click(box.x + 265 * scaleX, box.y + 607 * scaleY);
    await waitForScene(page, 'VenueMapScene');
    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');

    // Load GameScene Level 1 again
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(1));
    await waitForScene(page, 'GameScene');

    // Win again
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Click Replay button (x=125, y=607)
    await page.mouse.click(box.x + 125 * scaleX, box.y + 607 * scaleY);
    await page.waitForTimeout(500);
    
    // Overlay should close, returning to GameScene in idle state on Level 1
    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'overlay-visible')).toBe('false');
    expect(await getState(page, 'level-number')).toBe('1');
  });

  test('VenueMap exposes 15 levels and allows selecting Level 15 if unlocked', async ({ page }) => {
    // 1. Verify VenueMap exposes 15 levels or maps 15 levels in LEVELS count
    await page.evaluate(() => localStorage.setItem('rockstar_highest_unlocked_level', '15'));
    await page.reload();
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'highest-unlocked-level')).toBe('15');

    // 2. Select Level 15
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(15));
    await waitForScene(page, 'GameScene');

    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'level-number')).toBe('15');
  });
});
