# 🎸 Rockstar Match-3 – Visual Wow Pass Plan

This document defines the visual styling, color palette, rendering guidelines, and implementation stages for upgrading the Rockstar Match-3 game into a premium, high-energy arcade concert experience.

---

## 🎨 1. Visual Style Guide & Color Palette

The visual style is **Cyber Neon Concert Arcade**—combining high-intensity stage lighting, glowing neon tube aesthetics, and deep-space concert backdrops to create a premium, alive look.

### Color Palette

| Color Name | Hex Code | Visual Use |
| :--- | :--- | :--- |
| **Deep Stage Void** | `#0a0014` | The primary backdrop of the app. |
| **Deep Neon Indigo** | `#14002e` | Secondary gradient fill for panels and backdrops. |
| **Neon Pink** | `#ff2d78` | Primary accent, board frame highlight, and hot actions. |
| **Neon Cyan** | `#00d4ff` | Secondary accent, Crowd Energy, selected tile frames. |
| **Electric Gold** | `#ffd700` | Stars, high score values, combo text, and special effects. |
| **Neon Purple** | `#9b59b6` | Background trusses, stage framing, and mute controls. |
| **Muted Lavender** | `#c39bd3` | Secondary text, level description, and subheadings. |

---

## 📐 2. HUD & Panel Rules

All HUD panels should feel like elements of a physical concert synthesizer deck:
- **Rounded Containers:** Dark violet translucent backdrops (`#0d001f` at `0.9` opacity) with neon-purple borders.
- **Highlight Outlines:** Single-pixel neon-pink or neon-cyan highlights at the borders.
- **Moves Display:** Keep it highly legible. Scale it up and flash it in bright neon red when remaining moves drop to 5 or fewer.
- **Progress Bars:** Fully styled track with a neon-cyan gradient fill, and a gold star indicator for the target.

---

## 🎸 3. Stage Header & Performer Rules

The stage header must feel like a live performance in front of a pulsing crowd:
- **Spotlight Beams:** Implement 3 to 5 semi-transparent rotating graphics representing spotlights. They should sweep left and right in a sine wave pattern. Beam sweep speed should scale with current Crowd Energy.
- **Stage Truss:** Draw a metallic neon-purple truss outline supporting the lights.
- **Animated Performers:**
  - **Guitarist (`👩‍🎤🎸`):** Bobs vertically and rocks back and forth.
  - **Singer (`👨‍🎤🎤`):** Center stage, bobs vertically and scales slightly up/down.
  - **Drummer (`🥁👨‍🎤`):** Backbeat, moves side-to-side and bobs.
  - When matches are cleared, performers transition into "rocking" animation speeds temporarily.
- **Speaker Stacks (`🔊`):** Replace flat emojis with custom-drawn neon speakers (with a outer frame and two speaker cones). Cones should pulse (scale up/down) on every match and combo.

---

## 🟩 4. Tile Visual Rules

Tiles remain **2D flat rounded rectangles**, but with enhanced visual polish:
- **Neon Borders:** Each tile type has a colored background and a matching high-contrast, slightly brighter neon border.
- **Bevel/Inner Highlight:** Add a subtle inner border or lighting highlight to make the tiles feel like tactile buttons.
- **Interactive States:**
  - **Selected:** Border glows neon-cyan and scales down slightly (`0.9x`).
  - **Locked:** Metallic grey chain graphic around the tile with a padlock emoji.
  - **Fog:** Translucent cloud overlay with a fog emoji.

---

## ⚡ 5. Power-Up & Match FX Rules

- **Microphone Blast:** Shoots bright laser beams horizontally and vertically with flashing neon-blue outlines.
- **Spotlight Burst:** Expand a golden circle shockwave with star particles fading out.
- **Stage Explosion:** Expand a huge hot-pink square wave out to the borders of the board with flying confetti.
- **Superstar Power:** Golden rays shooting out from tiles, clearing targeted tiles with mini stars.

---

## 🚀 6. Implementation Phases (Phase 1 Active)

### Phase 1: Foundations & HUD/Stage Polish (Active Focus)
1. **Title Screen Update:** Enrich `TitleScene.ts` with a pulsing logo, starfields, neon frames, and interactive button hovers.
2. **Stage Header Upgrade:** Update `GameScene.ts` to draw rotating spotlight graphics, neon speaker shapes, and reactive performers.
3. **Board Frame Upgrade:** Enhance `drawBoardFrame` to use double-stroke pink/purple neon trusses with glowing corner brackets.
4. **HUD & Energy Deck:** Style HUD containers with electric gold labels and a glowing, smoothly animated Crowd Energy bar.
5. **Tile Polish:** Update `Tile.ts` to render 2D flat rounded tiles with beautiful double neon borders, and selection glow effects.
6. **Reactive Beats:** Add a pulse trigger to speaker cones, performers, and spotlights whenever a match/combo is completed.
