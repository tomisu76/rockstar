import Phaser from 'phaser';
import { TileType, TILE_DEFS } from '../config/TileDefs';

export const TILE_SIZE = 44;
export const TILE_GAP  = 2;

export const WOW_TILE_TEXTURES: Record<string, string> = {
  gold_record: 'wow-gold-record',
  silver_record: 'wow-silver-record',
  music_note: 'wow-music-note',
  spotlight: 'wow-spotlight',
  speaker: 'wow-speaker',
  microphone_blast: 'wow-microphone-blast',
  spotlight_burst: 'wow-spotlight-burst',
  stage_explosion: 'wow-stage-explosion'
};

/** A single board tile – a Phaser Container with a shape + icon text. */
export class Tile extends Phaser.GameObjects.Container {
  tileType: TileType;
  isPowerUp: boolean;
  row: number;
  col: number;

  private bg?: Phaser.GameObjects.Graphics;
  private icon?: Phaser.GameObjects.Text;
  private sprite?: Phaser.GameObjects.Image;

  private lockedOverlay?: Phaser.GameObjects.Graphics;
  private lockedIcon?: Phaser.GameObjects.Text;
  private fogOverlay?: Phaser.GameObjects.Graphics;
  private fogIcon?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    row: number,
    col: number,
    tileType: TileType,
    x: number,
    y: number
  ) {
    super(scene, x, y);
    this.row = row;
    this.col = col;
    this.tileType = tileType;
    this.isPowerUp = ['microphone_blast', 'spotlight_burst', 'stage_explosion', 'superstar_power'].includes(tileType);

    this.buildGraphics(scene);
    scene.add.existing(this);
    this.setSize(TILE_SIZE, TILE_SIZE);
    this.setInteractive();
    this.setDepth(10);
  }

  private buildGraphics(scene: Phaser.Scene): void {
    const def = TILE_DEFS[this.tileType];

    this.bg = scene.add.graphics();
    this.drawBackground(def.color);
    this.add(this.bg);

    const wowKey = WOW_TILE_TEXTURES[this.tileType];
    if (wowKey && scene.textures.exists(wowKey)) {
      this.sprite = scene.add.image(0, 0, wowKey);
      this.sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      this.add(this.sprite);
    } else if (scene.textures.exists(this.tileType)) {
      this.sprite = scene.add.image(0, 0, this.tileType);
      this.sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      this.add(this.sprite);
    } else {
      this.icon = scene.add.text(0, 1, def.emoji, {
        fontSize: '22px',
        align: 'center',
      });
      this.icon.setOrigin(0.5, 0.5);
      this.add(this.icon);
    }
  }

  private drawBackground(color: number): void {
    const half = TILE_SIZE / 2;
    const r = 8;
    this.bg!.clear();
    this.bg!.fillStyle(color, 1);
    this.bg!.fillRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, r);
    if (this.isPowerUp) {
      this.bg!.lineStyle(3, 0xffffff, 1);
      this.bg!.strokeRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, r);
    }
  }

  setTileType(type: TileType): void {
    this.tileType = type;
    this.isPowerUp = ['microphone_blast', 'spotlight_burst', 'stage_explosion', 'superstar_power'].includes(type);
    const def = TILE_DEFS[type];

    if (this.icon) {
      this.icon.destroy();
      this.icon = undefined;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = undefined;
    }
    if (this.bg) {
      this.bg.destroy();
      this.bg = undefined;
    }

    this.bg = this.scene.add.graphics();
    this.drawBackground(def.color);
    this.add(this.bg);

    const wowKey = WOW_TILE_TEXTURES[type];
    if (wowKey && this.scene.textures.exists(wowKey)) {
      this.sprite = this.scene.add.image(0, 0, wowKey);
      this.sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      this.add(this.sprite);
    } else if (this.scene.textures.exists(type)) {
      this.sprite = this.scene.add.image(0, 0, type);
      this.sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      this.add(this.sprite);
    } else {
      this.icon = this.scene.add.text(0, 1, def.emoji, {
        fontSize: '22px',
        align: 'center',
      });
      this.icon.setOrigin(0.5, 0.5);
      this.add(this.icon);
    }
  }

  setLockedState(locked: boolean): void {
    if (locked) {
      if (!this.lockedOverlay) {
        const half = TILE_SIZE / 2;
        this.lockedOverlay = this.scene.add.graphics();
        // Cable Lock metallic grey frame
        this.lockedOverlay.lineStyle(3, 0x95a5a6, 0.95);
        this.lockedOverlay.strokeRoundedRect(-half + 2, -half + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
        this.lockedIcon = this.scene.add.text(0, 0, '🔒', { fontSize: '13px' }).setOrigin(0.5);
        
        this.add(this.lockedOverlay);
        this.add(this.lockedIcon);
      }
    } else {
      if (this.lockedOverlay) {
        this.lockedOverlay.destroy();
        this.lockedOverlay = undefined;
      }
      if (this.lockedIcon) {
        this.lockedIcon.destroy();
        this.lockedIcon = undefined;
      }
    }
  }

  setFogState(hasFog: boolean): void {
    if (hasFog) {
      if (!this.fogOverlay) {
        const half = TILE_SIZE / 2;
        this.fogOverlay = this.scene.add.graphics();
        // Stage Smoke white semi-translucent overlay
        this.fogOverlay.fillStyle(0xecf0f1, 0.82);
        this.fogOverlay.fillRoundedRect(-half, -half, TILE_SIZE, TILE_SIZE, 8);
        this.fogIcon = this.scene.add.text(0, 0, '🌫️', { fontSize: '18px' }).setOrigin(0.5);
        
        this.add(this.fogOverlay);
        this.add(this.fogIcon);
      }
    } else {
      if (this.fogOverlay) {
        this.fogOverlay.destroy();
        this.fogOverlay = undefined;
      }
      if (this.fogIcon) {
        this.fogIcon.destroy();
        this.fogIcon = undefined;
      }
    }
  }

  /** Flash animation when matched */
  playMatchAnim(onComplete: () => void): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete,
    });
  }

  /** Bounce-in animation when tile appears */
  playDropAnim(delay: number): void {
    this.setAlpha(0);
    this.setScale(0.6);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut',
      delay,
    });
  }

  /** Highlight when selected */
  setSelected(selected: boolean): void {
    if (selected) {
      this.scene.tweens.add({ targets: this, scaleX: 0.9, scaleY: 0.9, duration: 80, ease: 'Quad.easeOut' });
    } else {
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 80, ease: 'Quad.easeOut' });
    }
  }

  /** Wobble for invalid swap */
  playInvalidAnim(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 6,
      duration: 60,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 2,
    });
  }
}
