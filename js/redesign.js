/* ============================================================
   ESCAPE THE VIVA — Gameplay Redesign controller (loads LAST)
   v4: sticky impressed, fullscreen button, freeze guard.
   Assets:
     assets/classroom.png
     assets/professor/calm.png annoyed.png angry.png impressed.png
     assets/student/nervous.png happy.png panic.png confident.png
   ============================================================ */
(function(){
  const PROF_BY_ANGER = [
    {max:33,  src:'assets/professor/calm.png'},
    {max:66,  src:'assets/professor/annoyed.png'},
    {max:100, src:'assets/professor/angry.png'}
  ];
  const PROF_IMPRESSED = 'assets/professor/impressed.png';
  const PROF_FALLBACK  = 'assets/professor/calm.png';

  const STUD = {
    nervous:   'assets/student/nervous.png',
    happy:     'assets/student/happy.png',
    panic:     'assets/student/panic.png',
    confident: 'assets/student/confident.png'
  };

  const MOTIVES = ['Stay calm. Think smart.','Breathe. You know this.','One question at a time.','Confidence beats panic.','Trust your prep.','Keep your cool.','You\u2019ve got this.'];

  let impressedUntil = 0;   // keeps the impressed face on screen after a correct answer

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
  function setProfByAnger(){
    if(Date.now() < impressedUntil) return;            // don't override the impressed face yet
    const img=ensureProfImg(); if(img){ const s=profSrc(anger()); if(img.getAttribute('src')!==s) img.src=s; }
  }
  function setProfImpressed(){ impressedUntil = Date.now()+1600; const img=ensureProfImg(); if(img) img.src=PROF_IMPRESSED; }

  function setStud(state){
    const img=document.getElementById('rd-student-img'); if(!img) return;
    const s=STUD[state]||STUD.nervous;
    if(img.getAttribute('src')!==s) img.src=s;
    const p=document.getElementById('rd-student'); if(p) p.classList.remove('noimg');
  }

  /* ---------- fullscreen (B) ---------- */
  function isMobile(){ return matchMedia('(pointer:coarse)').matches || innerWidth<900; }
  function fsElement(){ return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFS(){
    const el=document.getElementById('game-container')||document.documentElement;
    if(!fsElement()){ const rf=el.requestFullscreen||el.webkitRequestFullscreen; if(rf){ try{ rf.call(el); }catch(e){} } }
    else { const ef=document.exitFullscreen||document.webkitExitFullscreen; if(ef){ try{ ef.call(document); }catch(e){} } }
  }
  function addFSButton(){
    if(!isMobile()) return;
    const host=document.querySelector('#game-screen .rd-hud'); if(!host || document.getElementById('rd-fs')) return;
    const b=document.createElement('button'); b.id='rd-fs'; b.type='button'; b.title='Fullscreen'; b.setAttribute('aria-label','Fullscreen');
    b.textContent='⛶'; b.onclick=toggleFS; host.appendChild(b);
  }

  window.addEventListener('load',function(){
    [PROF_IMPRESSED,'assets/classroom.png',...PROF_BY_ANGER.map(p=>p.src),...Object.values(STUD)].forEach(u=>{ const i=new Image(); i.src=u; });
    addFSButton();
    // freeze guard: old effect fns append to elements removed in the redesign -> make them safe
    ['spawnParticles','createParticles','spawnConfetti','shakeScreen','flashScreen'].forEach(function(fn){
      if(typeof window[fn]==='function'){ const _o=window[fn]; window[fn]=function(){ try{ return _o.apply(this,arguments); }catch(e){} }; }
    });
  });

  /* professor + student rendering (was SVG) */
  window.renderProfessor=function(){ setProfByAnger(); };
  window.setProfExpression=function(state){
    const fx=document.getElementById('prof-angry-fx');
    if(fx) fx.style.display=(state==='angry'||state==='very-angry')?'block':'none';
    if(state==='happy'){
      setProfImpressed();                               // impressed on correct (sticks ~1.6s)
      setStud(streak()>=3 ? 'confident' : 'happy');
      if(typeof playHappyChime==='function') playHappyChime();
    } else if(state==='angry' || state==='very-angry'){
      setProfByAnger(); setStud('panic');
      if(state==='very-angry'){ flashScene(); shakeProf(); }
      if(typeof playAngrySound==='function') playAngrySound();
    } else {
      setProfByAnger(); setStud('nervous');
    }
  };
  function flashScene(){ const f=document.getElementById('rd-flash'); if(!f) return; f.style.opacity=.5; setTimeout(()=>f.style.opacity=0,150); }
  function shakeProf(){ const p=document.querySelector('#game-screen .rd-prof'); if(!p) return; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); setTimeout(()=>p.classList.remove('shake'),420); }

  /* context strip */
  function updateContext(){
    try{
      const subj=(typeof getSubject==='function'&&gameState.subject)?getSubject(gameState.subject):null;
      const st=document.getElementById('rd-subject'); if(st) st.textContent=subj?(subj.icon+' '+subj.name):'\uD83D\uDCDA Mixed';
      const df=document.getElementById('rd-diff'); if(df) df.textContent=(gameState.difficulty||'medium').replace(/^./,c=>c.toUpperCase());
      const pr=document.getElementById('rd-progress'); if(pr){ const p=Math.round((((gameState.currentQ||0)+(gameState.answered?1:0))/(gameState.totalQ||10))*100); pr.style.width=Math.max(0,Math.min(100,p))+'%'; }
    }catch(e){}
    setProfByAnger();
  }

  if(typeof updateHUD==='function'){ const _u=updateHUD; window.updateHUD=function(){ _u.apply(this,arguments); updateContext(); }; }
  if(typeof loadQuestion==='function'){ const _l=loadQuestion; window.loadQuestion=function(){ _l.apply(this,arguments);
    impressedUntil=0;                                   // new question -> clear impressed hold
    const m=document.getElementById('rd-motivate'); if(m) m.textContent=MOTIVES[Math.floor(Math.random()*MOTIVES.length)];
    const pr=document.getElementById('rd-progress'); if(pr){ const p=Math.round(((gameState.currentQ||0)/(gameState.totalQ||10))*100); pr.style.width=p+'%'; }
    setStud('nervous'); setProfByAnger(); updateContext();
  }; }

  /* lifelines */
  function markUsed(btnId,countId){ const b=document.getElementById(btnId); if(b) b.classList.add('used'); const c=document.getElementById(countId); if(c) c.textContent='x0'; }
  if(typeof useHint==='function'){ const _h=useHint; window.useHint=function(){ _h.apply(this,arguments); markUsed('btn-hint','hint-count'); const ai=document.getElementById('rd-aihint'); if(ai){ ai.textContent='\uD83D\uDCA1 Hint used'; ai.classList.add('used'); } }; }
  if(typeof useFiftyFifty==='function'){ const _f=useFiftyFifty; window.useFiftyFifty=function(){ _f.apply(this,arguments); markUsed('btn-5050','fifty-count'); }; }

  /* circular timer */
  if(typeof startTimer==='function'){ const _s=startTimer; window.startTimer=function(){ _s.apply(this,arguments);
    const ring=document.getElementById('rd-ring'), num=document.getElementById('timer-num'), orb=document.getElementById('timer-display');
    const dur=parseInt(num&&num.textContent)||15; if(orb) orb.classList.remove('urgent');
    if(ring){ ring.style.animation='none'; void ring.offsetWidth; ring.style.animation='rdRing '+dur+'s linear forwards'; } }; }
  if(typeof stopTimer==='function'){ const _st=stopTimer; window.stopTimer=function(){ _st.apply(this,arguments); const r=document.getElementById('rd-ring'); if(r) r.style.animationPlayState='paused'; }; }

  /* landscape + cinematic start */
  function goLandscape(){ if(!isMobile()) return;
    try{ const el=document.getElementById('game-container')||document.documentElement; const rf=el.requestFullscreen||el.webkitRequestFullscreen; if(rf) rf.call(el); }catch(e){}
    try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(function(){}); }catch(e){}
    setTimeout(checkRotate,400); }
  function checkRotate(){ const h=document.getElementById('rotate-hint'); if(!h) return; const g=document.getElementById('game-screen');
    h.classList.toggle('show', isMobile()&&matchMedia('(orientation:portrait)').matches&&g&&g.classList.contains('active')); }
  window.addEventListener('orientationchange',()=>setTimeout(checkRotate,300));
  window.addEventListener('resize',checkRotate);

  if(typeof startGame==='function'){ const _sg=startGame; window.startGame=function(){
    if(typeof playStartSound==='function'){ try{ playStartSound(); }catch(e){} }
    const ov=document.getElementById('cine-transition'); if(ov){ ov.classList.remove('play'); void ov.offsetWidth; ov.classList.add('play'); }
    goLandscape();
    const args=arguments, self=this;
    setTimeout(function(){ _sg.apply(self,args);
      addFSButton();
      const g=document.getElementById('game-screen'); if(g){ g.classList.remove('cine-in'); void g.offsetWidth; g.classList.add('cine-in'); }
      ['btn-hint','btn-5050'].forEach(id=>{ const b=document.getElementById(id); if(b) b.classList.remove('used'); });
      const hc=document.getElementById('hint-count'); if(hc) hc.textContent='x1';
      const fc=document.getElementById('fifty-count'); if(fc) fc.textContent='x1';
      const ai=document.getElementById('rd-aihint'); if(ai){ ai.textContent='\uD83D\uDCA1 Hint ready'; ai.classList.remove('used'); }
      impressedUntil=0; setStud('nervous'); setProfByAnger(); updateContext();
    },300);
    setTimeout(function(){ if(ov) ov.classList.remove('play'); },1000);
  }; }
})();
