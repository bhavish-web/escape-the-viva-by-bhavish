/* ============================================================
   ESCAPE THE VIVA - Core Game Logic
   ============================================================ */

/* ---------- Game State ---------- */
let questions = [];
let gameState = {
  currentQ: 0, stress: 20, anger: 10,
  score: 0, correctCount: 0, answered: false,
  totalQ: 10, streak: 0, bestStreak: 0,
  timeLeft: 10, difficulty: 'medium', mode: 'viva',
  lifelineUsed5050: false, lifelineUsedHint: false, lifelineUsedAsk: false,
  achievements: [], subject: null, advancing: false
};

let timerInterval = null;

/* ---------- Difficulty Config ---------- */
const diffConfig = {
  easy:     { time: 15, stressUp: 15, angerUp: 10, stressDown: 18, label: 'EASY',     class: 'easy' },
  medium:   { time: 10, stressUp: 20, angerUp: 15, stressDown: 15, label: 'MEDIUM',   class: 'medium' },
  hard:     { time:  7, stressUp: 28, angerUp: 20, stressDown: 12, label: 'HARD',     class: 'hard' },
  adaptive: { time: 10, stressUp: 20, angerUp: 15, stressDown: 15, label: 'ADAPTIVE', class: 'medium' }
};

/* ---------- Achievements ---------- */
const achievements = [
  { id: 'first_blood',   label: '🩸 First Blood',      check: (s) => s.correctCount === 1 },
  { id: 'on_fire',       label: '🔥 On Fire',           check: (s) => s.streak === 3 },
  { id: 'perfectionist', label: '💯 Perfectionist',     check: (s) => s.correctCount === 10 && s.stress < 30 },
  { id: 'survivor',      label: '💪 Survivor',          check: (s) => s.stress >= 90 && s.currentQ >= 5 },
  { id: 'speedster',     label: '⚡ Speedster',         check: (s, timeLeft) => timeLeft >= 8 },
  { id: 'cool_head',     label: '😎 Cool Head',         check: (s) => s.anger <= 15 && s.currentQ >= 5 },
  { id: 'comeback_kid',  label: '🔄 Comeback Kid',      check: (s) => s.stress >= 80 && s.streak >= 2 },
];

function checkAchievements(timeLeft) {
  achievements.forEach(a => {
    if (!gameState.achievements.includes(a.id) && a.check(gameState, timeLeft)) {
      gameState.achievements.push(a.id);
      showAchievementPopup(a.label);
    }
  });
}

