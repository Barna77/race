import { useEffect, useMemo, useState } from 'react';
import { GAME_MODES, PLAYER_IDS } from '../config/gameConfig.js';
import useMicrophoneLevel from '../hooks/useMicrophoneLevel.js';
import useRaceGame from '../hooks/useRaceGame.js';
import { levelToScore } from '../lib/scoring.js';

const PUBLIC_FEATURES = 'popup=yes,width=640,height=1080,left=0,top=0';
const WALL_A_FEATURES = 'popup=yes,width=320,height=1080,left=0,top=0';
const WALL_B_FEATURES = 'popup=yes,width=320,height=1080,left=320,top=0';

function NumberControl({ label, max, min, onChange, step = 1, suffix = '', value }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const number = Number(draft);
    if (Number.isFinite(number)) {
      onChange(number);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <label className="control-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      <output>{value}{suffix}</output>
    </label>
  );
}

function modeLabel(mode) {
  if (mode === GAME_MODES.SHOUT) return 'Kiabálás mérése';
  if (mode === GAME_MODES.READY) return 'Futamra kész';
  if (mode === GAME_MODES.COUNTDOWN) return 'Rajtlámpa';
  if (mode === GAME_MODES.RACE) return 'Akadálypálya fut';
  if (mode === GAME_MODES.FINISHED) return 'Futam vége';
  return 'Készenlét';
}

function PlayerCard({ game, id, onStartShout }) {
  const player = game.state.players[id];
  const isActive = game.state.mode === GAME_MODES.SHOUT && game.state.activePlayer === id;

  return (
    <section className={`player-card player-card--${id.toLowerCase()} ${isActive ? 'player-card--active' : ''}`}>
      <div>
        <span>Versenyző {id}</span>
        <strong>{Math.round(player.score || player.peak || 0)} km/h</strong>
        <em>{player.hasScore ? 'Pont rögzítve' : 'Nincs még pont'}</em>
      </div>
      <button type="button" disabled={[GAME_MODES.COUNTDOWN, GAME_MODES.RACE].includes(game.state.mode) || isActive} onClick={() => onStartShout(id)}>
        Kiabálás mérése
      </button>
    </section>
  );
}

