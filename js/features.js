/* ============================================================
   ESCAPE THE VIVA - NEW FEATURES LOGIC
   Loaded after game.js / ui.js / characters.js / audio.js
   Hooks into existing functions rather than rewriting them.
   ============================================================ */

/* ================================================================
   1. XP & LEVEL SYSTEM
   ================================================================ */
const LEVELS = [
  { name: 'Fresher',         min: 0 },
  { name: 'Backlogger',      min: 400 },
  { name: 'Average Student', min: 1200 },
  { name: 'Topper',          min: 2800 },
  { name: 'Campus Legend',   min: 5500 }
];

function getLevelForXP(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  return idx;
}

function getXPProfile() {
  return {
    xp: parseInt(localStorage.getItem('etv_xp') || '0'),
  };
}

function computeXPEarned(s) {
  // Base on score + achievement bonus + streak bonus
  let xp = Math.round(s.score / 8);
  xp += s.achievements.length * 20;
  xp += s.bestStreak * 10;
  return Math.max(10, xp);
}

function awardXP(s) {
  const before = parseInt(localStorage.getItem('etv_xp') || '0');
  const earned = computeXPEarned(s);
  const after = before + earned;
  localStorage.setItem('etv_xp', after);

  const beforeLevel = getLevelForXP(before);
  const afterLevel = getLevelForXP(after);

  return { before, after, earned, leveledUp: afterLevel > beforeLevel, levelName: LEVELS[afterLevel].name };
}

function renderStartProgression() {
  const container = document.getElementById('level-display');
  if (!container) return;
  const xp = getXPProfile().xp;
  const levelIdx = getLevelForXP(xp);
  const level = LEVELS[levelIdx];
  const next = LEVELS[levelIdx + 1];

  document.getElementById('level-badge').textContent = level.name;

  const track = document.getElementById('xp-bar-fill');
  const xpText = document.getElementById('xp-text');
  if (next) {
    const span = next.min - level.min;
    const progress = Math.min(100, Math.max(0, ((xp - level.min) / span) * 100));
    track.style.width = progress + '%';
    xpText.textContent = `${xp} / ${next.min} XP`;
  } else {
    track.style.width = '100%';
    xpText.textContent = `${xp} XP (MAX LEVEL)`;
  }

  renderPersonalBest();
}

function showLevelUpPopup(levelName) {
  const el = document.getElementById('levelup-popup');
  if (!el) return;
  document.getElementById('levelup-name').textContent = levelName;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  playLevelUpSound();
  setTimeout(() => el.classList.remove('show'), 3200);
}

/* ================================================================
   2. PERSONAL BEST PER DIFFICULTY
   ================================================================ */
function getPersonalBest(diff) {
  return parseInt(localStorage.getItem('etv_pb_' + diff) || '0');
}

function maybeUpdatePersonalBest(diff, score) {
  const pb = getPersonalBest(diff);
  if (score > pb) {
    localStorage.setItem('etv_pb_' + diff, score);
    return true;
  }
  return false;
}

function renderPersonalBest() {
  const el = document.getElementById('personal-best-display');
  if (!el) return;
  const diff = (gameState && gameState.difficulty) || 'easy';
  const pb = getPersonalBest(diff);
  const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  el.innerHTML = `Personal Best (${labels[diff] || diff}): <b>${pb} pts</b>`;
}

/* ================================================================
   3. SCREEN CRACK EFFECT (stress >= 90%)
   ================================================================ */
function updateScreenCrack(stress) {
  const overlay = document.getElementById('screen-crack-overlay');
  if (!overlay) return;

  if (stress >= 90) {
    overlay.classList.add('crack-show');
    overlay.classList.remove('crack-stage-1', 'crack-stage-2', 'crack-stage-3', 'crack-critical');
    if (stress >= 99) {
      overlay.classList.add('crack-stage-3', 'crack-critical');
    } else if (stress >= 95) {
      overlay.classList.add('crack-stage-2');
    } else {
      overlay.classList.add('crack-stage-1');
    }
  } else {
    overlay.classList.remove('crack-show', 'crack-stage-1', 'crack-stage-2', 'crack-stage-3', 'crack-critical');
  }
}

