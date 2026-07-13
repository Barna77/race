import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, OBSTACLES } from '../src/config/gameConfig.js';
import { clamp } from '../src/lib/math.js';
import { levelToScore, sanitizeSettings } from '../src/lib/scoring.js';
import { sanitizeState } from '../src/lib/storage.js';

const settings = sanitizeSettings(DEFAULT_SETTINGS);

assert.equal(clamp(4, 0, 3), 3, 'clamp caps upper bound');
assert.equal(levelToScore(0, settings), 0, 'zero input produces zero score');
assert.ok(levelToScore(settings.maxShoutLevel, settings) > settings.maxScore * 0.8, 'max shout reaches high score');
assert.ok(levelToScore(1, settings) <= settings.maxScore, 'score clamps to max score');
assert.equal(OBSTACLES.length, 8, 'track has configured obstacles');

const state = sanitizeState({
  players: {
    A: { score: 9999, distance: 2, lane: 2 },
    B: { score: -1, distance: -1, lane: -1 }
  },
  controls: { A: 8, B: -8 }
});

assert.equal(state.players.A.score, 999, 'player score is sanitized');
assert.equal(state.players.A.distance, 1, 'distance is clamped');
assert.equal(state.players.A.lane, 0.86, 'lane upper clamp works');
assert.equal(state.controls.B, -1, 'control lower clamp works');

console.log('All tests passed');