/* ---------- Difficulty ---------- */
function setDifficulty(diff) {
  gameState.difficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-diff="${diff}"]`).classList.add('active');
  playClickSound();
}

/* ---------- Timer ---------- */
function startTimer() {
  clearInterval(timerInterval);
  const cfg = diffConfig[gameState.difficulty];
  gameState.timeLeft = cfg.time;

  const timerBar = document.getElementById('timer-bar');
  const timerNum = document.getElementById('timer-num');
  const timerDisp = document.getElementById('timer-display');

  // Practice mode: no timer, no time pressure. Just park the display and bail.
  if (gameState.mode === 'practice') {
    if (timerDisp) timerDisp.classList.add('practice-hidden');
    if (timerNum) timerNum.textContent = '∞';
    return;
  }
  if (timerDisp) timerDisp.classList.remove('practice-hidden');

  timerBar.style.transition = 'none';
  timerBar.style.width = '100%';
  timerBar.style.background = 'linear-gradient(90deg, #e63030, #ff9900, #ffee00)';
  timerNum.textContent = gameState.timeLeft;
  timerDisp.classList.remove('urgent');

  setTimeout(() => {
    timerBar.style.transition = `width ${gameState.timeLeft}s linear`;
    timerBar.style.width = '0%';
  }, 60);

  timerInterval = setInterval(() => {
    if (gameState.answered) return;
    gameState.timeLeft--;
    timerNum.textContent = gameState.timeLeft;

    if (gameState.timeLeft <= 3) {
      timerDisp.classList.add('urgent');
      timerBar.style.background = '#e63030';
      playUrgentTick();
    } else if (gameState.timeLeft <= Math.floor(cfg.time / 2)) {
      playTimerWarning();
    }

    if (gameState.timeLeft <= 0) {
      clearInterval(timerInterval);
      timeUp();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer-display').classList.remove('urgent');
}

function timeUp() {
  if (gameState.answered || gameState.mode === 'practice') return;
  gameState.answered = true;

  const q = questions[gameState.currentQ];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(b => b.disabled = true);
  btns[q.correct].classList.add('correct');

  gameState.streak = 0;
  const cfg = diffConfig[gameState.difficulty];
  gameState.stress = Math.min(100, gameState.stress + cfg.stressUp + 5);
  gameState.anger = Math.min(100, gameState.anger + cfg.angerUp + 5);

  setProfExpression('very-angry');
  setSpeechText('⏰ TIME IS UP! Useless student! 😡');
  showStressChange(cfg.stressUp + 5, true);
  spawnParticles(false);
  updateHUD(gameState);
  playWrongSound();
  flashScreen('rgba(255,0,0,0.28)');
  showExplanation(q, false);

  revealAnswer();   // show correct answer + Skip/Next (enhancements.js)
}

/* ---------- Load Question ---------- */
function loadQuestion() {
  const q = questions[gameState.currentQ];
  gameState.answered = false;
  gameState.advancing = false;

  // hide the reveal Next/Skip button for the fresh question
  const _nb = document.getElementById('next-btn');
  if (_nb) { _nb.style.display = 'none'; _nb.classList.remove('show'); }

  hideHintBox();
  hideExplanation();

  // Update badges
  document.getElementById('topic-badge').textContent = q.topic;
  const diffBadge = document.getElementById('diff-badge');
  const cfg = diffConfig[gameState.difficulty];
  diffBadge.textContent = cfg.label;
  diffBadge.className = `diff-badge ${cfg.class}`;

  const modeBadge = document.getElementById('rd-mode');
  if (modeBadge) {
    modeBadge.textContent = gameState.mode === 'practice' ? '📘 Practice' : '😈 Viva';
    modeBadge.classList.toggle('practice', gameState.mode === 'practice');
  }

  // Speech bubble
  setSpeechText(q.professorAsk);

  // Question
  document.getElementById('question-text').textContent = q.question;

  // Options
  const btns = document.querySelectorAll('.option-btn');
  const letters = ['A','B','C','D'];
  const classes = ['opt-a','opt-b','opt-c','opt-d'];
  btns.forEach((btn, i) => {
    btn.className = `option-btn ${classes[i]}`;
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    btn.querySelector('.opt-text').textContent = q.options[i];
    btn.querySelector('.option-letter').textContent = letters[i];
    btn.querySelector('.opt-tick').style.display = 'none';
    btn.classList.remove('eliminated');
  });

  // Reset lifeline UI
  if (!gameState.lifelineUsed5050) {
    document.getElementById('btn-5050').disabled = false;
    document.getElementById('btn-5050').classList.remove('used');
  }
  if (!gameState.lifelineUsedHint) {
    document.getElementById('btn-hint').disabled = false;
    document.getElementById('btn-hint').classList.remove('used');
  }
  if (!gameState.lifelineUsedAsk) {
    const askBtn = document.getElementById('btn-ask');
    if (askBtn) { askBtn.disabled = false; askBtn.classList.remove('used'); }
  }

  resetOptionAnimations();
  setProfExpression('neutral');
  updateHUD(gameState);
  startTimer();
}

/* ---------- Select Answer ---------- */
function selectAnswer(idx) {
  if (gameState.answered) return;
  gameState.answered = true;
  stopTimer();

  const q = questions[gameState.currentQ];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(b => b.disabled = true);

  const isCorrect = idx === q.correct;
  btns[idx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    btns[q.correct].classList.add('correct');
    btns[q.correct].querySelector('.opt-tick').style.display = 'inline';
  }

  const cfg = diffConfig[gameState.difficulty];

  const practice = gameState.mode === 'practice';

  if (isCorrect) {
    playCorrectSound();
    setProfExpression('happy');

    const timeBonus = practice ? 0 : gameState.timeLeft * 6;
    const streakBonus = gameState.streak * 12;
    const points = 100 + timeBonus + streakBonus;
    gameState.score += points;
    gameState.correctCount++;
    gameState.streak++;
    if (gameState.streak > gameState.bestStreak) gameState.bestStreak = gameState.streak;

    gameState.stress = Math.max(0, gameState.stress - cfg.stressDown);
    gameState.anger = Math.max(0, gameState.anger - cfg.stressDown);

    showStressChange(cfg.stressDown, false);
    spawnParticles(true);
    flashScreen('rgba(0,200,80,0.1)');

    if (gameState.streak >= 3) showStreakPopup(gameState.streak);

    setTimeout(() => setSpeechText(q.correctReaction), 350);
    checkAchievements(gameState.timeLeft);
    showExplanation(q, true);

  } else {
    playWrongSound();
    gameState.streak = 0;

    if (practice) {
      // Practice mode: professor stays a mentor, not a monster. Dampened penalties.
      setProfExpression('surprised');
      const stressInc = Math.round((cfg.stressUp + Math.floor(gameState.anger / 9)) * 0.3);
      gameState.stress = Math.min(60, gameState.stress + stressInc);
      gameState.anger = Math.min(30, gameState.anger + Math.round(cfg.angerUp * 0.3));
      showStressChange(stressInc, true);
    } else {
      const angerState = gameState.anger > 65 ? 'very-angry' : 'angry';
      setProfExpression(angerState);

      const stressInc = cfg.stressUp + Math.floor(gameState.anger / 9);
      gameState.stress = Math.min(100, gameState.stress + stressInc);
      gameState.anger = Math.min(100, gameState.anger + cfg.angerUp);

      showStressChange(stressInc, true);
      spawnParticles(false);
      flashScreen('rgba(255,0,0,0.18)');
    }

    setTimeout(() => setSpeechText(q.wrongReaction), 350);
    setTimeout(() => setSpeechText(q.wrongComment), 2200);
    showExplanation(q, false);
  }

  updateHUD(gameState);
  revealAnswer();   // show correct answer + Skip/Next (enhancements.js)
}

function advanceQuestion() {
  gameState.currentQ++;
  if (gameState.currentQ >= gameState.totalQ || gameState.stress >= 100) {
    showEndScreen();
  } else {
    loadQuestion();
  }
}

/* ---------- Lifelines ---------- */
function useFiftyFifty() {
  if (gameState.lifelineUsed5050 || gameState.answered) return;
  gameState.lifelineUsed5050 = true;

  const q = questions[gameState.currentQ];
  const btns = document.querySelectorAll('.option-btn');
  let eliminated = 0;

  // Eliminate 2 wrong answers randomly
  const wrongIndices = [];
  btns.forEach((_, i) => { if (i !== q.correct) wrongIndices.push(i); });
  wrongIndices.sort(() => Math.random() - 0.5);

  wrongIndices.slice(0, 2).forEach(i => {
    btns[i].classList.add('eliminated');
    btns[i].disabled = true;
    eliminated++;
  });

  document.getElementById('btn-5050').disabled = true;
  document.getElementById('btn-5050').classList.add('used');
  playLifelineSound();
  playWhoosh();
}

function useHint() {
  if (gameState.lifelineUsedHint || gameState.answered) return;
  gameState.lifelineUsedHint = true;

  const q = questions[gameState.currentQ];
  showHintBox(q.hint || 'Think carefully about the fundamental concept!');

  document.getElementById('btn-hint').disabled = true;
  document.getElementById('btn-hint').classList.add('used');
  playLifelineSound();
}

/* ---------- Lifeline: Ask The Professor ---------- */
function useAskProfessor() {
  if (gameState.lifelineUsedAsk || gameState.answered) return;
  const modal = document.getElementById('ask-prof-modal');
  if (!modal) return;

  // "More time" only makes sense when a timer is actually running (Viva mode)
  const timeOpt = document.getElementById('ask-opt-time');
  if (timeOpt) timeOpt.style.display = (gameState.mode === 'practice') ? 'none' : '';

  modal.classList.add('open');
  playLifelineSound();
}

function closeAskProfessor() {
  const modal = document.getElementById('ask-prof-modal');
  if (modal) modal.classList.remove('open');
}

function resolveAskProfessor(choice) {
  if (gameState.lifelineUsedAsk || gameState.answered) { closeAskProfessor(); return; }
  gameState.lifelineUsedAsk = true;

  if (choice === 'calm') {
    gameState.stress = Math.max(0, gameState.stress - 30);
    gameState.anger = Math.max(0, gameState.anger - 25);
    setProfExpression(gameState.anger > 65 ? 'angry' : 'neutral');
    setSpeechText("🎓 Fine... take a breath. Don't waste my time again!");
    showStressChange(30, false);
  } else if (choice === 'time') {
    const cfg = diffConfig[gameState.difficulty];
    const bonus = Math.max(3, Math.round(cfg.time * 0.5));
    gameState.timeLeft += bonus;

    const timerNum = document.getElementById('timer-num');
    const timerBar = document.getElementById('timer-bar');
    if (timerNum) timerNum.textContent = gameState.timeLeft;
    if (timerBar) {
      const pct = Math.max(0, Math.min(100, (gameState.timeLeft / cfg.time) * 100));
      timerBar.style.transition = 'none';
      timerBar.style.width = pct + '%';
      setTimeout(() => {
        timerBar.style.transition = `width ${gameState.timeLeft}s linear`;
        timerBar.style.width = '0%';
      }, 60);
    }
    setSpeechText(`🎓 ${bonus} extra seconds. Use them wisely!`);
  }

  updateHUD(gameState);
  const btn = document.getElementById('btn-ask');
  if (btn) { btn.disabled = true; btn.classList.add('used'); }
  const cnt = document.getElementById('ask-count');
  if (cnt) cnt.textContent = 'x0';
  closeAskProfessor();
}

/* ---------- Answer Explanations ---------- */
function showExplanation(q, isCorrect) {
  const box = document.getElementById('explain-box');
  if (!box || !q) return;
  box.className = 'explain-box show ' + (isCorrect ? 'ok' : 'bad');
  box.innerHTML = isCorrect
    ? `✅ <b>Why:</b> ${q.hint || 'You nailed the core concept.'}`
    : `📘 <b>Explanation:</b> ${q.wrongComment || q.hint || 'Review this topic before the real viva.'}`;
  box.style.display = 'block';
}

function hideExplanation() {
  const box = document.getElementById('explain-box');
  if (box) box.style.display = 'none';
}

/* ---------- Practice vs Viva ---------- */
function setMode(mode) {
  gameState.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
  if (btn) btn.classList.add('active');
  playClickSound();
}

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', e => {
  // Ignore game hotkeys while typing in a field (login, signup, etc.)
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  // Only respond to game hotkeys while the game screen is active
  const gameActive = document.getElementById('game-screen') &&
                     document.getElementById('game-screen').classList.contains('active');
  if (!gameActive) return;

  const map = { a:0, b:1, c:2, d:3, A:0, B:1, C:2, D:3, '1':0, '2':1, '3':2, '4':3 };
  if (map[e.key] !== undefined) {
    selectAnswer(map[e.key]);
  }
  // H for hint, F for 50-50, G to ask the professor
  if (e.key === 'h' || e.key === 'H') useHint();
  if (e.key === 'f' || e.key === 'F') useFiftyFifty();
  if (e.key === 'g' || e.key === 'G') useAskProfessor();
});

/* ---------- Start Game ---------- */
function startGame() {
  playStartSound();
  playWhoosh();

  // Pool by SELECTED SUBJECT + importance tier (easy=full, medium>=2, hard>=3)
  const _subj = (typeof getSubject === 'function') ? getSubject(gameState.subject) : null;
  const _topics = _subj ? _subj.topics : SUBJECTS.flatMap(s => s.topics);
  let pool = getSubjectPool(_topics, gameState.difficulty);

  // Use AI-generated questions if available, otherwise use default bank
if (window.AI_QUESTIONS && window.AI_QUESTIONS.length > 0) {
  questions = shuffleAndPick(window.AI_QUESTIONS, Math.min(10, window.AI_QUESTIONS.length));
  window.AI_QUESTIONS = null; // clear after use
} else {
  questions = shuffleAndPick(pool, 10);
}

  gameState = {
    currentQ: 0, stress: 20, anger: 10,
    score: 0, correctCount: 0, answered: false,
    totalQ: 10, streak: 0, bestStreak: 0,
    timeLeft: diffConfig[gameState.difficulty].time,
    difficulty: gameState.difficulty, mode: gameState.mode,
    lifelineUsed5050: false, lifelineUsedHint: false, lifelineUsedAsk: false,
    achievements: [], subject: gameState.subject, advancing: false
  };

  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  loadQuestion();
}

/* ---------- Grade System ---------- */
const grades = [
  { min:900, grade:'S+', color:'#ffd700', comment:'"Not all heroes wear capes. Some ace the viva." 👑' },
  { min:750, grade:'A+', color:'#2ecc71', comment:'"You actually studied. I am genuinely shocked." 🎓' },
  { min:600, grade:'A',  color:'#3498db', comment:'"Decent performance. I expected far worse." 📚' },
  { min:450, grade:'B',  color:'#9b59b6', comment:'"Barely acceptable. Like your attendance record." 😐' },
  { min:300, grade:'C',  color:'#e67e22', comment:'"You passed. Technically. Barely. Somehow." 😒' },
  { min:0,   grade:'F',  color:'#e74c3c', comment:'"See you next semester. And the one after that too." 💀' }
];

function getGrade(score) {
  return grades.find(g => score >= g.min) || grades[grades.length - 1];
}

/* ---------- End Screen ---------- */
function showEndScreen() {
  stopTimer();
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('end-screen').classList.add('active');

  const s = gameState;
  const endTitle = document.getElementById('end-title');
  const endChars = document.getElementById('end-characters');
  const endSpeech = document.getElementById('end-speech');
  const endGrade = document.getElementById('end-grade');
  const gradeInfo = getGrade(s.score);

  // Stats (shared by both modes)
  document.getElementById('stat-stress').textContent = s.stress + '%';
  document.getElementById('stat-anger').textContent = s.anger + '%';
  document.getElementById('stat-questions').textContent = s.correctCount + '/' + s.totalQ;
  document.getElementById('stat-streak').textContent = s.bestStreak + ' 🔥';
  document.getElementById('stat-score').textContent = s.score + ' pts';

  // Achievements panel (shared by both modes)
  if (s.achievements.length > 0) {
    const panel = document.getElementById('achievements-panel');
    const list = document.getElementById('achievements-list');
    panel.style.display = 'block';
    list.innerHTML = s.achievements.map(id => {
      const a = achievements.find(x => x.id === id);
      return a ? `<span class="achievement-badge">${a.label}</span>` : '';
    }).join('');
  }

  endGrade.style.color = gradeInfo.color;

  // Practice mode: a calm recap, no fail/legend drama, no high-score save.
  if (s.mode === 'practice') {
    endTitle.textContent = '📘 PRACTICE COMPLETE';
    endTitle.style.color = '#3498db';
    endTitle.style.fontSize = '';
    endGrade.textContent = `${s.correctCount}/${s.totalQ} correct — ${gradeInfo.comment}`;
    endChars.innerHTML = getEscapedStudentSVG();
    endSpeech.style.display = 'none';
    playEscapeSound();
    return;
  }

  // Determine ending
  let ending;
  if (s.stress >= 100) ending = 'failed';
  else if (s.correctCount >= 9) ending = 'legendary';
  else if (s.anger <= 20 && s.correctCount >= 5) ending = 'adopted';
  else ending = 'escaped';

  // High score (Viva only)
  const prevHS = parseInt(localStorage.getItem('etv_highscore') || '0');
  if (s.score > prevHS) {
    localStorage.setItem('etv_highscore', s.score);
    const hsRow = document.getElementById('high-score-row');
    hsRow.style.display = 'flex';
    document.getElementById('stat-highscore').textContent = s.score + ' pts';
    updateHighScoreDisplay();
  }

  if (ending === 'failed') {
    endTitle.textContent = 'YOU FAILED!';
    endTitle.style.color = '#e74c3c';
    endGrade.textContent = `Grade: F — ${gradeInfo.comment}`;
    playFailSound();
    endChars.innerHTML = getFailedStudentSVG();
    endSpeech.style.display = 'none';
    flashScreen('rgba(255,0,0,0.45)');
    shakeScreen();
  } else if (ending === 'adopted') {
    endTitle.textContent = 'PROFESSOR ADOPTED YOU!';
    endTitle.style.color = '#f0b429';
    endTitle.style.fontSize = 'clamp(20px,5vw,32px)';
    endGrade.textContent = `Grade: ${gradeInfo.grade} — ${gradeInfo.comment}`;
    playAdoptedSound();
    endChars.innerHTML = getProfAndStudentSVG();
    endSpeech.style.display = 'block';
    endSpeech.textContent = 'Finally someone entertaining in this college! 😂';
    spawnConfetti();
  } else if (ending === 'legendary') {
    endTitle.textContent = 'CAMPUS LEGEND! 🏆';
    endTitle.style.color = '#ffd700';
    endGrade.textContent = `Grade: ${gradeInfo.grade} — ${gradeInfo.comment}`;
    playEscapeSound();
    endChars.innerHTML = getLegendarySVG();
    endSpeech.style.display = 'none';
    spawnConfetti();
  } else {
    endTitle.textContent = 'YOU ESCAPED! 🎉';
    endTitle.style.color = '#2ecc71';
    endGrade.textContent = `Grade: ${gradeInfo.grade} — ${gradeInfo.comment}`;
    playEscapeSound();
    endChars.innerHTML = getEscapedStudentSVG();
    endSpeech.style.display = 'none';
    spawnConfetti();
  }
}

/* ---------- Share ---------- */
function shareResult() {
  playClickSound();
  const s = gameState;
  const g = getGrade(s.score);
  const diffEmoji = { easy:'😅', medium:'😤', hard:'💀' };
  const text = `🎓 Escape The Viva!\n` +
    `Difficulty: ${diffEmoji[s.difficulty]} ${s.difficulty.toUpperCase()}\n` +
    `Grade: ${g.grade} | Score: ${s.score} pts\n` +
    `Stress: ${s.stress}% | Correct: ${s.correctCount}/${s.totalQ} | Streak: ${s.bestStreak}🔥\n` +
    `${g.comment}\n\nCan you survive the professor? 😤`;

  if (navigator.share) {
    navigator.share({ title: 'Escape The Viva', text });
  } else {
    navigator.clipboard.writeText(text)
      .then(() => alert('Result copied to clipboard! Share it! 📋'))
      .catch(() => prompt('Copy your result:', text));
  }
}

/* ---------- Restart ---------- */
function restartGame() {
  playClickSound();
  playWhoosh();
  stopTimer();
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('confetti-container').innerHTML = '';
  document.getElementById('achievements-panel').style.display = 'none';
  document.getElementById('high-score-row').style.display = 'none';
  document.getElementById('end-title').style.fontSize = '';
  document.getElementById('start-screen').classList.add('active');
}

/* ---------- Init ---------- */
window.addEventListener('load', () => {
  renderStartStudent();
  renderProfessor();
  initBgParticles();
  updateHighScoreDisplay();
});
