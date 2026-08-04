/* ============================================================
   ESCAPE THE VIVA - UI, Animations & Effects
   ============================================================ */

/* ---------- Screen Effects ---------- */
function flashScreen(color) {
  const flash = document.getElementById('screen-flash');
  flash.style.background = color || 'rgba(255,0,0,0.18)';
  flash.style.display = 'block';
  setTimeout(() => flash.style.display = 'none', 220);
}

function shakeScreen() {
  const gc = document.getElementById('game-container');
  gc.classList.add('screen-shake');
  setTimeout(() => gc.classList.remove('screen-shake'), 420);
}

/* ---------- Speech Bubble ---------- */
function setSpeechText(text) {
  const bubble = document.getElementById('speech-bubble');
  const span = document.getElementById('speech-text');
  span.textContent = text;
  bubble.style.animation = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bubble.style.animation = 'bubbleAppear 0.35s cubic-bezier(0.34,1.56,0.64,1)';
  }));
}

/* ---------- Professor Expressions ---------- */
function setProfExpression(state) {
  const wrapper = document.getElementById('prof-svg-wrapper');
  const mouth = document.getElementById('prof-mouth');
  const browL = document.getElementById('prof-brow-l');
  const browR = document.getElementById('prof-brow-r');
  const angryFx = document.getElementById('prof-angry-fx');
  const eyeL = document.getElementById('prof-eye-l');
  const eyeR = document.getElementById('prof-eye-r');

  if (!mouth) return;

  wrapper.className = 'prof-svg-wrapper';
  angryFx.style.display = 'none';

  const states = {
    neutral: { mouth:'M82 146 Q95 149 108 146', browL:'M58 97 Q73 92 88 97', browR:'M100 97 Q115 92 130 97', eyeRy:8 },
    happy:   { mouth:'M80 144 Q95 157 110 144', browL:'M58 92 Q73 87 88 92', browR:'M100 92 Q115 87 130 92', eyeRy:10 },
    angry:   { mouth:'M82 149 Q95 145 108 149', browL:'M58 103 Q73 96 88 101', browR:'M100 101 Q115 96 130 103', eyeRy:5 },
    'very-angry': { mouth:'M82 151 Q95 144 108 151', browL:'M58 106 Q73 97 88 103', browR:'M100 103 Q115 97 130 106', eyeRy:4 },
    surprised: { mouth:'M88 149 Q95 155 102 149', browL:'M58 90 Q73 83 88 90', browR:'M100 90 Q115 83 130 90', eyeRy:11 }
  };

  const s = states[state] || states.neutral;
  mouth.setAttribute('d', s.mouth);
  browL.setAttribute('d', s.browL);
  browR.setAttribute('d', s.browR);
  eyeL.setAttribute('ry', s.eyeRy);
  eyeR.setAttribute('ry', s.eyeRy);

  if (state === 'angry') {
    wrapper.classList.add('angry');
    angryFx.style.display = 'block';
    angryFx.textContent = '💢';
    playAngrySound();
  } else if (state === 'very-angry') {
    wrapper.classList.add('very-angry');
    angryFx.style.display = 'block';
    angryFx.textContent = '💢🔥';
    flashScreen('rgba(255,0,0,0.22)');
    shakeScreen();
    playAngrySound();
    setTimeout(() => playAngrySound(), 180);
  } else if (state === 'happy') {
    wrapper.classList.add('happy');
    playHappyChime();
  }
}

/* ---------- HUD Updates ---------- */
function updateHUD(gameState) {
  document.getElementById('stress-bar').style.width = gameState.stress + '%';
  document.getElementById('stress-pct').textContent = gameState.stress + '%';
  document.getElementById('anger-bar').style.width = gameState.anger + '%';
  document.getElementById('anger-pct').textContent = gameState.anger + '%';
  document.getElementById('q-counter').textContent = `Q${gameState.currentQ + 1}/${gameState.totalQ}`;
  document.getElementById('hud-score').textContent = gameState.score + ' pts';

  const streakEl = document.getElementById('streak-display');
  streakEl.textContent = gameState.streak >= 2 ? `🔥 ${gameState.streak} STREAK` : '';

  // Stress bar color warning
  const stressBar = document.getElementById('stress-bar');
  if (gameState.stress >= 80) {
    stressBar.style.background = 'linear-gradient(90deg, #c0392b, #ff0000)';
    stressBar.style.boxShadow = '0 0 10px rgba(255,0,0,0.6)';
  } else {
    stressBar.style.background = '';
    stressBar.style.boxShadow = '';
  }
}

