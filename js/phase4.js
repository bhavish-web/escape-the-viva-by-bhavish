/* ============================================================
   ESCAPE THE VIVA - Phase 4 : Animation hooks  (loads LAST)
   Additive only. We wrap existing global functions and call the
   originals first, so no existing behaviour changes — we just add
   count-ups, a progress bar, and transition triggers on top.
   ============================================================ */
(function () {
  const p4Reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- number count-up helper ---- */
  function p4CountUp(el, from, to, dur, suffix) {
    if (!el) return;
    suffix = suffix || '';
    if (p4Reduced || from === to) { el.textContent = to + suffix; return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);          // easeOutCubic
      el.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = to + suffix;
    }
    requestAnimationFrame(step);
  }

  function p4Retrigger(el, cls) {
    if (!el || p4Reduced) return;
    el.classList.remove(cls);
    void el.offsetWidth;                              // force reflow to restart the animation
    el.classList.add(cls);
  }

  /* ---- inject the in-game progress bar once ---- */
  window.addEventListener('load', () => {
    const panel = document.querySelector('.questions-panel');
    if (panel && !document.getElementById('p4-progress')) {
      const bar = document.createElement('div');
      bar.id = 'p4-progress';
      bar.className = 'p4-progress';
      bar.innerHTML = '<div id="p4-progress-fill" class="p4-progress-fill"></div>';
      panel.insertBefore(bar, panel.firstChild);
    }
  });

  /* ---- wrap updateHUD: score count-up + bump, progress, pct ticks ---- */
  if (typeof updateHUD === 'function') {
    const _origUpdateHUD = updateHUD;
    let lastScore = 0;
    const lastPct = { stress: null, anger: null };

    updateHUD = function (gs) {
      _origUpdateHUD.apply(this, arguments);
      if (!gs) return;

      // progress bar → current question position
      const fill = document.getElementById('p4-progress-fill');
      if (fill && gs.totalQ) {
        fill.style.width = Math.min(100, ((gs.currentQ + 1) / gs.totalQ) * 100) + '%';
      }

      // score count-up + bump
      const scoreEl = document.getElementById('hud-score');
      if (scoreEl) {
        if (gs.score < lastScore) { lastScore = gs.score; scoreEl.textContent = gs.score + ' pts'; }
        else if (gs.score !== lastScore) {
          p4CountUp(scoreEl, lastScore, gs.score, 500, ' pts');
          p4Retrigger(scoreEl, 'p4-bump');
          lastScore = gs.score;
        }
      }

      // pop the stress / anger % when it changes
      [['stress', gs.stress], ['anger', gs.anger]].forEach(([k, v]) => {
        if (lastPct[k] !== null && lastPct[k] !== v) {
          p4Retrigger(document.getElementById(k + '-pct'), 'p4-tick');
        }
        lastPct[k] = v;
      });
    };
  }

  /* ---- wrap loadQuestion: refresh the question text with a subtle slide ---- */
  if (typeof loadQuestion === 'function') {
    const _origLoadQuestion = loadQuestion;
    loadQuestion = function () {
      _origLoadQuestion.apply(this, arguments);
      p4Retrigger(document.querySelector('.questions-panel'), 'p4-qin');
    };
  }

  /* ---- wrap setDifficulty: pulse the chosen button ---- */
  if (typeof setDifficulty === 'function') {
    const _origSetDifficulty = setDifficulty;
    setDifficulty = function (diff) {
      _origSetDifficulty.apply(this, arguments);
      p4Retrigger(document.querySelector(`.diff-btn[data-diff="${diff}"]`), 'p4-diff-pulse');
    };
  }

  /* ---- wrap showEndScreen: count up the final score + stamp the grade ---- */
  if (typeof showEndScreen === 'function') {
    const _origShowEndScreen = showEndScreen;
    showEndScreen = function () {
      _origShowEndScreen.apply(this, arguments);
      const s = (typeof gameState !== 'undefined') ? gameState : null;
      if (s) p4CountUp(document.getElementById('stat-score'), 0, s.score, 900, ' pts');
      p4Retrigger(document.getElementById('end-grade'), 'p4-stamp');
    };
  }
})();
