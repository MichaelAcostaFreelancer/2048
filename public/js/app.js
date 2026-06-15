const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const statusEl = document.getElementById('status');
const newGameBtn = document.getElementById('new-game');
const themeToggleBtn = document.getElementById('theme-toggle');
const soundToggleBtn = document.getElementById('sound-toggle');

let state = null;
let soundEnabled = true;
let gestureStart = null;
let audioContext = null;

async function loadState() {
  const response = await fetch('/api/state');
  state = await response.json();
  render();
}

function render() {
  if (!state) return;

  boardEl.innerHTML = '';
  const board = state.board || [];

  board.forEach((row) => {
    row.forEach((value) => {
      const tile = document.createElement('div');
      tile.className = `tile tile--${value || 0}`;
      tile.textContent = value ? value : '';
      boardEl.appendChild(tile);
    });
  });

  scoreEl.textContent = state.score || 0;
  bestScoreEl.textContent = state.best_score || 0;

  if (state.lost) {
    statusEl.textContent = 'No quedan movimientos. Empieza otra partida.';
  } else if (state.won) {
    statusEl.textContent = '¡Llegaste a 2048!';
  } else {
    statusEl.textContent = 'Mueve las fichas con las flechas o deslizando.';
  }

  document.documentElement.setAttribute('data-theme', state.theme || 'dark');
  themeToggleBtn.textContent = state.theme === 'dark' ? 'Tema: oscuro' : 'Tema: claro';
  soundToggleBtn.textContent = soundEnabled ? 'Sonido: on' : 'Sonido: off';
}

function animateBoard() {
  boardEl.classList.remove('is-animating');
  void boardEl.offsetWidth;
  boardEl.classList.add('is-animating');
  window.setTimeout(() => boardEl.classList.remove('is-animating'), 200);
}

function playMoveSound() {
  if (!soundEnabled) return;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContextClass ? new AudioContextClass() : null;
  }

  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.06);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.08);
}

async function move(direction) {
  const response = await fetch('/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `direction=${direction}`
  });
  state = await response.json();
  animateBoard();
  render();
  playMoveSound();
}

async function resetGame() {
  const response = await fetch('/reset', { method: 'POST' });
  state = await response.json();
  animateBoard();
  render();
}

async function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  const response = await fetch('/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `theme=${nextTheme}`
  });
  state = await response.json();
  render();
}

function handleKeydown(event) {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
  if (map[event.key]) {
    event.preventDefault();
    move(map[event.key]);
  }
}

function handlePointerStart(event) {
  const point = event.touches ? event.touches[0] : event;
  gestureStart = { x: point.clientX, y: point.clientY };
}

function handlePointerEnd(event) {
  if (!gestureStart) return;
  const point = event.changedTouches ? event.changedTouches[0] : event;
  const dx = point.clientX - gestureStart.x;
  const dy = point.clientY - gestureStart.y;
  const threshold = 24;

  if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }

  gestureStart = null;
}

newGameBtn.addEventListener('click', resetGame);
themeToggleBtn.addEventListener('click', toggleTheme);
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? 'Sonido: on' : 'Sonido: off';
});

window.addEventListener('keydown', handleKeydown);
boardEl.addEventListener('touchstart', handlePointerStart, { passive: true });
boardEl.addEventListener('touchend', handlePointerEnd, { passive: true });
boardEl.addEventListener('pointerdown', handlePointerStart, { passive: true });
boardEl.addEventListener('pointerup', handlePointerEnd, { passive: true });
boardEl.addEventListener('click', () => boardEl.focus());

loadState();
