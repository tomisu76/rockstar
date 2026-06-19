# MVP Requirements

## Goal

Create a first playable prototype of Rockstar match-3.

The player should be able to play one complete level from start to finish.

## Required screen layout

Mobile-first portrait layout:

1. Stage header at top
2. Objective and moves display
3. Match-3 board in center
4. Crowd Energy meter below or near board
5. Booster buttons on side or bottom
6. Win/lose overlay

## Board

- 8 rows
- 8 columns
- Square tiles
- Six tile types
- No starting matches if possible
- Adjacent tile swaps only
- Invalid swaps should return tiles to original position

## Match logic

Detect:

- horizontal matches of 3+
- vertical matches of 3+

When match happens:

1. remove matched tiles
2. update objective count
3. add crowd energy
4. apply gravity
5. refill board
6. check cascades
7. repeat until stable

## Moves

- Start with 28 moves
- A valid swap consumes 1 move
- Cascades do not consume extra moves
- Invalid swaps do not consume moves

## Objective

Level 1:

- collect 10 gold records
- within 28 moves

Win condition:

- gold records collected >= 10

Lose condition:

- moves reach 0 before objective is complete

## Crowd Energy

- Starts at 0%
- Each match adds energy
- Bigger matches add more energy
- Cascades add bonus energy
- Win triggers full crowd celebration

## Power-up for MVP

Implement one simple power-up:

Microphone Blast

Created by matching 4 tiles.
When activated, clears a row or column.

## Code quality

Use modular code.

Suggested modules:

- GameScene
- Board
- Tile
- MatchDetector
- CascadeSystem
- ObjectiveSystem
- CrowdEnergySystem
- LevelConfig