/* ---------- Stress Change Popup ---------- */
function showStressChange(amount, isIncrease) {
  const el = document.getElementById('stress-change');
  el.style.color = isIncrease ? '#ff4c4c' : '#2ecc71';
  el.style.borderColor = isIncrease ? '#ff4c4c' : '#2ecc71';
  el.innerHTML = `STRESS ${isIncrease ? '+' : '-'}${Math.abs(amount)}<br>
    <span style="font-size:clamp(13px,2.5vw,18px)">${isIncrease ? '😰😫' : '😊👍'}</span>`;
  el.style.display = 'block';
  el.style.animation = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.animation = 'stressPopup 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  }));
  setTimeout(() => el.style.display = 'none', 2000);
}

/* ---------- Streak Popup ---------- */
function showStreakPopup(streak) {
  const el = document.getElementById('streak-popup');
  const msgs = {
    3: '🔥 ON FIRE! x3',
    4: '⚡ LIGHTNING! x4',
    5: '🌟 UNSTOPPABLE! x5',
    6: '🏆 LEGENDARY! x6',
    7: '👑 GODLIKE! x7'
  };
  el.textContent = msgs[streak] || `🔥 STREAK x${streak}!`;
  el.className = 'streak-popup show';
  playStreakSound();
  setTimeout(() => {
    el.className = 'streak-popup';
    el.style.display = 'none';
  }, 1900);
}

/* ---------- Achievement Popup ---------- */
function showAchievementPopup(text) {
  const el = document.getElementById('achievement-popup');
  el.textContent = '🏅 ' + text;
  el.className = 'achievement-popup show';
  playAchievementSound();
  setTimeout(() => {
    el.className = 'achievement-popup';
    el.style.display = 'none';
  }, 2800);
}

/* ---------- Particles ---------- */
function spawnParticles(isCorrect) {
  const emojis = isCorrect
    ? ['✨', '⭐', '🌟', '💫', '🎉']
    : ['💥', '😤', '❌', '💔', '😱'];
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.fontSize = (13 + Math.random() * 10) + 'px';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.setProperty('--tx', ((Math.random() - 0.5) * 130) + 'px');
    p.style.setProperty('--ty', (-55 - Math.random() * 65) + 'px');
    p.style.left = (150 + Math.random() * 500) + 'px';
    p.style.top = (100 + Math.random() * 180) + 'px';
    p.style.animationDelay = (Math.random() * 0.2) + 's';
    p.style.animationDuration = (0.8 + Math.random() * 0.4) + 's';
    document.getElementById('game-area-wrapper').appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

/* ---------- Confetti ---------- */
function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9c74f','#90be6d','#f8961e','#b5179e','#4cc9f0','#06d6a0'];
  const shapes = ['50%', '2px', '0'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 5 + Math.random() * 10;
    p.style.cssText = `
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      width:${size}px; height:${size * (0.5 + Math.random())}px;
      border-radius:${shapes[Math.floor(Math.random() * shapes.length)]};
      animation-duration:${2 + Math.random() * 2.5}s;
      animation-delay:${Math.random() * 1}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 5500);
  }
}

/* ---------- Background Particles (Start Screen) ---------- */
function initBgParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
  const colors = ['#e63030', '#f0b429', '#2980b9', '#8e44ad', '#e67e22'];
  const interval = setInterval(() => {
    if (!document.getElementById('start-screen').classList.contains('active')) return;
    const p = document.createElement('div');
    p.className = 'bg-particle';
    const size = 4 + Math.random() * 10;
    p.style.cssText = `
      left:${Math.random() * 100}%;
      bottom:-20px;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${10 + Math.random() * 14}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 26000);
  }, 500);
}

/* ---------- Options Animation Reset ---------- */
function resetOptionAnimations() {
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.style.animation = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      btn.style.animation = `optSlideIn 0.3s ease ${0.04 + i * 0.055}s both`;
    }));
  });
}

/* ---------- Hint Box ---------- */
function showHintBox(text) {
  const box = document.getElementById('hint-box');
  box.textContent = '💡 Hint: ' + text;
  box.style.display = 'block';
  box.style.animation = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.style.animation = 'hintAppear 0.3s ease';
  }));
}

function hideHintBox() {
  document.getElementById('hint-box').style.display = 'none';
}

/* ---------- High Score Display ---------- */
function updateHighScoreDisplay() {
  const hs = localStorage.getItem('etv_highscore');
  const el = document.getElementById('high-score-display');
  if (hs && el) el.textContent = `🏆 Best Score: ${hs} pts`;
}
