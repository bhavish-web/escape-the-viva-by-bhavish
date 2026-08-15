/* ============================================================
   ESCAPE THE VIVA — Dashboard (real Supabase data)
   Wave 1: main dashboard (readiness, subjects, at-a-glance) + nav.
   Weak Areas / Leaderboard / Achievements sections wired too.
   ============================================================ */
(function(){
  "use strict";
  function $(id){ return document.getElementById(id); }
  function client(){ return window.supaClient || null; }
  function user(){ return window.CURRENT_USER || null; }

  let cache = null;   // fetched rows cached per dashboard open

  /* ---------- open / close ---------- */
  window.showDashboard = function(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const d=$('dashboard-screen'); if(d) d.classList.add('active');
    renderShellStatic();
    loadData();          // fetch + fill real data
    dashNav('home');
  };
  window.enterGameFromDash = function(){
    const d=$('dashboard-screen'); if(d) d.classList.remove('active');
    const start=$('start-screen'); if(start) start.classList.add('active');
  };
  window.toggleDashSidebar = function(){
    const s=document.querySelector('.dash-side'); if(s) s.classList.toggle('open');
  };
  window.refreshDashPill = function(){
    const pill=$('dash-pill'); if(!pill) return;
    if(user()){
      const nmEl=$('dash-pill-name'); if(nmEl) nmEl.textContent=greetingName();
      const av=$('dash-pill-avatar'); if(av) av.src=avatarSrc();
      pill.style.display='inline-flex';
    } else { pill.style.display='none'; }
  };

  /* ---------- section navigation ---------- */
  window.dashNav = function(section){
    document.querySelectorAll('.dash-section').forEach(s=>s.style.display='none');
    const el=$('sec-'+section); if(el) el.style.display='block';
    document.querySelectorAll('.dash-nav a[data-sec]').forEach(a=>{
      a.classList.toggle('active', a.getAttribute('data-sec')===section);
    });
    // close mobile sidebar after choosing
    const sb=document.querySelector('.dash-side'); if(sb) sb.classList.remove('open');
    if(section==='leaderboard') loadLeaderboard();
    if(section==='weak') renderWeak();
    if(section==='achievements') renderAchievements();
    if(section==='analytics') renderAnalytics();
  };

  /* ---------- identity ---------- */
  function greetingName(){
    try{
      const u=user();
      if(u && u.user_metadata && u.user_metadata.display_name) return u.user_metadata.display_name;
      if(u && u.email) return u.email.split('@')[0];
    }catch(e){}
    return 'Student';
  }
  function avatarSrc(){ return 'assets/avatars/'+(window.CURRENT_AVATAR||'1')+'.png'; }

  function renderShellStatic(){
    const nm=greetingName();
    const hi=$('dash-hi-name'); if(hi) hi.textContent=nm;
    const sf=$('dash-foot-name'); if(sf) sf.textContent=nm;
    document.querySelectorAll('.dash-avatar').forEach(img=>{ img.src=avatarSrc(); });
  }

  /* ---------- data fetch ---------- */
  async function loadData(){
    if(!client() || !user()){ showEmpty(); return; }
    try{
      const uid = user().id;
      const [{ data:attempts }, { data:games }, { data:prof }] = await Promise.all([
        client().from('attempts').select('subject,unit,topic,bloom,is_correct,created_at').eq('user_id', uid),
        client().from('games').select('subject,accuracy,score,correct_q,total_q,created_at').eq('user_id', uid).order('created_at',{ascending:true}),
        client().from('profiles').select('xp,current_streak,best_streak').eq('id', uid).single()
      ]);
      cache = { attempts: attempts||[], games: games||[], profile: prof||{} };
      fillMain(cache);
    }catch(e){ console.warn('dashboard load failed', e); showEmpty(); }
  }

  function pct(correct, total){ return total ? Math.round(correct/total*100) : 0; }

  function fillMain(d){
    const A=d.attempts, G=d.games;
    const totalQ=A.length;
    const correct=A.filter(a=>a.is_correct).length;
    const overall=pct(correct,totalQ);

    // Exam readiness = overall accuracy
    setRing('ready-ring', overall);
    const rt=$('ready-pct'); if(rt) rt.textContent=overall+'%';

    // At a glance
    setText('gl-attempted', totalQ);
    setText('gl-correct', correct);
    setText('gl-accuracy', overall+'%');
    setText('gl-games', G.length);

    // Subjects: group attempts by subject
    const bySubj={};
    A.forEach(a=>{
      const s=a.subject||'Unknown';
      (bySubj[s]=bySubj[s]||{c:0,t:0,topics:new Set()});
      bySubj[s].t++; if(a.is_correct) bySubj[s].c++;
      if(a.topic) bySubj[s].topics.add(a.topic);
    });
    renderSubjects(bySubj);

    // Progress over time (accuracy per game)
    renderProgressInto('prog-svg', G);

    // Real streak
    const streak = (d.profile && d.profile.current_streak) ? d.profile.current_streak : 0;
    const stEl=$('dash-streak-num');
    if(stEl){
      if(streak>0){ stEl.innerHTML='<div style="font-size:44px;">🔥</div><div style="font-size:32px;font-weight:900;color:#f0b429;">'+streak+' day'+(streak>1?'s':'')+'</div><div style="font-size:11px;color:#9a9184;margin-top:4px;">in a row — keep it alive!</div>'; }
      else { stEl.innerHTML='<div style="font-size:44px;">🔥</div><div style="font-size:22px;font-weight:900;color:#f0b429;">Start today!</div><div style="font-size:11px;color:#9a9184;margin-top:4px;">Play daily to build a streak</div>'; }
    }

    // mini weak preview on home
    renderWeakMini();

    // hide the "sample data" note
    const note=$('dash-sample-note'); if(note) note.style.display='none';
  }

  function renderWeakMini(){
    const box=$('weak-mini'); if(!box) return;
    if(!cache || cache.attempts.length===0){ box.innerHTML='<div style="color:#9a9184;font-size:12px;padding:8px 0;">No data yet.</div>'; return; }
    const byTopic={};
    cache.attempts.forEach(a=>{ if(a.topic){ (byTopic[a.topic]=byTopic[a.topic]||{c:0,t:0}); byTopic[a.topic].t++; if(a.is_correct) byTopic[a.topic].c++; } });
    const topics=Object.keys(byTopic).map(k=>({k,p:pct(byTopic[k].c,byTopic[k].t)})).sort((a,b)=>a.p-b.p).slice(0,2);
    box.innerHTML=topics.map(t=>'<div class="weak-item"><div class="weak-top"><span>'+escapeHtml(t.k)+'</span><span class="wp">'+t.p+'%</span></div><div class="weak-bar"><div class="weak-fill" style="width:'+t.p+'%"></div></div></div>').join('');
  }

  function renderSubjects(bySubj){
    const wrap=$('subjects-wrap'); if(!wrap) return;
    const names=Object.keys(bySubj);
    if(names.length===0){
      wrap.innerHTML='<div class="card" style="grid-column:1/-1;text-align:center;color:#9a9184;">No subjects played yet — start a game to see your prep %.</div>';
      return;
    }
    const colors=['#a78bff','#4ee1ff','#2ecc71','#ff9f45','#f0b429','#ff6ad5'];
    wrap.innerHTML='';
    names.slice(0,6).forEach((name,i)=>{
      const s=bySubj[name]; const p=pct(s.c,s.t);
      const tag = p>=75?['strong','Strong ↗'] : p>=60?['good','Good ↗'] : p>=45?['avg','Average →'] : ['weak','Weak ↘'];
      const col=colors[i%colors.length];
      const r=42, circ=2*Math.PI*r, off=circ*(1-p/100);
      const card=document.createElement('div'); card.className='card';
      card.innerHTML=
        '<div class="subj-name">📘 '+escapeHtml(name)+'</div>'+
        '<div class="subj-ring"><svg width="104" height="104" viewBox="0 0 100 100">'+
          '<circle class="sbg" cx="50" cy="50" r="42"></circle>'+
          '<circle class="sfg" cx="50" cy="50" r="42" style="stroke:'+col+';stroke-dasharray:'+circ+';stroke-dashoffset:'+off+'"></circle>'+
        '</svg><b>'+p+'%</b></div>'+
        '<div class="subj-tag '+tag[0]+'">'+tag[1]+'</div>'+
        '<div class="subj-topics">'+s.topics.size+(s.topics.size===1?' topic':' topics')+' practiced</div>';
      wrap.appendChild(card);
    });
  }

  function renderProgress(G){
    const svg=$('prog-svg'); if(!svg) return;
    if(!G || G.length===0){ svg.innerHTML='<text x="250" y="105" fill="#6f685e" font-size="13" text-anchor="middle">Play games to see your progress</text>'; return; }
    const pts=G.slice(-8).map(g=>g.accuracy||0);
    const W=500,H=200,pad=24;
    const stepX=(W-pad*2)/Math.max(1,pts.length-1);
    const xy=pts.map((v,i)=>[pad+i*stepX, H-pad-(v/100)*(H-pad*2)]);
    const line=xy.map(p=>p[0].toFixed(0)+','+p[1].toFixed(0)).join(' ');
    const area=line+' '+(pad+(pts.length-1)*stepX).toFixed(0)+','+(H-pad)+' '+pad+','+(H-pad);
    let dots=xy.map(p=>'<circle cx="'+p[0].toFixed(0)+'" cy="'+p[1].toFixed(0)+'" r="4.5" fill="#f0b429"/>').join('');
    let labels=xy.map((p,i)=>'<text x="'+p[0].toFixed(0)+'" y="'+(p[1]-10).toFixed(0)+'" fill="#e8e2d8" font-size="11" text-anchor="middle">'+pts[i]+'%</text>').join('');
    svg.innerHTML=
      '<polygon fill="rgba(240,180,41,0.12)" points="'+area+'"/>'+
      '<polyline fill="none" stroke="#f0b429" stroke-width="3" points="'+line+'"/>'+dots+labels;
  }

  function showEmpty(){
    setRing('ready-ring',0);
    const rt=$('ready-pct'); if(rt) rt.textContent='0%';
    ['gl-attempted','gl-correct','gl-accuracy','gl-games'].forEach(id=>setText(id,'0'));
    const wrap=$('subjects-wrap'); if(wrap) wrap.innerHTML='<div class="card" style="grid-column:1/-1;text-align:center;color:#9a9184;">Play a game while logged in to see your stats here.</div>';
    const svg=$('prog-svg'); if(svg) svg.innerHTML='<text x="250" y="105" fill="#6f685e" font-size="13" text-anchor="middle">No games yet</text>';
  }

  /* ---------- WEAK AREAS ---------- */
  function renderWeak(){
    const box=$('weak-body'); if(!box) return;
    if(!cache || cache.attempts.length===0){ box.innerHTML='<div style="color:#9a9184;text-align:center;padding:20px;">No data yet — play a few games first.</div>'; return; }
    const byTopic={}, byBloom={};
    cache.attempts.forEach(a=>{
      if(a.topic){ (byTopic[a.topic]=byTopic[a.topic]||{c:0,t:0}); byTopic[a.topic].t++; if(a.is_correct) byTopic[a.topic].c++; }
      if(a.bloom){ (byBloom[a.bloom]=byBloom[a.bloom]||{c:0,t:0}); byBloom[a.bloom].t++; if(a.is_correct) byBloom[a.bloom].c++; }
    });
    const topics=Object.keys(byTopic).map(k=>({k,p:pct(byTopic[k].c,byTopic[k].t)})).sort((a,b)=>a.p-b.p).slice(0,5);
    const blooms=Object.keys(byBloom).map(k=>({k,p:pct(byBloom[k].c,byBloom[k].t)})).sort((a,b)=>a.p-b.p);
    const bloomNames={L1:'Remember',L2:'Understand',L3:'Apply',L4:'Analyze',L5:'Evaluate',L6:'Create'};
    let html='';
    topics.forEach(t=>{
      html+='<div class="weak-item"><div class="weak-top"><span>'+escapeHtml(t.k)+'</span><span class="wp">'+t.p+'%</span></div><div class="weak-bar"><div class="weak-fill" style="width:'+t.p+'%"></div></div></div>';
    });
    if(blooms.length){ const w=blooms[0]; html+='<div class="weak-bloom"><small>Weakest Bloom\u2019s Level</small><b>'+w.k+' · '+(bloomNames[w.k]||'')+' ('+w.p+'%)</b></div>'; }
    html+='<button class="weak-cta" onclick="enterGameFromDash()">⚡ Practice Weak Spots</button>';
    box.innerHTML=html;
  }

  /* ---------- LEADERBOARD ---------- */
  let lbPeriod = 'all';
  window.setLbPeriod = function(p){
    lbPeriod = p;
    document.querySelectorAll('.lb-tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-lb')===p));
    loadLeaderboard();
  };

  async function loadLeaderboard(){
    const box=$('leaderboard-body'); if(!box) return;
    if(!client()){ box.innerHTML='<div style="color:#9a9184;">Log in to see the leaderboard.</div>'; return; }
    box.innerHTML='<div style="color:#9a9184;">Loading…</div>';
    try{
      const myName=greetingName();

      if(lbPeriod==='all'){
        // All-time: rank by total XP
        const { data } = await client().from('profiles').select('display_name,xp,avatar_url').order('xp',{ascending:false}).limit(10);
        if(!data || data.length===0){ box.innerHTML='<div style="color:#9a9184;">No players yet.</div>'; return; }
        box.innerHTML = data.map((p,i)=>lbRow(i, p.display_name, p.avatar_url, (p.xp||0)+' XP', p.display_name===myName)).join('');
        return;
      }

      // Week/Month: sum score from games in the period, per user, then join names
      const since = new Date();
      if(lbPeriod==='week') since.setDate(since.getDate()-7);
      else since.setMonth(since.getMonth()-1);
      const sinceStr = since.toISOString();

      const [{ data:games }, { data:profs }] = await Promise.all([
        client().from('games').select('user_id,score,created_at').gte('created_at', sinceStr),
        client().from('profiles').select('id,display_name,avatar_url')
      ]);
      if(!games || games.length===0){ box.innerHTML='<div style="color:#9a9184;">No games played in this period yet.</div>'; return; }

      const byUser={};
      games.forEach(g=>{ byUser[g.user_id]=(byUser[g.user_id]||0)+(g.score||0); });
      const profMap={}; (profs||[]).forEach(p=>{ profMap[p.id]=p; });
      const ranked=Object.keys(byUser).map(uid=>({
        name: profMap[uid] ? profMap[uid].display_name : 'Player',
        avatar: profMap[uid] ? profMap[uid].avatar_url : '1',
        pts: byUser[uid]
      })).sort((a,b)=>b.pts-a.pts).slice(0,10);

      box.innerHTML = ranked.map((r,i)=>lbRow(i, r.name, r.avatar, r.pts+' pts', r.name===myName)).join('');
    }catch(e){ box.innerHTML='<div style="color:#9a9184;">Couldn\u2019t load leaderboard.</div>'; }
  }

  function lbRow(i, name, avatarNum, valueText, isMe){
    const av = avatarNum && /^[0-9]+$/.test(avatarNum) ? 'assets/avatars/'+avatarNum+'.png' : 'assets/avatars/1.png';
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    return '<div class="lb-row'+(isMe?' me':'')+'"><span class="lb-rank">'+medal+'</span>'+
           '<img class="lb-av" src="'+av+'"><span class="lb-name">'+escapeHtml(name||'Player')+(isMe?' (You)':'')+'</span>'+
           '<span class="lb-xp">'+valueText+'</span></div>';
  }

  /* ---------- ACHIEVEMENTS ---------- */
  function renderAchievements(){
    const box=$('achievements-body'); if(!box) return;
    const defs=[
      {ic:'🩸',name:'First Blood',desc:'Answer your first question',need:a=>a.length>=1},
      {ic:'🔥',name:'On Fire',desc:'Answer 25 questions',need:a=>a.length>=25},
      {ic:'💯',name:'Century',desc:'Answer 100 questions',need:a=>a.length>=100},
      {ic:'🎯',name:'Sharpshooter',desc:'Reach 80% overall accuracy',need:a=>{const c=a.filter(x=>x.is_correct).length;return a.length>=10 && c/a.length>=0.8;}},
      {ic:'🧠',name:'Deep Thinker',desc:'Answer an L5/L6 question correctly',need:a=>a.some(x=>x.is_correct && (x.bloom==='L5'||x.bloom==='L6'))},
      {ic:'📚',name:'Explorer',desc:'Play 3 different subjects',need:a=>new Set(a.map(x=>x.subject)).size>=3}
    ];
    const A=(cache&&cache.attempts)||[];
    box.innerHTML=defs.map(d=>{
      const got=d.need(A);
      return '<div class="ach-card'+(got?' got':'')+'"><div class="ach-ic">'+d.ic+'</div><div class="ach-nm">'+d.name+'</div><div class="ach-ds">'+d.desc+'</div>'+(got?'<div class="ach-badge">Unlocked</div>':'<div class="ach-lock">🔒 Locked</div>')+'</div>';
    }).join('');
  }

  /* ---------- ANALYTICS ---------- */
  function renderAnalytics(){
    const A=(cache&&cache.attempts)||[], G=(cache&&cache.games)||[], P=(cache&&cache.profile)||{};
    // totals
    setText('an-games', G.length);
    setText('an-questions', A.length);
    setText('an-streak', P.best_streak||0);
    setText('an-xp', P.xp||0);

    // accuracy over time (bigger graph, reuse renderer into an-prog-svg)
    renderProgressInto('an-prog-svg', G);

    // Bloom's breakdown
    const bloomBox=$('an-bloom');
    if(bloomBox){
      const byB={};
      A.forEach(a=>{ if(a.bloom){ (byB[a.bloom]=byB[a.bloom]||{c:0,t:0}); byB[a.bloom].t++; if(a.is_correct) byB[a.bloom].c++; } });
      const names={L1:'Remember',L2:'Understand',L3:'Apply',L4:'Analyze',L5:'Evaluate',L6:'Create'};
      const order=['L1','L2','L3','L4','L5','L6'];
      const have=order.filter(l=>byB[l]);
      if(have.length===0){ bloomBox.innerHTML='<div style="color:#9a9184;font-size:12px;padding:16px 0;text-align:center;">Play AI Viva questions (they carry Bloom levels) to see this.</div>'; }
      else{
        bloomBox.innerHTML=order.map(l=>{
          if(!byB[l]) return '';
          const p=pct(byB[l].c,byB[l].t);
          const col = p>=70?'#2ecc71':p>=45?'#f0b429':'#e63030';
          return '<div class="an-bloom-row"><span class="an-bloom-lbl">'+l+' · '+names[l]+'</span>'+
                 '<div class="an-bloom-bar"><div class="an-bloom-fill" style="width:'+p+'%;background:'+col+'"></div></div>'+
                 '<span class="an-bloom-pct">'+p+'%</span></div>';
        }).join('');
      }
    }

    // Accuracy by subject
    const subjBox=$('an-subjects');
    if(subjBox){
      const byS={};
      A.forEach(a=>{ const s=a.subject||'Unknown'; (byS[s]=byS[s]||{c:0,t:0}); byS[s].t++; if(a.is_correct) byS[s].c++; });
      const names=Object.keys(byS);
      if(names.length===0){ subjBox.innerHTML='<div style="color:#9a9184;font-size:12px;padding:8px 0;">No subjects yet.</div>'; }
      else{
        subjBox.innerHTML=names.map(n=>{
          const p=pct(byS[n].c,byS[n].t);
          const col = p>=70?'#2ecc71':p>=45?'#f0b429':'#e63030';
          return '<div class="an-bloom-row"><span class="an-bloom-lbl">'+escapeHtml(n)+'</span>'+
                 '<div class="an-bloom-bar"><div class="an-bloom-fill" style="width:'+p+'%;background:'+col+'"></div></div>'+
                 '<span class="an-bloom-pct">'+p+'%</span></div>';
        }).join('');
      }
    }
  }

  // generic progress renderer (used by home + analytics)
  function renderProgressInto(svgId, G){
    const svg=$(svgId); if(!svg) return;
    if(!G || G.length===0){ svg.innerHTML='<text x="250" y="110" fill="#6f685e" font-size="13" text-anchor="middle">Play games to see your progress</text>'; return; }
    const pts=G.slice(-8).map(g=>g.accuracy||0);
    const W=500,H=220,pad=30;
    // faint horizontal gridlines at 0/25/50/75/100
    let grid='';
    [0,25,50,75,100].forEach(v=>{
      const y=H-pad-(v/100)*(H-pad*2);
      grid+='<line x1="'+pad+'" y1="'+y.toFixed(0)+'" x2="'+(W-pad)+'" y2="'+y.toFixed(0)+'" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
      grid+='<text x="'+(pad-6)+'" y="'+(y+4).toFixed(0)+'" fill="#6f685e" font-size="9" text-anchor="end">'+v+'</text>';
    });
    const stepX=(W-pad*2)/Math.max(1,pts.length-1);
    const xy=pts.map((v,i)=>[pad+i*stepX, H-pad-(v/100)*(H-pad*2)]);
    const line=xy.map(p=>p[0].toFixed(0)+','+p[1].toFixed(0)).join(' ');
    const area=line+' '+(pad+(pts.length-1)*stepX).toFixed(0)+','+(H-pad)+' '+pad+','+(H-pad);
    const dots=xy.map(p=>'<circle cx="'+p[0].toFixed(0)+'" cy="'+p[1].toFixed(0)+'" r="4.5" fill="#f0b429" stroke="#1a1206" stroke-width="1.5"/>').join('');
    const labels=xy.map((p,i)=>'<text x="'+p[0].toFixed(0)+'" y="'+(p[1]-11).toFixed(0)+'" fill="#f0e0c0" font-size="11" font-weight="700" text-anchor="middle">'+pts[i]+'%</text>').join('');
    svg.innerHTML=grid+
      '<polygon fill="rgba(240,180,41,0.12)" points="'+area+'"/>'+
      '<polyline fill="none" stroke="#f0b429" stroke-width="3" points="'+line+'"/>'+dots+labels;
  }

  /* ---------- helpers ---------- */
  function setRing(id, p){
    const c=$(id); if(!c) return;
    const r=52, circ=2*Math.PI*r;
    c.style.strokeDasharray=circ;
    c.style.strokeDashoffset=circ*(1-p/100);
  }
  function setText(id,v){ const e=$(id); if(e) e.textContent=v; }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();
