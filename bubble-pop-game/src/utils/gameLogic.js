import { Dimensions } from 'react-native';

export const GRID_COLS = 6;
export const GRID_ROWS = 12;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Tile size that fills the screen without overflow across all modern phones
export const TILE_SIZE = Math.floor(
  Math.min(
    (SCREEN_W - 16) / GRID_COLS,         // fit width (8pt padding each side)
    (SCREEN_H - 200) / GRID_ROWS         // fit height (200pt for HUD + controls)
  )
);

// Visual appearance per tile value
export const TILES = {
  2:    { bg: '#0d2137', glow: '#00aaff', textColor: '#ffffff' },
  4:    { bg: '#0a2e1f', glow: '#00ff88', textColor: '#ffffff' },
  8:    { bg: '#2e1a00', glow: '#ffaa00', textColor: '#ffffff' },
  16:   { bg: '#2e1800', glow: '#ff7700', textColor: '#ffffff' },
  32:   { bg: '#3a0d0d', glow: '#ff3300', textColor: '#ffffff' },
  64:   { bg: '#2a0a35', glow: '#cc00ff', textColor: '#ffffff' },
  128:  { bg: '#180a35', glow: '#7700ff', textColor: '#e0d4ff' },
  256:  { bg: '#080f35', glow: '#0044ff', textColor: '#c4d4ff' },
  512:  { bg: '#001a1a', glow: '#00ffff', textColor: '#b0ffff' },
  1024: { bg: '#1a1a00', glow: '#ffee00', textColor: '#fff176' },
  2048: { bg: '#2a1400', glow: '#ffd700', textColor: '#ffd700' },
};

// Spawn weights — only small tiles spawn directly; high values reached by merging
const SPAWN_TABLE = [
  { value: 2,  weight: 45 },
  { value: 4,  weight: 30 },
  { value: 8,  weight: 15 },
  { value: 16, weight: 7  },
  { value: 32, weight: 3  },
];
const TOTAL_WEIGHT = SPAWN_TABLE.reduce((s, e) => s + e.weight, 0);

export function getRandomTileValue() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const { value, weight } of SPAWN_TABLE) {
    if (roll < weight) return value;
    roll -= weight;
  }
  return 2;
}

// Grid: grid[col] is an array (stack) of plain { id, value } objects.
//   index 0 = bottom tile (on screen bottom)
//   last index = top tile (most recently placed, nearest top of screen)
export function createEmptyGrid() {
  return Array.from({ length: GRID_COLS }, () => []);
}

export function canDropInCol(grid, col) {
  return grid[col].length < GRID_ROWS;
}

// Returns true when no column can accept another tile
export function isGameOver(grid) {
  return grid.every(col => col.length >= GRID_ROWS);
}

export function getMaxTile(grid) {
  let max = 0;
  for (const col of grid) {
    for (const tile of col) {
      if (tile.value > max) max = tile.value;
    }
  }
  return max;
}

// Drop a tile into column `col`.
// Returns { newGrid, mergedScore, mergedTileId, consumedIds, specialTile } or null if full.
//
// mergedTileId: the ID of the surviving tile after the cascade (may be null if no merge).
// consumedIds:  IDs of tiles that were absorbed into their neighbor (clean up animRefs).
// specialTile:  { id, col } if a 2048 tile was formed (triggers special animation).
export function dropTile(grid, col, value, tileId) {
  if (!canDropInCol(grid, col)) return null;

  // Create new column with the dropped tile pushed on top
  const newGrid = grid.map((c, i) => (i === col ? [...c, { id: tileId, value }] : c));

  let mergedScore = 0;
  let mergedTileId = null;
  const consumedIds = [];
  let specialTile = null;

  // Cascade merge: while the top two tiles in the column match, merge them
  while (newGrid[col].length >= 2) {
    const top   = newGrid[col][newGrid[col].length - 1];
    const below = newGrid[col][newGrid[col].length - 2];
    if (top.value !== below.value) break;

    const mergedValue = top.value * 2;
    consumedIds.push(top.id); // top tile is absorbed
    newGrid[col].pop();
    newGrid[col][newGrid[col].length - 1] = { id: below.id, value: mergedValue };
    mergedScore += mergedValue;
    mergedTileId = below.id;

    if (mergedValue === 2048) {
      specialTile = { id: below.id, col };
      break; // handle the 2048 pop separately
    }
  }

  return { newGrid, mergedScore, mergedTileId, consumedIds, specialTile };
}

// Remove the top tile from a column (bomb power-up)
export function bombColumn(grid, col) {
  if (grid[col].length === 0) return { newGrid: grid, removedId: null };
  const removedId = grid[col][grid[col].length - 1].id;
  const newGrid = grid.map((c, i) => (i === col ? c.slice(0, -1) : c));
  return { newGrid, removedId };
}

// Remove the top tile from every full column (continue-mode recovery)
export function applyContinue(grid) {
  return grid.map(col =>
    col.length >= GRID_ROWS ? col.slice(0, col.length - 1) : col
  );
}

// Get tile font size that fits within the tile
export function tileFontSize(value) {
  if (value < 100)   return Math.floor(TILE_SIZE * 0.42);
  if (value < 1000)  return Math.floor(TILE_SIZE * 0.34);
  return Math.floor(TILE_SIZE * 0.27);
}
