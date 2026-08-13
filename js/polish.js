/* ============================================================
   ESCAPE THE VIVA — Visual Polish layer (loads LAST)
   7 features: results screen, professor/bg reaction, timer tension,
   Bloom badge, confetti, answer reveal, screen transitions.
   Crash-proof: every wrapper runs the original first.
   ============================================================ */
(function(){
  "use strict";

  const BLOOM = {
    L1:{n:"Remember", c:"#4ee1ff"}, L2:{n:"Understand", c:"#39e08a"},
    L3:{n:"Apply", c:"#ffcf4a"},    L4:{n:"Analyze", c:"#ff9f45"},
    L5:{n:"Evaluate", c:"#ff7a7a"}, L6:{n:"Create", c:"#c58bff"}
  };

  function $(id){ return document.getElementById(id); }
  function q(sel){ return document.querySelector(sel); }

  /* ---------- 4) BLOOM BADGE on each question ---------- */
  function showBloomBadge(){
    try{
      const qz = q('#game-screen .rd-qhead') || q('#game-screen .rd-qcard');
      if(!qz) return;
      let badge = $('rd-bloom');
      const cur = (typeof questions!=='undefined' && questions[gameState.currentQ]) || null;
      const lvl = cur && typeof cur.bloom==='string' ? cur.bloom.toUpperCase() : '';
      const info = BLOOM[lvl];
      if(!info){ if(badge) badge.style.display='none'; return; }
      if(!badge){
        badge = document.createElement('span');
        badge.id = 'rd-bloom';
        badge.className = 'rd-bloom';
        const head = q('#game-screen .rd-qhead');
        if(head) head.appendChild(badge); else qz.insertBefore(badge, qz.firstChild);
      }
      badge.style.display = 'inline-flex';
      badge.style.setProperty('--bl', info.c);
      badge.innerHTML = '<b>'+lvl+'</b> · '+info.n;
    }catch(e){}
  }

  /* ---------- 6) ANSWER REVEAL animation ---------- */
  function animateReveal(){
    try{
      const grid = q('#game-screen .options-grid'); if(!grid) return;
      const correct = grid.querySelector('.option-btn.correct');
      const wrong = grid.querySelector('.option-btn.wrong');
      if(correct){ correct.classList.remove('rd-glow'); void correct.offsetWidth; correct.classList.add('rd-glow'); }
      if(wrong){ wrong.classList.remove('rd-shake'); void wrong.offsetWidth; wrong.classList.add('rd-shake'); }
    }catch(e){}
  }

  /* ---------- 5) CONFETTI / particle burst ---------- */
  function burst(kind){
    try{
      const layer = ensureConfettiLayer();
      const n = kind==='win' ? 90 : 26;
      const colors = ['#4ee1ff','#39e08a','#ffcf4a','#ff9f45','#c58bff','#ff7a7a'];
      const w = window.innerWidth, cx = w/2;
      for(let i=0;i<n;i++){
        const p = document.createElement('span');
        p.className='rd-confetti';
        const startX = kind==='win' ? Math.random()*w : cx + (Math.random()*160-80);
        const startY = kind==='win' ? -20 : window.innerHeight*0.42;
        p.style.left = startX+'px'; p.style.top = startY+'px';
        p.style.background = colors[(Math.random()*colors.length)|0];
        p.style.setProperty('--dx', (Math.random()*260-130)+'px');
        p.style.setProperty('--dy', (kind==='win'? (window.innerHeight+40) : (Math.random()*220+120))+'px');
        p.style.setProperty('--rot', (Math.random()*720-360)+'deg');
        p.style.animationDelay = (Math.random()*0.15)+'s';
        layer.appendChild(p);
        setTimeout(()=>p.remove(), 1600);
      }
    }catch(e){}
  }
  function ensureConfettiLayer(){
    let l = $('rd-confetti-layer');
    if(!l){ l=document.createElement('div'); l.id='rd-confetti-layer'; document.body.appendChild(l); }
    return l;
  }

  /* ---------- 2) PROFESSOR MOOD / BACKGROUND reaction ---------- */
  function reactBackground(){
    try{
      const gs = $('game-screen'); if(!gs) return;
      const anger = (typeof gameState!=='undefined' && gameState.anger)||0;
      const stress = (typeof gameState!=='undefined' && gameState.stress)||0;
      const heat = Math.max(anger, stress);           // 0..100
      gs.style.setProperty('--rd-heat', (heat/100).toFixed(2));
      gs.classList.toggle('rd-tense', heat >= 70);
    }catch(e){}
  }

  /* ---------- 3) TIMER TENSION (last 5s) ---------- */
  function watchTimer(){
    try{
      const disp = $('timer-display'); const num = $('timer-num');
      if(!disp || !num) return;
      const t = parseInt(num.textContent);
      if(!isNaN(t) && t<=5 && t>0 && !gameState.answered){
        disp.classList.add('rd-tension');
        if(t<=3){ const gs=$('game-screen'); if(gs){ gs.classList.remove('rd-edgeflash'); void gs.offsetWidth; gs.classList.add('rd-edgeflash'); } }
      } else {
        disp.classList.remove('rd-tension');
      }
    }catch(e){}
  }

  /* ---------- 1) CINEMATIC RESULTS ---------- */
  function cinematicResults(ending){
    try{
      const screen = $('end-screen'); if(!screen) return;
      screen.classList.remove('rd-cine'); void screen.offsetWidth; screen.classList.add('rd-cine');

      [['stat-score'],['stat-highscore']].forEach(([id])=>{
        const el = $(id); if(!el) return;
        const m = (el.textContent||'').match(/\d+/); if(!m) return;
        countUp(el, parseInt(m[0]), el.textContent.replace(/\d+/, '')); 
      });
      const list = $('achievements-list');
      if(list){ Array.from(list.children).forEach((c,i)=>{ c.style.animation='none'; void c.offsetWidth; c.style.animation=`rdPop .45s ${0.5+i*0.12}s both`; }); }
      if(ending==='legendary' || ending==='adopted' || ending==='escaped'){ burst('win'); setTimeout(()=>burst('win'), 500); }
    }catch(e){}
  }
  function countUp(el, target, suffix){
    const dur=900, t0=performance.now();
    function step(t){
      const p=Math.min(1,(t-t0)/dur);
      const val=Math.round(target*(1-Math.pow(1-p,3)));
      el.textContent = val + (suffix||'');
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 7) SMOOTH SCREEN TRANSITIONS ---------- */
  function animateScreenIn(el){
    try{ if(!el) return; el.classList.remove('rd-screen-in'); void el.offsetWidth; el.classList.add('rd-screen-in'); }catch(e){}
  }

  /* ===================== WIRING (crash-proof) ===================== */
  function wrap(name, after){
    if(typeof window[name]==='function'){
      const _o = window[name];
      window[name] = function(){ const r=_o.apply(this,arguments); try{ after.apply(this,arguments); }catch(e){} return r; };
    }
  }

  window.addEventListener('load', function(){
    wrap('loadQuestion', function(){ showBloomBadge(); reactBackground(); animateScreenIn($('game-screen')); });
    wrap('selectAnswer', function(idx){
      animateReveal(); reactBackground();
      try{ const cur=questions[gameState.currentQ]; if(cur && idx===cur.correct){ burst('correct'); } }catch(e){}
    });
    wrap('updateHUD', function(){ reactBackground(); });
    wrap('startTimer', function(){ const d=$('timer-display'); if(d) d.classList.remove('rd-tension'); });
    wrap('showEndScreen', function(){ setTimeout(()=>cinematicResults(currentEnding()), 60); });

    setInterval(watchTimer, 250);
    hookScreenObserver();
  });

  function currentEnding(){
    try{
      const s=gameState;
      if(s.stress>=100) return 'failed';
      if(s.correctCount>=9) return 'legendary';
      if(s.anger<=20 && s.correctCount>=5) return 'adopted';
      return 'escaped';
    }catch(e){ return 'escaped'; }
  }

  function hookScreenObserver(){
    try{
      document.querySelectorAll('.screen').forEach(sc=>{
        const obs = new MutationObserver(()=>{ if(sc.classList.contains('active')) animateScreenIn(sc); });
        obs.observe(sc, { attributes:true, attributeFilter:['class'] });
      });
    }catch(e){}
  }
})();
