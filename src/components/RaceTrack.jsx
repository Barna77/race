import { OBSTACLES } from '../config/gameConfig.js';

const TRACK_PX = 2550;
const CAR_Y = 790;

function screenY(distance, progress) {
  return CAR_Y - (distance - progress) * TRACK_PX;
}

function RaceCar({ accent, isWinner, player }) {
  return (
    <div
      className={`race-car ${isWinner ? 'race-car--winner' : ''}`}
      style={{
        '--car-x': `${player.lane * 100}%`,
        '--accent': accent
      }}
    >
      <div className="race-car__shadow" />
      <svg className="race-car__svg" viewBox="0 0 80 140" aria-hidden="true">
        <rect className="race-car__wheel" x="5" y="31" width="13" height="28" rx="5" />
        <rect className="race-car__wheel" x="62" y="31" width="13" height="28" rx="5" />
        <rect className="race-car__wheel" x="5" y="91" width="13" height="30" rx="5" />
        <rect className="race-car__wheel" x="62" y="91" width="13" height="30" rx="5" />
        <rect className="race-car__wing" x="12" y="7" width="56" height="11" rx="4" />
        <rect className="race-car__wing" x="10" y="119" width="60" height="13" rx="4" />
        <path
          className="race-car__main"
          d="M40 14 C49 22 53 39 53 61 L60 100 C61 111 53 124 40 128 C27 124 19 111 20 100 L27 61 C27 39 31 22 40 14 Z"
        />
        <path className="race-car__nose" d="M40 18 C45 30 46 45 45 65 L35 65 C34 45 35 30 40 18 Z" />
        <path className="race-car__sidepod" d="M25 66 C18 72 18 96 25 105 L32 100 L32 70 Z" />
        <path className="race-car__sidepod" d="M55 66 C62 72 62 96 55 105 L48 100 L48 70 Z" />
        <ellipse className="race-car__cockpit" cx="40" cy="78" rx="13" ry="18" />
        <path className="race-car__highlight" d="M31 31 C29 48 28 83 25 103" />
        <path className="race-car__highlight" d="M49 31 C51 48 52 83 55 103" />
        <path className="race-car__grille" d="M30 111 H50" />
      </svg>
    </div>
  );
}

export default function RaceTrack({ accent, label, player, side, state }) {
  const isWinner = state.winner === side;
  const progress = player.distance;
  const finishY = screenY(1, progress);

  return (
    <div className="race-track" style={{ '--accent': accent }}>
      <div className="race-track__road">
        <div className="race-track__lane race-track__lane--left" />
        <div className="race-track__lane race-track__lane--right" />
        <div className="race-track__centerline" />
        {OBSTACLES.map((obstacle) => {
          const y = screenY(obstacle.distance, progress);

          if (y < -100 || y > 1120) {
            return null;
          }

          return (
            <div
              className={player.collidedObstacleIds.includes(obstacle.id) ? 'obstacle obstacle--hit' : 'obstacle'}
              key={obstacle.id}
              style={{
                left: `${obstacle.lane * 100}%`,
                top: `${y}px`,
                width: `${obstacle.width * 250}px`
              }}
            />
          );
        })}
        {finishY > -120 && finishY < 1120 ? <div className="finish-line" style={{ top: `${finishY}px` }}>CÉL</div> : null}
        <RaceCar accent={accent} isWinner={isWinner} player={player} />
      </div>
      <div className="race-hud">
        <span>{label}</span>
        <strong>{Math.round(player.speed || player.score)}</strong>
        <em>km/h</em>
      </div>
      <div className="race-progress">
        <i style={{ height: `${Math.max(2, progress * 100)}%` }} />
      </div>
      {state.mode === 'finished' ? (
        <div className={isWinner ? 'winner-badge winner-badge--active' : 'winner-badge'}>
          <span>{isWinner ? 'GYŐZTES' : 'CÉLBA ÉRT'}</span>
        </div>
      ) : null}
    </div>
  );
}
