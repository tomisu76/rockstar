# Suggested Project Structure

Antigravity can create the actual code, but this is the recommended structure.

```text
rockstar-match3/
├── public/
│   └── assets/
│       ├── tiles/
│       ├── ui/
│       └── stage/
├── src/
│   ├── main.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── GameScene.ts
│   │   └── UIScene.ts
│   ├── game/
│   │   ├── Board.ts
│   │   ├── Tile.ts
│   │   ├── MatchDetector.ts
│   │   ├── CascadeSystem.ts
│   │   ├── ObjectiveSystem.ts
│   │   ├── CrowdEnergySystem.ts
│   │   └── PowerUpSystem.ts
│   ├── levels/
│   │   └── level001.ts
│   └── config/
│       └── gameConfig.ts
├── docs/
├── package.json
├── vite.config.ts
└── README.md
```
