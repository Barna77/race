import { useEffect, useRef } from 'react';
import { OBSTACLES } from '../config/gameConfig.js';

const WIDTH = 320;
const HEIGHT = 1080;
const ROAD_X = 30;
const ROAD_Y = -40;
const ROAD_WIDTH = 260;
const ROAD_HEIGHT = 1160;
const TRACK_PX = 2550;
const CAR_Y = 790;

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const value = Number.parseInt(clean.length === 3
    ? clean.split('').map((part) => part + part).join('')
    : clean, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function color(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(hex, amount = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  const next = (channel) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${next(r)}, ${next(g)}, ${next(b)})`;
}

function screenY(distance, progress) {
  return CAR_Y - (distance - progress) * TRACK_PX;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawText(ctx, text, x, y, options = {}) {
  const {
    align = 'center',
    baseline = 'middle',
    color: fill = '#fff',
    font = '700 28px Arial Narrow, Impact, sans-serif',
    glow = null
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = fill;

  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawBackground(ctx, accent) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#07101b');
  bg.addColorStop(1, '#020408');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, 120, 0, WIDTH / 2, 120, 260);
  glow.addColorStop(0, color(accent, 0.18));
  glow.addColorStop(1, color(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawRoad(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ROAD_X, ROAD_Y, ROAD_WIDTH, ROAD_HEIGHT);
  ctx.clip();

  const roadGradient = ctx.createLinearGradient(ROAD_X, 0, ROAD_X + ROAD_WIDTH, 0);
  roadGradient.addColorStop(0, '#151923');
  roadGradient.addColorStop(0.5, '#202833');
  roadGradient.addColorStop(1, '#111821');
  ctx.fillStyle = roadGradient;
  ctx.fillRect(ROAD_X, ROAD_Y, ROAD_WIDTH, ROAD_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ROAD_X + 24, ROAD_Y);
  ctx.lineTo(ROAD_X + 24, ROAD_Y + ROAD_HEIGHT);
  ctx.moveTo(ROAD_X + ROAD_WIDTH - 24, ROAD_Y);
  ctx.lineTo(ROAD_X + ROAD_WIDTH - 24, ROAD_Y + ROAD_HEIGHT);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 4;
  for (let y = -20; y < HEIGHT + 100; y += 76) {
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, y);
    ctx.lineTo(WIDTH / 2, y + 34);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  for (let y = -40; y < HEIGHT + 80; y += 84) {
    ctx.fillRect(ROAD_X, y, ROAD_WIDTH, 18);
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ROAD_X, 0);
  ctx.lineTo(ROAD_X, HEIGHT);
  ctx.moveTo(ROAD_X + ROAD_WIDTH, 0);
  ctx.lineTo(ROAD_X + ROAD_WIDTH, HEIGHT);
  ctx.stroke();
}

function drawObstacle(ctx, obstacle, y, hit) {
  const width = obstacle.width * 250;
  const height = 34;
  const x = ROAD_X + obstacle.lane * ROAD_WIDTH - width / 2;

  ctx.save();
  ctx.globalAlpha = hit ? 0.6 : 1;
  ctx.shadowColor = 'rgba(255,220,98,0.42)';
  ctx.shadowBlur = hit ? 4 : 14;
  roundedRect(ctx, x, y - height / 2, width, height, 6);
  ctx.fillStyle = '#ffdc62';
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = '#090806';
  for (let sx = x - width; sx < x + width * 2; sx += 22) {
    ctx.beginPath();
    ctx.moveTo(sx, y + height);
    ctx.lineTo(sx + 12, y + height);
    ctx.lineTo(sx + 44, y - height);
    ctx.lineTo(sx + 32, y - height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawFinish(ctx, y) {
  const height = 58;
  for (let x = ROAD_X; x < ROAD_X + ROAD_WIDTH; x += 24) {
    for (let row = 0; row < 3; row += 1) {
      ctx.fillStyle = (Math.floor((x - ROAD_X) / 24) + row) % 2 === 0 ? '#fff' : '#050505';
      ctx.fillRect(x, y + row * 20, 24, 20);
    }
  }

  drawText(ctx, 'CÉL', WIDTH / 2, y + height / 2, {
    color: '#ffdc62',
    font: '900 38px Arial Narrow, Impact, sans-serif',
    glow: { color: '#000', blur: 10 }
  });
}

function drawCar(ctx, player, accent, isWinner) {
  const x = ROAD_X + player.lane * ROAD_WIDTH;
  const y = CAR_Y;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color(accent, isWinner ? 0.78 : 0.46);
  ctx.shadowBlur = isWinner ? 24 : 12;

  const wheel = (wx, wy, h = 30) => {
    roundedRect(ctx, wx - 7, wy - h / 2, 14, h, 5);
    ctx.fillStyle = '#05070a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };

  wheel(-28, -38, 28);
  wheel(28, -38, 28);
  wheel(-28, 28, 30);
  wheel(28, 28, 30);

  ctx.fillStyle = color(accent, 0.96);
  roundedRect(ctx, -30, -64, 60, 12, 4);
  ctx.fill();
  roundedRect(ctx, -32, 52, 64, 14, 4);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.bezierCurveTo(15, -45, 18, -22, 17, -2);
  ctx.lineTo(25, 36);
  ctx.bezierCurveTo(29, 54, 15, 66, 0, 69);
  ctx.bezierCurveTo(-15, 66, -29, 54, -25, 36);
  ctx.lineTo(-17, -2);
  ctx.bezierCurveTo(-18, -22, -15, -45, 0, -62);
  ctx.closePath();
  const body = ctx.createLinearGradient(-24, -62, 24, 68);
  body.addColorStop(0, mix(accent, 0.42));
  body.addColorStop(0.45, accent);
  body.addColorStop(1, '#0b0f16');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = mix(accent, 0.58);
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.bezierCurveTo(8, -38, 8, -20, 6, -6);
  ctx.lineTo(-6, -6);
  ctx.bezierCurveTo(-8, -20, -8, -38, 0, -56);
  ctx.fill();

  ctx.fillStyle = '#07101b';
  ctx.beginPath();
  ctx.ellipse(0, 14, 13, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -38);
  ctx.bezierCurveTo(-16, -8, -17, 24, -21, 43);
  ctx.moveTo(12, -38);
  ctx.bezierCurveTo(16, -8, 17, 24, 21, 43);
  ctx.stroke();

  ctx.restore();
}

function drawHud(ctx, label, player, accent) {
  drawText(ctx, label, WIDTH / 2, 42, {
    color: mix(accent, 0.32),
    font: '900 25px Arial Narrow, Impact, sans-serif',
    glow: { color: color(accent, 0.5), blur: 14 }
  });

  drawText(ctx, String(Math.round(player.speed || player.score)), WIDTH / 2, 92, {
    color: '#fff',
    font: '900 68px Arial Narrow, Impact, sans-serif',
    glow: { color: color(accent, 0.38), blur: 18 }
  });

  drawText(ctx, 'km/h', WIDTH / 2, 132, {
    color: '#dbe9f8',
    font: '900 26px Arial Narrow, Impact, sans-serif'
  });
}

function drawProgress(ctx, player, accent) {
  const x = WIDTH - 14;
  const y = 230;
  const height = 640;
  roundedRect(ctx, x, y, 8, height, 999);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  const fillHeight = Math.max(12, player.distance * height);
  roundedRect(ctx, x, y + height - fillHeight, 8, fillHeight, 999);
  const progress = ctx.createLinearGradient(0, y, 0, y + height);
  progress.addColorStop(0, accent);
  progress.addColorStop(1, '#3effa3');
  ctx.fillStyle = progress;
  ctx.shadowColor = color(accent, 0.48);
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawWinner(ctx, isWinner, accent) {
  ctx.fillStyle = isWinner ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 220);
  glow.addColorStop(0, color(accent, isWinner ? 0.36 : 0.08));
  glow.addColorStop(1, color(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawText(ctx, isWinner ? 'GYŐZTES' : 'CÉLBA ÉRT', WIDTH / 2, HEIGHT / 2, {
    color: '#ffdc62',
    font: '900 60px Arial Narrow, Impact, sans-serif',
    glow: { color: color(accent, 0.72), blur: 38 }
  });
}

function renderRace(ctx, { accent, label, player, side, state }) {
  const isWinner = state.winner === side;
  const progress = player.distance;
  const finishY = screenY(1, progress);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(ctx, accent);
  drawRoad(ctx);

  for (const obstacle of OBSTACLES) {
    const y = screenY(obstacle.distance, progress);
    if (y > -100 && y < HEIGHT + 100) {
      drawObstacle(ctx, obstacle, y, player.collidedObstacleIds.includes(obstacle.id));
    }
  }

  if (finishY > -120 && finishY < HEIGHT + 120) {
    drawFinish(ctx, finishY);
  }

  drawCar(ctx, player, accent, isWinner);
  drawHud(ctx, label, player, accent);
  drawProgress(ctx, player, accent);

  if (state.mode === 'finished') {
    drawWinner(ctx, isWinner, accent);
  }
}

export default function CanvasRaceTrack({ accent, label, player, side, state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    renderRace(ctx, { accent, label, player, side, state });
  }, [accent, label, player, side, state]);

  return (
    <canvas
      className="race-canvas"
      height={HEIGHT}
      ref={canvasRef}
      width={WIDTH}
    />
  );
}
