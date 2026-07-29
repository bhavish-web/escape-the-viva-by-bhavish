/* ============================================================
   ESCAPE THE VIVA - Flow Enhancements  (loads AFTER game.js)
   Adds: subject-first flow, answer reveal + Skip/Next,
         View Notes viewer, richer results.
   Existing game logic is preserved; we only wrap/extend it.
   ============================================================ */

/* ---------- tiny screen helper ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ============================================================
   1. SUBJECT-FIRST FLOW
   ============================================================ */
function renderSubjects() {
  const grid = document.getElementById('subject-grid');
  if (!grid) return;
  grid.innerHTML = SUBJECTS.map(s => `
    <div class="subject-card" data-id="${s.id}" style="--accent:${s.accent}"
         role="button" tabindex="0"
         onclick="selectSubject('${s.id}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectSubject('${s.id}')}">
      <div class="subject-icon">${s.icon}</div>
      <div class="subject-name">${s.name}</div>
      <div class="subject-blurb">${s.blurb}</div>
      <button class="subject-notes-btn" onclick="event.stopPropagation();openNotes('${s.id}')">📄 Notes</button>
    </div>`).join('');
}

function selectSubject(id) {
  const subj = getSubject(id);
  if (!subj) return;
  gameState.subject = id;
  if (typeof playClickSound === 'function') playClickSound();

  // reflect selection on the launch (old start) screen
  const pill = document.getElementById('chosen-subject-pill');
  if (pill) pill.innerHTML = `<span class="pill-icon">${subj.icon}</span> ${subj.name}`;
  const launchNotes = document.getElementById('launch-notes-btn');
  if (launchNotes) launchNotes.onclick = () => openNotes(id);

  showScreen('start-screen');
}

function backToSubjects() {
  if (typeof playClickSound === 'function') playClickSound();
  showScreen('subject-screen');
}

/* ============================================================
   2. ANSWER REVEAL + SKIP / NEXT
   Replaces the old blind auto-advance. selectAnswer()/timeUp()
   in game.js now call revealAnswer() instead of setTimeout(advance).
   Scoring still happens exactly once inside selectAnswer (guarded
   by gameState.answered); this only controls the reveal + advance.
   ============================================================ */
let autoAdvanceTimer = null;
const REVEAL_MS = 2500;   // how long the correct answer stays visible

function revealAnswer() {
  const nb = document.getElementById('next-btn');
  if (nb) {
    nb.style.display = 'inline-flex';
    nb.disabled = false;
    nb.classList.add('show');
    nb.textContent = (gameState.currentQ >= gameState.totalQ - 1) ? 'See Results →' : 'Next Question →';
  }
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(nextQuestion, REVEAL_MS);
}

/* Guarded advance: prevents double-clicks skipping two questions
   and prevents the auto-timer + a click both firing. */
function nextQuestion() {
  if (gameState.advancing) return;
  gameState.advancing = true;
  clearTimeout(autoAdvanceTimer);
  const nb = document.getElementById('next-btn');
  if (nb) { nb.style.display = 'none'; nb.classList.remove('show'); }
  advanceQuestion();               // defined in game.js
}

/* ============================================================
   3. VIEW NOTES (per-subject PDF viewer)
   ============================================================ */
function openNotes(id) {
  const subj = getSubject(id || gameState.subject);
  if (!subj) return;
  if (typeof playClickSound === 'function') playClickSound();

  document.getElementById('notes-subject-name').textContent = subj.name;
  const frame = document.getElementById('notes-frame');
  const missing = document.getElementById('notes-missing');
  missing.style.display = 'none';
  frame.style.display = 'block';
  frame.src = subj.pdf + '#view=FitH';

  // if the PDF isn't there yet, show the friendly placeholder
  fetch(subj.pdf, { method: 'HEAD' })
    .then(r => { if (!r.ok) throw 0; })
    .catch(() => {
      frame.style.display = 'none';
      missing.style.display = 'flex';
      document.getElementById('notes-missing-path').textContent = subj.pdf;
    });

  document.getElementById('notes-open-btn').onclick = () => window.open(subj.pdf, '_blank');
  document.getElementById('notes-download-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = subj.pdf; a.download = subj.short + '-notes.pdf'; a.click();
  };
  document.getElementById('notes-modal').classList.add('open');
}

function closeNotes() {
  const m = document.getElementById('notes-modal');
  m.classList.remove('open');
  document.getElementById('notes-frame').src = '';     // stop rendering / free memory
}

function toggleNotesFullscreen() {
  const box = document.getElementById('notes-box');
  if (!document.fullscreenElement) box.requestFullscreen?.();
  else document.exitFullscreen?.();
}

/* ============================================================
   4. RICHER RESULTS  (wrap the existing showEndScreen)
   ============================================================ */
const _origShowEndScreen = showEndScreen;      // game.js declares it as a global function
showEndScreen = function () {
  _origShowEndScreen.apply(this, arguments);
  try { enhanceEndScreen(); } catch (e) { console.warn('enhanceEndScreen', e); }
};

function enhanceEndScreen() {
  const s = gameState;
  const subj = getSubject(s.subject);
  // currentQ = number of questions completed (game.js increments before end check)
  const attempted = Math.max(1, Math.min(s.totalQ, s.currentQ));
  const acc = Math.round((s.correctCount / attempted) * 100);
  const wrong = attempted - s.correctCount;

  const meta = document.getElementById('end-meta');
  if (meta) {
    meta.innerHTML =
      `<span>📚 ${subj ? subj.name : 'Mixed'}</span>` +
      `<span>🎯 ${s.difficulty.toUpperCase()}</span>` +
      `<span>✅ ${s.correctCount} correct</span>` +
      `<span>❌ ${wrong} wrong</span>` +
      `<span>📈 ${acc}% accuracy</span>`;
  }
  // wire the extra buttons to the current subject
  const vn = document.getElementById('end-notes-btn');
  if (vn) vn.onclick = () => openNotes(s.subject);
}

function changeSubject() {
  if (typeof playClickSound === 'function') playClickSound();
  if (typeof stopTimer === 'function') stopTimer();
  document.getElementById('confetti-container').innerHTML = '';
  showScreen('subject-screen');
}

/* ============================================================
   5. INIT  (render subjects once DOM is ready)
   ============================================================ */
window.addEventListener('load', renderSubjects);

/* Enter / Space advances during the answer reveal (only once answered). */
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') &&
      document.getElementById('game-screen').classList.contains('active') &&
      gameState.answered && !gameState.advancing) {
    e.preventDefault();
    nextQuestion();
  }
}, true);