/* ================================================================
   4. PROFESSOR RAGE MODE (anger >= 80%)
   ================================================================ */
function updateRageMode(anger) {
  const overlay = document.getElementById('rage-overlay');
  const profWrapper = document.getElementById('prof-svg-wrapper');
  const bolts = document.getElementById('lightning-bolts');
  if (!overlay) return;

  if (anger >= 80) {
    if (!overlay.classList.contains('rage-on')) playRageStinger();
    overlay.classList.add('rage-on');
    if (profWrapper) profWrapper.classList.add('rage-shake');
    if (bolts) bolts.classList.add('show');
  } else {
    overlay.classList.remove('rage-on');
    if (profWrapper) profWrapper.classList.remove('rage-shake');
    if (bolts) bolts.classList.remove('show');
  }
}

/* ================================================================
   5. DYNAMIC BACKGROUND (stress-based color shift)
   ================================================================ */
function updateDynamicBackground(stress) {
  const el = document.getElementById('stress-bg-overlay');
  if (!el) return;
  const t = Math.min(1, Math.max(0, stress / 100));
  // brown (45,18,0) -> red (150,0,0)
  const r = Math.round(45 + (150 - 45) * t);
  const g = Math.round(18 + (0 - 18) * t);
  const b = 0;
  const alpha1 = 0.45 + t * 0.3;
  const alpha2 = 0.12 + t * 0.15;
  el.style.background = `radial-gradient(ellipse at center, rgba(${r},${g},${b},${alpha1}), rgba(${Math.round(r*0.5)},${Math.round(g*0.4)},0,${alpha2}))`;
}

/* ================================================================
   Master visual-effects hook — called every HUD update
   ================================================================ */
function updateVisualEffects(s) {
  updateScreenCrack(s.stress);
  updateRageMode(s.anger);
  updateDynamicBackground(s.stress);
}

/* ================================================================
   6. CHALK THROW ANIMATION (on wrong answer)
   ================================================================ */
function throwChalk() {
  const wrapper = document.getElementById('game-area-wrapper');
  const profWrap = document.querySelector('.prof-character-wrap');
  const questionsPanel = document.querySelector('.questions-panel');
  if (!wrapper || !profWrap || !questionsPanel) return;

  const profRect = profWrap.getBoundingClientRect();
  const wrapRect = wrapper.getBoundingClientRect();
  const qRect = questionsPanel.getBoundingClientRect();

  const startX = profRect.left + profRect.width / 2 - wrapRect.left;
  const startY = profRect.top + profRect.height / 3 - wrapRect.top;
  const targetX = qRect.left + qRect.width / 2 - wrapRect.left;
  const targetY = qRect.top + qRect.height / 3 - wrapRect.top;

  const chalk = document.createElement('div');
  chalk.className = 'chalk-piece';
  chalk.style.left = startX + 'px';
  chalk.style.top = startY + 'px';
  chalk.style.setProperty('--chalk-tx', (targetX - startX) + 'px');
  chalk.style.setProperty('--chalk-ty', (targetY - startY) + 'px');
  wrapper.appendChild(chalk);
  playChalkThrowSound();

  setTimeout(() => {
    chalk.remove();
    // shatter
    const dust = document.createElement('div');
    dust.className = 'chalk-dust';
    dust.style.left = (targetX - 25) + 'px';
    dust.style.top = (targetY - 25) + 'px';
    wrapper.appendChild(dust);
    setTimeout(() => dust.remove(), 550);

    for (let i = 0; i < 8; i++) {
      const shard = document.createElement('div');
      shard.className = 'chalk-shard';
      shard.style.left = targetX + 'px';
      shard.style.top = targetY + 'px';
      const ang = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 35;
      shard.style.setProperty('--sx', Math.cos(ang) * dist + 'px');
      shard.style.setProperty('--sy', Math.sin(ang) * dist + 'px');
      wrapper.appendChild(shard);
      setTimeout(() => shard.remove(), 550);
    }
    playChalkShatterSound();
  }, 550);
}

