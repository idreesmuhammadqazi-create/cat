(() => {
  'use strict';

  const screenEl = document.getElementById('screen');
  const floorEl = document.querySelector('.floor');
  const catEl = document.getElementById('cat');
  const innerEl = catEl.querySelector('.cat__inner');
  const patsEl = document.getElementById('pats');
  const fxEl = document.getElementById('fx');
  const clockEl = document.getElementById('clock');
  const clockFaceEl = document.getElementById('clockface');
  const hintEl = document.getElementById('hint');

  const CAT_W = 132;
  const CAT_H = 106;
  const FEET = 0.92; // the point of the cat that stays on the floor
  const STORE_KEY = 'cat.pats.v1';
  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2S3.6 15.7 3.6 9.9A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.4 3.3c0 5.8-8.4 11.3-8.4 11.3Z"/></svg>';
  const PURR = ['purr…', 'mrrp', 'prrr', 'maow!', '^_^', 'mew'];

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const rand = (lo, hi) => lo + Math.random() * Math.max(0, hi - lo);

  const view = { w: 0, h: 0, floorTop: 0 };
  const cat = {
    fx: 0,
    fy: 0,
    tx: 0,
    ty: 0,
    speed: 90,
    dir: 1,
    scale: 1,
    mode: 'run',
    until: 0,
    boost: false,
  };

  let pats = 0;
  try {
    pats = Math.max(0, parseInt(localStorage.getItem(STORE_KEY) || '0', 10) || 0);
  } catch (_) {
    pats = 0;
  }

  let last = performance.now();
  let nextZoom = last + rand(10000, 18000);
  let lastPat = 0;
  let patTimer = 0;
  let purrCounter = 0;

  /* ---------- geometry ---------- */

  const feetMin = () => view.floorTop + 26;
  const feetMax = () => view.h - 8;

  function depthAt(fy) {
    const span = Math.max(1, feetMax() - feetMin());
    return clamp((fy - feetMin()) / span, 0, 1);
  }

  function scaleAt(fy) {
    const base = 0.78 + 0.3 * depthAt(fy);
    const fit = (view.w - 40) / CAT_W; // never wider than the room
    return Math.max(0.42, Math.min(base, fit));
  }

  function halfWidthAt(fy) {
    return (CAT_W / 2) * scaleAt(fy) + 8;
  }

  function measure() {
    view.w = screenEl.clientWidth;
    view.h = screenEl.clientHeight;
    view.floorTop = floorEl.offsetTop;
    if (!view.w || !view.h) return;

    cat.fx = clamp(cat.fx, 30, view.w - 30);
    cat.fy = clamp(cat.fy, feetMin(), feetMax());
    cat.tx = clamp(cat.tx, 0, view.w);
    cat.ty = clamp(cat.ty, feetMin(), feetMax());
  }

  /* ---------- the cat's little mind ---------- */

  function newTarget(boost = false) {
    const y0 = feetMin();
    const y1 = feetMax();
    const ty = rand(y0 + (y1 - y0) * 0.06, y1);
    const half = halfWidthAt(ty);
    const minX = half;
    const maxX = Math.max(half + 1, view.w - half);

    let tx = rand(minX, maxX);
    if (Math.random() < 0.62) {
      const mid = view.w / 2;
      if (cat.fx < mid) {
        tx = rand(Math.max(minX, Math.min(mid, maxX)), maxX);
      } else {
        tx = rand(minX, Math.min(maxX, mid));
      }
    }

    cat.tx = tx;
    cat.ty = ty;
    cat.speed = boost
      ? rand(270, 340)
      : rand(58, 128) * (0.85 + 0.4 * depthAt(ty));
    cat.boost = boost;

    const gait = clamp(0.7 - cat.speed / 520, 0.24, 0.7);
    catEl.style.setProperty('--gait', gait.toFixed(2) + 's');
  }

  function arrive(now) {
    cat.boost = false;
    nextZoom = now + rand(11000, 24000);

    if (Math.random() < 0.22) {
      cat.mode = 'pause';
      cat.until = now + rand(260, 720);
      catEl.classList.remove('is-moving');
    } else {
      newTarget();
    }
  }

  function move(dt, now) {
    const dx = cat.tx - cat.fx;
    const dy = cat.ty - cat.fy;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      arrive(now);
      return;
    }

    const step = Math.min(cat.speed * dt, dist);
    cat.fx += (dx / dist) * step;
    cat.fy += (dy / dist) * step;
    if (Math.abs(dx) > 1.2) cat.dir = dx > 0 ? 1 : -1;
    catEl.classList.add('is-moving');
  }

  function render() {
    const scale = scaleAt(cat.fy);
    cat.scale = scale;

    const x = cat.fx - CAT_W / 2;
    const y = cat.fy - CAT_H * FEET;

    catEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    innerEl.style.transform = `scaleX(${cat.dir}) scale(${scale.toFixed(3)})`;
    catEl.style.zIndex = String(5 + Math.round(depthAt(cat.fy) * 6));
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (cat.mode === 'pat' || cat.mode === 'pause') {
      if (now >= cat.until) {
        if (cat.mode === 'pat') catEl.classList.remove('is-patted');
        cat.mode = 'run';
        newTarget();
      }
    } else {
      if (now >= nextZoom) {
        newTarget(true);
        nextZoom = now + 1e9;
      }
      move(dt, now);
    }

    render();
    requestAnimationFrame(tick);
  }

  /* ---------- patting ---------- */

  function updatePats(pulse = true) {
    patsEl.textContent = pats === 1 ? '1 pat' : pats + ' pats';
    document.title = pats ? `cat · ${pats} ${pats === 1 ? 'pat' : 'pats'}` : 'cat';
    if (!pulse || !patsEl.animate) return;
    patsEl.classList.remove('status__pats--pulse');
    void patsEl.offsetWidth;
    patsEl.classList.add('status__pats--pulse');
  }

  function savePats() {
    try {
      localStorage.setItem(STORE_KEY, String(pats));
    } catch (_) {
      /* private mode, file://, whatever — the cat still gets patted */
    }
  }

  function spawnHearts(n) {
    const cx = cat.fx + rand(-8, 8);
    const cy = cat.fy - 70 * cat.scale;

    for (let i = 0; i < n; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.style.left = (cx + rand(-15, 15)).toFixed(1) + 'px';
      heart.style.top = (cy + rand(-8, 8)).toFixed(1) + 'px';
      heart.style.setProperty('--size', rand(17, 27).toFixed(1) + 'px');
      heart.style.setProperty('--dur', rand(720, 1080).toFixed(0) + 'ms');
      heart.style.setProperty('--dx', rand(-30, 30).toFixed(0) + 'px');
      heart.style.setProperty('--rise', rand(52, 92).toFixed(0) + 'px');
      heart.style.setProperty('--rot', rand(-18, 18).toFixed(0) + 'deg');
      heart.innerHTML = HEART_SVG;
      heart.addEventListener('animationend', () => heart.remove());
      fxEl.appendChild(heart);
    }

    while (fxEl.childElementCount > 40) fxEl.firstElementChild.remove();
  }

  function say(text) {
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.textContent = text;
    bubble.style.left = clamp(cat.fx + rand(-12, 12), 44, view.w - 44).toFixed(1) + 'px';
    bubble.style.top = (cat.fy - 86 * cat.scale).toFixed(1) + 'px';
    bubble.addEventListener('animationend', () => bubble.remove());
    fxEl.appendChild(bubble);
  }

  function patCat() {
    const now = performance.now();
    if (now - lastPat < 90) return;
    lastPat = now;

    pats += 1;
    savePats();
    updatePats();
    nextZoom = now + rand(8000, 16000);

    cat.mode = 'pat';
    cat.until = now + 950;
    catEl.classList.remove('is-moving');
    catEl.classList.add('is-patted');
    clearTimeout(patTimer);
    patTimer = setTimeout(() => catEl.classList.remove('is-patted'), 900);

    spawnHearts(3 + Math.floor(Math.random() * 3));

    purrCounter += 1;
    if (purrCounter >= 3) {
      purrCounter = 0;
      say(PURR[Math.floor(Math.random() * PURR.length)]);
    }

    hintEl.classList.add('hint--gone');
  }

  /* ---------- clock ---------- */

  function tickClock() {
    const d = new Date();
    clockEl.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    clockFaceEl.style.setProperty('--hour', ((d.getHours() % 12) * 30 + d.getMinutes() * 0.5).toFixed(1) + 'deg');
    clockFaceEl.style.setProperty('--minute', (d.getMinutes() * 6).toFixed(1) + 'deg');
  }

  /* ---------- wiring ---------- */

  catEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    patCat();
  });

  catEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      patCat();
    }
  });

  catEl.addEventListener('contextmenu', (e) => e.preventDefault());

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => measure()).observe(screenEl);
  } else {
    window.addEventListener('resize', measure);
  }

  measure();
  cat.fx = clamp(view.w * 0.58, 50, Math.max(50, view.w - 50));
  cat.fy = feetMax() - 14;
  newTarget();
  updatePats(false);
  tickClock();
  setInterval(tickClock, 20000);
  render();
  requestAnimationFrame((t) => {
    last = t;
    requestAnimationFrame(tick);
  });
})();