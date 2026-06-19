// ─── Tile Types & Colors ─────────────────────────────────────────────────────

export type TileType =
  | 'gold_record'
  | 'silver_record'
  | 'music_note'
  | 'star'
  | 'spotlight'
  | 'speaker'
  | 'microphone_blast'
  | 'spotlight_burst'
  | 'stage_explosion'
  | 'superstar_power'; // power-up tiles

export interface TileDef {
  id: TileType;
  label: string;
  color: number;       // Phaser hex color
  accentColor: number; // highlight / icon color
  emoji: string;
}

export const TILE_DEFS: Record<string, TileDef> = {
  gold_record: {
    id: 'gold_record',
    label: 'Gold Record',
    color: 0xf5c518,
    accentColor: 0x8b6914,
    emoji: '🥇',
  },
  silver_record: {
    id: 'silver_record',
    label: 'Silver Record',
    color: 0xc0c0c0,
    accentColor: 0x6e6e6e,
    emoji: '⚪',
  },
  music_note: {
    id: 'music_note',
    label: 'Music Note',
    color: 0x8a4fff,
    accentColor: 0xffffff,
    emoji: '🎵',
  },
  star: {
    id: 'star',
    label: 'Star',
    color: 0xff6b35,
    accentColor: 0xfff0d0,
    emoji: '⭐',
  },
  spotlight: {
    id: 'spotlight',
    label: 'Spotlight',
    color: 0x00d4ff,
    accentColor: 0xffffff,
    emoji: '💡',
  },
  speaker: {
    id: 'speaker',
    label: 'Speaker',
    color: 0x2ecc71,
    accentColor: 0x1a5c38,
    emoji: '🔊',
  },
  microphone_blast: {
    id: 'microphone_blast',
    label: 'Mic Blast',
    color: 0xff2d78,
    accentColor: 0xffffff,
    emoji: '🎤',
  },
  spotlight_burst: {
    id: 'spotlight_burst',
    label: 'Spotlight Burst',
    color: 0xffdd57,
    accentColor: 0xffffff,
    emoji: '💥',
  },
  stage_explosion: {
    id: 'stage_explosion',
    label: 'Stage Explosion',
    color: 0xff6b35,
    accentColor: 0xffffff,
    emoji: '🔥',
  },
  superstar_power: {
    id: 'superstar_power',
    label: 'Superstar Power',
    color: 0x9b59b6,
    accentColor: 0xffffff,
    emoji: '👑',
  },
};

export const NORMAL_TILE_TYPES: TileType[] = [
  'gold_record',
  'silver_record',
  'music_note',
  'star',
  'spotlight',
  'speaker',
];