/* ================================================================
   7. COMBO MULTIPLIER POPUP
   ================================================================ */
function spawnComboPopup(streak) {
  if (streak < 2) return;
  const wrapper = document.getElementById('game-area-wrapper');
  if (!wrapper) return;
  const el = document.createElement('div');
  el.className = 'combo-popup';
  el.textContent = `x${streak} COMBO`;
  wrapper.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add('fly');
  }));
  setTimeout(() => el.remove(), 1050);
}

/* ================================================================
   7b. GOLD CONFETTI BURST (3+ correct streak)
   ================================================================ */
function spawnStreakConfetti() {
  const wrapper = document.getElementById('game-area-wrapper');
  const profWrap = document.querySelector('.prof-character-wrap');
  if (!wrapper || !profWrap) return;
  const wrapRect = wrapper.getBoundingClientRect();
  const profRect = profWrap.getBoundingClientRect();
  const originX = profRect.left + profRect.width / 2 - wrapRect.left;
  const originY = profRect.top - wrapRect.top;
  const emojis = ['🎉', '✨', '🌟', '💛', '🟡', '🎊'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.fontSize = (14 + Math.random() * 12) + 'px';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.setProperty('--tx', ((Math.random() - 0.5) * 220) + 'px');
    p.style.setProperty('--ty', (-70 - Math.random() * 90) + 'px');
    p.style.left = (originX + (Math.random() - 0.5) * 60) + 'px';
    p.style.top = (originY + Math.random() * 40) + 'px';
    p.style.animationDelay = (Math.random() * 0.15) + 's';
    p.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';
    wrapper.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

/* ================================================================
   8. BOSS QUESTION CINEMATIC (Q10 / final question)
   ================================================================ */
function triggerBossCinematic(callback) {
  const overlay = document.getElementById('boss-cinematic');
  if (!overlay) { callback(); return; }
  overlay.classList.add('show');
  playBossHorn();
  flashScreen('rgba(255,0,0,0.35)');
  setTimeout(() => {
    overlay.classList.remove('show');
    callback();
  }, 1900);
}

/* ================================================================
   9. SHARE SCORE AS IMAGE
   ================================================================ */
function generateShareImage() {
  const s = gameState;
  const g = getGrade(s.score);
  const canvas = document.getElementById('share-canvas') || document.createElement('canvas');
  canvas.id = 'share-canvas';
  canvas.width = 640;
  canvas.height = 800;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1a0800');
  grad.addColorStop(1, '#2d1200');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = '#f0b429';
  ctx.font = '900 32px sans-serif';
  ctx.fillText('🎓 ESCAPE THE VIVA', canvas.width / 2, 90);

  // Grade
  ctx.fillStyle = g.color;
  ctx.font = '900 110px sans-serif';
  ctx.fillText(g.grade, canvas.width / 2, 250);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText(`${s.score} pts`, canvas.width / 2, 320);

  // Difficulty
  const diffEmoji = { easy: '😅', medium: '😤', hard: '💀' };
  ctx.fillStyle = '#cccccc';
  ctx.font = '700 22px sans-serif';
  ctx.fillText(`${diffEmoji[s.difficulty] || ''} ${s.difficulty.toUpperCase()} MODE`, canvas.width / 2, 365);

  // Stats box
  ctx.strokeStyle = 'rgba(255,140,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 410, canvas.width - 120, 210);

  const stats = [
    ['Stress', s.stress + '%'],
    ['Anger', s.anger + '%'],
    ['Correct', s.correctCount + '/' + s.totalQ],
    ['Best Streak', s.bestStreak + '🔥']
  ];
  ctx.font = '700 20px sans-serif';
  stats.forEach((row, i) => {
    const y = 460 + i * 42;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#999';
    ctx.fillText(row[0], 90, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f0d090';
    ctx.fillText(String(row[1]), canvas.width - 90, y);
  });

  // Comment
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dddddd';
  ctx.font = 'italic 18px sans-serif';
  wrapCanvasText(ctx, g.comment, canvas.width / 2, 670, canvas.width - 100, 26);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 16px sans-serif';
  ctx.fillText('Can you survive the professor? Play now!', canvas.width / 2, 760);

  return canvas.toDataURL('image/png');
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line, x, curY);
      line = word + ' ';
      curY += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, curY);
}

function shareResultAsImage() {
  playClickSound();
  const dataUrl = generateShareImage();
  const overlay = document.getElementById('share-preview-overlay');
  const img = document.getElementById('share-preview-img');
  if (overlay && img) {
    img.src = dataUrl;
    overlay.classList.add('show');
  }
}

function closeSharePreview() {
  const overlay = document.getElementById('share-preview-overlay');
  if (overlay) overlay.classList.remove('show');
}

function downloadShareImage() {
  const img = document.getElementById('share-preview-img');
  if (!img || !img.src) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'escape-the-viva-result.png';
  a.click();
}

/* ================================================================
   10. EXTRA SOUND EFFECTS
   ================================================================ */
function playChalkThrowSound() {
  playTone(700, 0.05, 'square', 0.12);
  playTone(500, 0.05, 'square', 0.1, 0.05);
}
function playChalkShatterSound() {
  for (let i = 0; i < 5; i++) playTone(1200 + Math.random() * 800, 0.04, 'square', 0.08, i * 0.02);
}
function playPaperSlamSound() {
  playTone(90, 0.08, 'square', 0.22);
  playTone(60, 0.12, 'sawtooth', 0.18, 0.05);
}
function playBellRingSound() {
  playTone(1568, 0.35, 'sine', 0.16);
  playTone(2093, 0.3, 'sine', 0.1, 0.02);
}
function playChalkWriteSound() {
  for (let i = 0; i < 3; i++) playTone(300 + Math.random() * 200, 0.06, 'sawtooth', 0.05, i * 0.09);
}
function playBossHorn() {
  [130, 130, 174, 130].forEach((f, i) => playTone(f, 0.35, 'sawtooth', 0.22, i * 0.32));
}
function playRageStinger() {
  playTone(65, 0.4, 'sawtooth', 0.25);
  playTone(50, 0.5, 'sawtooth', 0.2, 0.08);
}
function playLevelUpSound() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.15, 'sine', 0.16, i * 0.09));
}
function playComboSound(streak) {
  playTone(700 + streak * 60, 0.09, 'square', 0.14);
}

