import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { VenueMapScene } from './scenes/VenueMapScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

// ── Parse URL flags ─────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
export const TEST_MODE = params.get('testMode') === '1';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0014',
  // Force canvas renderer in headless/test environments for maximum compatibility
  // (WebGL is preferred in real browsers, but AUTO handles fallback gracefully)
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  // Ensures the game loop keeps running even when the tab/window is not focused.
  // Critical for headless Playwright tests where the page is never "visible".
  autoFocus: false,
  fps: {
    // Use setTimeout instead of requestAnimationFrame so the game loop
    // continues in environments where rAF is throttled (headless browsers).
    forceSetTimeOut: true,
    target: 60,
  },
  scene: [BootScene, TitleScene, VenueMapScene, GameScene, UIScene],
};

new Phaser.Game(config);
