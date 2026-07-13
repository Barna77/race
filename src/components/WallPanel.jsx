import { GAME_MODES } from '../config/gameConfig.js';
import CanvasRaceTrack from './CanvasRaceTrack.jsx';

const PLAYER_THEME = {
  A: {
    accent: '#ff304f',
    labelKey: 'wallLabelA'
  },
  B: {
    accent: '#20c8ff',
    labelKey: 'wallLabelB'
  }
};

const START_LAMP_COUNT = 5;

function ScoreGauge({ player, settings }) {
  const ratio = Math.max(0, Math.min(1, (player.peak || player.score || 0) / settings.maxScore));

  return (
    <div className="score-gauge" style={{ '--score-ratio': ratio }}>
      <div className="score-gauge__ring" />
      <strong>{Math.round(player.peak || player.score || 0)}</strong>
      <span>km/h</span>
    </div>
  );
}

function getActiveLampCount(state, now) {
  if (!state.raceCountdownStartedAt || !state.raceCountdownEndsAt) {
    return 0;
  }

  const total = Math.max(1, state.raceCountdownEndsAt - state.raceCountdownStartedAt);
  const elapsed = Math.max(0, now - state.raceCountdownStartedAt);
  return Math.max(1, Math.min(START_LAMP_COUNT, Math.ceil((elapsed / total) * START_LAMP_COUNT)));
}

function RaceCountdown({ game }) {
  const activeLampCount = getActiveLampCount(game.state, game.now);

  return (
    <div className="race-countdown">
      <div className="race-start-lights">
        {Array.from({ length: START_LAMP_COUNT }, (_, index) => (
          <div className={index < activeLampCount ? 'race-start-column race-start-column--active' : 'race-start-column'} key={index}>
            <span />
            <span />
          </div>
        ))}
      </div>
      <strong>{Math.max(1, Math.ceil(game.raceCountdownRemaining))}</strong>
    </div>
  );
}

function StackedText({ children }) {
  return String(children)
    .split(' ')
    .map((word) => <span key={word}>{word}</span>);
}

export default function WallPanel({ game, playerId }) {
  const theme = PLAYER_THEME[playerId];
  const player = game.state.players[playerId];
  const isActiveShout = game.state.mode === GAME_MODES.SHOUT && game.state.activePlayer === playerId;
  const otherPlayerActive = game.state.mode === GAME_MODES.SHOUT && game.state.activePlayer !== playerId;
  const label = game.settings[theme.labelKey];

  if (game.state.mode === GAME_MODES.COUNTDOWN) {
    return (
      <section className={`wall-panel wall-panel--${playerId.toLowerCase()}`} style={{ '--accent': theme.accent }}>
        <div className="wall-bg" />
        <div className="wall-header">
          <span>{label}</span>
          <strong>{playerId}</strong>
        </div>
        <RaceCountdown game={game} />
      </section>
    );
  }

  if (game.state.mode === GAME_MODES.RACE || game.state.mode === GAME_MODES.FINISHED) {
    return (
      <section className={`wall-panel wall-panel--${playerId.toLowerCase()}`}>
        <CanvasRaceTrack accent={theme.accent} label={label} player={player} side={playerId} state={game.state} />
      </section>
    );
  }

  return (
    <section className={`wall-panel wall-panel--${playerId.toLowerCase()}`} style={{ '--accent': theme.accent }}>
      <div className="wall-bg" />
      <div className="wall-header">
        <span>{label}</span>
        <strong>{playerId}</strong>
      </div>

      {isActiveShout ? (
        <div className="shout-state shout-state--active">
          <h1><StackedText>KIABÁLJ!</StackedText></h1>
          <ScoreGauge player={player} settings={game.settings} />
          <p>{game.shoutRemaining.toFixed(1)} s</p>
        </div>
      ) : null}

      {!isActiveShout && !otherPlayerActive ? (
        <div className="shout-state">
          <h1><StackedText>{player.hasScore ? 'SEBESSÉG RÖGZÍTVE' : 'KÉSZEN ÁLL'}</StackedText></h1>
          <ScoreGauge player={player} settings={game.settings} />
          <p><StackedText>{player.hasScore ? 'Várakozás a futamra' : 'Mérésre vár'}</StackedText></p>
        </div>
      ) : null}

      {otherPlayerActive ? (
        <div className="shout-state">
          <h1><StackedText>VÁRAKOZÁS</StackedText></h1>
          <ScoreGauge player={player} settings={game.settings} />
          <p><StackedText>A másik versenyző mér</StackedText></p>
        </div>
      ) : null}
    </section>
  );
}
