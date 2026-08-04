/* ============================================================
   ESCAPE THE VIVA - Phase 7 : Viva HUD driver  (loads LAST)
   Wraps existing globals (no logic changed) to power the new
   HUD: professor mood ladder, circular timer, status bars,
   recent-events feed, professor-feedback chips.
   ============================================================ */
(function () {

  /* ---- Professor mood ladder (driven by ANGER %) ---- */
  const MOODS = [
    { id:'calm',    name:'CALM',    range:'0 - 25%',  sprite:'idle',     min:0,   max:25  },
    { id:'serious', name:'SERIOUS', range:'26 - 50%', sprite:'thinking', min:26,  max:50  },
    { id:'annoyed', name:'ANNOYED', range:'51 - 75%', sprite:'annoyed',  min:51,  max:75  },
    { id:'angry',   name:'ANGRY',   range:'76 - 99%', sprite:'angry',    min:76,  max:99  },
    { id:'furious', name:'FURIOUS', range:'100%',     sprite:'shocked',  min:100, max:100 }
  ];

  function renderMoodLadder() {
    const box = document.getElementById('mood-rows');
    if (!box || typeof PROFESSOR_SPRITES === 'undefined') return;
    box.innerHTML = MOODS.map(m => `
      <div class="mood-row" data-mood="${m.id}">
        <img src="${PROFESSOR_SPRITES[m.sprite]}" alt="${m.name}">
        <div><div class="m-name">${m.name}</div><div class="m-range">${m.range}</div></div>
      </div>`).join('');
  }
  function updateMood(anger) {
    const active = MOODS.find(m => anger >= m.min && anger <= m.max) || MOODS[MOODS.length-1];
    document.querySelectorAll('.mood-row').forEach(r =>
      r.classList.toggle('active', r.dataset.mood === active.id));
  }

  /* ---- Recent events feed + feedback chips ---- */
  function recordEvent(q, kind, ptsText) {
    const list = document.getElementById('recent-events');
    if (!list) return;
    const map = {
      correct: { ico:'✅', cls:'ok',      label:'Correct Answer' },
      wrong:   { ico:'❌', cls:'bad',     label:'Wrong Answer'   },
      timeup:  { ico:'⏱️', cls:'neutral', label:'Time Up'        }
    };
    const m = map[kind]; if (!m) return;
    const row = document.createElement('div');
    row.className = 'event-row ' + m.cls;
    row.innerHTML = `<span class="ev-ico">${m.ico}</span><span class="ev-q">Q${q}</span><span>${m.label}</span><span class="ev-pts">${ptsText||''}</span>`;
    list.prepend(row);
    while (list.children.length > 4) list.removeChild(list.lastChild);
  }
  function setFeedback(kind) {
    document.querySelectorAll('.fb-chip').forEach(c =>
      c.classList.toggle('active', c.dataset.fb === kind));
  }

  /* ---- Wrap updateHUD: mood, confidence, streak, question counter ---- */
  if (typeof updateHUD === 'function') {
    const _orig = updateHUD;
    updateHUD = function (gs) {
      _orig.apply(this, arguments);
      if (!gs) return;
      updateMood(gs.anger);

      const conf = Math.max(0, 100 - gs.stress);
      const cb = document.getElementById('confidence-bar');
      const cp = document.getElementById('confidence-pct');
      if (cb) cb.style.width = conf + '%';
      if (cp) cp.textContent = conf + '%';
      const sp2 = document.getElementById('stress-pct2');
      if (sp2) sp2.textContent = gs.stress + '%';

      const sn = document.getElementById('streak-num');
      if (sn) sn.textContent = gs.streak;

      const qc = document.getElementById('q-counter');
      if (qc) qc.textContent =
        String(gs.currentQ + 1).padStart(2,'0') + ' / ' + gs.totalQ;
    };
  }

  /* ---- Wrap timer: circular ring ---- */
  const RING_CIRC = 327;   // 2*pi*52 rounded (matches CSS stroke-dasharray)
  if (typeof startTimer === 'function') {
    const _origStart = startTimer;
    startTimer = function () {
      _origStart.apply(this, arguments);
      const ring = document.getElementById('timer-ring-fg');
      const orb  = document.getElementById('timer-display');
      const dur  = (typeof diffConfig !== 'undefined' && diffConfig[gameState.difficulty])
                    ? diffConfig[gameState.difficulty].time : 10;
      if (orb) orb.classList.remove('urgent');
      if (ring) {
        ring.style.animation = 'none';
        void ring.offsetWidth;                         // restart
        ring.style.animation = `p7ring ${dur}s linear forwards`;
      }
    };
  }
  if (typeof stopTimer === 'function') {
    const _origStop = stopTimer;
    stopTimer = function () {
      _origStop.apply(this, arguments);
      const ring = document.getElementById('timer-ring-fg');
      if (ring) ring.style.animationPlayState = 'paused';
    };
  }

  /* ---- Wrap answer handlers: events + feedback ---- */
  if (typeof selectAnswer === 'function') {
    const _origSel = selectAnswer;
    selectAnswer = function (idx) {
      if (gameState.answered) return _origSel.apply(this, arguments);
      const pc = gameState.correctCount, ps = gameState.score, q = gameState.currentQ + 1;
      _origSel.apply(this, arguments);
      const correct = gameState.correctCount > pc;
      const delta = gameState.score - ps;
      recordEvent(q, correct ? 'correct' : 'wrong', correct ? ('+' + delta) : '—');
      setFeedback(correct ? 'correct' : 'wrong');
    };
  }
  if (typeof timeUp === 'function') {
    const _origTU = timeUp;
    timeUp = function () {
      if (gameState.answered) return _origTU.apply(this, arguments);
      const q = gameState.currentQ + 1;
      _origTU.apply(this, arguments);
      recordEvent(q, 'timeup', '—');
      setFeedback('timeup');
    };
  }
  if (typeof useHint === 'function') {
    const _origHint = useHint;
    useHint = function () { _origHint.apply(this, arguments); setFeedback('hint'); };
  }
  /* clear feedback highlight on each new question */
  if (typeof loadQuestion === 'function') {
    const _origLoad = loadQuestion;
    loadQuestion = function () { _origLoad.apply(this, arguments); setFeedback(null); };
  }

  /* ---- init ---- */
  window.addEventListener('load', () => {
    renderMoodLadder();
    const list = document.getElementById('recent-events');
    if (list && !list.children.length) list.innerHTML = '<div class="event-row neutral"><span class="ev-ico">📝</span><span>Answer to begin…</span></div>';
  });
})();
