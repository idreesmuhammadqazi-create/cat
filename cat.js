(() => {
  'use strict';

  /* ---------- elements ---------- */

  const roomEl = document.getElementById('room');
  const catEl = document.getElementById('cat');
  const innerEl = catEl.querySelector('.cat__inner');
  const fxEl = document.getElementById('fx');
  const rugEl = document.querySelector('.rug');
  const bowlEl = document.getElementById('bowl');
  const bowlFoodEl = document.getElementById('bowlFood');
  const yarnEl = document.getElementById('yarn');
  const clockFaceEl = document.getElementById('clockface');
  const hintEl = document.getElementById('hint');

  const nameBtn = document.getElementById('nameBtn');
  const metaEl = document.getElementById('meta');
  const installBtn = document.getElementById('installBtn');

  const foodStat = document.getElementById('foodStat');
  const loveStat = document.getElementById('loveStat');
  const restStat = document.getElementById('restStat');
  const foodBar = document.getElementById('foodBar');
  const loveBar = document.getElementById('loveBar');
  const restBar = document.getElementById('restBar');
  const feedBtn = document.getElementById('feedBtn');
  const playBtn = document.getElementById('playBtn');
  const napBtn = document.getElementById('napBtn');
  const napLabel = document.getElementById('napLabel');

  const onboard = document.getElementById('onboard');
  const onboardDone = document.getElementById('onboardDone');
  const onboardInstall = document.getElementById('onboardInstall');
  const rename = document.getElementById('rename');
  const renameForm = document.getElementById('renameForm');
  const nameInput = document.getElementById('nameInput');
  const renameCancel = document.getElementById('renameCancel');
  const installHelp = document.getElementById('installHelp');
  const installHelpText = document.getElementById('installHelpText');
  const installHelpDone = document.getElementById('installHelpDone');

  /* ---------- constants ---------- */

  const CAT_W = 132;
  const CAT_H = 106;
  const FEET = 0.92;
  const STORE = 'cat.pet.v3';
  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2S3.6 15.7 3.6 9.9A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.4 3.3c0 5.8-8.4 11.3-8.4 11.3Z"/></svg>';

  // needs fall / rest rise per minute of real time
  const RATE = { food: 0.5, restAwake: 0.4, restAsleep: 20, love: 0.35 };

  const CHAT = {
    happy: ['purr', 'mrrp!', '^_^', 'hello'],
    hungry: ['mew…', 'hungry…', '…'],
    lonely: ['…', 'mrrp', 'where are you'],
    sleepy: ['…', 'zzz…'],
    tooFull: ['too full…', 'no more…'],
    tooTired: ['too sleepy…', 'later…'],
    eat: ['nom', 'nom nom', 'mrrp'],
    play: ['!', 'mrrp', 'got it'],
    pat: ['purr…', 'mrrp!', 'prrr', '^_^'],
    sleepPat: ['purr…', 'zzz…', 'mrrp…'],
  };

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const rand = (lo, hi) => lo + Math.random() * Math.max(0, hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- state ---------- */

  const defaultState = () => ({
    name: 'marmalade',
    born: Date.now(),
    lastSeen: Date.now(),
    food: 78,
    rest: 84,
    love: 66,
    pats: 0,
    onboarded: false,
    sleeping: false,
    sleepingSince: 0,
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return Object.assign(defaultState(), parsed, {
            food: clamp(Number(parsed.food) || 0, 0, 100),
            rest: clamp(Number(parsed.rest) || 0, 0, 100),
            love: clamp(Number(parsed.love) || 0, 0, 100),
            pats: Math.max(0, Number(parsed.pats) || 0),
          });
        }
      }
    } catch (_) {
      /* storage blocked — she still lives for this visit */
    }
    return defaultState();
  }

  let s = loadState();
  let saveTimer = 0;
  let lastTick = Date.now();
  let lastFrame = performance.now();

  const cat = { fx: 0, fy: 0, tx: 0, ty: 0, speed: 90, dir: 1, scale: 1, boost: false };
  const view = { w: 0, h: 0, floorTop: 0 };

  let mode = 'wander'; // wander | pause | pat | eat | eating | nap | sleep | play
  let modeUntil = 0;
  let afterPause = null;
  let playLeft = 0;
  let nextZoom = performance.now() + rand(15000, 28000);
  let nextMood = performance.now() + rand(50000, 90000);
  let autoNapAt = performance.now() + 12000;
  let manualWakeUntil = 0;
  let lastPat = 0;
  let patTimer = 0;
  let zzzTimer = 0;

  /* ---------- persistence ---------- */

  function save() {
    s.lastSeen = Date.now();
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch (_) {
      /* ignore */
    }
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }

  /* ---------- time & needs ---------- */

  function daysTogether() {
    return Math.max(1, Math.floor((Date.now() - (s.born || Date.now())) / 864e5) + 1);
  }

  function isNight() {
    const h = new Date().getHours();
    return h >= 21 || h < 7;
  }

  function applyNeeds(mins, asleep) {
    if (mins <= 0) return;
    if (asleep) s.rest = clamp(s.rest + mins * RATE.restAsleep, 0, 100);
    else s.rest = clamp(s.rest - mins * RATE.restAwake, 0, 100);
    s.food = clamp(s.food - mins * RATE.food, 0, 100);
    s.love = clamp(s.love - mins * RATE.love, 0, 100);
  }

  function catchUp() {
    const now = Date.now();
    const mins = clamp((now - (s.lastSeen || now)) / 60000, 0, 480);
    if (mins > 0.2) {
      // she gets needy when you're away, but never hopeless
      s.food = clamp(s.food - Math.min(mins * RATE.food, 45), 0, 100);
      s.love = clamp(s.love - Math.min(mins * RATE.love, 30), 0, 100);
      if (s.sleeping) {
        const asleepMins = clamp((now - (s.sleepingSince || s.lastSeen)) / 60000, 0, mins);
        s.rest = clamp(s.rest + Math.min(asleepMins * RATE.restAsleep, 60), 0, 100);
      } else {
        s.rest = clamp(s.rest - Math.min(mins * RATE.restAwake, 35), 0, 100);
      }
    }
    lastTick = now;
    s.lastSeen = now;
  }

  /* ---------- geometry ---------- */

  const feetMin = () => view.floorTop + 24;
  const feetMax = () => view.h - 10;

  function depthAt(fy) {
    const span = Math.max(1, feetMax() - feetMin());
    return clamp((fy - feetMin()) / span, 0, 1);
  }

  function scaleAt(fy) {
    const base = 0.78 + 0.3 * depthAt(fy);
    const fit = (view.w - 40) / CAT_W;
    return Math.max(0.42, Math.min(base, fit));
  }

  function halfWidthAt(fy) {
    return (CAT_W / 2) * scaleAt(fy) + 8;
  }

  function targetBounds(fy) {
    const half = halfWidthAt(fy);
    return { minX: half, maxX: Math.max(half + 1, view.w - half) };
  }

  function measure() {
    view.w = roomEl.clientWidth;
    view.h = roomEl.clientHeight;
    view.floorTop = document.querySelector('.floor').offsetTop;
    if (!view.w || !view.h) return;
    cat.fx = clamp(cat.fx, 30, view.w - 30);
    cat.fy = clamp(cat.fy, feetMin(), feetMax());
    cat.tx = clamp(cat.tx, 0, view.w);
    cat.ty = clamp(cat.ty, feetMin(), feetMax());
  }

  function rectInRoom(el) {
    const room = roomEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - room.left, y: r.top - room.top, w: r.width, h: r.height };
  }

  function rugSpot() {
    const r = rectInRoom(rugEl);
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.6 };
  }

  function bowlSpot() {
    const r = rectInRoom(bowlEl);
    return { x: r.x + r.w * 0.6, y: r.y + r.h * 0.85 };
  }

  /* ---------- rendering ---------- */

  function render() {
    const scale = scaleAt(cat.fy);
    cat.scale = scale;
    const x = cat.fx - CAT_W / 2;
    const y = cat.fy - CAT_H * FEET;
    catEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    innerEl.style.transform = `scaleX(${cat.dir}) scale(${scale.toFixed(3)})`;
    catEl.style.zIndex = String(5 + Math.round(depthAt(cat.fy) * 6));
  }

  function setMoving(on) {
    catEl.classList.toggle('is-moving', !!on && mode !== 'sleep');
    if (on) catEl.classList.remove('is-eating');
  }

  function setGait(speed) {
    const gait = clamp(0.7 - speed / 520, 0.24, 0.7);
    catEl.style.setProperty('--gait', gait.toFixed(2) + 's');
  }

  /* ---------- effects ---------- */

  function hearts(n) {
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
    fxEl.querySelectorAll('.bubble').forEach((el) => el.remove());
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.textContent = text;
    bubble.style.left = clamp(cat.fx + rand(-12, 12), 44, view.w - 44).toFixed(1) + 'px';
    bubble.style.top = (cat.fy - 92 * cat.scale).toFixed(1) + 'px';
    bubble.addEventListener('animationend', () => bubble.remove());
    fxEl.appendChild(bubble);
  }

  function spawnZzz() {
    if (mode !== 'sleep') return;
    const z = document.createElement('span');
    z.className = 'zzz';
    z.textContent = pick(['z', 'z', 'zzz']);
    z.style.left = clamp(cat.fx + 24 * cat.scale + rand(-4, 6), 20, view.w - 20) + 'px';
    z.style.top = (cat.fy - 66 * cat.scale + rand(-4, 4)).toFixed(1) + 'px';
    z.addEventListener('animationend', () => z.remove());
    fxEl.appendChild(z);
  }

  function startZzz() {
    stopZzz();
    spawnZzz();
    zzzTimer = setInterval(spawnZzz, 2800);
  }

  function stopZzz() {
    clearInterval(zzzTimer);
    zzzTimer = 0;
  }

  function buzz(ms) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (_) {
        /* nope */
      }
    }
  }

  /* ---------- mood & ui ---------- */

  function updateUI() {
    foodBar.style.width = s.food.toFixed(1) + '%';
    loveBar.style.width = s.love.toFixed(1) + '%';
    restBar.style.width = s.rest.toFixed(1) + '%';
    foodStat.setAttribute('aria-valuenow', String(Math.round(s.food)));
    loveStat.setAttribute('aria-valuenow', String(Math.round(s.love)));
    restStat.setAttribute('aria-valuenow', String(Math.round(s.rest)));
    foodStat.classList.toggle('is-low', s.food < 25);
    loveStat.classList.toggle('is-low', s.love < 25);
    restStat.classList.toggle('is-low', s.rest < 25);

    const asleep = mode === 'sleep' || mode === 'nap' || s.sleeping;
    napBtn.classList.toggle('is-on', asleep);
    napLabel.textContent = asleep ? 'wake' : 'nap';
    playBtn.disabled = s.rest < 12;

    nameBtn.textContent = s.name;
    catEl.setAttribute('aria-label', `pat ${s.name}`);
    metaEl.textContent = `day ${daysTogether()} · ${s.pats} ${s.pats === 1 ? 'pat' : 'pats'}`;
    document.title = `${s.name} — a phone pet`;
  }

  function moodLine() {
    if (s.food < 22) return pick(CHAT.hungry);
    if (s.rest < 22) return pick(CHAT.sleepy);
    if (s.love < 28) return pick(CHAT.lonely);
    if (s.love > 78) return pick(CHAT.happy);
    return null;
  }

  /* ---------- wandering ---------- */

  function newWanderTarget(boost = false) {
    const y0 = feetMin();
    const y1 = feetMax();
    const ty = rand(y0 + (y1 - y0) * 0.05, y1);
    const b = targetBounds(ty);
    let tx = rand(b.minX, b.maxX);

    if (Math.random() < 0.62) {
      const mid = view.w / 2;
      if (cat.fx < mid) tx = rand(Math.max(b.minX, Math.min(mid, b.maxX)), b.maxX);
      else tx = rand(b.minX, Math.min(b.maxX, mid));
    }

    cat.tx = tx;
    cat.ty = ty;
    cat.speed = boost ? rand(270, 340) : rand(62, 130) * (0.85 + 0.4 * depthAt(ty));
    cat.dir = tx >= cat.fx ? 1 : -1;
    cat.boost = boost;
    setGait(cat.speed);
  }

  function resumeWander() {
    mode = 'wander';
    afterPause = null;
    catEl.classList.remove('is-eating', 'is-patted');
    newWanderTarget();
  }

  function pauseFor(ms, then) {
    mode = 'pause';
    modeUntil = performance.now() + ms;
    afterPause = then || null;
    setMoving(false);
  }

  function step(dt, onArrive) {
    const dx = cat.tx - cat.fx;
    const dy = cat.ty - cat.fy;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      onArrive();
      return;
    }

    const amount = Math.min(cat.speed * dt, dist);
    cat.fx += (dx / dist) * amount;
    cat.fy += (dy / dist) * amount;
    if (Math.abs(dx) > 1.2) cat.dir = dx > 0 ? 1 : -1;
    setMoving(true);
  }

  function arriveWander() {
    if (cat.boost) {
      cat.boost = false;
      nextZoom = performance.now() + rand(12000, 26000);
    }
    if (Math.random() < 0.22) pauseFor(rand(260, 720));
    else newWanderTarget();
  }

  /* ---------- petting ---------- */

  function pat() {
    const now = performance.now();
    if (now - lastPat < 450) return;
    lastPat = now;

    s.pats += 1;
    s.love = clamp(s.love + 2.2, 0, 100);
    hearts(randInt(3, 5));
    buzz(8);
    hintEl.classList.add('hint--gone');

    const asleep = mode === 'sleep' || mode === 'nap' || s.sleeping;
    if (asleep) {
      say(pick(CHAT.sleepPat));
    } else if (mode === 'wander' || (mode === 'pause' && !afterPause)) {
      mode = 'pat';
      modeUntil = now + 900;
      setMoving(false);
      catEl.classList.add('is-patted');
      clearTimeout(patTimer);
      patTimer = setTimeout(() => catEl.classList.remove('is-patted'), 900);
      if (Math.random() < 0.35) say(pick(CHAT.pat));
    } else {
      if (Math.random() < 0.3) say(pick(CHAT.pat));
    }

    updateUI();
    saveSoon();
  }

  /* ---------- feeding ---------- */

  function bowlClamp(y) {
    const b = targetBounds(y);
    return b;
  }

  function feed() {
    if (mode === 'eat' || mode === 'eating') {
      s.food = clamp(s.food + 14, 0, 100);
      s.love = clamp(s.love + 2, 0, 100);
      bowlFoodEl.classList.add('is-full');
      modeUntil += 1400;
      say('more!');
      updateUI();
      saveSoon();
      return;
    }

    if (s.food >= 98) {
      say(pick(CHAT.tooFull));
      return;
    }

    stopPlay();
    if (mode === 'sleep' || mode === 'nap') wake(true);

    s.sleeping = false;
    s.food = clamp(s.food + 26, 0, 100);
    s.love = clamp(s.love + 5, 0, 100);
    bowlFoodEl.classList.add('is-full');

    const spot = bowlSpot();
    const ty = clamp(spot.y, feetMin(), feetMax());
    const b = bowlClamp(ty);
    cat.tx = clamp(spot.x + 30, b.minX, b.maxX);
    cat.ty = ty;
    cat.speed = 118;
    cat.dir = -1;
    setGait(cat.speed);
    mode = 'eat';
    afterPause = null;
    hintEl.classList.add('hint--gone');
    updateUI();
    saveSoon();
  }

  function arriveEat() {
    mode = 'eating';
    modeUntil = performance.now() + 2500;
    catEl.classList.remove('is-moving');
    catEl.classList.add('is-eating');
    cat.dir = -1;
    say(pick(CHAT.eat));
    updateUI();
  }

  function endEat(quiet) {
    if (!quiet) {
      hearts(2);
      say('purr');
    }
    catEl.classList.remove('is-eating');
    bowlFoodEl.classList.remove('is-full');
    mode = 'wander';
    newWanderTarget();
    updateUI();
    saveSoon();
  }

  /* ---------- playing ---------- */

  function play() {
    if (mode === 'play') return;
    if (s.rest < 12) {
      say(pick(CHAT.tooTired));
      return;
    }

    if (mode === 'sleep' || mode === 'nap') wake(true);
    if (mode === 'eat' || mode === 'eating') endEat(true);

    s.sleeping = false;
    s.rest = clamp(s.rest - 8, 0, 100);
    s.love = clamp(s.love + 12, 0, 100);
    playLeft = 3;
    hintEl.classList.add('hint--gone');
    nextPlayRound();
    updateUI();
    saveSoon();
    buzz(6);
  }

  function nextPlayRound() {
    mode = 'play';
    const spot = rand(view.w * 0.18, view.w * 0.82);
    const yarnW = yarnEl.offsetWidth;
    yarnEl.classList.add('is-active');
    yarnEl.style.right = 'auto';
    yarnEl.style.left = (spot - yarnW / 2).toFixed(1) + 'px';

    const ty = clamp(view.h * 0.955, feetMin(), feetMax());
    const b = targetBounds(ty);
    const side = cat.fx < spot ? -1 : 1; // approach from the near side
    cat.tx = clamp(spot + side * 34, b.minX, b.maxX);
    cat.ty = ty;
    cat.dir = side === -1 ? 1 : -1;
    cat.speed = rand(190, 250);
    setGait(cat.speed);
  }

  function arrivePlay() {
    hearts(2);
    say(pick(CHAT.play));
    catEl.classList.add('is-patted');
    setTimeout(() => catEl.classList.remove('is-patted'), 400);
    playLeft -= 1;

    pauseFor(420, () => {
      if (mode !== 'pause') return;
      if (playLeft > 0) nextPlayRound();
      else endPlay();
    });
    updateUI();
  }

  function endPlay() {
    yarnEl.classList.remove('is-active');
    mode = 'wander';
    newWanderTarget();
    updateUI();
  }

  function stopPlay() {
    if (mode !== 'play' && !afterPause) return;
    yarnEl.classList.remove('is-active');
    afterPause = null;
    if (mode === 'play') mode = 'wander';
  }

  /* ---------- sleeping ---------- */

  function startNap(auto) {
    if (mode === 'sleep' || mode === 'nap') return;
    stopPlay();
    if (mode === 'eat' || mode === 'eating') endEat(true);
    mode = 'nap';
    afterPause = null;
    const spot = rugSpot();
    const ty = clamp(spot.y, feetMin(), feetMax());
    const b = targetBounds(ty);
    cat.tx = clamp(spot.x, b.minX, b.maxX);
    cat.ty = ty;
    cat.speed = auto ? 76 : 108;
    setGait(cat.speed);
    catEl.classList.remove('is-eating');
    if (!auto) hintEl.classList.add('hint--gone');
    if (!auto && Math.random() < 0.7) say('…');
    updateUI();
  }

  function arriveNap() {
    mode = 'sleep';
    s.sleeping = true;
    s.sleepingSince = Date.now();
    catEl.classList.remove('is-moving', 'is-eating', 'is-patted');
    catEl.classList.add('is-asleep');
    cat.dir = 1;
    setMoving(false);
    startZzz();
    hintEl.classList.add('hint--gone');
    updateUI();
    save();
  }

  function wake(quiet) {
    if (mode !== 'sleep' && mode !== 'nap') return;
    const wasAsleep = mode === 'sleep';
    s.sleeping = false;
    stopZzz();
    catEl.classList.remove('is-asleep');
    mode = 'pause';
    modeUntil = performance.now() + 240;
    afterPause = null;
    manualWakeUntil = performance.now() + 30 * 60 * 1000;
    if (!quiet && wasAsleep) say('mrrp?');
    updateUI();
    save();
  }

  function napToggle() {
    if (mode === 'sleep' || mode === 'nap') wake(false);
    else startNap(false);
  }

  function maybeAutoNap(now) {
    if (mode !== 'wander' && mode !== 'pause') return;
    if (afterPause) return;
    if (s.rest < 8) {
      startNap(true);
      return;
    }
    if (isNight() && s.rest < 55 && now > manualWakeUntil && !s.sleeping) startNap(true);
  }

  /* ---------- main loop ---------- */

  function tick(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    if (mode === 'pat' || mode === 'pause') {
      if (now >= modeUntil) {
        const then = afterPause;
        afterPause = null;
        catEl.classList.remove('is-patted');
        if (then) then();
        else resumeWander();
      }
    } else if (mode === 'eating') {
      if (now >= modeUntil) endEat(false);
    } else if (mode === 'sleep') {
      /* loafing */
    } else if (mode === 'eat') {
      step(dt, arriveEat);
    } else if (mode === 'nap') {
      step(dt, arriveNap);
    } else if (mode === 'play') {
      step(dt, arrivePlay);
    } else {
      if (now >= nextZoom && s.love > 55 && !isNight()) {
        newWanderTarget(true);
        nextZoom = now + 1e9;
      }
      step(dt, arriveWander);
    }

    if (now >= nextMood) {
      nextMood = now + rand(45000, 95000);
      if (!['sleep', 'nap', 'eat', 'eating', 'pat'].includes(mode)) {
        const line = moodLine();
        if (line) say(line);
      }
    }

    if (now >= autoNapAt) {
      autoNapAt = now + 15000;
      maybeAutoNap(now);
    }

    render();
    requestAnimationFrame(tick);
  }

  /* ---------- clock ---------- */

  function tickClock() {
    const d = new Date();
    clockFaceEl.style.setProperty('--hour', ((d.getHours() % 12) * 30 + d.getMinutes() * 0.5).toFixed(1) + 'deg');
    clockFaceEl.style.setProperty('--minute', (d.getMinutes() * 6).toFixed(1) + 'deg');
  }

  function updateDaypart() {
    roomEl.classList.toggle('is-night', isNight());
  }

  /* ---------- sheets ---------- */

  function openSheet(el) {
    el.hidden = false;
  }

  function closeSheet(el) {
    el.hidden = true;
  }

  function closeTopSheet() {
    [onboard, rename, installHelp].forEach((el) => {
      if (!el.hidden) closeSheet(el);
    });
  }

  [onboard, rename, installHelp].forEach((sheet) => {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet(sheet);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTopSheet();
  });

  onboardDone.addEventListener('click', () => {
    s.onboarded = true;
    closeSheet(onboard);
    save();
    updateUI();
  });

  nameBtn.addEventListener('click', () => {
    nameInput.value = s.name;
    openSheet(rename);
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 60);
  });

  renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 14);
    if (next) s.name = next;
    closeSheet(rename);
    updateUI();
    save();
  });

  renameCancel.addEventListener('click', () => closeSheet(rename));

  installHelpDone.addEventListener('click', () => closeSheet(installHelp));

  /* ---------- install ---------- */

  let deferredPrompt = null;
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function showInstallEntrances() {
    if (standalone) return;
    installBtn.hidden = false;
    onboardInstall.hidden = false;
  }

  function hideInstallEntrances() {
    installBtn.hidden = true;
    onboardInstall.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallEntrances();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallEntrances();
  });

  if (isIOS && !standalone) showInstallEntrances();

  async function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_) {
        /* ignore */
      }
      deferredPrompt = null;
      hideInstallEntrances();
      return;
    }

    installHelpText.textContent = isIOS
      ? 'Tap the Share button in Safari, then choose “Add to Home Screen”.'
      : 'Open your browser menu and choose “Install app” or “Add to Home Screen”.';
    openSheet(installHelp);
  }

  installBtn.addEventListener('click', installApp);
  onboardInstall.addEventListener('click', installApp);

  /* ---------- wiring ---------- */

  catEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    pat();
  });

  catEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      pat();
    }
  });

  catEl.addEventListener('contextmenu', (e) => e.preventDefault());

  feedBtn.addEventListener('click', feed);
  playBtn.addEventListener('click', play);
  napBtn.addEventListener('click', napToggle);

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      measure();
      render();
    }).observe(roomEl);
  } else {
    window.addEventListener('resize', () => {
      measure();
      render();
    });
  }

  /* ---------- presence ---------- */

  setInterval(() => {
    const now = Date.now();
    const mins = clamp((now - lastTick) / 60000, 0, 360);
    if (mins <= 0) return;
    lastTick = now;
    applyNeeds(mins, mode === 'sleep' || mode === 'nap');
    updateUI();
    saveSoon();
  }, 5000);

  setInterval(tickClock, 20000);
  setInterval(updateDaypart, 60000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      save();
    } else {
      lastTick = Date.now();
      updateDaypart();
      render();
    }
  });

  window.addEventListener('pagehide', save);

  /* ---------- start ---------- */

  catchUp();
  measure();

  const startsAsleep = s.sleeping && s.rest < 99;
  if (startsAsleep) {
    const spot = rugSpot();
    const ty = clamp(spot.y, feetMin(), feetMax());
    const b = targetBounds(ty);
    cat.fx = clamp(spot.x, b.minX, b.maxX);
    cat.fy = ty;
    mode = 'sleep';
    catEl.classList.add('is-asleep');
    startZzz();
  } else {
    s.sleeping = false;
    cat.fy = feetMax() - 12;
    const b = targetBounds(cat.fy);
    cat.fx = clamp(view.w * 0.56, b.minX, b.maxX);
    mode = 'wander';
    newWanderTarget();
  }

  if (!s.onboarded) openSheet(onboard);
  updateDaypart();
  tickClock();
  updateUI();
  render();
  save();
  setTimeout(() => hintEl.classList.add('hint--gone'), 14000);

  requestAnimationFrame((t) => {
    lastFrame = t;
    requestAnimationFrame(tick);
  });

  /* ---------- service worker ---------- */

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support is optional */
      });
    });
  }
})();