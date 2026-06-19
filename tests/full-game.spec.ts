import { test, expect, Page } from '@playwright/test';

// ── Constants matching game coords ───────────────────────────────────────────
const BOARD_ORIGIN_X = 34;
const BOARD_ORIGIN_Y = 290;
const CELL_SIZE = 46;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function waitForGameLoaded(page: Page, timeout = 20_000): Promise<void> {
  await page.waitForFunction(
    () => document.getElementById('rockstar-state')?.getAttribute('data-loaded') === 'true',
    { timeout }
  );
  const err = await getState(page, 'error');
  if (err) throw new Error(`GameScene.create() threw: ${err}`);
}

async function getState(page: Page, attr: string): Promise<string> {
  return page
    .locator('#rockstar-state')
    .getAttribute(`data-${attr}`)
    .then(v => v ?? '');
}

async function waitForIdle(page: Page, timeout = 8_000): Promise<void> {
  await page.waitForFunction(
    () => document.getElementById('rockstar-state')?.getAttribute('data-game-state') === 'idle',
    { timeout }
  );
}

async function clickGameCoord(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Phaser canvas not found or not visible');

  const scaleX = box.width  / 390;
  const scaleY = box.height / 844;

  await page.mouse.click(
    box.x + gameX * scaleX,
    box.y + gameY * scaleY,
  );
}

