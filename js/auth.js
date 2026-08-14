/* ============================================================
   ESCAPE THE VIVA — Auth (login / signup / guest / avatar pick)
   Avatar is chosen AFTER login (not at signup).
   Stores chosen avatar number ("1".."8") in profiles.avatar_url.
   ============================================================ */
(function(){
  "use strict";

  let supa = null;
  const AVATAR_COUNT = 4;
  let pendingAvatar = "1";
  window.CURRENT_USER = null;
  window.CURRENT_AVATAR = "1";

  function ready(){ return supa && window.SUPABASE_URL && window.SUPABASE_URL.indexOf('PASTE_')<0; }

  function initClient(){
    try{
      if(!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.indexOf('PASTE_')>=0) return false;
      supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
      window.supaClient = supa;
      return true;
    }catch(e){ console.warn('Supabase init failed', e); return false; }
  }

  function $(id){ return document.getElementById(id); }
  function msg(text, isErr){
    const m=$('auth-msg'); if(!m) return;
    m.textContent=text||''; m.className='auth-msg '+(isErr?'err':'ok');
    m.style.display = text ? 'block' : 'none';
  }
  function setBusy(b){ document.querySelectorAll('.auth-btn').forEach(x=>x.disabled=b); }

  function showAuthScreen(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const a=$('auth-screen'); if(a) a.classList.add('active');
    showPanel('auth');
  }
  function enterApp(){
    const a=$('auth-screen'); if(a) a.classList.remove('active');
    // Logged-in users land on the dashboard; guests go to the game start screen.
    if(window.CURRENT_USER && typeof window.showDashboard==='function'){
      window.showDashboard();
    } else {
      const start=$('start-screen'); if(start) start.classList.add('active');
    }
  }

  /* panels inside auth card: 'auth' (login/signup) or 'avatar' */
  function showPanel(which){
    const authPanel=$('auth-main'), avPanel=$('avatar-panel');
    if(!authPanel||!avPanel) return;
    if(which==='avatar'){ authPanel.style.display='none'; avPanel.style.display='block'; buildAvatarGrid(); }
    else { authPanel.style.display='block'; avPanel.style.display='none'; }
  }

  /* ---- tabs: smooth slide between login & signup ---- */
  window.authTab = function(which){
    const tabs=$('auth-tabs'); const login=$('auth-login-form'), signup=$('auth-signup-form');
    const tL=$('tab-login'), tS=$('tab-signup');
    msg('');
    if(which==='signup'){
      tabs.classList.add('show-signup');
      tS.classList.add('active'); tL.classList.remove('active');
      login.classList.add('out-left'); signup.classList.remove('out-right');
    } else {
      tabs.classList.remove('show-signup');
      tL.classList.add('active'); tS.classList.remove('active');
      signup.classList.add('out-right'); login.classList.remove('out-left');
    }
  };

  window.playAsGuest = function(){
    try{ if(typeof playClickSound==='function') playClickSound(); }catch(e){}
    window.CURRENT_USER = null;
    enterApp();
  };

  /* ---------- sign up (no avatar here) ---------- */
  window.doSignup = async function(){
    if(!ready()){ msg('Login isn\u2019t configured yet. You can still Play as Guest.', true); return; }
    const name=($('su-name').value||'').trim();
    const email=($('su-email').value||'').trim();
    const pass=($('su-pass').value||'').trim();
    if(!name || !email || pass.length<6){ msg('Enter a name, email, and password (6+ chars).', true); return; }
    setBusy(true);
    try{
      const { data, error } = await supa.auth.signUp({ email, password: pass, options:{ data:{ display_name:name } } });
      if(error){ msg(error.message, true); setBusy(false); return; }
      if(!data.session){
        msg('Account created! Check your email to confirm, then log in.', false);
        window.authTab('login'); setBusy(false); return;
      }
      window.CURRENT_USER = data.user;
      msg('', false);
      showPanel('avatar');           // ← pick avatar after signup
    }catch(e){ msg('Something went wrong. Try again.', true); }
    setBusy(false);
  };

  /* ---------- log in ---------- */
  window.doLogin = async function(){
    if(!ready()){ msg('Login isn\u2019t configured yet. You can still Play as Guest.', true); return; }
    const email=($('li-email').value||'').trim();
    const pass=($('li-pass').value||'').trim();
    if(!email || !pass){ msg('Enter your email and password.', true); return; }
    setBusy(true);
    try{
      const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
      if(error){ msg(error.message, true); setBusy(false); return; }
      window.CURRENT_USER = data.user;
      msg('', false);
      // if they already have an avatar, skip the picker
      const existing = await getMyAvatar(data.user.id);
      if(existing){ window.CURRENT_AVATAR = existing; enterApp(); }
      else { showPanel('avatar'); }
    }catch(e){ msg('Login failed. Try again.', true); }
    setBusy(false);
  };

  window.doLogout = async function(){
    try{ if(ready()) await supa.auth.signOut(); }catch(e){}
    window.CURRENT_USER = null;
    showAuthScreen();
  };

  /* ---------- avatar picker ---------- */
  function buildAvatarGrid(){
    const grid=$('avatar-grid'); if(!grid || grid.dataset.built) return;
    grid.innerHTML='';
    for(let i=1;i<=AVATAR_COUNT;i++){
      const b=document.createElement('button');
      b.className='avatar-opt'+(i===1?' selected':'');
      b.innerHTML='<img src="assets/avatars/'+i+'.png" alt="Avatar '+i+'">';
      b.onclick=function(){
        pendingAvatar=String(i);
        grid.querySelectorAll('.avatar-opt').forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected');
      };
      grid.appendChild(b);
    }
    grid.dataset.built='1';
  }

  window.confirmAvatar = async function(){
    window.CURRENT_AVATAR = pendingAvatar;
    setBusy(true);
    try{
      if(ready() && window.CURRENT_USER){
        await supa.from('profiles').update({ avatar_url: pendingAvatar }).eq('id', window.CURRENT_USER.id);
      }
    }catch(e){ console.warn('avatar save skipped', e); }
    setBusy(false);
    enterApp();
  };

  async function getMyAvatar(uid){
    try{
      const { data } = await supa.from('profiles').select('avatar_url').eq('id', uid).single();
      return data && data.avatar_url ? data.avatar_url : null;
    }catch(e){ return null; }
  }

  /* ---------- boot ---------- */
  window.addEventListener('load', function(){
    const ok = initClient();
    if(ok){
      supa.auth.getSession().then(async ({data})=>{
        if(data && data.session){
          window.CURRENT_USER = data.session.user;
          const av = await getMyAvatar(data.session.user.id);
          if(av){ window.CURRENT_AVATAR = av; enterApp(); }
          else { showAuthScreen(); showPanel('avatar'); }
        } else { showAuthScreen(); }
      }).catch(()=>showAuthScreen());
    } else { showAuthScreen(); }
  });
})();
