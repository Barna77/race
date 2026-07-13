import { DEFAULT_SETTINGS, DEFAULT_STATE, GAME_MODES, PLAYER_IDS, STORAGE_EVENT, STORAGE_KEYS } from '../config/gameConfig.js';
import { clamp } from './math.js';
import { sanitizeSettings } from './scoring.js';

const CHANNEL_NAME = 'verseny.dualwall.channel.v1';
const STATE_PERSIST_INTERVAL_MS = 600;

let memoryState = null;
let memorySettings = null;
let persistStateTimer = null;
let channel = null;

function getChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }

  return channel;
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  if (key === STORAGE_KEYS.state && memoryState) {
    return memoryState;
  }

  if (key === STORAGE_KEYS.settings && memorySettings) {
    return memorySettings;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function notifyLocal(key, value) {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key, value } }));
}

function broadcast(key, value) {
  getChannel()?.postMessage({ key, value });
}

function persistStateSnapshot() {
  if (typeof window === 'undefined' || !memoryState) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(memoryState));
}

function scheduleStatePersist() {
  if (typeof window === 'undefined' || persistStateTimer) {
    return;
  }

  persistStateTimer = window.setTimeout(() => {
    persistStateTimer = null;
    persistStateSnapshot();
  }, STATE_PERSIST_INTERVAL_MS);
}

function shouldPersistStateImmediately(state) {
  return ![GAME_MODES.SHOUT, GAME_MODES.RACE].includes(state.mode);
}

function writeSettingsSnapshot(value) {
  memorySettings = value;
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(value));
  notifyLocal(STORAGE_KEYS.settings, value);
  broadcast(STORAGE_KEYS.settings, value);
}

function writeStateSnapshot(value) {
  memoryState = value;
  notifyLocal(STORAGE_KEYS.state, value);
  broadcast(STORAGE_KEYS.state, value);

  if (shouldPersistStateImmediately(value)) {
    persistStateSnapshot();
  } else {
    scheduleStatePersist();
  }
}

function sanitizePlayer(player) {
  return {
    ...DEFAULT_STATE.players.A,
    ...player,
    score: clamp(Number(player?.score) || 0, 0, 999),
    peak: clamp(Number(player?.peak) || 0, 0, 999),
    live: clamp(Number(player?.live) || 0, 0, 999),
    distance: clamp(Number(player?.distance) || 0, 0, 1),
    lane: clamp(Number(player?.lane) || 0.5, 0.14, 0.86),
    speed: clamp(Number(player?.speed) || 0, 0, 999),
    hits: Math.max(0, Math.round(Number(player?.hits) || 0)),
    slowUntil: Number(player?.slowUntil) || 0,
    collidedObstacleIds: Array.isArray(player?.collidedObstacleIds) ? player.collidedObstacleIds.map(String) : [],
    finishedAt: player?.finishedAt || null,
    hasScore: Boolean(player?.hasScore)
  };
}

export function sanitizeState(state) {
  const next = { ...DEFAULT_STATE, ...state };

  return {
    ...next,
    players: PLAYER_IDS.reduce((players, id) => ({
      ...players,
      [id]: sanitizePlayer(next.players?.[id])
    }), {}),
    controls: {
      A: clamp(Number(next.controls?.A) || 0, -1, 1),
      B: clamp(Number(next.controls?.B) || 0, -1, 1)
    }
  };
}

export function loadSettings() {
  return sanitizeSettings({ ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.settings, {}) });
}

export function saveSettings(settings) {
  const next = sanitizeSettings({ ...DEFAULT_SETTINGS, ...settings });
  writeSettingsSnapshot(next);
  return next;
}

export function loadState() {
  return sanitizeState(readJson(STORAGE_KEYS.state, DEFAULT_STATE));
}

export function saveState(state) {
  const next = sanitizeState(state);
  writeStateSnapshot(next);
  return next;
}

export function resetState() {
  return saveState(DEFAULT_STATE);
}

export function subscribeToStorage(callback) {
  const onStorage = (event) => {
    if (!Object.values(STORAGE_KEYS).includes(event.key)) {
      return;
    }

    try {
      const value = event.newValue ? JSON.parse(event.newValue) : null;
      if (event.key === STORAGE_KEYS.state && value) {
        memoryState = value;
      }
      if (event.key === STORAGE_KEYS.settings && value) {
        memorySettings = value;
      }
    } catch {
      // Ignore malformed external writes.
    }

    callback(event.key);
  };

  const onLocal = (event) => {
    if (Object.values(STORAGE_KEYS).includes(event.detail?.key)) {
      callback(event.detail.key);
    }
  };

  const activeChannel = getChannel();
  const onChannel = (event) => {
    if (!Object.values(STORAGE_KEYS).includes(event.data?.key)) {
      return;
    }

    if (event.data.key === STORAGE_KEYS.state) {
      memoryState = event.data.value;
    }
    if (event.data.key === STORAGE_KEYS.settings) {
      memorySettings = event.data.value;
    }

    callback(event.data.key);
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(STORAGE_EVENT, onLocal);
  activeChannel?.addEventListener('message', onChannel);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(STORAGE_EVENT, onLocal);
    activeChannel?.removeEventListener('message', onChannel);
  };
}
