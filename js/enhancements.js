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
  const grid = document.getElementById('hero-subject-grid');
  if (!grid) return;
  grid.innerHTML = SUBJECTS.map(s => `
    <button type="button" class="hero-subject-chip" data-id="${s.id}" style="--accent:${s.accent}"
            onclick="selectSubject('${s.id}')" title="${s.name}">
      <span class="chip-icon">${s.icon}</span>
      <span class="chip-name">${s.name}</span>
    </button>`).join('');
}

function selectSubject(id) {
  const subj = getSubject(id);
  if (!subj) return;
  gameState.subject = id;
  if (typeof playClickSound === 'function') playClickSound();

  // update the dropdown button label to the chosen subject
  const label = document.getElementById('subject-dropdown-label');
  if (label) label.innerHTML = `${subj.icon} ${subj.name}`;

  // highlight the chosen row in the list
  document.querySelectorAll('.hero-subject-chip').forEach(c =>
    c.classList.toggle('selected', c.dataset.id === id));

  closeSubjectDropdown();

  // reveal + enable the Start Game button
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) { startBtn.style.display = 'block'; startBtn.disabled = false; }
}

function toggleSubjectDropdown() {
  const wrap = document.getElementById('subject-select-inline');
  const panel = document.getElementById('subject-dropdown-panel');
  if (!wrap || !panel) return;
  const open = wrap.classList.toggle('open');
  panel.style.display = open ? 'flex' : 'none';
  document.body.classList.toggle('modal-open', open);
  if (typeof playClickSound === 'function') playClickSound();
}

function closeSubjectDropdown() {
  const wrap = document.getElementById('subject-select-inline');
  const panel = document.getElementById('subject-dropdown-panel');
  if (wrap) wrap.classList.remove('open');
  if (panel) panel.style.display = 'none';
  document.body.classList.remove('modal-open');
}

// clicking the dimmed backdrop (not the modal box itself) closes the popup
function handleSubjectPanelClick(e) {
  if (e.target === e.currentTarget) closeSubjectDropdown();
}

// close on Escape too
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const wrap = document.getElementById('subject-select-inline');
    if (wrap && wrap.classList.contains('open')) closeSubjectDropdown();
  }
});

function backToSubjects() {
  if (typeof playClickSound === 'function') playClickSound();
  showScreen('start-screen');
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
  // Practice mode: no clock, no rush — let the student read the explanation
  // and advance manually. Viva mode keeps the original auto-advance pressure.
  if (gameState.mode !== 'practice') {
    autoAdvanceTimer = setTimeout(nextQuestion, REVEAL_MS);
  }
}

/* Guarded advance: prevents double-clicks skipping two questions
   and prevents the auto-timer + a click both firing. */
function nextQuestion() {
  if (gameState.advancing) return;
  gameState.advancing = true;
  clearTimeout(autoAdvanceTimer);
  if (typeof hideStressChange === 'function') hideStressChange();
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
  showScreen('start-screen');
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
