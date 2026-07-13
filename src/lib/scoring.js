import { clamp, roundTo } from './math.js';

export function sanitizeSettings(settings) {
  return {
    ...settings,
    shoutSeconds: clamp(Number(settings.shoutSeconds) || 5, 2, 15),
    raceCountdownSeconds: clamp(Number(settings.raceCountdownSeconds) || 5, 2, 10),
    maxScore: clamp(Number(settings.maxScore) || 200, 50, 400),
    noiseFloor: clamp(Number(settings.noiseFloor) || 0, 0, 0.2),
    maxShoutLevel: clamp(Number(settings.maxShoutLevel) || 0.24, 0.01, 1),
    sensitivity: clamp(Number(settings.sensitivity) || 1.6, 0.1, 30),
    curve: clamp(Number(settings.curve) || 0.72, 0.35, 2.5),
    steeringSpeed: clamp(Number(settings.steeringSpeed) || 0.82, 0.2, 2),
    raceSpeedScale: clamp(Number(settings.raceSpeedScale) || 0.118, 0.04, 0.25),
    collisionSlowMs: clamp(Number(settings.collisionSlowMs) || 950, 200, 3000),
    collisionSlowFactor: clamp(Number(settings.collisionSlowFactor) || 0.42, 0.1, 0.9)
  };
}

export function levelToScore(rawLevel, settings) {
  const input = Math.max(0, Number(rawLevel) || 0);
  const active = Math.max(0, input - settings.noiseFloor);
  const range = Math.max(0.001, settings.maxShoutLevel - settings.noiseFloor);
  const normalized = clamp((active * settings.sensitivity) / range, 0, 1.25);
  const shaped = clamp(normalized ** settings.curve, 0, 1);

  return roundTo(shaped * settings.maxScore, 1);
}
