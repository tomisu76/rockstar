import Phaser from 'phaser';

/**
 * UIScene – runs in parallel on top of GameScene.
 * Currently reserved for future persistent HUD elements
 * (e.g. pause button, help tooltips, level label).
 * For MVP, all UI is drawn directly inside GameScene.
 */
export class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }
  create(): void { /* reserved */ }
}
