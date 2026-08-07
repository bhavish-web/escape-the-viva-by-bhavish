/* ============================================================
   ESCAPE THE VIVA — Gameplay Redesign controller (loads LAST)
   v7: does NOT override startGame (fixes the skipped home screen
       + Loading freeze). Layout, images, timer, guards intact.
   ============================================================ */
(function(){
  const PROF_BY_ANGER = [
    {max:33,  src:'assets/professor/calm.png'},
    {max:66,  src:'assets/professor/annoyed.png'},
    {max:100, src:'assets/professor/angry.png'}
  ];
  const PROF_IMPRESSED = 'assets/professor/impressed.png';
  const PROF_FALLBACK  = 'assets/professor/calm.png';
  const STUD = { nervous:'assets/student/nervous.png', happy:'assets/student/happy.png', panic:'assets/student/panic.png', confident:'assets/student/confident.png' };
  const MOTIVES = ['Stay calm. Think smart.','Breathe. You know this.','One question at a time.','Confidence beats panic.','Trust your prep.','Keep your cool.','You\u2019ve got this.'];
  let impressedUntil = 0;

  function profSrc(a){ a=Math.max(0,Math.min(100,a||0)); return (PROF_BY_ANGER.find(t=>a<=t.max)||PROF_BY_ANGER[0]).src; }
  function anger(){ try{ return gameState.anger||0; }catch(e){ return 0; } }
  function streak(){ try{ return gameState.streak||0; }catch(e){ return 0; } }

  function ensureProfImg(){
    const w=document.getElementById('prof-svg-wrapper'); if(!w) return null;
    let img=w.querySelector('img.rd-prof-img');
    if(!img){ w.innerHTML=''; img=document.createElement('img'); img.className='rd-prof-img'; img.id='rd-prof-img'; img.alt='Professor';
      img.onerror=function(){ if(this.src.indexOf(PROF_FALLBACK)<0) this.src=PROF_FALLBACK; else this.style.display='none'; };
      w.appendChild(img); }
    return img;
  }
  function setProfByAnger(){ if(Date.now()<impressedUntil) return; const img=ensureProfImg(); if(img){ const s=profSrc(anger()); if(img.getAttribute('src')!==s) img.src=s; } }
  function setProfImpressed(){ impressedUntil=Date.now()+1600; const img=ensureProfImg(); if(img) img.src=PROF_IMPRESSED; }
  function setStud(state){ const img=document.getElementById('rd-student-img'); if(!img) return; const s=STUD[state]||STUD.nervous; if(img.getAttribute('src')!==s) img.src=s; const p=document.getElementById('rd-student'); if(p) p.classList.remove('noimg'); }

  /* ---- mobile layout: Hint · Timer · 50/50 into a row above the question ---- */
  function applyLayout(){
    try{
      const gs=document.getElementById('game-screen'); if(!gs) return;
      const mobile=window.matchMedia('(max-width:820px)').matches;
      const hud=gs.querySelector('.rd-hud');
      const llWrap=hud?hud.querySelector('.rd-lifelines'):null;
      const qzone=gs.querySelector('.rd-qzone');
      const hint=document.getElementById('btn-hint');
      const fifty=document.getElementById('btn-5050');
      const timer=document.getElementById('timer-display');
      if(!qzone||!hint||!fifty||!timer) return;
      let row=document.getElementById('rd-actionrow');
      if(mobile){
        if(!row){ row=document.createElement('div'); row.id='rd-actionrow'; row.className='rd-actionrow z'; }
        if(row.parentNode!==gs || row.nextSibling!==qzone) gs.insertBefore(row,qzone);
        if(row.firstChild!==hint || timer.parentNode!==row || fifty.parentNode!==row){ row.appendChild(hint); row.appendChild(timer); row.appendChild(fifty); }
      } else {
        if(llWrap){ if(hint.parentNode!==llWrap) llWrap.appendChild(hint); if(fifty.parentNode!==llWrap) llWrap.appendChild(fifty); }
        if(timer.parentNode!==qzone) qzone.appendChild(timer);
        if(row&&row.parentNode) row.parentNode.removeChild(row);
      }
    }catch(e){}
  }
  let _lt; window.addEventListener('resize',function(){ clearTimeout(_lt); _lt=setTimeout(applyLayout,150); });
  window.addEventListener('orientationchange',function(){ setTimeout(applyLayout,250); });

  window.addEventListener('load',function(){
    [PROF_IMPRESSED,'assets/classroom.png','assets/classroom-portrait.png',...PROF_BY_ANGER.map(p=>p.src),...Object.values(STUD)].forEach(u=>{ const i=new Image(); i.src=u; });
    applyLayout();
    ['spawnParticles','createParticles','spawnConfetti','shakeScreen','flashScreen','emojiRain','createStressParticle'].forEach(function(fn){
      if(typeof window[fn]==='function'){ const _o=window[fn]; window[fn]=function(){ try{ return _o.apply(this,arguments); }catch(e){} }; }
    });
  });

  /* professor + student (replace SVG) — guarded */
  window.renderProfessor=function(){ try{ setProfByAnger(); }catch(e){} };
  window.setProfExpression=function(state){
    try{
      const fx=document.getElementById('prof-angry-fx'); if(fx) fx.style.display=(state==='angry'||state==='very-angry')?'block':'none';
      if(state==='happy'){ setProfImpressed(); setStud(streak()>=3?'confident':'happy'); if(typeof playHappyChime==='function') playHappyChime(); }
      else if(state==='angry'||state==='very-angry'){ setProfByAnger(); setStud('panic'); if(state==='very-angry'){ flashScene(); shakeProf(); } if(typeof playAngrySound==='function') playAngrySound(); }
      else { setProfByAnger(); setStud('nervous'); }
    }catch(e){}
  };
  function flashScene(){ const f=document.getElementById('rd-flash'); if(!f) return; f.style.opacity=.5; setTimeout(()=>f.style.opacity=0,150); }
  function shakeProf(){ const p=document.querySelector('#game-screen .rd-prof'); if(!p) return; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); setTimeout(()=>p.classList.remove('shake'),420); }

  function updateContext(){
    try{
      const subj=(typeof getSubject==='function'&&gameState.subject)?getSubject(gameState.subject):null;
      const st=document.getElementById('rd-subject'); if(st) st.textContent=subj?(subj.icon+' '+subj.name):'\uD83D\uDCDA Mixed';
      const df=document.getElementById('rd-diff'); if(df) df.textContent=(gameState.difficulty||'medium').replace(/^./,c=>c.toUpperCase());
      const pr=document.getElementById('rd-progress'); if(pr){ const p=Math.round((((gameState.currentQ||0)+(gameState.answered?1:0))/(gameState.totalQ||10))*100); pr.style.width=Math.max(0,Math.min(100,p))+'%'; }
      setProfByAnger();
    }catch(e){}
  }

  if(typeof updateHUD==='function'){ const _u=updateHUD; window.updateHUD=function(){ const r=_u.apply(this,arguments); updateContext(); return r; }; }
  if(typeof loadQuestion==='function'){ const _l=loadQuestion; window.loadQuestion=function(){ const r=_l.apply(this,arguments);
    try{ impressedUntil=0;
      // reset lifelines display for a fresh game/question
      ['btn-hint','btn-5050'].forEach(id=>{ const b=document.getElementById(id); if(b && !gameState['lifelineUsed'+(id==='btn-hint'?'Hint':'5050')]) b.classList.remove('used'); });
      const m=document.getElementById('rd-motivate'); if(m) m.textContent=MOTIVES[Math.floor(Math.random()*MOTIVES.length)];
      const pr=document.getElementById('rd-progress'); if(pr){ const p=Math.round(((gameState.currentQ||0)/(gameState.totalQ||10))*100); pr.style.width=p+'%'; }
      setStud('nervous'); setProfByAnger(); updateContext(); applyLayout();
    }catch(e){} return r; }; }

  function markUsed(btnId,countId){ const b=document.getElementById(btnId); if(b) b.classList.add('used'); const c=document.getElementById(countId); if(c) c.textContent='x0'; }
  if(typeof useHint==='function'){ const _h=useHint; window.useHint=function(){ const r=_h.apply(this,arguments); try{ markUsed('btn-hint','hint-count'); const ai=document.getElementById('rd-aihint'); if(ai){ ai.textContent='\uD83D\uDCA1 Hint used'; ai.classList.add('used'); } }catch(e){} return r; }; }
  if(typeof useFiftyFifty==='function'){ const _f=useFiftyFifty; window.useFiftyFifty=function(){ const r=_f.apply(this,arguments); try{ markUsed('btn-5050','fifty-count'); }catch(e){} return r; }; }

  if(typeof startTimer==='function'){ const _s=startTimer; window.startTimer=function(){ const r=_s.apply(this,arguments);
    try{ const ring=document.getElementById('rd-ring'), num=document.getElementById('timer-num'), orb=document.getElementById('timer-display');
      const dur=parseInt(num&&num.textContent)||15; if(orb) orb.classList.remove('urgent');
      if(ring){ ring.style.animation='none'; void ring.offsetWidth; ring.style.animation='rdRing '+dur+'s linear forwards'; } }catch(e){} return r; }; }
  if(typeof stopTimer==='function'){ const _st=stopTimer; window.stopTimer=function(){ const r=_st.apply(this,arguments); try{ const x=document.getElementById('rd-ring'); if(x) x.style.animationPlayState='paused'; }catch(e){} return r; }; }
})();
