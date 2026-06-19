import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Rockstar Match-3 E2E tests.
 *
 * Key design decisions:
 * - Tests always navigate to /?testMode=1 for a deterministic board.
 * - The Vite dev server is started automatically (or reused if already running).
 * - Traces and screenshots are captured only on failure.
 * - Single worker to avoid port conflicts (canvas-based game, stateful server).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  fullyParallel: false, // match-3 is stateful; serial execution is safer
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 1 retry locally to handle timing flakiness
  workers: 1,

  // ── Reporters ──────────────────────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // ── Global test settings ───────────────────────────────────────────────────
  use: {
    // /?testMode=1 gives a fixed seeded board — no randomness in tests
    baseURL: 'http://localhost:5173',

    // Capture traces and screenshots only on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    // Viewport matches Phaser game size + browser chrome
    viewport: { width: 430, height: 932 },
    hasTouch: true,

    // Extra time for canvas-based game animation settle
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  // ── Projects (browsers) ───────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: {
        // Plain desktop Chromium – no touch emulation.
        // Phaser's input system responds most reliably to mouse events here.
        // hasTouch:true (mobile device profiles) can cause page.mouse.click()
        // to be deprioritised vs touch events, making tile taps unreliable.
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
      testIgnore: '**/mobile-touch.spec.ts',
    },
    {
      name: 'mobile-touch',
      use: {
        ...devices['iPhone 14 Pro Max'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: '**/mobile-touch.spec.ts',
    },
  ],

  // ── Dev server ────────────────────────────────────────────────────────────
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