function tileGameCoord(row: number, col: number): { x: number; y: number } {
  return {
    x: BOARD_ORIGIN_X + col * CELL_SIZE,
    y: BOARD_ORIGIN_Y + row * CELL_SIZE,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 - Full Game Verification Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
    await page.waitForTimeout(800); // let drop animations complete
  });

  test('verifies app loads, scene metadata, and level 1 initial state', async ({ page }) => {
    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'level-number')).toBe('1');
    expect(await getState(page, 'game-state')).toBe('idle');
    expect(await getState(page, 'moves-left')).toBe('28');
    expect(await getState(page, 'score')).toBe('0');
    expect(await getState(page, 'crowd-energy')).toBe('0');
    expect(await getState(page, 'objective-summary')).toBe('gold_record:0/10');
  });

  test('verifies level flow and progression across all 15 levels', async ({ page }) => {
    for (let currentLvl = 1; currentLvl <= 15; currentLvl++) {
      // 1. Check current level number
      expect(Number(await getState(page, 'level-number'))).toBe(currentLvl);

      // 2. Win the level using cheat key
      await page.keyboard.press('KeyW');
      await page.waitForTimeout(500);

      // 3. Verify win overlay is visible
      expect(await getState(page, 'overlay-visible')).toBe('true');
      expect(await getState(page, 'overlay-type')).toBe('win');

      // 4. Click Next Concert button to proceed
      await clickGameCoord(page, 195, 547);
      
      // Let next level load and resolve drops
      await page.waitForTimeout(800);
      await waitForIdle(page);
    }

    // After Level 15 win, it should wrap back to Level 1
    expect(await getState(page, 'level-number')).toBe('1');
  });

  test('verifies lose overlay and Try Again button reloads same level', async ({ page }) => {
    // 1. Force lose the level
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(500);

    // 2. Verify lose overlay is visible
    expect(await getState(page, 'overlay-visible')).toBe('true');
    expect(await getState(page, 'overlay-type')).toBe('lose');

    // 3. Click Try Again
    await clickGameCoord(page, 195, 547);
    await page.waitForTimeout(800);
    await waitForIdle(page);

    // 4. Verify we are still on Level 1
    expect(await getState(page, 'level-number')).toBe('1');
    expect(await getState(page, 'overlay-visible')).toBe('false');
  });

  test('verifies valid swap decreases moves, increases score and energy, and returns to idle', async ({ page }) => {
    const movesBefore = Number(await getState(page, 'moves-left'));
    const scoreBefore = Number(await getState(page, 'score'));
    const energyBefore = Number(await getState(page, 'crowd-energy'));

    // Swap row 0 col 2 (star) with col 3 (music_note) -> creates match-3 of music_note
    const a = tileGameCoord(0, 2);
    const b = tileGameCoord(0, 3);

    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);

    await waitForIdle(page);

    const movesAfter = Number(await getState(page, 'moves-left'));
    const scoreAfter = Number(await getState(page, 'score'));
    const energyAfter = Number(await getState(page, 'crowd-energy'));

    expect(movesAfter).toBe(movesBefore - 1);
    expect(scoreAfter).toBeGreaterThan(scoreBefore);
    expect(energyAfter).toBeGreaterThan(energyBefore);
    expect(await getState(page, 'game-state')).toBe('idle');
  });

  test('verifies locked tile cannot be swapped and does not cost a move', async ({ page }) => {
    const movesBefore = Number(await getState(page, 'moves-left'));

    // (5, 2) is a locked tile in Level 1 testMode. Try to swap it with (5, 3).
    const a = tileGameCoord(5, 2);
    const b = tileGameCoord(5, 3);

    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);
    await page.waitForTimeout(500);

    // Moves left must be unchanged, game remains idle
    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore);
    expect(await getState(page, 'game-state')).toBe('idle');
  });

  test('verifies fog deflection and obstacle clears', async ({ page }) => {
    // 1. Inject obstacle setup
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(400);

    // Initial check: active obstacles = 2 (locked at 5,2 and fog at 3,6)
    expect(Number(await getState(page, 'active-obstacle-count'))).toBe(2);

    // 2. Spawn Microphone Blast at (3, 1)
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(400);

    // Swap horizontally (3, 1) with (3, 0) to trigger row 3 clear.
    // Row 3 contains fog at (3, 6).
    const a = tileGameCoord(3, 1);
    const b = tileGameCoord(3, 0);

    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);

    await waitForIdle(page);

    // Active obstacle count should decrease to 1 (fog cleared, locked remains)
    expect(Number(await getState(page, 'active-obstacle-count'))).toBe(1);
    expect(await getState(page, 'last-obstacle-cleared')).toBe('fog');

    // The fogged tile itself should remain (so no gravity empty cell created at 3,6)
    // We verify this by resetting and clearing the column which contains the locked tile.
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(400);

    // Spawn and trigger column blast (c=2) which hits locked tile at (5, 2)
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(400);

    const a2 = tileGameCoord(3, 1);
    const b2 = tileGameCoord(3, 2); // swap to (3, 2) to activate column clear on col 2

    await clickGameCoord(page, a2.x, a2.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b2.x, b2.y);

    await waitForIdle(page);

    expect(Number(await getState(page, 'active-obstacle-count'))).toBe(1); // lock cleared, fog remains
    expect(await getState(page, 'last-obstacle-cleared')).toBe('locked');
  });

  test('verifies all power-up types spawn and activate correctly', async ({ page }) => {
    // ── Spotlight Burst ──
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(400);
    expect(await getState(page, 'last-powerup-created')).toBe('spotlight_burst');

    let a = tileGameCoord(3, 1);
    let b = tileGameCoord(3, 2);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);
    await waitForIdle(page);

    expect(await getState(page, 'last-powerup-activated')).toBe('spotlight_burst');
    expect(Number(await getState(page, 'last-clear-count'))).toBeGreaterThanOrEqual(9);

    // ── Stage Explosion ──
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    await page.keyboard.press('KeyX');
    await page.waitForTimeout(400);
    expect(await getState(page, 'last-powerup-created')).toBe('stage_explosion');

    a = tileGameCoord(3, 1);
    b = tileGameCoord(3, 2);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);
    await waitForIdle(page);

    expect(await getState(page, 'last-powerup-activated')).toBe('stage_explosion');
    expect(Number(await getState(page, 'last-clear-count'))).toBeGreaterThanOrEqual(25);

    // ── Superstar Power-Up ──
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    await page.keyboard.press('KeyS');
    await page.waitForTimeout(400);
    expect(await getState(page, 'last-powerup-created')).toBe('superstar_power');

    a = tileGameCoord(3, 1);
    b = tileGameCoord(3, 2);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);
    await waitForIdle(page);

    expect(await getState(page, 'last-powerup-activated')).toBe('superstar_power');
  });
});