/* ================================================================
   11. EXTRA PROFESSOR EXPRESSIONS (extend the existing set)
   ================================================================ */
const EXTRA_EXPRESSIONS = {
  shocked:     { mouth:'M85 150 Q95 158 105 150', browL:'M58 88 Q73 80 88 88',  browR:'M100 88 Q115 80 130 88', eyeRy:12 },
  impressed:   { mouth:'M83 145 Q95 152 107 145', browL:'M58 93 Q73 86 88 92',  browR:'M100 92 Q115 86 130 93', eyeRy:9 },
  laughing:    { mouth:'M78 143 Q95 160 112 143', browL:'M58 91 Q73 86 88 91',  browR:'M100 91 Q115 86 130 91', eyeRy:3 },
  crying:      { mouth:'M85 149 Q95 145 105 149', browL:'M58 100 Q73 94 88 99', browR:'M100 99 Q115 94 130 100', eyeRy:7 },
  'evil-smile':{ mouth:'M80 147 Q95 156 110 145', browL:'M58 102 Q73 93 88 98', browR:'M100 98 Q115 93 130 102', eyeRy:5 },
  sleeping:    { mouth:'M86 148 Q95 150 104 148', browL:'M58 98 Q73 95 88 98',  browR:'M100 98 Q115 95 130 98', eyeRy:1 }
};
const EXTRA_FX_EMOJI = {
  shocked: '😱', impressed: '👏', laughing: '😂', crying: '😢', 'evil-smile': '😈', sleeping: '💤'
};

