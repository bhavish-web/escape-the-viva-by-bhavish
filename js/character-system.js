/* ============================================================
   ESCAPE THE VIVA - Image Character System  (Phase 2)
   ------------------------------------------------------------
   Image-based professor & student controller that will REPLACE
   the SVG characters. Swaps are instant because every sprite is
   preloaded by assets.js.

   This module only provides the engine + API. It does NOT touch
   the current SVG rendering or the layout yet — that happens in
   Phase 3, after we confirm this works. Loading it changes
   nothing on screen by itself.

   APPROVED GAMEPLAY MAPPING (semantic state -> sprite):
     correct        -> professor: impressed | student: happy
     wrong          -> professor: annoyed   | student: worried
     repeatedWrong  -> professor: angry     | student: panic
     thinking       -> professor: thinking  | student: thinking
     asking         -> professor: talking   | student: idle
     idle (default) -> professor: idle       | student: idle
   ============================================================ */

/* Semantic game-state -> sprite key */
const PROF_STATE_MAP = {
  idle:          'idle',
  asking:        'talking',
  thinking:      'thinking',
  correct:       'impressed',
  wrong:         'annoyed',
  repeatedWrong: 'angry',
  shocked:       'shocked',
  disappointed:  'disappointed'
};

const STUDENT_STATE_MAP = {
  idle:          'idle',
  talking:       'talking',
  thinking:      'thinking',
  correct:       'happy',
  wrong:         'worried',
  repeatedWrong: 'panic',
  confident:     'confident',
  nervous:       'nervous'
};

/* Bridge from the OLD SVG professor states (used across game.js/ui.js)
   to the new semantic states, so Phase 3 wiring is a drop-in:
     neutral -> idle | happy -> correct | angry -> wrong | very-angry -> repeatedWrong */
const LEGACY_PROF_STATE = {
  'neutral':    'idle',
  'happy':      'correct',
  'angry':      'wrong',
  'very-angry': 'repeatedWrong'
};

function _ensureImg(container, className, alt) {
  let img = container.querySelector('img.char-img');
  if (!img) {
    img = document.createElement('img');
    img.className = 'char-img ' + className;
    img.alt = alt;
    img.draggable = false;
    container.innerHTML = '';        // remove any prior SVG/content
    container.appendChild(img);
  }
  return img;
}

/* ---- Professor ---- */
function renderProfessorImage(containerId, state) {
  const c = document.getElementById(containerId);
  if (!c) return;
  _ensureImg(c, 'prof-img', 'Professor');
  setProfessorState(state || 'idle', containerId);
}
function setProfessorState(state, containerId) {
  const key = PROF_STATE_MAP[state] || 'idle';
  const url = PROFESSOR_SPRITES[key];
  if (!url) return;
  const scope = containerId ? document.getElementById(containerId) : document;
  const img = scope && scope.querySelector('img.prof-img');
  if (img) img.src = url;
}
/* accepts the old neutral/angry/very-angry/happy vocabulary too */
function setProfessorLegacy(legacyState, containerId) {
  setProfessorState(LEGACY_PROF_STATE[legacyState] || 'idle', containerId);
}

/* ---- Student ---- */
function renderStudentImage(containerId, state) {
  const c = document.getElementById(containerId);
  if (!c) return;
  _ensureImg(c, 'student-img', 'Student');
  setStudentState(state || 'idle', containerId);
}
function setStudentState(state, containerId) {
  const key = STUDENT_STATE_MAP[state] || 'idle';
  const url = STUDENT_SPRITES[key];
  if (!url) return;
  const scope = containerId ? document.getElementById(containerId) : document;
  const img = scope && scope.querySelector('img.student-img');
  if (img) img.src = url;
}

/* Expose for Phase 3 wiring + manual testing. */
window.EscapeVivaCharacters = {
  renderProfessorImage, setProfessorState, setProfessorLegacy,
  renderStudentImage, setStudentState,
  PROF_STATE_MAP, STUDENT_STATE_MAP, LEGACY_PROF_STATE
};
