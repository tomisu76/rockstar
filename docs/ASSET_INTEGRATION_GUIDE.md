# Rockstar Visual Wow Asset Pack v1

This branch adds a first draft SVG asset pack for the Rockstar visual wow pass.

Branch: `assets-wow-v1`

## Goal

Make the current playable match-3 demo feel closer to Ben's vision: a live concert performance where the puzzle board, stage, crowd, power-ups, and win screen all feel connected.

These assets are **not final commercial art**. They are integration-ready SVG drafts designed to give the game a stronger visual direction quickly.

## Do not do

- Do not reintroduce Toy Box.
- Do not use voxel rendering.
- Do not add Three.js.
- Do not add Gemini or any external AI asset generation runtime.
- Do not change match-3 logic while integrating assets.

## Added assets

### Normal tiles

- `public/assets/wow/tiles/gold_record_wow.svg`
- `public/assets/wow/tiles/silver_record_wow.svg`
- `public/assets/wow/tiles/music_note_wow.svg`
- `public/assets/wow/tiles/spotlight_wow.svg`
- `public/assets/wow/tiles/speaker_wow.svg`

### Power-ups

- `public/assets/wow/powerups/microphone_blast_wow.svg`
- `public/assets/wow/powerups/spotlight_burst_wow.svg`
- `public/assets/wow/powerups/stage_explosion_wow.svg`

### Stage / crowd / UI

- `public/assets/wow/stage/stage_header_concert_wow.svg`
- `public/assets/wow/stage/crowd_strip_wow.svg`
- `public/assets/wow/ui/neon_frame_wow.svg`

### Manifest

- `public/assets/wow/asset_manifest.json`

## Visual style

Palette:

- Deep background: `#05020a`, `#090314`, `#120820`
- Neon pink: `#ff4fd8`
- Cyan: `#35e4ff`
- Gold: `#ffe47a`, `#ffb02e`
- Green accent: `#39ff88`

Rules:

1. Mobile readability is more important than detail.
2. Tiles should have consistent rounded square silhouettes.
3. Icons should be large and recognizable at 44px tile size.
4. Use glow and outline, but avoid visual noise.
5. Stage and crowd should react to matches and combos.

## Suggested integration steps

### Phase 1: preload assets

In `BootScene.ts`, preload the new SVGs using asset keys such as:

```ts
this.load.svg('wow-gold-record', 'assets/wow/tiles/gold_record_wow.svg');
this.load.svg('wow-silver-record', 'assets/wow/tiles/silver_record_wow.svg');
this.load.svg('wow-music-note', 'assets/wow/tiles/music_note_wow.svg');
this.load.svg('wow-spotlight', 'assets/wow/tiles/spotlight_wow.svg');
this.load.svg('wow-speaker', 'assets/wow/tiles/speaker_wow.svg');
this.load.svg('wow-microphone-blast', 'assets/wow/powerups/microphone_blast_wow.svg');
this.load.svg('wow-spotlight-burst', 'assets/wow/powerups/spotlight_burst_wow.svg');
this.load.svg('wow-stage-explosion', 'assets/wow/powerups/stage_explosion_wow.svg');
this.load.svg('wow-stage-header', 'assets/wow/stage/stage_header_concert_wow.svg');
this.load.svg('wow-crowd-strip', 'assets/wow/stage/crowd_strip_wow.svg');
this.load.svg('wow-neon-frame', 'assets/wow/ui/neon_frame_wow.svg');
```

### Phase 2: tile mapping

In `Tile.ts`, map game tile ids to SVG texture keys:

```ts
const WOW_TILE_TEXTURES: Record<string, string> = {
  gold_record: 'wow-gold-record',
  silver_record: 'wow-silver-record',
  music_note: 'wow-music-note',
  spotlight: 'wow-spotlight',
  speaker: 'wow-speaker',
  microphone_blast: 'wow-microphone-blast',
  spotlight_burst: 'wow-spotlight-burst',
  stage_explosion: 'wow-stage-explosion'
};
```

Keep the existing Phaser vector fallback if an SVG is missing.

### Phase 3: stage and crowd

In `GameScene.ts`:

- Place `wow-stage-header` behind the existing band layer or replace the old stage background.
- Add `wow-crowd-strip` near the lower HUD or beneath the board.
- On matches and combos, pulse the stage and crowd strip lightly.

### Phase 4: board frame

Use `wow-neon-frame` as a decorative frame behind the board. Make sure it does not cover clickable tiles.

### Phase 5: tests

Do not reduce test coverage.

Run:

```bash
npx tsc --noEmit
npm run build
npm run test:unit
npm run test:e2e
```

Expected:

- all existing unit tests pass
- all existing E2E tests pass
- no gameplay logic changes
- no Toy Box dependency

## Known limitations

- `star_wow.svg` and `superstar_power_wow.svg` are still recommended next assets.
- This is a first visual direction pass; it may need tuning after seeing it at mobile scale.
- Some SVGs may need scale adjustments inside Phaser depending on the current tile image sizing logic.
