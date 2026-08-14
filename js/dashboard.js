/* ============================================================
   ESCAPE THE VIVA — Dashboard (shell + navigation)
   Wave 0: builds the shell with placeholder data.
   Real Supabase data is wired in later waves.
   ============================================================ */
(function(){
  "use strict";
  function $(id){ return document.getElementById(id); }

  // show/hide helpers used by auth flow
  window.showDashboard = function(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const d=$('dashboard-screen'); if(d){ d.classList.add('active'); }
    renderShell();
  };
  window.enterGameFromDash = function(){
    const d=$('dashboard-screen'); if(d) d.classList.remove('active');
    const start=$('start-screen'); if(start) start.classList.add('active');
  };
  window.toggleDashSidebar = function(){
    const s=document.querySelector('.dash-side'); if(s) s.classList.toggle('open');
  };

  // Show + populate the dashboard pill on the start screen (logged-in users only)
  window.refreshDashPill = function(){
    const pill=$('dash-pill'); if(!pill) return;
    if(window.CURRENT_USER){
      const nm=greetingName();
      const nmEl=$('dash-pill-name'); if(nmEl) nmEl.textContent=nm;
      const av=$('dash-pill-avatar'); if(av) av.src=avatarSrc();
      pill.style.display='inline-flex';
    } else {
      pill.style.display='none';
    }
  };

  function greetingName(){
    try{
      const u=window.CURRENT_USER;
      if(u && u.user_metadata && u.user_metadata.display_name) return u.user_metadata.display_name;
      if(u && u.email) return u.email.split('@')[0];
    }catch(e){}
    return 'Student';
  }
  function avatarSrc(){
    const n = window.CURRENT_AVATAR || '1';
    return 'assets/avatars/'+n+'.png';
  }

  let built=false;
  function renderShell(){
    // update dynamic bits each open
    const nm=greetingName();
    const hi=$('dash-hi-name'); if(hi) hi.textContent=nm;
    const sf=$('dash-foot-name'); if(sf) sf.textContent=nm;
    document.querySelectorAll('.dash-avatar').forEach(img=>{ img.src=avatarSrc(); });
    if(built) return;
    built=true;
    // set the readiness ring placeholder (72%)
    setRing('ready-ring', 72);
    // subject rings placeholder
    setSubjRing('subj1', 76, '#a78bff'); setSubjRing('subj2', 64, '#4ee1ff'); setSubjRing('subj3', 58, '#2ecc71');
  }

  function setRing(id, pct){
    const c=$(id); if(!c) return;
    const r=52, circ=2*Math.PI*r;
    c.setAttribute('stroke-dasharray', circ);
    c.setAttribute('stroke-dashoffset', circ*(1-pct/100));
  }
  function setSubjRing(id, pct, color){
    const c=$(id); if(!c) return;
    const r=42, circ=2*Math.PI*r;
    c.style.stroke=color;
    c.setAttribute('stroke-dasharray', circ);
    c.setAttribute('stroke-dashoffset', circ*(1-pct/100));
  }
})();
