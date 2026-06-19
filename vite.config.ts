import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    // NOTE: do not set `open: true` here – it conflicts with Playwright's
    // controlled browser launch. Use `npm run dev -- --open` if you want
    // the browser to auto-open during manual development.
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
