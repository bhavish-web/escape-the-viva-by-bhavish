/* ============================================================
   ESCAPE THE VIVA — Auth (login / signup / guest)
   Uses Supabase JS v2 (loaded via CDN in index.html).
   Optional login: guests can still play; login unlocks dashboard.
   ============================================================ */
(function(){
  "use strict";

  let supa = null;
  window.CURRENT_USER = null;

  function ready(){
    return supa && window.SUPABASE_URL && window.SUPABASE_URL.indexOf('PASTE_')<0;
  }

  function initClient(){
    try{
      if(!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.indexOf('PASTE_')>=0) return false;
      supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
      window.supaClient = supa;
      return true;
    }catch(e){ console.warn('Supabase init failed', e); return false; }
  }

  function $(id){ return document.getElementById(id); }
  function show(el){ if(el) el.style.display=''; }
  function hide(el){ if(el) el.style.display='none'; }
  function msg(text, isErr){
    const m=$('auth-msg'); if(!m) return;
    m.textContent=text||''; m.className='auth-msg '+(isErr?'err':'ok');
    m.style.display = text ? 'block' : 'none';
  }

  function showAuthScreen(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const a=$('auth-screen'); if(a) a.classList.add('active');
  }
  function enterApp(){
    const a=$('auth-screen'); if(a) a.classList.remove('active');
    const start=$('start-screen'); if(start) start.classList.add('active');
  }

  window.authTab = function(which){
    const login=$('auth-login-form'), signup=$('auth-signup-form');
    const tL=$('tab-login'), tS=$('tab-signup');
    msg('');
    if(which==='signup'){ hide(login); show(signup); tS.classList.add('active'); tL.classList.remove('active'); }
    else { show(login); hide(signup); tL.classList.add('active'); tS.classList.remove('active'); }
  };

  window.playAsGuest = function(){
    try{ if(typeof playClickSound==='function') playClickSound(); }catch(e){}
    window.CURRENT_USER = null;
    enterApp();
  };

  window.doSignup = async function(){
    if(!ready()){ msg('Login isn\u2019t configured yet. You can still Play as Guest.', true); return; }
    const name=($('su-name').value||'').trim();
    const email=($('su-email').value||'').trim();
    const pass=($('su-pass').value||'').trim();
    const file=$('su-avatar').files[0];
    if(!name || !email || pass.length<6){ msg('Enter a name, email, and password (6+ chars).', true); return; }
    setBusy(true);
    try{
      const { data, error } = await supa.auth.signUp({
        email, password: pass,
        options:{ data:{ display_name: name } }
      });
      if(error){ msg(error.message, true); setBusy(false); return; }
      const user = data.user;
      if(user && file){
        const url = await uploadAvatar(user.id, file);
        if(url){ await supa.from('profiles').update({ avatar_url:url, display_name:name }).eq('id', user.id); }
      }
      if(!data.session){
        msg('Account created! Check your email to confirm, then log in.', false);
        window.authTab('login'); setBusy(false); return;
      }
      window.CURRENT_USER = user;
      msg('Welcome, '+name+'!', false);
      setTimeout(enterApp, 500);
    }catch(e){ msg('Something went wrong. Try again.', true); }
    setBusy(false);
  };

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
      msg('Logged in!', false);
      setTimeout(enterApp, 400);
    }catch(e){ msg('Login failed. Try again.', true); }
    setBusy(false);
  };

  window.doLogout = async function(){
    try{ if(ready()) await supa.auth.signOut(); }catch(e){}
    window.CURRENT_USER = null;
    showAuthScreen();
  };

  async function uploadAvatar(userId, file){
    try{
      const ext = (file.name.split('.').pop()||'png').toLowerCase();
      const path = userId + '/avatar.' + ext;
      const { error } = await supa.storage.from('avatars').upload(path, file, { upsert:true });
      if(error){ console.warn('avatar upload', error); return null; }
      const { data } = supa.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl;
    }catch(e){ return null; }
  }

  function setBusy(b){
    document.querySelectorAll('.auth-btn').forEach(btn=>{ btn.disabled=b; });
  }

  window.addEventListener('load', function(){
    const ok = initClient();
    if(ok){
      supa.auth.getSession().then(({data})=>{
        if(data && data.session){
          window.CURRENT_USER = data.session.user;
          enterApp();
        } else {
          showAuthScreen();
        }
      }).catch(()=>showAuthScreen());
    } else {
      showAuthScreen();
    }
  });
})();
