/* ============================================================
   ESCAPE THE VIVA - Audio Engine (Web Audio API)
   ============================================================ */

let audioCtx = null;
let isMuted = false;
let bgMusicNode = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', gain = 0.3, delay = 0) {
  if (isMuted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  } catch (e) {}
}

function toggleMute() {
  isMuted = !isMuted;
  document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
  if (isMuted && bgMusicNode) {
    bgMusicNode.stop();
    bgMusicNode = null;
  } else if (!isMuted) {
    startBgMusic();
  }
}

/* ---------- Background Music ---------- */
function startBgMusic() {
  if (isMuted) return;
  try {
    const ctx = getAudioCtx();
    const notes = [130, 146, 164, 174, 196, 220, 246];
    let time = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.04;
    masterGain.connect(ctx.destination);

    function scheduleNote() {
      if (isMuted) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(masterGain);
      osc.type = 'sine';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.5, time + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
      osc.start(time);
      osc.stop(time + 1.6);
      time += 0.8 + Math.random() * 0.6;
      setTimeout(scheduleNote, 600);
    }
    scheduleNote();
  } catch (e) {}
}

/* ---------- Sound Effects ---------- */
function playCorrectSound() {
  playTone(523, 0.1, 'square', 0.17);
  playTone(659, 0.1, 'square', 0.17, 0.1);
  playTone(784, 0.22, 'square', 0.2, 0.2);
}

function playWrongSound() {
  playTone(220, 0.13, 'sawtooth', 0.2);
  playTone(180, 0.17, 'sawtooth', 0.2, 0.13);
  playTone(140, 0.27, 'sawtooth', 0.16, 0.28);
}

function playClickSound() { playTone(500, 0.06, 'square', 0.1); }

function playStartSound() {
  [261, 329, 392, 523].forEach((f, i) => playTone(f, 0.13, 'square', 0.16, i * 0.09));
}

function playEscapeSound() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.17, 'square', 0.2, i * 0.09));
  setTimeout(() => [784, 880, 1047].forEach((f, i) => playTone(f, 0.27, 'sine', 0.16, i * 0.07)), 450);
}

function playFailSound() {
  [280, 230, 190, 140].forEach((f, i) => playTone(f, 0.2, 'sawtooth', 0.2, i * 0.12));
}

function playAdoptedSound() {
  [523, 523, 659, 523, 784, 698].forEach((f, i) => playTone(f, 0.13, 'sine', 0.16, i * 0.13));
}

function playAngrySound() {
  playTone(90, 0.09, 'sawtooth', 0.25);
  playTone(75, 0.13, 'sawtooth', 0.2, 0.09);
}

function playHappyChime() {
  playTone(880, 0.08, 'sine', 0.16);
  playTone(1100, 0.08, 'sine', 0.16, 0.08);
  playTone(1320, 0.13, 'sine', 0.13, 0.16);
}

function playStreakSound() {
  [659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.09, 'square', 0.13, i * 0.055));
}

function playUrgentTick() { playTone(1000, 0.055, 'square', 0.13); }
function playTimerWarning() { playTone(440, 0.07, 'sine', 0.09); }
function playLifelineSound() { [440, 550, 660].forEach((f, i) => playTone(f, 0.1, 'sine', 0.14, i * 0.07)); }
function playAchievementSound() { [660, 880, 1100, 880, 1320].forEach((f, i) => playTone(f, 0.1, 'sine', 0.14, i * 0.07)); }
function playButtonHover() { if (!isMuted) playTone(650, 0.04, 'sine', 0.06); }
function playWhoosh() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.31);
  } catch (e) {}
}

/* Hover sounds */
document.addEventListener('mouseover', e => {
  if (e.target.closest('.option-btn, .start-btn, .end-btn, .diff-btn, .lifeline-btn')) {
    playButtonHover();
  }
});
