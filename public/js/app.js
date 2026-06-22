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

class Game2048 {
  constructor(state = null) {
    if (state && state.board && Array.isArray(state.board) && state.board.length === 4) {
      this.board = state.board.map((row) => row.map((value) => Number(value) || 0));
      this.score = Number(state.score) || 0;
      this.won = Boolean(state.won);
      this.lost = Boolean(state.lost);
      this.best_score = Number(state.best_score) || 0;
      this.theme = state.theme || 'dark';
      if (!this.board.some((row) => row.some((value) => value !== 0))) {
        this.spawnTile();
        this.spawnTile();
      }
    } else {
      this.board = Array.from({ length: 4 }, () => Array(4).fill(0));
      this.score = 0;
      this.won = false;
      this.lost = false;
      this.best_score = 0;
      this.theme = state && state.theme ? state.theme : 'dark';
      this.spawnTile();
      this.spawnTile();
    }
  }

  move(direction) {
    if (this.lost) return this.toObject();

    const originalBoard = this.deepCopy(this.board);
    let movedBoard;

    switch (direction.toString().toLowerCase()) {
      case 'left':
        movedBoard = this.board.map((row) => this.mergeRow(row));
        break;
      case 'right':
        movedBoard = this.board.map((row) => this.mergeRow([...row].reverse()).reverse());
        break;
      case 'up':
        movedBoard = this.transpose(this.transpose(this.board).map((col) => this.mergeRow(col)));
        break;
      case 'down':
        movedBoard = this.transpose(this.transpose(this.board).map((col) => this.mergeRow([...col].reverse()).reverse()));
        break;
      default:
        movedBoard = this.board;
    }

    if (!this.areBoardsEqual(originalBoard, movedBoard)) {
      this.board = movedBoard;
      this.spawnTile();
      this.won = this.board.flat().some((value) => value >= 2048) || this.won;
      this.lost = this.gameOver();
    }

    return this.toObject();
  }

  toObject() {
    return {
      board: this.deepCopy(this.board),
      score: this.score,
      won: this.won,
      lost: this.lost,
      best_score: Math.max(this.best_score, this.score),
      theme: this.theme
    };
  }

  mergeRow(values) {
    const compacted = values.filter((value) => value !== 0);
    const merged = [];
    let index = 0;

    while (index < compacted.length) {
      if (index + 1 < compacted.length && compacted[index] === compacted[index + 1]) {
        const mergedValue = compacted[index] * 2;
        merged.push(mergedValue);
        this.score += mergedValue;
        this.best_score = Math.max(this.best_score, this.score);
        index += 2;
      } else {
        merged.push(compacted[index]);
        index += 1;
      }
    }

    return [...merged, ...Array(4 - merged.length).fill(0)];
  }

  spawnTile() {
    const emptyCells = [];

    this.board.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value === 0) emptyCells.push([rowIndex, colIndex]);
      });
    });

    if (!emptyCells.length) return;

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.board[row][col] = Math.random() < 0.9 ? 2 : 4;
  }

  gameOver() {
    if (this.board.some((row) => row.some((value) => value === 0))) {
      return false;
    }

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const value = this.board[row][col];
        if (row + 1 < 4 && value === this.board[row + 1][col]) return false;
        if (col + 1 < 4 && value === this.board[row][col + 1]) return false;
      }
    }

    return true;
  }

  transpose(board) {
    return board[0].map((_, colIndex) => board.map((row) => row[colIndex]));
  }

  areBoardsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

function getSavedState() {
  const saved = localStorage.getItem('nova2048State');
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveState() {
  if (state) {
    localStorage.setItem('nova2048State', JSON.stringify(state));
  }
}

function loadState() {
  const saved = getSavedState();
  if (saved && saved.board && Array.isArray(saved.board) && saved.board.length === 4) {
    state = saved;
  } else {
    state = new Game2048().toObject();
    saveState();
  }
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
  gainNode.gain.setValueAtTime(0.0001, now + 0.08);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.08);
}

function move(direction) {
  const game = new Game2048(state);
  state = game.move(direction);
  saveState();
  animateBoard();
  render();
  playMoveSound();
}

function resetGame() {
  const theme = state?.theme || 'dark';
  state = new Game2048({ theme }).toObject();
  saveState();
  animateBoard();
  render();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
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
