/* ============================================================
   ESCAPE THE VIVA — First-run tutorial
   Shows a one-time overlay explaining Stress, Anger, the timer,
   and lifelines the first time a player actually starts a game.
   Crash-proof: wraps startGame the same way daily.js/adaptive.js
   do, so a failure here never blocks the game itself.
   ============================================================ */
(function(){
  "use strict";
  const FLAG_KEY = 'etv_tutorial_seen';

  function seen(){
    try{ return localStorage.getItem(FLAG_KEY) === '1'; }catch(e){ return true; } // fail closed
  }
  function markSeen(){
    try{ localStorage.setItem(FLAG_KEY, '1'); }catch(e){}
  }

  function buildOverlay(){
    if(document.getElementById('tutorial-overlay')) return document.getElementById('tutorial-overlay');
    const items = [
      { icon:'❤️', title:'Stress meter', text:'Wrong or slow answers raise it. Hit 100% and it\u2019s game over.' },
      { icon:'😡', title:'Anger meter', text:'The professor gets angrier the worse the viva goes for you.' },
      { icon:'⏱️', title:'The clock', text:'Each question has a timer in Viva mode — answer before it runs out.' },
      { icon:'🆘', title:'Lifelines', text:'Hint, 50/50, and Ask The Professor each work once per game — save them for the hard ones.' }
    ];
    const wrap = document.createElement('div');
    wrap.className = 'tutorial-overlay';
    wrap.id = 'tutorial-overlay';
    wrap.style.display = 'none';
    wrap.innerHTML =
      '<div class="tutorial-box">' +
        '<div class="tutorial-title">🎓 Before you begin\u2026</div>' +
        '<div class="tutorial-sub">Quick rundown so the viva doesn\u2019t catch you off guard</div>' +
        '<div class="tutorial-list">' +
          items.map(it =>
            '<div class="tutorial-item">' +
              '<span class="ti-icon">' + it.icon + '</span>' +
              '<span class="ti-text"><b>' + it.title + '</b><span>' + it.text + '</span></span>' +
            '</div>'
          ).join('') +
        '</div>' +
        '<button type="button" class="tutorial-go-btn" id="tutorial-go-btn">Got it — let\u2019s go!</button>' +
      '</div>';
    document.getElementById('game-container').appendChild(wrap);
    document.getElementById('tutorial-go-btn').addEventListener('click', hideTutorial);
    wrap.addEventListener('click', function(e){ if(e.target === wrap) hideTutorial(); });
    return wrap;
  }

  function showTutorial(){
    try{
      const el = buildOverlay();
      el.style.display = 'flex';
      document.body.classList.add('modal-open');
      if(typeof playClickSound === 'function') playClickSound();
    }catch(e){ console.warn('tutorial show skipped', e); }
  }

  window.hideTutorial = function(){
    try{
      markSeen();
      const el = document.getElementById('tutorial-overlay');
      if(el) el.style.display = 'none';
      document.body.classList.remove('modal-open');
    }catch(e){}
  };

  window.addEventListener('load', function(){
    if(typeof window.startGame !== 'function') return;
    const _start = window.startGame;
    window.startGame = function(){
      const r = _start.apply(this, arguments);
      try{ if(!seen()) showTutorial(); }catch(e){}
      return r;
    };
  });
})();