function useKeyboardControls(setControl) {
  useEffect(() => {
    const down = new Set();

    const applyControls = () => {
      const a = (down.has('KeyD') ? 1 : 0) + (down.has('KeyA') ? -1 : 0);
      const b = (down.has('ArrowRight') ? 1 : 0) + (down.has('ArrowLeft') ? -1 : 0);
      setControl('A', a);
      setControl('B', b);
    };

    const onKeyDown = (event) => {
      down.add(event.code);
      applyControls();
    };

    const onKeyUp = (event) => {
      down.delete(event.code);
      applyControls();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setControl]);
}

export default function AdminPanel() {
  const game = useRaceGame({ isOperator: true });
  const microphone = useMicrophoneLevel();
  const [testMode, setTestMode] = useState(false);
  const [testLevel, setTestLevel] = useState(0.25);
  const [status, setStatus] = useState('');
  const inputLevel = testMode ? testLevel : microphone.level;
  const liveScore = useMemo(() => levelToScore(inputLevel, game.settings), [game.settings, inputLevel]);
  const canStartRace = PLAYER_IDS.every((id) => game.state.players[id].hasScore);
  const previewPaused = [GAME_MODES.COUNTDOWN, GAME_MODES.RACE].includes(game.state.mode);
  useKeyboardControls(game.setControl);

  useEffect(() => {
    game.setInputLevel(inputLevel);
  }, [game.setInputLevel, inputLevel]);

  const startShout = async (playerId) => {
    if (!testMode && microphone.status !== 'granted') {
      const allowed = await microphone.requestMicrophone();
      if (!allowed) {
        setStatus('A mikrofonengedély nem aktív, a mérés nem indult el.');
        return;
      }
    }

    game.startShout(playerId);
    setStatus(`${playerId} versenyző kiabálás mérése elindult.`);
  };

  const openDisplay = (url, name, features) => {
    const opened = window.open(url, name, features);
    opened?.focus();
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Verseny projekt</p>
          <h1>Kiabálós akadálypálya</h1>
          <span>Két külön 320×1080 fal vagy egy 640×1080 kombinált public nézet.</span>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={() => openDisplay('/public', 'verseny-public', PUBLIC_FEATURES)}>640×1080 public</button>
          <button type="button" onClick={() => openDisplay('/wall/a', 'verseny-wall-a', WALL_A_FEATURES)}>A fal</button>
          <button type="button" onClick={() => openDisplay('/wall/b', 'verseny-wall-b', WALL_B_FEATURES)}>B fal</button>
        </div>
      </header>

      <section className="status-dock">
        <div><span>Állapot</span><strong>{modeLabel(game.state.mode)}</strong></div>
        <div><span>Mikrofon</span><strong>{testMode ? 'teszt mód' : microphone.status}</strong></div>
        <div><span>Élő jel</span><strong>{inputLevel.toFixed(4)}</strong></div>
        <div><span>Élő pont</span><strong>{Math.round(liveScore)} km/h</strong></div>
        <div><span>Hátra</span><strong>{game.shoutRemaining.toFixed(1)} s</strong></div>
      </section>

      <section className="admin-grid">
        <section className="panel panel--wide">
          <div className="panel-title">
            <h2>Mérés és futam</h2>
            <p>Először A és B kiabál. A rögzített pont lesz az autó sebessége.</p>
          </div>
          <div className="players-row">
            <PlayerCard game={game} id="A" onStartShout={startShout} />
            <PlayerCard game={game} id="B" onStartShout={startShout} />
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" disabled={!canStartRace || [GAME_MODES.COUNTDOWN, GAME_MODES.RACE].includes(game.state.mode)} onClick={game.startRace}>
              Futam indítása
            </button>
            <button type="button" disabled={!canStartRace} onClick={game.startRace}>Futam újraindítása a pontokkal</button>
            <button type="button" className="danger-button" onClick={game.reset}>Teljes reset</button>
          </div>
          <div className="keyboard-help">
            <strong>Billentyű teszt:</strong>
            <span>A autó: A / D</span>
            <span>B autó: ← / →</span>
          </div>
          {game.state.winner ? <p className="winner-line">Győztes: {game.state.winner} versenyző</p> : null}
          {status ? <p className="status-line">{status}</p> : null}
          {microphone.error ? <p className="error-line">{microphone.error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Bemenet</h2>
            <p>Mikrofon éles használatra, teszt jel próbára.</p>
          </div>
          <button type="button" onClick={microphone.requestMicrophone}>Mikrofon engedély</button>
          <label className="toggle-row">
            <input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} />
            Teszt jel használata
          </label>
          <NumberControl label="Teszt jel" min={0} max={1} step={0.01} value={testLevel} onChange={setTestLevel} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Kalibráció</h2>
            <p>Ezzel lehet beállítani, mennyire könnyű elérni a maximális sebességet.</p>
          </div>
          <NumberControl label="Mérési idő" min={2} max={15} step={1} suffix=" s" value={game.settings.shoutSeconds} onChange={(value) => game.updateSettings({ shoutSeconds: value })} />
          <NumberControl label="Rajtlámpa idő" min={2} max={10} step={1} suffix=" s" value={game.settings.raceCountdownSeconds} onChange={(value) => game.updateSettings({ raceCountdownSeconds: value })} />
          <NumberControl label="Max pont" min={50} max={400} step={10} value={game.settings.maxScore} onChange={(value) => game.updateSettings({ maxScore: value })} />
          <NumberControl label="Alapzaj" min={0} max={0.2} step={0.001} value={game.settings.noiseFloor} onChange={(value) => game.updateSettings({ noiseFloor: value })} />
          <NumberControl label="Max kiabálás" min={0.01} max={1} step={0.001} value={game.settings.maxShoutLevel} onChange={(value) => game.updateSettings({ maxShoutLevel: value })} />
          <NumberControl label="Érzékenység" min={0.1} max={30} step={0.01} value={game.settings.sensitivity} onChange={(value) => game.updateSettings({ sensitivity: value })} />
          <NumberControl label="Görbe" min={0.35} max={2.5} step={0.01} value={game.settings.curve} onChange={(value) => game.updateSettings({ curve: value })} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Autók és pálya</h2>
            <p>Az ütközés lassít, de nem állítja meg az autót.</p>
          </div>
          <NumberControl label="Kormányzás" min={0.2} max={2} step={0.01} value={game.settings.steeringSpeed} onChange={(value) => game.updateSettings({ steeringSpeed: value })} />
          <NumberControl label="Pálya tempó" min={0.04} max={0.25} step={0.001} value={game.settings.raceSpeedScale} onChange={(value) => game.updateSettings({ raceSpeedScale: value })} />
          <NumberControl label="Lassítás ideje" min={200} max={3000} step={50} suffix=" ms" value={game.settings.collisionSlowMs} onChange={(value) => game.updateSettings({ collisionSlowMs: value })} />
          <NumberControl label="Lassítás ereje" min={0.1} max={0.9} step={0.01} value={game.settings.collisionSlowFactor} onChange={(value) => game.updateSettings({ collisionSlowFactor: value })} />
        </section>

        <section className="panel panel--preview">
          <div className="panel-title">
            <h2>Public előnézet</h2>
            <p>640×1080 kombinált fal kicsinyítve.</p>
          </div>
          <div className="public-preview-frame">
            {previewPaused ? (
              <div className="public-preview-paused">
                <strong>Előnézet szünetel</strong>
                <span>A futam alatt a LED-kijelző teljesítménye kap prioritást.</span>
              </div>
            ) : (
              <iframe src="/public" title="Public előnézet" />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
