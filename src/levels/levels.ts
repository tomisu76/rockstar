// ─── Levels Configurations ───────────────────────────────────────────────────

export interface LevelObjective {
  type: 'collect' | 'energy' | 'obstacles' | 'score';
  tile?: string; // required when type is 'collect'
  target: number;
}

export interface CrowdEnergyConfig {
  targetPercent: number;
  match3Gain: number;
  match4Gain: number;
  match5Gain: number;
  cascadeBonus: number;
}

export interface PowerUpDef {
  id: string;
  createdBy: string;
  effect: string;
}

export interface StarThresholds {
  twoStars: { score?: number; energy?: number; moves?: number };
  threeStars: { score?: number; energy?: number; moves?: number };
}

export interface LevelBalancingMetadata {
  estimatedDifficulty?: string;
  targetWinRate?: number;
  recommendedMoves?: number;
  notes?: string;
  mechanicIntroduced?: string;
  tutorialHint?: string;
}

export interface LevelConfig {
  id: string;
  number: number;
  name: string;
  board: {
    rows: number;
    columns: number;
    tileTypes: string[];
    lockedPositions?: Array<{ row: number; col: number }>;
    fogPositions?: Array<{ row: number; col: number }>;
  };
  moves: number;
  objectives: LevelObjective[];
  crowdEnergy: CrowdEnergyConfig;
  powerUps: PowerUpDef[];
  theme: {
    venue: string;
    stageMood: string;
    crowdSize: string;
    difficulty?: string;
  };
  starThresholds: StarThresholds;
  balancing?: LevelBalancingMetadata;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 'level_001',
    number: 1,
    name: 'Garage Band Night',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 28,
    objectives: [{ type: 'collect', tile: 'gold_record', target: 10 }],
    crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'The Basement Garage', stageMood: 'first_gig', crowdSize: 'small_but_loud', difficulty: 'Easy' },
    starThresholds: { twoStars: { score: 4000, energy: 80, moves: 5 }, threeStars: { score: 8000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_002',
    number: 2,
    name: 'Pub Warmup',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 26,
    objectives: [{ type: 'collect', tile: 'gold_record', target: 12 }],
    crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'The Anchor Pub', stageMood: 'cozy_vibes', crowdSize: 'local_regulars', difficulty: 'Easy' },
    starThresholds: { twoStars: { score: 4500, energy: 80, moves: 5 }, threeStars: { score: 9000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_003',
    number: 3,
    name: 'High School Prom',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 30,
    objectives: [{ type: 'collect', tile: 'silver_record', target: 10 }],
    crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Gymnasium Hall', stageMood: 'romantic_lights', crowdSize: 'teens_dancing', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 4000, energy: 80, moves: 5 }, threeStars: { score: 8000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_004',
    number: 4,
    name: 'Backyard BBQ Jam',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 28,
    objectives: [
      { type: 'collect', tile: 'gold_record', target: 8 },
      { type: 'collect', tile: 'silver_record', target: 8 }
    ],
    crowdEnergy: { targetPercent: 75, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Sunny Backyard', stageMood: 'chill_summer', crowdSize: 'friends_and_family', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 5000, energy: 80, moves: 5 }, threeStars: { score: 10000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_005',
    number: 5,
    name: 'Crowd Pleaser',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 25,
    objectives: [{ type: 'energy', target: 70 }],
    crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Local Skatepark', stageMood: 'energetic_skaters', crowdSize: 'throng_of_skaters', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 5000, energy: 85, moves: 5 }, threeStars: { score: 10000, energy: 98, moves: 10 } },
  },
  {
    id: 'level_006',
    number: 6,
    name: 'Club Gig',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      lockedPositions: [
        { row: 2, col: 2 },
        { row: 2, col: 5 },
        { row: 5, col: 2 },
        { row: 5, col: 5 }
      ]
    },
    moves: 18,
    objectives: [
      { type: 'obstacles', target: 4 },
      { type: 'collect', tile: 'gold_record', target: 12 }
    ],
    crowdEnergy: { targetPercent: 80, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'The Velvet Lounge', stageMood: 'lounge_neon', crowdSize: 'night_clubbers', difficulty: 'Hard' },
    starThresholds: { twoStars: { score: 5000, energy: 80, moves: 3 }, threeStars: { score: 10000, energy: 95, moves: 7 } },
  },
  {
    id: 'level_007',
    number: 7,
    name: 'Radio Acoustic Live',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      fogPositions: [
        { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 },
        { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 }
      ]
    },
    moves: 30,
    objectives: [
      { type: 'obstacles', target: 8 },
      { type: 'collect', tile: 'music_note', target: 10 }
    ],
    crowdEnergy: { targetPercent: 75, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'FM 101 Studio', stageMood: 'bright_broadcast', crowdSize: 'studio_staff', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 6000, energy: 80, moves: 5 }, threeStars: { score: 12000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_008',
    number: 8,
    name: 'Underground Metal Fest',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      lockedPositions: [
        { row: 1, col: 1 },
        { row: 1, col: 6 },
        { row: 6, col: 1 },
        { row: 6, col: 6 }
      ]
    },
    moves: 22,
    objectives: [
      { type: 'energy', target: 90 },
      { type: 'obstacles', target: 4 }
    ],
    crowdEnergy: { targetPercent: 90, match3Gain: 4, match4Gain: 8, match5Gain: 14, cascadeBonus: 3 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'The Boiler Room', stageMood: 'dark_heavy_metal', crowdSize: 'headbangers', difficulty: 'Hard' },
    starThresholds: { twoStars: { score: 7000, energy: 92, moves: 3 }, threeStars: { score: 14000, energy: 98, moves: 7 } },
  },
  {
    id: 'level_009',
    number: 9,
    name: 'Rooftop Sundown',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      fogPositions: [
        { row: 2, col: 3 }, { row: 3, col: 3 }, { row: 4, col: 3 },
        { row: 2, col: 4 }, { row: 3, col: 4 }, { row: 4, col: 4 }
      ]
    },
    moves: 15,
    objectives: [
      { type: 'collect', tile: 'gold_record', target: 8 },
      { type: 'obstacles', target: 6 }
    ],
    crowdEnergy: { targetPercent: 75, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Skyline Terrace', stageMood: 'sunset_glow', crowdSize: 'exclusive_guests', difficulty: 'Hard' },
    starThresholds: { twoStars: { score: 6000, energy: 80, moves: 3 }, threeStars: { score: 12000, energy: 95, moves: 7 } },
  },
  {
    id: 'level_010',
    number: 10,
    name: 'Main Stage Concert',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      lockedPositions: [
        { row: 0, col: 0 }, { row: 0, col: 7 },
        { row: 7, col: 0 }, { row: 7, col: 7 }
      ],
      fogPositions: [
        { row: 3, col: 3 }, { row: 3, col: 4 },
        { row: 4, col: 3 }, { row: 4, col: 4 }
      ]
    },
    moves: 32,
    objectives: [
      { type: 'score', target: 10000 },
      { type: 'collect', tile: 'gold_record', target: 10 },
      { type: 'energy', target: 80 }
    ],
    crowdEnergy: { targetPercent: 80, match3Gain: 4, match4Gain: 8, match5Gain: 12, cascadeBonus: 3 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Grand Amphitheatre', stageMood: 'stadium_supernova', crowdSize: 'screaming_fans', difficulty: 'Expert' },
    starThresholds: { twoStars: { score: 12000, energy: 85, moves: 5 }, threeStars: { score: 20000, energy: 95, moves: 10 } },
  },
  {
    id: 'level_011',
    number: 11,
    name: 'Garage Backyard Jam',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 28,
    objectives: [{ type: 'collect', tile: 'gold_record', target: 15 }],
    crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'The Garage Backyard', stageMood: 'cozy_outdoor', crowdSize: 'friendly_neighbors', difficulty: 'Easy' },
    starThresholds: { twoStars: { score: 4500, energy: 80, moves: 5 }, threeStars: { score: 9000, energy: 95, moves: 10 } },
    balancing: {
      estimatedDifficulty: 'Easy',
      targetWinRate: 0.9,
      recommendedMoves: 28,
      mechanicIntroduced: 'None',
      notes: 'A relaxed outdoor session to introduce players to slightly larger collection targets.'
    }
  },
  {
    id: 'level_012',
    number: 12,
    name: 'Neon Bistro',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 30,
    objectives: [
      { type: 'collect', tile: 'music_note', target: 12 },
      { type: 'collect', tile: 'silver_record', target: 12 }
    ],
    crowdEnergy: { targetPercent: 75, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Neon Bistro Lounge', stageMood: 'neon_retro', crowdSize: 'casual_diners', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 6000, energy: 80, moves: 5 }, threeStars: { score: 12000, energy: 95, moves: 10 } },
    balancing: {
      estimatedDifficulty: 'Medium',
      targetWinRate: 0.75,
      recommendedMoves: 30,
      mechanicIntroduced: 'Dual collection targets',
      notes: 'Requires player to focus on clearing both notes and silver records simultaneously.'
    }
  },
  {
    id: 'level_013',
    number: 13,
    name: 'Subway Station Acoustic',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
    },
    moves: 20,
    objectives: [{ type: 'energy', target: 80 }],
    crowdEnergy: { targetPercent: 80, match3Gain: 4, match4Gain: 7, match5Gain: 12, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Downtown Subway Station', stageMood: 'gritty_acoustic', crowdSize: 'busy_commuters', difficulty: 'Medium' },
    starThresholds: { twoStars: { score: 5000, energy: 85, moves: 4 }, threeStars: { score: 10000, energy: 96, moves: 8 } },
    balancing: {
      estimatedDifficulty: 'Medium',
      targetWinRate: 0.7,
      recommendedMoves: 20,
      mechanicIntroduced: 'High crowd energy target in low moves',
      notes: 'Commuters are busy, so player must make high-match combos quickly to keep them interested.'
    }
  },
  {
    id: 'level_014',
    number: 14,
    name: 'Warehouse Rock',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      lockedPositions: [
        { row: 2, col: 2 }, { row: 2, col: 5 },
        { row: 5, col: 2 }, { row: 5, col: 5 }
      ]
    },
    moves: 22,
    objectives: [
      { type: 'collect', tile: 'gold_record', target: 10 },
      { type: 'obstacles', target: 4 }
    ],
    crowdEnergy: { targetPercent: 80, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Abandoned Warehouse', stageMood: 'industrial_grunge', crowdSize: 'underground_ravers', difficulty: 'Hard' },
    starThresholds: { twoStars: { score: 6500, energy: 85, moves: 4 }, threeStars: { score: 13000, energy: 95, moves: 8 } },
    balancing: {
      estimatedDifficulty: 'Hard',
      targetWinRate: 0.45,
      recommendedMoves: 22,
      mechanicIntroduced: 'Locked obstacles with collection',
      notes: 'Player must clear cables blocking the board center to make moves for gold records.'
    }
  },
  {
    id: 'level_015',
    number: 15,
    name: 'Metropolis Arena Concert',
    board: {
      rows: 8,
      columns: 8,
      tileTypes: ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      fogPositions: [
        { row: 1, col: 1 }, { row: 1, col: 6 },
        { row: 3, col: 3 }, { row: 3, col: 4 },
        { row: 4, col: 3 }, { row: 4, col: 4 },
        { row: 6, col: 1 }, { row: 6, col: 6 }
      ]
    },
    moves: 25,
    objectives: [
      { type: 'collect', tile: 'silver_record', target: 12 },
      { type: 'obstacles', target: 8 },
      { type: 'score', target: 15000 }
    ],
    crowdEnergy: { targetPercent: 85, match3Gain: 4, match4Gain: 8, match5Gain: 14, cascadeBonus: 3 },
    powerUps: [{ id: 'microphone_blast', createdBy: 'match4', effect: 'clear_row_or_column' }],
    theme: { venue: 'Metropolis Arena Stadium', stageMood: 'arena_lasers', crowdSize: 'massive_crowd', difficulty: 'Expert' },
    starThresholds: { twoStars: { score: 18000, energy: 90, moves: 5 }, threeStars: { score: 28000, energy: 98, moves: 9 } },
    balancing: {
      estimatedDifficulty: 'Expert',
      targetWinRate: 0.3,
      recommendedMoves: 25,
      mechanicIntroduced: 'Multi-objective extreme event',
      notes: 'The ultimate tour finale requiring score, collection, and smoke clear objectives.'
    }
  }
];
