import { useEffect } from 'react';
import useRaceGame from '../hooks/useRaceGame.js';
import WallPanel from './WallPanel.jsx';

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

export default function PublicDisplay({ wall }) {
  const game = useRaceGame();
  useKeyboardControls(game.setControl);

  if (wall === 'A' || wall === 'B') {
    return (
      <main className="public-shell public-shell--single">
        <WallPanel game={game} playerId={wall} />
      </main>
    );
  }

  return (
    <main className="public-shell public-shell--combined">
      <WallPanel game={game} playerId="A" />
      <WallPanel game={game} playerId="B" />
    </main>
  );
}
