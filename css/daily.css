/* ============================================================
   ESCAPE THE VIVA — Daily Challenge
   Same 10 questions for everyone each day (seeded by date).
   Separate daily streak, tracked locally. Crash-proof.
   ============================================================ */
(function(){
  "use strict";
  function $(id){ return document.getElementById(id); }

  // --- deterministic seeded RNG (mulberry32) so all users get same set/day ---
  function seedFromDate(){
    const d = new Date();
    const key = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
    return key >>> 0;
  }
  function mulberry32(a){
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededPick(arr, count, rng){
    const copy = arr.slice();
    // Fisher-Yates using the seeded rng
    for(let i=copy.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy.slice(0, count);
  }

  function todayStr(){ return new Date().toISOString().slice(0,10); }

  // --- local daily-streak tracking ---
  function getDaily(){
    try{ return JSON.parse(localStorage.getItem('etv_daily')||'{}'); }catch(e){ return {}; }
  }
  function setDaily(o){ try{ localStorage.setItem('etv_daily', JSON.stringify(o)); }catch(e){} }

  window.isDailyDoneToday = function(){
    const d=getDaily(); return d.lastDone === todayStr();
  };
  window.getDailyStreak = function(){ return getDaily().streak || 0; };

  function markDailyDone(){
    const d=getDaily(); const t=todayStr();
    if(d.lastDone === t) return; // already counted today
    // streak logic
    const y = new Date(); y.setDate(y.getDate()-1);
    const yStr = y.toISOString().slice(0,10);
    if(d.lastDone === yStr) d.streak = (d.streak||0)+1;
    else d.streak = 1;
    d.lastDone = t;
    setDaily(d);
  }

  // --- start the daily challenge ---
  window.startDailyChallenge = function(){
    try{
      if(typeof allQuestions==='undefined' || !allQuestions.length){ alert('Daily challenge unavailable right now.'); return; }
      const rng = mulberry32(seedFromDate());
      const picked = seededPick(allQuestions, 10, rng).map(q =>
        (typeof randomizeAnswers==='function') ? randomizeAnswers(q) : q
      );
      window.questions = picked;

      // set up game state as a scored Viva-style run, medium timing
      if(typeof gameState==='object'){
        gameState.mode = 'viva';
        gameState.subject = 'daily';
        gameState.difficulty = 'medium';
      }
      window.__DAILY_ACTIVE = true;

      // hand off to the engine's start using our pre-built questions
      if(typeof playStartSound==='function') playStartSound();
      // mimic startGame's screen switch + state init but keep our questions
      gameState = {
        currentQ: 0, stress: 20, anger: 10,
        score: 0, correctCount: 0, answered: false,
        totalQ: 10, streak: 0, bestStreak: 0,
        timeLeft: (diffConfig['medium']||{time:10}).time,
        difficulty: 'medium', mode: 'viva',
        lifelineUsed5050: false, lifelineUsedHint: false, lifelineUsedAsk: false,
        achievements: [], subject: 'Daily Challenge', advancing: false
      };
      questions = picked;
      document.getElementById('start-screen').classList.remove('active');
      document.getElementById('end-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
      if(typeof loadQuestion==='function') loadQuestion();
    }catch(e){ console.warn('daily challenge failed', e); }
  };

  // mark done when a daily game ends
  window.addEventListener('load', function(){
    if(typeof window.showEndScreen==='function'){
      const _o = window.showEndScreen;
      window.showEndScreen = function(){
        const r = _o.apply(this, arguments);
        try{ if(window.__DAILY_ACTIVE){ markDailyDone(); window.__DAILY_ACTIVE=false; refreshDailyBtn(); } }catch(e){}
        return r;
      };
    }
    refreshDailyBtn();
  });

  // update the button label/state
  window.refreshDailyBtn = function(){
    const btn=$('daily-btn'); if(!btn) return;
    const done = window.isDailyDoneToday();
    const streak = window.getDailyStreak();
    const sTxt = streak>0 ? ' 🔥'+streak : '';
    if(done){
      btn.innerHTML = '✅ Daily Done'+sTxt;
      btn.classList.add('daily-done');
    }else{
      btn.innerHTML = '📅 Daily Challenge'+sTxt;
      btn.classList.remove('daily-done');
    }
  };
})();
