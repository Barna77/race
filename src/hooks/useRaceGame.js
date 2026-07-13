import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PLAYER_STATE, DEFAULT_STATE, GAME_MODES, OBSTACLES, PLAYER_IDS } from '../config/gameConfig.js';
import { clamp, nowMs, roundTo } from '../lib/math.js';
import { levelToScore } from '../lib/scoring.js';
import {
  loadSettings,
  loadState,
  resetState,
  saveSettings,
  saveState,
  subscribeToStorage
} from '../lib/storage.js';

const LIVE_WRITE_INTERVAL_MS = 80;
const RACE_WRITE_INTERVAL_MS = 66;
const COLLISION_BRAKE_RESPONSE = 0.38;
const SPEED_RECOVERY_RESPONSE = 0.11;

function freshRacePlayer(player) {
  return {
    ...DEFAULT_PLAYER_STATE,
    score: player.score,
    peak: player.peak,
    live: 0,
    hasScore: player.hasScore,
    lane: 0.5,
    speed: player.score
  };
}

function createRacePlayers(players) {
  return {
    A: freshRacePlayer(players.A),
    B: freshRacePlayer(players.B)
  };
}

function collides(player, obstacle) {
  return Math.abs(player.distance - obstacle.distance) < 0.026 &&
    Math.abs(player.lane - obstacle.lane) < obstacle.width * 0.5;
}

function smoothSpeed(currentSpeed, targetSpeed, isBraking) {
  const response = isBraking ? COLLISION_BRAKE_RESPONSE : SPEED_RECOVERY_RESPONSE;
  const current = Number.isFinite(Number(currentSpeed)) ? Number(currentSpeed) : targetSpeed;
  return current + (targetSpeed - current) * response;
}