// Wrap the original setProfExpression (defined in ui.js) to support the new states.
if (typeof setProfExpression === 'function') {
  const _originalSetProfExpression = setProfExpression;
  setProfExpression = function (state) {
    if (EXTRA_EXPRESSIONS[state]) {
      const wrapper = document.getElementById('prof-svg-wrapper');
      const mouth = document.getElementById('prof-mouth');
      const browL = document.getElementById('prof-brow-l');
      const browR = document.getElementById('prof-brow-r');
      const eyeL = document.getElementById('prof-eye-l');
      const eyeR = document.getElementById('prof-eye-r');
      const angryFx = document.getElementById('prof-angry-fx');
      if (!mouth) return;

      wrapper.className = 'prof-svg-wrapper';
      const s = EXTRA_EXPRESSIONS[state];
      mouth.setAttribute('d', s.mouth);
      browL.setAttribute('d', s.browL);
      browR.setAttribute('d', s.browR);
      eyeL.setAttribute('ry', s.eyeRy);
      eyeR.setAttribute('ry', s.eyeRy);

      angryFx.style.display = 'block';
      angryFx.textContent = EXTRA_FX_EMOJI[state] || '';
      setTimeout(() => { if (angryFx.textContent === EXTRA_FX_EMOJI[state]) angryFx.style.display = 'none'; }, 1400);

      if (state === 'laughing') playHappyChime();
      if (state === 'shocked') playTone(1200, 0.08, 'square', 0.14);
      return;
    }
    _originalSetProfExpression(state);
  };
}

/* Idle "sleeping" expression if the player takes too long to answer */
let idleSleepTimeout = null;
function scheduleIdleSleepCheck(totalTime) {
  clearTimeout(idleSleepTimeout);
  const delay = Math.max(1500, totalTime * 700); // roughly 70% through the timer
  idleSleepTimeout = setTimeout(() => {
    if (!gameState.answered) setProfExpression('sleeping');
  }, delay);
}

/* ================================================================
   HOOK INSTALLATION — wrap existing game.js / ui.js functions
   without editing their bodies directly where possible.
   ================================================================ */
