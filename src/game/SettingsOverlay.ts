import Phaser from 'phaser';
import { SoundEffects } from './SoundEffects';
import { ProgressManager } from '../utils/ProgressManager';

export class SettingsOverlay extends Phaser.GameObjects.Container {
  private panel!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private musicBtn!: Phaser.GameObjects.Text;
  private sfxBtn!: Phaser.GameObjects.Text;
  private resetBtn!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Text;
  private onResetProgress?: () => void;

  constructor(scene: Phaser.Scene, onResetProgress?: () => void) {
    super(scene, 0, 0);
    this.onResetProgress = onResetProgress;
    this.setDepth(15000);
    this.setVisible(false);

    // Dark semi-transparent full screen dim background
    const dim = scene.add.graphics();
    dim.fillStyle(0x000000, 0.82);
    dim.fillRect(0, 0, 390, 844);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 390, 844), Phaser.Geom.Rectangle.Contains);
    this.add(dim);

    // Settings panel card
    const panelY = 844 / 2 - 180;
    const panelX = 45;
    const panelW = 300;
    const panelH = 360;

    this.panel = scene.add.graphics();
    this.panel.fillStyle(0x130024, 0.96);
    this.panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    this.panel.lineStyle(3, 0xff2d78, 1);
    this.panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    this.add(this.panel);

    // Title
    this.titleText = scene.add.text(390 / 2, panelY + 40, 'SETTINGS', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff2d78',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.titleText);

    // Buttons container positions
    const startY = panelY + 110;
    const spacingY = 55;

    // Music toggle button
    this.musicBtn = scene.add.text(390 / 2, startY, '', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#2b104a',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.musicBtn.on('pointerdown', () => this.toggleMusic());
    this.add(this.musicBtn);

    // SFX toggle button
    this.sfxBtn = scene.add.text(390 / 2, startY + spacingY, '', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#2b104a',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.sfxBtn.on('pointerdown', () => this.toggleSfx());
    this.add(this.sfxBtn);

    // Reset Progress button
    this.resetBtn = scene.add.text(390 / 2, startY + spacingY * 2, 'Reset Progress', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ff4d4d',
      backgroundColor: '#2b104a',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.resetBtn.on('pointerdown', () => {
      ProgressManager.clearProgress();
      if (this.onResetProgress) {
        this.onResetProgress();
      }
      this.close();
    });
    this.add(this.resetBtn);

    // Close button
    this.closeBtn = scene.add.text(390 / 2, startY + spacingY * 3 + 10, 'CLOSE', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#ff2d78',
      padding: { x: 26, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());
    this.add(this.closeBtn);

    this.updateButtons();
    scene.add.existing(this);
  }

  show(): void {
    this.updateButtons();
    this.setVisible(true);
  }

  close(): void {
    this.setVisible(false);
  }

  private toggleMusic(): void {
    SoundEffects.toggleMusicMuted();
    this.updateButtons();
  }

  private toggleSfx(): void {
    SoundEffects.toggleSfxMuted();
    this.updateButtons();
  }

  private updateButtons(): void {
    const musicMuted = SoundEffects.getMusicMuted();
    const sfxMuted = SoundEffects.getSfxMuted();
    this.musicBtn.setText(`Music: ${musicMuted ? 'OFF' : 'ON'}`);
    this.sfxBtn.setText(`Sound Effects: ${sfxMuted ? 'OFF' : 'ON'}`);
  }
}
