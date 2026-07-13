export const GAME_MODES = {
  IDLE: 'idle',
  SHOUT: 'shout',
  READY: 'ready',
  COUNTDOWN: 'countdown',
  RACE: 'race',
  FINISHED: 'finished'
};

export const PLAYER_IDS = ['A', 'B'];

export const STORAGE_KEYS = {
  state: 'verseny.dualwall.state.v1',
  settings: 'verseny.dualwall.settings.v1'
};

export const STORAGE_EVENT = 'verseny.dualwall.storage';

export const DEFAULT_SETTINGS = {
  shoutSeconds: 5,
  raceCountdownSeconds: 5,
  maxScore: 200,
  noiseFloor: 0.008,
  maxShoutLevel: 0.24,
  sensitivity: 1.6,
  curve: 0.72,
  steeringSpeed: 0.82,
  raceSpeedScale: 0.118,
  collisionSlowMs: 950,
  collisionSlowFactor: 0.42,
  wallLabelA: 'A VERSENYZŐ',
  wallLabelB: 'B VERSENYZŐ'
};

export const OBSTACLES = [
  { id: 'o1', distance: 0.16, lane: 0.30, width: 0.24 },
  { id: 'o2', distance: 0.25, lane: 0.68, width: 0.22 },
  { id: 'o3', distance: 0.35, lane: 0.48, width: 0.28 },
  { id: 'o4', distance: 0.47, lane: 0.25, width: 0.2 },
  { id: 'o5', distance: 0.58, lane: 0.72, width: 0.24 },
  { id: 'o6', distance: 0.69, lane: 0.42, width: 0.22 },
  { id: 'o7', distance: 0.8, lane: 0.62, width: 0.26 },
  { id: 'o8', distance: 0.91, lane: 0.34, width: 0.2 }
];

export const DEFAULT_PLAYER_STATE = {
  score: 0,
  peak: 0,
  live: 0,
  hasScore: false,
  distance: 0,
  lane: 0.5,
  speed: 0,
  hits: 0,
  slowUntil: 0,
  collidedObstacleIds: [],
  finishedAt: null
};

export const DEFAULT_STATE = {
  mode: GAME_MODES.IDLE,
  activePlayer: null,
  shoutStartedAt: null,
  shoutEndsAt: null,
  raceStartedAt: null,
  raceCountdownStartedAt: null,
  raceCountdownEndsAt: null,
  finishedAt: null,
  winner: null,
  players: {
    A: { ...DEFAULT_PLAYER_STATE },
    B: { ...DEFAULT_PLAYER_STATE }
  },
  controls: {
    A: 0,
    B: 0
  }
};
