import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const GAME_DURATION = 30; // seconds per round

// Bubble types with points and visual properties
export const BUBBLE_TYPES = [
  { type: 'small',  points: 5,  radius: 24, color: '#00d4ff', prob: 0.35 },
  { type: 'medium', points: 3,  radius: 34, color: '#7c4dff', prob: 0.35 },
  { type: 'large',  points: 1,  radius: 48, color: '#ff6d00', prob: 0.20 },
  { type: 'gold',   points: 10, radius: 28, color: '#ffd600', prob: 0.07 },
  { type: 'bomb',   points: -1, radius: 32, color: '#ff1744', prob: 0.03, isBomb: true },
];

export function pickBubbleType() {
  const roll = Math.random();
  let cumulative = 0;
  for (const t of BUBBLE_TYPES) {
    cumulative += t.prob;
    if (roll < cumulative) return t;
  }
  return BUBBLE_TYPES[1];
}

export function createBubble(id) {
  const bType = pickBubbleType();
  const padding = bType.radius + 10;
  return {
    id,
    ...bType,
    x: padding + Math.random() * (width - padding * 2),
    // start just below visible area, float upward
    y: height + bType.radius,
    opacity: 1,
    speed: 0.8 + Math.random() * 1.4, // pixels per frame
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.03 + Math.random() * 0.04,
    popped: false,
  };
}

export function getSpawnInterval(score) {
  // Bubbles spawn faster as score grows — keeps pressure high
  if (score < 20)  return 1200;
  if (score < 50)  return 900;
  if (score < 100) return 700;
  return 500;
}

export function hitTest(bubble, touchX, touchY) {
  const dx = bubble.x - touchX;
  const dy = bubble.y - touchY;
  return Math.sqrt(dx * dx + dy * dy) <= bubble.radius + 8; // +8 = finger forgiveness
}