(function installHooks() {

  /* -- Hook updateHUD to also refresh crack / rage / bg -- */
  if (typeof updateHUD === 'function') {
    const _origUpdateHUD = updateHUD;
    window.updateHUD = function (s) {
      _origUpdateHUD(s);
      updateVisualEffects(s);
    };
  }

  /* -- Hook selectAnswer to add chalk throw + combo popup -- */
  if (typeof selectAnswer === 'function') {
    const _origSelectAnswer = selectAnswer;
    window.selectAnswer = function (idx) {
      if (gameState.answered) return;
      const q = questions[gameState.currentQ];
      const willBeCorrect = idx === q.correct;
      const streakBefore = gameState.streak;

      _origSelectAnswer(idx);

      if (willBeCorrect) {
        playBellRingSound();
        const newStreak = streakBefore + 1;
        if (newStreak >= 2) {
          spawnComboPopup(newStreak);
          playComboSound(newStreak);
        }
        if (newStreak >= 3) {
          spawnStreakConfetti();
        }
      } else {
        playPaperSlamSound();
        throwChalk();
      }
    };
  }

  /* -- Hook loadQuestion: boss cinematic on final question + chalk sound + idle sleep -- */
  if (typeof loadQuestion === 'function') {
    const _origLoadQuestion = loadQuestion;
    window.loadQuestion = function () {
      _origLoadQuestion();
      playChalkWriteSound();
      const cfg = diffConfig[gameState.difficulty];
      scheduleIdleSleepCheck(cfg.time);
    };
  }

  /* -- Hook advanceQuestion: trigger boss cinematic before final question -- */
  if (typeof advanceQuestion === 'function') {
    window.advanceQuestion = function () {
      gameState.currentQ++;
      if (gameState.currentQ >= gameState.totalQ || gameState.stress >= 100) {
        showEndScreen();
      } else if (gameState.currentQ === gameState.totalQ - 1) {
        triggerBossCinematic(() => loadQuestion());
      } else {
        loadQuestion();
      }
    };
  }

/* ================================================================
   Reset helper — clears crack/rage/lightning so they never persist
   onto the end screen or start screen after a game finishes.
   ================================================================ */
function resetVisualEffects() {
  const overlay = document.getElementById('screen-crack-overlay');
  if (overlay) overlay.classList.remove('crack-show', 'crack-stage-1', 'crack-stage-2', 'crack-stage-3', 'crack-critical');
  const rage = document.getElementById('rage-overlay');
  if (rage) rage.classList.remove('rage-on');
  const profWrapper = document.getElementById('prof-svg-wrapper');
  if (profWrapper) profWrapper.classList.remove('rage-shake');
  const bolts = document.getElementById('lightning-bolts');
  if (bolts) bolts.classList.remove('show');
  const bgOverlay = document.getElementById('stress-bg-overlay');
  if (bgOverlay) bgOverlay.style.background = '';
}

  /* -- Hook startGame: reset visual effects + refresh personal best -- */
  if (typeof startGame === 'function') {
    const _origStartGame = startGame;
    window.startGame = function () {
      _origStartGame();
      resetVisualEffects();
    };
  }

  /* -- Hook setDifficulty: refresh personal best shown on start screen -- */
  if (typeof setDifficulty === 'function') {
    const _origSetDifficulty = setDifficulty;
    window.setDifficulty = function (diff) {
      _origSetDifficulty(diff);
      renderPersonalBest();
    };
  }

  /* -- Hook showEndScreen: award XP, personal best, level-up popup -- */
  if (typeof showEndScreen === 'function') {
    const _origShowEndScreen = showEndScreen;
    window.showEndScreen = function () {
      _origShowEndScreen();
      resetVisualEffects();
      const s = gameState;
      const isNewPB = maybeUpdatePersonalBest(s.difficulty, s.score);
      const xpResult = awardXP(s);

      // Inject XP earned line into stats panel if not already present
      let xpRow = document.getElementById('xp-earned-row');
      const statsPanel = document.querySelector('.stats-panel');
      if (statsPanel) {
        if (!xpRow) {
          xpRow = document.createElement('div');
          xpRow.id = 'xp-earned-row';
          xpRow.className = 'stat-score-row';
          statsPanel.appendChild(xpRow);
        }
        xpRow.innerHTML = `<span>⭐ XP Earned</span><span>+${xpResult.earned} XP</span>`;
      }

      let pbRow = document.getElementById('pb-row');
      if (statsPanel && isNewPB) {
        if (!pbRow) {
          pbRow = document.createElement('div');
          pbRow.id = 'pb-row';
          pbRow.className = 'stat-score-row highlight';
          statsPanel.appendChild(pbRow);
        }
        pbRow.innerHTML = `<span>🥇 New ${s.difficulty} Best!</span><span>${s.score} pts</span>`;
      } else if (pbRow) {
        pbRow.remove();
      }

      if (xpResult.leveledUp) {
        setTimeout(() => showLevelUpPopup(xpResult.levelName), 700);
      }
    };
  }

  /* -- Hook restartGame: refresh progression display -- */
  if (typeof restartGame === 'function') {
    const _origRestartGame = restartGame;
    window.restartGame = function () {
      _origRestartGame();
      resetVisualEffects();
      renderStartProgression();
      const xpRow = document.getElementById('xp-earned-row');
      if (xpRow) xpRow.remove();
      const pbRow = document.getElementById('pb-row');
      if (pbRow) pbRow.remove();
    };
  }
})();

/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('load', () => {
  renderStartProgression();
});
