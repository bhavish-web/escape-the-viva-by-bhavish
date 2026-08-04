/* ============================================================
   ESCAPE THE VIVA - Asset Manifest + Preloader  (Phase 2)
   ------------------------------------------------------------
   Central source of truth for every image the game uses, plus
   a preloader so expression swaps during gameplay are INSTANT
   (no flicker, no network delay).

   Paths match the committed asset folders exactly:
     assets/background/classroom.png
     assets/professor/<state>.png
     assets/student/<state>.png

   Nothing here changes the UI. It only defines paths and warms
   the browser cache. Safe to load on its own.
   ============================================================ */

const ASSET_BASE = 'assets/';

const BACKGROUNDS = {
  classroom: ASSET_BASE + 'background/classroom.png'
};

const PROFESSOR_SPRITES = {
  idle:         ASSET_BASE + 'professor/idle.png',
  talking:      ASSET_BASE + 'professor/talking.png',
  thinking:     ASSET_BASE + 'professor/thinking.png',
  impressed:    ASSET_BASE + 'professor/impressed.png',
  annoyed:      ASSET_BASE + 'professor/annoyed.png',
  angry:        ASSET_BASE + 'professor/angry.png',
  disappointed: ASSET_BASE + 'professor/disappointed.png',
  shocked:      ASSET_BASE + 'professor/shocked.png'
};

const STUDENT_SPRITES = {
  idle:      ASSET_BASE + 'student/idle.png',
  talking:   ASSET_BASE + 'student/talking.png',
  thinking:  ASSET_BASE + 'student/thinking.png',
  confident: ASSET_BASE + 'student/confident.png',
  happy:     ASSET_BASE + 'student/happy.png',
  nervous:   ASSET_BASE + 'student/nervous.png',
  worried:   ASSET_BASE + 'student/worried.png',
  panic:     ASSET_BASE + 'student/panic.png'
};

/* All image URLs the preloader should warm. */
function allAssetUrls() {
  return [
    ...Object.values(BACKGROUNDS),
    ...Object.values(PROFESSOR_SPRITES),
    ...Object.values(STUDENT_SPRITES)
  ];
}

/* Keep Image objects referenced so the browser doesn't evict them. */
const _spriteCache = {};

function _preloadOne(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload  = () => resolve({ url, ok: true });
    img.onerror = () => resolve({ url, ok: false });   // never reject — a missing file must not block the game
    img.src = url;
    _spriteCache[url] = img;
  });
}

/* Preload everything. Resolves with {total, loaded, missing[]}.
   onProgress(loaded, total, lastResult) is optional. */
async function preloadAllSprites(onProgress) {
  const urls = allAssetUrls();
  let loaded = 0;
  const results = await Promise.all(urls.map(async url => {
    const r = await _preloadOne(url);
    loaded++;
    if (typeof onProgress === 'function') onProgress(loaded, urls.length, r);
    return r;
  }));

  const missing = results.filter(r => !r.ok).map(r => r.url);
  window.SPRITES_READY = true;
  document.dispatchEvent(new CustomEvent('sprites-ready', { detail: { total: urls.length, missing } }));

  if (missing.length) {
    console.warn(`[assets] ${urls.length - missing.length}/${urls.length} sprites loaded. MISSING:\n  ` + missing.join('\n  '));
  } else {
    console.log(`[assets] all ${urls.length} sprites preloaded ✓`);
  }
  return { total: urls.length, loaded: urls.length - missing.length, missing };
}

/* Expose for other modules + manual testing in the console. */
window.EscapeVivaAssets = {
  BACKGROUNDS, PROFESSOR_SPRITES, STUDENT_SPRITES,
  allAssetUrls, preloadAllSprites, cache: _spriteCache
};

/* Start warming the cache as soon as the page loads (non-blocking). */
window.addEventListener('load', () => { preloadAllSprites(); });
