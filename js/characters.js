/* ============================================================
   ESCAPE THE VIVA - Image Characters
   ------------------------------------------------------------
   Image-based rendering (replaces the old SVG). Function names
   are unchanged so game.js / ui.js keep working with no edits.
   Sprites come from assets.js; swapping is instant (preloaded).
   ============================================================ */

/* Start screen student (right side of hero) */
function renderStartStudent() {
  if (document.getElementById('start-student-svg')) {
    renderStudentImage('start-student-svg', 'idle');
  }
}

/* Professor on the game screen (left) */
function renderProfessor() {
  if (document.getElementById('prof-svg-wrapper')) {
    renderProfessorImage('prof-svg-wrapper', 'idle');
  }
}

/* Student on the game screen (right) */
function renderGameStudent() {
  if (document.getElementById('student-panel-wrapper')) {
    renderStudentImage('student-panel-wrapper', 'idle');
  }
}

/* ---- End-screen character images (used via innerHTML) ---- */
function getEscapedStudentSVG() {
  return `<img class="char-img end-char" src="${STUDENT_SPRITES.happy}" alt="Student">`;
}
function getFailedStudentSVG() {
  return `<img class="char-img end-char" src="${STUDENT_SPRITES.panic}" alt="Student">`;
}
function getLegendarySVG() {
  return `<img class="char-img end-char" src="${STUDENT_SPRITES.confident}" alt="Student">`;
}
function getProfAndStudentSVG() {
  return `<div class="end-duo">
    <img class="char-img end-char" src="${PROFESSOR_SPRITES.impressed}" alt="Professor">
    <img class="char-img end-char" src="${STUDENT_SPRITES.happy}" alt="Student">
  </div>`;
}
