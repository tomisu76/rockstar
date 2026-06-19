import { test, expect, Page } from '@playwright/test';

// ── Constants matching the game source ───────────────────────────────────────
// Keep these in sync with GameScene.ts BOARD_X / BOARD_Y and Tile.ts TILE_SIZE.
//
// Derivation (see GameScene.ts):
//   TILE_SIZE = 44, TILE_GAP = 2, CELL = 46
//   BOARD_W   = CELL*8 - TILE_GAP = 366
//   BOARD_X   = (390 - 366) / 2 + TILE_SIZE/2 = 12 + 22 = 34
const BOARD_ORIGIN_X = 34;   // first tile centre X in game coords
const BOARD_ORIGIN_Y = 290;  // first tile centre Y in game coords
const CELL_SIZE = 46;        // TILE_SIZE(44) + TILE_GAP(2)

// Guaranteed valid swap in testMode (row 0 col2 ↔ col3 → music_note×3 match)
const GUARANTEED_SWAP_A = { row: 0, col: 2 }; // star
const GUARANTEED_SWAP_B = { row: 0, col: 3 }; // music_note

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wait until the Phaser game has fully initialised.
 *
 * IMPORTANT: The #rockstar-state div is intentionally `display:none`.
 * page.waitForSelector() defaults to state:'visible' which would NEVER resolve
 * for a hidden element. We use waitForFunction() to read the DOM attribute
 * directly, which works on hidden elements.
 */
async function waitForGameLoaded(page: Page, timeout = 20_000): Promise<void> {
  await page.waitForFunction(
    () => document.getElementById('rockstar-state')?.getAttribute('data-loaded') === 'true',
    { timeout }
  );

  // If the game errored during load, fail fast with a readable message
  const err = await getState(page, 'error');
  if (err) throw new Error(`GameScene.create() threw: ${err}`);
}

/**
 * Read a data-* attribute from the hidden state bridge element.
 * getAttribute() works on hidden DOM elements – no visibility requirement.
 */
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

/**
 * Wait until the game returns to 'idle' state (animations settled).
 */
async function waitForIdle(page: Page, timeout = 6_000): Promise<void> {
  await page.waitForFunction(
    () => document.getElementById('rockstar-state')?.getAttribute('data-game-state') === 'idle',
    { timeout }
  );
}

/**
 * Click a game-world coordinate on the Phaser canvas.
 * Maps game coords (0–390 / 0–844) → screen coords using the canvas bounding box.
 */
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

/** Convert board row/col to game-world X,Y of the tile centre. */
function tileGameCoord(row: number, col: number): { x: number; y: number } {
  return {
    x: BOARD_ORIGIN_X + col * CELL_SIZE,
    y: BOARD_ORIGIN_Y + row * CELL_SIZE,
  };
}

