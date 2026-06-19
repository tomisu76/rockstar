import { test, expect, Page } from '@playwright/test';

// State helper
async function getState(page: Page, attr: string): Promise<string> {
  return page.locator('#rockstar-state').getAttribute(`data-${attr}`).then(v => v ?? '');
}

async function waitForScene(page: Page, sceneName: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (expected) => document.getElementById('rockstar-state')?.getAttribute('data-current-scene') === expected,
    sceneName,
    { timeout }
  );
}

async function waitForIdle(page: Page, timeout = 8_000): Promise<void> {
  await page.waitForFunction(
    () => document.getElementById('rockstar-state')?.getAttribute('data-game-state') === 'idle',
    { timeout }
  );
}

async function tapGameCoord(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Phaser canvas not found or not visible');

  const scaleX = box.width  / 390;
  const scaleY = box.height / 844;

  await page.touchscreen.tap(
    box.x + gameX * scaleX,
    box.y + gameY * scaleY,
  );
}

test.describe('Rockstar Match-3 - Mobile Touch & Responsive Checks', () => {
  test.beforeEach(async ({ page }) => {
    // Make sure we start with a fresh clear state
    await page.goto('/?testMode=1&scene=VenueMapScene');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScene(page, 'VenueMapScene');
  });

  test('app loads and VenueMapScene is usable with touch taps', async ({ page }) => {
    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
    expect(await getState(page, 'highest-unlocked-level')).toBe('1');

    // Tap Level 1 node programmatically or via touch tap coordinate
    await page.evaluate(() => (window as any).rockstarTest.selectLevel(1));
    await waitForScene(page, 'GameScene');

    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'level-number')).toBe('1');
  });

  test('tile taps and swaps work via touchscreen taps', async ({ page }) => {
    // Load GameScene Level 1 directly
    await page.goto('/?testMode=1');
    await waitForScene(page, 'GameScene');
    await page.waitForTimeout(800);
    await waitForIdle(page);

    const movesBefore = Number(await getState(page, 'moves-left'));

    // Swap row 0 col 2 with col 3. Coords:
    // row 0 col 2: X = 34 + 2*46 = 126, Y = 290.
    // row 0 col 3: X = 34 + 3*46 = 172, Y = 290.
    await tapGameCoord(page, 126, 290);
    await page.waitForTimeout(350);
    await tapGameCoord(page, 172, 290);

    await waitForIdle(page);

    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore - 1);
  });

  test('mute button works via touchscreen tap', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForScene(page, 'GameScene');

    const mutedBefore = await getState(page, 'muted');
    expect(mutedBefore).toBe('false');

    // Mute button coordinate is at X = GAME_W - 35 = 355, Y = 25
    await tapGameCoord(page, 355, 25);
    await page.waitForTimeout(300);

    const mutedAfter = await getState(page, 'muted');
    expect(mutedAfter).toBe('true');
  });

  test('overlay buttons can be tapped via touchscreen tap', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForScene(page, 'GameScene');

    // Force Win
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    expect(await getState(page, 'overlay-visible')).toBe('true');

    // Tap Tour Map button on win overlay: X = 265, Y = 607
    await tapGameCoord(page, 265, 607);
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
  });

  test('responsive viewport layout checks', async ({ page }) => {
    const viewports = [
      { name: 'iPhone', width: 390, height: 844 },
      { name: 'Android Pixel', width: 412, height: 915 },
      { name: 'Small Portrait', width: 320, height: 480 },
      { name: 'Tall Portrait', width: 360, height: 950 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?testMode=1');
      await waitForScene(page, 'GameScene');

      // Verify canvas is visible and active
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Check no crash state
      expect(await getState(page, 'loaded')).toBe('true');
    }
  });

  test('exposes app version correctly', async ({ page }) => {
    await page.goto('/');
    const version = await getState(page, 'app-version');
    expect(version).toBe('v1.0-demo');
  });
});