export default function useRaceGame({ isOperator = false } = {}) {
  const [{ settings, state }, setSnapshot] = useState(() => ({
    settings: loadSettings(),
    state: loadState()
  }));
  const [now, setNow] = useState(nowMs);
  const inputLevelRef = useRef(0);
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const lastWriteRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refresh = useCallback(() => {
    setSnapshot({
      settings: loadSettings(),
      state: loadState()
    });
  }, []);

  useEffect(() => subscribeToStorage(refresh), [refresh]);

  useEffect(() => {
    if (![GAME_MODES.SHOUT, GAME_MODES.COUNTDOWN].includes(state.mode)) {
      setNow(nowMs());
      return undefined;
    }

    const interval = window.setInterval(() => setNow(nowMs()), 100);
    return () => window.clearInterval(interval);
  }, [state.mode]);

  const writeState = useCallback((updater) => {
    const current = loadState();
    const next = typeof updater === 'function' ? updater(current) : updater;
    const saved = saveState(next);
    stateRef.current = saved;
    return saved;
  }, []);

  const updateSettings = useCallback((patch) => {
    const saved = saveSettings({ ...loadSettings(), ...patch });
    settingsRef.current = saved;
    return saved;
  }, []);

  const setInputLevel = useCallback((level) => {
    inputLevelRef.current = Number.isFinite(Number(level)) ? Number(level) : 0;
  }, []);

  const startShout = useCallback((playerId) => {
    if (!PLAYER_IDS.includes(playerId)) {
      return;
    }

    const currentSettings = loadSettings();
    const startedAt = nowMs();
    writeState((previous) => ({
      ...previous,
      mode: GAME_MODES.SHOUT,
      activePlayer: playerId,
      shoutStartedAt: startedAt,
      shoutEndsAt: startedAt + currentSettings.shoutSeconds * 1000,
      winner: null,
      players: {
        ...previous.players,
        [playerId]: {
          ...previous.players[playerId],
          live: 0,
          peak: 0,
          score: 0,
          hasScore: false
        }
      }
    }));
  }, [writeState]);

  const startRace = useCallback(() => {
    const current = loadState();
    const startedAt = nowMs();
    const currentSettings = loadSettings();

    writeState({
      ...DEFAULT_STATE,
      mode: GAME_MODES.COUNTDOWN,
      raceCountdownStartedAt: startedAt,
      raceCountdownEndsAt: startedAt + currentSettings.raceCountdownSeconds * 1000,
      players: createRacePlayers(current.players)
    });
  }, [writeState]);

  const setControl = useCallback((playerId, value) => {
    if (!PLAYER_IDS.includes(playerId)) {
      return;
    }

    const nextValue = clamp(value, -1, 1);
    if (stateRef.current.controls[playerId] === nextValue) {
      return;
    }

    writeState((previous) => ({
      ...previous,
      controls: {
        ...previous.controls,
        [playerId]: nextValue
      }
    }));
  }, [writeState]);

  const reset = useCallback(() => {
    const saved = resetState();
    stateRef.current = saved;
  }, []);

  useEffect(() => {
    if (!isOperator) {
      return undefined;
    }

    let frameId;

    const tick = (timestamp) => {
      const current = stateRef.current;
      const currentSettings = settingsRef.current;
      const currentTime = nowMs();
      const deltaSeconds = lastFrameRef.current ? Math.min(0.08, (timestamp - lastFrameRef.current) / 1000) : 0.016;
      lastFrameRef.current = timestamp;

      if (current.mode === GAME_MODES.SHOUT && current.activePlayer) {
        const score = levelToScore(inputLevelRef.current, currentSettings);
        const player = current.players[current.activePlayer];
        const peak = Math.max(player.peak, score);

        if (current.shoutEndsAt && currentTime >= current.shoutEndsAt) {
          writeState((previous) => ({
            ...previous,
            mode: GAME_MODES.READY,
            activePlayer: null,
            shoutStartedAt: null,
            shoutEndsAt: null,
            players: {
              ...previous.players,
              [current.activePlayer]: {
                ...previous.players[current.activePlayer],
                live: peak,
                peak,
                score: peak,
                hasScore: true
              }
            }
          }));
        } else if (currentTime - lastWriteRef.current >= LIVE_WRITE_INTERVAL_MS) {
          lastWriteRef.current = currentTime;
          writeState((previous) => ({
            ...previous,
            players: {
              ...previous.players,
              [current.activePlayer]: {
                ...previous.players[current.activePlayer],
                live: score,
                peak
              }
            }
          }));
        }
      }

      if (current.mode === GAME_MODES.COUNTDOWN && current.raceCountdownEndsAt && currentTime >= current.raceCountdownEndsAt) {
        writeState((previous) => ({
          ...previous,
          mode: GAME_MODES.RACE,
          raceStartedAt: currentTime,
          raceCountdownStartedAt: null,
          raceCountdownEndsAt: null,
          players: createRacePlayers(previous.players)
        }));
      }

      if (current.mode === GAME_MODES.RACE && currentTime - lastWriteRef.current >= RACE_WRITE_INTERVAL_MS) {
        lastWriteRef.current = currentTime;
        writeState((previous) => {
          const players = { ...previous.players };
          let winner = previous.winner;

          for (const id of PLAYER_IDS) {
            const player = { ...players[id] };
            const steering = previous.controls[id] || 0;
            const isBraking = player.slowUntil > currentTime;
            const slow = isBraking ? currentSettings.collisionSlowFactor : 1;
            const baseSpeed = Math.max(12, player.score);
            const targetSpeed = baseSpeed * slow;
            const speed = smoothSpeed(player.speed, targetSpeed, isBraking);
            player.lane = clamp(player.lane + steering * currentSettings.steeringSpeed * deltaSeconds, 0.16, 0.84);
            player.distance = clamp(player.distance + (speed / currentSettings.maxScore) * currentSettings.raceSpeedScale * deltaSeconds, 0, 1);
            player.speed = roundTo(speed, 1);

            for (const obstacle of OBSTACLES) {
              if (!player.collidedObstacleIds.includes(obstacle.id) && collides(player, obstacle)) {
                player.collidedObstacleIds = [...player.collidedObstacleIds, obstacle.id];
                player.hits += 1;
                player.slowUntil = currentTime + currentSettings.collisionSlowMs;
              }
            }

            if (player.distance >= 1 && !player.finishedAt) {
              player.finishedAt = currentTime;
              winner ||= id;
            }

            players[id] = player;
          }

          const bothFinished = PLAYER_IDS.every((id) => players[id].finishedAt);

          return {
            ...previous,
            mode: winner || bothFinished ? GAME_MODES.FINISHED : GAME_MODES.RACE,
            finishedAt: winner || bothFinished ? currentTime : null,
            winner,
            players
          };
        });
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isOperator, writeState]);

  const shoutRemaining = state.mode === GAME_MODES.SHOUT && state.shoutEndsAt
    ? Math.max(0, (state.shoutEndsAt - now) / 1000)
    : 0;
  const raceCountdownRemaining = state.mode === GAME_MODES.COUNTDOWN && state.raceCountdownEndsAt
    ? Math.max(0, (state.raceCountdownEndsAt - now) / 1000)
    : 0;

  return {
    now,
    reset,
    setControl,
    setInputLevel,
    settings,
    raceCountdownRemaining,
    shoutRemaining,
    startRace,
    startShout,
    state,
    updateSettings
  };
}
