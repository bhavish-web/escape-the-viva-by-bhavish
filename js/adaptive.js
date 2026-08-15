/* ============================================================
   ESCAPE THE VIVA — Adaptive Difficulty (built-in subjects)
   A 4th difficulty ("adaptive"): starts at medium, then auto
   adjusts the level from the player's rolling performance.
   - 2 correct in a row  -> level up (easy->medium->hard)
   - 2 wrong  in a row   -> level down (hard->medium->easy)
   Shows a live difficulty badge in the HUD.
   Crash-proof: wraps existing functions, never breaks the game.
   ============================================================ */
(function(){
  "use strict";

  const LEVELS = ['easy','medium','hard'];
  const LEVEL_META = {
    easy:   { label:'EASY',   color:'#2ecc71', icon:'😅' },
    medium: { label:'MEDIUM', color:'#f0b429', icon:'😤' },
    hard:   { label:'HARD',   color:'#e63030', icon:'💀' }
  };

  const AD = {
    on: false,
    levelIdx: 1,          // start at medium
    goodStreak: 0,
    badStreak: 0,
    pool: []              // all questions for the chosen subject
  };
  window.ADAPTIVE = AD;

  function $(id){ return document.getElementById(id); }

  /* ---- select "adaptive" like a difficulty ---- */
  window.setDifficulty = (function(orig){
    return function(diff){
      if(diff === 'adaptive'){
        gameState.difficulty = 'adaptive';
        document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
        const btn=document.querySelector('[data-diff="adaptive"]'); if(btn) btn.classList.add('active');
        try{ if(typeof playClickSound==='function') playClickSound(); }catch(e){}
        return;
      }
      return orig.apply(this, arguments);
    };
  })(window.setDifficulty);

  /* ---- pick next question from the current adaptive level ---- */
  function levelPool(level){
    const inS = AD.pool;
    let p;
    if(level==='hard')        p = inS.filter(q=>q.importance>=3);
    else if(level==='medium') p = inS.filter(q=>q.importance>=2);
    else                      p = inS.slice();
    if(p.length===0) p = inS.slice();
    return p;
  }
  function pickAdaptiveQuestion(){
    const level = LEVELS[AD.levelIdx];
    const pool = levelPool(level);
    const q = pool[Math.floor(Math.random()*pool.length)];
    // Fisher-Yates on the options via existing randomizeAnswers
    return (typeof randomizeAnswers==='function') ? randomizeAnswers(q) : q;
  }

  /* ---- build the subject pool + start in adaptive ---- */
  function initAdaptive(){
    AD.on = true; AD.levelIdx = 1; AD.goodStreak = 0; AD.badStreak = 0;
    const subj = (typeof getSubject==='function') ? getSubject(gameState.subject) : null;
    const topics = subj ? subj.topics : (window.SUBJECTS ? SUBJECTS.flatMap(s=>s.topics) : []);
    AD.pool = (typeof allQuestions!=='undefined')
      ? allQuestions.filter(q => topics.includes(q.topic))
      : [];
    if(AD.pool.length===0 && typeof allQuestions!=='undefined') AD.pool = allQuestions.slice();
  }

  /* ---- adjust level after each answer ---- */
  function adjust(correct){
    if(correct){ AD.goodStreak++; AD.badStreak=0; }
    else       { AD.badStreak++;  AD.goodStreak=0; }
    let changed = 0;
    if(AD.goodStreak>=2 && AD.levelIdx<2){ AD.levelIdx++; AD.goodStreak=0; changed=1; }
    else if(AD.badStreak>=2 && AD.levelIdx>0){ AD.levelIdx--; AD.badStreak=0; changed=-1; }
    updateBadge(changed);
  }

  /* ---- live HUD badge ---- */
  function updateBadge(changed){
    let badge = $('adaptive-badge');
    if(!badge){
      badge = document.createElement('div');
      badge.id='adaptive-badge';
      badge.className='adaptive-badge';
      const host = document.querySelector('#game-screen .rd-hud') || $('game-screen');
      if(host) host.appendChild(badge);
    }
    const m = LEVEL_META[LEVELS[AD.levelIdx]];
    badge.style.setProperty('--adc', m.color);
    let arrow = changed>0 ? ' <span class="ad-up">▲</span>' : changed<0 ? ' <span class="ad-down">▼</span>' : '';
    badge.innerHTML = '<span class="ad-ttl">ADAPTIVE</span> '+m.icon+' <b>'+m.label+'</b>'+arrow;
    if(changed!==0){
      badge.classList.remove('ad-flash'); void badge.offsetWidth; badge.classList.add('ad-flash');
    }
  }

  /* ===== wire into the engine (crash-proof) ===== */
  window.addEventListener('load', function(){
    // when a game starts in adaptive mode, prep the pool + first question
    if(typeof window.startGame==='function'){
      const _start = window.startGame;
      window.startGame = function(){
        if(gameState.difficulty === 'adaptive'){
          initAdaptive();
        } else { AD.on = false; const b=$('adaptive-badge'); if(b) b.style.display='none'; }
        const r = _start.apply(this, arguments);
        try{
          if(AD.on){
            // replace the pre-picked questions with adaptive ones (10)
            window.questions = [];
            for(let i=0;i<10;i++) window.questions.push(pickAdaptiveQuestion());
            gameState.difficulty = 'medium'; // use medium timing as the base for adaptive
            const b=$('adaptive-badge'); if(b) b.style.display='';
            updateBadge(0);
            if(typeof loadQuestion==='function') loadQuestion();
          }
        }catch(e){ console.warn('adaptive start skipped', e); }
        return r;
      };
    }

    // after each answer, adjust level and swap the NEXT question to the new level
    if(typeof window.selectAnswer==='function'){
      const _sel = window.selectAnswer;
      window.selectAnswer = function(idx){
        const r = _sel.apply(this, arguments);
        try{
          if(AD.on){
            const q = questions[gameState.currentQ];
            const correct = q && idx === q.correct;
            adjust(correct);
            // set the upcoming question to match the new level
            const next = gameState.currentQ + 1;
            if(next < questions.length){ questions[next] = pickAdaptiveQuestion(); }
          }
        }catch(e){}
        return r;
      };
    }
  });
})();
