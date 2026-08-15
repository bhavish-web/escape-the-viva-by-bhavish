/* ============================================================
   ESCAPE THE VIVA — Save progress to Supabase
   Saves each answered question to `attempts` and each finished
   game to `games`. Only when a user is logged in (guests skip).
   Crash-proof: never breaks the game if saving fails.
   ============================================================ */
(function(){
  "use strict";

  function client(){ return window.supaClient || null; }
  function user(){ return window.CURRENT_USER || null; }
  function canSave(){ return client() && user(); }

  // buffer of per-question attempts for the current game
  let attemptBuffer = [];

  function currentSubjectName(){
    try{
      // AI viva uses a chosen topic/unit as subject label; built-in uses gameState.subject
      if (window.AI_QUESTIONS && Array.isArray(window.AI_QUESTIONS) && window.AI_QUESTIONS.length){
        // AI game — use the subject stored on the question if present
      }
      const subj = (typeof getSubject === 'function' && gameState.subject) ? getSubject(gameState.subject) : null;
      if (subj && subj.name) return subj.name;
      if (gameState.subject) return String(gameState.subject);
      return 'AI Viva';
    }catch(e){ return 'Unknown'; }
  }

  function record(q, isCorrect){
    try{
      if(!canSave() || !q) return;
      attemptBuffer.push({
        user_id: user().id,
        subject: currentSubjectName(),
        unit: (typeof selectedTopic !== 'undefined' && selectedTopic) ? String(selectedTopic) : null,
        topic: q.topic || null,
        bloom: (typeof q.bloom === 'string') ? q.bloom.toUpperCase() : null,
        is_correct: !!isCorrect,
        time_taken: (typeof gameState.timeLeft === 'number') ? Math.max(0, (diffTime() - gameState.timeLeft)) : null,
        mode: gameState.mode || 'viva'
      });
    }catch(e){ /* ignore */ }
  }

  function diffTime(){
    try{ return (diffConfig[gameState.difficulty] || {}).time || 10; }catch(e){ return 10; }
  }

  async function flush(){
    try{
      if(!canSave() || attemptBuffer.length===0) return;
      const rows = attemptBuffer.slice();
      attemptBuffer = [];
      // save all attempts for this game
      await client().from('attempts').insert(rows);

      // save one game summary row
      const s = gameState;
      const total = s.totalQ || rows.length;
      const correct = rows.filter(r=>r.is_correct).length;
      await client().from('games').insert({
        user_id: user().id,
        subject: currentSubjectName(),
        unit: rows.length ? rows[0].unit : null,
        difficulty: s.difficulty || null,
        mode: s.mode || 'viva',
        total_q: total,
        correct_q: correct,
        score: s.score || 0,
        accuracy: total ? Math.round((correct/total)*100) : 0
      });

      // ---- Award XP (10 per correct answer + 1 per 10 score points) + streak ----
      try{
        const earned = correct*10 + Math.floor((s.score||0)/10);
        const uid = user().id;
        const { data: prof } = await client().from('profiles')
          .select('xp,best_streak,current_streak,last_played').eq('id', uid).single();
        const curXp = (prof && prof.xp) ? prof.xp : 0;
        const curBest = (prof && prof.best_streak) ? prof.best_streak : 0;

        // streak logic based on last_played date
        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = today.toISOString().slice(0,10);
        let streak = (prof && prof.current_streak) ? prof.current_streak : 0;
        const last = (prof && prof.last_played) ? new Date(prof.last_played) : null;
        if(last){
          last.setHours(0,0,0,0);
          const diffDays = Math.round((today - last)/86400000);
          if(diffDays === 0){ /* already played today — streak unchanged */ }
          else if(diffDays === 1){ streak = streak + 1; }   // consecutive day
          else { streak = 1; }                              // missed day(s) — reset
        } else {
          streak = 1; // first ever play
        }

        await client().from('profiles').update({
          xp: curXp + earned,
          best_streak: Math.max(curBest, streak, s.bestStreak||0),
          current_streak: streak,
          last_played: todayStr
        }).eq('id', uid);
        window.CURRENT_STREAK = streak;
      }catch(xe){ console.warn('xp/streak update skipped', xe); }
    }catch(e){ console.warn('save-progress flush failed', e); }
  }

  /* crash-proof wrap helper (run original first) */
  function wrap(name, after){
    if(typeof window[name]==='function'){
      const _o=window[name];
      window[name]=function(){ const r=_o.apply(this,arguments); try{ after.apply(this,arguments);}catch(e){} return r; };
    }
  }

  window.addEventListener('load', function(){
    // reset buffer when a new game starts
    wrap('startGame', function(){ attemptBuffer=[]; });

    // record each answer (selectAnswer receives the chosen index)
    wrap('selectAnswer', function(idx){
      try{
        const q = questions[gameState.currentQ];
        if(q) record(q, idx === q.correct);
      }catch(e){}
    });

    // on end screen, flush everything to the DB
    wrap('showEndScreen', function(){ flush(); });
  });
})();