// ── All tests navigate to /?testMode=1 ───────────────────────────────────────
// This loads a deterministic board (no randomness) with guaranteed valid swaps,
// so interaction tests are stable and reproducible across runs.

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Game Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Rockstar/i);
  });

  test('game container div is present in DOM', async ({ page }) => {
    await expect(page.locator('[data-testid="game-container"]')).toBeAttached();
  });

  test('Phaser canvas is rendered and visible', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test('canvas has non-zero dimensions', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('game state bridge element is present in DOM', async ({ page }) => {
    await expect(page.locator('#rockstar-state')).toBeAttached();
  });

  test('game fully loads within 20 seconds', async ({ page }) => {
    await waitForGameLoaded(page);
    const loaded = await getState(page, 'loaded');
    expect(loaded).toBe('true');
  });

  test('game has no fatal errors on load', async ({ page }) => {
    await waitForGameLoaded(page);
    const error = await getState(page, 'error');
    expect(error).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Initial Game State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('moves counter starts at 28', async ({ page }) => {
    const moves = await getState(page, 'moves-left');
    expect(moves).toBe('28');
  });

  test('moves-total is 28', async ({ page }) => {
    const total = await getState(page, 'moves-total');
    expect(total).toBe('28');
  });

  test('objective tile is gold_record', async ({ page }) => {
    const tile = await getState(page, 'objective-tile');
    expect(tile).toBe('gold_record');
  });

  test('objective collected starts at 0', async ({ page }) => {
    const collected = await getState(page, 'objective-collected');
    expect(collected).toBe('0');
  });

  test('objective target is 10 gold records', async ({ page }) => {
    const target = await getState(page, 'objective-target');
    expect(target).toBe('10');
  });

  test('crowd energy starts at 0', async ({ page }) => {
    const energy = await getState(page, 'crowd-energy');
    expect(Number(energy)).toBe(0);
  });

  test('game state is idle at start', async ({ page }) => {
    const state = await getState(page, 'game-state');
    expect(state).toBe('idle');
  });

  test('no overlay visible at start', async ({ page }) => {
    const visible = await getState(page, 'overlay-visible');
    expect(visible).toBe('false');
  });

  test('testMode flag is active', async ({ page }) => {
    const tm = await getState(page, 'test-mode');
    expect(tm).toBe('true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – HUD Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('crowd energy value is in range 0-100', async ({ page }) => {
    const energy = Number(await getState(page, 'crowd-energy'));
    expect(energy).toBeGreaterThanOrEqual(0);
    expect(energy).toBeLessThanOrEqual(100);
  });

  test('all objective data attributes are present and correct', async ({ page }) => {
    expect(await getState(page, 'objective-tile')).toBe('gold_record');
    expect(await getState(page, 'objective-target')).toBe('10');
    expect(await getState(page, 'objective-collected')).toBe('0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Player Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
    // Let tile drop animations finish before interacting
    await page.waitForTimeout(700);
  });

  test('clicking a tile does not crash the game', async ({ page }) => {
    const { x, y } = tileGameCoord(0, 0);
    await clickGameCoord(page, x, y);
    await expect(page.locator('canvas').first()).toBeVisible();
    const state = await getState(page, 'game-state');
    expect(['idle', 'swapping', 'resolving']).toContain(state);
  });

  test('guaranteed valid swap (testMode row0 col2↔col3) decrements moves', async ({ page }) => {
    const movesBefore = Number(await getState(page, 'moves-left'));

    // Click tile A (star at row0,col2)
    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350); // wait for selection state to settle

    // Click tile B (music_note at row0,col3)
    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, b.x, b.y);

    // Wait for game to return to idle (swap + match + cascade all settled)
    await waitForIdle(page, 8_000);

    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore - 1);
  });

  test('valid swap causes crowd energy to increase', async ({ page }) => {
    const energyBefore = Number(await getState(page, 'crowd-energy'));

    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, b.x, b.y);

    await waitForIdle(page, 8_000);

    const energyAfter = Number(await getState(page, 'crowd-energy'));
    expect(energyAfter).toBeGreaterThan(energyBefore);
  });

  test('multiple swap sequences keep game responsive', async ({ page }) => {
    // Perform the guaranteed swap first
    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    await clickGameCoord(page, b.x, b.y);
    await waitForIdle(page, 8_000);

    // Perform 2 more random swaps (may or may not be valid)
    for (const [row, col] of [[2, 2], [4, 4]]) {
      const p = tileGameCoord(row, col);
      const q = tileGameCoord(row, col + 1);
      await clickGameCoord(page, p.x, p.y);
      await page.waitForTimeout(350);
      await clickGameCoord(page, q.x, q.y);
      await waitForIdle(page, 8_000);
    }

    const state = await getState(page, 'game-state');
    expect(state).toBe('idle');
    const error = await getState(page, 'error');
    expect(error).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Win / Lose Overlay System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('overlay is NOT visible at game start', async ({ page }) => {
    expect(await getState(page, 'overlay-visible')).toBe('false');
    expect(await getState(page, 'overlay-type')).toBe('');
  });

  test('overlay type is empty string at start', async ({ page }) => {
    expect(await getState(page, 'overlay-type')).toBe('');
  });

  test('overlay data attributes support win and lose values', async ({ page }) => {
    // Verify the attributes exist and start in a valid state
    const visible = await getState(page, 'overlay-visible');
    const type    = await getState(page, 'overlay-type');
    expect(['false', 'true']).toContain(visible);
    expect(['', 'win', 'lose']).toContain(type);
  });

  test('forcing win with W in testMode displays overlay, sets state to win, and disables tile input', async ({ page }) => {
    // Wait for initial drops
    await page.waitForTimeout(800);

    // Force win by pressing W
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Verify overlay visibility, overlay type, and game state
    expect(await getState(page, 'overlay-visible')).toBe('true');
    expect(await getState(page, 'overlay-type')).toBe('win');
    expect(await getState(page, 'game-state')).toBe('win');

    // Record moves left before trying to interact
    const movesBefore = Number(await getState(page, 'moves-left'));

    // Attempt to select and swap (0, 2) and (0, 3) which are normally a valid swap
    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);

    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, b.x, b.y);
    await page.waitForTimeout(500);

    // Moves left must be unchanged, indicating swap attempt was rejected/disabled
    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Audio and Mute Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('mute status defaults to false', async ({ page }) => {
    const muted = await getState(page, 'muted');
    expect(muted).toBe('false');
  });

  test('clicking mute button toggles mute state in bridge', async ({ page }) => {
    const initialMuted = await getState(page, 'muted');
    expect(initialMuted).toBe('false');

    // Click top-right mute button (x=355, y=25)
    await clickGameCoord(page, 355, 25);
    const mutedAfter = await getState(page, 'muted');
    expect(mutedAfter).toBe('true');

    // Toggle back
    await clickGameCoord(page, 355, 25);
    const mutedBack = await getState(page, 'muted');
    expect(mutedBack).toBe('false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Level System & Progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('Level 1 metadata is correctly exposed in StateBridge', async ({ page }) => {
    expect(await getState(page, 'level-id')).toBe('level_001');
    expect(await getState(page, 'level-number')).toBe('1');
    expect(await getState(page, 'level-name')).toBe('Garage Band Night');
    expect(await getState(page, 'venue-name')).toBe('The Basement Garage');
    expect(await getState(page, 'objective-summary')).toBe('gold_record:0/10');
  });

  test('winning Level 1 triggers win overlay and next level button restarts on Level 2', async ({ page }) => {
    // Wait for initial tile drops
    await page.waitForTimeout(800);

    // Press 'W' to trigger instant win cheat
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Verify win overlay is visible
    expect(await getState(page, 'overlay-visible')).toBe('true');
    expect(await getState(page, 'overlay-type')).toBe('win');

    // Click next level button (located at x=195, y=547)
    await clickGameCoord(page, 195, 547);
    
    // Wait for Level 2 metadata to be set on the bridge
    await page.waitForFunction(
      () => document.getElementById('rockstar-state')?.getAttribute('data-level-id') === 'level_002',
      { timeout: 5000 }
    );

    // Verify Level 2 loads successfully
    expect(await getState(page, 'level-id')).toBe('level_002');
    expect(await getState(page, 'level-number')).toBe('2');
    expect(await getState(page, 'level-name')).toBe('Pub Warmup');
    expect(await getState(page, 'venue-name')).toBe('The Anchor Pub');
    expect(await getState(page, 'objective-summary')).toBe('gold_record:0/12');
  });

  test('losing Level 1 triggers lose overlay and try again button restarts Level 1', async ({ page }) => {
    // Wait for initial tile drops
    await page.waitForTimeout(800);

    // Press 'L' to trigger instant lose cheat
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(500);

    // Verify lose overlay is visible
    expect(await getState(page, 'overlay-visible')).toBe('true');
    expect(await getState(page, 'overlay-type')).toBe('lose');

    // Click try again button (located at x=195, y=547)
    await clickGameCoord(page, 195, 547);
    
    // Wait for overlay to hide
    await page.waitForFunction(
      () => document.getElementById('rockstar-state')?.getAttribute('data-overlay-visible') === 'false',
      { timeout: 5000 }
    );

    // Verify Level 1 restarts successfully
    expect(await getState(page, 'level-id')).toBe('level_001');
    expect(await getState(page, 'level-number')).toBe('1');
    expect(await getState(page, 'objective-summary')).toBe('gold_record:0/10');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Power-Ups & Combo System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
  });

  test('pressing P cheat spawns a microphone_blast in test mode', async ({ page }) => {
    // Wait for drop animations to finish
    await page.waitForTimeout(800);

    // Initial state: last powerup created should be empty
    expect(await getState(page, 'last-powerup-created')).toBe('');

    // Press 'P' to trigger spawn backdoor cheat
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(500);

    // Verify bridge has recorded the power-up creation
    expect(await getState(page, 'last-powerup-created')).toBe('microphone_blast');
  });

  test('swapping a power-up with a normal tile costs a move, clears tiles, and returns to idle', async ({ page }) => {
    // Wait for drops
    await page.waitForTimeout(800);

    // 1. Spawn a microphone_blast at (3, 1)
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(500);

    const movesBefore = Number(await getState(page, 'moves-left'));
    const objectiveCollectedBefore = Number(await getState(page, 'objective-collected'));

    // 2. Swap the microphone_blast at (3, 1) with (3, 2) (which is a silver_record)
    const a = tileGameCoord(3, 1);
    const b = tileGameCoord(3, 2);
    
    // Click tile A (microphone_blast)
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);

    // Click tile B (normal tile)
    await clickGameCoord(page, b.x, b.y);

    // 3. Wait for the resolution loop to complete and return to idle
    await waitForIdle(page, 8000);

    // 4. Verify moves decreased by 1 (it was a player action)
    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore - 1);

    // 5. Verify the power-up activation was logged on the bridge
    expect(await getState(page, 'last-powerup-activated')).toBe('microphone_blast');

    // 6. Verify clear count was recorded (should clear a full row or column, so at least 8 tiles cleared)
    const clearCount = Number(await getState(page, 'last-clear-count'));
    expect(clearCount).toBeGreaterThanOrEqual(8);

    // 7. Verify objective progress increases from power-up-cleared tiles
    const objectiveCollectedAfter = Number(await getState(page, 'objective-collected'));
    expect(objectiveCollectedAfter).toBeGreaterThan(objectiveCollectedBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Obstacles & Score Objectives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
    await page.waitForTimeout(800);
  });

  test('obstacle count is correctly exposed in test mode', async ({ page }) => {
    const activeObstacles = Number(await getState(page, 'active-obstacle-count'));
    const targetObstacles = Number(await getState(page, 'obstacles-target'));
    const clearedObstacles = Number(await getState(page, 'obstacles-cleared'));

    expect(activeObstacles).toBe(2); // (5,2) locked and (3,6) fogged
    expect(targetObstacles).toBe(0); // Level 1 has no obstacles target objective
    expect(clearedObstacles).toBe(0);
  });

  test('locked tile cannot be swapped and does not cost a move', async ({ page }) => {
    const movesBefore = Number(await getState(page, 'moves-left'));

    // Try to swap locked tile at (5, 2) with normal tile at (5, 3)
    const a = tileGameCoord(5, 2);
    const b = tileGameCoord(5, 3);

    // Click tile A (locked)
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);

    // Click tile B (normal)
    await clickGameCoord(page, b.x, b.y);
    await page.waitForTimeout(500);

    // Verify moves left did not change and game remains idle
    const movesAfter = Number(await getState(page, 'moves-left'));
    expect(movesAfter).toBe(movesBefore);

    const gameState = await getState(page, 'game-state');
    expect(gameState).toBe('idle');
  });

  test('power-up clears at least one obstacle, updates score and state, and returns to idle', async ({ page }) => {
    const scoreBefore = Number(await getState(page, 'score'));
    expect(scoreBefore).toBe(0);

    // 1. Spawn a microphone_blast at (3, 1)
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(500);

    // 2. Swap the microphone_blast at (3, 1) with (3, 2)
    const a = tileGameCoord(3, 1);
    const b = tileGameCoord(3, 2);
    
    // Click tile A (microphone_blast)
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);

    // Click tile B (normal tile)
    await clickGameCoord(page, b.x, b.y);

    // 3. Wait for the resolution loop to complete and return to idle
    await waitForIdle(page, 8000);

    // 4. Verify that score increased
    const scoreAfter = Number(await getState(page, 'score'));
    expect(scoreAfter).toBeGreaterThan(0);

    // 5. Verify that at least one obstacle was cleared (either (5,2) locked or (3,6) fogged)
    const clearedObstacles = Number(await getState(page, 'obstacles-cleared'));
    expect(clearedObstacles).toBeGreaterThanOrEqual(1);

    const lastObstacle = await getState(page, 'last-obstacle-cleared');
    expect(['locked', 'fog']).toContain(lastObstacle);

    const activeObstacles = Number(await getState(page, 'active-obstacle-count'));
    expect(activeObstacles).toBeLessThan(2);
  });

  test('normal match-3 swap increases the score', async ({ page }) => {
    const scoreBefore = Number(await getState(page, 'score'));
    expect(scoreBefore).toBe(0);

    // Perform the guaranteed valid swap (music_note match-3)
    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, b.x, b.y);

    await waitForIdle(page, 8000);

    const scoreAfter = Number(await getState(page, 'score'));
    expect(scoreAfter).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Resolution & Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForGameLoaded(page);
    await page.waitForTimeout(800);
  });

  test('no runtime errors and game loads successfully', async ({ page }) => {
    const error = await getState(page, 'error');
    expect(error).toBe('');
    const loaded = await getState(page, 'loaded');
    expect(loaded).toBe('true');
  });

  test('clearing a match still returns game to idle', async ({ page }) => {
    // Perform guaranteed swap to clear match
    const a = tileGameCoord(GUARANTEED_SWAP_A.row, GUARANTEED_SWAP_A.col);
    await clickGameCoord(page, a.x, a.y);
    await page.waitForTimeout(350);
    const b = tileGameCoord(GUARANTEED_SWAP_B.row, GUARANTEED_SWAP_B.col);
    await clickGameCoord(page, b.x, b.y);

    // Verify it resolves correctly and goes back to idle state without error
    await waitForIdle(page, 8000);
    expect(await getState(page, 'game-state')).toBe('idle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Title Screen & Onboarding v1.0', () => {
  test('title screen loads with app metadata', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'TitleScene');
    expect(await getState(page, 'current-scene')).toBe('TitleScene');
    expect(await getState(page, 'app-version')).toBe('v1.0-demo');
  });

  test('Play button resets progress and starts Tour Map', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'TitleScene');

    // Tap "▶ START TOUR" (X=195, Y=456)
    await clickGameCoord(page, 195, 456);
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
    expect(await getState(page, 'highest-unlocked-level')).toBe('1');
  });

  test('Continue button only appears when progress exists and navigates to VenueMapScene', async ({ page }) => {
    // 1. Clear progress first, open title screen
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScene(page, 'TitleScene');

    // Attempt to tap the continue button area (X=195, Y=524)
    await clickGameCoord(page, 195, 524);
    await page.waitForTimeout(400);
    // Should still be on TitleScene (Continue is hidden/inactive)
    expect(await getState(page, 'current-scene')).toBe('TitleScene');

    // 2. Set progress in localStorage
    await page.evaluate(() => {
      localStorage.setItem('rockstar_highest_unlocked_level', '3');
      localStorage.setItem('rockstar_level_stats', JSON.stringify({
        1: { score: 5000, energy: 90, stars: 2 }
      }));
    });
    await page.reload();
    await waitForScene(page, 'TitleScene');

    // Tap "⏭ CONTINUE TOUR" (X=195, Y=524)
    await clickGameCoord(page, 195, 524);
    await waitForScene(page, 'VenueMapScene');

    expect(await getState(page, 'current-scene')).toBe('VenueMapScene');
    expect(await getState(page, 'highest-unlocked-level')).toBe('3');
  });

  test('Level 1 onboarding tutorial blocks board, then got-it button unblocks it', async ({ page }) => {
    // Navigate with showTutorial override
    await page.goto('/?testMode=1&showTutorial=1');
    await waitForGameLoaded(page);

    // Initial state under tutorial should block swaps (state is resolving)
    expect(await getState(page, 'current-scene')).toBe('GameScene');
    expect(await getState(page, 'game-state')).toBe('resolving');

    // Tap "GOT IT" (X=195, Y=552)
    await clickGameCoord(page, 195, 552);
    await page.waitForTimeout(400);

    // State should now be idle (unblocked)
    expect(await getState(page, 'game-state')).toBe('idle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Rockstar Match-3 – Dead Board Reshuffling E2E', () => {
  test('automatic reshuffle triggers on dead board, recovers to idle, and does not cost a move', async ({ page }) => {
    // 1. Load the deterministic dead board
    await page.goto('/?testMode=1&deadBoard=1');
    await waitForGameLoaded(page);

    // 2. Wait until the board finishes reshuffling and returns to idle
    await waitForIdle(page, 10_000);

    // 3. Verify state and telemetry parameters via the StateBridge
    const lastAction = await getState(page, 'last-board-action');
    const shuffleCount = Number(await getState(page, 'shuffle-count'));
    const movesLeft = Number(await getState(page, 'moves-left'));
    const gameState = await getState(page, 'game-state');

    expect(lastAction).toBe('shuffle');
    expect(shuffleCount).toBeGreaterThanOrEqual(1);
    expect(gameState).toBe('idle');
    expect(movesLeft).toBe(28); // Level 1 moves total is 28; automatic shuffle must NOT consume a move
  });
});




