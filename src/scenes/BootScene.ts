import Phaser from 'phaser';
import { StateBridge } from '../testing/StateBridge';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    StateBridge.setCurrentScene('BootScene');

    // Progress bar loading screen
    const width = 390;
    const height = 844;
    
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a0033, 0.85);
    progressBox.fillRoundedRect(width / 2 - 140, height / 2 - 25, 280, 50, 10);
    progressBox.lineStyle(2, 0xff2d78, 0.6);
    progressBox.strokeRoundedRect(width / 2 - 140, height / 2 - 25, 280, 50, 10);
    
    const progressBar = this.add.graphics();

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'LOADING STAGE...',
      style: { font: 'bold 16px monospace', color: '#ffffff' }
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xff2d78, 1);
      progressBar.fillRoundedRect(width / 2 - 130, height / 2 - 15, 260 * value, 30, 6);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Safe asset loading fallback
    this.load.on('loaderror', (fileObj: any) => {
      console.warn(`[BootScene] Safe asset fallback - Failed to load key: ${fileObj.key}`);
      StateBridge.markError(`Asset failed to load: ${fileObj.key}`);
    });

    // Load SVG tile assets
    this.load.svg('gold_record', 'assets/tiles/gold_record.svg');
    this.load.svg('silver_record', 'assets/tiles/silver_record.svg');
    this.load.svg('music_note', 'assets/tiles/music_note.svg');
    this.load.svg('star', 'assets/tiles/star.svg');
    this.load.svg('spotlight', 'assets/tiles/spotlight.svg');
    this.load.svg('speaker', 'assets/tiles/speaker.svg');
    this.load.svg('microphone_blast', 'assets/tiles/microphone_blast.svg');
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    const testMode = params.get('testMode') === '1';
    const sceneParam = params.get('scene');

    if (sceneParam === 'VenueMapScene') {
      this.scene.start('VenueMapScene');
    } else if (sceneParam === 'TitleScene') {
      this.scene.start('TitleScene');
    } else if (testMode && !sceneParam) {
      this.scene.start('GameScene', { levelIndex: 0 });
    } else {
      this.scene.start('TitleScene');
    }
  }
}
